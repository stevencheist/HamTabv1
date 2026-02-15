// Mobile tab bar — switches between widget groups on mobile/tablet layout
import state from './state.js';
import { MOBILE_TAB_DEFS, MOBILE_TAB_KEY, getLayoutMode } from './constants.js';

let initialized = false;

/**
 * Switch to a tab by ID. Hides widgets not in the active tab,
 * shows those that are (respecting widget visibility / × button).
 */
export function switchTab(tabId) {
  if (getLayoutMode() !== 'mobile') return;

  const tabDef = MOBILE_TAB_DEFS.find(t => t.id === tabId);
  if (!tabDef) return;

  state.activeTab = tabId;
  localStorage.setItem(MOBILE_TAB_KEY, tabId);

  // Update button active states
  const tabBar = document.getElementById('tabBar');
  if (tabBar) {
    tabBar.querySelectorAll('.tab-bar-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
  }

  // Body class for map-tab-specific CSS (full-height map)
  document.body.classList.toggle('tab-map-active', tabId === 'map');

  // Build set of widget IDs in this tab
  const tabWidgets = new Set(tabDef.widgets);

  // Collect all widget IDs across all tabs
  const allTabWidgets = new Set();
  MOBILE_TAB_DEFS.forEach(t => t.widgets.forEach(w => allTabWidgets.add(w)));

  const area = document.getElementById('widgetArea');

  // Show/hide widgets
  allTabWidgets.forEach(wid => {
    const el = document.getElementById(wid);
    if (!el) return;

    if (tabWidgets.has(wid)) {
      // Show if not hidden by × button
      if (state.widgetVisibility[wid] !== false) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    } else {
      el.style.display = 'none';
    }
  });

  // Reorder DOM within active tab for correct display order
  tabDef.widgets.forEach(wid => {
    const el = document.getElementById(wid);
    if (el && el.style.display !== 'none') {
      area.appendChild(el);
    }
  });

  // Map tab: invalidate Leaflet so tiles render
  if (tabId === 'map' && state.map) {
    setTimeout(() => state.map.invalidateSize(), 50);
  }
}

/**
 * Get the set of widget IDs visible in the current active tab.
 */
export function getActiveTabWidgets() {
  const tabDef = MOBILE_TAB_DEFS.find(t => t.id === state.activeTab);
  return tabDef ? new Set(tabDef.widgets) : null;
}

/**
 * Initialize tab bar — attach click handlers, restore saved tab.
 */
export function initTabs() {
  const tabBar = document.getElementById('tabBar');
  if (!tabBar) return;

  // Attach click handlers
  tabBar.querySelectorAll('.tab-bar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      // Tap active tab → scroll widget area to top
      if (tabId === state.activeTab) {
        const area = document.getElementById('widgetArea');
        if (area) area.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      switchTab(tabId);
    });
  });

  // Apply tabs on mobile
  if (getLayoutMode() === 'mobile') {
    const saved = state.activeTab || 'map';
    switchTab(saved);
  }

  // Re-apply tabs on resize (desktop↔mobile transition)
  let prevMode = getLayoutMode();
  window.addEventListener('resize', () => {
    const mode = getLayoutMode();
    if (mode === prevMode) return;
    prevMode = mode;

    if (mode === 'mobile') {
      tabBar.style.display = '';
      switchTab(state.activeTab || 'map');
    } else {
      // Desktop — show tab bar via CSS (hidden by media query), show all widgets
      tabBar.style.display = '';
      document.body.classList.remove('tab-map-active');
      MOBILE_TAB_DEFS.forEach(t => t.widgets.forEach(wid => {
        const el = document.getElementById(wid);
        if (!el) return;
        if (state.widgetVisibility[wid] !== false) {
          el.style.display = '';
        }
      }));
    }
  });

  initialized = true;
}
