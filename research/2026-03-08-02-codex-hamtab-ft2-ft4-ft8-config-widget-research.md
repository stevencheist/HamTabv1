# HamTab Digital-Mode Setup Widget (FT2/FT4/FT8) — Feasibility & Implementation Spec

> **For:** Claude (via Francisco)
> **From:** Codex
> **Date:** 2026-03-08
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE v3

## Summary
HamTab can already automate the core of digital-mode setup for supported CAT rigs: dial frequency, mode selection, and RF power setting. The current codebase already maps FT4/FT8 spots to `DATA-U`, and the On-Air Rig widget already includes FT8 dial defaults for all major HF+6m bands. The blocker for a true “full digital setup” widget is CAT command coverage, not UI plumbing: many practical digital-prep settings (processor/VOX/filter/data-audio specifics) are not implemented in the Yaesu driver today. A practical approach is a phased widget: Phase 1 ships now using existing commands + guided checks; Phase 2 adds deeper radio-setting automation once command support is expanded.

## Scope Assumption: “FT2, FT4, FT8”
- WSJT-X primary docs list `FT4` and `FT8` (and `FST4`), but not a separate `FT2` mode.
- Recommendation: treat “FT2” as either:
1. A requested custom preset profile (user-defined dial/mode/power), or
2. A shorthand typo for `FT4/FT8` family.

## What HamTab Already Supports (Relevant to This Widget)

| Capability | Status | Evidence |
|---|---|---|
| Set rig frequency via CAT | Implemented | `setFrequency` in Yaesu driver encoding ([yaesu-ascii.js](../src/cat/drivers/yaesu-ascii.js):101) |
| Set rig mode via CAT | Implemented | `setMode` in Yaesu driver ([yaesu-ascii.js](../src/cat/drivers/yaesu-ascii.js):105) |
| Set RF power via CAT | Implemented | `setRFPower` command ([yaesu-ascii.js](../src/cat/drivers/yaesu-ascii.js):115) |
| FT4/FT8 spots resolve to data mode | Implemented | `FT4`/`FT8` -> `DATA-U` mapping ([band-auto-profile.js](../src/cat/profiles/band-auto-profile.js):9) |
| Spot click tunes + applies mode | Implemented | `setFrequency` + `setMode` sent from spot detail ([spot-detail.js](../src/spot-detail.js):265) |
| On-Air Rig has digital dial defaults | Implemented (FT8 set) | FT8 frequency table in widget code ([on-air-rig.js](../src/on-air-rig.js):54) |
| Widget lifecycle/connect plumbing | Implemented | `initOnAirRig`, connect orchestration ([on-air-rig.js](../src/on-air-rig.js):882), ([connection-orchestrator.js](../src/cat/connection-orchestrator.js):59) |

## Key Gaps for “One-Click Digital Operation”

| Needed for robust FT4/FT8 operation | Current state | Why it matters |
|---|---|---|
| Digital preset UI (mode profile selector) | Missing | No dedicated “Digital Setup” UX flow; operator must manually tune/adjust. |
| FT4 dial-frequency table in widget | Missing (FT8-only table exists) | FT4 is currently inferred only from spot mode, not from explicit preset buttons/dropdown. |
| Deep radio-setting automation (PROC/VOX/filter/data audio chain) | Missing in driver command set | True “ready-to-transmit digital” needs more than freq/mode/power. |
| Explicit validation checklist (audio interface, ALC discipline, CAT port role) | Missing | Prevents common field failures (wrong USB port, overdrive, wrong data path). |
| Band/mode selectors in On-Air Rig UI | Present in JS, commented out in HTML | The selector row is currently disabled in markup ([index.html](../public/index.html):1210). |

## Important Constraint: Driver Command Surface Is Narrow
Current Yaesu driver supports a compact command set only (freq/mode/PTT/meters/RF power/swap/power-off). See switch cases in [yaesu-ascii.js](../src/cat/drivers/yaesu-ascii.js):99.

Implication:
- Phase 1 can automate:
1. Dial frequency
2. Mode (`DATA-U`)
3. Power target
- Phase 1 cannot fully guarantee all digital-ready radio internals without adding commands.

## Proposed Widget: “Digital Setup” (inside On-Air Rig)

