import state from './state.js';
import { WIDGET_DEFS, WIDGET_STORAGE_KEY, USER_LAYOUT_KEY, SNAP_DIST, SNAP_GRID, HEADER_H, getLayoutMode, SCALE_REFERENCE_WIDTH, SCALE_MIN_FACTOR, SCALE_REFLOW_WIDTH, REFLOW_WIDGET_ORDER } from './constants.js';
import { isGridMode, activateGridMode, applyGridAssignments, handleGridDragStart, repositionGridHandles } from './grid-layout.js';
import { switchTab, rebuildTabs, getActiveTabWidgets } from './tabs.js';

const WIDGET_VIS_KEY = 'hamtab_widget_vis';

export function loadWidgetVisibility() {
  try {
    const saved = JSON.parse(localStorage.getItem(WIDGET_VIS_KEY));
    if (saved && typeof saved === 'object') return saved;
  } catch (e) {}
  const vis = {};
  WIDGET_DEFS.forEach(w => vis[w.id] = true);
  return vis;
}

export function saveWidgetVisibility() {
  localStorage.setItem(WIDGET_VIS_KEY, JSON.stringify(state.widgetVisibility));
}

export function isWidgetVisible(id) {
  return state.widgetVisibility[id] !== false;
}

export function applyWidgetVisibility() {
  // On mobile with tabs active, rebuild dynamic tabs and delegate (check before grid mode)
  if (getLayoutMode() === 'mobile') {
    rebuildTabs();
    return;
  }

  if (isGridMode()) {
    applyGridAssignments();
    if (state.map) setTimeout(() => state.map.invalidateSize(), 50);
    return;
  }

  WIDGET_DEFS.forEach(w => {
    const el = document.getElementById(w.id);
    if (!el) return;
    if (state.widgetVisibility[w.id] === false) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });
  // Re-distribute right-column widgets to fill available space
  redistributeRightColumn();
  if (state.map) setTimeout(() => state.map.invalidateSize(), 50);
}

function redistributeRightColumn() {
  const { height: H } = getWidgetArea();
  const pad = 6;
  const solarEl = document.getElementById('widget-solar');
  if (!solarEl || solarEl.style.display === 'none') return;
  const solarBottom = (parseInt(solarEl.style.top) || 0) + (parseInt(solarEl.style.height) || 0);
  const rightX = parseInt(solarEl.style.left) || 0;
  const rightW = parseInt(solarEl.style.width) || 0;

  const rightBottomIds = ['widget-spacewx', 'widget-propagation', 'widget-voacap', 'widget-live-spots', 'widget-lunar', 'widget-satellites', 'widget-rst', 'widget-spot-detail', 'widget-contests', 'widget-dxpeditions', 'widget-beacons', 'widget-dedx', 'widget-stopwatch', 'widget-analog-clock'];
  const vis = state.widgetVisibility || {};
  const visible = rightBottomIds.filter(id => vis[id] !== false);
  if (visible.length === 0) return;

  const bottomSpace = H - solarBottom - pad;
  const gaps = visible.length - 1;
  const slotH = Math.round((bottomSpace - gaps * pad) / visible.length);
  let curY = solarBottom + pad;
  visible.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.left = rightX + 'px';
    el.style.top = curY + 'px';
    el.style.width = rightW + 'px';
    el.style.height = slotH + 'px';
    curY += slotH + pad;
  });
  saveWidgets();
}

function getWidgetArea() {
  const area = document.getElementById('widgetArea');
  return { width: area.clientWidth, height: area.clientHeight };
}

