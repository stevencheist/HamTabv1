# HamTab Roadmap Research — Next Up: DX Cluster Live TCP + RBN

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This is still a strong next feature, but it should be framed as:
- lanmode-first TCP ingest
- SSE or bounded poll bridge to the browser
- hostedmode fallback to existing HTTP feed
- RBN as an extension of the same streaming ingest architecture, not a separate one-off

HamTab already has prior focused research here, and it still holds up. The main execution rule is to keep the telnet/TCP client server-side, bounded, and reconnect-safe. Existing planning research already recommends `node:net`, ring buffers, reconnect backoff, and SSE/poll fallback. Source: `planning/codex/dx-cluster-tcp-findings.md:8-205`

## Recommendation

Implement in this order:
1. server-side TCP client and parser for DX cluster lines
2. normalized live source state plus bounded buffer
3. browser feed via SSE with polling fallback
4. RBN on the same ingest pipeline

## Acceptance Criteria

- lanmode can ingest DX cluster spots over persistent TCP
- hostedmode degrades cleanly to HTTP polling
- RBN reuses the same normalization/buffering path rather than creating a second live-stack architecture

## Sources

- `ROADMAP.md:34-35`
- `planning/codex/dx-cluster-tcp-findings.md:8-205`
- `planning/codex/wspr-rbn-findings.md:8-167`
- `server.js`
- `src/live-spots.js`
