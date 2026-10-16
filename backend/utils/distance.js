'use strict';

/**
 * Standard mean Earth radius in nautical miles.
 * Derived from WGS84 volumetric mean radius (6,371,008.8 m) / 1,852 m per nautical mile.
 */
const EARTH_RADIUS_NM = 6371008.8 / 1852; // ~3440.0695 nm
const DEFAULT_DISTANCE_TOLERANCE_RATIO = 0.05;

/**
 * Custom error class with error codes for HTTP status mapping by Member 5.
 */
class RouteError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'RouteError';
    this.code = code;
  }
}

/**
 * Validates a GeoJSON coordinate pair [longitude, latitude].
 * Coordinates must be numeric, with longitude in [-180, 180] and latitude in [-90, 90].
 *
 * @param {any} coord
 * @param {string} [label='coordinate']
 */
function validateCoordinate(coord, label = 'coordinate') {
  if (!Array.isArray(coord) || coord.length < 2) {
    throw new RouteError(
      `Invalid ${label}: expected [longitude, latitude] array, received ${JSON.stringify(coord)}`,
      'INVALID_COORDINATES'
    );
  }

  const [lon, lat] = coord;
  if (typeof lon !== 'number' || typeof lat !== 'number' || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new RouteError(
      `Invalid ${label}: longitude and latitude must be finite numbers, received [${lon}, ${lat}]`,
      'INVALID_COORDINATES'
    );
  }

  if (lon < -180 || lon > 180) {
    throw new RouteError(
      `Invalid ${label}: longitude ${lon} out of range [-180, 180]`,
      'INVALID_COORDINATES'
    );
  }

  if (lat < -90 || lat > 90) {
    throw new RouteError(
      `Invalid ${label}: latitude ${lat} out of range [-90, 90]`,
      'INVALID_COORDINATES'
    );
  }
}

/**
 * Converts degrees to radians.
 * @param {number} deg
 * @returns {number}
 */
function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Computes great-circle distance between two [lon, lat] points using the Haversine formula.
 *
 * Antimeridian crossing handling:
 * Longitude delta is normalized to [-PI, PI] using Math.atan2(sin(dLon), cos(dLon)).
 * This ensures that a path between e.g. 179° and -179° is calculated across the 180° meridian
 * (an angular difference of 2°) rather than traversing the long way around Earth (358°).
 *
 * @param {[number, number]} coord1 - [longitude, latitude] in GeoJSON order
 * @param {[number, number]} coord2 - [longitude, latitude] in GeoJSON order
 * @returns {number} Distance in nautical miles (unrounded float)
 */
function haversineDistanceNm(coord1, coord2) {
  validateCoordinate(coord1, 'origin coordinate');
  validateCoordinate(coord2, 'destination coordinate');

  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLat = toRadians(lat2 - lat1);

  // Normalize longitude difference to [-PI, PI] to handle antimeridian crossings correctly
  const rawDLonRad = toRadians(lon2 - lon1);
  const dLon = Math.atan2(Math.sin(rawDLonRad), Math.cos(rawDLonRad));

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const a = sinHalfLat * sinHalfLat + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinHalfLon * sinHalfLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return EARTH_RADIUS_NM * c;
}

/**
 * Calculates total route distance along an ordered array of waypoints.
 *
 * @param {Array<[number, number]>} waypoints - Array of [longitude, latitude]
 * @returns {number} Total distance in nautical miles
 */
function calculateRouteDistanceNm(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new RouteError(
      'Waypoints must be an array of at least 2 [longitude, latitude] coordinates',
      'INVALID_WAYPOINTS'
    );
  }

  let totalNm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalNm += haversineDistanceNm(waypoints[i], waypoints[i + 1]);
  }

  return totalNm;
}

/**
 * Cross-checks engine-reported distance against the sum of waypoint segments.
 *
 * @param {number} engineDistanceNm
 * @param {number} waypointDistanceNm
 * @param {number} [toleranceRatio=0.05] - Maximum acceptable relative discrepancy (default 5%)
 * @returns {{ isWithinTolerance: boolean, differenceNm: number, discrepancyRatio: number, warning: string | null }}
 */
function compareDistances(engineDistanceNm, waypointDistanceNm, toleranceRatio = DEFAULT_DISTANCE_TOLERANCE_RATIO) {
  if (typeof engineDistanceNm !== 'number' || engineDistanceNm <= 0) {
    throw new RouteError('Engine distance must be a positive number', 'INVALID_DISTANCE');
  }
  if (typeof waypointDistanceNm !== 'number' || waypointDistanceNm <= 0) {
    throw new RouteError('Waypoint distance must be a positive number', 'INVALID_DISTANCE');
  }

  const differenceNm = Math.abs(engineDistanceNm - waypointDistanceNm);
  const discrepancyRatio = differenceNm / engineDistanceNm;
  const isWithinTolerance = discrepancyRatio <= toleranceRatio;

  let warning = null;
  if (!isWithinTolerance) {
    const pct = (discrepancyRatio * 100).toFixed(2);
    const tolPct = (toleranceRatio * 100).toFixed(1);
    warning = `Distance discrepancy warning: waypoint sum (${waypointDistanceNm.toFixed(1)} nm) differs from engine distance (${engineDistanceNm.toFixed(1)} nm) by ${pct}%, exceeding ${tolPct}% tolerance.`;
  }

  return {
    isWithinTolerance,
    differenceNm,
    discrepancyRatio,
    warning,
  };
}

module.exports = {
  EARTH_RADIUS_NM,
  DEFAULT_DISTANCE_TOLERANCE_RATIO,
  RouteError,
  validateCoordinate,
  haversineDistanceNm,
  calculateRouteDistanceNm,
  compareDistances,
};
