# HamTab

A real-time amateur radio dashboard for [Parks on the Air (POTA)](https://pota.app) activations. Displays live spots on an interactive map with solar propagation data, HF band conditions, ISS tracking, and lunar/EME conditions — all in a customizable widget layout.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![Express](https://img.shields.io/badge/Express-4.x-blue) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **Live Activations Table** — Real-time POTA spots with filtering by band, mode, country, US state, and Maidenhead grid square
- **Interactive Map** — Leaflet map with clustered markers, dark tiles, and clickable popups with QRZ callsign links
- **Day/Night Terminator** — Gray line overlay showing the current solar terminator
- **ISS Tracking** — Real-time ISS position, orbital ground track, radio footprint circle, and ARISS amateur radio frequencies
- **Solar & Propagation** — Solar flux, sunspot number, A/K indices, X-ray flux, and signal noise level
- **HF Band Conditions** — Day/night conditions for 80m through 10m
- **Lunar / EME** — Moon phase, illumination, declination, distance, and relative path loss for EME operators
- **Widget Layout** — All panels are draggable and resizable with snap-to-edge, persisted across sessions
- **Operator Identity** — Callsign prompt at startup with geolocation and Maidenhead grid square display

## Prerequisites

### Node.js (v18 or later)

#### macOS / Linux

Using [nvm](https://github.com/nvm-sh/nvm) (recommended):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc   # or ~/.zshrc on macOS
nvm install 20
```

Or install directly:

- **macOS (Homebrew):**
  ```bash
  brew install node
  ```
- **Debian / Ubuntu:**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- **Fedora / RHEL:**
  ```bash
  sudo dnf install nodejs
  ```

#### Windows

- Download the installer from [nodejs.org](https://nodejs.org/) (LTS recommended), or
- Using [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/):
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
- Using [Chocolatey](https://chocolatey.org/):
  ```powershell
  choco install nodejs-lts
  ```

### Git

Needed to clone the repository.

- **macOS:** `xcode-select --install` or `brew install git`
- **Debian / Ubuntu:** `sudo apt-get install git`
- **Fedora / RHEL:** `sudo dnf install git`
- **Windows:** Download from [git-scm.com](https://git-scm.com/download/win) or `winget install Git.Git`

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [Express](https://expressjs.com/) | ^4.21.0 | HTTP server and API proxy |
| [helmet](https://helmetjs.github.io/) | ^8.x | Security headers and CSP |
| [cors](https://github.com/expressjs/cors) | ^2.x | CORS origin filtering (LAN only) |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | ^7.x | API rate limiting (60 req/min) |
| [dotenv](https://github.com/motdotla/dotenv) | ^16.x | Environment variable configuration |

All other functionality (Leaflet maps, marker clustering) is loaded from CDNs in the browser with SRI integrity hashes.

### External APIs Used

| API | Purpose | Docs |
|-----|---------|------|
| [POTA API](https://api.pota.app/) | Live activator spots | [pota.app](https://pota.app) |
| [HamQSL Solar XML](https://www.hamqsl.com/solarxml.php) | Solar indices and band conditions | [hamqsl.com](https://www.hamqsl.com/) |
| [Where the ISS at?](https://wheretheiss.at/w/developer) | ISS position and orbit data | [wheretheiss.at](https://wheretheiss.at/) |

Lunar/EME data is computed server-side using Meeus astronomical algorithms — no external API needed.

## Installation

### macOS / Linux

```bash
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
npm install
```

### Windows (Command Prompt or PowerShell)

```powershell
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
npm install
```

## Running

### macOS / Linux

```bash
npm start
```

Or directly:

```bash
node server.js
```

### Windows

```powershell
npm start
```

Or directly:

```powershell
node server.js
```

Then open your browser to **http://localhost:3000** (or **http://\<your-LAN-IP\>:3000** from other devices on the network).

On first launch you'll be prompted to enter your callsign. The app will request your browser's geolocation to display your Maidenhead grid square.

## Usage

- **Filters** — Use the band, mode, country, state, and grid buttons/dropdowns in the Activations widget to narrow spots
- **Map interaction** — Click a spot in the table to fly to it on the map; click a map marker to see callsign (links to QRZ), frequency, and park info
- **Widgets** — Drag any widget header to reposition, drag the bottom-right corner to resize; widgets snap to edges and center
- **Reset Layout** — Click the "Reset Layout" button in the header to restore the default widget arrangement
- **Auto-refresh** — Spots refresh every 60 seconds by default; toggle with the checkbox in the header

## Network Configuration

By default the server binds to `0.0.0.0` (all interfaces) so other devices on your LAN can access it.

### Environment Variables

Create a `.env` file in the project root (already in `.gitignore`):

```
PORT=3000
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
  ```
- **Windows Firewall (PowerShell, run as admin):**
  ```powershell
  New-NetFirewallRule -DisplayName "HamTab" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
  ```
- **macOS:** System Settings → Network → Firewall → allow incoming connections for Node.js (or disable firewall for local testing)

## Project Structure

```
HamTabv1/
  server.js           Express server with API proxy endpoints
  package.json        Node.js project config
  .env                Environment variables (PORT, HOST)
  public/
    index.html        Main HTML page
    style.css         All styles (dark theme, widgets, map, tables)
    app.js            Client-side application logic
```

## License

MIT
