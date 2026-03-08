// Migration must run first, before state.js reads localStorage
import { migrate, migrateV2 } from './migration.js';
migrate();
migrateV2();

// Theme must apply before any rendering to avoid flash of unstyled content
import { initTheme } from './themes.js';
initTheme();

import state from './state.js';
if (state.a11yReducedMotion) document.body.classList.add('reduced-motion');
import { $ } from './dom.js';
import { loadSolarFieldVisibility } from './solar.js';
import { loadLunarFieldVisibility } from './lunar.js';
import { loadWidgetVisibility, isWidgetVisible, getPendingNewWidgets } from './widgets.js';
import { loadSpotColumnVisibility } from './spots.js';

// Initialize visibility state
state.solarFieldVisibility = loadSolarFieldVisibility();
state.lunarFieldVisibility = loadLunarFieldVisibility();
state.widgetVisibility = loadWidgetVisibility();
state.spotColumnVisibility = loadSpotColumnVisibility();

// Cross-tab leader election — leader tab handles periodic fetches, followers skip
initCrossTab();

import { initMap, centerMapOnUser, updateUserMarker, updateSunMarker, updateMoonMarker, updateBeaconMarkers } from './map-init.js';
import { initWidgets } from './widgets.js';
import { switchSource, initSourceListeners } from './source.js';
import { initFilterListeners } from './filters.js';
import { initTooltipListeners } from './tooltip.js';
import { initSplashListeners, showSplash, updateOperatorDisplay, fetchLocation, setInitApp } from './splash.js';
import { initConfigListeners } from './config.js';
import { initRefreshListeners, refreshAll, startAutoRefresh } from './refresh.js';
import { initUpdateDisplay } from './update.js';
import { pullSettings } from './settings-sync.js';
import { initFullscreenListeners } from './fullscreen.js';
import { initWeatherListeners, fetchWeather, startNwsPolling } from './weather.js';
import { initPropListeners, updateGrayLine, initSolarImage } from './solar.js';
import { updateClocks } from './clocks.js';
import { updateSpotAges } from './spots.js';
import { initSatellites, fetchSatellitePositions, fetchIssPosition } from './satellites.js';
import { initSpotDetail } from './spot-detail.js';
import { initDayNightToggle, renderPropagationWidget } from './band-conditions.js';
import { initHelpListeners } from './help.js';
import { initReferenceListeners } from './reference.js';
import { initFeedbackListeners } from './feedback.js';
import { initLiveSpotsListeners, fetchLiveSpots, renderLiveSpotsOnMap } from './live-spots.js';
import { initVoacapListeners, renderVoacapMatrix, fetchVoacapMatrix, fetchVoacapMatrixThrottled } from './voacap.js';
import { initHeatmapListeners } from './rel-heatmap.js';
import { initSpaceWxListeners, fetchSpaceWxData } from './spacewx-graphs.js';
import { initBeaconListeners, startBeaconTimer } from './beacons.js';
import { initDxpeditionListeners, fetchDxpeditions } from './dxpeditions.js';
import { initContestListeners, fetchContests } from './contests.js';
import { initDedxListeners, renderDedxInfo, startDedxTimer } from './dedx-info.js';
import { initBigClock, updateBigClock } from './big-clock.js';
import { initStopwatchListeners } from './stopwatch.js';
import { initAnalogClock, updateAnalogClock } from './analog-clock.js';
import { initClockConfigListeners } from './clock-config.js';
import { initMobileMenu } from './menu.js';
import { initTabs } from './tabs.js';
import { initLayoutDropdown } from './layouts.js';
import { openModal, closeModal } from './a11y.js';
import { pullConfig, isSyncEnabled } from './config-sync.js';
import { initOnAirRig, destroyOnAirRig } from './on-air-rig.js';
import { initLogbook, renderLogbookOnMap } from './logbook.js';
import { initCrossTab, isLeaderTab } from './cross-tab.js';

// Initialize map
initMap();

// Pull remote settings — reloads page if remote settings differ from local
pullSettings();

// Initialize gray line + sun marker
updateGrayLine();
updateSunMarker();
setInterval(() => { if (document.hidden) return; updateGrayLine(); updateSunMarker(); }, 60000); // 60 s — gray line + sun marker refresh

// Satellite tracking (multi-satellite via N2YO)
initSatellites();
setInterval(() => { if (document.hidden || !isWidgetVisible('widget-satellites') || !isLeaderTab()) return; fetchIssPosition(); }, 10000); // 10 s — ISS position refresh (free, no API key)
setInterval(() => { if (document.hidden || !isWidgetVisible('widget-satellites') || !isLeaderTab()) return; fetchSatellitePositions(); }, 10000); // 10 s — other satellite position refresh (N2YO)

// Clocks — purely visual, skip entirely when hidden
updateClocks();
setInterval(() => { if (document.hidden) return; updateClocks(); updateBigClock(); updateAnalogClock(); }, 1000);
setInterval(() => { if (document.hidden) return; updateSpotAges(); }, 30000); // 30 s — patch age cells in place (avoids full table rebuild)

