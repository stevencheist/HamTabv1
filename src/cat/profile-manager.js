// --- CAT: Radio Profile Manager ---
// Save/restore radio settings to localStorage as named profiles.
// Reads current state from the radio via CAT commands, stores as a snapshot,
// and can restore by sending all settings back.
// Use case: save your SSB settings before WSJT-X changes everything,
// restore when you come back.

import { getRigStore, sendRigCommand } from './connection-orchestrator.js';

const PROFILES_KEY = 'hamtab_radio_profiles';

// --- Settings to read from the radio for a profile ---
// Each entry: { command, stateField, setCommand, digits? }
// command = CAT read command, stateField = where to find the result in rig state,
// setCommand = CAT set command to restore, digits = padding for set value
const PROFILE_SETTINGS = [
  { command: 'getFrequency',     stateField: 'frequency',      setCommand: 'setFrequency' },
  { command: 'getFrequencyB',    stateField: 'frequencyB',     setCommand: 'setFrequencyB' },
  { command: 'getMode',          stateField: 'mode',           setCommand: 'setMode' },
  { command: 'getRFPower',       stateField: 'rfPower',        setCommand: 'setRFPower' },
  { command: 'getAFGain',        stateField: 'afGain',         setCommand: 'setAFGain' },
  { command: 'getAGC',           stateField: 'agc',            setCommand: 'setAGC' },
  { command: 'getNoiseBlanker',  stateField: 'noiseBlanker',   setCommand: 'setNoiseBlanker' },
  { command: 'getNoiseReduction', stateField: 'noiseReduction', setCommand: 'setNoiseReduction' },
  { command: 'getAttenuator',    stateField: 'attenuator',     setCommand: 'setAttenuator' },
  { command: 'getPreamp',        stateField: 'preamp',         setCommand: 'setPreamp' },
  { command: 'getIFShift',       stateField: 'ifShift',        setCommand: 'setIFShift' },
  { command: 'getWidth',         stateField: 'width',          setCommand: 'setWidth' },
  { command: 'getNarrow',        stateField: 'narrow',         setCommand: 'setNarrow' },
  { command: 'getContour',       stateField: 'contour',        setCommand: 'setContour' },
  { command: 'getVoxGain',       stateField: 'voxGain',        setCommand: 'setVoxGain' },
  { command: 'getMonitorLevel',  stateField: 'monitorLevel',   setCommand: 'setMonitorLevel' },
  { command: 'getMicGain',       stateField: 'micGain',        setCommand: 'setMicGain' },
];

// --- Key EX menu settings to include in profiles ---
// These are the digital-related settings that WSJT-X changes
const PROFILE_MENU_ADDRESSES = [
  { p1: 1, p2: 4, p3: 15, digits: 1, label: 'DATA MOD SOURCE' },
  { p1: 1, p2: 4, p3: 16, digits: 1, label: 'REAR SELECT' },
  { p1: 3, p2: 4, p3: 5,  digits: 1, label: 'VOX SELECT' },
  { p1: 3, p2: 4, p3: 6,  digits: 3, label: 'DATA VOX GAIN' },
];

// --- Save a profile from current radio state ---
// Sends all read commands, waits for responses, then captures the state snapshot.
// Returns the profile object (also persisted to localStorage).
export async function saveProfile(name) {
  const store = getRigStore();
  const caps = store.get().capabilities || [];

  // Send all read commands
  for (const s of PROFILE_SETTINGS) {
    sendRigCommand(s.command, null, 1);
  }

  // Read menu settings if supported
  if (caps.includes('menu_read')) {
    for (const m of PROFILE_MENU_ADDRESSES) {
      sendRigCommand('getMenu', { p1: m.p1, p2: m.p2, p3: m.p3 }, 1);
    }
  }

  // Wait for responses to arrive (17 settings + 4 menus at ~60ms each ≈ 1.3s)
  await new Promise(r => setTimeout(r, 1500));

  // Capture current state
  const state = store.get();
  const settings = {};
  for (const s of PROFILE_SETTINGS) {
    const val = state[s.stateField];
    if (val !== null && val !== undefined) {
      settings[s.stateField] = val;
    }
  }

  // Capture menu settings
  const menuSettings = {};
  for (const m of PROFILE_MENU_ADDRESSES) {
    const key = `${String(m.p1).padStart(2,'0')}${String(m.p2).padStart(2,'0')}${String(m.p3).padStart(2,'0')}`;
    if (state.menuResponses[key]) {
      menuSettings[key] = state.menuResponses[key].numeric;
    }
  }

  const profile = {
    name,
    savedAt: new Date().toISOString(),
    radioId: state.radioId || 'unknown',
    settings,
    menuSettings,
  };

  // Persist to localStorage
  const profiles = loadAllProfiles();
  profiles[name] = profile;
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (_) {
    console.warn('[profile] Failed to save profile to localStorage');
  }

  return profile;
}

// --- Restore a named profile to the radio ---
// Sends all set commands from the saved profile.
export function restoreProfile(name) {
  const profiles = loadAllProfiles();
  const profile = profiles[name];
  if (!profile) return false;

  const store = getRigStore();
  const caps = store.get().capabilities || [];
  const settings = profile.settings || {};

  // Restore each setting
  for (const s of PROFILE_SETTINGS) {
    const val = settings[s.stateField];
    if (val !== null && val !== undefined) {
      sendRigCommand(s.setCommand, val, 1);
    }
  }

  // Restore menu settings
  if (caps.includes('menu_set') && profile.menuSettings) {
    for (const m of PROFILE_MENU_ADDRESSES) {
      const key = `${String(m.p1).padStart(2,'0')}${String(m.p2).padStart(2,'0')}${String(m.p3).padStart(2,'0')}`;
      if (key in profile.menuSettings) {
        sendRigCommand('setMenu', {
          p1: m.p1, p2: m.p2, p3: m.p3,
          value: profile.menuSettings[key], digits: m.digits,
        }, 1);
      }
    }
  }

  return true;
}

// --- List saved profile names ---
export function listProfiles() {
  const profiles = loadAllProfiles();
  return Object.keys(profiles).map(name => ({
    name,
    savedAt: profiles[name].savedAt,
    radioId: profiles[name].radioId,
  }));
}

// --- Delete a saved profile ---
export function deleteProfile(name) {
  const profiles = loadAllProfiles();
  delete profiles[name];
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (_) {}
}

// --- Get a specific profile's details ---
export function getProfile(name) {
  const profiles = loadAllProfiles();
  return profiles[name] || null;
}

// --- Load all profiles from localStorage ---
function loadAllProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

// --- Human-readable summary of a profile's settings ---
export function profileSummary(profile) {
  if (!profile || !profile.settings) return 'Empty profile';
  const s = profile.settings;
  const parts = [];
  if (s.frequency) parts.push(`${(s.frequency / 1e6).toFixed(3)} MHz`);
  if (s.mode) parts.push(s.mode);
  if (s.rfPower) parts.push(`${s.rfPower}W`);
  return parts.join(' / ') || 'No settings captured';
}
