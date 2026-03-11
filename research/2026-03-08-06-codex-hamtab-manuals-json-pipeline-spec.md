# Multi-Vendor Manual Parsing To JSON — Research / Spec

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-08
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Original Premise

> "is there a good way to take the manuals from the differnt companies and parse them into a JSON that is more useful to us?"

## Summary
Yes. The best path is a two-layer pipeline: first create deterministic, citation-preserving extraction JSON from each PDF, then build a normalized HamTab radio-knowledge JSON on top of it. This separates low-risk document parsing from higher-level radio-domain normalization and keeps provenance intact. The pipeline should be schema-first, testable, and confidence-scored, with every extracted fact tied to source page/location. OCR should be used only when required (scanned pages), because it is significantly slower and lower-fidelity than native text extraction.

## Recommended Target Artifacts

### 1) `manual_structure.json` (raw + deterministic)
Purpose: represent manual content exactly as extracted.

Required content:
- document metadata (manufacturer, model, manual type, language, version if present)
- section tree (headings + page spans)
- text blocks with coordinates
- table blocks with cell coordinates
- command-like patterns detected verbatim
- source references for every record (`pdf_file`, `page`, `bbox`, `extractor`, `text_hash`)

### 2) `radio_knowledge.json` (normalized + actionable)
Purpose: power HamTab CAT/features/debug workflows.

Normalized domains:
- `capabilities` (frequency read/set, mode read/set, split, memory ops, etc.)
- `cat_commands` (command, direction, params, ranges, reply grammar, errors)
- `menu_settings` (menu id/path/type/default/range/dependencies)
- `workflows` (e.g., FT8 setup, CI-V setup, CAT USB setup)
- `safety_constraints` (TX interlocks, out-of-band prevention notes)
- `troubleshooting_signals` (timeouts, expected retries, known radio states)

Each field should include:
- `confidence` (`high|medium|low`)
- `source_refs[]` back to manual page and extraction node id

## Architecture (Phased)

### Phase 0: Inputs and naming conventions
- Store manuals in stable structure by vendor/model.
- Enforce filename convention and language tag.
- Create manifest for file -> model/manual-type mapping.

### Phase 1: Deterministic extraction layer
- Use `pdfplumber` for char/line/object-level extraction and baseline tables.
- Use `PyMuPDF` for robust block/word extraction and reading-order fallback.
- Use `Camelot` or `tabula-py` for table-heavy CAT command pages.
- Trigger OCR (Tesseract via PyMuPDF OCR path) only when page has no extractable text.

Output: one `manual_structure.json` per PDF.

### Phase 2: Vendor parsers
Implement parser modules:
- `yaesu_parser`
- `icom_parser`
- `kenwood_parser`
- `elecraft_parser`

Responsibilities:
- detect command grammars and parameter formats
- identify menu structures and option domains
- map section intents (setup, operation, troubleshooting)

Output: intermediate vendor JSON with source references.

### Phase 3: HamTab normalizer
- convert vendor-specific keys into common schema (`radio_knowledge.json`)
- keep vendor extension namespaces for non-common features
- assign confidence and ambiguity flags

### Phase 4: Validation and QA
- JSON Schema validation (Draft 2020-12)
- golden-file tests for known command pages
- provenance completeness test: fail if fields lack `source_refs`
- drift test: re-run extraction and diff normalized output

## Proposed JSON Schema Shape (Condensed)

