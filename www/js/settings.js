// ── Settings Manager ──────────────────────────────────
const Settings = (() => {
  const DEFAULTS = {
    azanMode:     'full',      // full | short | notification
    reminder:     true,
    reminderTime: 10,          // minutes before
    vibration:    true,
    darkMode:     true,
    language:     'bn',        // bn | en
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem('prayerSettings') || '{}');
      return { ...DEFAULTS, ...saved };
    } catch { return { ...DEFAULTS }; }
  }

  function save(settings) {
    try { localStorage.setItem('prayerSettings', JSON.stringify(settings)); } catch {}
  }

  function get(key) { return load()[key]; }

  function set(key, value) {
    const s = load();
    s[key] = value;
    save(s);
    document.dispatchEvent(new CustomEvent('settingsChanged', { detail: { key, value } }));
  }

  return { load, save, get, set, DEFAULTS };
})();
