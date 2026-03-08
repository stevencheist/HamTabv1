# TCI Protocol Research for HamTab On-Air Rig — Research

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-04
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Summary
TCI (Transceiver Control Interface) is an ASCII command protocol over WebSocket (on TCP), not serial CAT. The official TCI 2.0 spec documents bidirectional rig control (frequency/mode/TRX/TUNE/etc.), server-pushed notifications, and binary audio/IQ stream frames over the same WebSocket channel. For browser feasibility, this is materially better than raw TCP CAT because browsers can use `WebSocket` directly; no raw-TCP bridge is required for command/control. For Thetis specifically, current upstream source includes a built-in TCI server (`TCIServer.cs`) with default bind `127.0.0.1:50001`, optional ExpertSDR3 emulation options, and WebSocket handshake support. Main integration risk is deployment/security (localhost binding, HTTPS mixed-content behavior, no built-in auth/TLS in observed Thetis implementation), not protocol capability.

## 1) What is TCI?

### Protocol/transport
- TCI is an open network control interface created by Expert Electronics as an alternative to COM/CAT + virtual audio cable workflows.
- Official protocol docs describe a full-duplex **WebSocket protocol over TCP**.
- Message commands are **ASCII text**, case-insensitive, with this grammar:
  - `COMMAND:arg1,arg2;`
  - Reserved chars in normal arguments: `: , ;`
- Same connection can also carry **binary stream blocks** (IQ/audio), with a typed header and byte payload.

### Data you can read (examples from TCI 2.0)
- Frequency/control state: `DDS`, `VFO`, `IF`, `MODULATION`, `TRX`, `TUNE`
- Init/device capabilities: `VFO_LIMITS`, `IF_LIMITS`, `TRX_COUNT`, `CHANNEL_COUNT`, `MODULATIONS_LIST`, `PROTOCOL`, `READY`
- Telemetry/notifications: `RX_CHANNEL_SENSORS`, `TX_SENSORS`, `TX_FREQUENCY`, `TX_FOOTSWITCH`, spot-click notifications, etc.

### Commands you can send (examples)
- Set/read frequency: `VFO`, `DDS`, `IF`
- Change mode: `MODULATION`
- PTT/TX control: `TRX`
- Tune carrier: `TUNE`
- Drive power controls: `DRIVE`, `TUNE_DRIVE`
- Spots and UI sync: `SPOT`, `SPOT_DELETE`, `SPOT_CLEAR`

### Port
- The TCI spec itself does not hardcode one universal port in the command table.
- In current Thetis source, default bind is `127.0.0.1:50001`.

## 2) TCI vs CAT

- **CAT** in HamTab today is serial-port oriented (`WebSerialTransport`) with driver polling/command queues.
- **TCI** is network socket based (WebSocket/TCP), multi-client by design, server-push synchronized.
- TCI server model:
  - Radio software (ExpertSDR3/Thetis TCI server) acts as server.
  - Loggers/digital tools/clients connect as clients.
- TCI can run localhost or LAN (bind address is configurable in Thetis UI/source), unlike strict USB serial CAT wiring.

## 3) Browser feasibility

### Direct browser connectivity
- Because TCI is WebSocket-based, a browser can connect directly with `WebSocket` (text + binary frames).
- Raw TCP bridge is **not** required for TCI command/control path.

### Practical blockers/constraints
- **Dealbreaker risk A (deployment):** If Thetis is bound to `127.0.0.1` and HamTab is running on a different machine, direct browser connection will fail unless bind/route is changed.
- **Dealbreaker risk B (web security context):** If HamTab is served via HTTPS, plain `ws://` links may be blocked as mixed content depending on browser/security policy; `wss://` or same-origin proxy may be needed.
- **Dealbreaker risk C (security):** Observed Thetis TCI server code shows WebSocket upgrade handling but no protocol-layer auth/TLS; exposing TCI beyond localhost increases control-surface risk.

### Existing JS/TS ecosystem
- No dominant official JS SDK was found from Expert Electronics.
- Existing third-party JS client exists (`worldradioleague/tci-client`) with a documented WebSocket usage model.
- Non-JS adapters exist (for example TCI→Hamlib adapter) and could be fallback integration paths.

## 4) Thetis specifics

### Does Thetis support TCI?
- Yes in current upstream source (`OpenHPSDR-Thetis`), via `TCIServer.cs` and TCI setup controls.
- Source includes WebSocket handshake logic and TCI command handlers.