export function getDefaultLayout() {
  const { width: W, height: H } = getWidgetArea();
  const pad = 6;

  const leftW = Math.round(W * 0.30);
  const rightW = Math.round(W * 0.25);
  const centerW = W - leftW - rightW - pad * 4;
  const rightHalf = Math.round((H - pad * 3) / 2);

  const rightX = leftW + centerW + pad * 3;

  // Split left column: filters (220px) at top, activations below
  const filtersH = 220;
  const activationsH = H - filtersH - pad * 3;

  const layout = {
    'widget-filters': { left: pad, top: pad, width: leftW, height: filtersH },
    'widget-activations': { left: pad, top: filtersH + pad * 2, width: leftW, height: activationsH },
    'widget-map': { left: leftW + pad * 2, top: pad, width: centerW, height: H - pad * 2 },
    'widget-solar': { left: rightX, top: pad, width: rightW, height: rightHalf },
  };

  // Stack visible right-column widgets below solar
  const rightBottomIds = ['widget-spacewx', 'widget-propagation', 'widget-voacap', 'widget-live-spots', 'widget-lunar', 'widget-satellites', 'widget-rst', 'widget-spot-detail', 'widget-contests', 'widget-dxpeditions', 'widget-beacons', 'widget-dedx', 'widget-stopwatch', 'widget-analog-clock'];
  const vis = state.widgetVisibility || {};
  const visibleBottom = rightBottomIds.filter(id => vis[id] !== false);
  const bottomSpace = H - rightHalf - pad * 2;
  const gaps = visibleBottom.length > 0 ? visibleBottom.length - 1 : 0;
  const slotH = visibleBottom.length > 0 ? Math.round((bottomSpace - gaps * pad) / visibleBottom.length) : 0;
  let curY = rightHalf + pad * 2;
  visibleBottom.forEach(id => {
    layout[id] = { left: rightX, top: curY, width: rightW, height: slotH };
    curY += slotH + pad;
  });
  // Include hidden ones off-screen so layout object is complete
  rightBottomIds.filter(id => vis[id] === false).forEach(id => {
    layout[id] = { left: rightX, top: rightHalf + pad * 2, width: rightW, height: 150 };
  });

  return layout;
}

function clampPosition(left, top, wW, wH) {
  const { width: aW, height: aH } = getWidgetArea();
  left = Math.max(0, Math.min(left, aW - 60));
  top = Math.max(0, Math.min(top, aH - HEADER_H));
  return { left, top };
}

function snapPosition(left, top, wW, wH) {
  const { width: aW, height: aH } = getWidgetArea();

  // Grid snap — round to nearest SNAP_GRID increment
  if (state.snapToGrid) {
    left = Math.round(left / SNAP_GRID) * SNAP_GRID;
    top = Math.round(top / SNAP_GRID) * SNAP_GRID;
  }

  // Edge/center snap — higher priority, overrides grid snap when near edges
  const right = left + wW;
  const bottom = top + wH;

  if (Math.abs(left) < SNAP_DIST) left = 0;
  if (Math.abs(right - aW) < SNAP_DIST) left = aW - wW;
  if (Math.abs(top) < SNAP_DIST) top = 0;
  if (Math.abs(bottom - aH) < SNAP_DIST) top = aH - wH;
  const cx = left + wW / 2;
  if (Math.abs(cx - aW / 2) < SNAP_DIST) left = Math.round((aW - wW) / 2);
  const cy = top + wH / 2;
  if (Math.abs(cy - aH / 2) < SNAP_DIST) top = Math.round((aH - wH) / 2);

  return { left, top };
}

function clampSize(left, top, w, h) {
  const { width: aW, height: aH } = getWidgetArea();
  w = Math.min(w, aW - left);
  h = Math.min(h, aH - top);
  w = Math.max(150, w);
  h = Math.max(80, h);
  return { w, h };
}

// --- Collision Detection for Non-Overlapping Widgets ---

function getWidgetRect(widget) {
  return {
    id: widget.id,
    left: parseInt(widget.style.left) || 0,
    top: parseInt(widget.style.top) || 0,
    width: parseInt(widget.style.width) || 200,
    height: parseInt(widget.style.height) || 150,
  };
}

function rectsOverlap(r1, r2) {
  // Two rectangles overlap if they intersect on both axes
  return !(r1.left + r1.width <= r2.left ||  // r1 is left of r2
           r2.left + r2.width <= r1.left ||  // r2 is left of r1
           r1.top + r1.height <= r2.top ||   // r1 is above r2
           r2.top + r2.height <= r1.top);    // r2 is above r1
}

