# CAT Diagnostics + Radio Configuration Tool Feasibility — Research / Spec

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-08
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Summary
Building a HamTab CAT diagnostics/configuration tool is feasible with the current architecture and can start as a low-risk read-only inspector before adding write/programming paths. The existing CAT stack already provides transport abstraction, per-radio drivers, auto-detection, command queueing, and normalized state events, which is enough for an MVP that inspects live radio state and captures debug traces. The main gap is command surface breadth: today drivers focus on operational controls (freq/mode/PTT/meters) and have limited direct exposure of configuration settings. The recommended path is a phased tool: Phase 1 read-only snapshot + command trace export; Phase 2 guided configuration writes; Phase 3 model-aware bulk programming profiles with safeguards. This can launch under HamTab now and be split into a dedicated repo later with minimal rework if the protocol/transport core is factored into a reusable package.

## User Goals Mapped To Capability

| Goal | Feasible now? | What exists | What is missing |
|---|---|---|---|
| Diagnose CAT control issues | Yes (MVP) | Transport read/write + timeout visibility; command queue + polling pipeline | Structured, exportable trace/log schema |
| Let user inspect current radio settings | Partial | Readback for freq/mode/PTT/meters; Yaesu menu read/write hooks | Cross-vendor settings inventory and normalized key model |
| Eventually program radios | Partial (vendor-specific) | Write paths for core ops (set freq/mode/PTT/RF power), Yaesu menu set | Bulk programming engine, transactional safety/rollback, per-model command catalogs |
| Give AI (Codex/Claude) machine-readable current settings for debugging | Yes (with small additions) | Rig state store receives normalized events | Snapshot/export endpoint/artifact and debug bundle format |

## What HamTab Already Has (Strong Foundation)

### 1) Multi-protocol driver model already in place
Drivers expose capabilities, command encoding, parsing, and polling lists per radio family, which is the right extension point for a diagnostics/configuration tool.

- Yaesu includes both standard CAT control and explicit menu read/write primitives (`getMenu`/`setMenu`) in `EX...` commands.
- Kenwood, Elecraft, Icom CI-V, and TCI drivers already map core controls.

Practical implication: we can add a "settings catalog" layer above current drivers without replacing the CAT architecture.

### 2) Transport layer supports both ASCII and binary CAT
`WebSerialTransport` already handles persistent read loops, raw byte writes, delimiter/sentinel reads, and clear timeout errors that include partial payloads. This is exactly what we need for troubleshooting views.

Practical implication: a diagnostic console can be implemented mostly by instrumentation at transport/queue boundaries, not by rewriting serial code.

### 3) Auto-detect and profile matching already exist
`smart-detect` already probes multiple protocol families and serial profiles, returning model/profile fit.

Practical implication: diagnostics can include a reproducible probe report (which probe succeeded/failed, timings, raw responses) for support/debug workflows.

### 4) Current config UI persists app-side radio config
`splash.js` stores protocol, serial, port mode, safety settings, and TCI endpoint in localStorage.

Practical implication: this is good for connection config but is not a live "radio settings snapshot"; we need a separate runtime snapshot generated from CAT readback.

## Key Gaps To Close

### Gap A: Command/readback coverage is narrow
Current poll loops read frequency, mode, and PTT; meter loop reads signal and (during TX) SWR/power. This is not enough for full configuration inspection or programming.

### Gap B: No normalized settings schema
There is no cross-vendor key model like `tx.power`, `data.mode`, `split.enabled`, `filter.width`, etc. Without this, user-facing settings pages and AI debugging snapshots will be brittle.

### Gap C: No structured diagnostics trace artifact
Queue/transport have useful logs but no first-class trace object with timestamps, command intent, wire payload, parsed result, and error classes for export.

### Gap D: Safe programming workflow is not formalized
Programming needs guardrails: write eligibility checks, dry-run simulation, confirmation gates, and verify-after-write loops.

## Recommended Architecture

### 1) Add a `CAT Capability Catalog` layer (read/write descriptors)
Create a descriptor table per driver/profile:

- `settingKey`: normalized ID (`radio.vfoA.frequency`, `radio.mode.main`, `radio.tx.rfPower`, `radio.menu.064`) 
- `readCommand`/`writeCommand` logical mapping
- `valueType`, range, enum map, units
- `safetyClass`: `safe_read`, `safe_write`, `tx_sensitive`, `model_sensitive`
- `supports`: model/profile constraints

Why: this decouples UI/AI tooling from raw vendor command syntax.

### 2) Add `CAT Trace Bus` in rig-manager + transport
Emit structured events for each command lifecycle:

- enqueue
- sent
- response-received
- parse-success
- parse-error
- timeout / io-error

Each event should include timestamp, profile, transport mode, command ID, raw payload (ASCII or hex), parsed event(s), elapsed ms.

Why: gives users and AI reproducible diagnostics.

### 3) Build `Radio Snapshot` generator
On demand (and optionally periodic), generate JSON snapshot:

- Connection metadata (profile, serial config, protocol)
- Live operational state (freq/mode/PTT/meters)
- Readable settings from capability catalog
- Last N trace events
- Error counters (timeouts, parse failures, retries)
- Confidence flags (`complete`, `partial`, `stale`)

Why: this is the artifact Codex/Claude can inspect for debugging/configuration assistance.

### 4) Implement staged write/programming engine
- Stage 1: interactive single-setting write + immediate verify readback
- Stage 2: profile apply (small grouped writes) with preflight + post-verify
- Stage 3: import/export radio profile packs (model-gated)

