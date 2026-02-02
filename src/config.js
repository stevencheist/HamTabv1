import state from './state.js';
import { $ } from './dom.js';
import { SOLAR_FIELD_DEFS, LUNAR_FIELD_DEFS, SOURCE_DEFS } from './constants.js';
import { renderSolar, saveSolarFieldVisibility } from './solar.js';
import { renderLunar, saveLunarFieldVisibility } from './lunar.js';
import { updateClocks, applyClockStyle, drawAnalogClock } from './clocks.js';
import { renderAllMapOverlays, saveMapOverlays } from './map-overlays.js';
import { getDefaultLayout, saveWidgets } from './widgets.js';
import { renderSpots, saveSpotColumnVisibility } from './spots.js';
import { updateTableColumns } from './source.js';

export function initConfigListeners() {
  // Solar config
  $('solarCfgBtn').addEventListener('mousedown', (e) => { e.stopPropagation(); });
  $('solarCfgBtn').addEventListener('click', () => {
    const solarFieldList = $('solarFieldList');
    solarFieldList.innerHTML = '';
    SOLAR_FIELD_DEFS.forEach(f => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.fieldKey = f.key;
      cb.checked = state.solarFieldVisibility[f.key] !== false;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(f.label));
      solarFieldList.appendChild(label);
    });
    $('solarCfgSplash').classList.remove('hidden');
  });

  $('solarCfgOk').addEventListener('click', () => {
    $('solarFieldList').querySelectorAll('input[type="checkbox"]').forEach(cb => {
      state.solarFieldVisibility[cb.dataset.fieldKey] = cb.checked;
    });
    saveSolarFieldVisibility();
    $('solarCfgSplash').classList.add('hidden');
    if (state.lastSolarData) renderSolar(state.lastSolarData);
  });

  // Lunar config
  $('lunarCfgBtn').addEventListener('mousedown', (e) => { e.stopPropagation(); });
  $('lunarCfgBtn').addEventListener('click', () => {
    const lunarFieldList = $('lunarFieldList');
    lunarFieldList.innerHTML = '';
    LUNAR_FIELD_DEFS.forEach(f => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.fieldKey = f.key;
      cb.checked = state.lunarFieldVisibility[f.key] !== false;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(f.label));
      lunarFieldList.appendChild(label);
    });
    $('lunarCfgSplash').classList.remove('hidden');
  });

  $('lunarCfgOk').addEventListener('click', () => {
    $('lunarFieldList').querySelectorAll('input[type="checkbox"]').forEach(cb => {
      state.lunarFieldVisibility[cb.dataset.fieldKey] = cb.checked;
    });
    saveLunarFieldVisibility();
    $('lunarCfgSplash').classList.add('hidden');
    if (state.lastLunarData) renderLunar(state.lastLunarData);
  });

  // Map overlay config
  const mapOverlayCfgBtn = $('mapOverlayCfgBtn');
  const mapOverlayCfgSplash = $('mapOverlayCfgSplash');
  const mapOverlayCfgOk = $('mapOverlayCfgOk');

  if (mapOverlayCfgBtn) {
    mapOverlayCfgBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    mapOverlayCfgBtn.addEventListener('click', () => {
      $('mapOvLatLon').checked = state.mapOverlays.latLonGrid;
      $('mapOvMaidenhead').checked = state.mapOverlays.maidenheadGrid;
      $('mapOvTimezone').checked = state.mapOverlays.timezoneGrid;
      mapOverlayCfgSplash.classList.remove('hidden');
    });
  }

  if (mapOverlayCfgOk) {
    mapOverlayCfgOk.addEventListener('click', () => {
      state.mapOverlays.latLonGrid = $('mapOvLatLon').checked;
      state.mapOverlays.maidenheadGrid = $('mapOvMaidenhead').checked;
      state.mapOverlays.timezoneGrid = $('mapOvTimezone').checked;
      saveMapOverlays();
      mapOverlayCfgSplash.classList.add('hidden');
      renderAllMapOverlays();
    });
  }

  // Clock config
  $('clockLocalCfgBtn').addEventListener('mousedown', (e) => { e.stopPropagation(); });
  $('clockUtcCfgBtn').addEventListener('mousedown', (e) => { e.stopPropagation(); });

  function showClockCfg() {
    if (state.clockStyle === 'analog') $('clockStyleAnalog').checked = true;
    else $('clockStyleDigital').checked = true;
    $('clockCfgSplash').classList.remove('hidden');
  }

  function dismissClockCfg() {
    state.clockStyle = document.querySelector('input[name="clockStyle"]:checked').value;
    localStorage.setItem('hamtab_clock_style', state.clockStyle);
    $('clockCfgSplash').classList.add('hidden');
    applyClockStyle();
    const def = getDefaultLayout();
    ['widget-clock-local', 'widget-clock-utc', 'widget-map'].forEach(id => {
      const el = document.getElementById(id);
      const pos = def[id];
      if (el && pos) {
        el.style.height = pos.height + 'px';
        el.style.top = pos.top + 'px';
      }
    });
    saveWidgets();
    if (state.map) state.map.invalidateSize();
    updateClocks();
  }

  $('clockLocalCfgBtn').addEventListener('click', showClockCfg);
  $('clockUtcCfgBtn').addEventListener('click', showClockCfg);
  $('clockCfgOk').addEventListener('click', dismissClockCfg);

  // Spot column config
  $('spotColCfgBtn').addEventListener('mousedown', (e) => { e.stopPropagation(); });
  $('spotColCfgBtn').addEventListener('click', () => {
    const fieldList = $('spotColFieldList');
    fieldList.innerHTML = '';
    SOURCE_DEFS[state.currentSource].columns.forEach(col => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.fieldKey = col.key;
      cb.checked = state.spotColumnVisibility[col.key] !== false;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(col.label));
      fieldList.appendChild(label);
    });
    $('spotColCfgSplash').classList.remove('hidden');
  });

  $('spotColCfgOk').addEventListener('click', () => {
    $('spotColFieldList').querySelectorAll('input[type="checkbox"]').forEach(cb => {
      state.spotColumnVisibility[cb.dataset.fieldKey] = cb.checked;
    });
    saveSpotColumnVisibility();
    $('spotColCfgSplash').classList.add('hidden');
    updateTableColumns();
    renderSpots();
  });
}
