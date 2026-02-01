import { aColor, kColor, solarWindColor, bzColor, auroraColor, geomagColor } from './solar.js';
import { lunarDecColor, lunarPlColor } from './lunar.js';

export const WIDGET_DEFS = [
  { id: 'widget-clock-local', name: 'Local Time' },
  { id: 'widget-clock-utc',   name: 'UTC' },
  { id: 'widget-activations', name: 'On the Air' },
  { id: 'widget-map',         name: 'HamMap' },
  { id: 'widget-solar',       name: 'Solar & Propagation' },
  { id: 'widget-lunar',       name: 'Lunar / EME' },
  { id: 'widget-rst',          name: 'RST Reference' },
  { id: 'widget-spot-detail', name: 'DX Detail' },
];

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
    filters: ['band', 'mode', 'country', 'state', 'grid', 'privilege'],
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
    filters: ['band', 'mode'],
    hasMap: true,
    spotId: (s) => `${s.callsign}-${s.reference}-${s.frequency}`,
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

export const WIDGET_STORAGE_KEY = 'hamtab_widgets';
export const SNAP_DIST = 20;
export const HEADER_H = 30;
