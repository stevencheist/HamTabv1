# HamTab Roadmap Research — Planned: Map And Visualization

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This section is attractive, but it should be sequenced by operator value and rendering cost.

Recommended order:
1. azimuthal projection
2. CQ/ITU overlays
3. aurora overlay
4. satellite sky plot
5. earthquake overlay
6. lunar/EME planning

The first two directly support operating decisions. The rest are useful, but easier to let drift into “cool overlay” territory.

## Recommendation

Treat this as two waves:
- operator-centric overlays and projections
- specialty/science overlays

Do not add multiple expensive overlays before the rendering-performance work in the roadmap is underway.

## Acceptance Criteria

- new overlays have explicit toggle/state ownership
- rendering cost is bounded and does not regress live map behavior
- at least the first wave improves operating decisions rather than adding novelty only

## Sources

- `ROADMAP.md:55-62`
- `src/map-init.js`
- `src/map-overlays.js`
- `src/satellites.js`
- `src/lunar.js`
