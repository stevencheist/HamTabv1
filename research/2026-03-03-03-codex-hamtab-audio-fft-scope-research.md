# HamTab Audio FFT Scope (FTDX10 USB Audio) — Feasibility + Implementation Spec

> **For:** Claude (via Francisco)
> **From:** Codex
> **Date:** 2026-03-03
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed (no HamTabV1 `STATE*.md` found at repo root)

## Summary
Audio-capture FFT is feasible in HamTab without backend changes. Browsers can capture a selected local audio input device via `getUserMedia()`, route it into Web Audio, and expose dB-frequency bins via `AnalyserNode.getFloatFrequencyData()`. HamTab’s current scope pipeline already accepts `Float32Array` dB magnitudes and only needs a new data source implementation plus radio-config UI fields for input device selection. The major product risk is not API feasibility but RF label semantics: audio FFT is baseband AF, not true RF span around VFO. Recommended first cut is AF-relative labels (0..3 kHz window) with optional mode-aware RF overlay mapping.

## Feasibility Verdict
| Area | Verdict | Notes |
|---|---|---|
| Browser audio capture | Yes | `getUserMedia()` supports audio input capture in secure contexts. |
| Device-specific selection | Yes | Use `enumerateDevices()` + `deviceId` constraint for selected input. |
| Real-time FFT output | Yes | `AnalyserNode` outputs per-bin dB magnitudes directly. |
| Drop-in renderer integration | Yes | Existing renderer contract already matches Float32 dB arrays. |
| True RF panadapter parity with FTDX10 scope | No | AF FFT cannot replicate internal SDR IF/RF scope detail. |

## Current HamTab Integration Points
- Synthetic source contract already exists: `generateFrame(centerHz, band)` + `destroy()` in [`scope-signal-gen.js`](/home/fpeebles/coding/HamTabV1/src/scope/scope-signal-gen.js:90).
- Render loop consumes one frame each RAF and feeds spectrum + waterfall in [`scope-renderer.js`](/home/fpeebles/coding/HamTabV1/src/scope/scope-renderer.js:28).
- Scope uses fixed `BINS=512` and `SPAN_HZ=48000` in [`scope-renderer.js`](/home/fpeebles/coding/HamTabV1/src/scope/scope-renderer.js:11).
- Spectrum input format is dB magnitudes, with passband shading based on mode in [`scope-spectrum.js`](/home/fpeebles/coding/HamTabV1/src/scope/scope-spectrum.js:42).
- Waterfall also consumes same dB magnitude array in [`scope-waterfall.js`](/home/fpeebles/coding/HamTabV1/src/scope/scope-waterfall.js:19).
- Scope lifecycle starts/stops on connect/disconnect in [`on-air-rig.js`](/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:607).
- Radio config form/state persistence currently handled in [`public/index.html`](/home/fpeebles/coding/HamTabV1/public/index.html:206), [`state.js`](/home/fpeebles/coding/HamTabV1/src/state.js:284), [`splash.js`](/home/fpeebles/coding/HamTabV1/src/splash.js:562).

## Web Audio Architecture Recommendation
### Choose `AnalyserNode` first
Use `AnalyserNode` for MVP because it already returns dB bins in the exact shape HamTab needs, and FFT sizes 32..32768 are standard in the spec.

Recommended params:
- `fftSize = 1024` (produces `frequencyBinCount = 512` bins)
- `minDecibels = -120`, `maxDecibels = -40` (align with HamTab defaults)
- `smoothingTimeConstant = 0.5` to `0.7` (replace synthetic EMA feel)

### When to use `AudioWorklet`
Use `AudioWorklet` only if you later need custom DSP not supported by `AnalyserNode` (windowing options, overlap-add, per-bin denoise, multi-stage averaging, AGC-normalized bins). `AudioWorkletProcessor` runs on the audio rendering thread and is better for advanced low-jitter DSP, but adds implementation complexity.

## Proposed Code Structure (drop-in data source)
### New file
- `src/scope/scope-audio-data-source.js`

