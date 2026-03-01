# HamTab Roadmap

A high-level overview of where HamTab is headed. For feature requests or feedback, [open an issue](https://github.com/stevencheist/HamTabv1/issues).

## Completed

- POTA, SOTA, DX Cluster, and PSKReporter spot integration
- Interactive map with gray line, geodesic paths, and satellite tracking
- Solar/lunar data, space weather, and propagation indices
- VOACAP propagation predictions with reliability heatmap
- Space weather history graphs (SFI, Kp, X-ray, solar wind, Bz)
- Filter system with band, mode, distance, and preset support
- Theme engine with 4 built-in themes (Default, LCARS, Terminal, HamClock)
- Mobile-responsive layout
- Weather integration (NWS + Weather Underground)
- DE/DX operator widget with sunrise/sunset countdowns
- Reference tables (RST, NATO phonetic, band chart)
- In-app feedback system
- Two deployment modes: self-hosted (lanmode) and cloud (hamtab.net)

## In Progress

- Watch list modes (highlight, filter, exclude)
- Real-time propagation enhancements

## Planned

- ADIF log integration
- WSJT-X and logger UDP integration (lanmode)
- Contest calendar and DXpedition tracker
- Azimuthal map projection
- Advanced satellite tracking (sky plots, orbit visualization)
- Lunar/EME planning tools
- Grid-based layout engine with activity presets
- Custom theme builder
- Configuration export/import
- hamlib/flrig rig control (lanmode)
- DX Cluster live TCP connections
- WSPR and Reverse Beacon Network integration

### Panadapter / Spectrum Scope Widget (lanmode)

Real-time spectrum scope and waterfall display for connected rigs. Ported from VirtualHam's battle-tested canvas renderers.

**Phase 1 — IC-7300 Spectrum Data (CI-V Cmd 0x27)**
- Extend `src/cat/drivers/icom-civ.js` with `enableScope`, `disableScope`, and scope data parsing
- IC-7300 streams ~475 bins per sweep via CI-V when scope is enabled
- Add `spectrumData: Float32Array` and `scopeEnabled: boolean` to `rig-state-store.js`
- Scope data flows through existing Driver → RigManager → RigStateStore → Widget pipeline

**Phase 2 — Canvas Rendering**
- Port VirtualHam's `color-map.ts` (256-entry RGBA LUT, SDR palette) to vanilla JS
- Port `waterfall.ts` (scrolling canvas with `drawImage` shift + `putImageData` row)
- Port `spectrum.ts` (peak hold, avg smoothing, grid, frequency labels, passband shading)
- Create `PanadapterWidget` — new draggable/resizable widget with spectrum + waterfall canvases
- VFO center line and passband overlay synced to rig frequency and filter width

**Phase 3 — Multi-Rig Support**
- Extend Yaesu NewCAT driver with scope commands (FT-DX10, FTDX101D)
- Extend Kenwood driver with scope commands (TS-890S)
- Scope configuration UI (span, reference level, speed)

**Phase 4 — Demo Mode Spectrum**
- Extend `fake-radio-engine.js` to generate simulated spectrum data
- Use VirtualHam's band activity engine for realistic signal populations in demo mode

### VirtualHam UI Cross-Pollination

Improvements identified from VirtualHam's RadioFace UI work that can be brought back to HamTab.

- **CSS variable system for 3D buttons** — Extract repeated metallic button styling in RadioFace theme into shared `--btn-gradient`, `--btn-shadow`, `--btn-shadow-active` variables. Reduces duplication across `.rig-connect-btn`, tab buttons, filter buttons, etc.
- **Slider styling** — Port the cross-browser range input styling (`-webkit-slider-thumb`, `-moz-range-thumb`) with metallic radial-gradient thumb and gradient track. Cleaner than current `.rig-power-slider`.
- **LED S-meter as pure CSS** — Single gradient fill + one `::after` pseudo-element with `repeating-linear-gradient` for segment separators. Simpler than current JS-based color zone switching.
- **Shared band plan data** — VirtualHam's engine has structured sub-band zone definitions (CW/digital/phone zones with exact frequency boundaries per band). Could replace HamTab's `band-overlay-engine.js` manually-defined segments with a shared data source to keep both projects in sync.

## Contributing

We welcome feature requests and bug reports via [GitHub Issues](https://github.com/stevencheist/HamTabv1/issues). See README.md for setup instructions.
