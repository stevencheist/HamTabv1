// --- CAT: Connection Orchestrator ---
// Single entry point for connecting to a rig.
// Handles: transport creation, driver selection, profile lookup, RigManager setup.
// Supports both real radio (WebSerial) and demo mode (InMemoryTransport).
// UI calls connectRig() / disconnectRig() — never touches internals.

import { WebSerialTransport } from './transports/web-serial.js';
import { TciWebSocketTransport } from './transports/tci-websocket.js';
import { InMemoryTransport } from './simulator/in-memory-transport.js';
import { KiwiSdrSocketTransport } from './transports/kiwisdr-socket.js';
import { yaesuAscii } from './drivers/yaesu-ascii.js';
import { kenwoodAscii } from './drivers/kenwood-ascii.js';
import { icomCiv } from './drivers/icom-civ.js';
import { elecraftAscii } from './drivers/elecraft-ascii.js';
import { kiwisdrWs } from './drivers/kiwisdr-ws.js';
import { tciDriver } from './drivers/tci.js';
import { createRigManager } from './rig-manager.js';
import { createRigStateStore } from './rig-state-store.js';
import { getTraceBus } from './diagnostics/trace-bus.js';
import { smartDetect } from './smart-detect.js';
import { createTxIntentSystem } from './safety/tx-intent-system.js';
import { createBandTransitionGuard } from './safety/band-transition-guard.js';
import { createTxPowerGuard } from './safety/tx-power-guard.js';
import { createKiwiSdrAudioPlayer } from './kiwisdr-audio.js';
import profiles from './rig-profiles.json';

// --- Driver registry ---
const DRIVERS = {
  yaesu_ascii: yaesuAscii,
  kenwood_ascii: kenwoodAscii,
  icom_civ: icomCiv,
  elecraft_ascii: elecraftAscii,
  kiwisdr_ws: kiwisdrWs,
  tci: tciDriver,
};

// --- Singleton state ---
let rigManager = null;
let rigStore = null;
let activeSafetyModules = []; // { stop() } — cleaned up on disconnect
let sdrAudioPlayer = null;    // KiwiSDR audio player — created on SDR connect

// --- Get or create the shared rig state store ---
export function getRigStore() {
  if (!rigStore) {
    rigStore = createRigStateStore();
  }
  return rigStore;
}

