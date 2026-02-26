// --- CAT Safety: License Class Validator ---
// Validates frequency against US amateur license class privileges.
// Warn only — never blocks transmission.

// --- US license class frequency privileges (Hz) ---
// Source: ARRL, FCC Part 97.301-303
// Segments where each class has transmit privileges
const LICENSE_PRIVILEGES = {
  extra: [
    // Extra has all amateur frequencies — no restrictions within bands
    { min: 1_800_000, max: 2_000_000 },
    { min: 3_500_000, max: 4_000_000 },
    { min: 5_330_500, max: 5_406_400 },
    { min: 7_000_000, max: 7_300_000 },
    { min: 10_100_000, max: 10_150_000 },
    { min: 14_000_000, max: 14_350_000 },
    { min: 18_068_000, max: 18_168_000 },
    { min: 21_000_000, max: 21_450_000 },
    { min: 24_890_000, max: 24_990_000 },
    { min: 28_000_000, max: 29_700_000 },
    { min: 50_000_000, max: 54_000_000 },
    { min: 144_000_000, max: 148_000_000 },
    { min: 420_000_000, max: 450_000_000 },
  ],
  general: [
    { min: 1_800_000, max: 2_000_000 },
    { min: 3_525_000, max: 3_600_000 },   // CW/data only below 3600
    { min: 3_800_000, max: 4_000_000 },   // phone
    { min: 5_330_500, max: 5_406_400 },
    { min: 7_025_000, max: 7_125_000 },   // CW/data
    { min: 7_175_000, max: 7_300_000 },   // phone
    { min: 10_100_000, max: 10_150_000 },
    { min: 14_025_000, max: 14_150_000 },  // CW/data
    { min: 14_225_000, max: 14_350_000 },  // phone
    { min: 18_068_000, max: 18_168_000 },
    { min: 21_025_000, max: 21_200_000 },  // CW/data
    { min: 21_275_000, max: 21_450_000 },  // phone
    { min: 24_890_000, max: 24_990_000 },
    { min: 28_000_000, max: 29_700_000 },
    { min: 50_000_000, max: 54_000_000 },
    { min: 144_000_000, max: 148_000_000 },
    { min: 420_000_000, max: 450_000_000 },
  ],
  technician: [
    // HF: limited CW privileges
    { min: 3_525_000, max: 3_600_000 },   // 80m CW only
    { min: 7_025_000, max: 7_125_000 },   // 40m CW only
    { min: 21_025_000, max: 21_200_000 },  // 15m CW only
    { min: 28_000_000, max: 28_500_000 },  // 10m CW/data/phone
    // VHF+: full privileges
    { min: 50_000_000, max: 54_000_000 },
    { min: 144_000_000, max: 148_000_000 },
    { min: 420_000_000, max: 450_000_000 },
  ],
};

// --- Validate frequency against license class ---
// Returns { allowed, warning }
// allowed: true if frequency is within license privileges
// warning: string if outside privileges (null if clean)
export function validateLicense(freqHz, licenseClass) {
  if (!freqHz || !licenseClass) return { allowed: true, warning: null };

  const cls = licenseClass.toLowerCase();
  const privileges = LICENSE_PRIVILEGES[cls];
  if (!privileges) return { allowed: true, warning: null }; // unknown class — don't warn

  const inBand = privileges.some(seg => freqHz >= seg.min && freqHz <= seg.max);
  if (inBand) return { allowed: true, warning: null };

  return {
    allowed: false,
    warning: `${(freqHz / 1_000_000).toFixed(3)} MHz may be outside ${licenseClass} class privileges`,
  };
}
