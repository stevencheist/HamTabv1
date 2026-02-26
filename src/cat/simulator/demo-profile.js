// --- CAT Simulator: Demo Profile ---
// Pre-configured profile for the demo/simulator radio.
// Uses yaesu_ascii driver with InMemoryTransport.

export const DEMO_PROFILE = {
  id: 'demo',
  manufacturer: 'HamTab',
  model: 'Demo Radio',
  protocol: { family: 'yaesu_ascii' },
  serial: {}, // not used — InMemoryTransport
  control: { pollingInterval: 500 },
  power: { min: 5, max: 100, step: 5 },
  tuning: { smartTuneMethod: 'radio_managed', hasATAS: true },
};
