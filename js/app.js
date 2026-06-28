// ── App Controller ────────────────────────────────────

const PRAYER_META = {
  Fajr:    { icon:"🌙", bn:"ফজর",       sub:"" },
  Sunrise: { icon:"🌅", bn:"সূর্যোদয়",  sub:"নামাজ নেই" },
  Dhuhr:   { icon:"☀️", bn:"যোহর",      sub:"" },
  Asr:     { icon:"🌤️", bn:"আসর",       sub:"" },
  Maghrib: { icon:"🌇", bn:"মাগরিব",    sub:"" },
  Isha:    { icon:"🌃", bn:"এশা",        sub:"" },
};

const state = {
  lat: null, lng: null,
  times: null, raw: null,
  sehri: null, iftar: null,
  qibla: null, deviceHeading: 0,
  currentTab: "prayer",
  azanPlayed: {},
  audioUnlocked: false,   // ← ব্রাউজার unlock হয়েছে কিনা
};

// ══════════════════════════════════════════════════════
// ── Azan Player ───────────────────────────────────────
// ══════════════════════════════════════════════════════

const AzanPlayer = {
  fajr:   null,
  normal: null,

  // অডিও অবজেক্ট তৈরি
  init() {
    this.fajr   = new Audio('./assets/azan_fajr.mp3');
    this.normal = new Audio('./assets/azan_normal.mp3');
    this.fajr.preload   = 'auto';
    this.normal.preload = 'auto';
  },

  // ব্রাউজার unlock: প্রথম user interaction-এ silent play করে unlock করা হয়
  unlock() {
    if (state.audioUnlocked) return;
    // ০ ভলিউমে play করে তুরন্ত pause — এটা browser-এর restriction তুলে দেয়
    [this.fajr, this.normal].forEach(a => {
      a.volume = 0;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.volume = 1; }).catch(() => {});
    });
    state.audioUnlocked = true;
  },

  play(prayer) {
    const audio = prayer === 'Fajr' ? this.fajr : this.normal;
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume      = 1.0;
    audio.play().catch(err => {
      console.warn('আজান বাজছে না:', err);
      showError('আজান বাজাতে সমস্যা হচ্ছে। পেজে একবার ট্যাপ করুন।');
    });
  },

  stop() {
    if (this.fajr)   { this.fajr.pause();   this.fajr.currentTime   = 0; }
    if (this.normal) { this.normal.pause();  this.normal.currentTime = 0; }
  }
};

// পেজে যেকোনো প্রথম ট্যাপ/ক্লিকে অডিও unlock
function unlockAudioOnInteraction() {
  AzanPlayer.unlock();
  // একবার হলেই যথেষ্ট
  document.removeEventListener('touchstart', unlockAudioOnInteraction);
  document.removeEventListener('click',      unlockAudioOnInteraction);
}

// আজান পরীক্ষা বাটন
function testAzan() {
  AzanPlayer.unlock();
  // ছোট delay দিয়ে play — unlock হওয়ার পর
  setTimeout(() => AzanPlayer.play('Dhuhr'), 200);
}

// ── Init ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  AzanPlayer.init();

  // প্রথম interaction-এ অডিও unlock
  document.addEventListener('touchstart', unlockAudioOnInteraction, { once: true });
  document.addEventListener('click',      unlockAudioOnInteraction, { once: true });

  drawTicks();
  startClock();
  getLocation();
  Compass.start(h => { state.deviceHeading = h; updateNeedle(); });
});

// ── Clock ─────────────────────────────────────────────
function startClock() { tick(); setInterval(tick, 1000); }

function toBn(str) {
  return String(str).replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
}

