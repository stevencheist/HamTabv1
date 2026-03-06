# HamTab Hostedmode KiwiSDR WebSocket Proxy Security Research

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-04
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE-v3

## Executive Recommendation
Use a **Container-side WebSocket relay endpoint** (`/api/sdr/proxy`) implemented with `ws` in explicit relay mode, not a generic open proxy library config.

Why:
- HamTab already runs an Express server in container mode and has SSRF primitives (`isPrivateIP`, DNS resolve + pin) that can be reused ([server.js](/home/steve/code/HamTabv1/server.js:3305)).
- Hostedmode auth already exists at Cloudflare Access/service-auth layer ([SERVICE-AUTH.md](/home/steve/code/HamTabv1/SERVICE-AUTH.md:5)).
- Worker-only proxying has tighter per-invocation connection constraints (notably simultaneous outgoing connections) and message-size caveats.

## Current HamTab Risk Context
- Client Kiwi transport is currently direct `ws://{host}:{port}/kiwi/{session}/SND`, which fails from HTTPS hostedmode due to mixed-content policy ([kiwisdr-socket.js](/home/steve/code/HamTabv1/src/cat/transports/kiwisdr-socket.js:77)).
- Existing API limiter is request-based (`/api/`) and does not yet enforce long-lived websocket quotas ([server.js](/home/steve/code/HamTabv1/server.js:67)).
- Existing SSRF controls already block private ranges and DNS-rebind by resolving hostname and connecting to pinned IP for HTTPS fetch paths ([server.js](/home/steve/code/HamTabv1/server.js:3334), [server.js](/home/steve/code/HamTabv1/server.js:3362)).

## 1. Security Model

## Required controls (must-have)
1. Target validation
- Require `host` and optional `port` query params; reject empty or malformed host.
- Restrict port to `8073` (default Kiwi UI/WebSocket port) unless explicitly expanded later.
- Resolve DNS server-side and block private/loopback/link-local/multicast/reserved using existing `isPrivateIP()` logic.
- Connect upstream by resolved IP, but send `Host` header/SNI using original hostname (rebinding defense pattern already used in `secureFetch`).

2. SSRF prevention
- No arbitrary schemes: upstream fixed to `ws://` (or `wss://` if target supports it), never user-supplied scheme.
- No proxy chaining; no user-controlled headers except minimal Kiwi auth fields.
- Reject literal IPs in private/reserved ranges and hostnames resolving to them.

3. Access control
- Hostedmode should require existing Cloudflare Access-authenticated session.
- Do not expose websocket relay endpoint publicly without Access.

4. Session safety limits
- Per-client concurrent websocket sessions (recommended: 1-2).
- Per-target concurrent sessions (recommended: 2-4 per target host:port) to avoid exhausting Kiwi channel slots.
- Hard session TTL (recommended: 30 minutes).
- Idle timeout (recommended: 60 seconds no upstream and no downstream traffic).

5. Backpressure and memory safety
- Bound queued bytes in each direction (recommended: 256 KiB each side).
- On overflow, drop oldest audio frames or close with policy code (1008) + reason.
- Disable per-message compression on relay websockets unless required.

6. Protocol sanity check (lightweight fingerprint)
- Before full relay, expect first text `MSG` metadata patterns from Kiwi (`audio_rate`, `sample_rate`, etc.) within a short window.
- If fingerprint fails, terminate quickly (prevents generic tunnel abuse to arbitrary WS services).

## Should-have controls
- Structured audit log per session: user id, target, duration, bytes up/down, close reason.
- Abuse banlist and cooldown on repeated failed targets/auth.

## Prior-art alignment
- websockify explicitly supports authentication and token-target mapping (token plugin) rather than raw arbitrary passthrough.
- Jupyter Server Proxy allows arbitrary host proxying only with host allowlist (`host_allowlist`).

## 2. Implementation Pattern Recommendation

## Library choice
**Recommended:** `ws` library with manual relay.

Reasoning:
- Transparent binary + text frame handling is straightforward.
- Good primitives for liveness and cleanup (`ping/pong`, `terminate` patterns).
- Can use stream API (`createWebSocketStream`) if needed for tighter backpressure behavior.

**Not recommended for MVP security:** generic `http-proxy` / `http-proxy-middleware` as primary path.
- They are excellent reverse proxies, but for this case they increase chance of accidentally broad proxy behavior unless heavily wrapped.
- Manual relay gives clearer security gates before opening upstream.

## 3. Security Checklist (Implementation Gate)

