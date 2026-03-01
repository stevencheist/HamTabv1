# DX Cluster TCP Findings — Research

> **For:** Claude (via Francisco)
> **From:** Codex
> **Date:** 2026-03-01
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE-v3

## Summary
DX cluster ingestion over telnet/TCP is practical for lanmode and can materially reduce latency versus HTTP polling. The safest implementation is a server-side TCP client (`node:net`) with bounded ring buffer, reconnect backoff, and optional per-node failover, then bridge to browser via SSE (new endpoint) or existing polling fallback. Public nodes are available and documented (including VE7CC-indexed clusters), but connection policies vary by node and operators should expect callsign login plus possible local policy enforcement. For hostedmode, outbound raw TCP support should be treated as environment-dependent and feature-gated behind runtime capability checks.

## 1. DX Cluster Protocol

### Cluster software families
- **DXSpider**: open-source cluster node software with documented command set and telnet user model.
- **AR-Cluster / CC Cluster**: commonly deployed cluster software families seen in public node listings.
- **VE7CC**: widely used client/aggregator and node directory source, not itself the dominant on-air server protocol spec.

### Session flow (typical)
1. TCP connect to host:port (often 23, 7300, or 7373).
2. Receive banner/login prompt.
3. Send callsign line (and optional password where required).
4. Receive spot/announcement/control lines continuously.
5. Send optional commands (`SH/DX`, `SET/FILTER`, `SET/NAME`, `BYE`, etc.).

### Spot line format
Common line pattern (human-readable telnet text):
- `DX de <spotter>: <freq> <dxcall> <comment> <time>Z`

Practical parser strategy:
- Parse as line-oriented text stream.
- Detect `^DX de\s+` spot lines.
- Extract fields via regex + cleanup fallback:
  - spotter
  - frequency (kHz)
  - dx callsign
  - comment/note
  - UTC time token

### Non-spot lines to handle
- WWV/WCY (solar/geomagnetic bulletins)
- Admin announcements
- User talk/chat lines
- Command responses/errors

### Keepalive
- Idle timeout behavior varies by node operator policy.
- Implement client keepalive command (configurable, e.g. periodic benign command) only when required by specific node behavior.

## 2. Public DX Cluster Nodes

### Known public directory sources
- VE7CC directory/listing pages provide large lists of active nodes and ports.

### Example nodes commonly referenced
- `dxc.ve7cc.net:23`
- `dxc.nc7j.com:7373`
- `ve7cc.net:23`

Notes:
- Availability/throughput changes over time; node selection should be user-configurable with defaults.
- Some nodes allow open callsign login; others enforce policy (password, registration, connection caps).

### DX Summit / DXWatch / DXHeat streaming APIs
- I did not find official, public, stable streaming API docs (WebSocket/SSE) from these providers in primary documentation.
- Treat these as web/app services unless explicit API docs are provided by operator.

## 3. Server-Side TCP Client in Node.js

### Core approach
Use `node:net` to manage one persistent socket per enabled cluster source.

```js
import net from 'node:net';

function connectCluster(cfg, onLine) {
  let sock;
  let buf = '';

  const open = () => {
    sock = net.createConnection({ host: cfg.host, port: cfg.port }, () => {
      sock.write(`${cfg.callsign}\n`);
    });

    sock.setEncoding('utf8');
    sock.on('data', (chunk) => {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).replace(/\r$/, '');
        buf = buf.slice(idx + 1);
        onLine(line);
      }
    });

    sock.on('error', () => {});
    sock.on('close', () => scheduleReconnect());
  };

  let retryMs = 1000;
  function scheduleReconnect() {
    setTimeout(() => { open(); retryMs = Math.min(retryMs * 2, 60000); }, retryMs);
  }

  open();
  return () => sock?.destroy();
}
```

### Reconnect/failover
- Exponential backoff with jitter.
- Max retry window + alert state for UI.
- Optional failover list (`primary -> secondary -> tertiary`).

### Buffer/memory control
- Keep ring buffer of most recent N parsed spots (`N` configurable, e.g. 2,000).
- Keep raw line buffer bounded and drop oversize malformed lines.

## 4. Filtering and Deduplication

