# HamTab Roadmap Research — Planned: Performance And Rendering

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This is one of the highest-value roadmap sections because it supports almost every future feature.

The right framing is:
- diff/patch map and overlay updates first
- table/log virtualization second
- worker/off-main-thread rendering third

The roadmap already points at the correct targets. The important thing is to avoid treating them as independent optimizations.

## Recommendation

Priority order:
1. marker diff engine
2. logbook overlay delta rendering
3. virtualized table rows
4. requestAnimationFrame batching / overlap resolution
5. worker-based heatmap rasterization
6. adaptive geodesic quality

## Acceptance Criteria

- live map updates avoid full clear/rebuild in hot paths
- large tables do not fully render all rows
- heavy heatmap work can move off the main thread
- future overlay growth does not cause repeated full-repaint regressions

## Sources

- `ROADMAP.md:78-84`
- `src/live-spots.js`
- `src/markers.js`
- `src/logbook.js`
- `src/wspr-heatmap.js`
- `src/rel-heatmap.js`
