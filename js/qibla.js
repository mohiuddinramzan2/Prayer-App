// ── Qibla Direction ───────────────────────────────────

const QiblaCalc = (() => {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const KAABA = { lat: 21.4225, lng: 39.8262 };

  function getDirection(lat, lng) {
    const mLat = toRad(KAABA.lat), mLng = toRad(KAABA.lng);
    const uLat = toRad(lat),       uLng = toRad(lng);
    const y = Math.sin(mLng - uLng) * Math.cos(mLat);
    const x = Math.cos(uLat)*Math.sin(mLat) - Math.sin(uLat)*Math.cos(mLat)*Math.cos(mLng-uLng);
    return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
  }

  return { getDirection };
})();


// ── Device Compass ────────────────────────────────────

const Compass = (() => {
  let _heading  = 0;
  let _callback = null;

  function _handler(e) {
    let heading=null;
    if (typeof e.webkitCompassHeading==="number") heading=e.webkitCompassHeading;
    else if (e.absolute===true && e.alpha!=null) heading=360-e.alpha;
    else if (e.alpha!=null) heading=360-e.alpha;
    if(heading==null) return;
    _heading=((heading%360)+360)%360;
    if (_callback) _callback(_heading);
  }

  function start(cb) {
    _callback = cb;

    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+
      DeviceOrientationEvent.requestPermission()
        .then(s => { if (s === 'granted') window.addEventListener('deviceorientation', _handler, true); })
        .catch(console.warn);
    } else if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', _handler, true);
    } else {
      window.addEventListener('deviceorientation', _handler, true);
    }
  }

  function getHeading() { return _heading; }
  return { start, getHeading };
})();
