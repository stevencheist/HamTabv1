# CLAUDE.md — HamTabV1

## Project Overview

HamTabV1 is a POTA/SOTA amateur radio dashboard. Node.js/Express backend, vanilla JS frontend, Leaflet maps, esbuild bundling.

## Project Goals

- **Two deployment modes** with full feature parity:
  - **Hostedmode** — Cloud-hosted at hamtab.net via Cloudflare Containers. Automated deployment via CI/CD on push.
  - **Lanmode** — Self-hosted on Windows, Linux, or Raspberry Pi. Users download releases and run locally with self-signed TLS.
- **Shared codebase** — All features that apply to both modes live on `main`. Deployment-specific code stays on its branch.
- **Minimal divergence** — Hostedmode contains only what's necessary for Cloudflare (Worker, Dockerfile, KV sync, CI/CD). Lanmode contains only what's necessary for self-hosting (self-signed TLS, CORS restrictions, update checker).

## Architecture

- **Server** (`server.js`) — Stateless API proxy. No database, no sessions. Proxies external amateur radio APIs and serves static files.
- **Client** — IIFE bundle (`public/app.js`) built from ES modules in `src/`. All user state lives in localStorage with `hamtab_` prefix.

## Branch Strategy

```
main ──────────────────────── shared codebase, full feature set
 ├── lanmode                  self-hosted variant (Windows/Linux/Raspberry Pi)
 └── hostedmode               cloud variant (Cloudflare Containers)
```

- **`main`** — Shared codebase. All new features land here first. Both deployment branches merge from `main` to stay current.
- **`lanmode`** — Adds self-hosted code: self-signed TLS, CORS restricted to RFC 1918, GitHub Releases update checker, local admin endpoints. Targets home servers and Raspberry Pi.
- **`hostedmode`** — Adds cloud code: Cloudflare Worker + Container, Workers KV settings sync, Cloudflare Access auth, GitHub Actions CI/CD. Targets hamtab.net. Automated deployment on every push.

**Merge direction:** `main` → `lanmode`, `main` → `hostedmode`. Never merge between deployment branches directly.

## Key Files

**All branches:**

| File | Purpose |
|---|---|
| `server.js` | Express server, API proxy endpoints, lunar math |
| `src/state.js` | Application state object |
| `src/dom.js` | Cached DOM query utility |
| `public/app.js` | Bundled client output — **don't edit directly** |
| `public/index.html` | Semantic HTML structure |
| `public/style.css` | Dark theme, CSS custom properties |
| `esbuild.mjs` | Build config (ES modules → IIFE bundle) |

**Lanmode only:**

| File | Purpose |
|---|---|
| `install.sh` | Linux/Raspberry Pi installer with optional systemd service |
| `install.ps1` | Windows service installer |
| `src/update.js` | GitHub Releases update checker |

**Hostedmode only:**

| File | Purpose |
|---|---|
| `worker.js` | Cloudflare Worker — routes `/api/settings` to KV, proxies to container |
| `wrangler.jsonc` | Cloudflare deployment config — container, KV namespace, routes |
| `Dockerfile` | Container image for Cloudflare Containers |
| `src/settings-sync.js` | Client-side settings sync via Workers KV |
| `.github/workflows/deploy.yml` | CI/CD — auto-deploy on push to hostedmode |

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
- Security: helmet CSP, rate limiting, SSRF prevention
- Never commit `.env`, TLS certs, or wrangler secrets
- Widgets must remain accessible at any window size — responsive reflow on resize

## Commit & Branch Conventions

- Commit messages: imperative mood ("Add X", "Fix Y")
- Match existing style from git log
- **New features** — Develop on `main` or feature branches, then merge to `main`
- **Deployment sync** — After merging to `main`, merge `main` into both `lanmode` and `hostedmode` to maintain feature parity
- **Branch-specific code** — Deployment-specific changes go directly to `lanmode` or `hostedmode`, never to `main`
- **CLAUDE.md edits** — All CLAUDE.md changes go to `main` only, then merge out. Never edit CLAUDE.md directly on deployment branches.

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

