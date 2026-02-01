import state from './state.js';
import { $ } from './dom.js';
import { US_PRIVILEGES } from './constants.js';
import { freqToBand, isUSCallsign } from './filters.js';

function renderBandRef() {
  const bandRefMyPriv = $('bandRefMyPriv');
  const myPrivOnly = bandRefMyPriv.checked;
  const hasClass = isUSCallsign(state.myCallsign) && !!state.licenseClass;

  bandRefMyPriv.disabled = !hasClass;
  if (!hasClass) bandRefMyPriv.checked = false;

  const MODE_LABELS = { all: 'All', cw: 'CW', cwdig: 'CW/Digital', phone: 'Phone' };

  let classesToShow;
  if (myPrivOnly && hasClass) {
    classesToShow = [state.licenseClass.toUpperCase()];
  } else {
    classesToShow = ['EXTRA', 'GENERAL', 'TECHNICIAN', 'NOVICE'];
  }

  const CLASS_DISPLAY = { EXTRA: 'Extra', GENERAL: 'General', TECHNICIAN: 'Technician', NOVICE: 'Novice' };

  let html = '';
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

  $('bandRefContent').innerHTML = html;
}

export function initBandRefListeners() {
  $('bandRefBtn').addEventListener('click', () => {
    renderBandRef();
    $('bandRefSplash').classList.remove('hidden');
  });

  $('bandRefOk').addEventListener('click', () => {
    $('bandRefSplash').classList.add('hidden');
  });

  $('bandRefMyPriv').addEventListener('change', () => {
    renderBandRef();
  });
}
