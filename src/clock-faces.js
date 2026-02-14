// --- Clock Face Definitions & SVG Builder ---
// Data-driven face configs consumed by a generic SVG builder.
// Each face is a plain object describing ticks, labels, hands, and extras.

const NS = 'http://www.w3.org/2000/svg';
const CX = 100;
const CY = 100;
const R = 88;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// --- Face Definitions ---

export const CLOCK_FACES = {
  classic: {
    id: 'classic', name: 'Classic',
    ticks: { minor: true, major: true, majorWidth: 2, minorWidth: 1, majorLength: 10, minorLength: 5 },
    labels: { type: 'arabic', fontSize: 12, radius: R - 18 },
    hands: {
      hour:   { length: 50, width: 4, tail: 0 },
      minute: { length: 70, width: 2.5, tail: 0 },
      second: { length: 78, width: 1, tail: 12, color: 'var(--accent)' },
    },
    centerDot: { radius: 3.5, color: 'var(--accent)' },
    dateWindow: { show: true, y: 130, fontSize: 11 },
    extras: null,
  },
  minimal: {
    id: 'minimal', name: 'Minimal',
    ticks: { minor: false, major: false },
    labels: { type: 'indices', fontSize: 0, radius: R - 10 },
    hands: {
      hour:   { length: 48, width: 5, tail: 0 },
      minute: { length: 68, width: 2, tail: 0 },
      second: { length: 76, width: 0.8, tail: 10, color: 'var(--accent)' },
    },
    centerDot: { radius: 3, color: 'var(--accent)' },
    dateWindow: { show: false },
    extras: null,
  },
  roman: {
    id: 'roman', name: 'Roman',
    ticks: { minor: true, major: true, majorWidth: 2, minorWidth: 1, majorLength: 8, minorLength: 4 },
    labels: { type: 'roman', fontSize: 11, radius: R - 18 },
    hands: {
      hour:   { length: 48, width: 4, tail: 0 },
      minute: { length: 68, width: 2.5, tail: 0 },
      second: { length: 76, width: 1, tail: 12, color: 'var(--accent)' },
    },
    centerDot: { radius: 3.5, color: 'var(--accent)' },
    dateWindow: { show: true, y: 130, fontSize: 10 },
    extras: null,
  },
  pilot: {
    id: 'pilot', name: 'Pilot',
    ticks: { minor: true, major: true, majorWidth: 3, minorWidth: 1, majorLength: 10, minorLength: 5 },
    labels: { type: 'indices', fontSize: 0, radius: R - 10 },
    hands: {
      hour:   { length: 46, width: 5, tail: 0 },
      minute: { length: 68, width: 3, tail: 0 },
      second: { length: 76, width: 1, tail: 14, color: 'var(--accent)' },
    },
    centerDot: { radius: 4, color: 'var(--accent)' },
    dateWindow: { show: true, y: 130, fontSize: 10 },
    extras: 'pilotTriangle',
  },
  railroad: {
    id: 'railroad', name: 'Railroad',
    ticks: { minor: true, major: true, majorWidth: 2.5, minorWidth: 1, majorLength: 10, minorLength: 6 },
    labels: { type: 'arabic', fontSize: 11, radius: R - 20 },
    hands: {
      hour:   { length: 46, width: 4, tail: 0 },
      minute: { length: 66, width: 2.5, tail: 0 },
      second: { length: 74, width: 1, tail: 12, color: 'var(--accent)' },
    },
    centerDot: { radius: 3.5, color: 'var(--accent)' },
    dateWindow: { show: true, y: 130, fontSize: 10 },
    extras: 'doubleTrack',
  },
  digitalHybrid: {
    id: 'digitalHybrid', name: 'Digital',
    ticks: { minor: false, major: true, majorWidth: 2, minorWidth: 0, majorLength: 8, minorLength: 0 },
    labels: { type: 'arabic', fontSize: 10, radius: R - 16 },
    hands: {
      hour:   { length: 48, width: 4, tail: 0 },
      minute: { length: 68, width: 2.5, tail: 0 },
      second: { length: 76, width: 1, tail: 12, color: 'var(--accent)' },
    },
    centerDot: { radius: 3, color: 'var(--accent)' },
    dateWindow: { show: false },
    extras: 'digitalReadout',
  },
};

// --- SVG Helper ---

