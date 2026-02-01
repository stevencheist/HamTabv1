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

export function renderLunar(data) {
  const { LUNAR_FIELD_DEFS } = require('./constants.js');
  const lunarCards = $('lunarCards');
  lunarCards.innerHTML = '';

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
