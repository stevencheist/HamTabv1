# Filter System

The Filters widget provides powerful filtering capabilities to help you find the spots you're looking for.

## How Filters Work

Filters are **AND** logic — a spot must match ALL active filters to appear. For example, if you select 20m band AND CW mode, only spots on 20m CW will show.

Within filter categories (like bands), selection is **OR** logic — selecting both 20m and 40m shows spots on either band.

## Band Filters

### Selecting Bands
Click any band button to toggle it:
- **Highlighted** = Active (spots on this band shown)
- **Dimmed** = Inactive (spots on this band hidden)

If NO bands are selected, ALL bands are shown (no band filtering).

### HF Bands

| Band | Frequency | Typical Use |
|------|-----------|-------------|
| 160m | 1.8-2.0 MHz | Nighttime DX, regional |
| 80m | 3.5-4.0 MHz | Regional, some DX at night |
| 60m | 5.3-5.4 MHz | Channelized, emergency |
| 40m | 7.0-7.3 MHz | All-around band, day & night |
| 30m | 10.1-10.15 MHz | CW/Digital only, quiet band |
| 20m | 14.0-14.35 MHz | Primary DX band, daytime |
| 17m | 18.068-18.168 MHz | DX, follows 15m propagation |
| 15m | 21.0-21.45 MHz | DX during solar maximum |
| 12m | 24.89-24.99 MHz | DX, sporadic propagation |
| 10m | 28.0-29.7 MHz | Local/DX, cycle dependent |

### VHF/UHF Bands

| Band | Frequency | Typical Use |
|------|-----------|-------------|
| 6m | 50-54 MHz | "Magic band", sporadic E |
| 2m | 144-148 MHz | Local, satellite, EME |
| 70cm | 420-450 MHz | Local, satellite, repeaters |

---

## Mode Filters

### Mode Categories

| Mode | Includes |
|------|----------|
| CW | Morse code (all speeds) |
| Phone | SSB, FM, AM voice |
| Digital | FT8, FT4, JS8, PSK, RTTY, etc. |

### Selecting Modes
Same as bands — click to toggle. If no modes selected, all modes shown.

---

## Distance Filter

Filter spots within a radius of your QTH.

### Setting Distance
1. Enter a number in the distance field
2. Choose units: **mi** (miles) or **km** (kilometers)
3. Only spots within that distance appear

### Examples
- `100 mi` — Local parks/summits within easy drive
- `500 mi` — Regional, one-hop propagation
- `3000 mi` — Typical 20m single-hop range
- `6000 mi` — Multi-hop DX paths

<div class="important">Distance filtering requires your location to be set. If no location is configured, the distance filter has no effect.</div>

---

## Age Filter

Filter spots by recency.

### Setting Age
Enter the maximum age in minutes. Only spots posted within that time appear.

### Recommended Settings
- `15 min` — Very fresh spots, likely still active
- `30 min` — Standard, most activators still QRV
- `60 min` — Includes recent activity, some may have QRT
- `120 min` — Historical view, many inactive

<div class="tip">Shorter age filters help you focus on currently-active stations. Longer filters give you a broader picture of activity patterns.</div>

---

## Location Filters

### Country Filter
Filter by DXCC entity (country). Enter the country name or prefix.
- Available for: POTA, SOTA

### State Filter
Filter by US state abbreviation (e.g., `NY`, `CA`).
- Available for: POTA only

### Grid Filter
Filter by Maidenhead grid prefix (2 or 4 characters).
- Example: `FN` shows all FN grids (Northeast US)
- Example: `FN31` shows only FN31 grid square

### Continent Filter
Filter by continent code.
- Available for: DX Cluster only

| Code | Continent |
|------|-----------|
| NA | North America |
| SA | South America |
| EU | Europe |
| AF | Africa |
| AS | Asia |
| OC | Oceania |

---

## Propagation Filter

Filter spots based on predicted HF propagation quality.

### How It Works
Click the **Prop** button in the filter row to toggle propagation filtering. When active, spots on HF bands with poor predicted propagation are hidden.

The filter uses your current solar indices (SFI, K-index, A-index) and your location's day/night status to estimate which bands are likely open. Spots on bands rated below "Fair" (less than 30% reliability) are filtered out.

### What Gets Filtered
- **HF bands** (160m through 10m) — checked against the propagation model
- **VHF/UHF spots** (6m, 2m, 70cm) — always pass through, since they don't depend on ionospheric HF propagation
- **Unknown bands** — pass through unfiltered

### When to Use It
- **Cluttered spot list** — Too many spots on dead bands? Prop filter removes the noise
- **Contest operating** — Focus only on bands that are actually open right now
- **New operators** — Not sure which bands to try? The Prop filter shows you where signals are likely getting through

<div class="tip">The Prop filter uses a simplified propagation model based on solar indices. It estimates general band conditions, not specific path predictions. A band may show as "open" even if propagation to a particular station is poor, and vice versa.</div>

<div class="important">The Prop filter is session-only — it resets when you reload the page. Solar conditions change constantly, so a persistent setting could be misleading if you return to HamTab hours later.</div>

---

## License Privilege Filter

Filter spots based on what frequencies you can legally transmit on.

### How It Works
Select your US license class. Spots on frequencies outside your privileges are hidden.

### License Classes

