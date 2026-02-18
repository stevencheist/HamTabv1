import state from './state.js';
import { $ } from './dom.js';
import { esc } from './utils.js';

const wxBgClasses = ['wx-clear-day','wx-clear-night','wx-partly-cloudy-day','wx-partly-cloudy-night','wx-cloudy','wx-rain','wx-thunderstorm','wx-snow','wx-fog'];

function useWU() { return state.wxStation && state.wxApiKey; }

// NWS API only covers the US and territories
function isNwsCoverage(lat, lon) {
  return lat >= 17.5 && lat <= 72 && lon >= -180 && lon <= -64;
}

function setWxSource(src) {
  const wxSourceLogo = $('wxSourceLogo');
  wxSourceLogo.classList.remove('hidden', 'wx-src-wu', 'wx-src-nws', 'wx-src-owm');
  if (src === 'wu') {
    wxSourceLogo.textContent = 'WU';
    wxSourceLogo.title = 'Weather Underground';
    wxSourceLogo.classList.add('wx-src-wu');
  } else if (src === 'nws') {
    wxSourceLogo.textContent = 'NWS';
    wxSourceLogo.title = 'National Weather Service';
    wxSourceLogo.classList.add('wx-src-nws');
  } else if (src === 'owm') {
    wxSourceLogo.textContent = 'OWM';
    wxSourceLogo.title = 'OpenWeatherMap';
    wxSourceLogo.classList.add('wx-src-owm');
  } else {
    wxSourceLogo.classList.add('hidden');
  }
}

function doFetchWeather() {
  if (useWU()) {
    const url = '/api/weather?station=' + encodeURIComponent(state.wxStation) + '&apikey=' + encodeURIComponent(state.wxApiKey);
    fetch(url).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      const name = data.neighborhood || state.wxStation;
      const tempStr = data.temp != null ? data.temp + '\u00B0F' : '';
      const cond = data.condition || '';
      const wind = (data.windDir || '') + ' ' + (data.windSpeed != null ? data.windSpeed + 'mph' : '');
      const hum = data.humidity != null ? data.humidity + '%' : '';
      let line1 = [name, tempStr, cond].filter(Boolean).join('  ');
      let line2 = ['W: ' + wind.trim(), hum ? 'H: ' + hum : ''].filter(Boolean).join('  ');
      $('clockLocalWeather').innerHTML = esc(line1) + '<br>' + esc(line2);
      setWxSource('wu');
    }).catch(() => {
      $('clockLocalWeather').textContent = '';
      setWxSource(null);
    });
  }
}

export function fetchWeather() {
  if (state.weatherTimer) clearInterval(state.weatherTimer);
  doFetchWeather();
  state.weatherTimer = setInterval(doFetchWeather, 5 * 60 * 1000);
}

// Display weather conditions data in the local clock widget (shared by NWS and OWM)
function displayConditions(data, source) {
  applyWeatherBackground(data.shortForecast, data.isDaytime);
  if (!useWU()) {
    let tempStr = '';
    if (data.temperature != null) {
      const apiUnit = data.temperatureUnit || 'F';
      let temp = data.temperature;
      // Convert to user's preferred unit if different from API
      if (apiUnit !== state.temperatureUnit) {
        temp = apiUnit === 'F' ? Math.round((temp - 32) * 5 / 9) : Math.round(temp * 9 / 5 + 32);
      }
      tempStr = temp + '\u00B0' + state.temperatureUnit;
    }
    const cond = data.shortForecast || '';
    const wind = data.windDirection && data.windSpeed ? data.windDirection + ' ' + data.windSpeed : '';
    const hum = data.relativeHumidity != null ? data.relativeHumidity + '%' : '';
    let line1 = [tempStr, cond].filter(Boolean).join('  ');
    let line2 = [wind ? 'W: ' + wind : '', hum ? 'H: ' + hum : ''].filter(Boolean).join('  ');
    $('clockLocalWeather').innerHTML = esc(line1) + (line2 ? '<br>' + esc(line2) : '');
    setWxSource(source);
  }
}

export function fetchOwmConditions() {
  if (state.myLat === null || state.myLon === null) return;
  if (!state.owmApiKey) return;
  const url = '/api/weather/owm?lat=' + state.myLat + '&lon=' + state.myLon + '&apikey=' + encodeURIComponent(state.owmApiKey);
  fetch(url).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
    displayConditions(data, 'owm');
  }).catch(err => {
    console.warn('OWM conditions fetch failed:', err);
  });
}

export function fetchNwsConditions() {
  if (state.myLat === null || state.myLon === null) return;
  if (!isNwsCoverage(state.myLat, state.myLon)) {
    // Outside US — try OWM as global fallback
    fetchOwmConditions();
    return;
  }
  const url = '/api/weather/conditions?lat=' + state.myLat + '&lon=' + state.myLon;
  fetch(url).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
    displayConditions(data, 'nws');
  }).catch(err => {
    console.warn('NWS conditions fetch failed:', err);
    // NWS failed — fall back to OWM
    fetchOwmConditions();
  });
}

