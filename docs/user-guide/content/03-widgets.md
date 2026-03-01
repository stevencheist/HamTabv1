# Widgets Reference

HamTab's interface is built from configurable widgets. Each widget can be moved, resized, shown, or hidden to create your ideal layout.

## Widget Management

### Moving Widgets
Click and drag the **title bar** to move a widget. Widgets snap to screen edges and other widgets when you drag near them.

### Resizing Widgets
Drag the edges or corners of any widget to resize it. Most widgets have minimum sizes to ensure content remains readable.

### Showing/Hiding Widgets
1. Open Config (gear icon in top-right)
2. Use the checkboxes under "Visible Widgets" to show or hide each widget
3. Hidden widgets can be restored anytime

### Widget Settings
Many widgets have their own settings. Click the **gear icon** in the widget's title bar to access widget-specific configuration.

### Grid Layout Mode

Grid mode arranges widgets into fixed cells instead of free-floating positions. Switch between modes in Config > Display.

**Grid Permutations:**

| Permutation | Layout | Slots |
|-------------|--------|-------|
| 2L-2R | 2 left, 2 right | 4 |
| 3L-3R | 3 left, 3 right | 6 |
| 1T-2L-2R-1B | 1 top, 2 left, 2 right, 1 bottom | 6 |
| 1T-3L-3R-1B | 1 top, 3 left, 3 right, 1 bottom | 8 |
| 2T-3L-3R-2B | 2 top, 3 left, 3 right, 2 bottom | 10 |

The map always occupies the center cell and doesn't count toward the slot limit.

**Slot Counter:**
In the Display tab, a slot counter shows "N / M slots" (e.g., "5 / 6 slots"). When you reach the limit, unchecked widgets are greyed out and can't be enabled until you hide another widget to free a slot. If more widgets are enabled than slots allow, an amber warning appears.

**Switching Permutations:**
Use the permutation dropdown in Config > Display to change layouts. Larger permutations (more slots) let you show more widgets at once.

<div class="tip">If you want to see more widgets than your current grid allows, switch to a larger permutation (e.g., 3L-3R → 1T-3L-3R-1B) or switch to free-float mode where there's no slot limit.</div>

---

## Filters Widget

Filter spots by band, mode, distance, age, and location criteria.

### Band Filters
Click band buttons to filter spots. Multiple bands can be selected. Active bands are highlighted.

| Band | Frequency Range |
|------|-----------------|
| 160m | 1.8 - 2.0 MHz |
| 80m | 3.5 - 4.0 MHz |
| 60m | 5.3 - 5.4 MHz |
| 40m | 7.0 - 7.3 MHz |
| 30m | 10.1 - 10.15 MHz |
| 20m | 14.0 - 14.35 MHz |
| 17m | 18.068 - 18.168 MHz |
| 15m | 21.0 - 21.45 MHz |
| 12m | 24.89 - 24.99 MHz |
| 10m | 28.0 - 29.7 MHz |
| 6m | 50.0 - 54.0 MHz |
| 2m | 144.0 - 148.0 MHz |
| 70cm | 420.0 - 450.0 MHz |

### Mode Filters
Filter by operating mode:
- **CW** — Morse code
- **Phone** — Voice (SSB, FM, AM)
- **Digital** — FT8, FT4, JS8, RTTY, PSK, etc.

### Distance Filter
Filter spots within a specified distance from your QTH:
1. Enter a number in the distance field
2. Choose miles or kilometers
3. Only spots within that radius appear

<div class="warning">Distance filtering requires your location to be set in Config.</div>

### Age Filter
Filter spots by how recently they were posted:
- Enter a number of minutes
- Only spots posted within that time appear

### Location Filters
Filter by geographic criteria (availability varies by data source):
- **Country** — Filter by DXCC entity
- **State** — Filter by US state (POTA only)
- **Grid** — Filter by Maidenhead grid prefix
- **Continent** — Filter by continent code (DXC only)

### License Privilege Filter
Filter spots based on US amateur license privileges:
- **Extra** — All frequencies
- **General** — General class privileges
- **Technician** — Technician class privileges
- **Novice** — Novice class privileges

