// Mobile hamburger menu — slide-out drawer with backdrop
import state from './state.js';
import { $ } from './dom.js';
import { openLayoutMenu } from './layouts.js';
import { trapFocus } from './a11y.js';

let isOpen = false;
let releaseTrap = null;

function openMenu() {
  const drawer = $('mobileMenuDrawer');
  const backdrop = $('mobileMenuBackdrop');
  const menuBtn = $('mobileMenuBtn');
  if (!drawer || !backdrop) return;

  drawer.classList.add('open');
  backdrop.classList.add('open');
  isOpen = true;
  if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');

  // Trap focus within drawer (gated by a11y setting)
  if (state.a11yFocusTrap) releaseTrap = trapFocus(drawer);

  // Focus first menu item
  const firstItem = drawer.querySelector('.mobile-menu-item');
  if (firstItem) firstItem.focus();

  // Sync update indicator into drawer
  const updateEl = $('updateIndicator');
  const menuUpdate = $('mobileMenuUpdate');
  if (updateEl && menuUpdate) {
    menuUpdate.innerHTML = updateEl.innerHTML;
  }
}

function closeMenu() {
  const drawer = $('mobileMenuDrawer');
  const backdrop = $('mobileMenuBackdrop');
  const menuBtn = $('mobileMenuBtn');
  if (!drawer || !backdrop) return;

  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  isOpen = false;
  if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');

  // Release focus trap and restore focus to menu button
  if (releaseTrap) { releaseTrap(); releaseTrap = null; }
  if (menuBtn) menuBtn.focus();
}

export function initMobileMenu() {
  const menuBtn = $('mobileMenuBtn');
  const backdrop = $('mobileMenuBackdrop');
  const drawer = $('mobileMenuDrawer');

  if (!menuBtn || !backdrop || !drawer) return;

  // Toggle on hamburger click
  menuBtn.addEventListener('click', () => {
    if (isOpen) closeMenu();
    else openMenu();
  });

  // Close on backdrop click
  backdrop.addEventListener('click', closeMenu);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) { if (!state.a11yEscapeClose) return; closeMenu(); }
  });

  // Handle menu item actions
  drawer.addEventListener('click', (e) => {
    const item = e.target.closest('.mobile-menu-item');
    if (!item) return;

    const action = item.dataset.action;
    if (!action) {
      // It's a link (Coffee, Discord) — let it navigate, close menu
      closeMenu();
      return;
    }

    closeMenu();

    switch (action) {
      case 'layouts':
        openLayoutMenu();
        break;
      case 'config':
        document.getElementById('editCallBtn')?.click();
        break;
      case 'refresh':
        document.getElementById('refreshBtn')?.click();
        break;
      case 'feedback':
        document.getElementById('feedbackBtn')?.click();
        break;
    }
  });
}
