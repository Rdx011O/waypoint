'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  haversineDistanceNm,
  calculateRouteDistanceNm,
  compareDistances,
  validateCoordinate,
  RouteError,
} = require('../utils/distance');

describe('utils/distance.js', () => {
  describe('validateCoordinate', () => {
    test('accepts valid coordinates in [lon, lat] order', () => {
      assert.doesNotThrow(() => validateCoordinate([72.85, 18.95]));
      assert.doesNotThrow(() => validateCoordinate([-180, -90]));
      assert.doesNotThrow(() => validateCoordinate([180, 90]));
      assert.doesNotThrow(() => validateCoordinate([0, 0]));
    });

    test('rejects non-array or insufficient elements', () => {
      assert.throws(() => validateCoordinate('72.85, 18.95'), {
        name: 'RouteError',
        code: 'INVALID_COORDINATES',
      });
      assert.throws(() => validateCoordinate([72.85]), {
        name: 'RouteError',
        code: 'INVALID_COORDINATES',
      });
      assert.throws(() => validateCoordinate(null), {
        name: 'RouteError',
        code: 'INVALID_COORDINATES',
      });
    });

    test('rejects non-numeric coordinates', () => {
      assert.throws(() => validateCoordinate(['72.85', 18.95]), {
        name: 'RouteError',
        code: 'INVALID_COORDINATES',
      });
      assert.throws(() => validateCoordinate([NaN, 18.95]), {
        name: 'RouteError',
        code: 'INVALID_COORDINATES',
      });
    });

    test('rejects out-of-range coordinates', () => {
      // Longitude beyond [-180, 180]
      assert.throws(() => validateCoordinate([185, 10]), {
        name: 'RouteError',
        code: 'INVALID_COORDINATES',
      });
      assert.throws(() => validateCoordinate([-185, 10]), {
        name: 'RouteError',
        code: 'INVALID_COORDINATES',
      });
      // Latitude beyond [-90, 90]
      assert.throws(() => validateCoordinate([100, 95]), {
        name: 'RouteError',
        code: 'INVALID_COORDINATES',
      });
      assert.throws(() => validateCoordinate([100, -95]), {
        name: 'RouteError',
        code: 'INVALID_COORDINATES',
      });
    });
  });

  describe('haversineDistanceNm', () => {
    test('computes distance between known points', () => {
      // 1 degree along the equator is ~60 nautical miles
      const d1DegEquator = haversineDistanceNm([0, 0], [1, 0]);
      assert.ok(
        Math.abs(d1DegEquator - 60.04) < 0.2,
        `Expected ~60.04 nm for 1 deg on equator, got ${d1DegEquator}`
      );

      // Mumbai [72.85, 18.95] to Singapore [103.85, 1.28] great circle distance is ~2110 nm
      const dMumbaiSingapore = haversineDistanceNm([72.85, 18.95], [103.85, 1.28]);
      assert.ok(
        Math.abs(dMumbaiSingapore - 2110) < 15,
        `Expected ~2110 nm between Mumbai and Singapore, got ${dMumbaiSingapore}`
      );

      // Identical coordinates yield 0 distance
      const dZero = haversineDistanceNm([10, 20], [10, 20]);
      assert.equal(dZero, 0);
    });

    test('handles antimeridian crossing correctly (lon jump > 180)', () => {
      // Point A at 179°E (equator) and Point B at 179°W (-179° on equator)
      // The shortest path crosses the 180th meridian (a 2-degree span = ~120.08 nm),
      // NOT around the globe the other way (a 358-degree span = ~21,494 nm).
      const dCrossing = haversineDistanceNm([179, 0], [-179, 0]);
      assert.ok(
        Math.abs(dCrossing - 120.08) < 0.5,
        `Expected ~120.08 nm across antimeridian, got ${dCrossing}`
      );

      // Reverse direction must be symmetric
      const dReverse = haversineDistanceNm([-179, 0], [179, 0]);
      assert.ok(
        Math.abs(dCrossing - dReverse) < 1e-9,
        `Antimeridian crossing must be symmetric: ${dCrossing} vs ${dReverse}`
      );
    });
  });

  describe('calculateRouteDistanceNm', () => {
    test('sums distance over waypoints', () => {
      const waypoints = [
        [0, 0],
        [1, 0], // ~60.04 nm
        [2, 0], // ~60.04 nm
      ];
      const total = calculateRouteDistanceNm(waypoints);
      assert.ok(Math.abs(total - 120.08) < 0.5);
    });

    test('throws for waypoints with fewer than 2 coordinates', () => {
      assert.throws(() => calculateRouteDistanceNm([[0, 0]]), {
        name: 'RouteError',
        code: 'INVALID_WAYPOINTS',
      });
      assert.throws(() => calculateRouteDistanceNm([]), {
        name: 'RouteError',
        code: 'INVALID_WAYPOINTS',
      });
    });
  });

  describe('compareDistances', () => {
    test('returns no warning within tolerance', () => {
      const result = compareDistances(1000, 1020, 0.05); // 2% diff
      assert.equal(result.isWithinTolerance, true);
      assert.equal(result.warning, null);
      assert.equal(result.differenceNm, 20);
    });

    test('generates warning when discrepancy exceeds tolerance', () => {
      const result = compareDistances(1000, 1080, 0.05); // 8% diff > 5%
      assert.equal(result.isWithinTolerance, false);
      assert.ok(result.warning.includes('Distance discrepancy warning'));
      assert.ok(result.warning.includes('8.00%'));
    });

    test('validates positive numeric inputs', () => {
      assert.throws(() => compareDistances(0, 100), {
        name: 'RouteError',
        code: 'INVALID_DISTANCE',
      });
      assert.throws(() => compareDistances(100, -10), {
        name: 'RouteError',
        code: 'INVALID_DISTANCE',
      });
    });
  });
});
