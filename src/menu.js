// Mobile hamburger menu — slide-out drawer with backdrop
import { $ } from './dom.js';

let isOpen = false;

function openMenu() {
  const drawer = $('mobileMenuDrawer');
  const backdrop = $('mobileMenuBackdrop');
  if (!drawer || !backdrop) return;

  drawer.classList.add('open');
  backdrop.classList.add('open');
  isOpen = true;

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
  if (!drawer || !backdrop) return;

  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  isOpen = false;
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
    if (e.key === 'Escape' && isOpen) closeMenu();
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
