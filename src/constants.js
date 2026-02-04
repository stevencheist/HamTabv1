import { aColor, kColor, solarWindColor, bzColor, auroraColor, geomagColor } from './solar.js';
import { lunarDecColor, lunarPlColor } from './lunar.js';

export const WIDGET_DEFS = [
  { id: 'widget-filters',     name: 'Filters' },
  { id: 'widget-activations', name: 'On the Air' },
  { id: 'widget-map',         name: 'HamMap' },
  { id: 'widget-solar',       name: 'Solar' },
  { id: 'widget-propagation', name: 'Band Conditions' },
  { id: 'widget-voacap',      name: 'HF Propagation' },
  { id: 'widget-live-spots',  name: 'Live Spots' },
  { id: 'widget-lunar',       name: 'Lunar / EME' },
  { id: 'widget-satellites',  name: 'Satellites' },
  { id: 'widget-rst',          name: 'Reference' },
  { id: 'widget-spot-detail', name: 'DX Detail' },
];

// Amateur radio satellite frequencies (NORAD ID → frequencies)
// Sources: AMSAT, ARISS, JE9PEL satellite list
export const SAT_FREQUENCIES = {
  25544: {
    name: 'ISS (ZARYA)',
    uplinks: [
      { freq: 145.990, mode: 'FM', desc: 'V/U Repeater' },
    ],
    downlinks: [
      { freq: 437.800, mode: 'FM', desc: 'V/U Repeater' },
      { freq: 145.800, mode: 'FM', desc: 'Voice/SSTV' },
      { freq: 145.825, mode: 'APRS', desc: 'Packet' },
    ],
  },
  43770: {
    name: 'AO-91 (RadFxSat)',
    uplinks: [
      { freq: 435.250, mode: 'FM', desc: '67 Hz CTCSS' },
    ],
    downlinks: [
      { freq: 145.960, mode: 'FM', desc: 'FM Voice' },
    ],
  },
  43137: {
    name: 'AO-92 (Fox-1D)',
    uplinks: [
      { freq: 435.350, mode: 'FM', desc: '67 Hz CTCSS' },
    ],
    downlinks: [
      { freq: 145.880, mode: 'FM', desc: 'FM Voice' },
    ],
  },
  27607: {
    name: 'SO-50 (SaudiSat-1C)',
    uplinks: [
      { freq: 145.850, mode: 'FM', desc: '67 Hz arm, 74.4 Hz TX' },
    ],
    downlinks: [
      { freq: 436.795, mode: 'FM', desc: 'FM Voice' },
    ],
  },
  44909: {
    name: 'CAS-4A (ZHUHAI-1 01)',
    uplinks: [
      { freq: 435.210, mode: 'SSB/CW', desc: 'Linear Transponder' },
    ],
    downlinks: [
      { freq: 145.855, mode: 'SSB/CW', desc: 'Linear Transponder' },
    ],
  },
  44910: {
    name: 'CAS-4B (ZHUHAI-1 02)',
    uplinks: [
      { freq: 435.280, mode: 'SSB/CW', desc: 'Linear Transponder' },
    ],
    downlinks: [
      { freq: 145.925, mode: 'SSB/CW', desc: 'Linear Transponder' },
    ],
  },
  47960: {
    name: 'RS-44 (DOSAAF-85)',
    uplinks: [
      { freq: 145.935, mode: 'SSB/CW', desc: 'Linear Transponder' },
    ],
    downlinks: [
      { freq: 435.610, mode: 'SSB/CW', desc: 'Linear Transponder' },
    ],
  },
  54684: {
    name: 'TEVEL-1',
    uplinks: [
      { freq: 145.970, mode: 'FM', desc: 'FM Transponder' },
    ],
    downlinks: [
      { freq: 436.400, mode: 'FM', desc: 'FM Transponder' },
    ],
  },
  54685: {
    name: 'TEVEL-2',
    uplinks: [
      { freq: 145.970, mode: 'FM', desc: 'FM Transponder' },
    ],
    downlinks: [
      { freq: 436.400, mode: 'FM', desc: 'FM Transponder' },
    ],
  },
};

