# Research Tracker

Track research lifecycle: from Codex completion -> Claude consumption -> implementation.

**Status values:** `new` | `reviewing` | `planned` | `in-progress` | `done` | `blocked` | `wont-do`

**Rules:**
- **Codex:** Register research here when completed — include date and time (UTC)
- **Claude:** Update status when research is consumed, planned, or implemented
- **Do NOT mark `done`** if any phases have remaining work — mark individual phases

---

<!-- Add entries below. Most recent first. -->

## CODEX-102 — HamTab Planned Security Hardening
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Require token-based protection and CSRF defenses for config/admin write paths. | new | | |
| 2 | Add redacted audit logging and tighter endpoint-level rate limiting for admin surfaces. | new | | |

## CODEX-101 — HamTab Planned CI/CD
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Add bounded retry/backoff around transient Cloudflare deploy failures without broad CI redesign. | new | | |

## CODEX-100 — HamTab Planned Platform And Architecture
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Decompose `server.js` into routers/services before more features land on the monolith. | new | | |
| 2 | Add explicit client-state schema versioning, migrations, and subsystem-safe reset behavior. | new | | |

## CODEX-099 — HamTab Planned Performance And Rendering
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Replace full clear/rebuild render paths with diff/patch on map and logbook overlays. | new | | |
| 2 | Add table virtualization and off-main-thread heatmap work where it provides the biggest UX win. | new | | |

## CODEX-098 — HamTab Planned UI/UX
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Add named layout profiles, config portability, and alert ergonomics before deeper customization work. | new | | |
| 2 | Complete accessibility/readability improvements and defer theme/i18n expansion until later. | new | | |

## CODEX-097 — HamTab Planned Hardware Integration
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Close the loop from spots to rig with safe click-to-tune. | new | | |
| 2 | Add bridge adapters and larger panadapter work only after the existing CAT foundation is leveraged. | new | | |

## CODEX-096 — HamTab Planned Map And Visualization
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Prioritize operator-centric overlays/projections before novelty overlays. | new | | |
| 2 | Keep rendering cost bounded while adding specialty map layers. | new | | |

## CODEX-095 — HamTab Planned Data And Propagation
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Build centralized scheduling and low-latency feed plumbing before adding more data-plane widgets. | new | | |
| 2 | Layer scoring/comparison widgets on top of normalized existing data. | new | | |

## CODEX-094 — HamTab Next Up WSJT-X And Logger UDP
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Add lanmode-only WSJT-X UDP ingest and decode/status surfaces first. | new | | |
| 2 | Add logged-QSO and logger adapter support after the narrow MVP is stable. | new | | |

## CODEX-093 — HamTab Next Up DX Cluster Live TCP + RBN
- **Research completed:** 2026-03-14 00:49 UTC
- **Consumed:**
- **Overall status:** new

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Build lanmode-first TCP ingest and browser bridge for DX cluster spots. | new | | |
| 2 | Extend the same streaming ingest architecture to RBN with hostedmode fallback behavior. | new | | |