function tick() {
  const now = new Date();
  const h   = String(now.getHours()).padStart(2,"0");
  const m   = String(now.getMinutes()).padStart(2,"0");
  const s   = String(now.getSeconds()).padStart(2,"0");
  document.getElementById('clock').textContent = toBn(`${h}:${m}:${s}`);

  document.getElementById('dateDisplay').textContent =
    now.toLocaleDateString('bn-BD', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  if (s === "00") {
    if (state.raw)   { updateNextPrayer(); checkAndPlayAzan(); }
    if (state.iftar) { updateIftarCountdown(); }
  }
}

// ── Location ──────────────────────────────────────────
function getLocation() {
  if (!navigator.geolocation) { useFallback("Geolocation সাপোর্ট নেই"); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      state.lat = pos.coords.latitude;
      state.lng = pos.coords.longitude;
      onLocationReady();
      reverseGeocode(state.lat, state.lng);
    },
    () => useFallback("লোকেশন অ্যাক্সেস নেই — ঢাকার সময় দেখানো হচ্ছে")
  );
}

function useFallback(msg) {
  state.lat = 23.8103; state.lng = 90.4125;
  document.getElementById('locationName').textContent = "ঢাকা (ডিফল্ট)";
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

  renderPrayerList();
  updateNextPrayer();
  renderSpecialPanel();
  updateQiblaInfo();
}

function reverseGeocode(lat, lng) {
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
    .then(r => r.json())
    .then(d => {
      document.getElementById('locationName').textContent =
        d.address?.city || d.address?.town || d.address?.county || "আপনার অবস্থান";
    })
    .catch(() => document.getElementById('locationName').textContent = "আপনার অবস্থান");
}

