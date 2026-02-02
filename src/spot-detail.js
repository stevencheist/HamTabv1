import state from './state.js';
import { $ } from './dom.js';
import { esc, cacheCallsign } from './utils.js';
import { freqToBand } from './filters.js';
import { bearingTo, bearingToCardinal, distanceMi, localTimeAtLon } from './geo.js';

// --- DX Detail Widget ---

let currentSpot = null;
let clockInterval = null;

// Weather cache keyed by rounded lat,lon
const spotDetailWeatherCache = {};

function weatherCacheKey(lat, lon) {
  return `${lat.toFixed(1)},${lon.toFixed(1)}`;
}

async function fetchCallsignInfo(call) {
  if (!call) return null;
  const key = call.toUpperCase();
  if (state.callsignCache[key]) return state.callsignCache[key];
  if (state.callsignCache[key] === null) return null;
  try {
    const resp = await fetch(`/api/callsign/${encodeURIComponent(key)}`);
    if (!resp.ok) { cacheCallsign(key, null); return null; }
    const data = await resp.json();
    if (data.status !== 'VALID') { cacheCallsign(key, null); return null; }
    cacheCallsign(key, data);
    return data;
  } catch {
    cacheCallsign(key, null);
    return null;
  }
}

async function fetchSpotWeather(lat, lon) {
  const key = weatherCacheKey(lat, lon);
  if (spotDetailWeatherCache[key]) return spotDetailWeatherCache[key];
  try {
    const resp = await fetch(`/api/weather/conditions?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    spotDetailWeatherCache[key] = data;
    return data;
  } catch {
    return null;
  }
}

function renderLocalTime(lon) {
  const el = document.getElementById('spotDetailTime');
  if (!el) return;
  el.textContent = localTimeAtLon(lon, state.use24h);
}

function wxClass(shortForecast) {
  if (!shortForecast) return '';
  const f = shortForecast.toLowerCase();
  if (f.includes('thunder') || f.includes('storm')) return 'wx-storm';
  if (f.includes('rain') || f.includes('shower') || f.includes('drizzle')) return 'wx-rain';
  if (f.includes('snow') || f.includes('sleet') || f.includes('ice') || f.includes('freezing')) return 'wx-snow';
  if (f.includes('cloud') || f.includes('overcast')) return 'wx-cloudy';
  if (f.includes('fog') || f.includes('haze') || f.includes('mist')) return 'wx-fog';
  if (f.includes('clear') || f.includes('sunny') || f.includes('fair')) return 'wx-clear';
  return '';
}

export async function updateSpotDetail(spot) {
  currentSpot = spot;
  const body = $('spotDetailBody');
  if (!body) return;

  const displayCall = spot.callsign || spot.activator || '';
  const qrzUrl = `https://www.qrz.com/db/${encodeURIComponent(displayCall)}`;
  const freq = spot.frequency || '';
  const mode = spot.mode || '';
  const band = freqToBand(freq) || '';
  const ref = spot.reference || '';

  // Reference link
  let refHtml = '';
  if (ref) {
    const refUrl = state.currentSource === 'sota'
      ? `https://www.sota.org.uk/Summit/${encodeURIComponent(ref)}`
      : `https://pota.app/#/park/${encodeURIComponent(ref)}`;
    refHtml = `<a href="${refUrl}" target="_blank" rel="noopener">${esc(ref)}</a>`;
  }

  // Bearing & distance
  let bearingHtml = '';
  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);
  if (state.myLat !== null && state.myLon !== null && !isNaN(lat) && !isNaN(lon)) {
    const deg = bearingTo(state.myLat, state.myLon, lat, lon);
    const mi = Math.round(distanceMi(state.myLat, state.myLon, lat, lon));
    bearingHtml = `
      <div class="spot-detail-row"><span class="spot-detail-label">Bearing from DE:</span> ${Math.round(deg)}° ${bearingToCardinal(deg)}</div>
      <div class="spot-detail-row"><span class="spot-detail-label">Distance from DE:</span> ${mi.toLocaleString()} mi</div>
    `;
  }

  // DX local time placeholder
  const localTime = !isNaN(lon) ? localTimeAtLon(lon, state.use24h) : '';

  body.innerHTML = `
    <div class="spot-detail-call"><a href="${qrzUrl}" target="_blank" rel="noopener">${esc(displayCall)}</a></div>
    <div class="spot-detail-name" id="spotDetailName"></div>
    <div class="spot-detail-row"><span class="spot-detail-label">Freq:</span> ${esc(freq)} MHz</div>
    <div class="spot-detail-row"><span class="spot-detail-label">Mode:</span> ${esc(mode)}</div>
    ${band ? `<div class="spot-detail-row"><span class="spot-detail-label">Band:</span> ${esc(band)}</div>` : ''}
    ${refHtml ? `<div class="spot-detail-row"><span class="spot-detail-label">Ref:</span> ${refHtml}</div>` : ''}
    ${spot.name ? `<div class="spot-detail-row"><span class="spot-detail-label">Name:</span> ${esc(spot.name)}</div>` : ''}
    ${bearingHtml}
    ${!isNaN(lon) ? `<div class="spot-detail-row"><span class="spot-detail-label">DX Time:</span> <span id="spotDetailTime">${esc(localTime)}</span></div>` : ''}
    ${spot.comments ? `<div class="spot-detail-row spot-detail-comments">${esc(spot.comments)}</div>` : ''}
    <div class="spot-detail-wx" id="spotDetailWx"></div>
  `;

  // Start ticking local time
  if (clockInterval) clearInterval(clockInterval);
  if (!isNaN(lon)) {
    clockInterval = setInterval(() => renderLocalTime(lon), 1000);
  }

  // Fetch callsign info async
  const info = await fetchCallsignInfo(displayCall);
  const nameEl = document.getElementById('spotDetailName');
  if (info && nameEl && currentSpot === spot) {
    const parts = [];
    if (info.name) parts.push(info.name);
    if (info.class) parts.push(`(${info.class})`);
    if (info.grid) parts.push(`· ${info.grid}`);
    if (info.addr2) parts.push(`· ${info.addr2}`);
    nameEl.textContent = parts.join(' ');
  }

  // Fetch NWS weather async (US spots only)
  if (!isNaN(lat) && !isNaN(lon)) {
    const wxEl = document.getElementById('spotDetailWx');
    const wx = await fetchSpotWeather(lat, lon);
    if (wx && wxEl && currentSpot === spot) {
      const cls = wxClass(wx.shortForecast);
      wxEl.className = `spot-detail-wx ${cls}`;
      wxEl.innerHTML = `
        <span class="spot-detail-label">Weather:</span>
        ${esc(wx.shortForecast || '')} ${wx.temperature != null ? `${wx.temperature}°${wx.temperatureUnit || 'F'}` : ''}
        ${wx.windSpeed ? `· Wind ${esc(wx.windSpeed)} ${esc(wx.windDirection || '')}` : ''}
      `;
    }
  }
}

export function clearSpotDetail() {
  currentSpot = null;
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  const body = $('spotDetailBody');
  if (body) body.innerHTML = '<div class="spot-detail-empty">Select a DX</div>';
}

export function initSpotDetail() {
  clearSpotDetail();
}
