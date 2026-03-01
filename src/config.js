import state from './state.js';
import { $ } from './dom.js';
import { SOLAR_FIELD_DEFS, LUNAR_FIELD_DEFS, SOURCE_DEFS } from './constants.js';
import { renderSolar, saveSolarFieldVisibility } from './solar.js';
import { renderLunar, saveLunarFieldVisibility } from './lunar.js';
import { renderAllMapOverlays, saveMapOverlays, renderPropagationHeatmapOverlay, renderWsprHeatmapOverlay } from './map-overlays.js';
import { renderMarkers } from './markers.js';
import { renderSpots, saveSpotColumnVisibility } from './spots.js';
import { updateTableColumns } from './source.js';
import { renderDxpeditions } from './dxpeditions.js';
import { renderLogbookOnMap } from './logbook.js';

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
      $('mapOvDrap').checked = state.mapOverlays.drapOverlay;
      $('mapOvBandPaths').checked = state.mapOverlays.bandPaths;
      $('mapOvDxpedMarkers').checked = state.mapOverlays.dxpedMarkers;
      $('mapOvTropics').checked = state.mapOverlays.tropicsLines;
      $('mapOvWeatherRadar').checked = state.mapOverlays.weatherRadar;
      $('mapOvCloudCover').checked = state.mapOverlays.cloudCover;
      $('mapOvLegend').checked = state.mapOverlays.symbolLegend;
      $('mapOvLogbook').checked = state.mapOverlays.logbookQsos;
      $('mapOvPropHeatmap').checked = state.mapOverlays.propagationHeatmap;
      $('mapOvPropHeatmapBand').value = state.propagationHeatmapBand;
      $('mapOvWsprHeatmap').checked = state.mapOverlays.wsprHeatmap;
      $('mapOvWsprHeatmapBand').value = state.wsprHeatmapBand;
      $('mapOvWsprHeatmapScope').value = state.wsprHeatmapScope;
      mapOverlayCfgSplash.classList.remove('hidden');
    });
  }

  if (mapOverlayCfgOk) {
    mapOverlayCfgOk.addEventListener('click', () => {
      state.mapOverlays.latLonGrid = $('mapOvLatLon').checked;
      state.mapOverlays.maidenheadGrid = $('mapOvMaidenhead').checked;
      state.mapOverlays.timezoneGrid = $('mapOvTimezone').checked;
      state.mapOverlays.mufImageOverlay = $('mapOvMufImage').checked;
      state.mapOverlays.drapOverlay = $('mapOvDrap').checked;
      state.mapOverlays.bandPaths = $('mapOvBandPaths').checked;
      state.mapOverlays.dxpedMarkers = $('mapOvDxpedMarkers').checked;
      state.mapOverlays.tropicsLines = $('mapOvTropics').checked;
      state.mapOverlays.weatherRadar = $('mapOvWeatherRadar').checked;
      state.mapOverlays.cloudCover = $('mapOvCloudCover').checked;
      state.mapOverlays.symbolLegend = $('mapOvLegend').checked;
      state.mapOverlays.logbookQsos = $('mapOvLogbook').checked;
      state.mapOverlays.propagationHeatmap = $('mapOvPropHeatmap').checked;
      state.propagationHeatmapBand = $('mapOvPropHeatmapBand').value;
      localStorage.setItem('hamtab_prop_heatmap_band', state.propagationHeatmapBand);
      state.mapOverlays.wsprHeatmap = $('mapOvWsprHeatmap').checked;
      state.wsprHeatmapBand = $('mapOvWsprHeatmapBand').value;
      localStorage.setItem('hamtab_wspr_heatmap_band', state.wsprHeatmapBand);
      state.wsprHeatmapScope = $('mapOvWsprHeatmapScope').value;
      localStorage.setItem('hamtab_wspr_heatmap_scope', state.wsprHeatmapScope);
      saveMapOverlays();
      mapOverlayCfgSplash.classList.add('hidden');
      renderAllMapOverlays();
      renderPropagationHeatmapOverlay();
      renderWsprHeatmapOverlay();
      renderMarkers(); // refresh band path lines
      renderDxpeditions(); // refresh DXpedition markers on map
      renderLogbookOnMap(); // refresh logbook QSO markers on map
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
