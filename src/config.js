import state from './state.js';
import { $ } from './dom.js';
import { SOLAR_FIELD_DEFS, LUNAR_FIELD_DEFS, SOURCE_DEFS } from './constants.js';
import { renderSolar, saveSolarFieldVisibility } from './solar.js';
import { renderLunar, saveLunarFieldVisibility } from './lunar.js';
import { renderAllMapOverlays, saveMapOverlays } from './map-overlays.js';
import { renderMarkers } from './markers.js';
import { renderSpots, saveSpotColumnVisibility } from './spots.js';
import { updateTableColumns } from './source.js';
import { renderDxpeditions } from './dxpeditions.js';

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
      $('mapOvMufImage').checked = state.mapOverlays.mufImageOverlay;
      $('mapOvBandPaths').checked = state.mapOverlays.bandPaths;
      $('mapOvDxpedMarkers').checked = state.mapOverlays.dxpedMarkers;
      mapOverlayCfgSplash.classList.remove('hidden');
    });
  }

  if (mapOverlayCfgOk) {
    mapOverlayCfgOk.addEventListener('click', () => {
      state.mapOverlays.latLonGrid = $('mapOvLatLon').checked;
      state.mapOverlays.maidenheadGrid = $('mapOvMaidenhead').checked;
      state.mapOverlays.timezoneGrid = $('mapOvTimezone').checked;
      state.mapOverlays.mufImageOverlay = $('mapOvMufImage').checked;
      state.mapOverlays.bandPaths = $('mapOvBandPaths').checked;
      state.mapOverlays.dxpedMarkers = $('mapOvDxpedMarkers').checked;
      saveMapOverlays();
      mapOverlayCfgSplash.classList.add('hidden');
      renderAllMapOverlays();
      renderMarkers(); // refresh band path lines
      renderDxpeditions(); // refresh DXpedition markers on map
    });
  }

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