**Lanmode updates:**
- Update detection compares local version against the latest GitHub Release tag (via `api.github.com`)
- No git dependency — works with zip downloads, scp deploys, etc.
- GitHub releases must be tagged (e.g. `v0.6.0`) for detection to work
- Client shows version info and links to release page; no auto-download of code

**Hostedmode updates:**
- No in-app update system — deployments are fully automated via GitHub Actions CI/CD
- Every push to `hostedmode` triggers a build and deploy to Cloudflare
- Version displayed as static label for reference only

## Security (Priority)

Security is a top priority. Flag any code that could introduce a vulnerability.

**All branches:**
- **SSRF prevention** — All outbound requests in server.js must resolve the hostname and reject RFC 1918 / loopback IPs before connecting. Whitelist URL path/query params where possible (e.g. SDO image type).
- **No client-side external requests** — All external API calls go through server.js proxy, never from the browser directly.
- **Secrets** — No API keys in client code. Use `.env` for secrets. Never commit `.env`, TLS certs, or wrangler secrets.
- **CSP** — Helmet CSP is enforced. When adding new external resources, proxy them through the server rather than loosening CSP.
- **Rate limiting** — All `/api/` routes are rate-limited.
- **Input validation** — Sanitize and whitelist all user-supplied query params on server endpoints. Use `encodeURIComponent` on the client when building URLs.
- **XSS** — Use `textContent` or DOM APIs to render user/API data. Never inject unsanitized strings via `innerHTML`. The `esc()` utility must be used if HTML insertion is unavoidable.
- **Dependency hygiene** — Keep dependencies minimal. Audit before adding new packages.

**Lanmode-specific:**
- **CORS** — Locked to RFC 1918 private networks only.
- **Self-signed TLS** — Generated automatically for LAN HTTPS.

**Hostedmode-specific:**
- **Cloudflare Access** — Auth handled before requests reach Worker/Container. User identity read from `Cf-Access-Jwt-Assertion` header.
- **No CORS** — Same-origin deployment; CORS headers removed.
- **trust proxy** — `app.set('trust proxy', 1)` required so rate limiter sees real client IPs.
- **HSTS** — Enabled with 1-year max-age. Cloudflare handles TLS termination.
- **Wrangler secrets** — Use `wrangler secret put` for server-side secrets. Never store in `wrangler.jsonc`.

## Working with Claude

Stay on `main` for most work. Use simple commands to manage branches:

| Command | Action |
|---------|--------|
| "status" | Show current branch, sync state, pending changes |
| "pull" | Pull latest changes on current branch |
| "sync branches" | Merge `main` → `lanmode` and `main` → `hostedmode`, push all |
| "switch to [branch]" | Checkout the specified branch |

**Workflow:**
1. Develop features on `main` (90% of work happens here)
2. Say "sync branches" to propagate changes to deployment branches
3. Switch to `lanmode` or `hostedmode` only for branch-specific fixes
4. Start sessions with "status" or "pull and status" to see current state

**When to switch branches:**
- **hostedmode** — Cloudflare-specific fixes (wrangler.jsonc, worker.js, Dockerfile, CI/CD)
- **lanmode** — Self-hosted fixes (install scripts, update checker, CORS config)

## GitHub Issue Communication

When commenting on issues or asking questions of users:

- **Assume non-technical users** — avoid jargon, explain terms if needed, and keep language approachable.
- **Be friendly and appreciative** — thank contributors for suggestions and bug reports.
- **Ask clear, specific questions** — use numbered lists so users can answer point by point.
- **Offer concrete examples** — when asking about preferences, give options rather than open-ended questions.
- **Follow up on implemented features** — when work is done, comment asking the requester to try it and give feedback.
