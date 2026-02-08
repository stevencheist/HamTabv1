// --- Grid Layout Mode ---
// Manages the opt-in CSS Grid + Flex Column hybrid layout.
// Outer CSS Grid: 3 columns (left, map, right) + optional top/bottom rows.
// Left/right columns and top/bottom bars are flex wrappers with independent sizing.
// Flex handles between widgets in wrappers allow vertical/horizontal resizing.
// Track handles on outer grid boundaries allow column width adjustment.

import state from './state.js';
import { GRID_PERMUTATIONS, GRID_DEFAULT_ASSIGNMENTS, GRID_MODE_KEY, GRID_PERM_KEY, GRID_ASSIGN_KEY, GRID_SIZES_KEY, WIDGET_DEFS, SCALE_REFERENCE_WIDTH } from './constants.js';

let trackHandles = []; // currently active outer grid handle elements
const MIN_FR = 0.3;    // minimum fr value to prevent outer grid track collapse
const MIN_FLEX = 0.15; // minimum flex-grow to prevent widget collapse inside wrappers

// --- Track Size Persistence ---

function loadCustomTrackSizes(permId) {
  try {
    const all = JSON.parse(localStorage.getItem(GRID_SIZES_KEY));
    if (all && all[permId]) return all[permId]; // { columns, rows, leftFlex, rightFlex, topFlex, bottomFlex }
  } catch (e) {}
  return null;
}

function saveCustomTrackSizes(permId, columns, rows, flexRatios) {
  let all = {};
  try {
    const saved = JSON.parse(localStorage.getItem(GRID_SIZES_KEY));
    if (saved && typeof saved === 'object') all = saved;
  } catch (e) {}
  all[permId] = { columns, rows, ...(flexRatios || {}) };
  localStorage.setItem(GRID_SIZES_KEY, JSON.stringify(all));
}

function clearCustomTrackSizes(permId) {
  try {
    const all = JSON.parse(localStorage.getItem(GRID_SIZES_KEY));
    if (all && all[permId]) {
      delete all[permId];
      localStorage.setItem(GRID_SIZES_KEY, JSON.stringify(all));
    }
  } catch (e) {}
}

// --- Track Parsing ---

function parseTracks(templateStr) {
  return templateStr.trim().split(/\s+/).map(t => {
    const frMatch = t.match(/^([\d.]+)fr$/);
    if (frMatch) return { value: parseFloat(frMatch[1]), unit: 'fr' };
    const pxMatch = t.match(/^([\d.]+)px$/);
    if (pxMatch) return { value: parseFloat(pxMatch[1]), unit: 'px' };
    return { value: t, unit: 'keyword' }; // 'auto', 'min-content', etc.
  });
}

function serializeTracks(tracks) {
  return tracks.map(t => {
    if (t.unit === 'fr') return t.value.toFixed(2) + 'fr';
    if (t.unit === 'px') return t.value + 'px';
    return t.value; // keyword
  }).join(' ');
}

// --- Boundary Detection ---
// Returns resizable boundaries between adjacent tracks.
// 'fr-fr' boundaries redistribute fr values; 'auto-fr' boundaries convert the auto track to px.

function getResizableBoundaries(tracks) {
  const boundaries = [];
  for (let i = 0; i < tracks.length - 1; i++) {
    const a = tracks[i].unit;
    const b = tracks[i + 1].unit;
    if (a === 'fr' && b === 'fr') {
      boundaries.push({ index: i, type: 'fr-fr' });
    } else if ((a === 'fr' && b === 'keyword') || (a === 'keyword' && b === 'fr')) {
      boundaries.push({ index: i, type: 'auto-fr' });
    }
  }
  return boundaries;
}

// --- Outer Grid Track Handle Management ---

function removeTrackHandles() {
  trackHandles.forEach(h => h.remove());
  trackHandles = [];
}

