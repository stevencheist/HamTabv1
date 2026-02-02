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
- **Algorithm citations** — When implementing a published algorithm (e.g. Meeus, SGP4), cite the source and chapter/table in a block comment above the function
- **Magic numbers** — Numeric literals that aren't self-evident must have an inline comment with units and meaning (e.g. `5000 // ms — ISS position refresh`)
- **Non-obvious state** — State fields whose name alone doesn't convey purpose need an inline comment (e.g. `zCounter: 10, // next z-index for widget stacking`)
- **Ambiguous names** — If a variable could be confused with another concept (e.g. `pi` meaning parallax, not π), rename it or add a clarifying comment

## Code Conventions

- Vanilla JavaScript, no frameworks
- ES modules in `src/`, bundled to IIFE via esbuild
- localStorage keys use `hamtab_` prefix
- Server is stateless — no database, no sessions
- Security: helmet CSP, CORS restricted to RFC 1918 IPs, rate limiting
- Never commit `.env` or TLS certs
- Widgets must remain accessible at any window size — responsive reflow on resize

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
- New functions, intervals, and state fields must include comments per the Commenting Style rules above (citations, magic numbers, purpose)

## Versioning & Updates

- Version lives in `package.json` and is injected at build time via esbuild `define`
- Bump `version` in `package.json` on every push: patch for fixes, minor for features
- Rebuild (`npm run build`) after bumping to update the client bundle
- Update detection compares `package.json` version against the latest GitHub Release tag (via `api.github.com`)
- No git dependency — works with zip downloads, scp deploys, etc.
- GitHub releases must be tagged (e.g. `v0.6.0`) for detection to work
- Client shows version info and links to release page; no auto-download of code

## Security (Priority)

Security is a top priority. Flag any code that could introduce a vulnerability.

- **SSRF prevention** — All outbound requests in server.js must resolve the hostname and reject RFC 1918 / loopback IPs before connecting. Whitelist URL path/query params where possible (e.g. SDO image type).
- **No client-side external requests** — All external API calls go through server.js proxy, never from the browser directly.
- **Secrets** — No API keys in client code. Use `.env` for secrets. Never commit `.env` or TLS certs.
- **CSP** — Helmet CSP is enforced. When adding new external resources, proxy them through the server rather than loosening CSP.
- **CORS** — Locked to RFC 1918 private networks only.
- **Rate limiting** — All `/api/` routes are rate-limited.
- **Input validation** — Sanitize and whitelist all user-supplied query params on server endpoints. Use `encodeURIComponent` on the client when building URLs.
- **XSS** — Use `textContent` or DOM APIs to render user/API data. Never inject unsanitized strings via `innerHTML`. The `esc()` utility must be used if HTML insertion is unavoidable.
- **Dependency hygiene** — Keep dependencies minimal. Audit before adding new packages.

## GitHub Issue Communication

When commenting on issues or asking questions of users:

- **Assume non-technical users** — avoid jargon, explain terms if needed, and keep language approachable.
- **Be friendly and appreciative** — thank contributors for suggestions and bug reports.
- **Ask clear, specific questions** — use numbered lists so users can answer point by point.
- **Offer concrete examples** — when asking about preferences, give options rather than open-ended questions.
- **Follow up on implemented features** — when work is done, comment asking the requester to try it and give feedback.
