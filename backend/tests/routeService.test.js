'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  getRouteComparison,
  compareRoutes,
  loadAndValidateCsv,
} = require('../services/routeService');

describe('services/routeService.js', () => {
  const dummyOrigin = {
    portId: 'BOM',
    name: 'Mumbai',
    coordinates: [72.85, 18.95],
  };

  const dummyDest = {
    portId: 'SIN',
    name: 'Singapore',
    coordinates: [103.85, 1.28],
  };

  const dummyVessel = {
    vesselId: 'VESSEL_01',
    name: 'Pacific Trader',
    speedKnots: 14.0,
    fuelConsumptionTonnesPerDay: 35.0,
    draftMeters: 12.5,
    dailyOperatingCostUsd: 15000,
  };

  const mockEngine = () => [
    {
      properties: {
        variant: 'baseline',
        length: 2500,
        passages: ['malacca'],
        originSnapKm: 1.0,
        destinationSnapKm: 1.5,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [72.85, 18.95],
          [80.0, 10.0],
          [103.85, 1.28],
        ],
      },
    },
    {
      properties: {
        variant: 'no-malacca',
        length: 3200,
        passages: ['sunda', 'malacca'],
        originSnapKm: 1.0,
        destinationSnapKm: 1.5,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [72.85, 18.95],
          [85.0, 5.0],
          [103.85, 1.28],
        ],
      },
    },
  ];

  describe('compareRoutes (low-level in-memory API)', () => {
    test('executes comparison and conforms precisely to the output JSON contract', async () => {
      const riskCallback = async (r) => {
        if (r.routeId === 'route-1') {
          return { riskScore: 25, prohibited: false, reasons: [] };
        }
        return { riskScore: 40, prohibited: false, reasons: [] };
      };

      const result = await compareRoutes({
        originPort: dummyOrigin,
        destinationPort: dummyDest,
        vessel: dummyVessel,
        options: {
          _engineFn: mockEngine,
          riskProvider: riskCallback,
        },
      });

      // Contract top-level fields
      assert.ok(result.origin);
      assert.equal(result.origin.portId, 'BOM');
      assert.deepEqual(result.origin.coordinates, [72.85, 18.95]);

      assert.ok(result.destination);
      assert.equal(result.destination.portId, 'SIN');
      assert.deepEqual(result.destination.coordinates, [103.85, 1.28]);

      assert.equal(result.vesselId, 'VESSEL_01');
      assert.ok(result.generatedAt);
      assert.ok(Array.isArray(result.routes));
      assert.ok(Array.isArray(result.excludedRoutes));
      assert.ok(result.recommendation);
      assert.ok(result.meta);
      assert.ok(result.meta.disclaimer.includes('Estimates only'));

      // Validate route item contract
      const r1 = result.routes[0];
      assert.equal(r1.routeId, 'route-1');
      assert.equal(r1.rank, 1);
      assert.equal(r1.recommended, true);
      assert.equal(typeof r1.distanceNm, 'number');
      assert.equal(typeof r1.engineDistanceNm, 'number');
      assert.equal(typeof r1.sailingHours, 'number');
      assert.equal(typeof r1.sailingDays, 'number');
      assert.equal(typeof r1.totalDays, 'number');
      assert.equal(typeof r1.fuelTonnes, 'number');
      assert.equal(typeof r1.fuelCostUsd, 'number');
      assert.equal(typeof r1.operatingCostUsd, 'number');
      assert.equal(typeof r1.portChargesUsd, 'number');
      assert.equal(typeof r1.totalCostUsd, 'number');
      assert.equal(r1.riskScore, 25);
      assert.equal(r1.riskKnown, true);
      assert.equal(typeof r1.scores.cost, 'number');
      assert.equal(typeof r1.scores.time, 'number');
      assert.equal(typeof r1.scores.risk, 'number');
      assert.equal(typeof r1.scores.total, 'number');
      assert.ok(Array.isArray(r1.passages));
      assert.ok(Array.isArray(r1.waypoints));
      assert.ok(Array.isArray(r1.warnings));
    });

    test('correctly partitions prohibited routes into excludedRoutes', async () => {
      const riskCallback = async (r) => {
        if (r.routeId === 'route-1') {
          return {
            riskScore: 95,
            prohibited: true,
            reasons: ['Severe pirate activity reported in Malacca Strait'],
          };
        }
        return { riskScore: 15, prohibited: false, reasons: [] };
      };

      const result = await compareRoutes({
        originPort: dummyOrigin,
        destinationPort: dummyDest,
        vessel: dummyVessel,
        options: {
          _engineFn: mockEngine,
          riskProvider: riskCallback,
        },
      });

      assert.equal(result.routes.length, 1);
      assert.equal(result.routes[0].routeId, 'route-2');
      assert.equal(result.routes[0].recommended, true);

      assert.equal(result.excludedRoutes.length, 1);
      assert.equal(result.excludedRoutes[0].routeId, 'route-1');
      assert.deepEqual(result.excludedRoutes[0].reasons, [
        'Severe pirate activity reported in Malacca Strait',
      ]);
    });
  });

  describe('getRouteComparison (CSV-backed public API)', () => {
    test('successfully loads CSVs and computes comparison for BOM -> SIN', async () => {
      const result = await getRouteComparison({
        originPortId: 'BOM',
        destinationPortId: 'SIN',
        vesselId: 'VESSEL_01',
        options: { _engineFn: mockEngine },
      });

      assert.equal(result.origin.portId, 'BOM');
      assert.equal(result.destination.portId, 'SIN');
      assert.equal(result.vesselId, 'VESSEL_01');
      assert.ok(result.routes.length >= 1);
      assert.equal(result.routes[0].recommended, true);
    });

    test('throws UNKNOWN_PORT when portId is not found', async () => {
      await assert.rejects(
        () =>
          getRouteComparison({
            originPortId: 'NONEXISTENT',
            destinationPortId: 'SIN',
            vesselId: 'VESSEL_01',
          }),
        { name: 'RouteError', code: 'UNKNOWN_PORT' }
      );
    });

    test('throws UNKNOWN_VESSEL when vesselId is not found', async () => {
      await assert.rejects(
        () =>
          getRouteComparison({
            originPortId: 'BOM',
            destinationPortId: 'SIN',
            vesselId: 'UNKNOWN_SHIP',
          }),
        { name: 'RouteError', code: 'UNKNOWN_VESSEL' }
      );
    });

    test('throws MISSING_CSV_COLUMN when required column is missing', () => {
      const csvPath = path.resolve(__dirname, '../data/ports.csv');
      assert.throws(
        () => loadAndValidateCsv(csvPath, ['port_id', 'non_existent_column']),
        { name: 'RouteError', code: 'MISSING_CSV_COLUMN' }
      );
    });
  });
});
