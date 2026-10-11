// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// NASA SVS moon-phase frame URLs for /api/lunar/image (pure, no I/O).

// NASA SVS publishes one "Moon Phase and Libration, <year>" set per year under a new id. Ids
// verified on svs.gsfc.nasa.gov 2026-10; 2027 was not yet published. Add each new year here.
const SVS_MOON_IDS = { 2024: 5187, 2025: 5415, 2026: 5587 };

// Frame URL for an hour of the year, or null when the year's set is unknown.
function svsMoonFrameUrl(date) {
  const year = date.getUTCFullYear();
  const id = SVS_MOON_IDS[year];
  if (!id) return null;
  const startOfYear = Date.UTC(year, 0, 1);
  const hoursInYear = (Date.UTC(year + 1, 0, 1) - startOfYear) / 3600000; // 8760, or 8784 in leap years
  const hourOfYear = Math.floor((date.getTime() - startOfYear) / 3600000) + 1;
  const frame = String(Math.min(hourOfYear, hoursInYear)).padStart(4, '0');
  const idStr = String(id).padStart(6, '0');
  const groupStr = String(Math.floor(id / 100) * 100).padStart(6, '0');
  return `https://svs.gsfc.nasa.gov/vis/a000000/a${groupStr}/a${idStr}/frames/730x730_1x1_30p/moon.${frame}.jpg`;
}

module.exports = { SVS_MOON_IDS, svsMoonFrameUrl };
