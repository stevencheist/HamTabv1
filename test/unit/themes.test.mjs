// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Theme and migration modules read localStorage at call time; give them an in-memory one.
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

const { THEMES, resolveThemeId, isValidThemeId } = await import('../../src/themes.js');
const { migrateV3 } = await import('../../src/migration.js');
const { cellTextColor, getReliabilityColor } = await import('../../src/band-conditions.js');

// --- WCAG 2.x contrast helpers ---
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
function luminance([r, g, b]) {
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe('resolveThemeId', () => {
  test('auto follows the OS setting when light themes are allowed', () => {
    assert.equal(resolveThemeId('auto', true, true), 'daylight');
    assert.equal(resolveThemeId('auto', false, true), 'default');
  });

  test('auto stays on default while the feature flag hides light themes', () => {
    assert.equal(resolveThemeId('auto', true, false), 'default');
    assert.equal(resolveThemeId('daylight', true, false), 'default');
  });

  test('explicit themes ignore the OS setting', () => {
    assert.equal(resolveThemeId('lcars', true, true), 'lcars');
    assert.equal(resolveThemeId('daylight', false, true), 'daylight');
    assert.equal(resolveThemeId('default', true, true), 'default');
  });

  test('unknown ids fall back to default', () => {
    assert.equal(resolveThemeId('nope', true, true), 'default');
    assert.equal(isValidThemeId('nope'), false);
    assert.equal(isValidThemeId('auto'), true);
    assert.equal(isValidThemeId('daylight'), true);
  });
});

describe('daylight palette', () => {
  const v = THEMES.daylight.vars;
  const surfaces = ['--bg', '--surface', '--surface2', '--bg-secondary', '--bg-tertiary'];
  const textVars = ['--text', '--text-dim', '--accent', '--green', '--yellow', '--red', '--orange', '--de-color', '--dx-color'];

  for (const fg of textVars) {
    test(`${fg} is >= 4.5:1 on every surface`, () => {
      for (const bg of surfaces) {
        const ratio = contrast(hexToRgb(v[fg]), hexToRgb(v[bg]));
        assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
      }
    });
  }

  test('white text on status-color badges is >= 4.5:1', () => {
    for (const fg of ['--accent', '--green', '--yellow', '--red', '--orange']) {
      const ratio = contrast([255, 255, 255], hexToRgb(v[fg]));
      assert.ok(ratio >= 4.5, `white on ${fg} is ${ratio.toFixed(2)}:1`);
    }
  });

  test('borders are >= 3:1 against widget surfaces (non-text UI)', () => {
    const ratio = contrast(hexToRgb(v['--border']), hexToRgb(v['--surface']));
    assert.ok(ratio >= 3, `border is ${ratio.toFixed(2)}:1`);
  });

  test('defines the same variables as the default theme', () => {
    assert.deepEqual(Object.keys(v).sort(), Object.keys(THEMES.default.vars).sort());
  });
});

describe('migrateV3', () => {
  beforeEach(() => store.clear());

  test('converts the old saved default to auto', () => {
    store.set('hamtab_theme', 'default');
    migrateV3();
    assert.equal(store.get('hamtab_theme'), 'auto');
    assert.equal(store.get('hamtab_migration_v3'), '1');
  });

  test('leaves explicit non-default themes alone', () => {
    store.set('hamtab_theme', 'lcars');
    migrateV3();
    assert.equal(store.get('hamtab_theme'), 'lcars');
  });

  test('runs only once', () => {
    store.set('hamtab_migration_v3', '1');
    store.set('hamtab_theme', 'default');
    migrateV3();
    assert.equal(store.get('hamtab_theme'), 'default');
  });

  test('fresh install with nothing saved stays empty (initTheme picks auto)', () => {
    migrateV3();
    assert.equal(store.has('hamtab_theme'), false);
  });
});

describe('band condition cell text', () => {
  test('text on every reliability color is >= 4.5:1', () => {
    for (let rel = 5; rel <= 100; rel++) {
      const m = /hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/.exec(getReliabilityColor(rel));
      const [h, s, l] = [+m[1] / 360, +m[2] / 100, +m[3] / 100];
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
      const bg = [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
      const fg = cellTextColor(rel) === '#fff' ? [255, 255, 255] : [0, 0, 0];
      const ratio = contrast(fg, bg);
      assert.ok(ratio >= 4.5, `reliability ${rel}% text is ${ratio.toFixed(2)}:1`);
    }
  });
});
