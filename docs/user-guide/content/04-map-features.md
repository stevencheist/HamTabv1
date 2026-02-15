# Map Features

The HamMap widget is an interactive Leaflet-based map with multiple layers and overlays designed for amateur radio use.

## Base Map

The default base map uses OpenStreetMap tiles. The map supports standard interactions:
- **Zoom** — Mouse wheel, pinch gesture, or +/- buttons
- **Pan** — Click and drag
- **Double-click** — Zoom in on clicked location
- **Fullscreen** — Click the ⛶ button in the map header to expand the map to fill the entire viewport. Click ✕ or press Escape to exit fullscreen.

## Marker Types

### Your QTH (Home Location)
- **Color**: Blue
- **Shape**: Circle marker
- **Label**: Your callsign (if set)
- Shows your configured location from Config

### POTA Activations
- **Color**: Green
- **Shape**: Circle marker
- Click to select and view park details

### SOTA Activations
- **Color**: Orange
- **Shape**: Circle marker
- Click to select and view summit details

### DX Cluster Spots
- **Color**: Red
- **Shape**: Circle marker
- Click to select and view DX station details

### WWFF Activations
- **Color**: Teal
- **Shape**: Circle marker
- Click to select and view flora & fauna reserve details

### PSKReporter Spots
- **Color**: Purple
- **Shape**: Circle marker
- Click to select and view digital mode report details

### Selected Spot
- **Color**: Yellow/Gold highlight
- Currently selected spot is highlighted
- Geodesic path drawn from your QTH

### Satellite Positions
- **Shape**: Satellite icon
- Shows real-time position of tracked satellites
- Click to select and view pass information

## Map Overlays

Access overlay controls via the gear icon in the HamMap widget title bar.

### Latitude/Longitude Grid
Displays geographic coordinate lines at regular intervals. Useful for referencing positions by decimal degrees.

### Maidenhead Grid
Displays the amateur radio grid square overlay. Grid squares are labeled with their 2 or 4-character designators (e.g., FN31).

<div class="tip">Maidenhead grid squares are essential for VHF/UHF contesting and grid chasing.</div>

### Timezone Overlay
Shows world timezone boundaries. Helpful for determining local time at DX stations.