function createTrackHandles() {
  removeTrackHandles();
  const area = document.getElementById('widgetArea');
  if (!area || !isGridMode()) return;

  const colTemplate = area.style.gridTemplateColumns || '';
  const rowTemplate = area.style.gridTemplateRows || '';
  const colTracks = parseTracks(colTemplate);
  const rowTracks = parseTracks(rowTemplate);

  const colBoundaries = getResizableBoundaries(colTracks);
  const rowBoundaries = getResizableBoundaries(rowTracks);

  colBoundaries.forEach(b => {
    const handle = document.createElement('div');
    handle.className = 'grid-track-handle grid-track-handle--col';
    handle.dataset.axis = 'col';
    handle.dataset.boundary = b.index;
    handle.dataset.btype = b.type;
    handle.addEventListener('mousedown', onHandleMouseDown);
    area.appendChild(handle);
    trackHandles.push(handle);
  });

  rowBoundaries.forEach(b => {
    const handle = document.createElement('div');
    handle.className = 'grid-track-handle grid-track-handle--row';
    handle.dataset.axis = 'row';
    handle.dataset.boundary = b.index;
    handle.dataset.btype = b.type;
    handle.addEventListener('mousedown', onHandleMouseDown);
    area.appendChild(handle);
    trackHandles.push(handle);
  });

  positionTrackHandles();
}

function positionTrackHandles() {
  const area = document.getElementById('widgetArea');
  if (!area || trackHandles.length === 0) return;

  const cs = getComputedStyle(area);
  const padding = 6; // px — matches CSS padding on .widget-area.grid-active
  const gap = 6;     // px — matches CSS gap

  // Resolved pixel sizes for columns and rows
  const colPx = cs.gridTemplateColumns.split(/\s+/).map(parseFloat);
  const rowPx = cs.gridTemplateRows.split(/\s+/).map(parseFloat);

  trackHandles.forEach(handle => {
    const axis = handle.dataset.axis;
    const bIdx = parseInt(handle.dataset.boundary);

    if (axis === 'col') {
      let left = padding;
      for (let i = 0; i <= bIdx; i++) left += colPx[i] + gap;
      left -= gap / 2 + 3; // center the 6px handle in the gap
      handle.style.left = left + 'px';
      handle.style.top = '0';
      handle.style.height = area.offsetHeight + 'px';
      handle.style.width = '6px';
    } else {
      let top = padding;
      for (let i = 0; i <= bIdx; i++) top += rowPx[i] + gap;
      top -= gap / 2 + 3;
      handle.style.top = top + 'px';
      handle.style.left = '0';
      handle.style.width = area.offsetWidth + 'px';
      handle.style.height = '6px';
    }
  });
}

export function repositionGridHandles() {
  positionTrackHandles();
}

// --- Outer Grid Track Drag Handler ---

