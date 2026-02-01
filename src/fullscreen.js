import state from './state.js';
import { $ } from './dom.js';

export function initFullscreenListeners() {
  const fullscreenBtn = $('fullscreenBtn');

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
    if (state.map) setTimeout(() => state.map.invalidateSize(), 100);
  });
}
