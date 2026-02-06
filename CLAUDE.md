# CLAUDE.md — HamTabV1

## Instruction Routing

This file is for **project-specific** instructions — architecture, code conventions, branch strategy, file locations, widgets, security rules, API patterns. Anything tied to HamTabV1.

For **Claude behavior** instructions — coordination protocols, communication style, session habits, general patterns that apply across all SF Foundry projects — use `~/.claude/instructions.md` (symlinked to `sffoundry/ai-workflows`).

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
   - Examples: Workers KV, CI/CD, Cloudflare Access integration

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
  git push origin lanmode

  # 5. Sync hostedmode (pull remote, merge main, push)
  git checkout hostedmode
  git pull origin hostedmode
  git merge main -m "Merge main into hostedmode"
  git push origin hostedmode

  # 6. Return to main and sync
  git checkout main
  git pull origin main
  ```

- **Why this order matters:**
  - `git pull` before push prevents rejected pushes when remote advanced
  - `git fetch --all` shows remote state before we touch anything
  - `git pull` before merge ensures we have CI/CD commits, other developer changes, etc.
  - Merging into a stale local branch then pushing will fail or cause conflicts
  - hostedmode especially drifts due to CI/CD commits
  - Final `git pull` on main syncs any WORKING_ON.md updates from the other dev

- **If merge conflicts occur on main pull:**
  - `package-lock.json` conflicts are common and benign — resolve with `npm install --package-lock-only`
  - Version collision (both devs bumped to same version) — bump again after merge, rebuild
  - Code conflicts — review carefully, may indicate overlapping work

- **If merge conflicts occur on deployment branches:**
  - ⚠️ **STOP!** This indicates mode-specific code on `main`
  - Review BRANCH_STRATEGY.md conflict resolution protocol
  - Fix the issue, don't force the merge

### Documentation Edits

- **CLAUDE.md**, **BRANCH_STRATEGY.md**, **ROADMAP.md** — Edit on `main` only
- **Do NOT sync docs-only changes** to deployment branches
- Deployment branches are for runtime code — documentation doesn't affect them
- Only run "sync branches" when there's actual code to deploy
- Never edit documentation directly on deployment branches

## Code Quality

- No unused variables or dead code
- Error handling at API boundaries (try/catch with appropriate HTTP status)
- Keep server.js endpoints consistent in error response format
- Test changes by running `npm start` and verifying in browser
- New functions, intervals, and state fields must include comments per the Commenting Style rules above (citations, magic numbers, purpose)
- **Toggleable error handling** — All generated code should include error handling that can be enabled for debugging. Use a debug flag or verbose mode that's off by default but can be turned on to surface errors (e.g. `if (state.debug) console.error(...)`). The capability must exist even if disabled in production.
- **Documentation required** — Every user-facing feature must include user guide updates and widget help text updates before the feature is considered complete. See the User Guide Documentation section below.

## Versioning & Updates

- Version lives in `package.json` and is injected at build time via esbuild `define`
- Bump `version` in `package.json` on every push: patch for fixes, minor for features
- Rebuild (`npm run build`) after bumping to update the client bundle
- **Version collision** — If pulling main brings in a version bump that matches yours (both devs independently bumped to same version), bump again after merge and rebuild. This is expected when multiple devs work in parallel.

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

**Adding new features that collect data:**
1. Ask: "Is this data truly necessary?"
2. If yes, add clear privacy notice in UI (see feedback modal example)
3. Make it optional unless absolutely required
4. Never transmit PII in plaintext if it will be stored
5. Provide ability to delete (e.g., clear button, manual GitHub issue deletion)

**GDPR user rights:**
- **Right to access** — Users can see their data (GitHub issues are public or viewable on request)
- **Right to deletion** — GitHub issues can be deleted manually, localStorage cleared via browser
- **Right to portability** — Config export allows users to download their data

**Implementation checklist for new data collection:**
- [ ] Added privacy notice in UI explaining what, why, where
- [ ] Made collection optional unless absolutely necessary
- [ ] Encrypted PII if it will be stored/transmitted
- [ ] Provided deletion mechanism
- [ ] Documented in CLAUDE.md if it introduces new privacy considerations

## Working with Claude

**IMPORTANT: Before starting work on any new feature or task, follow the "Claim Work" protocol below. This is mandatory — not optional.**

Stay on `main` for most work. Use simple commands to manage branches:

| Command | Action |
|---------|--------|
| "status" | Show current branch, sync state, pending changes |
| "pull" | Pull latest changes on current branch |
| "sync branches" | Fetch, pull, merge, push for both deployment branches (see Branch Sync Protocol) |
| "switch to [branch]" | Checkout the specified branch |

### Claim Work Protocol (before starting ANY feature or task)

1. `git pull` — get the latest from remote
2. Re-read **both** `CLAUDE.md` (project instructions) AND `~/.claude/instructions.md` (shared instructions)
3. Re-read `WORKING_ON.md` — check what the other developer is doing
4. **If there's a conflict** (other dev is touching the same files/feature), **stop and tell the user**
5. Add your row to the "Active Work" table in `WORKING_ON.md`
6. Commit and push `WORKING_ON.md` immediately:
   ```
   git add WORKING_ON.md && git commit -m "Claim: <feature name>" && git push
   ```
7. Now begin the actual work

### Release Work Protocol (after finishing a feature or task)

1. **Pull before committing** — `git pull origin main --no-edit` to get any changes pushed while you worked
2. If pull brought in changes, check for version collision (both bumped to same version) — bump again if needed
3. Move your row from "Active Work" to "Recently Completed" in `WORKING_ON.md`
4. Include this change in your final feature commit (no separate commit needed)
5. Push as normal

### Workflow

1. **Claim work** (protocol above) — pull, read files, claim, push
2. Develop features on `main` (90% of work happens here)
3. Say "sync branches" to deploy code changes to deployment branches
4. Switch to `lanmode` or `hostedmode` only for branch-specific fixes
5. Start sessions with "status" or "pull and status" to see current state
6. **Release work** (protocol above) — move to completed on final commit

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

**When the user says they're done for the day (e.g. "done", "wrapping up", "end of session"), run this checklist:**

1. **Check for uncommitted changes** — `git status`. If there are meaningful changes, commit them with a clear message.
2. **Push main** — Make sure `main` is pushed to remote.
3. **Sync branches** — If any code changes were pushed during the session, sync both `lanmode` and `hostedmode` (full Branch Sync Protocol).
4. **Update WORKING_ON.md** — Move any completed work from "Active Work" to "Recently Completed". If work is still in progress, leave it in "Active Work" with a note about current status.
5. **Save work-in-progress notes** — If a feature is partially done or needs to be continued next session:
   - Add a brief status note to the "Active Work" entry in `WORKING_ON.md` (e.g. "server endpoint done, client integration next")
   - If there's a tracking document (e.g. `FEATURE_NAME.md`), update it with current progress
   - Commit and push the updated `WORKING_ON.md`
6. **Confirm clean state** — Run `git status` one final time and report the state to the user. The goal is: on `main`, up to date with remote, no uncommitted code changes.

## Feature Tracking

When working on multiple related features or a feature set with more than one task:

- **Create a tracking document** — Use a `.md` file in the repo root (e.g. `FEATURE_NAME.md`) to track progress
- **Document scope** — List all items to be implemented, their status (✅/🟡/❌), and any notes
- **Update as you go** — Mark items complete as work progresses
- **Single-item tasks** — Don't create tracking files for one-off changes; use commit messages and PR descriptions instead

## User Guide Documentation

HamTab has a PDF user guide generated from Markdown files.

**CRITICAL: Documentation is mandatory for every feature.** No feature is complete until the user guide is updated. Documentation updates must be included in the same commit (or commit series) as the feature code — never "come back to it later". If a feature is user-facing, it gets documented. No exceptions.

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
- [ ] Identified which doc file(s) need updating
- [ ] Described the feature in user-friendly language (no code jargon)
- [ ] Included how to use it (step-by-step if needed)
- [ ] Updated widget help text in `src/constants.js` if applicable

### Content Files

| File | Content |
|------|---------|
| `01-introduction.md` | Overview, features, requirements, deployment modes |
| `02-getting-started.md` | Setup, callsign, location, API keys |
| `03-widgets.md` | All 11 widgets documented in detail |
| `04-map-features.md` | Markers, overlays, geodesic paths, satellites |
| `05-data-sources.md` | POTA, SOTA, DXC, PSK, weather, N2YO |
| `06-filters.md` | Band, mode, distance, age, location, privilege |
| `07-configuration.md` | Settings, export/import, localStorage keys |
| `08-reference-tables.md` | RST, NATO phonetics, band chart, privileges |
| `09-troubleshooting.md` | Common issues and solutions |

### Screenshots

Screenshots go in `docs/user-guide/screenshots/`. Use descriptive names:
- `widget-solar.png`
- `widget-filters.png`
- `map-overlays.png`
- `config-modal.png`

Reference in markdown: `![Widget Name](../screenshots/widget-name.png)`

**Screenshot guidelines:**
- PNG format, reasonable resolution
- Crop to relevant area
- Use dark theme (matches app default)
- Include sample data where helpful

### Writing Style

- Use second person ("You can...", "Click the...")
- Keep language accessible to non-technical users
- Include tables for reference data
- Use callout boxes for tips/warnings:
  ```html
  <div class="tip">Helpful hint here.</div>
  <div class="warning">Important note here.</div>
  <div class="important">Critical information here.</div>
  ```

## GitHub Issue Communication

When commenting on issues or asking questions of users:

- **Assume non-technical users** — avoid jargon, explain terms if needed, and keep language approachable.
- **Be friendly and appreciative** — thank contributors for suggestions and bug reports.
- **Ask clear, specific questions** — use numbered lists so users can answer point by point.
- **Offer concrete examples** — when asking about preferences, give options rather than open-ended questions.
- **Follow up on implemented features** — when work is done, comment asking the requester to try it and give feedback.
