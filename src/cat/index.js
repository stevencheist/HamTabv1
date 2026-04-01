// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- CAT: Public API ---
// All CAT interactions go through this module.
// Widgets import from here — never from drivers/transports directly.
export {
  connectRig,
  disconnectRig,
  sendRigCommand,
  isRigConnected,
  getRigStore,
  getSdrAudioPlayer,
  getAvailableProfiles,
} from './connection-orchestrator.js';

export { smartDetect } from './smart-detect.js';

export {
  saveProfile,
  restoreProfile,
  listProfiles,
  deleteProfile,
  profileSummary,
  getProfile,
  getPresets,
  applyPreset,
} from './profile-manager.js';
