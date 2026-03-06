# HamTab Online SDR Integration Research (Selectable On-Air Rig)

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-04
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE-v3

## Summary
HamTab can support online SDRs with low disruption if they are added as a new connection type in the existing CAT stack, but not as generic serial-style drivers.
Best first target is **KiwiSDR** (highest protocol transparency and prior-art control bridge), with **OpenWebRX** as second.
Recommendation: ship an **RX-only MVP** (frequency/mode/s-meter + optional audio) and explicitly avoid TX/safety/power flows.

## 1. Platform Comparison

| Platform | URL | API/Protocol Availability | Programmatic Data | Auth/Access | Discovery | Feasibility |
|---|---|---|---|---|---|---|
| KiwiSDR | https://kiwisdr.com/ | Undocumented but widely reverse-engineered WebSocket protocol; open client code shows command/message contract (`SET auth`, `SET mod`, keepalive, `MSG/SND/W/F`). | Freq, mode, audio/IQ, S-meter (RSSI), waterfall; tune/control supported by protocol. | Per-server policy; often open, sometimes password/time-limited. | ReceiverBook map contains Kiwi entries in embedded `receivers` payload. | **HIGH** |
| OpenWebRX / OpenWebRX+ | https://github.com/luarvique/openwebrx | WebSocket control plane exists in source (`/ws/`, `SERVER DE CLIENT`, JSON control like `setfrequency`, `dspcontrol`), but no stable public cross-instance API guarantee. | Freq control, DSP parameters, S-meter stream, audio/waterfall in web client flow. | Per-server operator settings. | ReceiverBook map contains OpenWebRX entries in embedded `receivers` payload. | **MEDIUM-HIGH** |
| WebSDR (classic) | http://websdr.org/ | Browser-centric JS app; no formal public API documented. | Observable via browser behavior; automated control contract not clearly documented. | Open/public varies by host. | Human-readable server ecosystem (`websdr.org` frames to UTwente list). | **LOW** |
| SDR.hu (historical directory) | https://sdr.hu | No active directory API; current page is a shutdown/FAQ notice. | N/A now (historical role only). | N/A | N/A | **NONE** (for new integration) |
| ReceiverBook (directory) | https://www.receiverbook.de/map?type=kiwisdr | Not an official SDR control API, but map pages expose receiver metadata in page-embedded JS (`var receivers = [...]`). | Receiver URL, type, version, location metadata. | Public read page. | Yes (practical bootstrap source). | **HIGH** (for discovery only) |

## 2. Existing HamTab Architecture Fit

## What the current stack assumes
- Profiles are serial/CAT-centric (`protocol.family`, `serial`, polling settings) ([rig-profiles.json](/home/steve/code/HamTabv1/src/cat/rig-profiles.json:7)).
- `connectRig()` currently chooses either `WebSerialTransport` or demo `InMemoryTransport` ([connection-orchestrator.js](/home/steve/code/HamTabv1/src/cat/connection-orchestrator.js:117)).
- `RigManager` assumes command queue + `transport.sendCommand()` request/response polling loops ([rig-manager.js](/home/steve/code/HamTabv1/src/cat/rig-manager.js:31)).
- Store has fields that map well to RX state (frequency/mode/signal) plus TX/SWR/power fields that SDRs won’t populate ([rig-state-store.js](/home/steve/code/HamTabv1/src/cat/rig-state-store.js:11)).
- Widget connection flow is currently serial-first for real radios ([on-air-rig.js](/home/steve/code/HamTabv1/src/on-air-rig.js:553)).

## Integration decision
Use **platform-specific network transports + platform-specific drivers** behind current orchestrator entry points.
Do not force KiwiSDR/OpenWebRX into WebSerial semantics.

## Proposed profile schema extension
Add SDR profiles with a new top-level connection type:

```json
{
  "id": "kiwisdr-generic",
  "connection": {
    "type": "network_sdr",
    "platform": "kiwisdr",
    "endpoint": "wss://example:8073/",
    "discovery": "manual"
  },
  "protocol": { "family": "kiwisdr_ws" },
  "control": { "pollingInterval": 1000, "readOnly": true },
  "capabilities": ["frequency_read", "mode_read", "meter_signal", "audio_rx"]
}
```

## Capability mapping for SDR mode
- Yes: `frequency`, `mode`, `signal/sUnits`, `band`, `connected`
- Optional: audio playback state
- No: `ptt`, `swr`, `powerMeter`, `rfPower`, TX safety automations

## 3. Claude-Ready Implementation Spec (Top 2 Platforms)

## Recommended sequence
1. KiwiSDR RX-only MVP
2. OpenWebRX RX-only adapter

## New/changed files
- `src/cat/transports/kiwisdr-socket.js`
- `src/cat/drivers/kiwisdr-ws.js`
- `src/cat/transports/openwebrx-socket.js`
- `src/cat/drivers/openwebrx-ws.js`
- `src/cat/sdr/sdr-discovery.js` (manual URL + optional ReceiverBook bootstrap)
- `src/cat/connection-orchestrator.js` (branch on `connection.type === "network_sdr"`)
- `src/cat/rig-profiles.json` (SDR profile entries)
- `src/cat/rig-state-store.js` (optional: `sourceType`, `rxOnly`, `remoteName`, `remoteLocation`)
- `src/on-air-rig.js` (SDR mode rendering and control gating)
- `public/index.html` (server picker UI controls)

## Interface sketch (minimal disruption)

```js
// driver contract remains recognizable
export const kiwisdrWs = {
  name: 'kiwisdr_ws',
  init() { return ['auth', 'subscribe']; },
  capabilities() { return ['frequency_read', 'frequency_set', 'mode_read', 'mode_set', 'meter_signal', 'audio_rx']; },
  encode(command, params) { /* logical -> ws command string */ },
  parse(message) { /* ws frame -> {type, value} */ },
  pollCommands() { return ['getInfo']; }
};
```

```js
// transport adapts ws lifecycle to existing RigManager expectations
class KiwiSdrSocketTransport {
  async connect() {}
  async disconnect() {}
  async sendCommand(cmd) {}
  async flush() {}
}
```

## MVP acceptance criteria
- User can select `KiwiSDR` profile, input server URL, connect, and see live frequency/mode/signal.
- On-Air Rig shows clear RX-only state and hides TX/SWR/power controls for SDR sessions.
- Disconnect/reconnect is stable; no impact to existing WebSerial flows.
- Optional: play SDR audio with user gesture gating.

## 4. UX Mockup (ASCII)

```text
PHYSICAL RADIO MODE
+-----------------------------------+
| On-Air Rig                [Connect]|
| 14.074.000  USB   RX/TX            |
| S-Meter [####----]  SWR 1.3        |
| Power 50W  RST 589                 |
+-----------------------------------+

SDR MODE (RX ONLY)
+-----------------------------------+
| On-Air Rig: KiwiSDR      [Disconnect]|
| 14.074.000  USB   RX ONLY          |
| Server: N2YO VA, USA              |
| S-Meter [#####---]   Latency 320ms |
| [Play Audio] [Retune]             |
| TX controls unavailable (remote RX)|
+-----------------------------------+
```

## UX notes
- Server picker options: `Manual URL` first, `Discovery list` second, `Favorites` third.
- SDR session badge: `RX ONLY` always visible.
- If dual rig is needed later, run second widget instance or split pane; defer from MVP.

## 5. Legal/Operational Risks and Open Questions

| Area | Risk / Unknown | Impact | Mitigation |
|---|---|---|---|
| Operator policy | Public SDR hosts may not welcome unattended polling/audio clients. | Medium | Default conservative poll intervals, clear disconnect controls, respect password/time limits. |
| Terms/licensing | Platform software is open source, but individual receiver usage rules vary by operator. | Medium | Show server-provided terms link when available; document user responsibility. |
| Resource load | Audio + waterfall can consume significant server/client bandwidth. | Medium | MVP defaults to metadata-only; audio opt-in; no waterfall in v1. |
| Protocol stability | No universal standard across WebSDR/Kiwi/OpenWebRX hosts. | High | Start with KiwiSDR only; isolate adapters by platform; strict timeout/error handling. |
| Security | Direct browser-to-random SDR URLs may expose mixed-content/TLS/CORS issues. | Medium | Require `https/wss` where possible; show explicit trust warning for arbitrary hosts. |