Spots outside your selected license class are hidden.

### Filter Presets
Save commonly-used filter combinations:
1. Set up your desired filters
2. Click **Save Preset**
3. Enter a name (e.g., "40m CW", "Local Parks")
4. Click preset buttons to quickly recall saved filters
5. Long-press a preset button to delete it

---

## On the Air Widget

Displays live spots in a tabular format with source tabs for POTA, SOTA, DXC, WWFF, and PSK.

### Source Tabs
Click tabs to switch between data sources:

| Tab | Data Source | Content |
|-----|-------------|---------|
| POTA | Parks on the Air API | Park activations |
| SOTA | SOTA Cluster | Summit activations |
| DXC | DX Cluster | DX spots worldwide |
| WWFF | World Wide Flora & Fauna | Flora & fauna reserve activations |
| PSK | PSKReporter | Digital mode reports |

### Table Columns
Each source has different columns. Common columns include:

- **Callsign** — Activator or DX station callsign
- **Freq** — Operating frequency in kHz
- **Mode** — Operating mode
- **Reference** — Park/Summit reference (clickable link)
- **Time** — Spot timestamp
- **Age** — Time since spot was posted

### Interacting with Spots
- **Click a row** to select it — shows on map and populates DX Detail
- **Click callsign** to copy to clipboard
- **Click reference link** to open park/summit page in new tab

### Column Visibility
Click the gear icon to show/hide specific columns for each source.

---

## HamMap Widget

Interactive map showing spots, your location, satellites, and propagation overlays.

### Map Controls
- **Zoom** — Mouse wheel or +/- buttons
- **Pan** — Click and drag
- **Fullscreen** — Click expand button in corner

### Markers
| Marker Color | Meaning |
|--------------|---------|
| Blue | Your QTH (home location) |
| Green | POTA activation |
| Orange | SOTA activation |
| Red | DX Cluster spot |
| Teal | WWFF activation |
| Purple | PSK report |
| Yellow | Selected spot |

### Overlays
Click the gear icon to toggle map overlays:

- **Lat/Lon Grid** — Geographic coordinate grid
- **Maidenhead Grid** — Ham radio grid squares
- **Timezone** — World timezone boundaries
- **MUF Map** — Real-time Maximum Usable Frequency image overlay from prop.kc2g.com, showing a color-filled worldwide MUF map that auto-refreshes every 15 minutes
- **Gray Line** — Day/night terminator

### Geodesic Paths
When you select a spot, a curved line shows the great-circle path from your QTH to the spot's location. This is the shortest path a radio signal would travel.

### Satellite Footprints
If satellites are tracked, their footprints (coverage areas) appear on the map in real-time. The ISS also shows a dashed cyan orbit path line. Click a satellite marker to select it.

---

## Solar Widget

Real-time space weather data from HamQSL.

### Available Fields

| Field | Description | Good Propagation |
|-------|-------------|------------------|
| Solar Flux (SFI) | 10.7cm radio flux | Higher is better (>100) |
| Sunspots | Visible sunspot count | Higher is better |
| A-Index | Daily geomagnetic activity | Lower is better (<10) |
| K-Index | 3-hour geomagnetic activity | Lower is better (<3) |
| X-Ray | Solar flare intensity | Lower is better |
| Signal Noise | HF background noise | Lower is better |
| Solar Wind | Particle stream speed | Lower is better (<400) |
| Bz (IMF) | Interplanetary magnetic field | Positive is better |
| Proton Flux | High-energy protons | Lower is better |
| Electron Flux | High-energy electrons | Lower is better |
| Aurora | Auroral activity index | Higher = more aurora |
| Aurora Lat | Southernmost aurora | Higher latitude = less interference |
| He 10830A | Solar chromosphere indicator | — |
| Geomag Field | Geomagnetic field state | "Quiet" is best |
| K-Index (Night) | Nighttime K-index | Lower is better |
| MUF | Maximum Usable Frequency | — |
| foF2 | Critical frequency F2 layer | — |
| MUF Factor | MUF multiplication factor | — |

