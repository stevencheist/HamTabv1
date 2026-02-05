# Currently Working On

Claim your work here before starting so the other developer doesn't step on it.
Clear your entry when done.

## Format

| Developer | Feature / Task | Branch | Started |
|-----------|---------------|--------|---------|
| Name | What you're working on | main / lanmode / hostedmode | Date |

## Active Work

| Developer | Feature / Task | Branch | Started |
|-----------|---------------|--------|---------|
| | | | |

## Next Up

**Feedback relay for lanmode (Issue #97)**
- Problem: Lanmode users can't submit feedback because `GITHUB_FEEDBACK_TOKEN` isn't configured
- Solution: Relay feedback through hamtab.net, fallback to GitHub issues link if unavailable
- Steps:
  1. Check if hostedmode `/api/feedback` is accessible without Cloudflare Access
  2. Add relay logic to lanmode server.js (when no local token, POST to hamtab.net)
  3. Add fallback UI to feedback.js (show GitHub link modal if relay fails)


## Recently Completed

Move finished items here for a few days so the other dev knows what changed, then delete.

| Developer | Feature / Task | Branch | Completed |
|-----------|---------------|--------|-----------|
| Steven + Claude | VOACAP lanmode fixes — Python env, race condition, PYTHONPATH | main | 2026-02-05 |
| Steven + Claude | VOACAP SNR thresholds reverted to ITU standard (CW:39, SSB:73, FT8:2) | main | 2026-02-05 |
| Steven + Claude | Settings sync — add GPS coordinates to hostedmode KV sync | hostedmode | 2026-02-05 |
| Steven + Claude | VOACAP bridge diagnostics endpoint (/api/voacap/status) | main | 2026-02-05 |
