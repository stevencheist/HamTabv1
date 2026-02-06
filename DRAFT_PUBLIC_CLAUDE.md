# CLAUDE.md — HamTabV1

## Project Overview

HamTabV1 is a POTA/SOTA amateur radio dashboard. Node.js/Express backend, vanilla JS frontend, Leaflet maps, esbuild bundling.

## Project Goals

- **Two deployment modes** with full feature parity:
  - **Hostedmode** — Cloud-hosted at hamtab.net via Cloudflare Containers
  - **Lanmode** — Self-hosted on Windows, Linux, or Raspberry Pi
- **Shared codebase** — Features that work in both modes live on `main`
- **Beginner-friendly, expert-capable** — Approachable for new hams, powerful for experienced operators

## Architecture

- **Server** (`server.js`) — Stateless API proxy. No database, no sessions.
- **Client** — IIFE bundle (`public/app.js`) built from ES modules in `src/`. User state in localStorage with `hamtab_` prefix.

## Branch Structure

```
main ──────────────────────── shared code only
 ├── lanmode                  self-hosted variant
 └── hostedmode               cloud variant (Cloudflare)
```

- `main` → shared features, merges to both deployment branches
- `lanmode` → self-signed TLS, update checker, CORS restrictions
- `hostedmode` → Cloudflare Worker, KV sync, CI/CD

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express server, API proxy endpoints |
| `src/state.js` | Application state object |
| `public/app.js` | Bundled client — don't edit directly |
| `public/index.html` | HTML structure |
| `public/style.css` | Dark theme, CSS custom properties |
| `esbuild.mjs` | Build config |

## Code Conventions

- Vanilla JavaScript, no frameworks
- ES modules in `src/`, bundled via esbuild
- localStorage keys: `hamtab_` prefix
- Server is stateless — no database, no sessions
- Widgets must be responsive at any window size

## Commenting Style

- JS sections: `// --- Section Name ---`
- CSS sections: `/* ---- Section Name ---- */`
- Comments explain **why**, not what
- Cite algorithm sources (e.g. Meeus, SGP4)
- Document magic numbers with units

## Commit Messages

- Imperative mood ("Add X", "Fix Y")
- Include mode indicator:
  - `"Add feature (shared)"` — on main
  - `"Add feature (lanmode)"` — lanmode-only
  - `"Add feature (hostedmode)"` — hostedmode-only

## Versioning

- Version in `package.json`, injected at build time
- Bump on every push: patch for fixes, minor for features
- Rebuild (`npm run build`) after bumping

## Security Principles

- SSRF prevention on all outbound requests
- No client-side external API calls — proxy through server
- Secrets in `.env` only, never committed
- Helmet CSP enforced
- Rate limiting on `/api/` routes
- XSS prevention: use `textContent`, never raw `innerHTML`

## Privacy

- Data minimization — collect only what's necessary
- No tracking, analytics, or telemetry
- No cookies — localStorage only
- PII encrypted before transmission (feedback system)
- GDPR compliant — users can request deletion

## User Guide

Documentation lives in `docs/user-guide/`. Build with `npm run build:docs`.

Every user-facing feature requires documentation updates before it's complete.