### Color Coding
Several fields are color-coded:
- <span class="color-good">Green</span> — Good conditions
- <span class="color-fair">Yellow</span> — Fair conditions
- <span class="color-poor">Red</span> — Poor conditions

### Customizing Fields
Click the gear icon to show/hide fields. Default fields: SFI, Sunspots, A-Index, K-Index, X-Ray, Signal Noise.

---

## Space Wx Widget

Historical graphs of key space weather indices. While the Solar widget shows current snapshot values, the Space Wx widget shows trends over the past 7 days (or 90 days for Solar Flux), helping you understand how conditions are changing.

### Tabs

Switch between five measurements using the tabs at the top of the widget:

| Tab | What It Shows | Time Range |
|-----|--------------|------------|
| **Kp** | Geomagnetic activity (0–9 scale) | 7 days |
| **X-Ray** | Solar flare intensity (log scale) | 7 days |
| **SFI** | Solar Flux Index (overall solar activity) | 90 days |
| **Wind** | Solar wind speed (km/s) | 7 days |
| **Bz** | Interplanetary magnetic field direction (nT) | 7 days |

### Reading the Graphs

- **Kp**: Bar chart colored green (quiet), yellow (unsettled), red (storm). Values above 4 mean geomagnetic storms that can disrupt HF propagation.
- **X-Ray**: Line chart on a logarithmic scale with A/B/C/M/X flare class boundaries marked. Higher classes mean stronger solar flares.
- **SFI**: 90-day trend line. Values above 100 generally mean good HF conditions; above 150 is excellent.
- **Wind**: Solar wind speed with color zones — green below 400 km/s (quiet), yellow 400–600 km/s, red above 600 km/s (disturbed).
- **Bz**: Signed line chart showing the north-south component of the interplanetary magnetic field. Green (positive/northward) is good for radio; red (negative/southward) allows solar wind to disturb Earth's magnetosphere.

### Data Source

All data comes from NOAA Space Weather Prediction Center (SWPC), updated every 15 minutes.

---

## Band Conditions Widget

At-a-glance HF and 6m band conditions plus VHF propagation status. Shows per-band reliability predictions for day and night simultaneously in a compact color-coded table.

### Propagation Summary

The summary bar at the top shows three key solar metrics:

| Metric | What It Means |
|--------|---------------|
| **MUF** | Maximum Usable Frequency — the highest frequency likely to propagate. Higher = more bands open. |
| **SFI** | Solar Flux Index — overall solar activity. Above 100 is good for HF; above 150 is excellent. |
| **K** | K-Index — geomagnetic disturbance (0–9). Green (0–2) is quiet; yellow (3–5) is unsettled; red (6+) means storm conditions that can shut down HF bands. |

### HF Bands Tab

The default view shows a compact table with 11 bands (160m through 6m). Each row has:

- **Band label** — The amateur band name
- **Day column** (orange header) — Predicted daytime reliability percentage
- **Night column** (blue header) — Predicted nighttime reliability percentage

Cell colors use a continuous gradient:

| Color | Reliability | Meaning |
|-------|-------------|---------|
| Dark/black | 0–10% | Band closed |
| Red | 10–30% | Poor conditions |
| Yellow | 30–60% | Fair — marginal openings |
| Green | 60–100% | Good to excellent |

Hover over any cell to see the band name and condition label (e.g., "20m Day: Excellent").

### 6m — The Magic Band

6m (50 MHz) is included because it has meaningful propagation modes that vary with solar and atmospheric conditions:

- **Sporadic E (Es)** — Unpredictable E-layer patches that can open 6m for hundreds to thousands of miles. Most common May–August. When HamQSL reports E-Skip activity, the 6m reliability score gets a boost.
- **F2 skip** — During high solar activity (SFI above ~150), the MUF can reach 50 MHz, opening worldwide 6m propagation via the F-layer.

During quiet conditions 6m may show as closed, but brief Es openings can still occur at any time — that's why it's called the Magic Band.

### VHF Tab

Click the **VHF** tab to see VHF propagation phenomena:

