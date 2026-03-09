# Download Radio Reference Manuals — Research Task

> **For:** Codex
> **From:** Claude (via Francisco)
> **Date:** 2026-03-08
> **Context:** HamTab has CAT drivers for Yaesu, Icom, Kenwood, and Elecraft radios. We need the full reference manual sets for driver development, feature planning, and troubleshooting. These are publicly available from each manufacturer's support/download pages.

## Task

Download all available English PDF manuals for the radio models listed below and save them to `HamTabV1/research/manuals/`. We already have the FT-DX10 CAT manual in `docs/manuals/` — include the FT-DX10 operating and advance manuals if available.

For each model, get **every** English PDF manual available:
- **CAT Operation Reference Manual** — command protocol for software control
- **Operating Manual** — full user manual (menu trees, signal flow, hardware behavior)
- **Advance Manual** — extended features, hidden settings, detailed specs
- **Any other technical reference PDFs** (firmware notes, TCI/TCX docs, installation guides)

## Models

### Yaesu (NewCAT protocol)
- FT-DX10 (operating + advance only — CAT manual already in repo)
- FT-991A
- FT-710
- FTDX101D / FTDX101MP
- FT-891
- FT-DX3000
- FT-857D
- FT-817ND / FT-818
- FT-950

### Icom (CI-V protocol)
- IC-7300 / IC-7300 MK2
- IC-7610
- IC-7851
- IC-705
- IC-9700

### Kenwood (ASCII protocol)
- TS-590S / TS-590SG
- TS-890S
- TS-990S
- TS-480SAT / TS-480HX

### Elecraft
- K3 / K3S
- KX3
- KX2
- K4 / K4D

## Where to Find Them

- **Yaesu:** yaesu.com → Support → Downloads/Manuals → select model
- **Icom:** icomamerica.com or icomjapan.com → Support → Downloads → select model
- **Kenwood:** kenwood.com → Support → Downloads → select model (may be under "Communications")
- **Elecraft:** elecraft.com → Support → Downloads or Documentation → select model

## Output

### Files
Save all PDFs to `HamTabV1/research/manuals/` with clear filenames. Use the manufacturer's original filename if descriptive, otherwise rename to:
`{manufacturer}_{model}_{type}_ENG.pdf`
Example: `Yaesu_FT991A_CAT_OM_ENG.pdf`, `Icom_IC7300_Full_OM_ENG.pdf`

### Summary
Write `HamTabV1/research/manuals/README.md` with a table:

| Manufacturer | Model | Manual Type | Filename | Source URL |
|---|---|---|---|---|

Include a section listing any models or manual types that weren't found or weren't available for download.

## Commit

```
Research: [hamtab] download radio reference manuals for driver development and troubleshooting
```
