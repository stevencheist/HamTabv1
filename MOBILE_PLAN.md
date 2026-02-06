# Mobile-Friendly HamTab — Implementation Plan

**Created:** 2026-02-04
**Status:** Planning
**Branch:** `main` (shared feature — works in both modes)

---

## Current State Summary

HamTab is desktop-only. Key blockers for mobile:

- **Zero media queries** — no responsive breakpoints
- **Zero touch events** — drag/resize is mouse-only (`mousedown`/`mousemove`/`mouseup`)
- **800px minimum width** on `.widget-area` (style.css:736) — forces horizontal scroll
- **150px × 80px minimum** per widget (style.css:750-751) — fine for mobile
- **Three-column absolute positioning** — assumes ~1200px+ viewport
- **Small touch targets** — resize handles 18px, close buttons ~24-30px (need 44px+)
- **Header overflows** — 3 flex sections wrap awkwardly on narrow screens

**What already works:** Leaflet map (built-in touch), modals (fixed + scroll), viewport meta tag, flexbox throughout, config tabs.

---

## Breakpoint Strategy

| Breakpoint | Name | Layout | Interaction |
|---|---|---|---|
| `>= 1024px` | Desktop | Current 3-column absolute positioning | Drag + resize |
| `768px–1023px` | Tablet | 2-column, locked positions | No drag/resize |
| `< 768px` | Mobile | Single-column vertical stack | No drag/resize, collapsed header |

**CSS variable for detection:**
```css
:root { --layout-mode: 'desktop'; }
@media (max-width: 1023px) { :root { --layout-mode: 'tablet'; } }
@media (max-width: 767px) { :root { --layout-mode: 'mobile'; } }
```

**JS detection (constants.js):**
```js
export const BREAKPOINT_MOBILE = 768;
export const BREAKPOINT_TABLET = 1024;
export function getLayoutMode() {
  const w = window.innerWidth;
  if (w < BREAKPOINT_MOBILE) return 'mobile';
  if (w < BREAKPOINT_TABLET) return 'tablet';
  return 'desktop';
}
```

---

## Phase 1: Make It Usable

**Goal:** HamTab loads and is functional on phones. No horizontal scroll, widgets are visible, buttons are tappable.

### 1.1 — Add breakpoint constants

**File:** `src/constants.js`

- Add `BREAKPOINT_MOBILE = 768` and `BREAKPOINT_TABLET = 1024`
- Add `getLayoutMode()` helper function
- Export both for use in widgets.js and other modules

### 1.2 — Remove hard minimum on widget area

**File:** `public/style.css` (line 736-737)

Current:
```css
.widget-area {
  min-width: 800px;
  min-height: 400px;
}
```

Change to:
```css
.widget-area {
  min-width: 0;
  min-height: 0;
}
```

This single change stops the forced horizontal scroll on mobile.

### 1.3 — Add mobile stacked layout in CSS

**File:** `public/style.css` (new section at bottom)

Add a `@media (max-width: 767px)` block that:

1. **Switches `.widget-area` to flex column:**
   ```css
   @media (max-width: 767px) {
     .widget-area {
       position: relative;        /* was: relative already, but widgets are absolute */
       display: flex;
       flex-direction: column;
       gap: 4px;
       padding: 4px;
       overflow-y: auto;          /* enable vertical scroll */
       overflow-x: hidden;
     }

     .widget {
       position: static !important;  /* override inline absolute styles */
       width: 100% !important;
       height: auto !important;
       min-height: 120px;
       left: auto !important;
       top: auto !important;
     }
   }
   ```

2. **Sets sensible default heights per widget type:**
   ```css
   @media (max-width: 767px) {
     #widget-map { min-height: 300px; }
     #widget-map .widget-body,
     #widget-map #map { height: 280px; }
     #widget-activations { min-height: 250px; }
     #widget-filters { min-height: auto; }
     #widget-solar { min-height: 200px; }
   }
   ```

3. **Hides resize handles on mobile:**
   ```css
   @media (max-width: 767px) {
     .widget-resize { display: none; }
   }
   ```

### 1.4 — Mobile widget order

**File:** `public/index.html`

The DOM order determines the mobile stack order. Current order in HTML is already reasonable:
1. Filters
2. Activations (On the Air)
3. Map
4. Solar
5. Band Conditions
6. HF Propagation
7. Live Spots
8. Lunar / EME
9. Satellites
10. Reference
11. DX Detail