### How users enable it in Thetis
- In setup UI source:
  - TCI Server group has bind field (`Bind IP:Port`), default `127.0.0.1:50001`
  - `Server Running` checkbox starts/stops TCI listener.

### Which Thetis versions?
- Current tag `v2.10.0.0` contains `TCIServer.cs`.
- In fetched tags examined (`v2.8.x`, `v2.9.0`, `v2.10.0.0`), TCI server file appears in `v2.10.0.0` only.
- Confidence note: this indicates reliable support in current 2.10.x lineage; earliest historical introduction point before 2.10.x was not fully reconstructed from shallow history.

### Is TCI Thetis-only?
- No. Official Expert Electronics material presents TCI as protocol for **ExpertSDR2/3 / SunSDR ecosystem** and third-party integrations.
- SmartSDR (FlexRadio) uses its own TCP/UDP API model (ports 4992/4991), not TCI.

## 5) Implementation scope for HamTab (minimal coexistence with WebSerial CAT)

### Minimal integration shape (recommended)
1. Add a new `connectionType` in rig config: `serial_cat` (existing) vs `tci_ws` (new).
2. Introduce a `TCIWebSocketTransport` alongside `WebSerialTransport`.
3. Keep a unified rig state store and widget UI; map TCI messages into existing state events (`frequency`, `mode`, `tx`, meters).
4. Implement MVP command subset:
   - Read/push: `VFO` or `DDS`, `MODULATION`, `TRX`, `RX_CHANNEL_SENSORS`/`TX_SENSORS` when available.
   - Write: set frequency (`VFO`), set mode (`MODULATION`), PTT (`TRX`).
5. Add TCI-specific connect fields in UI:
   - WebSocket URL (default `ws://127.0.0.1:50001`)
   - Optional profile (Thetis/ExpertSDR behavior toggles)

### Coexistence with current rig widget
- Current architecture already cleanly separates transport/driver/orchestrator layers; this is suitable for side-by-side serial and network transports.
- Keep WebSerial as-is; add TCI path without regressions to CAT drivers.

### Security considerations
- Default to localhost URLs for safety.
- Warn user before non-localhost endpoints.
- If remote TCI is needed, prefer TLS (`wss`) and network segmentation/firewalling.
- Treat TCI as radio-control authority; don’t auto-connect to arbitrary endpoints from persisted settings without explicit confirmation.

## Dealbreakers (browser-based)
- Hard dealbreaker only if target environment cannot expose a browser-reachable WebSocket endpoint (for example strict local-only bind with remote browser use-case and no proxy).
- Potential hard blocker for hosted HTTPS HamTab if only insecure `ws://` is available and browser blocks it.
- No protocol-level auth in observed implementations means Internet-exposed TCI endpoints are unsafe without additional protection.

## Sources

### External
- Expert Electronics TCI repo: https://github.com/ExpertSDR3/TCI
- Official TCI 2.0 PDF (in repo): https://github.com/ExpertSDR3/TCI/blob/main/TCI%20Protocol.pdf
- Expert Electronics “Software with TCI support”: https://eesdr.com/en/software-en/software-en
- Thetis upstream source: https://github.com/TAPR/OpenHPSDR-Thetis
- FlexRadio SmartSDR API wiki: https://github.com/flexradio/smartsdr-api-docs/wiki
- Third-party JS TCI client example: https://github.com/worldradioleague/tci-client
- MDN WebSocket API reference: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

### Code references (local file:line)
- TCI over WebSocket/TCP + command format + streaming model: `/tmp/tci-protocol/TCI Protocol.pdf` (pages 4, 6, 9, 10, 12-16, 39-40 extracted during analysis)
- Thetis default bind/port and server startup:
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/console.cs:2240`
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/console.cs:2246`
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/setup.cs:23428`
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/setup.designer.cs:51322`
- Thetis WebSocket upgrade handling:
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/TCIServer.cs:453`
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/TCIServer.cs:470`
- Thetis implemented TCI command subset parse switch:
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/TCIServer.cs:1743`
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/TCIServer.cs:1761`
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/TCIServer.cs:1776`
  - `/tmp/openhpsdr-thetis/Project Files/Source/Console/TCIServer.cs:1787`
- HamTab transport/orchestrator baseline (current WebSerial CAT path):
  - `/home/fpeebles/coding/HamTabV1/src/cat/connection-orchestrator.js:7`
  - `/home/fpeebles/coding/HamTabV1/src/cat/connection-orchestrator.js:128`
  - `/home/fpeebles/coding/HamTabV1/src/cat/transports/web-serial.js:23`
  - `/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:613`