### UX
- Add a compact `Digital Setup` row in `widget-on-air-rig`:
1. `Mode Profile`: `FT8`, `FT4`, `FT2/Custom`
2. `Band`: `160m..6m`
3. `Power`: slider or preset chips (`10W`, `20W`, `30W`)
4. `Apply` button
5. `Verify` checklist (read-only guidance + pass/fail toggles)

### Behavior (Phase 1)
On `Apply`:
1. Resolve target dial frequency from profile + band table.
2. Send `setFrequency`.
3. Send `setMode` as `DATA-U`.
4. Send optional `setRFPower` (if capability present).
5. Show completion state + warning list.

### Suggested Frequency Source Strategy
- Seed FT8 defaults from WSJT conventional frequencies.
- Seed FT4 defaults from current contest sub-band guidance plus user-editable overrides.
- Persist both tables in local config so operators can customize regional practice.

## Implementation Plan (Claude-Ready)

### Phase 1 (Low Risk, High Value)
1. Add digital profile model + persistence in `state.js`.
2. Add UI controls in `public/index.html` under On-Air Rig widget.
3. Add handlers in `on-air-rig.js` to call existing `sendRigCommand` operations.
4. Reuse capability checks (`rf_power`) already in rig state.
5. Add non-blocking verification checklist panel.

Estimated effort: `M` (about 1-2 focused implementation sessions).

### Phase 2 (Fuller Automation)
1. Expand Yaesu CAT driver command support for additional digital-prep controls (where commandable).
2. Add readback parsing for those settings.
3. Extend checklist to auto-verify configured values.

Estimated effort: `M-L` depending on CAT manual coverage and per-rig variance.

### Phase 3 (Cross-Tooling Integration)
1. Tie into future WSJT-X UDP integration lane for tighter operating sync.
2. Optionally auto-track active WSJT frequency offsets.

Estimated effort: `M` (depends on P4.1 sequencing).

## Risks
1. **“FT2” ambiguity**: no standard WSJT mode named FT2 in primary docs; must define expected behavior.
2. **Model variance**: Yaesu family command behavior differs by model/firmware.
3. **False confidence risk**: UI saying “configured” while front-panel/audio-chain settings remain manual.
4. **Operator safety/clean signal**: insufficient ALC/drive validation if only CAT level controls are applied.

## Acceptance Criteria
1. User can choose FT4/FT8/custom digital profile and band, click `Apply`, and rig changes to expected dial/mode/power.
2. Presets are persisted and editable.
3. Feature is capability-driven and degrades gracefully on rigs lacking `rf_power`.
4. Widget surfaces explicit warnings for non-automated settings.
5. Existing spot click-to-tune behavior remains unchanged.

## Recommendation
Ship Phase 1 now as a “Digital Setup Assistant” (not “fully automatic setup”), then evolve to full automation after CAT expansion. This gives immediate value with low regression risk and aligns with HamTab’s existing architecture.

## Sources
### Codebase
- `src/cat/drivers/yaesu-ascii.js:99` — Current Yaesu command coverage.
- `src/cat/profiles/band-auto-profile.js:9` — FT4/FT8 mapped to `DATA-U`.
- `src/on-air-rig.js:54` — Existing FT8 frequency presets in widget logic.
- `src/on-air-rig.js:164` — Band button sends `setFrequency` + `setMode`.
- `src/spot-detail.js:265` — Spot tune flow sends CAT frequency/mode.
- `public/index.html:1210` — Band/mode selector row currently commented out.
- `src/cat/connection-orchestrator.js:59` — Central rig connection entrypoint.

### Project references
- `hamtab-planning/reference/ftdx10-cat-protocol.md:74` — `DATA-USB` mode code `C` note for FT8/WSJT-X.
- `hamtab-planning/reference/ftdx10-cat-protocol.md:170` — Digital-mode gotcha guidance.

### External
- WSJT-X User Guide 2.7.0 (modes/frequencies workflow): https://wsjt.sourceforge.io/wsjtx-doc/wsjtx-main-2.7.0.pdf
- FT8 Quick Start (conventional FT8 dial frequencies): https://wsjt.sourceforge.io/FT8_Operating_Tips_for_Beginners.pdf
- ARRL Digital Contest (current FT4/FT8 recommended sub-bands, US contest context): https://www.arrl.org/arrl-digital-contest
