'use strict';

const { getRouteComparison } = require('../services/routeService');

async function runDemo() {
  console.log('================================================================');
  console.log(' WAYPOINT - Route Calculation & Comparison Module Demo');
  console.log(' Origin: BOM (Mumbai)  ->  Destination: SIN (Singapore)');
  console.log(' Vessel: VESSEL_01 (Pacific Trader - Container)');
  console.log('================================================================\n');

  // Illustrative risk provider supplied by Member 4 (weather/hazard module)
  const mockRiskProvider = async (route) => {
    // Member 4 evaluates route waypoints / passages for cyclones, sea state, and geopolitical risk
    if (route.variant === 'baseline') {
      return {
        riskScore: 28.0,
        prohibited: false,
        reasons: ['Moderate monsoon swell in the Bay of Bengal; clear in Malacca Strait.'],
      };
    }
    return {
      riskScore: 18.5,
      prohibited: false,
      reasons: ['Low weather risk along Sunda Strait approach.'],
    };
  };

  try {
    const result = await getRouteComparison({
      originPortId: 'BOM',
      destinationPortId: 'SIN',
      vesselId: 'VESSEL_01',
      options: {
        maxRoutes: 3,
        riskProvider: mockRiskProvider,
        // Override weights: 40% cost, 35% time, 25% risk
        weights: { cost: 0.40, time: 0.35, risk: 0.25 },
        bufferHours: 24,
        idleFuelTonnesPerDay: 3.0,
        fuelPriceUsdPerTonne: 650,
        portChargesUsd: 15000,
      },
    });

    console.log(`Generated At: ${result.generatedAt}`);
    console.log(`Candidate Routes Found: ${result.meta.candidateCount}`);
    console.log('\n----------------------------------------------------------------');
    console.log(' RECOMMENDATION');
    console.log('----------------------------------------------------------------');
    console.log(`Recommended Route: ${result.recommendation.routeId}`);
    console.log(`Rationale: ${result.recommendation.explanation}\n`);

    console.log('----------------------------------------------------------------');
    console.log(' ROUTE CANDIDATES COMPARISON TABLE');
    console.log('----------------------------------------------------------------');
    console.table(
      result.routes.map((r) => ({
        'Rank': r.rank,
        'Route ID': r.routeId,
        'Recommended': r.recommended ? 'YES ★' : 'No',
        'Distance (nm)': r.distanceNm,
        'Sailing (d)': r.sailingDays,
        'Total (d)': r.totalDays,
        'Fuel (t)': r.fuelTonnes,
        'Fuel Cost ($)': `$${r.fuelCostUsd.toLocaleString()}`,
        'Total Cost ($)': `$${r.totalCostUsd.toLocaleString()}`,
        'Risk (0-100)': r.riskScore !== null ? r.riskScore : 'N/A',
        'Composite Score': `${r.scores.total}/100`,
        'Passages': r.passages.join(', ') || 'open water',
      }))
    );

    if (result.excludedRoutes.length > 0) {
      console.log('\n----------------------------------------------------------------');
      console.log(' EXCLUDED ROUTES (Prohibited by Hazard / Navigational Constraints)');
      console.log('----------------------------------------------------------------');
      result.excludedRoutes.forEach((ex) => {
        console.log(`- ${ex.routeId}: ${ex.reasons.join('; ')}`);
      });
    }

    console.log('\n----------------------------------------------------------------');
    console.log(' ASSUMPTIONS & DISCLAIMER');
    console.log('----------------------------------------------------------------');
    console.log('Weights Used:', result.meta.weightsUsed);
    console.log('Operational Assumptions:', result.meta.assumptions);
    console.log(`Disclaimer: ${result.meta.disclaimer}\n`);

  } catch (err) {
    console.error('Demo encountered error:', err.message, err.code ? `[Code: ${err.code}]` : '');
    process.exitCode = 1;
  }
}

runDemo();
