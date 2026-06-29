// ── App Controller ────────────────────────────────────

const PRAYER_META = {
  Fajr:    { icon:"🌙", bn:"ফজর",       en:"Fajr",    sub:"" },
  Sunrise: { icon:"🌅", bn:"সূর্যোদয়",  en:"Sunrise", sub_bn:"নামাজ নেই", sub_en:"No Prayer" },
  Dhuhr:   { icon:"☀️", bn:"যোহর",      en:"Dhuhr",   sub:"" },
  Asr:     { icon:"🌤️", bn:"আসর",       en:"Asr",     sub:"" },
  Maghrib: { icon:"🌇", bn:"মাগরিব",    en:"Maghrib", sub:"" },
  Isha:    { icon:"🌃", bn:"এশা",        en:"Isha",    sub:"" },
};

const state = {
  lat: null, lng: null,
  times: null, raw: null,
  sehri: null, iftar: null,
  qibla: null, deviceHeading: 0,
  currentTab: "prayer",
  azanPlayed: {},
  settings: null,
  lastNeedleAngle: 0,
};

// ── Azan Player ───────────────────────────────────────
const AzanPlayer = {
  play(prayer) {
    const s = state.settings;
    if (!s || s.azanMode === 'notification') return;
    const src = prayer === 'Fajr'
      ? './assets/azan_fajr.mp3'
      : './assets/azan_normal.mp3';
    const audio = new Audio(src);
    audio.volume = 1.0;
    audio.play().catch(e => console.warn('Azan:', e));
    if (s.vibration && navigator.vibrate) navigator.vibrate([500,200,500,200,500]);
  }
};

function testAzan() { AzanPlayer.play('Dhuhr'); }

// ── Init ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  state.settings = Settings.load();
  applyTheme();
  applyLanguage();
  drawTicks();
  startClock();
  loadOfflineData();
  getLocation();
  await NotificationSystem.requestPermission();
  Compass.start(h => {
    state.deviceHeading = h;
    updateNeedle();
  });
  renderSettingsPage();
  document.addEventListener('settingsChanged', () => {
    state.settings = Settings.load();
    applyTheme();
    applyLanguage();
    if (state.raw) NotificationSystem.scheduleToday(state.times, state.raw, state.settings);
  });
});

// ── Offline Support ───────────────────────────────────
function saveOfflineData(lat, lng, times, raw, sehri, iftar, qibla) {
  try {
    localStorage.setItem('offlineData', JSON.stringify({ lat, lng, times, raw, sehri, iftar, qibla, date: new Date().toDateString() }));
  } catch {}
}

function loadOfflineData() {
  try {
    const d = JSON.parse(localStorage.getItem('offlineData') || 'null');
    if (!d) return;
    // Recalculate for today even if offline
    if (d.lat && d.lng) {
      const result = PrayerCalc.calculate(d.lat, d.lng);
      state.lat = d.lat; state.lng = d.lng;
      state.times = result.times; state.raw = result.raw;
      state.sehri = result.sehri; state.iftar = result.iftar;
      state.qibla = d.qibla;
      renderPrayerList(); updateNextPrayer();
      renderSpecialPanel(); updateQiblaInfo();
    }
  } catch {}
}

// ── Theme & Language ──────────────────────────────────
function applyTheme() {
  document.body.classList.toggle('light-mode', !state.settings.darkMode);
}

function applyLanguage() {
  const lang = state.settings.language;
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
}

function t(bn, en) {
  return state.settings?.language === 'en' ? en : bn;
}

// ── Clock ─────────────────────────────────────────────
function startClock() { tick(); setInterval(tick, 1000); }

function toBn(str) {
  if (state.settings?.language === 'en') return str;
  return String(str).replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
}

