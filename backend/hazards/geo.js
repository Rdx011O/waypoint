/**
 * Maritime Geographic Utilities
 * 
 * Provides spherical geometry calculations:
 * - Haversine great-circle distance
 * - Great-circle intermediate point interpolation
 * - Route densification (~50 km resolution)
 * - Point-in-circle hazard detection
 * - Initial bearing and perpendicular waypoint offsetting
 * 
 * All calculations handle antimeridian wrapping and edge cases.
 */

const CONFIG = require("./config");

const { EARTH_RADIUS_KM, KM_PER_NM, NM_PER_KM, DEFAULT_DENSIFY_STEP_KM } = CONFIG;

/**
 * Convert degrees to radians.
 */
function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees.
 */
function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Normalize longitude to range [-180, 180].
 */
function normalizeLongitude(lon) {
  let normalized = ((lon + 180) % 360 + 360) % 360 - 180;
  // Handle edge case where normalized is -180
  if (normalized === -180 && lon > 0) return 180;
  return Math.round(normalized * 1e6) / 1e6;
}

/**
 * Convert kilometers to nautical miles.
 */
function kmToNm(km) {
  return km * NM_PER_KM;
}

/**
 * Convert nautical miles to kilometers.
 */
function nmToKm(nm) {
  return nm * KM_PER_NM;
}

/**
 * Compute the great-circle distance between two points using the Haversine formula.
 * @param {{lat: number, lon: number}} p1
 * @param {{lat: number, lon: number}} p2
 * @returns {number} distance in kilometers
 */
function haversineDistance(p1, p2) {
  if (!p1 || !p2) {
    throw new Error("haversineDistance requires two points with lat and lon");
  }

  const lat1 = Number(p1.lat);
  const lon1 = Number(p1.lon);
  const lat2 = Number(p2.lat);
  const lon2 = Number(p2.lon);

  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error("Invalid coordinates provided to haversineDistance");
  }

  // Exact same point
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);

  // Take antimeridian crossing into account for longitude delta
  const rawDeltaLon = normalizeLongitude(lon2 - lon1);
  const deltaLambda = toRadians(rawDeltaLon);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  // Clamp 'a' to [0, 1] to prevent floating point inaccuracies causing NaN in sqrt
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate total distance of a route along consecutive waypoints.
 * @param {Array<{lat: number, lon: number}>} waypoints
 * @returns {number} Distance in kilometers
 */
function calculateRouteDistanceKm(waypoints) {
  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    return 0;
  }

  let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalKm += haversineDistance(waypoints[i], waypoints[i + 1]);
  }
  return totalKm;
}

/**
 * Calculate total distance of a route along consecutive waypoints in nautical miles.
 * @param {Array<{lat: number, lon: number}>} waypoints
 * @returns {number} Distance in nautical miles
 */
function calculateRouteDistanceNm(waypoints) {
  return kmToNm(calculateRouteDistanceKm(waypoints));
}

/**
 * Interpolate a point at fraction f (0.0 to 1.0) along the great-circle arc from p1 to p2.
 * @param {{lat: number, lon: number}} p1
 * @param {{lat: number, lon: number}} p2
 * @param {number} fraction (0 <= f <= 1)
 * @returns {{lat: number, lon: number}}
 */
function interpolateGreatCircle(p1, p2, fraction) {
  if (fraction <= 0) return { lat: Number(p1.lat), lon: normalizeLongitude(Number(p1.lon)) };
  if (fraction >= 1) return { lat: Number(p2.lat), lon: normalizeLongitude(Number(p2.lon)) };

  const lat1 = Number(p1.lat);
  const lon1 = Number(p1.lon);
  const lat2 = Number(p2.lat);
  const lon2 = Number(p2.lon);

  const distKm = haversineDistance(p1, p2);
  if (distKm < 0.001) {
    return { lat: lat1, lon: normalizeLongitude(lon1) };
  }

  const d = distKm / EARTH_RADIUS_KM; // Angular distance in radians
  const sinD = Math.sin(d);

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const lam1 = toRadians(lon1);
  const lam2 = toRadians(lon1 + normalizeLongitude(lon2 - lon1));

  const a = Math.sin((1 - fraction) * d) / sinD;
  const b = Math.sin(fraction * d) / sinD;

  const x = a * Math.cos(phi1) * Math.cos(lam1) + b * Math.cos(phi2) * Math.cos(lam2);
  const y = a * Math.cos(phi1) * Math.sin(lam1) + b * Math.cos(phi2) * Math.sin(lam2);
  const z = a * Math.sin(phi1) + b * Math.sin(phi2);

  const latOut = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lonOut = Math.atan2(y, x);

  return {
    lat: Math.round(toDegrees(latOut) * 1e6) / 1e6,
    lon: Math.round(normalizeLongitude(toDegrees(lonOut)) * 1e6) / 1e6
  };
}

