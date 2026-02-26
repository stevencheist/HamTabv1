// --- CAT Safety: Band Plan Validator ---
// Validates a frequency against the US amateur band plan.
// Returns warnings (not blocks) — "warn but never block" philosophy.

// --- US amateur bands (Hz) ---
// Source: ARRL band plan, FCC Part 97
const US_BANDS = [
  { name: '160m', min: 1_800_000,  max: 2_000_000 },
  { name: '80m',  min: 3_500_000,  max: 4_000_000 },
  { name: '60m',  min: 5_330_500,  max: 5_406_400 },  // channelized
  { name: '40m',  min: 7_000_000,  max: 7_300_000 },
  { name: '30m',  min: 10_100_000, max: 10_150_000 },
  { name: '20m',  min: 14_000_000, max: 14_350_000 },
  { name: '17m',  min: 18_068_000, max: 18_168_000 },
  { name: '15m',  min: 21_000_000, max: 21_450_000 },
  { name: '12m',  min: 24_890_000, max: 24_990_000 },
  { name: '10m',  min: 28_000_000, max: 29_700_000 },
  { name: '6m',   min: 50_000_000, max: 54_000_000 },
  { name: '2m',   min: 144_000_000, max: 148_000_000 },
  { name: '70cm', min: 420_000_000, max: 450_000_000 },
];

// --- Mode sub-bands (common conventions, not regulatory limits) ---
// These are advisory — used for gentle warnings like "14.074 is typically DATA"
const MODE_ZONES = {
  '160m': [
    { min: 1_800_000, max: 1_810_000, zone: 'CW' },
    { min: 1_810_000, max: 1_843_000, zone: 'CW/DATA' },
    { min: 1_843_000, max: 2_000_000, zone: 'PHONE' },
  ],
  '80m': [
    { min: 3_500_000, max: 3_600_000, zone: 'CW/DATA' },
    { min: 3_600_000, max: 4_000_000, zone: 'PHONE' },
  ],
  '40m': [
    { min: 7_000_000, max: 7_125_000, zone: 'CW/DATA' },
    { min: 7_125_000, max: 7_300_000, zone: 'PHONE' },
  ],
  '20m': [
    { min: 14_000_000, max: 14_150_000, zone: 'CW/DATA' },
    { min: 14_150_000, max: 14_350_000, zone: 'PHONE' },
  ],
  '15m': [
    { min: 21_000_000, max: 21_200_000, zone: 'CW/DATA' },
    { min: 21_200_000, max: 21_450_000, zone: 'PHONE' },
  ],
  '10m': [
    { min: 28_000_000, max: 28_300_000, zone: 'CW/DATA' },
    { min: 28_300_000, max: 29_700_000, zone: 'PHONE/FM' },
  ],
};

// --- Validate frequency ---
// Returns { valid, band, zone, warning }
// valid: true if frequency is within a US amateur band
// warning: string if there's something to warn about (null if clean)
export function validateFrequency(freqHz) {
  if (!freqHz || freqHz <= 0) {
    return { valid: false, band: null, zone: null, warning: 'Invalid frequency' };
  }

  // Find the band
  const band = US_BANDS.find(b => freqHz >= b.min && freqHz <= b.max);
  if (!band) {
    return {
      valid: false,
      band: null,
      zone: null,
      warning: `${(freqHz / 1_000_000).toFixed(3)} MHz is outside US amateur bands`,
    };
  }

  // Find the mode zone (advisory)
  let zone = null;
  const zones = MODE_ZONES[band.name];
  if (zones) {
    const match = zones.find(z => freqHz >= z.min && freqHz <= z.max);
    if (match) zone = match.zone;
  }

  return { valid: true, band: band.name, zone, warning: null };
}
