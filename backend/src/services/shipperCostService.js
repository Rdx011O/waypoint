const {
  BASE_CURRENCY,
  DEFAULT_SUPPORTED_CURRENCIES,
  CurrencyError,
  roundToCurrency,
  formatCurrency,
  getExchangeRate
} = require("./currencyService");

const {
  ChargesError,
  loadChargesData,
  validateCargoDetails,
  calculateFreightItem,
  calculatePortChargeItem,
  calculateDelayItem,
  calculatePassageItems,
  calculateFuelSurchargeItem,
  calculateInsuranceItem
} = require("./chargesService");

const DISCLAIMER_TEXT =
  "ESTIMATE ONLY — NOT A BINDING CARRIER QUOTE. Actual maritime freight rates, terminal tariffs, canal tolls, demurrage allowances, and currency conversion settlements are subject to commercial carrier contract terms, fuel volatility, and port authority updates.";

const MID_MARKET_NOTE =
  "Foreign exchange rates reflect mid-market reference rates (e.g. European Central Bank) and do not include commercial bank or carrier transaction spreads unless explicitly configured.";

class ShipperCostError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ShipperCostError";
    this.code = code;
    this.details = details;
  }
}

function generateSummaryString(total, subtotals, notAvailable, selectedCurrency) {
  const parts = [];

  // Total clause
  const totalPart = `Estimated total ${formatCurrency(total.amountSelected, selectedCurrency)}`;

  // Subtotals clause
  const subParts = [];
  if (subtotals.freight > 0) {
    subParts.push(`freight ${formatCurrency(subtotals.freight, selectedCurrency)}`);
  }
  if (subtotals.port > 0) {
    subParts.push(`port ${formatCurrency(subtotals.port, selectedCurrency)}`);
  }
  if (subtotals.delay > 0) {
    subParts.push(`delay allowance ${formatCurrency(subtotals.delay, selectedCurrency)}`);
  }
  if (subtotals.other > 0) {
    subParts.push(`other fees ${formatCurrency(subtotals.other, selectedCurrency)}`);
  }

  const breakdownPart = subParts.length > 0 ? `: ${subParts.join(", ")}.` : ".";

  // Exclusions clause
  let excludedPart = "";
  if (notAvailable && notAvailable.length > 0) {
    const excludedLabels = notAvailable.map(item => {
      if (item.key === "delay") return "Delay allowance";
      if (item.key === "insurance") return "Insurance";
      if (item.key.startsWith("origin_port")) return "Origin port charges";
      if (item.key.startsWith("destination_port")) return "Destination port charges";
      if (item.key.startsWith("passage_")) return "Canal/passage toll";
      return item.key.replace(/_/g, " ");
    });

    // Remove duplicates
    const uniqueLabels = [...new Set(excludedLabels)];
    if (uniqueLabels.length === 1) {
      excludedPart = ` ${uniqueLabels[0]} not included.`;
    } else if (uniqueLabels.length > 1) {
      const allButLast = uniqueLabels.slice(0, -1).join(", ");
      const last = uniqueLabels[uniqueLabels.length - 1];
      excludedPart = ` ${allButLast} and ${last} not included.`;
    }
  } else {
    excludedPart = " All standard cost components included.";
  }

  return `${totalPart}${breakdownPart}${excludedPart}`;
}

