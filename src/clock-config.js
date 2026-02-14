// --- Clock Face Config Panel ---
// Gear icon opens overlay with face thumbnails and complication checkboxes.

import state from './state.js';
import { $ } from './dom.js';
import { buildFacePreview, CLOCK_FACES } from './clock-faces.js';
import { COMPLICATION_DEFS } from './clock-complications.js';
import { rebuildClock } from './analog-clock.js';

export function initClockConfigListeners() {
  const btn = $('clockCfgBtn');
  if (!btn) return;

  // Prevent drag when clicking gear
  btn.addEventListener('mousedown', (e) => { e.stopPropagation(); });

  btn.addEventListener('click', () => {
    const picker = $('clockFacePicker');
    const compList = $('clockCompList');
    if (!picker || !compList) return;

    // Render face thumbnails
    picker.innerHTML = '';
    for (const face of Object.values(CLOCK_FACES)) {
      const wrapper = document.createElement('div');
      wrapper.className = 'clock-face-item';

      const thumb = document.createElement('div');
      thumb.className = 'clock-face-thumb';
      if (state.clockFace === face.id) thumb.classList.add('active');
      thumb.appendChild(buildFacePreview(face.id));
      thumb.dataset.faceId = face.id;
      thumb.addEventListener('click', () => {
        picker.querySelectorAll('.clock-face-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
      wrapper.appendChild(thumb);

      const label = document.createElement('div');
      label.className = 'clock-face-label';
      label.textContent = face.name;
      wrapper.appendChild(label);

      picker.appendChild(wrapper);
    }

    // Render complication checkboxes
    compList.innerHTML = '';
    for (const comp of COMPLICATION_DEFS) {
      const label = document.createElement('label');
      label.className = 'splash-widget-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.compId = comp.id;
      cb.checked = !!(state.clockComplications && state.clockComplications[comp.id]);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(` ${comp.name}`));
      const desc = document.createElement('span');
      desc.className = 'comp-desc';
      desc.textContent = ` — ${comp.description}`;
      label.appendChild(desc);
      compList.appendChild(label);
    }

    $('clockCfgSplash').classList.remove('hidden');
  });

  // OK button
  const okBtn = $('clockCfgOk');
  if (okBtn) {
    okBtn.addEventListener('click', () => {
      // Save face selection
      const activeThumb = document.querySelector('.clock-face-thumb.active');
      if (activeThumb) {
        state.clockFace = activeThumb.dataset.faceId;
        localStorage.setItem('hamtab_clock_face', state.clockFace);
      }

      // Save complications
      const comps = {};
      document.querySelectorAll('#clockCompList input[type="checkbox"]').forEach(cb => {
        if (cb.checked) comps[cb.dataset.compId] = true;
      });
      state.clockComplications = comps;
      localStorage.setItem('hamtab_clock_complications', JSON.stringify(comps));

      $('clockCfgSplash').classList.add('hidden');
      rebuildClock();
    });
  }
}
