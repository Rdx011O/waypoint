'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const { RouteError, validateCoordinate } = require('../utils/distance');
const { calculateVoyageCostAndEta } = require('../utils/costCalculator');
const { findSeaRouteCandidates } = require('./routeEngine');
const { rankAndRecommendRoutes, validateWeights } = require('./routeRanking');

const DISCLAIMER_TEXT =
  'Estimates only. Figures are generated for strategic route comparison and decision support; they do not constitute certified freight quotes, bunker purchase commitments, or official navigational passage plans.';

/**
 * Parses a CSV file safely and validates required columns.
 *
 * @param {string} filePath
 * @param {Array<string>} requiredColumns
 * @returns {Array<object>}
 */
function loadAndValidateCsv(filePath, requiredColumns = []) {
  if (!fs.existsSync(filePath)) {
    throw new RouteError(`Data file not found: ${filePath}`, 'FILE_NOT_FOUND');
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let records;
  try {
    records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      comment: '#',
    });
  } catch (err) {
    throw new RouteError(
      `Failed to parse CSV file ${path.basename(filePath)}: ${err.message}`,
      'CSV_PARSE_ERROR'
    );
  }

  if (records.length === 0) {
    throw new RouteError(`CSV file ${path.basename(filePath)} contains no data rows`, 'EMPTY_CSV');
  }

  const headers = Object.keys(records[0]);
  for (const col of requiredColumns) {
    if (!headers.includes(col)) {
      throw new RouteError(
        `Missing required column '${col}' in ${path.basename(filePath)}. Present columns: ${headers.join(', ')}`,
        'MISSING_CSV_COLUMN'
      );
    }
  }

  return records;
}

/**
 * Loads default cost and ranking assumptions from cost_assumptions.csv.
 *
 * @param {string} filePath
 * @returns {object}
 */
function loadCostAssumptions(filePath) {
  const records = loadAndValidateCsv(filePath, ['parameter', 'value']);
  const assumptions = {};

  for (const row of records) {
    const val = Number(row.value);
    assumptions[row.parameter] = Number.isFinite(val) ? val : row.value;
  }

  return assumptions;
}

/**
 * Rounds a number to a fixed number of decimal places, keeping it numeric.
 *
 * @param {number|null} num
 * @param {number} decimals
 * @returns {number|null}
 */
function roundNumeric(num, decimals = 2) {
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return null;
  }
  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}

/**
 * Evaluates risk score and prohibition status for a given route using the supplied provider.
 *
 * Accepted provider formats:
 * 1. Async/sync callback: fn({ routeId, waypoints, passages, distanceNm, variant }) -> { riskScore, prohibited, reasons }
 * 2. Keyed map or plain object: { [routeId]: { riskScore, prohibited, reasons } }
 *
 * @param {object} routeParam
 * @param {any} riskProvider
 * @returns {Promise<{ riskScore: number|null, prohibited: boolean, reasons: Array<string>, riskKnown: boolean }>}
 */
async function evaluateRisk(routeParam, riskProvider) {
  if (!riskProvider) {
    return {
      riskScore: null,
      prohibited: false,
      reasons: [],
      riskKnown: false,
    };
  }

  let riskResult;
  try {
    if (typeof riskProvider === 'function') {
      riskResult = await riskProvider(routeParam);
    } else if (typeof riskProvider.get === 'function') {
      riskResult = riskProvider.get(routeParam.routeId) || riskProvider.get(routeParam.variant);
    } else if (typeof riskProvider === 'object') {
      riskResult = riskProvider[routeParam.routeId] || riskProvider[routeParam.variant];
    }
  } catch (err) {
    // If external risk provider errors, treat risk as unknown rather than crashing route comparison
    return {
      riskScore: null,
      prohibited: false,
      reasons: [`Risk provider error: ${err.message}`],
      riskKnown: false,
    };
  }

  if (!riskResult || typeof riskResult !== 'object') {
    return {
      riskScore: null,
      prohibited: false,
      reasons: [],
      riskKnown: false,
    };
  }

  const rawScore = riskResult.riskScore;
  const isNumericRisk = typeof rawScore === 'number' && Number.isFinite(rawScore);

  return {
    riskScore: isNumericRisk ? rawScore : null,
    prohibited: Boolean(riskResult.prohibited),
    reasons: Array.isArray(riskResult.reasons) ? riskResult.reasons : [],
    riskKnown: isNumericRisk,
  };
}

