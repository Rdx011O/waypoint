const fs = require("fs");
const path = require("path");

const DEFAULT_CHARGES_JSON_PATH = path.resolve(__dirname, "../data/charges.json");
const DEFAULT_CHARGES_CSV_PATH = path.resolve(__dirname, "../data/charges.csv");

const ALLOWED_UNITS = Object.freeze(["TEU", "FEU", "tonne", "cbm"]);

class ChargesError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ChargesError";
    this.code = code;
    this.details = details;
  }
}

function parseCsvCharges(filePath = DEFAULT_CHARGES_CSV_PATH) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    throw new ChargesError(
      "FILE_READ_ERROR",
      `Unable to read charges CSV file at '${filePath}': ${err.message}`,
      { filePath }
    );
  }

  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new ChargesError(
      "FILE_PARSE_ERROR",
      `Charges CSV '${filePath}' must contain a header and at least one data row.`,
      { filePath, linesCount: lines.length }
    );
  }

  const header = lines[0].split(",").map(c => c.trim().toLowerCase());
  const requiredCols = [
    "port_id",
    "port_name",
    "terminal_handling_usd",
    "documentation_fee_usd",
    "security_fee_usd"
  ];

  for (const col of requiredCols) {
    if (!header.includes(col)) {
      throw new ChargesError(
        "FILE_PARSE_ERROR",
        `Charges CSV '${path.basename(filePath)}' is missing required column '${col}'.`,
        { filePath: path.basename(filePath), missingColumn: col }
      );
    }
  }

  const portIdIdx = header.indexOf("port_id");
  const portNameIdx = header.indexOf("port_name");
  const thcIdx = header.indexOf("terminal_handling_usd");
  const docIdx = header.indexOf("documentation_fee_usd");
  const secIdx = header.indexOf("security_fee_usd");

  const ports = {};

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells = rawLine.split(",").map(c => c.trim());
    const lineNum = i + 1;

    const portId = cells[portIdIdx];
    const portName = cells[portNameIdx];
    const thc = Number(cells[thcIdx]);
    const doc = Number(cells[docIdx]);
    const sec = Number(cells[secIdx]);

    if (!portId) {
      throw new ChargesError(
        "FILE_PARSE_ERROR",
        `Line ${lineNum} in '${path.basename(filePath)}': column 'port_id' cannot be empty.`,
        { filePath: path.basename(filePath), line: lineNum, column: "port_id" }
      );
    }

    if (!Number.isFinite(thc) || thc < 0) {
      throw new ChargesError(
        "FILE_PARSE_ERROR",
        `Line ${lineNum} in '${path.basename(filePath)}': column 'terminal_handling_usd' must be a non-negative number, got '${cells[thcIdx]}'.`,
        { filePath: path.basename(filePath), line: lineNum, column: "terminal_handling_usd" }
      );
    }

    if (!Number.isFinite(doc) || doc < 0) {
      throw new ChargesError(
        "FILE_PARSE_ERROR",
        `Line ${lineNum} in '${path.basename(filePath)}': column 'documentation_fee_usd' must be a non-negative number, got '${cells[docIdx]}'.`,
        { filePath: path.basename(filePath), line: lineNum, column: "documentation_fee_usd" }
      );
    }

    if (!Number.isFinite(sec) || sec < 0) {
      throw new ChargesError(
        "FILE_PARSE_ERROR",
        `Line ${lineNum} in '${path.basename(filePath)}': column 'security_fee_usd' must be a non-negative number, got '${cells[secIdx]}'.`,
        { filePath: path.basename(filePath), line: lineNum, column: "security_fee_usd" }
      );
    }

    ports[portId] = {
      portId,
      portName: portName || portId,
      terminalHandlingUsd: thc,
      documentationFeeUsd: doc,
      securityFeeUsd: sec,
      totalPortChargeUsd: thc + doc + sec
    };
  }

  return ports;
}

function loadChargesData(options = {}) {
  const jsonPath = options.jsonPath || DEFAULT_CHARGES_JSON_PATH;
  const csvPath = options.csvPath || DEFAULT_CHARGES_CSV_PATH;

  let baseData = {};
  if (fs.existsSync(jsonPath)) {
    try {
      baseData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    } catch (err) {
      throw new ChargesError(
        "FILE_PARSE_ERROR",
        `Failed to parse charges JSON file '${path.basename(jsonPath)}': ${err.message}`,
        { filePath: path.basename(jsonPath) }
      );
    }
  }

  // Load CSV ports if CSV file exists
  if (fs.existsSync(csvPath)) {
    const csvPorts = parseCsvCharges(csvPath);
    baseData.ports = { ...(baseData.ports || {}), ...csvPorts };
  }

  return {
    _metadata: baseData._metadata || { status: "illustrative_placeholder" },
    ports: baseData.ports || {},
    freightRates: baseData.freightRates || {},
    passageFees: baseData.passageFees || {},
    delayDailyRatesUsd: baseData.delayDailyRatesUsd || {
      TEU: 120,
      FEU: 220,
      tonne: 8,
      cbm: 6,
      default: 150
    }
  };
}

