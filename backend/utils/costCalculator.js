'use strict';

const { RouteError } = require('./distance');

/**
 * Calculates voyage duration (ETA) and estimated costs for a given route distance and vessel.
 *
 * NOTE: All monetary outputs are ESTIMATES based on prevailing bunker prices, operating rates,
 * and standard vessel consumption curves. They do NOT constitute commercial freight quotes.
 *
 * Fuel logic:
 * - Sailing time burns fuel at `fuelConsumptionTonnesPerDay`.
 * - Port/waiting buffer time does NOT burn fuel at the sailing rate. It only burns fuel at
 *   `idleFuelTonnesPerDay` (if specified, for auxiliary generators/hotel load).
 *
 * @param {object} params
 * @param {number} params.distanceNm - Total route distance in nautical miles
 * @param {object} params.vessel - Vessel specifications
 * @param {number} params.vessel.speedKnots - Cruising speed in knots (> 0)
 * @param {number} params.vessel.fuelConsumptionTonnesPerDay - Sailing fuel consumption in tonnes/day (>= 0)
 * @param {number} [params.vessel.dailyOperatingCostUsd=0] - Vessel daily hire / charter / operating rate
 * @param {object} params.costParams - Cost and operational assumptions
 * @param {number} params.costParams.fuelPriceUsdPerTonne - Bunker fuel price per metric tonne (>= 0)
 * @param {number} [params.costParams.bufferHours=0] - Port / canal / weather waiting buffer in hours
 * @param {number} [params.costParams.idleFuelTonnesPerDay=0] - Auxiliary fuel burn while waiting (tonnes/day)
 * @param {number} [params.costParams.portChargesUsd=0] - Fixed port, pilotage, and canal dues
 * @returns {object} Unrounded numeric breakdown of ETA, fuel burn, and cost components
 */
function calculateVoyageCostAndEta({ distanceNm, vessel, costParams = {} }) {
  if (typeof distanceNm !== 'number' || !Number.isFinite(distanceNm) || distanceNm <= 0) {
    throw new RouteError(
      `Route distance must be a positive finite number, received ${distanceNm}`,
      'INVALID_DISTANCE'
    );
  }

  if (!vessel || typeof vessel !== 'object') {
    throw new RouteError('Vessel profile object is required', 'INVALID_VESSEL');
  }

  const speedKnots = Number(vessel.speedKnots);
  if (!Number.isFinite(speedKnots) || speedKnots <= 0) {
    throw new RouteError(
      `Vessel speed must be a positive number in knots, received ${vessel.speedKnots}`,
      'INVALID_SPEED'
    );
  }

  const fuelConsumptionTonnesPerDay = Number(vessel.fuelConsumptionTonnesPerDay);
  if (!Number.isFinite(fuelConsumptionTonnesPerDay) || fuelConsumptionTonnesPerDay < 0) {
    throw new RouteError(
      `Vessel fuel burn must be a non-negative number in tonnes/day, received ${vessel.fuelConsumptionTonnesPerDay}`,
      'INVALID_FUEL_BURN'
    );
  }

  const fuelPriceUsdPerTonne = Number(costParams.fuelPriceUsdPerTonne);
  if (!Number.isFinite(fuelPriceUsdPerTonne) || fuelPriceUsdPerTonne < 0) {
    throw new RouteError(
      `Fuel price must be a non-negative number in USD/tonne, received ${costParams.fuelPriceUsdPerTonne}`,
      'INVALID_FUEL_PRICE'
    );
  }

  const dailyOperatingCostUsd = Number(vessel.dailyOperatingCostUsd || 0);
  if (!Number.isFinite(dailyOperatingCostUsd) || dailyOperatingCostUsd < 0) {
    throw new RouteError('Daily operating cost must be non-negative', 'INVALID_OPERATING_COST');
  }

  const bufferHours = Number(costParams.bufferHours || 0);
  if (!Number.isFinite(bufferHours) || bufferHours < 0) {
    throw new RouteError('Buffer hours must be a non-negative number', 'INVALID_BUFFER_HOURS');
  }

  const idleFuelTonnesPerDay = Number(costParams.idleFuelTonnesPerDay || 0);
  if (!Number.isFinite(idleFuelTonnesPerDay) || idleFuelTonnesPerDay < 0) {
    throw new RouteError('Idle fuel consumption must be non-negative', 'INVALID_IDLE_FUEL');
  }

  const portChargesUsd = Number(costParams.portChargesUsd || 0);
  if (!Number.isFinite(portChargesUsd) || portChargesUsd < 0) {
    throw new RouteError('Port charges must be non-negative', 'INVALID_PORT_CHARGES');
  }

  // Pure sailing calculations
  const sailingHours = distanceNm / speedKnots;
  const sailingDays = sailingHours / 24;
  const sailingFuelTonnes = sailingDays * fuelConsumptionTonnesPerDay;

  // Idle / buffer calculations (auxiliary engine only, NOT sailing rate)
  const idleDays = bufferHours / 24;
  const idleFuelTonnes = idleDays * idleFuelTonnesPerDay;

  // Totals
  const totalDays = (sailingHours + bufferHours) / 24;
  const totalFuelTonnes = sailingFuelTonnes + idleFuelTonnes;
  const fuelCostUsd = totalFuelTonnes * fuelPriceUsdPerTonne;
  const operatingCostUsd = totalDays * dailyOperatingCostUsd;
  const totalCostUsd = fuelCostUsd + operatingCostUsd + portChargesUsd;

  return {
    distanceNm,
    sailingHours,
    sailingDays,
    bufferHours,
    totalDays,
    fuelTonnes: totalFuelTonnes,
    sailingFuelTonnes,
    idleFuelTonnes,
    fuelCostUsd,
    operatingCostUsd,
    portChargesUsd,
    totalCostUsd,
    isEstimate: true,
  };
}

module.exports = {
  calculateVoyageCostAndEta,
};
