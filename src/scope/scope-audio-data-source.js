// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- Scope Audio Data Source ---
// Captures USB audio from a radio via getUserMedia and provides real-time.
// AF (audio-frequency) FFT data. Same generateFrame() API as scope-signal-gen.
//
// LIMITATION: This shows post-demodulation audio (0–6 kHz passband), NOT RF bandwidth.
// Only signals within the radio's current filter/demod window appear.
import { blendFrames } from './scope-signal-gen.js';

const BINS = 512;
const FLOOR_DB = -120; // clamp -Infinity bins to this
const AF_DISPLAY_HZ = 4000; // show 0–4 kHz (covers SSB, CW, FT8 audio passband)

/**
 * Create an audio data source that captures mic/line input and returns FFT frames.
 * @param {object} opts
 * @param {string} opts.deviceId - audio input device ID ('' = default)
 * @param {number} opts.sampleRate - desired sample rate (44100, 48000, 96000)
 * @param {function} opts.onError - called on permission denied or stream error
 * @param {function} opts.onStateChange - called with state string: 'requesting'|'active'|'denied'|'error'|'destroyed'
 * @returns {{ generateFrame(), destroy(), isActive() }}
 */
export function createAudioDataSource(opts) {
  if (!opts) opts = {};
  const deviceId = opts.deviceId || '';
  const sampleRate = opts.sampleRate || 48000;
  const onError = opts.onError || (() => {});
  const onStateChange = opts.onStateChange || (() => {});

  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let stream = null;
  let active = false;
  let destroyed = false;
  let prevFrame = new Float32Array(BINS);
  let fftBuffer = null; // reusable Float32Array for getFloatFrequencyData

  function setState(s) {
    onStateChange(s);
  }

  // Start audio capture asynchronously.

  async function init() {
    if (destroyed) return;
    setState('requesting');

    try {
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };
      if (deviceId) {
        constraints.audio.deviceId = { exact: deviceId };
      }

      stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (destroyed) {
        // Destroyed while awaiting permission.
        stopTracks();
        return;
      }

      audioCtx = new AudioContext({ sampleRate });
      sourceNode = audioCtx.createMediaStreamSource(stream);

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024; // 512 frequency bins — matches BINS constant
      analyser.minDecibels = -120;
      analyser.maxDecibels = -40;
      analyser.smoothingTimeConstant = 0.6;

      sourceNode.connect(analyser);
      // Do NOT connect to audioCtx.destination — no speaker playback.

      fftBuffer = new Float32Array(analyser.frequencyBinCount);
      active = true;
      setState('active');
    } catch (err) {
      console.warn('[audio-scope] Failed to capture audio:', err.message);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setState('denied');
      } else {
        setState('error');
      }
      onError(err);
    }
  }

  function stopTracks() {
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
  }

  /**
   * Return current FFT frame (512 bins, dB values).
   * Crops FFT to 0–6 kHz and stretches to fill BINS output bins.
   * Ignores centerHz/band params — AF scope has no tuning concept.
   */
  function generateFrame() {
    if (!active || !analyser || !fftBuffer) {
      return prevFrame;
    }

    analyser.getFloatFrequencyData(fftBuffer);

    // How many FFT bins cover 0–AF_DISPLAY_HZ at current sample rate.

    const nyquist = sampleRate / 2;
    const srcBins = Math.min(fftBuffer.length, Math.round((AF_DISPLAY_HZ / nyquist) * fftBuffer.length));

    // Resample srcBins → BINS output bins via linear interpolation.

    const output = new Float32Array(BINS);
    for (let i = 0; i < BINS; i++) {
      const srcPos = (i / BINS) * srcBins;
      const lo = Math.floor(srcPos);
      const hi = Math.min(lo + 1, srcBins - 1);
      const frac = srcPos - lo;
      let val = fftBuffer[lo] * (1 - frac) + fftBuffer[hi] * frac;
      // Clamp -Infinity / NaN to floor.
      if (val === -Infinity || isNaN(val)) val = FLOOR_DB;
      output[i] = val;
    }

    const blended = blendFrames(prevFrame, output, 0.4);
    prevFrame = blended;
    return blended;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    active = false;

    if (sourceNode) {
      try { sourceNode.disconnect(); } catch (e) { /* already disconnected */ }
      sourceNode = null;
    }
    if (analyser) {
      analyser = null;
    }
    stopTracks();
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    fftBuffer = null;
    prevFrame = new Float32Array(BINS);
    setState('destroyed');
  }

  function isActive() {
    return active;
  }

  // Start capture immediately
  init();

  return { generateFrame, destroy, isActive };
}
