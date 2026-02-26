# CLAUDE.md — HamTabV1

## Instruction Routing

This file is for **project-specific** instructions — architecture, code conventions, branch strategy, file locations, widgets, security rules, API patterns. Anything tied to HamTabV1.

For **Claude behavior** instructions — coordination protocols, communication style, session habits, general patterns that apply across all SF Foundry projects — use `~/.claude/instructions.md`.

**If a rule appears in both files, `instructions.md` wins.**

**Quick test:** "Would this instruction matter if we started a completely different project?" If yes → `instructions.md`. If no → `CLAUDE.md`.

## Project Overview

HamTabV1 is a POTA/SOTA amateur radio dashboard. Node.js/Express backend, vanilla JS frontend, Leaflet maps, esbuild bundling.

## Project Goals

- **Two deployment modes** with full feature parity:
  - **Hostedmode** — Cloud-hosted at hamtab.net via Cloudflare Containers. Automated deployment via CI/CD on push.
  - **Lanmode** — Self-hosted on Windows, Linux, or Raspberry Pi. Users download releases and run locally with self-signed TLS.
- **Shared codebase** — All features that apply to both modes live on `main`. Deployment-specific code stays on its branch.
- **Minimal divergence** — Hostedmode contains only what's necessary for Cloudflare (Worker, Dockerfile, KV sync, CI/CD). Lanmode contains only what's necessary for self-hosting (self-signed TLS, CORS restrictions, update checker).
- **Beginner-friendly, expert-capable** — The UI and help text must be approachable for newly licensed hams while still providing the advanced features experienced operators expect. Help popups should clearly explain what each widget does, why it's useful, and how to use it — never assume the user knows ham radio jargon without context.

## Architecture

- **Server** (`server.js`) — Stateless API proxy. No database, no sessions. Proxies external amateur radio APIs and serves static files.
- **Client** — IIFE bundle (`public/app.js`) built from ES modules in `src/`. All user state lives in localStorage with `hamtab_` prefix.

## Branch Strategy

```
main ──────────────────────── SHARED CODE ONLY (no mode-specific features)
 ├── lanmode                  self-hosted variant (Windows/Linux/Raspberry Pi)
 └── hostedmode               cloud variant (Cloudflare Containers)
```

**CRITICAL: Main = Shared Code Only**

- **`main`** — Contains ONLY code that works identically in both modes. No lanmode-specific features (update checker, self-signed TLS), no hostedmode-specific features (Workers KV, CI/CD). All shared features develop here first.
- **`lanmode`** — Merges from `main` + adds self-hosted code: self-signed TLS, CORS restricted to RFC 1918, GitHub Releases update checker (`src/update.js`), `/api/restart` endpoint. Targets home servers and Raspberry Pi.
- **`hostedmode`** — Merges from `main` + adds cloud code: Cloudflare Worker + Container, Workers KV settings sync, Cloudflare Access auth, GitHub Actions CI/CD. Targets hamtab.net. Automated deployment on every push.

**Merge direction:**
- ✅ `main` → `lanmode` (merges shared code to lanmode)
- ✅ `main` → `hostedmode` (merges shared code to hostedmode)
- ❌ Never merge between deployment branches directly
- ❌ Never merge mode-specific code back to `main`

**Decision tree for new features:**
- Feature works identically in both modes? → Develop on `main`, merge to both branches
- Feature is lanmode-only? → Develop on `lanmode`, never merge to `main`
- Feature is hostedmode-only? → Develop on `hostedmode`, never merge to `main`
- Feature needs different implementations? → Shared UI on `main`, mode-specific storage/logic on branches

**See BRANCH_STRATEGY.md for complete guidelines and conflict prevention.**

## Key Files

**All branches:**

