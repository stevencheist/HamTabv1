# Widgets Reference

HamTab's interface is built from 11 configurable widgets. Each widget can be moved, resized, shown, or hidden to create your ideal layout.

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

Displays live spots in a tabular format with source tabs for POTA, SOTA, DXC, and PSK.

### Source Tabs
Click tabs to switch between data sources:

| Tab | Data Source | Content |
|-----|-------------|---------|
| POTA | Parks on the Air API | Park activations |
| SOTA | SOTA Cluster | Summit activations |
| DXC | DX Cluster | DX spots worldwide |
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
| Purple | PSK report |
| Yellow | Selected spot |

### Overlays
Click the gear icon to toggle map overlays:

- **Lat/Lon Grid** — Geographic coordinate grid
- **Maidenhead Grid** — Ham radio grid squares
- **Timezone** — World timezone boundaries
- **Gray Line** — Day/night terminator

### Geodesic Paths
When you select a spot, a curved line shows the great-circle path from your QTH to the spot's location. This is the shortest path a radio signal would travel.

### Satellite Footprints
If satellites are tracked, their footprints (coverage areas) appear on the map in real-time. Click a satellite marker to select it.

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

## Band Conditions Widget

Global propagation forecast showing conditions by band and region.

### Metrics
Toggle between display modes:
- **MUFD** — Maximum Usable Frequency (Day)
- **SS** — Signal Strength
- **SNR** — Signal-to-Noise Ratio

### Day/Night Toggle
Switch between current conditions and 12-hour forecast.

### Regions
Shows propagation for paths from your location to:
- North America
- South America
- Europe
- Africa
- Asia
- Oceania

### Color Scale
- <span class="color-good">Green</span> — Good propagation
- <span class="color-fair">Yellow</span> — Fair propagation
- <span class="color-poor">Red</span> — Poor/closed

---

## HF Propagation Widget

24-hour propagation prediction matrix showing band reliability by hour.

### Reading the Matrix
- **Rows** — HF bands (80m through 10m)
- **Columns** — Hours (UTC)
- **Colors** — Predicted reliability
- **Border** — Current UTC hour

### Color Scale
- **Black** — Band closed
- **Red** — Poor
- **Yellow** — Fair
- **Green** — Good

### Map Overlay
Click a band row to toggle propagation circles on the map, showing estimated range for that band.

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

### Requirements
N2YO API key must be configured (see Getting Started).

### Tracked Satellites
Default: ISS (International Space Station)

Click the gear icon to add or remove satellites from tracking.

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

Quick reference tables for signal reporting.

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