This is a good mobile order — primary content first. No HTML changes needed initially. If we want to reorder on mobile without changing HTML, we can use CSS `order` properties.

### 1.5 — Fix header for mobile

**File:** `public/style.css`

```css
@media (max-width: 767px) {
  header {
    flex-direction: column;
    align-items: stretch;
    padding: 4px 8px;
    gap: 4px;
    height: auto;        /* remove fixed height */
    min-height: auto;
  }

  .header-left {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-center {
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  .header-right {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    font-size: 0.7rem;
  }

  /* Reduce clock size on mobile */
  .header-clock { min-width: 120px; }
  .header-clock-time { font-size: 1rem; }
}
```

### 1.6 — Enlarge touch targets

**File:** `public/style.css`

```css
@media (max-width: 1023px) {
  /* All buttons get minimum 44px touch targets */
  button, .op-btn, .source-tab, .toggle-btn,
  .widget-help-btn, .widget-cfg-btn, .widget-close-btn,
  .map-center-btn, .prop-metric-btn {
    min-height: 44px;
    min-width: 44px;
  }

  /* Filter buttons */
  .band-btn, .mode-btn {
    min-height: 36px;
    padding: 6px 10px;
  }

  /* Select dropdowns */
  select {
    min-height: 44px;
    font-size: 16px;  /* prevents iOS zoom on focus */
  }

  /* Input fields — 16px font prevents iOS zoom */
  input[type="text"], input[type="number"], input[type="email"] {
    font-size: 16px;
    min-height: 44px;
  }
}
```

### 1.7 — Disable drag/resize on mobile in JS

**File:** `src/widgets.js`

Modify `initWidgets()` to skip drag/resize setup on mobile:

```js
// In initWidgets(), wrap drag/resize setup:
import { getLayoutMode } from './constants.js';

document.querySelectorAll('.widget').forEach(widget => {
  const header = widget.querySelector('.widget-header');
  const resizer = widget.querySelector('.widget-resize');

  if (header) {
    // Only enable drag on desktop
    if (getLayoutMode() === 'desktop') {
      setupDrag(widget, header);
    }
    // Close button always enabled
    // ... (existing close button code)
  }

  if (resizer && getLayoutMode() === 'desktop') {
    setupResize(widget, resizer);
  }

  // Only bring-to-front on desktop
  if (getLayoutMode() === 'desktop') {
    widget.addEventListener('mousedown', () => bringToFront(widget));
  }
});
```

Modify `reflowWidgets()` to skip on mobile (CSS handles layout):

```js
function reflowWidgets() {
  if (getLayoutMode() !== 'desktop') return;
  // ... existing code
}
```

Modify `applyLayout()` to skip inline styles on mobile:

```js
function applyLayout(layout) {
  if (getLayoutMode() !== 'desktop') return;
  // ... existing code
}
```

### 1.8 — Fix modal widths for small screens

**File:** `public/style.css`

```css
@media (max-width: 767px) {
  .splash-box {
    min-width: 0;
    width: 95vw;
    max-width: 95vw;
    padding: 16px 12px;
    max-height: 90vh;
  }

  .config-box {
    max-width: 95vw;
  }

  .band-ref-box { max-width: 95vw; }
  .feedback-box { max-width: 95vw; }
  .help-box { max-width: 95vw; }
}
```

### 1.9 — Fix map invalidation on mobile

**File:** `src/widgets.js`

The map needs its size invalidated after the mobile layout settles:

```js
// After applyLayout or on mobile init:
if (getLayoutMode() !== 'desktop' && state.map) {
  setTimeout(() => state.map.invalidateSize(), 200);
}
```

### 1.10 — Table horizontal scroll on mobile

**File:** `public/style.css`

The activations table has many columns. Wrap it for horizontal scroll on mobile:

```css
@media (max-width: 767px) {
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  #spotsTable {
    font-size: 0.75rem;
  }

  #spotsTable th, #spotsTable td {
    padding: 6px 4px;
    white-space: nowrap;
  }
}
```

### Phase 1 Checklist

- [ ] Add breakpoint constants to `src/constants.js`
- [ ] Remove `min-width: 800px` from `.widget-area` in `style.css`
- [ ] Add `@media (max-width: 767px)` mobile layout rules
- [ ] Add `@media (max-width: 1023px)` tablet touch target rules
- [ ] Fix header layout for mobile
- [ ] Disable drag/resize on mobile in `widgets.js`
- [ ] Skip `reflowWidgets()` and `applyLayout()` on mobile
- [ ] Fix modal widths for small screens
- [ ] Add map invalidation delay for mobile
- [ ] Add horizontal scroll to tables on mobile
- [ ] Test on real devices (iPhone SE, iPhone 14, Pixel 7, iPad)
- [ ] Test orientation changes (portrait ↔ landscape)