## 6. Prior Art
- `kiwiclientd` provides a hamlib rigctl bridge for KiwiSDR control, demonstrating practical tune/mode integration path for external radio apps.
- OpenWebRX web client/server code demonstrates browser websocket control loops (`setfrequency`, `smeter`) that can be adapted.
- No strong evidence found that HamClock/DXLab/Log4OM natively embed public online SDR receiver browsing as a first-class in-app "rig"; ecosystem tends to use bridges or separate SDR apps.

## 7. Effort Estimate (relative to CAT Phases A-H)
- **MVP (KiwiSDR RX-only):** ~0.75-1.25 phases (roughly Phase-B-to-D sized, mostly new transport/driver + UI gating)
- **Add OpenWebRX adapter:** +0.5-0.75 phase
- **Audio polish + discovery + favorites:** +0.5 phase
- **Cross-platform hardening (error cases, auth variants):** +0.5 phase

## 8. Recommendation
Build it, but keep scope strict.

1. **Ship KiwiSDR-first RX-only MVP** (frequency/mode/s-meter, optional audio).
2. **Do not include TX, SWR, power, or waterfall in MVP.**
3. **Treat OpenWebRX as phase 2** after Kiwi connection lifecycle and UI semantics are stable.
4. **Use manual URL as primary onboarding**, with ReceiverBook-backed discovery as a convenience layer.

## Sources

### Internal (HamTab)
- [rig-profiles.json](/home/steve/code/HamTabv1/src/cat/rig-profiles.json:7)
- [connection-orchestrator.js](/home/steve/code/HamTabv1/src/cat/connection-orchestrator.js:117)
- [rig-manager.js](/home/steve/code/HamTabv1/src/cat/rig-manager.js:31)
- [rig-state-store.js](/home/steve/code/HamTabv1/src/cat/rig-state-store.js:11)
- [web-serial.js](/home/steve/code/HamTabv1/src/cat/transports/web-serial.js:58)
- [yaesu-ascii.js](/home/steve/code/HamTabv1/src/cat/drivers/yaesu-ascii.js:62)
- [on-air-rig.js](/home/steve/code/HamTabv1/src/on-air-rig.js:515)
- [constants.js](/home/steve/code/HamTabv1/src/constants.js:23)
- [cat-control-implementation.md](/home/steve/code/hamtab-planning/plans/cat-control-implementation.md:29)

### External
- Kiwi client README: https://github.com/jks-prv/kiwiclient/blob/master/README.md
- Kiwi websocket/client implementation: https://github.com/jks-prv/kiwiclient/blob/master/kiwi/client.py
- Kiwi rigctl bridge prior art: https://github.com/jks-prv/kiwiclient/blob/master/kiwi/rigctld.py
- OpenWebRX repo: https://github.com/luarvique/openwebrx
- OpenWebRX websocket route/api route: https://github.com/luarvique/openwebrx/blob/develop/owrx/http.py
- OpenWebRX connection message handling: https://github.com/luarvique/openwebrx/blob/develop/owrx/connection.py
- OpenWebRX browser control flow: https://github.com/luarvique/openwebrx/blob/develop/htdocs/openwebrx.js
- WebSDR directory landing: http://www.websdr.org/
- WebSDR UTwente instance: http://websdr.ewi.utwente.nl:8901/
- SDR.hu current status page: https://sdr.hu/
- ReceiverBook Kiwi map: https://www.receiverbook.de/map?type=kiwisdr
- ReceiverBook OpenWebRX map: https://www.receiverbook.de/map?type=openwebrx

## Lane Note
Implementation should be routed to Claude.
