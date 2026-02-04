# HamClock Compatibility Mode - Dependencies & Prerequisites

**Purpose:** This document maps HamClock pane types to HamTab roadmap items to identify what needs to be built before HamClock Compatibility Mode can be implemented.

**Last updated:** February 3, 2026

---

## Executive Summary

HamClock Compatibility Mode is a **Phase 9-10 feature** that depends on completing most of the widget system first. Each HamClock "pane" can display different content types - we need to build these widget types before we can offer true HamClock compatibility.

**Current status:** ~40% of required panes are built
**Recommended timeline:** Implement HamClock mode in Q4 2026 after Phase 8 completes

---

## HamClock Pane Types (Full List)

Based on HamClock archive screenshots and documentation, HamClock supports ~25 different pane types across its configurable grid layout.

### ✅ Already Implemented in HamTab

| HamClock Pane | HamTab Widget | Phase | Notes |
|---------------|---------------|-------|-------|
| Clock (UTC/Local) | Clock widget | P0 | ✅ Complete |
| Map (Mercator) | Map widget | P0 | ✅ Complete (needs day/night colors) |
| Call DE (callsign display) | Header callsign | P0 | ✅ Complete |
| Spots (POTA/SOTA/DXC/PSK) | Activations widget | P0 | ✅ Complete |
| Solar data | Solar widget | P0 | ✅ Complete |
| Lunar phase | Lunar widget | P0 | ✅ Complete |
| Satellites | Satellite widget | P0 | ✅ Basic tracking implemented |
| Weather | Weather widget | P0 | ✅ Current conditions |

### 🟡 Partially Implemented

| HamClock Pane | HamTab Widget | Phase | Missing Components |
|---------------|---------------|-------|-------------------|
| Band Conditions | Propagation widget | P0 | ✅ MUF display exists<br>❌ Missing: VOACAP grid (P3) |
| Moon image | Lunar widget | P0 | ✅ Static phase display<br>❌ Missing: NASA SVS hourly images |

### ❌ Not Yet Implemented (Required for HamClock Mode)

| HamClock Pane | Roadmap Phase | Priority | Blocking Issue |
|---------------|---------------|----------|----------------|
| **GOES X-Ray flux graph** | P1.3 | HIGH | 24-hour X-ray flare history |
| **VOACAP DE-DX propagation** | P3.1 | CRITICAL | Reliability grid (24h × band) |
| **NCDXF beacon stats** | P5.3 | MEDIUM | 18 beacon propagation table |
| **DE/DX clock pair** | — | HIGH | Dual time zone display<br>Distance/bearing to DX |
| **Contests calendar** | P5.1 | HIGH | WA7BNM integration |
| **DXpeditions list** | P5.2 | HIGH | NG3K/DXNews integration |
| **Azimuthal map** | P6.1 | HIGH | Custom projection |
| **Aurora oval map** | P6.2 | MEDIUM | NOAA OVATION overlay |
| **Call lookup info** | — | MEDIUM | QRZ/HamQTH API integration |
| **Maidenhead grid map** | — | LOW | Grid square overlay |
| **RSS feed ticker** | P9+ | LOW | External news feed |
| **Solar flux history (30d)** | P1.3 | HIGH | Historical SFI graph |
| **K-index history (7d)** | P1.3 | HIGH | Geomagnetic trend graph |
| **Bz/Bt history** | P1.3 | MEDIUM | IMF trend graphs |
| **Solar wind history** | P1.3 | MEDIUM | Speed trend graph |
| **Aurora history** | P1.3 | MEDIUM | Auroral activity graph |
| **DRAP map** | P3.2 | MEDIUM | D-Region absorption |
| **Sky plot (satellite)** | P7.1 | HIGH | Polar chart of satellite pass |
| **EME planning** | P7.2 | MEDIUM | Moon mutual visibility |
| **Stopwatch** | P8.4 | MEDIUM | Simple countdown/lap timer |
| **Big Clock** | P8.3 | LOW | Fullscreen time display |
| **Photo viewer** | — | LOW | External image display |

---

## Dependency Mapping by Phase

### Phase 1 Prerequisites (Feb-Mar 2026)
**Delivers:**
- ✅ Space weather history graphs (X-ray, SFI, K-index, Bz/Bt, Solar wind, Aurora)
- ✅ Units toggle (metric/imperial)

**Impact on HamClock mode:**
- Enables 6 additional pane types (history graphs)
- Required for serious HamClock users

