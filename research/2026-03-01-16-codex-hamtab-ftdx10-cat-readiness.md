# HamTab Rig Control — FT-DX10 CAT Protocol Readiness Audit

> **For:** Claude (via Francisco)
> **From:** Codex
> **Date:** 2026-03-01
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Executive Answer
HamTab currently has a **solid FT-DX10 CAT MVP** (frequency/mode/PTT/meter/power) but is **not yet protocol-complete** for “fully develop that protocol.”

The CAT manual exposes a broad surface (command table extraction shows ~103 command mnemonics), while the Yaesu driver currently implements a small core subset. You have enough spec material to complete the protocol, but there are important implementation gaps and one serial-settings discrepancy to resolve.

## Scope
User request: use `FTDX10_CAT_OM_ENG_2308-F.pdf` to validate CAT controls for HamTab rig control and determine whether everything needed is present.

Manual reviewed:
- `/mnt/d/Downloads/FTDX10_CAT_OM_ENG_2308-F.pdf`
- Text extraction used for line-cited analysis: `/tmp/ftdx10-cat-manual.txt`

## What HamTab Implements Today (FT-DX10)
### Driver-level command support (Yaesu)
Current Yaesu driver supports these logical commands:
- `getFrequency` / `setFrequency` -> `FA`
- `getFrequencyB` / `setFrequencyB` -> `FB`
- `getMode` / `setMode` -> `MD0`
- `getPTT` / `setPTT` -> `TX`
- `getSignal` -> `SM0`
- `getSWR` -> `RM6`
- `getPower` -> `RM5`
- `getRFPower` / `setRFPower` -> `PC`
- `getInfo` -> `IF`
- `getID` -> `ID`
- startup includes `AI0`