// Set up all event listeners
initSourceListeners();
initFilterListeners();
initTooltipListeners();
initSplashListeners();
initConfigListeners();
initRefreshListeners();
initFullscreenListeners();
initWeatherListeners();
initPropListeners();
initSolarImage();
initDayNightToggle();
initSpotDetail();
initHelpListeners();
initReferenceListeners();
initFeedbackListeners();
initLiveSpotsListeners();
initVoacapListeners();
initHeatmapListeners();
initSpaceWxListeners();
initBeaconListeners();
initDxpeditionListeners();
initContestListeners();
initDedxListeners();
initBigClock();
initStopwatchListeners();
initAnalogClock();
initClockConfigListeners();
initMobileMenu();
initTabs();
initOnAirRig(); // RADIO_HIDDEN — temporarily re-enabled for scope testing
initLogbook();

// --- New widget notification popup ---
// Listeners registered once to prevent accumulation on repeated calls
let newWidgetPopupListenersAttached = false;
function showNewWidgetPopup(widgetNames) {
  const popup = $('newWidgetPopup');
  const list = $('newWidgetList');
  if (!popup || !list) return;
  list.innerHTML = '';
  widgetNames.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    list.appendChild(li);
  });
  openModal(popup, { focusEl: $('newWidgetDismiss') });
  if (!newWidgetPopupListenersAttached) {
    newWidgetPopupListenersAttached = true;
    $('newWidgetDismiss').addEventListener('click', () => {
      closeModal(popup);
    });
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closeModal(popup);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !popup.classList.contains('hidden')) {
        if (!state.a11yEscapeClose) return;
        closeModal(popup);
      }
    });
  }
}

// Wire initApp into splash dismissal
function initApp() {
  if (state.appInitialized) return;
  state.appInitialized = true;
  refreshAll();
  if (state.autoRefreshEnabled) startAutoRefresh();
  fetchLocation();
  initUpdateDisplay();
  fetchWeather();
  startNwsPolling();
  if (isWidgetVisible('widget-live-spots')) fetchLiveSpots();
  if (isWidgetVisible('widget-voacap') || state.hfPropOverlayBand) fetchVoacapMatrix();
  if (isWidgetVisible('widget-spacewx')) fetchSpaceWxData();
  if (isWidgetVisible('widget-beacons')) startBeaconTimer();
  if (isWidgetVisible('widget-dxpeditions') || state.mapOverlays.dxpedMarkers) fetchDxpeditions();
  if (isWidgetVisible('widget-contests')) fetchContests();
  if (isWidgetVisible('widget-dedx')) startDedxTimer();
  if (isWidgetVisible('widget-beacons')) updateBeaconMarkers();

  // Notify returning users about newly added widgets
  const newWidgets = getPendingNewWidgets();
  if (newWidgets.length > 0) showNewWidgetPopup(newWidgets);
}

// Live Spots refresh (5 min — PSKReporter rate limit) — leader tab only
setInterval(() => { if (document.hidden || !isWidgetVisible('widget-live-spots') || !isLeaderTab()) return; fetchLiveSpots(); }, 5 * 60 * 1000);

// VOACAP matrix refresh — render every minute (for hour transitions), fetch leader-only
setInterval(() => { if (document.hidden) return; if (isWidgetVisible('widget-voacap') || state.hfPropOverlayBand) renderVoacapMatrix(); }, 60 * 1000);
setInterval(() => { if (document.hidden || !isLeaderTab()) return; if (isWidgetVisible('widget-voacap') || state.hfPropOverlayBand) fetchVoacapMatrixThrottled(); }, 60 * 1000);

// Beacon map markers — refresh every 10s (same as beacon rotation)
setInterval(() => { if (document.hidden || !isWidgetVisible('widget-beacons')) return; updateBeaconMarkers(); }, 10000);

// DE/DX Info refresh — timer managed internally by dedx-info.js (1s for live clocks)

// --- Hidden-tab catch-up ---
// When the tab returns to foreground, immediately refresh visual state that was skipped
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !state.appInitialized) return;
  // Catch up visual-only updates immediately
  updateClocks();
  updateBigClock();
  updateAnalogClock();
  updateSpotAges();
  updateGrayLine();
  updateSunMarker();
  if (isWidgetVisible('widget-beacons')) updateBeaconMarkers();
  if (isWidgetVisible('widget-voacap') || state.hfPropOverlayBand) renderVoacapMatrix();
});

setInitApp(initApp);

// Initialize widgets
initWidgets();

// Initialize layout profiles dropdown
initLayoutDropdown();

// Restore saved source tab
switchSource(state.currentSource);

// Fix map size after layout settles
if (state.map) setTimeout(() => state.map.invalidateSize(), 100);

// Pull config from LAN sync server if enabled (async — reload if newer config found)
if (isSyncEnabled() && state.myCallsign) {
  pullConfig(state.myCallsign).then(applied => {
    if (applied) window.location.reload();
  }).catch(() => {});
}

// Show splash if no saved callsign, otherwise start immediately
if (state.myCallsign) {
  $('splash').classList.add('hidden');
  updateOperatorDisplay();
  centerMapOnUser();
  updateUserMarker();
  initApp();
} else {
  showSplash();
  fetchLocation();
}