- **Aurora** — Northern hemisphere auroral activity. When active, VHF/UHF signals (especially 2m and above) can bounce off the aurora for unusual contacts.
- **E-Skip** — Sporadic E-layer openings by region (North America, Europe, EU 6m, EU 4m). When open, 6m and sometimes 2m/4m can propagate over long distances.

Each phenomenon shows a condition label color-coded from red (closed) through yellow (fair) to green (open).

### Data Source

All data comes from HamQSL and updates with the solar data refresh cycle. HF predictions are calculated from Solar Flux (SFI), K-index, and A-index using an ionospheric model. The 6m prediction additionally incorporates live E-Skip conditions from HamQSL.

---

## VOACAP DE→DX Widget

A dense 24-hour propagation prediction grid showing band reliability from your station (DE) to the world (DX). This widget uses the **VOACAP** (Voice of America Coverage Analysis Program) engine — a professional ionospheric model used by international broadcasters and militaries worldwide — to predict which bands will be open and when.

### Prediction Engines

HamTab uses two prediction engines, shown by the badge in the bottom-left corner of the widget:

| Badge | Engine | Description |
|-------|--------|-------------|
| **VOACAP** (green) | Real VOACAP | Full ionospheric ray-tracing model via dvoacap-python. Computes multi-hop propagation paths, signal-to-noise ratios, and reliability percentages for each band/hour combination. Accounts for D-layer absorption, MUF, takeoff angle, transmit power, and operating mode. |
| **SIM** (gray) | Simplified model | A lightweight approximation based on solar flux, geomagnetic indices, and time of day. Used as a fallback when the VOACAP engine is unavailable (e.g., on self-hosted installations without Python). |

The engine switches automatically — no user action needed. When VOACAP is available, predictions are significantly more accurate because they model the actual ionospheric layers and propagation geometry between your location and target regions, rather than using statistical approximations.

### Reading the Grid

- **Rows** — HF bands from 10m (top) to 80m (bottom)
- **Columns** — 24 UTC hours, starting from the current hour at the left edge
- **Cell colors** — Predicted reliability percentage:

| Color | Reliability |
|-------|-------------|
| Black/dark | 0–10% — Band closed |
| Red | 10–30% — Poor |
| Orange/Yellow | 30–60% — Fair |
| Green | 60–100% — Good to excellent |

Hover over any cell to see the exact reliability percentage, band, and UTC hour.

### Interactive Parameters

The bottom bar shows clickable settings. Click any value to cycle through options:

| Parameter | Options | Effect |
|-----------|---------|--------|
| **Power** | 5W, 100W, 1kW | TX power — higher power improves reliability at margins |
| **Mode** | CW, SSB, FT8 | Operating mode — FT8 shows significantly more green because of its ~40 dB SNR advantage over SSB |
| **TOA** | 3°, 5°, 10°, 15° | Takeoff angle — lower angles favor long-distance DX, higher angles favor shorter paths |
| **Path** | SP, LP | Short path or long path (the "other way around" the Earth) |
| **S=** | (display only) | Current smoothed sunspot number from NOAA |

### Overview vs Spot Mode

Click **OVW/SPOT** in the parameter bar to toggle target mode:

- **OVW** (Overview) — Shows the best predicted reliability across representative worldwide targets (Europe, East Asia, South America, North America). This tells you "what bands are open to anywhere in the world right now."
- **SPOT** — Calculates predictions specifically to the station you've selected in the On the Air table. This tells you "when will this band open to *that particular DX station*."

<div class="tip">Use Overview mode for general band planning, then switch to Spot mode when you see a specific station you want to work and want to know the best time/band.</div>

### Map Overlay

Click any band row to show that band's propagation on the map. Two overlay modes are available — click the **○/REL** toggle in the parameter bar to switch:

- **○ (Circles)** — Draws concentric range rings from your QTH, scaled by predicted reliability. Larger circles = better propagation. A small red circle means the band is closed.
- **REL (Heatmap)** — Paints the entire map with a color gradient showing predicted reliability to every point on Earth. Green = good, yellow = fair, red = poor, dark = closed. The heatmap re-renders as you pan and zoom, with finer detail at higher zoom levels.

Click the same band again to clear the overlay.

