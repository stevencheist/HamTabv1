# HamTab Code Comment Quality Audit — Research Review

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-09
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Summary

This audit reviewed comment quality in HamTab source/server files with emphasis on correctness, maintainability, and debugging value. The codebase is generally well-commented and has strong sectioning, but there are a few high-impact drift points where comments are now misleading or too ambiguous.

## Findings (Ordered by Severity)

### 1. Comment-to-code mismatch in CW default-frequency logic
- **Severity:** High
- **File:** `src/on-air-rig.js:130`
- **Issue:** The comment says "CW zone midpoint, offset +25kHz into the zone" but the implementation returns `cwZone.min + 25_000` (not midpoint).
- **Risk:** Misleads future maintainers during tuning/logic changes and could cause incorrect assumptions during band plan debugging.
- **Recommendation:** Rewrite comment to match behavior ("offset from lower edge") or change code to midpoint if that is the intended behavior.

### 2. WebSerial reader guidance is internally ambiguous
- **Severity:** Medium
- **Files:** `src/cat/transports/web-serial.js:123`, `src/cat/transports/web-serial.js:141`
- **Issue:** A strong warning says "Do NOT call reader.cancel() here" (in `finally`), but `_stopReadLoop()` does call `await this._reader.cancel()`.
- **Risk:** Correct behavior may be context-sensitive, but the current comments can be misread as contradictory, increasing regression risk in CAT transport fixes.
- **Recommendation:** Add explicit context notes: cancel is prohibited in read-loop `finally`, but intentionally used in explicit shutdown path to unblock pending reads.

### 3. Stale "temporary" comments are duplicated in two hot paths
- **Severity:** Medium
- **Files:** `src/main.js:122`, `src/constants.js:23`
- **Issue:** Both lines say On-Air Rig is "temporarily re-enabled for scope testing." This appears to describe a short-term state but has persisted in core widget registration.
- **Risk:** Creates uncertainty about whether this widget is experimental, feature-flagged, or production-default.
- **Recommendation:** Replace with explicit status language (e.g., "production-enabled" or "guarded by feature flag X") and remove "temporary" wording unless an actual removal date/issue link exists.

### 4. Orphaned comment with no adjacent logic
- **Severity:** Low
- **File:** `src/update.js:23`
- **Issue:** "Platform label removed from header..." sits as a standalone comment after runtime update-label logic, with no direct code branch tied to it.
- **Risk:** Low, but it degrades local readability and feels like a migrated note that should live in changelog/docs.
- **Recommendation:** Remove it, or move it to release notes/docs if historical context is still needed.

## Quality Observations

- Source/server code has strong intentional section comments and many useful operational notes (`server.js`, `voacap-bridge.js`, CAT transport files).
- Very few unresolved maintenance markers (`TODO`, `FIXME`, `HACK`) were found in primary source files.
- Comment volume is high in generated bundle output (`public/app.js`), which should be excluded from comment-quality audits to avoid noise.

## Recommended Comment Standard (HamTab)

1. **Behavior-first comments**
- Describe what is true now, not what used to be true.
- If temporary, include an owner + condition to remove.

2. **Context-bound safety comments**
- For hazardous APIs (WebSerial, timers, stream locks), specify where the warning applies and where exceptions are intentional.

3. **No orphan historical notes in runtime code**
- Move release-history notes to changelog/docs.

4. **Audit generated files separately**
- Exclude `public/app.js` from source comment review checks.

## Suggested Follow-up Tasks (Claude)

1. Fix the CW default comment/code mismatch in `src/on-air-rig.js`.
2. Clarify WebSerial cancel/releaseLock semantics with paired comments in both code paths.
3. Resolve "temporarily re-enabled" wording in `src/main.js` and `src/constants.js`.
4. Remove or relocate the orphaned comment in `src/update.js`.
5. Add a lightweight lint/checklist rule: no "temporary" comments without issue reference.

## Sources

- `src/on-air-rig.js:130`
- `src/on-air-rig.js:131`
- `src/cat/transports/web-serial.js:123`
- `src/cat/transports/web-serial.js:141`
- `src/main.js:122`
- `src/constants.js:23`
- `src/update.js:23`
- `server.js` (comment style baseline)
- `voacap-bridge.js` (comment style baseline)