| Class | HF Privileges |
|-------|--------------|
| Extra | All amateur frequencies |
| General | Most HF with some restrictions |
| Technician | Limited HF (CW portions, 10m) |
| Novice | Very limited HF (CW portions) |

### Mode Considerations
Privileges vary by mode:
- **CW/Digital** portions are often available to lower classes
- **Phone** portions are more restricted

<div class="warning">This filter uses FCC Part 97 rules for US amateurs. Non-US operators should verify their own regulations.</div>

---

## Watch Lists

Watch lists let you highlight, include, or exclude spots by rule — similar to HamClock's watch lists. Click the **Watch Lists** accordion at the bottom of the Filters widget to expand the editor. Rules apply to whichever source tab (POTA, SOTA, DXC, WWFF, PSK) is currently active.

### Watch List Modes

| Mode | What it does | Badge color |
|------|-------------|-------------|
| **Red** | Highlights matching spots with a red-tinted row and accent border | Red |
| **Only** | Shows ONLY spots that match at least one "Only" rule — everything else is hidden | Green |
| **Not** | Hides any spot that matches a "Not" rule | Gray |

### Match Types

| Type | How it matches | Example |
|------|---------------|---------|
| **Callsign** | Exact match after stripping portable suffixes (/P, /M, /QRP) | `K1ABC` matches K1ABC, K1ABC/P, K1ABC/QRP |
| **DXCC** | Case-insensitive match on country name or entity prefix | `JA` matches Japan; `US` matches US-prefixed locations |
| **Grid** | Prefix match — shorter rules match more broadly | `FN` matches FN31, FN42ab, etc. |
| **Ref** | Exact match on park, summit, or flora reference (POTA/SOTA/WWFF only) | `K-1234` matches that specific park |

### How Rules Interact

Rules are evaluated in this fixed order:

1. **Only rules first** — If any "Only" rules exist, a spot must match at least one to survive
2. **Not rules next** — If a spot matches any "Not" rule, it's discarded (even if it matched an "Only" rule)
3. **Red rules last** — Matching spots are highlighted but never filtered out

### Per-Source Rules

Each source tab (POTA, SOTA, DXC, WWFF, PSK) has its own independent rule set. A callsign rule on POTA won't affect your DXC spots. The Ref match type is only available for POTA, SOTA, and WWFF since DXC and PSK don't have park/summit/flora references.

### Adding a Rule

1. Switch to the source tab you want (POTA, SOTA, DXC, WWFF, or PSK) in the On the Air widget
2. Click **Watch Lists** at the bottom of the Filters widget to expand the editor
3. Select a mode (Red, Only, or Not)
4. Choose a match type (Callsign, DXCC, Grid, or Ref)
5. Enter the value and click **Add**

Rules take effect immediately — the spot list updates as soon as you add or remove a rule.

### Deleting a Rule

Click the **×** next to any rule to remove it. The spot list updates instantly.

### Persistence

Watch list rules are saved in your browser and persist across page refreshes and browser restarts. They are stored per source, so clearing your POTA rules won't affect your DXC rules.

<div class="tip">Watch lists are great for tracking specific activators, monitoring your favorite parks, or hiding callsigns that clutter your spot list. Try a "Red" rule for a friend's callsign to spot them quickly in a busy list.</div>

<div class="important">DXCC matching uses the country name from the data source, not an official DXCC entity database. Country names may vary slightly between POTA, SOTA, and DXC sources.</div>

---

## Filter Presets

Save and recall filter combinations for quick switching.

### Saving a Preset
1. Configure your filters as desired
2. Click **Save Preset** in the Filters widget
3. Enter a descriptive name
4. Click Save

### Loading a Preset
Click any preset button to instantly apply those filter settings.

### Deleting a Preset
Long-press (click and hold) a preset button to delete it.

### Preset Ideas

| Preset Name | Filters | Use Case |
|-------------|---------|----------|
| "40m CW" | 40m band, CW mode | CW hunters |
| "Local Parks" | 100mi distance | Finding nearby activations |
| "FT8 DX" | 20m+17m+15m, Digital | Hunting digital DX |
| "Tech HF" | Technician privilege | Tech operators |
| "Fresh Spots" | 15min age | Only current activity |
| "Open Bands" | Prop filter on | Only spots on propagation-viable bands |
| "Weekend" | 20m+40m, Phone | Casual SSB operating |

---

## Filter Combinations

### Example: POTA Hunting on 40m CW within 500 miles

1. Select **POTA** tab in On the Air
2. Click **40m** band button
3. Click **CW** mode button
4. Enter `500` in distance, select `mi`
5. Save as preset: "Local 40m CW Parks"

### Example: All DX on 20m and up

1. Select **DXC** tab
2. Click **20m, 17m, 15m, 12m, 10m** bands
3. Leave mode empty (all modes)
4. Set age to `30` minutes
5. Save as preset: "20m+ DX"

### Example: Digital modes from Europe

1. Select **PSK** tab
2. Click **Digital** mode
3. Set continent filter to `EU`
4. Save as preset: "EU Digital"

---

## Clearing Filters

### Clear Individual Filters
- Click active band/mode buttons to deselect
- Clear text from distance/age fields
- Clear location filter text

### Clear All Filters
Click **Clear** or **Reset** if available, or reload the page. All filters return to defaults (no filtering).

<div class="tip">If you're not seeing expected spots, clear all filters first, then add filters one at a time to identify which filter is excluding them.</div>
