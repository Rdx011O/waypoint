const {
  calculateShipperCost,
  compareCostsAcrossRoutes
} = require("../src/services/shipperCostService");

const { getCandidateRoutes } = require("../src/services/routeService");

async function runDemo() {
  const sourcePort = { id: "BOM", name: "Mumbai" };
  const destinationPort = { id: "SIN", name: "Singapore" };

  // Candidate route from routeService catalog
  const routes = getCandidateRoutes(sourcePort, destinationPort);
  const chosenRoute = routes[0]; // Candidate A: Direct Corridor

  const shipment = {
    shipmentRef: "SHP-BOM-SIN-2026-001",
    cargoType: "Precision Electronics",
    quantity: 2,
    unit: "FEU",
    cargoValueUsd: 120000,
    originPort: sourcePort,
    destinationPort
  };

  const delayInput = {
    expectedDelayDays: 1.5,
    confidence: "high",
    source: "live"
  };

  const options = {
    includePassageFees: true,
    includeFuelSurcharge: true,
    includeInsurance: true,
    conversionSpread: 0.015, // 1.5% commercial FX spread
    delayInput
  };

  console.log("================================================================================");
  console.log(" WAYPOINT SHIPPER COST ESTIMATE & CURRENCY CONVERSION DEMO");
  console.log("================================================================================");
  console.log(`Shipment: ${shipment.shipmentRef} | ${shipment.quantity} ${shipment.unit} (${shipment.cargoType})`);
  console.log(`Corridor: ${sourcePort.name} (${sourcePort.id}) → ${destinationPort.name} (${destinationPort.id})`);
  console.log(`Chosen Route: ${chosenRoute.name} [ID: ${chosenRoute.id}]`);
  console.log(`Passages: ${chosenRoute.via.join(" → ")}`);
  console.log(`Delay Assumption: ${delayInput.expectedDelayDays} days (${delayInput.source}, confidence: ${delayInput.confidence})`);
  console.log("--------------------------------------------------------------------------------\n");

  // Currency 1: EUR (2 decimals)
  console.log(">>> [ESTIMATE 1: EUR (€)]");
  const estimateEur = await calculateShipperCost({
    route: chosenRoute,
    shipment,
    originPort: sourcePort,
    destinationPort,
    selectedCurrency: "EUR",
    options
  });

  console.log(`Exchange Rate: 1 USD = ${estimateEur.currency.rate} EUR (${estimateEur.currency.rateSource}, date: ${estimateEur.currency.rateDate})`);
  console.log(`Commercial FX Spread: ${(estimateEur.currency.spreadApplied * 100).toFixed(2)}%`);
  console.log("\nLine Items Breakdown:");
  for (const item of estimateEur.lineItems) {
    const statusTag = item.status === "estimated" ? "[ESTIMATED]    " : `[${item.status.toUpperCase()}]`;
    const amtStr = item.formattedSelected ? item.formattedSelected.padStart(12) : "N/A".padStart(12);
    console.log(`  ${statusTag} ${item.label.padEnd(36)} ${amtStr} | Basis: ${item.basis}`);
  }

  console.log("\nSubtotals by Category (EUR):");
  console.log(`  - Ocean Freight:    ${estimateEur.subtotals.freight}`);
  console.log(`  - Port Charges:     ${estimateEur.subtotals.port}`);
  console.log(`  - Delay Allowance:  ${estimateEur.subtotals.delay}`);
  console.log(`  - Other Surcharges: ${estimateEur.subtotals.other}`);

  console.log(`\nTotal Shipper Estimate: ${estimateEur.total.formattedSelected} (USD equivalent: $${estimateEur.total.amountUsd.toLocaleString()})`);
  console.log(`Total Includes Components: ${estimateEur.total.includesOnly.join(", ")}`);
  if (estimateEur.range) {
    console.log(`Plausible Cost Range: €${estimateEur.range.low.toLocaleString()} - €${estimateEur.range.high.toLocaleString()}`);
  }
  console.log(`\nPlain Language Summary:\n"${estimateEur.summary}"`);
  console.log(`\nDisclaimer:\n"${estimateEur.disclaimer}"`);

  console.log("\n================================================================================");

  // Currency 2: JPY (0 decimals)
  console.log(">>> [ESTIMATE 2: JPY (¥)]");
  const estimateJpy = await calculateShipperCost({
    route: chosenRoute,
    shipment,
    originPort: sourcePort,
    destinationPort,
    selectedCurrency: "JPY",
    options
  });

  console.log(`Exchange Rate: 1 USD = ${estimateJpy.currency.rate} JPY (${estimateJpy.currency.rateSource}, date: ${estimateJpy.currency.rateDate})`);
  console.log("\nLine Items Breakdown (JPY):");
  for (const item of estimateJpy.lineItems) {
    const statusTag = item.status === "estimated" ? "[ESTIMATED]    " : `[${item.status.toUpperCase()}]`;
    const amtStr = item.formattedSelected ? item.formattedSelected.padStart(14) : "N/A".padStart(14);
    console.log(`  ${statusTag} ${item.label.padEnd(36)} ${amtStr} | Basis: ${item.basis}`);
  }
  console.log(`\nTotal Shipper Estimate: ${estimateJpy.total.formattedSelected}`);
  console.log(`\nPlain Language Summary (JPY):\n"${estimateJpy.summary}"`);

  console.log("\n================================================================================");
  console.log(">>> [MULTI-ROUTE COST COMPARISON]");
  const comparison = await compareCostsAcrossRoutes(routes, shipment, "EUR", {
    originPort: sourcePort,
    destinationPort,
    options
  });

  console.log(`Evaluated ${comparison.routes.length} candidate routes:`);
  for (const r of comparison.routes) {
    console.log(`  - Route: ${r.routeName}`);
    console.log(`    Carrier Voyage Cost:   $${r.voyageCostUsd?.toLocaleString()} USD`);
    console.log(`    Shipper Total Billing: ${r.formattedShipperCost} (${r.currency})`);
    console.log(`    Cheapest for Carrier?  ${r.isCheapestVoyageCost ? "YES" : "NO"}`);
    console.log(`    Cheapest for Shipper?  ${r.isCheapestForShipper ? "YES" : "NO"}`);
  }
  console.log(`\nComparison Verdict: ${comparison.comparisonSummary}`);
  console.log("================================================================================");
}

runDemo().catch(err => {
  console.error("Demo failed:", err);
  process.exit(1);
});
