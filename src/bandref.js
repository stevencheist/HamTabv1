import state from './state.js';
import { $ } from './dom.js';
import { US_PRIVILEGES } from './constants.js';
import { freqToBand, isUSCallsign } from './filters.js';

// --- Band Reference Tab (inside Reference widget) ---

// Renders US band privilege tables into #referenceContent
export function renderBandRefTab() {
  const hasClass = isUSCallsign(state.myCallsign) && !!state.licenseClass;
  const savedPref = localStorage.getItem('hamtab_bandref_mypriv');
  const myPrivOnly = hasClass && savedPref !== 'false'; // default checked when US callsign

  const MODE_LABELS = { all: 'All', cw: 'CW', cwdig: 'CW/Digital', phone: 'Phone' };
  const CLASS_DISPLAY = { EXTRA: 'Extra', GENERAL: 'General', TECHNICIAN: 'Technician', NOVICE: 'Novice' };

  let classesToShow;
  if (myPrivOnly && hasClass) {
    classesToShow = [state.licenseClass.toUpperCase()];
  } else {
    classesToShow = ['EXTRA', 'GENERAL', 'TECHNICIAN', 'NOVICE'];
  }

  let html = `<label class="band-ref-inline-filter"><input type="checkbox" id="bandRefMyPriv" ${myPrivOnly ? 'checked' : ''} ${!hasClass ? 'disabled' : ''} /> My privileges only</label>`;

  for (const cls of classesToShow) {
    const privs = US_PRIVILEGES[cls];
    if (!privs) continue;
    html += `<h3>${CLASS_DISPLAY[cls] || cls}</h3>`;
    html += '<table class="band-ref-table"><thead><tr><th>Band</th><th>Frequency Range (MHz)</th><th>Modes</th></tr></thead><tbody>';
    for (const [lo, hi, modes] of privs) {
      const band = freqToBand(String(lo)) || '?';
      html += `<tr><td>${band}</td><td>${lo} – ${hi}</td><td>${MODE_LABELS[modes] || modes}</td></tr>`;
    }
    html += '</tbody></table>';
  }

  $('referenceContent').innerHTML = html;

  // Attach checkbox listener after rendering
  const checkbox = document.getElementById('bandRefMyPriv');
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      localStorage.setItem('hamtab_bandref_mypriv', checkbox.checked ? 'true' : 'false');
      renderBandRefTab();
    });
  }
}
