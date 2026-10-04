# Research Prompt: QSO Logging + ADIF (.adi) Export for HamTab

> **Date:** 2026-10-04
> **From:** Claude (Steve-claude pair)
> **To:** Codex (CODEX-SF372) and agy (AGY-SF003): **identical prompt, blind xval pair**
> **Repo:** `stevencheist/HamTabV1` (branch `main`, v0.70.4)
> **Analytic mode:** requirements discovery → convergent implementation plan

Don't read the other partner's output. Each deliverable has to stand on its own, and Claude merges them afterwards.

---

## The problem

HamTab can **import** an ADIF log and show it, but it can't **create** one. Operators want to log contacts inside HamTab and download a `.adi` file they can upload to POTA, LoTW, QRZ, Cloudlog, or a desktop logger. Research what this feature should be and produce a plan for building it.

## Background (already verified, so don't re-derive it)

- **Stack.** HamTab is a POTA/SOTA ham-radio dashboard: Node/Express backend with a stateless API proxy (no database, no sessions), a vanilla-JS frontend in `src/` bundled by esbuild into `public/app.js`, and Leaflet maps. User state lives in the browser.
- **Deployment modes.** There are two:
  - **lanmode** is self-hosted on Windows, Linux or Raspberry Pi.
  - **hostedmode** runs on hamtab.net (Cloudflare Worker + Container, with Workers KV for settings sync).
  - Shared code lives on `main`, and mode-specific storage lives on the branches. See `CLAUDE.md` § Branch Strategy and `BRANCH_STRATEGY.md`. That document already anticipates "ADIF upload: main = UI, branches = storage (file vs R2)".
- **Logbook today (`src/logbook.js`).**
  - `parseADIF()` (line 14) handles import only.
  - Records live in IndexedDB: database `hamtab_logbook`, store `qsos`, keyed by an auto-increment `id`, with indexes on `CALL` and `QSO_DATE` (lines 61–63).
  - **Importing wipes the store** before writing: `saveQSOs()` calls `store.clear()` at line 85.
  - The UI covers a sortable/filterable table and map markers with geodesic paths. There's no writer, no manual entry, and no edit or delete for a single QSO.
- **POTA Hunter (`src/pota-hunter.js`, flag `pota_hunter: 'test'`).** Its "Confirm QSO" button in DX Detail only marks a callsign as worked for 24 h (`hamtab_worked_list`, line 15) for a counter. It saves no contact record.
- **POTA self-spot (`src/pota-selfspot.js`, flag `pota_self_spot`).** It stores the activator's park in `hamtab_my_park` and posts spots via `POST /api/pota/spot`.
- **Live rig data.** On-Air Rig (`src/on-air-rig.js`) offers CAT over WebSerial/TCI, with the rig state store providing frequency and mode.
- **Related roadmap item.** "Next Up" includes WSJT-X/logger UDP integration (lanmode). It would *receive* QSOs logged elsewhere.
- **Feature gating.** New UI must be gated through `src/feature-flags.js` (dev → test → release).
- **Prior research.** `planning/codex/adif-integration-research.md` and `planning/codex/adif-integration-findings.md` covered import only and explicitly deferred export. You may build on them or disagree with them.

## Questions

1. **What must the exported file contain to be accepted where operators actually upload it?** Cover the current ADIF spec version and its required and recommended fields. Then cover the acceptance rules of each destination:
   - POTA (activator and hunter uploads, `MY_SIG`/`MY_SIG_INFO` and `SIG`/`SIG_INFO`, park-to-park, multi-park/n-fer, file-per-park/day conventions)
   - LoTW (TQSL signing)
   - QRZ Logbook
   - Cloudlog/Wavelog
   - eQSL
   - WWFF
   - SOTA (does it even take ADIF?)

   Identify where destinations conflict.
