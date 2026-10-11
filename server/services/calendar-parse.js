// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// Pure date-range parsing for the WA7BNM contest calendar and NG3K DXpedition feeds (no I/O).

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8,
  october: 9, november: 10, december: 11,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function monthIndex(name) {
  const m = MONTHS[String(name || '').toLowerCase().replace(/\.$/, '')];
  return m === undefined ? null : m;
}

// UTC date at 00:00, or null for an unknown month / impossible day.
function parseDatePart(monthStr, day, year) {
  const m = monthIndex(monthStr);
  const d = parseInt(day, 10);
  if (m === null || !Number.isInteger(d) || d < 1 || d > 31 || !Number.isInteger(year)) return null;
  const date = new Date(Date.UTC(year, m, d));
  return date.getUTCMonth() === m ? date : null; // Reject Feb 30 etc.
}

// The feeds omit the year on most dates. Pick the year that puts the date closest to `ref`
// so a "Jan 3" seen in late December resolves to next year.
function dateNear(monthStr, day, ref) {
  const y = ref.getUTCFullYear();
  let best = null;
  for (const year of [y - 1, y, y + 1]) {
    const d = parseDatePart(monthStr, day, year);
    if (d && (!best || Math.abs(d - ref) < Math.abs(best - ref))) best = d;
  }
  return best;
}

// Like dateNear, but never earlier than `after` (for the end of a range). Allows the same day.
function dateOnOrAfter(monthStr, day, after) {
  for (const year of [after.getUTCFullYear(), after.getUTCFullYear() + 1]) {
    const d = parseDatePart(monthStr, day, year);
    if (d && d.getTime() >= after.getTime() - DAY_MS) return d;
  }
  return null;
}

// "HHMM" -> minutes after midnight (2400 allowed, meaning the next midnight).
function hhmmToMinutes(hhmm) {
  const h = parseInt(hhmm.slice(0, 2), 10);
  const m = parseInt(hhmm.slice(2), 10);
  if (h > 24 || m > 59 || (h === 24 && m !== 0)) return null;
  return h * 60 + m;
}

