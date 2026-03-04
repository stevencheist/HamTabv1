// --- Accessibility Utilities ---
// Focus trap, modal lifecycle, and shared a11y helpers.

import state from './state.js';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// --- Focus Trap ---

// trapFocus(container) — constrains Tab/Shift+Tab within container.
// Returns a cleanup function that removes the listener.
export function trapFocus(container) {
  function handler(e) {
    if (e.key !== 'Tab') return;
    const focusable = container.querySelectorAll(FOCUSABLE);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

// --- Modal Stack ---
// Supports nested modals (e.g. config → sub-config).

const modalStack = []; // { overlay, cleanup, previousFocus }

// openModal(overlayEl, options?)
// Shows overlay, saves activeElement, traps focus, sets initial focus.
// options.focusEl — element to focus on open (defaults to first focusable)
export function openModal(overlayEl, options) {
  if (!overlayEl) return;
  const previousFocus = document.activeElement;
  overlayEl.classList.remove('hidden');

  const inner = overlayEl.querySelector('[role="dialog"],[role="alertdialog"]') || overlayEl.firstElementChild;
  const cleanup = (state.a11yFocusTrap && inner) ? trapFocus(inner) : null;

  modalStack.push({ overlay: overlayEl, cleanup, previousFocus });

  // Set initial focus
  const focusTarget = (options && options.focusEl) || (inner && inner.querySelector(FOCUSABLE));
  if (focusTarget) {
    // Defer focus to next frame so the overlay is visible
    requestAnimationFrame(() => focusTarget.focus());
  }
}

// closeModal(overlayEl)
// Hides overlay, releases trap, restores previous focus.
export function closeModal(overlayEl) {
  if (!overlayEl) return;
  overlayEl.classList.add('hidden');

  // Find and remove from stack
  const idx = modalStack.findIndex(m => m.overlay === overlayEl);
  if (idx !== -1) {
    const entry = modalStack.splice(idx, 1)[0];
    if (entry.cleanup) entry.cleanup();
    if (entry.previousFocus && typeof entry.previousFocus.focus === 'function') {
      entry.previousFocus.focus();
    }
  }
}
