import state from './state.js';
import { $ } from './dom.js';

// Color functions (exported for constants.js)
export function lunarDecColor(val) {
  const n = Math.abs(parseFloat(val));
  if (isNaN(n)) return '';
  if (n < 15) return 'var(--green)';
  if (n < 25) return 'var(--yellow)';
  return 'var(--red)';
}

export function lunarPlColor(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '';
  if (n < -0.5) return 'var(--green)';
  if (n < 0.5) return 'var(--yellow)';
  return 'var(--red)';
}

const LUNAR_VIS_KEY = 'hamtab_lunar_fields';

export function loadLunarFieldVisibility() {
  const { LUNAR_FIELD_DEFS } = require('./constants.js');
  try {
    const saved = JSON.parse(localStorage.getItem(LUNAR_VIS_KEY));
    if (saved && typeof saved === 'object') return saved;
  } catch (e) {}
  const vis = {};
  LUNAR_FIELD_DEFS.forEach(f => vis[f.key] = f.defaultVisible);
  return vis;
}

export function saveLunarFieldVisibility() {
  localStorage.setItem(LUNAR_VIS_KEY, JSON.stringify(state.lunarFieldVisibility));
}

export async function fetchLunar() {
  try {
    const resp = await fetch('/api/lunar');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    state.lastLunarData = data;
    renderLunar(data);
  } catch (err) {
    console.error('Failed to fetch lunar:', err);
  }
}

export function renderMoonPhase(illumination, phase) {
  const canvas = $('moonCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Draw dark disc
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();

  // Illumination fraction 0–1
  const illum = Math.max(0, Math.min(100, illumination)) / 100;
  const waning = (phase || '').toLowerCase().includes('waning') || (phase || '').toLowerCase().includes('last');

  // Full/new moon shortcut — avoid terminator math at extremes
  if (illum >= 0.99) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#d4d4d4';
    ctx.fill();
  } else if (illum > 0.01) {
    // Terminator x-radius: 0 at half, r at full/new
    const terminatorX = Math.abs(1 - 2 * illum) * r;
    const litOnRight = !waning;

    ctx.beginPath();
    if (litOnRight) {
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
      if (illum <= 0.5) {
        ctx.ellipse(cx, cy, terminatorX, r, 0, Math.PI / 2, -Math.PI / 2, false);
      } else {
        ctx.ellipse(cx, cy, terminatorX, r, 0, Math.PI / 2, -Math.PI / 2, true);
      }
    } else {
      ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
      if (illum <= 0.5) {
        ctx.ellipse(cx, cy, terminatorX, r, 0, -Math.PI / 2, Math.PI / 2, false);
      } else {
        ctx.ellipse(cx, cy, terminatorX, r, 0, -Math.PI / 2, Math.PI / 2, true);
      }
    }
    ctx.closePath();
    ctx.fillStyle = '#d4d4d4';
    ctx.fill();
  }

  // Subtle border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#445';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function renderLunar(data) {
  const { LUNAR_FIELD_DEFS } = require('./constants.js');
  const lunarCards = $('lunarCards');
  lunarCards.innerHTML = '';

  renderMoonPhase(data.illumination, data.phase);

  LUNAR_FIELD_DEFS.forEach(f => {
    if (state.lunarFieldVisibility[f.key] === false) return;

    const rawVal = data[f.key];
    let displayVal;
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      displayVal = '-';
    } else if (f.key === 'distance') {
      displayVal = Number(rawVal).toLocaleString() + f.unit;
    } else if (f.key === 'pathLoss') {
      displayVal = (rawVal > 0 ? '+' : '') + rawVal + f.unit;
    } else {
      displayVal = String(rawVal) + f.unit;
    }
    const color = f.colorFn ? f.colorFn(rawVal) : '';

    const div = document.createElement('div');
    div.className = 'solar-card';
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.textContent = f.label;
    const valueDiv = document.createElement('div');
    valueDiv.className = 'value';
    if (color) valueDiv.style.color = color;
    valueDiv.textContent = displayVal;
    div.appendChild(labelDiv);
    div.appendChild(valueDiv);
    lunarCards.appendChild(div);
  });
}
