// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- Theme Engine ---
// Manages color themes and CSS class overrides.
// Each theme is a named object with CSS custom property values and an optional.
// BodyClass for shape/font overrides (e.g. LCARS pill shapes).
import { isFeatureVisible } from './feature-flags.js';

const STORAGE_KEY = 'hamtab_theme';
// Pseudo-theme that follows the OS light/dark setting (resolves to daylight or default).
const AUTO_ID = 'auto';
const LIGHT_QUERY = '(prefers-color-scheme: light)';

// --- Built-in Theme Definitions ---

const THEMES = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Modern dark theme',
    bodyClass: '',
    supportsGrid: true,
    vars: {
      '--bg': '#1a1a2e',
      '--surface': '#16213e',
      '--surface2': '#0f3460',
      '--surface3': '#1a4a7a',
      '--accent': '#e94560',
      '--text': '#e0e0e0',
      '--text-dim': '#8899aa',
      '--green': '#00c853',
      '--yellow': '#ffd600',
      '--red': '#ff1744',
      '--orange': '#ff9100',
      '--border': '#2a3a5e',
      '--bg-secondary': '#1a1a2e',
      '--bg-tertiary': '#252540',
      '--de-color': '#4fc3f7',     // light blue — DE panel accent
      '--dx-color': '#81c784',     // light green — DX panel accent
    },
  },

  daylight: {
    id: 'daylight',
    name: 'Daylight',
    description: 'High-contrast light for outdoor/sunlight',
    bodyClass: 'theme-daylight',
    supportsGrid: true,
    light: true, // light palette — JS-drawn map overlays and cells switch to darker colors
    vars: {
      // Every text color below is >= 4.5:1 on --surface, --bg and --surface2
      // so the dashboard stays legible on a sunlit laptop or tablet screen.
      '--bg': '#eef1f5',            // page background — off-white cuts glare
      '--surface': '#ffffff',       // widget bodies — max contrast for text
      '--surface2': '#dde4ec',      // headers, buttons — visible step from white
      '--surface3': '#c7d2de',      // hover/active fills
      '--accent': '#b0123a',        // deep crimson — default accent, darkened for white
      '--text': '#0b0f14',          // near-black
      '--text-dim': '#3f4a56',      // slate — still ~7:1 on white
      '--green': '#056b26',         // dark green — readable on white
      '--yellow': '#7a5300',        // dark amber — pure yellow vanishes on white
      '--red': '#b80016',           // dark red
      '--orange': '#9c3d00',        // burnt orange
      '--border': '#8995a3',        // >= 3:1 against white so panel edges show in sun
      '--bg-secondary': '#f6f8fa',
      '--bg-tertiary': '#e6ebf1',
      '--de-color': '#0050a0',      // dark blue — DE panel accent
      '--dx-color': '#1b6b1f',      // dark green — DX panel accent
    },
  },

  lcars: {
    id: 'lcars',
    name: 'LCARS',
    description: 'Star Trek TNG inspired',
    bodyClass: 'theme-lcars',
    supportsGrid: true,
    vars: {
      '--bg': '#000000',
      '--surface': '#0a0a14',
      '--surface2': '#9999CC',     // blue-bell (Drexler palette)
      '--surface3': '#CC99CC',     // lilac
      '--accent': '#FFCC66',       // golden-tanoi — signature LCARS gold
      '--text': '#FF9966',         // orange-peel
      '--text-dim': '#CCBBDD',     // light-lavender (brighter for contrast on dark bg)
      '--green': '#99CCFF',        // anakiwa — LCARS uses blue for "go"
      '--yellow': '#FFFF99',       // pale-canary
      '--red': '#CC6666',          // chestnut-rose
      '--orange': '#FF9933',       // neon-carrot
      '--border': '#9999CC',       // blue-bell (matches surface2)
      '--bg-secondary': '#0a0a14',
      '--bg-tertiary': '#111122',
      '--de-color': '#ff9900',     // LCARS gold — DE panel accent
      '--dx-color': '#99ccff',     // LCARS blue — DX panel accent
    },
  },

  terminal: {
    id: 'terminal',
    name: 'Terminal',
    description: 'Retro terminal style',
    bodyClass: 'theme-terminal',
    supportsGrid: true,
    vars: {
      '--bg': '#000000',
      '--surface': '#0a1a0a',
      '--surface2': '#0d2b0d',
      '--surface3': '#143014',
      '--accent': '#00cc66',
      '--text': '#00ff88',
      '--text-dim': '#338855',
      '--green': '#00ff44',
      '--yellow': '#cccc00',
      '--red': '#ff3333',
      '--orange': '#ff8800',
      '--border': '#1a4a2a',
      '--bg-secondary': '#0a1a0a',
      '--bg-tertiary': '#0d200d',
      '--de-color': '#00ff00',     // green — DE panel accent
      '--dx-color': '#00ff00',     // green — DX panel accent
    },
  },

  hamclock: {
    id: 'hamclock',
    name: 'HamClock',
    description: 'Inspired by HamClock by WB0OEW',
    bodyClass: 'theme-hamclock',
    supportsGrid: true,
    vars: {
      '--bg': '#000000',
      '--surface': '#000000',       // pure black — real HamClock has no surface variation
      '--surface2': '#0a0a0a',
      '--surface3': '#141414',
      '--accent': '#00ffff',        // cyan — HamClock uses cyan for headings/labels
      '--text': '#e0e0e0',          // white-ish — HamClock main text
      '--text-dim': '#888899',
      '--green': '#00ff00',         // bright green — active/positive values
      '--yellow': '#ffff00',        // yellow — warnings, highlighted values
      '--red': '#ff0000',           // red — alerts
      '--orange': '#e8a000',        // warm amber — matches real HamClock orange
      '--border': '#333333',        // subtle separator — real HamClock uses very thin borders
      '--bg-secondary': '#000000',
      '--bg-tertiary': '#0a0a0a',
      '--de-color': '#e8a000',      // orange — DE panel accent (matches real HamClock)
      '--dx-color': '#00ff00',      // bright green — DX panel accent
    },
  },

  radioface: {
    id: 'radioface',
    name: 'Radio Face',
    description: 'Modern transceiver LCD',
    bodyClass: 'theme-radioface',
    supportsGrid: true,
    vars: {
      '--bg': '#060a12',            // very dark blue-black chassis
      '--surface': '#0c1220',       // dark panel
      '--surface2': '#141e30',      // metallic dark blue
      '--surface3': '#1c2840',      // lighter metallic
      '--accent': '#00e5ff',        // bright cyan — LCD glow
      '--text': '#d0e0f0',          // cool white
      '--text-dim': '#4a6080',      // muted steel blue
      '--green': '#00c853',         // bright green — RX
      '--yellow': '#ffd600',        // amber — warnings, mode
      '--red': '#ff1744',           // bright red — TX, alerts
      '--orange': '#ff9100',        // orange — power, caution
      '--border': '#1a2a44',        // dark metallic border
      '--bg-secondary': '#060a12',
      '--bg-tertiary': '#080e18',
      '--de-color': '#00e5ff',      // cyan — DE panel accent
      '--dx-color': '#ff9100',      // orange — DX panel accent
    },
  },

  accessibility: {
    id: 'accessibility',
    name: 'Accessible',
    description: 'High contrast + text scale',
    bodyClass: 'high-contrast',
    supportsGrid: true,
    vars: {
      '--bg': '#000000',
      '--surface': '#111111',
      '--surface2': '#222222',
      '--surface3': '#333333',
      '--accent': '#00ccff',
      '--text': '#ffffff',
      '--text-dim': '#cccccc',
      '--green': '#00ff55',
      '--yellow': '#ffee00',
      '--red': '#ff4444',
      '--orange': '#ff9900',
      '--border': '#666666',
      '--bg-secondary': '#0a0a0a',
      '--bg-tertiary': '#1a1a1a',
      '--de-color': '#00ccff',
      '--dx-color': '#00ff55',
    },
  },
};

