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

// v2: Rename old 'hamclock' theme to 'terminal' (before new 'hamclock' theme is introduced)
export function migrateV2() {
  if (localStorage.getItem('hamtab_migration_v2')) return;
  if (localStorage.getItem('hamtab_theme') === 'hamclock') {
    localStorage.setItem('hamtab_theme', 'terminal');
  }
  localStorage.setItem('hamtab_migration_v2', '1');
}
