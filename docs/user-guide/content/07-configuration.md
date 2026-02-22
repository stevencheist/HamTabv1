# Configuration

All HamTab settings are accessed via the Config panel (gear icon in the top-right corner).

## Personal Information

### Callsign
Your amateur radio callsign. Used for:
- Live Spots widget (showing who receives your signal)
- DX Detail distance/bearing calculations
- Map marker label at your QTH

<div class="tip">Your callsign is stored locally and never transmitted to HamTab servers.</div>

### Location (QTH)

#### GPS
Click "Use GPS" to automatically detect your location.
- Requires HTTPS and browser permission
- Most accurate option
- May not work with self-signed certificates

#### Grid Square
Enter your 4 or 6-character Maidenhead grid (e.g., `FN31` or `FN31pr`).
- Good balance of accuracy and privacy
- Standard for amateur radio location sharing

#### Manual Coordinates
Enter decimal degrees:
- **Latitude**: Positive = North, Negative = South
- **Longitude**: Positive = East, Negative = West
- Example: `41.7128, -73.0060`

### Time Format
- **Local** — Times in your browser's timezone
- **UTC** — Times in Coordinated Universal Time

<div class="tip">UTC is standard in amateur radio. Using UTC eliminates confusion when logging contacts with stations in different timezones.</div>

---

## API Keys

### N2YO API Key
Required for satellite tracking.

