// --- Scope Spectrum ---
// Peak hold, avg smoothing, grid, VFO line, passband shading, freq labels.
// Ported from VirtualHam spectrum.ts — adapted to Hz-based rig store state.

import { DEFAULT_FLOOR_DB, DEFAULT_CEILING_DB } from './scope-color-map.js';

// Filter width defaults by mode (Hz)
const MODE_FILTER_WIDTH = {
  CW: 500,
  'CW-R': 500,
  LSB: 2400,
  USB: 2400,
  AM: 6000,
  FM: 12000,
  RTTY: 500,
  'RTTY-R': 500,
  PSK: 500,
  FT8: 3000,
  FT4: 3000,
  DATA: 3000,
};

export function createSpectrum(canvas, getState, options) {
  if (!options) options = {};
  const floorDb = options.floorDb !== undefined ? options.floorDb : DEFAULT_FLOOR_DB;
  const ceilingDb = options.ceilingDb !== undefined ? options.ceilingDb : DEFAULT_CEILING_DB;
  const peakDecay = options.peakDecay || 0.95;
  const avgAlpha = options.avgAlpha || 0.3;
  const spanHz = options.spanHz || 48000;

  const ctx = canvas.getContext('2d');
  let width = canvas.width;
  let height = canvas.height;
  let peakHold = null;
  let avgBuffer = null;

  function dbToY(db) {
    const normalized = (db - floorDb) / (ceilingDb - floorDb);
    return height - normalized * height;
  }

  function draw(magnitudes) {
    const bins = magnitudes.length;

    // Update peak hold
    if (!peakHold || peakHold.length !== bins) {
      peakHold = new Float32Array(magnitudes);
    } else {
      for (let i = 0; i < bins; i++) {
        peakHold[i] = Math.max(magnitudes[i], peakHold[i] * peakDecay);
      }
    }

    // Update average
    if (!avgBuffer || avgBuffer.length !== bins) {
      avgBuffer = new Float32Array(magnitudes);
    } else {
      for (let i = 0; i < bins; i++) {
        avgBuffer[i] = avgAlpha * magnitudes[i] + (1 - avgAlpha) * avgBuffer[i];
      }
    }

    ctx.clearRect(0, 0, width, height);

    // Background — dark LCD panel
    ctx.fillStyle = 'rgba(4, 8, 16, 0.9)';
    ctx.fillRect(0, 0, width, height);

    // Grid lines — subtle navy
    ctx.strokeStyle = 'rgba(26, 42, 68, 0.5)';
    ctx.lineWidth = 1;
    const gridStepDb = 10;
    for (let db = floorDb; db <= ceilingDb; db += gridStepDb) {
      const y = dbToY(db);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // dB labels — muted blue
    ctx.fillStyle = '#4a5a7a';
    ctx.font = '10px Consolas, monospace';
    ctx.textAlign = 'left';
    for (let db = floorDb; db <= ceilingDb; db += gridStepDb) {
      const y = dbToY(db);
      ctx.fillText('' + db, 4, y - 2);
    }

    const binWidth = width / bins;

    // VFO center line — cyan
    const centerX = width / 2;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Passband shading — cyan tint, width derived from mode
    const state = getState();
    const mode = state.mode || 'USB';
    const filterHz = MODE_FILTER_WIDTH[mode] || 2400;
    const filterPx = (filterHz / spanHz) * width;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
    ctx.fillRect(centerX - filterPx / 2, 0, filterPx, height);

    // Peak hold line — orange
    ctx.strokeStyle = 'rgba(255, 145, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < bins; i++) {
      const x = i * binWidth;
      const y = dbToY(peakHold[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Spectrum fill — cyan gradient
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let i = 0; i < bins; i++) {
      const x = i * binWidth;
      const y = dbToY(avgBuffer[i]);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 229, 255, 0.02)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Spectrum line — bright cyan with glow
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    for (let i = 0; i < bins; i++) {
      const x = i * binWidth;
      const y = dbToY(avgBuffer[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Frequency labels along bottom
    drawFrequencyLabels(state);
  }

  function drawFrequencyLabels(state) {
    const centerHz = state.frequency || 14175000;
    const startHz = centerHz - spanHz / 2;

    ctx.fillStyle = '#4a5a7a';
    ctx.font = '10px Consolas, monospace';
    ctx.textAlign = 'center';

    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const x = (i / labelCount) * width;
      const freqHz = startHz + (i / labelCount) * spanHz;
      const freqMHz = (freqHz / 1_000_000).toFixed(3);
      ctx.fillText(freqMHz, x, height - 4);
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    width = canvas.width;
    height = canvas.height;
  }

  function destroy() {
    peakHold = null;
    avgBuffer = null;
    ctx.clearRect(0, 0, width, height);
  }

  resize();

  return { draw, resize, destroy };
}