### About the Predictions

- Predictions are **monthly median values** based on the current smoothed sunspot number (SSN) from NOAA
- They represent typical conditions for this month, not real-time ionospheric state
- Use them for **planning** which bands to try at different times of day, rather than as guarantees of what's open right now
- Real-time conditions vary due to solar flares, geomagnetic storms, and local ionospheric irregularities — check the Solar widget for current space weather

<div class="warning">VOACAP predictions work best for bands 80m–10m. They do not cover VHF/UHF propagation (6m, 2m, 70cm), which depends on different mechanisms like sporadic-E, tropospheric ducting, and meteor scatter.</div>

---

## Live Spots Widget

Shows where YOUR signal is being received via PSKReporter.

### Requirements
- Your callsign must be set in Config
- Works best when actively transmitting on digital modes (FT8, FT4, JS8)

### Band Cards
Each card represents a band where your signal has been received:
- Click a card to toggle that band's paths on the map
- Shows either station count or farthest distance

### Display Mode
Click the gear icon to switch between:
- **Count** — Number of stations receiving you
- **Distance** — Distance to farthest receiver

---

## Lunar / EME Widget

Moon phase, position, and Earth-Moon-Earth path loss calculations.

### Available Fields

| Field | Description |
|-------|-------------|
| Moon Phase | Current lunar phase name |
| Illumination | Percentage of moon illuminated |
| Declination | Moon's position relative to equator |
| Distance | Distance to moon (km) |
| Path Loss | EME path loss at 144 MHz |
| Elongation | Angular separation from sun |
| Ecl. Longitude | Ecliptic longitude |
| Ecl. Latitude | Ecliptic latitude |
| Right Ascension | Celestial RA coordinate |

### EME Path Loss
Calculated for 144 MHz based on current lunar distance:
- **Perigee** (closest): ~367 dB
- **Apogee** (farthest): ~370 dB

<div class="tip">Lower path loss means easier EME contacts. Plan EME operations around lunar perigee.</div>

---

## Satellites Widget

Live tracking and pass predictions for amateur radio satellites.

### ISS Tracking (No API Key Needed)
The ISS (International Space Station) is tracked automatically with no setup required. You'll see:
- **ISS marker** on the map showing its current position
- **Footprint circle** showing the area that can communicate with ISS
- **Orbit path** — a dashed cyan line showing the predicted ground track for one full orbit

The ISS has an amateur radio station onboard (ARISS) with voice repeater, APRS, and occasional SSTV transmissions.

### Adding More Satellites
To track additional satellites (AO-91, SO-50, etc.), you need a free API key from N2YO.com. Enter it in Config, then click the gear icon in the Satellites widget to add satellites.

### Satellite Information
For each tracked satellite:
- **Position** — Current latitude/longitude
- **Altitude** — Height above Earth (km)
- **Azimuth/Elevation** — Position in your sky
- **Footprint** — Coverage area shown on map

### Pass Predictions
Click a satellite name to view upcoming passes:
- **AOS** — Acquisition of Signal (rise time)
- **TCA** — Time of Closest Approach
- **LOS** — Loss of Signal (set time)
- **Max Elevation** — Highest point in pass

---

## Reference Widget

Quick-reference tables for common ham radio information. Use the tabs to switch between different references.

### RST Tab
Readability-Strength-Tone signal reporting system:

| Code | Readability | Strength | Tone (CW) |
|------|-------------|----------|-----------|
| 1 | Unreadable | Faint | Harsh, hum |
| 2 | Barely readable | Very weak | Harsh, mod |
| 3 | Readable w/ difficulty | Weak | Rough, hum |
| 4 | Almost perfectly | Fair | Rough, mod |
| 5 | Perfectly readable | Fairly good | Wavering |
| 6 | — | Good | Wavering, mod |
| 7 | — | Mod. strong | Good, slight hum |
| 8 | — | Strong | Good, slight mod |
| 9 | — | Very strong | Perfect tone |

**Usage:** Phone reports use RS only (e.g., "59"). CW reports use RST (e.g., "599").

### Phonetic Tab
NATO phonetic alphabet for clear letter pronunciation.

