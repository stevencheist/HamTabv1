// --- Theme Engine ---
// Manages color themes and CSS class overrides.
// Each theme is a named object with CSS custom property values and an optional
// bodyClass for shape/font overrides (e.g. LCARS pill shapes).

const STORAGE_KEY = 'hamtab_theme';

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
};

// --- Current active theme ID ---
let activeThemeId = localStorage.getItem(STORAGE_KEY) || 'default';

// --- Theme API ---

/** Get list of all available themes (built-in) */
export function getThemeList() {
  return Object.values(THEMES).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }));
}

/** Get the currently active theme ID */
export function getCurrentThemeId() {
  return activeThemeId;
}

/** Apply a theme by ID. Swaps CSS variables and body class. */
export function applyTheme(themeId) {
  const theme = THEMES[themeId];
  if (!theme) return;

  const root = document.documentElement;

  // Set all CSS custom properties
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }

  // Remove all theme body classes, then apply the new one
  for (const t of Object.values(THEMES)) {
    if (t.bodyClass) document.body.classList.remove(t.bodyClass);
  }
  if (theme.bodyClass) document.body.classList.add(theme.bodyClass);

  activeThemeId = themeId;
  localStorage.setItem(STORAGE_KEY, themeId);

  // Swap map tiles (HamClock uses political/colored basemap)
  import('./map-init.js').then(m => m.swapMapTiles(themeId)).catch(() => {}); // no-op if map not initialized yet
}

/** Initialize theme on app startup — apply saved theme or default */
export function initTheme() {
  const savedId = localStorage.getItem(STORAGE_KEY) || 'default';
  // Validate saved theme still exists
  const themeId = THEMES[savedId] ? savedId : 'default';
  applyTheme(themeId);

  // Apply slim header class early to prevent flash of full header
  if (localStorage.getItem('hamtab_slim_header') === 'true') {
    document.body.classList.add('slim-header');
  }

  // Apply grayscale mode early to prevent flash of color
  if (localStorage.getItem('hamtab_grayscale') === 'true') {
    document.body.classList.add('grayscale');
  }
}

/** Check if the currently active theme supports grid layout */
export function currentThemeSupportsGrid() {
  const theme = THEMES[activeThemeId];
  return theme ? theme.supportsGrid !== false : true;
}

/** Get the swatch colors for a theme (for preview in config modal) */
export function getThemeSwatchColors(themeId) {
  const theme = THEMES[themeId];
  if (!theme) return [];
  return [
    theme.vars['--bg'],
    theme.vars['--surface2'],
    theme.vars['--accent'],
    theme.vars['--text'],
    theme.vars['--border'],
  ];
}
