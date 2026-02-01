export function latLonToGrid(lat, lon) {
  lon += 180;
  lat += 90;
  const a = String.fromCharCode(65 + Math.floor(lon / 20));
  const b = String.fromCharCode(65 + Math.floor(lat / 10));
  const c = Math.floor((lon % 20) / 2);
  const d = Math.floor((lat % 10) / 1);
  const e = String.fromCharCode(97 + Math.floor(((lon % 2) * 12)));
  const f = String.fromCharCode(97 + Math.floor(((lat % 1) * 24)));
  return a + b + c + d + e + f;
}

export function gridToLatLon(grid) {
  if (!grid || grid.length !== 4) return null;
  const g = grid.toUpperCase();
  if (!/^[A-R]{2}[0-9]{2}$/.test(g)) return null;
  const lon = (g.charCodeAt(0) - 65) * 20 + parseInt(g[2]) * 2 + 1 - 180;
  const lat = (g.charCodeAt(1) - 65) * 10 + parseInt(g[3]) * 1 + 0.5 - 90;
  return { lat, lon };
}

export function bearingTo(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const dLon = (lon2 - lon1) * r;
  const y = Math.sin(dLon) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLon);
  return (Math.atan2(y, x) / r + 360) % 360;
}

export function bearingToCardinal(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function distanceMi(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const R = 3958.8;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getSunTimes(lat, lon, date) {
  const rad = Math.PI / 180;
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const zenith = 90.833;
  const lngHour = lon / 15;

  function calc(rising) {
    const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
    const M = (0.9856 * t) - 3.289;
    let L = M + (1.916 * Math.sin(M * rad)) + (0.020 * Math.sin(2 * M * rad)) + 282.634;
    L = ((L % 360) + 360) % 360;
    let RA = Math.atan2(Math.sin(L * rad), Math.cos(L * rad)) / rad;
    RA = ((RA % 360) + 360) % 360;
    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15;
    const sinDec = 0.39782 * Math.sin(L * rad);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(zenith * rad) - (sinDec * Math.sin(lat * rad))) / (cosDec * Math.cos(lat * rad));
    if (cosH > 1 || cosH < -1) return null;
    let H = Math.acos(cosH) / rad / 15;
    if (rising) H = 24 - H;
    const T = H + RA - (0.06571 * t) - 6.622;
    let UT = ((T - lngHour) % 24 + 24) % 24;
    const hours = Math.floor(UT);
    const minutes = Math.round((UT - hours) * 60);
    const result = new Date(date);
    result.setUTCHours(hours, minutes, 0, 0);
    return result;
  }
  return { sunrise: calc(true), sunset: calc(false) };
}

export function isDaytime(lat, lon, date) {
  try {
    const times = getSunTimes(lat, lon, date);
    if (times.sunrise && times.sunset) {
      return date >= times.sunrise && date < times.sunset;
    }
  } catch (e) {}
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const solarNoon = 12 - lon / 15;
  const diff = Math.abs(((utcHour - solarNoon) + 24) % 24 - 12);
  return diff < 6;
}

export function localTimeAtLon(lon, use24h) {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const offsetMs = (lon / 15) * 3600000;
  const local = new Date(utcMs + offsetMs);
  return local.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !use24h });
}
