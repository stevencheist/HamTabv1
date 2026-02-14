// --- Clock Complications ---
// 4 optional sub-dials that mount into the analog clock SVG.
// Each complication renders a <g> group and exposes an update function.

import state from './state.js';
import { getSunTimes } from './geo.js';
import { getStopwatchElapsed, getStopwatchRunning, getStopwatchMode } from './stopwatch.js';

const NS = 'http://www.w3.org/2000/svg';

function makeSvg(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// --- Complication Definitions ---

export const COMPLICATION_DEFS = [
  { id: 'sunrise',   name: 'Sunrise / Sunset', cx: 100, cy: 62,  radius: 16, description: 'Next sunrise or sunset countdown' },
  { id: 'solar',     name: 'Solar (SFI)',      cx: 138, cy: 100, radius: 16, description: 'Solar Flux Index gauge' },
  { id: 'stopwatch', name: 'Stopwatch',        cx: 100, cy: 138, radius: 16, description: 'Mirrors Stopwatch widget elapsed time' },
  { id: 'utc',       name: 'UTC 24h',          cx: 62,  cy: 100, radius: 16, description: '24-hour UTC sub-dial' },
];

// --- Mount a Complication ---

export function mountComplication(svg, compId) {
  const def = COMPLICATION_DEFS.find(c => c.id === compId);
  if (!def) return null;

  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', `comp-${compId}`);

  // Sub-dial circle
  g.appendChild(makeSvg('circle', {
    cx: def.cx, cy: def.cy, r: def.radius,
    fill: 'var(--surface)', stroke: 'var(--border)', 'stroke-width': 1,
  }));

  const refs = { g, def };

  if (compId === 'utc') {
    // 4 index marks at 0/6/12/18
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90 - 90) * Math.PI / 180;
      const outerR = def.radius - 1;
      const innerR = def.radius - 4;
      g.appendChild(makeSvg('line', {
        x1: def.cx + Math.cos(angle) * innerR,
        y1: def.cy + Math.sin(angle) * innerR,
        x2: def.cx + Math.cos(angle) * outerR,
        y2: def.cy + Math.sin(angle) * outerR,
        stroke: 'var(--text-dim)', 'stroke-width': 1,
      }));
    }
    // Hour hand
    refs.hand = makeSvg('line', {
      x1: def.cx, y1: def.cy, x2: def.cx, y2: def.cy - 12,
      stroke: 'var(--text)', 'stroke-width': 1.5, 'stroke-linecap': 'round',
    });
    g.appendChild(refs.hand);
    // Center dot
    g.appendChild(makeSvg('circle', { cx: def.cx, cy: def.cy, r: 1.5, fill: 'var(--text)' }));
    // "UTC" label
    refs.label = makeSvg('text', {
      x: def.cx, y: def.cy + 8,
      'text-anchor': 'middle', fill: 'var(--text-dim)', 'font-size': '5', 'font-family': 'inherit',
    });
    refs.label.textContent = 'UTC';
    g.appendChild(refs.label);

  } else if (compId === 'stopwatch') {
    // Digital display text
    refs.timeText = makeSvg('text', {
      x: def.cx, y: def.cy + 1,
      'text-anchor': 'middle', fill: 'var(--text-dim)', 'font-size': '7', 'font-family': 'monospace, inherit',
    });
    refs.timeText.textContent = '00:00';
    g.appendChild(refs.timeText);
    // Running indicator dot
    refs.statusDot = makeSvg('circle', {
      cx: def.cx, cy: def.cy - 8, r: 2,
      fill: 'var(--text-dim)', opacity: '0.3',
    });
    g.appendChild(refs.statusDot);
    // Mode label
    refs.modeLabel = makeSvg('text', {
      x: def.cx, y: def.cy + 9,
      'text-anchor': 'middle', fill: 'var(--text-dim)', 'font-size': '4', 'font-family': 'inherit',
    });
    refs.modeLabel.textContent = 'STOP';
    g.appendChild(refs.modeLabel);

  } else if (compId === 'solar') {
    // Arc gauge background (gray arc)
    const arcPath = describeArc(def.cx, def.cy, def.radius - 3, -135, 135);
    g.appendChild(makeSvg('path', {
      d: arcPath, fill: 'none', stroke: 'var(--border)', 'stroke-width': 2, 'stroke-linecap': 'round',
    }));
    // Colored arc (filled based on SFI value)
    refs.arcFill = makeSvg('path', {
      d: arcPath, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 2, 'stroke-linecap': 'round',
    });
    g.appendChild(refs.arcFill);
    // Needle hand
    refs.needle = makeSvg('line', {
      x1: def.cx, y1: def.cy, x2: def.cx, y2: def.cy - 11,
      stroke: 'var(--text)', 'stroke-width': 1, 'stroke-linecap': 'round',
    });
    g.appendChild(refs.needle);
    // Center dot
    g.appendChild(makeSvg('circle', { cx: def.cx, cy: def.cy, r: 1.5, fill: 'var(--text)' }));
    // "SFI" label
    refs.label = makeSvg('text', {
      x: def.cx, y: def.cy + 8,
      'text-anchor': 'middle', fill: 'var(--text-dim)', 'font-size': '5', 'font-family': 'inherit',
    });
    refs.label.textContent = 'SFI';
    g.appendChild(refs.label);
    // Numeric value
    refs.valueText = makeSvg('text', {
      x: def.cx, y: def.cy + 14,
      'text-anchor': 'middle', fill: 'var(--text-dim)', 'font-size': '5', 'font-family': 'inherit',
    });
    refs.valueText.textContent = '---';
    g.appendChild(refs.valueText);

  } else if (compId === 'sunrise') {
    // Icon placeholder (sun/moon glyph)
    refs.icon = makeSvg('text', {
      x: def.cx, y: def.cy - 3,
      'text-anchor': 'middle', fill: 'var(--text-dim)', 'font-size': '8',
    });
    refs.icon.textContent = '\u2600'; // sun symbol
    g.appendChild(refs.icon);
    // Countdown text
    refs.countdownText = makeSvg('text', {
      x: def.cx, y: def.cy + 7,
      'text-anchor': 'middle', fill: 'var(--text-dim)', 'font-size': '6', 'font-family': 'monospace, inherit',
    });
    refs.countdownText.textContent = '--:--';
    g.appendChild(refs.countdownText);
    // "RISE"/"SET" label
    refs.eventLabel = makeSvg('text', {
      x: def.cx, y: def.cy + 13,
      'text-anchor': 'middle', fill: 'var(--text-dim)', 'font-size': '4', 'font-family': 'inherit',
    });
    refs.eventLabel.textContent = '';
    g.appendChild(refs.eventLabel);
  }

  svg.appendChild(g);
  return refs;
}

