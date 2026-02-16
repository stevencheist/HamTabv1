// --- Stopwatch / Timer Widget ---
// Dual-mode: Stopwatch (count up with laps) and Countdown (preset or custom).
// HamClock pane type — station ID timer (10 min for FCC ID requirement).
// All client-side, no server interaction.

import state from './state.js';
import { $ } from './dom.js';
import { isWidgetVisible } from './widgets.js';

let mode = 'stopwatch'; // 'stopwatch' or 'countdown'
let running = false;
let startTime = 0;      // Date.now() when started (adjusted for pauses)
let elapsed = 0;         // ms elapsed (stopwatch) or ms remaining (countdown)
let countdownTotal = 0;  // ms — total countdown duration
let laps = [];           // lap timestamps (ms)
let alertFired = false;  // prevent repeated alerts

export function initStopwatchListeners() {
  const tabSw = $('swTabStopwatch');
  const tabCd = $('swTabCountdown');
  const startBtn = $('swStart');
  const stopBtn = $('swStop');
  const resetBtn = $('swReset');
  const lapBtn = $('swLap');

  if (!tabSw) return; // widget not in DOM

  tabSw.addEventListener('click', () => switchMode('stopwatch'));
  tabCd.addEventListener('click', () => switchMode('countdown'));

  startBtn.addEventListener('click', startTimer);
  stopBtn.addEventListener('click', stopTimer);
  resetBtn.addEventListener('click', resetTimer);
  lapBtn.addEventListener('click', recordLap);

  // Countdown presets
  const presets = document.querySelectorAll('.sw-preset');
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      const min = parseInt(btn.dataset.minutes, 10);
      if (!isNaN(min) && min > 0) {
        countdownTotal = min * 60 * 1000; // ms
        elapsed = countdownTotal;
        renderDisplay();
      }
    });
  });
}

function switchMode(newMode) {
  if (running) stopTimer();
  mode = newMode;
  elapsed = 0;
  countdownTotal = 0;
  laps = [];
  alertFired = false;

  const tabSw = $('swTabStopwatch');
  const tabCd = $('swTabCountdown');
  const cdSet = $('swCountdownSet');
  const lapBtn = $('swLap');

  tabSw.classList.toggle('active', mode === 'stopwatch');
  tabCd.classList.toggle('active', mode === 'countdown');
  cdSet.classList.toggle('hidden', mode !== 'countdown');
  lapBtn.classList.toggle('hidden', mode !== 'stopwatch');

  renderDisplay();
  renderLaps();
}

function startTimer() {
  if (running) return;
  if (mode === 'countdown' && countdownTotal === 0) return; // no duration set
  running = true;
  alertFired = false;

  if (mode === 'stopwatch') {
    startTime = Date.now() - elapsed;
  } else {
    startTime = Date.now();
  }

  state.stopwatchTimer = setInterval(tick, 100); // 100 ms — smooth display updates
}

function stopTimer() {
  running = false;
  if (state.stopwatchTimer) {
    clearInterval(state.stopwatchTimer);
    state.stopwatchTimer = null;
  }
}

function resetTimer() {
  stopTimer();
  elapsed = mode === 'countdown' ? countdownTotal : 0;
  laps = [];
  alertFired = false;
  renderDisplay();
  renderLaps();
}

function recordLap() {
  if (!running || mode !== 'stopwatch') return;
  laps.push(elapsed);
  renderLaps();
}

function tick() {
  if (!isWidgetVisible('widget-stopwatch')) return;

  if (mode === 'stopwatch') {
    elapsed = Date.now() - startTime;
  } else {
    const elapsedSince = Date.now() - startTime;
    elapsed = Math.max(0, countdownTotal - elapsedSince);

    if (elapsed === 0 && !alertFired) {
      alertFired = true;
      stopTimer();
      flashDisplay();
    }
  }

  renderDisplay();
}

function flashDisplay() {
  const display = $('swDisplay');
  if (!display) return;
  display.classList.add('sw-flash');
  setTimeout(() => display.classList.remove('sw-flash'), 3000); // 3 s flash
}

function renderDisplay() {
  const display = $('swDisplay');
  if (!display) return;

  const ms = Math.abs(elapsed);
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  if (h > 0) {
    display.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
  } else {
    display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
  }
}

function renderLaps() {
  const container = $('swLaps');
  if (!container) return;
  if (laps.length === 0) { container.innerHTML = ''; return; }

  let html = '';
  for (let i = laps.length - 1; i >= 0; i--) {
    const lapMs = i === 0 ? laps[0] : laps[i] - laps[i - 1];
    const lapSec = Math.floor(lapMs / 1000);
    const lapM = Math.floor(lapSec / 60);
    const lapS = lapSec % 60;
    const lapT = Math.floor((lapMs % 1000) / 100);
    html += `<div class="sw-lap-row"><span class="sw-lap-num">${i + 1}</span><span class="sw-lap-time">${String(lapM).padStart(2, '0')}:${String(lapS).padStart(2, '0')}.${lapT}</span></div>`;
  }
  container.innerHTML = html;
}

// Public start/stop for visibility-gated lifecycle
export function startStopwatchDisplay() {
  renderDisplay();
  renderLaps();
}

export function stopStopwatchDisplay() {
  // Timer already stopped via state.stopwatchTimer; nothing to clean up
}

// Read-only getters for clock complication
export function getStopwatchElapsed() { return elapsed; }
export function getStopwatchRunning() { return running; }
export function getStopwatchMode() { return mode; }
