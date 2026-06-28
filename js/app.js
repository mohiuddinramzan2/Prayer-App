// ── App Controller ────────────────────────────────────

const PRAYER_META = {
  Fajr:    { icon: "🌙", bn: "ফজর",      sub: "" },
  Sunrise: { icon: "🌅", bn: "সূর্যোদয়", sub: "নামাজ নেই" },
  Dhuhr:   { icon: "☀️", bn: "যোহর",     sub: "" },
  Asr:     { icon: "🌤️", bn: "আসর",      sub: "" },
  Maghrib: { icon: "🌇", bn: "মাগরিব",   sub: "" },
  Isha:    { icon: "🌃", bn: "এশা",       sub: "" },
};

let state = {
  lat: null,
  lng: null,
  times: null,
  raw: null,
  qibla: null,
  currentTab: "prayer",
  deviceHeading: 0,
};

// ── Init ──────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  drawTicks();
  startClock();
  getLocation();

  Compass.start(heading => {
    state.deviceHeading = heading;
    updateNeedle();
  });
});

// ── Clock ─────────────────────────────────────────────
function startClock() {
  tick();
  setInterval(tick, 1000);
}

function toBengaliDigits(str) {
  const map = {"0":"০","1":"১","2":"২","3":"৩","4":"৪","5":"৫","6":"৬","7":"৭","8":"৮","9":"৯"};
  return String(str).replace(/[0-9]/g, d => map[d]);
}

function tick() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2,"0");
  const m    = String(now.getMinutes()).padStart(2,"0");
  const s    = String(now.getSeconds()).padStart(2,"0");
  document.getElementById("clock").textContent = toBengaliDigits(`${h}:${m}:${s}`);

  const dateStr = now.toLocaleDateString("bn-BD", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  document.getElementById("dateDisplay").textContent = dateStr;

  // Update next prayer countdown every minute
  if (s === "00" && state.raw) updateNextPrayer();
}

// ── Geolocation ───────────────────────────────────────
function getLocation() {
  if (!navigator.geolocation) {
    useFallback("Geolocation সাপোর্ট নেই — ঢাকার সময় দেখানো হচ্ছে");
    return;
  }
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
  state.lat = 23.8103;
  state.lng = 90.4125;
  document.getElementById("locationName").textContent = "ঢাকা (ডিফল্ট)";
  showError(msg);
  onLocationReady();
}

function onLocationReady() {
  const result   = PrayerCalc.calculate(state.lat, state.lng);
  state.times    = result.times;
  state.raw      = result.raw;
  state.qibla    = QiblaCalc.getDirection(state.lat, state.lng);

  renderPrayerList();
  updateNextPrayer();
  updateQiblaInfo();
}

// ── Reverse Geocode ───────────────────────────────────
function reverseGeocode(lat, lng) {
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
    .then(r => r.json())
    .then(d => {
      const name = d.address?.city || d.address?.town || d.address?.county || "আপনার অবস্থান";
      document.getElementById("locationName").textContent = name;
    })
    .catch(() => {
      document.getElementById("locationName").textContent = "আপনার অবস্থান";
    });
}

// ── Render Prayer List ────────────────────────────────
function renderPrayerList() {
  const next = PrayerCalc.getNextPrayer(state.raw);
  const list = document.getElementById("prayerList");
  list.innerHTML = "";

  Object.entries(PRAYER_META).forEach(([key, meta]) => {
    const isNext = key === next;
    const item   = document.createElement("div");
    item.className = "prayer-item" + (isNext ? " active-prayer" : "");

    item.innerHTML = `
      <div class="prayer-left">
        <div class="prayer-icon-box">${meta.icon}</div>
        <div>
          <div class="prayer-name">${meta.bn}</div>
          ${meta.sub ? `<div class="prayer-sub">${meta.sub}</div>` : ""}
        </div>
      </div>
      <div class="prayer-time">${state.times[key]}</div>
    `;
    list.appendChild(item);
  });
}

// ── Next Prayer Banner ────────────────────────────────
function updateNextPrayer() {
  if (!state.raw) return;
  const next = PrayerCalc.getNextPrayer(state.raw);
  const meta = PRAYER_META[next];
  const until = PrayerCalc.timeUntil(state.raw[next]);
  document.getElementById("nextIcon").textContent = meta.icon;
  document.getElementById("nextPrayerText").innerHTML =
    `পরবর্তী <strong>${meta.bn}</strong> — ${state.times[next]} <span style="color:#8899aa">(${until})</span>`;
}

// ── Qibla UI ──────────────────────────────────────────
function updateQiblaInfo() {
  if (state.qibla === null) return;
  document.getElementById("qiblaDegree").textContent = `${Math.round(state.qibla)}° কিবলা`;
  document.getElementById("coordsDisplay").textContent =
    `📍 ${state.lat.toFixed(4)}°N, ${state.lng.toFixed(4)}°E`;
  updateNeedle();
}

function updateNeedle() {
  if (state.qibla === null) return;
  const angle = state.qibla - state.deviceHeading;
  document.getElementById("needleWrap").style.transform = `rotate(${angle}deg)`;
}

// ── Compass tick marks ────────────────────────────────
function drawTicks() {
  const g = document.getElementById("ticks");
  if (!g) return;
  for (let i = 0; i < 36; i++) {
    const a     = (i * 10 - 90) * Math.PI / 180;
    const major = i % 3 === 0;
    const r1    = major ? 91 : 95;
    const r2    = 100;
    const line  = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", 110 + r1 * Math.cos(a));
    line.setAttribute("y1", 110 + r1 * Math.sin(a));
    line.setAttribute("x2", 110 + r2 * Math.cos(a));
    line.setAttribute("y2", 110 + r2 * Math.sin(a));
    line.setAttribute("stroke", major ? "rgba(201,168,76,0.5)" : "rgba(68,68,68,0.5)");
    line.setAttribute("stroke-width", major ? "2" : "1");
    g.appendChild(line);
  }
}

// ── Tab Switching ─────────────────────────────────────
function switchTab(tab) {
  state.currentTab = tab;
  document.getElementById("panelPrayer").classList.toggle("hidden", tab !== "prayer");
  document.getElementById("panelQibla").classList.toggle("hidden",  tab !== "qibla");
  document.getElementById("tabPrayer").classList.toggle("active",   tab === "prayer");
  document.getElementById("tabQibla").classList.toggle("active",    tab === "qibla");
}

// ── Error Display ─────────────────────────────────────
function showError(msg) {
  const el = document.getElementById("errorMsg");
  el.textContent = "⚠️ " + msg;
  el.style.display = "block";
}