// Auto is listed first in the picker; it has no palette of its own.
const AUTO_THEME = {
  id: AUTO_ID,
  name: 'Auto',
  description: 'Match system light/dark',
};

// --- Current theme state ---
// ActiveThemeId is what the user chose (may be 'auto'); effectiveThemeId is the palette in use.
let activeThemeId = AUTO_ID;
let effectiveThemeId = 'default';
let mediaListenerAttached = false;

// --- Light theme gating ---
// Daylight and Auto ship behind a feature flag; while hidden, Auto resolves to Default.
function lightThemesVisible() {
  return isFeatureVisible('daylight_theme');
}

function systemPrefersLight() {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia(LIGHT_QUERY).matches;
  } catch (e) {
    return false;
  }
}

/** Resolve a saved theme id to the concrete palette id that should be painted. */
export function resolveThemeId(themeId, prefersLight = systemPrefersLight(), lightAllowed = lightThemesVisible()) {
  if (themeId === AUTO_ID) return (lightAllowed && prefersLight) ? 'daylight' : 'default';
  if (!THEMES[themeId]) return 'default';
  if (themeId === 'daylight' && !lightAllowed) return 'default';
  return themeId;
}

/** True if the id is something applyTheme accepts (a palette or 'auto'). */
export function isValidThemeId(themeId) {
  return themeId === AUTO_ID || Object.prototype.hasOwnProperty.call(THEMES, themeId);
}