function onHandleMouseDown(e) {
  if (state.reflowActive || window.innerWidth < SCALE_REFERENCE_WIDTH) return; // no resize in Zone B/C
  e.preventDefault();
  e.stopPropagation();

  const handle = e.currentTarget;
  const axis = handle.dataset.axis;
  const bIdx = parseInt(handle.dataset.boundary);
  const btype = handle.dataset.btype;
  const area = document.getElementById('widgetArea');
  if (!area) return;

  const isCol = axis === 'col';
  const templateProp = isCol ? 'gridTemplateColumns' : 'gridTemplateRows';
  const tracks = parseTracks(area.style[templateProp] || '');

  const cs = getComputedStyle(area);
  const pxSizes = (isCol ? cs.gridTemplateColumns : cs.gridTemplateRows).split(/\s+/).map(parseFloat);

  const beforeIdx = bIdx;
  const afterIdx = bIdx + 1;
  const startPos = isCol ? e.clientX : e.clientY;

  let onMove;

  if (btype === 'fr-fr') {
    const beforeFr = tracks[beforeIdx].value;
    const afterFr = tracks[afterIdx].value;
    const totalPx = pxSizes[beforeIdx] + pxSizes[afterIdx];
    const totalFr = beforeFr + afterFr;
    const pxPerFr = totalPx / totalFr;

    onMove = function(ev) {
      const delta = (isCol ? ev.clientX : ev.clientY) - startPos;
      const deltaFr = delta / pxPerFr;

      let newBefore = beforeFr + deltaFr;
      let newAfter = afterFr - deltaFr;

      if (newBefore < MIN_FR) {
        newAfter -= (MIN_FR - newBefore);
        newBefore = MIN_FR;
      }
      if (newAfter < MIN_FR) {
        newBefore -= (MIN_FR - newAfter);
        newAfter = MIN_FR;
      }
      newBefore = Math.max(MIN_FR, newBefore);
      newAfter = Math.max(MIN_FR, newAfter);

      tracks[beforeIdx] = { value: newBefore, unit: 'fr' };
      tracks[afterIdx] = { value: newAfter, unit: 'fr' };

      area.style[templateProp] = serializeTracks(tracks);
      positionTrackHandles();
    };
  } else {
    const MIN_PX = 40; // px — minimum size for auto-converted tracks
    const autoIdx = tracks[beforeIdx].unit === 'keyword' ? beforeIdx : afterIdx;
    const initialPx = pxSizes[autoIdx];
    const sign = autoIdx === beforeIdx ? 1 : -1;

    onMove = function(ev) {
      const delta = (isCol ? ev.clientX : ev.clientY) - startPos;
      const newPx = Math.max(MIN_PX, initialPx + delta * sign);

      tracks[autoIdx] = { value: Math.round(newPx), unit: 'px' };

      area.style[templateProp] = serializeTracks(tracks);
      positionTrackHandles();
    };
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);

    const perm = getGridPermutation(state.gridPermutation);
    saveCustomTrackSizes(
      state.gridPermutation,
      area.style.gridTemplateColumns,
      area.style.gridTemplateRows,
      readCurrentFlexRatios(perm)
    );

    if (state.map) state.map.invalidateSize();
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// --- Flex Wrapper Lifecycle ---

function createWrappers(perm) {
  const area = document.getElementById('widgetArea');
  if (!area) return;

  // Left column wrapper
  if (perm.left.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.id = 'grid-col-left';
    wrapper.className = 'grid-col-wrapper';
    wrapper.style.gridArea = 'left';
    area.appendChild(wrapper);
  }

  // Right column wrapper
  if (perm.right.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.id = 'grid-col-right';
    wrapper.className = 'grid-col-wrapper';
    wrapper.style.gridArea = 'right';
    area.appendChild(wrapper);
  }

  // Top bar wrapper
  if (perm.top.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.id = 'grid-bar-top';
    wrapper.className = 'grid-bar-wrapper';
    wrapper.style.gridArea = 'top';
    area.appendChild(wrapper);
  }

  // Bottom bar wrapper
  if (perm.bottom.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.id = 'grid-bar-bottom';
    wrapper.className = 'grid-bar-wrapper';
    wrapper.style.gridArea = 'bottom';
    area.appendChild(wrapper);
  }
}

function removeWrappers() {
  const area = document.getElementById('widgetArea');
  if (!area) return;

  // Move widget children back to #widgetArea before removing wrappers
  const wrapperIds = ['grid-col-left', 'grid-col-right', 'grid-bar-top', 'grid-bar-bottom'];
  wrapperIds.forEach(id => {
    const wrapper = document.getElementById(id);
    if (!wrapper) return;
    // Move widgets back to widgetArea
    const widgets = wrapper.querySelectorAll('.widget');
    widgets.forEach(w => area.appendChild(w));
    // Remove flex handles and placeholders inside wrapper
    wrapper.querySelectorAll('.grid-flex-handle, .grid-cell-placeholder').forEach(el => el.remove());
    wrapper.remove();
  });
}

// --- Flex Handle Drag System ---

function onFlexHandleMouseDown(e) {
  if (state.reflowActive || window.innerWidth < SCALE_REFERENCE_WIDTH) return; // no resize in Zone B/C
  e.preventDefault();
  e.stopPropagation();

  const handle = e.currentTarget;
  const wrapper = handle.parentElement;
  if (!wrapper) return;

  const isColumn = wrapper.classList.contains('grid-col-wrapper');

  // Get the flex children (widgets and placeholders, not handles)
  const children = Array.from(wrapper.children).filter(
    c => !c.classList.contains('grid-flex-handle')
  );

  // Find the items immediately before and after this handle
  const handleIdx = Array.from(wrapper.children).indexOf(handle);
  let beforeEl = null;
  let afterEl = null;
  // Walk backward from handle to find the previous flex child
  for (let i = handleIdx - 1; i >= 0; i--) {
    const c = wrapper.children[i];
    if (!c.classList.contains('grid-flex-handle')) { beforeEl = c; break; }
  }
  // Walk forward from handle to find the next flex child
  for (let i = handleIdx + 1; i < wrapper.children.length; i++) {
    const c = wrapper.children[i];
    if (!c.classList.contains('grid-flex-handle')) { afterEl = c; break; }
  }

  if (!beforeEl || !afterEl) return;

  const beforeFlex = parseFloat(beforeEl.style.flexGrow) || 1;
  const afterFlex = parseFloat(afterEl.style.flexGrow) || 1;
  const totalFlex = beforeFlex + afterFlex;

  // Total pixel space of both items
  const beforePx = isColumn ? beforeEl.offsetHeight : beforeEl.offsetWidth;
  const afterPx = isColumn ? afterEl.offsetHeight : afterEl.offsetWidth;
  const totalPx = beforePx + afterPx;
  const pxPerFlex = totalPx / totalFlex;

  const startPos = isColumn ? e.clientY : e.clientX;

  function onMove(ev) {
    const delta = (isColumn ? ev.clientY : ev.clientX) - startPos;
    const deltaFlex = delta / pxPerFlex;

    let newBefore = beforeFlex + deltaFlex;
    let newAfter = afterFlex - deltaFlex;

    // Clamp
    if (newBefore < MIN_FLEX) {
      newAfter -= (MIN_FLEX - newBefore);
      newBefore = MIN_FLEX;
    }
    if (newAfter < MIN_FLEX) {
      newBefore -= (MIN_FLEX - newAfter);
      newAfter = MIN_FLEX;
    }
    newBefore = Math.max(MIN_FLEX, newBefore);
    newAfter = Math.max(MIN_FLEX, newAfter);

    beforeEl.style.flexGrow = newBefore.toFixed(3);
    afterEl.style.flexGrow = newAfter.toFixed(3);
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);

    // Save flex ratios
    const perm = getGridPermutation(state.gridPermutation);
    const area = document.getElementById('widgetArea');
    if (area) {
      saveCustomTrackSizes(
        state.gridPermutation,
        area.style.gridTemplateColumns,
        area.style.gridTemplateRows,
        readCurrentFlexRatios(perm)
      );
    }

    if (state.map) state.map.invalidateSize();
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// --- Read Current Flex Ratios from DOM ---

function readCurrentFlexRatios(perm) {
  const ratios = {};

  const wrapperMap = {
    leftFlex: 'grid-col-left',
    rightFlex: 'grid-col-right',
    topFlex: 'grid-bar-top',
    bottomFlex: 'grid-bar-bottom',
  };

  for (const [key, wrapperId] of Object.entries(wrapperMap)) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) continue;
    const children = Array.from(wrapper.children).filter(
      c => !c.classList.contains('grid-flex-handle')
    );
    if (children.length > 0) {
      ratios[key] = children.map(c => parseFloat(c.style.flexGrow) || 1);
    }
  }

  return ratios;
}

