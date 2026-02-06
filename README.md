# HamTab

A real-time amateur radio dashboard for [Parks on the Air (POTA)](https://pota.app) and [Summits on the Air (SOTA)](https://www.sota.org.uk/) activations. Displays live spots on an interactive map with solar propagation data, HF band conditions, ISS tracking, weather, and lunar/EME conditions — all in a customizable widget layout.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![Express](https://img.shields.io/badge/Express-4.x-blue) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **On the Air** — Real-time POTA and SOTA spots with source tabs, filtering by band, mode, country, US state, and Maidenhead grid square, and a spot age column
- **Interactive Map** — Leaflet map with clustered markers for both POTA and SOTA activations, dark tiles, and clickable popups with QRZ callsign links
- **Map Center Controls** — Quick buttons to center on your QTH, prime meridian, or selected spot
- **Day/Night Terminator** — Gray line overlay showing the solar terminator with a subtle daylight tint on the illuminated hemisphere
- **Propagation Contours** — MUF and foF2 HF propagation overlays on the map from prop.kc2g.com
- **ISS Tracking** — Real-time ISS position, orbital ground track, radio footprint circle, and ARISS amateur radio frequencies
- **Solar Indices** — Solar flux, sunspot number, A/K indices, X-ray flux, and signal noise level with 18 configurable fields
- **HF Band Conditions** — Day/night conditions for 80m through 10m displayed in the header
- **Lunar / EME** — Moon phase, illumination, declination, distance, and relative path loss for EME operators with 9 configurable fields
- **Weather Conditions** — Local weather display from Weather Underground (PWS key) or NWS as automatic fallback; source indicator badge shows which is active
- **Weather Backgrounds** — Local clock widget background gradient changes to reflect current conditions (clear, cloudy, rain, snow, thunderstorm, fog) with day/night variants
- **NWS Weather Alerts** — Severity-colored alert badge on local clock; click to view active alerts with headlines, descriptions, and NWS website links
- **Day/Night Indicator** — SVG sun/moon graphic on clock widgets based on computed sunrise/sunset for your location
- **Clock Styles** — Digital or analog clock face for both Local Time and UTC widgets
- **License Privilege Filter** — For US callsigns, filter spots to only show frequencies and modes your license class allows
- **Band Reference** — Built-in band plan reference popup showing frequency privileges by license class
- **Widget Layout** — All panels are draggable and resizable with snap-to-edge, persisted across sessions
- **Auto-Update** — Server checks for git updates at a configurable interval and can apply them with one click
- **Operator Identity** — Callsign prompt at startup with geolocation and Maidenhead grid square display

---

## Installation

> **Important:** HamTab uses the `lanmode` branch for self-hosted installations. The `main` branch contains shared code only — it does not include the install scripts, self-signed TLS, or update checker. Always checkout `lanmode` after cloning.

### macOS

**Prerequisites:** Node.js 18+ and Git.

```bash
# Install Node.js via Homebrew
brew install node

# Or via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install 20

# Git (if not already installed)
xcode-select --install
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
sudo dnf install nodejs git
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

After install, the app runs from `/opt/hamtab`. Manage it with:

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

### Widgets

Toggle each widget on or off:
- Local Time
- UTC
- On the Air
- HamMap
- Solar & Propagation
- Lunar / EME

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

Real-time POTA and SOTA activation spots.

**Source tabs** — Switch between POTA and SOTA. Active tab is saved across sessions.

**Columns displayed:**

| Column | Description |
|--------|-------------|
| Callsign | Activator callsign (hover for name/address/class tooltip, links to QRZ) |
| Freq | Frequency in MHz |
| Mode | Operating mode (CW, SSB, FM, FT8, etc.) |
| Ref | Park or summit reference code (links to POTA/SOTA page) |
| Name | Park name or summit details |
| Time | Spot time |

**Filters:**

| Filter | Available | Description |
|--------|-----------|-------------|
| Band | POTA, SOTA | Filter by amateur band (160m through 2m) |
| Mode | POTA, SOTA | Filter by mode (CW, SSB, FM, FT8, etc.) |
| Country | POTA only | Filter by DXCC entity prefix |
| State | POTA only | Filter by US state |
| Grid | POTA only | Filter by 4-character Maidenhead grid square |
| My privileges | POTA only | US callsigns only — hides spots outside your license class frequency/mode privileges |

Click any row to fly to that spot on the map. The selected spot is highlighted in the table and on the map with an orange marker.

### HamMap

Interactive Leaflet map with dark tiles showing activation markers, your QTH, ISS position, propagation overlays, and the gray line terminator.

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
| **Spot markers** | Clustered markers for all visible POTA/SOTA spots. Click for popup with callsign (QRZ link), frequency, reference, distance/bearing from your QTH |
| **Your QTH** | Lightning bolt marker with your callsign at your location |
| **ISS** | Real-time ISS position with orbital ground track, radio footprint circle, and popup showing lat/lon, altitude, velocity, and ARISS frequencies |
| **Gray line** | Day/night terminator overlay showing the solar terminator boundary |
| **Propagation contours** | Color-coded MHz contour lines when MUF or foF2 is enabled |

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

---

## Header Bar

The header bar shows your callsign, band conditions, and global controls.

### Operator Info (left)

- **Callsign** — Links to your QRZ page. License class shown if US callsign.
- **Name** — Looked up from callook.info
- **Location** — Lat/lon and Maidenhead grid square
- **Config** — Opens the configuration dialog
- **Loc** — Refreshes your geolocation
- **Band Ref** — Opens a band plan reference popup showing frequency privileges by license class. Check "My privileges only" to filter to your class.

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
| **Update indicator** | Shows whether a git update is available. Green dot = update ready (click to apply). Restart button appears when server files changed. |

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

## Project Structure

```
HamTabv1/
  server.js           Express server with API proxy endpoints
  package.json        Node.js project config
  start.sh            Restart wrapper for auto-update
  .env                Environment variables (PORT, HTTPS_PORT, HOST)
  certs/              Auto-generated TLS certificates (gitignored)
  public/
    index.html        Main HTML page
    style.css         All styles (dark theme, widgets, map, tables)
    app.js            Client-side application logic
    vendor/           Leaflet and marker clustering libraries (bundled locally)
```

## License

MIT
