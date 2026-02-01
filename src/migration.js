export function migrate() {
  if (localStorage.getItem('hamtab_migrated')) return;
  const PREFIX_OLD = 'pota_';
  const PREFIX_NEW = 'hamtab_';
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(PREFIX_OLD)) {
      const newKey = PREFIX_NEW + key.slice(PREFIX_OLD.length);
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, localStorage.getItem(key));
      }
      localStorage.removeItem(key);
      i--;
    }
  }
  localStorage.setItem('hamtab_migrated', '1');
}
