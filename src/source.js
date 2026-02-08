import state from './state.js';
import { $ } from './dom.js';
import { SOURCE_DEFS } from './constants.js';
import { esc } from './utils.js';
import { applyFilter, updateBandFilterButtons, updateModeFilterButtons, updateCountryFilter, updateStateFilter, updateGridFilter, updateContinentFilter, updatePrivFilterVisibility, loadFiltersForSource, updateAllFilterUI, updatePresetDropdown, updateDistanceAgeVisibility, renderWatchListEditor } from './filters.js';
import { renderSpots } from './spots.js';
import { renderMarkers } from './markers.js';

export function updateTableColumns() {
  const cols = SOURCE_DEFS[state.currentSource].columns
    .filter(c => state.spotColumnVisibility[c.key] !== false);
  $('spotsHead').innerHTML = '<tr>' + cols.map(c => `<th>${esc(c.label)}</th>`).join('') + '</tr>';
}

function updateFilterVisibility() {
  const allowed = SOURCE_DEFS[state.currentSource].filters;

  $('bandFilters').style.display = allowed.includes('band') ? '' : 'none';
  $('modeFilters').style.display = allowed.includes('mode') ? '' : 'none';

  // Distance and age filters
  const distWrap = $('distanceFilterWrap');
  const ageWrap = $('ageFilterWrap');
  if (distWrap) distWrap.style.display = allowed.includes('distance') ? '' : 'none';
  if (ageWrap) ageWrap.style.display = allowed.includes('age') ? '' : 'none';

  $('countryFilter').style.display = allowed.includes('country') ? '' : 'none';
  $('stateFilter').style.display = allowed.includes('state') ? '' : 'none';
  $('gridFilter').style.display = allowed.includes('grid') ? '' : 'none';
  const continentFilter = $('continentFilter');
  if (continentFilter) continentFilter.style.display = allowed.includes('continent') ? '' : 'none';

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

  // Load persisted filters for this source (instead of clearing)
  loadFiltersForSource(source);

  // Update dropdown filter values from state
  const countryFilter = $('countryFilter');
  if (countryFilter) countryFilter.value = state.activeCountry || '';
  const stateFilter = $('stateFilter');
  if (stateFilter) stateFilter.value = state.activeState || '';
  const gridFilter = $('gridFilter');
  if (gridFilter) gridFilter.value = state.activeGrid || '';
  const continentFilter = $('continentFilter');
  if (continentFilter) continentFilter.value = state.activeContinent || '';
  const privFilterCheckbox = $('privFilter');
  if (privFilterCheckbox) privFilterCheckbox.checked = state.privilegeFilterEnabled;

  applyFilter();
  renderSpots();
  renderMarkers();
  updateAllFilterUI();
  updatePresetDropdown();
  updateDistanceAgeVisibility();
  renderWatchListEditor();
}

export function initSourceListeners() {
  $('sourceTabs').querySelectorAll('.source-tab').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => switchSource(btn.dataset.source));
  });
}
