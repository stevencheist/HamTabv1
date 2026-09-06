// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- Band Opportunity Score Widget ---
// Answers "what band should I be on right now?" by combining propagation,
// Activity density, and space weather into a single 0-100 score per band.
import state from './state.js';
import { $ } from './dom.js';
import { HF_BANDS, calculateBandReliability, calculateMUF, dayFraction, getReliabilityColor } from './band-conditions.js';
import { isFeatureVisible } from './feature-flags.js';
import { getBandColor } from './constants.js';

// --- Score Calculation ---

/**
 * Calculate opportunity scores for all HF bands.
 * Returns sorted array (highest score first) of { name, score, components }.
 *
 * Components & weights:
 *   propagation (50%) — from calculateBandReliability(), already 0-100
 *   activity    (30%) — PSK heard count + WSPR spot count; 50+ = 100, linear below
 *   spacewx     (20%) — SFI bonus + K-index penalty, baseline 50, clamped 0-100
 */
export function calculateBandScores() {
  const solar = state.lastSolarData;
  const indices = solar?.indices;

  // Parse solar indices
  const sfi = parseFloat(indices?.sfi) || 70;
  const kIndex = parseInt(indices?.kindex) || 2;
  const aIndex = parseInt(indices?.aindex) || 5;

  // Day fraction at operator's location.

  const utcHour = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  const df = dayFraction(state.myLat, state.myLon, utcHour);
  const muf = calculateMUF(sfi, df);
  const isDay = df >= 0.5;

  // Space weather component (same for all bands)
  const sfiBonus = Math.min(25, Math.max(0, (sfi - 100) * 0.5)); // +0.5/pt above 100, max +25
  let kPenalty = 0;
  if (kIndex >= 6) kPenalty = 50;
  else if (kIndex === 5) kPenalty = 35;
  else if (kIndex === 4) kPenalty = 20;
  else if (kIndex === 3) kPenalty = 10;
  const spacewxRaw = 50 + sfiBonus - kPenalty;
  const spacewx = Math.max(0, Math.min(100, spacewxRaw));

  // Activity counts per band from PSK + WSPR.

  const activityByBand = {};
  const pskSummary = state.liveSpots?.summary || {};
  const wsprSpots = state.sourceData?.wspr || [];

  // PSK heard counts
  for (const [band, info] of Object.entries(pskSummary)) {
    activityByBand[band] = (activityByBand[band] || 0) + (info.count || 0);
  }

  // WSPR spot counts by band.

  for (const spot of wsprSpots) {
    const band = spot.band || spot.Band;
    if (band) {
      activityByBand[band] = (activityByBand[band] || 0) + 1;
    }
  }

  const scores = HF_BANDS.map(band => {
    // Propagation component (50%)
    const propagation = calculateBandReliability(band.freqMHz, muf, kIndex, aIndex, isDay);

    // Activity component (30%) — 50+ spots = 100, linear below
    const actCount = activityByBand[band.name] || 0;
    const activity = Math.min(100, (actCount / 50) * 100);

    // Weighted score
    const score = Math.round(
      propagation * 0.5 +
      activity * 0.3 +
      spacewx * 0.2
    );

    return {
      name: band.name,
      label: band.label,
      score: Math.max(0, Math.min(100, score)),
      propagation: Math.round(propagation),
      activity: Math.round(activity),
      spacewx: Math.round(spacewx),
    };
  });

  // Sort descending by score.
  scores.sort((a, b) => b.score - a.score);

  return scores;
}

// --- Rendering ---

export function renderBandScoreWidget() {
  if (!isFeatureVisible('band_score')) return;

  const container = $('bandScoreContent');
  if (!container) return;

  const scores = calculateBandScores();
  state.bandScores = scores;

  if (!scores.length || !state.lastSolarData) {
    container.innerHTML = '<div class="band-score-empty">Waiting for data...</div>';
    return;
  }

  const topN = 3; // highlight top 3

  let html = '<div class="band-score-header">Top Bands Now</div>';
  html += '<div class="band-score-bars">';

  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    const isTop = i < topN;
    const color = getBandColor(s.name);
    const barColor = getReliabilityColor(s.score);
    const topClass = isTop ? ' band-score-top' : '';

    html += `<div class="band-score-row${topClass}" title="${s.label}: Prop ${s.propagation}% | Activity ${s.activity}% | SpWx ${s.spacewx}%">`;
    html += `<span class="band-score-label" style="color:${color}">${s.label}</span>`;
    if (isTop) html += `<span class="band-score-badge">#${i + 1}</span>`;
    html += `<div class="band-score-track">`;
    html += `<div class="band-score-fill" style="width:${s.score}%;background:${barColor}"></div>`;
    html += `</div>`;
    html += `<span class="band-score-pct">${s.score}</span>`;
    html += `</div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

// --- Initialization ---

export function initBandScore() {
  // Initial render (will show "waiting" until data arrives)
  renderBandScoreWidget();
}
