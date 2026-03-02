// --- Config Sync ---
// Export/import config as compressed text codes, plus LAN sync push/pull.
// Export/import works everywhere. Push/pull gracefully 404 on hostedmode.

import pako from 'pako';

const CONFIG_VERSION = 1;

// Keys excluded from sync — device-specific, migration flags, or server-managed API keys
const EXCLUDE_KEYS = new Set([
  'hamtab_migrated',
  'hamtab_migration_v2',
  'hamtab_gps_lat',
  'hamtab_gps_lon',
  'hamtab_wx_apikey',
  'hamtab_owm_apikey',
  'hamtab_n2yo_apikey',
  'hamtab_hamqth_user',
  'hamtab_hamqth_pass',
  'hamtab_wx_station',
  'hamtab_active_tab',
  'hamtab_mobile_secondary',
  'hamtab_xtab_leader_v1',
]);

// --- Collect / Apply ---

export function collectSyncableConfig() {
  const config = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('hamtab_') && !EXCLUDE_KEYS.has(key)) {
      config[key] = localStorage.getItem(key);
    }
  }
  return config;
}

function applySyncableConfig(config) {
  if (!config || typeof config !== 'object') return;
  for (const [key, value] of Object.entries(config)) {
    if (typeof key !== 'string' || !key.startsWith('hamtab_')) continue;
    if (EXCLUDE_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
    }
  }
}

// --- Export / Import (compressed text code) ---

export function exportConfig() {
  const callsign = localStorage.getItem('hamtab_callsign') || 'UNKNOWN';
  const envelope = {
    version: CONFIG_VERSION,
    callsign,
    exportedAt: new Date().toISOString(),
    config: collectSyncableConfig(),
  };
  const json = JSON.stringify(envelope);
  const compressed = pako.deflate(new TextEncoder().encode(json));
  return btoa(String.fromCharCode(...compressed));
}

export function importConfig(code) {
  if (!code || typeof code !== 'string') {
    return { ok: false, error: 'No config code provided' };
  }
  try {
    const trimmed = code.trim();
    const binary = atob(trimmed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(pako.inflate(bytes));
    const envelope = JSON.parse(json);

    if (!envelope || typeof envelope !== 'object') {
      return { ok: false, error: 'Invalid config format' };
    }
    if (envelope.version !== CONFIG_VERSION) {
      return { ok: false, error: `Unsupported config version: ${envelope.version}` };
    }
    if (!envelope.config || typeof envelope.config !== 'object') {
      return { ok: false, error: 'Config data missing' };
    }

    applySyncableConfig(envelope.config);
    return { ok: true, callsign: envelope.callsign, exportedAt: envelope.exportedAt };
  } catch (e) {
    return { ok: false, error: 'Failed to decode config — check the code and try again' };
  }
}

// --- LAN Sync (push/pull to server — 404 on hostedmode) ---

let syncCapable = null; // cached for session

export async function checkSyncCapability() {
  if (syncCapable !== null) return syncCapable;
  try {
    const resp = await fetch('/api/sync/probe', { method: 'HEAD' });
    syncCapable = resp.ok || resp.status === 404; // 404 from the endpoint itself means it exists
    // Actually: if the route exists at all, the server supports sync.
    // A 404 means the route matched but no config found — still capable.
    // A non-match (e.g. hostedmode with no /api/sync route) returns 404 from Express catch-all.
    // We need a specific signal. Use a dedicated probe:
    syncCapable = resp.ok;
  } catch {
    syncCapable = false;
  }
  return syncCapable;
}

export async function pushConfig(callsign) {
  if (!callsign) return false;
  const envelope = {
    version: CONFIG_VERSION,
    callsign,
    config: collectSyncableConfig(),
  };
  try {
    const resp = await fetch(`/api/sync/${encodeURIComponent(callsign.toUpperCase())}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
    if (resp.ok) {
      localStorage.setItem('hamtab_sync_last_push', new Date().toISOString());
      return true;
    }
  } catch { /* hostedmode or network error — silent */ }
  return false;
}

export async function pullConfig(callsign) {
  if (!callsign) return false;
  try {
    const resp = await fetch(`/api/sync/${encodeURIComponent(callsign.toUpperCase())}`);
    if (!resp.ok) return false;
    const envelope = await resp.json();
    if (!envelope || envelope.version !== CONFIG_VERSION || !envelope.config) return false;

    // Only apply if server version is newer than our last pull
    const serverTime = envelope.updatedAt || envelope.exportedAt;
    const lastPull = localStorage.getItem('hamtab_sync_last_pull');
    if (lastPull && serverTime && new Date(serverTime) <= new Date(lastPull)) {
      return false; // server config is not newer
    }

    applySyncableConfig(envelope.config);
    localStorage.setItem('hamtab_sync_last_pull', new Date().toISOString());
    return true; // caller should reload
  } catch { /* hostedmode or network error — silent */ }
  return false;
}

export function isSyncEnabled() {
  return localStorage.getItem('hamtab_sync_enabled') === 'true';
}

export function setSyncEnabled(enabled) {
  localStorage.setItem('hamtab_sync_enabled', String(!!enabled));
}
