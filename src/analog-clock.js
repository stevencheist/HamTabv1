import state from './state.js';
import { isWidgetVisible } from './widgets.js';
import { getSunTimes } from './geo.js';

const NS = 'http://www.w3.org/2000/svg';
const CX = 100; // center x/y of the 200x200 viewBox
const CY = 100;
const R = 88; // clock face radius

let svgBuilt = false;
let lastDateStr = ''; // avoid redundant date text updates
let lastArcDay = -1;  // day-of-year when arc was last computed

// SVG element refs (populated in buildSvg)
const el = {};

// --- SVG Construction (runs once) ---

function buildSvg() {
  const svg = document.getElementById('analogClockSvg');
  if (!svg) return;
  svg.innerHTML = '';

  // Face circle
  const face = makeSvg('circle', { cx: CX, cy: CY, r: R, fill: 'var(--surface)', stroke: 'var(--border)', 'stroke-width': 2 });
  svg.appendChild(face);

  // Sunrise/sunset arc (hidden until lat/lon available)
  el.arc = makeSvg('path', { d: '', fill: 'rgba(255,193,7,0.25)', stroke: 'none' });
  svg.appendChild(el.arc);

  // Tick marks
  for (let i = 0; i < 60; i++) {
    const isMajor = i % 5 === 0;
    const angle = (i * 6 - 90) * Math.PI / 180; // 6 deg per minute tick, 0 at 12
    const outerR = R - 2;
    const innerR = isMajor ? R - 10 : R - 5;
    const line = makeSvg('line', {
      x1: CX + Math.cos(angle) * innerR,
      y1: CY + Math.sin(angle) * innerR,
      x2: CX + Math.cos(angle) * outerR,
      y2: CY + Math.sin(angle) * outerR,
      stroke: 'var(--text-dim)',
      'stroke-width': isMajor ? 2 : 1,
    });
    svg.appendChild(line);
  }

  // Hour numbers
  for (let h = 1; h <= 12; h++) {
    const angle = (h * 30 - 90) * Math.PI / 180; // 30 deg per hour
    const numR = R - 18;
    const txt = makeSvg('text', {
      x: CX + Math.cos(angle) * numR,
      y: CY + Math.sin(angle) * numR + 4, // +4 vertical centering fudge
      'text-anchor': 'middle',
      fill: 'var(--text-dim)',
      'font-size': '12',
      'font-family': 'inherit',
    });
    txt.textContent = h;
    svg.appendChild(txt);
  }

  // Hands (hour, minute, second — drawn in this order so second is on top)
  el.hour = makeSvg('line', { x1: CX, y1: CY, x2: CX, y2: CY - 50, stroke: 'var(--text)', 'stroke-width': 4, 'stroke-linecap': 'round' });
  el.minute = makeSvg('line', { x1: CX, y1: CY, x2: CX, y2: CY - 70, stroke: 'var(--text)', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
  el.second = makeSvg('line', { x1: CX, y1: CY + 12, x2: CX, y2: CY - 78, stroke: 'var(--accent)', 'stroke-width': 1, 'stroke-linecap': 'round' });
  svg.appendChild(el.hour);
  svg.appendChild(el.minute);
  svg.appendChild(el.second);

  // Center dot
  svg.appendChild(makeSvg('circle', { cx: CX, cy: CY, r: 3.5, fill: 'var(--accent)' }));

  // Date text
  el.dateText = makeSvg('text', {
    x: CX,
    y: CY + 30,
    'text-anchor': 'middle',
    fill: 'var(--text-dim)',
    'font-size': '11',
    'font-family': 'inherit',
  });
  svg.appendChild(el.dateText);

  svgBuilt = true;
}

function makeSvg(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// --- Hand rotation ---

function setHand(line, angleDeg) {
  line.setAttribute('transform', `rotate(${angleDeg} ${CX} ${CY})`);
}

// --- Sunrise/sunset arc ---

function updateArc(now) {
  if (!el.arc) return;
  if (state.myLat == null || state.myLon == null) {
    el.arc.setAttribute('d', '');
    return;
  }

  // Only recompute once per day
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  if (dayOfYear === lastArcDay) return;
  lastArcDay = dayOfYear;

  const times = getSunTimes(state.myLat, state.myLon, now);
  if (!times.sunrise || !times.sunset) {
    el.arc.setAttribute('d', '');
    return;
  }

  // Convert sunrise/sunset to angles on 12-hour clock face
  const riseAngle = timeToAngle(times.sunrise);
  const setAngle = timeToAngle(times.sunset);

  // Draw arc wedge from center to sunrise arc to sunset back to center
  const arcR = R - 12; // slightly inside the numbers
  const riseRad = (riseAngle - 90) * Math.PI / 180;
  const setRad = (setAngle - 90) * Math.PI / 180;

  const x1 = CX + Math.cos(riseRad) * arcR;
  const y1 = CY + Math.sin(riseRad) * arcR;
  const x2 = CX + Math.cos(setRad) * arcR;
  const y2 = CY + Math.sin(setRad) * arcR;

  // Determine large-arc flag (daylight typically spans > 180 degrees on the clock face)
  let sweep = setAngle - riseAngle;
  if (sweep < 0) sweep += 360;
  const largeArc = sweep > 180 ? 1 : 0;

  const d = `M ${CX} ${CY} L ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  el.arc.setAttribute('d', d);
}

function timeToAngle(date) {
  // Map a Date to its position on a 12-hour clock face (degrees, 0 = 12 o'clock)
  const h = date.getHours() % 12;
  const m = date.getMinutes();
  return (h + m / 60) * 30; // 30 deg per hour
}

// --- Public API ---

export function initAnalogClock() {
  buildSvg();
}

export function updateAnalogClock() {
  if (!svgBuilt) return;
  if (!isWidgetVisible('widget-analog-clock')) return;

  const now = new Date();
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();

  // Hand angles: 0 deg = 12 o'clock position
  const hourAngle = (h + m / 60) * 30;         // 30 deg/hour
  const minuteAngle = (m + s / 60) * 6;        // 6 deg/minute
  const secondAngle = s * 6;                    // 6 deg/second

  setHand(el.hour, hourAngle);
  setHand(el.minute, minuteAngle);
  setHand(el.second, secondAngle);

  // Date text (update only when date changes)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dateStr = `${days[now.getDay()]} ${now.getDate()}`;
  if (dateStr !== lastDateStr) {
    lastDateStr = dateStr;
    el.dateText.textContent = dateStr;
  }

  updateArc(now);
}
