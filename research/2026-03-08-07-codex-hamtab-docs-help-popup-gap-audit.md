# HamTab Documentation + Widget Help + Popup Gap Audit — Research / Analysis

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-08
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Original Premise

> "use our research protocol to look at all the documentation for hamtab including widget help and popups.  Identifiy any gaps, improvments that we could make."

## Summary

The in-app widget help system is largely complete and wired correctly, but external docs have drifted in several places from current UI behavior. Highest-impact issues are in deployment/config semantics (hosted sync wording), export/import behavior, and missing documentation for newer On-Air Rig flows (Digital Setup, Radio Profiles, CAT Diagnostics). Popup coverage is inconsistent: several operational modals exist in the UI but are not documented in the user guide. Recommendation is to treat docs/help as a versioned surface with a single-source inventory and automated drift checks.

## Scope Reviewed

- `README.md`
- `docs/user-guide/content/*.md`
- `src/help.js`
- `src/constants.js` (`WIDGET_HELP`)
- `public/index.html` (widget help buttons + popup/modal markup)

## What Is Working Well

- Help wiring is centralized and robust (`.widget-help-btn` listeners, modal render, escape/overlay close): `src/help.js:55-83`.
- Widget help coverage matches all current help buttons in markup (no missing key for any `data-widget` button).
  - Buttons: `public/index.html:757,816,850,872,895,914,944,958,970,982,994,1010,1021,1043,1054,1068,1091,1121,1133,1162`
  - Help entries: `src/constants.js:301-592`
- Reference sub-tab help is intentionally supported via namespaced keys (`widget-rst:*`): `src/help.js:13-16`, `src/constants.js:420-457`.

## Findings (By Severity)

### High

| ID | Gap | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| H1 | Hosted-mode sync model is outdated/misleading in user guide | `docs/user-guide/content/01-introduction.md:49-54` says "Settings sync across devices via Cloudflare Access login"; current UI presents config code export/import and optional LAN sync (`public/index.html:617-649`) | Users may expect account-based cloud sync that is not represented in current UI flows | Rewrite hosted-mode section to describe actual current behavior and separate it from LAN sync semantics |
| H2 | Export/import behavior mismatch in Getting Started | `docs/user-guide/content/02-getting-started.md:73-76` says export downloads JSON file containing API keys; actual UI uses text code (`public/index.html:625-634`), and config guide states API keys are not included (`docs/user-guide/content/07-configuration.md:248`) | Users can fail migration and mishandle secrets | Align all docs to one canonical export/import model and one canonical sensitive-data statement |
| H3 | On-Air Rig docs missing new operator-critical capabilities | UI contains Digital Setup, Restore, Radio Profiles, CAT Diagnostics + debug export (`public/index.html:1222-1265,1267-1287,1309,1318-1335`), but widgets doc ends without these sections (`docs/user-guide/content/03-widgets.md` ends at `:777`) | New rig-control features are undiscoverable; support burden rises | Add dedicated user-guide sections for Digital Setup workflow, profile save/load semantics, and CAT diagnostics/debug bundle usage |

### Medium

| ID | Gap | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| M1 | Terminology drift: "Settings" vs "Config" | New-widget popup says "Settings → Widgets" (`public/index.html:1520`) while product uses Config button and Config tabs (`public/index.html:734`, `129-137`) | Confuses navigation, especially new users | Normalize all user-facing copy to "Config" (or rename globally with intent) |
| M2 | README header-controls section is stale | README lists controls like countdown/auto-refresh/reset-layout/mode badge (`README.md:825-837`) not reflected in current header markup (`public/index.html:725-739`) | README becomes untrusted as setup reference | Refresh README control table from current `index.html` IDs/classes |
| M3 | Config chapter has directional/UI inaccuracies | Example: "Click Config in top-left" (`docs/user-guide/content/07-configuration.md:83`) but button is on right side header (`public/index.html:734`) | Small but recurring friction | Run full copy pass for position/label accuracy and remove positional assumptions where possible |

### Low

| ID | Gap | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| L1 | Popup/modal documentation coverage is incomplete | Popups present for weather alerts/help/feedback/new widgets/big clock/CAT diagnostics and multiple config overlays (`public/index.html:1319-1523`) but user guide coverage is partial (feedback + general help only in spots like `docs/user-guide/content/07-configuration.md:323`, `09-troubleshooting.md:281-304`) | Feature discoverability and self-service troubleshooting are weaker | Add a "Popups & Overlays" guide section with trigger + purpose + actions |
| L2 | Widget visibility list likely drifts with hidden/experimental widgets | Config doc list omits On-Air Rig (`docs/user-guide/content/07-configuration.md:123-140`) while widget exists (currently hidden by style): `public/index.html:1160` and declared in widget registry `src/constants.js:23` | Ambiguity around feature availability/stability | Explicitly mark feature states: `stable`, `optional`, `experimental/hidden` in docs |

