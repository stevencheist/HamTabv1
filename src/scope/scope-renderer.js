// --- Scope Renderer ---
// Render loop orchestrator for panadapter (spectrum + waterfall).
// Creates canvases, manages requestAnimationFrame, interfaces with rig store.
// startScope() / stopScope() API for on-air-rig.js lifecycle.

import { createSpectrum } from './scope-spectrum.js';
import { createWaterfall } from './scope-waterfall.js';
import { createSpectrumDataSource } from './scope-signal-gen.js';
import { getRigStore } from '../cat/index.js';

const BINS = 512;
const SPAN_HZ = 48000;
const WATERFALL_INTERVAL = 33; // ~30fps for waterfall push rate

let spectrum = null;
let waterfall = null;
let dataSource = null;
let animFrameId = null;
let resizeObserver = null;
let lastWaterfallTime = 0;
let running = false;

function getState() {
  const store = getRigStore();
  return store.get();
}

function renderLoop(timestamp) {
  if (!running) return;

  const state = getState();
  const centerHz = state.frequency || 14175000;
  const band = state.band || null;

  // Generate synthetic spectrum frame
  const frame = dataSource.generateFrame(centerHz, band);

  // Spectrum draws every frame (~60fps)
  spectrum.draw(frame);

  // Waterfall pushes at ~30fps
  if (timestamp - lastWaterfallTime >= WATERFALL_INTERVAL) {
    waterfall.pushRow(frame);
    lastWaterfallTime = timestamp;
  }

  animFrameId = requestAnimationFrame(renderLoop);
}

function handleResize() {
  if (!running) return;
  if (spectrum) spectrum.resize();
  if (waterfall) waterfall.resize();
}

/**
 * Start the scope render loop. Shows the scope section and begins drawing.
 * @param {object} opts - { longitude } for synthetic signal generation
 */
export function startScope(opts) {
  if (running) return;
  if (!opts) opts = {};

  const section = document.getElementById('rigScopeSection');
  const specCanvas = document.getElementById('rigScopeSpectrum');
  const wfCanvas = document.getElementById('rigScopeWaterfall');

  if (!section || !specCanvas || !wfCanvas) return;

  // Show scope section
  section.style.display = '';

  // Create renderers
  spectrum = createSpectrum(specCanvas, getState, {
    spanHz: SPAN_HZ,
  });

  waterfall = createWaterfall(wfCanvas, {
    bins: BINS,
  });

  dataSource = createSpectrumDataSource({
    bins: BINS,
    spanHz: SPAN_HZ,
    longitude: opts.longitude || 0,
  });

  // ResizeObserver — matches spacewx-graphs.js pattern
  const container = document.getElementById('widget-on-air-rig');
  if (container && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  }

  running = true;
  lastWaterfallTime = 0;
  animFrameId = requestAnimationFrame(renderLoop);
}

/** Stop the scope render loop. Hides the scope section and cleans up. */
export function stopScope() {
  if (!running) return;
  running = false;

  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  if (spectrum) { spectrum.destroy(); spectrum = null; }
  if (waterfall) { waterfall.destroy(); waterfall = null; }
  if (dataSource) { dataSource.destroy(); dataSource = null; }

  const section = document.getElementById('rigScopeSection');
  if (section) section.style.display = 'none';
}
