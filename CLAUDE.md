# CLAUDE.md — HamTabV1

## Project Overview

HamTabV1 is a POTA/SOTA amateur radio dashboard. Node.js/Express backend, vanilla JS frontend, Leaflet maps, esbuild bundling. Designed for LAN-only deployment with self-signed TLS.

## Architecture

- **Server** (`server.js`) — Stateless API proxy. No database, no sessions. Proxies external amateur radio APIs and serves static files.
- **Client** — IIFE bundle (`public/app.js`) built from ES modules in `src/`. All user state lives in localStorage with `hamtab_` prefix.
- **Deployment** — LAN-only with self-signed TLS certs.

## Key Files

| File | Purpose |
|---|---|
| `server.js` | Express server, API proxy endpoints, lunar math |
| `src/state.js` | Application state object |
| `src/dom.js` | Cached DOM query utility |
| `public/app.js` | Bundled client output — **don't edit directly** |
| `public/index.html` | Semantic HTML structure |
| `public/style.css` | Dark theme, CSS custom properties |
| `esbuild.mjs` | Build config (ES modules → IIFE bundle) |

## Commenting Style

- JS section headers: `// --- Section Name ---`
- CSS section headers: `/* ---- Section Name ---- */`
- Inline comments explain **why**, not what
- No JSDoc — use simple inline comments
- Include context for complex logic (API rate limits, math algorithms, etc.)

## Code Conventions

- Vanilla JavaScript, no frameworks
- ES modules in `src/`, bundled to IIFE via esbuild
- localStorage keys use `hamtab_` prefix
- Server is stateless — no database, no sessions
- Security: helmet CSP, CORS restricted to RFC 1918 IPs, rate limiting
- Never commit `.env` or TLS certs

## Commit & Branch Conventions

- Commit messages: imperative mood ("Add X", "Fix Y")
- Match existing style from git log
- PRs target `main` branch
- Feature work on named branches

## Code Quality

- No unused variables or dead code
- Error handling at API boundaries (try/catch with appropriate HTTP status)
- Keep server.js endpoints consistent in error response format
- Test changes by running `npm start` and verifying in browser

## API & Security Guidelines

- All external API calls go through server.js proxy — never from client directly
- No API keys in client code — use `.env` for secrets
- Rate limiting on all `/api/` routes
- CORS locked to private networks
