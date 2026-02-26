// --- CAT: Band Overlay Engine ---
// Provides CW/DIGI/PHONE zone data for each amateur band.
// Used by the widget to show a visual band segment indicator behind the frequency.
// Zones are US band plan conventions (not regulatory boundaries).

// --- Band segment data (Hz) ---
// Each band has ordered segments with zone type and color hint.
const BAND_SEGMENTS = {
  '160m': [
    { min: 1_800_000, max: 1_810_000, zone: 'CW',    color: 'cw' },
    { min: 1_810_000, max: 1_843_000, zone: 'DATA',   color: 'digi' },
    { min: 1_843_000, max: 2_000_000, zone: 'PHONE',  color: 'phone' },
  ],
  '80m': [
    { min: 3_500_000, max: 3_600_000, zone: 'CW',     color: 'cw' },
    { min: 3_570_000, max: 3_600_000, zone: 'DATA',   color: 'digi' },
    { min: 3_600_000, max: 4_000_000, zone: 'PHONE',  color: 'phone' },
  ],
  '40m': [
    { min: 7_000_000, max: 7_050_000, zone: 'CW',     color: 'cw' },
    { min: 7_050_000, max: 7_125_000, zone: 'DATA',   color: 'digi' },
    { min: 7_125_000, max: 7_300_000, zone: 'PHONE',  color: 'phone' },
  ],
  '30m': [
    { min: 10_100_000, max: 10_130_000, zone: 'CW',   color: 'cw' },
    { min: 10_130_000, max: 10_150_000, zone: 'DATA', color: 'digi' },
  ],
  '20m': [
    { min: 14_000_000, max: 14_070_000, zone: 'CW',   color: 'cw' },
    { min: 14_070_000, max: 14_150_000, zone: 'DATA', color: 'digi' },
    { min: 14_150_000, max: 14_350_000, zone: 'PHONE', color: 'phone' },
  ],
  '17m': [
    { min: 18_068_000, max: 18_100_000, zone: 'CW',   color: 'cw' },
    { min: 18_100_000, max: 18_110_000, zone: 'DATA', color: 'digi' },
    { min: 18_110_000, max: 18_168_000, zone: 'PHONE', color: 'phone' },
  ],
  '15m': [
    { min: 21_000_000, max: 21_070_000, zone: 'CW',   color: 'cw' },
    { min: 21_070_000, max: 21_200_000, zone: 'DATA', color: 'digi' },
    { min: 21_200_000, max: 21_450_000, zone: 'PHONE', color: 'phone' },
  ],
  '12m': [
    { min: 24_890_000, max: 24_920_000, zone: 'CW',   color: 'cw' },
    { min: 24_920_000, max: 24_930_000, zone: 'DATA', color: 'digi' },
    { min: 24_930_000, max: 24_990_000, zone: 'PHONE', color: 'phone' },
  ],
  '10m': [
    { min: 28_000_000, max: 28_070_000, zone: 'CW',   color: 'cw' },
    { min: 28_070_000, max: 28_300_000, zone: 'DATA', color: 'digi' },
    { min: 28_300_000, max: 29_700_000, zone: 'PHONE', color: 'phone' },
  ],
  '6m': [
    { min: 50_000_000, max: 50_100_000, zone: 'CW',   color: 'cw' },
    { min: 50_100_000, max: 50_300_000, zone: 'DATA', color: 'digi' },
    { min: 50_300_000, max: 54_000_000, zone: 'PHONE', color: 'phone' },
  ],
};

// --- Get segments for a band ---
export function getBandSegments(bandName) {
  return BAND_SEGMENTS[bandName] || [];
}

// --- Get the zone for a frequency ---
// Returns { zone, color } or null if not in a defined zone
export function getFrequencyZone(freqHz, bandName) {
  const segments = BAND_SEGMENTS[bandName];
  if (!segments) return null;

  for (const seg of segments) {
    if (freqHz >= seg.min && freqHz <= seg.max) {
      return { zone: seg.zone, color: seg.color };
    }
  }
  return null;
}

// --- Get band edges for position calculation ---
export function getBandEdges(bandName) {
  const segments = BAND_SEGMENTS[bandName];
  if (!segments || segments.length === 0) return null;
  return {
    min: segments[0].min,
    max: segments[segments.length - 1].max,
  };
}

// --- Calculate position within band (0.0 to 1.0) ---
export function getPositionInBand(freqHz, bandName) {
  const edges = getBandEdges(bandName);
  if (!edges) return 0.5;
  if (freqHz <= edges.min) return 0;
  if (freqHz >= edges.max) return 1;
  return (freqHz - edges.min) / (edges.max - edges.min);
}

export { BAND_SEGMENTS };