// --- Connect to a rig ---
// config: { profileId, protocolFamily, protocol, serialConfig, demo,
//           autoDetect, existingPort, onDetectProgress,
//           propagation, latitude, longitude,
//           baudRate, dataBits, stopBits, parity, flowControl,
//           pttMethod, pollingInterval, civAddress,
//           safetyTxIntent, safetyBandLockout, safetyAutoPower,
//           swrLimit, safePower,
//           sdrType, sdrHost, sdrPort, sdrPassword }
export async function connectRig(config = {}) {
  if (rigManager && rigManager.isConnected()) {
    console.warn('[cat] Already connected — disconnect first');
    return false;
  }

  const store = getRigStore();
  const trace = getTraceBus();
  trace.reset(); // fresh trace for each connection session
  const isDemo = config.demo || config.profileId === 'demo';
  const isSdr = config.sdrType === 'kiwisdr';

  trace.record('state', 'connect_start', {
    profileId: config.profileId,
    protocol: config.protocol || config.protocolFamily,
    autoDetect: !!config.autoDetect,
    demo: isDemo,
    sdr: isSdr,
  });

  // --- KiwiSDR path: WebSocket transport, no serial, RX only ---
  if (isSdr) {
    const sdrTransport = new KiwiSdrSocketTransport({
      host: config.sdrHost,
      port: config.sdrPort || 8073,
      password: config.sdrPassword || '',
    });

    const sdrDriver = DRIVERS.kiwisdr_ws;
    const sdrPolling = config.pollingInterval || 1000;

    rigManager = createRigManager(sdrTransport, sdrDriver, store, {
      pollingInterval: sdrPolling,
    });

    const success = await rigManager.connect();
    if (!success) {
      rigManager = null;
      return false;
    }

    // Push driver capabilities into store
    store.applyEvent({ type: 'capabilities', value: sdrDriver.capabilities() });
    store.set({
      sourceType: 'sdr',
      rxOnly: true,
      remoteName: sdrTransport.serverName,
    });

    // Wire audio: transport → audio player → speakers
    sdrAudioPlayer = createKiwiSdrAudioPlayer();
    sdrTransport.onAudioData((samples) => sdrAudioPlayer.feedSamples(samples));

    // No safety modules for RX-only SDR
    return true;
  }

  // --- Auto-detect path ---
  let resolvedProfileId = config.profileId;
  let resolvedProtocol = config.protocol || config.protocolFamily;
  let resolvedSerialConfig = config.serialConfig;
  let detectedTransport = null; // live transport from smart-detect (port already open)

  if (config.autoDetect && config.existingPort && !isDemo) {
    const detected = await smartDetect(config.existingPort, config.onDetectProgress);
    if (detected) {
      resolvedProfileId = detected.profileId;
      resolvedProtocol = detected.protocol;
      resolvedSerialConfig = detected.serialConfig;
      detectedTransport = detected.transport || null;
      trace.record('state', 'auto_detect_ok', {
        profileId: detected.profileId,
        protocol: detected.protocol,
        serialConfig: detected.serialConfig,
      });
    } else {
      trace.record('state', 'auto_detect_fail', {});
      // Detection failed — caller should handle
      return false;
    }
  }

  // --- Resolve profile ---
  let profile = null;
  if (resolvedProfileId && profiles.profiles[resolvedProfileId]) {
    profile = profiles.profiles[resolvedProfileId];
  }

  // --- Select driver ---
  const protocolFamily = resolvedProtocol
    || (profile && profile.protocol && profile.protocol.family)
    || 'yaesu_ascii';

  const driver = DRIVERS[protocolFamily];
  if (!driver) {
    throw new Error(`Unsupported protocol: ${protocolFamily}`);
  }

  // --- Configure CI-V address for Icom radios ---
  if (protocolFamily === 'icom_civ') {
    const civAddr = config.civAddress
      || (profile && profile.protocol && profile.protocol.civAddress);
    if (civAddr) driver.setCivAddress(civAddr);
  }

  // --- Build serial config ---
  // Priority: auto-detect result > explicit config fields > profile defaults > empty
  function buildSerialConfig() {
    if (resolvedSerialConfig) return resolvedSerialConfig;

    // Build from explicit fields (passed from state via UI)
    const explicit = {};
    if (config.baudRate && config.baudRate !== 'auto') explicit.baudRate = parseInt(config.baudRate, 10);
    if (config.dataBits) explicit.dataBits = config.dataBits;
    if (config.stopBits) explicit.stopBits = config.stopBits;
    if (config.parity) explicit.parity = config.parity;
    if (config.flowControl) explicit.flowControl = config.flowControl;

    // Merge: explicit fields override profile defaults
    const profileSerial = (profile && profile.serial) || {};
    return { ...profileSerial, ...explicit };
  }

  // --- Create transport ---
  // Reuse the live transport from smart-detect when available — avoids
  // closing and reopening the serial port, which can fail on some USB
  // adapters after the rapid open/close cycles during detection probing.
  let transport;
  const isTci = protocolFamily === 'tci';
  if (isDemo) {
    const engineOptions = {};
    if (config.propagation && config.propagation !== 'off') {
      engineOptions.propagation = config.propagation;
      if (config.latitude != null) engineOptions.latitude = config.latitude;
      if (config.longitude != null) engineOptions.longitude = config.longitude;
    }
    transport = new InMemoryTransport({ engineOptions });
  } else if (isTci) {
    transport = new TciWebSocketTransport({
      host: config.tciHost || 'localhost',
      port: config.tciPort || 50001,
    });
  } else if (detectedTransport) {
    // Reuse the transport that smart-detect left open — port is already connected
    transport = detectedTransport;
  } else {
    const serialConfig = buildSerialConfig();
    transport = new WebSerialTransport(serialConfig);
  }

  // --- Polling config ---
  const pollingInterval = config.pollingInterval
    || (profile && profile.control && profile.control.pollingInterval)
    || 500;

  // --- Create manager and connect ---
  rigManager = createRigManager(transport, driver, store, { pollingInterval });

  const success = await rigManager.connect(config.existingPort || null);
  if (!success) {
    trace.record('state', 'connect_fail', { profileId: resolvedProfileId });
    rigManager = null;
    return false;
  }

  trace.record('state', 'connected', {
    profileId: resolvedProfileId,
    protocol: protocolFamily,
    serialConfig: resolvedSerialConfig,
  });

  // Push driver capabilities into store
  if (driver && typeof driver.capabilities === 'function') {
    store.applyEvent({ type: 'capabilities', value: driver.capabilities() });
  }

  // Mark demo mode in store
  if (isDemo) {
    store.set({ demo: true });
  }

  // --- Safety modules (real radio only) ---
  if (!isDemo) {
    if (config.safetyTxIntent !== false) {
      const txIntent = createTxIntentSystem(store);
      txIntent.start();
      activeSafetyModules.push(txIntent);
    }

    if (config.safetyBandLockout !== false) {
      const bandGuard = createBandTransitionGuard(store);
      bandGuard.start();
      activeSafetyModules.push(bandGuard);
    }

    if (config.safetyAutoPower !== false) {
      const sendCmd = (cmd, val, pri) => {
        if (rigManager && rigManager.isConnected()) {
          rigManager.sendCommand(cmd, val, pri);
        }
      };
      const powerGuard = createTxPowerGuard(store, sendCmd, {
        swrLimit: config.swrLimit || 3.0,
        safePower: config.safePower || 20,
      });
      powerGuard.start();
      activeSafetyModules.push(powerGuard);
    }
  }

  return true;
}

// --- Disconnect from the current rig ---
export async function disconnectRig() {
  if (!rigManager) return;
  getTraceBus().record('state', 'disconnected', {});

  // Stop all safety modules
  for (const mod of activeSafetyModules) {
    try { mod.stop(); } catch (_) { /* ignore */ }
  }
  activeSafetyModules = [];

  // Clean up SDR audio player
  if (sdrAudioPlayer) {
    sdrAudioPlayer.destroy();
    sdrAudioPlayer = null;
  }

  await rigManager.disconnect();
  rigManager = null;

  const store = getRigStore();
  store.reset();
}

// --- Send a command to the connected rig ---
export function sendRigCommand(command, params, priority) {
  if (!rigManager || !rigManager.isConnected()) {
    console.warn('[cat] Not connected — cannot send command');
    return;
  }
  rigManager.sendCommand(command, params, priority);
}

// --- Get the SDR audio player (for mute control) ---
export function getSdrAudioPlayer() {
  return sdrAudioPlayer;
}

// --- Check if a rig is connected ---
export function isRigConnected() {
  return rigManager ? rigManager.isConnected() : false;
}

// --- Get available profiles for UI ---
export function getAvailableProfiles() {
  return Object.entries(profiles.profiles).map(([id, p]) => ({
    id,
    manufacturer: p.manufacturer,
    model: p.model,
    protocol: p.protocol.family,
    serial: p.serial,
    control: p.control,
    civAddress: p.protocol.civAddress || null,
  }));
}
