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
| Steven + Claude | Phase 8 layout — non-overlapping widgets, responsive modals | main | 2026-02-04 |
| Francisco + Claude | Keyless ISS tracking + orbit path line (SGP4 via satellite.js) | main | 2026-02-04 |
| Francisco + Claude | Move band reference into Reference widget as Bands tab | main | 2026-02-04 |
| Steven + Claude | Operator info visibility — responsive scaling header | main | 2026-02-04 |
| Francisco + Claude | VOACAP integration via dvoacap-python | main | 2026-02-04 |
| Francisco + Claude | REL heatmap overlay for VOACAP widget | main | 2026-02-04 |
| Francisco + Claude | VOACAP DE→DX widget redesign | main | 2026-02-04 |
| Steven + Claude | Config modal redesign — tabs, scrollable, responsive (#96) | main | 2026-02-04 |
| Steven + Claude | Widget close buttons (x to hide) | main | 2026-02-04 |
| Steven + Claude | Configurable ports + uninstall scripts | lanmode | 2026-02-04 |
| Steven + Claude | README lanmode branch instructions | main | 2026-02-04 |
