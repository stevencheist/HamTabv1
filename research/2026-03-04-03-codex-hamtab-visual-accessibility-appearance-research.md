# HamTab Visual Accessibility Appearance Mode — Research

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-04
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Summary
HamTab already has an appearance control plane (theme engine + Appearance tab toggles), so adding a dedicated low-vision mode is feasible without architectural rewrite. The current UI is heavily tuned for compact density (many `0.5rem`–`0.85rem` text sizes) and relies on color semantics in multiple widgets, which is the main gap for visual impairment support. A practical first release should add: global text scale presets, high-contrast token sets that pass WCAG contrast minimums, and non-color status cues for red/green/yellow states. A second release can add explicit color-vision presets (protan/deutan/tritan-safe), thicker focus indicators, and OS-level contrast integration (`prefers-contrast`/`forced-colors`).

## 1) Current HamTab Baseline (What Exists Today)

### Existing appearance infrastructure
- Theme system already uses CSS custom properties and persisted selection (`hamtab_theme`), with runtime `applyTheme()` in a dedicated module.
- Appearance tab already supports:
  - theme picker,
  - compact header,
  - grayscale mode,
  - weather background suppression,
  - per-band color overrides.
- State persistence patterns already exist for appearance toggles in `localStorage`.

### Existing accessibility-relevant controls
- `grayscale` mode is implemented as full-page desaturation (`body.grayscale { filter: grayscale(1); }`).
- Band colors are user-editable, which is a useful primitive for future color-vision presets.

### Current gaps
- Font sizing is mostly hard-coded across many selectors, often very small (`0.5rem`–`0.8rem`) in dense widgets.
- Multiple controls remove default outlines (`outline: none`) without a strong, global replacement focus treatment.
- Many status surfaces are color-first (green/yellow/red) with limited redundant encoding (icons/patterns/text labels).
- Significant number of hardcoded hex colors remain in `style.css`, reducing consistency and making contrast-safe mode harder to guarantee.

## 2) Standards and Constraints to Design Against

### WCAG criteria directly relevant to this work
- **1.4.3 Contrast (Minimum):** normal text contrast target 4.5:1, large text 3:1.
- **1.4.4 Resize text:** content should remain usable at 200% text scaling.
- **1.4.1 Use of Color:** information should not be conveyed by color alone.
- **1.4.11 Non-text Contrast:** UI components/focus indicators need sufficient contrast (3:1).
- **2.4.7 Focus Visible** and WCAG 2.2 **2.4.11 Focus Appearance**: keyboard focus must be obvious and sufficiently visible.

### Browser/platform hooks worth using
- `@media (prefers-contrast: more)` for users requesting stronger contrast.
- `@media (forced-colors: active)` for Windows High Contrast Mode compatibility.

## 3) What It Would Take (Implementation Scope)

## 3.1 Minimal shippable “Accessibility Appearance Mode” (recommended first release)
1. Add a new Appearance section: `Visual Accessibility`.
2. Add persisted settings:
   - `textScale`: `100% | 115% | 130% | 150%`
   - `contrastMode`: `normal | high`
   - `statusEncoding`: `color+text` (default for accessibility mode)
3. Introduce root-scale variables:
   - `--font-scale`, `--ui-density`, and key typography tokens (`--fs-xs`, `--fs-sm`, `--fs-md`, etc.).
4. Convert highest-impact tiny text clusters first (table cells, widget headers, side labels, rig overlays) to tokenized sizes.
5. Add high-contrast token set (new theme variant or overlay class) with verified contrast floors.
6. Add non-color semantic cues where currently color-only:
   - include text labels (`GOOD/FAIR/POOR`, `SAFE/CAUTION/DANGER`),
   - optional icons/pattern fills for meters/heatmaps.
7. Add global keyboard focus style with strong ring and avoid blanket `outline: none` unless replaced with explicit, visible `:focus-visible` style.

## 3.2 Expanded release (color-vision support)
1. Add `Color Vision Preset` selector:
   - `Default`, `Deuteranopia-safe`, `Protanopia-safe`, `Tritanopia-safe`, `Monochrome-safe`.
2. Provide palette remaps for:
   - band colors,
   - condition badges,
   - map overlay gradients,
   - rig warning/tx indicators.
3. Add “preview sample” strip in Appearance tab showing all semantic states side-by-side.
4. Auto-apply high-contrast if OS requests increased contrast.

