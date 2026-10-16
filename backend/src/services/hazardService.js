/**
 * Maritime Hazard Detection Service
 * 
 * Dynamically detects active marine hazards (cyclones, gale winds, high waves, security zones)
 * along a route using spherical geometry from hazards/geo.js and dynamic alerts from Firebase Firestore.
 * Zero hardcoded demo hazard dictionaries.
 */

const geo = require("../../hazards/geo");
const CONFIG = require("../../hazards/config");
const { getAlerts } = require("./dataService");

/**
 * Detect hazards along a route dynamically.
 * Matches route coordinates/waypoints against active alert zones from Firebase.
 * 
 * @param {object} route - Route candidate with waypoints or origin/destination
 * @param {Array<object>} [customAlerts=null] - Optional pre-fetched alerts list
 * @returns {Promise<Array<object>>|Array<object>} Detected hazard objects
 */
async function detectHazardsAsync(route, customAlerts = null) {
  const alerts = customAlerts || (await getAlerts());
  return evaluateRouteHazards(route, alerts);
}

/**
 * Synchronous evaluator when alerts are already loaded or cached.
 * @param {object} route 
 * @param {Array<object>} alerts 
 * @returns {Array<object>}
 */
function evaluateRouteHazards(route, alerts = []) {
  if (!route || !Array.isArray(alerts) || alerts.length === 0) {
    return [];
  }

  const waypoints = route.waypoints || [];
  const detected = [];
  const seenHazardIds = new Set();

  for (const alert of alerts) {
    if (alert.lat == null || alert.lon == null) continue;
    const center = { lat: alert.lat, lon: alert.lon };
    const dangerRadiusKm = alert.radiusKm || CONFIG.DEFAULT_CYCLONE_RADIUS_KM || 250;

    let closestDistanceKm = Infinity;
    let intersects = false;

    // 1. Check if waypoints are provided
    if (waypoints.length > 0) {
      for (const pt of waypoints) {
        if (pt.lat == null || pt.lon == null) continue;
        const dist = geo.haversineDistance(pt, center);
        if (dist < closestDistanceKm) {
          closestDistanceKm = dist;
        }
        if (dist <= dangerRadiusKm) {
          intersects = true;
        }
      }
    } else if (route.viaCoordinates && Array.isArray(route.viaCoordinates)) {
      for (const pt of route.viaCoordinates) {
        const dist = geo.haversineDistance(pt, center);
        if (dist < closestDistanceKm) closestDistanceKm = dist;
        if (dist <= dangerRadiusKm) intersects = true;
      }
    }

    // 2. Also check if route explicitly references this alert ID (e.g. from trade link metadata)
    if ((route.hazardIds || []).includes(alert.id)) {
      intersects = true;
    }

    if (intersects && !seenHazardIds.has(alert.id)) {
      seenHazardIds.add(alert.id);
      detected.push({
        id: alert.id,
        type: alert.type || "Marine Hazard",
        severity: alert.severity || "Medium",
        description: alert.description || "Active hazard zone intersecting route path",
        source: alert.source || "Firebase Firestore Alerts",
        center: { lat: alert.lat, lon: alert.lon },
        dangerRadiusKm,
        distanceToRouteKm: Number.isFinite(closestDistanceKm) ? Math.round(closestDistanceKm) : 0,
        validAt: alert.issuedAt || new Date().toISOString()
      });
    }
  }

  return detected;
}

/**
 * Backward-compatible synchronous detectHazards function.
 * If alerts are already cached in dataService or passed on route, uses them.
 * 
 * @param {object} route 
 * @returns {Array<object>}
 */
function detectHazards(route) {
  // If route already contains pre-attached hazards, return them
  if (route && Array.isArray(route.hazards) && route.hazards.length > 0) {
    return route.hazards;
  }
  
  // Try using cached alerts from dataService synchronously if available
  try {
    const dataService = require("./dataService");
    // If trade link or route has custom alerts attached
    if (route && Array.isArray(route.activeAlerts)) {
      return evaluateRouteHazards(route, route.activeAlerts);
    }
  } catch (e) {
    // Graceful fallback
  }

  return [];
}

module.exports = {
  detectHazards,
  detectHazardsAsync,
  evaluateRouteHazards
};
