# WSJT-X / Logger UDP Findings — Research

> **For:** Claude (via Francisco)
> **From:** Codex
> **Date:** 2026-03-01
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE-v3

## Summary
WSJT-X UDP integration is a strong fit for HamTab lanmode: low-latency, local-network, no third-party credentials. The official WSJT-X network protocol is binary (Qt serialization) and starts with a fixed magic number (`0xadbccbda`) and schema value, then message-type payloads. N1MM+ complements this with XML UDP broadcasts (RadioInfo, ContactInfo, ScoreInfo, etc.), which are easier to parse but need strict input validation. Recommended architecture: lanmode-only UDP listeners using `dgram`, normalized in-memory event bus, bounded ring buffers, and browser delivery via SSE/polling fallback.

## 1. WSJT-X UDP Protocol

### Default port and transport
- WSJT-X uses UDP for network messages; common default is port **2237**.

### Message envelope (official wire framing)
Per official WSJT-X network message definition:
1. `quint32` magic number = `0xadbccbda`
2. `quint32` schema number
3. `quint32` message type
4. `utf8` id (client identifier)
5. Type-specific payload

### Message types (core set)
Official WSJT-X protocol includes (at minimum) the operational set below:
- Heartbeat
- Status
- Decode
- Clear
- QSOLogged
- Close
- Replay
- HaltTx
- FreeText
- WSPRDecode
- Location
- LoggedADIF
- HighlightCallsign
Later schema revisions/additions include configuration-oriented control messages (e.g., switch/configure semantics).

### Useful messages for HamTab widgeting
- `Decode`: live FT8/FT4 decode lines for scrolling decode view
- `Status`: dial freq, mode, tx/rx state for rig state strip
- `QSOLogged` and/or `LoggedADIF`: handoff into local logbook timeline
- `WSPRDecode`: future bridge into WSPR analytics widget

### Parser availability
- Community parsers exist in multiple languages; Node ecosystem does not have one single dominant standard package.
- Practical approach: implement focused in-repo parser for the subset HamTab consumes first.

### JTDX compatibility
- JTDX is generally WSJT-X-protocol compatible for UDP integration workflows, but version-specific field differences should be guarded with schema/version checks.

## 2. N1MM+ UDP Broadcast

### Format and transport
- N1MM+ sends UDP broadcast datagrams containing XML payloads.
- Documented message families include `RadioInfo`, `ContactInfo`, `ContactReplace`, `ContactDelete`, `LookupInfo`, `ScoreInfo`, and others.

### High-value messages for HamTab
- `RadioInfo`: live frequency/mode/radio state
- `ContactInfo`: newly logged contact events
- `ScoreInfo`: contest session context/score telemetry (optional widget)

### Parser strategy
- Use strict XML parse with allowlist root elements.
- Reject payloads above max size.
- Normalize to internal event model before pushing to UI.

## 3. Log4OM UDP and Other Logger Interfaces

### Log4OM
- Public docs emphasize API/interop pathways, but I did not find a single, stable, official “default UDP broadcast schema” equivalent to N1MM’s documented XML broadcast profile.
- Recommendation: treat Log4OM direct UDP ingestion as phase-3 optional, pending confirmed current protocol docs.

### Other loggers
- N1MM+ is the cleanest/most documented UDP target.
- Additional logger integrations should use adapter interfaces (`source -> normalized event`) with per-source protocol modules.

## 4. Implementation Architecture (HamTab)

### Listener model
- Lanmode-only UDP listener service, one socket per source/port:
  - WSJT-X/JTDX listener (default 2237)
  - N1MM listener (configurable)

```js
import dgram from 'node:dgram';

function startUdpListener({ host = '127.0.0.1', port }, onPacket) {
  const sock = dgram.createSocket('udp4');

  sock.on('message', (msg, rinfo) => onPacket(msg, rinfo));
  sock.on('error', (err) => {
    console.error('UDP listener error', { port, err: err.message });
  });

  sock.bind(port, host);
  return () => sock.close();
}
```