### Morse Tab
International Morse code dit/dah patterns for each letter and number.

### Q-Codes Tab
Common Q-code abbreviations used in amateur radio.

### Bands Tab
US amateur band privileges by license class (Extra, General, Technician, Novice). Shows frequency ranges and allowed modes for each class.

- **My privileges only** — Check this box to filter the table to show only your license class. Requires a US callsign set in Config.
- Mode groups: **All** (any mode), **CW** (Morse only), **CW/Digital** (CW and digital modes like FT8), **Phone** (voice modes like SSB).

---

## DX Detail Widget

Detailed information about the currently selected spot.

### Information Displayed
- **Callsign** — With link to QRZ.com lookup
- **Name/Address** — From QRZ if available
- **License Class** — If available
- **Grid Square** — Maidenhead locator
- **Frequency** — Operating frequency
- **Mode** — Operating mode
- **Reference** — Park/Summit (if applicable)
- **Distance** — Great-circle distance from your QTH
- **Bearing** — Compass heading to station

### Selecting a Spot
Click any spot row in On the Air, or click a map marker, to populate this widget.

---

## Contests Widget

A calendar of upcoming and active amateur radio contests, sourced from the WA7BNM Contest Calendar.

### What Are Contests?
Ham radio contests are time-limited competitions where operators try to make as many contacts as possible within a set period (usually a weekend). They're great for practicing your operating skills and filling your logbook.

### Reading the List
Each card shows:
- **Contest name** — The name of the contest
- **Mode badge** — CW (orange), Phone (blue), Digital (purple), or no badge for mixed-mode contests
- **NOW badge** — Green badge if the contest is currently running
- **Date/time window** — When the contest starts and ends (UTC)

Click any card to open the full rules and exchange format on the contest website.

### Tips for Beginners
- Start with a major contest like ARRL Field Day or CQ WW — they have the most participants
- Listen first to learn the exchange format before calling
- Most contests only need a brief exchange (signal report + location or serial number)

<div class="tip">Contests happen nearly every weekend. Even if you don't want to compete, contests are a great time to make contacts because many stations are on the air.</div>

---

## DXpeditions Widget

Track upcoming and active DXpeditions — organized trips to rare locations where operators set up stations for other hams to contact.

### What Is a DXpedition?
A DXpedition is when operators travel to a rare or hard-to-reach location (remote islands, territories, etc.) specifically to get on the air. Working a DXpedition is often the only way to log a new DXCC entity.

### Reading the Cards
Each card shows:
- **Callsign** — The callsign being used on the DXpedition
- **Entity** — The DXCC entity (country/territory)
- **ACTIVE badge** — Green badge if the DXpedition is on the air right now
- **Date range** — Operating dates
- **QSL info** — How to confirm your contact (LoTW, direct card, bureau)

Click any card for more details about the DXpedition.

### QSL Methods
- **LoTW** — Logbook of the World, an electronic confirmation system (fastest and cheapest)
- **Direct** — Mail a QSL card directly to the QSL manager
- **Bureau** — Send via the QSL bureau (slower but no postage cost)

---

## NCDXF Beacons Widget

Real-time display of the NCDXF/IARU International Beacon Project — 18 synchronized beacons worldwide that transmit on 5 HF frequencies in a repeating 3-minute cycle.

### How It Works
The table shows 5 rows, one per beacon frequency:
- **MHz** — The frequency (14.100, 18.110, 21.150, 24.930, 28.200)
- **Beacon** — The callsign of the currently transmitting beacon
- **Location** — Where the beacon is located
- **Countdown** — Seconds until the next beacon rotation

Every 10 seconds, the schedule rotates — each beacon moves to the next higher frequency. After transmitting on 28.200 MHz, a beacon cycles back to 14.100 MHz.

### Checking Band Propagation
1. Tune your radio to one of the five beacon frequencies
2. Listen for 3 minutes (one full cycle)
3. If you hear a beacon, the band is open to that location
4. Check all five frequencies to map which bands are open where