function tick() {
  const now = new Date();
  const h   = String(now.getHours()).padStart(2,"0");
  const m   = String(now.getMinutes()).padStart(2,"0");
  const s   = String(now.getSeconds()).padStart(2,"0");
  const clock = document.getElementById('clock');
  if (clock) clock.textContent = toBn(`${h}:${m}:${s}`);

  const dateEl = document.getElementById('dateDisplay');
  if (dateEl) {
    const locale = state.settings?.language === 'en' ? 'en-US' : 'bn-BD';
    dateEl.textContent = now.toLocaleDateString(locale, {
      weekday:'long', year:'numeric', month:'long', day:'numeric'
    });
  }

  if (s === "00") {
    if (state.raw)   { updateNextPrayer(); checkAndPlayAzan(); }
    if (state.iftar) { updateIftarCountdown(); }
  }
}

// ── Location ──────────────────────────────────────────
function getLocation() {
  if (!navigator.geolocation) { useFallback(t("Geolocation সাপোর্ট নেই","Geolocation not supported")); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      state.lat = pos.coords.latitude;
      state.lng = pos.coords.longitude;
      onLocationReady();
      reverseGeocode(state.lat, state.lng);
    },
    () => useFallback(t("লোকেশন অ্যাক্সেস নেই — ঢাকার সময় দেখানো হচ্ছে","Location denied — showing Dhaka time"))
  );
}

function useFallback(msg) {
  state.lat = 23.8103; state.lng = 90.4125;
  const el = document.getElementById('locationName');
  if (el) el.textContent = t("ঢাকা (ডিফল্ট)","Dhaka (Default)");
  showError(msg);
  onLocationReady();
}

function onLocationReady() {
  const result = PrayerCalc.calculate(state.lat, state.lng);
  state.times  = result.times;
  state.raw    = result.raw;
  state.sehri  = result.sehri;
  state.iftar  = result.iftar;
  state.qibla  = QiblaCalc.getDirection(state.lat, state.lng);
  saveOfflineData(state.lat, state.lng, state.times, state.raw, state.sehri, state.iftar, state.qibla);
  renderPrayerList();
  updateNextPrayer();
  renderSpecialPanel();
  updateQiblaInfo();
  NotificationSystem.scheduleToday(state.times, state.raw, state.settings);
}

function reverseGeocode(lat, lng) {
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
    .then(r => r.json())
    .then(d => {
      const el = document.getElementById('locationName');
      if (el) el.textContent = d.address?.city || d.address?.town || d.address?.county || t("আপনার অবস্থান","Your Location");
    })
    .catch(() => {});
}

// ── Prayer List ───────────────────────────────────────
function renderPrayerList() {
  const next = PrayerCalc.getNextPrayer(state.raw);
  const list = document.getElementById('prayerList');
  if (!list) return;
  list.innerHTML = "";
  const lang = state.settings?.language || 'bn';
  Object.entries(PRAYER_META).forEach(([key, meta]) => {
    const isNext = key === next;
    const div    = document.createElement('div');
    div.className = 'prayer-item' + (isNext ? ' active-prayer' : '');
    const name = lang === 'en' ? meta.en : meta.bn;
    const sub  = lang === 'en' ? (meta.sub_en || '') : (meta.sub_bn || meta.sub || '');
    div.innerHTML = `
      <div class="prayer-left">
        <div class="prayer-icon-box">${meta.icon}</div>
        <div>
          <div class="prayer-name">${name}</div>
          ${sub ? `<div class="prayer-sub">${sub}</div>` : ''}
        </div>
      </div>
      <div class="prayer-time">${state.times[key]}</div>`;
    list.appendChild(div);
  });
}

// ── Next Prayer ───────────────────────────────────────
function updateNextPrayer() {
  const next  = PrayerCalc.getNextPrayer(state.raw);
  const meta  = PRAYER_META[next];
  const until = PrayerCalc.timeUntil(state.raw[next]);
  const lang  = state.settings?.language || 'bn';
  const name  = lang === 'en' ? meta.en : meta.bn;
  const el    = document.getElementById('nextIcon');
  const txt   = document.getElementById('nextPrayerText');
  if (el)  el.textContent = meta.icon;
  if (txt) txt.innerHTML  =
    `${t("পরবর্তী","Next")} <strong>${name}</strong> — ${state.times[next]}
     <span style="color:var(--muted)">(${until})</span>`;
}

