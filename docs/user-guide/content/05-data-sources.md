# Data Sources

HamTab aggregates data from multiple amateur radio services. All external API calls are proxied through the HamTab server to protect your privacy and comply with Content Security Policy.

## POTA (Parks on the Air)

### What is POTA?
Parks on the Air is an amateur radio program that encourages portable operation from parks and protected natural areas worldwide. Activators set up stations in parks; hunters contact them for park-to-park and park-to-home QSOs.

### Data Provided
- **Activator callsign** — Station operating in the park
- **Frequency** — Operating frequency in kHz
- **Mode** — CW, SSB, FT8, etc.
- **Park reference** — Unique park identifier (e.g., K-0001)
- **Park name** — Full name of the park
- **Spot time** — When the spot was posted

### Filtering Options
- Band, Mode, Distance, Age
- Country (DXCC entity)
- US State
- Grid square prefix
- License privilege

### Links
- Park references link to pota.app with full park details
- Includes activation history, park location, and contact requirements

---

## SOTA (Summits on the Air)

### What is SOTA?
Summits on the Air is an award program for amateur radio operators who operate from mountain summits. Activators hike to summits and make contacts; chasers work them from home or portable locations.

### Data Provided
- **Activator callsign** — Station operating on the summit
- **Frequency** — Operating frequency in kHz
- **Mode** — Operating mode
- **Summit reference** — Unique summit identifier (e.g., W7W/KG-001)
- **Summit details** — Name, elevation, points
- **Spot time** — When the spot was posted

### Filtering Options
- Band, Mode, Distance, Age

### Links
- Summit references link to sotadata.org.uk with full summit information
- Includes summit location, elevation, activation history, and point values

---

## DX Cluster (DXC)

### What is DX Cluster?
DX Cluster is a worldwide network where amateur radio operators post "spots" of interesting DX (long-distance) stations they've heard or worked. It's the primary real-time source for DX activity.

### Data Provided
- **DX callsign** — The DX station being spotted
- **Frequency** — Operating frequency in kHz
- **Mode** — Operating mode (may be inferred from frequency)
- **Spotter** — Callsign of the station posting the spot
- **Country** — DXCC entity of the DX station
- **Continent** — Continent code (NA, SA, EU, AF, AS, OC)
- **Spot time** — When the spot was posted

### Filtering Options
- Band, Mode, Distance, Age
- Continent

### Notes
- DX Cluster spots come from multiple cluster nodes worldwide
- Spot quality varies — some spots may be inaccurate or outdated
- High-demand DX may generate many duplicate spots

---

## PSKReporter

### What is PSKReporter?
PSKReporter is an automatic propagation reporting network. Digital mode software (WSJT-X, JS8Call, etc.) automatically uploads reception reports to PSKReporter, creating a real-time map of worldwide propagation.

### Data Provided
- **TX callsign** — Station being received
- **Frequency** — Operating frequency in Hz
- **Mode** — Digital mode (FT8, FT4, JS8, etc.)
- **RX callsign** — Station receiving the signal
- **SNR** — Signal-to-noise ratio in dB
- **TX grid** — Transmitting station's grid square
- **RX grid** — Receiving station's grid square
- **Spot time** — When the reception occurred

### Filtering Options
- Band, Mode, Distance, Age

### Use Cases
- See who's active on digital modes
- Monitor real-time propagation
- Find active stations to call

---

## Space Weather (HamQSL)

### What is HamQSL Space Weather?
HamQSL provides real-time space weather data relevant to HF propagation. Solar activity directly affects ionospheric conditions and thus radio propagation.

### Data Provided

| Metric | Source | Relevance |
|--------|--------|-----------|
| Solar Flux Index | NOAA | Higher = better HF propagation |
| Sunspot Number | SILSO | Correlates with SFI |
| A-Index | NOAA | Geomagnetic disturbance (lower = better) |
| K-Index | NOAA | Short-term geomagnetic activity |
| X-Ray Flux | GOES satellite | Solar flare intensity |
| Solar Wind | ACE satellite | Particle stream speed |
| Bz (IMF) | ACE satellite | Interplanetary magnetic field |
| Proton Flux | GOES satellite | High-energy particle flux |
| Aurora Activity | NOAA | Northern/Southern lights |

### Update Frequency
Space weather data updates every few minutes. The Solar widget shows the timestamp of the last update.

---

## Satellite Data (N2YO)

### What is N2YO?
N2YO is a satellite tracking service that provides real-time positions and pass predictions for thousands of satellites, including amateur radio satellites.

### Data Provided
- **Real-time position** — Latitude, longitude, altitude
- **Azimuth/Elevation** — Position in observer's sky
- **Pass predictions** — Upcoming visible passes
- **Orbital parameters** — TLE data

### API Key Required
N2YO requires a free API key. Without it, satellite tracking is disabled.

### Supported Satellites
HamTab includes frequency information for popular amateur satellites:
- ISS (ZARYA) — Voice, SSTV, APRS
- AO-91 (RadFxSat) — FM repeater
- AO-92 (Fox-1D) — FM repeater
- SO-50 — FM repeater
- CAS-4A/4B — Linear transponder
- RS-44 — Linear transponder
- TEVEL-1/2 — FM transponder

---

## Weather Data

### National Weather Service (NWS)
Default weather provider for US locations. No API key required.
- Current conditions
- Forecast data
- Alerts and warnings

### Weather Underground
Alternative weather provider. Requires free API key.
- Current conditions from personal weather stations
- Useful for non-US locations or more local data

---

## Data Refresh Rates

| Data Source | Refresh Interval |
|-------------|-----------------|
| POTA spots | 60 seconds |
| SOTA spots | 60 seconds |
| DX Cluster | 60 seconds |
| PSKReporter | 60 seconds |
| Space weather | 5 minutes |
| Satellite positions | 5 seconds |
| Live Spots (your TX) | 60 seconds |

<div class="tip">Data refresh happens automatically. There's no need to manually refresh the page.</div>

## Privacy

All external API requests are proxied through the HamTab server:
- Your IP address is not exposed to external services
- Your location is not transmitted to data providers
- Distance calculations happen client-side using locally-stored coordinates
