# HamTab

A free, modern amateur radio dashboard and [HamClock](https://www.clearskyinstitute.com/ham/HamClock/) alternative. Displays live POTA, SOTA, DX Cluster, WWFF, and PSKReporter spots on an interactive map with VOACAP propagation predictions, HF band conditions, space weather, satellite tracking, contests, DXpeditions, NCDXF beacons, weather, and lunar/EME data — all in a customizable, themeable widget layout.

**Architectures:** `linux/amd64` · `linux/arm64` (Raspberry Pi 4/5, Synology, TrueNAS, Unraid)

## Quick Start

```bash
docker run -d -p 3000:3000 -p 3443:3443 stevencheist/hamtab
```

Open [http://localhost:3000](http://localhost:3000) and enter your callsign to get started.

### Docker Compose

```yaml
services:
  hamtab:
    image: stevencheist/hamtab:latest
    ports:
      - "3000:3000"
      - "3443:3443"
    volumes:
      - hamtab-certs:/app/certs
    environment:
      - PORT=3000
      - HTTPS_PORT=3443
      # - WU_API_KEY=your_key_here
      # - N2YO_API_KEY=your_key_here
    restart: unless-stopped

volumes:
  hamtab-certs:
```

## Supported Tags

| Tag | Description |
|-----|-------------|
| `latest` | Most recent release |
| `x.y.z` (e.g. `0.43.0`) | Pinned version — use this for reproducible deployments |

## Configuration

### Ports

| Port | Protocol | Description |
|------|----------|-------------|
| `3000` | HTTP | Main web interface |
| `3443` | HTTPS | Self-signed TLS — required for GPS geolocation on mobile/tablet |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port |
| `HTTPS_PORT` | `3443` | HTTPS listen port |
| `WU_API_KEY` | — | [Weather Underground](https://www.wunderground.com/member/api-keys) API key for personal weather station data (optional — falls back to NWS for US locations) |
| `N2YO_API_KEY` | — | [N2YO](https://www.n2yo.com/api/) API key for satellite tracking (optional) |

### Volumes

| Path | Description |
|------|-------------|
| `/app/certs` | Self-signed TLS certificates — mount a named volume to persist across container restarts |

### Health Check

The container includes a built-in health check at `/api/health` (30s interval). Compatible with Docker, Portainer, Uptime Kuma, and other monitoring tools.

## Features

- **Live Spots** — POTA, SOTA, DX Cluster, WWFF, and PSKReporter with band/mode/country/state/grid filtering
- **Interactive Map** — Leaflet map with clustered markers, day/night terminator, MUF/foF2 propagation contours, satellite tracks, and VOACAP coverage overlays
- **VOACAP Propagation** — Full HF propagation predictions powered by dvoacap-python (included — no extra setup needed)
- **Band Conditions** — Real-time HF day/night conditions from HamQSL
- **Space Weather** — Solar flux, sunspot number, A/K indices, X-ray flux, solar wind, Bz, and historical graphs
- **Satellite Tracking** — ISS, amateur radio satellites, and custom NORAD IDs via N2YO with orbital tracks and radio footprints
- **Contests & DXpeditions** — Active and upcoming contests (WA7BNM) and DXpeditions (NG3K)
- **NCDXF Beacons** — Real-time 18-beacon synchronized cycle display across 5 HF frequencies
- **Weather** — Weather Underground or NWS fallback with condition backgrounds, forecasts, and NWS alert badges
- **Lunar / EME** — Moon phase, illumination, declination, distance, and path loss for EME operators
- **8 Themes** — Default, LCARS, Terminal, HamClock, Rebel, Imperial, Neon, Steampunk
- **Watch Lists** — Per-source Red/Only/Not filtering by callsign, DXCC, grid, or park/summit reference
- **License Privilege Filter** — US callsigns can filter spots to their license class
- **Grid & Float Layouts** — Structured CSS grid or free-floating draggable widgets

## Updating

```bash
docker compose pull && docker compose up -d
```

Or with plain Docker:

```bash
docker pull stevencheist/hamtab:latest
docker stop hamtab && docker rm hamtab
docker run -d --name hamtab -p 3000:3000 -p 3443:3443 -v hamtab-certs:/app/certs stevencheist/hamtab
```

## Links

- [GitHub](https://github.com/stevencheist/HamTabv1)
- [Discord](https://discord.gg/GcX9cHtT)
- [Release Notes](https://github.com/stevencheist/HamTabv1/wiki/Release-Notes)
- [User Guide (PDF)](https://hamtab.net/HamTab-User-Guide.pdf)

## License

MIT
