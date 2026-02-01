# HamTab

A real-time amateur radio dashboard for [Parks on the Air (POTA)](https://pota.app) and [Summits on the Air (SOTA)](https://www.sota.org.uk/) activations. Displays live spots on an interactive map with solar propagation data, HF band conditions, ISS tracking, and lunar/EME conditions — all in a customizable widget layout.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![Express](https://img.shields.io/badge/Express-4.x-blue) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **On the Air** — Real-time POTA and SOTA spots with source tabs, filtering by band, mode, country, US state, and Maidenhead grid square, and a spot age column
- **Interactive Map** — Leaflet map with clustered markers for both POTA and SOTA activations, dark tiles, and clickable popups with QRZ callsign links
- **Map Center Controls** — Quick buttons to center on your QTH, prime meridian, or selected spot
- **Day/Night Terminator** — Gray line overlay showing the solar terminator with a subtle daylight tint on the illuminated hemisphere
- **Propagation Contours** — MUF and foF2 HF propagation overlays on the map from prop.kc2g.com
- **ISS Tracking** — Real-time ISS position, orbital ground track, radio footprint circle, and ARISS amateur radio frequencies
- **Solar Indices** — Solar flux, sunspot number, A/K indices, X-ray flux, and signal noise level
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
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | ^8.x | API rate limiting (60 req/min) |
| [dotenv](https://github.com/motdotla/dotenv) | ^16.x | Environment variable configuration |
| [selfsigned](https://github.com/jfromaniello/selfsigned) | ^2.x | Auto-generated self-signed TLS certificates |

Leaflet maps and marker clustering are bundled locally in the `public/vendor/` directory.

### External APIs Used

| API | Purpose | Docs |
|-----|---------|------|
| [POTA API](https://api.pota.app/) | Live activator spots | [pota.app](https://pota.app) |
| [SOTA API](https://api2.sota.org.uk/) | Summit spots and coordinates | [sota.org.uk](https://www.sota.org.uk/) |
| [HamQSL Solar XML](https://www.hamqsl.com/solarxml.php) | Solar indices and band conditions | [hamqsl.com](https://www.hamqsl.com/) |
| [Propagation Contours](https://prop.kc2g.com/) | MUF and foF2 HF propagation overlays | [prop.kc2g.com](https://prop.kc2g.com/) |
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

Then open your browser to **http://localhost:3000** (or **https://\<your-LAN-IP\>:3443** from other devices on the network).

On first startup the server auto-generates a self-signed TLS certificate (saved to `certs/`). Two servers start:

- **HTTP** on port 3000 — for localhost/desktop use
- **HTTPS** on port 3443 — for LAN/mobile access

On first launch you'll be prompted to enter your callsign. The app will request your browser's geolocation to display your Maidenhead grid square.

> **Mobile geolocation:** Browsers require a secure context (HTTPS) for the Geolocation API. When accessing from a phone on your LAN, use `https://<your-LAN-IP>:3443`. You'll need to accept the self-signed certificate warning on first visit.

## Usage

- **Filters** — Use the band, mode, country, state, and grid buttons/dropdowns in the On the Air widget to narrow spots
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
  ```
- **Windows Firewall (PowerShell, run as admin):**
  ```powershell
  New-NetFirewallRule -DisplayName "HamTab" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
  ```
- **macOS:** System Settings → Network → Firewall → allow incoming connections for Node.js (or disable firewall for local testing)

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

If you're running `ufw` or `iptables` inside WSL2, make sure port 3000 is allowed:

```bash
sudo ufw allow 3000/tcp
```

### Troubleshooting

- **Browser shows HTTPS error or refuses to connect to localhost** — A previous session may have cached an HSTS policy. Clear it in your browser:
  - **Chrome/Edge:** Visit `chrome://net-internals/#hsts` (or `edge://net-internals/#hsts`), enter `localhost` under "Delete domain security policies," and click Delete.
  - **Firefox:** Clear recent history for localhost, or restart with a fresh profile.
- **Page loads but shows unstyled text** — Check the browser dev tools console (F12) for CSP or mixed-content errors. The server must be accessed over plain HTTP, not HTTPS.
- **WSL2 IP changed after reboot** — Re-run the port proxy command from Option A, or switch to mirrored networking (Option B) to avoid this entirely.
- **Connection refused from another device** — Verify the Windows Firewall rule is active and that you're using the Windows host IP, not the WSL2 internal IP.

## Project Structure

```
HamTabv1/
  server.js           Express server with API proxy endpoints
  package.json        Node.js project config
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
