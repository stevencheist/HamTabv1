// --- Scope Waterfall ---
// Scrolling waterfall canvas — drawImage shift + putImageData row.
// Ported from VirtualHam waterfall.ts.

import { createColorMap, dbToIndex, DEFAULT_FLOOR_DB, DEFAULT_CEILING_DB } from './scope-color-map.js';

export function createWaterfall(canvas, options) {
  if (!options) options = {};
  const bins = options.bins || 512;
  const floorDb = options.floorDb !== undefined ? options.floorDb : DEFAULT_FLOOR_DB;
  const ceilingDb = options.ceilingDb !== undefined ? options.ceilingDb : DEFAULT_CEILING_DB;

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  const lut = createColorMap(options.colorMap);

  let width = canvas.width;
  let height = canvas.height;

  function pushRow(magnitudes) {
    // Scroll existing content down by 1 pixel
    if (height > 1) {
      ctx.drawImage(canvas, 0, 0, width, height - 1, 0, 1, width, height - 1);
    }

    // Draw new row at top
    const imageData = ctx.createImageData(width, 1);
    const data = imageData.data;
    const binScale = bins / width;

    for (let x = 0; x < width; x++) {
      const binIdx = Math.min(bins - 1, Math.floor(x * binScale));
      const db = magnitudes[binIdx] !== undefined ? magnitudes[binIdx] : floorDb;
      const colorIdx = dbToIndex(db, floorDb, ceilingDb);
      const lutOffset = colorIdx * 4;

      const px = x * 4;
      data[px]     = lut[lutOffset];
      data[px + 1] = lut[lutOffset + 1];
      data[px + 2] = lut[lutOffset + 2];
      data[px + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    width = canvas.width;
    height = canvas.height;
    ctx.fillStyle = '#000509';
    ctx.fillRect(0, 0, width, height);
  }

  function destroy() {
    ctx.clearRect(0, 0, width, height);
  }

  // Initial sizing
  resize();

  return { pushRow, resize, destroy };
}
