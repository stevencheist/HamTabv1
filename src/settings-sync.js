// --- Settings sync via Workers KV (hostedmode) ---

const SYNC_KEYS = [
  'hamtab_callsign',
  'hamtab_lat',
  'hamtab_lon',
  'hamtab_gps_lat',
  'hamtab_gps_lon',
  'hamtab_time24',
  'hamtab_spot_source',
  'hamtab_privilege_filter',
  'hamtab_license_class',
  'hamtab_prop_metric',
  'hamtab_map_center',
  'hamtab_clock_style',
  'hamtab_wx_station',
  'hamtab_wx_apikey',
  'hamtab_map_overlays',
  'hamtab_widgets_user',
  'hamtab_widget_visibility',
  'hamtab_solar_fields',
  'hamtab_lunar_fields',
  'hamtab_spot_columns',
  'hamtab_sdo_type',
];

// Pull remote settings on startup — if anything differs, write to localStorage and reload
export async function pullSettings() {
  try {
    const resp = await fetch('/api/settings');
    if (!resp.ok) return;
    const remote = await resp.json();
    if (!remote || typeof remote !== 'object') return;

    let changed = false;
    for (const key of SYNC_KEYS) {
      if (key in remote) {
        const local = localStorage.getItem(key);
        const remoteVal = remote[key] === null ? null : String(remote[key]);
        if (local !== remoteVal) {
          if (remoteVal === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, remoteVal);
          }
          changed = true;
        }
      }
    }

    if (changed) location.reload();
  } catch {
    // Offline or endpoint unavailable — skip silently
  }
}

// Push local settings to remote after splash dismiss (debounced 2s)
let pushTimer = null;

export function pushSettings() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const payload = {};
    for (const key of SYNC_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) payload[key] = val;
    }
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, 2000); // 2 s debounce
}