function resolveOverlaps(movedWidget) {
  // Push other widgets away from the moved widget to eliminate overlaps
  // Uses iterative resolution to handle chain reactions
  const { width: aW, height: aH } = getWidgetArea();
  const pad = 6; // gap between widgets
  const maxIterations = 10; // prevent infinite loops

  for (let iter = 0; iter < maxIterations; iter++) {
    let anyMoved = false;
    const movedRect = getWidgetRect(movedWidget);

    document.querySelectorAll('.widget').forEach(other => {
      if (other.id === movedWidget.id) return;
      if (other.style.display === 'none') return;
      if (state.widgetVisibility && state.widgetVisibility[other.id] === false) return;

      const otherRect = getWidgetRect(other);
      if (!rectsOverlap(movedRect, otherRect)) return;

      // Calculate overlap distances for each direction
      const overlapLeft = (movedRect.left + movedRect.width) - otherRect.left;   // push right
      const overlapRight = (otherRect.left + otherRect.width) - movedRect.left;  // push left
      const overlapTop = (movedRect.top + movedRect.height) - otherRect.top;     // push down
      const overlapBottom = (otherRect.top + otherRect.height) - movedRect.top;  // push up

      // Find minimum push direction
      const pushes = [
        { dir: 'right', dist: overlapLeft, newLeft: movedRect.left + movedRect.width + pad, newTop: otherRect.top },
        { dir: 'left', dist: overlapRight, newLeft: movedRect.left - otherRect.width - pad, newTop: otherRect.top },
        { dir: 'down', dist: overlapTop, newLeft: otherRect.left, newTop: movedRect.top + movedRect.height + pad },
        { dir: 'up', dist: overlapBottom, newLeft: otherRect.left, newTop: movedRect.top - otherRect.height - pad },
      ];

      // Filter out pushes that would go out of bounds
      const validPushes = pushes.filter(p => {
        return p.newLeft >= 0 &&
               p.newTop >= 0 &&
               p.newLeft + otherRect.width <= aW &&
               p.newTop + otherRect.height <= aH;
      });

      // Pick the smallest valid push, or fallback to smallest if all go out of bounds
      const sorted = (validPushes.length > 0 ? validPushes : pushes).sort((a, b) => a.dist - b.dist);
      const best = sorted[0];

      // Apply push with clamping
      let newLeft = Math.max(0, Math.min(best.newLeft, aW - otherRect.width));
      let newTop = Math.max(0, Math.min(best.newTop, aH - otherRect.height));

      if (newLeft !== otherRect.left || newTop !== otherRect.top) {
        other.style.left = newLeft + 'px';
        other.style.top = newTop + 'px';
        anyMoved = true;
      }
    });

    if (!anyMoved) break; // No overlaps remain
  }
}

function resolveAllOverlaps() {
  // Check all widget pairs and resolve any overlaps
  // Used after window resize reflow
  const widgets = Array.from(document.querySelectorAll('.widget')).filter(w => {
    return w.style.display !== 'none' &&
           (!state.widgetVisibility || state.widgetVisibility[w.id] !== false);
  });

  const { width: aW, height: aH } = getWidgetArea();
  const pad = 6;
  const maxIterations = 20;

  for (let iter = 0; iter < maxIterations; iter++) {
    let anyMoved = false;

    for (let i = 0; i < widgets.length; i++) {
      for (let j = i + 1; j < widgets.length; j++) {
        const r1 = getWidgetRect(widgets[i]);
        const r2 = getWidgetRect(widgets[j]);

        if (!rectsOverlap(r1, r2)) continue;

        // Push the second widget (j) away from the first (i)
        const overlapLeft = (r1.left + r1.width) - r2.left;
        const overlapRight = (r2.left + r2.width) - r1.left;
        const overlapTop = (r1.top + r1.height) - r2.top;
        const overlapBottom = (r2.top + r2.height) - r1.top;

        const pushes = [
          { dist: overlapLeft, newLeft: r1.left + r1.width + pad, newTop: r2.top },
          { dist: overlapRight, newLeft: r1.left - r2.width - pad, newTop: r2.top },
          { dist: overlapTop, newLeft: r2.left, newTop: r1.top + r1.height + pad },
          { dist: overlapBottom, newLeft: r2.left, newTop: r1.top - r2.height - pad },
        ];

        const validPushes = pushes.filter(p => {
          return p.newLeft >= 0 && p.newTop >= 0 &&
                 p.newLeft + r2.width <= aW && p.newTop + r2.height <= aH;
        });

        const sorted = (validPushes.length > 0 ? validPushes : pushes).sort((a, b) => a.dist - b.dist);
        const best = sorted[0];

        let newLeft = Math.max(0, Math.min(best.newLeft, aW - r2.width));
        let newTop = Math.max(0, Math.min(best.newTop, aH - r2.height));

        if (newLeft !== r2.left || newTop !== r2.top) {
          widgets[j].style.left = newLeft + 'px';
          widgets[j].style.top = newTop + 'px';
          anyMoved = true;
        }
      }
    }

    if (!anyMoved) break;
  }
}