// --- Populate a Flex Wrapper ---

function populateWrapper(wrapperId, cellNames, flexKey, isColumn, customSizes) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper || cellNames.length === 0) return;

  // Clear wrapper contents
  while (wrapper.firstChild) {
    const child = wrapper.firstChild;
    // Move widgets back to widgetArea before clearing
    if (child.classList && child.classList.contains('widget')) {
      document.getElementById('widgetArea').appendChild(child);
    } else {
      child.remove();
    }
  }

  // Get flex ratios (saved or default)
  const savedFlex = customSizes && customSizes[flexKey];
  const defaultFlex = cellNames.map(() => 1);
  const flexValues = savedFlex && savedFlex.length === cellNames.length ? savedFlex : defaultFlex;

  cellNames.forEach((cellName, idx) => {
    // Insert flex handle between items (not before the first)
    if (idx > 0) {
      const handle = document.createElement('div');
      handle.className = isColumn
        ? 'grid-flex-handle grid-flex-handle--col'
        : 'grid-flex-handle grid-flex-handle--row';
      handle.addEventListener('mousedown', onFlexHandleMouseDown);
      wrapper.appendChild(handle);
    }

    const widgetId = state.gridAssignments[cellName];
    let el;

    // Respect widget visibility — treat hidden widgets as empty cells
    const isVisible = widgetId && state.widgetVisibility && state.widgetVisibility[widgetId] !== false;

    if (isVisible) {
      el = document.getElementById(widgetId);
      if (el) {
        el.style.gridArea = '';
        el.style.display = '';
        wrapper.appendChild(el);
      }
    } else if (widgetId) {
      // Widget exists but user hid it — keep it hidden
      const hiddenEl = document.getElementById(widgetId);
      if (hiddenEl) hiddenEl.style.display = 'none';
    }

    if (!el) {
      // Create placeholder for empty cell
      el = document.createElement('div');
      el.className = 'grid-cell-placeholder';
      el.dataset.gridCell = cellName;
      wrapper.appendChild(el);
    }

    el.style.flexGrow = flexValues[idx];
    el.style.flexShrink = '1';
    el.style.flexBasis = '0%';
  });
}

