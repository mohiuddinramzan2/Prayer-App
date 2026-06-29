// ── Prayer Time Calculator ────────────────────────────
const PrayerCalc = (() => {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  function julianDay(date) {
    const y = date.getFullYear(), m = date.getMonth()+1, d = date.getDate();
    return 367*y - Math.floor(7*(y+Math.floor((m+9)/12))/4) + Math.floor(275*m/9) + d + 1721013.5;
  }

  function sunPosition(date) {
    const n   = julianDay(date) - 2451545.0;
    const L   = (280.46 + 0.9856474*n) % 360;
    const g   = toRad((357.528 + 0.9856003*n) % 360);
    const lam = toRad(L + 1.915*Math.sin(g) + 0.02*Math.sin(2*g));
    const eps = toRad(23.439 - 0.0000004*n);
    const RA  = toDeg(Math.atan2(Math.cos(eps)*Math.sin(lam), Math.cos(lam))) / 15;
    const dec = toDeg(Math.asin(Math.sin(eps)*Math.sin(lam)));
    const eqT = (L/15 - ((RA%24)+24)%24) * 60;
    return { dec, eqT };
  }

  function hourAngle(lat, dec, angle) {
    const cosH = (Math.sin(toRad(-angle)) - Math.sin(toRad(lat))*Math.sin(toRad(dec)))
               / (Math.cos(toRad(lat))*Math.cos(toRad(dec)));
    if (Math.abs(cosH) > 1) return null;
    return toDeg(Math.acos(cosH)) / 15;
  }

  function asrAngle(lat, dec) {
    const x    = 1 + Math.tan(toRad(Math.abs(lat - dec)));
    const cosH = (Math.sin(Math.atan(1/x)) - Math.sin(toRad(lat))*Math.sin(toRad(dec)))
               / (Math.cos(toRad(lat))*Math.cos(toRad(dec)));
    if (Math.abs(cosH) > 1) return null;
    return toDeg(Math.acos(cosH)) / 15;
  }

  function toStr(h) {
    if (h === null || h === undefined) return "--:--";
    const total = ((h%24)+24)%24;
    const hh = Math.floor(total);
    const mm = Math.floor((total-hh)*60);
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
  }

  function subtractMinutes(timeStr, mins) {
    if (!timeStr || timeStr === "--:--") return "--:--";
    const [h, m] = timeStr.split(":").map(Number);
    const total  = h*60 + m - mins;
    const hh = Math.floor(((total%1440)+1440)%1440 / 60);
    const mm = ((total%1440)+1440)%1440 % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
  }

  function calculate(lat, lng, date = new Date()) {
    const tz  = -date.getTimezoneOffset() / 60;
    const { dec, eqT } = sunPosition(date);
    const noon = 12 - lng/15 - eqT/60 + tz;
    const fajrH  = hourAngle(lat, dec, 18);
    const sunrH  = hourAngle(lat, dec, 0.833);
    const asrH   = asrAngle(lat, dec);
    const maghH  = hourAngle(lat, dec, 0.833);
    const ishaH  = hourAngle(lat, dec, 17);
    const raw = {
      Fajr:    fajrH  !== null ? noon - fajrH  : null,
      Dhuhr:   noon,
      Asr:     asrH   !== null ? noon + asrH   : null,
      Maghrib: maghH  !== null ? noon + maghH  : null,
      Isha:    ishaH  !== null ? noon + ishaH  : null,
    };
    const fajrStr    = toStr(raw.Fajr);
    const maghribStr = toStr(raw.Maghrib);
    return {
      times: {
        Fajr:    fajrStr,
        Sunrise: toStr(sunrH !== null ? noon - sunrH : null),
        Dhuhr:   toStr(raw.Dhuhr),
        Asr:     toStr(raw.Asr),
        Maghrib: maghribStr,
        Isha:    toStr(raw.Isha),
      },
      raw,
      sehri: subtractMinutes(fajrStr, 10),
      iftar: maghribStr,
    };
  }

  function getNextPrayer(raw) {
    const now = new Date();
    const cur = now.getHours() + now.getMinutes()/60;
    for (const p of ["Fajr","Dhuhr","Asr","Maghrib","Isha"]) {
      if (raw[p] !== null && cur < raw[p]) return p;
    }
    return "Fajr";
  }

  function timeUntil(rawH) {
    const now = new Date();
    const cur = now.getHours() + now.getMinutes()/60;
    let diff  = rawH - cur;
    if (diff < 0) diff += 24;
    const h = Math.floor(diff);
    const m = Math.floor((diff-h)*60);
    return h > 0 ? `${h} ঘণ্টা ${m} মিনিট পরে` : `${m} মিনিট পরে`;
  }

  function iftarCountdown(iftarStr) {
    if (!iftarStr || iftarStr === "--:--") return null;
    const [ih, im] = iftarStr.split(":").map(Number);
    const now  = new Date();
    const cur  = now.getHours()*60 + now.getMinutes();
    const ifm  = ih*60 + im;
    let diff   = ifm - cur;
    if (diff < 0) return null;
    const h = Math.floor(diff/60), m = diff % 60;
    if (h > 0) return `ইফতার পর্যন্ত: ${h} ঘণ্টা ${m} মিনিট বাকি`;
    if (m > 0) return `ইফতার পর্যন্ত: ${m} মিনিট বাকি`;
    return "🌙 ইফতারের সময় হয়েছে!";
  }

  return { calculate, getNextPrayer, timeUntil, iftarCountdown };
})();