// Default tracked satellites (NORAD IDs)
export const DEFAULT_TRACKED_SATS = [25544]; // ISS by default

export const SOURCE_DEFS = {
  pota: {
    label: 'POTA',
    endpoint: '/api/spots',
    columns: [
      { key: 'callsign',  label: 'Callsign', class: 'callsign' },
      { key: 'frequency',  label: 'Freq',     class: 'freq' },
      { key: 'mode',       label: 'Mode',     class: 'mode' },
      { key: 'reference',  label: 'Park (link)', class: '' },
      { key: 'name',       label: 'Name',     class: '' },
      { key: 'spotTime',   label: 'Time',     class: '' },
      { key: 'age',        label: 'Age',      class: '' },
    ],
    filters: ['band', 'mode', 'distance', 'age', 'country', 'state', 'grid', 'privilege'],
    hasMap: true,
    spotId: (s) => `${s.activator || s.callsign}-${s.reference}-${s.frequency}`,
    sortKey: 'spotTime',
  },
  sota: {
    label: 'SOTA',
    endpoint: '/api/spots/sota',
    columns: [
      { key: 'callsign',  label: 'Callsign', class: 'callsign' },
      { key: 'frequency',  label: 'Freq',     class: 'freq' },
      { key: 'mode',       label: 'Mode',     class: 'mode' },
      { key: 'reference',  label: 'Summit (link)', class: '' },
      { key: 'name',       label: 'Details',  class: '' },
      { key: 'spotTime',   label: 'Time',     class: '' },
      { key: 'age',        label: 'Age',      class: '' },
    ],
    filters: ['band', 'mode', 'distance', 'age'],
    hasMap: true,
    spotId: (s) => `${s.callsign}-${s.reference}-${s.frequency}`,
    sortKey: 'spotTime',
  },
  dxc: {
    label: 'DXC',
    endpoint: '/api/spots/dxc',
    columns: [
      { key: 'callsign',  label: 'DX Station', class: 'callsign' },
      { key: 'frequency', label: 'Freq',       class: 'freq' },
      { key: 'mode',      label: 'Mode',       class: 'mode' },
      { key: 'spotter',   label: 'Spotter',    class: '' },
      { key: 'name',      label: 'Country',    class: '' },
      { key: 'continent', label: 'Cont',       class: '' },
      { key: 'spotTime',  label: 'Time',       class: '' },
      { key: 'age',       label: 'Age',        class: '' },
    ],
    filters: ['band', 'mode', 'distance', 'age', 'continent'],
    hasMap: true,
    spotId: (s) => `${s.callsign}-${s.frequency}-${s.spotTime}`,
    sortKey: 'spotTime',
  },
  psk: {
    label: 'PSK',
    endpoint: '/api/spots/psk',
    columns: [
      { key: 'callsign',        label: 'TX Call',  class: 'callsign' },
      { key: 'frequency',       label: 'Freq',     class: 'freq' },
      { key: 'mode',            label: 'Mode',     class: 'mode' },
      { key: 'reporter',        label: 'RX Call',  class: '' },
      { key: 'snr',             label: 'SNR',      class: '' },
      { key: 'senderLocator',   label: 'TX Grid',  class: '' },
      { key: 'reporterLocator', label: 'RX Grid',  class: '' },
      { key: 'spotTime',        label: 'Time',     class: '' },
      { key: 'age',             label: 'Age',      class: '' },
    ],
    filters: ['band', 'mode', 'distance', 'age'],
    hasMap: true,
    spotId: (s) => `${s.callsign}-${s.reporter}-${s.frequency}-${s.spotTime}`,
    sortKey: 'spotTime',
  },
};

