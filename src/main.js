// Migration must run first, before state.js reads localStorage
import { migrate } from './migration.js';
migrate();

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

import { initMap, centerMapOnUser, updateUserMarker } from './map-init.js';
import { initWidgets } from './widgets.js';
import { switchSource, initSourceListeners } from './source.js';
import { initFilterListeners } from './filters.js';
import { initTooltipListeners } from './tooltip.js';
import { initSplashListeners, showSplash, updateOperatorDisplay, fetchLocation, setInitApp } from './splash.js';
import { initConfigListeners } from './config.js';
import { initBandRefListeners } from './bandref.js';
import { initRefreshListeners, refreshAll, startAutoRefresh } from './refresh.js';
import { initUpdateDisplay } from './update.js';
import { pullSettings } from './settings-sync.js';
import { initFullscreenListeners } from './fullscreen.js';
import { initWeatherListeners, fetchWeather, startNwsPolling } from './weather.js';
import { initPropListeners, updateGrayLine, initSolarImage } from './solar.js';
import { updateClocks } from './clocks.js';
import { renderSpots } from './spots.js';
import { fetchISS, fetchISSOrbit } from './iss.js';
import { initSpotDetail } from './spot-detail.js';

// Initialize map
initMap();

// Pull remote settings — reloads page if remote settings differ from local
pullSettings();

// Initialize gray line
updateGrayLine();
setInterval(updateGrayLine, 60000);

// ISS tracking
setInterval(fetchISS, 5000); // 5 s — ISS position refresh (matches API update cadence)
fetchISS();
fetchISSOrbit();
setInterval(fetchISSOrbit, 300000); // 5 min — full orbit path refresh (TLE changes infrequently)

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
initBandRefListeners();
initRefreshListeners();
initFullscreenListeners();
initWeatherListeners();
initPropListeners();
initSolarImage();
initSpotDetail();

// Wire initApp into splash dismissal
function initApp() {
  if (state.appInitialized) return;
  state.appInitialized = true;
  refreshAll();
  startAutoRefresh();
  fetchLocation();
  initUpdateDisplay();
  fetchWeather();
  startNwsPolling();
}

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
