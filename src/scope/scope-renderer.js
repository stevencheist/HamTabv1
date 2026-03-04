// --- Scope Renderer ---
// Render loop orchestrator for panadapter (spectrum + waterfall).
// Creates canvases, manages requestAnimationFrame, interfaces with rig store.
// startScope() / stopScope() API for on-air-rig.js lifecycle.

import { createSpectrum } from './scope-spectrum.js';
import { createWaterfall } from './scope-waterfall.js';
import { createSpectrumDataSource } from './scope-signal-gen.js';
import { createAudioDataSource } from './scope-audio-data-source.js';
import { getRigStore } from '../cat/index.js';
import state from '../state.js';

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
let audioMode = false; // true when using live audio data source
let hideOnFail = false; // true → hide scope on audio error instead of synthetic fallback

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
 * @param {object} opts - { longitude, useAudio }
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

  // Determine if we should use live audio capture
  const canAudio = opts.useAudio
    && state.radioAudioScopeEnabled
    && typeof navigator !== 'undefined'
    && navigator.mediaDevices
    && typeof navigator.mediaDevices.getUserMedia === 'function';

  audioMode = canAudio;
  hideOnFail = !!opts.hideOnAudioFail;

  // Create spectrum renderer with AF mode if using audio
  spectrum = createSpectrum(specCanvas, getState, {
    spanHz: canAudio ? state.radioAudioSampleRate : SPAN_HZ,
    afMode: canAudio,
  });

  waterfall = createWaterfall(wfCanvas, {
    bins: BINS,
  });

  if (canAudio) {
    // Live audio FFT source
    dataSource = createAudioDataSource({
      deviceId: state.radioAudioDeviceId,
      sampleRate: state.radioAudioSampleRate,
      onError: () => {
        if (hideOnFail) {
          // Real radio — hide scope entirely instead of showing synthetic
          console.warn('[scope] Audio capture failed — hiding scope');
          stopScope();
          return;
        }
        // Fallback to synthetic on error/denial
        console.warn('[scope] Audio capture failed — falling back to synthetic scope');
        fallbackToSynthetic(opts);
      },
      onStateChange: (s) => {
        updateScopeLabel(s === 'active' ? 'AF SCOPE (Audio)' : s === 'requesting' ? 'REQUESTING MIC...' : null);
      },
    });
    updateScopeLabel('AF SCOPE (Audio)');
  } else {
    // Synthetic signal generator
    dataSource = createSpectrumDataSource({
      bins: BINS,
      spanHz: SPAN_HZ,
      longitude: opts.longitude || 0,
    });
    updateScopeLabel(null);
  }

  // ResizeObserver — matches spacewx-graphs.js pattern
  const container = document.getElementById('widget-on-air-rig');
  if (container && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  }

  running = true;
  lastWaterfallTime = 0;

  // Force resize after browser reflow (section just changed from display:none)
  requestAnimationFrame(() => {
    if (spectrum) spectrum.resize();
    if (waterfall) waterfall.resize();
    animFrameId = requestAnimationFrame(renderLoop);
  });
}

/** Fallback from audio source to synthetic (e.g. on permission denial) */
function fallbackToSynthetic(opts) {
  if (dataSource) { dataSource.destroy(); dataSource = null; }
  audioMode = false;

  dataSource = createSpectrumDataSource({
    bins: BINS,
    spanHz: SPAN_HZ,
    longitude: (opts && opts.longitude) || 0,
  });

  // Switch spectrum back to RF labels
  if (spectrum) spectrum.setAFMode(false);
  updateScopeLabel(null);
}

/** Set or clear the AF/RF label above the scope canvases */
function updateScopeLabel(text) {
  const label = document.getElementById('rigScopeLabel');
  if (!label) return;
  if (text) {
    label.textContent = text;
    label.style.display = '';
  } else {
    label.textContent = '';
    label.style.display = 'none';
  }
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

  audioMode = false;
  hideOnFail = false;
  updateScopeLabel(null);

  const section = document.getElementById('rigScopeSection');
  if (section) section.style.display = 'none';
}
