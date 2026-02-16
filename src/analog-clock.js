// --- Analog Clock Widget (Orchestrator) ---
// Delegates face rendering to clock-faces.js and complication sub-dials to clock-complications.js.
// Manages hand rotation, date text, sunrise/sunset arc, and the 1-second update loop.

import state from './state.js';
import { isWidgetVisible } from './widgets.js';
import { getSunTimes } from './geo.js';
import { buildFaceSvg, CLOCK_FACES } from './clock-faces.js';
import { mountComplication, updateComplication, COMPLICATION_DEFS } from './clock-complications.js';

const NS = 'http://www.w3.org/2000/svg';
const CX = 100;
const CY = 100;
const R = 88;

let svgBuilt = false;
let lastDateStr = '';
let lastArcDay = -1;
let lastFaceId = null; // detect config changes and auto-rebuild

// SVG element refs (populated in buildSvg)
const el = {};

// Complication refs keyed by complication ID
let compRefs = {};

// --- SVG Helper ---

function makeSvg(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// --- Build / Rebuild ---

function buildSvg() {
  const svg = document.getElementById('analogClockSvg');
  if (!svg) return;

  const faceId = state.clockFace || 'classic';
  const comps = state.clockComplications || {};

  // Delegate face rendering
  const result = buildFaceSvg(svg, faceId, comps);
  el.arc = result.arc;
  el.dateText = result.dateText;
  el.digitalText = result.digitalText;

  // Mount enabled complications (before hands so hands stay on top)
  compRefs = {};
  for (const def of COMPLICATION_DEFS) {
    if (comps[def.id]) {
      compRefs[def.id] = mountComplication(svg, def.id);
    }
  }

  // Get face config for hand dimensions
  const face = CLOCK_FACES[faceId] || CLOCK_FACES.classic;
  const hc = face.hands;

  // Hands (drawn after complications for z-order)
  el.hour = makeSvg('line', {
    x1: CX, y1: CY + (hc.hour.tail || 0),
    x2: CX, y2: CY - hc.hour.length,
    stroke: 'var(--text)', 'stroke-width': hc.hour.width, 'stroke-linecap': 'round',
  });
  el.minute = makeSvg('line', {
    x1: CX, y1: CY + (hc.minute.tail || 0),
    x2: CX, y2: CY - hc.minute.length,
    stroke: 'var(--text)', 'stroke-width': hc.minute.width, 'stroke-linecap': 'round',
  });
  el.second = makeSvg('line', {
    x1: CX, y1: CY + (hc.second.tail || 0),
    x2: CX, y2: CY - hc.second.length,
    stroke: hc.second.color || 'var(--accent)', 'stroke-width': hc.second.width, 'stroke-linecap': 'round',
  });
  svg.appendChild(el.hour);
  svg.appendChild(el.minute);
  svg.appendChild(el.second);

  // Center dot (on top of everything)
  svg.appendChild(makeSvg('circle', {
    cx: CX, cy: CY, r: face.centerDot.radius, fill: face.centerDot.color,
  }));

  lastFaceId = faceId;
  lastDateStr = '';
  lastArcDay = -1;
  svgBuilt = true;
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

export function rebuildClock() {
  svgBuilt = false;
  buildSvg();
  updateAnalogClock();
}

export function updateAnalogClock() {
  if (!svgBuilt) return;
  if (!isWidgetVisible('widget-analog-clock')) return;

  // Auto-rebuild if face config changed
  const currentFace = state.clockFace || 'classic';
  if (currentFace !== lastFaceId) {
    rebuildClock();
    return;
  }

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
  if (el.dateText) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateStr = `${days[now.getDay()]} ${now.getDate()}`;
    if (dateStr !== lastDateStr) {
      lastDateStr = dateStr;
      el.dateText.textContent = dateStr;
    }
  }

  // Digital readout (digitalHybrid face)
  if (el.digitalText) {
    const dh = String(now.getHours()).padStart(2, '0');
    const dm = String(m).padStart(2, '0');
    const ds = String(s).padStart(2, '0');
    el.digitalText.textContent = `${dh}:${dm}:${ds}`;
  }

  // Update complications
  for (const [id, refs] of Object.entries(compRefs)) {
    updateComplication(id, refs);
  }

  updateArc(now);
}