function makeSvg(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// --- Face Builder ---

export function buildFaceSvg(svg, faceId, complications) {
  const face = CLOCK_FACES[faceId] || CLOCK_FACES.classic;
  svg.innerHTML = '';

  // Face circle
  svg.appendChild(makeSvg('circle', { cx: CX, cy: CY, r: R, fill: 'var(--surface)', stroke: 'var(--border)', 'stroke-width': 2 }));

  // Extras: double track ring (behind everything)
  if (face.extras === 'doubleTrack') {
    svg.appendChild(makeSvg('circle', { cx: CX, cy: CY, r: R - 2, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 0.5 }));
    svg.appendChild(makeSvg('circle', { cx: CX, cy: CY, r: R - 12, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 0.5 }));
  }

  // Sunrise/sunset arc placeholder (rendered before ticks so it's behind)
  const arc = makeSvg('path', { d: '', fill: 'rgba(255,193,7,0.25)', stroke: 'none' });
  svg.appendChild(arc);

  // Tick marks
  if (face.ticks.major || face.ticks.minor) {
    for (let i = 0; i < 60; i++) {
      const isMajor = i % 5 === 0;
      if (!isMajor && !face.ticks.minor) continue;
      if (isMajor && !face.ticks.major) continue;
      const angle = (i * 6 - 90) * Math.PI / 180;
      const outerR = R - 2;
      const innerR = outerR - (isMajor ? face.ticks.majorLength : face.ticks.minorLength);
      svg.appendChild(makeSvg('line', {
        x1: CX + Math.cos(angle) * innerR,
        y1: CY + Math.sin(angle) * innerR,
        x2: CX + Math.cos(angle) * outerR,
        y2: CY + Math.sin(angle) * outerR,
        stroke: 'var(--text-dim)',
        'stroke-width': isMajor ? face.ticks.majorWidth : face.ticks.minorWidth,
      }));
    }
  }

  // Labels
  if (face.labels.type === 'arabic') {
    for (let h = 1; h <= 12; h++) {
      const angle = (h * 30 - 90) * Math.PI / 180;
      const txt = makeSvg('text', {
        x: CX + Math.cos(angle) * face.labels.radius,
        y: CY + Math.sin(angle) * face.labels.radius + 4,
        'text-anchor': 'middle',
        fill: 'var(--text-dim)',
        'font-size': face.labels.fontSize,
        'font-family': 'inherit',
      });
      txt.textContent = h;
      svg.appendChild(txt);
    }
  } else if (face.labels.type === 'roman') {
    for (let h = 1; h <= 12; h++) {
      const angle = (h * 30 - 90) * Math.PI / 180;
      const txt = makeSvg('text', {
        x: CX + Math.cos(angle) * face.labels.radius,
        y: CY + Math.sin(angle) * face.labels.radius + 4,
        'text-anchor': 'middle',
        fill: 'var(--text-dim)',
        'font-size': face.labels.fontSize,
        'font-family': 'inherit',
      });
      txt.textContent = ROMAN[h];
      svg.appendChild(txt);
    }
  } else if (face.labels.type === 'indices') {
    // 4 rectangular index bars at 12, 3, 6, 9
    const positions = [
      { h: 12, angle: -90 },
      { h: 3, angle: 0 },
      { h: 6, angle: 90 },
      { h: 9, angle: 180 },
    ];
    for (const pos of positions) {
      const rad = pos.angle * Math.PI / 180;
      const outerR = R - 4;
      const innerR = R - 16;
      svg.appendChild(makeSvg('line', {
        x1: CX + Math.cos(rad) * innerR,
        y1: CY + Math.sin(rad) * innerR,
        x2: CX + Math.cos(rad) * outerR,
        y2: CY + Math.sin(rad) * outerR,
        stroke: 'var(--text)',
        'stroke-width': 4,
        'stroke-linecap': 'round',
      }));
    }
  }

  // Extras: pilot triangle at 12
  if (face.extras === 'pilotTriangle') {
    const triSize = 8;
    const triY = CY - R + 6;
    svg.appendChild(makeSvg('polygon', {
      points: `${CX},${triY} ${CX - triSize / 2},${triY + triSize} ${CX + triSize / 2},${triY + triSize}`,
      fill: 'var(--accent)',
      stroke: 'none',
    }));
  }

  // Digital readout placeholder (for digitalHybrid)
  let digitalText = null;
  if (face.extras === 'digitalReadout') {
    // Shift down if 6 o'clock complication active
    const hasBottomComp = complications && complications.stopwatch;
    const dY = hasBottomComp ? 118 : 125;
    digitalText = makeSvg('text', {
      x: CX,
      y: dY,
      'text-anchor': 'middle',
      fill: 'var(--text)',
      'font-size': '10',
      'font-family': 'monospace, inherit',
    });
    digitalText.textContent = '--:--:--';
    svg.appendChild(digitalText);
  }

  // Date text
  let dateText = null;
  if (face.dateWindow && face.dateWindow.show) {
    const hasBottomComp = complications && complications.stopwatch;
    const dY = hasBottomComp ? 118 : face.dateWindow.y;
    dateText = makeSvg('text', {
      x: CX,
      y: dY,
      'text-anchor': 'middle',
      fill: 'var(--text-dim)',
      'font-size': face.dateWindow.fontSize,
      'font-family': 'inherit',
    });
    svg.appendChild(dateText);
  }

  // Note: hands and center dot are appended by the caller (analog-clock.js)
  // so they stay on top of complications

  return { arc, dateText, digitalText, face };
}

// --- Preview Builder (48x48 thumbnail for config panel) ---

export function buildFacePreview(faceId) {
  const face = CLOCK_FACES[faceId] || CLOCK_FACES.classic;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('width', '48');
  svg.setAttribute('height', '48');

  // Face circle
  svg.appendChild(makeSvg('circle', { cx: CX, cy: CY, r: R, fill: 'var(--surface)', stroke: 'var(--border)', 'stroke-width': 3 }));

  // Double track
  if (face.extras === 'doubleTrack') {
    svg.appendChild(makeSvg('circle', { cx: CX, cy: CY, r: R - 2, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 1 }));
    svg.appendChild(makeSvg('circle', { cx: CX, cy: CY, r: R - 12, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 1 }));
  }

  // Major ticks only for preview
  if (face.ticks.major) {
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const outerR = R - 2;
      const innerR = outerR - face.ticks.majorLength;
      svg.appendChild(makeSvg('line', {
        x1: CX + Math.cos(angle) * innerR,
        y1: CY + Math.sin(angle) * innerR,
        x2: CX + Math.cos(angle) * outerR,
        y2: CY + Math.sin(angle) * outerR,
        stroke: 'var(--text-dim)',
        'stroke-width': face.ticks.majorWidth,
      }));
    }
  }

  // Index bars for minimal/pilot
  if (face.labels.type === 'indices') {
    for (const a of [-90, 0, 90, 180]) {
      const rad = a * Math.PI / 180;
      svg.appendChild(makeSvg('line', {
        x1: CX + Math.cos(rad) * (R - 16),
        y1: CY + Math.sin(rad) * (R - 16),
        x2: CX + Math.cos(rad) * (R - 4),
        y2: CY + Math.sin(rad) * (R - 4),
        stroke: 'var(--text)',
        'stroke-width': 5,
        'stroke-linecap': 'round',
      }));
    }
  }

  // Pilot triangle
  if (face.extras === 'pilotTriangle') {
    const triY = CY - R + 6;
    svg.appendChild(makeSvg('polygon', {
      points: `${CX},${triY} ${CX - 5},${triY + 10} ${CX + 5},${triY + 10}`,
      fill: 'var(--accent)',
    }));
  }

  // Static hands at 10:10:30 (classic preview position)
  const hourAngle = (10 + 10 / 60) * 30; // ~310 deg
  const minuteAngle = 10 * 6; // 60 deg
  const hRad = (hourAngle - 90) * Math.PI / 180;
  const mRad = (minuteAngle - 90) * Math.PI / 180;

  svg.appendChild(makeSvg('line', {
    x1: CX, y1: CY,
    x2: CX + Math.cos(hRad) * face.hands.hour.length,
    y2: CY + Math.sin(hRad) * face.hands.hour.length,
    stroke: 'var(--text)', 'stroke-width': face.hands.hour.width, 'stroke-linecap': 'round',
  }));
  svg.appendChild(makeSvg('line', {
    x1: CX, y1: CY,
    x2: CX + Math.cos(mRad) * face.hands.minute.length,
    y2: CY + Math.sin(mRad) * face.hands.minute.length,
    stroke: 'var(--text)', 'stroke-width': face.hands.minute.width, 'stroke-linecap': 'round',
  }));

  // Center dot
  svg.appendChild(makeSvg('circle', { cx: CX, cy: CY, r: face.centerDot.radius, fill: face.centerDot.color }));

  return svg;
}
