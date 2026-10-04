// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// --- In-app dialogs ---
// Replacements for window.alert / confirm / prompt. SF Foundry UI rule: errors,
// confirmations and attestations are shown in UI we control, never in native browser
// dialogs, so they follow the theme, stay accessible, and can't be suppressed by the
// browser ("prevent this page from creating additional dialogs").
//
// Each returns a Promise. Calls made while a dialog is open wait their turn.
import state from './state.js';
import { openModal, closeModal } from './a11y.js';

let overlay = null;
let queue = Promise.resolve();

function build() {
  overlay = document.createElement('div');
  overlay.className = 'splash-overlay hidden app-dialog-overlay';
  overlay.id = 'appDialog';
  overlay.innerHTML = `
    <div class="splash-box app-dialog-box" role="alertdialog" aria-modal="true" aria-labelledby="appDialogTitle" aria-describedby="appDialogMsg">
      <h3 id="appDialogTitle"></h3>
      <p id="appDialogMsg" class="app-dialog-msg"></p>
      <input type="text" id="appDialogInput" class="app-dialog-input hidden" autocomplete="off" spellcheck="false" />
      <div class="app-dialog-actions">
        <button type="button" id="appDialogCancel" class="app-dialog-btn app-dialog-secondary">Cancel</button>
        <button type="button" id="appDialogOk" class="app-dialog-btn app-dialog-primary">OK</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// kind: 'alert' | 'confirm' | 'prompt'. Resolves true/false, undefined, or string/null.
function show(kind, opts) {
  if (!overlay) build();
  const title = overlay.querySelector('#appDialogTitle');
  const msg = overlay.querySelector('#appDialogMsg');
  const input = overlay.querySelector('#appDialogInput');
  const okBtn = overlay.querySelector('#appDialogOk');
  const cancelBtn = overlay.querySelector('#appDialogCancel');

  title.textContent = opts.title || (kind === 'alert' ? 'HamTab' : kind === 'prompt' ? 'Enter a value' : 'Are you sure?');
  title.classList.toggle('hidden', !title.textContent);
  msg.textContent = opts.message || '';
  msg.classList.toggle('hidden', !opts.message);
  input.classList.toggle('hidden', kind !== 'prompt');
  input.value = opts.value || '';
  input.placeholder = opts.placeholder || '';
  if (opts.label) input.setAttribute('aria-label', opts.label);
  okBtn.textContent = opts.confirmLabel || 'OK';
  okBtn.classList.toggle('app-dialog-danger', Boolean(opts.danger));
  cancelBtn.textContent = opts.cancelLabel || 'Cancel';
  cancelBtn.classList.toggle('hidden', kind === 'alert');

  return new Promise((resolve) => {
    const finish = (confirmed) => {
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey, true);
      closeModal(overlay);
      if (kind === 'alert') resolve(undefined);
      else if (kind === 'confirm') resolve(confirmed);
      else resolve(confirmed ? input.value : null);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onBackdrop = (e) => { if (e.target === overlay) finish(false); };
    const onKey = (e) => {
      if (overlay.classList.contains('hidden')) return;
      if (e.key === 'Escape' && (state.a11yEscapeClose !== false || kind === 'alert')) {
        e.stopPropagation();
        finish(false);
      } else if (e.key === 'Enter' && (kind !== 'confirm' || document.activeElement === okBtn || document.activeElement === input)) {
        e.preventDefault();
        e.stopPropagation();
        finish(true);
      }
    };
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey, true); // capture: handle before other modals' Escape handlers

    // Destructive confirms focus Cancel so Enter alone can't delete; prompts focus the input.
    const focusEl = kind === 'prompt' ? input : (opts.danger ? cancelBtn : okBtn);
    openModal(overlay, { focusEl });
    if (kind === 'prompt') input.select();
  });
}

function enqueue(kind, opts) {
  const next = queue.then(() => show(kind, opts));
  queue = next.catch(() => {});
  return next;
}

// opts: { title, message, confirmLabel, cancelLabel, danger }
export function confirmDialog(opts) {
  return enqueue('confirm', typeof opts === 'string' ? { message: opts } : opts);
}

// opts: { title, message, confirmLabel }
export function alertDialog(opts) {
  return enqueue('alert', typeof opts === 'string' ? { message: opts } : opts);
}

// opts: { title, message, label, value, placeholder, confirmLabel }. Resolves the text, or null on cancel.
export function promptDialog(opts) {
  return enqueue('prompt', typeof opts === 'string' ? { title: opts } : opts);
}
