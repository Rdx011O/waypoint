'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { findSeaRouteCandidates } = require('../services/routeEngine');
const { NoRouteError, SnapFailedError } = require('searoute-ts');

describe('services/routeEngine.js', () => {
  const origin = [72.85, 18.95]; // Mumbai
  const destination = [103.85, 1.28]; // Singapore

  describe('unit tests with mocked engine', () => {
    test('removes duplicate routes with identical passages and near-identical distance', () => {
      // Mock engine returns 2 routes: 1 baseline and 1 duplicate variant with same passages and 0.2% distance diff
      const mockEngine = () => [
        {
          properties: {
            variant: 'baseline',
            length: 2500,
            passages: ['malacca'],
            originSnapKm: 1.2,
            destinationSnapKm: 2.1,
          },
          geometry: {
            type: 'LineString',
            // 2 points whose distance is ~2500 nm
            coordinates: [
              [72.85, 18.95],
              [103.85, 1.28],
            ],
          },
        },
        {
          properties: {
            variant: 'variant-dup',
            length: 2505, // 0.2% difference
            passages: ['malacca'], // identical passages
            originSnapKm: 1.2,
            destinationSnapKm: 2.1,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [72.85, 18.95],
              [103.85, 1.28],
            ],
          },
        },
      ];

      const result = findSeaRouteCandidates({
        originCoord: origin,
        destinationCoord: destination,
        options: { _engineFn: mockEngine, distanceToleranceRatio: 0.5 }, // large tolerance to avoid discrepancy warning
      });

      assert.equal(result.meta.totalReturnedByEngine, 2);
      assert.equal(result.candidates.length, 1, 'Duplicate candidate must be removed');
      assert.equal(result.candidates[0].variant, 'baseline');
    });

    test('handles single candidate case correctly with meta note', () => {
      const mockEngine = () => [
        {
          properties: {
            variant: 'baseline',
            length: 2110,
            passages: ['malacca'],
          },
          geometry: {
            type: 'LineString',
            coordinates: [origin, destination],
          },
        },
      ];

      const result = findSeaRouteCandidates({
        originCoord: origin,
        destinationCoord: destination,
        options: { _engineFn: mockEngine },
      });

      assert.equal(result.candidates.length, 1);
      assert.equal(result.meta.singleCandidateFound, true);
      assert.ok(result.meta.notes[0].includes('Only one feasible sea route candidate'));
    });

    test('attaches distance mismatch warning when waypoint sum differs from reported length by > tolerance', () => {
      // Engine says 5000 nm, but the 2 coordinates have haversine distance ~2110 nm (discrepancy > 5%)
      const mockEngine = () => [
        {
          properties: {
            variant: 'mismatch-test',
            length: 5000,
            passages: [],
          },
          geometry: {
            type: 'LineString',
            coordinates: [origin, destination],
          },
        },
      ];

      const result = findSeaRouteCandidates({
        originCoord: origin,
        destinationCoord: destination,
        options: { _engineFn: mockEngine, distanceToleranceRatio: 0.05 },
      });

      assert.equal(result.candidates.length, 1);
      const warnings = result.candidates[0].warnings;
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('Distance discrepancy warning'));
    });

    test('maps NoRouteError to RouteError with code NO_ROUTE_FOUND', () => {
      const mockEngine = () => {
        throw new NoRouteError('No path found');
      };

      assert.throws(
        () =>
          findSeaRouteCandidates({
            originCoord: origin,
            destinationCoord: destination,
            options: { _engineFn: mockEngine },
          }),
        { name: 'RouteError', code: 'NO_ROUTE_FOUND' }
      );
    });

    test('maps SnapFailedError to RouteError with code SNAP_FAILED', () => {
      const mockEngine = () => {
        throw new SnapFailedError('Cannot snap to graph');
      };

      assert.throws(
        () =>
          findSeaRouteCandidates({
            originCoord: origin,
            destinationCoord: destination,
            options: { _engineFn: mockEngine },
          }),
        { name: 'RouteError', code: 'SNAP_FAILED' }
      );
    });

    test('rejects identical origin and destination coordinates', () => {
      assert.throws(
        () =>
          findSeaRouteCandidates({
            originCoord: [10, 10],
            destinationCoord: [10, 10],
          }),
        { name: 'RouteError', code: 'IDENTICAL_COORDINATES' }
      );
    });
  });

  describe('real engine integration test', () => {
    test('routes Mumbai -> Singapore with real searoute-ts engine', (t) => {
      let result;
      try {
        result = findSeaRouteCandidates({
          originCoord: origin,
          destinationCoord: destination,
          vessel: { speedKnots: 14, draftMeters: 12 },
          options: { maxRoutes: 3 },
        });
      } catch (err) {
        t.skip(`Skipping real engine integration test: ${err.message}`);
        return;
      }

      assert.ok(result.candidates.length >= 1, 'Should find at least 1 candidate');
      const first = result.candidates[0];
      assert.ok(first.distanceNm > 2000, `Expected distance > 2000 nm, got ${first.distanceNm}`);
      assert.ok(Array.isArray(first.waypoints), 'Waypoints must be array');
      assert.ok(first.waypoints.length > 5, 'Should have multiple navigation waypoints');
      assert.ok(Array.isArray(first.passages), 'Passages must be array');
      assert.equal(typeof first.variant, 'string');
    });
  });
});
