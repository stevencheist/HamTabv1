# Research: DX Cluster Live TCP Connection for HamTab

> **Purpose:** Research prompt for Codex. Findings go to `planning/codex/dx-cluster-tcp-findings.md`.

## Context

HamTab is an amateur radio dashboard (Node.js/Express backend, vanilla JS frontend). It currently gets DX spots via HTTP polling from aggregator APIs (HamQTH DX Cluster API). This adds latency (10+ seconds) and misses spots between polls. A direct TCP connection to a DX cluster node would provide real-time spot flow.

HamTab has two modes: **lanmode** (self-hosted, full network access) and **hostedmode** (Cloudflare Containers — outbound TCP may be restricted). The server already has SSE infrastructure for real-time data push to the browser.

## Research Questions

### 1. DX Cluster Protocol

- What DX cluster software exists? (AR-Cluster, CC Cluster, DXSpider, VE7CC) — document the differences.
- What is the telnet-based protocol? (Connect to host:port, authenticate with callsign, receive spot lines)
- Document the authentication/login flow. Is it always callsign-only, or do some nodes require passwords?
- What is the spot line format? (e.g., `DX de KG5DPV:  14074.0  JA1ABC  FT8 -10dB  1523Z`) — document all fields and their positions.
- What other line types exist? (WWV, WCY, announcements, talk messages, commands)
- What commands can a connected client send? (`SH/DX`, `SET/FILTER`, `SET/QTH`, `BYE`, etc.)
- What is the keepalive/ping behavior? Do clusters disconnect idle clients? After how long?

### 2. Available Public DX Cluster Nodes

- List the major public DX cluster nodes with their hostnames and ports.
- Which are most reliable / highest throughput?
- What are the connection policies? (open to all licensed hams? rate limits? max connections per callsign?)
- Do any nodes support WebSocket connections natively (bypassing the need for TCP)?
- **DX Summit, DXWatch, DXHeat** — do these have streaming APIs (WebSocket, SSE) in addition to their web UIs?

### 3. Server-Side TCP Client in Node.js

- How to implement a persistent TCP client using Node.js `net` module?
- Reconnection strategy — exponential backoff, max retries, failover to alternate nodes?
- How to parse the stream? (line-based protocol — buffer until `\n`, parse each line)
- Spot line parsing — regex or positional parsing? Document the exact column positions.
- How to handle the login sequence? (read banner, send callsign, wait for prompt)
- Memory management — how to cap the in-memory spot buffer? (ring buffer of last N spots, configurable)

### 4. Filtering and Deduplication

- DX clusters can generate hundreds of spots per minute. How to filter server-side?
- Cluster-side filtering: document `SET/FILTER` commands for band, mode, DXCC, etc.
- Client-side deduplication: same callsign + same frequency within N minutes = duplicate?
- How does this interact with HamTab's existing HTTP-polled spots? Merge, replace, or keep both sources?
- Should the user configure which cluster to connect to, or auto-select?

### 5. TCP→Browser Bridge

- HamTab already uses SSE for real-time data. What's the best pattern for TCP→SSE bridging?
- Alternative: WebSocket from browser → server acts as TCP proxy. Pros/cons vs SSE?
- What about Cloudflare Containers (hostedmode) — can they make outbound TCP connections to port 7300/7373? Are there restrictions?
- If hostedmode can't do TCP, should we fall back to HTTP polling there and only use TCP in lanmode?

### 6. Existing Libraries and Projects

- Search npm/GitHub for DX cluster client libraries in JavaScript/Node.js.
- How do other web-based DX cluster tools handle the connection? (DXWatch, DXHeat, DX Summit — do they proxy via their servers, or does the browser connect directly?)
- **VE7CC cluster client** — widely used Windows DX cluster aggregator. Any protocol documentation that would be useful?
- Are there any WebSocket-to-telnet proxy projects specifically for DX clusters?

### 7. Security Considerations

- The cluster connection requires sending the user's callsign. This is not sensitive (callsigns are public), but the configuration should be clear about what's transmitted.
- Should HamTab validate the TLS status of the cluster connection? (Most clusters are plain telnet, not TLS.)
- Rate limiting on reconnects to avoid getting banned from cluster nodes.
- Hostedmode: if TCP is proxied through Cloudflare, are there egress restrictions or costs?

## Output Format

Deliver findings as `planning/codex/dx-cluster-tcp-findings.md` with:
- Section per research question
- Protocol documentation with example sessions (connect → login → receive spots)
- Spot line format with column positions or regex
- Code snippets for TCP client, parser, and SSE bridge
- A "Recommended Implementation Path" section with phased approach
- List of public cluster nodes with connection details