export const SOLAR_FIELD_DEFS = [
  { key: 'sfi',           label: 'Solar Flux',      unit: '',      colorFn: null,           defaultVisible: true  },
  { key: 'sunspots',      label: 'Sunspots',        unit: '',      colorFn: null,           defaultVisible: true  },
  { key: 'aindex',        label: 'A-Index',         unit: '',      colorFn: aColor,         defaultVisible: true  },
  { key: 'kindex',        label: 'K-Index',         unit: '',      colorFn: kColor,         defaultVisible: true  },
  { key: 'xray',          label: 'X-Ray',           unit: '',      colorFn: null,           defaultVisible: true  },
  { key: 'signalnoise',   label: 'Signal Noise',    unit: '',      colorFn: null,           defaultVisible: true  },
  { key: 'solarwind',     label: 'Solar Wind',      unit: ' km/s', colorFn: solarWindColor, defaultVisible: false },
  { key: 'magneticfield', label: 'Bz (IMF)',        unit: ' nT',   colorFn: bzColor,        defaultVisible: false },
  { key: 'protonflux',    label: 'Proton Flux',     unit: '',      colorFn: null,           defaultVisible: false },
  { key: 'electonflux',   label: 'Electron Flux',   unit: '',      colorFn: null,           defaultVisible: false },
  { key: 'aurora',        label: 'Aurora',           unit: '',      colorFn: auroraColor,    defaultVisible: false },
  { key: 'latdegree',     label: 'Aurora Lat',      unit: '\u00B0',colorFn: null,           defaultVisible: false },
  { key: 'heliumline',    label: 'He 10830\u00C5',  unit: '',      colorFn: null,           defaultVisible: false },
  { key: 'geomagfield',   label: 'Geomag Field',    unit: '',      colorFn: geomagColor,    defaultVisible: false },
  { key: 'kindexnt',      label: 'K-Index (Night)', unit: '',      colorFn: kColor,         defaultVisible: false },
  { key: 'muf',           label: 'MUF',             unit: ' MHz',  colorFn: null,           defaultVisible: false },
  { key: 'fof2',          label: 'foF2',            unit: ' MHz',  colorFn: null,           defaultVisible: false },
  { key: 'muffactor',     label: 'MUF Factor',      unit: '',      colorFn: null,           defaultVisible: false },
];

export const LUNAR_FIELD_DEFS = [
  { key: 'phase',          label: 'Moon Phase',      unit: '',      colorFn: null,          defaultVisible: true  },
  { key: 'illumination',   label: 'Illumination',    unit: '%',     colorFn: null,          defaultVisible: true  },
  { key: 'declination',    label: 'Declination',     unit: '\u00B0',colorFn: lunarDecColor, defaultVisible: true  },
  { key: 'distance',       label: 'Distance',        unit: ' km',   colorFn: null,          defaultVisible: true  },
  { key: 'pathLoss',       label: 'Path Loss',       unit: ' dB',   colorFn: lunarPlColor,  defaultVisible: true  },
  { key: 'elongation',     label: 'Elongation',      unit: '\u00B0',colorFn: null,          defaultVisible: false },
  { key: 'eclipticLon',    label: 'Ecl. Longitude',  unit: '\u00B0',colorFn: null,          defaultVisible: false },
  { key: 'eclipticLat',    label: 'Ecl. Latitude',   unit: '\u00B0',colorFn: null,          defaultVisible: false },
  { key: 'rightAscension', label: 'Right Ascension', unit: '\u00B0',colorFn: null,          defaultVisible: false },
];