function at(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// --- WA7BNM contest calendar (calendar.rss <description>) ---
// Live forms (2026-10):
//   "0600Z, Oct 10 to 0600Z, Oct 11"               multi-day range
//   "0600Z-1000Z, Oct 11"                          single-day window
//   "0000Z-0800Z, Oct 10 and 1600Z-2400Z, Oct 10"  several segments joined with " and "
//   "1600Z, Oct 10 to 0400Z, Oct 11 and 1300Z-2200Z, Oct 11"
//   "0800 local - 1400 local, Oct 11"              local time (zone unknown)
// Returns { start, end } as Dates (first segment's start, last segment's end) or null.
const CONTEST_RANGE_RE = /^(\d{4})Z\s*,?\s*([A-Za-z]+)\.?\s+(\d{1,2})\s+to\s+(\d{4})Z\s*,?\s*([A-Za-z]+)\.?\s+(\d{1,2})$/i;
const CONTEST_DAY_RE = /^(\d{4})Z\s*-\s*(\d{4})Z\s*,?\s*([A-Za-z]+)\.?\s+(\d{1,2})$/i;
const CONTEST_LOCAL_RE = /^(\d{4})\s*local\s*-\s*(\d{4})\s*local\s*,?\s*([A-Za-z]+)\.?\s+(\d{1,2})$/i;
const LOCAL_EARLIEST_OFFSET_MIN = 14 * 60; // UTC+14 is the earliest zone on Earth.
const LOCAL_LATEST_OFFSET_MIN = 12 * 60; // UTC-12 is the latest.

function parseContestDates(description, now = new Date()) {
  const segments = String(description || '').trim().split(/\s+and\s+/i).filter(Boolean);
  if (segments.length === 0) return null;
  let start = null;
  let end = null;
  let ref = now;
  for (const seg of segments) {
    let segStart = null;
    let segEnd = null;
    let m;
    if ((m = CONTEST_RANGE_RE.exec(seg))) {
      const d0 = start ? dateOnOrAfter(m[2], m[3], ref) : dateNear(m[2], m[3], ref);
      const t0 = hhmmToMinutes(m[1]);
      const t1 = hhmmToMinutes(m[4]);
      if (!d0 || t0 === null || t1 === null) return null;
      const d1 = dateOnOrAfter(m[5], m[6], d0);
      if (!d1) return null;
      segStart = at(d0, t0);
      segEnd = at(d1, t1);
    } else if ((m = CONTEST_DAY_RE.exec(seg))) {
      const d = start ? dateOnOrAfter(m[3], m[4], ref) : dateNear(m[3], m[4], ref);
      const t0 = hhmmToMinutes(m[1]);
      let t1 = hhmmToMinutes(m[2]);
      if (!d || t0 === null || t1 === null) return null;
      if (t1 <= t0) t1 += 24 * 60; // "2300Z-0100Z" runs past midnight.
      segStart = at(d, t0);
      segEnd = at(d, t1);
    } else if ((m = CONTEST_LOCAL_RE.exec(seg))) {
      // Local clock times: widen to the span that covers every time zone.
      const d = start ? dateOnOrAfter(m[3], m[4], ref) : dateNear(m[3], m[4], ref);
      const t0 = hhmmToMinutes(m[1]);
      let t1 = hhmmToMinutes(m[2]);
      if (!d || t0 === null || t1 === null) return null;
      if (t1 <= t0) t1 += 24 * 60;
      segStart = at(d, t0 - LOCAL_EARLIEST_OFFSET_MIN);
      segEnd = at(d, t1 + LOCAL_LATEST_OFFSET_MIN);
    } else {
      return null;
    }
    if (segEnd <= segStart) return null;
    if (!start || segStart < start) start = segStart;
    if (!end || segEnd > end) end = segEnd;
    ref = new Date(Date.UTC(segStart.getUTCFullYear(), segStart.getUTCMonth(), segStart.getUTCDate()));
  }
  return { start, end };
}

// --- NG3K ADXO DXpedition titles ("Entity: <dates> -- CALL -- QSL via: X") ---
// Live forms (2026-10):
//   "Oct 1-20, 2026"                 same month
//   "Oct 28-Nov 5, 2026"             month change, one trailing year
//   "Dec 23, 2026-Jan 6, 2027"       year on both ends (cross-year)
//   "Nov 20-Jan 5, 2027"             (tolerated) cross-year with only the end year
// Returns { start, end } (end at 23:59:59 UTC) or null.
const DXPED_RE = /^([A-Za-z]+)\.?\s+(\d{1,2})(?:\s*,\s*(\d{4}))?\s*[-–—]\s*(?:([A-Za-z]+)\.?\s+)?(\d{1,2})(?:\s*,\s*(\d{4}))?/;

function parseDxpedDates(dateStr, now = new Date()) {
  const m = DXPED_RE.exec(String(dateStr || '').trim());
  if (!m) return null;
  const [, mon1, day1, y1s, mon2raw, day2, y2s] = m;
  const mon2 = mon2raw || mon1;
  let y1 = y1s ? parseInt(y1s, 10) : null;
  let y2 = y2s ? parseInt(y2s, 10) : null;

  let start;
  let end;
  if (y1 === null && y2 === null) {
    start = dateNear(mon1, day1, now);
    end = start ? dateOnOrAfter(mon2, day2, start) : null;
  } else {
    if (y2 === null) y2 = y1;
    if (y1 === null) {
      // Only the end carries a year: the start is in the same year unless the range wraps.
      const sm = monthIndex(mon1);
      const em = monthIndex(mon2);
      y1 = (sm !== null && em !== null && sm > em) ? y2 - 1 : y2;
    }
    start = parseDatePart(mon1, day1, y1);
    end = parseDatePart(mon2, day2, y2);
  }
  if (!start || !end || end < start) return null;
  end.setUTCHours(23, 59, 59);
  return { start, end };
}

module.exports = { parseDatePart, parseContestDates, parseDxpedDates };