| File | Purpose |
|---|---|
| `server.js` | Express server, API proxy endpoints, lunar math |
| `server-config.js` | Deployment mode detection, port/CORS/helmet config |
| `server-startup.js` | HTTP/HTTPS listener startup (mode-aware) |
| `server-tls.js` | Self-signed TLS cert generation (lanmode only, no-op in hostedmode) |
| `src/state.js` | Application state object |
| `src/dom.js` | Cached DOM query utility |
| `public/app.js` | Bundled client output — **don't edit directly** |
| `public/index.html` | Semantic HTML structure |
| `public/style.css` | Dark theme, CSS custom properties |
| `esbuild.mjs` | Build config (ES modules → IIFE bundle) |
| `Dockerfile` | Docker image for self-hosted deployment — **uses explicit COPY list** |
| `docker-compose.yml` | Docker Compose config for self-hosted deployment |
| `.github/workflows/docker-publish.yml` | CI/CD — builds Docker image on GitHub Release publish |

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
| `Dockerfile` | Container image for Cloudflare Containers (overrides main's Dockerfile) |
| `src/settings-sync.js` | Client-side settings sync via Workers KV |
| `.github/workflows/deploy.yml` | CI/CD — auto-deploy on push to hostedmode |
| `public/sitemap.xml` | Search engine sitemap (SEO) |
| `public/robots.txt` | Crawler directives (SEO) |
| `public/og-image.png` | Social media share preview (SEO) |

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

### Pre-Commit Branch Check

**MANDATORY: Before EVERY `git commit`, run `git branch --show-current` and verify you are on the correct branch.**

- If the commit is for shared code, you MUST be on `main`
- If the commit is for hostedmode, you MUST be on `hostedmode`
- If the commit is for lanmode, you MUST be on `lanmode`
- **NEVER commit without checking first** — accidental commits to the wrong branch cause merge artifacts and wasted debugging time
- If you are on the wrong branch: stash changes, switch to the correct branch, then unstash and commit
- This check is non-negotiable. It applies to every single commit, no exceptions.

### Commit Messages
- Imperative mood ("Add X", "Fix Y")
- Match existing style from git log
- Include mode indicator for clarity:
  - `"Add feedback system (shared)"` — Feature on main
  - `"Add update checker (lanmode)"` — Lanmode-only feature
  - `"Add Workers KV sync (hostedmode)"` — Hostedmode-only feature

### Feature Development Workflow

**CRITICAL: Before developing, ask "Where does this belong?"**

1. **Shared features (works identically in both modes):**
   - ✅ Develop on `main` branch
   - ✅ Merge to both `lanmode` and `hostedmode`
   - Examples: UI widgets, client-side logic, API proxies

2. **Lanmode-only features:**
   - ✅ Develop on `lanmode` branch ONLY
   - ❌ **NEVER merge to `main`** (causes conflicts)
   - Examples: Update checker, self-signed TLS, `/api/restart`

3. **Hostedmode-only features:**
   - ✅ Develop on `hostedmode` branch ONLY
   - ❌ **NEVER merge to `main`** (causes conflicts)
   - Examples: Workers KV, CI/CD, Cloudflare Access integration, SEO updates (sitemap, robots.txt, og-image)

4. **Features needing different implementations:**
   - ✅ Shared UI/logic on `main`
   - ✅ Mode-specific storage/endpoints on branches
   - Example: Config profiles (UI on main, localStorage on lanmode, KV on hostedmode)

### Branch Sync Protocol

**CRITICAL: Deployment branches are remote-primary.** The remote is the source of truth for `lanmode` and `hostedmode`. Local copies are transient and may be stale. Always pull before merging.

- **After committing to `main`:**
  ```bash
  # 1. Pull main first (in case remote advanced while you worked)
  git pull origin main --no-edit

  # 2. Push main
  git push origin main

  # 3. Fetch all remote state
  git fetch --all

  # 4. Sync lanmode (pull remote, merge main, push)
  git checkout lanmode
  git pull origin lanmode
  git merge main -m "Merge main into lanmode"
  # 4a. Post-merge validation (see below)
  git push origin lanmode

  # 5. Sync hostedmode (pull remote, merge main, push)
  git checkout hostedmode
  git pull origin hostedmode
  git merge main -m "Merge main into hostedmode"

  # 5a. Verify @cloudflare/containers survived the merge
  grep -q '@cloudflare/containers' package.json || echo "⚠️ @cloudflare/containers MISSING — re-add it!"

  # 5b. Post-merge validation (see below)
  # 5c. SEO review — if new features were added, run the SEO Update Checklist
  #     (update sitemap.xml lastmod, JSON-LD featureList, noscript section, etc.)
  git push origin hostedmode

  # 6. Return to main and sync
  git checkout main
  git pull origin main
  ```

- **After merging main into hostedmode — verify dependencies and Dockerfile:**
  - `@cloudflare/containers` is a hostedmode-only dependency that `main` doesn't have. When `main` modifies the `dependencies` block in `package.json` (adding/removing packages), git's merge can silently drop `@cloudflare/containers`. **Always check** `package.json` on hostedmode after merge. If missing, re-add it (`npm install @cloudflare/containers`), commit, then push.
  - **Dockerfile COPY directives** — If new server-side `.js` files are added on main (e.g. `server-config.js`), they must be added to **both** Dockerfiles: the one on `main` (self-hosted Docker) AND the one on `hostedmode` (Cloudflare Containers). Both use explicit file copies, not wildcards. Missing files cause `MODULE_NOT_FOUND` crashes in the container.

- **Docker image (main branch):** The `docker-publish.yml` workflow builds and pushes a Docker image to Docker Hub when a GitHub Release is published. It does NOT trigger on every push. The Dockerfile uses a multi-stage build: stage 1 runs `npm ci` + `npm run build` + `npm prune --omit=dev`, stage 2 copies only runtime files via explicit COPY directives. When adding new server-side `.js` files, add them to the COPY list in the Dockerfile.

- **Merge conflict resolution** — See BRANCH_STRATEGY.md for full conflict resolution protocol.

- **Post-merge validation (MANDATORY after every merge to deployment branches):**
  After merging main into lanmode or hostedmode, run these checks BEFORE pushing:
  1. **Syntax check:** `node -c server.js` — catches SyntaxErrors (duplicate declarations, missing brackets)
  2. **Duplicate detection:** `grep -c 'let \|const \|function ' server.js` — compare count against main. Large increase = likely duplicated sections
  3. **Section header scan:** `grep -n '^// ---' server.js` — look for duplicate section headers (e.g. two `// --- N2YO Satellite Tracking API ---`)
  4. **Dockerfile COPY check:** Compare server-side `.js` files against the Dockerfile COPY list. Run: `diff <(grep 'COPY.*\.js' Dockerfile | sed 's/.*\///' | sort) <(ls *.js *.mjs 2>/dev/null | sort)` — any files in the directory but missing from Dockerfile need to be added (except `esbuild.mjs` which is build-only and runs in stage 1). On hostedmode, also check the hostedmode Dockerfile.
  5. **If any check fails:** Fix the issue on the deployment branch before pushing. Do NOT push broken code — CI/CD will deploy it immediately to production

### New Server-Side File Checklist

**MANDATORY: When adding a new `.js` file to the project root (server-side code):**

1. Add a `COPY` directive to the `main` branch Dockerfile (stage 2 runtime section)
2. After merging to `hostedmode`, add the same `COPY` directive to the hostedmode Dockerfile
3. If the file is only needed at build time (like `esbuild.mjs`), it does NOT need a runtime COPY — stage 1 already copies everything via `COPY . .`

### Documentation Edits

- **CLAUDE.md**, **BRANCH_STRATEGY.md** — Edit on `main` only
- **Do NOT sync docs-only changes** to deployment branches
- Deployment branches are for runtime code — documentation doesn't affect them
- Only run "sync branches" when there's actual code to deploy
- Never edit documentation directly on deployment branches

### README.md Updates

**The README must stay current.** Update it whenever any of these change:

| Change | README section to update |
|--------|--------------------------|
| New npm dependency added/removed | Dependencies table |
| New external API integrated | External APIs table |
| Install script changes (install.sh, install.ps1) | Installation section |
| Uninstall procedure changes | Uninstall subsection |
| New widget added | Features list |
| New user-facing feature | Features list |
| Environment variable added/changed | Configuration / Environment Variables |
| Port or network behavior changes | Network Configuration |

## Code Quality

- No unused variables or dead code
- Error handling at API boundaries (try/catch with appropriate HTTP status)
- Keep server.js endpoints consistent in error response format
- Test changes by running `npm start` and verifying in browser
- New functions, intervals, and state fields must include comments per the Commenting Style rules above (citations, magic numbers, purpose)
- **Toggleable error handling** — All generated code should include error handling that can be enabled for debugging. Use a debug flag or verbose mode that's off by default but can be turned on to surface errors (e.g. `if (state.debug) console.error(...)`). The capability must exist even if disabled in production.
- **Documentation required** — Every user-facing feature must include **README.md**, user guide, and widget help text updates before the feature is considered complete. A feature without updated docs is not done. See the User Guide Documentation and README.md Updates sections below.

## Versioning & Updates

- Version lives in `package.json` and is injected at build time via esbuild `define`
- Bump `version` in `package.json` on every push: patch for fixes, minor for features
- Rebuild (`npm run build`) after bumping to update the client bundle
- **Version collision** — If pulling main brings in a version bump that matches yours (both devs independently bumped to same version), bump again after merge and rebuild. This is expected when multiple devs work in parallel.

### Wiki Release Notes (mandatory on version bump)

Every version bump must include a corresponding entry in the [Release Notes wiki page](https://github.com/stevencheist/HamTabv1/wiki/Release-Notes). See the project reference docs for detailed wiki update instructions.

**Lanmode updates:**
- Auto-update: clicking the green update dot downloads the lanmode branch zip, extracts, copies files (preserving `.env`, `certs`, `node_modules`), runs `npm install --production` + `npm run build`, and restarts the server
- Update detection compares local version against the latest GitHub Release tag (via `api.github.com`)
- No git dependency — works with zip downloads, scp deploys, etc.
- GitHub releases must be tagged (e.g. `v0.6.0`) for detection to work
- systemd `Restart=on-failure` / NSSM handles process restart after `process.exit(0)`

**Hostedmode updates:**
- No in-app update system — deployments are fully automated via GitHub Actions CI/CD
- Every push to `hostedmode` triggers a build and deploy to Cloudflare
- Version displayed as static label for reference only

## SEO & Discoverability (Hostedmode Only)

SEO only matters for hamtab.net — lanmode runs on private LANs where search engines never reach. All SEO-related changes are developed and maintained on the `hostedmode` branch.

**Positioning:** HamTab is a **free, modern, web-based alternative to HamClock**. With HamClock installations ceasing to function in June 2026, HamTab targets the ~10,000+ displaced HamClock users. Every SEO touchpoint should reinforce this.

**Target keywords:** amateur radio dashboard, ham radio dashboard, HamClock alternative, POTA dashboard, SOTA dashboard, DX cluster, propagation, satellite tracking, space weather, Parks on the Air, Summits on the Air

### SEO Files

| File | Purpose | Branch |
|------|---------|--------|
| `public/index.html` | Meta tags, Open Graph, Twitter cards, JSON-LD structured data, `<noscript>` fallback | `main` (shared — meta tags don't affect lanmode) |
| `public/sitemap.xml` | Search engine sitemap | `hostedmode` only |
| `public/robots.txt` | Crawler directives | `hostedmode` only |
| `public/og-image.png` | Social share preview image (1200×630px) | `hostedmode` only |
| `README.md` | GitHub search & discoverability | `main` (GitHub-facing) |
| `package.json` | npm/GitHub metadata (`description`, `keywords`) | `main` |

**SEO checklists and TODOs** — See the project reference docs

## Security (Priority)

Security is a top priority. Flag any code that could introduce a vulnerability.

Universal security rules live in `~/.claude/instructions.md` (Security Invariants section). This section covers **HamTabV1-specific** implementations of those rules.

**Mandatory utilities & patterns:**

- **`secureFetch(url, options)`** (`server.js`) — ALL outbound HTTP requests MUST use this function. Never use raw `fetch`, `https.get`, or `axios`. It enforces DNS pinning, SSRF prevention, timeouts (10s), response size limits (5MB), redirect depth (5), and HTTPS-only. New endpoints that call external APIs must go through `secureFetch`.
- **`esc(str)`** (`src/utils.js`) — ALL user/API data rendered as HTML MUST use this function. It encodes via `textContent` → `innerHTML`. Use `textContent` for plain text; use `esc()` only when building HTML strings.
- **`isPrivateIP(ip)`** (`server.js`) — Used by CORS and `secureFetch`. Covers IPv4 RFC 1918, loopback, link-local, and IPv6 equivalents including mapped addresses.

**Input validation patterns (project-specific):**

| Input | Format | Where validated |
|-------|--------|-----------------|
| Callsign | `/^[A-Z0-9]{1,10}$/i` | Server endpoints before external API calls |
| Satellite IDs | `/^\d+(,\d+)*$/` | Before N2YO API calls |
| Latitude | `-90 ≤ n ≤ 90`, reject NaN | All endpoints accepting lat |
| Longitude | `-180 ≤ n ≤ 180`, reject NaN | All endpoints accepting lon |
| SDO image type | Whitelist: `0193, 0171, 0304, HMIIC` | `/api/sdo` endpoint |
| SDO frame filename | `/^\d{8}_\d{6}_512_\w+\.jpg$/` | `/api/sdo/frame` endpoint |
| Propagation type | Whitelist: `mufd, fof2` | `/api/propagation` endpoint |
| VOACAP power | Whitelist: `5, 100, 1000` | `/api/voacap` endpoint |
| VOACAP mode | Whitelist: `CW, SSB, FT8` | `/api/voacap` endpoint |
| `.env` keys | Whitelist: `WU_API_KEY, N2YO_API_KEY` | `/api/config/env` POST |

**Cache eviction:**
- Server-side caches auto-evict every 30 minutes (`server.js` cleanup interval)
- Client-side `callsignCache` caps at 500 entries, evicts oldest 50% (`src/utils.js`)
- New caches MUST include eviction — follow existing patterns

**Lanmode-specific:**
- **CORS** — Locked to RFC 1918 private networks only via `isPrivateIP()`.
- **Self-signed TLS** — Generated automatically for LAN HTTPS.

**Hostedmode-specific:**
- **Cloudflare Access** — Auth handled before requests reach Worker/Container. User identity read from `Cf-Access-Jwt-Assertion` header.
- **No CORS** — Same-origin deployment; CORS headers removed.
- **trust proxy** — `app.set('trust proxy', 1)` required so rate limiter sees real client IPs.
- **HSTS** — Enabled with 1-year max-age. Cloudflare handles TLS termination.
- **Wrangler secrets** — Use `wrangler secret put` for server-side secrets. Never store in `wrangler.jsonc`.

## Privacy & GDPR Compliance

HamTab has users worldwide, including the EU. Privacy and GDPR compliance are mandatory.

**Core principles:**
- **Data minimization** — Collect only what's necessary. No tracking, analytics, or telemetry.
- **Transparency** — Clear privacy notices when collecting any personal data.
- **User control** — Users must be able to request data deletion.
- **Security by design** — Encrypt PII at collection point when possible.

**Personal data handling:**
- **Feedback system** — Email addresses are encrypted client-side before transmission using RSA-2048. Only Steven and Francisco can decrypt.
  - Public key: `src/feedback.js` (committed to repo)
  - Private key: `feedback-private-key.pem` (NEVER commit, both developers must have secure offline copy)
  - Decryption: `node decrypt-feedback-email.js <encrypted-base64>`
  - Encrypted emails stored in GitHub issues are GDPR-compliant (encrypted at rest, deletion possible)
- **Callsign data** — User-entered callsigns live in localStorage only (client-side, never transmitted)
- **Location data** — Optional, client-side only, used for map centering and weather
- **No cookies** — App uses localStorage exclusively, no tracking cookies
- **No analytics** — No Google Analytics, Cloudflare Analytics, or similar tracking

**Detailed GDPR checklists** — See the project reference docs

## Working with Claude

**IMPORTANT: Before starting work on any new feature or task, follow the "Claim Work" protocol below. This is mandatory — not optional.**

Stay on `main` for most work. Use simple commands to manage branches:

| Command | Action |
|---------|--------|
| "status" | Show current branch, sync state, pending changes |
| "pull" | Pull latest changes on current branch |
| "sync branches" | Fetch, pull, merge, push for both deployment branches (see Branch Sync Protocol) |
| "switch to [branch]" | Checkout the specified branch |

### Claim/Release Work Protocol

See `instructions.md` § Developer Coordination Protocol for the full claim/release steps.

### Workflow

1. **Claim work** (protocol above) — pull, read planning repo, claim, push
2. Develop features on `main` (90% of work happens here)
3. Say "sync branches" to deploy code changes to deployment branches
4. Switch to `lanmode` or `hostedmode` only for branch-specific fixes
5. Start sessions with "status" or "pull and status" to see current state
6. **Release work** (protocol above) — move to completed in planning repo on final commit

**When to sync:**
- ✅ After committing **code changes** (features, bug fixes)
- ❌ NOT for docs-only changes (CLAUDE.md, ROADMAP.md, etc.)

**Sync branches does:**
1. Push `main`
2. `git fetch --all` to see remote state
3. For each deployment branch: checkout → pull → merge main → push
4. Return to `main`

This ensures we never merge into a stale local branch.

**When to switch branches:**
- **hostedmode** — Cloudflare-specific fixes (wrangler.jsonc, worker.js, Dockerfile, CI/CD)
- **lanmode** — Self-hosted fixes (install scripts, update checker, CORS config)

### End-of-Session Protocol

See `instructions.md` § End-of-Session Protocol for the full checklist.

## Feature Tracking

For multi-task features, create a tracking `.md` file in the repo root. See the project reference docs for details.

## User Guide Documentation

HamTab has a PDF user guide generated from Markdown files.

**CRITICAL: Documentation is mandatory for every feature.** No feature is complete until **all three** are updated: (1) README.md features/widgets sections, (2) user guide content files, and (3) widget help text in `src/constants.js`. Documentation updates must be included in the same commit (or commit series) as the feature code — never "come back to it later". If a feature is user-facing, it gets documented. No exceptions.

### Location
```
docs/user-guide/
├── content/           # Markdown source files (01-introduction.md, etc.)
├── screenshots/       # Widget and UI screenshots (PNG)
├── template/          # HTML template for PDF styling
└── build.mjs          # Build script
```

### Building the PDF
```bash
npm run build:docs
```
Output: `public/HamTab-User-Guide.pdf`

### When to Update Documentation

**MANDATORY — Update the user guide for every user-facing change:**
- Add a new widget → Update `03-widgets.md`
- Add new filter options → Update `06-filters.md`
- Add new data sources → Update `05-data-sources.md`
- Change configuration options → Update `07-configuration.md`
- Add new map features or overlays → Update `04-map-features.md`
- Change setup/onboarding → Update `02-getting-started.md`
- Fix common issues → Update `09-troubleshooting.md`
- Add or change any interactive UI element → Update the relevant section
- Modify existing behavior users rely on → Update the relevant section

**Documentation checklist (before committing a feature):**
- [ ] Updated README.md Features section (new widget or feature)
- [ ] Updated README.md Widgets config list (new toggleable widget)
- [ ] Updated README.md Dependencies/APIs tables (new package or API)
- [ ] Identified which user guide doc file(s) need updating
- [ ] Described the feature in user-friendly language (no code jargon)
- [ ] Included how to use it (step-by-step if needed)
- [ ] Updated widget help text in `src/constants.js` if applicable

**Content files, screenshots, and writing style** — See the project reference docs

## GitHub Issue Communication

Be friendly, assume non-technical users, ask specific questions. See the project reference docs for full guidelines.

## Root Cause Analysis Protocol

**MANDATORY: After resolving any major issue (production outage, multi-hour debug session, data loss, or broken deployment), perform a root cause analysis before moving on.**

### When to Trigger RCA

- Production site down or returning errors
- Bug that took more than 3 debugging iterations to identify
- Merge or deployment that broke a branch
- Any issue caused by process failure (wrong branch, missing validation, skipped step)

### RCA Format

Write the RCA to Claude's auto memory so it persists across sessions. Include:

```markdown
# RCA: <Short Title>
**Date:** YYYY-MM-DD
**Duration:** How long from discovery to fix
**Severity:** Production outage / Broken deploy / Dev-only

## What Happened
One-paragraph summary of the observable problem.

## Root Cause
The actual underlying technical cause.

## Why It Wasn't Caught
What safeguards should have prevented this but didn't.

## Fix Applied
What was done to resolve the immediate issue.

## Preventive Measures
Specific changes to process, tooling, or code to prevent recurrence.
Each measure should reference the file/section updated (e.g. "Added post-merge validation to CLAUDE.md § Branch Sync Protocol").

## Lessons Learned
Broader insights for future debugging or development.
```

### After Writing the RCA

1. **Update CLAUDE.md** — Add any new rules, checklists, or validation steps identified in Preventive Measures
2. **Update instructions.md** — If the lesson applies across all projects, add it to shared instructions
3. **Update MEMORY.md** — Add a brief summary of the incident and lessons learned
4. **Commit all updated files** in a single commit

---

## Past Incident Learnings

Rules added from past RCAs. Each links to the original analysis.

### Hostedmode Container Crash (2026-02-06)
**Cause:** Merge from main duplicated the N2YO satellite section in server.js on hostedmode. Two `let satListCache` declarations caused a SyntaxError — Node.js crashed before `app.listen()`, so the container ran but nothing listened on port 8080.
**Duration:** ~2 hours of systematic debugging (bare-bones HTTP test, startup-diag wrapper, progressive elimination).
**Preventive measures added:**
- Pre-commit branch check (CLAUDE.md § Pre-Commit Branch Check) — prevents accidental commits to wrong branch
- Post-merge validation (CLAUDE.md § Branch Sync Protocol) — `node -c server.js` + duplicate section scan after every merge
- RCA protocol (this section) — forces analysis after every major incident
**See:** RCA was documented in this section; no separate file was written.
