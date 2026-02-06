# AI Collaboration Protocols

This file contains proprietary workflow patterns for AI-assisted development. Do not share publicly.

---

## Claim Work Protocol

**MANDATORY before starting ANY feature or task:**

1. `git pull` — get the latest from remote
2. Re-read `CLAUDE.md` — check for updated instructions
3. Re-read `WORKING_ON.md` — check what the other developer is doing
4. **If there's a conflict** (other dev is touching the same files/feature), **stop and tell the user**
5. Add your row to the "Active Work" table in `WORKING_ON.md`
6. Commit and push `WORKING_ON.md` immediately:
   ```
   git add WORKING_ON.md && git commit -m "Claim: <feature name>" && git push
   ```
7. Now begin the actual work

---

## Release Work Protocol

**After finishing a feature or task:**

1. **Pull before committing** — `git pull origin main --no-edit` to get any changes pushed while you worked
2. If pull brought in changes, check for version collision (both bumped to same version) — bump again if needed
3. Move your row from "Active Work" to "Recently Completed" in `WORKING_ON.md`
4. Include this change in your final feature commit (no separate commit needed)
5. Push as normal

---

## End-of-Session Protocol

**When the user says they're done (e.g. "done", "wrapping up", "end of session"):**

1. **Check for uncommitted changes** — `git status`. If there are meaningful changes, commit them.
2. **Push main** — Make sure `main` is pushed to remote.
3. **Sync branches** — If any code changes were pushed, sync both `lanmode` and `hostedmode`.
4. **Update WORKING_ON.md** — Move completed work to "Recently Completed". Leave in-progress work with a status note.
5. **Save work-in-progress notes** — If partially done:
   - Add status note to "Active Work" entry
   - Update any tracking documents
   - Commit and push
6. **Confirm clean state** — Run `git status` and report to user. Goal: on `main`, up to date, no uncommitted changes.

---

## Branch Sync Protocol

**CRITICAL: Deployment branches are remote-primary.** Always pull before merging.

**After committing to `main`:**
```bash
# 1. Pull main first (in case remote advanced)
git pull origin main --no-edit

# 2. Push main
git push origin main

# 3. Fetch all remote state
git fetch --all

# 4. Sync lanmode
git checkout lanmode
git pull origin lanmode
git merge main -m "Merge main into lanmode"
git push origin lanmode

# 5. Sync hostedmode
git checkout hostedmode
git pull origin hostedmode
git merge main -m "Merge main into hostedmode"
git push origin hostedmode

# 6. Return to main
git checkout main
git pull origin main
```

**Why this order matters:**
- `git pull` before push prevents rejected pushes
- `git fetch --all` shows remote state first
- Merging into stale local branches causes conflicts
- hostedmode drifts due to CI/CD commits
- Final pull syncs WORKING_ON.md updates from other dev

**If merge conflicts on deployment branches:** STOP. This indicates mode-specific code leaked to `main`. Don't force the merge.

---

## Session Startup Commands

| Command | Action |
|---------|--------|
| "status" | Show current branch, sync state, pending changes |
| "pull" | Pull latest changes on current branch |
| "sync branches" | Full branch sync protocol |
| "switch to [branch]" | Checkout the specified branch |

Start sessions with "status" or "pull and status" to see current state.

---

## Memory System

Use the auto-memory directory at `~/.claude/projects/<project>/memory/` to:
- Record insights about problem constraints
- Document strategies that worked or failed
- Note lessons learned from mistakes
- Keep `MEMORY.md` concise (under 200 lines)
- Link to other files for details

Check memory before making decisions that might repeat past mistakes.

---

## Feature Tracking

For multi-task features:
- Create a tracking `.md` file in repo root
- List all items with status (✅/🟡/❌)
- Update as you go
- Don't create tracking files for one-off changes

---

## Security Prompting Patterns

**SSRF Prevention:**
- All outbound requests must resolve hostname first
- Reject RFC 1918 / loopback IPs before connecting
- Whitelist URL path/query params where possible

**XSS Prevention:**
- Use `textContent` or DOM APIs for user/API data
- Never inject unsanitized strings via `innerHTML`
- Use `esc()` utility if HTML insertion unavoidable

**Input Validation:**
- Sanitize and whitelist all user-supplied query params
- Use `encodeURIComponent` on client when building URLs

**Secrets:**
- No API keys in client code
- Use `.env` for secrets
- Never commit `.env`, TLS certs, or wrangler secrets

---

## Documentation Enforcement

**MANDATORY:** No feature is complete until documentation is updated.

Checklist before committing:
- [ ] Identified which doc files need updating
- [ ] Described feature in user-friendly language
- [ ] Included how to use it (step-by-step if needed)
- [ ] Updated widget help text in `src/constants.js` if applicable

Documentation must be in the same commit as the feature code.

---

## Code Quality Standards

- No unused variables or dead code
- Error handling at API boundaries
- Consistent error response format in server.js
- Test by running `npm start` and verifying in browser
- **Toggleable error handling** — Include debug flag that's off by default but can surface errors (e.g. `if (state.debug) console.error(...)`)

---

## GitHub Issue Communication

- **Assume non-technical users** — avoid jargon, explain terms
- **Be friendly and appreciative** — thank contributors
- **Ask clear, specific questions** — use numbered lists
- **Offer concrete examples** — give options, not open-ended questions
- **Follow up** — when work is done, ask requester to try it and give feedback

---

## Behavioral Tuning

- Don't start/stop servers programmatically — tell user when restart needed
- Bump version before every push
- Rebuild after version bump to inject into client
- Don't add features beyond what was asked
- Don't add docstrings/comments to code you didn't change
- Prefer editing existing files over creating new ones
- Keep solutions simple and focused