/**
 * Low-level pure route comparison service.
 * Accepts already loaded/validated in-memory port and vessel objects so Member 5
 * can inject Member 2's data structures directly without hitting CSVs on disk.
 *
 * @param {object} params
 * @param {object} params.originPort - { portId, name, coordinates: [lon, lat], latitude, longitude }
 * @param {object} params.destinationPort - { portId, name, coordinates: [lon, lat], latitude, longitude }
 * @param {object} params.vessel - { vesselId, name, speedKnots, fuelConsumptionTonnesPerDay, draftMeters, dailyOperatingCostUsd }
 * @param {object} [params.costAssumptions={}] - Bunker price, buffer, port charges, tolerance
 * @param {object} [params.options={}] - Execution options
 * @returns {Promise<object>} Standardized comparison payload conforming to output contract
 */
async function compareRoutes({
  originPort,
  destinationPort,
  vessel,
  costAssumptions = {},
  options = {},
}) {
  if (!originPort || typeof originPort !== 'object') {
    throw new RouteError('Origin port object is required', 'INVALID_PORT');
  }
  if (!destinationPort || typeof destinationPort !== 'object') {
    throw new RouteError('Destination port object is required', 'INVALID_PORT');
  }
  if (!vessel || typeof vessel !== 'object') {
    throw new RouteError('Vessel object is required', 'INVALID_VESSEL');
  }

  // Resolve coordinates [lon, lat]
  const originCoord = originPort.coordinates || [
    Number(originPort.longitude ?? originPort.lon),
    Number(originPort.latitude ?? originPort.lat),
  ];
  const destCoord = destinationPort.coordinates || [
    Number(destinationPort.longitude ?? destinationPort.lon),
    Number(destinationPort.latitude ?? destinationPort.lat),
  ];

  validateCoordinate(originCoord, 'origin port coordinate');
  validateCoordinate(destCoord, 'destination port coordinate');

  // Operational cost parameters (options override costAssumptions defaults)
  const fuelPriceUsdPerTonne = Number(
    options.fuelPriceUsdPerTonne !== undefined
      ? options.fuelPriceUsdPerTonne
      : costAssumptions.fuel_price_usd_per_tonne ?? 650
  );
  const idleFuelTonnesPerDay = Number(
    options.idleFuelTonnesPerDay !== undefined
      ? options.idleFuelTonnesPerDay
      : costAssumptions.idle_fuel_tonnes_per_day ?? 3.0
  );
  const bufferHours = Number(
    options.bufferHours !== undefined
      ? options.bufferHours
      : costAssumptions.default_buffer_hours ?? 24
  );
  const portChargesUsd = Number(
    options.portChargesUsd !== undefined
      ? options.portChargesUsd
      : costAssumptions.default_port_charges_usd ?? 15000
  );
  const distanceToleranceRatio = Number(
    options.distanceToleranceRatio !== undefined
      ? options.distanceToleranceRatio
      : costAssumptions.distance_tolerance_ratio ?? 0.05
  );

  const costParams = {
    fuelPriceUsdPerTonne,
    idleFuelTonnesPerDay,
    bufferHours,
    portChargesUsd,
  };

  // Find candidate sea routes
  const engineResult = findSeaRouteCandidates({
    originCoord,
    destinationCoord: destCoord,
    vessel: {
      speedKnots: vessel.speedKnots,
      draftMeters: vessel.draftMeters,
    },
    options: {
      maxRoutes: options.maxRoutes,
      distanceToleranceRatio,
      _engineFn: options._engineFn,
    },
  });

  // Evaluate each candidate: cost + ETA + risk provider
  const evaluatedCandidates = [];
  for (let i = 0; i < engineResult.candidates.length; i++) {
    const cand = engineResult.candidates[i];
    const routeId = `route-${i + 1}`;

    const costBreakdown = calculateVoyageCostAndEta({
      distanceNm: cand.distanceNm,
      vessel: {
        speedKnots: vessel.speedKnots,
        fuelConsumptionTonnesPerDay: vessel.fuelConsumptionTonnesPerDay,
        dailyOperatingCostUsd: vessel.dailyOperatingCostUsd || 0,
      },
      costParams,
    });

    const routeParam = {
      routeId,
      variant: cand.variant,
      waypoints: cand.waypoints,
      passages: cand.passages,
      distanceNm: cand.distanceNm,
      sailingHours: costBreakdown.sailingHours,
    };

    const risk = await evaluateRisk(routeParam, options.riskProvider);

    evaluatedCandidates.push({
      routeId,
      variant: cand.variant,
      distanceNm: cand.distanceNm,
      engineDistanceNm: cand.engineDistanceNm,
      waypointDistanceNm: cand.waypointDistanceNm,
      sailingHours: costBreakdown.sailingHours,
      sailingDays: costBreakdown.sailingDays,
      totalDays: costBreakdown.totalDays,
      fuelTonnes: costBreakdown.fuelTonnes,
      fuelCostUsd: costBreakdown.fuelCostUsd,
      operatingCostUsd: costBreakdown.operatingCostUsd,
      portChargesUsd: costBreakdown.portChargesUsd,
      totalCostUsd: costBreakdown.totalCostUsd,
      riskScore: risk.riskScore,
      riskKnown: risk.riskKnown,
      prohibited: risk.prohibited,
      reasons: risk.reasons,
      passages: cand.passages,
      waypoints: cand.waypoints,
      warnings: [...cand.warnings],
    });
  }

  // Ranking weights (options override costAssumptions defaults)
  const rankingWeights = validateWeights({
    cost: options.weights?.cost !== undefined ? options.weights.cost : costAssumptions.weight_cost ?? 0.40,
    time: options.weights?.time !== undefined ? options.weights.time : costAssumptions.weight_time ?? 0.35,
    risk: options.weights?.risk !== undefined ? options.weights.risk : costAssumptions.weight_risk ?? 0.25,
  });

  // Rank eligible routes and generate recommendation
  const rankingResult = rankAndRecommendRoutes({
    candidates: evaluatedCandidates,
    weights: rankingWeights,
  });

  // Format and round final output contract numbers (no strings, raw numerics)
  const formattedRoutes = rankingResult.routes.map((r) => ({
    routeId: r.routeId,
    rank: r.rank,
    recommended: r.recommended,
    distanceNm: roundNumeric(r.distanceNm, 1),
    engineDistanceNm: roundNumeric(r.engineDistanceNm, 1),
    sailingHours: roundNumeric(r.sailingHours, 1),
    sailingDays: roundNumeric(r.sailingDays, 2),
    totalDays: roundNumeric(r.totalDays, 2),
    fuelTonnes: roundNumeric(r.fuelTonnes, 2),
    fuelCostUsd: roundNumeric(r.fuelCostUsd, 2),
    operatingCostUsd: roundNumeric(r.operatingCostUsd, 2),
    portChargesUsd: roundNumeric(r.portChargesUsd, 2),
    totalCostUsd: roundNumeric(r.totalCostUsd, 2),
    riskScore: roundNumeric(r.riskScore, 1),
    riskKnown: r.riskKnown,
    scores: {
      cost: roundNumeric(r.scores.cost, 1),
      time: roundNumeric(r.scores.time, 1),
      risk: roundNumeric(r.scores.risk, 1),
      total: roundNumeric(r.scores.total, 1),
    },
    passages: r.passages,
    waypoints: r.waypoints,
    warnings: r.warnings,
  }));

  const formattedExcludedRoutes = rankingResult.excludedRoutes.map((ex) => ({
    routeId: ex.routeId,
    reasons: ex.reasons,
  }));

  const metaNotes = [...engineResult.meta.notes, ...rankingResult.meta.notes];

  return {
    origin: {
      portId: originPort.portId || originPort.id || 'ORIGIN',
      name: originPort.name || 'Origin Port',
      coordinates: originCoord,
    },
    destination: {
      portId: destinationPort.portId || destinationPort.id || 'DESTINATION',
      name: destinationPort.name || 'Destination Port',
      coordinates: destCoord,
    },
    vesselId: vessel.vesselId || vessel.id || 'UNKNOWN_VESSEL',
    generatedAt: new Date().toISOString(),
    routes: formattedRoutes,
    excludedRoutes: formattedExcludedRoutes,
    recommendation: rankingResult.recommendation,
    meta: {
      candidateCount: rankingResult.meta.candidateCount,
      weightsUsed: rankingWeights,
      assumptions: {
        fuelPriceUsdPerTonne,
        idleFuelTonnesPerDay,
        bufferHours,
        portChargesUsd,
        distanceToleranceRatio,
        vesselSpeedKnots: vessel.speedKnots,
        vesselFuelTonnesPerDay: vessel.fuelConsumptionTonnesPerDay,
        vesselDraftMeters: vessel.draftMeters,
      },
      notes: metaNotes,
      disclaimer: DISCLAIMER_TEXT,
    },
  };
}