function validateCargoDetails(cargo) {
  if (!cargo || typeof cargo !== "object") {
    throw new ChargesError(
      "MISSING_CARGO_DETAILS",
      "Shipment cargo details object is required (quantity and unit must be specified)."
    );
  }

  const { quantity, unit, cargoValueUsd } = cargo;

  if (quantity === undefined || quantity === null || typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
    throw new ChargesError(
      "INVALID_QUANTITY",
      `Cargo quantity must be a strictly positive finite number; received '${quantity}'.`,
      { quantity }
    );
  }

  if (!unit || typeof unit !== "string") {
    throw new ChargesError(
      "UNKNOWN_UNIT",
      `Cargo unit is required and must be one of: ${ALLOWED_UNITS.join(", ")}.`,
      { unit }
    );
  }

  const normalizedUnit = unit.trim();
  const matchedUnit = ALLOWED_UNITS.find(u => u.toLowerCase() === normalizedUnit.toLowerCase());
  if (!matchedUnit) {
    throw new ChargesError(
      "UNKNOWN_UNIT",
      `Cargo unit '${unit}' is not recognized. Supported units: ${ALLOWED_UNITS.join(", ")}.`,
      { unit, supportedUnits: ALLOWED_UNITS }
    );
  }

  if (cargoValueUsd !== undefined && cargoValueUsd !== null) {
    if (typeof cargoValueUsd !== "number" || !Number.isFinite(cargoValueUsd) || cargoValueUsd < 0) {
      throw new ChargesError(
        "INVALID_CARGO_VALUE",
        `Declared cargo value must be zero or a positive finite number; received '${cargoValueUsd}'.`,
        { cargoValueUsd }
      );
    }
  }

  return {
    cargoType: cargo.cargoType || "General Cargo",
    quantity,
    unit: matchedUnit,
    cargoValueUsd: cargoValueUsd ?? null
  };
}

function findPortInTable(port, portsTable) {
  if (!port) return null;
  const id = port.id ? port.id.toUpperCase() : null;
  const name = port.name ? port.name.toLowerCase() : null;

  if (id && portsTable[id]) {
    return portsTable[id];
  }

  for (const key of Object.keys(portsTable)) {
    const entry = portsTable[key];
    if (entry.portId && entry.portId.toUpperCase() === id) return entry;
    if (entry.portName && name && entry.portName.toLowerCase() === name) return entry;
  }

  return null;
}

function calculateFreightItem({ originPort, destinationPort, cargo, route, chargesData, options = {} }) {
  const originName = originPort?.name || originPort?.id || "";
  const destName = destinationPort?.name || destinationPort?.id || "";
  const corridorKey = `${originName}|${destName}`;
  const reverseCorridorKey = `${destName}|${originName}`;

  const ratesTable = chargesData.freightRates || {};
  const corridorRates = ratesTable[corridorKey] || ratesTable[reverseCorridorKey];

  if (corridorRates && corridorRates[cargo.unit] !== undefined) {
    const ratePerUnit = corridorRates[cargo.unit];
    const amountUsd = cargo.quantity * ratePerUnit;

    return {
      key: "freight",
      label: "Ocean Freight",
      category: "freight",
      status: "estimated",
      amountUsd,
      method: "table_rate",
      basis: `${cargo.quantity} ${cargo.unit} x ${ratePerUnit.toLocaleString("en-US")} USD/${cargo.unit}`,
      assumptions: [
        `Illustrative tariff rate from corridor schedule for ${originName} → ${destName}`,
        "Standard liner term berth-to-berth"
      ],
      confidence: "high"
    };
  }

  // Fallback: Cost-based allocation (voyage cost share + margin)
  const baseVoyageCost = route.estimatedCostUsd || route.baseOperatingCostUsd || 4000;
  const defaultCapacityUnits = options.vesselCapacityUnits || (cargo.unit === "tonne" || cargo.unit === "cbm" ? 5000 : 500);
  const costSharePct = Math.min(1.0, Math.max(0.05, cargo.quantity / defaultCapacityUnits));
  const markupMargin = options.costMarginPct ?? 0.15; // 15% standard margin

  const rawAllocatedFreight = baseVoyageCost * costSharePct * (1 + markupMargin);
  const amountUsd = Math.round(rawAllocatedFreight * 100) / 100;

  return {
    key: "freight",
    label: "Ocean Freight (Cost-Allocated)",
    category: "freight",
    status: "estimated",
    amountUsd,
    method: "cost_based_allocation",
    basis: `Cost-based allocation: ${baseVoyageCost.toLocaleString("en-US")} USD voyage cost x ${(costSharePct * 100).toFixed(1)}% capacity share + ${(markupMargin * 100).toFixed(1)}% carrier operating margin`,
    assumptions: [
      `No published tariff found for ${originName} → ${destName} in unit ${cargo.unit}; derived from internal voyage operating cost`,
      `Assumed vessel capacity basis of ${defaultCapacityUnits} ${cargo.unit}`,
      `Carrier operating margin assumption: ${(markupMargin * 100).toFixed(1)}%`
    ],
    confidence: "low"
  };
}

