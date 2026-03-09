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
  { command: 'getProcessor',     stateField: 'processor',      setCommand: 'setProcessor' },
  { command: 'getProcessorLevel', stateField: 'processorLevel', setCommand: 'setProcessorLevel' },
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

// =====================================================================
// --- Preset Profiles (developer-only, radio-specific) ---
// Gated by callsign — only shown for KG5DPV (Francisco) and KJ5MMO (Steven).
// Each preset is keyed by radio modelId from the CAT ID command.
// =====================================================================

const PRESET_CALLSIGNS = ['KG5DPV', 'KJ5MMO'];

// --- FT-DX10 SSB Ragchew (community-recommended baseline) ---
// Sources: WirelessGirl FTDX101D guide, VK4DX review, groups.io ftdx-10
const FTDX10_SSB_RAGCHEW = {
  name: 'SSB Ragchew (DX10)',
  description: 'Processor OFF, wide bandwidth, clarity EQ. Zero ALC goal.',
  // Direct CAT commands
  settings: {
    micGain: 25,          // low — goal is zero ALC movement
    processor: 0,         // OFF for ragchew
    agc: 2,               // MID
    noiseBlanker: 0,      // off
    noiseReduction: 0,    // off
  },
  // EX menu commands: { p1, p2, p3, value, digits }
  menuCommands: [
    // MODE SSB (P1=01, P2=01) — RX filter settings
    { p1: 1, p2: 1, p3: 7,  value: 3,    digits: 2, label: 'LCUT FREQ → 200 Hz' },       // 03 = 200 Hz
    { p1: 1, p2: 1, p3: 8,  value: 1,    digits: 1, label: 'LCUT SLOPE → 18 dB/oct' },   // 1 = 18 dB/oct
    { p1: 1, p2: 1, p3: 9,  value: 43,   digits: 2, label: 'HCUT FREQ → 2800 Hz' },      // 43 = 2800 Hz (700 + 42*50)
    { p1: 1, p2: 1, p3: 10, value: 1,    digits: 1, label: 'HCUT SLOPE → 18 dB/oct' },
    { p1: 1, p2: 1, p3: 12, value: 2,    digits: 1, label: 'TX BPF SEL → 200-2800 Hz' }, // 2 = 200~2800

    // TX AUDIO (P1=03, P2=03) — Parametric EQ (processor OFF EQ)
    { p1: 3, p2: 3, p3: 1,  value: 0,    digits: 1, label: 'AMC RELEASE → FAST' },
    { p1: 3, p2: 3, p3: 2,  value: 3,    digits: 2, label: 'EQ1 FREQ → 300 Hz' },         // 03 = 300 Hz
    { p1: 3, p2: 3, p3: 3,  value: '-06', digits: 3, label: 'EQ1 LEVEL → -6 dB' },        // cut low-end mud
    { p1: 3, p2: 3, p3: 4,  value: 1,    digits: 2, label: 'EQ1 BWTH → 1' },
    { p1: 3, p2: 3, p3: 5,  value: 0,    digits: 2, label: 'EQ2 FREQ → OFF' },             // no mid EQ
    { p1: 3, p2: 3, p3: 6,  value: '+00', digits: 3, label: 'EQ2 LEVEL → 0 dB' },
    { p1: 3, p2: 3, p3: 7,  value: 1,    digits: 2, label: 'EQ2 BWTH → 1' },
    { p1: 3, p2: 3, p3: 8,  value: 10,   digits: 2, label: 'EQ3 FREQ → 2400 Hz' },        // 10 = 2400 Hz
    { p1: 3, p2: 3, p3: 9,  value: '+10', digits: 3, label: 'EQ3 LEVEL → +10 dB' },       // presence/clarity boost
    { p1: 3, p2: 3, p3: 10, value: 1,    digits: 2, label: 'EQ3 BWTH → 1' },
  ],
};

