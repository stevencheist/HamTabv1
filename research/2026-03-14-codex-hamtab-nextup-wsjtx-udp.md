# HamTab Roadmap Research — Next Up: WSJT-X And Logger UDP

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This should remain lanmode-only and local-first.

The prior research direction is sound:
- UDP listeners in Node for WSJT-X and N1MM+
- normalized in-memory event bus
- bounded ring buffers
- browser delivery through SSE or polling fallback
- strict validation because WSJT-X is binary and N1MM+ is XML-over-UDP

The most important product call is to keep the first slice narrow: decode/status/logged-QSO surfaces only. Source: `planning/codex/wsjtx-udp-findings.md:8-187`

## Recommendation

Implement in this order:
1. WSJT-X UDP listener
2. decode widget and status strip
3. logged-QSO ingestion
4. N1MM+ radio/contact support

## Acceptance Criteria

- WSJT-X traffic is accepted only in lanmode
- parser validates protocol framing and packet size
- UI can render decodes without destabilizing the main spot loop

## Sources

- `ROADMAP.md:37-38`
- `planning/codex/wsjtx-udp-findings.md:8-200`
- `planning/codex/adif-integration-findings.md:146-168`
- `src/live-spots.js`
- `src/state.js`