### Files Changed in Phase 1

| File | Changes |
|---|---|
| `src/constants.js` | Add breakpoints, `getLayoutMode()` |
| `src/widgets.js` | Conditional drag/resize, skip layout on mobile |
| `public/style.css` | Media queries, touch targets, header, modals, tables |

---

## Phase 2: Make It Good

**Goal:** Purposeful mobile UX — not just "works" but "feels right." Redesigned header, better navigation, optimized widget content.

### 2.1 — Collapsible header with hamburger menu

**Files:** `public/index.html`, `public/style.css`, `src/main.js` (or new `src/mobile-nav.js`)

Replace the 3-section header on mobile with:
- **Slim top bar:** Callsign + hamburger icon + clock (single line)
- **Slide-out menu:** Contains all header-right buttons (Refresh, Config, Reset Layout, Fullscreen, Feedback, etc.)

```html
<!-- Add to index.html, inside <header> -->
<button class="hamburger-btn" id="hamburgerBtn" aria-label="Menu">☰</button>
<nav class="mobile-menu hidden" id="mobileMenu">
  <!-- JS will clone header-right buttons here on mobile -->
</nav>
```

```css
@media (max-width: 767px) {
  .hamburger-btn {
    display: block;
    font-size: 1.4rem;
    background: none;
    border: none;
    color: var(--text);
    min-height: 44px;
    min-width: 44px;
  }

  .mobile-menu {
    position: fixed;
    top: 0;
    right: 0;
    width: 260px;
    height: 100%;
    background: var(--surface);
    border-left: 1px solid var(--border);
    z-index: 9999;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    transform: translateX(100%);
    transition: transform 0.25s ease;
  }

  .mobile-menu.open {
    transform: translateX(0);
  }

  .mobile-menu.hidden { display: none; }

  /* Hide desktop header sections on mobile */
  .header-right { display: none; }
  .header-center .header-clock-weather,
  .header-center .wx-source-logo { display: none; }
}

@media (min-width: 768px) {
  .hamburger-btn { display: none; }
  .mobile-menu { display: none; }
}
```

**JS logic:**
```js
// In mobile-nav.js or main.js
const hamburger = document.getElementById('hamburgerBtn');
const menu = document.getElementById('mobileMenu');

hamburger?.addEventListener('click', () => {
  menu.classList.toggle('open');
  menu.classList.remove('hidden');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== hamburger) {
    menu.classList.remove('open');
  }
});
```

### 2.2 — Widget accordion / collapsible sections on mobile

**Files:** `public/style.css`, `src/widgets.js`

On mobile, widgets take up a lot of vertical space. Make widget bodies collapsible:

- Tap the widget header to expand/collapse the body
- Only one or two widgets expanded at a time (optional — could allow multiple)
- Map and Activations expanded by default, others collapsed
- Visual indicator (chevron ▸/▾) on the header

```css
@media (max-width: 767px) {
  .widget-header {
    cursor: pointer;
    padding: 10px 12px;
    display: flex;
    align-items: center;
  }

  .widget-header::after {
    content: '▾';
    margin-left: auto;
    font-size: 0.8rem;
    transition: transform 0.2s;
  }

  .widget.collapsed .widget-header::after {
    content: '▸';
  }

  .widget.collapsed .widget-body {
    display: none;
  }
}
```

**JS logic (in widgets.js):**
```js
if (getLayoutMode() !== 'desktop') {
  document.querySelectorAll('.widget-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't collapse when clicking buttons inside header
      if (e.target.tagName === 'BUTTON') return;
      header.closest('.widget').classList.toggle('collapsed');
    });
  });

  // Collapse non-primary widgets by default on mobile
  const expandedByDefault = ['widget-map', 'widget-activations'];
  document.querySelectorAll('.widget').forEach(w => {
    if (!expandedByDefault.includes(w.id)) {
      w.classList.add('collapsed');
    }
  });
}
```

### 2.3 — Full-screen map mode

**Files:** `public/style.css`, `src/map-init.js`

Add a "maximize" button on the map widget that makes it full-screen on mobile:

