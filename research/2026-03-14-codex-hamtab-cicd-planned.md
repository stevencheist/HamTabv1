# HamTab Roadmap Research — Planned: CI/CD

> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed
>
> **Decision recommended:** no

## Summary

This section is intentionally small. It should stay small.

The current roadmap item is a targeted resilience improvement:
- retry transient Cloudflare deploy failures with bounded backoff

That is the right scope. Do not turn this into a generalized CI redesign just because the section is sparse.

## Recommendation

Implement:
- step-level retry around the wrangler deploy step
- bounded attempts
- backoff
- explicit logging that distinguishes transient gateway timeout from deterministic deploy failure

## Acceptance Criteria

- transient 504-style deploy failures do not require manual reruns
- deterministic failures still fail fast and visibly

## Sources

- `ROADMAP.md:90-91`
- deployment workflow files in `.github/workflows/`