async function calculateShipperCost({
  route,
  shipment,
  originPort,
  destinationPort,
  selectedCurrency = BASE_CURRENCY,
  options = {}
}) {
  if (!route || typeof route !== "object") {
    throw new ShipperCostError("INVALID_ROUTE", "A valid route object is required for cost estimation.");
  }

  const cargo = validateCargoDetails(shipment);

  const effOrigin = originPort || shipment.originPort || (route.source ? { name: route.source } : null);
  const effDest = destinationPort || shipment.destinationPort || (route.destination ? { name: route.destination } : null);

  const chargesData = options.chargesData || loadChargesData(options);

  // Retrieve currency conversion rate
  const currencyInfo = await getExchangeRate(selectedCurrency, {
    base: BASE_CURRENCY,
    provider: options.rateProvider,
    ttlMs: options.cacheTtlMs,
    forceRefresh: options.forceRefreshRates,
    spreadMargin: options.conversionSpread || 0,
    supportedCurrencies: options.supportedCurrencies || DEFAULT_SUPPORTED_CURRENCIES
  });

  const rate = currencyInfo.rate;
  const spreadMargin = options.conversionSpread || 0;

  const rawLineItems = [];
  const notAvailable = [];

  // 1. Ocean Freight
  const freightItem = calculateFreightItem({
    originPort: effOrigin,
    destinationPort: effDest,
    cargo,
    route,
    chargesData,
    options
  });
  rawLineItems.push(freightItem);

  // 2. Origin Port Charge
  const originPortRes = calculatePortChargeItem({
    port: effOrigin,
    role: "origin",
    chargesData
  });
  rawLineItems.push(originPortRes.item);
  if (originPortRes.notAvailable) notAvailable.push(originPortRes.notAvailable);

  // 3. Destination Port Charge
  const destPortRes = calculatePortChargeItem({
    port: effDest,
    role: "destination",
    chargesData
  });
  rawLineItems.push(destPortRes.item);
  if (destPortRes.notAvailable) notAvailable.push(destPortRes.notAvailable);

  // 4. Passage / Canal Fees
  const passageRes = calculatePassageItems({
    route,
    chargesData,
    options
  });
  if (passageRes.items.length > 0) {
    rawLineItems.push(...passageRes.items);
  }
  if (passageRes.notAvailableList.length > 0) {
    notAvailable.push(...passageRes.notAvailableList);
  }

  // 5. Fuel Surcharge (Optional)
  if (options.includeFuelSurcharge) {
    const fuelItem = calculateFuelSurchargeItem({
      baseFreightUsd: freightItem.amountUsd || 0,
      options
    });
    if (fuelItem) rawLineItems.push(fuelItem);
  }

  // 6. Delay Allowance
  const delayInput = options.delayInput || route.delay || null;
  const delayRes = calculateDelayItem({
    delayInput,
    cargo,
    chargesData,
    options
  });
  rawLineItems.push(delayRes.item);
  if (delayRes.notAvailable) notAvailable.push(delayRes.notAvailable);

  // 7. Cargo Insurance (Optional)
  if (options.includeInsurance) {
    const insRes = calculateInsuranceItem({ cargo, options });
    if (insRes.item) {
      rawLineItems.push(insRes.item);
    }
    if (insRes.notAvailable) notAvailable.push(insRes.notAvailable);
  }

  // 8. Conversion Spread (if nonzero)
  let spreadItem = null;
  if (spreadMargin > 0) {
    const preSpreadTotalUsd = rawLineItems
      .filter(i => i.status === "estimated" && typeof i.amountUsd === "number")
      .reduce((sum, i) => sum + i.amountUsd, 0);

    const spreadAmountUsd = Math.round(preSpreadTotalUsd * spreadMargin * 100) / 100;

    spreadItem = {
      key: "conversion_spread",
      label: "Currency Conversion Margin",
      category: "other",
      status: "estimated",
      amountUsd: spreadAmountUsd,
      basis: `${(spreadMargin * 100).toFixed(2)}% margin applied to estimated total (${preSpreadTotalUsd.toLocaleString("en-US")} USD)`,
      assumptions: [
        "Commercial FX exchange buffer covering institutional card, bank, or payment settlement fees"
      ],
      confidence: "high"
    };
    rawLineItems.push(spreadItem);
  }

  // Presentation Layer Conversion & Rounding
  // Compute line items in selected currency
  const convertedLineItems = rawLineItems.map(item => {
    if (item.status !== "estimated" || item.amountUsd === null) {
      return {
        ...item,
        amountUsd: null,
        amountSelected: null,
        formattedSelected: "N/A"
      };
    }

    const rawSelected = item.amountUsd * rate;
    const amountSelected = roundToCurrency(rawSelected, selectedCurrency);
    const formattedSelected = formatCurrency(amountSelected, selectedCurrency);

    return {
      ...item,
      amountUsd: item.amountUsd,
      amountSelected,
      formattedSelected
    };
  });

  // Category subtotals in selected currency (sum of rounded line items in each category)
  const subtotals = {
    freight: 0,
    port: 0,
    delay: 0,
    other: 0
  };

  for (const item of convertedLineItems) {
    if (item.status === "estimated" && typeof item.amountSelected === "number") {
      const cat = subtotals[item.category] !== undefined ? item.category : "other";
      subtotals[cat] = roundToCurrency(subtotals[cat] + item.amountSelected, selectedCurrency);
    }
  }

  // Total is calculated directly as the sum of all rounded estimated line items.
  // This guarantees that line items sum exactly to the displayed total in every currency!
  const totalAmountSelected = roundToCurrency(
    convertedLineItems
      .filter(i => i.status === "estimated" && typeof i.amountSelected === "number")
      .reduce((acc, i) => acc + i.amountSelected, 0),
    selectedCurrency
  );

  const totalAmountUsd = roundToCurrency(
    convertedLineItems
      .filter(i => i.status === "estimated" && typeof i.amountUsd === "number")
      .reduce((acc, i) => acc + i.amountUsd, 0),
    BASE_CURRENCY
  );

  const includesOnly = convertedLineItems
    .filter(i => i.status === "estimated")
    .map(i => i.key);

  const excludes = convertedLineItems
    .filter(i => i.status !== "estimated")
    .map(i => i.key);

  const total = {
    amountUsd: totalAmountUsd,
    amountSelected: totalAmountSelected,
    formattedSelected: formatCurrency(totalAmountSelected, selectedCurrency),
    includesOnly,
    excludes
  };

  // Plausible Range Calculation (if delay or risk factor creates plausible spread)
  let range = null;
  const delayItem = convertedLineItems.find(i => i.key === "delay");
  if (delayItem && delayItem.status === "estimated" && delayItem.delayDaysAssumed > 0) {
    const delayAmount = delayItem.amountSelected;
    const baseWithoutDelay = totalAmountSelected - delayAmount;
    // Low range: on-schedule (zero delay); High range: expected delay + 50% disruption buffer
    const low = roundToCurrency(baseWithoutDelay, selectedCurrency);
    const high = roundToCurrency(baseWithoutDelay + delayAmount * 1.5, selectedCurrency);
    range = { low, high };
  } else if (route.riskLevel === "High" || (route.riskScore && route.riskScore > 500)) {
    // Risk score plausible contingency buffer: +/- 10%
    const low = roundToCurrency(totalAmountSelected * 0.95, selectedCurrency);
    const high = roundToCurrency(totalAmountSelected * 1.15, selectedCurrency);
    range = { low, high };
  }

  // Summary generation
  const summary = generateSummaryString(total, subtotals, notAvailable, selectedCurrency);

  // Notes
  const notes = [
    MID_MARKET_NOTE,
    `Converted from ${BASE_CURRENCY} at reference rate 1 ${BASE_CURRENCY} = ${rate} ${selectedCurrency} (${currencyInfo.rateSource}, dated ${currencyInfo.rateDate}).`,
    chargesData._metadata?.disclaimer || "Rates are based on baseline illustrative tariffs."
  ];

  if (spreadMargin > 0) {
    notes.push(`Includes a configurable conversion margin of ${(spreadMargin * 100).toFixed(2)}%.`);
  }

  return {
    shipmentRef: shipment.shipmentRef || `SHP-${Date.now().toString(36).toUpperCase()}`,
    routeId: route.id,
    generatedAt: new Date().toISOString(),
    currency: {
      selected: selectedCurrency,
      base: BASE_CURRENCY,
      rate,
      rateDate: currencyInfo.rateDate,
      rateSource: currencyInfo.rateSource,
      spreadApplied: spreadMargin
    },
    lineItems: convertedLineItems,
    subtotals,
    total,
    range,
    notAvailable,
    summary,
    notes,
    disclaimer: DISCLAIMER_TEXT
  };
}