```css
@media (max-width: 767px) {
  .widget-map-fullscreen {
    position: fixed !important;
    inset: 0 !important;
    z-index: 9998;
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0;
  }

  .map-fullscreen-btn {
    display: block;
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 1000;
    min-height: 44px;
    min-width: 44px;
  }
}
```

### 2.4 — Card layout for activations on mobile

**Files:** `public/style.css`, `src/spots.js`

Instead of a wide table, show each spot as a card:

```css
@media (max-width: 767px) {
  /* Hide the table header on mobile */
  #spotsTable thead { display: none; }

  #spotsTable tbody tr {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 8px;
    padding: 8px;
    border-bottom: 1px solid var(--border);
  }

  #spotsTable td {
    padding: 2px 0;
  }

  /* Key info spans full width */
  #spotsTable td.callsign {
    grid-column: 1 / -1;
    font-size: 1rem;
    font-weight: bold;
  }
}
```

Alternative: JS-based card rendering that swaps the table for a different DOM structure on mobile. This gives more control but is more code. Recommend starting with CSS-only approach.

### 2.5 — Improved filter layout for mobile

**Files:** `public/style.css`

Filters need to wrap properly on narrow screens:

```css
@media (max-width: 767px) {
  .filter-row {
    flex-wrap: wrap;
    gap: 4px;
  }

  .band-filters, .mode-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .band-btn, .mode-btn {
    flex: 0 0 auto;
    font-size: 0.75rem;
    padding: 6px 8px;
  }

  .filter-row-range {
    flex-direction: column;
  }

  /* Stack dropdowns vertically */
  #countryFilter, #stateFilter, #gridFilter, #continentFilter {
    width: 100%;
  }
}
```

### 2.6 — Pull-to-refresh

**Files:** `src/mobile-nav.js` (new), `public/style.css`

Native-feeling pull-to-refresh at the top of the widget area on mobile:

```js
// Detect pull-down gesture at top of scroll
let touchStartY = 0;
const widgetArea = document.getElementById('widgetArea');

widgetArea.addEventListener('touchstart', (e) => {
  if (widgetArea.scrollTop === 0) {
    touchStartY = e.touches[0].clientY;
  }
});

widgetArea.addEventListener('touchmove', (e) => {
  if (widgetArea.scrollTop === 0) {
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 80) {
      // Trigger refresh
      document.getElementById('refreshBtn').click();
      touchStartY = Infinity; // prevent re-trigger
    }
  }
});
```

### 2.7 — Orientation change handling

**File:** `src/widgets.js`

```js
window.addEventListener('orientationchange', () => {
  // Wait for browser to finish rotating
  setTimeout(() => {
    if (state.map) state.map.invalidateSize();
  }, 300);
});
```

### Phase 2 Checklist

- [ ] Hamburger menu for mobile header
- [ ] Widget accordion (collapsible bodies on mobile)
- [ ] Full-screen map mode
- [ ] Card layout for activations table
- [ ] Improved filter wrapping
- [ ] Pull-to-refresh gesture
- [ ] Orientation change handling
- [ ] Test hamburger menu open/close
- [ ] Test accordion expand/collapse
- [ ] Test map full-screen enter/exit
- [ ] Test across devices (iPhone SE → iPad Pro)

### Files Changed in Phase 2

| File | Changes |
|---|---|
| `public/index.html` | Hamburger button, mobile-menu nav element, map fullscreen button |
| `public/style.css` | Hamburger menu, accordion, card layout, filter wrapping, fullscreen map |
| `src/widgets.js` | Accordion logic, orientation handler |
| `src/mobile-nav.js` | **New file** — hamburger toggle, pull-to-refresh |
| `src/map-init.js` | Fullscreen map toggle |
| `src/main.js` | Import mobile-nav module |

---

## Phase 3: Make It Great

**Goal:** Polish, performance, and touch-native interactions. Tablet gets drag support. Mobile feels like a purpose-built app.

### 3.1 — Touch drag/resize for tablets

**File:** `src/widgets.js`

Add touch event handlers parallel to mouse events in `setupDrag()` and `setupResize()`:

```js
function setupDrag(widget, handle) {
  let startX, startY, origLeft, origTop;

  function onStart(clientX, clientY) {
    bringToFront(widget);
    startX = clientX;
    startY = clientY;
    origLeft = parseInt(widget.style.left) || 0;
    origTop = parseInt(widget.style.top) || 0;
  }

  function onMove(clientX, clientY) {
    let newLeft = origLeft + (clientX - startX);
    let newTop = origTop + (clientY - startY);
    // ... snap + clamp logic (unchanged)
    widget.style.left = newLeft + 'px';
    widget.style.top = newTop + 'px';
  }

  function onEnd() {
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', onEnd);
    saveWidgets();
  }

  function mouseMove(e) { onMove(e.clientX, e.clientY); }
  function touchMove(e) {
    e.preventDefault();
    onMove(e.touches[0].clientX, e.touches[0].clientY);
  }

  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onStart(e.clientX, e.clientY);
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', onEnd);
  });

  handle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onStart(e.touches[0].clientX, e.touches[0].clientY);
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, { passive: false });
}

// Same pattern for setupResize()
```

Only enable on tablets (`getLayoutMode() === 'tablet'` or `'desktop'`), not phones.

### 3.2 — Larger resize handles on touch

**File:** `public/style.css`

```css
@media (max-width: 1023px) {
  .widget-resize {
    width: 44px;
    height: 44px;
    /* Larger visual indicator */
  }

  .widget-resize::after {
    /* Larger grip dots/lines */
    width: 20px;
    height: 20px;
  }
}
```

### 3.3 — Smooth transitions between layouts

**File:** `src/widgets.js`, `public/style.css`

When resizing across breakpoints (e.g., rotating a tablet from landscape to portrait), smoothly transition:

```css
@media (max-width: 767px) {
  .widget {
    transition: none;  /* instant stacking on mobile */
  }
}

@media (min-width: 768px) {
  .widget {
    transition: left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
  }
}
```

Add a resize listener that detects breakpoint crossings and re-initializes layout mode:

```js
let currentMode = getLayoutMode();

window.addEventListener('resize', debounce(() => {
  const newMode = getLayoutMode();
  if (newMode !== currentMode) {
    currentMode = newMode;
    onLayoutModeChange(newMode);
  }
}, 200));

function onLayoutModeChange(mode) {
  if (mode === 'desktop') {
    // Restore saved layout
    const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (saved) applyLayout(JSON.parse(saved));
    else applyLayout(getDefaultLayout());
  }
  // Mobile/tablet handled by CSS
  if (state.map) setTimeout(() => state.map.invalidateSize(), 200);
}
```

### 3.4 — Mobile-optimized map controls

**File:** `src/map-init.js`, `public/style.css`

- Increase default zoom level on mobile (less detail, more coverage)
- Larger marker clusters (bigger tap targets)
- Move Leaflet zoom controls to bottom-right (thumb-friendly)

```js
if (getLayoutMode() === 'mobile') {
  map.setZoom(2);  // wider view
  map.zoomControl.setPosition('bottomright');
}
```

```css
@media (max-width: 767px) {
  .leaflet-control-zoom a {
    width: 44px !important;
    height: 44px !important;
    line-height: 44px !important;
    font-size: 1.2rem !important;
  }
}
```

### 3.5 — Swipe navigation between widgets (mobile)

**File:** `src/mobile-nav.js`

Optional: Allow left/right swipe to switch between widgets like pages:

```js
// Detect horizontal swipes
let swipeStartX = 0;
let swipeStartY = 0;

widgetArea.addEventListener('touchstart', (e) => {
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
});

widgetArea.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - swipeStartX;
  const dy = e.changedTouches[0].clientY - swipeStartY;

  // Only trigger on horizontal swipes (not vertical scroll)
  if (Math.abs(dx) > 80 && Math.abs(dy) < 40) {
    if (dx > 0) scrollToPrevWidget();
    else scrollToNextWidget();
  }
});
```

This is optional and should only be added if user testing shows navigation difficulty.

### 3.6 — Bottom navigation bar (mobile)

**File:** `public/index.html`, `public/style.css`, `src/mobile-nav.js`

Persistent bottom bar with quick-access icons for the most-used widgets:

```html
<nav class="bottom-nav" id="bottomNav">
  <button data-scroll-to="widget-map" title="Map">🗺️</button>
  <button data-scroll-to="widget-activations" title="Spots">📡</button>
  <button data-scroll-to="widget-filters" title="Filters">🔍</button>
  <button data-scroll-to="widget-solar" title="Solar">☀️</button>
  <button data-scroll-to="widget-live-spots" title="Live">📊</button>
</nav>
```

