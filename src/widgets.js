import state from './state.js';
import { WIDGET_DEFS, WIDGET_STORAGE_KEY, SNAP_DIST, HEADER_H } from './constants.js';
import { centerMapOnUser, updateUserMarker } from './map-init.js';

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

export function applyWidgetVisibility() {
  WIDGET_DEFS.forEach(w => {
    const el = document.getElementById(w.id);
    if (!el) return;
    if (state.widgetVisibility[w.id] === false) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });
  if (state.map) setTimeout(() => state.map.invalidateSize(), 50);
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

  const clockH = state.clockStyle === 'analog' ? 280 : 130;
  const clockW = Math.round((centerW - pad) / 2);

  const rightX = leftW + centerW + pad * 3;

  return {
    'widget-clock-local': { left: leftW + pad * 2, top: pad, width: clockW, height: clockH },
    'widget-clock-utc': { left: leftW + pad * 2 + clockW + pad, top: pad, width: clockW, height: clockH },
    'widget-activations': { left: pad, top: pad, width: leftW, height: H - pad * 2 },
    'widget-map': { left: leftW + pad * 2, top: clockH + pad * 2, width: centerW, height: H - clockH - pad * 3 },
    'widget-solar': { left: rightX, top: pad, width: rightW, height: rightHalf },
    'widget-lunar': { left: rightX, top: rightHalf + pad * 2, width: rightW, height: Math.round((H - rightHalf - pad * 4) / 3) },
    'widget-rst': { left: rightX, top: rightHalf + pad * 2 + Math.round((H - rightHalf - pad * 4) / 3) + pad, width: rightW, height: Math.round((H - rightHalf - pad * 4) / 3) },
    'widget-spot-detail': { left: rightX, top: rightHalf + pad * 2 + 2 * (Math.round((H - rightHalf - pad * 4) / 3) + pad), width: rightW, height: Math.round((H - rightHalf - pad * 4) / 3) },
  };
}

function clampPosition(left, top, wW, wH) {
  const { width: aW, height: aH } = getWidgetArea();
  left = Math.max(0, Math.min(left, aW - 60));
  top = Math.max(0, Math.min(top, aH - HEADER_H));
  return { left, top };
}

function snapPosition(left, top, wW, wH) {
  const { width: aW, height: aH } = getWidgetArea();
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

function bringToFront(widget) {
  state.zCounter++;
  widget.style.zIndex = state.zCounter;
}

function setupDrag(widget, handle) {
  let startX, startY, origLeft, origTop;

  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    bringToFront(widget);
    startX = e.clientX;
    startY = e.clientY;
    origLeft = parseInt(widget.style.left) || 0;
    origTop = parseInt(widget.style.top) || 0;

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
    e.preventDefault();
    e.stopPropagation();
    bringToFront(widget);
    startX = e.clientX;
    startY = e.clientY;
    origW = widget.offsetWidth;
    origH = widget.offsetHeight;
    origLeft = parseInt(widget.style.left) || 0;
    origTop = parseInt(widget.style.top) || 0;

    function onMove(ev) {
      let newW = origW + (ev.clientX - startX);
      let newH = origH + (ev.clientY - startY);
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
  document.querySelectorAll('.widget').forEach(widget => {
    const pos = layout[widget.id];
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

function resetLayout() {
  localStorage.removeItem(WIDGET_STORAGE_KEY);
  applyLayout(getDefaultLayout());
  saveWidgets();
  centerMapOnUser();
  updateUserMarker();
}

export function initWidgets() {
  let layout;
  try {
    const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (saved) {
      layout = JSON.parse(saved);
      const { width: aW, height: aH } = getWidgetArea();
      for (const id of Object.keys(layout)) {
        const p = layout[id];
        if (p.left > aW - 30 || p.top > aH - 30 || p.left + p.width < 30 || p.top + p.height < 10) {
          layout = null;
          break;
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

  document.querySelectorAll('.widget').forEach(widget => {
    const header = widget.querySelector('.widget-header');
    const resizer = widget.querySelector('.widget-resize');
    if (header) setupDrag(widget, header);
    if (resizer) setupResize(widget, resizer);
    widget.addEventListener('mousedown', () => bringToFront(widget));
  });

  const mapWidget = document.getElementById('widget-map');
  if (state.map && mapWidget && window.ResizeObserver) {
    new ResizeObserver(() => state.map.invalidateSize()).observe(mapWidget);
  }

  document.getElementById('resetLayoutBtn').addEventListener('click', resetLayout);
}