| Check | Requirement | Status target |
|---|---|---|
| Auth gate | Access-authenticated hostedmode only | Required |
| Host validation | FQDN only (or vetted literal IP), length + charset checks | Required |
| DNS pinning | Resolve before connect; connect pinned IP; reject private IPs | Required |
| Port policy | 8073-only initially | Required |
| Session limits | Per-user and per-target caps | Required |
| TTL/idle timeout | 30m hard cap, 60s idle | Required |
| Backpressure cap | 256 KiB per direction max | Required |
| Protocol fingerprint | Kiwi `MSG` handshake heuristic | Required |
| Logging | User/target/duration/bytes/close code | Required |
| Error hygiene | No upstream internals leaked to client | Required |

## 4. Claude-Ready Implementation Sketch

```js
// server-side sketch (container)
// npm add ws

const { WebSocketServer, WebSocket } = require('ws');
const dns = require('dns');

const sdrLimits = {
  perClientMax: 2,
  perTargetMax: 4,
  idleMs: 60_000,
  ttlMs: 30 * 60_000,
  maxBufferedBytes: 256 * 1024,
};

function validateTarget(host, port) {
  if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) throw new Error('invalid host');
  const p = Number(port || 8073);
  if (p !== 8073) throw new Error('port not allowed');
  return { host, port: p };
}

async function resolveAndGuard(host) {
  const { address } = await dns.promises.lookup(host);
  if (isPrivateIP(address)) throw new Error('private target blocked');
  return address;
}

function connectUpstream({ host, ip, port }) {
  // Connect pinned IP but preserve host via headers for Kiwi vhost setups.
  return new WebSocket(`ws://${ip}:${port}/kiwi/${rand4()}/SND`, {
    headers: { Host: host },
    perMessageDeflate: false,
  });
}

function relayBidirectional(clientWs, upstreamWs, counters) {
  clientWs.on('message', (data, isBinary) => {
    if (upstreamWs.readyState !== WebSocket.OPEN) return;
    if (upstreamWs.bufferedAmount > sdrLimits.maxBufferedBytes) return clientWs.close(1008, 'upstream backpressure');
    upstreamWs.send(data, { binary: isBinary });
    counters.up += data.length || 0;
  });

  upstreamWs.on('message', (data, isBinary) => {
    if (clientWs.readyState !== WebSocket.OPEN) return;
    if (clientWs.bufferedAmount > sdrLimits.maxBufferedBytes) return clientWs.close(1008, 'client backpressure');
    clientWs.send(data, { binary: isBinary });
    counters.down += data.length || 0;
  });
}

function attachLifecycle(clientWs, upstreamWs, closeAll, timers) {
  const heartbeat = setInterval(() => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.ping();
    if (upstreamWs.readyState === WebSocket.OPEN) upstreamWs.ping();
  }, 30_000);

  timers.push(
    setTimeout(() => closeAll(1000, 'session ttl'), sdrLimits.ttlMs),
    heartbeat,
  );

  clientWs.on('close', () => closeAll(1000, 'client closed'));
  upstreamWs.on('close', () => closeAll(1011, 'upstream closed'));
  clientWs.on('error', () => closeAll(1011, 'client error'));
  upstreamWs.on('error', () => closeAll(1011, 'upstream error'));
}
```

## Integration points in HamTab
- Add websocket upgrade route near server bootstrap path (`server.js`).
- Reuse SSRF helpers (`isPrivateIP`, `resolveHost` patterns) ([server.js](/home/steve/code/HamTabv1/server.js:3305), [server.js](/home/steve/code/HamTabv1/server.js:3334)).
- Extend existing limiter concept with websocket-session counters ([server.js](/home/steve/code/HamTabv1/server.js:67)).
- Client-side: hostedmode Kiwi endpoint becomes `wss://hamtab.net/api/sdr/proxy?...`; lanmode keeps direct `ws://` path.

## 5. Resource Estimate

## Kiwi stream bandwidth (practical estimate)
Evidence:
- Kiwi `SND` frames include a 7-byte header (`flags+seq+smeter`) plus continuous audio payload.
- Kiwi protocol supports compressed and uncompressed audio modes (`SET compression=1/0`).

Inference (implementation planning estimate):
- Compressed mono stream: roughly **8-25 kbps** typical range.
- Uncompressed mono 16-bit stream at common SDR audio rates can be **~96-192 kbps** plus framing overhead.
- Planning envelope: **20-200 kbps per session** (2.5-25 KB/s), depending on compression and server rate.

## Hostedmode capacity implications
- Container limits are instance-type dependent (e.g., `lite` 256 MiB, `basic` 1 GiB, `standard-1` 4 GiB).
- Worker limits relevant if proxy is moved to Worker tier: 6 simultaneous outgoing connections per invocation; outbound WS counts toward this; Worker memory per isolate 128 MB.