// ── Azan Check ────────────────────────────────────────
function checkAndPlayAzan() {
  const now   = new Date();
  const h     = now.getHours();
  const m     = now.getMinutes();
  const today = now.toDateString();
  if (state.azanPlayed._date !== today) state.azanPlayed = { _date: today };

  ['Fajr','Dhuhr','Asr','Maghrib','Isha'].forEach(prayer => {
    const ti = state.times[prayer];
    if (!ti || ti === '--:--') return;
    const [ph, pm] = ti.split(':').map(Number);
    if (h === ph && m === pm && !state.azanPlayed[prayer]) {
      state.azanPlayed[prayer] = true;
      AzanPlayer.play(prayer);
    }
  });
}

// ── Special Panel ─────────────────────────────────────
function renderSpecialPanel() {
  const now     = new Date();
  const lang    = state.settings?.language || 'bn';
  const locale  = lang === 'en' ? 'en-US' : 'bn-BD';
  const dayName = now.toLocaleDateString(locale, { weekday:'long' });
  const isFri   = now.getDay() === 5;

  const jTime    = state.times.Dhuhr;
  const [dh, dm] = jTime.split(':').map(Number);
  const kMin     = dh*60 + dm - 15;
  const khutba   = `${String(Math.floor(kMin/60)).padStart(2,'0')}:${String(kMin%60).padStart(2,'0')}`;

  const el = (id) => document.getElementById(id);
  if (el('jummaKhutba')) el('jummaKhutba').textContent = khutba;
  if (el('jummaTime'))   el('jummaTime').textContent   = jTime;
  if (el('todayDay'))    el('todayDay').textContent    = dayName;

  const note = el('jummaNote');
  if (note) {
    if (isFri) { note.textContent = t("🕌 আজ জুম'আর দিন! আল্লাহু আকবার","🕌 Today is Jumu'ah! Allahu Akbar"); note.style.display='block'; }
    else { note.style.display='none'; }
  }

  if (el('sehriTime')) el('sehriTime').textContent = state.sehri;
  if (el('iftarTime')) el('iftarTime').textContent = state.iftar;
  updateIftarCountdown();
}

function updateIftarCountdown() {
  const cd = PrayerCalc.iftarCountdown(state.iftar);
  const el = document.getElementById('iftarCountdown');
  if (el) el.textContent = cd || t("ইফতারের সময় অতিবাহিত হয়েছে","Iftar time has passed");
}

// ── Qibla ─────────────────────────────────────────────
function updateQiblaInfo() {
  if (!state.qibla) return;
  const el = (id) => document.getElementById(id);
  if (el('qiblaDegree')) el('qiblaDegree').textContent = `${Math.round(state.qibla)}° ${t("কিবলা","Qibla")}`;
  if (el('coordsDisplay')) el('coordsDisplay').textContent = `📍 ${state.lat.toFixed(4)}°N, ${state.lng.toFixed(4)}°E`;
  updateNeedle();
}

function updateNeedle() {
  if (state.qibla === null) return;
  const needle = document.getElementById('needleWrap');
  if (!needle) return;
  // Shortest rotation to avoid spinning
  let target = state.qibla - state.deviceHeading;
  let current = state.lastNeedleAngle || 0;
  let diff = ((target - current + 540) % 360) - 180;
  state.lastNeedleAngle = current + diff;
  needle.style.transform = `rotate(${state.lastNeedleAngle}deg)`;
}

// ── Compass ticks ─────────────────────────────────────
function drawTicks() {
  const g = document.getElementById('ticks');
  if (!g) return;
  for (let i = 0; i < 36; i++) {
    const a     = (i*10 - 90) * Math.PI / 180;
    const major = i % 3 === 0;
    const r1    = major ? 91 : 95, r2 = 100;
    const line  = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', 110 + r1*Math.cos(a));
    line.setAttribute('y1', 110 + r1*Math.sin(a));
    line.setAttribute('x2', 110 + r2*Math.cos(a));
    line.setAttribute('y2', 110 + r2*Math.sin(a));
    line.setAttribute('stroke', major ? 'rgba(22,163,74,0.6)' : 'rgba(68,68,68,0.5)');
    line.setAttribute('stroke-width', major ? '2' : '1');
    g.appendChild(line);
  }
}

