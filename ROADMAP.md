# HamTab Development Roadmap

Unified roadmap combining feature tracking with HamClock user insights to guide HamTab development through June 2026 and beyond.

**Mission:** Provide a modern, web-based amateur radio dashboard for the ~10,000+ HamClock users whose installations will stop functioning in June 2026, while serving the broader ham radio community.

**Last updated:** 2026-02-05

---

## Legend

**Status:**
- ✅ **Implemented** — Feature is complete and deployed
- 🟡 **Partially implemented** — Core functionality exists, missing some aspects
- 🔵 **Alternative approach** — Different implementation than requested
- ❌ **Not implemented** — Planned or requested but not yet built
- ➖ **Not applicable** — Not suitable for web-based app
- 🔥 **High demand** — Frequently requested in HamClock FAQs/issues
- 📅 **Scheduled** — Committed to specific development phase

**Deployment Mode:**
- 🌐 **Both** — Works in both lanmode and hostedmode
- 🏠 **Lanmode** — Requires local network/hardware, incompatible with cloud
- ☁️ **Hosted** — Works in both but requires different implementation in hostedmode

---

## Implementation Phases

### ✅ Phase 0: Foundation (Completed)
**Timeline:** Pre-2026-02-04
**Status:** Complete

- ✅ Vanilla JS + ES modules architecture
- ✅ Express stateless backend
- ✅ Two deployment modes (lanmode/hostedmode)
- ✅ Basic widget system with drag/drop/resize
- ✅ POTA/SOTA/DXC/PSK spot integration
- ✅ Map with gray line and markers
- ✅ Solar/lunar data and propagation
- ✅ Satellite tracking (N2YO API)
- ✅ Weather integration (NWS + Weather Underground)
- ✅ Filter system with presets
- ✅ Help system with per-widget documentation
- ✅ Reference widget (RST + NATO Phonetic)

---

### 📅 Phase 1: Critical User Requests (Feb-Mar 2026)
**Goal:** Address active GitHub issues and most common HamClock user pain points
**Timeline:** 4-6 weeks

