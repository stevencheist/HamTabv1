// Mobile tab bar — one tab per visible widget, filters always pinned at top
import state from './state.js';
import { WIDGET_DEFS, MOBILE_TAB_KEY, getLayoutMode } from './constants.js';

let initialized = false;

// Secondary widget per tab — persisted in localStorage
const SECONDARY_KEY = 'hamtab_mobile_secondary';
let secondaryWidgets = {}; // { primaryWidgetId: secondaryWidgetId }
try {
  const s = JSON.parse(localStorage.getItem(SECONDARY_KEY));
  if (s && typeof s === 'object') secondaryWidgets = s;
} catch (e) {}

function saveSecondary() {
  localStorage.setItem(SECONDARY_KEY, JSON.stringify(secondaryWidgets));
}

/**
 * Build (or rebuild) the tab bar from currently visible widgets.
 * Skips widget-filters (always pinned). Each visible widget gets one button
 * using its `short` label from WIDGET_DEFS. Map gets a small pin SVG icon.
 */
export function buildTabBar() {
  const tabBar = document.getElementById('tabBar');
  if (!tabBar) return;

  tabBar.innerHTML = '';

  const vis = state.widgetVisibility || {};
  WIDGET_DEFS.forEach(def => {
    if (def.id === 'widget-filters') return; // filters always pinned, no tab
    if (vis[def.id] === false) return;       // hidden widget, no tab

    const btn = document.createElement('button');
    btn.className = 'tab-bar-btn';
    btn.dataset.tab = def.id;
    btn.title = def.name;

    // Map gets a small pin icon; everything else is text-only
    if (def.id === 'widget-map') {
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${def.short}</span>`;
    } else {
      btn.innerHTML = `<span>${def.short}</span>`;
    }

    btn.addEventListener('click', () => {
      // Tap active tab → scroll widget area to top
      if (def.id === state.activeTab) {
        const area = document.getElementById('widgetArea');
        if (area) area.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      switchTab(def.id);
    });

    tabBar.appendChild(btn);
  });

  // Highlight the active button
  tabBar.querySelectorAll('.tab-bar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
  });
}

/**
 * Dismantle grid wrappers — move all widgets back to #widgetArea directly.
 * Grid-layout.js nests widgets inside wrapper divs (grid-col-left, etc.)
 * which breaks the mobile flex layout. Runs on every switchTab — cheap & safe.
 */
function dismantleGridForMobile() {
  const area = document.getElementById('widgetArea');
  if (!area) return;

  // Move widgets out of grid wrapper divs back to widgetArea
  const wrapperIds = ['grid-col-left', 'grid-col-right', 'grid-bar-top', 'grid-bar-bottom'];
  wrapperIds.forEach(id => {
    const wrapper = document.getElementById(id);
    if (!wrapper) return;
    const widgets = wrapper.querySelectorAll('.widget');
    widgets.forEach(w => area.appendChild(w));
  });

  // Hide (don't remove) wrappers, handles, and placeholders so desktop can restore
  area.querySelectorAll('.grid-col-wrapper, .grid-bar-wrapper, .grid-flex-handle, .grid-cell-placeholder, .grid-track-handle').forEach(el => {
    el.style.display = 'none';
  });

  // Clear grid classes and inline styles on area
  area.classList.remove('grid-active', 'reflow-layout');
  area.style.gridTemplateAreas = '';
  area.style.gridTemplateColumns = '';
  area.style.gridTemplateRows = '';
}

/**
 * Build the "+ Add widget" picker below the primary widget.
 * Lists all visible widgets except filters and the primary.
 */
function buildSecondaryPicker(area, primaryId) {
  // Remove any existing picker
  const old = document.getElementById('mobileSecondaryPicker');
  if (old) old.remove();

  const vis = state.widgetVisibility || {};
  const currentSecondary = secondaryWidgets[primaryId] || '';

  // Build list of eligible secondary widgets
  const options = WIDGET_DEFS.filter(
    w => w.id !== 'widget-filters' && w.id !== primaryId && vis[w.id] !== false
  );
  if (options.length === 0) return;

  const picker = document.createElement('div');
  picker.id = 'mobileSecondaryPicker';
  picker.className = 'mobile-secondary-picker';

  const select = document.createElement('select');
  select.className = 'mobile-secondary-select';

  // "None" option
  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = '+ Add widget below\u2026';
  select.appendChild(noneOpt);

  options.forEach(def => {
    const opt = document.createElement('option');
    opt.value = def.id;
    opt.textContent = def.name;
    if (def.id === currentSecondary) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    const val = select.value;
    if (val) {
      secondaryWidgets[primaryId] = val;
    } else {
      delete secondaryWidgets[primaryId];
    }
    saveSecondary();
    switchTab(primaryId); // re-render with secondary
  });

  picker.appendChild(select);
  area.appendChild(picker);
}

/**
 * Switch to a tab by widget ID. Shows only filters + the active widget,
 * hides everything else.
 */
export function switchTab(widgetId) {
  if (getLayoutMode() !== 'mobile') return;

  // Dismantle grid wrappers on first mobile tab switch
  dismantleGridForMobile();

  // Validate that this widget exists and is visible
  const vis = state.widgetVisibility || {};
  const def = WIDGET_DEFS.find(w => w.id === widgetId);
  if (!def || vis[widgetId] === false) {
    widgetId = 'widget-map';
  }

  state.activeTab = widgetId;
  localStorage.setItem(MOBILE_TAB_KEY, widgetId);

  // Resolve secondary widget (validate it's still visible and not the primary)
  let secondaryId = secondaryWidgets[widgetId] || '';
  if (secondaryId && (vis[secondaryId] === false || secondaryId === widgetId || secondaryId === 'widget-filters')) {
    secondaryId = '';
    delete secondaryWidgets[widgetId];
    saveSecondary();
  }

  // Update button active states
  const tabBar = document.getElementById('tabBar');
  if (tabBar) {
    tabBar.querySelectorAll('.tab-bar-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === widgetId);
    });
  }

  // Body class for map-tab-specific CSS (full-height map)
  document.body.classList.toggle('tab-map-active', widgetId === 'widget-map' && !secondaryId);

  const area = document.getElementById('widgetArea');

  // Show/hide widgets — filters always visible, primary + optional secondary visible, rest hidden
  WIDGET_DEFS.forEach(w => {
    const el = document.getElementById(w.id);
    if (!el) return;

    // Clear any grid/flex inline styles from grid-layout.js
    el.style.gridArea = '';
    el.style.flex = '';
    el.style.flexGrow = '';
    el.style.flexShrink = '';
    el.style.flexBasis = '';

    // Remove active-widget class from all
    el.classList.remove('mobile-active-widget');
    el.classList.remove('mobile-secondary-widget');

    if (w.id === 'widget-filters') {
      // Filters always visible (if user hasn't disabled them), collapsed by default
      el.style.display = vis[w.id] !== false ? '' : 'none';
      if (el.style.display !== 'none') {
        el.style.order = '-1';
        area.prepend(el);
        // Auto-collapse filters on mobile if not already set
        if (!el.dataset.mobileCollapsed) {
          el.classList.add('collapsed');
          el.dataset.mobileCollapsed = '1';
        }
      }
    } else if (w.id === widgetId) {
      el.style.display = vis[w.id] !== false ? '' : 'none';
      el.classList.add('mobile-active-widget');
      el.classList.remove('collapsed'); // ensure expanded
    } else if (w.id === secondaryId) {
      el.style.display = '';
      el.classList.add('mobile-secondary-widget');
      el.classList.remove('collapsed'); // ensure expanded
    } else {
      el.style.display = 'none';
    }
  });

  // Build the secondary picker below the primary (or secondary if present)
  buildSecondaryPicker(area, widgetId);

  // Map: invalidate Leaflet so tiles render (primary or secondary)
  if ((widgetId === 'widget-map' || secondaryId === 'widget-map') && state.map) {
    setTimeout(() => state.map.invalidateSize(), 50);
  }
}

/**
 * Rebuild tabs after widget visibility changes.
 * If the currently active tab's widget was hidden, fall back to map.
 */
export function rebuildTabs() {
  if (getLayoutMode() !== 'mobile') return;

  buildTabBar();

  const vis = state.widgetVisibility || {};
  if (vis[state.activeTab] === false || !WIDGET_DEFS.find(w => w.id === state.activeTab)) {
    switchTab('widget-map');
  } else {
    switchTab(state.activeTab);
  }
}

/**
 * Get the set of widget IDs visible in the current active tab.
 */
export function getActiveTabWidgets() {
  if (getLayoutMode() !== 'mobile') return null;
  const set = new Set(['widget-filters', state.activeTab]);
  const sec = secondaryWidgets[state.activeTab];
  if (sec) set.add(sec);
  return set;
}

/**
 * Initialize tab bar — build tabs, restore saved tab, attach resize listener.
 */
export function initTabs() {
  const tabBar = document.getElementById('tabBar');
  if (!tabBar) return;

  // Build tabs and apply on mobile
  if (getLayoutMode() === 'mobile') {
    buildTabBar();
    const saved = state.activeTab || 'widget-map';
    switchTab(saved);
  }

  // Re-apply tabs on resize (desktop↔mobile transition)
  let prevMode = getLayoutMode();
  window.addEventListener('resize', () => {
    const mode = getLayoutMode();
    if (mode === prevMode) return;
    prevMode = mode;

    if (mode === 'mobile') {
      buildTabBar();
      switchTab(state.activeTab || 'widget-map');
    } else {
      // Desktop — CSS hides tab bar, show all visible widgets
      document.body.classList.remove('tab-map-active');
      // Remove secondary picker
      const picker = document.getElementById('mobileSecondaryPicker');
      if (picker) picker.remove();
      // Re-show grid wrappers if they exist
      const area = document.getElementById('widgetArea');
      if (area) {
        area.querySelectorAll('.grid-col-wrapper, .grid-bar-wrapper, .grid-flex-handle, .grid-cell-placeholder, .grid-track-handle').forEach(el => {
          el.style.display = '';
        });
      }
      WIDGET_DEFS.forEach(w => {
        const el = document.getElementById(w.id);
        if (!el) return;
        el.style.order = '';
        el.classList.remove('mobile-active-widget', 'mobile-secondary-widget');
        if (state.widgetVisibility[w.id] !== false) {
          el.style.display = '';
        }
      });
    }
  });

  initialized = true;
}
