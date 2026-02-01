import state from './state.js';
import { $ } from './dom.js';
import { SOURCE_DEFS } from './constants.js';
import { esc } from './utils.js';
import { applyFilter, updateBandFilterButtons, updateModeFilterButtons, updateCountryFilter, updateStateFilter, updateGridFilter, updatePrivFilterVisibility } from './filters.js';
import { renderSpots } from './spots.js';
import { renderMarkers } from './markers.js';

function updateTableColumns() {
  const cols = SOURCE_DEFS[state.currentSource].columns;
  $('spotsHead').innerHTML = '<tr>' + cols.map(c => `<th>${esc(c.label)}</th>`).join('') + '</tr>';
}

function updateFilterVisibility() {
  const allowed = SOURCE_DEFS[state.currentSource].filters;

  $('bandFilters').style.display = allowed.includes('band') ? '' : 'none';
  $('modeFilters').style.display = allowed.includes('mode') ? '' : 'none';
  $('countryFilter').style.display = allowed.includes('country') ? '' : 'none';
  $('stateFilter').style.display = allowed.includes('state') ? '' : 'none';
  $('gridFilter').style.display = allowed.includes('grid') ? '' : 'none';

  const privLabel = document.querySelector('.priv-filter-label');
  if (privLabel) {
    if (!allowed.includes('privilege')) {
      privLabel.style.display = 'none';
    } else {
      privLabel.style.display = '';
      updatePrivFilterVisibility();
    }
  }
}

export function switchSource(source) {
  if (!SOURCE_DEFS[source]) source = 'pota';
  state.currentSource = source;
  localStorage.setItem('hamtab_spot_source', source);

  $('sourceTabs').querySelectorAll('.source-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.source === source);
  });

  updateTableColumns();
  updateFilterVisibility();

  state.activeBand = null;
  state.activeMode = null;
  state.activeCountry = null;
  state.activeState = null;
  state.activeGrid = null;
  const privFilterCheckbox = $('privFilter');
  if (privFilterCheckbox) {
    state.privilegeFilterEnabled = false;
    privFilterCheckbox.checked = false;
  }
  const countryFilter = $('countryFilter');
  if (countryFilter) countryFilter.value = '';
  const stateFilter = $('stateFilter');
  if (stateFilter) stateFilter.value = '';
  const gridFilter = $('gridFilter');
  if (gridFilter) gridFilter.value = '';

  applyFilter();
  renderSpots();
  renderMarkers();
  updateBandFilterButtons();
  updateModeFilterButtons();
  updateCountryFilter();
  updateStateFilter();
  updateGridFilter();
}

export function initSourceListeners() {
  $('sourceTabs').querySelectorAll('.source-tab').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => switchSource(btn.dataset.source));
  });
}