// US amateur band privileges per FCC Part 97.301–97.305.
// Format: [lowMHz, highMHz, modeGroup] where modeGroup is 'all', 'cw', 'cwdig', or 'phone'.
export const US_PRIVILEGES = {
  EXTRA: [
    [1.8, 2.0, 'all'], [3.5, 4.0, 'all'], [5.3, 5.4, 'all'],
    [7.0, 7.3, 'all'], [10.1, 10.15, 'all'], [14.0, 14.35, 'all'],
    [18.068, 18.168, 'all'], [21.0, 21.45, 'all'], [24.89, 24.99, 'all'],
    [28.0, 29.7, 'all'], [50.0, 54.0, 'all'], [144.0, 148.0, 'all'],
    [420.0, 450.0, 'all'],
  ],
  GENERAL: [
    [1.8, 2.0, 'all'],
    [3.525, 3.6, 'cwdig'], [3.8, 4.0, 'phone'],
    [5.3, 5.4, 'all'],
    [7.025, 7.125, 'cwdig'], [7.175, 7.3, 'phone'],
    [10.1, 10.15, 'cwdig'],
    [14.025, 14.15, 'cwdig'], [14.225, 14.35, 'phone'],
    [18.068, 18.11, 'cwdig'], [18.11, 18.168, 'phone'],
    [21.025, 21.2, 'cwdig'], [21.275, 21.45, 'phone'],
    [24.89, 24.93, 'cwdig'], [24.93, 24.99, 'phone'],
    [28.0, 29.7, 'all'],
    [50.0, 54.0, 'all'], [144.0, 148.0, 'all'], [420.0, 450.0, 'all'],
  ],
  TECHNICIAN: [
    [3.525, 3.6, 'cw'], [7.025, 7.125, 'cw'], [21.025, 21.2, 'cw'],
    [28.0, 28.3, 'cwdig'], [28.3, 28.5, 'phone'],
    [50.0, 54.0, 'all'], [144.0, 148.0, 'all'], [420.0, 450.0, 'all'],
  ],
  NOVICE: [
    [3.525, 3.6, 'cw'], [7.025, 7.125, 'cw'], [21.025, 21.2, 'cw'],
    [28.0, 28.3, 'cwdig'], [28.3, 28.5, 'phone'],
    [222.0, 225.0, 'all'], [420.0, 450.0, 'all'],
  ],
};

