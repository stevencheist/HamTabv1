import { aColor, kColor, solarWindColor, bzColor, auroraColor, geomagColor } from './solar.js';
import { lunarDecColor, lunarPlColor, lunarElColor } from './lunar.js';

export const WIDGET_DEFS = [
  { id: 'widget-filters',     name: 'Filters',           short: 'Filt' },
  { id: 'widget-activations', name: 'On the Air',        short: 'OTA' },
  { id: 'widget-map',         name: 'HamMap',            short: 'MAP' },
  { id: 'widget-solar',       name: 'Solar',             short: 'Sol' },
  { id: 'widget-spacewx',     name: 'Space Wx',          short: 'SpWx' },
  { id: 'widget-propagation', name: 'Band Conditions',   short: 'Band' },
  { id: 'widget-voacap',      name: 'VOACAP DE\u2192DX', short: 'VOA' },
  { id: 'widget-live-spots',  name: 'Live Spots',        short: 'Live' },
  { id: 'widget-lunar',       name: 'Lunar / EME',       short: 'Moon' },
  { id: 'widget-satellites',  name: 'Satellites',        short: 'Sat' },
  { id: 'widget-rst',          name: 'Reference',        short: 'Ref' },
  { id: 'widget-spot-detail', name: 'DX Detail',         short: 'DXDt' },
  { id: 'widget-contests',     name: 'Contests',         short: 'Cont' },
  { id: 'widget-dxpeditions',  name: 'DXpeditions',      short: 'DXpd' },
  { id: 'widget-beacons',      name: 'NCDXF Beacons',    short: 'Bcn' },
  { id: 'widget-dedx',         name: 'DE/DX Info',       short: 'DEDX' },
  { id: 'widget-stopwatch',    name: 'Stopwatch / Timer', short: 'Tmr' },
  { id: 'widget-analog-clock', name: 'Analog Clock',     short: 'Clk' },
  // { id: 'widget-on-air-rig',  name: 'On-Air Rig',       short: 'Rig' }, // RADIO_HIDDEN
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
      { key: 'callsign',  label: 'Callsign', class: 'callsign', sortable: true },
      { key: 'frequency',  label: 'Freq',     class: 'freq', sortable: true },
      { key: 'mode',       label: 'Mode',     class: 'mode', sortable: true },
      { key: 'reference',  label: 'Park (link)', class: '' },
      { key: 'name',       label: 'Name',     class: '' },
      { key: 'spotTime',   label: 'Time',     class: '', sortable: true },
      { key: 'age',        label: 'Age',      class: '', sortable: true },
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
      { key: 'callsign',  label: 'Callsign', class: 'callsign', sortable: true },
      { key: 'frequency',  label: 'Freq',     class: 'freq', sortable: true },
      { key: 'mode',       label: 'Mode',     class: 'mode', sortable: true },
      { key: 'reference',  label: 'Summit (link)', class: '' },
      { key: 'name',       label: 'Details',  class: '' },
      { key: 'spotTime',   label: 'Time',     class: '', sortable: true },
      { key: 'age',        label: 'Age',      class: '', sortable: true },
    ],
    filters: ['band', 'mode', 'distance', 'age', 'privilege'],
    hasMap: true,
    spotId: (s) => `${s.callsign}-${s.reference}-${s.frequency}`,
    sortKey: 'spotTime',
  },
  dxc: {
    label: 'DXC',
    endpoint: '/api/spots/dxc',
    columns: [
      { key: 'callsign',  label: 'DX Station', class: 'callsign', sortable: true },
      { key: 'frequency', label: 'Freq',       class: 'freq', sortable: true },
      { key: 'mode',      label: 'Mode',       class: 'mode', sortable: true },
      { key: 'spotter',   label: 'Spotter',    class: '' },
      { key: 'name',      label: 'Country',    class: '' },
      { key: 'continent', label: 'Cont',       class: '' },
      { key: 'spotTime',  label: 'Time',       class: '', sortable: true },
      { key: 'age',       label: 'Age',        class: '', sortable: true },
    ],
    filters: ['band', 'mode', 'distance', 'age', 'continent', 'privilege'],
    hasMap: true,
    spotId: (s) => `${s.callsign}-${s.frequency}-${s.spotTime}`,
    sortKey: 'spotTime',
  },
  wwff: {
    label: 'WWFF',
    endpoint: '/api/spots/wwff',
    columns: [
      { key: 'callsign',  label: 'Callsign', class: 'callsign', sortable: true },
      { key: 'frequency',  label: 'Freq',     class: 'freq', sortable: true },
      { key: 'mode',       label: 'Mode',     class: 'mode', sortable: true },
      { key: 'reference',  label: 'Ref (link)', class: '' },
      { key: 'name',       label: 'Name',     class: '' },
      { key: 'spotTime',   label: 'Time',     class: '', sortable: true },
      { key: 'age',        label: 'Age',      class: '', sortable: true },
    ],
    filters: ['band', 'mode', 'distance', 'age', 'privilege'],
    hasMap: true,
    spotId: (s) => `${s.callsign}-${s.reference}-${s.frequency}`,
    sortKey: 'spotTime',
  },
  psk: {
    label: 'PSK',
    endpoint: '/api/spots/psk',
    columns: [
      { key: 'callsign',        label: 'TX Call',  class: 'callsign', sortable: true },
      { key: 'frequency',       label: 'Freq',     class: 'freq', sortable: true },
      { key: 'mode',            label: 'Mode',     class: 'mode', sortable: true },
      { key: 'reporter',        label: 'RX Call',  class: '' },
      { key: 'snr',             label: 'SNR',      class: '' },
      { key: 'senderLocator',   label: 'TX Grid',  class: '' },
      { key: 'reporterLocator', label: 'RX Grid',  class: '' },
      { key: 'spotTime',        label: 'Time',     class: '', sortable: true },
      { key: 'age',             label: 'Age',      class: '', sortable: true },
    ],
    filters: ['band', 'mode', 'distance', 'age', 'privilege'],
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
  { key: 'elevation',      label: 'Elevation',       unit: '\u00B0',colorFn: lunarElColor,  defaultVisible: true  },
  { key: 'azimuth',        label: 'Azimuth',         unit: '\u00B0',colorFn: null,          defaultVisible: true  },
  { key: 'moonrise',       label: 'Moonrise',        unit: '',      colorFn: null,          defaultVisible: true,  format: 'time' },
  { key: 'moonset',        label: 'Moonset',         unit: '',      colorFn: null,          defaultVisible: true,  format: 'time' },
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
    description: 'Narrow down the spot list to find exactly what you\'re looking for. Filters let you focus on specific bands, modes, nearby stations, or recent activity. Watch lists add per-source highlighting and include/exclude rules.',
    sections: [
      { heading: 'Band & Mode Filters', content: 'Click one or more bands (like 20m, 40m) or modes (like FT8, SSB) to show only those spots. Click again to deselect. You can select as many as you want.' },
      { heading: 'Distance Filter', content: 'Show only spots within a certain distance from your location (QTH). You\'ll need to set your location in Config first. Great for finding nearby activations you can reach.' },
      { heading: 'Age Filter', content: 'Show only spots posted within the last N minutes. Older spots may no longer be active, so this helps you find stations that are on the air right now.' },
      { heading: 'Propagation Filter', content: 'Click the "Prop" button to hide spots on bands with poor predicted propagation. Uses your current solar indices and location to estimate which HF bands are likely open. Spots on bands rated below "Fair" (less than 30% reliability) are filtered out. VHF/UHF spots are never filtered since they don\'t depend on HF propagation.' },
      { heading: 'Watch Lists', content: 'Click the "Watch Lists" accordion below the presets to add rules for the active source tab. Three modes: Red highlights matching spots with a tinted row, Only shows ONLY matching spots (everything else hidden), Not excludes matching spots. Match by callsign (strips /P, /M suffixes), DXCC entity, grid prefix, or park/summit reference. Rules apply per source tab and persist across sessions.' },
      { heading: 'Presets', content: 'Save your favorite filter combinations and switch between them quickly. For example, save a "Local FT8" preset for nearby digital spots, and a "DX SSB" preset for long-distance voice contacts.' },
    ],
  },
  'widget-activations': {
    title: 'On the Air',
    description: 'A live feed of stations currently on the air. This is your main view for finding stations to contact. Data comes from five sources: POTA (Parks on the Air), SOTA (Summits on the Air), DX Cluster (worldwide DX spots), WWFF (World Wide Flora & Fauna), and PSKReporter (digital mode reception reports).',
    sections: [
      { heading: 'How to Use', content: 'Use the tabs at the top to switch between POTA, SOTA, DXC, WWFF, and PSK sources. Click any row to select that station — its details will appear in the DX Detail widget and its location will be highlighted on the map.' },
      { heading: 'POTA', content: 'Shows operators activating parks for the Parks on the Air program. Click the park reference link to see park details on the POTA website.' },
      { heading: 'SOTA', content: 'Shows operators activating mountain summits for the Summits on the Air program. Click the summit reference for details.' },
      { heading: 'DX Cluster', content: 'Worldwide spots from the DX Cluster network. Great for finding rare or distant (DX) stations.' },
      { heading: 'WWFF', content: 'Shows operators activating nature reserves for the World Wide Flora & Fauna program. Similar to POTA but with a worldwide scope — especially popular in Europe. Click the reference link for reserve details.' },
      { heading: 'PSK Reporter', content: 'Digital mode reception reports from PSKReporter. Shows which stations are being decoded and where, useful for checking band conditions.' },
    ],
  },
  'widget-map': {
    title: 'HamMap',
    description: 'An interactive world map showing the locations of spotted stations, your location, satellite tracks, and optional overlays. This gives you a visual picture of who\'s on the air and where.',
    sections: [
      { heading: 'Spot Markers', content: 'Each dot on the map is a spotted station. Click a marker to select it and see its details. A line will be drawn showing the path from your location to the station.' },
      { heading: 'Map Overlays', content: 'Click the gear icon to toggle overlays: lat/lon grid, Maidenhead grid squares (a location system hams use), time zones, MUF map (Maximum Usable Frequency from prop.kc2g.com), D-RAP absorption (NOAA SWPC — shows where HF signals are being absorbed by solar events), DX Paths (band-colored great circle lines), DXpedition Markers (active/upcoming DXpeditions), Tropics & Arctic Lines (major latitude circles with labels), Weather Radar (global precipitation from RainViewer), Cloud Cover (OpenWeatherMap — useful for satellite and EME ops), and Map Legend (color key for all marker types). D-RAP auto-enables when Kp reaches storm level (≥5). Cloud Cover requires an OpenWeatherMap API key (enter in Config > Services).' },
      { heading: 'Geodesic Paths', content: 'The curved line between you and a selected station is called a geodesic (great-circle) path — this is the shortest route over the Earth\'s surface and the direction to point your antenna.' },
      { heading: 'Center Mode', content: 'Use the QTH/PM/DX/CTY buttons in the map header to control centering. QTH centers on your home location. PM (Prime Meridian) shows the whole world. DX follows the selected spot. CTY zooms to fit your country\'s boundaries, determined automatically from your location.' },
      { heading: 'Fullscreen', content: 'Click the ⛶ button in the map header to expand the map to fill the entire screen. Click the ✕ button or press Escape to return to the normal layout.' },
    ],
  },
  'widget-solar': {
    title: 'Solar',
    description: 'Real-time space weather data that affects radio propagation. The sun\'s activity directly determines which bands are open and how far your signal can travel.',
    sections: [
      { heading: 'What This Shows', content: 'Solar Flux (SFI) and Sunspot Number indicate overall solar activity — higher values generally mean better HF propagation. The A-Index and K-Index measure geomagnetic disturbance — lower is better for radio.' },
      { heading: 'Color Coding', content: 'Values are color-coded: green means good conditions for radio, yellow means fair, and red means poor or disturbed. Watch the K-Index especially — values above 4 can shut down HF bands.' },
      { heading: 'Customize Fields', content: 'Click the gear icon to show or hide individual fields. By default, the most useful metrics are shown. Advanced users can enable additional fields like solar wind speed, Bz component, and aurora activity.' },
    ],
    links: [
      { label: 'HamQSL Space Weather', url: 'https://www.hamqsl.com/solar.html' },
    ],
  },
  'widget-spacewx': {
    title: 'Space Weather History',
    description: 'Historical graphs of key space weather indices over the past week (or 90 days for Solar Flux). These charts help you spot trends and understand how conditions are changing — not just a single snapshot, but the bigger picture.',
    sections: [
      { heading: 'Tabs', content: 'Five tabs let you switch between different measurements: Kp index (geomagnetic activity), X-Ray flux (solar flare intensity), SFI (Solar Flux Index — overall solar activity), Solar Wind speed, and Bz (interplanetary magnetic field direction).' },
      { heading: 'What the graphs show', content: 'Kp: Bar chart colored green/yellow/red — values above 4 mean geomagnetic storms that can disrupt HF. X-Ray: Line chart on a log scale — C/M/X class flares marked. SFI: 90-day trend — higher values (100+) mean better HF propagation. Wind: Solar wind speed — above 400 km/s can disturb conditions. Bz: Southward (negative) Bz opens Earth\'s magnetosphere to solar wind, worsening conditions.' },
      { heading: 'Data source', content: 'All data comes from NOAA Space Weather Prediction Center (SWPC), updated every 15 minutes.' },
    ],
    links: [
      { label: 'NOAA SWPC', url: 'https://www.swpc.noaa.gov/' },
    ],
  },
  'widget-propagation': {
    title: 'Band Conditions',
    description: 'HF band conditions and VHF propagation status. Shows per-band reliability predictions for both day and night simultaneously, plus VHF phenomena like Aurora and E-Skip.',
    sections: [
      { heading: 'HF Bands', content: 'Each band shows a reliability percentage and condition (Excellent/Good/Fair/Poor/Closed). Day and night are shown side by side — day conditions appear in the left column (orange border), night in the right column (blue border). Green means the band is likely open, yellow means marginal, red means closed.' },
      { heading: 'VHF Conditions', content: 'Below the HF bands, VHF propagation phenomena are shown: Aurora (affects 2m and above in northern latitudes) and E-Skip (sporadic E-layer openings on 6m/4m/2m by region). Data comes directly from HamQSL.' },
      { heading: 'How It Works', content: 'HF predictions are calculated from Solar Flux (SFI), K-index, and A-index using an ionospheric model. Higher SFI means better HF conditions. K-index above 4 can shut down HF bands. The summary bar shows current MUF (Maximum Usable Frequency), SFI, and K-index.' },
    ],
    links: [
      { label: 'NOAA Space Weather', url: 'https://www.swpc.noaa.gov/' },
      { label: 'HamQSL Solar Data', url: 'https://www.hamqsl.com/solar.html' },
    ],
  },
  'widget-lunar': {
    title: 'Lunar / EME',
    description: 'Moon tracking data for Earth-Moon-Earth (EME or "moonbounce") communication. EME is an advanced technique where operators bounce radio signals off the moon to make contacts over very long distances.',
    sections: [
      { heading: 'Moon Phase & Position', content: 'Shows the current moon phase, illumination, and sky position. The moon needs to be above the horizon at both your location and the other station\'s location for EME to work.' },
      { heading: 'Azimuth & Elevation', content: 'Shows where the moon is in your sky right now. Elevation is the angle above your horizon — green (20°+) is ideal for EME, yellow (0-20°) is marginal, dim means below the horizon. Azimuth is the compass bearing (0° = North, 90° = East, etc.).' },
      { heading: 'Moonrise & Moonset', content: 'Shows the next moonrise and moonset times for your location. These help you plan EME operating windows. Requires your location to be set in Configuration.' },
      { heading: 'EME Path Loss', content: 'Shows how much signal is lost on the round trip to the moon and back, calculated at 144 MHz (2m band). Lower path loss means better EME conditions. Loss varies with moon distance — closer moon (perigee) means less loss.' },
      { heading: 'Declination', content: 'The moon\'s angle relative to the equator. Higher declination generally means longer EME windows (more time with the moon above the horizon).' },
      { heading: 'Customize Fields', content: 'Click the gear icon to show additional data like elongation, ecliptic coordinates, and right ascension for advanced planning.' },
    ],
    links: [
      { label: 'ARRL EME Guide', url: 'https://www.arrl.org/eme' },
      { label: 'NASA Moon Visualization', url: 'https://svs.gsfc.nasa.gov/5187' },
    ],
  },
  'widget-satellites': {
    title: 'Satellites',
    description: 'Track amateur radio satellites in real time and predict when they\'ll pass over your location. Many satellites carry amateur radio repeaters that anyone with a ham license can use to make contacts.',
    sections: [
      { heading: 'ISS Tracking', content: 'The ISS (International Space Station) is tracked automatically — no API key needed! Its position, footprint, and predicted orbit path appear on the map as a dashed cyan line. The ISS has an amateur radio station (ARISS) onboard.' },
      { heading: 'Adding More Satellites', content: 'To track additional satellites like AO-91, SO-50, and others, you\'ll need a free API key from N2YO.com — enter it in Config. Click the gear icon to search for and add satellites.' },
      { heading: 'Live Position', content: 'See where each satellite is right now on the map, along with its altitude, speed, and whether it\'s above your horizon (visible to you).' },
      { heading: 'TLE Age', content: 'Each satellite row shows the age of its TLE (orbital element) data in days. Color thresholds are based on the configurable "Max TLE Age" setting (default: 7 days) — green = fresh, yellow = aging, red + \u26A0 = exceeds max age. Stale TLEs reduce position accuracy. The ISS TLE is refreshed from CelesTrak every 6 hours. Set the max age in the satellite config (gear icon).' },
      { heading: 'Pass Predictions', content: 'Click a satellite to see when it will next pass over your location. AOS (Acquisition of Signal) is when it rises, LOS (Loss of Signal) is when it sets. Higher max elevation passes are easier to work.' },
    ],
    links: [
      { label: 'N2YO Satellite Tracker', url: 'https://www.n2yo.com/' },
      { label: 'AMSAT — Amateur Satellites', url: 'https://www.amsat.org/' },
    ],
  },
  'widget-rst': {
    title: 'Reference',
    description: 'Quick-reference tables for common ham radio information. Use the tabs to switch between RST signal reports, NATO phonetic alphabet, Morse code, Q-codes, and US band privileges.',
    sections: [
      { heading: 'RST Reports', content: 'The RST tab shows readability (R), signal strength (S), and tone (T) values. During a contact, you exchange signal reports so each station knows how well they\'re being received.' },
      { heading: 'Phonetic & Morse', content: 'The Phonetic tab has the NATO phonetic alphabet for spelling callsigns clearly. The Morse tab shows dit/dah patterns for each character.' },
      { heading: 'Q-Codes', content: 'Common three-letter abbreviations starting with Q, originally for CW but now used on voice too. QTH = your location, QSO = a contact, QSL = confirmed.' },
      { heading: 'Bands', content: 'US amateur band privileges by license class (Extra, General, Technician, Novice). Check "My privileges only" to show just your class. Requires a US callsign set in Config.' },
    ],
    links: [
      { label: 'Ham Radio School — Signal Reports', url: 'https://www.hamradioschool.com/post/practical-signal-reports' },
    ],
  },
  'widget-rst:phonetic': {
    title: 'Phonetic Alphabet',
    description: 'The NATO phonetic alphabet is used by hams to spell out callsigns and words clearly, especially when signals are weak or noisy. Instead of saying the letter "B", you say "Bravo" so it can\'t be confused with "D", "E", or "P".',
    sections: [
      { heading: 'When to Use It', content: 'Use the phonetic alphabet whenever you give your callsign on the air. For example, W1AW would be spoken as "Whiskey One Alpha Whiskey". It\'s also used to spell names, locations, or any word that needs to be communicated clearly.' },
      { heading: 'Tips', content: 'You\'ll quickly memorize the phonetics for your own callsign. Practice saying it aloud before your first contact! Some hams use creative alternatives (like "Kilowatt" for K), but the standard NATO alphabet is always understood.' },
    ],
  },
  'widget-rst:morse': {
    title: 'Morse Code',
    description: 'Morse code (CW) is one of the oldest and most effective modes in ham radio. It uses short signals (dits, shown as dots) and long signals (dahs, shown as dashes) to represent letters and numbers. CW can get through when voice and digital modes can\'t.',
    sections: [
      { heading: 'Learning Morse', content: 'The best way to learn Morse code is by sound, not by memorizing the dot-dash patterns visually. Apps like "Morse Trainer" or the Koch method help you learn by listening to characters at full speed.' },
      { heading: 'Prosigns', content: 'Prosigns are special Morse sequences with specific meanings: AR (.-.-.) means "end of message", BT (-...-) means "pause/break", SK (...-.-) means "end of contact", and 73 means "best regards".' },
      { heading: 'On the Air', content: 'CW is popular for QRP (low power) operating because it\'s very efficient. A 5-watt CW signal can often be copied when a 100-watt voice signal cannot. Many hams enjoy CW contesting and DX.' },
    ],
    links: [
      { label: 'LCWO — Learn CW Online', url: 'https://lcwo.net/' },
    ],
  },
  'widget-rst:qcodes': {
    title: 'Q-Codes',
    description: 'Q-codes are three-letter abbreviations starting with "Q" that were originally created for CW (Morse code) to save time. Many are now commonly used in voice conversations too. As a question, they end with a "?"; as a statement, they\'re a direct answer.',
    sections: [
      { heading: 'Most Common for New Hams', content: 'QTH = your location ("My QTH is Denver"). QSO = a contact/conversation. QSL = confirmation ("QSL" means "I confirm" or "received"). QRZ = "who is calling?" (also the name of a popular callsign lookup website).' },
      { heading: 'Power & Interference', content: 'QRP = low power (5W or less) — a popular challenge mode. QRO = high power. QRM = man-made interference. QRN = natural noise (static). QSB = signal fading in and out.' },
      { heading: 'Operating', content: 'QSY = change frequency ("Let\'s QSY to 14.250"). QRT = shutting down for the day ("I\'m going QRT"). QRV = ready to receive. QRL = the frequency is in use (always ask "QRL?" before transmitting on a frequency!).' },
    ],
  },
  'widget-rst:bands': {
    title: 'US Band Privileges',
    description: 'A reference chart showing which frequencies and modes are available to each US license class. This is based on FCC Part 97.301–97.305.',
    sections: [
      { heading: 'License Classes', content: 'US ham licenses come in four classes: Technician (entry level), General (expanded HF access), Amateur Extra (full privileges), and Novice (legacy, no longer issued). Each class has different frequency allocations.' },
      { heading: 'My Privileges Only', content: 'Check "My privileges only" to filter the table to show just your license class. This requires a US callsign to be set in Config — your license class is looked up automatically.' },
      { heading: 'Mode Groups', content: 'All = any mode allowed. CW = Morse code only. CW/Digital = CW and digital modes (FT8, PSK31, etc.). Phone = voice modes (SSB, FM, AM).' },
    ],
  },
  'widget-spot-detail': {
    title: 'DX Detail',
    description: 'Shows detailed information about whichever station you\'ve selected. Click any row in the On the Air table or any marker on the map to see that station\'s details here.',
    sections: [
      { heading: 'Station Info', content: 'Displays the operator\'s name, location, license class, and grid square (looked up from their callsign). US callsigns are looked up via the FCC database; non-US callsigns use HamQTH.com (configure credentials in Config > Services). For POTA/SOTA/WWFF spots, the park or summit location (e.g. US-TX, VE-ON) is also shown.' },
      { heading: 'Distance & Bearing', content: 'Shows how far away the station is and which direction to point your antenna (bearing). Requires your location to be set in Config.' },
      { heading: 'Frequency & Mode', content: 'The frequency and mode the station is operating on, so you know exactly where to tune your radio.' },
      { heading: 'Weather', content: 'Shows current weather conditions at the station\'s location. US stations use NWS data; stations worldwide use OpenWeatherMap (configure your OWM API key in Config > Services).' },
    ],
  },
  'widget-contests': {
    title: 'Contests',
    description: 'A calendar of upcoming and active amateur radio contests. Contests are time-limited on-air competitions where operators try to make as many contacts as possible. They\'re a great way to fill your logbook and practice your operating skills.',
    sections: [
      { heading: 'What Are Contests?', content: 'Ham radio contests run for a set period (usually a weekend). Operators exchange brief messages and try to contact as many stations or regions as possible. Contests happen nearly every weekend — from casual events to major international competitions.' },
      { heading: 'Reading the List', content: 'Each card shows the contest name, date/time window, and operating mode. Contests update in real time — when a contest starts, it moves to the top with a green "NOW" badge. When it ends, it disappears automatically. Click any card to view the full rules and exchange format on the contest website.' },
      { heading: 'Mode Badges', content: 'CW = Morse code only. PHONE = voice modes (SSB/FM). DIGITAL = digital modes (RTTY, FT8, etc.). Contests without a badge accept mixed modes.' },
    ],
    links: [
      { label: 'WA7BNM Contest Calendar', url: 'https://www.contestcalendar.com/' },
    ],
  },
  'widget-dxpeditions': {
    title: 'DXpeditions',
    description: 'Track upcoming and active DXpeditions — organized trips to rare or hard-to-reach locations (remote islands, territories, etc.) specifically to get on the air for other hams to contact. Working a DXpedition is often the only way to log a new DXCC entity.',
    sections: [
      { heading: 'What Is a DXpedition?', content: 'A DXpedition is when a team of operators travels to a rare location and sets up amateur radio stations. They operate around the clock so as many hams as possible can make contact. Some DXpeditions are to uninhabited islands that might only be activated once a decade.' },
      { heading: 'Reading the Cards', content: 'Each card shows the callsign being used, the location (DXCC entity), operating dates, and QSL information. Cards marked "ACTIVE" are on the air right now. Click any card for more details. DXpeditions with known locations also appear as orange circle markers on the map (toggle via Map Overlays gear icon) — bright orange for active, dimmer for upcoming.' },
      { heading: 'Time Filter', content: 'Use the dropdown in the widget header to filter DXpeditions by time window: Active Now, Within 1 Week, Within 1 Month, Within 6 Months, or All. Active DXpeditions always appear regardless of the filter. The map markers match whatever the widget shows.' },
      { heading: 'Hiding DXpeditions', content: 'Hover over any card and click the \u00D7 button to hide it. Hidden DXpeditions are also removed from the map. A "Show N hidden" button appears at the bottom to restore all hidden items at once.' },
      { heading: 'QSL Information', content: 'QSL means "I confirm" — it\'s how you verify a contact. The QSL field shows how to confirm: LoTW (Logbook of the World, an electronic system), direct (mail a card to the QSL manager), or bureau (via the QSL bureau, slower but cheaper).' },
    ],
    links: [
      { label: 'NG3K DXpedition Calendar', url: 'https://www.ng3k.com/Misc/adxo.html' },
    ],
  },
  'widget-beacons': {
    title: 'NCDXF Beacons',
    description: 'Real-time display of the NCDXF/IARU International Beacon Project — a network of 18 synchronized beacons worldwide that transmit on 5 HF frequencies in a repeating 3-minute cycle. Listening for these beacons is the quickest way to check which bands are open to which parts of the world.',
    sections: [
      { heading: 'How It Works', content: 'Every 3 minutes, each of the 18 beacons transmits for 10 seconds on each of 5 frequencies (14.100, 18.110, 21.150, 24.930, and 28.200 MHz). Five beacons transmit simultaneously — one per frequency. The table shows which beacon is active on each frequency right now, with a countdown to the next rotation.' },
      { heading: 'Checking Propagation', content: 'Tune your radio to one of the beacon frequencies and listen. If you hear a beacon, the band is open to that beacon\'s location. Scan all five frequencies to quickly map which bands are open to which parts of the world.' },
      { heading: 'Beacon Transmission', content: 'Each beacon transmits its callsign in CW (Morse code) at 100 watts, followed by four 1-second dashes at decreasing power levels (100W, 10W, 1W, 0.1W). If you can copy the callsign but not the last dashes, you know the band is open but marginal to that location.' },
    ],
    links: [
      { label: 'NCDXF Beacon Project', url: 'https://www.ncdxf.org/beacon/' },
    ],
  },
  'widget-dedx': {
    title: 'DE/DX Info',
    description: 'A side-by-side display of your station (DE) and the currently selected distant station (DX) with live clocks. Inspired by the classic HamClock dual-pane layout, this widget shows large local time displays at each location plus key contact information at a glance.',
    sections: [
      { heading: 'DE (Your Station)', content: 'The left panel shows a large live clock for your local time, plus your callsign, grid square, and sunrise/sunset countdowns. Requires your callsign and location to be set in Config.' },
      { heading: 'DX (Selected Station)', content: 'The right panel shows the approximate local time at the selected DX station\'s location (calculated from longitude), plus their callsign, frequency, mode, grid square, bearing, distance, and sunrise/sunset. When no spot is selected, the DX side shows UTC.' },
      { heading: 'Why Two Clocks?', content: 'Knowing the local time at both ends of a path is essential for scheduling contacts and understanding propagation. A station in Japan is unlikely to be on the air at 3 AM their local time, and gray line propagation depends on sunrise/sunset at both locations.' },
      { heading: 'Bearing & Distance', content: 'The bearing tells you which compass direction to point a directional antenna. Distance helps estimate signal path loss and whether your power level is sufficient for the contact.' },
    ],
  },
  'widget-analog-clock': {
    title: 'Analog Clock',
    description: 'A customizable round analog clock showing your local time at a glance. Choose from 6 clock face styles and add up to 4 complications (sub-dials) for UTC time, Solar Flux, stopwatch mirror, and sunrise/sunset countdown — inspired by luxury watch complications.',
    sections: [
      { heading: 'Clock Faces', content: 'Click the gear icon to choose from 6 face styles: Classic (Arabic numerals), Minimal (clean index bars), Roman (Roman numerals), Pilot (bold indices with luminous triangle at 12), Railroad (double concentric track ring), and Digital (analog hands plus a digital time readout). Your selection is saved and persists across sessions.' },
      { heading: 'Complications', content: 'Complications are optional sub-dials that embed useful data directly on the clock face. Enable them in the gear menu:\n\n\u2022 Sunrise/Sunset (12 o\'clock) — countdown to next sunrise or sunset with color-coded icon\n\u2022 Solar SFI (3 o\'clock) — arc gauge showing Solar Flux Index, colored green/yellow/red\n\u2022 Stopwatch (6 o\'clock) — mirrors the Stopwatch widget\'s elapsed time with running indicator\n\u2022 UTC 24h (9 o\'clock) — 24-hour sub-dial showing current UTC time' },
      { heading: 'Sunrise/Sunset Arc', content: 'When your location (QTH) is set in Config, a golden arc appears on the clock face showing the daylight hours. The arc spans from sunrise to sunset on the 12-hour dial. This helps you visualize how much daylight remains and when gray line propagation windows occur.' },
      { heading: 'Theme Support', content: 'The clock colors automatically adapt to your selected theme. All face styles, hands, complications, and numbers use your theme\'s color scheme.' },
    ],
  },
  'widget-stopwatch': {
    title: 'Stopwatch / Timer',
    description: 'A dual-mode timer for contest operations and general use. Switch between Stopwatch (count up with laps) and Countdown (preset timers including the 10-minute FCC station ID reminder).',
    sections: [
      { heading: 'Stopwatch Mode', content: 'Click Start to begin counting up. Use Lap to mark split times during a contest (e.g., tracking contacts per minute). Stop pauses the timer; Reset clears everything.' },
      { heading: 'Countdown Mode', content: 'Click the Countdown tab and select a preset duration. The 10m ID button is a quick shortcut for the FCC 10-minute station identification requirement. The display flashes when the countdown reaches zero.' },
      { heading: 'Station ID Timer', content: 'FCC Part 97.119 requires US hams to identify every 10 minutes during a contact and at the end. Use the 10m ID preset as a reminder — when it flashes, give your callsign!' },
    ],
  },
  'widget-live-spots': {
    title: 'Live Spots',
    description: 'See where YOUR signal is being received right now! When you transmit on digital modes like FT8 or FT4, stations around the world automatically report hearing you to PSKReporter. This widget shows those reports so you can see how far your signal is reaching.',
    sections: [
      { heading: 'Getting Started', content: 'Enter your callsign in Config, then transmit on a digital mode (FT8, FT4, JS8Call, etc.). Within a few minutes, you should see band cards appear showing who is hearing you.' },
      { heading: 'Band Cards', content: 'Each card represents a band where you\'re being heard. It shows either how many stations are receiving you or the distance to your farthest receiver. Click a card to show those stations on the map.' },
      { heading: 'Display Mode', content: 'Click the gear icon to switch between "count" (number of stations hearing you) and "distance" (farthest reach per band). Distance mode also shows the callsign of your farthest contact.' },
      { heading: 'Map Lines', content: 'When you click a band card, lines are drawn on the map from your location to each receiving station, giving you a visual picture of your signal coverage.' },
    ],
    links: [
      { label: 'PSKReporter', url: 'https://pskreporter.info/' },
    ],
  },
  'widget-voacap': {
    title: 'VOACAP DE\u2192DX',
    description: 'A dense 24-hour propagation grid showing predicted band reliability from your station (DE) to the world (DX). The current hour starts at the left edge so you can instantly see what\'s open right now.',
    sections: [
      { heading: 'Reading the Grid', content: 'Each row is an HF band (10m at top, 80m at bottom). Each column is one hour in UTC, starting from "now" at the left. Cell colors show predicted reliability as a continuous gradient:\n\n\u2022 Closed (black) \u2014 Below 5% reliability. The band is not usable on this path. Signals cannot propagate because the frequency is above the MUF or ionospheric conditions block it entirely.\n\u2022 Poor (red) \u2014 5\u201330% reliability. The band may open briefly or weakly. You might make a contact with persistence and good timing, but don\'t count on it.\n\u2022 Fair (yellow/orange) \u2014 30\u201365% reliability. The band is usable but inconsistent. Signals may fade in and out. Good for CW and digital modes; SSB may be marginal.\n\u2022 Good (green) \u2014 Above 65% reliability. The band is solidly open. Expect workable signals for the predicted mode and power level.' },
      { heading: 'Interactive Parameters', content: 'The bottom bar shows clickable settings. Click any value to cycle through options: Power (5W/100W/1kW), Mode (CW/SSB/FT8), Takeoff Angle (3\u00B0/5\u00B0/10\u00B0/15\u00B0), and Path (SP=short, LP=long). FT8 mode shows more green because its low SNR threshold means signals are decodable in conditions where SSB would be unusable.' },
      { heading: 'Overview vs Spot', content: 'Click OVW/SPOT to toggle target mode. "OVW" (overview) shows the average predicted reliability across four worldwide targets (Europe, East Asia, South America, North America). "SPOT" calculates predictions specifically to the station you\'ve selected in the On the Air table, so you can see exactly when a band will open to that DX.' },
      { heading: 'Auto-SPOT', content: 'Click the AUTO button to enable automatic SPOT updates. When AUTO is on (highlighted green), clicking any spot in the table or on the map instantly switches VOACAP to SPOT mode and recalculates the grid for the path to that station. This lets you quickly scan propagation to different DX stations by clicking through spots. AUTO is off by default \u2014 enable it when you want live per-spot predictions.' },
      { heading: 'Engine Badge', content: 'The green "VOACAP" or gray "SIM" badge shows which prediction engine is active. VOACAP uses the real Voice of America Coverage Analysis Program \u2014 a professional ionospheric ray-tracing model used by broadcasters and militaries worldwide. It computes multi-hop propagation paths through actual ionospheric layers, accounting for D-layer absorption, MUF, takeoff angle, power, and mode. SIM is a lightweight approximation based on solar flux and time of day \u2014 useful as a fallback but significantly less accurate. The engine switches automatically; no user action needed.' },
      { heading: 'Map Overlay', content: 'Click any band row to show propagation on the map. Two modes are available \u2014 click the \u25CB/REL toggle in the param bar to switch. Circle mode (\u25CB) draws concentric range rings from your QTH. REL heatmap mode paints the entire map with a color gradient showing predicted reliability to every point: green = good, yellow = fair, red = poor, dark = closed. The heatmap re-renders as you pan and zoom, with finer detail at higher zoom levels.' },
      { heading: 'About the Data', content: 'Predictions are monthly median values based on the current smoothed sunspot number (SSN) from NOAA. They represent typical conditions for this month, not real-time ionospheric state. Use them for planning which bands to try at different times of day, rather than as guarantees of what\'s open right now.' },
    ],
    links: [
      { label: 'NOAA Space Weather & Propagation', url: 'https://www.swpc.noaa.gov/communities/radio-communications' },
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
  morse: {
    label: 'Morse',
    content: {
      description: 'International Morse code — dits (.) and dahs (-) for each character.',
      table: {
        headers: ['Char', 'Morse', 'Char', 'Morse'],
        rows: [
          ['A', '.-',     'N', '-.'],
          ['B', '-...',   'O', '---'],
          ['C', '-.-.',   'P', '.--.'],
          ['D', '-..',    'Q', '--.-'],
          ['E', '.',      'R', '.-.'],
          ['F', '..-.',   'S', '...'],
          ['G', '--.',    'T', '-'],
          ['H', '....',   'U', '..-'],
          ['I', '..',     'V', '...-'],
          ['J', '.---',   'W', '.--'],
          ['K', '-.-',    'X', '-..-'],
          ['L', '.-..',   'Y', '-.--'],
          ['M', '--',     'Z', '--..'],
          ['0', '-----',  '5', '.....'],
          ['1', '.----',  '6', '-....'],
          ['2', '..---',  '7', '--...'],
          ['3', '...--',  '8', '---..'],
          ['4', '....-',  '9', '----.'],
        ],
      },
      note: 'Prosigns: AR (end of message) = .-.-.  BT (pause) = -...-  SK (end of contact) = ...-.-',
    },
  },
  qcodes: {
    label: 'Q-Codes',
    content: {
      description: 'Common Q-codes used in amateur radio. Originally for CW, now widely used on voice too.',
      table: {
        headers: ['Code', 'Meaning', 'Code', 'Meaning'],
        rows: [
          ['QRG', 'Your exact frequency',    'QRS', 'Send more slowly'],
          ['QRL', 'Frequency is busy',       'QRT', 'Stop sending / shutting down'],
          ['QRM', 'Man-made interference',   'QRV', 'I am ready'],
          ['QRN', 'Natural interference',    'QRX', 'Stand by / wait'],
          ['QRO', 'Increase power',          'QRZ', 'Who is calling me?'],
          ['QRP', 'Reduce power / low power','QSB', 'Signal is fading'],
          ['QSL', 'I confirm / received',    'QSO', 'A contact (conversation)'],
          ['QSY', 'Change frequency',        'QTH', 'My location'],
        ],
      },
      note: 'QRP = operating at 5 watts or less · QRO = running high power · QSL cards confirm contacts',
    },
  },
  bands: {
    label: 'Bands',
    custom: true, // rendered by bandref logic, not generic table renderer
  },
};

export const DEFAULT_REFERENCE_TAB = 'rst';

// --- Responsive breakpoints ---
export const BREAKPOINT_MOBILE = 1200;  // matches @media (max-width: 1199px) — phones + tablets

// --- Progressive Responsive Scaling ---
export const SCALE_REFERENCE_WIDTH = 1200; // px — viewport width where scale = 1.0 (desktop starts)
export const SCALE_MIN_FACTOR = 0.55;      // minimum scale factor (unused — Zone B eliminated)
export const SCALE_REFLOW_WIDTH = 1200;    // px — below this, switch to mobile layout (stacked widgets)

// Priority order for reflow layout — most important widgets first
export const REFLOW_WIDGET_ORDER = [
  'widget-map',
  'widget-activations',
  'widget-filters',
  'widget-solar',
  'widget-propagation',
  'widget-voacap',
  'widget-live-spots',
  'widget-spacewx',
  'widget-spot-detail',
  'widget-lunar',
  'widget-satellites',
  'widget-rst',
  'widget-contests',
  'widget-dxpeditions',
  'widget-beacons',
  'widget-dedx',
  'widget-stopwatch',
  'widget-analog-clock',
];

export function getLayoutMode() {
  const w = window.innerWidth;
  if (w < SCALE_REFLOW_WIDTH) return 'mobile';
  return 'desktop';
}

// --- Band Colors ---
// Default color per amateur band — used for Live Spots cards, map lines, and markers
export const DEFAULT_BAND_COLORS = {
  '160m': '#9c27b0',
  '80m': '#673ab7',
  '60m': '#3f51b5',
  '40m': '#2196f3',
  '30m': '#00bcd4',
  '20m': '#4caf50',
  '17m': '#8bc34a',
  '15m': '#cddc39',
  '12m': '#ffeb3b',
  '10m': '#ff9800',
  '6m': '#ff5722',
  '2m': '#f44336',
  '70cm': '#e91e63',
};

// User overrides loaded from localStorage
let bandColorOverrides = {};
try {
  const saved = JSON.parse(localStorage.getItem('hamtab_band_colors'));
  if (saved && typeof saved === 'object') bandColorOverrides = saved;
} catch (e) {}

// Get the effective color for a band (user override or default)
export function getBandColor(band) {
  return bandColorOverrides[band] || DEFAULT_BAND_COLORS[band] || '#888';
}

// Save user band color overrides to localStorage
export function saveBandColors(overrides) {
  bandColorOverrides = overrides;
  localStorage.setItem('hamtab_band_colors', JSON.stringify(overrides));
}

// Get the current overrides object (for the settings UI)
export function getBandColorOverrides() {
  return { ...bandColorOverrides };
}

// --- Mobile Tab Bar ---
export const MOBILE_TAB_KEY = 'hamtab_active_tab';

export const WIDGET_STORAGE_KEY = 'hamtab_widgets';
export const USER_LAYOUT_KEY = 'hamtab_widgets_user';
export const LAYOUTS_KEY = 'hamtab_layouts'; // named layout profiles
export const MAX_LAYOUTS = 20; // prevent localStorage bloat
export const SNAP_DIST = 20; // px — edge-snap threshold for widget dragging
export const SNAP_GRID = 20; // px — grid increment for snap-to-grid in free-float mode
export const SNAP_GRID_KEY = 'hamtab_snap_grid'; // localStorage key for snap-to-grid toggle
export const ALLOW_OVERLAP_KEY = 'hamtab_allow_overlap'; // localStorage key for overlap toggle
export const HEADER_H = 30; // px — widget header/title-bar height used in snap calculations

// --- Grid Layout Mode ---

export const GRID_MODE_KEY = 'hamtab_grid_mode';
export const GRID_PERM_KEY = 'hamtab_grid_permutation';
export const GRID_ASSIGN_KEY = 'hamtab_grid_assignments';
export const GRID_SIZES_KEY = 'hamtab_grid_sizes';
export const GRID_SPANS_KEY = 'hamtab_grid_spans';

// Grid permutation definitions — each defines a CSS Grid template with a fixed center map cell.
// `areas` is the grid-template-areas string, `columns`/`rows` are the track sizes,
// `cellNames` lists the assignable slot names (map is always fixed).
export const GRID_PERMUTATIONS = [
  {
    id: '2L-2R',
    name: '2 Left / 2 Right',
    slots: 4,
    // Legacy fields — used by config preview (splash.js:renderGridPreview)
    areas: '"L1 map R1" "L2 map R2"',
    columns: '1fr 2fr 1fr',
    rows: '1fr 1fr',
    cellNames: ['L1', 'L2', 'R1', 'R2'],
    // Flex-column hybrid fields — used by grid-layout.js at runtime
    left: ['L1', 'L2'],
    right: ['R1', 'R2'],
    top: [],
    bottom: [],
    outerAreas: '"left map right"',
    outerColumns: '1fr 2fr 1fr',
    outerRows: '1fr',
  },
  {
    id: '3L-3R',
    name: '3 Left / 3 Right',
    slots: 6,
    areas: '"L1 map R1" "L2 map R2" "L3 map R3"',
    columns: '1fr 2fr 1fr',
    rows: '1fr 1fr 1fr',
    cellNames: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'],
    left: ['L1', 'L2', 'L3'],
    right: ['R1', 'R2', 'R3'],
    top: [],
    bottom: [],
    outerAreas: '"left map right"',
    outerColumns: '1fr 2fr 1fr',
    outerRows: '1fr',
  },
  {
    id: '1T-2L-2R-1B',
    name: 'Top + 2L/2R + Bottom',
    slots: 6,
    areas: '"T1 T1 T1" "L1 map R1" "L2 map R2" "B1 B1 B1"',
    columns: '1fr 2fr 1fr',
    rows: 'auto 1fr 1fr auto',
    cellNames: ['T1', 'L1', 'L2', 'R1', 'R2', 'B1'],
    left: ['L1', 'L2'],
    right: ['R1', 'R2'],
    top: ['T1'],
    bottom: ['B1'],
    outerAreas: '"top top top" "left map right" "bottom bottom bottom"',
    outerColumns: '1fr 2fr 1fr',
    outerRows: 'auto 1fr auto',
  },
  {
    id: '1T-3L-3R-1B',
    name: 'Top + 3L/3R + Bottom',
    slots: 8,
    areas: '"T1 T1 T1" "L1 map R1" "L2 map R2" "L3 map R3" "B1 B1 B1"',
    columns: '1fr 2fr 1fr',
    rows: 'auto 1fr 1fr 1fr auto',
    cellNames: ['T1', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'B1'],
    left: ['L1', 'L2', 'L3'],
    right: ['R1', 'R2', 'R3'],
    top: ['T1'],
    bottom: ['B1'],
    outerAreas: '"top top top" "left map right" "bottom bottom bottom"',
    outerColumns: '1fr 2fr 1fr',
    outerRows: 'auto 1fr auto',
  },
  {
    id: '2T-3L-3R-2B',
    name: '2 Top + 3L/3R + 2 Bottom',
    slots: 10,
    areas: '"T1 T1 T2 T2" "L1 map map R1" "L2 map map R2" "L3 map map R3" "B1 B1 B2 B2"',
    columns: '1fr 1fr 1fr 1fr',
    rows: 'auto 1fr 1fr 1fr auto',
    cellNames: ['T1', 'T2', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'B1', 'B2'],
    left: ['L1', 'L2', 'L3'],
    right: ['R1', 'R2', 'R3'],
    top: ['T1', 'T2'],
    bottom: ['B1', 'B2'],
    outerAreas: '"top top top" "left map right" "bottom bottom bottom"',
    outerColumns: '1fr 2fr 1fr',
    outerRows: 'auto 1fr auto',
  },
];

// Default widget-to-cell assignments per permutation.
// Widget IDs are assigned to cell names; unassigned widgets are hidden.
export const GRID_DEFAULT_ASSIGNMENTS = {
  '2L-2R': {
    L1: 'widget-filters',
    L2: 'widget-activations',
    R1: 'widget-solar',
    R2: 'widget-propagation',
  },
  '3L-3R': {
    L1: 'widget-filters',
    L2: 'widget-activations',
    L3: 'widget-live-spots',
    R1: 'widget-solar',
    R2: 'widget-propagation',
    R3: 'widget-voacap',
  },
  '1T-2L-2R-1B': {
    T1: 'widget-solar',
    L1: 'widget-filters',
    L2: 'widget-activations',
    R1: 'widget-propagation',
    R2: 'widget-voacap',
    B1: 'widget-live-spots',
  },
  '1T-3L-3R-1B': {
    T1: 'widget-solar',
    L1: 'widget-filters',
    L2: 'widget-activations',
    L3: 'widget-live-spots',
    R1: 'widget-propagation',
    R2: 'widget-voacap',
    R3: 'widget-spot-detail',
    B1: 'widget-lunar',
  },
  '2T-3L-3R-2B': {
    T1: 'widget-solar',
    T2: 'widget-propagation',
    L1: 'widget-filters',
    L2: 'widget-activations',
    L3: 'widget-live-spots',
    R1: 'widget-voacap',
    R2: 'widget-spot-detail',
    R3: 'widget-satellites',
    B1: 'widget-lunar',
    B2: 'widget-rst',
  },
};
