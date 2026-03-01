# Research: WSJT-X and Logger UDP Integration for HamTab (Lanmode)

> **Purpose:** Research prompt for Codex. Findings go to `planning/codex/wsjtx-udp-findings.md`.

## Context

HamTab is an amateur radio dashboard (Node.js/Express backend, vanilla JS frontend). In **lanmode** (self-hosted on LAN), it has direct network access to other amateur radio software running on the same machine or LAN. WSJT-X, JTDX, and logging programs like N1MM+ and Log4OM broadcast UDP datagrams with decode data, logged QSOs, and rig status. Ingesting these would make HamTab a live companion display during FT8/FT4/contest operation.

The server is stateless (no database). Real-time data would be held in memory and pushed to the browser via Server-Sent Events (SSE) or polling — HamTab already uses SSE for other real-time data.

## Research Questions

### 1. WSJT-X UDP Protocol

- Document the WSJT-X UDP message protocol. What port does it broadcast on (default 2237)?
- What message types exist? (Heartbeat, Status, Decode, Clear, QSOLogged, Close, Replay, HaltTx, FreeText, WSPRDecode, Location, LoggedADIF, HighlightCallsign, SwitchConfiguration, Configure)
- For each message type: what fields are included, what data types (QInt32, QUtf8, QFloat64, QColor, etc.), and which are most useful for a dashboard?
- How is the binary format structured? (Qt QDataStream serialization — magic number, schema version, message type, then type-specific payload)
- Is there an existing JS/Node parser for WSJT-X UDP messages? Search npm and GitHub.
- What about JTDX — does it use the same protocol, or a variant?

### 2. N1MM+ UDP Broadcast

- Document N1MM+'s UDP broadcast protocol. What ports and message format?
- N1MM+ broadcasts XML datagrams — what are the message types? (RadioInfo, ContactInfo, ContactReplace, ContactDelete, LookupInfo, ScoreInfo, etc.)
- Which messages are most useful for a dashboard? (likely RadioInfo for frequency/mode, ContactInfo for logged QSOs)
- What's the XML schema for each useful message type?
- Is there an existing JS/Node parser for N1MM+ UDP?

### 3. Log4OM UDP Interface

- Does Log4OM broadcast UDP? If so, what format and port?
- Are there other popular loggers that broadcast UDP? (DXKeeper, ACLog, MacLoggerDX)
- Document any common patterns across loggers.

### 4. Implementation Architecture

Given HamTab's architecture (Express server, SSE to browser, no database):
- How should the server listen for UDP? (`dgram` module — what's the setup for listening on a configurable port?)
- How to handle the Qt QDataStream binary format in Node.js? (Is there a library, or do we need to write a manual binary parser with `Buffer.readUInt32BE` etc.?)
- What's the data flow? `UDP datagram → parse → in-memory store → SSE push → browser widget`
- How should multiple UDP sources coexist? (WSJT-X on port 2237, N1MM+ on port 12060, etc.)
- Should there be a configuration UI for enabling/disabling each UDP listener and setting ports?
- What about multicast vs. unicast? Does WSJT-X support both? Does it matter for same-machine use?

### 5. Browser Widget Design

- What should a "WSJT-X Decodes" widget show? (scrolling list of decodes with UTC, dB, DT, Freq, Message, highlighting CQ calls)
- How do GridTracker and JTAlert display this data?
- Should decoded callsigns auto-populate the spot map? (plot FT8 decodes as markers)
- What about a band activity heatmap from decode data (frequency vs. time)?
- How should logged QSOs from WSJT-X/N1MM+ flow into the ADIF log viewer (if we build one)?

### 6. Security Considerations

- UDP listeners on 0.0.0.0 vs. 127.0.0.1 — what's the right default for lanmode?
- Should there be any validation on incoming UDP packets? (check magic number, reject malformed)
- Rate limiting — could a flood of UDP packets overwhelm the server? What's a reasonable packet rate for WSJT-X? (decodes come in bursts every 15s for FT8)
- This is lanmode-only — hostedmode should not expose UDP listeners. How to gate this cleanly?

## Output Format

Deliver findings as `planning/codex/wsjtx-udp-findings.md` with:
- Section per research question
- Binary format documentation with byte offsets where possible
- Code snippets for UDP listener setup and message parsing
- A "Recommended Implementation Path" section with phased approach
- Links to primary sources (WSJT-X source code, N1MM+ documentation)
