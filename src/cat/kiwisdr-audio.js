// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- KiwiSDR Audio Player ---
// Plays PCM audio from KiwiSDR binary frames via Web Audio API.
// Schedules AudioBufferSourceNodes from incoming PCM chunks — no.
// ScriptProcessorNode, no microphone binding, no worklet file needed.
// Browser handles resampling from 12 kHz to device output rate.
const KIWI_SAMPLE_RATE = 12000; // KiwiSDR output rate
const MAX_SCHEDULE_AHEAD = 2;   // seconds — drop audio if we fall this far behind

export function createKiwiSdrAudioPlayer() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Gain node for mute/unmute (gain=0 muted, gain=1 normal)
  const gainNode = ctx.createGain();
  gainNode.gain.value = 1;
  gainNode.connect(ctx.destination);

  let nextStartTime = 0; // when the next chunk should begin playing
  let muted = false;

  return {
    // Schedule PCM Int16 samples for playback.
    feedSamples(int16Array) {
      if (!int16Array.length) return;

      // Resume AudioContext if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') ctx.resume();

      // Create an AudioBuffer at KiwiSDR's native rate — browser resamples to output.

      const buf = ctx.createBuffer(1, int16Array.length, KIWI_SAMPLE_RATE);
      const channel = buf.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        channel[i] = int16Array[i] / 32768; // Int16 → Float32 [-1, 1]
      }

      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(gainNode);

      const now = ctx.currentTime;
      // If we've fallen behind or this is the first chunk, reset schedule.
      if (nextStartTime < now || nextStartTime > now + MAX_SCHEDULE_AHEAD) {
        nextStartTime = now;
      }

      source.start(nextStartTime);
      nextStartTime += buf.duration;
    },

    setMuted(val) {
      muted = !!val;
      gainNode.gain.value = muted ? 0 : 1;
    },

    isMuted() {
      return muted;
    },

    destroy() {
      try { gainNode.disconnect(); } catch { /* ignore */ }
      try { ctx.close(); } catch { /* ignore */ }
    },
  };
}
