# HamTab Roadmap Research — Planned: Hardware Integration

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This section should build outward from the current CAT/TCI foundation rather than broadening protocol count first.

Priority order:
1. click-to-tune
2. hamlib/flrig lanmode bridge
3. panadapter / spectrum scope

Click-to-tune is the immediate product win because it closes the loop between spots and rig control. The others are larger integration surfaces.

## Recommendation

Keep the next slice narrow:
- make spot -> rig frequency transfer reliable and safe
- then add adapter bridges
- then tackle panadapter complexity

## Acceptance Criteria

- click-to-tune respects existing rig safety controls
- lanmode bridges are clearly isolated from hostedmode
- panadapter work is treated as a larger subsystem, not a quick add-on

## Sources

- `ROADMAP.md:63-66`
- `src/on-air-rig.js`
- `src/cat/`
- `src/spots.js`
