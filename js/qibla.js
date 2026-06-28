// ── Qibla Direction ───────────────────────────────────

const QiblaCalc = (() => {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  const KAABA = {
    lat: 21.4225,
    lng: 39.8262
  };

  function normalize(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function getDirection(lat, lng) {
    const mLat = toRad(KAABA.lat);
    const mLng = toRad(KAABA.lng);

    const uLat = toRad(lat);
    const uLng = toRad(lng);

    const y = Math.sin(mLng - uLng) * Math.cos(mLat);

    const x =
      Math.cos(uLat) * Math.sin(mLat) -
      Math.sin(uLat) *
      Math.cos(mLat) *
      Math.cos(mLng - uLng);

    return normalize(toDeg(Math.atan2(y, x)));
  }

  return {
    getDirection
  };
})();


// ── Device Compass ────────────────────────────────────

const Compass = (() => {

  let heading = 0;
  let callback = null;

  function normalize(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function handleOrientation(event) {

    let newHeading = null;

    // iPhone Safari
    if (typeof event.webkitCompassHeading === "number") {

      newHeading = event.webkitCompassHeading;

    }
    // Android Absolute Compass
    else if (event.absolute === true && event.alpha != null) {

      newHeading = 360 - event.alpha;

    }
    // Android Fallback
    else if (event.alpha != null) {

      newHeading = 360 - event.alpha;
    }

    if (newHeading == null) return;

    heading = normalize(newHeading);

    if (callback) {
      callback(heading);
    }
  }

  function start(cb) {

    callback = cb;

    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {

      DeviceOrientationEvent.requestPermission()
        .then(permission => {

          if (permission === "granted") {

            window.addEventListener(
              "deviceorientation",
              handleOrientation,
              true
            );

          }

        })
        .catch(console.error);

    } else {

      if ("ondeviceorientationabsolute" in window) {

        window.addEventListener(
          "deviceorientationabsolute",
          handleOrientation,
          true
        );

      } else {

        window.addEventListener(
          "deviceorientation",
          handleOrientation,
          true
        );

      }

    }

  }

  function getHeading() {
    return heading;
  }

  return {
    start,
    getHeading
  };

})();
