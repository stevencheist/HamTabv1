import { $ } from './dom.js';
import { REFERENCE_TABS, DEFAULT_REFERENCE_TAB } from './constants.js';
import { esc } from './utils.js';
import state from './state.js';

// --- Reference Tab Switching ---

// Switches to the specified reference tab
export function switchReferenceTab(tab) {
  if (!REFERENCE_TABS[tab]) return;

  state.currentReferenceTab = tab;
  localStorage.setItem('hamtab_reference_tab', tab);

  // Update active tab button
  document.querySelectorAll('.reference-tab').forEach(btn => {
    if (btn.dataset.refTab === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderReferenceContent(tab);
}

// Renders content for the specified reference tab
function renderReferenceContent(tab) {
  const refData = REFERENCE_TABS[tab];
  if (!refData) return;

  const content = refData.content;
  let html = '';

  // Description
  if (content.description) {
    html += `<div class="ref-description">${esc(content.description)}</div>`;
  }

  // Table
  if (content.table) {
    html += `<table class="ref-table">`;

    // Headers
    html += `<thead><tr>`;
    content.table.headers.forEach(header => {
      html += `<th>${esc(header)}</th>`;
    });
    html += `</tr></thead>`;

    // Rows
    html += `<tbody>`;
    content.table.rows.forEach(row => {
      html += `<tr>`;
      row.forEach(cell => {
        html += `<td>${esc(cell)}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody>`;
    html += `</table>`;
  }

  // Note
  if (content.note) {
    html += `<div class="ref-note">${esc(content.note)}</div>`;
  }

  // Link
  if (content.link) {
    html += `<div class="ref-note"><a href="${esc(content.link.url)}" target="_blank" rel="noopener">${esc(content.link.text)}</a></div>`;
  }

  $('#referenceContent').innerHTML = html;
}

// --- Event Listeners ---

export function initReferenceListeners() {
  // Load saved tab or default
  const savedTab = localStorage.getItem('hamtab_reference_tab') || DEFAULT_REFERENCE_TAB;
  state.currentReferenceTab = savedTab;

  // Attach tab click handlers
  document.querySelectorAll('.reference-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchReferenceTab(btn.dataset.refTab);
    });
  });

  // Render initial content
  switchReferenceTab(savedTab);
}
