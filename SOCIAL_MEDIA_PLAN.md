# Social Media Plan

**Status:** Future work — not yet started
**Priority:** Low (nice-to-have, not blocking development)

## Goal

Automate or semi-automate social media updates when new features ship, integrated into the end-of-session or release workflow.

## Target Platforms

| Platform | Audience | Automation | Status |
|----------|----------|------------|--------|
| Twitter/X | General ham community | Requires paid API ($100/mo) — draft only unless paid | Not started |
| Reddit | r/amateurradio, r/hamradio | Free API — can fully automate | Not started |
| Facebook | Ham radio groups | No usable API — draft only | Not started |
| eHam.net forums | Experienced operators | No API — draft only | Not started |
| QRZ.com forums | Active operators | No API — draft only | Not started |

## Approach

### Phase 1: Draft Generation (no API keys needed)

Add to end-of-session protocol:

1. Compare commits since last social post (track last post date in `hamtab_last_social_post` or a file)
2. Summarize user-facing changes (skip internal refactors, docs-only changes)
3. Generate platform-specific drafts saved to `SOCIAL_DRAFTS.md`:
   - **Twitter** — 280 chars max, punchy, hashtags (#hamradio #POTA #SOTA #amateurradio #hamclock)
   - **Reddit** — Title + body, casual tone, screenshot if available, link to hamtab.net
   - **Facebook** — Mid-length, friendly, visual
   - **eHam** — Technical, what's new and why it matters, forum post format
   - **QRZ** — Similar to eHam, slightly more casual
4. User reviews drafts and posts manually

### Phase 2: Reddit Automation (free)

1. Register a Reddit app at reddit.com/prefs/apps (type: "script")
2. Store credentials in `.env`: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME`, `REDDIT_PASSWORD`
3. Create a simple Node script (`scripts/post-reddit.js`) that:
   - Authenticates via OAuth2
   - Posts to r/amateurradio (primary) and optionally r/hamradio
   - Takes title and body from `SOCIAL_DRAFTS.md` or command-line args
4. Integrate into end-of-session: after generating draft, ask user "Post to Reddit now?"

### Phase 3: Twitter Automation (paid — only if justified)

1. Only pursue if hamtab.net gets enough traction to justify $100/month API cost
2. Alternative: use a free scheduling tool (Buffer free tier, TweetDeck) with manual paste
3. If automated: store API keys in `.env`, create `scripts/post-twitter.js`

### Phase 4: GitHub Releases as Changelog Hub

1. On version tags, auto-generate release notes from commits since last tag
2. Link social posts back to GitHub Release for full changelog
3. Can do this now with `gh release create` — no additional setup

## Post Frequency

- **Don't post nightly** — too noisy, harms engagement
- **Post on minor version bumps** (new features) — e.g. v0.28.0 adds a widget
- **Skip patch versions** (bug fixes, refactors) — unless the fix is significant
- **Weekly digest** — alternative: batch a week's changes into one post (Fridays?)

## Post Templates

### Twitter
```
HamTab v{version} is out! {one-line feature summary}

{2-3 bullet points}

Free at hamtab.net - modern ham radio dashboard

#hamradio #amateurradio #POTA #SOTA #hamclock
```

### Reddit (r/amateurradio)
```
Title: HamTab v{version} — {feature headline}

Body:
Hey all, just pushed a new update to HamTab (free web-based ham radio dashboard).

**What's new in v{version}:**
- {feature 1}
- {feature 2}
- {feature 3}

{Brief description of what HamTab is for newcomers}

Try it at https://hamtab.net or self-host from GitHub.

Feedback welcome — we're building this based on what operators actually want.
```

### Facebook
```
HamTab v{version} update!

{2-3 sentences about what's new}

{Bullet points}

Free to use at hamtab.net — works on any device with a browser.
Self-hosting option available for your shack.

73!
```

### eHam / QRZ Forums
```
Title: HamTab v{version} — {feature headline}

Hi all,

We've just released v{version} of HamTab, a free web-based amateur radio dashboard.

New in this version:
- {feature 1 with technical detail}
- {feature 2 with technical detail}

HamTab provides real-time POTA/SOTA spots, DX cluster, propagation data,
satellite tracking, space weather, and more — all in one browser tab.

Available at https://hamtab.net (hosted) or self-host on your own hardware.

Feedback and feature requests welcome.

73 de {callsign}
```

## Implementation Checklist

- [ ] **Phase 1**: Add draft generation to end-of-session protocol
- [ ] **Phase 1**: Create `SOCIAL_DRAFTS.md` template
- [ ] **Phase 1**: Track last social post date
- [ ] **Phase 2**: Register Reddit app
- [ ] **Phase 2**: Create `scripts/post-reddit.js`
- [ ] **Phase 2**: Add Reddit credentials to `.env` template
- [ ] **Phase 3**: Evaluate Twitter API cost vs. benefit
- [ ] **Phase 4**: Set up `gh release create` in release workflow

## Notes

- Always have a human review before posting — AI-generated posts should sound natural, not robotic
- Include screenshots when possible — visual posts get 2-3x engagement
- Mention HamClock alternative positioning (especially with June 2026 shutdown)
- Don't spam — quality over quantity
- Track which platforms drive actual traffic to hamtab.net (check Cloudflare analytics if enabled)
