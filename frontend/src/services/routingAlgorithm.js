// WAYPOINT — Maritime Multi-Criteria Routing Algorithm
// Synthesizes route options, draft feasibility, bunker costs, and carrier matching based on CSV datasets

import { 
  CSV_TRADE_LINKS, 
  SHIPPING_LINES_BY_PORT, 
  CSV_VESSEL_TYPES 
} from '../data/maritimeCsvData';

// Haversine formula for nautical distance calculation
export function calculateHaversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Approximate vessel draft requirement by category/type
const DRAFT_REQUIREMENTS = {
  'Feeder': 8.0,
  'Panamax / Post-Panamax': 12.5,
  'Neo-Panamax / ULCV': 15.5,
  'Handysize / Supramax': 10.0,
  'Panamax / Kamsarmax': 13.5,
  'Capesize': 18.0,
  'Aframax / Suezmax': 15.0,
  'VLCC': 20.5,
  'LPG carrier (VLGC)': 11.5,
  'LNG carrier': 12.0,
  'PCTC': 9.5,
  'Multipurpose / Break-bulk': 9.0
};

// Main Routing Synthesis Engine
export function synthesizeMaritimeRoutes({
  originPort,       // Object from CSV_INDIAN_PORTS
  destPort,         // Object from CSV_FOREIGN_PORTS
  cargoType = 'Containers',
  vesselType = 'Feeder',
  benchmarkBudget = 25000
}) {
  if (!originPort || !destPort) return null;

  // 1. Check verified trade link dataset first
  const existingLink = CSV_TRADE_LINKS.find(
    l => l.originPortId === originPort.portId && 
         (l.destinationUnlocode === destPort.unlocode || l.destinationPort.toLowerCase().includes(destPort.name.toLowerCase()))
  );

  let baseNm = existingLink ? existingLink.greatCircleNm : calculateHaversineNm(originPort.lat, originPort.lng, destPort.lat, destPort.lng);
  
  // Real nautical sea-lane detour factor (real routes cannot cross landmasses)
  // E.g. Palk Strait bypass south of Sri Lanka or Malacca detour
  let detourFactor = 1.15;
  if (destPort.country === 'Netherlands' || destPort.country === 'UK' || destPort.country === 'Germany') {
    detourFactor = 1.25; // Suez corridor
  } else if (destPort.country === 'USA') {
    detourFactor = 1.30;
  }
  const realSeaDistanceNm = Math.round(baseNm * detourFactor);

  // 2. Draft Compatibility Check
  const requiredDraft = DRAFT_REQUIREMENTS[vesselType] || 10.0;
  const portDraft = originPort.maxDraftM || 12.0;
  const draftFeasible = portDraft >= requiredDraft;
  const draftDelta = (requiredDraft - portDraft).toFixed(1);

  let draftWarning = null;
  if (!draftFeasible) {
    draftWarning = `Draft constraint: ${originPort.name} maximum draft is ${portDraft}m, but selected ${vesselType} requires ${requiredDraft}m permissible draft (deficit: ${draftDelta}m). Deepwater alternatives like Gangavaram (21m) or Dhamra (18m) recommended.`;
  }

  // 3. Matched Shipping Lines from shipping_lines_by_port.csv
  const portCarriers = SHIPPING_LINES_BY_PORT[originPort.portId] || [];
  
  // Categorize carriers by relevance
  let categoryFilter = 'container';
  if (cargoType.toLowerCase().includes('coal') || cargoType.toLowerCase().includes('ore') || cargoType.toLowerCase().includes('bulk')) {
    categoryFilter = 'bulk';
  } else if (cargoType.toLowerCase().includes('oil') || cargoType.toLowerCase().includes('gas') || cargoType.toLowerCase().includes('lng')) {
    categoryFilter = 'tanker';
  } else if (cargoType.toLowerCase().includes('car') || cargoType.toLowerCase().includes('ro-ro')) {
    categoryFilter = 'ro_ro';
  }

  const matchedCarriers = portCarriers.filter(c => 
    c.category.toLowerCase().includes(categoryFilter) || c.category.toLowerCase().includes('global')
  );

  // 4. Generate 4 Multi-Criteria Route Options (ASD-STE100 Table 4 structure)
  // Daily fuel cost baseline: $620 / MT VLSFO
  const fuelRatePerDay = 620;

  // Waypoints synthesis
  const sriLankaBypass = [5.9, 80.5]; // South of Dondra Head
  const malaccaApproach = [5.5, 95.0];

  const routeA = {
    id: 'A',
    name: 'Route A — Best Balanced',
    type: 'Best Balanced',
    isRecommended: true,
    distanceNm: realSeaDistanceNm,
    transitDays: parseFloat((realSeaDistanceNm / (14.5 * 24)).toFixed(1)),
    cost: Math.round(realSeaDistanceNm * 5.4 + 2500),
    riskScore: 22,
    hazards: 1,
    badgeColor: 'teal',
    budgetStatus: (realSeaDistanceNm * 5.4 + 2500) <= benchmarkBudget ? 'Within' : 'Above',
    breakdown: {
      bunkerCost: `$${Math.round(realSeaDistanceNm * 3.2).toLocaleString()}`,
      canalAndPortFees: `$${Math.round(realSeaDistanceNm * 1.3).toLocaleString()}`,
      securityAndInsurance: `$${Math.round(realSeaDistanceNm * 0.6).toLocaleString()}`,
      handling: '$1,800',
      weatherWindow: 'Favorable (85% calm)',
      co2Emissions: `${Math.round(realSeaDistanceNm * 0.045)} MT`
    },
    waypoints: [
      originPort.name,
      'Sri Lanka offshore bypass (6.0°N, 80.5°E)',
      'Direct Indian Ocean track',
      destPort.name
    ],
    coords: [
      [originPort.lat, originPort.lng],
      [originPort.lat > 10 ? originPort.lat - 3 : originPort.lat - 1, originPort.lng + 1],
      sriLankaBypass,
      malaccaApproach,
      [destPort.lat, destPort.lng]
    ]
  };

  const routeB = {
    id: 'B',
    name: 'Route B — Lowest Cost',
    type: 'Lowest Cost',
    isRecommended: false,
    distanceNm: Math.round(realSeaDistanceNm * 1.05),
    transitDays: parseFloat(((realSeaDistanceNm * 1.05) / (12.0 * 24)).toFixed(1)),
    cost: Math.round(realSeaDistanceNm * 4.6 + 2100),
    riskScore: 36,
    hazards: 2,
    badgeColor: 'amber',
    budgetStatus: 'Within',
    breakdown: {
      bunkerCost: `$${Math.round(realSeaDistanceNm * 2.5).toLocaleString()}`,
      canalAndPortFees: `$${Math.round(realSeaDistanceNm * 1.2).toLocaleString()}`,
      securityAndInsurance: `$${Math.round(realSeaDistanceNm * 0.5).toLocaleString()}`,
      handling: '$1,500',
      weatherWindow: 'Slow steaming, moderate coastal swells',
      co2Emissions: `${Math.round(realSeaDistanceNm * 0.038)} MT`
    },
    waypoints: [
      originPort.name,
      'Coastal littoral track',
      'Great Nicobar entrance',
      destPort.name
    ],
    coords: [
      [originPort.lat, originPort.lng],
      [originPort.lat - 2, originPort.lng + 2],
      [6.5, 85.0],
      [4.5, 96.0],
      [destPort.lat, destPort.lng]
    ]
  };

  const routeC = {
    id: 'C',
    name: 'Route C — Fastest Transit',
    type: 'Fastest Transit',
    isRecommended: false,
    distanceNm: Math.round(realSeaDistanceNm * 0.96),
    transitDays: parseFloat(((realSeaDistanceNm * 0.96) / (18.5 * 24)).toFixed(1)),
    cost: Math.round(realSeaDistanceNm * 6.8 + 2900),
    riskScore: 29,
    hazards: 2,
    badgeColor: 'amber',
    budgetStatus: (realSeaDistanceNm * 6.8 + 2900) <= benchmarkBudget ? 'Within' : 'Above',
    breakdown: {
      bunkerCost: `$${Math.round(realSeaDistanceNm * 4.4).toLocaleString()}`,
      canalAndPortFees: `$${Math.round(realSeaDistanceNm * 1.4).toLocaleString()}`,
      securityAndInsurance: `$${Math.round(realSeaDistanceNm * 0.7).toLocaleString()}`,
      handling: '$2,100',
      weatherWindow: 'High cruise velocity (18.5 kts)',
      co2Emissions: `${Math.round(realSeaDistanceNm * 0.062)} MT`
    },
    waypoints: [
      originPort.name,
      'Express deepwater corridor',
      'Direct great channel',
      destPort.name
    ],
    coords: [
      [originPort.lat, originPort.lng],
      [originPort.lat - 4, originPort.lng + 4],
      [5.5, 90.0],
      [3.5, 98.0],
      [destPort.lat, destPort.lng]
    ]
  };

  const routeD = {
    id: 'D',
    name: 'Route D — Lowest Risk (Storm Bypass)',
    type: 'Lowest Risk',
    isRecommended: false,
    distanceNm: Math.round(realSeaDistanceNm * 1.08),
    transitDays: parseFloat(((realSeaDistanceNm * 1.08) / (13.5 * 24)).toFixed(1)),
    cost: Math.round(realSeaDistanceNm * 5.8 + 2400),
    riskScore: 11,
    hazards: 0,
    badgeColor: 'teal',
    budgetStatus: (realSeaDistanceNm * 5.8 + 2400) <= benchmarkBudget ? 'Within' : 'Above',
    breakdown: {
      bunkerCost: `$${Math.round(realSeaDistanceNm * 3.5).toLocaleString()}`,
      canalAndPortFees: `$${Math.round(realSeaDistanceNm * 1.3).toLocaleString()}`,
      securityAndInsurance: `$${Math.round(realSeaDistanceNm * 0.6).toLocaleString()}`,
      handling: '$1,800',
      weatherWindow: 'Equatorial calm corridor, wave height < 1.4m',
      co2Emissions: `${Math.round(realSeaDistanceNm * 0.048)} MT`
    },
    waypoints: [
      originPort.name,
      'Equatorial calm bypass (2.0°N)',
      'Southern Malacca approaches',
      destPort.name
    ],
    coords: [
      [originPort.lat, originPort.lng],
      [4.0, 78.0],
      [1.5, 86.0],
      [1.2, 95.0],
      [destPort.lat, destPort.lng]
    ]
  };

  return {
    origin: originPort,
    destination: destPort,
    cargoType,
    vesselType,
    departureDate: departureDate || null,
    selectedVessel: selectedVessel || null,
    requiredDraft,
    portDraft,
    draftFeasible,
    draftWarning,
    realSeaDistanceNm,
    matchedCarriers: matchedCarriers.slice(0, 12),
    routes: [routeA, routeB, routeC, routeD]
  };
}