// Help content for all widgets
export const WIDGET_HELP = {
  'widget-filters': {
    title: 'Filters',
    description: 'Filter spots by band, mode, distance, age, and location.',
    sections: [
      { heading: 'Multi-Select Filters', content: 'Click multiple bands or modes to filter. Click again to deselect.' },
      { heading: 'Distance Filter', content: 'Filters spots within N miles/km of your QTH. Requires location to be set.' },
      { heading: 'Age Filter', content: 'Filters spots posted within the last N minutes.' },
      { heading: 'Presets', content: 'Save and load filter combinations for quick switching between common setups.' },
    ],
  },
  'widget-activations': {
    title: 'On the Air',
    description: 'Live spots from POTA, SOTA, DX Cluster, and PSKReporter.',
    sections: [
      { heading: 'POTA Columns', content: 'Callsign, Frequency, Mode, Park Reference (clickable link), Park Name, Spot Time, Age' },
      { heading: 'SOTA Columns', content: 'Callsign, Frequency, Mode, Summit Reference (clickable link), Summit Details, Spot Time, Age' },
      { heading: 'DXC Columns', content: 'DX Station, Frequency, Mode, Spotter, Country, Continent, Spot Time, Age' },
      { heading: 'PSK Columns', content: 'TX Callsign, Frequency, Mode, RX Callsign, SNR, TX Grid, RX Grid, Spot Time, Age' },
      { heading: 'Click Row', content: 'Click a row to select and view details, show on map, and draw geodesic path.' },
    ],
  },
  'widget-map': {
    title: 'HamMap',
    description: 'Interactive map showing spots, your QTH, satellites, and propagation overlays.',
    sections: [
      { heading: 'Markers', content: 'Click markers to select spots. Selected spot shows in DX Detail widget.' },
      { heading: 'Overlays', content: 'Toggle lat/lon grid, Maidenhead grid, timezones, and propagation layers via gear icon.' },
      { heading: 'Center Mode', content: 'Choose QTH (your location) or Spot (selected spot) centering in Config.' },
      { heading: 'Geodesic Line', content: 'Shows great-circle path from your QTH to selected spot.' },
    ],
  },
  'widget-solar': {
    title: 'Solar',
    description: 'Real-time solar conditions and space weather data from HamQSL.',
    sections: [
      { heading: 'Key Metrics', content: 'Solar Flux (SFI), Sunspots, A-Index, K-Index, X-Ray flux, and more.' },
      { heading: 'Color Coding', content: 'A-Index, K-Index, Solar Wind, Bz, Aurora, and Geomag Field are color-coded (green = good, yellow = fair, red = poor).' },
      { heading: 'Custom Fields', content: 'Click gear icon to show/hide fields. Default shows SFI, Sunspots, A/K-Index, X-Ray, Signal Noise.' },
    ],
    links: [
      { label: 'HamQSL Space Weather', url: 'https://www.hamqsl.com/solar.html' },
    ],
  },
  'widget-propagation': {
    title: 'Band Conditions',
    description: 'Global propagation forecast showing MUF, Signal Strength, and SNR by band.',
    sections: [
      { heading: 'Metrics', content: 'Choose between MUFD (Maximum Usable Frequency Day), SS (Signal Strength), or SNR.' },
      { heading: 'Day/Night Toggle', content: 'View current conditions or 12-hour forecast (day ↔ night).' },
      { heading: 'Color Scale', content: 'Green/yellow/red gradient shows propagation quality. Hover for values.' },
    ],
    links: [
      { label: 'NOAA SWPC', url: 'https://www.swpc.noaa.gov/' },
    ],
  },
  'widget-lunar': {
    title: 'Lunar / EME',
    description: 'Moon phase, position, and EME path loss calculations.',
    sections: [
      { heading: 'EME Path Loss', content: 'Calculated at 144 MHz. Varies with moon distance (perigee ~367 dB, apogee ~370 dB).' },
      { heading: 'Declination', content: 'Moon\'s position relative to celestial equator. Affects EME window duration and elevation.' },
      { heading: 'Custom Fields', content: 'Click gear icon to show elongation, ecliptic coordinates, and right ascension.' },
    ],
    links: [
      { label: 'ARRL EME Guide', url: 'https://www.arrl.org/eme' },
    ],
  },
  'widget-satellites': {
    title: 'Satellites',
    description: 'Live tracking and pass predictions for amateur radio satellites via N2YO.',
    sections: [
      { heading: 'Track Satellites', content: 'Click gear icon to add/remove satellites. ISS is tracked by default.' },
      { heading: 'Live Position', content: 'Shows real-time lat/lon, altitude, azimuth, elevation, and footprint on map.' },
      { heading: 'Pass Predictions', content: 'Click a satellite to view upcoming passes with AOS/LOS times and max elevation.' },
      { heading: 'API Key Required', content: 'Get a free N2YO API key and enter it in Config to enable satellite tracking.' },
    ],
    links: [
      { label: 'N2YO API', url: 'https://www.n2yo.com/api/' },
      { label: 'AMSAT', url: 'https://www.amsat.org/' },
    ],
  },
  'widget-rst': {
    title: 'RST Reference',
    description: 'Quick reference for RST signal reporting codes.',
    sections: [
      { heading: 'Readability (R)', content: '1 = Unreadable, 5 = Perfectly readable' },
      { heading: 'Signal Strength (S)', content: '1 = Faint, 9 = Very strong' },
      { heading: 'Tone (T, CW only)', content: '1 = Harsh/hum, 9 = Perfect tone' },
      { heading: 'Usage', content: 'Phone: RS only (e.g. 59). CW: RST (e.g. 599).' },
    ],
    links: [
      { label: 'Ham Radio School — Signal Reports', url: 'https://www.hamradioschool.com/post/practical-signal-reports' },
    ],
  },
  'widget-spot-detail': {
    title: 'DX Detail',
    description: 'Detailed information about the selected spot.',
    sections: [
      { heading: 'Callsign Lookup', content: 'Shows name, address, license class, and grid square from QRZ.com (if available).' },
      { heading: 'Distance & Bearing', content: 'Great-circle distance and heading from your QTH to the spot.' },
      { heading: 'Frequency & Mode', content: 'Operating frequency and mode from the spot data.' },
      { heading: 'Selection', content: 'Click a row in On the Air or a map marker to populate this widget.' },
    ],
  },
  'widget-live-spots': {
    title: 'Live Spots',
    description: 'Shows where YOUR signal is being received via PSKReporter.',
    sections: [
      { heading: 'Requirements', content: 'Enter your callsign in Config. Works best when you\'re actively transmitting on digital modes (FT8, FT4, etc.).' },
      { heading: 'Band Cards', content: 'Click a band card to toggle display of RX stations on the map. Shows count or farthest distance.' },
      { heading: 'Display Mode', content: 'Click gear icon to switch between count and distance display. Distance shows your farthest reach per band.' },
      { heading: 'Map Overlay', content: 'Active bands show geodesic paths from your QTH to each receiving station.' },
    ],
    links: [
      { label: 'PSKReporter', url: 'https://pskreporter.info/' },
    ],
  },
  'widget-voacap': {
    title: 'HF Propagation',
    description: '24-hour propagation prediction matrix showing band reliability by hour.',
    sections: [
      { heading: 'Matrix', content: 'Rows are HF bands, columns are hours (UTC). Color intensity shows predicted reliability.' },
      { heading: 'Current Hour', content: 'The current UTC hour is highlighted with a border.' },
      { heading: 'Color Scale', content: 'Black = closed, Red = poor, Yellow = fair, Green = good. Based on MUF and solar conditions.' },
      { heading: 'Map Overlay', content: 'Click a band row to show/hide propagation circles on the map.' },
    ],
    links: [
      { label: 'NOAA SWPC Propagation', url: 'https://www.swpc.noaa.gov/communities/radio-communications' },
    ],
  },
};

