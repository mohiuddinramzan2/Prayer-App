// ── Qibla Direction Calculator ────────────────────────

const QiblaCalc = (() => {

  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  // Kaaba coordinates
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

  function getDirection(lat, lng) {
    const mLat = toRad(KAABA_LAT);
    const mLng = toRad(KAABA_LNG);
    const uLat = toRad(lat);
    const uLng = toRad(lng);
    const y = Math.sin(mLng - uLng) * Math.cos(mLat);
    const x = Math.cos(uLat) * Math.sin(mLat)
            - Math.sin(uLat) * Math.cos(mLat) * Math.cos(mLng - uLng);
    return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
  }

  return { getDirection };
})();


// ── Device Compass ────────────────────────────────────
const Compass = (() => {
  let _heading  = 0;
  let _callback = null;

  function start(cb) {
    _callback = cb;

    // Modern browsers: absolute orientation
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', _handler, true);
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', _handler, true);
    }

    // iOS 13+ needs permission
    if (typeof DeviceOrientationEvent !== 'undefined'
        && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(state => {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', _handler, true);
          }
        })
        .catch(console.warn);
    }
  }

  function _handler(e) {
    _heading = e.alpha || 0;
    if (_callback) _callback(_heading);
  }

  function getHeading() { return _heading; }

  return { start, getHeading };
})();
