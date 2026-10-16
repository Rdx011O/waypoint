/**
 * Maritime Route Engine & Candidate Generator
 * 
 * Generates dynamic maritime route candidates between ANY source and destination ports.
 * Replaces hardcoded routeCatalog with spherical geometry (Haversine & great-circle interpolation)
 * and trade links dynamically loaded from Firebase Firestore / CSV.
 */

const geo = require("../../hazards/geo");
const { getTradeLinks } = require("./dataService");

/**
 * Standard maritime operational cost per nautical mile estimate (fuel burn + crew/operating).
 */
const BASE_COST_PER_NM_USD = 1.45;
const DEFAULT_SPEED_KNOTS = 14;

/**
 * Identify intermediate sea bodies/straits between two coordinates for route naming and 'via'.
 * @param {object} p1 - Source { lat, lon }
 * @param {object} p2 - Destination { lat, lon }
 * @returns {Array<string>} Names of maritime passages
 */
function inferMaritimeWaypoints(p1, p2) {
  const passages = [];
  const minLon = Math.min(p1.lon, p2.lon);
  const maxLon = Math.max(p1.lon, p2.lon);
  const avgLat = (p1.lat + p2.lat) / 2;

  if (minLon < 75 && maxLon > 50) passages.push("Arabian Sea");
  if (minLon < 60 && avgLat > 20) passages.push("Gulf of Oman");
  if (minLon < 90 && maxLon > 75) passages.push("Bay of Bengal");
  if (avgLat < 10) passages.push("Indian Ocean Basin");
  if (maxLon > 98) passages.push("Strait of Malacca");
  if (maxLon > 115) passages.push("South China Sea");

  return passages.length > 0 ? passages : ["Open Ocean Corridor"];
}

/**
 * Compute candidate routes dynamically between any two ports.
 * 
 * @param {object} sourcePort - Source port object { name, latitude, longitude }
 * @param {object} destinationPort - Destination port object { name, latitude, longitude }
 * @param {object} [options={}] - Optional speed, tradeLinks, etc.
 * @returns {Array<object>} Candidate routes
 */
function getCandidateRoutes(sourcePort, destinationPort, options = {}) {
  if (!sourcePort || !destinationPort) {
    return [];
  }

  const p1 = {
    lat: Number(sourcePort.latitude ?? sourcePort.lat ?? 0),
    lon: Number(sourcePort.longitude ?? sourcePort.lng ?? 0)
  };
  const p2 = {
    lat: Number(destinationPort.latitude ?? destinationPort.lat ?? 0),
    lon: Number(destinationPort.longitude ?? destinationPort.lng ?? 0)
  };

  const speed = Number(options.shipSpeedKnots) || DEFAULT_SPEED_KNOTS;

  // Calculate direct Haversine great-circle distance
  const directDistanceKm = geo.haversineDistance(p1, p2);
  const directDistanceNm = Math.round(geo.kmToNm(directDistanceKm));

  if (directDistanceNm <= 0) {
    return [];
  }

  const viaPassages = inferMaritimeWaypoints(p1, p2);
  const routePrefix = `${(sourcePort.unlocode || sourcePort.id || "SRC").substring(0, 3).toUpperCase()}-${(destinationPort.unlocode || destinationPort.id || "DST").substring(0, 3).toUpperCase()}`;

  // 1. Candidate A: Direct Great-Circle Corridor
  const directWaypoints = geo.densifyRoute([p1, p2], 100);
  const etaDaysA = Number((directDistanceNm / speed / 24).toFixed(1));
  const costA = Math.round(directDistanceNm * BASE_COST_PER_NM_USD);

  const candidateA = {
    id: `${routePrefix}-DIR`,
    name: "Candidate A — Direct Corridor",
    via: viaPassages,
    distanceNm: directDistanceNm,
    distanceKm: Math.round(directDistanceKm),
    baseEtaDays: etaDaysA,
    baseOperatingCostUsd: costA,
    riskLevel: "Low",
    waypoints: directWaypoints,
    demoHazardIds: [],
    hazardExposure: false
  };

  // 2. Candidate B: Alternative / Coastal Detour Corridor (+8% to 15% distance)
  const midpoint = geo.interpolateGreatCircle(p1, p2, 0.5);
  const bearing = geo.initialBearing(p1, p2);
  // Offset midpoint perpendicularly to create a navigational alternative
  const offsetDistanceKm = Math.min(300, Math.max(80, directDistanceKm * 0.08));
  const alternativeMidpoint = geo.destinationPoint(midpoint, offsetDistanceKm, (bearing + 90) % 360);

  const altWaypoints = geo.densifyRoute([p1, alternativeMidpoint, p2], 100);
  const altDistanceKm = geo.calculateRouteDistanceKm(altWaypoints);
  const altDistanceNm = Math.round(geo.kmToNm(altDistanceKm));
  const etaDaysB = Number((altDistanceNm / speed / 24).toFixed(1));
  const costB = Math.round(altDistanceNm * BASE_COST_PER_NM_USD);

  const candidateB = {
    id: `${routePrefix}-ALT`,
    name: "Candidate B — Alternative Detour Corridor",
    via: [...viaPassages, "Offshore Corridor"],
    distanceNm: altDistanceNm,
    distanceKm: Math.round(altDistanceKm),
    baseEtaDays: etaDaysB,
    baseOperatingCostUsd: costB,
    riskLevel: "Low",
    waypoints: altWaypoints,
    demoHazardIds: [],
    hazardExposure: false
  };

  return [candidateA, candidateB];
}

/**
 * Async version of getCandidateRoutes that checks Firebase trade links.
 * 
 * @param {object} sourcePort 
 * @param {object} destinationPort 
 * @param {object} options 
 * @returns {Promise<Array<object>>}
 */
async function getCandidateRoutesAsync(sourcePort, destinationPort, options = {}) {
  const tradeLinks = await getTradeLinks();
  const sName = (sourcePort.name || "").toLowerCase();
  const dName = (destinationPort.name || "").toLowerCase();

  // Find if a specific trade link exists in Firestore
  const matchedLink = tradeLinks.find(l => {
    const oName = (l.originPort || "").toLowerCase();
    const destName = (l.destinationPort || "").toLowerCase();
    return (oName.includes(sName) && destName.includes(dName)) ||
           (oName.includes(dName) && destName.includes(sName));
  });

  const candidates = getCandidateRoutes(sourcePort, destinationPort, options);

  if (matchedLink && matchedLink.greatCircleNm > 0) {
    // Calibrate candidate A with official trade link benchmark distance
    candidates[0].distanceNm = matchedLink.greatCircleNm;
    candidates[0].distanceKm = matchedLink.greatCircleKm || Math.round(matchedLink.greatCircleNm * 1.852);
    candidates[0].baseEtaDays = Number((matchedLink.greatCircleNm / (options.shipSpeedKnots || DEFAULT_SPEED_KNOTS) / 24).toFixed(1));
    candidates[0].baseOperatingCostUsd = Math.round(matchedLink.greatCircleNm * BASE_COST_PER_NM_USD);
    if (matchedLink.commodities) {
      candidates[0].tradeCommodities = matchedLink.commodities;
    }
  }

  return candidates;
}

module.exports = {
  getCandidateRoutes,
  getCandidateRoutesAsync
};
