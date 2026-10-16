'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateWeights,
  minMaxNormalize,
  rankAndRecommendRoutes,
} = require('../services/routeRanking');

describe('services/routeRanking.js', () => {
  describe('validateWeights', () => {
    test('accepts valid weights summing to 1.0', () => {
      const w = validateWeights({ cost: 0.4, time: 0.35, risk: 0.25 });
      assert.equal(w.cost, 0.4);
      assert.equal(w.time, 0.35);
      assert.equal(w.risk, 0.25);
    });

    test('throws for weights not summing to 1.0', () => {
      assert.throws(() => validateWeights({ cost: 0.5, time: 0.5, risk: 0.5 }), {
        name: 'RouteError',
        code: 'INVALID_WEIGHTS',
      });
      assert.throws(() => validateWeights({ cost: 0.2, time: 0.2, risk: 0.2 }), {
        name: 'RouteError',
        code: 'INVALID_WEIGHTS',
      });
    });

    test('throws for negative weights', () => {
      assert.throws(() => validateWeights({ cost: -0.1, time: 0.6, risk: 0.5 }), {
        name: 'RouteError',
        code: 'INVALID_WEIGHTS',
      });
    });
  });

  describe('minMaxNormalize', () => {
    test('normalizes values to [0, 100] with lower is better (min=0, max=100)', () => {
      const items = [{ cost: 100 }, { cost: 150 }, { cost: 200 }];
      const norm = minMaxNormalize(items, 'cost');
      assert.equal(norm.get(items[0]), 0);
      assert.equal(norm.get(items[1]), 50);
      assert.equal(norm.get(items[2]), 100);
    });

    test('handles identical values without divide-by-zero, returning 0', () => {
      const items = [{ cost: 100 }, { cost: 100 }];
      const norm = minMaxNormalize(items, 'cost');
      assert.equal(norm.get(items[0]), 0);
      assert.equal(norm.get(items[1]), 0);
    });

    test('handles single candidate without divide-by-zero, returning 0', () => {
      const items = [{ cost: 100 }];
      const norm = minMaxNormalize(items, 'cost');
      assert.equal(norm.get(items[0]), 0);
    });
  });

  describe('rankAndRecommendRoutes', () => {
    test('cheaper-but-riskier route loses to a safer one with high risk weight', () => {
      // Candidate A: very cheap ($100k), fast (8 d), but very risky (risk 90)
      // Candidate B: slightly more expensive ($110k), slightly slower (8.5 d), but very safe (risk 10)
      const candA = {
        routeId: 'route-A-cheap-risky',
        distanceNm: 2400,
        sailingHours: 192,
        sailingDays: 8.0,
        totalDays: 8.0,
        totalCostUsd: 100000,
        riskScore: 90,
        riskKnown: true,
        prohibited: false,
      };
      const candB = {
        routeId: 'route-B-safe',
        distanceNm: 2550,
        sailingHours: 204,
        sailingDays: 8.5,
        totalDays: 8.5,
        totalCostUsd: 110000,
        riskScore: 10,
        riskKnown: true,
        prohibited: false,
      };

      // With weights favoring safety: cost=0.2, time=0.2, risk=0.6
      const result = rankAndRecommendRoutes({
        candidates: [candA, candB],
        weights: { cost: 0.2, time: 0.2, risk: 0.6 },
      });

      assert.equal(result.routes[0].routeId, 'route-B-safe');
      assert.equal(result.routes[0].recommended, true);
      assert.equal(result.routes[0].rank, 1);
      assert.equal(result.routes[1].routeId, 'route-A-cheap-risky');
      assert.equal(result.routes[1].rank, 2);
    });

    test('prohibited route is never recommended and placed in excludedRoutes with reasons', () => {
      const candValid = {
        routeId: 'route-safe',
        distanceNm: 2500,
        sailingHours: 200,
        sailingDays: 8.33,
        totalDays: 8.33,
        totalCostUsd: 150000,
        riskScore: 30,
        riskKnown: true,
        prohibited: false,
      };
      const candProhibited = {
        routeId: 'route-blocked',
        distanceNm: 2100, // shorter & cheaper!
        sailingHours: 175,
        sailingDays: 7.29,
        totalDays: 7.29,
        totalCostUsd: 120000,
        riskScore: 99,
        riskKnown: true,
        prohibited: true,
        reasons: ['Typhoon warning in South China Sea', 'Military exclusion zone'],
      };

      const result = rankAndRecommendRoutes({
        candidates: [candProhibited, candValid],
      });

      assert.equal(result.routes.length, 1);
      assert.equal(result.routes[0].routeId, 'route-safe');
      assert.equal(result.routes[0].recommended, true);
      assert.equal(result.excludedRoutes.length, 1);
      assert.equal(result.excludedRoutes[0].routeId, 'route-blocked');
      assert.deepEqual(result.excludedRoutes[0].reasons, [
        'Typhoon warning in South China Sea',
        'Military exclusion zone',
      ]);
    });

    test('handles single candidate without error', () => {
      const cand = {
        routeId: 'route-only',
        distanceNm: 2500,
        sailingHours: 200,
        sailingDays: 8.33,
        totalDays: 8.33,
        totalCostUsd: 150000,
        riskScore: 25,
        riskKnown: true,
        prohibited: false,
      };

      const result = rankAndRecommendRoutes({ candidates: [cand] });
      assert.equal(result.routes.length, 1);
      assert.equal(result.routes[0].rank, 1);
      assert.equal(result.routes[0].recommended, true);
      assert.ok(result.recommendation.explanation.includes('only feasible candidate'));
    });

    test('handles zero eligible routes gracefully', () => {
      const candProhibited = {
        routeId: 'route-prohibited',
        distanceNm: 2000,
        totalCostUsd: 100000,
        totalDays: 7,
        prohibited: true,
        reasons: ['Canal blocked'],
      };

      const result = rankAndRecommendRoutes({ candidates: [candProhibited] });
      assert.equal(result.routes.length, 0);
      assert.equal(result.excludedRoutes.length, 1);
      assert.equal(result.recommendation.routeId, null);
      assert.ok(result.recommendation.explanation.includes('excluded'));
    });

    test('null/missing risk score excludes risk from scoring and redistributes weights', () => {
      const cand1 = {
        routeId: 'route-1',
        distanceNm: 2400,
        sailingHours: 200,
        sailingDays: 8.33,
        totalDays: 8.33,
        totalCostUsd: 100000,
        riskScore: null,
        riskKnown: false,
        prohibited: false,
      };
      const cand2 = {
        routeId: 'route-2',
        distanceNm: 2600,
        sailingHours: 220,
        sailingDays: 9.17,
        totalDays: 9.17,
        totalCostUsd: 120000,
        riskScore: null,
        riskKnown: false,
        prohibited: false,
      };

      const result = rankAndRecommendRoutes({
        candidates: [cand1, cand2],
        weights: { cost: 0.4, time: 0.35, risk: 0.25 },
      });

      assert.equal(result.routes[0].routeId, 'route-1');
      assert.equal(result.routes[0].scores.risk, null);
      assert.ok(result.routes[0].warnings.some((w) => w.includes('Risk score was unavailable')));
      assert.equal(result.meta.riskDataComplete, false);
    });

    test('tie-breaks deterministically by lower cost, then lower ETA, then routeId', () => {
      // Exactly identical scores & cost & ETA except routeId
      const candB = {
        routeId: 'route-B',
        distanceNm: 2400,
        sailingHours: 200,
        totalDays: 8.33,
        totalCostUsd: 100000,
        riskScore: 20,
        riskKnown: true,
        prohibited: false,
      };
      const candA = {
        routeId: 'route-A',
        distanceNm: 2400,
        sailingHours: 200,
        totalDays: 8.33,
        totalCostUsd: 100000,
        riskScore: 20,
        riskKnown: true,
        prohibited: false,
      };

      const result = rankAndRecommendRoutes({ candidates: [candB, candA] });
      assert.equal(result.routes[0].routeId, 'route-A');
      assert.equal(result.routes[1].routeId, 'route-B');
    });

    test('generates dynamic explanation referencing numbers and trade-offs', () => {
      const cand1 = {
        routeId: 'route-winner',
        distanceNm: 2500,
        sailingHours: 200,
        sailingDays: 8.33,
        totalDays: 8.33,
        totalCostUsd: 150000,
        riskScore: 15,
        riskKnown: true,
        prohibited: false,
      };
      const cand2 = {
        routeId: 'route-runnerup',
        distanceNm: 2400, // shorter
        sailingHours: 192,
        sailingDays: 8.0,
        totalDays: 8.0,
        totalCostUsd: 165000, // more expensive
        riskScore: 60, // much riskier
        riskKnown: true,
        prohibited: false,
      };

      const result = rankAndRecommendRoutes({
        candidates: [cand1, cand2],
        weights: { cost: 0.4, time: 0.2, risk: 0.4 },
      });

      const exp = result.recommendation.explanation;
      assert.ok(exp.includes('route-winner is recommended'));
      assert.ok(exp.includes('saves $15,000'));
      assert.ok(exp.includes('route-runnerup is the shortest route'));
    });
  });
});