// --- Theme API ---

/** Get list of all available themes for the picker (Auto first). */
export function getThemeList() {
  const showLight = lightThemesVisible();
  const list = Object.values(THEMES)
    .filter(t => showLight || t.id !== 'daylight')
    .map(t => ({ id: t.id, name: t.name, description: t.description }));
  if (showLight) list.unshift({ ...AUTO_THEME });
  return list;
}

/** Get the theme ID the user chose (may be 'auto'). */
export function getCurrentThemeId() {
  // Without the flag the Auto swatch is hidden, so highlight what is actually painted.
  if (activeThemeId === AUTO_ID && !lightThemesVisible()) return effectiveThemeId;
  return activeThemeId;
}

/** Get the concrete palette ID currently painted (never 'auto'). */
export function getEffectiveThemeId() {
  return effectiveThemeId;
}

/** True when the painted palette is a light one (map overlays, JS-colored widgets). */
export function isLightTheme() {
  return !!(THEMES[effectiveThemeId] && THEMES[effectiveThemeId].light);
}

// Paint a concrete palette: CSS variables, body class, map tiles.
function paintTheme(paletteId) {
  const theme = THEMES[paletteId];
  if (!theme) return;
  const root = document.documentElement;

  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }

  // Remove all theme body classes, then apply the new one.

  for (const t of Object.values(THEMES)) {
    if (t.bodyClass) document.body.classList.remove(t.bodyClass);
  }
  if (theme.bodyClass) document.body.classList.add(theme.bodyClass);

  const changed = effectiveThemeId !== paletteId;
  effectiveThemeId = paletteId;

  // Swap map tiles (HamClock and Daylight use light basemaps).
  import('./map-init.js').then(m => m.swapMapTiles(paletteId)).catch(() => {}); // no-op if map not initialized yet

  // Let canvas-drawn widgets repaint with the new palette.
  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hamtab:themechange', { detail: { themeId: paletteId } }));
  }
}

// Follow live OS light/dark switches (e.g. auto-dark at sunset) while 'auto' is chosen.
function attachSystemListener() {
  if (mediaListenerAttached) return;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  try {
    const mql = window.matchMedia(LIGHT_QUERY);
    const onChange = () => {
      if (activeThemeId === AUTO_ID) paintTheme(resolveThemeId(AUTO_ID));
    };
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
    else if (typeof mql.addListener === 'function') mql.addListener(onChange); // Safari < 14
    mediaListenerAttached = true;
  } catch (e) {
    // MatchMedia unsupported — Auto just stays on its first resolution.
  }
}

/** Apply a theme by ID ('auto' or a palette id). Persists the chosen id. */
export function applyTheme(themeId) {
  if (!isValidThemeId(themeId)) return;
  activeThemeId = themeId;
  localStorage.setItem(STORAGE_KEY, themeId);
  paintTheme(resolveThemeId(themeId));
}

/** Initialize theme on app startup — apply saved theme, or Auto on a fresh install. */
export function initTheme() {
  const savedId = localStorage.getItem(STORAGE_KEY) || AUTO_ID;
  // Validate saved theme still exists.
  const themeId = isValidThemeId(savedId) ? savedId : AUTO_ID;
  applyTheme(themeId);
  attachSystemListener();

  // Apply slim header class early to prevent flash of full header.

  if (localStorage.getItem('hamtab_slim_header') === 'true') {
    document.body.classList.add('slim-header');
  }

  // Apply grayscale mode early to prevent flash of color.

  if (localStorage.getItem('hamtab_grayscale') === 'true') {
    document.body.classList.add('grayscale');
  }

  // Apply text scale early to prevent flash of default size.

  const savedScale = parseFloat(localStorage.getItem('hamtab_text_scale'));
  if (savedScale && savedScale !== 1.0) {
    document.documentElement.style.fontSize = (16 * savedScale) + 'px';
  }

}

/** Check if the currently painted theme supports grid layout */
export function currentThemeSupportsGrid() {
  const theme = THEMES[effectiveThemeId];
  return theme ? theme.supportsGrid !== false : true;
}

/** Get the swatch colors for a theme (for preview in config modal) */
export function getThemeSwatchColors(themeId) {
  const theme = THEMES[resolveThemeId(themeId)];
  if (!theme) return [];
  return [
    theme.vars['--bg'],
    theme.vars['--surface2'],
    theme.vars['--accent'],
    theme.vars['--text'],
    theme.vars['--border'],
  ];
}

export { THEMES };
