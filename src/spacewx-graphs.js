// --- Space Weather History Graphs ---
// Canvas 2D graphs for Kp, X-Ray, SFI, Solar Wind, Bz
// Data from NOAA SWPC via /api/spacewx/history

import state from './state.js';

// --- Tab switching ---

export function initSpaceWxListeners() {
  const tabs = document.querySelectorAll('.spacewx-tab');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      state.spacewxTab = btn.dataset.tab;
      renderSpaceWxGraph();
    });
  });

  // Redraw on widget resize
  const widget = document.getElementById('widget-spacewx');
  if (widget && window.ResizeObserver) {
    new ResizeObserver(() => renderSpaceWxGraph()).observe(widget);
  }
}

// --- Fetch all 5 data types in parallel ---

export async function fetchSpaceWxData() {
  const types = ['kp', 'xray', 'sfi', 'wind', 'mag'];
  try {
    const results = await Promise.all(
      types.map(t =>
        fetch(`/api/spacewx/history?type=${t}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )
    );
    state.spacewxData = {};
    types.forEach((t, i) => { state.spacewxData[t] = results[i]; });
    renderSpaceWxGraph();
  } catch (err) {
    if (state.debug) console.error('Failed to fetch space weather data:', err);
  }
}

// --- Graph rendering ---

// Padding around the plot area (px)
const PAD = { top: 12, right: 12, bottom: 30, left: 52 };

export function renderSpaceWxGraph() {
  const canvas = document.getElementById('spacewxCanvas');
  if (!canvas) return;
  const body = canvas.parentElement;
  if (!body) return;

  // Size canvas to fit widget body
  const w = body.clientWidth;
  const h = body.clientHeight;
  if (w < 10 || h < 10) return;

  // Set actual pixel dimensions (for sharp rendering)
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Clear
  ctx.clearRect(0, 0, w, h);

  const tab = state.spacewxTab || 'kp';
  const dataKey = tab === 'bz' ? 'mag' : tab; // bz tab uses mag data
  const data = state.spacewxData && state.spacewxData[dataKey];
  if (!data || data.length === 0) {
    drawNoData(ctx, w, h);
    return;
  }

  const bounds = {
    x: PAD.left,
    y: PAD.top,
    w: w - PAD.left - PAD.right,
    h: h - PAD.top - PAD.bottom,
  };

  switch (tab) {
    case 'kp':   drawKpGraph(ctx, bounds, data);   break;
    case 'xray': drawXrayGraph(ctx, bounds, data);  break;
    case 'sfi':  drawSfiGraph(ctx, bounds, data);   break;
    case 'wind': drawWindGraph(ctx, bounds, data);  break;
    case 'bz':   drawBzGraph(ctx, bounds, data);    break;
  }
}

function drawNoData(ctx, w, h) {
  ctx.fillStyle = getStyle('--text-dim') || '#8899aa';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Loading space weather data...', w / 2, h / 2);
}

// --- Utility: read CSS custom properties ---

function getStyle(prop) {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}

function colorGreen()  { return getStyle('--green')  || '#00c853'; }
function colorYellow() { return getStyle('--yellow') || '#ffd600'; }
function colorRed()    { return getStyle('--red')    || '#ff1744'; }
function colorAccent() { return getStyle('--accent') || '#e94560'; }
function colorDim()    { return getStyle('--text-dim') || '#8899aa'; }
function colorText()   { return getStyle('--text')   || '#e0e0e0'; }
function colorGrid()   { return getStyle('--border') || '#2a3a5e'; }

// --- Shared drawing helpers ---

function drawGridLines(ctx, bounds, yMin, yMax, ticks) {
  ctx.strokeStyle = colorGrid();
  ctx.lineWidth = 0.5;
  for (const val of ticks) {
    const y = bounds.y + bounds.h - ((val - yMin) / (yMax - yMin)) * bounds.h;
    ctx.beginPath();
    ctx.moveTo(bounds.x, y);
    ctx.lineTo(bounds.x + bounds.w, y);
    ctx.stroke();
  }
}

function drawYLabels(ctx, bounds, yMin, yMax, ticks, formatFn) {
  ctx.fillStyle = colorDim();
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const val of ticks) {
    const y = bounds.y + bounds.h - ((val - yMin) / (yMax - yMin)) * bounds.h;
    ctx.fillText(formatFn ? formatFn(val) : String(val), bounds.x - 4, y);
  }
}

function drawTimeAxis(ctx, bounds, data) {
  if (data.length < 2) return;
  const times = data.map(d => new Date(d.time_tag + (d.time_tag.includes('Z') ? '' : 'Z')).getTime());
  const tMin = times[0];
  const tMax = times[times.length - 1];
  const range = tMax - tMin;
  if (range <= 0) return;

  // Decide label count based on width
  const maxLabels = Math.max(3, Math.floor(bounds.w / 60));
  const step = Math.ceil(data.length / maxLabels);

  ctx.fillStyle = colorDim();
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let i = 0; i < data.length; i += step) {
    const t = new Date(data[i].time_tag + (data[i].time_tag.includes('Z') ? '' : 'Z'));
    const x = bounds.x + ((times[i] - tMin) / range) * bounds.w;

    // Format: "Feb 1" for multi-day, "12:00" for short spans
    let label;
    if (range > 3 * 24 * 60 * 60 * 1000) { // > 3 days
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      label = months[t.getUTCMonth()] + ' ' + t.getUTCDate();
    } else {
      label = String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0');
    }
    ctx.fillText(label, x, bounds.y + bounds.h + 4);
  }
}

function drawThreshold(ctx, bounds, yMin, yMax, yVal, label, color) {
  const y = bounds.y + bounds.h - ((yVal - yMin) / (yMax - yMin)) * bounds.h;
  if (y < bounds.y || y > bounds.y + bounds.h) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(bounds.x, y);
  ctx.lineTo(bounds.x + bounds.w, y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (label) {
    ctx.fillStyle = color;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, bounds.x + bounds.w, y - 2);
  }
}

function drawLine(ctx, bounds, data, yMin, yMax, color, keyFn) {
  if (data.length < 2) return;
  const times = data.map(d => new Date(d.time_tag + (d.time_tag.includes('Z') ? '' : 'Z')).getTime());
  const tMin = times[0];
  const tMax = times[times.length - 1];
  const range = tMax - tMin;
  if (range <= 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < data.length; i++) {
    const val = keyFn ? keyFn(data[i]) : data[i].value;
    if (val === null || val === undefined || isNaN(val)) continue;
    const x = bounds.x + ((times[i] - tMin) / range) * bounds.w;
    const y = bounds.y + bounds.h - ((val - yMin) / (yMax - yMin)) * bounds.h;
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawTitle(ctx, bounds, text) {
  ctx.fillStyle = colorText();
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, bounds.x, 1);
}

// --- Axes border ---

function drawAxesBorder(ctx, bounds) {
  ctx.strokeStyle = colorDim();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bounds.x, bounds.y);
  ctx.lineTo(bounds.x, bounds.y + bounds.h);
  ctx.lineTo(bounds.x + bounds.w, bounds.y + bounds.h);
  ctx.stroke();
}

// --- Kp bar chart ---

function kpBarColor(val) {
  if (val <= 3) return colorGreen();
  if (val <= 4) return colorYellow();
  return colorRed();
}

function drawKpGraph(ctx, bounds, data) {
  drawTitle(ctx, bounds, 'Kp Index — 7 Days');

  const yMin = 0;
  const yMax = 9;
  const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  drawGridLines(ctx, bounds, yMin, yMax, ticks);
  drawAxesBorder(ctx, bounds);
  drawYLabels(ctx, bounds, yMin, yMax, ticks);
  drawTimeAxis(ctx, bounds, data);
  drawThreshold(ctx, bounds, yMin, yMax, 4, 'Storm', colorYellow());
  drawThreshold(ctx, bounds, yMin, yMax, 7, 'Severe', colorRed());

  // Bars
  const barW = Math.max(2, (bounds.w / data.length) - 1);
  const times = data.map(d => new Date(d.time_tag + (d.time_tag.includes('Z') ? '' : 'Z')).getTime());
  const tMin = times[0];
  const tMax = times[times.length - 1];
  const range = tMax - tMin || 1;

  for (let i = 0; i < data.length; i++) {
    const val = data[i].value;
    if (isNaN(val)) continue;
    const x = bounds.x + ((times[i] - tMin) / range) * bounds.w - barW / 2;
    const barH = (val / yMax) * bounds.h;
    const y = bounds.y + bounds.h - barH;
    ctx.fillStyle = kpBarColor(val);
    ctx.fillRect(x, y, barW, barH);
  }
}

// --- X-Ray line chart (log scale) ---

function drawXrayGraph(ctx, bounds, data) {
  drawTitle(ctx, bounds, 'X-Ray Flux — 7 Days');

  // Log scale: 1e-9 to 1e-3 (nanoflux to milliflux)
  const logMin = -9; // 1e-9
  const logMax = -3; // 1e-3

  // Class boundaries: C=1e-6, M=1e-5, X=1e-4
  const classes = [
    { val: 1e-8, label: 'A' },
    { val: 1e-7, label: 'B' },
    { val: 1e-6, label: 'C' },
    { val: 1e-5, label: 'M' },
    { val: 1e-4, label: 'X' },
  ];

  const ticks = [-9, -8, -7, -6, -5, -4, -3];
  drawGridLines(ctx, bounds, logMin, logMax, ticks);
  drawAxesBorder(ctx, bounds);
  drawYLabels(ctx, bounds, logMin, logMax, ticks, v => '1e' + v);
  drawTimeAxis(ctx, bounds, data);

  // Class labels as thresholds
  for (const cls of classes) {
    const logVal = Math.log10(cls.val);
    drawThreshold(ctx, bounds, logMin, logMax, logVal, cls.label, colorDim());
  }

  // Line — map values through log10
  drawLine(ctx, bounds, data, logMin, logMax, '#00e5ff', d => {
    const v = d.value;
    if (v <= 0) return null;
    const log = Math.log10(v);
    return Math.max(logMin, Math.min(logMax, log));
  });
}

// --- SFI line chart ---

function drawSfiGraph(ctx, bounds, data) {
  drawTitle(ctx, bounds, 'Solar Flux Index — 90 Days');

  const vals = data.map(d => d.value).filter(v => !isNaN(v));
  const dataMin = Math.min(...vals);
  const dataMax = Math.max(...vals);
  const padding = (dataMax - dataMin) * 0.1 || 10;
  const yMin = Math.floor(dataMin - padding);
  const yMax = Math.ceil(dataMax + padding);

  const tickStep = Math.ceil((yMax - yMin) / 8);
  const ticks = [];
  for (let v = Math.ceil(yMin / tickStep) * tickStep; v <= yMax; v += tickStep) ticks.push(v);

  drawGridLines(ctx, bounds, yMin, yMax, ticks);
  drawAxesBorder(ctx, bounds);
  drawYLabels(ctx, bounds, yMin, yMax, ticks);
  drawTimeAxis(ctx, bounds, data);
  drawThreshold(ctx, bounds, yMin, yMax, 100, 'Good', colorYellow());
  drawThreshold(ctx, bounds, yMin, yMax, 150, 'Excellent', colorGreen());

  drawLine(ctx, bounds, data, yMin, yMax, colorAccent());
}

// --- Solar Wind line chart ---

function drawWindGraph(ctx, bounds, data) {
  drawTitle(ctx, bounds, 'Solar Wind Speed — 7 Days');

  const vals = data.map(d => d.value).filter(v => !isNaN(v));
  const yMin = 0;
  const yMax = Math.max(800, Math.ceil(Math.max(...vals) * 1.1));

  const ticks = [];
  for (let v = 0; v <= yMax; v += 100) ticks.push(v);

  drawGridLines(ctx, bounds, yMin, yMax, ticks);
  drawAxesBorder(ctx, bounds);
  drawYLabels(ctx, bounds, yMin, yMax, ticks, v => v + '');
  drawTimeAxis(ctx, bounds, data);
  drawThreshold(ctx, bounds, yMin, yMax, 400, '400 km/s', colorYellow());
  drawThreshold(ctx, bounds, yMin, yMax, 600, '600 km/s', colorRed());

  // Color-segmented line: green < 400, yellow 400-600, red > 600
  if (data.length >= 2) {
    const times = data.map(d => new Date(d.time_tag + (d.time_tag.includes('Z') ? '' : 'Z')).getTime());
    const tMin = times[0];
    const tMax = times[times.length - 1];
    const range = tMax - tMin || 1;

    ctx.lineWidth = 1.5;
    for (let i = 1; i < data.length; i++) {
      const v0 = data[i - 1].value;
      const v1 = data[i].value;
      if (isNaN(v0) || isNaN(v1)) continue;
      const avg = (v0 + v1) / 2;
      ctx.strokeStyle = avg < 400 ? colorGreen() : avg < 600 ? colorYellow() : colorRed();
      const x0 = bounds.x + ((times[i - 1] - tMin) / range) * bounds.w;
      const y0 = bounds.y + bounds.h - ((v0 - yMin) / (yMax - yMin)) * bounds.h;
      const x1 = bounds.x + ((times[i] - tMin) / range) * bounds.w;
      const y1 = bounds.y + bounds.h - ((v1 - yMin) / (yMax - yMin)) * bounds.h;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
}

// --- Bz line chart (signed, with zero reference) ---

function drawBzGraph(ctx, bounds, data) {
  drawTitle(ctx, bounds, 'Bz (IMF) & Bt — 7 Days');

  const bzVals = data.map(d => d.value).filter(v => !isNaN(v));
  const btVals = data.map(d => d.value2).filter(v => v !== undefined && !isNaN(v));
  const allVals = bzVals.concat(btVals);
  const absMax = Math.max(20, Math.ceil(Math.max(...allVals.map(Math.abs)) * 1.2));
  const yMin = -absMax;
  const yMax = absMax;

  const tickStep = Math.ceil(absMax / 4);
  const ticks = [];
  for (let v = -absMax; v <= absMax; v += tickStep) ticks.push(v);

  drawGridLines(ctx, bounds, yMin, yMax, ticks);
  drawAxesBorder(ctx, bounds);
  drawYLabels(ctx, bounds, yMin, yMax, ticks, v => v + ' nT');
  drawTimeAxis(ctx, bounds, data);
  drawThreshold(ctx, bounds, yMin, yMax, 0, '0', colorDim());

  // Bt line (subtle gray)
  if (btVals.length > 0) {
    drawLine(ctx, bounds, data, yMin, yMax, colorGrid(), d => {
      const v = d.value2;
      return (v !== undefined && !isNaN(v)) ? v : null;
    });
  }

  // Bz line: green positive, red negative — draw as segmented
  if (data.length >= 2) {
    const times = data.map(d => new Date(d.time_tag + (d.time_tag.includes('Z') ? '' : 'Z')).getTime());
    const tMin = times[0];
    const tMax = times[times.length - 1];
    const range = tMax - tMin || 1;

    ctx.lineWidth = 1.5;
    for (let i = 1; i < data.length; i++) {
      const v0 = data[i - 1].value;
      const v1 = data[i].value;
      if (isNaN(v0) || isNaN(v1)) continue;
      const avg = (v0 + v1) / 2;
      ctx.strokeStyle = avg >= 0 ? colorGreen() : colorRed();
      const x0 = bounds.x + ((times[i - 1] - tMin) / range) * bounds.w;
      const y0 = bounds.y + bounds.h - ((v0 - yMin) / (yMax - yMin)) * bounds.h;
      const x1 = bounds.x + ((times[i] - tMin) / range) * bounds.w;
      const y1 = bounds.y + bounds.h - ((v1 - yMin) / (yMax - yMin)) * bounds.h;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
}
