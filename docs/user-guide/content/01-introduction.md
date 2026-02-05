# Introduction

## What is HamTab?

HamTab is a real-time amateur radio dashboard designed for portable activators and DX enthusiasts. It aggregates live data from multiple sources into a single, customizable interface:

- **POTA** (Parks on the Air) spots and park information
- **SOTA** (Summits on the Air) spots and summit data
- **DX Cluster** spots from global DX networks
- **PSKReporter** digital mode reception reports
- **Space weather** and propagation forecasts
- **Satellite tracking** with pass predictions
- **Moon phase** and EME path loss calculations

Whether you're hunting activators from home or setting up a portable station, HamTab gives you the information you need at a glance.

## Key Features

| Feature | Description |
|---------|-------------|
| Live Spots | Real-time POTA, SOTA, DX Cluster, and PSK spots |
| Interactive Map | Markers, overlays, geodesic paths, satellite footprints |
| Solar Data | 18 configurable space weather metrics with color coding |
| Band Conditions | Day/night propagation forecast by band and region |
| HF Propagation | 24-hour band reliability matrix |
| Live Spots Widget | See where YOUR signal is being received |
| Satellite Tracking | Real-time position and pass predictions |
| Lunar/EME | Moon phase, declination, and path loss |
| Filters | Band, mode, distance, age, location, and license filtering |
| Filter Presets | Save and recall filter combinations |
| Customizable Layout | Drag, resize, and show/hide any widget |

## System Requirements

HamTab runs in any modern web browser:

- **Chrome** 90+ (recommended)
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

JavaScript must be enabled. A screen resolution of at least 1280x720 is recommended for the best experience.

## Deployment Modes

HamTab can be deployed in two ways:

### Hosted Mode (hamtab.net)

- Cloud-hosted on Cloudflare
- No installation required
- Settings sync across devices via Cloudflare Access login
- Always up-to-date

### LAN Mode (Self-Hosted)

- Run on your own Windows, Linux, or Raspberry Pi
- Works offline on your local network
- Full privacy — no data leaves your LAN
- Automatic HTTPS with self-signed certificates
- Optional: Install Python 3 + dvoacap-python for full VOACAP propagation predictions

Both modes have identical features. Choose hosted mode for convenience, or LAN mode for privacy and offline operation.

## Optional Dependencies (LAN Mode)

| Feature | Dependency | Installation |
|---------|------------|--------------|
| Full VOACAP propagation | Python 3 + dvoacap-python | `pip3 install numpy git+https://github.com/skyelaird/dvoacap-python.git` |

Without optional dependencies, HamTab uses simplified fallback models that still provide useful estimates.
