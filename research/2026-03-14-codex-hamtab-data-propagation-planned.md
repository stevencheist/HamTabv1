# HamTab Roadmap Research — Planned: Data And Propagation

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This section should be executed as one coherent data-plane improvement pass, not as isolated widgets.

The highest-value items are:
- centralized fetch scheduler
- SSE feed channel in lanmode with HTTP fallback
- Band Opportunity Score
- WSPR/PSK vs VOACAP comparison

Those four create the backbone that the smaller feeds/widgets should sit on.

## Recommendation

Priority order:
1. centralized fetch scheduler
2. SSE feed channel with hostedmode fallback
3. Band Opportunity Score
4. WSPR/PSK vs VOACAP comparison
5. SSN/foF2 correction and the smaller content feeds

The scheduler and push path matter first because the rest of this section increases polling pressure and freshness expectations.

## Acceptance Criteria

- fetch cadence is centralized and budgeted
- lanmode can push low-latency feed updates without repeated full polling loops
- score/comparison widgets use normalized existing data instead of bespoke fetch logic

## Sources

- `ROADMAP.md:42-53`
- `planning/codex/wspr-rbn-findings.md:97-167`
- `src/refresh.js`
- `src/live-spots.js`
- `src/voacap.js`
- `src/band-conditions.js`
