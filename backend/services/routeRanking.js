'use strict';

const { RouteError } = require('../utils/distance');

const DEFAULT_WEIGHTS = {
  cost: 0.40,
  time: 0.35,
  risk: 0.25,
};

/**
 * Validates ranking weights.
 * Weights must be non-negative numbers summing to 1.0 (within 0.001 floating point tolerance).
 *
 * @param {object} weights
 * @returns {{ cost: number, time: number, risk: number }}
 */
function validateWeights(weights = {}) {
  const cost = Number(weights.cost !== undefined ? weights.cost : DEFAULT_WEIGHTS.cost);
  const time = Number(weights.time !== undefined ? weights.time : DEFAULT_WEIGHTS.time);
  const risk = Number(weights.risk !== undefined ? weights.risk : DEFAULT_WEIGHTS.risk);

  if (!Number.isFinite(cost) || cost < 0 ||
      !Number.isFinite(time) || time < 0 ||
      !Number.isFinite(risk) || risk < 0) {
    throw new RouteError(
      `Ranking weights must be non-negative numbers. Received cost=${weights.cost}, time=${weights.time}, risk=${weights.risk}`,
      'INVALID_WEIGHTS'
    );
  }

  const sum = cost + time + risk;
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new RouteError(
      `Ranking weights must sum to 1.0. Current sum: ${sum.toFixed(4)} (cost=${cost}, time=${time}, risk=${risk})`,
      'INVALID_WEIGHTS'
    );
  }

  return { cost, time, risk };
}

/**
 * Min-max normalizes a metric across a list of items to [0, 100], where lower values are better (score 0 = best).
 * If all items have the same metric or only one item exists, returns 0 for all items.
 *
 * @param {Array<object>} items
 * @param {string} key
 * @returns {Map<object, number>}
 */
function minMaxNormalize(items, key) {
  const result = new Map();
  if (items.length === 0) return result;

  let min = Infinity;
  let max = -Infinity;

  for (const item of items) {
    const val = item[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }

  const range = max - min;

  for (const item of items) {
    const val = item[key];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      result.set(item, null);
    } else if (range <= 1e-9) {
      // All values are effectively identical or single item: assign 0 (optimal baseline)
      result.set(item, 0);
    } else {
      const normalized = ((val - min) / range) * 100;
      result.set(item, normalized);
    }
  }

  return result;
}

/**
 * Generates dynamic, numbers-driven explanation comparing the recommended route
 * to the runner-up and highlighting trade-offs vs shortest, cheapest, or safest routes.
 *
 * @param {Array<object>} rankedRoutes
 * @returns {{ routeId: string|null, explanation: string }}
 */
function generateRecommendationExplanation(rankedRoutes) {
  if (!Array.isArray(rankedRoutes) || rankedRoutes.length === 0) {
    return {
      routeId: null,
      explanation: 'No eligible sea route candidates available for recommendation.',
    };
  }

  const winner = rankedRoutes[0];
  if (rankedRoutes.length === 1) {
    return {
      routeId: winner.routeId,
      explanation: `Route ${winner.routeId} is the only feasible candidate found (${winner.distanceNm.toFixed(0)} nm, ${winner.sailingDays.toFixed(1)} sailing days, estimated cost $${Math.round(winner.totalCostUsd).toLocaleString()}).`,
    };
  }

  const runnerUp = rankedRoutes[1];
  const parts = [];

  parts.push(`Route ${winner.routeId} is recommended with the best composite score (${winner.scores.total.toFixed(1)}/100).`);

  // Compare winner with runner-up
  const costDiff = winner.totalCostUsd - runnerUp.totalCostUsd;
  const timeDiffHours = winner.sailingHours - runnerUp.sailingHours;
  const distDiffNm = winner.distanceNm - runnerUp.distanceNm;

  const costComparison =
    costDiff < -10
      ? `saves $${Math.abs(Math.round(costDiff)).toLocaleString()} (${Math.abs((costDiff / runnerUp.totalCostUsd) * 100).toFixed(1)}% cheaper)`
      : costDiff > 10
      ? `costs $${Math.round(costDiff).toLocaleString()} more (+${((costDiff / runnerUp.totalCostUsd) * 100).toFixed(1)}%)`
      : 'has virtually identical cost';

  const timeComparison =
    timeDiffHours < -0.5
      ? `saves ${Math.abs(timeDiffHours).toFixed(1)} h sailing time`
      : timeDiffHours > 0.5
      ? `requires +${timeDiffHours.toFixed(1)} h additional sailing time`
      : 'has similar sailing time';

  parts.push(`Compared to runner-up ${runnerUp.routeId}, it ${costComparison} and ${timeComparison}.`);

  // Trade-off against shortest / cheapest / safest
  let shortest = rankedRoutes[0];
  let cheapest = rankedRoutes[0];
  let safest = rankedRoutes.find((r) => r.riskKnown) || null;

  for (const r of rankedRoutes) {
    if (r.distanceNm < shortest.distanceNm) shortest = r;
    if (r.totalCostUsd < cheapest.totalCostUsd) cheapest = r;
    if (r.riskKnown && (!safest || r.riskScore < safest.riskScore)) safest = r;
  }

  if (shortest.routeId !== winner.routeId) {
    const extraNm = winner.distanceNm - shortest.distanceNm;
    parts.push(`While ${shortest.routeId} is the shortest route (${shortest.distanceNm.toFixed(0)} nm, -${extraNm.toFixed(0)} nm), ${winner.routeId} achieves a superior overall cost and risk profile.`);
  }

  if (safest && safest.routeId !== winner.routeId && winner.riskKnown) {
    const riskDiff = winner.riskScore - safest.riskScore;
    parts.push(`The lowest-risk option is ${safest.routeId} (risk score ${safest.riskScore.toFixed(1)} vs ${winner.riskScore.toFixed(1)}), but ${winner.routeId} delivers better overall economics.`);
  } else if (winner.riskKnown && runnerUp.riskKnown && winner.riskScore < runnerUp.riskScore) {
    const riskDiffPct = ((runnerUp.riskScore - winner.riskScore) / Math.max(runnerUp.riskScore, 1)) * 100;
    if (riskDiffPct >= 5) {
      parts.push(`It also benefits from a lower hazard risk score (${winner.riskScore.toFixed(1)} vs ${runnerUp.riskScore.toFixed(1)}, ${riskDiffPct.toFixed(1)}% safer).`);
    }
  }

  return {
    routeId: winner.routeId,
    explanation: parts.join(' '),
  };
}