// --- FT-DX10 SSB Contest / DX (processor ON, narrow bandwidth) ---
const FTDX10_SSB_CONTEST = {
  name: 'SSB Contest (DX10)',
  description: 'Processor ON at 80, narrow TX BPF, aggressive EQ for pileup punch.',
  settings: {
    micGain: 40,
    processor: 1,         // ON for contest
    processorLevel: 80,   // strong compression
    agc: 1,               // FAST — quick recovery between callers
    noiseBlanker: 0,
    noiseReduction: 0,
  },
  menuCommands: [
    // MODE SSB (P1=01, P2=01)
    { p1: 1, p2: 1, p3: 12, value: 4,    digits: 1, label: 'TX BPF SEL → 400-2600 Hz' }, // narrow for punch

    // TX AUDIO (P1=03, P2=03) — Processor EQ (P PRMTRC, active when processor ON)
    { p1: 3, p2: 3, p3: 1,  value: 0,    digits: 1, label: 'AMC RELEASE → FAST' },
    { p1: 3, p2: 3, p3: 11, value: 3,    digits: 2, label: 'P EQ1 FREQ → 300 Hz' },
    { p1: 3, p2: 3, p3: 12, value: '-13', digits: 3, label: 'P EQ1 LEVEL → -13 dB' },    // aggressive bass cut
    { p1: 3, p2: 3, p3: 13, value: 2,    digits: 2, label: 'P EQ1 BWTH → 2' },
    { p1: 3, p2: 3, p3: 14, value: 9,    digits: 2, label: 'P EQ2 FREQ → 1500 Hz' },     // 09 = 1500 Hz
    { p1: 3, p2: 3, p3: 15, value: '+06', digits: 3, label: 'P EQ2 LEVEL → +6 dB' },     // midrange presence
    { p1: 3, p2: 3, p3: 16, value: 1,    digits: 2, label: 'P EQ2 BWTH → 1' },
    { p1: 3, p2: 3, p3: 17, value: 11,   digits: 2, label: 'P EQ3 FREQ → 2500 Hz' },     // 11 = 2500 Hz
    { p1: 3, p2: 3, p3: 18, value: '+06', digits: 3, label: 'P EQ3 LEVEL → +6 dB' },     // high-freq intelligibility
    { p1: 3, p2: 3, p3: 19, value: 3,    digits: 2, label: 'P EQ3 BWTH → 3' },
  ],
};

// --- FT-891 SSB Ragchew (basic — no parametric EQ via CAT) ---
// The FT-891 has fewer DSP options accessible via CAT than the DX10.
// EX menu addresses differ — pending FT-891 CAT manual from Codex.
const FT891_SSB_RAGCHEW = {
  name: 'SSB Ragchew (891)',
  description: 'Basic SSB voice settings. Processor OFF, AGC MID.',
  settings: {
    micGain: 30,
    processor: 0,
    agc: 2,               // MID
    noiseBlanker: 0,
    noiseReduction: 0,
  },
  menuCommands: [],       // pending FT-891 CAT manual — EX addresses differ from DX10
};

// --- Preset registry keyed by radio modelId ---
const PRESET_REGISTRY = {
  '0761': [FTDX10_SSB_RAGCHEW, FTDX10_SSB_CONTEST],   // FT-DX10
  '0650': [FT891_SSB_RAGCHEW],                           // FT-891
};

// --- Get available presets for current callsign + radio ---
export function getPresets(callsign, radioModelId) {
  if (!callsign || !PRESET_CALLSIGNS.includes(callsign.toUpperCase())) return [];
  return PRESET_REGISTRY[radioModelId] || [];
}

// --- Apply a preset to the radio ---
export function applyPreset(preset) {
  if (!preset) return false;

  const store = getRigStore();
  const caps = store.get().capabilities || [];

  // Apply direct CAT settings
  if (preset.settings) {
    for (const s of PROFILE_SETTINGS) {
      const val = preset.settings[s.stateField];
      if (val !== null && val !== undefined) {
        sendRigCommand(s.setCommand, val, 1);
      }
    }
  }

  // Apply EX menu commands
  if (caps.includes('menu_set') && preset.menuCommands) {
    for (const m of preset.menuCommands) {
      sendRigCommand('setMenu', {
        p1: m.p1, p2: m.p2, p3: m.p3,
        value: m.value, digits: m.digits,
      }, 1);
    }
  }

  return true;
}