// --- Public API ---

export function isGridMode() {
  return state.gridMode === 'grid';
}

export function getGridPermutation(permId) {
  return GRID_PERMUTATIONS.find(p => p.id === permId) || GRID_PERMUTATIONS[1]; // default to 3L-3R
}

export function loadGridAssignments() {
  try {
    const saved = JSON.parse(localStorage.getItem(GRID_ASSIGN_KEY));
    if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
      state.gridAssignments = saved;
      return saved;
    }
  } catch (e) {}
  const defaults = GRID_DEFAULT_ASSIGNMENTS[state.gridPermutation];
  state.gridAssignments = defaults ? { ...defaults } : {};
  return state.gridAssignments;
}

export function saveGridAssignments() {
  localStorage.setItem(GRID_ASSIGN_KEY, JSON.stringify(state.gridAssignments));
}

export function saveGridMode() {
  localStorage.setItem(GRID_MODE_KEY, state.gridMode);
}

export function saveGridPermutation() {
  localStorage.setItem(GRID_PERM_KEY, state.gridPermutation);
}

export function activateGridMode(permId) {
  const perm = getGridPermutation(permId);
  const area = document.getElementById('widgetArea');
  if (!area) return;

  state.gridMode = 'grid';
  state.gridPermutation = perm.id;
  saveGridMode();
  saveGridPermutation();

  // Load assignments (from localStorage or defaults for this permutation)
  if (!state.gridAssignments || Object.keys(state.gridAssignments).length === 0) {
    loadGridAssignments();
  }

  // Apply outer CSS Grid
  area.classList.add('grid-active');
  area.style.gridTemplateAreas = perm.outerAreas;

  // Load custom track sizes if saved, otherwise use permutation defaults
  const custom = loadCustomTrackSizes(perm.id);
  area.style.gridTemplateColumns = custom ? custom.columns : perm.outerColumns;
  area.style.gridTemplateRows = custom ? custom.rows : perm.outerRows;

  // Create flex wrappers and populate with widgets
  removeWrappers();
  createWrappers(perm);
  applyGridAssignments(custom);

  // Let layout settle then fix map and create resize handles
  setTimeout(() => {
    if (state.map) state.map.invalidateSize();
    createTrackHandles();
  }, 100);
}

export function deactivateGridMode() {
  removeTrackHandles();
  removeWrappers();

  const area = document.getElementById('widgetArea');
  if (!area) return;

  state.gridMode = 'float';
  saveGridMode();

  // Remove grid CSS
  area.classList.remove('grid-active');
  area.style.gridTemplateAreas = '';
  area.style.gridTemplateColumns = '';
  area.style.gridTemplateRows = '';

  // Remove grid-area and flex from all widgets, restore saved free-float positions
  const saved = getSavedFloatLayout();
  document.querySelectorAll('.widget').forEach(w => {
    w.style.gridArea = '';
    w.style.flex = '';
    w.style.flexGrow = '';
    w.style.flexShrink = '';
    w.style.flexBasis = '';
    if (saved && saved[w.id]) {
      w.style.left = saved[w.id].left + 'px';
      w.style.top = saved[w.id].top + 'px';
      w.style.width = saved[w.id].width + 'px';
      w.style.height = saved[w.id].height + 'px';
    }
  });

  // Remove any remaining placeholders
  area.querySelectorAll('.grid-cell-placeholder').forEach(el => el.remove());

  // Let layout settle
  setTimeout(() => {
    if (state.map) state.map.invalidateSize();
  }, 100);
}

