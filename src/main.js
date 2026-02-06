// Migration must run first, before state.js reads localStorage
import { migrate, migrateV2 } from './migration.js';
migrate();
migrateV2();

// Theme must apply before any rendering to avoid flash of unstyled content
import { initTheme } from './themes.js';
initTheme();

import state from './state.js';
import { $ } from './dom.js';
import { loadSolarFieldVisibility } from './solar.js';
import { loadLunarFieldVisibility } from './lunar.js';
import { loadWidgetVisibility } from './widgets.js';
import { loadSpotColumnVisibility } from './spots.js';

// Initialize visibility state
state.solarFieldVisibility = loadSolarFieldVisibility();
state.lunarFieldVisibility = loadLunarFieldVisibility();
state.widgetVisibility = loadWidgetVisibility();
state.spotColumnVisibility = loadSpotColumnVisibility();

import { initMap, centerMapOnUser, updateUserMarker, updateSunMarker, updateMoonMarker, updateBeaconMarkers } from './map-init.js';
import { initWidgets } from './widgets.js';
import { switchSource, initSourceListeners } from './source.js';
import { initFilterListeners } from './filters.js';
import { initTooltipListeners } from './tooltip.js';
import { initSplashListeners, showSplash, updateOperatorDisplay, fetchLocation, setInitApp } from './splash.js';
import { initConfigListeners } from './config.js';
import { initRefreshListeners, refreshAll, startAutoRefresh } from './refresh.js';
import { initUpdateListeners, startUpdateStatusPolling, sendUpdateInterval } from './update.js';
import { initFullscreenListeners } from './fullscreen.js';
import { initWeatherListeners, fetchWeather, startNwsPolling } from './weather.js';
import { initPropListeners, updateGrayLine, initSolarImage } from './solar.js';
import { updateClocks } from './clocks.js';
import { renderSpots } from './spots.js';
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
import { initDedxListeners, renderDedxInfo } from './dedx-info.js';

// Initialize map
initMap();

// Initialize gray line + sun marker
updateGrayLine();
updateSunMarker();
setInterval(() => { updateGrayLine(); updateSunMarker(); }, 60000); // 60 s — gray line + sun marker refresh

// Satellite tracking (multi-satellite via N2YO)
initSatellites();
setInterval(fetchIssPosition, 10000); // 10 s — ISS position refresh (free, no API key)
setInterval(fetchSatellitePositions, 10000); // 10 s — other satellite position refresh (N2YO)

// Clocks
updateClocks();
setInterval(updateClocks, 1000);
setInterval(renderSpots, 30000); // 30 s — re-render spot table to update age column

// Set up all event listeners
initSourceListeners();
initFilterListeners();
initTooltipListeners();
initSplashListeners();
initConfigListeners();
initRefreshListeners();
initUpdateListeners();
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

// Wire initApp into splash dismissal
function initApp() {
  if (state.appInitialized) return;
  state.appInitialized = true;
  refreshAll();
  startAutoRefresh();
  fetchLocation();
  startUpdateStatusPolling();
  sendUpdateInterval();
  fetchWeather();
  startNwsPolling();
  fetchLiveSpots();
  fetchVoacapMatrix();
  fetchSpaceWxData();
  startBeaconTimer();
  fetchDxpeditions();
  fetchContests();
  renderDedxInfo();
  updateBeaconMarkers();
}

// Live Spots refresh (5 min — PSKReporter rate limit)
setInterval(fetchLiveSpots, 5 * 60 * 1000);

// VOACAP matrix refresh — render every minute (for hour transitions), server fetch throttled to 5 min
setInterval(renderVoacapMatrix, 60 * 1000);
setInterval(fetchVoacapMatrixThrottled, 60 * 1000);

// Beacon map markers — refresh every 10s (same as beacon rotation)
setInterval(updateBeaconMarkers, 10000);

setInitApp(initApp);

// Initialize widgets
initWidgets();

// Restore saved source tab
switchSource(state.currentSource);

// Fix map size after layout settles
if (state.map) setTimeout(() => state.map.invalidateSize(), 100);

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