### Cluster-side filtering
- Prefer server-issued filter commands per node software when supported.
- Keep filter templates by use case (band/mode/DXCC).

### App-side deduplication
Recommended fingerprint:
- `normalizedCall + roundedFreq(100 Hz) + modeGuess + minuteBucket`
- TTL bucket: 3-5 minutes.

### Interaction with existing HTTP DX feed
- **Lanmode**: default to TCP live feed, optional HTTP fallback.
- **Hostedmode**: keep HTTP feed as default until TCP capability confirmed.
- Maintain source tag (`dxc_tcp`, `dxc_http`) for user-visible provenance and debugging.

## 5. TCP -> Browser Bridge

### Recommendation
Use SSE for one-way spot push (server -> browser) and keep existing polling as fallback.

```js
// Express SSE endpoint
app.get('/api/spots/dxc/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client = { id: Date.now(), res };
  dxcClients.add(client);

  req.on('close', () => dxcClients.delete(client));
});

function broadcastSpot(spot) {
  const payload = `data: ${JSON.stringify(spot)}\n\n`;
  for (const c of dxcClients) c.res.write(payload);
}
```

### SSE vs WebSocket
- SSE advantages: simpler server, native reconnect behavior in browser, adequate for one-way spot stream.
- WebSocket only needed if browser must issue live control commands over same channel.

### Hostedmode feasibility
- Treat outbound raw TCP as **capability-tested**, not assumed.
- On boot: attempt test connect to configured node with short timeout.
- If unsupported: log + auto-fallback to HTTP DX endpoint.

## 6. Existing Libraries and Projects

### Node options
- Base runtime `node:net` is sufficient and lowest risk.
- No clear dominant, actively maintained Node DX cluster client surfaced as de-facto standard.

### Practical recommendation
- Build a thin in-repo parser/connector around `net`.
- Keep parser unit-tested with recorded line fixtures from multiple nodes.

## 7. Security Considerations
- Callsign is public but still explicitly disclose transmission to third-party node in UI.
- Treat all inbound telnet lines as untrusted text (escape before rendering).
- Implement reconnect rate limit/backoff to avoid node bans.
- Provide strict outbound host allowlist for hostedmode/lanmode service configuration.

## Recommended Implementation Path

### Phase 1 (lanmode MVP)
1. Add `DXClusterClient` service using `node:net`.
2. Parse only `DX de` lines to normalized spot objects.
3. Add bounded ring buffer + dedup cache.
4. Expose `/api/spots/dxc/live` polling endpoint (simple first cut).

### Phase 2
1. Add `/api/spots/dxc/stream` SSE endpoint.
2. Add browser EventSource client with reconnect + fallback to polling.
3. Add per-node config UI (host, port, callsign, enabled).

### Phase 3 (hostedmode hardening)
1. Runtime TCP capability detection.
2. Auto-fallback to existing HTTP DX source.
3. Optional multi-node failover policy + health telemetry.

## HamTab Codebase Fit Notes
- Current DX source is HTTP proxy endpoint (`/api/spots/dxc`), not raw TCP ingest: `/home/fpeebles/coding/HamTabV1/server.js:361`.
- Current live UI patterns are polling-based; no existing SSE endpoint found in this codebase: `/home/fpeebles/coding/HamTabV1/src/live-spots.js:62`.
- State model already supports source-specific data arrays/filters and can absorb a `dxcLive` source variant: `/home/fpeebles/coding/HamTabV1/src/state.js:77`.

## Sources

### External
- Node TCP sockets (`net`): https://nodejs.org/api/net.html
- DXSpider command reference and user docs: https://wiki.dxcluster.org/wiki/Command_reference
- DXSpider project/docs hub: https://wiki.dxcluster.org/wiki/Main_Page
- VE7CC public node directory/listing: https://www.ve7cc.net/cluster/newconnectednodes.htm
- VE7CC dxcluster portal: https://www.dxsummit.fi/#/dxcluster

### Repo references
- `/home/fpeebles/coding/HamTabV1/server.js:361`
- `/home/fpeebles/coding/HamTabV1/src/live-spots.js:62`
- `/home/fpeebles/coding/HamTabV1/src/state.js:77`