function getSavedFloatLayout() {
  try {
    const saved = localStorage.getItem('hamtab_widgets');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export function applyGridAssignments(customSizes) {
  const perm = getGridPermutation(state.gridPermutation);
  const area = document.getElementById('widgetArea');
  if (!area || !state.gridAssignments) return;

  // Load custom sizes if not provided
  if (!customSizes) customSizes = loadCustomTrackSizes(perm.id);

  // Map widget stays as direct grid child
  const mapEl = document.getElementById('widget-map');
  if (mapEl) {
    mapEl.style.gridArea = 'map';
    mapEl.style.display = '';
    // Ensure map is a direct child of widgetArea
    if (mapEl.parentElement !== area) area.appendChild(mapEl);
  }

  // Populate flex wrappers
  populateWrapper('grid-col-left', perm.left, 'leftFlex', true, customSizes);
  populateWrapper('grid-col-right', perm.right, 'rightFlex', true, customSizes);
  populateWrapper('grid-bar-top', perm.top, 'topFlex', false, customSizes);
  populateWrapper('grid-bar-bottom', perm.bottom, 'bottomFlex', false, customSizes);

  // Hide unassigned widgets and user-hidden widgets
  const assignedWidgets = new Set(Object.values(state.gridAssignments));
  const vis = state.widgetVisibility || {};
  WIDGET_DEFS.forEach(def => {
    if (def.id === 'widget-map') return;
    const el = document.getElementById(def.id);
    if (!el) return;
    // Hide if unassigned OR if user toggled it off
    if (!assignedWidgets.has(def.id) || vis[def.id] === false) {
      el.style.gridArea = '';
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });
}

// Reset grid assignments and track sizes to defaults for current permutation
export function resetGridAssignments() {
  const defaults = GRID_DEFAULT_ASSIGNMENTS[state.gridPermutation];
  state.gridAssignments = defaults ? { ...defaults } : {};
  saveGridAssignments();

  // Restore default track sizes (including clearing flex ratios)
  clearCustomTrackSizes(state.gridPermutation);
  const perm = getGridPermutation(state.gridPermutation);
  const area = document.getElementById('widgetArea');
  if (area) {
    area.style.gridTemplateAreas = perm.outerAreas;
    area.style.gridTemplateColumns = perm.outerColumns;
    area.style.gridTemplateRows = perm.outerRows;
  }

  applyGridAssignments();
  createTrackHandles();
}

// --- Drag-to-swap ---

export function handleGridDragStart(widget, e) {
  if (widget.id === 'widget-map') return; // map is not draggable
  if (state.reflowActive || window.innerWidth < SCALE_REFERENCE_WIDTH) return; // no drag in Zone B/C

  e.preventDefault();
  const sourceId = widget.id;
  let currentTarget = null;

  widget.classList.add('grid-dragging');

  function onMove(ev) {
    // Find element under cursor (ignoring the dragged widget)
    widget.style.pointerEvents = 'none';
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    widget.style.pointerEvents = '';

    // Clear previous target highlight
    if (currentTarget) {
      currentTarget.classList.remove('grid-drop-target');
      currentTarget = null;
    }

    if (!el) return;

    // Find the widget or placeholder under cursor
    const target = el.closest('.widget, .grid-cell-placeholder');
    if (target && target !== widget && target.id !== 'widget-map') {
      target.classList.add('grid-drop-target');
      currentTarget = target;
    }
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    widget.classList.remove('grid-dragging');

    if (currentTarget) {
      currentTarget.classList.remove('grid-drop-target');
      performSwap(sourceId, currentTarget);
    }
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function performSwap(sourceWidgetId, target) {
  if (!state.gridAssignments) return;

  // Find source cell
  let sourceCell = null;
  for (const [cell, wId] of Object.entries(state.gridAssignments)) {
    if (wId === sourceWidgetId) { sourceCell = cell; break; }
  }
  if (!sourceCell) return;

  if (target.classList.contains('grid-cell-placeholder')) {
    // Dragged onto an empty cell — move widget there
    const targetCell = target.dataset.gridCell;
    if (!targetCell) return;
    delete state.gridAssignments[sourceCell];
    state.gridAssignments[targetCell] = sourceWidgetId;
  } else if (target.classList.contains('widget')) {
    // Dragged onto another widget — swap their cells
    const targetWidgetId = target.id;
    let targetCell = null;
    for (const [cell, wId] of Object.entries(state.gridAssignments)) {
      if (wId === targetWidgetId) { targetCell = cell; break; }
    }
    if (!targetCell) return;

    state.gridAssignments[sourceCell] = targetWidgetId;
    state.gridAssignments[targetCell] = sourceWidgetId;
  }

  saveGridAssignments();
  applyGridAssignments();
}