#### P1.1: Installation & Configuration 🔥
| Feature | Status | Priority | Mode | Issue | Notes |
|---------|--------|----------|------|-------|-------|
| Configurable port | ✅ | HIGH | 🏠 | [#90](https://github.com/stevencheist/HamTabv1/issues/90) | Via .env (HTTP_PORT, HTTPS_PORT) |
| Uninstall script | ✅ | HIGH | 🏠 | [#90](https://github.com/stevencheist/HamTabv1/issues/90) | uninstall.sh and uninstall.ps1 |
| Feedback button | ✅ | MEDIUM | 🌐 | [#88](https://github.com/stevencheist/HamTabv1/issues/88) | Modal with encrypted email, creates GitHub issue |
| Docker support | ❌ | MEDIUM | ☁️ | — | lanmode only; hostedmode uses Cloudflare Containers |

#### P1.2: Essential Features 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Units toggle (metric/imperial) | ✅ | HIGH | 🌐 | Miles/km, °F/°C in config modal |
| Long path display | ✅ | HIGH | 🌐 | Dimmer dashed line shows long path |
| Spot retention window | ✅ | MEDIUM | 🌐 | Age filter in Filters widget (5-60+ min) |
| "My Spots" highlighting | ✅ | MEDIUM | 🌐 | Gold highlight when you're the activator |
| Table column sorting | ✅ | MEDIUM | 🌐 | Click column headers to sort (callsign, freq, mode, time, age) |

#### P1.3: Space Weather History 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| 30-day solar flux graph | ❌ | HIGH | 🌐 | Historical SFI trend |
| 7-day K-index graph | ❌ | HIGH | 🌐 | Geomagnetic history |
| 24-hour X-ray graph | ❌ | HIGH | 🌐 | Flare activity trend |
| Bz/Bt history | ❌ | MEDIUM | 🌐 | IMF trends |
| Solar wind history | ❌ | MEDIUM | 🌐 | Speed trends |
| Aurora history | ❌ | MEDIUM | 🌐 | Auroral activity trends |

**Phase 1 Deliverables:**
- Users can change port without editing code
- Clean uninstall for lanmode deployments
- In-app feedback mechanism
- Metric/Imperial unit preference
- Long path display on map
- Space weather trend analysis (6 history graphs)

---

### 📅 Phase 2: Watch Lists & Filtering (Mar-Apr 2026)
**Goal:** Advanced filtering to match HamClock capabilities
**Timeline:** 4-6 weeks

#### P2.1: Watch List Modes 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Red mode (highlight) | 🟡 | HIGH | 🌐 | Basic highlight exists, needs UI |
| Only mode (filter) | ❌ | HIGH | 🌐 | Show only matching spots |
| Not mode (exclude) | ❌ | HIGH | 🌐 | Hide matching spots |
| Per-source watch lists | ❌ | HIGH | 🌐 | DXC/POTA/SOTA/PSK/ADIF separate |
| Frequency range filtering | ❌ | MEDIUM | 🌐 | Min-max MHz |
| Sub-band mode filtering | ❌ | MEDIUM | 🌐 | CW/SSB/RTTY within band |

#### P2.2: ADIF Integration 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| ADIF log display | ❌ | HIGH | ☁️ | File upload (lanmode) / KV or R2 storage (hostedmode) |
| ADIF watch list | ❌ | HIGH | ☁️ | Requires ADIF storage |
| Sort by band/call/age/distance | 🟡 | MEDIUM | 🌐 | Client-side sorting (callsign/freq/mode/time/age done, ADIF pending) |
| Click QSO to set DX | ❌ | MEDIUM | 🌐 | Map integration |
| File reload on change | ❌ | LOW | 🏠 | File watching (lanmode only) |

**Phase 2 Deliverables:**
- Red/Only/Not watch list modes for all sources
- ADIF log integration with filtering
- Enhanced filter system with frequency ranges

---

### 📅 Phase 3: Propagation Modeling (Apr-May 2026)
**Goal:** Professional propagation predictions (most requested HamClock feature)
**Timeline:** 6-8 weeks

#### P3.0: Config Modal Redesign
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Tab-based organization | ✅ | HIGH | 🌐 | Station/Display/Services tabs |
| Improved layout | ✅ | HIGH | 🌐 | Scrollable content, responsive sizing |
| Field validation | ❌ | MEDIUM | 🌐 | Real-time feedback for inputs |

#### P3.1: VOACAP Integration 🔥
| Feature | Status | Priority | Mode | Issue | Notes |
|---------|--------|----------|------|-------|-------|
| Reliability graph (24h × band) | ✅ | CRITICAL | 🌐 | [#91](https://github.com/stevencheist/HamTabv1/issues/91) | VOACAP DE→DX widget with color-coded matrix |
| Real VOACAP engine (dvoacap-python) | ✅ | CRITICAL | 🌐 | [#91](https://github.com/stevencheist/HamTabv1/issues/91) | Python child process with JSON-RPC IPC, batch predictions |
| REL heatmap overlay | ✅ | CRITICAL | 🌐 | [#91](https://github.com/stevencheist/HamTabv1/issues/91) | Canvas heatmap showing reliability to every point on Earth |
| Circle overlay | ✅ | HIGH | 🌐 | [#91](https://github.com/stevencheist/HamTabv1/issues/91) | Concentric range rings scaled by reliability |
| Power level selection | ✅ | MEDIUM | 🌐 | — | 5W/100W/1kW cycle |
| Mode selection | ✅ | MEDIUM | 🌐 | — | CW/SSB/FT8 cycle |
| Takeoff angle selection | ✅ | MEDIUM | 🌐 | — | 3°/5°/10°/15° cycle |
| Path type selection | ✅ | MEDIUM | 🌐 | — | Short path / Long path cycle |
| Overview / Spot target mode | ✅ | MEDIUM | 🌐 | — | Multi-target overview or single DX target |
| Simplified fallback | ✅ | HIGH | 🌐 | — | Client-side model when Python unavailable |
| TOA map overlay | ❌ | LOW | 🌐 | [#91](https://github.com/stevencheist/HamTabv1/issues/91) | Take-off angle map |

#### P3.2: Real-Time Propagation Enhancements
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Real-time SSN + K-index correction | ❌ | HIGH | 🌐 | Adjust VOACAP SSN input using daily sunspot number and K/A-index to degrade predictions during geomagnetic storms. All data already available from HamQSL. |
| Effective SSN from real-time foF2 | ❌ | HIGH | 🌐 | Back-calculate "effective SSN" from NOAA ionosonde foF2 measurements, feed into VOACAP for predictions that track actual ionospheric state instead of monthly medians. |
| IRTAM real-time ionospheric model | ❌ | MEDIUM | 🌐 | Integrate IRI Real-Time Assimilative Model — ingests live ionosonde data from GIRO global network. Provides real-time electron density profiles. Could replace VOACAP's built-in ionospheric model. |
| GPS TEC data integration | ❌ | MEDIUM | 🌐 | Overlay Total Electron Content from GPS satellites (NOAA near-real-time). Maps ionosphere globally — useful for identifying disturbed regions. |
| DRAP overlay | ❌ | MEDIUM | 🌐 | D-Region absorption map from NOAA |
| Auto space weather mode | ❌ | LOW | 🌐 | Auto-show DRAP/Aurora when active |
| Grayline planning tool | ❌ | LOW | 🌐 | DE/DX twilight overlap |

#### P3.3: WSPR/Beacon Real-Time Propagation (Separate Project)
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| WSPR beacon propagation map | ❌ | MEDIUM | 🌐 | Use WSPR reception reports as ground-truth real-time propagation data. WSPR stations transmit known power on known frequencies 24/7 — their reception reports ARE direct propagation measurements. |
| PSKReporter propagation heatmap | ❌ | MEDIUM | 🌐 | Aggregate PSKReporter spots into a real-time band-by-band propagation heatmap showing where signals are actually being received right now. |
| Model calibration vs observations | ❌ | LOW | 🌐 | Compare VOACAP predictions against actual WSPR/PSK observations to calibrate the model and show users prediction accuracy. |

**Phase 3 Deliverables:**
- ✅ Redesigned config modal with tab-based organization
- ✅ Full VOACAP integration with real dvoacap-python engine
- ✅ 24-hour reliability grid with interactive parameters
- ✅ REL heatmap and circle map overlays
- Real-time SSN/foF2 corrections for current ionospheric conditions
- DRAP map overlay
- WSPR/PSK observation-based propagation maps (future)

---

### 📅 Phase 4: Hardware Integration (May-Jun 2026)
**Goal:** Support external software and hardware (heavily used by HamClock users)
**Timeline:** 6-8 weeks

#### P4.1: UDP Spot Input 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| WSJT-X UDP listener | ❌ | CRITICAL | 🏠 | Port 2237, local network only |
| N1MM+ logger support | ❌ | HIGH | 🏠 | UDP DE-spotted packets, local network |
| DXLog support | ❌ | HIGH | 🏠 | UDP integration, local network |
| Log4OM support | ❌ | HIGH | 🏠 | UDP message format, local network |
| WSJT-X cloud relay | ❌ | MEDIUM | ☁️ | WebSocket bridge for hostedmode |
| Multicast network support | ❌ | LOW | 🏠 | Multicast not available in cloud |

#### P4.2: hamlib/flrig Integration 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| rigctld rig control | ❌ | HIGH | 🏠 | Local TCP connection to rig |
| rotctld rotator control | ❌ | HIGH | 🏠 | Local TCP connection to rotator |
| flrig rig control | ❌ | MEDIUM | 🏠 | Alternative to rigctld, local TCP |
| PTT monitoring | ❌ | MEDIUM | 🏠 | Local hardware monitoring |
| Long path rotator support | ❌ | LOW | 🏠 | Requires rotator control |
| --vfo support | ❌ | LOW | 🏠 | VFO-specific control |

**Phase 4 Deliverables:**
- WSJT-X/N1MM+/DXLog/Log4OM UDP integration
- hamlib/flrig rig and rotator control
- PTT status monitoring

---

### 📅 Phase 5: Contests & DXpeditions (Jun-Jul 2026)
**Goal:** Operating event tracking and planning
**Timeline:** 4-6 weeks

#### P5.1: Contest Features 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| WA7BNM calendar integration | ❌ | HIGH | 🌐 | Server proxies contest calendar |
| Highlight contests in progress | ❌ | HIGH | 🌐 | Client-side real-time status |
| Remove past contests | ❌ | MEDIUM | 🌐 | Client-side auto-cleanup |
| Click to set alarm | ❌ | MEDIUM | 🌐 | Browser notifications |
| Click to open contest page | ❌ | LOW | 🌐 | External link |
| Show dates on 2nd line | ❌ | LOW | 🌐 | UI preference |

#### P5.2: DXpedition Tracking 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| NG3K integration | ❌ | HIGH | 🌐 | Server proxies NG3K data |
| DXNews integration | ❌ | HIGH | 🌐 | Server proxies DXNews |
| Map markers | ❌ | HIGH | 🌐 | Client-side rendering |
| Hide individual DXpeds | ❌ | MEDIUM | 🌐 | localStorage preference |
| Expedition mode indicator | ❌ | LOW | 🌐 | Client-side logic |

#### P5.3: Beacons
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| NCDXF beacon display | ❌ | MEDIUM | 🌐 | 18 beacon locations (static data) |
| Frequency rotation schedule | ❌ | MEDIUM | 🌐 | Client-side time calculations |
| Map markers | ❌ | LOW | 🌐 | Client-side rendering |

**Phase 5 Deliverables:**
- Contest calendar with real-time status
- DXpedition tracker with map markers
- NCDXF beacon display

---

### 📅 Phase 6: Advanced Map Features (Jul-Aug 2026)
**Goal:** Enhanced map visualization and projections
**Timeline:** 6-8 weeks

#### P6.1: Map Projections
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Azimuthal (DE-centered) | ❌ | HIGH | 🌐 | Custom Leaflet projection |
| Azimuthal bearing rings | ❌ | HIGH | 🌐 | Requires azimuthal projection |
| Azimuthal One Globe | ❌ | MEDIUM | 🌐 | Single hemisphere view |
| Robinson | ❌ | LOW | 🌐 | Equal-area projection |

#### P6.2: Map Overlays
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Aurora overlay | ❌ | MEDIUM | 🌐 | Server proxies NOAA OVATION |
| Weather overlay | ❌ | MEDIUM | 🌐 | Server proxies weather data |
| Clouds (IR satellite) | ❌ | MEDIUM | 🌐 | Server proxies NOAA GOES |
| CQ Zones | ❌ | LOW | 🌐 | Static GeoJSON |
| ITU Zones | ❌ | LOW | 🌐 | Static GeoJSON |
| Tropics lines | ❌ | LOW | 🌐 | Static overlay |

#### P6.3: Map Features
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Cursor info table (hover) | 🟡 | MEDIUM | 🌐 | Location details on hover |
| Sun sub-earth position | ❌ | MEDIUM | 🌐 | Client-side solar calculations |
| Moon sub-earth position | ❌ | MEDIUM | 🌐 | Client-side lunar calculations |
| City labels | ❌ | LOW | 🌐 | Static data or map tiles |
| Symbol legend | ❌ | LOW | 🌐 | UI element |

**Phase 6 Deliverables:**
- Azimuthal projection with bearing rings
- Aurora map overlay
- Enhanced cursor info system

---

### 📅 Phase 7: Satellite & EME (Aug-Sep 2026)
**Goal:** Advanced satellite and moon tracking
**Timeline:** 4-6 weeks

#### P7.1: Satellite Enhancements
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Ground track orbit line | 🟡 | HIGH | 🌐 | Client-side calculations |
| Sky plot visualization | ❌ | HIGH | 🌐 | Client-side polar chart |
| User TLE file support | ❌ | MEDIUM | ☁️ | File (lanmode) / KV or R2 storage (hostedmode) |
| TLE age display | ❌ | MEDIUM | 🌐 | Client-side calculation |
| Satellite planning tool | ❌ | MEDIUM | 🌐 | Client-side DE/DX visibility |
| Max TLE age configuration | ❌ | LOW | 🌐 | Client-side preference |

#### P7.2: Lunar & EME 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Moon Az/El from DE | ❌ | HIGH | 🌐 | Client-side calculations |
| Moon rise/set times | ❌ | HIGH | 🌐 | Client-side calculations |
| EME planning tool | 🟡 | MEDIUM | 🌐 | Client-side DE/DX mutual visibility |
| Moon radial velocity | ❌ | LOW | 🌐 | Client-side Doppler calculations |
| Moon rotation movie link | ❌ | LOW | 🌐 | External NASA link |

**Phase 7 Deliverables:**
- Full satellite orbit visualization
- Sky plot charts for passes
- Lunar Az/El and rise/set times
- DE/DX EME planning tool

---

### 📅 Phase 8: UI/UX Enhancements (Sep-Oct 2026)
**Goal:** Customization and usability improvements
**Timeline:** 4-6 weeks

#### P8.0: Layout & Responsiveness (Priority)
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Operator info visibility | ✅ | HIGH | 🌐 | Callsign, name, license, location, and control buttons larger and bolder |
| Widget non-overlapping layout | ✅ | HIGH | 🌐 | Collision detection pushes widgets apart on drag/resize/reflow |
| Proportional widget resize | ✅ | HIGH | 🌐 | Already implemented via reflowWidgets() with ResizeObserver |
| Responsive modals | ✅ | HIGH | 🌐 | viewport-relative sizing (min(92vw, XXpx)), small screen media query |
| Accessibility standards | ❌ | HIGH | 🌐 | Define standards for visual impairments, color blindness, readability |

#### P8.1: Theme Engine & Built-in Presets (Pulled Forward — Feb 2026) 📅
**Implementation: 3 phases**

**Theme Phase 1: Engine + Presets** (active)
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Theme engine (CSS var swap) | 🟡 | HIGH | 🌐 | `applyTheme()` swaps `:root` CSS variables dynamically |
| Default theme (current dark) | 🟡 | HIGH | 🌐 | Existing color scheme packaged as theme object |
| LCARS theme (Star Trek TNG) | 🟡 | HIGH | 🌐 | Orange/blue/purple palette + rounded pill shapes via CSS class overrides |
| HamClock theme | 🟡 | HIGH | 🌐 | Dark + green/cyan palette familiar to HamClock migrants |
| Theme persistence | 🟡 | HIGH | 🌐 | Active theme stored in `hamtab_theme` localStorage key |
| Theme selector UI | 🟡 | HIGH | 🌐 | New "Appearance" tab in config modal with visual theme swatches |

**Theme Phase 2: Multi-Layout Profiles + Purpose Presets**
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Named layout profiles | ❌ | HIGH | 🌐 | `hamtab_layouts` — JSON map of name → {positions, visibility} |
| POTA Hunter preset | ❌ | HIGH | 🌐 | Big spots table + map + filters, hide solar/lunar/satellites |
| POTA Activator preset | ❌ | HIGH | 🌐 | Big map + live spots + band conditions, smaller spots table |
| DX/Contest preset | ❌ | MEDIUM | 🌐 | Big spots table + DX detail + band conditions + VOACAP |
| EME preset | ❌ | MEDIUM | 🌐 | Lunar prominent, satellites, solar, hide POTA-specific |
| HamClock-style preset | ❌ | MEDIUM | 🌐 | Map-dominant layout familiar to HamClock users |
| Quick-switch profile selector | ❌ | HIGH | 🌐 | Dropdown or sidebar for fast profile switching |
| Save/rename/delete profiles | ❌ | HIGH | 🌐 | User can create custom named profiles |
| Combined "Views" (theme + layout) | ❌ | MEDIUM | 🌐 | Bundle theme + layout profile together; users can also mix-and-match |

**Theme Phase 3: Custom Colors + Power User**
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Custom color picker | ❌ | MEDIUM | 🌐 | Native `<input type="color">` grouped by category (bg, text, accent, status) |
| Live preview | ❌ | MEDIUM | 🌐 | Colors apply instantly as user picks |
| Save custom themes | ❌ | MEDIUM | 🌐 | `hamtab_custom_themes` localStorage; user names their themes |
| Configuration export/import | ❌ | HIGH | 🌐 | JSON download/upload (includes themes + layouts + all settings) |
| Light theme | ❌ | MEDIUM | 🌐 | Built-in light palette for daytime use |
| Gray scale mode | ❌ | LOW | 🌐 | CSS filter for accessibility/e-ink |

#### P8.2: Configuration Management
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Multiple configuration profiles | ❌ | HIGH | ☁️ | localStorage (lanmode) / Workers KV (hostedmode) — ties into Theme Phase 2 layout profiles |
| Configuration export/import | ❌ | HIGH | 🌐 | JSON download/upload — ties into Theme Phase 3 |
| Configuration rename | ❌ | LOW | ☁️ | localStorage (lanmode) / Workers KV (hostedmode) |

#### P8.3: Display Modes
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Pane rotation | ❌ | MEDIUM | 🌐 | Client-side timer |
| Demo mode | ❌ | MEDIUM | 🌐 | Client-side auto-rotation |
| Big Clock mode | ❌ | LOW | 🌐 | UI state change |
| Kiosk mode | ❌ | LOW | 🏠 | Auto-launch fullscreen (RPi only) |

#### P8.4: Other UX
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Stopwatch | ❌ | MEDIUM | 🌐 | Client-side timer with lap function |
| Countdown timer | ❌ | MEDIUM | 🌐 | Client-side station ID timer |
| Daily alarm | ❌ | MEDIUM | 🌐 | Browser notifications |
| One-time alarm | ❌ | MEDIUM | 🌐 | Browser notifications |
| Time shift planning | ❌ | LOW | 🌐 | Client-side historical calculations |

**Phase 8 Deliverables:**
- Theme engine with CSS variable swapping and shape overrides
- Built-in themes: Default, LCARS (TNG), HamClock
- Named layout profiles with purpose-specific presets (POTA Hunter, POTA Activator, DX/Contest, EME)
- Custom color picker with live preview
- Configuration export/import (themes + layouts + settings)
- Non-overlapping widget layout with auto-size and snap behavior
- Proportional widget resizing on window resize
- Stopwatch and countdown timers

---

### 📅 Phase 9: Advanced Integration (Oct-Nov 2026)
**Goal:** External data sources and hardware
**Timeline:** 4-6 weeks

#### P9.1: DX Cluster Live TCP 🔥
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Telnet proxy microservice | ❌ | HIGH | ☁️ | Local TCP (lanmode) / separate Worker (hostedmode) |
| DX Cluster commands | ❌ | HIGH | ☁️ | Requires proxy (see above) |
| AR-Cluster support | ❌ | MEDIUM | ☁️ | Requires proxy (see above) |
| CC-Cluster support | ❌ | MEDIUM | ☁️ | Requires proxy (see above) |
| DXWatch fallback | ❌ | MEDIUM | 🌐 | HTTP fallback works everywhere |
| Multi-source fallback | ❌ | LOW | 🌐 | Client-side failover |

#### P9.2: Digital Modes
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Live Spots (PSKReporter "heard") | ✅ | HIGH | 🌐 | Shows where user is being received with map paths |
| PSKReporter MQTT | ❌ | MEDIUM | ☁️ | WebSocket CSP, may need MQTT-over-WS bridge |
| WSPR integration | ❌ | MEDIUM | 🌐 | Server proxies wsprnet.org API |
| RBN integration | ❌ | MEDIUM | 🌐 | Server proxies RBN API |
| WWFF spots | ❌ | LOW | 🌐 | Server proxies WWFF data |

#### P9.3: Additional Sources
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| RSS feeds (configurable) | ❌ | MEDIUM | 🌐 | Server proxies RSS feeds |
| DX news ticker | ❌ | LOW | 🌐 | Client-side rendering |
| RSS ticker overlay | ❌ | LOW | 🌐 | Client-side overlay |

**Phase 9 Deliverables:**
- Live DX Cluster TCP connections
- PSKReporter MQTT real-time feed
- WSPR and RBN integration

---

### 📅 Phase 10: Polish & Community (Nov-Dec 2026)
**Goal:** Final features and community contributions
**Timeline:** 4-6 weeks

#### P10.1: Monitoring & Diagnostics
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| CPU temperature display | ❌ | LOW | 🏠 | Local hardware sensor (RPi) |
| CPU temp history graphs | ❌ | LOW | 🏠 | Requires CPU temp |
| Disk space monitoring | ❌ | LOW | 🏠 | Local filesystem monitoring |
| Auto-remove old cache | ❌ | LOW | 🏠 | Local filesystem cleanup |

#### P10.2: Multi-User Features
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Read-only web connections | ❌ | MEDIUM | ☁️ | Port 8082 (lanmode) / Cloudflare Access roles (hostedmode) |
| Multi-session proxy | ❌ | LOW | ☁️ | Per-IP instances (lanmode) / Durable Objects (hostedmode) |
| RESTful API expansion | ❌ | LOW | 🌐 | Server endpoints |

#### P10.3: Accessibility
| Feature | Status | Priority | Mode | Notes |
|---------|--------|----------|------|-------|
| Multi-language support | ❌ | LOW | 🌐 | i18n client-side (8+ languages) |
| Keyboard navigation | ❌ | LOW | 🌐 | Client-side event handlers |
| Screen reader support | ❌ | LOW | 🌐 | ARIA attributes |

**Phase 10 Deliverables:**
- System monitoring (CPU temp, disk space)
- Read-only web access mode
- Enhanced REST API

---

## Feature Status Matrix

### By Category

| Category | Total | Implemented | Partial | Not Impl | Completion |
|----------|-------|-------------|---------|----------|------------|
| Map Features & Projections | 32 | 9 | 4 | 19 | 28% |
| Spot Sources & Integration | 21 | 6 | 1 | 14 | 29% |
| Filtering & Watch Lists | 14 | 9 | 0 | 5 | 64% |
| Solar & Space Weather | 19 | 11 | 6 | 2 | 58% |
| Propagation Modeling | 7 | 3 | 1 | 3 | 43% |
| Lunar & EME | 12 | 6 | 1 | 5 | 50% |
| Satellite Tracking | 15 | 5 | 2 | 8 | 33% |
| Weather Integration | 9 | 7 | 0 | 2 | 78% |
| Time & Location | 21 | 10 | 1 | 10 | 48% |
| UI/UX & Theming | 23 | 6 | 0 | 17 | 26% |
| Configuration & Persistence | 13 | 10 | 0 | 3 | 77% |
| Hardware Integration | 9 | 0 | 0 | 9 | 0% |
| Reference Materials | 7 | 3 | 0 | 4 | 43% |
| Deployment & Installation | 11 | 8 | 0 | 3 | 73% |
| Other Features | 3 | 1 | 1 | 1 | 33% |
| **TOTAL** | **216** | **94** | **17** | **105** | **44%** |

### By Priority (High Demand 🔥 Features)

| Feature | Phase | Status | User Demand |
|---------|-------|--------|-------------|
| VOACAP integration | P3 | ✅ | CRITICAL |
| UDP spot input (WSJT-X) | P4 | ❌ | CRITICAL |
| Configurable port | P1 | ✅ | HIGH |
| Uninstall script | P1 | ✅ | HIGH |
| Units toggle | P1 | ✅ | HIGH |
| Long path display | P1 | ✅ | HIGH |
| Space weather graphs | P1 | ❌ | HIGH |
| Watch list modes | P2 | 🟡 | HIGH |
| ADIF integration | P2 | ❌ | HIGH |
| hamlib/flrig | P4 | ❌ | HIGH |
| Contest calendar | P5 | ❌ | HIGH |
| DXpeditions tracker | P5 | ❌ | HIGH |
| Azimuthal projection | P6 | ❌ | HIGH |
| Satellite sky plot | P7 | ❌ | HIGH |
| Moon Az/El | P7 | ❌ | HIGH |

---

## Active GitHub Issues

| Issue | Title | Status | Phase | Priority |
|-------|-------|--------|-------|----------|
| [#88](https://github.com/stevencheist/HamTabv1/issues/88) | Feedback button | ✅ | P1 | MEDIUM |
| [#90](https://github.com/stevencheist/HamTabv1/issues/90) | Configurable port | ✅ | P1 | HIGH |
| [#90](https://github.com/stevencheist/HamTabv1/issues/90) | Uninstall script | ✅ | P1 | HIGH |
| [#91](https://github.com/stevencheist/HamTabv1/issues/91) | VOACAP propagation + Live Spots | ✅ | P3/P9 | CRITICAL |

---

## Development Milestones

### June 2026: HamClock EOL
**Goal:** Provide viable alternative before HamClock shutdown

**Required for HamClock migration:**
- ✅ Basic spot sources (POTA/SOTA/DXC/PSK)
- ✅ Map with gray line and markers
- ✅ Solar/lunar data
- ✅ Satellite tracking
- ✅ Weather integration
- ✅ Filter system
- ✅ VOACAP propagation (P3) — Full dvoacap-python engine with 24h matrix, interactive params, REL heatmap
- ❌ UDP spot input (P4)
- ❌ Space weather graphs (P1)
- ❌ Watch list modes (P2)

### September 2026: Feature Parity
**Goal:** Match or exceed core HamClock capabilities

**Core feature parity:**
- All Phase 1-5 features completed
- VOACAP integration
- UDP integration (WSJT-X/N1MM+)
- Contest/DXpedition tracking
- Space weather history
- Advanced filtering

### December 2026: Community Edition
**Goal:** Community-driven features and polish

**Community features:**
- Phases 6-10 advanced features
- Multi-language support
- RESTful API expansion
- User contributions integration

---

## Data Source Strategy

### Current (Implemented ✅)
- **Solar/Space Weather:** hamqsl.com, NOAA SWPC
- **Solar Images:** sdo.gsfc.nasa.gov
- **Moon Images:** svs.gsfc.nasa.gov
- **Ionosonde:** kc2g.com (MUF-RT, foF2)
- **Propagation:** dvoacap-python (self-hosted VOACAP engine), NOAA predicted SSN
- **Satellites:** N2YO API, satellite.js (SGP4 for ISS)
- **Weather:** NWS, Weather Underground
- **Callsign:** callook.info, QRZ
- **Spots:** api.pota.app, api2.sota.org.uk, HamQTH CSV, pskreporter.info (including "heard by" Live Spots)

### Planned (By Phase)
- **P3:** NOAA ionosondes (real-time foF2 for effective SSN)
- **P3:** GIRO/IRTAM (real-time ionospheric model)
- **P3:** NOAA SWPC (DRAP overlay, GPS TEC)
- **P4:** WSJT-X UDP (local network)
- **P4:** N1MM+/DXLog/Log4OM UDP
- **P5:** WA7BNM (contests calendar)
- **P5:** NG3K, DXNews (DXpeditions)
- **P6:** NOAA OVATION (aurora overlay)
- **P6:** NOAA GOES (cloud imagery)
- **P9:** DX Spider/AR/CC (live cluster)
- **P9:** wsprnet.org (WSPR spots)
- **P9:** reversebeacon.net (RBN)

### Critical: No clearskyinstitute.com Dependency
All data sources are publicly available APIs. HamTab is fully self-sufficient and will continue functioning after June 2026.

---

## Deployment Mode Analysis

HamTab supports two deployment modes with a shared codebase on `main` and mode-specific implementations on `lanmode` and `hostedmode` branches.

### Mode Distribution (215 Total Features)

| Mode | Count | Percentage | Description |
|------|-------|------------|-------------|
| 🌐 **Both** | 179 | 83% | Works identically in both lanmode and hostedmode |
| 🏠 **Lanmode** | 23 | 11% | Requires local network/hardware, incompatible with cloud |
| ☁️ **Hosted** | 13 | 6% | Works in both but requires different implementation |

### Lanmode-Only Features (23)

**Hardware & Local Network (17):**
- All UDP spot input (WSJT-X, N1MM+, DXLog, Log4OM) except cloud relay
- All hamlib/flrig integration (rigctld, rotctld, flrig, PTT monitoring)
- Multicast network support

**System Monitoring (4):**
- CPU temperature display and history
- Disk space monitoring
- Auto-remove old cache

**Deployment (2):**
- Configurable port (hostedmode uses wrangler.jsonc)
- Uninstall script (hostedmode uses CI/CD)

**UI (1):**
- Kiosk mode auto-launch (RPi-specific)

**File System (1):**
- ADIF file reload on change (file watching)

### Hostedmode Different Implementation (13)

**Storage (5):**
- ADIF log display → KV or R2 instead of file upload
- ADIF watch list → depends on ADIF storage
- User TLE file support → KV/R2 instead of ~/.hamtab/user-sats.txt
- Multiple config profiles → Workers KV instead of localStorage
- Configuration rename → Workers KV instead of localStorage

**Network Services (6):**
- Docker support → hostedmode already uses Cloudflare Containers; this feature is for lanmode
- WSJT-X cloud relay → WebSocket bridge needed
- DX Cluster TCP proxy → separate Worker/microservice
- AR-Cluster, CC-Cluster → depends on cluster proxy
- PSKReporter MQTT → may need MQTT-over-WebSocket bridge
- Read-only web → Cloudflare Access roles instead of port 8082

**Multi-User (2):**
- Multi-session proxy → Durable Objects instead of per-IP instances

### Both Modes (179)

**Client-Side (majority):**
- All UI/UX changes, filtering, watch lists
- All calculations (solar, lunar, EME, satellites, propagation)
- All map features, projections, and overlays
- All theming and customization
- All timers, alarms, and notifications

**Server-Proxied APIs:**
- All spot sources (POTA, SOTA, DXC, PSK, PSKReporter)
- All space weather data (NOAA, hamqsl.com)
- All propagation models (VOACAP, DRAP, ionosonde)
- All contest/DXpedition sources (WA7BNM, NG3K, DXNews)
- All weather data (NWS, Weather Underground)
- All reference data (beacons, zones, overlays)

### Phase-by-Phase Impact

| Phase | 🌐 Both | 🏠 Lanmode | ☁️ Hosted | Lanmode % |
|-------|---------|-----------|----------|-----------|
| P1 | 10 | 2 | 1 | 15% |
| P2 | 9 | 1 | 2 | 8% |
| P3 | 11 | 0 | 0 | 0% |
| P4 | 1 | 11 | 1 | 85% |
| P5 | 15 | 0 | 0 | 0% |
| P6 | 15 | 0 | 0 | 0% |
| P7 | 10 | 0 | 1 | 0% |
| P8 | 14 | 1 | 2 | 6% |
| P9 | 9 | 0 | 4 | 0% |
| P10 | 7 | 4 | 2 | 36% |

**Phase 4 (Hardware Integration)** is 85% lanmode-only. Most other phases are universal (0-15% lanmode-only).

### Implementation Strategy

**Main Branch (Shared):**
- Develop all 🌐 **Both** features on `main`
- Client-side logic, UI components, calculations
- Server proxy endpoints with identical behavior

**Lanmode Branch:**
- UDP listeners and hardware integration
- System monitoring (CPU temp, disk space)
- Installation/uninstall scripts
- File-based storage and file watching

**Hostedmode Branch:**
- Workers KV for config/ADIF/TLE storage
- Cloudflare Durable Objects for multi-session
- WebSocket bridges for real-time services (cluster, MQTT)
- Cloudflare Access integration for read-only mode
- Container-optimized deployments

### Critical Hostedmode Work Items

**High Priority:**
1. Workers KV integration for multi-config profiles (P8.1)
2. ADIF storage strategy - R2 vs KV decision (P2.2)
3. WSJT-X cloud relay architecture planning (P4.1)
4. DX Cluster microservice design (P9.1)

**Medium Priority:**
1. User TLE file upload to KV/R2 (P7.1)
2. PSKReporter MQTT WebSocket integration (P9.2)
3. Multi-user session isolation via Durable Objects (P10.2)
4. Read-only mode via Cloudflare Access roles (P10.2)

---

## Architecture Roadmap

### Current Architecture
- Vanilla JS + ES modules → esbuild IIFE
- Express stateless backend
- No framework dependencies
- Direct API integrations
- Two deployment modes (lanmode/hostedmode)

### Planned Enhancements

#### P3: VOACAP Engine (✅ Implemented)
- Python child process (dvoacap-python) managed by Node.js bridge
- JSON-RPC over stdin/stdout with batch predictions
- Automatic fallback to simplified model when Python unavailable
- **Next:** Real-time ionospheric corrections (foF2, K-index adjustments)

#### P4: UDP Gateway
- Local network listener for WSJT-X/N1MM+
- Optional cloud relay for hostedmode
- WebSocket bridge for browser clients

#### P9: Cluster Proxy
- Telnet proxy for DX Spider/AR/CC
- Persistent connection management
- Multiple client support
- Rate limiting and abuse prevention

#### Future Considerations
- WebSocket for real-time updates (PSKReporter MQTT)
- Service worker for offline capability
- Plugin architecture for custom overlays
- GraphQL API for complex queries

---

## Security Roadmap

### Current (Implemented ✅)
- Helmet CSP enforcement
- Rate limiting on all API routes
- SSRF prevention (IP validation)
- No client-side external requests
- Input sanitization and validation
- XSS prevention (textContent, esc() utility)
- Self-signed TLS (lanmode)
- Cloudflare Access auth (hostedmode)

### Planned Enhancements

#### P3-P4: Microservice Security
- Cluster proxy: telnet connection validation
- UDP gateway: LAN-only binding (lanmode)
- VOACAP service: request validation and rate limiting

#### P9: WebSocket Security
- PSKReporter MQTT: CSP updates for WebSocket
- Authentication tokens for multi-user sessions
- TLS for all WebSocket connections

#### P10: API Security
- API key authentication for RESTful endpoints
- Granular permissions (read-only vs admin)
- Audit logging for configuration changes

---

## Testing Strategy

### Phase 1-2: Core Features
- Unit tests for filter logic
- Integration tests for spot sources
- Browser compatibility (Chrome, Firefox, Safari)
- Mobile responsive testing

### Phase 3-4: External Integration
- VOACAP API integration tests
- UDP message parsing tests
- hamlib/flrig mock integration tests
- Network failure resilience

### Phase 5-6: Advanced Features
- Map projection accuracy tests
- Overlay rendering performance tests
- Contest/DXpedition data parsing tests

### Phase 7-10: Polish
- Multi-configuration switching tests
- Theme rendering tests
- Accessibility audits
- Load testing (multi-user scenarios)

---

## Documentation Roadmap

### User Documentation
- ✅ CLAUDE.md (developer guide)
- ✅ Help system (in-app widget help)
- 📅 User guide PDF (comprehensive manual) — In progress
- ❌ FAQ (common questions)
- ❌ Installation guides (per platform)
- ❌ Video tutorials (YouTube)

### Developer Documentation
- ✅ README.md (project overview)
- ✅ Code comments (inline documentation)
- ❌ API documentation (RESTful endpoints)
- ❌ Architecture guide (system design)
- ❌ Contributing guide (for community)

### Migration Guides
- ❌ HamClock to HamTab migration guide
- ❌ Configuration import/export guide
- ❌ Feature comparison matrix
- ❌ Troubleshooting guide

---

## Community & Contributions

### Contribution Opportunities
1. **Docker deployment** — Community-maintained containers
2. **Platform-specific installers** — macOS, FreeBSD, Arch AUR
3. **Translation** — Multi-language support (Phase 10)
4. **Custom themes** — Color palettes and layouts
5. **Scripts & automation** — Integration examples
6. **Documentation** — Guides, tutorials, videos

### User Contributions Wishlist (from HamClock)
- Multi-user web proxy (hostedmode enhancement)
- Static compilation for TrueNAS/NAS
- ProxMox/LXC deployment guide
- RESTful API wrapper scripts
- Automation examples (QRZ lookup, RSS loading)
- Platform-specific optimizations

---

## Success Metrics

### June 2026 (HamClock EOL)
- **User migration:** 1,000+ former HamClock users
- **Feature completion:** 60% of roadmap features
- **Critical features:** VOACAP, UDP input, watch lists

### September 2026 (Feature Parity)
- **User adoption:** 2,500+ active users
- **Feature completion:** 75% of roadmap features
- **GitHub stars:** 250+
- **Community contributions:** 10+ contributors

### December 2026 (Community Edition)
- **User adoption:** 5,000+ active users
- **Feature completion:** 90% of roadmap features
- **Multi-language:** 3+ languages supported
- **Deployment options:** Docker, native, cloud

---

## Risk Mitigation

### Timeline Risks
- **VOACAP integration complexity** — May require 8-10 weeks instead of 6-8
  - Mitigation: Start research in P1, plan microservice architecture early
- **UDP integration scope** — Supporting 4+ logger formats may take longer
  - Mitigation: Prioritize WSJT-X first, add others incrementally
- **HamClock EOL pressure** — June 2026 deadline is firm
  - Mitigation: Focus P1-P4 on critical migration features

### Technical Risks
- **VOACAP API availability** — ✅ Resolved: self-hosted dvoacap-python engine
  - Real-time enhancements depend on NOAA ionosonde data availability
- **DX Cluster stability** — Telnet connections can be flaky
  - Mitigation: Implement robust reconnection logic, HTTP fallback
- **Browser compatibility** — Advanced features may not work on all browsers
  - Mitigation: Feature detection, graceful degradation

### Resource Risks
- **Solo development** — All phases depend on single developer
  - Mitigation: Prioritize ruthlessly, accept community contributions
- **API rate limits** — External APIs may throttle requests
  - Mitigation: Implement caching, respect rate limits, batch requests

---

## Conclusion

This roadmap provides a clear path from the current 43% feature completion to a comprehensive amateur radio dashboard by December 2026. The phased approach prioritizes:

1. **User needs** (Phases 1-2) — Address active issues and common pain points
2. **Core functionality** (Phases 3-5) — Propagation, hardware integration, events
3. **Advanced features** (Phases 6-8) — Maps, satellites, customization
4. **Integration** (Phase 9) — Live data feeds and external tools
5. **Polish** (Phase 10) — Monitoring, accessibility, community

By June 2026, HamTab will provide a viable alternative for ~10,000 HamClock users facing the shutdown of their installations. The web-based architecture, self-hosted data sources, and modern UI position HamTab as the successor to HamClock while serving the broader amateur radio community.

**Next Actions:**
1. ~~Complete Phase 1.1 features~~ ✅ Done (feedback, configurable port, uninstall)
2. ~~Implement units toggle and long path display (Phase 1.2)~~ ✅ Done
3. Add space weather history graphs (Phase 1.3)
4. ~~VOACAP integration (Phase 3.1)~~ ✅ Done — full dvoacap-python engine deployed
5. Real-time propagation enhancements (Phase 3.2) — K-index corrections, effective SSN from foF2
6. WSPR/PSK observation-based propagation (Phase 3.3) — separate project, can run in parallel

---

*Roadmap unified from ROADMAP.md and HAMCLOCK_INSIGHTS.md on 2026-02-04*
