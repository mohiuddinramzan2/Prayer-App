// ── Qibla Direction ───────────────────────────────────
const QiblaCalc = (() => {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const KAABA = { lat: 21.4225, lng: 39.8262 };

  function getDirection(lat, lng) {
    const mLat = toRad(KAABA.lat), mLng = toRad(KAABA.lng);
    const uLat = toRad(lat), uLng = toRad(lng);
    const y = Math.sin(mLng - uLng) * Math.cos(mLat);
    const x = Math.cos(uLat)*Math.sin(mLat) - Math.sin(uLat)*Math.cos(mLat)*Math.cos(mLng-uLng);
    return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
  }

  return { getDirection };
})();

// ── Smooth Compass ────────────────────────────────────
const Compass = (() => {
  let _callback   = null;
  let _smoothed   = null;   // smoothed heading
  let _watching   = false;
  const ALPHA     = 0.15;   // smoothing factor (0=no change, 1=raw)

  // Shortest-path interpolation between angles
  function shortestAngle(from, to) {
    let d = ((to - from + 540) % 360) - 180;
    return from + d;
  }

  function _handler(e) {
    let raw = 0;

    if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
      // iOS — webkitCompassHeading is already true north bearing
      raw = e.webkitCompassHeading;
    } else if (e.absolute && e.alpha !== null) {
      // Android absolute — alpha is CCW from north, convert to CW
      raw = (360 - e.alpha) % 360;
    } else if (e.alpha !== null && e.alpha !== undefined) {
      // Android fallback
      raw = (360 - e.alpha) % 360;
    }

    // Smooth using exponential moving average
    if (_smoothed === null) {
      _smoothed = raw;
    } else {
      _smoothed = shortestAngle(_smoothed, raw) * (1 - ALPHA) + raw * ALPHA;
      _smoothed = ((_smoothed % 360) + 360) % 360;
    }

    if (_callback) _callback(_smoothed);
  }

  function start(cb) {
    if (_watching) return;
    _callback = cb;
    _watching = true;

    if (typeof DeviceOrientationEvent !== 'undefined') {
      // iOS 13+ needs permission
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', _handler, true);
            }
          })
          .catch(console.warn);
      } else {
        // Android — prefer absolute
        if ('ondeviceorientationabsolute' in window) {
          window.addEventListener('deviceorientationabsolute', _handler, true);
        }
        window.addEventListener('deviceorientation', _handler, true);
      }
    }
  }

  function getHeading() { return _smoothed || 0; }
  return { start, getHeading };
})();