### Phase 2 Prerequisites (Mar-Apr 2026)
**Delivers:**
- ✅ Advanced watch list modes (Red/Only/Not)
- ✅ ADIF log integration

**Impact on HamClock mode:**
- Improves spot filtering (matches HamClock behavior)
- Enables ADIF pane type

### Phase 3 Prerequisites (Apr-May 2026) 🔥 CRITICAL
**Delivers:**
- ✅ VOACAP reliability grid (24h × band) ← **Most requested HamClock feature**
- ✅ REL/TOA map overlays
- ✅ DRAP overlay

**Impact on HamClock mode:**
- Enables 3 major pane types (VOACAP grid, REL map, DRAP map)
- Without this, HamClock mode lacks its signature feature

### Phase 4 Prerequisites (May-Jun 2026)
**Delivers:**
- ✅ WSJT-X/N1MM+ integration
- ✅ Rig/rotator control

**Impact on HamClock mode:**
- Enables live spot integration (less critical for HamClock UI)
- Mostly backend enhancements

### Phase 5 Prerequisites (Jun-Jul 2026)
**Delivers:**
- ✅ Contests calendar (WA7BNM)
- ✅ DXpeditions tracker (NG3K/DXNews)
- ✅ NCDXF beacon display

**Impact on HamClock mode:**
- Enables 3 additional pane types (contests, DXpeds, beacons)
- Beacons table is visible in screenshot #2

### Phase 6 Prerequisites (Jul-Aug 2026)
**Delivers:**
- ✅ Azimuthal map projection
- ✅ Aurora overlay
- ✅ Weather/cloud overlays

**Impact on HamClock mode:**
- Enables azimuthal map pane (heavily used in HamClock)
- Adds 3 map overlay pane types

### Phase 7 Prerequisites (Aug-Sep 2026)
**Delivers:**
- ✅ Satellite sky plot
- ✅ Lunar Az/El and rise/set
- ✅ EME planning tool

**Impact on HamClock mode:**
- Enables 3 advanced pane types
- Important for satellite/EME operators

### Phase 8 Prerequisites (Sep-Oct 2026)
**Delivers:**
- ✅ Stopwatch/countdown timers
- ✅ Big Clock mode
- ✅ Pane rotation (auto-cycle)

**Impact on HamClock mode:**
- Enables timer panes
- Pane rotation is HamClock feature

---

## Implementation Readiness Matrix

| Phase | Panes Ready | Panes Missing | % Complete | Blocker for HamClock Mode? |
|-------|-------------|---------------|------------|---------------------------|
| P0 (Complete) | 8 panes | 2 partial | ~40% | ❌ Not sufficient |
| P1 | +6 panes | — | ~60% | ❌ Still missing VOACAP |
| P2 | +1 pane | — | ~65% | ❌ Still missing VOACAP |
| P3 | +3 panes | — | ~75% | 🟡 Minimum viable (lacks beacons, azimuthal) |
| P4 | +0 panes | — | ~75% | 🟡 No new panes |
| P5 | +3 panes | — | ~85% | ✅ Strong candidate |
| P6 | +4 panes | — | ~95% | ✅ Excellent coverage |
| P7 | +3 panes | — | ~98% | ✅ Near-complete |
| P8 | +3 panes | — | ~100% | ✅ Full coverage |

**Recommendation:** Implement HamClock Compatibility Mode in **Phase 9** (Oct-Nov 2026) after Phase 8 completes.

**Minimum viable timeline:** Could implement in **Phase 6** (Jul-Aug 2026) with 95% pane coverage, but would lack timers and some minor panes.

---

## Additional Widgets Needed (Not on Current Roadmap)

These HamClock panes don't map to existing roadmap items and would need to be added:

### High Priority (Add to Phase 9)
1. **DE/DX Clock Pair Widget**
   - Display home time (DE) and DX time side-by-side
   - Grid square, distance, bearing to DX
   - Visible in screenshot #2 (left side, orange "DE:" and green "DX:")

2. **Call Lookup Widget**
   - QRZ.com or HamQTH API integration
   - Display: Name, QTH, grid, photo, bio
   - Common HamClock pane type

3. **Maidenhead Grid Map**
   - Overlay grid squares on map
   - Highlight specific grids

### Medium Priority (Add to Phase 10)
4. **RSS News Ticker**
   - Scrolling feed from HamWeekly, ARRL, etc.
   - Visible in screenshot #1 (bottom)

5. **Photo Viewer Pane**
   - Display custom images (callsign card, shack photo)
   - Less common but requested

