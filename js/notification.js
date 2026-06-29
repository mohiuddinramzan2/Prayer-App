// ── Notification & Scheduling System ─────────────────
const NotificationSystem = (() => {
  let _permitted = false;

  async function requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') { _permitted = true; return true; }
    if (Notification.permission === 'denied')  return false;
    const result = await Notification.requestPermission();
    _permitted = result === 'granted';
    return _permitted;
  }

  function show(title, body, icon = './assets/icon-192.png') {
    if (!_permitted) return;
    try {
      new Notification(title, { body, icon, badge: icon, vibrate: [200,100,200] });
    } catch(e) { console.warn('Notification error:', e); }
  }

  // Schedule all prayer notifications for today
  function scheduleToday(times, raw, settings) {
    // Clear existing timers
    if (window._prayerTimers) {
      window._prayerTimers.forEach(t => clearTimeout(t));
    }
    window._prayerTimers = [];

    if (!_permitted) return;

    const PRAYER_BN = {
      Fajr:'ফজর', Dhuhr:'যোহর', Asr:'আসর', Maghrib:'মাগরিব', Isha:'এশা'
    };
    const PRAYER_EN = {
      Fajr:'Fajr', Dhuhr:'Dhuhr', Asr:'Asr', Maghrib:'Maghrib', Isha:'Isha'
    };

    const now   = new Date();
    const nowMs = now.getTime();
    const lang  = settings.language || 'bn';

    Object.entries(raw).forEach(([prayer, rawH]) => {
      if (rawH === null || prayer === 'Sunrise') return;
      const prayerName = lang === 'bn' ? PRAYER_BN[prayer] : PRAYER_EN[prayer];

      // Main notification at prayer time
      const prayerMs = new Date().setHours(0,0,0,0) + rawH * 3600000;
      const mainDelay = prayerMs - nowMs;

      if (mainDelay > 0) {
        const t1 = setTimeout(() => {
          show(
            lang === 'bn' ? `🕌 ${prayerName}ের সময় হয়েছে` : `🕌 ${prayerName} Time`,
            lang === 'bn' ? `আযান শুনুন এবং নামাজ পড়ুন` : `It's time for ${prayerName} prayer`
          );
        }, mainDelay);
        window._prayerTimers.push(t1);
      }

      // Reminder notification
      if (settings.reminder && settings.reminderTime > 0) {
        const remMs   = prayerMs - settings.reminderTime * 60000;
        const remDelay = remMs - nowMs;
        if (remDelay > 0) {
          const t2 = setTimeout(() => {
            show(
              lang === 'bn'
                ? `⏰ ${settings.reminderTime} মিনিট পরে ${prayerName}`
                : `⏰ ${prayerName} in ${settings.reminderTime} minutes`,
              lang === 'bn' ? `নামাজের প্রস্তুতি নিন` : `Prepare for prayer`
            );
          }, remDelay);
          window._prayerTimers.push(t2);
        }
      }
    });
  }

  // Check permission on init
  if ('Notification' in window && Notification.permission === 'granted') {
    _permitted = true;
  }

  return { requestPermission, show, scheduleToday };
})();
