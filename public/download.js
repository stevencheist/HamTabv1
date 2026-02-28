/* Platform tab switching */
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById('tab-' + target).classList.add('active');
  });
});

/* Collapsible VOACAP section */
const toggle = document.querySelector('.collapsible-toggle');
const body = document.querySelector('.collapsible-body');
toggle.addEventListener('click', () => {
  const open = toggle.classList.toggle('open');
  body.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
