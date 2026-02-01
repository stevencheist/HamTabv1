import state from './state.js';
import { $ } from './dom.js';
import { esc, fmtTime } from './utils.js';
import { isDaytime } from './geo.js';

export function drawAnalogClock(canvas, date) {
  const size = Math.min(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight - 24) - 4;
  if (size < 20) return;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const r = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(r, r);

  // Face
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = '#0f3460';
  ctx.fill();
  ctx.strokeStyle = '#2a3a5e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Tick marks and numerals
  for (let i = 1; i <= 12; i++) {
    const angle = (i * Math.PI) / 6 - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cos * (r - 12), sin * (r - 12));
    ctx.lineTo(cos * (r - 5), sin * (r - 5));
    ctx.strokeStyle = '#8899aa';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e0e0e0';
    ctx.font = `bold ${Math.round(r * 0.22)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i.toString(), cos * (r - 22), sin * (r - 22));
  }
  // Minute ticks
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const angle = (i * Math.PI) / 30 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (r - 8), Math.sin(angle) * (r - 8));
    ctx.lineTo(Math.cos(angle) * (r - 5), Math.sin(angle) * (r - 5));
    ctx.strokeStyle = '#2a3a5e';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const h = date.getHours() % 12;
  const m = date.getMinutes();
  const s = date.getSeconds();

  // Hour hand
  const hAngle = ((h + m / 60) * Math.PI) / 6 - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(hAngle) * r * 0.5, Math.sin(hAngle) * r * 0.5);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Minute hand
  const mAngle = ((m + s / 60) * Math.PI) / 30 - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(mAngle) * r * 0.7, Math.sin(mAngle) * r * 0.7);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Second hand
  const sAngle = (s * Math.PI) / 30 - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(sAngle) * r * 0.75, Math.sin(sAngle) * r * 0.75);
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#e94560';
  ctx.fill();

  ctx.restore();
}

export function applyClockStyle() {
  $('clockLocal').classList.toggle('analog', state.clockStyle === 'analog');
  $('clockUtc').classList.toggle('analog', state.clockStyle === 'analog');
}

function updateDayNight() {
  const now = new Date();
  if (state.myLat !== null && state.myLon !== null) {
    state.lastLocalDay = isDaytime(state.myLat, state.myLon, now);
  } else {
    state.lastLocalDay = null;
  }
  state.lastUtcDay = isDaytime(51.48, 0, now);
}

export function updateClocks() {
  const now = new Date();
  const dateOpts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  const localIcon = state.lastLocalDay === true ? '☀️' : state.lastLocalDay === false ? '🌙' : '';
  const utcIcon = state.lastUtcDay === true ? '☀️' : state.lastUtcDay === false ? '🌙' : '';
  const localTime = fmtTime(now);
  const utcTime = fmtTime(now, { timeZone: 'UTC' });
  $('clockLocalTime').innerHTML = (localIcon ? '<span class="daynight-emoji">' + localIcon + '</span> ' : '') + esc(localTime);
  $('clockUtcTime').innerHTML = (utcIcon ? '<span class="daynight-emoji">' + utcIcon + '</span> ' : '') + esc(utcTime);
  $('clockUtcDate').textContent = now.toLocaleDateString(undefined, Object.assign({ timeZone: 'UTC' }, dateOpts));
  if (state.clockStyle === 'analog') {
    drawAnalogClock($('clockLocalCanvas'), now);
    const utcDate = new Date(now);
    utcDate.setMinutes(utcDate.getMinutes() + utcDate.getTimezoneOffset());
    drawAnalogClock($('clockUtcCanvas'), utcDate);
  }
  applyClockStyle();
  updateDayNight();
}
