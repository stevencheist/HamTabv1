# ADIF Integration Findings — Research

> **For:** Claude (via Francisco)
> **From:** Codex
> **Date:** 2026-03-01
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE-v3

## Summary
ADIF 3.1.6 is the current published ADIF spec, and ADI remains the mandatory interoperability format (ADX is optional and less commonly used in ham logging workflows). For HamTab, ADI-only import is the fastest path with high ecosystem compatibility. On parser choice, `adif-parser-ts` is the best fit for a browser+Node codebase (small package, active releases, no dependencies), while `tcadif` is a richer but heavier alternative. Given HamTab’s stateless server and local browser storage model, imported QSO data should be persisted in IndexedDB (not `localStorage`) with localStorage used only for lightweight config/index metadata.

## 1. ADIF File Format Specification

### Current spec and canonical source
- Current release: **ADIF 3.1.6** (released/updated 2025-09-15).
- Canonical spec host: `adif.org` (redirect `https://adif.org/adif` points to latest release).

### ADI header/record structure
- ADI uses `<FIELD:LENGTH:TYPE>value` data specifiers.
- Header ends with `<EOH>` (case-insensitive).
- Each QSO record ends with `<EOR>`.
- ADI file: optional header + one or more records.

### Minimum QSO fields
The ADIF spec intentionally does not hard-require a minimum set, but gives a common minimum recommendation:
- `QSO_DATE`
- `TIME_ON`
- `CALL`
- `MODE`
- `BAND` and/or `FREQ`

### High-value optional fields for HamTab display
Recommended display columns/additional popup fields:
- Signal reports: `RST_SENT`, `RST_RCVD`
- Frequency/context: `FREQ`, `BAND`, `MODE`, `SUBMODE`
- Geography: `GRIDSQUARE`, `MY_GRIDSQUARE`, `COUNTRY`, `DXCC`
- Station/contact details: `NAME`, `QTH`, `STATION_CALLSIGN`, `OPERATOR`
- Notes/meta: `COMMENT`, `NOTES`, `PROP_MODE`, `SAT_NAME`, `SAT_MODE`
- Power/time: `TX_PWR`, `TIME_OFF`, `QSO_DATE_OFF`
- Contest/parks/summits workflows: `CONTEST_ID`, `SRX`, `STX`, plus pass-through `APP_*` fields

### ADIF data types (practical parsing impact)
ADIF defines multiple data types including String-like, numeric, date/time, enum, grid/location variants.
Practical handling for HamTab import:
- Parse as strings first; normalize selected fields (`QSO_DATE`, `TIME_ON`, `FREQ`, numeric signal/power).
- Preserve unknown/user/app-defined fields (`APP_*`, `USERDEF`) for forward compatibility.
- Treat enum values as case-insensitive on ingest.

### ADI vs ADX
- **ADI**: text/tag format; required for compliant applications to import/export; dominant in practice.
- **ADX**: XML representation sharing same fields/types; useful for strict XML tooling but less common in end-user exchange.
- **Recommendation**: ship ADI import first, defer ADX to later phase.

## 2. Existing JavaScript ADIF Parsers

### Library survey
| Library | Status | Strengths | Weaknesses | Recommendation |
|---|---|---|---|---|
| `adif-parser-ts` | Active (recent publishes), TS-first, no deps, Apache-2.0 | Lightweight, browser-friendly, simple parse API | Primarily ADI-focused | **Primary choice** |
| `tcadif` | Maintained, Node-focused, MIT | Parse+write, stream reader/writer, robust ADIF model | Bigger package footprint, more than needed for read-only | Good fallback for server-side heavy jobs |
| `adifserializer` | Very old | Historic ADIF serializer/deserializer | Stale; low confidence for modern edge cases | Do not adopt |

### Edge-case handling requirements
Regardless of parser, enforce these in HamTab integration tests:
- Mixed-case field names and type tags
- Duplicate field instances in a record (deterministic last-wins policy)
- Unknown `APP_*` fields (preserve in raw map)
- UTF-8 name/comment payloads
- Malformed record recovery (skip bad record, keep import job alive)

### Recommendation
Use `adif-parser-ts` for both browser and Node workflows unless profiling shows unacceptable throughput on very large logs (>100k QSOs). If needed later, move heavy parse to worker thread/server endpoint while keeping the same normalized QSO schema.

## 3. Integration Patterns in Other Tools

### Cloudlog
- Supports manual ADIF import workflows.
- Also offers API ingestion endpoint that accepts ADIF QSO strings (`/api/qso` with `type:"adif"`).
- Pattern: batch ingest + duplicate checks + station profile scoping.

### QRZ
- XML Logbook Data subscription is paid and includes upload/download interactions.
- QRZ also documents a Logbook REST API for programmatic log interaction.
- Auth/subscription requirements are material for HamTab UX and support burden.

### LoTW
- Operational model is certificate/TQSL-centric upload and account-based web retrieval.
- No broadly documented, open public REST flow equivalent to typical JSON APIs.
- Practical integration path is generally via ADIF/TQSL export-import workflows rather than direct API polling.