### WSJT-X binary parse skeleton
```js
function parseWsjtxFrame(buf) {
  let off = 0;
  const magic = buf.readUInt32BE(off); off += 4;
  if (magic !== 0xadbccbda) throw new Error('Bad WSJT-X magic');

  const schema = buf.readUInt32BE(off); off += 4;
  const type = buf.readUInt32BE(off); off += 4;

  // Next fields are Qt-encoded (QString/UTF-8/etc); decode helpers required.
  return { schema, type, raw: buf.subarray(off) };
}
```

### Data flow
`UDP datagram -> source parser -> normalized event -> in-memory ring buffer -> UI stream`

### Multi-source coexistence
- Per-source ring buffers with shared normalized model:
  - `wsjtxDecode`
  - `wsjtxLoggedQso`
  - `n1mmRadio`
  - `n1mmContact`
- Unified widget can switch source tabs like existing spot source UI patterns.

### Config UX
- Add config toggles and ports for each listener.
- Default bind: `127.0.0.1`.
- Optional LAN bind: `0.0.0.0` with explicit warning.

### Multicast vs unicast
- Same-host usage is usually unicast/local broadcast and sufficient.
- Keep host/port configurable; do not assume multicast requirements for MVP.

## 5. Browser Widget Design

### WSJT-X Decodes widget (recommended MVP)
- Scrolling decode table:
  - UTC
  - SNR dB
  - DT
  - DF/frequency offset
  - decoded text
  - extracted callsign (if parseable)
- Highlight CQ and your callsign matches.

### Map augmentation
- Optional: infer/capture callsign+grid from decoded text and plot transient markers.
- Keep disabled by default until confidence in parser quality is high.

### ADIF/logbook integration
- Route `QSOLogged` / `LoggedADIF` into same normalized QSO ingestion pipeline as ADIF-import research path.

## 6. Security Considerations
- **Default bind** to `127.0.0.1` in lanmode.
- Enforce packet size limits (e.g., 8-16 KB).
- Validate WSJT-X magic/schema before parse.
- XML parser hardening for N1MM payloads (entity handling, root allowlist).
- Rate-limit UI emission during decode bursts (batch updates every 200-500 ms).
- Hostedmode should not expose UDP listeners at all.

## Recommended Implementation Path

### Phase 1 (lanmode MVP)
1. Add WSJT-X UDP listener (port 2237).
2. Parse envelope + `Decode` + `Status` only.
3. Add in-memory ring buffer + simple polling endpoint.
4. Add basic “WSJT-X Decodes” widget.

### Phase 2
1. Add `QSOLogged` / `LoggedADIF` ingestion path.
2. Add N1MM UDP XML listener for `RadioInfo` + `ContactInfo`.
3. Add SSE stream endpoint and browser EventSource client.

### Phase 3
1. Adapter interface for additional loggers.
2. Optional map overlays from decode metadata.
3. Advanced filtering/alerting (CQ DX, needed grids, etc.).

## HamTab Codebase Fit Notes
- Existing app state pattern supports adding new real-time source buckets: `/home/fpeebles/coding/HamTabV1/src/state.js:175`.
- Current real-time “live spots” implementation is polling-based and a viable first bridge model for UDP event endpoints: `/home/fpeebles/coding/HamTabV1/src/live-spots.js:62`.
- Server already contains source proxy endpoints and shared validation patterns that can be mirrored for UDP feature-gated endpoints: `/home/fpeebles/coding/HamTabV1/server.js:361`.

## Sources

### External
- WSJT-X network message definitions (official source code): https://sources.debian.org/src/wsjtx/2.0.1%2Bdfsg-1/NetworkMessage.hpp/
- WSJT-X newer network message header snapshot (2.7 rc series): https://sources.debian.org/src/wsjtx/2.7.0~rc6%2Bdfsg-1~bpo12%2B1/Network/NetworkMessage.hpp/
- Node UDP sockets (`dgram`): https://nodejs.org/api/dgram.html
- N1MM+ UDP broadcast docs: https://n1mmwp.hamdocs.com/setup-help/third-party-software/udp-broadcasts/
- N1MM+ inter-process XML references: https://n1mmwp.hamdocs.com/setup-help/inter-process-communication/

### Repo references
- `/home/fpeebles/coding/HamTabV1/src/state.js:175`
- `/home/fpeebles/coding/HamTabV1/src/live-spots.js:62`
- `/home/fpeebles/coding/HamTabV1/server.js:361`