### API (match existing call sites)
```js
export async function createAudioDataSource(opts = {}) {
  // opts: { bins, preferredSampleRate, deviceId, floorDb, ceilingDb, smoothing }
  // returns { generateFrame(centerHz, band), destroy(), getMeta() }
}
```

### Internal flow
1. Call `navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact }, echoCancellation:false, noiseSuppression:false, autoGainControl:false }, video:false })`.
2. Create `AudioContext` (preferred sample rate 48k where possible).
3. Connect `MediaStreamAudioSourceNode` -> `AnalyserNode`.
4. Allocate one reusable `Float32Array(analyser.frequencyBinCount)`.
5. `generateFrame()` returns latest `getFloatFrequencyData()` output array.
6. `destroy()` stops tracks, disconnects nodes, closes `AudioContext`.

### Renderer wiring changes
- In `startScope()` in [`scope-renderer.js`](/home/fpeebles/coding/HamTabV1/src/scope/scope-renderer.js:60), select audio source when rig is real and audio scope enabled; fallback to synthetic for demo/no device.
- Because microphone access is async, make `startScope` async or pre-initialize source before animation loop start.

## Radio Config UI Additions
Add in the Radio tab (real-radio section) near Serial Port:
- `Audio Input Device` dropdown (`default` + discovered `audioinput` devices).
- `Refresh Audio Devices` button.
- Optional toggle: `Use audio FFT scope when connected`.

Persist in state/localStorage:
- `state.radioAudioInputDeviceId` -> `hamtab_radio_audio_input_device_id`
- `state.radioAudioScopeEnabled` -> `hamtab_radio_audio_scope_enabled`

Touch points:
- UI markup in [`public/index.html`](/home/fpeebles/coding/HamTabV1/public/index.html:247)
- Load/save + listeners in [`splash.js`](/home/fpeebles/coding/HamTabV1/src/splash.js:562) and [`splash.js`](/home/fpeebles/coding/HamTabV1/src/splash.js:913)
- Defaults in [`state.js`](/home/fpeebles/coding/HamTabV1/src/state.js:284)

## Frequency Label Strategy (important)
### Constraint
Current spectrum labels assume symmetric RF span around VFO (`center ± span/2`) in [`scope-spectrum.js`](/home/fpeebles/coding/HamTabV1/src/scope/scope-spectrum.js:156). That is valid for synthetic RF span but not AF audio FFT.

### Recommended phased strategy
1. MVP (least risk): show AF labels only (`0.0` to `3.0 kHz` window, optionally `0..Nyquist` debug mode).
2. Phase 2: mode-aware RF overlay labels as derived mapping.
3. Keep passband shading but compute from AF span, not RF span.

### Mapping model (derived)
- USB: `rfHz = vfoHz + afHz`
- LSB: `rfHz = vfoHz - afHz`
- CW/DATA/AM/FM: configurable mapping by mode profile (not one-size-fits-all)

Inference note: this is a semantic approximation because AF output is post-demod audio, not raw IF/IQ.

## Browser / Deployment Compatibility
| Topic | Chrome | Edge | Firefox | Notes |
|---|---|---|---|---|
| `getUserMedia` audio capture | Supported | Supported | Supported | Requires secure context and user permission. |
| `enumerateDevices` device listing | Supported | Supported | Supported | Non-default device labels require prior permission. |
| Web Audio `AnalyserNode` | Supported | Supported | Supported | Suitable for 30fps waterfall updates. |
| `AudioWorklet` | Supported | Supported | Supported | Use only for advanced DSP needs. |

Deployment notes:
- `localhost` is a trustworthy origin for secure-context features.
- Hosted `https://hamtab.net` can still access local microphones/USB-audio through browser permission prompts (local-device capture is origin-permission gated, not LAN-host gated).
- For local dev with self-signed certs, browser trust handling can still block permissions if context is treated insecure; prefer `https://localhost` for predictable behavior.

## FTDX10-Specific Findings
- Yaesu CAT reference defines serial CAT command control and command tables; no documented CAT stream for full-spectrum/IQ export, so RF panadapter parity should not be expected via CAT alone.
- CAT reference also indicates dual COM-port behavior over USB serial for control/RTTY contexts.
- Practical implication: use CAT for rig state + USB audio for AF FFT visualization.