export function saveWidgets() {
  const layout = {};
  document.querySelectorAll('.widget').forEach(w => {
    layout[w.id] = {
      left: parseInt(w.style.left) || 0,
      top: parseInt(w.style.top) || 0,
      width: parseInt(w.style.width) || 200,
      height: parseInt(w.style.height) || 150,
    };
  });
  localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(layout));
}

export function saveUserLayout() {
  const layout = {};
  document.querySelectorAll('.widget').forEach(w => {
    layout[w.id] = {
      left: parseInt(w.style.left) || 0,
      top: parseInt(w.style.top) || 0,
      width: parseInt(w.style.width) || 200,
      height: parseInt(w.style.height) || 150,
    };
  });
  localStorage.setItem(USER_LAYOUT_KEY, JSON.stringify(layout));
}

export function clearUserLayout() {
  localStorage.removeItem(USER_LAYOUT_KEY);
}

export function hasUserLayout() {
  return localStorage.getItem(USER_LAYOUT_KEY) !== null;
}

function bringToFront(widget) {
  state.zCounter++;
  widget.style.zIndex = state.zCounter;
}

function setupDrag(widget, handle) {
  let startX, startY, origLeft, origTop;

  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (state.reflowActive || computeScaleFactor() < 1) return; // no drag in Zone B/C
    if (isGridMode()) {
      handleGridDragStart(widget, e);
      return;
    }
    e.preventDefault();
    bringToFront(widget);
    startX = e.clientX;
    startY = e.clientY;
    origLeft = parseInt(widget.style.left) || 0;
    origTop = parseInt(widget.style.top) || 0;

    // Show grid lines while dragging
    if (state.snapToGrid) {
      document.getElementById('widgetArea').classList.add('snap-grid-visible');
    }

    function onMove(ev) {
      let newLeft = origLeft + (ev.clientX - startX);
      let newTop = origTop + (ev.clientY - startY);
      const wW = widget.offsetWidth;
      const wH = widget.offsetHeight;

      ({ left: newLeft, top: newTop } = snapPosition(newLeft, newTop, wW, wH));
      ({ left: newLeft, top: newTop } = clampPosition(newLeft, newTop, wW, wH));

      widget.style.left = newLeft + 'px';
      widget.style.top = newTop + 'px';
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.getElementById('widgetArea').classList.remove('snap-grid-visible');
      if (!state.allowOverlap) resolveOverlaps(widget);
      saveWidgets();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function setupResize(widget, handle) {
  let startX, startY, origW, origH, origLeft, origTop;

  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (isGridMode()) return; // no manual resize in grid mode
    if (state.reflowActive || computeScaleFactor() < 1) return; // no resize in Zone B/C
    e.preventDefault();
    e.stopPropagation();
    bringToFront(widget);
    startX = e.clientX;
    startY = e.clientY;
    origW = widget.offsetWidth;
    origH = widget.offsetHeight;
    origLeft = parseInt(widget.style.left) || 0;
    origTop = parseInt(widget.style.top) || 0;

    // Show grid lines while resizing
    if (state.snapToGrid) {
      document.getElementById('widgetArea').classList.add('snap-grid-visible');
    }

    function onMove(ev) {
      let newW = origW + (ev.clientX - startX);
      let newH = origH + (ev.clientY - startY);
      // Snap size to grid increments
      if (state.snapToGrid) {
        newW = Math.round(newW / SNAP_GRID) * SNAP_GRID;
        newH = Math.round(newH / SNAP_GRID) * SNAP_GRID;
      }
      ({ w: newW, h: newH } = clampSize(origLeft, origTop, newW, newH));
      widget.style.width = newW + 'px';
      widget.style.height = newH + 'px';
      if (state.map && widget.id === 'widget-map') {
        state.map.invalidateSize();
      }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.getElementById('widgetArea').classList.remove('snap-grid-visible');
      if (!state.allowOverlap) resolveOverlaps(widget);
      saveWidgets();
      if (state.map && widget.id === 'widget-map') {
        state.map.invalidateSize();
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function applyLayout(layout) {
  if (getLayoutMode() !== 'desktop') {
    // On mobile/tablet, CSS handles layout — just ensure map resizes
    if (state.map) setTimeout(() => state.map.invalidateSize(), 200);
    return;
  }
  // Build fallback positions for widgets missing from saved layout
  const defaults = getDefaultLayout();
  document.querySelectorAll('.widget').forEach(widget => {
    const pos = layout[widget.id] || defaults[widget.id];
    if (pos) {
      widget.style.left = pos.left + 'px';
      widget.style.top = pos.top + 'px';
      widget.style.width = pos.width + 'px';
      widget.style.height = pos.height + 'px';
    }
    widget.style.zIndex = ++state.zCounter;
  });
  if (state.map) state.map.invalidateSize();
}

// --- Responsive reflow: proportionally scale widgets on resize ---
let prevAreaW = 0;
let prevAreaH = 0;

function reflowWidgets() {
  if (isGridMode()) {
    // CSS Grid auto-reflows; reposition resize handles and fix map
    repositionGridHandles();
    if (state.map) state.map.invalidateSize();
    return;
  }
  if (getLayoutMode() !== 'desktop') return; // CSS handles mobile/tablet layout
  const { width: aW, height: aH } = getWidgetArea();
  if (prevAreaW === 0 || prevAreaH === 0) {
    prevAreaW = aW;
    prevAreaH = aH;
    return;
  }

  const scaleX = aW / prevAreaW;
  const scaleY = aH / prevAreaH;

  document.querySelectorAll('.widget').forEach(widget => {
    if (widget.style.display === 'none') return;

    let left = Math.round((parseInt(widget.style.left) || 0) * scaleX);
    let top = Math.round((parseInt(widget.style.top) || 0) * scaleY);
    let w = Math.round((parseInt(widget.style.width) || 200) * scaleX);
    let h = Math.round((parseInt(widget.style.height) || 150) * scaleY);

    // Enforce minimums
    w = Math.max(150, w);
    h = Math.max(80, h);

    // Clamp to area bounds
    if (w > aW) w = aW;
    if (h > aH) h = aH;
    if (left + w > aW) left = Math.max(0, aW - w);
    if (top + h > aH) top = Math.max(0, aH - h);

    widget.style.left = left + 'px';
    widget.style.top = top + 'px';
    widget.style.width = w + 'px';
    widget.style.height = h + 'px';
  });

  prevAreaW = aW;
  prevAreaH = aH;

  // Resolve any overlaps created by proportional scaling
  resolveAllOverlaps();

  if (state.map) state.map.invalidateSize();
  saveWidgets();
}

// --- Progressive Responsive Scaling (Zone A/B/C) ---

export function computeScaleFactor() {
  const w = window.innerWidth;
  if (w >= SCALE_REFERENCE_WIDTH) return 1.0;
  return Math.max(w / SCALE_REFERENCE_WIDTH, SCALE_MIN_FACTOR);
}

export function applyProgressiveScale() {
  const area = document.getElementById('widgetArea');
  if (!area) return;

  const w = window.innerWidth;

  // Zone C: reflow layout
  if (w < SCALE_REFLOW_WIDTH) {
    if (!state.reflowActive) applyReflowLayout();
    return;
  }

  // Exiting Zone C → Zone A/B
  if (state.reflowActive) exitReflowLayout();

  const factor = computeScaleFactor();

  if (factor < 1.0) {
    // Zone B: proportional shrink via CSS scale()
    area.style.transformOrigin = 'top left';
    area.style.transform = `scale(${factor})`;
    area.style.width = `${100 / factor}%`; // compensate for shrink so container fills viewport
    area.classList.add('scaling-active');
  } else {
    // Zone A: full scale, no transform
    area.style.transform = '';
    area.style.width = '';
    area.style.transformOrigin = '';
    area.classList.remove('scaling-active');
  }

  // Leaflet map coordinate fix after scale change
  if (state.map) state.map.invalidateSize();
}

function applyReflowLayout() {
  const area = document.getElementById('widgetArea');
  if (!area) return;

  state.reflowActive = true;

  // Clear any Zone B transform
  area.style.transform = '';
  area.style.width = '';
  area.style.transformOrigin = '';
  area.classList.remove('scaling-active');

  // When tabs are active on mobile, skip reflow grid — use tab layout instead
  if (getLayoutMode() === 'mobile') {
    area.classList.remove('reflow-layout');
    rebuildTabs();
    if (state.map) setTimeout(() => state.map.invalidateSize(), 100);
    return;
  }

  // Apply reflow CSS class (desktop only)
  area.classList.add('reflow-layout');

  // Reorder widget DOM nodes by priority (visible ones first in order)
  const vis = state.widgetVisibility || {};
  REFLOW_WIDGET_ORDER.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (vis[id] === false) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    area.appendChild(el); // moves to end, building priority order
  });

  if (state.map) setTimeout(() => state.map.invalidateSize(), 100);
}

function exitReflowLayout() {
  const area = document.getElementById('widgetArea');
  if (!area) return;

  state.reflowActive = false;
  area.classList.remove('reflow-layout');

  // Restore layout from saved state
  if (isGridMode()) {
    activateGridMode(state.gridPermutation);
  } else {
    // Restore float layout from localStorage
    let layout;
    try {
      const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (saved) layout = JSON.parse(saved);
    } catch (e) {}
    if (!layout) layout = getDefaultLayout();
    applyLayout(layout);
    applyWidgetVisibility();
  }

  if (state.map) setTimeout(() => state.map.invalidateSize(), 100);
}

export function initWidgets() {
  let layout;
  try {
    const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (saved) {
      layout = JSON.parse(saved);

      // Clear layout if it contains removed clock widgets
      if (layout['widget-clock-local'] || layout['widget-clock-utc']) {
        console.log('Clearing old layout with clock widgets');
        localStorage.removeItem(WIDGET_STORAGE_KEY);
        localStorage.removeItem(USER_LAYOUT_KEY);
        layout = null;
      } else {
        // Validate positions
        const { width: aW, height: aH } = getWidgetArea();
        for (const id of Object.keys(layout)) {
          const p = layout[id];
          if (p.left > aW - 30 || p.top > aH - 30 || p.left + p.width < 30 || p.top + p.height < 10) {
            layout = null;
            break;
          }
        }
      }
    }
  } catch (e) {
    layout = null;
  }

  if (!layout) {
    layout = getDefaultLayout();
  }

  applyLayout(layout);
  applyWidgetVisibility();

  // Seed previous dimensions for proportional resize scaling
  const area = getWidgetArea();
  prevAreaW = area.width;
  prevAreaH = area.height;

  const isDesktop = getLayoutMode() === 'desktop';

  document.querySelectorAll('.widget').forEach(widget => {
    const header = widget.querySelector('.widget-header');
    const resizer = widget.querySelector('.widget-resize');
    if (header) {
      if (isDesktop) setupDrag(widget, header);

      // Inject close button (× at far right of header)
      const closeBtn = document.createElement('button');
      closeBtn.className = 'widget-close-btn';
      closeBtn.title = 'Hide widget';
      closeBtn.textContent = '\u00D7'; // ×
      closeBtn.addEventListener('mousedown', e => e.stopPropagation()); // don't trigger drag
      closeBtn.addEventListener('click', () => {
        if (isGridMode() && widget.id === 'widget-map') return; // map can't be hidden in grid mode
        state.widgetVisibility[widget.id] = false;
        saveWidgetVisibility();
        applyWidgetVisibility();
      });
      header.insertBefore(closeBtn, header.firstChild);

      // Mobile: collapsible widgets — tap header to toggle
      if (!isDesktop) {
        // Widgets that start expanded on mobile
        const expandedByDefault = new Set(['widget-map', 'widget-activations']);
        const collapseKey = 'hamtab_collapsed';
        let collapsed;
        try {
          collapsed = new Set(JSON.parse(localStorage.getItem(collapseKey) || '[]'));
        } catch { collapsed = new Set(); }

        // Apply initial collapsed state
        const wid = widget.id;
        if (collapsed.has(wid) || (!collapsed.size && !expandedByDefault.has(wid))) {
          widget.classList.add('collapsed');
        }

        header.addEventListener('click', (e) => {
          // Don't collapse when clicking buttons inside the header
          if (e.target.closest('button') || e.target.closest('select') || e.target.closest('a')) return;

          widget.classList.toggle('collapsed');

          // Persist collapsed state
          const allCollapsed = [];
          document.querySelectorAll('.widget.collapsed').forEach(w => allCollapsed.push(w.id));
          localStorage.setItem(collapseKey, JSON.stringify(allCollapsed));

          // If expanding the map, invalidate so Leaflet re-renders
          if (wid === 'widget-map' && !widget.classList.contains('collapsed') && state.map) {
            setTimeout(() => state.map.invalidateSize(), 50);
          }
        });
      }
    }
    if (resizer && isDesktop) setupResize(widget, resizer);
    if (isDesktop) widget.addEventListener('mousedown', () => bringToFront(widget));
  });

  const mapWidget = document.getElementById('widget-map');
  if (state.map && mapWidget && window.ResizeObserver) {
    new ResizeObserver(() => state.map.invalidateSize()).observe(mapWidget);
  }

  // Full-screen map toggle (all screen sizes)
  if (mapWidget) {
    const mapHeader = mapWidget.querySelector('.widget-header');
    if (mapHeader) {
      const maxBtn = document.createElement('button');
      maxBtn.className = 'map-fullscreen-btn';
      maxBtn.title = 'Toggle fullscreen map';
      maxBtn.textContent = '\u26F6'; // ⛶
      maxBtn.addEventListener('mousedown', e => e.stopPropagation());

      const enterFS = () => {
        mapWidget.classList.add('map-fullscreen');
        document.body.classList.add('map-fullscreen-active'); // neutralize parent transform + overflow
        maxBtn.textContent = '\u2715'; // ✕
        if (state.map) setTimeout(() => state.map.invalidateSize(), 50);
      };
      const exitFS = () => {
        mapWidget.classList.remove('map-fullscreen');
        document.body.classList.remove('map-fullscreen-active');
        maxBtn.textContent = '\u26F6'; // ⛶
        if (state.map) setTimeout(() => state.map.invalidateSize(), 50);
      };

      maxBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // don't trigger collapse
        mapWidget.classList.contains('map-fullscreen') ? exitFS() : enterFS();
      });
      mapHeader.appendChild(maxBtn);

      // Escape key closes fullscreen map (matches Big Clock pattern)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mapWidget.classList.contains('map-fullscreen')) exitFS();
      });
    }
  }

  // --- Responsive reflow when widget area resizes ---
  if (window.ResizeObserver) {
    let reflowTimer;
    new ResizeObserver(() => {
      clearTimeout(reflowTimer);
      reflowTimer = setTimeout(() => {
        applyProgressiveScale();
        // Only run float-mode reflowWidgets in Zone A (scale=1.0, no transform active)
        if (computeScaleFactor() === 1.0 && !state.reflowActive) {
          reflowWidgets();
        }
      }, 150);
    }).observe(document.getElementById('widgetArea'));
  }

  // Activate grid mode if saved
  if (isGridMode()) {
    activateGridMode(state.gridPermutation);
  }

  // Set correct scaling zone on initial load
  applyProgressiveScale();
}
