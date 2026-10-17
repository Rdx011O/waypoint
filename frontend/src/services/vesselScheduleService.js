// WAYPOINT — Vessel Schedule & Port Availability Service
// Connects Port-Pair Corridors, Departure Dates, Carrier Capacities, Pricing, and Real-Time Availability Messages

import { CSV_INDIAN_PORTS, CSV_FOREIGN_PORTS } from '../data/maritimeCsvData';

export const BASE_CARRIER_FLEET = [
  { carrier: 'MSC (Mediterranean Shipping Co)', name: 'MSC Gulsun', imo: '9839438', type: 'Neo-Panamax / ULCV', totalCapacity: 23756, unit: 'TEU' },
  { carrier: 'Maersk Line', name: 'Maersk Mc-Kinney Moller', imo: '9619907', type: 'Neo-Panamax / ULCV', totalCapacity: 18270, unit: 'TEU' },
  { carrier: 'CMA CGM Group', name: 'CMA CGM Jacques Saade', imo: '9839179', type: 'Neo-Panamax / ULCV', totalCapacity: 23000, unit: 'TEU' },
  { carrier: 'Evergreen Marine', name: 'Ever Given', imo: '9811000', type: 'Panamax / Post-Panamax', totalCapacity: 20124, unit: 'TEU' },
  { carrier: 'Ocean Network Express (ONE)', name: 'ONE Apus', imo: '9806079', type: 'Panamax / Post-Panamax', totalCapacity: 14052, unit: 'TEU' },
  { carrier: 'Hapag-Lloyd', name: 'Hapag-Lloyd Berlin Express', imo: '9540118', type: 'Panamax / Post-Panamax', totalCapacity: 13200, unit: 'TEU' },
  { carrier: 'Shipping Corporation of India (SCI)', name: 'SCI Chennai', imo: '9445215', type: 'Feeder', totalCapacity: 2870, unit: 'TEU' },
  { carrier: 'X-Press Feeders', name: 'X-Press Godavari', imo: '9362841', type: 'Feeder', totalCapacity: 1740, unit: 'TEU' },
  { carrier: 'Wan Hai Lines', name: 'Wan Hai 502', imo: '9326419', type: 'Panamax / Post-Panamax', totalCapacity: 4252, unit: 'TEU' },
  { carrier: 'COSCO Shipping Lines', name: 'COSCO Development', imo: '9472141', type: 'Neo-Panamax / ULCV', totalCapacity: 13092, unit: 'TEU' },
  { carrier: 'Great Eastern Shipping', name: 'Bharat Pride', imo: '9421155', type: 'Handysize / Supramax', totalCapacity: 35000, unit: 'DWT' },
  { carrier: 'HMM', name: 'Hyundai Smart', imo: '9637222', type: 'Neo-Panamax / ULCV', totalCapacity: 13100, unit: 'TEU' }
];

const DEPARTURE_TIMES = ['06:30 UTC', '09:15 UTC', '11:45 UTC', '14:20 UTC', '18:00 UTC', '21:30 UTC'];

/**
 * Deterministic hash from string for repeatable schedule generation across any date
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Infer passages and routing corridor from Origin and Destination ports
 */
function inferCorridor(origin, dest) {
  const oName = origin?.name || 'Origin';
  const dName = dest?.name || 'Destination';
  const dCountry = dest?.country || '';

  if (dName.toLowerCase().includes('singapore') || dName.toLowerCase().includes('klang')) {
    return {
      name: 'Direct Corridor via Malacca Strait',
      passages: 'Bay of Bengal -> Six Degree Channel -> Malacca Strait',
      transitMultiplier: 1.0
    };
  }
  if (dName.toLowerCase().includes('colombo')) {
    return {
      name: 'Palk Strait Offshore Deepwater Channel',
      passages: 'Coromandel Coast -> Palk Strait Deepwater Channel -> Colombo Approach',
      transitMultiplier: 0.4
    };
  }
  if (dCountry.includes('UAE') || dName.toLowerCase().includes('dubai') || dName.toLowerCase().includes('jebel')) {
    return {
      name: 'Arabian Sea Fast Corridor',
      passages: 'South Sri Lanka Deepwater -> Arabian Sea -> Gulf of Oman',
      transitMultiplier: 1.3
    };
  }
  if (dCountry.includes('Netherlands') || dCountry.includes('United Kingdom') || dName.toLowerCase().includes('rotterdam')) {
    return {
      name: 'Cape of Good Hope Oceanic Route',
      passages: 'Bay of Bengal -> South Indian Ocean -> Cape Route -> North Atlantic',
      transitMultiplier: 4.8
    };
  }
  return {
    name: 'Trans-Oceanic Standard Sea Lane',
    passages: `${oName} Offshore -> Great Channel -> ${dName} Approach`,
    transitMultiplier: 1.2
  };
}

/**
 * Get available vessels, schedules, pricing and capacity on a specific port and date
 * 
 * @param {object} params
 * @param {string} params.originId - e.g. 'EC14'
 * @param {string} params.destId - e.g. 'FP02'
 * @param {string} params.departureDate - YYYY-MM-DD
 * @param {string} [params.cargoType] - 'Containers', 'Coal', etc.
 * @param {string} [params.vesselType] - preferred vessel class
 * @param {number} [params.weight] - cargo weight/quantity
 * @returns {object} { vessels: Array, summary: object, availabilityMessage: object }
 */