2. **How should logged QSOs be stored, given the current design?** Address:
   - imported versus created records coexisting, given that import wipes the store
   - dedupe rules
   - IndexedDB schema migration
   - edit and delete
   - protection against browser-storage data loss (backup, persistence API, export reminders)
   - whether lanmode and hostedmode should differ (local file, server, KV/R2) or stay browser-only
3. **What should logging look like for a HamTab user?** Consider:
   - prefill from the selected spot and from live rig frequency/mode
   - UTC time handling, and RST defaults per mode
   - activator versus hunter workflows, and quick-log versus full form
   - how "Confirm QSO" should relate to a real log entry

   Survey what comparable loggers do well and badly: the POTA app's logger, HAMRS, Ham2K Portable Logger (PoLo), Log4OM, N1MM+, WSJT-X's log, Cloudlog, QRZ Logbook, fast-log-entry tools, and anything newer.
4. **How should the writer itself be built?** Cover:
   - ADI syntax correctness (header, field length counting, character encoding/non-ASCII, `<EOR>`, enumerations, band/mode/submode mapping from frequency and CAT mode)
   - export scoping (by date, park or selection) and file naming
   - hand-rolled versus a library such as `tcadif`
   - round-trip testing against HamTab's own importer and against external validators
5. **Beyond downloading a file:** which direct-upload integrations are feasible from a browser or this server, and which are not? Cover the QRZ Logbook API, the Cloudlog/Wavelog API, LoTW/TQSL, and the POTA upload flow. Address credential handling and how this ties in with the WSJT-X UDP item.
6. **Plan.** Split the work into shippable slices with flags, sizes and tests. Which slice is the minimum that's useful on day one?

## Deliverable shape (stop rule)

Produce **exactly one markdown file of 200–350 lines** containing:

1. A 5-line **executive summary**, opening with your recommended day-one slice.
2. A **destination requirements matrix**: `| Field | ADIF spec | POTA | LoTW | QRZ | Cloudlog | eQSL | WWFF | HamTab source (spot / rig / settings / user) |`.
3. A **recommended design**: storage model, entry UX and writer, with `file:line` references to the code it touches.
4. **Exactly 4–6 implementation slices** in the form `| Slice | Scope | Feature flag | Size (XS–XL) | Branch (main / lanmode / hostedmode) | Tests |`, plus 2–4 sentences on each.
5. **Risks**, and **open decisions** for the maintainers. Phrase each decision as a choice between options, with your recommendation.
6. An **outlier ledger** of 3–6 weird, adjacent or contrarian ideas, kept separate from the plan.
7. **Sources**: every external claim needs a URL, and every repo claim needs a `file:line`.

Don't draft a larger hidden plan to cut down later.

## Workflow guardrails

- **Three passes, no backtracking.**
  1. Do one bounded skim of `CLAUDE.md`, `BRANCH_STRATEGY.md`, `ROADMAP.md`, `src/logbook.js`, `src/pota-hunter.js`, `src/pota-selfspot.js` and the two `planning/codex/adif-*` docs. After that, use only grep and line-ranged reads.
  2. Capture external sources by issuing **parallel targeted queries per cluster**: one cluster for the ADIF spec, one for destination upload rules, one for competitor loggers and one for upload APIs. No combined mega-queries.
  3. Design and write.
- **Keep the outlier ledger running throughout.**
- **Prefer primary sources**: adif.org, POTA docs/help, ARRL LoTW/TQSL docs, QRZ/Cloudlog API docs. Date any claim about a rule that can change.

## Output and registration

- Codex writes to `planning/codex/2026-10-04-codex-qso-logging-adif-export.md`.
- agy writes to `planning/agy/2026-10-04-agy-qso-logging-adif-export.md`.

Both paths are relative to the HamTabV1 repo root.

**Registration happens after the research is done.** When the deliverable is finished, run `aiw research submit <your ID>` (CODEX-SF372 / AGY-SF003) and commit and push the file. Don't work on registration problems while you are researching.
