// --- Feature Flags: Visibility Gate System ---
// Controls which features are visible based on the user's callsign.
//
// Visibility tiers:
//   'dev:<CALLSIGN>'  — only that developer sees it (building/debugging)
//   'test'            — both dev callsigns see it (peer testing)
//   'release'         — everyone sees it (shipped)
//
// Usage:
//   import { isFeatureVisible } from './feature-flags.js';
//   if (isFeatureVisible('preset_profiles')) { /* render UI */ }
//
// Lifecycle: dev:KG5DPV → test → release
// When promoting, just change the tier string in FEATURE_FLAGS below.

import state from './state.js';

// --- Developer callsigns ---
const DEV_CALLSIGNS = ['KG5DPV', 'KJ5MMO'];

// --- Feature flag registry ---
// Add new features here. Change the tier as the feature matures.
const FEATURE_FLAGS = {
  preset_profiles: 'test',   // callsign-gated SSB presets (v0.68.0)
  pota_hunter: 'dev:KG5DPV', // POTA hunting helper — confirm QSO + spot reporter (v0.68.7)
};

// --- Check if a feature is visible to the current user ---
export function isFeatureVisible(featureName) {
  const tier = FEATURE_FLAGS[featureName];
  if (!tier) return true; // unknown feature = visible (safe default for unregistered features)

  if (tier === 'release') return true;

  const callsign = (state.myCallsign || '').toUpperCase();

  if (tier === 'test') {
    return DEV_CALLSIGNS.includes(callsign);
  }

  // 'dev:<CALLSIGN>' — only that specific developer
  if (tier.startsWith('dev:')) {
    const devCall = tier.slice(4).toUpperCase();
    return callsign === devCall;
  }

  return false;
}

// --- Get the tier for a feature (for debugging/display) ---
export function getFeatureTier(featureName) {
  return FEATURE_FLAGS[featureName] || 'release';
}

export { DEV_CALLSIGNS, FEATURE_FLAGS };