// Reference tabs content
export const REFERENCE_TABS = {
  rst: {
    label: 'RST',
    content: {
      description: 'Signal reporting system for readability, strength, and tone.',
      table: {
        headers: ['', 'Readability', 'Strength', 'Tone (CW)'],
        rows: [
          ['1', 'Unreadable', 'Faint', 'Harsh, hum'],
          ['2', 'Barely readable', 'Very weak', 'Harsh, modulation'],
          ['3', 'Readable with difficulty', 'Weak', 'Rough, hum'],
          ['4', 'Almost perfectly readable', 'Fair', 'Rough, modulation'],
          ['5', 'Perfectly readable', 'Fairly good', 'Wavering, strong hum'],
          ['6', '—', 'Good', 'Wavering, strong mod'],
          ['7', '—', 'Moderately strong', 'Good, slight hum'],
          ['8', '—', 'Strong', 'Good, slight mod'],
          ['9', '—', 'Very strong', 'Perfect tone'],
        ],
      },
      note: 'Phone: RS only (e.g. 59) · CW: RST (e.g. 599)',
      link: { text: 'Ham Radio School — Practical Signal Reports', url: 'https://www.hamradioschool.com/post/practical-signal-reports' },
    },
  },
  phonetic: {
    label: 'Phonetic',
    content: {
      description: 'NATO phonetic alphabet for clear letter pronunciation.',
      table: {
        headers: ['Letter', 'Phonetic', 'Letter', 'Phonetic'],
        rows: [
          ['A', 'Alpha', 'N', 'November'],
          ['B', 'Bravo', 'O', 'Oscar'],
          ['C', 'Charlie', 'P', 'Papa'],
          ['D', 'Delta', 'Q', 'Quebec'],
          ['E', 'Echo', 'R', 'Romeo'],
          ['F', 'Foxtrot', 'S', 'Sierra'],
          ['G', 'Golf', 'T', 'Tango'],
          ['H', 'Hotel', 'U', 'Uniform'],
          ['I', 'India', 'V', 'Victor'],
          ['J', 'Juliet', 'W', 'Whiskey'],
          ['K', 'Kilo', 'X', 'X-ray'],
          ['L', 'Lima', 'Y', 'Yankee'],
          ['M', 'Mike', 'Z', 'Zulu'],
        ],
      },
    },
  },
};

export const DEFAULT_REFERENCE_TAB = 'rst';

export const WIDGET_STORAGE_KEY = 'hamtab_widgets';
export const USER_LAYOUT_KEY = 'hamtab_widgets_user';
export const SNAP_DIST = 20; // px — edge-snap threshold for widget dragging
export const HEADER_H = 30; // px — widget header/title-bar height used in snap calculations
