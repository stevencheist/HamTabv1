// --- Named Layout Profiles ---
// Header dropdown UI for saving, loading, and deleting named layout profiles.
// Migration from old single-layout system (hamtab_widgets_user → hamtab_layouts).

import { $ } from './dom.js';
import { USER_LAYOUT_KEY, LAYOUTS_KEY } from './constants.js';
import { getNamedLayouts, saveNamedLayout, loadNamedLayout, deleteNamedLayout } from './widgets.js';

let menuOpen = false;

function renderMenu() {
  const menu = $('layoutMenu');
  if (!menu) return;
  menu.innerHTML = '';

  const layouts = getNamedLayouts();
  const names = Object.keys(layouts);

  // Layout entries
  names.forEach(name => {
    const item = document.createElement('div');
    item.className = 'layout-menu-item';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    nameSpan.style.cursor = 'pointer';
    nameSpan.style.flex = '1';
    nameSpan.addEventListener('click', () => {
      loadNamedLayout(name);
      closeMenu();
    });
    item.appendChild(nameSpan);

    const delBtn = document.createElement('button');
    delBtn.className = 'layout-delete-btn';
    delBtn.textContent = '\u00D7'; // ×
    delBtn.title = 'Delete layout';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete layout "${name}"?`)) {
        deleteNamedLayout(name);
        renderMenu();
      }
    });
    item.appendChild(delBtn);

    menu.appendChild(item);
  });

  // Divider (only if there are layouts)
  if (names.length > 0) {
    const divider = document.createElement('div');
    divider.className = 'layout-menu-divider';
    menu.appendChild(divider);
  }

  // "Save Current..." action
  const saveAction = document.createElement('div');
  saveAction.className = 'layout-menu-action';
  saveAction.textContent = 'Save Current\u2026';
  saveAction.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent outside-click handler from closing menu
    showSaveInput(menu);
  });
  menu.appendChild(saveAction);
}

function showSaveInput(menu) {
  // Replace the "Save Current..." action with an inline input
  const existing = menu.querySelector('.layout-save-row');
  if (existing) { existing.querySelector('input')?.focus(); return; }

  // Remove the "Save Current..." action
  const action = menu.querySelector('.layout-menu-action');
  if (action) action.remove();

  const row = document.createElement('div');
  row.className = 'layout-save-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Layout name';
  input.maxLength = 40;

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    doSave(input.value.trim());
  });

  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSave(input.value.trim());
    if (e.key === 'Escape') closeMenu();
  });

  function doSave(name) {
    if (!name) return;
    const ok = saveNamedLayout(name);
    if (!ok) {
      alert('Maximum 20 layouts reached. Delete one first.');
      return;
    }
    renderMenu();
  }

  row.appendChild(input);
  row.appendChild(saveBtn);
  menu.appendChild(row);

  // Focus after appending so the input is in the DOM
  requestAnimationFrame(() => input.focus());
}

function openMenu() {
  const menu = $('layoutMenu');
  if (!menu) return;
  renderMenu();
  menu.classList.add('open');
  menuOpen = true;
}

function closeMenu() {
  const menu = $('layoutMenu');
  if (!menu) return;
  menu.classList.remove('open');
  menuOpen = false;
}

function toggleMenu() {
  if (menuOpen) closeMenu();
  else openMenu();
}

// --- Migration: old single layout → named layouts ---
function migrateOldLayout() {
  const hasOld = localStorage.getItem(USER_LAYOUT_KEY);
  const hasNew = localStorage.getItem(LAYOUTS_KEY);
  if (hasOld && !hasNew) {
    try {
      const oldPositions = JSON.parse(hasOld);
      if (oldPositions && typeof oldPositions === 'object') {
        const layouts = {
          'My Default': {
            positions: oldPositions,
            visibility: {},
            gridMode: 'float',
            gridPermutation: '3L-3R',
            gridAssignments: {},
            gridSpans: {},
          },
        };
        localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts));
        localStorage.removeItem(USER_LAYOUT_KEY);
      }
    } catch (e) {}
  }
}

export function initLayoutDropdown() {
  // Run migration first
  migrateOldLayout();

  const btn = $('layoutBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });
  }

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!menuOpen) return;
    const dropdown = $('layoutDropdown');
    if (dropdown && !dropdown.contains(e.target)) {
      closeMenu();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) closeMenu();
  });
}

// Export for mobile menu to call
export function openLayoutMenu() {
  openMenu();
}