async function compareCostsAcrossRoutes(routes, shipment, selectedCurrency = BASE_CURRENCY, options = {}) {
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new ShipperCostError("INVALID_ROUTES", "Routes must be a non-empty array.");
  }

  const evaluatedRoutes = [];

  for (const route of routes) {
    const estimate = await calculateShipperCost({
      route,
      shipment,
      originPort: options.originPort,
      destinationPort: options.destinationPort,
      selectedCurrency,
      options
    });

    const voyageCostUsd = route.estimatedCostUsd ?? route.baseOperatingCostUsd ?? null;

    evaluatedRoutes.push({
      routeId: route.id,
      routeName: route.name || route.id,
      voyageCostUsd,
      shipperCostUsd: estimate.total.amountUsd,
      shipperCostSelected: estimate.total.amountSelected,
      formattedShipperCost: estimate.total.formattedSelected,
      currency: selectedCurrency,
      estimate
    });
  }

  // Identify cheapest for shipper
  let cheapestShipperRoute = evaluatedRoutes[0];
  for (const item of evaluatedRoutes) {
    if (item.shipperCostSelected < cheapestShipperRoute.shipperCostSelected) {
      cheapestShipperRoute = item;
    }
  }

  // Identify cheapest voyage cost
  let cheapestVoyageRoute = evaluatedRoutes[0];
  for (const item of evaluatedRoutes) {
    if (item.voyageCostUsd !== null && (cheapestVoyageRoute.voyageCostUsd === null || item.voyageCostUsd < cheapestVoyageRoute.voyageCostUsd)) {
      cheapestVoyageRoute = item;
    }
  }

  const cheapestShipperDiffersFromVoyageCost = cheapestShipperRoute.routeId !== cheapestVoyageRoute.routeId;

  return {
    routes: evaluatedRoutes.map(item => ({
      ...item,
      isCheapestForShipper: item.routeId === cheapestShipperRoute.routeId,
      isCheapestVoyageCost: item.routeId === cheapestVoyageRoute.routeId
    })),
    cheapestShipperRouteId: cheapestShipperRoute.routeId,
    cheapestVoyageRouteId: cheapestVoyageRoute.routeId,
    cheapestShipperDiffersFromVoyageCost,
    comparisonSummary: cheapestShipperDiffersFromVoyageCost
      ? `Route '${cheapestShipperRoute.routeName}' is cheapest for the shipper (${cheapestShipperRoute.formattedShipperCost}), differing from the lowest voyage operating cost ('${cheapestVoyageRoute.routeName}').`
      : `Route '${cheapestShipperRoute.routeName}' is both the lowest voyage cost and the lowest shipper cost.`
  };
}

module.exports = {
  ShipperCostError,
  calculateShipperCost,
  compareCostsAcrossRoutes,
  generateSummaryString,
  DISCLAIMER_TEXT,
  MID_MARKET_NOTE
};