### MUF Map Overlay
A full-map image overlay showing real-time Maximum Usable Frequency conditions from [prop.kc2g.com](https://prop.kc2g.com/). The overlay renders a color-filled map of worldwide MUF values, giving you an at-a-glance view of which parts of the world currently support HF propagation on which frequencies.

- **Toggle:** Map gear icon → "MUF Map (prop.kc2g.com)" checkbox
- **Auto-refresh:** Updates every 15 minutes
- **Respects propagation metric:** Shows MUF or foF2 depending on your current propagation overlay selection
- **Semi-transparent:** Overlaid at 45% opacity so you can still see spot markers and map details underneath

<div class="tip">The MUF image overlay complements the contour lines. Contours show precise MHz values along lines; the MUF image overlay fills the entire map with color so you can see regional patterns at a glance.</div>

### Tropics & Arctic Lines
Draws five major latitude circles on the map with colored, labeled lines:
- **Arctic Circle** (66.5°N) — light blue dashed line
- **Tropic of Cancer** (23.4°N) — warm orange dashed line
- **Equator** (0°) — yellow solid line
- **Tropic of Capricorn** (23.4°S) — warm orange dashed line
- **Antarctic Circle** (66.5°S) — light blue dashed line

Labels automatically reposition as you pan the map. These lines are useful for understanding propagation paths relative to the sun's declination range.

### Weather Radar
A global precipitation overlay using data from [RainViewer](https://www.rainviewer.com/). Shows current radar returns as a semi-transparent tile layer over the map.

- **Toggle:** Map gear icon → "Weather Radar" checkbox
- **Auto-refresh:** Updates every 5 minutes with the latest radar frame
- **Semi-transparent:** Overlaid at 35% opacity so map details remain visible
- **Free service:** No API key required

<div class="tip">Weather radar can help you anticipate local noise levels and plan around storms that affect VHF/UHF propagation.</div>

### Map Legend
A compact panel in the bottom-right corner showing what each marker and line color represents on the map. Includes:
- Spot source markers (POTA, SOTA, DX Cluster, WWFF, PSKReporter)
- DXpedition markers (active and upcoming)
- Sun and moon sub-points
- Gray line and geodesic path lines
- NCDXF beacon markers

Toggle via the map gear icon → "Map Legend" checkbox.

### Gray Line (Day/Night Terminator)
Shows the current position of the day/night boundary on Earth. The gray line is the region transitioning between day and night.

<div class="tip">Gray line propagation can enable long-distance contacts on lower HF bands as signals follow the terminator around the Earth.</div>

## Geodesic Paths

When you select a spot, HamTab draws a **geodesic path** (great-circle line) from your QTH to the spot's location.

### What is a Geodesic Path?
A geodesic path is the shortest distance between two points on a sphere. On a flat map projection, this appears as a curved line, but it represents the actual shortest path a radio signal travels.

### Path Information
The path color matches the spot source (green for POTA, orange for SOTA, etc.). The DX Detail widget shows:
- **Distance** — Great-circle distance in miles or kilometers
- **Bearing** — Initial compass heading from your QTH

## Satellite Features

### Real-Time Position
Tracked satellites show their current position updated every few seconds. The satellite icon moves across the map in real-time.

### Footprint Circles
Each satellite displays its "footprint" — the circular area on Earth that can currently see (and potentially communicate with) the satellite. If you're inside the footprint circle, the satellite is above your horizon.

### ISS Orbit Path
The ISS displays a dashed cyan line showing its predicted ground track for one full orbit (~92 minutes). The line starts slightly behind the ISS's current position (showing where it just was) and extends forward through the rest of the orbit. The path updates every 10 seconds and wraps correctly across the international date line.

## Live Spots Paths

When you enable a band in the Live Spots widget, the map displays geodesic paths from your QTH to each station receiving your signal on that band.

### Band Colors
Each band uses a distinct color for its paths, making it easy to see propagation patterns across multiple bands simultaneously.

## HF Propagation Circles

When you click a band row in the HF Propagation widget, the map displays estimated propagation range circles centered on your QTH.

These circles represent:
- **Inner circle** — Near skip zone (signals skip over this area)
- **Outer circle** — Maximum estimated range based on current conditions

<div class="warning">Propagation circles are estimates based on general conditions. Actual propagation varies with solar activity, time of day, and path geometry.</div>

## Map Center Modes

Use the buttons in the map header (QTH / PM / DX / CTY) to control centering:

### QTH Mode
Map centers on your home location. Best for:
- Monitoring nearby activations
- Planning which spots are in easy reach
- Seeing your local propagation environment

### PM Mode
Map centers on the Prime Meridian at zoom level 2, showing the whole world. Best for:
- Getting a global overview of activity
- Seeing worldwide propagation patterns

### DX (Spot) Mode
Map centers on the currently selected spot. Best for:
- Examining spot details
- Seeing the spot's geographic context
- Planning antenna headings

### CTY (Country) Mode
Map zooms to fit your country's boundaries. Your country is determined automatically from your QTH location. Best for:
- Seeing all activity within your country at a glance
- Focusing on domestic activations
- Quick overview of nearby parks and summits

For large countries like the USA, the map intelligently selects the right sub-region — contiguous 48 states, Alaska, or Hawaii — based on where you are. Small countries are capped at zoom level 10 to prevent over-zoom.

## Performance Tips

- **Reduce overlays** — Disable unused overlays for smoother performance
- **Limit satellites** — Track only satellites you're actively interested in
- **Filter spots** — Use filters to reduce marker count on busy bands
- **Zoom appropriately** — Very wide zoom with many markers can slow rendering
