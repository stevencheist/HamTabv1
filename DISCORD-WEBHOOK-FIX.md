# Fix: Discord Release Notification Webhook

**Issue:** [#139](https://github.com/stevencheist/HamTabv1/issues/139)
**Status:** Waiting on Steven (repo secret requires admin access to Discord server)
**Failing since:** v0.43.0 (2026-02-13)

## Problem

The `Discord Release Notification` workflow fails on every GitHub Release because the `DISCORD_RELEASES_WEBHOOK` secret is not set.

**Workflow file:** `.github/workflows/discord-release.yml`
**Secret name expected:** `DISCORD_RELEASES_WEBHOOK`

## Fix Steps

1. **Discord:** Server Settings → Integrations → Webhooks → Create webhook for `#releases` channel
2. **GitHub:** repo Settings → Secrets and variables → Actions → New repository secret
   - **Name:** `DISCORD_RELEASES_WEBHOOK`
   - **Value:** `https://discord.com/api/webhooks/...` (from step 1)
3. **Verify:** Re-run any failed release workflow (e.g. v0.53.2) to confirm the embed posts

## After Fix

- All future `gh release create` commands will auto-post a green embed to `#releases`
- Embed includes: version tag, release notes body (truncated to 3900 chars), link to GitHub release
- No code changes needed — workflow is correct, just needs the secret
