# Research: ADIF Log Integration for HamTab

> **Purpose:** Research prompt for Codex. Findings go to `planning/codex/adif-integration-findings.md`.

## Context

HamTab is an amateur radio dashboard (Node.js/Express backend, vanilla JS frontend). It currently has no logging integration — operators use external loggers (LOTW, QRZ Logbook, Cloudlog, Log4OM, N1MM+). Adding ADIF import/display would let operators see their log alongside live spots, propagation, and map data without leaving HamTab.

HamTab has two deployment modes: **lanmode** (self-hosted on LAN, stateless, no database) and **hostedmode** (hamtab.net via Cloudflare Containers, Cloudflare Access auth, Workers KV for settings). Both must be supported. The server is stateless — no database, no sessions. All persistent user state lives in `localStorage` with `hamtab_` prefix.

## Research Questions

### 1. ADIF File Format Specification

- What is the current ADIF spec version? Where is the canonical spec hosted?
- Document the header format and field format (`<FIELD:LENGTH:TYPE>value`)
- What are the mandatory fields for a valid QSO record? (CALL, BAND, MODE, QSO_DATE, TIME_ON at minimum)
- What are the commonly used optional fields that HamTab should display? (RST_SENT, RST_RCVD, FREQ, GRIDSQUARE, MY_GRIDSQUARE, TX_PWR, NAME, QTH, COMMENT, NOTES, STATION_CALLSIGN, CONTEST_ID, SRX/STX for POTA/SOTA)
- What ADIF field types exist (S, N, D, T, E, M, L, etc.) and which need special parsing?
- How do ADI vs. ADX (XML) formats differ? Is ADX worth supporting or is ADI sufficient?
- What is the `<EOH>` / `<EOR>` structure?

### 2. Existing JavaScript ADIF Parsers

Survey available JS/Node ADIF libraries:
- **npm packages:** Search for `adif`, `adif-parser`, `adif-reader`, etc. For each: last updated, download count, API surface, ADI+ADX support, license, bundle size.
- **GitHub projects:** Any standalone ADIF parser repos in JS/TS that aren't on npm?
- **Quality assessment:** Do any handle edge cases well? (multi-value fields, application-defined fields `APP_*`, UTF-8 in names/comments, malformed files from different loggers)
- **Recommendation:** Use an existing parser, fork one, or write a lightweight one from scratch? HamTab only needs read support (import), not write (export) — at least initially.

### 3. Integration Patterns in Other Tools

How do these tools handle ADIF log display and integration?
- **Cloudlog** — web-based, PHP/MySQL. How does it import ADIF? What does its log view look like?
- **QRZ Logbook** — web-based. Does it have an API for fetching logs? (QRZ XML Subscription API?)
- **LOTW (Logbook of the World)** — ARRL's system. Can you query LOTW data via API, or is it download-only?
- **GridTracker** — consumes ADIF from WSJT-X. How does it display QSO history on a map?
- **Log4OM / N1MM+** — desktop loggers. Do they expose any HTTP/UDP APIs for live log access?

For each: document the integration method (file import, API, real-time feed) and any authentication requirements.

### 4. Client-Side ADIF Viewer Design

Given HamTab's constraints (no database, localStorage-based state, vanilla JS frontend):
- How large are typical ADIF files? (100 QSOs? 10,000? 100,000?) What's the performance ceiling for parsing and storing in localStorage vs IndexedDB?
- What would a log widget look like? (sortable table with columns: Date, Time, Call, Band, Mode, RST S/R, Freq, Grid)
- How should QSOs map to the existing Leaflet map? (plot QSOs as markers with popup details, color by band/mode)
- Should HamTab support live ADIF tail (watching a file for new appended records)? Is this feasible in lanmode via the server watching a file path?
- What's the best UX for import? (drag-and-drop file, file picker, paste URL, or configure a file path in lanmode?)

### 5. QRZ/LOTW API Integration (Optional Enhancement)

- **QRZ XML API:** What does the subscription API offer? Can you query a callsign's logbook? Authentication method? Rate limits? Is a paid subscription required?
- **LOTW Query API:** Does ARRL expose any API, or is it strictly certificate-based upload/download? Can a third-party app fetch a user's LOTW confirmations?
- **Club Log API:** Does Club Log have a public API for log queries or DXCC status?
- **Recommendation:** Which of these APIs (if any) are practical for HamTab to integrate without requiring users to share credentials?

## Output Format

Deliver findings as `planning/codex/adif-integration-findings.md` with:
- Section per research question
- Concrete recommendations (not just options)
- Code snippets where helpful (parser examples, API call examples)
- A "Recommended Implementation Path" section at the end with a phased approach