// ── Prayer List ───────────────────────────────────────
function renderPrayerList() {
  const next = PrayerCalc.getNextPrayer(state.raw);
  const list = document.getElementById('prayerList');
  list.innerHTML = "";
  Object.entries(PRAYER_META).forEach(([key, meta]) => {
    const isNext = key === next;
    const div    = document.createElement('div');
    div.className = 'prayer-item' + (isNext ? ' active-prayer' : '');
    div.innerHTML = `
      <div class="prayer-left">
        <div class="prayer-icon-box">${meta.icon}</div>
        <div>
          <div class="prayer-name">${meta.bn}</div>
          ${meta.sub ? `<div class="prayer-sub">${meta.sub}</div>` : ''}
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
  document.getElementById('nextIcon').textContent = meta.icon;
  document.getElementById('nextPrayerText').innerHTML =
    `পরবর্তী <strong>${meta.bn}</strong> — ${state.times[next]}
     <span style="color:#8899aa">(${until})</span>`;
}

// ── Azan Check ────────────────────────────────────────
function checkAndPlayAzan() {
  const now   = new Date();
  const h     = now.getHours();
  const m     = now.getMinutes();
  const today = now.toDateString();

  if (state.azanPlayed._date !== today) {
    state.azanPlayed = { _date: today };
  }

  ['Fajr','Dhuhr','Asr','Maghrib','Isha'].forEach(prayer => {
    const t = state.times[prayer];
    if (!t || t === '--:--') return;
    const [ph, pm] = t.split(':').map(Number);
    if (h === ph && m === pm && !state.azanPlayed[prayer]) {
      state.azanPlayed[prayer] = true;
      AzanPlayer.play(prayer);
    }
  });
}

// ── Special Panel ─────────────────────────────────────
function renderSpecialPanel() {
  const now    = new Date();
  const dayName= now.toLocaleDateString('bn-BD', { weekday:'long' });
  const isFri  = now.getDay() === 5;

  const jTime  = state.times.Dhuhr;
  const [dh, dm] = jTime.split(':').map(Number);
  const kMin   = dh*60 + dm - 15;
  const khutba = `${String(Math.floor(kMin/60)).padStart(2,'0')}:${String(kMin%60).padStart(2,'0')}`;

  document.getElementById('jummaKhutba').textContent = khutba;
  document.getElementById('jummaTime').textContent   = jTime;
  document.getElementById('todayDay').textContent    = dayName;

  const note = document.getElementById('jummaNote');
  if (isFri) { note.textContent = "🕌 আজ জুম'আর দিন! আল্লাহু আকবার"; note.style.display = 'block'; }
  else        { note.style.display = 'none'; }

  document.getElementById('sehriTime').textContent = state.sehri;
  document.getElementById('iftarTime').textContent = state.iftar;
  updateIftarCountdown();
}

function updateIftarCountdown() {
  const cd = PrayerCalc.iftarCountdown(state.iftar);
  document.getElementById('iftarCountdown').textContent =
    cd || "ইফতারের সময় অতিবাহিত হয়েছে";
}

// ── Qibla ─────────────────────────────────────────────
function updateQiblaInfo() {
  if (!state.qibla) return;
  document.getElementById('qiblaDegree').textContent =
    `${Math.round(state.qibla)}° কিবলা`;
  document.getElementById('coordsDisplay').textContent =
    `📍 ${state.lat.toFixed(4)}°N, ${state.lng.toFixed(4)}°E`;
  updateNeedle();
}

function updateNeedle() {
  if (state.qibla === null) return;
  document.getElementById('needleWrap').style.transform =
    `rotate(${state.qibla - state.deviceHeading}deg)`;
}

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
    line.setAttribute('stroke', major ? 'rgba(201,168,76,0.5)' : 'rgba(68,68,68,0.5)');
    line.setAttribute('stroke-width', major ? '2' : '1');
    g.appendChild(line);
  }
}

// ── Tab Switching ─────────────────────────────────────
function switchTab(tab) {
  state.currentTab = tab;
  ['prayer','special','qibla','tasbih'].forEach(t => {
    const pid = 'panel' + t.charAt(0).toUpperCase() + t.slice(1);
    const tid = 'tab'   + t.charAt(0).toUpperCase() + t.slice(1);
    document.getElementById(pid)?.classList.toggle('hidden', t !== tab);
    document.getElementById(tid)?.classList.toggle('active',  t === tab);
  });
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (!el) return;
  el.textContent   = '⚠️ ' + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ══════════════════════════════════════════════════════
// ── Tasbih ────────────────────────────────────────────
// ══════════════════════════════════════════════════════

const Tasbih = { count:0, target:33, total:0, rounds:0, history:[] };

function setZikr(btn, arabic, bangla, target) {
  document.querySelectorAll('.zikr-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('zikrArabic').textContent = arabic;
  document.getElementById('zikrBangla').textContent = bangla;
  Tasbih.target = target;
  document.getElementById('tasbihTarget').textContent = `লক্ষ্য: ${toBn(target)}`;
  resetTasbih();
}

function tapTasbih() {
  if (navigator.vibrate) navigator.vibrate(30);
  Tasbih.history.push(Tasbih.count);
  Tasbih.count++;
  Tasbih.total++;
  if (Tasbih.count >= Tasbih.target) {
    Tasbih.rounds++;
    Tasbih.count = 0;
    showComplete();
  }
  updateTasbihUI();
}

function undoTasbih() {
  if (!Tasbih.history.length) return;
  Tasbih.count = Tasbih.history.pop();
  if (Tasbih.total > 0) Tasbih.total--;
  hideComplete();
  updateTasbihUI();
}

function resetTasbih() {
  Tasbih.count = 0; Tasbih.total = 0;
  Tasbih.rounds = 0; Tasbih.history = [];
  hideComplete();
  updateTasbihUI();
}

function updateTasbihUI() {
  document.getElementById('tasbihCount').textContent = toBn(Tasbih.count);
  const offset = 326.7 * (1 - Tasbih.count / Tasbih.target);
  document.getElementById('progressRing').style.strokeDashoffset = offset;
  document.getElementById('sessionRounds').textContent = toBn(Tasbih.rounds);
  document.getElementById('sessionTotal').textContent  = toBn(Tasbih.total);
}

function showComplete() {
  const el = document.getElementById('tasbihComplete');
  el.style.display = 'block';
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'complete .4s ease';
  if (navigator.vibrate) navigator.vibrate([50,30,50]);
  setTimeout(hideComplete, 3000);
}

function hideComplete() {
  document.getElementById('tasbihComplete').style.display = 'none';
}