Inference note: I did not find an official Yaesu source in this pass that explicitly states “USB audio is post-demod AF only” in one sentence; recommendation is to validate on bench by tone injection and sideband/mode checks.

## Risks / Edge Cases
1. Device labels are often blank until microphone permission is granted once.
2. Audio sample-rate may differ by OS/browser/device; code must read actual `audioContext.sampleRate` and compute effective bin Hz from runtime rate.
3. Auto gain / noise suppression from browser constraints can distort FFT unless explicitly disabled.
4. Connect/disconnect races: audio track teardown must happen before reconnect to avoid “device in use” and orphaned streams.
5. UI confusion risk if RF labels are shown as if true panadapter data.

## Implementation Plan (Claude-ready)
1. Add `scope-audio-data-source.js` with async factory and cleanup-safe lifecycle.
2. Add radio state keys + localStorage persistence for audio device selection and enable toggle.
3. Extend Radio tab UI for audio input selection and discovery refresh.
4. Add device enumeration utility (`navigator.mediaDevices.enumerateDevices`) with graceful fallback messaging.
5. Update scope renderer to choose data source by mode:
   - demo -> synthetic source
   - real + audio enabled + permission granted -> audio source
   - fallback -> synthetic source + status message
6. Update spectrum labels for AF-mode display path (separate code path from RF-span labels).
7. Add status text in On-Air Rig widget for “Audio FFT active / waiting permission / fallback synthetic”.

## Acceptance Criteria
1. Real-radio mode can select a specific USB audio input and render live movement tied to received audio changes.
2. Disconnect and widget close always release media tracks and audio context.
3. Waterfall updates remain stable around 30 fps without animation loop stalls.
4. If permission denied or device missing, scope fails gracefully and can fall back to synthetic mode with explicit UI status.
5. Frequency labeling no longer implies symmetric RF span when using AF FFT mode.

## Sources
### Internal code
- `/home/fpeebles/coding/HamTabV1/src/scope/scope-renderer.js:11`
- `/home/fpeebles/coding/HamTabV1/src/scope/scope-renderer.js:28`
- `/home/fpeebles/coding/HamTabV1/src/scope/scope-renderer.js:60`
- `/home/fpeebles/coding/HamTabV1/src/scope/scope-spectrum.js:42`
- `/home/fpeebles/coding/HamTabV1/src/scope/scope-spectrum.js:156`
- `/home/fpeebles/coding/HamTabV1/src/scope/scope-waterfall.js:19`
- `/home/fpeebles/coding/HamTabV1/src/scope/scope-signal-gen.js:90`
- `/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:607`
- `/home/fpeebles/coding/HamTabV1/public/index.html:206`
- `/home/fpeebles/coding/HamTabV1/public/index.html:247`
- `/home/fpeebles/coding/HamTabV1/src/splash.js:562`
- `/home/fpeebles/coding/HamTabV1/src/splash.js:913`
- `/home/fpeebles/coding/HamTabV1/src/state.js:284`

### External references
- MDN: MediaDevices `getUserMedia()` (secure context + permissions) — https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN: MediaDevices `enumerateDevices()` (device listing + security requirements) — https://developer.mozilla.org/docs/Web/API/MediaDevices/enumerateDevices
- MDN: `MediaDeviceInfo.label` (label availability after permission) — https://developer.mozilla.org/en-US/docs/Web/API/MediaDeviceInfo/label
- W3C Web Audio Spec: `AnalyserNode.fftSize` valid range — https://webaudio.github.io/web-audio-api/#dom-analysernode-fftsize
- MDN: `AnalyserNode.getFloatFrequencyData()` (dB output semantics) — https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatFrequencyData
- MDN: `AudioWorkletProcessor` (processing model / audio rendering thread) — https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor
- MDN: Secure Contexts (localhost trustworthiness) — https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
- Yaesu FTDX10 CAT Operation Reference (command/control scope of CAT) — https://manuals.plus/m/ef36f0628e7946f88cc5e47e49f6372f12bd810f0f9f5f8022a40de8e4a0fd79.pdf