```css
@media (max-width: 767px) {
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 9000;
  }

  .bottom-nav button {
    flex: 1;
    height: 100%;
    background: none;
    border: none;
    color: var(--text);
    font-size: 1.2rem;
  }

  /* Add padding to widget area so content isn't hidden behind bottom nav */
  .widget-area {
    padding-bottom: 60px;
  }
}

@media (min-width: 768px) {
  .bottom-nav { display: none; }
}
```

### 3.7 — Performance optimizations for mobile

**File:** Various

- **Reduce marker count on mobile** — Show max 200 markers instead of all (mobile GPUs struggle with 500+)
- **Throttle updates** — Increase `reflowWidgets` debounce on mobile (300ms vs 150ms)
- **Lazy-load hidden widgets** — Don't render collapsed widget content until first expand
- **Reduce animation** — Add `@media (prefers-reduced-motion: reduce)` rules
- **Image optimization** — Solar canvas: reduce resolution on mobile (150x150 vs 200x200)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 3.8 — PWA manifest (optional future)

**Files:** `public/manifest.json` (new), `public/index.html`

Make HamTab installable as a PWA on mobile home screens:

```json
{
  "name": "HamTab",
  "short_name": "HamTab",
  "description": "Amateur Radio Dashboard",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

This is a stretch goal — not required for mobile-friendliness but adds polish. Requires creating app icons.

### Phase 3 Checklist

- [ ] Touch drag/resize on tablets
- [ ] Larger resize handles for touch
- [ ] Smooth layout transitions across breakpoints
- [ ] Mobile-optimized map controls
- [ ] Swipe navigation (optional, based on testing)
- [ ] Bottom navigation bar
- [ ] Performance optimizations (marker count, throttling)
- [ ] `prefers-reduced-motion` support
- [ ] PWA manifest (optional)
- [ ] Full cross-device testing matrix
- [ ] Lighthouse mobile audit (target score > 80)

### Files Changed in Phase 3

| File | Changes |
|---|---|
| `src/widgets.js` | Touch events for drag/resize, breakpoint crossing handler |
| `src/mobile-nav.js` | Swipe navigation, bottom nav scroll-to logic |
| `src/map-init.js` | Mobile zoom, control positions |
| `src/constants.js` | Possibly add mobile-specific constants |
| `public/style.css` | Touch handle sizes, transitions, bottom nav, reduced motion |
| `public/index.html` | Bottom nav element, PWA manifest link |
| `public/manifest.json` | **New file** (optional) |

---

## Testing Matrix

| Device | Screen | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|
| iPhone SE (375×667) | Small phone | Must work | Optimized | Polished |
| iPhone 14 (390×844) | Standard phone | Must work | Optimized | Polished |
| iPhone 14 Pro Max (430×932) | Large phone | Must work | Optimized | Polished |
| Pixel 7 (412×915) | Android phone | Must work | Optimized | Polished |
| iPad Mini (744×1133) | Small tablet | Must work | 2-col layout | Touch drag |
| iPad (810×1080) | Standard tablet | Must work | 2-col layout | Touch drag |
| iPad Pro 12.9" (1024×1366) | Large tablet | Landscape=desktop | 2-col portrait | Full tablet UX |

**Browser testing:** Safari iOS, Chrome Android, Firefox Android, Samsung Internet

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| `!important` overrides clash with inline styles | High | Use CSS specificity + JS coordination |
| Leaflet performance on mobile | Medium | Limit markers, reduce overlay complexity |
| iOS Safari quirks (100vh, rubber-banding) | Medium | Use `dvh` units, test early |
| Breaking desktop layout | High | All changes gated behind media queries |
| Widget visibility state vs. mobile collapsed state | Medium | Keep separate — visibility = user preference, collapsed = mobile UX |
| localStorage layout data conflicts | Medium | Save desktop/mobile layouts separately |

---

## Estimated Scope

| Phase | Effort | Files Touched | Impact |
|---|---|---|---|
| Phase 1 | 1-2 sessions | 3 files | Usable on phones |
| Phase 2 | 2-3 sessions | 5-6 files | Good mobile UX |
| Phase 3 | 3-4 sessions | 6-7 files | Native-feel polish |

---

## Notes

- All mobile work goes on `main` (shared code — both modes benefit)
- Version bump: minor version for Phase 1 (it's a feature), patch for Phases 2-3
- No new npm dependencies needed — all CSS/vanilla JS
- The CSS `!important` on mobile widget positioning is necessary to override the inline styles set by the desktop JS layout engine. This is the standard approach for responsive overrides of JS-positioned elements.