## Popup Inventory (Current UI)

| Popup / Modal | ID | Primary Purpose | Documented in user guide? |
|---|---|---|---|
| Main Config | `splash` | Global settings | Yes (partial/drift) |
| Solar fields | `solarCfgSplash` | Field visibility | Partial |
| Lunar fields | `lunarCfgSplash` | Field visibility | Partial |
| Spot columns | `spotColCfgSplash` | Table columns | Partial |
| CAT Diagnostics | `rigDiagSplash` | Trace/counters/export bundle | No |
| Map overlays | `mapOverlayCfgSplash` | Overlay toggles | Partial |
| Live Spots config | `liveSpotsCfgSplash` | Count vs distance | Partial |
| Satellite config | `satCfgSplash` | API key + tracked sats + TLE age | Partial |
| Clock config | `clockCfgSplash` | Face + complications | Partial |
| Weather alerts | `wxAlertSplash` | Alert details | No |
| Widget help | `helpSplash` | Widget-level docs | Implicit only |
| Feedback | `feedbackSplash` | Feedback submission | Yes |
| Big clock overlay | `bigClockOverlay` | Large local/UTC clock | No |
| New widget notice | `newWidgetPopup` | Release discoverability | No |

Source: `public/index.html:673-696,1319-1523`

## Improvement Plan (Protocol-Aligned)

1. Create a docs source-of-truth matrix in `research/` (widgets, help keys, popup IDs, user-guide chapter anchors, README anchors).
2. Add a CI lint script that fails if:
- a `data-widget="..."` exists without `WIDGET_HELP` entry,
- a modal ID in `index.html` lacks an entry in a docs index file,
- key canonical strings (`Config`, export/import semantics) drift.
3. Split user guide additions into three focused chapters:
- `On-Air Rig Advanced` (Digital Setup, Profiles, CAT Diagnostics)
- `Popups & Overlays` (trigger + actions + troubleshooting)
- `Config Data Flows` (export/import, LAN sync, hosted expectations).
4. Normalize terminology and UX copy in UI + docs (`Config` vs `Settings`) and ensure popup text mirrors actual nav labels.
5. Add a release checklist item: "docs/help/popup parity reviewed" before tagging a version.

## Acceptance Criteria (For Follow-On Implementation)

- No contradictory statements for export/import or sync behavior across README + user guide + popup copy.
- Every popup/modal in `index.html` has a matching docs entry.
- On-Air Rig docs explicitly cover Digital Setup, Profiles, CAT diagnostics, and debug export.
- Terminology is consistent (`Config` or intentionally renamed globally).
- Automated drift check runs in CI and blocks regressions.

## Sources

### Local Code / Docs
- `/home/fpeebles/coding/HamTabV1/src/help.js:10-18` — help-key resolution and reference-tab special case.
- `/home/fpeebles/coding/HamTabV1/src/help.js:55-83` — widget help listener + close mechanics.
- `/home/fpeebles/coding/HamTabV1/src/constants.js:301-592` — canonical widget help entries.
- `/home/fpeebles/coding/HamTabV1/src/constants.js:564-587` — On-Air Rig and Logbook help content.
- `/home/fpeebles/coding/HamTabV1/src/constants.js:23-24` — widget registry includes On-Air Rig and Logbook.
- `/home/fpeebles/coding/HamTabV1/public/index.html:129-137` — config tab labels.
- `/home/fpeebles/coding/HamTabV1/public/index.html:617-649` — Data tab export/import + LAN sync UI.
- `/home/fpeebles/coding/HamTabV1/public/index.html:757-1162` — widget help buttons in markup.
- `/home/fpeebles/coding/HamTabV1/public/index.html:1222-1287` — Digital Setup + Radio Profiles UI.
- `/home/fpeebles/coding/HamTabV1/public/index.html:1319-1335` — CAT Diagnostics modal and debug export.
- `/home/fpeebles/coding/HamTabV1/public/index.html:1444-1523` — weather/help/feedback/new-widget popups and related copy.
- `/home/fpeebles/coding/HamTabV1/README.md:808-837` — stale header-control documentation.
- `/home/fpeebles/coding/HamTabV1/docs/user-guide/content/01-introduction.md:49-54` — hosted-mode sync wording.
- `/home/fpeebles/coding/HamTabV1/docs/user-guide/content/02-getting-started.md:73-76` — JSON file export statement.
- `/home/fpeebles/coding/HamTabV1/docs/user-guide/content/03-widgets.md:683-777` — On-Air Rig section ending before newer features.
- `/home/fpeebles/coding/HamTabV1/docs/user-guide/content/07-configuration.md:83-87` — top-left config wording.
- `/home/fpeebles/coding/HamTabV1/docs/user-guide/content/07-configuration.md:232-279` — export/import + LAN sync narrative.