function calculatePortChargeItem({ port, role, chargesData }) {
  const isOrigin = role === "origin";
  const key = isOrigin ? "origin_port" : "destination_port";
  const label = isOrigin ? `Origin Port (${port?.name || "Origin"})` : `Destination Port (${port?.name || "Destination"})`;

  const portEntry = findPortInTable(port, chargesData.ports);

  if (!portEntry) {
    return {
      item: {
        key,
        label,
        category: "port",
        status: "not_available",
        amountUsd: null,
        basis: `No port tariff schedule found in data for ${port?.name || port?.id || "unspecified port"}`,
        assumptions: ["Port charges tariff missing from configured table"],
        confidence: "low"
      },
      notAvailable: {
        key,
        reason: `Port charges for ${isOrigin ? "origin" : "destination"} port '${port?.name || port?.id}' not found in charges database.`
      }
    };
  }

  const totalUsd = portEntry.totalPortChargeUsd ?? (
    (portEntry.terminalHandlingUsd || 0) +
    (portEntry.documentationFeeUsd || 0) +
    (portEntry.securityFeeUsd || 0)
  );

  return {
    item: {
      key,
      label,
      category: "port",
      status: "estimated",
      amountUsd: totalUsd,
      basis: `${portEntry.portName}: Terminal handling (${portEntry.terminalHandlingUsd} USD) + Documentation (${portEntry.documentationFeeUsd} USD) + Security/Dues (${portEntry.securityFeeUsd} USD)`,
      assumptions: [
        `Standard port authority baseline tariff for ${portEntry.portName}`,
        "Excludes exceptional customs inspection or special equipment surcharges"
      ],
      confidence: "medium"
    },
    notAvailable: null
  };
}

function calculateDelayItem({ delayInput, cargo, chargesData, options = {} }) {
  const key = "delay";
  const label = "Delay Allowance & Demurrage";

  if (!delayInput || delayInput.expectedDelayDays === undefined || delayInput.expectedDelayDays === null) {
    return {
      item: {
        key,
        label,
        category: "delay",
        status: "not_estimated",
        amountUsd: null,
        basis: "No delay forecast or risk-based disruption estimate provided for this route",
        assumptions: ["Delay assessment requires live weather or route hazard evaluation from Member 4"],
        confidence: "low"
      },
      notAvailable: {
        key,
        reason: "No delay data provided by hazard or rerouting model."
      }
    };
  }

  const delayDays = Number(delayInput.expectedDelayDays);
  if (!Number.isFinite(delayDays) || delayDays < 0) {
    throw new ChargesError(
      "INVALID_DELAY_DAYS",
      `Delay days must be zero or a positive finite number; received '${delayInput.expectedDelayDays}'.`,
      { delayDays: delayInput.expectedDelayDays }
    );
  }

  const dailyRateTable = chargesData.delayDailyRatesUsd || {};
  const dailyRateUsd = options.delayDailyRateUsd ?? (dailyRateTable[cargo.unit] || dailyRateTable.default || 150);

  const multiplier = (cargo.unit === "TEU" || cargo.unit === "FEU") ? cargo.quantity : 1;
  const rawAmountUsd = delayDays * dailyRateUsd * multiplier;
  const amountUsd = Math.round(rawAmountUsd * 100) / 100;

  const sourceStr = delayInput.source ? String(delayInput.source) : "simulated";
  const confidence = delayInput.confidence || "medium";

  return {
    item: {
      key,
      label,
      category: "delay",
      status: "estimated",
      amountUsd,
      basis: `${delayDays} expected delay day(s) x ${dailyRateUsd} USD/day${multiplier > 1 ? ` across ${multiplier} container(s)` : ""}`,
      assumptions: [
        `Daily detention/demurrage allowance: ${dailyRateUsd} USD/day`,
        `Disruption data source: ${sourceStr}`,
        `Disruption confidence level: ${confidence}`
      ],
      confidence,
      delayDaysAssumed: delayDays,
      dailyRateUsedUsd: dailyRateUsd,
      source: sourceStr
    },
    notAvailable: null
  };
}