1. Visit [n2yo.com/api](https://www.n2yo.com/api/)
2. Create a free account
3. Generate an API key
4. Paste into Config

Without this key, the Satellites widget is disabled.

### Weather Underground API Key
Optional, for enhanced weather data.

1. Visit [wunderground.com/member/api-keys](https://www.wunderground.com/member/api-keys)
2. Create account and generate key
3. Paste into Config

If not provided, weather data comes from National Weather Service (US only).

---

## Display Preferences

### Units
- **Distance**: Miles or Kilometers
- **Temperature**: Fahrenheit or Celsius

### Map Center Mode
- **QTH** — Map stays centered on your location
- **Spot** — Map centers on selected spot

---

## Appearance (Themes)

HamTab includes multiple visual themes to match your operating style and personal taste.

### Changing Themes

1. Click **Config** in the top-left corner
2. Go to the **Appearance** tab
3. Click a theme swatch to preview it — the theme applies instantly
4. Click **OK** to save

### Available Themes

| Theme | Description |
|-------|-------------|
| **Default** | Modern dark theme with blue/magenta accents. Clean and readable. |
| **LCARS** | Inspired by Star Trek: The Next Generation computer displays. Orange, blue, and purple palette with rounded pill-shaped buttons and condensed fonts. |
| **Terminal** | Retro green-on-black CRT style. Monospace fonts, sharp corners, and a utilitarian feel. |
| **HamClock** | Dark background with green, cyan, and amber accents matching the real HamClock by WB0OEW. |
| **Rebel** | Warm desert outpost palette with blazing orange accents and olive green highlights. |
| **Imperial** | Cold steel command deck with ice blue highlights and gunmetal surfaces. |
| **Neon** | Digital grid aesthetic with neon cyan glow effects on widgets, headers, and controls. |
| **Steampunk** | Brass, gears, and gaslight with polished copper accents and aged parchment text. |

<div class="tip">Your theme choice is saved automatically and persists between sessions. You can change it anytime without losing your widget layout or settings.</div>

### Band Colors

Customize the color assigned to each amateur band in the Live Spots widget and map path lines.

1. Open Config → **Appearance** tab
2. Scroll to the **Band Colors** section
3. Click any color swatch to open a color picker
4. Choose a new color — it applies immediately
5. Click **Reset to Defaults** to restore the original band color scheme

Band colors are saved to localStorage and persist across sessions. Custom colors affect:
- **Live Spots** band cards and map path lines
- Any other UI element that uses band-based color coding

---

## Widget Visibility

Check or uncheck widgets to show or hide them:

- [ ] Filters
- [ ] On the Air
- [ ] HamMap
- [ ] Solar
- [ ] Space Weather History
- [ ] Band Conditions
- [ ] HF Propagation
- [ ] Live Spots
- [ ] Lunar / EME
- [ ] Satellites
- [ ] Contests
- [ ] DXpeditions
- [ ] NCDXF Beacons
- [ ] DE/DX Info
- [ ] Reference
- [ ] DX Detail

Hidden widgets can be re-enabled anytime.

### Grid Mode Slot Limits

In grid mode, each permutation has a fixed number of widget slots. The Display tab shows a **slot counter** (e.g., "5 / 6 slots") next to the Widgets heading. When all slots are full, remaining unchecked widgets are greyed out. To enable a hidden widget, first uncheck another to free a slot, or switch to a larger grid permutation.

The HamMap checkbox is locked on in grid mode — the map always occupies the center cell and doesn't count toward the slot limit.

In free-float mode there is no slot limit.

---

## Widget-Specific Settings

Many widgets have their own configuration. Access via the gear icon in each widget's title bar.

### Solar Widget Settings
Show/hide individual fields:
- Solar Flux, Sunspots, A-Index, K-Index (default: shown)
- X-Ray, Signal Noise (default: shown)
- Solar Wind, Bz, Proton Flux, etc. (default: hidden)

### Lunar Widget Settings
Show/hide individual fields:
- Phase, Illumination, Declination, Distance, Path Loss (default: shown)
- Elongation, Ecliptic coordinates, Right Ascension (default: hidden)

### On the Air Column Settings
Per-source column visibility for POTA, SOTA, DXC, PSK tables.

### Live Spots Display Mode
- **Count** — Show number of stations receiving you
- **Distance** — Show distance to farthest receiver

### Satellite Selection
Add or remove satellites from tracking.

---

## Layout Management

### Automatic Layout Save
Widget positions and sizes are automatically saved to localStorage. When you reload, your layout is restored.

### Named Layout Profiles

Save up to 20 named layout profiles and switch between them instantly. Each profile captures your complete layout state: widget positions, visibility, grid/float mode, grid permutation, and grid slot assignments.

#### Saving a Layout

**From the header bar:**
1. Click the **Layouts ▾** button in the top-right corner
2. Click **Save Current...**
3. Type a name (e.g., "Contest Mode", "My DX Setup")
4. Click **Save** or press Enter

**From the Config panel:**
1. Open Config → **Display** tab
2. Scroll to the **Saved Layouts** section
3. Type a name in the input field and click **Save**

#### Loading a Layout

Click any saved layout name in the Layouts dropdown or in Config → Display. Your widget positions, visibility, and grid settings are restored immediately.

#### Deleting a Layout

Click the **×** button next to any layout name to delete it. You'll be asked to confirm.

#### Mobile Access

On mobile devices, tap the hamburger menu (☰) and select **Layouts** to access the layout dropdown.

<div class="tip">Layout profiles work in both free-float and grid mode. When you load a profile saved in grid mode, grid mode activates automatically (and vice versa). This makes it easy to switch between a grid layout for everyday use and a free-float layout for contests.</div>

### Reset Layout
To reset to default layout:
1. Open browser developer tools (F12)
2. Go to Application → Local Storage
3. Delete keys starting with `hamtab_`
4. Reload the page

---

## Config Export/Import

Transfer your HamTab settings between browsers using compressed text codes. This works in both lanmode and hostedmode — no server required.

### Exporting Configuration
1. Open Config → **Data** tab
2. Click **Export Config**
3. A text code appears — click **Copy to Clipboard**
4. Paste the code into the other browser's import field

Exported data includes:
- Callsign and location
- All preferences and filter presets
- Widget visibility and layout positions
- Theme, band colors, and watch lists

**Not included:** API keys (shared via server `.env`), GPS coordinates, migration flags, and mobile tab state. These are device-specific or already shared through other means.

### Importing Configuration
1. Open Config → **Data** tab
2. Click **Import Config**
3. Paste the text code from another browser
4. Click **Apply Import** and confirm
5. The page reloads with the imported settings

<div class="important">Importing replaces all your settings including your callsign. A confirmation dialog appears before applying.</div>

## LAN Config Sync

In lanmode (self-hosted), HamTab can automatically keep settings in sync across all browsers on your local network. This gives you the same "open any browser, same dashboard" experience that HamClock provided.

### Enabling Sync
1. Open Config → **Data** tab
2. The **LAN Sync** section appears automatically if your server supports it
3. Check **Sync across devices**
4. Your settings are pushed to the server whenever you save config

### How It Works
- **Push:** Every time you save settings (click OK in Config), your config is saved to the server under your callsign
- **Pull:** When any browser loads HamTab, it checks for a newer config on the server and applies it automatically
- **Conflict resolution:** Last-write-wins — the most recently saved config takes precedence

### Requirements
- Only available in lanmode (self-hosted installations)
- All browsers must use the same callsign to share settings
- The server stores configs in `data/configs/` as JSON files

<div class="tip">LAN Sync is optional and disabled by default. Your settings continue to work in localStorage even without sync enabled.</div>

---

## localStorage Keys

HamTab stores all data in browser localStorage with the `hamtab_` prefix:

| Key | Content |
|-----|---------|
| `hamtab_callsign` | Your callsign |
| `hamtab_lat` | Latitude |
| `hamtab_lon` | Longitude |
| `hamtab_grid` | Grid square |
| `hamtab_utc` | Time format preference |
| `hamtab_n2yo_key` | N2YO API key |
| `hamtab_wu_key` | Weather Underground key |
| `hamtab_widgets` | Widget visibility |
| `hamtab_widgets_user` | Widget positions/sizes |
| `hamtab_layouts` | Named layout profiles (up to 20) |
| `hamtab_filter_presets` | Saved filter presets |
| `hamtab_solar_fields` | Solar field visibility |
| `hamtab_lunar_fields` | Lunar field visibility |
| `hamtab_tracked_sats` | Tracked satellite IDs |
| `hamtab_theme` | Active theme ID (default, lcars, hamclock, etc.) |
| `hamtab_band_colors` | Custom band color overrides |

### Clearing All Data
To completely reset HamTab:
1. Open browser developer tools
2. Console: `localStorage.clear()`
3. Reload the page

Or use your browser's "Clear site data" feature.

---

## Community

### Discord Server

HamTab has a community Discord server for discussing features, reporting bugs, and general amateur radio topics. Access it two ways:

- **Header bar** — Click the Discord logo button (next to the Buy Me a Coffee button)
- **Feedback modal** — The feedback form includes a link to the Discord server

The Discord server also has a `#releases` channel that automatically posts release notes whenever a new version is published.

<div class="tip">The Discord server is optional. HamTab works identically whether or not you join the community.</div>

---

## Privacy

### Data Stored Locally
All personal data stays in your browser:
- Callsign
- Location
- API keys
- Preferences

### Data Never Transmitted
HamTab never sends your personal information to its servers. External API calls are proxied, protecting your IP address.

### GDPR Compliance
- No tracking or analytics
- No cookies (localStorage only)
- You control all your data
- Export/delete anytime