```json
{
  "schema_version": "1.0.0",
  "radio": {
    "manufacturer": "Yaesu",
    "model": "FT-DX10"
  },
  "manuals": [
    {
      "type": "cat_reference",
      "file": "Yaesu_FT-DX10_FTDX10_CAT_OM_ENG_2308-F.pdf",
      "language": "en"
    }
  ],
  "capabilities": [
    {
      "id": "frequency_set",
      "support": true,
      "confidence": "high",
      "source_refs": [{"file": "...pdf", "page": 45, "node_id": "sec-4.2-cmd-FA"}]
    }
  ],
  "cat_commands": [
    {
      "name": "FA",
      "direction": ["read", "write"],
      "request_pattern": "FA; | FA#########;",
      "response_pattern": "FA#########;",
      "params": [{"name": "frequency_hz", "type": "integer", "min": 30000, "max": 60000000}],
      "confidence": "high",
      "source_refs": [{"file": "...pdf", "page": 46, "node_id": "tbl-cat-cmds-r12"}]
    }
  ],
  "menu_settings": [],
  "workflows": [],
  "safety_constraints": []
}
```

## Tooling Recommendation

Primary stack:
- `pdfplumber` + `PyMuPDF` for text/layout extraction
- `Camelot` (plus fallback `tabula-py`) for structured tables
- `Tesseract` only for OCR fallback pages
- JSON Schema Draft 2020-12 for validation contracts

Rationale:
- avoids single-tool brittleness across different PDF encodings
- preserves coordinate-level provenance
- supports both command tables and free-form procedural sections

## Data Quality Rules (Non-Negotiable)

1. No fact without citation.
2. Never discard original extracted text; keep raw layer immutable.
3. Keep normalization reversible: every normalized field maps to one or more raw nodes.
4. All parser heuristics must declare confidence and ambiguity.
5. OCR pages must be explicitly marked to avoid silent quality degradation.

## Implementation Ticket Seed (Route To Claude)

1. Create `scripts/manuals-json/` scaffold:
- `extract_raw.py`
- `parse_vendor.py`
- `normalize.py`
- `validate.py`

2. Add schemas:
- `schemas/manual_structure.schema.json`
- `schemas/radio_knowledge.schema.json`

3. Add test fixtures:
- one CAT page and one menu page per vendor
- golden outputs under `research/manuals/parsed/golden/`

4. Add make targets:
- `make manuals-extract`
- `make manuals-normalize`
- `make manuals-validate`

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OCR-heavy manuals degrade precision | Medium/High | OCR fallback only when text extraction is empty; mark OCR-derived records |
| Table parser variance across PDFs | Medium | dual parser strategy (Camelot then tabula fallback) |
| Vendor terminology mismatch | Medium | common schema + vendor extension namespace |
| Silent schema drift | High | strict JSON Schema validation in CI |
| Hallucinated normalization from weak extraction | High | provenance-required fields and confidence thresholds |

## Recommendation (Prioritized)

1. Build and lock the raw extraction schema first.
2. Implement Yaesu parser first (you already have active manual set).
3. Add one vendor at a time with golden tests.
4. Expose normalized JSON to HamTab CAT tooling only after provenance checks pass.

## Sources

### External
- https://github.com/jsvine/pdfplumber — PDF char/object/text extraction and table support (machine-generated PDFs).
- https://pymupdf.readthedocs.io/en/latest/recipes-text.html — block/word/text extraction options and reading-order strategies.
- https://pymupdf.readthedocs.io/en/latest/recipes-ocr.html — OCR integration notes and performance caveats with Tesseract.
- https://camelot-py.readthedocs.io/en/master/user/quickstart.html — table extraction workflow and parser modes.
- https://camelot-py.readthedocs.io/en/master/api.html — `camelot.read_pdf` API and parser flavors.
- https://tabula-py.readthedocs.io/en/v2.8.0/tabula.html — tabula wrapper for PDF table extraction fallback.
- https://tesseract-ocr.github.io/tessdoc/ — Tesseract 5.x user manual and project docs.
- https://json-schema.org/draft/2020-12 — current JSON Schema draft reference and metaschema.
- https://json-schema.org/specification — JSON Schema specification index and current draft guidance.

### Local Context
- `/home/fpeebles/coding/HamTabV1/research/manuals/README.md` — current vendor/manual inventory basis.
- `/home/fpeebles/coding/HamTabV1/research/2026-03-08-05-codex-download-radio-manuals.md` — manual acquisition task context.