### Low Priority (Future)
6. **Custom Text Pane**
   - User-defined text display
   - Notes, reminders, etc.

---

## HamClock Compatibility Mode Implementation Plan

### Phase 9 (Oct-Nov 2026): HamClock Mode Core
**Prerequisites:** Phases 1-8 complete (~95% pane coverage)

**Deliverables:**
1. **Configuration System**
   - Enable/disable HamClock mode toggle
   - Resolution presets (800×480, 1600×960, 2400×1440)
   - Grid snapping toggle

2. **Theme System**
   - Pure black backgrounds
   - Terminal monospace fonts
   - Sharp edges (no rounded corners)
   - High contrast cyan/orange/yellow/green accents
   - New CSS file: `style-hamclock.css`

3. **Grid Layout System**
   - 4×3 grid calculator
   - Snap-to-grid drag/drop
   - Visual grid overlay (optional)

4. **Layout Presets**
   - Classic (original HamClock layout)
   - DX-focused (larger map)
   - Contest (optimized for contesting)

5. **Widget Adaptations**
   - Clock: Larger monospace display
   - Band Conditions: Terminal-style grid
   - Map: High contrast markers
   - Spots: ASCII-style table
   - Solar: Terminal-style cards

6. **Missing Widgets (Phase 9 additions)**
   - DE/DX clock pair widget
   - Call lookup widget
   - Maidenhead grid map

**Estimated effort:** 6-8 weeks

### Phase 10 (Dec 2026): HamClock Mode Polish
**Deliverables:**
1. RSS news ticker widget
2. Photo viewer pane
3. Additional layout presets
4. HamClock `.cfg` import (stretch goal)
5. CRT effect shader (optional retro aesthetic)

**Estimated effort:** 2-4 weeks

---

## Migration Path for HamClock Users

### Day 1: HamTab without HamClock Mode
- Users can start using HamTab immediately
- Familiar widgets: spots, map, solar, lunar, satellites
- Modern UI with drag/drop flexibility

### After Phase 3 (May 2026): Core Features Ready
- VOACAP propagation available
- 75% of HamClock panes implemented
- Users can replicate most HamClock layouts manually

### After Phase 6 (Aug 2026): Near-Complete
- 95% of HamClock panes available
- Azimuthal map, aurora overlay, beacons
- Users can achieve HamClock-like layouts

### After Phase 9 (Nov 2026): HamClock Compatibility Mode
- One-click "HamClock mode" toggle
- Automatic terminal aesthetic
- Pre-configured layouts matching HamClock
- Grid snapping to replicate HamClock feel

---

## Open Questions

1. **Pane configuration UI:**
   - How do users select what each grid cell displays?
   - HamClock uses SSH + text menu - we need a web UI
   - **Proposed:** Right-click widget → "Change pane type" → dropdown menu

2. **Resolution handling:**
   - HamClock had fixed resolutions (800×480, 1600×960, 2400×1440)
   - HamTab is responsive - should we enforce fixed resolutions in HamClock mode?
   - **Proposed:** Offer resolution presets but allow users to override

3. **Pane rotation:**
   - HamClock auto-rotates panes on a timer
   - Should this be per-pane or global setting?
   - **Proposed:** Per-pane setting (each grid cell can rotate independently)

4. **HamClock `.cfg` import:**
   - Should we support importing HamClock config files?
   - Would require parsing HamClock's format
   - **Proposed:** Phase 10 stretch goal

---

## Conclusion

**HamClock Compatibility Mode is feasible but requires ~95% of roadmap completion first.**

**Critical path:**
1. ✅ Phase 1: Space weather graphs (enables 6 panes)
2. ✅ Phase 3: VOACAP integration (enables HamClock's signature feature)
3. ✅ Phase 5: Contests/DXpeds/Beacons (enables 3 key panes)
4. ✅ Phase 6: Azimuthal map + overlays (enables 4 important panes)
5. ✅ Phase 9: HamClock Compatibility Mode implementation

**Estimated timeline:** November 2026 (just before HamClock EOL in June 2027)

**User impact:** HamClock users can migrate to HamTab and retain their familiar interface while gaining modern web benefits (responsive, accessible, cloud-deployable).

---

**Next Steps:**
1. Continue roadmap execution (Phases 1-8)
2. Add Phase 9 to roadmap (HamClock Compatibility Mode)
3. Add Phase 10 to roadmap (HamClock polish + missing widgets)
4. Gather HamClock user feedback on required pane types
5. Prioritize most-used pane types for earlier implementation