// --- Update Complication ---

export function updateComplication(compId, refs) {
  if (!refs) return;

  if (compId === 'utc') {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    // 360 degrees per 24 hours
    const angle = ((h + m / 60) / 24) * 360;
    refs.hand.setAttribute('transform', `rotate(${angle} ${refs.def.cx} ${refs.def.cy})`);

  } else if (compId === 'stopwatch') {
    const elapsed = getStopwatchElapsed();
    const running = getStopwatchRunning();
    const swMode = getStopwatchMode();
    const ms = Math.abs(elapsed);
    const totalSec = Math.floor(ms / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    refs.timeText.textContent = `${mm}:${ss}`;
    refs.timeText.setAttribute('fill', running ? 'var(--text)' : 'var(--text-dim)');
    refs.statusDot.setAttribute('fill', running ? '#4caf50' : 'var(--text-dim)');
    refs.statusDot.setAttribute('opacity', running ? '1' : '0.3');
    refs.modeLabel.textContent = swMode === 'countdown' ? 'CNTDN' : 'STOP';

  } else if (compId === 'solar') {
    const data = state.lastSolarData;
    if (data && data.sfi != null) {
      const sfi = parseInt(data.sfi, 10);
      if (!isNaN(sfi)) {
        // Map SFI 50-200 to gauge angle -135 to +135
        const clamped = Math.max(50, Math.min(200, sfi));
        const ratio = (clamped - 50) / 150; // 0-1
        const angle = -135 + ratio * 270;
        refs.needle.setAttribute('transform', `rotate(${angle} ${refs.def.cx} ${refs.def.cy})`);

        // Color: red <70, yellow 70-100, green >100
        let color = '#4caf50'; // green
        if (sfi < 70) color = '#f44336'; // red
        else if (sfi <= 100) color = '#ff9800'; // yellow/orange

        // Draw filled arc up to current value
        const fillPath = describeArc(refs.def.cx, refs.def.cy, refs.def.radius - 3, -135, angle);
        refs.arcFill.setAttribute('d', fillPath);
        refs.arcFill.setAttribute('stroke', color);
        refs.valueText.textContent = sfi;
        refs.valueText.setAttribute('fill', color);
        return;
      }
    }
    // No data fallback
    refs.valueText.textContent = '---';
    refs.valueText.setAttribute('fill', 'var(--text-dim)');
    refs.arcFill.setAttribute('d', '');
    refs.needle.setAttribute('transform', `rotate(-135 ${refs.def.cx} ${refs.def.cy})`);

  } else if (compId === 'sunrise') {
    if (state.myLat == null || state.myLon == null) {
      refs.countdownText.textContent = '--:--';
      refs.icon.textContent = '\u2600';
      refs.icon.setAttribute('fill', 'var(--text-dim)');
      refs.eventLabel.textContent = '';
      return;
    }

    const now = new Date();
    const times = getSunTimes(state.myLat, state.myLon, now);
    if (!times.sunrise || !times.sunset) {
      refs.countdownText.textContent = '--:--';
      return;
    }

    // Determine next event
    let nextEvent, nextTime, isRise;
    if (now < times.sunrise) {
      nextEvent = 'RISE';
      nextTime = times.sunrise;
      isRise = true;
    } else if (now < times.sunset) {
      nextEvent = 'SET';
      nextTime = times.sunset;
      isRise = false;
    } else {
      // After today's sunset — next sunrise is tomorrow
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tTimes = getSunTimes(state.myLat, state.myLon, tomorrow);
      nextEvent = 'RISE';
      nextTime = tTimes.sunrise || times.sunrise;
      isRise = true;
    }

    const diffMs = nextTime - now;
    const diffMin = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    refs.countdownText.textContent = `${h}h${String(m).padStart(2, '0')}`;
    refs.countdownText.setAttribute('fill', isRise ? '#42a5f5' : '#ff9800');
    refs.icon.textContent = isRise ? '\u2600' : '\u263D'; // sun or moon crescent
    refs.icon.setAttribute('fill', isRise ? '#42a5f5' : '#ff9800');
    refs.eventLabel.textContent = nextEvent;
    refs.eventLabel.setAttribute('fill', isRise ? '#42a5f5' : '#ff9800');
  }
}

// --- SVG Arc Path Helper ---
// Draws an arc from startAngle to endAngle (degrees, 0 = top)

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180; // -90 so 0 deg = top
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}