Why: minimizes risk of radio misconfiguration while enabling future programming features.

## Phased Delivery Plan

### Phase 1 (MVP, high confidence): Read-only diagnostics + AI snapshot
Deliverables:
- Diagnostics panel showing command trace stream and error counts
- "Capture debug bundle" button exporting JSON snapshot
- Probe report from smart-detect path
- Minimal setting inspector for existing read commands

Feasibility: High. Mostly additive around existing queue/transport/driver parse flow.

### Phase 2: Guided configuration writes
Deliverables:
- Setting editor for safe write keys (RF power, mode presets, selected menu items)
- Verify-after-write and rollback-on-failure behavior
- Safety interlocks (`PTT false`, not transmitting, confirmation prompt)

Feasibility: Medium-High. Needs command coverage extension + per-model validation.

### Phase 3: Programming workflows (per-radio packs)
Deliverables:
- Import/export profile templates
- Batch apply with progress + failure reporting
- Model/version compatibility checks

Feasibility: Medium. Higher complexity due to divergent vendor command sets and radio-side state dependencies.

## Repo Strategy (HamTab now, possible new repo later)

Recommended now:
- Keep in HamTab to leverage existing CAT drivers and UI state quickly.

Future split trigger:
- If CAT diagnostics/programming is needed by HamCon/VirtualHam or as standalone utility, extract protocol core into a shared package (e.g. `packages/cat-core`) and keep HamTab as one consumer.

Low-regret path:
- Introduce new modules behind interfaces now (catalog, trace bus, snapshot serializer) so extraction later is straightforward.

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Vendor command divergence for non-core settings | Medium/High | Start with normalized core + per-vendor extension namespaces |
| Unsafe writes while transmitting | High | Enforce TX-safe gate and explicit confirmation + blocklist writes during PTT |
| Timeout noise from meter polling can mask real failures | Medium | Separate telemetry channels and error classes (meter timeout vs control timeout) |
| AI debug artifacts include sensitive data | Medium | Redact identifiers/keys and include explicit redaction policy in export |
| Browser WebSerial edge behavior | Medium | Reuse current read-loop design and record transport state in debug bundle |

## Acceptance Criteria

1. A user can export a single JSON bundle that includes connection metadata, live rig state, and last 200 CAT trace events.
2. Claude/Codex can identify at least these issues from the bundle without live access: wrong baud/stop bits, unsupported command, repeated timeout pattern, parse mismatch.
3. A user can read current values for all Phase 1 catalog keys from the UI with clear "unsupported" indicators per model.
4. Any write action in Phase 2 performs preflight checks and verify-after-write, with visible pass/fail result.
5. No Phase 1/2 work regresses normal control latency for frequency/mode/PTT operations.

## Recommendation (Prioritized)

1. Build Phase 1 first under HamTab: trace bus + snapshot export + inspector UI.
2. Define normalized settings key schema before adding many new CAT commands.
3. Expand command coverage by vendor in small, testable batches tied to catalog keys.
4. Add Phase 2 safe-write flows only after trace/snapshot observability is stable.
5. Plan `cat-core` extraction only after 2+ projects need the same diagnostics/programming stack.

## Route-To-Claude Implementation Ticket Seed

- Add `src/cat/diagnostics/trace-bus.js` (event collector + bounded ring buffer)
- Add `src/cat/diagnostics/snapshot.js` (serialize rig state + trace + connection info)
- Add `src/cat/catalog/` descriptors per protocol family
- Instrument `rig-manager`, `command-queue`, `web-serial` for structured events
- Add UI affordance in radio config modal: "Open Diagnostics" + "Export Debug Bundle"
- Add docs for support workflow: attach JSON bundle when reporting CAT issue

## Sources

- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:84` — capabilities include menu read/write and operational controls
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:130` — `getMenu` / `setMenu` encoding via `EX...`
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:233` — polling scope is freq/freqB/mode/PTT
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/kenwood-ascii.js:87` — Kenwood capability surface
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/elecraft-ascii.js:86` — Elecraft capability surface
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/icom-civ.js:145` — Icom CI-V capability surface
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/tci.js:75` — TCI capability surface and model
- `/home/fpeebles/coding/HamTabV1/src/cat/rig-manager.js:30` — centralized command queue and send pipeline
- `/home/fpeebles/coding/HamTabV1/src/cat/rig-manager.js:149` — polling loop behavior
- `/home/fpeebles/coding/HamTabV1/src/cat/rig-manager.js:168` — meter polling behavior and TX-gated reads
- `/home/fpeebles/coding/HamTabV1/src/cat/command-queue.js:1` — queue features (rate limit, priority, coalescing)
- `/home/fpeebles/coding/HamTabV1/src/cat/transports/web-serial.js:67` — persistent reader loop
- `/home/fpeebles/coding/HamTabV1/src/cat/transports/web-serial.js:298` — raw byte write support
- `/home/fpeebles/coding/HamTabV1/src/cat/transports/web-serial.js:340` — timeout error includes partial response for debugging
- `/home/fpeebles/coding/HamTabV1/src/cat/smart-detect.js:11` — probe set across protocols/serial configs
- `/home/fpeebles/coding/HamTabV1/src/cat/smart-detect.js:212` — smart detect orchestration and progress callbacks
- `/home/fpeebles/coding/HamTabV1/src/splash.js:580` — radio config load in UI
- `/home/fpeebles/coding/HamTabV1/src/splash.js:1081` — radio config persistence to localStorage
- `/home/fpeebles/coding/HamTabV1/src/config-sync.js:28` — sync/export concerns app config, not full CAT runtime snapshot