Practical MVP sizing (container proxy):
- Start with **max 50 concurrent sessions per container instance** only if compression stays enabled and queue caps are strict.
- Safer initial cap: **20-30 concurrent sessions** pending real telemetry.

## 6. Alternative Approaches

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Container-side secure proxy (recommended) | Full control, reuse SSRF/rate-limit patterns, fewer Worker platform constraints | Must implement and maintain WS relay hardening | **Go** |
| Worker-level websocket proxy | Native edge entrypoint, no extra container endpoint surface | Worker message/connection limits and more complex coordination for global throttles | **Conditional (phase 2)** |
| WSS-only Kiwi filter | Minimal backend work; pure client path for secure-capable targets | Most public Kiwi entries are still `http://` URLs (receiver listings heavily skew HTTP); large feature loss | **Partial fallback only** |
| Defer feature on hostedmode | Zero security risk now | Hostedmode SDR feature broken for majority of users | **Not recommended** |

## Evidence on wss-only viability
- Receiver listing sample (`receiverbook` Kiwi map snapshot) shows strong dominance of `http://` URLs over `https://` URLs.
- At least some HTTPS Kiwi hosts do accept websocket upgrade (`101 Switching Protocols`) on `/kiwi/.../SND`, but availability is inconsistent.

Conclusion: `wss-only` can be offered as optimization/fallback, not primary hostedmode strategy.

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Open relay abuse / SSRF | Critical | Strict host/port validation + DNS pinning + private-IP deny + Access auth |
| Upstream Kiwi overload | High | Per-target concurrency caps + short idle timeout + operator-friendly defaults |
| Memory growth under slow clients | High | Buffered-amount caps + close-on-overflow + disable unnecessary compression |
| Cross-instance limit bypass | Medium | Keep conservative per-instance caps; if needed move global counters to hostedmode-only Worker/DO/KV |
| Protocol drift in Kiwi variants | Medium | Lightweight fingerprint + permissive parse + fail closed on unknown handshake failure |

## 8. Specific Answers to Prompt Questions

1. Can browser bypass mixed-content for user-initiated `ws://` from HTTPS?
- No practical/portable bypass. Standards/security guidance treats this as mixed-content risk; modern browsers strongly prefer or enforce secure websocket usage.

2. Can Kiwi be told to stop audio entirely and only keep control/S-meter?
- No clear authoritative command found in reviewed client/protocol sources. `SET compression` changes payload form, not stream class. Current evidence suggests SND path remains continuous audio-bearing transport.

3. Should proxy require auth?
- Yes on hostedmode. Reuse existing Cloudflare Access/service-auth posture.

## 9. Recommended Rollout

1. Phase 1
- Implement container proxy with mandatory security checklist controls.
- Enable for hostedmode only.
- Keep hard low caps and verbose metrics.

2. Phase 2
- Add adaptive per-target quotas and abuse lockouts.
- Add optional `wss-direct` fast path for secure-capable servers.

3. Phase 3
- Reassess Worker-level proxy only if latency/cost data justifies migration.

## Sources

### Internal
- [kiwisdr-socket.js](/home/steve/code/HamTabv1/src/cat/transports/kiwisdr-socket.js:77)
- [connection-orchestrator.js](/home/steve/code/HamTabv1/src/cat/connection-orchestrator.js:65)
- [server.js](/home/steve/code/HamTabv1/server.js:67)
- [server.js](/home/steve/code/HamTabv1/server.js:3305)
- [server.js](/home/steve/code/HamTabv1/server.js:3334)
- [SERVICE-AUTH.md](/home/steve/code/HamTabv1/SERVICE-AUTH.md:5)

### External
- MDN WebSocket client guide (mixed-content/wss note): https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
- MDN mixed content: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers WebSockets API: https://developers.cloudflare.com/workers/runtime-apis/websockets/
- Cloudflare Containers limits and instance types: https://developers.cloudflare.com/containers/platform-details/limits/
- Cloudflare Containers websocket example: https://developers.cloudflare.com/containers/examples/websocket/
- `ws` library docs: https://github.com/websockets/ws
- node-http-proxy docs: https://github.com/http-party/node-http-proxy
- http-proxy-middleware docs: https://github.com/chimurai/http-proxy-middleware
- websockify (noVNC) README: https://github.com/novnc/websockify
- Jupyter Server Proxy host allowlist pattern: https://jupyter-server-proxy.readthedocs.io/en/latest/arbitrary-ports-hosts.html
- Kiwi client protocol reference (unofficial but primary implementation source): https://github.com/jks-prv/kiwiclient/blob/master/kiwi/client.py
- Receiver discovery sample (Kiwi): https://www.receiverbook.de/map?type=kiwisdr

## Lane Note
Implementation should be routed to Claude.