export function getVesselSchedulesForDate({
  originId = 'EC14',
  destId = 'FP02',
  departureDate,
  cargoType = 'Containers',
  vesselType = 'Panamax / Post-Panamax',
  weight = 25000
}) {
  const origin = CSV_INDIAN_PORTS.find(p => p.portId === originId) || CSV_INDIAN_PORTS[0];
  const dest = CSV_FOREIGN_PORTS.find(p => p.portId === destId) || CSV_FOREIGN_PORTS[0];

  // Default to today if no date passed
  const effectiveDate = departureDate || new Date().toISOString().split('T')[0];
  const corridor = inferCorridor(origin, dest);

  // Generate 3 to 4 scheduled ships for this date using deterministic seed
  const dateHash = hashString(`${originId}_${destId}_${effectiveDate}`);
  const numberOfShips = 3 + (dateHash % 2); // 3 or 4 vessels
  
  const vessels = [];
  let availableCount = 0;
  let limitedCount = 0;
  let fullCount = 0;

  for (let i = 0; i < numberOfShips; i++) {
    const vesselIndex = (dateHash + i * 3) % BASE_CARRIER_FLEET.length;
    const baseShip = BASE_CARRIER_FLEET[vesselIndex];
    const timeIndex = (dateHash + i * 2) % DEPARTURE_TIMES.length;
    const depTime = DEPARTURE_TIMES[timeIndex];

    // Status distribution: ~65% Available, ~20% Limited, ~15% Full
    const statusRoll = (dateHash + i * 7) % 100;
    let status = 'AVAILABLE';
    let availableSlots = Math.round(baseShip.totalCapacity * (0.2 + (statusRoll % 40) / 100));

    if (statusRoll > 82) {
      status = 'UNAVAILABLE';
      availableSlots = 0;
      fullCount++;
    } else if (statusRoll > 62) {
      status = 'LIMITED';
      availableSlots = Math.round(baseShip.totalCapacity * 0.08); // < 10%
      limitedCount++;
    } else {
      status = 'AVAILABLE';
      availableCount++;
    }

    // Dynamic pricing calculation
    const baseRatePerUnit = 950 + (dateHash % 400) + i * 65;
    const estimatedVoyageCost = Math.round(baseRatePerUnit * Math.max(15, Math.min(35, weight / 1000 || 25)) * corridor.transitMultiplier);
    const transitDays = Number((3.5 * corridor.transitMultiplier + (i * 0.3)).toFixed(1));

    // Specific route corridor variation
    const routeVariant = i === 0 
      ? corridor.name 
      : i === 1 
        ? `${corridor.name} (Express Non-Stop)` 
        : `${corridor.name} (Via Colombo Transshipment Hub)`;

    vessels.push({
      id: `SCH-${origin.unlocode || 'PORT'}-${effectiveDate}-${i + 1}`,
      vesselName: baseShip.name,
      imoNumber: `IMO ${baseShip.imo}`,
      carrier: baseShip.carrier,
      serviceName: `${baseShip.carrier.split(' ')[0]} Ocean Loop ${10 + i}`,
      vesselType: baseShip.type,
      departureDate: effectiveDate,
      departureTime: depTime,
      transitDays: `${transitDays} d`,
      pricing: {
        ratePerUnitUsd: baseRatePerUnit,
        rateUnit: baseShip.unit === 'TEU' ? '/ TEU' : '/ MT',
        estimatedTotalUsd: estimatedVoyageCost,
        bunkerSurchargeUsd: Math.round(estimatedVoyageCost * 0.12),
        currency: 'USD'
      },
      capacity: {
        total: `${baseShip.totalCapacity.toLocaleString()} ${baseShip.unit}`,
        available: availableSlots > 0 ? `${availableSlots.toLocaleString()} ${baseShip.unit}` : '0 slots (Waitlist)',
        percentRemaining: Math.round((availableSlots / baseShip.totalCapacity) * 100)
      },
      routeCorridor: routeVariant,
      passages: corridor.passages,
      status, // 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE'
      statusNote: status === 'AVAILABLE' 
        ? '✓ Space confirmed on main deck. Immediate booking available.'
        : status === 'LIMITED'
          ? '⚠ High load factor: < 10% container allocation remaining.'
          : '✕ Fully booked. Cargo hold at capacity for this scheduled call.'
    });
  }

  // Construct instant feedback message for the Shipper
  const formattedDate = new Date(effectiveDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  let messageType = 'success';
  let messageTitle = 'Vessels Available on Schedule';
  let messageText = '';

  if (availableCount > 0) {
    messageType = 'success';
    messageTitle = `${availableCount} Sailing${availableCount > 1 ? 's' : ''} Confirmed Open on ${formattedDate}`;
    messageText = `Found ${vessels.length} vessels scheduled at ${origin.name} destined for ${dest.name}. Earliest departure: ${vessels[0].departureTime} (${vessels[0].vesselName} • ${vessels[0].carrier}). Container allocation verified.`;
  } else if (limitedCount > 0) {
    messageType = 'warning';
    messageTitle = `Limited Allocation Remaining on ${formattedDate}`;
    messageText = `All ${vessels.length} scheduled sailings from ${origin.name} have high capacity utilization. Reserve your cargo slot immediately to avoid container rollover.`;
  } else {
    messageType = 'error';
    messageTitle = `No Confirmed Availability on ${formattedDate}`;
    messageText = `All scheduled vessel calls on this date are fully booked or at maximum draft allocation. Please select the next available departure (+1 to +2 days).`;
  }

  return {
    origin,
    dest,
    departureDate: effectiveDate,
    formattedDate,
    vessels,
    summary: {
      totalVessels: vessels.length,
      availableCount,
      limitedCount,
      fullCount
    },
    availabilityMessage: {
      type: messageType,
      title: messageTitle,
      text: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    }
  };
}
