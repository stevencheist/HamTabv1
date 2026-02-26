// --- CAT: Connection Orchestrator ---
// Single entry point for connecting to a rig.
// Handles: transport creation, driver selection, profile lookup, RigManager setup.
// Supports both real radio (WebSerial) and demo mode (InMemoryTransport).
// UI calls connectRig() / disconnectRig() — never touches internals.

import { WebSerialTransport } from './transports/web-serial.js';
import { InMemoryTransport } from './simulator/in-memory-transport.js';
import { yaesuAscii } from './drivers/yaesu-ascii.js';
import { kenwoodAscii } from './drivers/kenwood-ascii.js';
import { icomCiv } from './drivers/icom-civ.js';
import { elecraftAscii } from './drivers/elecraft-ascii.js';
import { createRigManager } from './rig-manager.js';
import { createRigStateStore } from './rig-state-store.js';
import { smartDetect } from './smart-detect.js';
import { createTxIntentSystem } from './safety/tx-intent-system.js';
import { createBandTransitionGuard } from './safety/band-transition-guard.js';
import { createTxPowerGuard } from './safety/tx-power-guard.js';
import profiles from './rig-profiles.json';

// --- Driver registry ---
const DRIVERS = {
  yaesu_ascii: yaesuAscii,
  kenwood_ascii: kenwoodAscii,
  icom_civ: icomCiv,
  elecraft_ascii: elecraftAscii,
};

// --- Singleton state ---
let rigManager = null;
let rigStore = null;
let activeSafetyModules = []; // { stop() } — cleaned up on disconnect

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
//           swrLimit, safePower }
export async function connectRig(config = {}) {
  if (rigManager && rigManager.isConnected()) {
    console.warn('[cat] Already connected — disconnect first');
    return false;
  }

  const store = getRigStore();
  const isDemo = config.demo || config.profileId === 'demo';

  // --- Auto-detect path ---
  let resolvedProfileId = config.profileId;
  let resolvedProtocol = config.protocol || config.protocolFamily;
  let resolvedSerialConfig = config.serialConfig;

  if (config.autoDetect && config.existingPort && !isDemo) {
    const detected = await smartDetect(config.existingPort, config.onDetectProgress);
    if (detected) {
      resolvedProfileId = detected.profileId;
      resolvedProtocol = detected.protocol;
      resolvedSerialConfig = detected.serialConfig;
    } else {
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
  let transport;
  if (isDemo) {
    const engineOptions = {};
    if (config.propagation && config.propagation !== 'off') {
      engineOptions.propagation = config.propagation;
      if (config.latitude != null) engineOptions.latitude = config.latitude;
      if (config.longitude != null) engineOptions.longitude = config.longitude;
    }
    transport = new InMemoryTransport({ engineOptions });
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
    rigManager = null;
    return false;
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

  // Stop all safety modules
  for (const mod of activeSafetyModules) {
    try { mod.stop(); } catch (_) { /* ignore */ }
  }
  activeSafetyModules = [];

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
