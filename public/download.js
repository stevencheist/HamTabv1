/* Inherit theme from main app via localStorage */
(function() {
  var themes = {
    default: {'--bg':'#1a1a2e','--surface':'#16213e','--surface2':'#0f3460','--surface3':'#1a4a7a','--accent':'#e94560','--text':'#e0e0e0','--text-dim':'#8899aa','--green':'#00c853','--yellow':'#ffd600','--red':'#ff1744','--orange':'#ff9100','--border':'#2a3a5e','--bg-secondary':'#1a1a2e','--bg-tertiary':'#252540'},
    lcars: {'--bg':'#000000','--surface':'#0a0a14','--surface2':'#9999CC','--surface3':'#CC99CC','--accent':'#FFCC66','--text':'#FF9966','--text-dim':'#CCBBDD','--green':'#99CCFF','--yellow':'#FFFF99','--red':'#CC6666','--orange':'#FF9933','--border':'#9999CC','--bg-secondary':'#0a0a14','--bg-tertiary':'#111122'},
    terminal: {'--bg':'#000000','--surface':'#0a1a0a','--surface2':'#0d2b0d','--surface3':'#143014','--accent':'#00cc66','--text':'#00ff88','--text-dim':'#338855','--green':'#00ff44','--yellow':'#cccc00','--red':'#ff3333','--orange':'#ff8800','--border':'#1a4a2a','--bg-secondary':'#0a1a0a','--bg-tertiary':'#0d200d'},
    hamclock: {'--bg':'#000000','--surface':'#000000','--surface2':'#0a0a0a','--surface3':'#141414','--accent':'#00ffff','--text':'#e0e0e0','--text-dim':'#888899','--green':'#00ff00','--yellow':'#ffff00','--red':'#ff0000','--orange':'#e8a000','--border':'#333333','--bg-secondary':'#000000','--bg-tertiary':'#0a0a0a'},
    radioface: {'--bg':'#060a12','--surface':'#0c1220','--surface2':'#141e30','--surface3':'#1c2840','--accent':'#00e5ff','--text':'#d0e0f0','--text-dim':'#4a6080','--green':'#00c853','--yellow':'#ffd600','--red':'#ff1744','--orange':'#ff9100','--border':'#1a2a44','--bg-secondary':'#060a12','--bg-tertiary':'#080e18'}
  };
  var saved = localStorage.getItem('hamtab_theme') || 'default';
  var vars = themes[saved];
  if (vars) {
    var root = document.documentElement;
    for (var prop in vars) root.style.setProperty(prop, vars[prop]);
  }
})();

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