### GridTracker
- Widely ADIF-centric ecosystem behavior (ADIF loading and WSJT-X integration patterns).
- Strong precedent for “local log + map visualization” model relevant to HamTab widget design.

### Log4OM / N1MM+
- Emphasize UDP or app integration for real-time logging data exchange.
- Best seen as optional future live-ingest paths; ADIF import remains lowest-friction baseline.

## 4. Client-Side ADIF Viewer Design for HamTab

### Size/performance and storage
- Browser Web Storage (`localStorage`) is typically limited (~5 MiB local + ~5 MiB session per origin); not suitable for large logs.
- IndexedDB is appropriate for large QSO datasets and non-blocking operations.
- Practical expectation from Club Log scale data points: many users quickly reach multi-thousand QSO logs; design for 100k record capability.

### Proposed widget
- New “Logbook” widget with:
  - Sortable/virtualized table columns: Date, Time, Call, Band, Mode, RST S/R, Freq, Grid, Source
  - Filters: band/mode/date range/callsign prefix
  - Quick stats bar: total QSOs, distinct DXCC, last imported date

### Map integration
- Optional overlay layer for imported QSOs (off by default at first open).
- Marker simplification:
  - Primary mode: contacted station grid centroid marker
  - Optional path lines from `myGrid -> dxGrid`
- Use existing color-by-band patterns already present in HamTab map rendering logic.

### Live ADIF tail
- Feasible only in lanmode, but complexity/portability is high (filesystem watch semantics differ by OS).
- Better first step: periodic re-import from selected ADIF file via explicit user action + “re-import changed records only” checksum index.

### Import UX
- Phase 1:
  - drag/drop `.adi` file
  - file picker
- Phase 2:
  - lanmode path-based watcher (opt-in)
  - optional URL fetch for remote ADIF where CORS/auth permit

## 5. QRZ / LoTW / Club Log API Practicality

### QRZ
- Practical but subscription-gated; should be optional advanced integration.
- Requires explicit credential handling UX and clear warning language.

### LoTW
- Treat as file/certificate workflow integration, not near-term live API integration.

### Club Log
- API key required for software integration; request-based approval model.
- Reasonable future enhancement after ADIF import baseline ships.

### Recommendation
Prioritize **local ADIF import** first. Add QRZ/Club Log integrations only after the Logbook widget stabilizes and only as optional provider adapters.

## Recommended Implementation Path

### Phase 1 (MVP, 1 sprint)
1. Add ADI import pipeline (client-side) using `adif-parser-ts`.
2. Normalize fields into `HamTabLogQso` schema.
3. Persist records in IndexedDB; store import metadata in localStorage.
4. Ship basic Logbook widget table + sort/filter + export selected rows as JSON/CSV.

### Phase 2 (MVP+, 1 sprint)
1. Map overlay for imported QSOs (marker clustering + band colors).
2. Duplicate detection (`CALL+QSO_DATE+TIME_ON+BAND/MODE` fingerprint).
3. Incremental import mode (skip already-seen fingerprints).

### Phase 3 (optional integrations)
1. Lanmode file watcher (opt-in, guarded behind config).
2. QRZ/Club Log adapter prototypes (credentialed, disabled by default).
3. ADX support only if a real user source requires it.

## HamTab Codebase Constraints and Fit
- State is heavily browser-storage centric: `/home/fpeebles/coding/HamTabV1/src/state.js:14` and many `hamtab_*` keys.
- Live spots are currently polling-based (not SSE): `/home/fpeebles/coding/HamTabV1/src/live-spots.js:62`.
- Existing source model already supports per-source datasets/tables, suitable for adding a `logbook` source/widget path: `/home/fpeebles/coding/HamTabV1/src/state.js:77`.
- Security doc explicitly emphasizes client-side storage model: `/home/fpeebles/coding/HamTabV1/SECURITY.md:39`.

## Sources

### External
- ADIF spec 3.1.6: https://adif.org/316/ADIF_316.htm
- ADIF index/latest pointer: https://www.adif.org/
- `tcadif` npm page: https://www.npmjs.com/package/tcadif
- `adif-parser-ts` npm summary: https://www.npmjs.com/package/adif-parser-ts
- Cloudlog API wiki (`/api/qso` ADIF ingest): https://github-wiki-see.page/m/magicbug/Cloudlog/wiki/API
- Cloudlog WSJT-X/ADIF integration wiki: https://github-wiki-see.page/m/magicbug/Cloudlog/wiki/WSJT-X-Integration
- QRZ XML data service: https://www.qrz.com/page/xml_data.html
- QRZ Logbook API guide: https://www.qrz.com/docs/logbook/QRZLogbookAPI.html
- LoTW overview: https://www.arrl.org/logbook-of-the-world
- Club Log API key policy: https://clublog.org/need_api.php
- Club Log scale stats (average log size indicator): https://clublog.org/about
- MDN storage quotas: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

### Repo references
- `/home/fpeebles/coding/HamTabV1/src/state.js:14`
- `/home/fpeebles/coding/HamTabV1/src/state.js:77`
- `/home/fpeebles/coding/HamTabV1/src/live-spots.js:62`
- `/home/fpeebles/coding/HamTabV1/SECURITY.md:39`
