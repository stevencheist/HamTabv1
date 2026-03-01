// --- Scope Color Map ---
// 256-entry RGBA lookup table for waterfall coloring.
// Ported from VirtualHam color-map.ts — zero dependencies.

export const DEFAULT_FLOOR_DB = -120;
export const DEFAULT_CEILING_DB = -40;

/** Classic SDR palette: Blue -> Cyan -> Yellow -> Red -> White */
export const SDR_PALETTE = [
  [0, 0, 32],      // deep blue (noise floor)
  [0, 0, 128],     // blue
  [0, 128, 255],   // cyan-blue
  [0, 255, 255],   // cyan
  [0, 255, 128],   // cyan-green
  [128, 255, 0],   // yellow-green
  [255, 255, 0],   // yellow
  [255, 128, 0],   // orange
  [255, 0, 0],     // red
  [255, 255, 255], // white (strongest)
];

/** Create a 256-entry RGBA lookup table from a palette */
export function createColorMap(palette) {
  if (!palette) palette = SDR_PALETTE;
  const lut = new Uint8Array(256 * 4);
  const stops = palette.length - 1;

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const segment = t * stops;
    const idx = Math.min(Math.floor(segment), stops - 1);
    const frac = segment - idx;

    const r0 = palette[idx][0];
    const g0 = palette[idx][1];
    const b0 = palette[idx][2];
    const r1 = palette[idx + 1][0];
    const g1 = palette[idx + 1][1];
    const b1 = palette[idx + 1][2];

    const offset = i * 4;
    lut[offset]     = r0 + (r1 - r0) * frac;
    lut[offset + 1] = g0 + (g1 - g0) * frac;
    lut[offset + 2] = b0 + (b1 - b0) * frac;
    lut[offset + 3] = 255;
  }

  return lut;
}

/** Map a dB value to a 0-255 index */
export function dbToIndex(db, floor, ceiling) {
  if (floor === undefined) floor = DEFAULT_FLOOR_DB;
  if (ceiling === undefined) ceiling = DEFAULT_CEILING_DB;
  const normalized = (db - floor) / (ceiling - floor);
  return Math.max(0, Math.min(255, Math.round(normalized * 255)));
}
