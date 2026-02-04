import { $ } from './dom.js';
import { WIDGET_HELP } from './constants.js';
import { esc } from './utils.js';

// --- Help Modal Rendering ---

// Renders help content for a given widget ID
function renderHelp(widgetId) {
  const help = WIDGET_HELP[widgetId];
  if (!help) return;

  $('#helpTitle').textContent = help.title;

  let html = '';

  // Description
  if (help.description) {
    html += `<div class="help-description">${esc(help.description)}</div>`;
  }

  // Sections
  if (help.sections && help.sections.length > 0) {
    help.sections.forEach(section => {
      html += `<div class="help-section">`;
      html += `<h3>${esc(section.heading)}</h3>`;
      html += `<p>${esc(section.content)}</p>`;
      html += `</div>`;
    });
  }

  // Links
  if (help.links && help.links.length > 0) {
    html += `<div class="help-links">`;
    html += `<h3>Learn More</h3>`;
    help.links.forEach(link => {
      html += `<a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)}</a>`;
    });
    html += `</div>`;
  }

  $('#helpContent').innerHTML = html;
  $('#helpSplash').classList.remove('hidden');
}

// --- Event Listeners ---

export function initHelpListeners() {
  // Attach help button handlers to all widgets
  document.querySelectorAll('.widget-help-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent widget drag
      const widgetId = btn.dataset.widget;
      renderHelp(widgetId);
    });
  });

  // Close help modal
  $('#helpOk').addEventListener('click', () => {
    $('#helpSplash').classList.add('hidden');
  });

  // Close on overlay click
  $('#helpSplash').addEventListener('click', (e) => {
    if (e.target.id === 'helpSplash') {
      $('#helpSplash').classList.add('hidden');
    }
  });
}
