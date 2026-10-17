// WAYPOINT — Maritime Slot Booking & Logistics Dispatch Service
// Handles booking storage, queue queries with multi-criteria filters,
// and transmission of booking manifests to Port Authorities and Shipping Companies.

const fs = require('fs');
const path = require('path');

const BOOKINGS_FILE = path.join(__dirname, '../../data/bookings.json');

// In-memory cache synced with disk
let cachedBookings = null;

function loadBookings() {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
      cachedBookings = JSON.parse(data);
      return cachedBookings;
    }
  } catch (err) {
    console.error('Error reading bookings.json:', err);
  }
  cachedBookings = [];
  return cachedBookings;
}

function persistBookings() {
  try {
    const dir = path.dirname(BOOKINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(cachedBookings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error persisting bookings.json:', err);
    return false;
  }
}

/**
 * Get all bookings with flexible filtering for the Operations Command Queue
 */
function getBookings(filters = {}) {
  if (!cachedBookings) {
    loadBookings();
  }

  let results = [...cachedBookings];

  // 1. Filter by Ship / Vessel Name or IMO
  if (filters.vessel && filters.vessel !== 'ALL') {
    const vQuery = filters.vessel.toLowerCase().trim();
    results = results.filter(b => 
      (b.vesselName && b.vesselName.toLowerCase().includes(vQuery)) ||
      (b.imoNumber && b.imoNumber.includes(vQuery))
    );
  }

  // 2. Filter by Destination Port
  if (filters.destination && filters.destination !== 'ALL') {
    const dQuery = filters.destination.toLowerCase().trim();
    results = results.filter(b => 
      (b.destinationPort && b.destinationPort.toLowerCase().includes(dQuery)) ||
      (b.destinationPortId && b.destinationPortId.toLowerCase() === dQuery)
    );
  }

  // 3. Filter by Origin Port
  if (filters.origin && filters.origin !== 'ALL') {
    const oQuery = filters.origin.toLowerCase().trim();
    results = results.filter(b => 
      (b.originPort && b.originPort.toLowerCase().includes(oQuery)) ||
      (b.originPortId && b.originPortId.toLowerCase() === oQuery)
    );
  }

  // 4. Filter by Booking / Departure Date
  if (filters.date) {
    results = results.filter(b => 
      b.departureDate === filters.date || 
      (b.bookedAt && b.bookedAt.startsWith(filters.date))
    );
  }

  // 5. Filter by Distance Range (nautical miles)
  if (filters.minDistance !== undefined && filters.minDistance !== '') {
    const minD = Number(filters.minDistance);
    results = results.filter(b => Number(b.distanceNm || 0) >= minD);
  }
  if (filters.maxDistance !== undefined && filters.maxDistance !== '') {
    const maxD = Number(filters.maxDistance);
    results = results.filter(b => Number(b.distanceNm || 0) <= maxD);
  }

  // 6. Filter by Status (QUEUED | TRANSMITTED)
  if (filters.status && filters.status !== 'ALL') {
    results = results.filter(b => b.status === filters.status);
  }

  // 7. Filter by Shipper ID
  if (filters.shipperId) {
    results = results.filter(b => b.shipperId === filters.shipperId);
  }

  // 8. General search query
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    results = results.filter(b => 
      b.id.toLowerCase().includes(q) ||
      (b.vesselName && b.vesselName.toLowerCase().includes(q)) ||
      (b.carrier && b.carrier.toLowerCase().includes(q)) ||
      (b.cargoType && b.cargoType.toLowerCase().includes(q)) ||
      (b.shipperName && b.shipperName.toLowerCase().includes(q)) ||
      (b.destinationPort && b.destinationPort.toLowerCase().includes(q))
    );
  }

  // Sort descending by booking date (most recent first)
  results.sort((a, b) => new Date(b.bookedAt || 0) - new Date(a.bookedAt || 0));

  return results;
}

/**
 * Get single booking by ID
 */
function getBookingById(id) {
  if (!cachedBookings) {
    loadBookings();
  }
  return cachedBookings.find(b => b.id.toUpperCase() === id.toUpperCase()) || null;
}

/**
 * Create a new slot booking (when Shipper selects for booking)
 */
function createBooking(payload) {
  if (!cachedBookings) {
    loadBookings();
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const bookingId = payload.id || `BK-2026-${randomNum}`;

  const newBooking = {
    id: bookingId,
    shipperName: payload.shipperName || "Captain Sarah Chen (TechFlow Logistics)",
    shipperId: payload.shipperId || "shipper-01",
    vesselName: payload.vesselName || payload.vessel || "Allocated Fleet Vessel",
    imoNumber: payload.imoNumber || "9812402",
    carrier: payload.carrier || "Global Ocean Line",
    serviceCode: payload.serviceCode || "Fast Transit Express",
    vesselType: payload.vesselType || "Panamax / Post-Panamax",
    originPort: payload.originPort || payload.origin || "Chennai (Madras Port)",
    originPortId: payload.originPortId || "EC14",
    destinationPort: payload.destinationPort || payload.destination || payload.dest || "Singapore",
    destinationPortId: payload.destinationPortId || "FP02",
    departureDate: payload.departureDate || new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    departureTime: payload.departureTime || "08:00 UTC",
    etaDate: payload.etaDate || new Date(Date.now() + 86400000 * 9).toISOString().split('T')[0],
    etaTime: payload.etaTime || "14:00 UTC",
    transitDays: Number(payload.transitDays || payload.transit?.replace(/[^0-9.]/g, '') || 4.5),
    distanceNm: Number(payload.distanceNm || payload.distance?.replace(/[^0-9.]/g, '') || 1650),
    routeId: payload.routeId || "A",
    routeName: payload.routeName || payload.name || "Optimized Safe Corridor",
    routeCorridor: payload.routeCorridor || `${payload.originPort || 'Origin'} → ${payload.destinationPort || 'Dest'} Sea Lane`,
    routePassages: payload.routePassages || "Main Channel Deepwater Navigation",
    cargoType: payload.cargoType || payload.cargo || "Containerized Merchandise",
    containerCount: Number(payload.containerCount || 10),
    weightTeu: Number(payload.weightTeu || payload.weight || 20),
    costPerTeu: Number(payload.costPerTeu || 1200),
    costUsd: Number(payload.costUsd || payload.cost?.replace(/[^0-9.]/g, '') || 28500),
    status: "QUEUED",
    bookedAt: new Date().toISOString(),
    notes: payload.notes || "Space locked by shipper. Awaiting logistics dispatch transmission to Port & Shipping Company.",
    transmission: {
      status: "PENDING",
      sentAt: null,
      portEdi: null,
      carrierEdi: null
    }
  };

  cachedBookings.unshift(newBooking);
  persistBookings();
  return newBooking;
}

/**
 * Transmit / Send Data for a booking to the respected Port Authority & Shipping Company
 */
function transmitBookingData(id) {
  if (!cachedBookings) {
    loadBookings();
  }

  const booking = cachedBookings.find(b => b.id.toUpperCase() === id.toUpperCase());
  if (!booking) {
    throw new Error(`Booking with ID ${id} not found.`);
  }

  const sentAt = new Date().toISOString();
  const randomPortSeq = Math.floor(10000 + Math.random() * 90000);
  const randomCarrierSeq = Math.floor(10000 + Math.random() * 90000);
  const randomCustomsSeq = Math.floor(100000 + Math.random() * 900000);
  const bayNumber = Math.floor(10 + Math.random() * 35);
  const rowNumber = Math.floor(2 + Math.random() * 8);

  const carrierAcronym = (booking.carrier || 'CARRIER').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  const portCode = booking.originPortId || 'PORT';

  // 1. Respected Port Authority EDI Transmission Receipt
  const portEdi = {
    originPortAuthority: `${booking.originPort} Port Authority (PCS)`,
    destinationPortAuthority: `${booking.destinationPort} Port Operations Command`,
    ediTransmissionCode: `PORT-EDI-${portCode}-${randomPortSeq}`,
    berthClearanceStatus: `BERTH_CONFIRMED_DOCK_${Math.floor(1 + Math.random() * 6)}`,
    customsExportEntryNumber: `CUSTOMS-EXP-${randomCustomsSeq}`,
    portCommunityNetworkStatus: "ELECTRONIC_MANIFEST_ACCEPTED",
    transmittedAt: sentAt,
    targetTerminalGate: `Terminal ${Math.floor(1 + Math.random() * 3)} Ingate Automated EDI Gate`
  };

  // 2. Respected Shipping Company Slot Reservation Receipt
  const carrierEdi = {
    shippingCompany: booking.carrier,
    carrierBookingConfirmationCode: `BKG-${carrierAcronym}-${randomCarrierSeq}`,
    vesselAssigned: `${booking.vesselName} (IMO: ${booking.imoNumber})`,
    stowagePosition: `BAY-${bayNumber} / ROW-0${rowNumber} / TIER-84`,
    slotReservationStatus: "SLOT_LOCKED_IN_LOAD_PLAN",
    carrierEDIFACTMessage: "IFTMBF_FIRM_BOOKING_ACCEPTED",
    confirmedAt: sentAt
  };

  booking.status = "TRANSMITTED";
  booking.transmission = {
    status: "SENT",
    sentAt,
    portEdi,
    carrierEdi
  };

  persistBookings();
  return booking;
}

/**
 * Batch transmit multiple bookings
 */
function batchTransmitBookings(ids = []) {
  if (!cachedBookings) {
    loadBookings();
  }

  const targetIds = ids.length > 0 
    ? ids.map(i => i.toUpperCase())
    : cachedBookings.filter(b => b.status === 'QUEUED').map(b => b.id.toUpperCase());

  const updatedBookings = [];
  for (const id of targetIds) {
    try {
      const updated = transmitBookingData(id);
      updatedBookings.push(updated);
    } catch (e) {
      console.warn(`Failed to transmit ${id}:`, e.message);
    }
  }

  return updatedBookings;
}

// Initial load
loadBookings();

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  transmitBookingData,
  batchTransmitBookings
};