/**
 * Filter prohibited routes, normalize metrics, compute weighted composite scores,
 * sort deterministically, and generate recommendation explanation.
 *
 * @param {object} params
 * @param {Array<object>} params.candidates - Evaluated routes with distanceNm, totalCostUsd, sailingHours, riskScore, etc.
 * @param {object} [params.weights] - Optional weight overrides { cost, time, risk }
 * @returns {object} { routes, excludedRoutes, recommendation, meta }
 */
function rankAndRecommendRoutes({ candidates = [], weights = {} }) {
  const validatedWeights = validateWeights(weights);

  const eligible = [];
  const excludedRoutes = [];

  // Partition candidates by prohibition status
  for (const c of candidates) {
    if (c.prohibited) {
      excludedRoutes.push({
        routeId: c.routeId,
        reasons: Array.isArray(c.reasons) && c.reasons.length > 0 ? c.reasons : ['Flagged as prohibited by hazard/risk assessment'],
        distanceNm: c.distanceNm,
        passages: c.passages || [],
      });
    } else {
      eligible.push({ ...c });
    }
  }

  // Handle edge case: 0 eligible routes
  if (eligible.length === 0) {
    return {
      routes: [],
      excludedRoutes,
      recommendation: {
        routeId: null,
        explanation: excludedRoutes.length > 0
          ? `All ${excludedRoutes.length} candidate route(s) were excluded due to severe hazard or canal prohibitions.`
          : 'No candidate routes were found or supplied.',
      },
      meta: {
        candidateCount: 0,
        eligibleCount: 0,
        excludedCount: excludedRoutes.length,
        weightsUsed: validatedWeights,
        notes: ['Zero eligible candidates to rank.'],
      },
    };
  }

  // Determine if risk is known for candidates
  const anyRiskKnown = eligible.some((r) => r.riskKnown && typeof r.riskScore === 'number');
  const allRiskKnown = eligible.every((r) => r.riskKnown && typeof r.riskScore === 'number');

  // Min-max normalization for cost, time, and risk
  const normCost = minMaxNormalize(eligible, 'totalCostUsd');
  const normTime = minMaxNormalize(eligible, 'totalDays');
  const normRisk = minMaxNormalize(eligible, 'riskScore');

  const notes = [];

  // Compute composite score for each eligible route
  for (const route of eligible) {
    const scCost = normCost.get(route);
    const scTime = normTime.get(route);
    const scRisk = normRisk.get(route);

    let totalScore = 0;
    const scores = {
      cost: scCost,
      time: scTime,
      risk: scRisk,
      total: 0,
    };

    if (route.riskKnown && scRisk !== null) {
      totalScore =
        validatedWeights.cost * scCost +
        validatedWeights.time * scTime +
        validatedWeights.risk * scRisk;
    } else {
      // Re-distribute weights across cost and time when risk is missing
      const weightSum = validatedWeights.cost + validatedWeights.time;
      const reCost = weightSum > 0 ? validatedWeights.cost / weightSum : 0.5;
      const reTime = weightSum > 0 ? validatedWeights.time / weightSum : 0.5;

      totalScore = reCost * scCost + reTime * scTime;
      route.warnings = route.warnings || [];
      route.warnings.push('Risk score was unavailable; risk excluded and weights redistributed across cost and time.');
    }

    scores.total = totalScore;
    route.scores = scores;
  }

  if (!allRiskKnown) {
    notes.push('One or more routes had missing hazard risk scores. Risk was excluded and weights were proportionally redistributed across cost and time for affected candidates.');
  }

  // Deterministic tie-breaking:
  // 1. Lower total score
  // 2. Lower totalCostUsd
  // 3. Lower sailingHours
  // 4. Alphabetical routeId
  eligible.sort((a, b) => {
    if (Math.abs(a.scores.total - b.scores.total) > 1e-5) {
      return a.scores.total - b.scores.total;
    }
    if (Math.abs(a.totalCostUsd - b.totalCostUsd) > 1e-2) {
      return a.totalCostUsd - b.totalCostUsd;
    }
    if (Math.abs(a.sailingHours - b.sailingHours) > 1e-4) {
      return a.sailingHours - b.sailingHours;
    }
    return String(a.routeId).localeCompare(String(b.routeId));
  });

  // Assign final rank and recommended flag
  eligible.forEach((route, index) => {
    route.rank = index + 1;
    route.recommended = index === 0;
  });

  const recommendation = generateRecommendationExplanation(eligible);

  return {
    routes: eligible,
    excludedRoutes,
    recommendation,
    meta: {
      candidateCount: candidates.length,
      eligibleCount: eligible.length,
      excludedCount: excludedRoutes.length,
      weightsUsed: validatedWeights,
      riskDataComplete: allRiskKnown,
      notes,
    },
  };
}

module.exports = {
  DEFAULT_WEIGHTS,
  validateWeights,
  minMaxNormalize,
  generateRecommendationExplanation,
  rankAndRecommendRoutes,
};
