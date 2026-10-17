'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateVoyageCostAndEta } = require('../utils/costCalculator');

describe('utils/costCalculator.js', () => {
  const baseVessel = {
    speedKnots: 12,
    fuelConsumptionTonnesPerDay: 30,
    dailyOperatingCostUsd: 10000,
  };

  const baseCostParams = {
    fuelPriceUsdPerTonne: 600,
    bufferHours: 0,
    idleFuelTonnesPerDay: 0,
    portChargesUsd: 0,
  };

  test('hand-calculated ETA and cost check: 2400 nm at 12 kn = 200 h = 8.33 d to the cent', () => {
    // Distance = 2400 nm
    // Speed = 12 knots -> sailingHours = 2400 / 12 = 200.0 hours
    // sailingDays = 200 / 24 = 8.333333333333334 days (~8.33 d)
    // sailingFuel = (200 / 24) * 30 = 250.0 tonnes
    // fuelCost = 250 * 600 = $150,000.00
    // operatingCost = (200 / 24) * 10000 = $83,333.3333...
    // totalCost = $150,000 + $83,333.3333... = $233,333.3333...
    const result = calculateVoyageCostAndEta({
      distanceNm: 2400,
      vessel: baseVessel,
      costParams: baseCostParams,
    });

    assert.equal(result.sailingHours, 200);
    assert.ok(Math.abs(result.sailingDays - (200 / 24)) < 1e-9);
    assert.ok(Math.abs(result.totalDays - (200 / 24)) < 1e-9);
    assert.ok(Math.abs(result.fuelTonnes - 250) < 1e-9);
    // Check fuel cost and total cost to the cent
    assert.equal(Math.round(result.fuelCostUsd * 100) / 100, 150000.00);
    assert.equal(Math.round(result.operatingCostUsd * 100) / 100, 83333.33);
    assert.equal(Math.round(result.totalCostUsd * 100) / 100, 233333.33);
    assert.equal(result.isEstimate, true);
  });

  test('idle buffer fuel is calculated at idle rate, not sailing rate', () => {
    // 2400 nm, 12 kn -> 200 sailing hours (8.33 d)
    // bufferHours = 24 hours (1.0 day)
    // idleFuelTonnesPerDay = 3.0 tonnes/day
    // Sailing fuel = 250 tonnes
    // Idle fuel = 1.0 day * 3 tonnes = 3.0 tonnes
    // Total fuel = 253 tonnes
    // Fuel cost = 253 * 600 = $151,800.00
    // Total days = (200 + 24) / 24 = 9.333333... days
    // Operating cost = 9.333333... * 10000 = $93,333.3333...
    // Port charges = $15,000
    // Total cost = 151,800 + 93,333.3333... + 15,000 = $260,133.3333...
    const result = calculateVoyageCostAndEta({
      distanceNm: 2400,
      vessel: baseVessel,
      costParams: {
        fuelPriceUsdPerTonne: 600,
        bufferHours: 24,
        idleFuelTonnesPerDay: 3.0,
        portChargesUsd: 15000,
      },
    });

    assert.equal(result.sailingHours, 200);
    assert.equal(result.bufferHours, 24);
    assert.ok(Math.abs(result.totalDays - (224 / 24)) < 1e-9);
    assert.ok(Math.abs(result.sailingFuelTonnes - 250) < 1e-9);
    assert.ok(Math.abs(result.idleFuelTonnes - 3) < 1e-9);
    assert.ok(Math.abs(result.fuelTonnes - 253) < 1e-9);
    assert.equal(Math.round(result.fuelCostUsd * 100) / 100, 151800.00);
    assert.equal(result.portChargesUsd, 15000);
    assert.equal(Math.round(result.totalCostUsd * 100) / 100, 260133.33);
  });

  test('sensitivities: longer distance -> longer time, higher price -> higher cost, faster speed -> less sailing time', () => {
    const base = calculateVoyageCostAndEta({
      distanceNm: 2400,
      vessel: baseVessel,
      costParams: baseCostParams,
    });

    // Longer distance (3000 nm vs 2400 nm)
    const longer = calculateVoyageCostAndEta({
      distanceNm: 3000,
      vessel: baseVessel,
      costParams: baseCostParams,
    });
    assert.ok(longer.sailingHours > base.sailingHours);
    assert.ok(longer.totalCostUsd > base.totalCostUsd);

    // Higher fuel price (700 vs 600)
    const higherPrice = calculateVoyageCostAndEta({
      distanceNm: 2400,
      vessel: baseVessel,
      costParams: { ...baseCostParams, fuelPriceUsdPerTonne: 700 },
    });
    assert.equal(higherPrice.sailingHours, base.sailingHours);
    assert.ok(higherPrice.fuelCostUsd > base.fuelCostUsd);

    // Faster speed (15 kn vs 12 kn)
    const faster = calculateVoyageCostAndEta({
      distanceNm: 2400,
      vessel: { ...baseVessel, speedKnots: 15 },
      costParams: baseCostParams,
    });
    assert.ok(faster.sailingHours < base.sailingHours);
    assert.equal(faster.sailingHours, 160);
  });

  test('validates inputs and throws typed RouteError codes without silent defaults', () => {
    // Missing / invalid speed
    assert.throws(
      () =>
        calculateVoyageCostAndEta({
          distanceNm: 2400,
          vessel: { ...baseVessel, speedKnots: 0 },
          costParams: baseCostParams,
        }),
      { name: 'RouteError', code: 'INVALID_SPEED' }
    );
    assert.throws(
      () =>
        calculateVoyageCostAndEta({
          distanceNm: 2400,
          vessel: { ...baseVessel, speedKnots: -5 },
          costParams: baseCostParams,
        }),
      { name: 'RouteError', code: 'INVALID_SPEED' }
    );
    assert.throws(
      () =>
        calculateVoyageCostAndEta({
          distanceNm: 2400,
          vessel: { ...baseVessel, speedKnots: 'fast' },
          costParams: baseCostParams,
        }),
      { name: 'RouteError', code: 'INVALID_SPEED' }
    );

    // Missing / invalid fuel burn
    assert.throws(
      () =>
        calculateVoyageCostAndEta({
          distanceNm: 2400,
          vessel: { ...baseVessel, fuelConsumptionTonnesPerDay: -1 },
          costParams: baseCostParams,
        }),
      { name: 'RouteError', code: 'INVALID_FUEL_BURN' }
    );

    // Missing / invalid fuel price
    assert.throws(
      () =>
        calculateVoyageCostAndEta({
          distanceNm: 2400,
          vessel: baseVessel,
          costParams: { ...baseCostParams, fuelPriceUsdPerTonne: undefined },
        }),
      { name: 'RouteError', code: 'INVALID_FUEL_PRICE' }
    );

    // Missing / invalid distance
    assert.throws(
      () =>
        calculateVoyageCostAndEta({
          distanceNm: 0,
          vessel: baseVessel,
          costParams: baseCostParams,
        }),
      { name: 'RouteError', code: 'INVALID_DISTANCE' }
    );
  });
});
