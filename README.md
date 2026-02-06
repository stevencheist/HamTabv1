# HamTab

A real-time amateur radio dashboard for [Parks on the Air (POTA)](https://pota.app) and [Summits on the Air (SOTA)](https://www.sota.org.uk/) activations. Displays live spots on an interactive map with solar propagation data, HF band conditions, ISS tracking, weather, and lunar/EME conditions — all in a customizable widget layout.

**Live at [hamtab.net](https://hamtab.net)** — sign in with Google, GitHub, or email.

![Node.js](https://img.shields.io/badge/Node.js-20-green) ![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20Containers-orange) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

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
- **Weather Conditions** — Local weather display from Weather Underground (PWS key) or NWS as automatic fallback
- **Weather Backgrounds** — Clock widget background gradient changes to reflect current conditions with day/night variants
- **NWS Weather Alerts** — Severity-colored alert badge on local clock; click to view active alerts
- **Clock Styles** — Digital or analog clock face for both Local Time and UTC widgets
- **License Privilege Filter** — For US callsigns, filter spots to only show frequencies and modes your license class allows
- **Band Reference** — Built-in band plan reference popup showing frequency privileges by license class
- **Widget Layout** — All panels are draggable and resizable with snap-to-edge, persisted across sessions
- **Settings Sync** — Your configuration syncs across devices via Cloudflare Workers KV
- **Operator Identity** — Callsign prompt at startup with geolocation and Maidenhead grid square display

---

## Architecture

```
User → Cloudflare Access (auth) → Worker (settings KV + proxy) → Container (Node.js Express :8080)
```

| Component | Role |
|-----------|------|
| **Cloudflare Access** | Authentication gate — Google, GitHub, or email OTP. Verifies identity before any request reaches the app. |
| **Cloudflare Worker** (`worker.js`) | Routes `/api/settings` GET/PUT to Workers KV (keyed by user email). Proxies everything else to the container. |
| **Container** (`server.js`) | Node.js Express server on port 8080. Stateless API proxy — fetches external amateur radio APIs and serves the static frontend. No database, no sessions. |
| **Workers KV** | Stores per-user settings (callsign, location, preferences). Enables settings sync across devices. |
| **Client** (`public/app.js`) | IIFE bundle built from ES modules in `src/`. User state lives in localStorage; synced to/from KV on startup and config save. |

Cloudflare handles TLS termination, DDoS protection, and CDN caching. The container runs behind the Worker and sleeps after 5 minutes of inactivity.

---

## Branch Strategy

This repo uses three branches:

```
main ──────────────────────── shared codebase
 ├── lanmode                  LAN/self-hosted variant
 └── hostedmode               Cloudflare/cloud variant
```

| Branch | Purpose | Target |
|--------|---------|--------|
| **`main`** | Shared features — full client feature parity | Base for both variants |
| **`lanmode`** | Adds self-signed TLS, CORS for RFC 1918, auto-update system, local admin endpoints | Raspberry Pi, home server |
| **`hostedmode`** | Adds Cloudflare Worker/Container, settings sync via KV, CI/CD, Dockerfile | hamtab.net |

New shared features go on `main`. Both variant branches merge from `main` to stay current. Never merge between `lanmode` and `hostedmode` directly.

> **Looking for the self-hosted version?** Switch to the [`lanmode`](../../tree/lanmode) branch for installation instructions on Raspberry Pi, Linux, macOS, and Windows.

---

## Self-Hosted Installation (lanmode)

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

```bash
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout lanmode
npm install
npm start
```

### Linux (Debian / Ubuntu / Raspberry Pi)

```bash
sudo dnf install nodejs git
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout lanmode
npm install
npm start
```

### Linux (Automated Installer)

The included install script handles everything: installs Node.js if needed, copies the app to `/opt/hamtab`, configures ports and Weather Underground, and optionally sets up a systemd service for boot-start with automatic crash recovery. Works on any systemd-based Linux distribution including Raspberry Pi OS, Debian, Ubuntu, and Fedora.

```bash
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout lanmode
sudo bash install.sh
```

1. **Ports** — Choose HTTP and HTTPS ports (defaults: 3000 and 3443)
2. **Weather Underground** — Choose whether to use WU for weather data, and enter your API key (or add it later via the Config screen in the browser)
3. **Start on boot** — If yes, installs a systemd service that starts HamTab automatically and restarts on failure

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

## Development Setup

**Prerequisites:** Node.js 20+

```bash
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout hostedmode
npm install
npm run build
node server.js
```

The server starts on **http://localhost:8080**. The `.env` file is optional for local development:

```
PORT=8080
HOST=0.0.0.0
WU_API_KEY=your_key_here
```

### Build

```bash
npm run build        # one-time bundle
npm run dev          # watch mode (rebuilds on file changes)
npm start            # build + start server
```

The build step bundles `src/*.js` into `public/app.js` via esbuild. The version from `package.json` is injected as `__APP_VERSION__` at build time.

---

## Deployment

### Prerequisites

- **Cloudflare account** with Workers Paid plan (required for Containers)
- **Domain** added to Cloudflare (e.g., hamtab.net)
- **Wrangler CLI** installed: `npm install -g wrangler`
- **GitHub repository** with Actions enabled

### Step 1: Authenticate Wrangler

```bash
wrangler login
```

This opens a browser to authorize Wrangler with your Cloudflare account.

### Step 2: Create KV Namespace

```bash
wrangler kv namespace create SETTINGS_KV
```

Copy the returned namespace ID and paste it into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "SETTINGS_KV",
    "id": "your-namespace-id-here"
  }
]
```

### Step 3: Configure wrangler.jsonc

Update the routes to match your domain:

```jsonc
"routes": [
  { "pattern": "yourdomain.com/*", "zone_name": "yourdomain.com" }
]
```

### Step 4: Create Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use **Custom token** with these permissions:
   - **Account** → Workers Scripts: Edit
   - **Account** → Workers KV Storage: Edit
   - **Account** → Workers Tail: Read (optional, for logs)
   - **Zone** → Workers Routes: Edit
   - **Zone** → Zone: Read
4. Set **Zone Resources** to your domain
5. Copy the token (you won't see it again)

### Step 5: Add GitHub Secret

1. Go to your repo → Settings → Secrets and variables → Actions
2. Click **New repository secret**
3. Name: `CLOUDFLARE_API_TOKEN`
4. Value: paste the token from Step 4

### Step 6: Configure Cloudflare Access (Authentication)

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) dashboard
2. Navigate to **Access** → **Applications**
3. Click **Add an application** → **Self-hosted**
4. Configure:
   - **Application name:** HamTab
   - **Session duration:** 24 hours (or your preference)
   - **Application domain:** `yourdomain.com`
5. Add a policy:
   - **Policy name:** Allow authenticated users
   - **Action:** Allow
   - **Include:** Emails ending in `@gmail.com` (or configure as needed)
6. Under **Authentication**, add identity providers:
   - Google, GitHub, and/or One-time PIN (email)
7. Save the application

### Step 7: First Deploy

Deploy manually to initialize the Durable Object migration:

```bash
npm install
npm run build
wrangler deploy
```

You should see output confirming the Worker and Container deployment.

### Step 8: Verify DNS

Ensure your domain points to Cloudflare:
- If purchased through Cloudflare, this is automatic
- Otherwise, update nameservers at your registrar to Cloudflare's

### Automated Deployment (CI/CD)

After initial setup, deployment is automatic. Pushing to the `hostedmode` branch triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. Checks out the code
2. Installs dependencies
3. Builds the client bundle (`npm run build`)
4. Deploys to Cloudflare via `wrangler deploy`

No manual intervention needed — just push and it deploys.

### Adding Secrets

For server-side secrets (e.g., Weather Underground API key):

```bash
wrangler secret put WU_API_KEY
```

Enter the value when prompted. Secrets are encrypted at rest and injected as environment variables at runtime. Never store secrets in `wrangler.jsonc` or commit them to git.

### Monitoring

View real-time logs:

```bash
wrangler tail
```

View container logs in the Cloudflare dashboard under Workers & Pages → your worker → Logs.

---

## Project Structure

```
HamTabv1/
  server.js              Express server — API proxy, lunar math, health check
  worker.js              Cloudflare Worker — settings KV + container proxy
  wrangler.jsonc         Cloudflare deployment config
  Dockerfile             Container image for Cloudflare Containers
  package.json           Node.js project config
  esbuild.mjs            Build config (ES modules → IIFE bundle)
  .env                   Environment variables (gitignored)
  src/
    main.js              Client entry point
    state.js             Application state object
    settings-sync.js     Settings pull/push via Workers KV
    update.js            Static version display
    splash.js            Configuration dialog
    ...                  Other client modules
  public/
    index.html           Main HTML page
    style.css            Dark theme, widgets, map, tables
    app.js               Bundled client output (don't edit directly)
    vendor/              Leaflet and marker clustering (bundled locally)
  .github/
    workflows/
      deploy.yml         CI/CD — auto-deploy on push to hostedmode
```

---

## Configuration

On first visit (or any time you click **Config** in the header), a dialog appears:

| Setting | Description |
|---------|-------------|
| **Callsign** | Your amateur radio callsign. Displayed in the header and on the map marker. |
| **Location** | Lat/lon, grid square, or GPS. Used for map centering, distance/bearing, weather, and sunrise/sunset. |
| **Time Format** | 12-hour or 24-hour display. |
| **Weather Station** | Optional Weather Underground station ID and API key. Falls back to NWS if blank (US only). |
| **Widgets** | Toggle individual widgets on/off. |
| **Layout** | Save or reset widget positions and sizes. |

All settings are saved to localStorage and synced to Workers KV so they follow you across devices.

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

Leaflet maps and marker clustering are bundled locally in `public/vendor/`.

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

## License

MIT
