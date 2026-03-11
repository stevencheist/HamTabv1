# Research Tracker

Track research lifecycle: from Codex completion → Claude consumption → implementation.

**Status values:** `new` | `reviewing` | `planned` | `in-progress` | `done` | `blocked` | `wont-do`

**Rules:**
- **Codex:** Register research here when completed — include date and time (UTC)
- **Claude:** Update status when research is consumed, planned, or implemented
- **Do NOT mark `done`** if any phases have remaining work — mark individual phases

---

## CODEX-010 — Audio FFT Scope (Web Audio capture for real-time panadapter)
- **Research completed:** 2026-03-03
- **Consumed:** 2026-03-10
- **Overall status:** planned

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| MVP | AnalyserNode capture, scope-audio-data-source.js, device picker UI | planned | | 5-7 dev days est. |
| 2 | Mode-aware RF frequency mapping (AF→RF labels) | planned | | Depends on MVP |

---

## CODEX-012 — Online SDR Integration (KiwiSDR/OpenWebRX as RX-only rig)
- **Research completed:** 2026-03-04
- **Consumed:** 2026-03-10
- **Overall status:** in-progress

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| Transport | KiwiSDR WebSocket transport + driver | done | v0.67.x | kiwisdr-socket.js + kiwisdr-ws.js exist |
| Hostedmode | WS proxy for mixed-content (see CODEX-015) | blocked | | Blocked on WS proxy implementation |
| OpenWebRX | Secondary SDR platform support | planned | | Lower priority |
| Discovery | ReceiverBook server discovery UI | planned | | |

---

## CODEX-013 — TCI Protocol for On-Air Rig
- **Research completed:** 2026-03-04
- **Consumed:** 2026-03-10
- **Overall status:** planned

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| Transport | TCIWebSocketTransport implementation | planned | | 0.75-1.25 phases est. |
| Config UI | WebSocket URL field + profile selector | planned | | |
| Security | Localhost defaults, mixed-content handling | planned | | HTTPS→ws:// is a blocker |

---

## CODEX-014 — Visual Accessibility Appearance Mode
- **Research completed:** 2026-03-04
- **Consumed:** 2026-03-10
- **Overall status:** planned

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| A (MVP) | Text scale presets, high-contrast toggle, focus indicators | planned | | 3-5 dev days. a11y.js + themes.js exist as foundation |
| B | Non-color semantic cues (text labels, icons for status) | planned | | |
| C | Color-vision presets (deuteranopia/protanopia/tritanopia) | planned | | Needs CSS tokenization (~50 hex colors) |
| D | OS preference listeners (prefers-contrast, forced-colors) | planned | | |

---

## CODEX-015 — Hostedmode KiwiSDR WebSocket Proxy Security
- **Research completed:** 2026-03-04
- **Consumed:** 2026-03-10
- **Overall status:** planned

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Container-side WS relay at /api/sdr/proxy with SSRF controls | planned | | SSRF primitives exist in server.js. Blocks CODEX-012 hostedmode phase |

---

## CODEX-028 — Digital-Mode Setup Widget (FT2/FT4/FT8)
- **Research completed:** 2026-03-08
- **Consumed:** 2026-03-10
- **Overall status:** in-progress

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 (MVP) | Digital Setup Assistant UI — freq, mode, power, snapshot/restore | done | v0.66.0–v0.68.0 (2c2738b, dbc9e71) | Full FT8/FT4 with per-band frequencies |
| 2 | Expanded Yaesu CAT commands (processor, VOX, filter, data-audio) | planned | | Needs driver command surface expansion |
| 3 | WSJT-X UDP integration | planned | | |

---

## CODEX-029 — CAT Diagnostics & Settings-Inspection Tool
- **Research completed:** 2026-03-08
- **Consumed:** 2026-03-10
- **Overall status:** planned

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 (MVP) | Read-only trace bus + radio snapshot JSON + structured export | planned | | Foundational for Phase 2 and AI debugging |
| 2 | Guided config writes with verify-after-write and rollback | planned | | Needs command coverage expansion |
| 3 | Import/export profile templates (programming workflows) | planned | | |

---

## CODEX-030 — PSKReporter Timeout/Lockout Mitigation
- **Research completed:** 2026-03-08
- **Consumed:** 2026-03-10
- **Overall status:** in-progress

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 0 | Bug fixes: callsign scope, remove _t cache-buster, Worker key normalization | done | v0.66.7 (ea8009d, 9a8a204) | All 3 fixes shipped Mar 8 |
| 1 | Rate stability: split budgets, circuit-breaker, jitter | done | v0.68.5 (1013d8e) | Split token buckets, CB with 60s cooldown, ±30s jitter, _t removal for PSK/WSPR |
| 2 | Adaptive retrieval: query sizing + TX-triggered refresh | new | | Needs CAT/PTT telemetry |

---

## CODEX-031 — Manual Downloads (Yaesu FT-DX10/FT-991A)
- **Research completed:** 2026-03-08
- **Consumed:** 2026-03-10
- **Overall status:** done

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Download Yaesu English manuals + build inventory | done | research/manuals/ | FT-DX10 + FT-991A ready. Other models need manual re-fetch |

---

## CODEX-032 — Manuals-to-JSON Pipeline Spec
- **Research completed:** 2026-03-08
- **Consumed:** 2026-03-10
- **Overall status:** planned

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 0 | Organize manuals, create manifest | planned | | Low effort |
| 1 | Raw extraction layer (pdfplumber + PyMuPDF) with schema | planned | | pdf-to-json repo has Layer 1 working |
| 2 | Yaesu vendor parser | planned | | Grammar detection, menu parsing |
| 3 | Normalize to radio_knowledge.json | planned | | Vendor terminology mapping |
| 4 | Validation & QA (schema tests, golden-file tests) | planned | | |

---

## CODEX-033 — Docs/Help/Popup Parity Audit
- **Research completed:** 2026-03-08
- **Consumed:** 2026-03-10
- **Overall status:** in-progress

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| H1 | Fix hosted-mode sync wording | done | | Docs updated — minor README drift remains |
| H2 | Fix export/import terminology contradictions | done | | Terminology consistent across docs |
| H3 | Add missing On-Air Rig docs | done | | User guide sections added |
| M1 | Normalize Settings vs Config terminology | done | v0.68.4 (9e15caa) | Fixed in new-widget popup |
| M2 | Update README header-controls section | done | v0.68.4 (9e15caa) | Removed stale entries, added current ones |
| M3 | Fix positional inaccuracies in config chapter | done | v0.68.4 (9e15caa) | "top-left" → "header bar" |
| L1 | Complete popup/modal documentation | new | | 14 popups, partial coverage |
| L2 | Fix widget visibility list drift | done | v0.68.4 (9e15caa) | Updated to all 20 widgets |

---

## CODEX-036 — Code Comment Quality Audit
- **Research completed:** 2026-03-09
- **Consumed:** 2026-03-10
- **Overall status:** done

| Phase | Description | Status | Implemented In | Notes |
|-------|-------------|--------|---------------|-------|
| 1 | Fix CW default-frequency comment | done | | Comment now accurate |
| 2 | Clarify WebSerial reader.cancel() comments | done | | Comments work together correctly |
| 3 | Remove "temporarily re-enabled" scope testing comments | done | v0.68.4 (9e15caa) | On-Air Rig is production (shipped v0.60.0) — comments removed |
| 4 | Remove orphaned update.js comment | done | | Historical note, not actually orphaned |