// Weather icon mapping for graphical display
const wxIcons = {
  'wx-clear-day': '☀️',
  'wx-clear-night': '🌙',
  'wx-partly-cloudy-day': '⛅',
  'wx-partly-cloudy-night': '☁️',
  'wx-cloudy': '☁️',
  'wx-rain': '🌧️',
  'wx-thunderstorm': '⛈️',
  'wx-snow': '❄️',
  'wx-fog': '🌫️'
};

function applyWeatherBackground(forecast, isDaytime) {
  const headerClock = $('headerClockLocal');
  const wxIcon = $('clockWxIcon');
  if (!headerClock) return;
  wxBgClasses.forEach(c => headerClock.classList.remove(c));
  if (!forecast) {
    if (wxIcon) wxIcon.textContent = '';
    return;
  }
  const fc = forecast.toLowerCase();
  let cls = '';
  if (/thunder|t-storm/.test(fc)) cls = 'wx-thunderstorm';
  else if (/snow|flurr|blizzard|sleet|ice/.test(fc)) cls = 'wx-snow';
  else if (/rain|drizzle|shower/.test(fc)) cls = 'wx-rain';
  else if (/fog|haze|mist/.test(fc)) cls = 'wx-fog';
  else if (/cloudy|overcast/.test(fc)) {
    if (/partly|mostly sunny/.test(fc)) cls = isDaytime ? 'wx-partly-cloudy-day' : 'wx-partly-cloudy-night';
    else cls = 'wx-cloudy';
  }
  else if (/sunny|clear/.test(fc)) cls = isDaytime ? 'wx-clear-day' : 'wx-clear-night';
  if (cls) {
    if (!state.disableWxBackgrounds) headerClock.classList.add(cls);
    if (wxIcon) wxIcon.textContent = wxIcons[cls] || '';
  }
}

export function fetchNwsAlerts() {
  if (state.myLat === null || state.myLon === null) return;
  if (!isNwsCoverage(state.myLat, state.myLon)) return;
  const url = '/api/weather/alerts?lat=' + state.myLat + '&lon=' + state.myLon;
  fetch(url).then(r => r.ok ? r.json() : Promise.reject()).then(alerts => {
    state.nwsAlerts = alerts;
    updateAlertBadge();
  }).catch(() => {
    state.nwsAlerts = [];
    updateAlertBadge();
  });
}

function updateAlertBadge() {
  const wxAlertBadge = $('wxAlertBadge');
  if (!state.nwsAlerts.length) {
    wxAlertBadge.classList.add('hidden');
    return;
  }
  wxAlertBadge.classList.remove('hidden');
  const sevOrder = ['Extreme','Severe','Moderate','Minor','Unknown'];
  let highest = 'Minor';
  for (const a of state.nwsAlerts) {
    if (sevOrder.indexOf(a.severity) < sevOrder.indexOf(highest)) highest = a.severity;
  }
  wxAlertBadge.className = 'wx-alert-badge wx-alert-' + highest.toLowerCase();
}

export function startNwsPolling() {
  if (state.nwsCondTimer) clearInterval(state.nwsCondTimer);
  if (state.nwsAlertTimer) clearInterval(state.nwsAlertTimer);
  fetchNwsConditions();
  fetchNwsAlerts();
  state.nwsCondTimer = setInterval(fetchNwsConditions, 15 * 60 * 1000);
  state.nwsAlertTimer = setInterval(fetchNwsAlerts, 5 * 60 * 1000);
}

export function initWeatherListeners() {
  $('wxAlertBadge').addEventListener('click', () => {
    const wxAlertList = $('wxAlertList');
    wxAlertList.innerHTML = '';
    for (const a of state.nwsAlerts) {
      const div = document.createElement('div');
      div.className = 'wx-alert-item';
      div.innerHTML =
        '<div class="wx-alert-event wx-sev-' + (a.severity || 'Unknown') + '">' + esc(a.event) + ' (' + esc(a.severity) + ')</div>' +
        '<div class="wx-alert-headline">' + esc(a.headline || '') + '</div>' +
        '<div class="wx-alert-desc">' + esc(a.description || '') + '</div>' +
        (a.web && /^https?:\/\//.test(a.web) ? '<div class="wx-alert-link"><a href="' + esc(a.web) + '" target="_blank" rel="noopener">View on NWS website</a></div>' : '');
      wxAlertList.appendChild(div);
    }
    $('wxAlertSplash').classList.remove('hidden');
  });

  $('wxAlertClose').addEventListener('click', () => {
    $('wxAlertSplash').classList.add('hidden');
  });
}