/**
 * Densify a route by interpolating waypoints along each leg at roughly stepKm intervals.
 * This guarantees that hazards (e.g. cyclones, wind/waves) sitting between sparse waypoints
 * are detected during intersection checks.
 * 
 * @param {Array<{lat: number, lon: number}>} waypoints
 * @param {number} [stepKm=DEFAULT_DENSIFY_STEP_KM]
 * @returns {Array<{lat: number, lon: number}>} Densified route coordinates
 */
function densifyRoute(waypoints, stepKm = DEFAULT_DENSIFY_STEP_KM) {
  if (!waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
    return [];
  }
  if (waypoints.length === 1) {
    return [{ lat: Number(waypoints[0].lat), lon: normalizeLongitude(Number(waypoints[0].lon)) }];
  }

  const densified = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const legDistance = haversineDistance(start, end);

    if (legDistance <= stepKm) {
      // Leg is already shorter than or equal to step size
      densified.push({ lat: Number(start.lat), lon: normalizeLongitude(Number(start.lon)) });
    } else {
      const numSegments = Math.ceil(legDistance / stepKm);
      for (let s = 0; s < numSegments; s++) {
        const fraction = s / numSegments;
        densified.push(interpolateGreatCircle(start, end, fraction));
      }
    }
  }

  // Always include the final waypoint
  const last = waypoints[waypoints.length - 1];
  densified.push({ lat: Number(last.lat), lon: normalizeLongitude(Number(last.lon)) });

  // Remove potential adjacent duplicates (within 10 meters)
  return densified.filter((pt, idx, arr) => {
    if (idx === 0) return true;
    return haversineDistance(pt, arr[idx - 1]) > 0.01;
  });
}

/**
 * Check if a point lies inside or on the boundary of a hazard circle.
 * @param {{lat: number, lon: number}} point
 * @param {{lat: number, lon: number}} center
 * @param {number} radiusKm
 * @returns {boolean}
 */
function pointInCircle(point, center, radiusKm) {
  if (!point || !center || radiusKm == null) return false;
  const dist = haversineDistance(point, center);
  return dist <= radiusKm;
}

/**
 * Calculate initial forward bearing (azimuth) from p1 to p2 in degrees [0, 360).
 * @param {{lat: number, lon: number}} p1
 * @param {{lat: number, lon: number}} p2
 * @returns {number} Bearing in degrees
 */
function initialBearing(p1, p2) {
  const lat1 = Number(p1.lat);
  const lon1 = Number(p1.lon);
  const lat2 = Number(p2.lat);
  const lon2 = Number(p2.lon);

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(normalizeLongitude(lon2 - lon1));

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;
  return Math.round(bearing * 1e4) / 1e4;
}

/**
 * Compute destination point given start point, distance in km, and bearing in degrees.
 * @param {{lat: number, lon: number}} start
 * @param {number} distanceKm
 * @param {number} bearingDeg
 * @returns {{lat: number, lon: number}}
 */
function destinationPoint(start, distanceKm, bearingDeg) {
  const phi1 = toRadians(Number(start.lat));
  const lam1 = toRadians(Number(start.lon));
  const brng = toRadians(bearingDeg);
  const dr = distanceKm / EARTH_RADIUS_KM;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(dr) + Math.cos(phi1) * Math.sin(dr) * Math.cos(brng)
  );

  const lam2 =
    lam1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(dr) * Math.cos(phi1),
      Math.cos(dr) - Math.sin(phi1) * Math.sin(phi2)
    );

  return {
    lat: Math.round(toDegrees(phi2) * 1e6) / 1e6,
    lon: Math.round(normalizeLongitude(toDegrees(lam2)) * 1e6) / 1e6
  };
}

/**
 * Calculate a waypoint offset perpendicularly from a base waypoint along a given route bearing.
 * Useful for navigating around hazard zones.
 * 
 * @param {{lat: number, lon: number}} point - Reference point
 * @param {number} bearingDeg - Route heading at reference point
 * @param {number} distanceKm - Perpendicular offset distance
 * @param {'starboard' | 'port'} [direction='starboard'] - Side to offset ('starboard' = +90°, 'port' = -90°)
 * @returns {{lat: number, lon: number}} Offset waypoint
 */
function offsetPoint(point, bearingDeg, distanceKm, direction = "starboard") {
  const angleDelta = direction === "port" ? -90 : 90;
  const perpBearing = (bearingDeg + angleDelta + 360) % 360;
  return destinationPoint(point, distanceKm, perpBearing);
}

module.exports = {
  toRadians,
  toDegrees,
  normalizeLongitude,
  kmToNm,
  nmToKm,
  haversineDistance,
  calculateRouteDistanceKm,
  calculateRouteDistanceNm,
  interpolateGreatCircle,
  densifyRoute,
  pointInCircle,
  initialBearing,
  destinationPoint,
  offsetPoint
};