## 3.3 Verification work required
1. Automated contrast checks for token pairs (text, borders, focus ring).
2. Manual keyboard traversal audit (focus visibility and order).
3. Manual browser zoom/text resize tests at 125/150/200%.
4. Color-vision simulation checks for critical workflows (spot list, VOACAP, rig alarms).

## 4) Effort / Risk Estimate

| Scope | Effort | Risk | Notes |
|---|---:|---:|---|
| Accessibility mode MVP (text scale + high contrast + focus + non-color labels in primary widgets) | 3-5 dev days | Medium | Main work is CSS tokenization and regression testing across many widgets |
| Full color-vision preset system across all semantic colors + map layers | +4-7 dev days | Medium-High | Requires harmonizing many hardcoded colors and preserving theme identity |
| Ongoing accessibility QA hardening | +1-2 days per major release | Medium | Needed to prevent regressions as new widgets/styles land |

## 5) Recommended Rollout Plan

1. **Phase A (fastest value):** Add text scale + high-contrast toggle + focus-ring standard.
2. **Phase B:** Add non-color status indicators in On-Air table, Band Conditions, VOACAP, On-Air Rig.
3. **Phase C:** Add color-vision presets and migrate hardcoded colors to semantic tokens.
4. **Phase D:** Add OS preference listeners (`prefers-contrast`, `forced-colors`) and docs.

## 6) Key Code Touchpoints (HamTab)

- Theme engine and token application:
  - `/home/fpeebles/coding/HamTabV1/src/themes.js:10`
  - `/home/fpeebles/coding/HamTabV1/src/themes.js:162`
- Appearance state persistence:
  - `/home/fpeebles/coding/HamTabV1/src/state.js:41`
  - `/home/fpeebles/coding/HamTabV1/src/state.js:42`
  - `/home/fpeebles/coding/HamTabV1/src/state.js:43`
- Appearance tab UI controls:
  - `/home/fpeebles/coding/HamTabV1/public/index.html:459`
  - `/home/fpeebles/coding/HamTabV1/public/index.html:473`
  - `/home/fpeebles/coding/HamTabV1/public/index.html:484`
- Appearance control wiring:
  - `/home/fpeebles/coding/HamTabV1/src/splash.js:396`
  - `/home/fpeebles/coding/HamTabV1/src/splash.js:1690`
  - `/home/fpeebles/coding/HamTabV1/src/splash.js:1700`
  - `/home/fpeebles/coding/HamTabV1/src/splash.js:1710`
- Current grayscale implementation:
  - `/home/fpeebles/coding/HamTabV1/public/style.css:6908`
- Band color customization base:
  - `/home/fpeebles/coding/HamTabV1/src/constants.js:736`
  - `/home/fpeebles/coding/HamTabV1/src/constants.js:760`
- Representative dense typography / color-coded UI examples:
  - `/home/fpeebles/coding/HamTabV1/public/style.css:1095`
  - `/home/fpeebles/coding/HamTabV1/public/style.css:3763`
  - `/home/fpeebles/coding/HamTabV1/public/style.css:1416`
  - `/home/fpeebles/coding/HamTabV1/public/style.css:7421`
- Focus visibility concerns (`outline: none` patterns):
  - `/home/fpeebles/coding/HamTabV1/public/style.css:141`
  - `/home/fpeebles/coding/HamTabV1/public/style.css:250`
  - `/home/fpeebles/coding/HamTabV1/public/style.css:3150`

## 7) Decision Recommendation

- Build this as a **first-class appearance profile**, not ad-hoc per-widget tweaks.
- Start with **global typography scale + high contrast + robust focus**; this delivers immediate value to low-vision users.
- Treat color-blind support as **semantic palette system** (tokenized), not one-off color overrides.

## Sources

### Accessibility standards / platform docs
- W3C WCAG 2.2 Recommendation: https://www.w3.org/TR/WCAG22/
- W3C Understanding SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C Understanding SC 1.4.4 Resize text: https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
- W3C Understanding SC 1.4.1 Use of Color: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- W3C Understanding SC 1.4.11 Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- W3C Understanding SC 2.4.11 Focus Appearance: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- MDN `prefers-contrast`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast
- MDN `forced-colors`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors

### HamTab codebase references
- See file:line references above.
