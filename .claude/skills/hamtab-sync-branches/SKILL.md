---
name: hamtab-sync-branches
description: Sync HamTabV1 deployment branches — merge `main` into `lanmode` and `hostedmode` with the mandatory pre-merge divergence check and post-merge validation. Use when the user says "sync branches", after committing shared code changes to `main`, or before a release. NOT for docs-only changes.
---

# HamTab — Sync Branches

Deploys shared `main` code to the two deployment branches. This skill **executes** the procedure
in `CLAUDE.md` §Branch Sync Protocol, encoded so the validation can't be skipped — a skipped
post-merge check caused a 2-hour production outage (RCA 2026-02-06: a duplicated `server.js`
section → SyntaxError → container down).

## Source of truth & alignment

- **`CLAUDE.md` §Branch Sync Protocol is authoritative.** Branch strategy is a project-CLAUDE.md
  concern (`instructions.md` hierarchy). If CLAUDE.md and these steps ever disagree, follow
  CLAUDE.md and update this skill — do not let this file drift into a third copy. The generic
  cross-org loop in `ai-workflows/reference/governance-decisions.md` §Branch Sync Bash Script is
  the baseline; HamTabV1's protocol is the richer superset (it adds the divergence + validation
  checks) and wins for this repo.
- **`aiw` does not cover branch sync.** Per `instructions.md` ("use `aiw` for all operations it
  supports; fall back to Bash for … branch sync"), raw git here is correct — do not invent an
  `aiw` call for the merge/push. Normal coordination (`aiw work release …`, session end) is
  separate and unchanged by this skill.
- **Global hard rules still apply** (`~/.claude/instructions.md`):
  - Pre-commit branch check — run `git branch --show-current` before any commit you make while
    fixing a failed validation; commit to the branch you're fixing, never `main` by accident.
  - **Never** `--no-verify` / `--no-gpg-sign` — pre-commit hooks are load-bearing; fix the cause.
  - **Never** `git reset --hard` to undo a wrong-branch commit — use `git branch <x> &&
    git reset --soft HEAD~1`, `git stash`, or `git cherry-pick`. Check `git status` for files you
    didn't touch first.

## Preconditions

- You are in `~/code/stevencheist/HamTabV1`.
- Work is committed on `main`. (Run `git status` first; stash or commit anything pending.)
- This is **code**, not docs-only. Docs-only changes (`CLAUDE.md`, `ROADMAP.md`, `README.md`)
  do NOT get synced — return early and tell the user.

## Hard rules

- **Never push a deployment branch if any validation fails.** Fix on the branch, re-validate, then push.
- **Never edit shared files on a deployment branch.** If the divergence check flags shared-file
  edits on `lanmode`/`hostedmode`, STOP and resolve per CLAUDE.md (cherry-pick to `main` first).
- Deployment branches are **remote-primary** — always `git pull origin <branch>` before merging.

## Procedure

### 1. Publish main
```bash
git checkout main
git pull origin main --no-edit
git push origin main
git fetch --all
```

### 2. For each deployment branch (`lanmode`, then `hostedmode`)
```bash
git checkout <branch>
git pull origin <branch>
```

**2a. Pre-merge divergence check** — has the deployment branch modified shared files?
```bash
git diff main...HEAD --name-only \
  | grep -E '^(src/|server|public/(index\.html|style\.css)|esbuild)' \
  | grep -v 'src/update\.js\|src/settings-sync\.js'
```
If this prints anything: **STOP.** A shared file was edited on the wrong branch. Resolve per
CLAUDE.md §Pre-merge divergence check (usually: redo the change on `main`, then merge). Do not proceed.

**2b. Merge**
```bash
git merge main -m "Merge main into <branch>"
```

**2c. Post-merge validation** — run the bundled script (it must exit 0):
```bash
bash .claude/skills/hamtab-sync-branches/validate.sh <branch>
```
It checks: `node -c server.js` (syntax), duplicate `// --- X ---` section headers (same grep as
deploy.yml — a repeat fails the hostedmode deploy), that the Dockerfile COPY list includes the
`server/` and `public/` directories, and (on `hostedmode`) that `@cloudflare/containers` survived
the merge and every root `*.js` is in the Dockerfile COPY list.

Beyond the script, before pushing `hostedmode` after a large gap: `docker build .` on the branch
and run the image with `-e HOSTED_MODE=1 -p 127.0.0.1:18081:8080`, then curl `/api/health` and
`/download`. It is the same artifact Cloudflare builds and is the only check that catches a
runtime file missing from the COPY list. `npm test` as written fails on Node 22 (directory args
with trailing slashes) — run `node --test test/unit/*.js test/smoke/*.js` instead.

If validation fails → fix on the branch, re-run `validate.sh`, only then continue.

**2d. Push (only if validation passed)**
```bash
git push origin <branch>
```

On `hostedmode`, before pushing: if new user-facing features landed, run the SEO Update Checklist
(sitemap `lastmod`, JSON-LD `featureList`, `<noscript>`), per CLAUDE.md §SEO.

### 3. Return to main
```bash
git checkout main
git pull origin main
```

## Report back

Tell the user, per branch: merged ✅, validation result, pushed ✅ (or **blocked** + why).
Remind them `hostedmode` auto-deploys to production on push.

### 4. Watch the hostedmode deploy
```bash
gh run list --repo stevencheist/HamTabv1 --workflow deploy.yml --limit 1
gh run watch <run-id> --repo stevencheist/HamTabv1 --exit-status
```
A green run is not the end: for ~30–60 s after the container swap, hamtab.net answers with
Worker 500s ("The container is not running, consider calling start()") even though the workflow's
health check passed. Poll `https://hamtab.net/api/health` until it returns 200 with a small
`uptime`, then sample it again ~45 s later — a climbing uptime means no crash loop. Only then
probe real routes (`/download`, `/api/spots/dxc`, `/api/solar`) and report the deploy as live.

Rollback if the new container never comes up: `git push --force origin <previous-sha>:hostedmode`
(the pipeline redeploys the old image in a few minutes).