function calculatePassageItems({ route, chargesData, options = {} }) {
  if (options.includePassageFees === false) {
    return { items: [], notAvailableList: [] };
  }

  const passages = route.passages || route.via || [];
  const passageTable = chargesData.passageFees || {};
  const items = [];
  const notAvailableList = [];

  for (const passageName of passages) {
    // Only process waterways that are known canals, straits, or passages
    const isWaterwayOfInterest = /canal|strait|passage|gulf|corridor/i.test(passageName);
    if (!isWaterwayOfInterest) continue;

    const matchedKey = Object.keys(passageTable).find(
      k => k.toLowerCase() === passageName.toLowerCase()
    );

    if (matchedKey) {
      const entry = passageTable[matchedKey];
      items.push({
        key: `passage_${matchedKey.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        label: `Passage Fee (${matchedKey})`,
        category: "other",
        status: "estimated",
        amountUsd: entry.feeUsd,
        basis: `${entry.feeUsd.toLocaleString("en-US")} USD transit charge for ${matchedKey}`,
        assumptions: [entry.notes || "Standard canal / strait transit toll"],
        confidence: "medium"
      });
    } else {
      const pKey = `passage_${passageName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      notAvailableList.push({
        key: pKey,
        reason: `Passage toll schedule for '${passageName}' is not available in fee database.`
      });
      items.push({
        key: pKey,
        label: `Passage Fee (${passageName})`,
        category: "other",
        status: "not_available",
        amountUsd: null,
        basis: `Passage fee schedule for '${passageName}' not configured in tariff table`,
        assumptions: ["Known transit corridor without configured toll schedule; not fabricated"],
        confidence: "low"
      });
    }
  }

  return { items, notAvailableList };
}

function calculateFuelSurchargeItem({ baseFreightUsd, options = {} }) {
  if (!options.includeFuelSurcharge) return null;

  const ratePct = options.fuelSurchargeRatePct ?? 0.05; // 5% default BAF
  const amountUsd = Math.round(baseFreightUsd * ratePct * 100) / 100;

  return {
    key: "fuel_surcharge",
    label: "Bunker Adjustment Factor (BAF)",
    category: "other",
    status: "estimated",
    amountUsd,
    basis: `${(ratePct * 100).toFixed(1)}% bunker adjustment surcharge on ocean freight (${baseFreightUsd.toLocaleString("en-US")} USD)`,
    assumptions: ["Fluctuating marine gas oil (MGO/VLSFO) bunker index adjustment"],
    confidence: "medium"
  };
}

function calculateInsuranceItem({ cargo, options = {} }) {
  if (!options.includeInsurance) return { item: null, notAvailable: null };

  const key = "insurance";
  const label = "Cargo Insurance (Estimated)";

  if (cargo.cargoValueUsd === undefined || cargo.cargoValueUsd === null) {
    return {
      item: {
        key,
        label,
        category: "other",
        status: "not_available",
        amountUsd: null,
        basis: "Insurance enabled in options, but cargoValueUsd was not declared by shipper",
        assumptions: ["Requires cargoValueUsd to compute ad-valorem marine cargo risk coverage"],
        confidence: "low"
      },
      notAvailable: {
        key,
        reason: "Insurance estimate requested but declared cargo value (cargoValueUsd) is missing."
      }
    };
  }

  const insuranceRatePct = options.insuranceRatePct ?? 0.0035; // 0.35% default
  const amountUsd = Math.round(cargo.cargoValueUsd * insuranceRatePct * 100) / 100;

  return {
    item: {
      key,
      label,
      category: "other",
      status: "estimated",
      amountUsd,
      basis: `${(insuranceRatePct * 100).toFixed(2)}% of declared cargo value (${cargo.cargoValueUsd.toLocaleString("en-US")} USD)`,
      assumptions: ["Standard Institute Cargo Clauses (A) all-risks baseline estimate"],
      confidence: "medium"
    },
    notAvailable: null
  };
}

module.exports = {
  ALLOWED_UNITS,
  ChargesError,
  parseCsvCharges,
  loadChargesData,
  validateCargoDetails,
  calculateFreightItem,
  calculatePortChargeItem,
  calculateDelayItem,
  calculatePassageItems,
  calculateFuelSurchargeItem,
  calculateInsuranceItem
};