### Beacon Transmission Format
Each beacon transmits:
1. Its callsign in CW (Morse code) at 100 watts
2. Four 1-second dashes at decreasing power: 100W → 10W → 1W → 0.1W

If you hear the callsign but not the weaker dashes, the band is open but marginal to that location.

<div class="tip">The beacons are an excellent quick check of band conditions. In just 3 minutes of listening on one frequency, you can hear from up to 18 locations worldwide.</div>

---

## DE/DX Info Widget

A side-by-side display of your station (DE) and the currently selected distant station (DX). Inspired by the classic HamClock application, this widget puts the essential information for making contacts in one compact panel.

### DE Panel (Your Station)
The left panel shows:
- **Call** — Your callsign (set in Config)
- **Grid** — Your Maidenhead grid square (computed from your location)
- **Loc** — Your latitude and longitude
- **Rise/Set** — Today's sunrise and sunset times at your location, in UTC

### DX Panel (Selected Station)
When you click a spot in the On the Air table or a marker on the map, the right panel shows:
- **Call** — The distant station's callsign
- **Freq** — Operating frequency and band
- **Mode** — Operating mode (SSB, CW, FT8, etc.)
- **Grid** — The distant station's grid square
- **Brg** — Compass bearing from your station to theirs (for antenna pointing)
- **Dist** — Distance in your preferred unit (miles or km)
- **Rise/Set** — Sunrise and sunset at the DX location, in UTC

### Why Sunrise/Sunset Matters
HF radio propagation changes dramatically at sunrise and sunset. The "gray line" — the band of twilight circling the Earth — often produces enhanced long-distance propagation. By comparing sunrise/sunset times at both ends of a path, you can predict when bands will open or close.

<div class="tip">Compare the sunrise/sunset times on both panels. If both stations are near their gray line at the same time, conditions are often excellent for HF contacts.</div>

---

## Logbook Widget

Import and view contact logs from any logging software that exports ADIF files. The Logbook widget provides a sortable, filterable table of your QSOs and optional map markers showing where you've made contacts — all stored locally in your browser.

### Importing a Log

There are two ways to import an ADIF file:

1. **Drag and drop** — Drag an `.adi` or `.adif` file directly onto the import zone
2. **Click to browse** — Click the import zone to open a file picker

The parser supports standard ADIF 3.x format, including typed fields and mixed-case tags. Records without a callsign are skipped. Your log is stored in IndexedDB — it persists across browser sessions and can handle large logs (100,000+ QSOs).

### Table Columns

| Column | Description |
|--------|-------------|
| Date | QSO date (YYYY-MM-DD format) |
| Time | Time on (UTC) |
| Call | Contacted station's callsign |
| Freq | Frequency in MHz |
| Band | Amateur band (e.g., 20m) |
| Mode | Operating mode (SSB, CW, FT8, etc.) |
| RST S | Signal report sent |
| RST R | Signal report received |
| Grid | Maidenhead grid square (if logged) |
| Name | Operator name (if logged) |

Click any column header to sort by that column. Click again to reverse the sort direction. The active sort column shows a ▲ or ▼ indicator.

### Filtering

Use the dropdowns above the table to filter by band or mode. The filter dropdowns are populated automatically from the bands and modes present in your log.

### Stats Bar

The stats bar to the right of the filters shows:
- **QSOs** — Total contact count (after filters)
- **Calls** — Unique callsigns worked
- **DXCC** — Unique DXCC entity prefixes

### Map Markers

When the **Logbook QSOs** map overlay is enabled (via the map gear icon), each QSO with a grid square is plotted on the map:
- **Marker color** — Matches the contact's band using the same color palette as Live Spots
- **Geodesic path** — A curved line from your QTH to the contact's location
- **Popup** — Click a marker to see the callsign, band, mode, date, and grid

### Clearing the Log

Click the **✕** button in the widget header to clear all imported QSOs. This removes the data from IndexedDB permanently.

<div class="tip">Your log never leaves your browser. ADIF files are parsed and stored entirely client-side using IndexedDB — nothing is uploaded to any server.</div>

<div class="warning">Clearing the log is permanent. If you need the data again, re-import the ADIF file from your logging software.</div>