/**
 * Primary public API entry point: getRouteComparison.
 * Resolves port and vessel IDs from CSV data files (or custom directory),
 * loads default cost assumptions, and executes route comparison.
 *
 * @param {object} params
 * @param {string} params.originPortId - Origin port identifier (e.g. 'BOM')
 * @param {string} params.destinationPortId - Destination port identifier (e.g. 'SIN')
 * @param {string} params.vesselId - Vessel identifier (e.g. 'VESSEL_01')
 * @param {object} [params.options={}] - Operational options & overrides
 * @param {string} [params.dataDir] - Optional directory containing CSV data files
 * @returns {Promise<object>} Standardized comparison payload conforming to output contract
 */
async function getRouteComparison({
  originPortId,
  destinationPortId,
  vesselId,
  options = {},
  dataDir,
}) {
  if (!originPortId) {
    throw new RouteError('Origin port ID is required', 'MISSING_PORT_ID');
  }
  if (!destinationPortId) {
    throw new RouteError('Destination port ID is required', 'MISSING_PORT_ID');
  }
  if (!vesselId) {
    throw new RouteError('Vessel ID is required', 'MISSING_VESSEL_ID');
  }

  const baseDir = dataDir || path.resolve(__dirname, '../data');
  const portsCsvPath = path.join(baseDir, 'ports.csv');
  const vesselsCsvPath = path.join(baseDir, 'vessels.csv');
  const assumptionsCsvPath = path.join(baseDir, 'cost_assumptions.csv');

  // Load CSV data
  const portsData = loadAndValidateCsv(portsCsvPath, ['port_id', 'name', 'latitude', 'longitude']);
  const vesselsData = loadAndValidateCsv(vesselsCsvPath, [
    'vessel_id',
    'name',
    'speed_knots',
    'fuel_consumption_tonnes_per_day',
  ]);
  const costAssumptions = loadCostAssumptions(assumptionsCsvPath);

  // Find requested ports
  const originPortRow = portsData.find(
    (p) => String(p.port_id).trim().toUpperCase() === String(originPortId).trim().toUpperCase()
  );
  if (!originPortRow) {
    throw new RouteError(`Unknown origin port '${originPortId}'`, 'UNKNOWN_PORT');
  }

  const destPortRow = portsData.find(
    (p) => String(p.port_id).trim().toUpperCase() === String(destinationPortId).trim().toUpperCase()
  );
  if (!destPortRow) {
    throw new RouteError(`Unknown destination port '${destinationPortId}'`, 'UNKNOWN_PORT');
  }

  // Find requested vessel
  const vesselRow = vesselsData.find(
    (v) => String(v.vessel_id).trim().toUpperCase() === String(vesselId).trim().toUpperCase()
  );
  if (!vesselRow) {
    throw new RouteError(`Unknown vessel '${vesselId}'`, 'UNKNOWN_VESSEL');
  }

  const originPort = {
    portId: originPortRow.port_id,
    name: originPortRow.name,
    unlocode: originPortRow.unlocode,
    coordinates: [Number(originPortRow.longitude), Number(originPortRow.latitude)],
  };

  const destinationPort = {
    portId: destPortRow.port_id,
    name: destPortRow.name,
    unlocode: destPortRow.unlocode,
    coordinates: [Number(destPortRow.longitude), Number(destPortRow.latitude)],
  };

  const vessel = {
    vesselId: vesselRow.vessel_id,
    name: vesselRow.name,
    speedKnots: Number(vesselRow.speed_knots),
    fuelConsumptionTonnesPerDay: Number(vesselRow.fuel_consumption_tonnes_per_day),
    draftMeters: vesselRow.draft_meters ? Number(vesselRow.draft_meters) : undefined,
    dailyOperatingCostUsd: vesselRow.daily_operating_cost_usd
      ? Number(vesselRow.daily_operating_cost_usd)
      : 0,
  };

  return compareRoutes({
    originPort,
    destinationPort,
    vessel,
    costAssumptions,
    options,
  });
}

module.exports = {
  getRouteComparison,
  compareRoutes,
  loadAndValidateCsv,
  loadCostAssumptions,
  DISCLAIMER_TEXT,
};
