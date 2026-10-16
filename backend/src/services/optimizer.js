// Member 3 + Member 4: agree on the final ranking logic together.
// High/severe official hazards should be excluded or prominently flagged in a
// production system rather than traded off against a small cost saving.

function optimizeRoutes(routes, options = {}) {
  const speed = options.shipSpeedKnots || 14;

  const enriched = routes.map(route => {
    // 1 nautical mile = 1 knot * 1 hour. This is a simple sailing-time estimate.
    const etaDays = Number((route.distanceNm / speed / 24).toFixed(1));

    // Sample operating cost scales with the sample base cost and travel time.
    // Replace with validated fuel burn, fuel price, port charges and other costs.
    const baseEta = route.baseEtaDays > 0 ? route.baseEtaDays : (etaDays > 0 ? etaDays : 1);
    const estimatedCostUsd = Math.round(
      route.baseOperatingCostUsd * (etaDays / baseEta)
    );

    const hazards = Array.isArray(route.hazards) ? route.hazards : [];
    const riskPenalty = hazards.length > 0 ? 1000 : 0;
    const riskLevel = hazards.some(h => h.severity === "High")
      ? "High"
      : (route.riskLevel || "Low");

    // Lower score is better. Risk is deliberately prioritized for this demo.
    const score = Number((
      riskPenalty +
      estimatedCostUsd * 0.01 +
      etaDays +
      (riskLevel === "High" ? 300 : riskLevel === "Medium" ? 100 : 0)
    ).toFixed(2));

    return {
      id: route.id,
      name: route.name,
      via: route.via,
      distanceNm: route.distanceNm,
      etaDays,
      estimatedCostUsd,
      riskLevel,
      hazards: route.hazards,
      hazardExposure: route.hazards.length > 0,
      withinBudget: options.budgetUsd == null ? null : estimatedCostUsd <= options.budgetUsd,
      score
    };
  });

  enriched.sort((a, b) => a.score - b.score);
  const recommendedRouteId = enriched.length ? enriched[0].id : null;

  return {
    routes: enriched.map(route => ({
      ...route,
      recommended: route.id === recommendedRouteId
    })),
    recommendedRouteId,
    rankingMethod: "demo risk-prioritized score; not validated for real navigation"
  };
}

module.exports = { optimizeRoutes };
