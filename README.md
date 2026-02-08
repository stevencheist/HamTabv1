# HamTab

A free, modern amateur radio dashboard and [HamClock](https://www.clearskyinstitute.com/ham/HamClock/) alternative. Displays live POTA, SOTA, DX Cluster, and PSKReporter spots on an interactive map with VOACAP propagation predictions, HF band conditions, space weather, satellite tracking, contests, DXpeditions, NCDXF beacons, weather, and lunar/EME data — all in a customizable, themeable widget layout.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![Express](https://img.shields.io/badge/Express-4.x-blue) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

### Spots & Activations
- **On the Air** — Real-time POTA, SOTA, DX Cluster, and PSKReporter spots with source tabs, filtering by band, mode, country, US state, and Maidenhead grid square
- **Live Spots** — See where your signal is being received via PSKReporter — band cards show spot count or farthest distance per band with visual map lines
- **DX Detail** — Detailed view of a selected spot with callsign info, frequency, distance/bearing, and QRZ link

### Map & Overlays
- **Interactive Map** — Leaflet map with clustered markers for POTA, SOTA, DX Cluster, and PSKReporter spots, dark tiles, and clickable popups with QRZ callsign links
- **Map Center Controls** — Quick buttons to center on your QTH, prime meridian, or selected spot
- **Day/Night Terminator** — Gray line overlay showing the solar terminator with a subtle daylight tint on the illuminated hemisphere
- **Propagation Contours** — MUF and foF2 HF propagation overlays on the map from prop.kc2g.com
- **Map Overlays** — Toggleable lat/lon grid, Maidenhead grid squares, and timezone lines via map gear icon
- **Satellite Tracking** — Real-time positions for ISS, SO-50, TEVEL, and custom satellites via N2YO with orbital ground tracks and radio footprint circles

### Propagation & Space Weather
- **Solar Indices** — Solar flux, sunspot number, A/K indices, X-ray flux, and signal noise level with 18 configurable fields
- **HF Band Conditions** — Day/night conditions for 80m through 10m displayed in the header
- **VOACAP DE→DX** — 24-hour propagation prediction grid with adjustable power (5W/100W/1kW), mode (CW/SSB/FT8), and path (short/long). Uses the Voice of America Coverage Analysis Program engine with automatic simplified fallback
- **Space Weather History** — Historical graphs for Kp index, X-ray flux, SFI, solar wind speed, and Bz over the past week (90 days for SFI)

### DX & Contesting
- **Contests** — Active and upcoming contest calendar from WA7BNM with mode badges (CW/Phone/Digital) and links to contest rules
- **DXpeditions** — Active and upcoming DXpedition tracker from NG3K with callsign, DXCC entity, operating dates, and QSL info
- **NCDXF Beacons** — Real-time NCDXF/IARU International Beacon Project display — 18 synchronized worldwide beacons on 5 HF frequencies with 3-minute cycle countdown timer

### Station Info
- **DE/DX Info** — Side-by-side display of your station (DE) and selected DX station showing callsign, grid square, coordinates, sunrise/sunset, bearing, distance, and frequency
- **Lunar / EME** — Moon phase, illumination, declination, distance, and relative path loss for EME operators with 9 configurable fields
- **Weather Conditions** — Local weather from Weather Underground (PWS key) or NWS as automatic fallback; source badge shows which is active
- **Weather Backgrounds** — Clock widget background gradient reflects current conditions (clear, cloudy, rain, snow, thunderstorm, fog) with day/night variants
- **NWS Weather Alerts** — Severity-colored alert badge on local clock; click to view active alerts with headlines, descriptions, and NWS links

### Reference & Tools
- **Reference Tabs** — Five built-in reference tabs: RST signal reports, NATO phonetic alphabet, Morse code with prosigns, Q-codes, and band plan privileges by license class
- **License Privilege Filter** — For US callsigns, filter spots to only show frequencies and modes your license class allows
- **Filters** — Dedicated filter widget for band, mode, country, state, grid, distance, spot age, license privilege, and propagation quality filtering

### Customization
- **Themes** — Four built-in visual themes: Default (dark), LCARS (Star Trek TNG), Terminal (retro green), and HamClock (WB0OEW-inspired with political map tiles)
- **Widget Layout** — All panels are draggable and resizable with snap-to-edge, persisted across sessions
- **Grid Layout Mode** — Alternative to free-float with 5 grid permutations for organized widget arrangements
- **Clock Styles** — Digital or analog clock face for both Local Time and UTC widgets
- **Day/Night Indicator** — SVG sun/moon graphic on clock widgets based on computed sunrise/sunset

### Community
- **Discord** — [Join the HamTab Discord](https://discord.gg/GcX9cHtT) for release notes, community discussion, feature requests, and support. Discord icon in the header links directly to the server.

### System
- **Operator Identity** — Callsign prompt at startup with geolocation and Maidenhead grid square display
- **Feedback System** — In-app feedback with encrypted email submission and privacy notice
- **Configuration Export/Import** — Export and import all settings for backup or migration
- **Auto-Update** — (Lanmode) Server checks for updates at a configurable interval and can apply them with one click
- **Help System** — Every widget has a help button (?) with description, usage guide, and tips

---

## Installation

> **Important:** HamTab uses the `lanmode` branch for self-hosted installations. The `main` branch contains shared code only — it does not include the install scripts, self-signed TLS, or update checker. Always checkout `lanmode` after cloning.

### macOS

**Prerequisites:** Node.js 18+ and Git. Python 3.11+ optional for VOACAP propagation.

```bash
# Install Node.js via Homebrew
brew install node

# Or via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install 20

# Git (if not already installed)
xcode-select --install

# Optional: Python for full VOACAP propagation (see VOACAP section below)
brew install python@3.12
```

**Install and run:**

```bash
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout lanmode
npm install
npm start
```

Open **http://localhost:3000** in your browser.

### Linux (Debian / Ubuntu)

**Prerequisites:**

```bash
# Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Optional: Python 3.11+ for full VOACAP propagation (see VOACAP section below)
sudo apt-get install -y python3 python3-pip python3-numpy
```

Or via nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
sudo apt-get install -y git
```

**Install and run:**

```bash
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout lanmode
npm install
npm start
```

> For automatic startup as a service, see [Automated Install](#linux--raspberry-pi-automated-install) below.

### Linux (Fedora / RHEL)

```bash
sudo dnf install nodejs git python3 python3-pip python3-numpy  # python3 optional, for VOACAP
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout lanmode
npm install
npm start
```

> For automatic startup as a service, see [Automated Install](#linux--raspberry-pi-automated-install) below.

### Linux / Raspberry Pi (Automated Install)

The included install script handles everything: installs Node.js if needed, copies the app to `/opt/hamtab`, configures ports and Weather Underground, and optionally sets up a systemd service for boot-start with automatic crash recovery. Works on any systemd-based Linux distribution including Raspberry Pi OS, Debian, Ubuntu, and Fedora.

```bash
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout lanmode
sudo bash install.sh
```

The installer will prompt you to:

1. **Ports** — Choose HTTP and HTTPS ports (defaults: 3000 and 3443)
2. **Weather Underground** — Choose whether to use WU for weather data, and enter your API key (or add it later via the Config screen in the browser)
3. **Start on boot** — If yes, installs a systemd service that starts HamTab automatically and restarts on failure

After install, the app runs from `/opt/hamtab`. For full VOACAP propagation predictions, see [VOACAP Propagation Setup](#voacap-propagation-setup-optional) — this is optional but recommended.

Manage with:

```bash
sudo systemctl status hamtab      # check status
sudo journalctl -u hamtab -f      # tail logs
sudo systemctl restart hamtab     # restart
sudo systemctl stop hamtab        # stop
```

To reinstall or update, pull the latest code and re-run the installer:

```bash
cd ~/HamTabv1
git pull
sudo bash install.sh
```

**Uninstall:**

```bash
sudo bash /opt/hamtab/uninstall.sh
```

This stops the service, offers to back up your `.env` file, and removes the install directory.

> **Note:** The WU API key can also be set from the Config splash screen in the browser — it saves directly to the server's `.env` file so all LAN clients share it.

### Windows

**Prerequisites:**

- Download Node.js LTS from [nodejs.org](https://nodejs.org/), or:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
- Download Git from [git-scm.com](https://git-scm.com/download/win), or:
  ```powershell
  winget install Git.Git
  ```

**Install and run (Command Prompt or PowerShell):**

```powershell
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout lanmode
npm install
npm start
```

### Windows (Run as a Service)

To run HamTab as a Windows service that starts automatically on boot, use the included PowerShell installer. It uses [NSSM](https://nssm.cc/) (downloaded automatically) to register HamTab as a service.

**Prerequisites:** Node.js, Git, PowerShell (run as Administrator).

```powershell
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout lanmode
powershell -ExecutionPolicy Bypass -File install.ps1
```

The installer will:
1. Download NSSM if not already present (saved to `tools\nssm\`)
2. Prompt for HTTP and HTTPS ports (defaults: 3000 and 3443)
3. Prompt for a Weather Underground API key (optional)
4. Run `npm install` and `npm run build`
5. Register and start the HamTab service

**Management commands:**

```powershell
.\tools\nssm\nssm.exe status HamTab     # check status
.\tools\nssm\nssm.exe restart HamTab    # restart
.\tools\nssm\nssm.exe stop HamTab       # stop
.\tools\nssm\nssm.exe start HamTab      # start
```

**Logs:** `logs\hamtab.log`

**Uninstall:**

```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

### Windows (WSL2)

If running inside WSL2, follow the Linux instructions above to install inside your WSL distribution. See [WSL2 Setup](#wsl2-setup) below for network access from Windows and LAN devices.

### After Installation

On first startup the server auto-generates a self-signed TLS certificate (saved to `certs/`). Two servers start:

- **HTTP** on port 3000 (default) — for localhost/desktop use
- **HTTPS** on port 3443 (default) — for LAN/mobile access (required for GPS geolocation)

These ports are configurable during install or by editing the `.env` file (`PORT` and `HTTPS_PORT`).

Open **http://localhost:3000** and you'll be prompted to configure your callsign and location.

> **Mobile / tablet access:** Browsers require HTTPS for the Geolocation API. From other devices on your LAN, use `https://<your-LAN-IP>:3443` and accept the self-signed certificate warning.

---

## VOACAP Propagation Setup (Optional)

HamTab includes a real HF propagation prediction engine powered by [dvoacap-python](https://github.com/skyelaird/dvoacap-python). When available, it provides accurate 24-hour band reliability predictions, REL heatmap overlays, and circle range overlays on the map. **Without Python, HamTab still works** — it falls back to a simplified server-side propagation model with less accuracy.

### Prerequisites

**Python 3.11 or higher** is required. dvoacap-python will not work with older Python versions.

Check your Python version:

```bash
python3 --version
```

If you don't have Python 3.11+, install it:

- **Ubuntu/Debian:**
  ```bash
  sudo apt update
  sudo apt install python3 python3-pip python3-numpy
  ```
  On older Ubuntu releases (22.04 and earlier), the system Python may be too old. Use the deadsnakes PPA:
  ```bash
  sudo add-apt-repository ppa:deadsnakes/ppa
  sudo apt update
  sudo apt install python3.12 python3.12-venv python3.12-dev
  ```

- **Fedora/RHEL:**
  ```bash
  sudo dnf install python3 python3-pip python3-numpy
  ```

- **macOS:**
  ```bash
  brew install python@3.12
  ```

- **Windows:**
  Download from [python.org](https://www.python.org/downloads/) (check "Add to PATH" during install)

- **Raspberry Pi OS (Bookworm):**
  ```bash
  sudo apt install python3 python3-pip python3-numpy
  ```
  Bookworm ships Python 3.11 by default. Older Raspberry Pi OS (Bullseye) ships 3.9 — you'll need to build from source or use the simplified fallback model.

### Install dvoacap-python

```bash
# Clone the dvoacap-python repository
git clone https://github.com/skyelaird/dvoacap-python.git
cd dvoacap-python

# Install (core library only — HamTab doesn't need the dashboard)
pip install -e .
```

> **Note:** If `pip install` warns about packages being installed to a user directory (e.g. `~/.local/lib/python3.12/site-packages`), that's normal. HamTab's VOACAP bridge automatically adds the user site-packages directory to `PYTHONPATH` based on the detected Python version.

If you get a "pip not found" or "externally-managed-environment" error (common on newer Ubuntu/Debian):

```bash
# Option A: Use --user flag (recommended for lanmode)
pip install --user -e .

# Option B: Use --break-system-packages (if you know what you're doing)
pip install --break-system-packages -e .

# Option C: Use a venv (most isolated)
python3 -m venv ~/hamtab-venv
source ~/hamtab-venv/bin/activate
pip install -e .
```

If using a venv (Option C), you'll need to ensure the venv's Python is in PATH when HamTab starts. The simplest way is to activate the venv before running `npm start`, or set the `PATH` in your `.env` file.

### Verify Installation

After installing dvoacap-python, restart HamTab and check the server logs:

```bash
npm start
```

You should see:

```
[VOACAP] dvoacap-python engine ready
```

If Python or dvoacap isn't found, you'll see:

```
[VOACAP] Python not found — using simplified propagation model
```

You can also check the VOACAP status endpoint:

```bash
curl http://localhost:3000/api/voacap/status
```

This returns a JSON object showing whether the engine is available, spawn attempts, and any errors.

### Troubleshooting VOACAP

- **"dvoacap-python not installed"** — The Python process started but couldn't import dvoacap. Make sure you ran `pip install -e .` in the dvoacap-python directory and that the install completed without errors.

- **"Python not found"** — No Python 3.11+ executable was found. The bridge tries `python3.13`, `python3.12`, `python3.11`, `python3`, and `python` in order. Verify one of these is in your PATH with `which python3`.

- **"Python not available after 5 minutes"** — Python was found but the worker didn't respond in time. This can happen if numpy is very slow to import (first run on Raspberry Pi). Try running `python3 -c "import numpy"` to pre-compile numpy, then restart HamTab.

- **Import errors for numpy** — Install numpy separately: `pip install numpy` (or `sudo apt install python3-numpy` on Debian/Ubuntu).

- **PYTHONPATH issues** — If you installed dvoacap with `pip install --user`, the packages go to `~/.local/lib/pythonX.Y/site-packages`. The bridge auto-detects this for versioned Python executables (e.g. `python3.12`). If you're using a generic `python3` that's actually 3.12, you may need to set `PYTHONPATH` manually in your `.env`:
  ```
  PYTHONPATH=/home/youruser/.local/lib/python3.12/site-packages
  ```

- **Simplified model is fine** — If you can't get Python working, HamTab's built-in simplified propagation model still provides reasonable band condition estimates. The main differences: dvoacap uses the full VOACAP ionospheric model with ITU coefficients, while the simplified model uses basic MUF geometry. Both respond to solar cycle (SSN) and time of day.

---

## Configuration

On first launch (or any time you click the **Config** button in the header), a configuration dialog appears with the following options.

### Callsign

Your amateur radio callsign. Displayed in the header and used as the label on your map marker. For US callsigns, HamTab automatically looks up your license class to enable the privilege filter.

### Location

Your QTH coordinates, used for map centering, distance/bearing to spots, weather data, and sunrise/sunset calculations.

- **Lat / Lon** — Enter coordinates manually
- **Grid Square** — Type a Maidenhead grid square (with autocomplete); lat/lon will be calculated from it
- **Use GPS** — Request browser geolocation (requires HTTPS on mobile)

### Time Format

Choose **12-hour** or **24-hour** display for both clock widgets.

### Weather Station (optional)

- **Station ID** — A [Weather Underground](https://www.wunderground.com/) Personal Weather Station ID (e.g., `KCTBRIDG45`)
- **WU API Key** — A free API key from [wunderground.com/member/api-keys](https://www.wunderground.com/member/api-keys)

If both are provided, weather data comes from your chosen WU station. If left blank, weather data automatically falls back to the **National Weather Service** API using your lat/lon — no key required (US locations only).

### Theme

Choose from built-in themes: **Default** (dark), **LCARS** (Star Trek TNG-inspired), **Terminal** (retro green CRT), or **HamClock** (familiar to HamClock users). Themes swap CSS variables for colors, borders, and shapes.

### Layout Mode

- **Float** (default) — Free-floating widgets that you drag and resize anywhere
- **Grid** — Structured CSS Grid layout with map locked in the center. Choose a permutation (2L-2R, 3L-3R, etc.) to set how many widget cells surround the map. Drag widgets between cells to swap positions. Use flex handles between widgets to resize vertically, and track handles on column borders to resize horizontally.

### Widgets

Toggle each widget on or off:
- Local Time
- UTC
- Filters
- On the Air
- HamMap
- Solar & Propagation
- Space Weather History
- Band Conditions
- VOACAP DE→DX
- Live Spots
- Lunar / EME
- Satellites
- Reference
- DX Detail
- Contests
- DXpeditions
- NCDXF Beacons
- DE/DX Info

### Update Check Interval

How often the server checks for new commits on the remote git repository: 60 seconds, 15 minutes, 60 minutes, 6 hours, or 24 hours.

---

## Widgets

All widgets can be **dragged** by their header bar and **resized** by the handle in the bottom-right corner. Positions and sizes are saved in your browser and persist across sessions. Click **Reset Layout** in the header to restore the default arrangement.

### Local Time

Displays your local time, day, date, and year.

| Option | Description |
|--------|-------------|
| **Clock style** | Click the gear icon to switch between **digital** (text) and **analog** (clock face) display |
| **Day/night indicator** | SVG sun or moon icon in the top-right corner, based on sunrise/sunset at your location |
| **Weather display** | Current conditions shown below the clock — temperature, forecast, wind, humidity |
| **Weather background** | Background gradient changes based on current conditions (clear, partly cloudy, cloudy, rain, thunderstorm, snow, fog) with day/night variants |
| **Weather source badge** | Small **WU** (green) or **NWS** (blue) badge in the bottom-right shows which weather source is active |
| **Alert badge** | When NWS weather alerts are active for your area, a warning icon appears in the top-left corner. Color indicates severity: red pulsing = Extreme/Severe, yellow = Moderate, dim = Minor. Click it to view alert details with a link to the NWS website. |

### UTC

Displays UTC time, day, date, and year. Shares the same clock style setting as Local Time.

| Option | Description |
|--------|-------------|
| **Clock style** | Digital or analog (shared setting with Local Time) |
| **Day/night indicator** | SVG sun/moon icon based on your location's sunrise/sunset |

### On the Air

Real-time spots from four data sources.

**Source tabs** — Switch between POTA, SOTA, DXC (DX Cluster), and PSK (PSKReporter). Active tab is saved across sessions.

| Source | Data | Columns |
|--------|------|---------|
| **POTA** | Parks on the Air activator spots | Callsign, Freq, Mode, Ref, Park Name, Time |
| **SOTA** | Summits on the Air spots | Callsign, Freq, Mode, Ref, Summit, Time |
| **DXC** | DX Cluster worldwide spots | Callsign, Freq, Mode, DX, Distance, Age |
| **PSK** | PSKReporter digital mode reports | TX Call, Freq, Mode, RX Call, SNR, Grid |

Callsign columns link to QRZ. Hover for name/address/class tooltip.

Click any row to fly to that spot on the map. The selected spot is highlighted in the table and on the map with an orange marker. Filters are controlled from the separate Filters widget.

### HamMap

Interactive Leaflet map with dark tiles showing activation markers, your QTH, satellite positions, propagation overlays, VOACAP coverage, and the gray line terminator. Tiles automatically switch to CARTO Voyager (political) in HamClock theme.

**Map center controls** (buttons in the header):

| Button | Description |
|--------|-------------|
| **QTH** | Center on your location (zoom 6) |
| **PM** | Center on the prime meridian (zoom 2) |
| **Spot** | Auto-center on the selected spot when you click a table row (zoom 5) |

**Propagation overlay controls** (buttons in the header):

| Button | Description |
|--------|-------------|
| **Prop Off** | No propagation overlay |
| **MUF** | Maximum Usable Frequency contours (from prop.kc2g.com) |
| **foF2** | F2 layer critical frequency contours |

**Map features:**

| Feature | Description |
|---------|-------------|
| **Spot markers** | Clustered markers for all visible POTA/SOTA/DXC/PSK spots. Click for popup with callsign (QRZ link), frequency, reference, distance/bearing from your QTH |
| **Your QTH** | Lightning bolt marker with your callsign at your location |
| **Satellites** | Real-time positions for ISS, amateur radio satellites, and custom NORAD IDs via N2YO. Orbital ground tracks and radio footprint circles |
| **Gray line** | Day/night terminator overlay showing the solar terminator boundary |
| **Propagation contours** | Color-coded MHz contour lines when MUF or foF2 is enabled |
| **VOACAP overlays** | Circle and heatmap overlays showing propagation reach from your QTH |
| **Lat/lon grid** | Toggleable coordinate grid overlay |
| **Maidenhead grid** | Toggleable grid square boundaries overlay |
| **Timezone lines** | Toggleable UTC timezone boundary overlay |

### Solar & Propagation

Solar indices and HF propagation data. Click the gear icon to choose which fields are shown.

**Available fields:**

| Field | Unit | Default | Color coding |
|-------|------|---------|--------------|
| Solar Flux (SFI) | — | Shown | — |
| Sunspots | — | Shown | — |
| A-Index | — | Shown | Green < 20, Yellow < 50, Red ≥ 50 |
| K-Index | — | Shown | Green ≤ 2, Yellow ≤ 4, Red > 4 |
| X-Ray | — | Shown | — |
| Signal Noise | — | Shown | — |
| Solar Wind | km/s | Hidden | Green < 400, Yellow < 600, Red ≥ 600 |
| Bz IMF | nT | Hidden | Green ≥ 0, Yellow > −10, Red ≤ −10 |
| Proton Flux | — | Hidden | — |
| Electron Flux | — | Hidden | — |
| Aurora | — | Hidden | Green ≤ 3, Yellow ≤ 6, Red > 6 |
| Aurora Latitude | ° | Hidden | — |
| He 10830Å | — | Hidden | — |
| Geomag Field | — | Hidden | Green = quiet, Yellow = unsettled/active, Red = storm |
| K-Index Night | — | Hidden | — |
| MUF | MHz | Hidden | — |
| foF2 | MHz | Hidden | — |
| MUF Factor | — | Hidden | — |

### Lunar / EME

Moon data for EME (Earth-Moon-Earth) operators. Click the gear icon to choose which fields are shown.

**Available fields:**

| Field | Unit | Default | Color coding |
|-------|------|---------|--------------|
| Phase | text | Shown | — |
| Illumination | % | Shown | — |
| Declination | ° | Shown | Green < 15, Yellow < 25, Red ≥ 25 |
| Distance | km | Shown | — |
| Path Loss | dB | Shown | Green < −0.5, Yellow < 0.5, Red ≥ 0.5 |
| Elongation | ° | Hidden | — |
| Ecliptic Longitude | ° | Hidden | — |
| Ecliptic Latitude | ° | Hidden | — |
| Right Ascension | ° | Hidden | — |

### VOACAP DE→DX

24-hour propagation prediction between your station and a DX target. Uses the Voice of America Coverage Analysis Program (VOACAP) engine when available, with an automatic simplified model fallback.

| Control | Description |
|---------|-------------|
| **Power** | Transmit power: 5W, 100W, or 1kW |
| **Mode** | Operating mode: CW, SSB, or FT8 (sets SNR thresholds) |
| **Path** | Short path or long path propagation |
| **Target** | Click a spot to predict propagation, or use overview mode for general coverage |

The 24-hour grid shows predicted signal reliability for each UTC hour. Colors range from green (reliable) through yellow to red (poor). An "(sim)" label indicates the simplified fallback model is in use.

### Space Weather History

Historical space weather data graphed over time. Switch between tabs:

| Tab | Data | Period |
|-----|------|--------|
| **Kp** | Geomagnetic Kp index | 7 days |
| **X-Ray** | GOES X-ray flux | 7 days |
| **SFI** | Solar Flux Index (10.7 cm) | 90 days |
| **Wind** | Solar wind speed | 7 days |
| **Bz** | IMF Bz component | 7 days |

### Live Spots

Shows where your signal is being received via PSKReporter. Requires your callsign to be configured.

Band cards display either the number of spots or the farthest reception distance per band. Click a band card to see individual spots on the map with lines from your QTH to each receiving station.

### Satellites

Real-time satellite tracking via N2YO. Shows satellite positions on the map with orbital ground tracks and radio footprint circles.

Default satellites include ISS, SO-50, and TEVEL series. Add custom satellites by NORAD catalog number in the config. Requires a free N2YO API key.

### Contests

Active and upcoming amateur radio contests from the WA7BNM Contest Calendar. Each entry shows the contest name, dates, mode badges (CW/Phone/Digital), and a link to the contest rules.

### DXpeditions

Active and upcoming DXpeditions from the NG3K DX Operations Calendar. Shows callsign, DXCC entity/location, operating dates, bands, and QSL information.

### NCDXF Beacons

Real-time display of the NCDXF/IARU International Beacon Project. Eighteen synchronized worldwide beacons transmit sequentially on five HF frequencies (14.1, 18.11, 21.15, 24.93, 28.2 MHz) in a 3-minute cycle. A countdown timer shows which beacon is currently transmitting on each frequency.

### DE/DX Info

Side-by-side display of your station (DE) and a selected DX station. Each panel shows:

- Callsign and grid square
- Latitude/longitude with cardinal directions (e.g., "33N 98W")
- Sunrise/sunset times with countdown ("R in 3:42" / "S 5:00 ago")
- Distance and bearing between stations

Click any spot to populate the DX panel.

### DX Detail

Detailed information about the currently selected spot, including callsign lookup data, frequency, mode, reference, and a QRZ link.

### Filters

Dedicated filter controls for the On the Air widget. Available filters depend on the active source tab:

| Filter | Sources | Description |
|--------|---------|-------------|
| Band | All | Filter by amateur band (160m through 2m) |
| Mode | All | Filter by mode (CW, SSB, FM, FT8, etc.) |
| Country | POTA, DXC | Filter by DXCC entity prefix |
| State | POTA | Filter by US state |
| Grid | POTA | Filter by 4-character Maidenhead grid square |
| My privileges | POTA | US callsigns — hides spots outside your license class privileges |
| Propagation | All | Hides spots on HF bands with poor predicted propagation (below 30% reliability) |

### Reference

Five tabbed reference panels:

| Tab | Content |
|-----|---------|
| **RST** | Signal report codes for readability, strength, and tone |
| **Phonetic** | NATO phonetic alphabet (Alpha, Bravo, Charlie...) |
| **Morse** | CW characters and prosigns with dit/dah patterns |
| **Q-Codes** | Common Q-code abbreviations and meanings |
| **Bands** | US amateur band plan with privileges by license class and "My privileges only" filter |

---

## Header Bar

The header bar shows your callsign, band conditions, and global controls.

### Operator Info (left)

- **Callsign** — Links to your QRZ page. License class shown if US callsign.
- **Name** — Looked up from callook.info
- **Location** — Lat/lon and Maidenhead grid square
- **Config** — Opens the configuration dialog (General, Appearance, Widgets, Data Sources tabs)
- **Loc** — Refreshes your geolocation

### Band Conditions (center)

Four band groups showing day/night HF conditions from HamQSL solar data:

- 80m–40m
- 30m–20m
- 17m–15m
- 12m–10m

Color coded: **Good** (green), **Fair** (yellow), **Poor** (red).

### Controls (right)

| Control | Description |
|---------|-------------|
| **Last updated** | Timestamp of the most recent data refresh |
| **Countdown** | Seconds until next auto-refresh |
| **Auto-refresh** | Checkbox to enable/disable automatic 60-second refresh |
| **Refresh** | Manual refresh of all data |
| **Reset Layout** | Restore default widget positions and sizes |
| **Fullscreen** | Toggle browser fullscreen mode |
| **Feedback** | Open the feedback form to report issues or suggest features |
| **Discord** | Join the HamTab Discord community (opens invite link) |
| **Update indicator** | (Lanmode) Shows whether an update is available. Green dot = update ready (click to apply). Restart button appears when server files changed. |
| **Mode badge** | Shows current deployment mode (Lanmode or Hostedmode) and version |

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [Express](https://expressjs.com/) | ^4.21.0 | HTTP server and API proxy |
| [helmet](https://helmetjs.github.io/) | ^8.x | Security headers and CSP |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | ^8.x | API rate limiting (60 req/min) |
| [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) | ^5.x | Solar/DXpedition/contest XML parsing |
| [dotenv](https://github.com/motdotla/dotenv) | ^17.x | Environment variable configuration |
| [satellite.js](https://github.com/shashwatak/satellite-js) | ^6.x | SGP4/SDP4 satellite orbit propagation |
| [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) | ^5.x | API documentation UI at `/api/docs` |
| [yamljs](https://github.com/jeremyfa/yaml.js) | ^0.3.x | OpenAPI spec parsing for Swagger |
| [cors](https://github.com/expressjs/cors) | ^2.x | CORS middleware (lanmode only) |
| [selfsigned](https://github.com/jfromaniello/selfsigned) | ^2.x | Self-signed TLS certificate generation (lanmode only) |
| [esbuild](https://esbuild.github.io/) | ^0.27.x | Client JS bundler (dev dependency) |

Leaflet maps and marker clustering are bundled locally in the `public/vendor/` directory.

### External APIs

| API | Purpose | Auth |
|-----|---------|------|
| [POTA API](https://api.pota.app/) | Live activator spots | None |
| [SOTA API](https://api2.sota.org.uk/) | Summit spots and coordinates | None |
| [HamQSL Solar XML](https://www.hamqsl.com/solarxml.php) | Solar indices and band conditions | None |
| [Propagation Contours](https://prop.kc2g.com/) | MUF and foF2 HF propagation overlays | None |
| [Where the ISS at?](https://wheretheiss.at/w/developer) | ISS position and orbit data | None |
| [NWS API](https://www.weather.gov/documentation/services-web-api) | Weather conditions, forecasts, and alerts | None (US only) |
| [Weather Underground](https://www.wunderground.com/member/api-keys) | Personal weather station observations | Free API key (optional) |
| [Callook.info](https://callook.info/) | US callsign license class lookup | None |
| [PSKReporter](https://pskreporter.info/) | Live FT8/FT4/CW/SSB spots | None |
| [DX Cluster](https://dxc.oscl2.org/) | DX cluster spots via WebSocket | None |
| [NOAA SWPC](https://services.swpc.noaa.gov/) | Space weather history (Kp, X-ray, SFI, solar wind, Bz) and predicted SSN | None |
| [N2YO](https://www.n2yo.com/api/) | Satellite positions and pass predictions | Free API key |
| [NASA SDO](https://sdo.gsfc.nasa.gov/) | Solar images and time-lapse frames | None |
| [NASA SVS](https://svs.gsfc.nasa.gov/) | Lunar phase images | None |
| [NG3K ADXO](https://www.ng3k.com/adxo.xml) | Upcoming and active DXpeditions | None |
| [WA7BNM Contest Calendar](https://www.contestcalendar.com/) | Upcoming and active contests | None |

Lunar/EME data is computed server-side using Meeus astronomical algorithms — no external API needed.
VOACAP propagation predictions use a Python bridge (dvoacap) when available, with a server-side simplified model as fallback.

---

## Network Configuration

By default the server binds to `0.0.0.0` (all interfaces) so other devices on your LAN can access it.

### Environment Variables

Create a `.env` file in the project root (already in `.gitignore`):

```
PORT=3000
HTTPS_PORT=3443
HOST=0.0.0.0
```

Or override at launch:

```bash
PORT=8080 npm start
```

### Finding Your LAN IP

- **Linux:** `hostname -I | awk '{print $1}'`
- **macOS:** `ipconfig getifaddr en0`
- **Windows:** `ipconfig` — look for the IPv4 address on your Wi-Fi or Ethernet adapter

Then visit `http://<your-LAN-IP>:3000` from any device on the same network.

### Firewall Rules

If other devices can't connect, you may need to allow the port through your firewall:

- **Linux (ufw):**
  ```bash
  sudo ufw allow 3000/tcp
  sudo ufw allow 3443/tcp
  ```
- **Windows Firewall (PowerShell, run as admin):**
  ```powershell
  New-NetFirewallRule -DisplayName "HamTab" -Direction Inbound -LocalPort 3000,3443 -Protocol TCP -Action Allow
  ```
- **macOS:** System Settings → Network → Firewall → allow incoming connections for Node.js (or disable firewall for local testing)

---

## WSL2 Setup

WSL2 uses a lightweight VM with its own virtual network adapter. This means extra steps are needed to access the app from Windows or other devices on your LAN.

### Accessing the App from Windows

By default, WSL2 forwards `localhost` traffic from Windows into the VM. After starting the server inside WSL2, open **http://localhost:3000** in your Windows browser.

If `localhost` doesn't work:

1. **Check that localhost forwarding is enabled.** Add to `%USERPROFILE%\.wslconfig`:
   ```ini
   [wsl2]
   localhostForwarding=true
   ```
   Then restart WSL: `wsl --shutdown`

2. **Use the WSL2 IP directly.** Find it from inside WSL2:
   ```bash
   hostname -I | awk '{print $1}'
   ```
   Then visit `http://<WSL2-IP>:3000` from Windows.

### Accessing the App from Other LAN Devices

WSL2's virtual network is not directly reachable from other machines on your LAN. You have two options:

**Option A — Port proxy (works on all WSL2 versions)**

Run in an **admin PowerShell** on the Windows host:

```powershell
# Get WSL2's internal IP
$wslIp = wsl hostname -I | ForEach-Object { $_.Trim().Split()[0] }

# Forward ports from all Windows interfaces into WSL2
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=3443 listenaddress=0.0.0.0 connectport=3443 connectaddress=$wslIp

# Allow through Windows Firewall
netsh advfirewall firewall add rule name="HamTab WSL2" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="HamTab WSL2 HTTPS" dir=in action=allow protocol=TCP localport=3443

# Verify the proxy rule
netsh interface portproxy show v4tov4
```

Other devices can then reach the app at `http://<your-Windows-IP>:3000` or `https://<your-Windows-IP>:3443` (for mobile geolocation).

> **Note:** The WSL2 IP changes on every reboot. You'll need to re-run the port proxy command after restarting WSL. To automate this, add the commands above to a startup script or Windows Task Scheduler task.

To remove the proxy and firewall rule later:

```powershell
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=3443 listenaddress=0.0.0.0
netsh advfirewall firewall delete rule name="HamTab WSL2"
netsh advfirewall firewall delete rule name="HamTab WSL2 HTTPS"
```

**Option B — Mirrored networking (Windows 11 23H2+, WSL 2.0.5+)**

Mirrored mode makes WSL2 share the Windows host's network stack directly — no port proxy needed and the WSL2 IP no longer changes.

Add to `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

Then restart WSL (`wsl --shutdown`). The app will be available on your Windows IP without any forwarding.

### Linux Firewall (inside WSL2)

If you're running `ufw` or `iptables` inside WSL2, make sure ports are allowed:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3443/tcp
```

---

## Troubleshooting

- **Browser shows HTTPS error or refuses to connect to localhost** — A previous session may have cached an HSTS policy. Clear it in your browser:
  - **Chrome/Edge:** Visit `chrome://net-internals/#hsts` (or `edge://net-internals/#hsts`), enter `localhost` under "Delete domain security policies," and click Delete.
  - **Firefox:** Clear recent history for localhost, or restart with a fresh profile.
- **Page loads but shows unstyled text** — Check the browser dev tools console (F12) for CSP or mixed-content errors. The server must be accessed over plain HTTP, not HTTPS.
- **WSL2 IP changed after reboot** — Re-run the port proxy command from Option A, or switch to mirrored networking (Option B) to avoid this entirely.
- **Connection refused from another device** — Verify the Windows Firewall rule is active and that you're using the Windows host IP, not the WSL2 internal IP.
- **Weather not showing** — If you don't have a Weather Underground API key, weather falls back to the NWS API which only covers US locations. Verify your lat/lon is set in the config.
- **NWS alerts not appearing** — The NWS alerts API only returns alerts for your exact lat/lon point. If there are no active alerts in your area, the badge is hidden.
- **GPS not working** — Browser geolocation requires HTTPS. If accessing over plain HTTP, enter your coordinates manually or use the Grid Square field.
- **VOACAP not working** — See the [VOACAP Propagation Setup](#voacap-propagation-setup-optional) section for installation and troubleshooting. Check the status endpoint: `curl http://localhost:3000/api/voacap/status`

## Project Structure

```
HamTabv1/
  server.js              Express server with API proxy endpoints
  server-config.js       Deployment mode detection and configuration
  server-startup.js      HTTP/HTTPS listener startup
  server-tls.js          Self-signed TLS certificate generation
  voacap-bridge.js       Python VOACAP bridge (IPC to dvoacap)
  package.json           Node.js project config
  esbuild.mjs            Client JS bundler config
  .env                   Environment variables (gitignored)
  certs/                 Auto-generated TLS certificates (gitignored)
  src/                   Client ES modules (bundled to public/app.js)
  public/
    index.html           Main HTML page
    style.css            All styles (dark theme, widgets, map, tables)
    app.js               Bundled client application (built from src/)
    vendor/              Leaflet and marker clustering (bundled locally)
  docs/user-guide/       User guide source (Markdown → PDF)
```

## License

MIT