Evidence:
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:68-75`
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:96-119`
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:132-190`
- `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:198-213`

### App-level usage
HamTab UI currently uses CAT mostly for:
- tune rig frequency/mode from rig widget and spot detail
- monitor frequency/mode/PTT/meters
- set RF power

Evidence:
- `/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:175-176`
- `/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:646-647`
- `/home/fpeebles/coding/HamTabV1/src/spot-detail.js:261-266`
- `/home/fpeebles/coding/HamTabV1/src/cat/rig-manager.js:131-161`

## What the FT-DX10 CAT Manual Exposes
The command list in the manual is much larger than current implementation (command table includes many operational controls beyond the MVP subset).

Examples from command tables:
- core: `FA`, `FB`, `MD`, `IF`, `ID`, `TX`, `PC`, `SM`, `RM`
- operational controls: `ST` (split), `SV` (swap VFO), `FT` (TX set), `VS` (VFO select), `CF/RC/RD/RU/XT` (clarifier controls), `PA` (IPO/preamp), `RA` (attenuator), `NB/NL/NR`, `SH` (width), `RF` (roofing filter), `SQ` (squelch), `TS` (TXW), `PS` (power switch), etc.

Evidence:
- manual command list pages (extracted): `/tmp/ftdx10-cat-manual.txt:234-313`, `:665-706`, `:710-755`
- command detail sections: `/tmp/ftdx10-cat-manual.txt:4729-5531`, `:7241-8105`

Additional interface constraints from manual:
- FTDX10 exposes **Enhanced COM** for CAT and **Standard COM** for TX control/CW/digital (`/tmp/ftdx10-cat-manual.txt:43-48`)
- `PS` command is unavailable over RS-232C (`/tmp/ftdx10-cat-manual.txt:69-71`)
- `AI` availability note tied to USB (`/tmp/ftdx10-cat-manual.txt:1317-1320`)

## Coverage Verdict
## Ready now (MVP)
- Frequency/mode/PTT polling and control
- S-meter/SWR/power meter reads
- RF power set/read
- Radio ID and basic IF frequency extraction

## Not yet “full protocol”
HamTab does **not** yet implement major FT-DX10 CAT control families needed for full rig-control parity:
- split and dual-VFO workflow (`ST`, `SV`, `VS`, `FT`)
- clarifier control surface (`CF`, `RC`, `RD`, `RU`, `XT`) beyond passive IF parsing
- front-end / filter stack controls (`PA`, `RA`, `RF`, `SH`, potentially `IS` round-trip usage)
- NB/NR depth controls (`NL`, potentially additional parameters)
- extended status and memory control families (`OI`, `OS`, `MC/MR/MT/MW`, `QS/QI/QR`, etc.)

Evidence:
- implemented command switch list: `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:96-119`
- command inventory from manual: `/tmp/ftdx10-cat-manual.txt:234-313`, `:665-706`

## Gaps That Matter for “Fully Develop Protocol”
1. **Command surface gap**
- Manual exposes far more than current driver encode/parse handles.

2. **PTT method config is not functionally wired**
- UI/state exposes `cat|dtr|rts|none`, but control path currently remains CAT-command oriented.
- Evidence: config/state fields exist (`/home/fpeebles/coding/HamTabV1/src/state.js:283`, `/home/fpeebles/coding/HamTabV1/public/index.html:313-319`), but no command-routing logic by `pttMethod` is implemented in orchestrator/driver paths (`/home/fpeebles/coding/HamTabV1/src/cat/connection-orchestrator.js:50-181`).

3. **Serial settings consistency issue**
- Transport defaults to 2 stop bits + hardware flow (`/home/fpeebles/coding/HamTabV1/src/cat/transports/web-serial.js:30-37`),
- FT-DX10 profile currently sets stop bits 1 + flow none (`/home/fpeebles/coding/HamTabV1/src/cat/rig-profiles.json:71-77`),
- UI defaults stop bits 1 (`/home/fpeebles/coding/HamTabV1/src/state.js:278`, `/home/fpeebles/coding/HamTabV1/public/index.html:287-290`),
- internal reference doc claims FT-DX10 commonly needs 2 stop bits (`/home/fpeebles/sffoundry/hamtab-planning/reference/ftdx10-cat-protocol.md:13-18`, `:167-168`).

4. **Dual-port model not represented**
- Manual distinguishes Enhanced vs Standard COM responsibilities (`/tmp/ftdx10-cat-manual.txt:43-48`), but current architecture uses one selected serial path in the rig widget flow (`/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:560-599`).

## Do We Have Enough to Finish the Protocol?
Yes, with caveats.

You have the primary CAT command spec from the Yaesu manual and a working MVP implementation to extend. What is still needed is not another spec source, but a **structured implementation plan + hardware validation loop**.

## Recommended Completion Checklist (Protocol-Complete)
1. Build a machine-readable FT-DX10 command schema from the CAT table.
- Fields: mnemonic, set/read/answer flags, parameter format, value ranges, mode constraints, notes.

2. Expand Yaesu driver to phase-1 operational commands.
- Prioritize: split/VFO/clarifier, preamp/atten/filter width/roofing, NB/NR levels, richer status parsing.

3. Implement `pttMethod` routing.
- Enforce CAT vs DTR vs RTS behavior in the transport/orchestrator path, not just UI config.

4. Resolve serial defaults by live validation.
- Confirm FT-DX10 reliable defaults on target OS/hardware (stop bits + flow control).
- Harmonize profile defaults, UI defaults, and docs once validated.

5. Add dual-port strategy decision.
- Decide whether HamTab will support Standard COM functions explicitly or remain single-port CAT-first.

6. Add golden tests from manual examples.
- Encode/parse tests for command frames and edge cases (`?;`, mode codes, IF field parsing, meter behavior during RX/TX).

## Bottom Line
- **MVP readiness:** yes.
- **Full FT-DX10 CAT protocol readiness:** no, not yet.
- **Missing prerequisite documentation:** no critical blocker; you have enough source spec.
- **Missing engineering work:** command coverage expansion, ptt method routing, serial-default validation, and test harness completion.

## Sources
- FT-DX10 CAT manual PDF: `/mnt/d/Downloads/FTDX10_CAT_OM_ENG_2308-F.pdf`
- Manual extraction and command structure:
  - `/tmp/ftdx10-cat-manual.txt:43-48`
  - `/tmp/ftdx10-cat-manual.txt:69-71`
  - `/tmp/ftdx10-cat-manual.txt:174-207`
  - `/tmp/ftdx10-cat-manual.txt:234-313`
  - `/tmp/ftdx10-cat-manual.txt:665-706`
  - `/tmp/ftdx10-cat-manual.txt:710-755`
  - `/tmp/ftdx10-cat-manual.txt:4729-5531`
  - `/tmp/ftdx10-cat-manual.txt:7241-8105`
  - `/tmp/ftdx10-cat-manual.txt:1317-1320`
- HamTab current CAT implementation:
  - `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:68-75`
  - `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:96-119`
  - `/home/fpeebles/coding/HamTabV1/src/cat/drivers/yaesu-ascii.js:132-214`
  - `/home/fpeebles/coding/HamTabV1/src/cat/rig-manager.js:131-211`
  - `/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:175-176`
  - `/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:560-599`
  - `/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:646-647`
  - `/home/fpeebles/coding/HamTabV1/src/spot-detail.js:261-266`
  - `/home/fpeebles/coding/HamTabV1/src/cat/rig-profiles.json:63-92`
  - `/home/fpeebles/coding/HamTabV1/src/cat/transports/web-serial.js:30-37`
  - `/home/fpeebles/coding/HamTabV1/src/state.js:276-285`
  - `/home/fpeebles/coding/HamTabV1/public/index.html:269-303`
  - `/home/fpeebles/coding/HamTabV1/public/index.html:313-319`
- Existing internal reference:
  - `/home/fpeebles/sffoundry/hamtab-planning/reference/ftdx10-cat-protocol.md:9-21`
  - `/home/fpeebles/sffoundry/hamtab-planning/reference/ftdx10-cat-protocol.md:165-173`