// ── Tab Switching ─────────────────────────────────────
function switchTab(tab) {
  state.currentTab = tab;
  ['prayer','special','qibla','tasbih','settings'].forEach(t => {
    document.getElementById('panel' + t.charAt(0).toUpperCase() + t.slice(1))?.classList.toggle('hidden', t !== tab);
    document.getElementById('tab'   + t.charAt(0).toUpperCase() + t.slice(1))?.classList.toggle('active',  t === tab);
  });
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (!el) return;
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ── Settings Page ─────────────────────────────────────
function renderSettingsPage() {
  const s = Settings.load();
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  setVal('settingAzan',         s.azanMode);
  setChk('settingReminder',     s.reminder);
  setVal('settingReminderTime', s.reminderTime);
  setChk('settingVibration',    s.vibration);
  setChk('settingDarkMode',     s.darkMode);
  setVal('settingLanguage',     s.language);
}

function onSettingChange(key, el) {
  let value;
  if (el.type === 'checkbox') value = el.checked;
  else if (el.type === 'number') value = parseInt(el.value);
  else value = el.value;
  Settings.set(key, value);
  // Re-render UI if language/theme changed
  if (key === 'language') { applyLanguage(); renderPrayerList(); updateNextPrayer(); renderSpecialPanel(); }
  if (key === 'darkMode')  applyTheme();
}

// ══════════════════════════════════════════════════════
// ── Tasbih ────────────────────────────────────────────
// ══════════════════════════════════════════════════════
const Tasbih = { count:0, target:33, total:0, rounds:0, history:[] };

function setZikr(btn, arabic, bangla, target) {
  document.querySelectorAll('.zikr-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const a = document.getElementById('zikrArabic'), b2 = document.getElementById('zikrBangla');
  if (a) a.textContent = arabic;
  if (b2) b2.textContent = bangla;
  Tasbih.target = target;
  const tgt = document.getElementById('tasbihTarget');
  if (tgt) tgt.textContent = `${t("লক্ষ্য","Target")}: ${toBn(target)}`;
  resetTasbih();
}

function tapTasbih() {
  if (navigator.vibrate && state.settings?.vibration) navigator.vibrate(30);
  Tasbih.history.push(Tasbih.count);
  Tasbih.count++; Tasbih.total++;
  if (Tasbih.count >= Tasbih.target) {
    Tasbih.rounds++; Tasbih.count = 0; showComplete();
  }
  updateTasbihUI();
}

function undoTasbih() {
  if (!Tasbih.history.length) return;
  Tasbih.count = Tasbih.history.pop();
  if (Tasbih.total > 0) Tasbih.total--;
  hideComplete(); updateTasbihUI();
}

function resetTasbih() {
  Tasbih.count=0; Tasbih.total=0; Tasbih.rounds=0; Tasbih.history=[];
  hideComplete(); updateTasbihUI();
}

function updateTasbihUI() {
  const el = (id) => document.getElementById(id);
  if (el('tasbihCount')) el('tasbihCount').textContent = toBn(Tasbih.count);
  const offset = 326.7 * (1 - Tasbih.count / Tasbih.target);
  const ring = el('progressRing');
  if (ring) ring.style.strokeDashoffset = offset;
  if (el('sessionRounds')) el('sessionRounds').textContent = toBn(Tasbih.rounds);
  if (el('sessionTotal'))  el('sessionTotal').textContent  = toBn(Tasbih.total);
}

function showComplete() {
  const el = document.getElementById('tasbihComplete');
  if (!el) return;
  el.style.display='block'; el.style.animation='none';
  void el.offsetWidth; el.style.animation='complete .4s ease';
  if (navigator.vibrate && state.settings?.vibration) navigator.vibrate([50,30,50]);
  setTimeout(hideComplete, 3000);
}
function hideComplete() {
  const el = document.getElementById('tasbihComplete');
  if (el) el.style.display='none';
}
