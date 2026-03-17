# HamTab Roadmap Research — Planned: Platform And Architecture

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This section is architectural debt payoff and should happen before too many more subsystems pile onto `server.js` and ad hoc client state.

Priority order:
1. decompose `server.js`
2. formalize client-state schema versioning and migrations

Those two changes improve every later roadmap item.

## Recommendation

Treat this as a platform stabilization pass:
- route/service decomposition on the server
- migration registry and subsystem-safe resets on the client

Do not keep adding features to the current monolith if these remain undone.

## Acceptance Criteria

- major server concerns are separated into routers/services
- client state has explicit schema versioning and declarative migrations
- “clear broken config” becomes subsystem-scoped rather than all-or-nothing

## Sources

- `ROADMAP.md:86-89`
- `server.js`
- `src/state.js`
- `src/migration.js`
