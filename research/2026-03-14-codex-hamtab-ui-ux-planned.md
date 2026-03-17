# HamTab Roadmap Research — Planned: UI/UX

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This section should focus on reducing configuration friction and increasing operator clarity.

Priority order:
1. named layout profiles
2. config export/import
3. Alert Center
4. accessibility pass
5. visual density modes
6. custom theme builder
7. HamClock compatibility mode
8. i18n

The highest-value items are the ones that make HamTab easier to use every day, not the ones that broaden customization indefinitely.

## Recommendation

Bundle this as:
- operator workflow ergonomics
- configuration portability
- accessibility/readability

Treat theme-builder and i18n as later expansions unless there is strong user pull.

## Acceptance Criteria

- users can save/reload named activity layouts
- config can be moved safely between installs
- alerts and accessibility improvements reduce operational friction without adding heavy UI complexity

## Sources

- `ROADMAP.md:68-76`
- `src/layouts.js`
- `src/grid-layout.js`
- `src/a11y.js`
- `src/config.js`
