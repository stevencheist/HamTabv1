---
name: hamtab-add-widget
description: Scaffold a new HamTabV1 dashboard widget end-to-end — registration, HTML, JS module, styles, feature flag, mandatory docs, and the matching mobile WidgetDefinition.swift entry. Use when the user asks to add/create a new widget (panel, card, gauge, list) to the HamTab dashboard.
---

# HamTab — Add a Widget

Adds a widget to the dashboard following the existing pattern. A widget is "done" only when the
code, the feature flag, the docs, AND the mobile sync are all in place (CLAUDE.md §User Guide
Documentation makes docs mandatory in the same commit). All work is on `main` (widgets are shared
code); deploy afterward with the `hamtab-sync-branches` skill.

## Source of truth

The authoritative rules are `CLAUDE.md` (§Feature Flags, §User Guide Documentation, §README.md
Updates, §Commenting Style). This skill is the executable checklist — if CLAUDE.md changes, follow
it. Develop on `main` only (never edit `public/app.js` — it's the generated bundle).

## Inputs to settle first

- **`id`** — `widget-<slug>` (DOM id; must be globally unique and match the mobile entry).
- **`name`** — full display name; **`short`** — ≤4-char tab label.
- **column** — right-stacked (most data widgets) vs. fixed-position. Right-stacked widgets get
  added to `rightBottomIds`.
- **flag name** — snake_case feature-flag key (e.g. `band_score`), gated to `dev:<your-callsign>`.
- **data source** — does it need a new `/api/...` proxy route (`server.js`, via `secureFetch`)? If
  so, that's separate backend work; this skill covers the client widget.

## Steps (use a real example as a template)

`widget-band-score` is a clean recent example — read `src/band-score.js`, its `index.html` block,
`WIDGET_DEFS`/`WIDGET_HELP` entries, and its `FEATURE_FLAGS` key, and mirror them.

1. **Register — `src/constants.js`**
   - Append to `WIDGET_DEFS` (array starts line 7): `{ id: 'widget-<slug>', name: '<Name>', short: '<Sh>' }`.
   - Append a `WIDGET_HELP['widget-<slug>']` entry (object starts line ~426): `{ title, description, sections: [{ heading, content }, ...] }`. Beginner-friendly, no unexplained jargon (CLAUDE.md project goals).

2. **Markup — `public/index.html`**
   - Add inside `#widgetArea` (line ~761), mirroring the band-score block (~line 967):
     ```html
     <div class="widget" id="widget-<slug>">
       <div class="widget-header">
         <h2>...</h2>
         <button class="widget-help-btn" data-widget="widget-<slug>" title="Help" aria-label="Help for <Name>">?</button>
       </div>
       <div id="<slug>Content"></div>
     </div>
     ```

3. **Module — `src/<slug>.js`**
   - New ES module exporting an init fn, e.g. `export function init<Name>() { ... }`.
   - Render into `#<slug>Content`. Use `esc()` (`src/utils.js`) for any API/user data put into HTML.
   - Any outbound HTTP from a new server route must use `secureFetch` — never raw `fetch` server-side.
   - Comment per CLAUDE.md §Commenting Style (units on magic numbers, citations for algorithms).
   - Any cache must self-evict (follow existing patterns).

4. **Wire it up — `src/main.js`**
   - Add `import { init<Name> } from './<slug>.js';` alongside the other widget imports (~lines 44–69).
   - Add `safeInit('<slug>', init<Name>);` alongside the other `safeInit(...)` calls (~line 122+).

5. **Layout — `src/widgets.js`** (only if right-stacked)
   - Add `'widget-<slug>'` to **both** `rightBottomIds` arrays (lines ~95 and ~146).

6. **Styles — `public/style.css`**
   - Add `#widget-<slug>` / `.<slug>-*` rules using existing CSS custom properties (theme vars), not hardcoded colors. Mirror band-score's `.band-score-*` rules (~line 3775).

7. **Feature flag — `src/feature-flags.js`** (MANDATORY for user-facing features)
   - Add to `FEATURE_FLAGS`: `<flag_name>: 'dev:<your-callsign>',  // <Name> widget (v<next-version>)`.
   - Guard the UI with `isFeatureVisible('<flag_name>')`; hide the whole widget if false. Never use a raw callsign check.

8. **Docs — MANDATORY, same commit** (CLAUDE.md §User Guide Documentation / §README.md Updates)
   - `README.md` — Features list + Widgets config list.
   - `docs/user-guide/content/03-widgets.md` — user-facing description + how to use.
   - (Widget help text already added in step 1 via `WIDGET_HELP`.)
   - If a new external API was added: README External APIs table + `docs/user-guide/content/05-data-sources.md`.

9. **Mobile sync — `hamtab-mobile/HamTabMobile/Models/WidgetDefinition.swift`**
   - Append `WidgetDefinition(id: "widget-<slug>", name: "<Name>", sfSymbol: "<sf.symbol>")` — `id` MUST match step 1 exactly. Pick an SF Symbol that fits.
   - This is a plain text edit (safe to do from this Linux box); the iOS build itself is Mac-only.
   - **Cross-org note:** `hamtab-mobile` is a sffoundry repo, HamTabV1 is stevencheist — both accessible here, but commit each repo separately on its own branch.

10. **Build & verify**
    - `npm run build` (regenerates `public/app.js`). Optionally `npm start` + `/verify` to see it render with your dev callsign set.
    - Bump `package.json` version (minor for a new feature) per CLAUDE.md §Versioning.

## Finish

- Commit web (`HamTabV1` on `main`) and mobile (`hamtab-mobile`) changes separately.
- Then run the **`hamtab-sync-branches`** skill to deploy the widget to `lanmode`/`hostedmode`.
- Remind the user: promote the feature flag `dev:` → `test` → `release` when ready (CLAUDE.md §Feature Flags).

## Drift note (2026-06-11)

Mobile was 3 widgets behind web at skill-creation time. If you're adding the first widget since,
also backfill the missing mobile entries: `widget-on-air-rig` (On-Air Rig), `widget-logbook`
(Logbook), `widget-band-score` (Band Score).
