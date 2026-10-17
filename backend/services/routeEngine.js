'use strict';

const { seaRouteAlternatives, NoRouteError, SnapFailedError } = require('searoute-ts');
const {
  haversineDistanceNm,
  calculateRouteDistanceNm,
  compareDistances,
  validateCoordinate,
  RouteError,
  DEFAULT_DISTANCE_TOLERANCE_RATIO,
} = require('../utils/distance');

const DEFAULT_MAX_ROUTES = 5;
const DUPLICATE_DISTANCE_TOLERANCE_RATIO = 0.01; // 1%

/**
 * Checks if two candidate routes are effectively duplicates.
 * Criteria: Identical set of traversed passages AND distance within 1%.
 *
 * @param {object} r1
 * @param {object} r2
 * @param {number} [tolerance=0.01]
 * @returns {boolean}
 */
function isDuplicateRoute(r1, r2, tolerance = DUPLICATE_DISTANCE_TOLERANCE_RATIO) {
  const p1 = [...(r1.passages || [])].sort().join(',');
  const p2 = [...(r2.passages || [])].sort().join(',');
  if (p1 !== p2) return false;

  const diff = Math.abs(r1.engineDistanceNm - r2.engineDistanceNm);
  const avg = (r1.engineDistanceNm + r2.engineDistanceNm) / 2;
  return diff / Math.max(avg, 1) < tolerance;
}

/**
 * Computes feasible sea route candidates between origin and destination coordinates.
 *
 * Guarantees:
 * 1. Never fabricates routes. All geometries come strictly from the Eurostat maritime network.
 * 2. Deduplicates candidates that share identical passages and near-identical distance.
 * 3. Cross-checks engine distance with Haversine waypoint sum; attaches warning if divergence exceeds tolerance.
 * 4. Flags single-candidate outcomes explicitly.
 *
 * @param {object} params
 * @param {[number, number]} params.originCoord - [longitude, latitude] GeoJSON order
 * @param {[number, number]} params.destinationCoord - [longitude, latitude] GeoJSON order
 * @param {object} [params.vessel={}] - Vessel specifications (speedKnots, draftMeters)
 * @param {object} [params.options={}] - Engine options (maxRoutes, distanceToleranceRatio, _engineFn)
 * @returns {object} { candidates: Array<object>, meta: object }
 */
function findSeaRouteCandidates({ originCoord, destinationCoord, vessel = {}, options = {} }) {
  validateCoordinate(originCoord, 'origin coordinate');
  validateCoordinate(destinationCoord, 'destination coordinate');

  // Prevent routing between identical coordinates
  const distBetween = haversineDistanceNm(originCoord, destinationCoord);
  if (distBetween < 0.01) {
    throw new RouteError(
      'Origin and destination coordinates are identical or too close (< 0.01 nm)',
      'IDENTICAL_COORDINATES'
    );
  }

  const maxRoutes = Math.max(1, Number(options.maxRoutes || DEFAULT_MAX_ROUTES));
  const toleranceRatio =
    typeof options.distanceToleranceRatio === 'number' && options.distanceToleranceRatio > 0
      ? options.distanceToleranceRatio
      : DEFAULT_DISTANCE_TOLERANCE_RATIO;

  const speedKnots = vessel.speedKnots ? Number(vessel.speedKnots) : undefined;
  const draftMeters = vessel.draftMeters ? Number(vessel.draftMeters) : undefined;

  // Allow injecting custom/mocked engine function for testing
  const engineFn = options._engineFn || seaRouteAlternatives;

  let rawRoutes;
  try {
    rawRoutes = engineFn(originCoord, destinationCoord, {
      k: maxRoutes,
      units: 'nauticalmiles',
      speedKnots,
      vesselDraftMeters: draftMeters,
      returnPassages: true,
    });
  } catch (err) {
    if (err instanceof NoRouteError || err.name === 'NoRouteError') {
      throw new RouteError(
        'No feasible maritime route found between origin and destination given vessel draft and canal constraints.',
        'NO_ROUTE_FOUND'
      );
    }
    if (err instanceof SnapFailedError || err.name === 'SnapFailedError') {
      throw new RouteError(
        'Coordinate snap failed: coordinates are too far from navigable waters or landlocked.',
        'SNAP_FAILED'
      );
    }
    throw err;
  }

  if (!Array.isArray(rawRoutes) || rawRoutes.length === 0) {
    throw new RouteError(
      'No feasible maritime route found between origin and destination.',
      'NO_ROUTE_FOUND'
    );
  }

  // Normalize candidates and apply cross-check
  const candidates = [];
  for (let idx = 0; idx < rawRoutes.length; idx++) {
    const raw = rawRoutes[idx];
    const waypoints = raw.geometry ? raw.geometry.coordinates : [];
    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      continue;
    }

    const engineDistanceNm = raw.properties.length;
    const waypointDistanceNm = calculateRouteDistanceNm(waypoints);
    const warnings = [];

    // Cross-check distance
    const check = compareDistances(engineDistanceNm, waypointDistanceNm, toleranceRatio);
    if (!check.isWithinTolerance && check.warning) {
      warnings.push(check.warning);
    }

    const candidate = {
      candidateIndex: idx + 1,
      variant: raw.properties.variant || `candidate-${idx + 1}`,
      engineDistanceNm,
      distanceNm: engineDistanceNm,
      waypointDistanceNm,
      passages: Array.isArray(raw.properties.passages) ? raw.properties.passages : [],
      waypoints,
      originSnapKm: raw.properties.originSnapKm,
      destinationSnapKm: raw.properties.destinationSnapKm,
      warnings,
    };

    // Deduplicate against already accepted candidates
    const duplicate = candidates.some((existing) => isDuplicateRoute(existing, candidate));
    if (!duplicate) {
      candidates.push(candidate);
    }

    if (candidates.length >= maxRoutes) {
      break;
    }
  }

  if (candidates.length === 0) {
    throw new RouteError(
      'All route candidates failed geometry validation or were invalid.',
      'NO_ROUTE_FOUND'
    );
  }

  const meta = {
    totalReturnedByEngine: rawRoutes.length,
    validCandidateCount: candidates.length,
    singleCandidateFound: candidates.length === 1,
    notes: [],
  };

  if (candidates.length === 1) {
    meta.notes.push('Only one feasible sea route candidate was identified for this port pair and vessel draft.');
  }

  return {
    candidates,
    meta,
  };
}

module.exports = {
  findSeaRouteCandidates,
  isDuplicateRoute,
  DEFAULT_MAX_ROUTES,
};
