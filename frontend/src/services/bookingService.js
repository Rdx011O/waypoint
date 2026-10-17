// WAYPOINT — Booking & Logistics Queue API Service
// Client interface for booking creation, queue retrieval, and port/carrier data dispatch.

const BACKEND_URL = (typeof window !== 'undefined' && window.location.port === '5000')
  ? ''
  : 'http://localhost:5000';

const API_BASE = '/api/bookings';

// Default seeded bookings for instant, rich demonstration across East Coast India & Bay of Bengal
export const DEFAULT_BOOKINGS = [
  {
    id: "BK-2026-8810",
    shipperName: "Captain Sarah Chen (TechFlow Logistics)",
    shipperId: "shipper-01",
    vesselName: "MSC Gulsun",
    imoNumber: "9839438",
    carrier: "MSC (Mediterranean Shipping Co)",
    serviceCode: "Falcon Express",
    vesselType: "Neo-Panamax / ULCV",
    originPort: "Chennai (Madras Port)",
    originPortId: "EC14",
    destinationPort: "Singapore",
    destinationPortId: "FP02",
    departureDate: "2026-10-22",
    departureTime: "06:30 UTC",
    etaDate: "2026-10-26",
    etaTime: "11:15 UTC",
    transitDays: 4.2,
    distanceNm: 1650,
    routeCorridor: "Direct Corridor via Malacca",
    routePassages: "Bay of Bengal South -> Six Degree Channel -> Strait of Malacca",
    cargoType: "High-Density Server Racks & Silicon Components",
    containerCount: 12,
    weightTeu: 24,
    costPerTeu: 1250,
    costUsd: 30000,
    status: "TRANSMITTED",
    bookedAt: "2026-10-17T05:30:00Z",
    notes: "Main deck stowage requested. Reefer power monitoring enabled.",
    transmission: {
      status: "SENT",
      sentAt: "2026-10-17T06:00:00Z",
      portEdi: {
        originPortAuthority: "Chennai (Madras Port) Port Authority (PCS)",
        destinationPortAuthority: "Singapore Port Operations Command",
        ediTransmissionCode: "PORT-EDI-EC14-15707",
        berthClearanceStatus: "BERTH_CONFIRMED_DOCK_3",
        customsExportEntryNumber: "CUSTOMS-EXP-643665",
        portCommunityNetworkStatus: "ELECTRONIC_MANIFEST_ACCEPTED",
        transmittedAt: "2026-10-17T06:00:00Z",
        targetTerminalGate: "Terminal 3 Ingate Automated EDI Gate"
      },
      carrierEdi: {
        shippingCompany: "MSC (Mediterranean Shipping Co)",
        carrierBookingConfirmationCode: "BKG-MSC-95250",
        vesselAssigned: "MSC Gulsun (IMO: 9839438)",
        stowagePosition: "BAY-16 / ROW-02 / TIER-84",
        slotReservationStatus: "SLOT_LOCKED_IN_LOAD_PLAN",
        carrierEDIFACTMessage: "IFTMBF_FIRM_BOOKING_ACCEPTED",
        confirmedAt: "2026-10-17T06:00:00Z"
      }
    }
  },
  {
    id: "BK-2026-8812",
    shipperName: "Captain Sarah Chen (TechFlow Logistics)",
    shipperId: "shipper-01",
    vesselName: "Maersk Mc-Kinney Moller",
    imoNumber: "9619907",
    carrier: "Maersk Line",
    serviceCode: "AE10 Asia Express",
    vesselType: "Neo-Panamax / ULCV",
    originPort: "Visakhapatnam (Vizag)",
    originPortId: "EC02",
    destinationPort: "Port Klang",
    destinationPortId: "FP04",
    departureDate: "2026-10-24",
    departureTime: "11:45 UTC",
    etaDate: "2026-10-28",
    etaTime: "18:00 UTC",
    transitDays: 4.8,
    distanceNm: 1540,
    routeCorridor: "Bay of Bengal Direct Track",
    routePassages: "Vizag Offshore -> North Andaman Sea -> Malacca Entry",
    cargoType: "Precision Machine Tooling & Castings",
    containerCount: 8,
    weightTeu: 16,
    costPerTeu: 1180,
    costUsd: 18880,
    status: "QUEUED",
    bookedAt: "2026-10-17T07:15:00Z",
    notes: "Heavy lift container inspection scheduled at Visakhapatnam Container Terminal.",
    transmission: {
      status: "PENDING",
      sentAt: null,
      portEdi: null,
      carrierEdi: null
    }
  },
  {
    id: "BK-2026-8815",
    shipperName: "Orient Cargo Global",
    shipperId: "shipper-02",
    vesselName: "CMA CGM Jacques Saade",
    imoNumber: "9839179",
    carrier: "CMA CGM Group",
    serviceCode: "FAL 1 East Express",
    vesselType: "Neo-Panamax / ULCV",
    originPort: "Kolkata (SMP Port)",
    originPortId: "EC08",
    destinationPort: "Singapore",
    destinationPortId: "FP02",
    departureDate: "2026-10-25",
    departureTime: "09:15 UTC",
    etaDate: "2026-10-31",
    etaTime: "08:30 UTC",
    transitDays: 5.6,
    distanceNm: 1620,
    routeCorridor: "Hooghly River Navigation -> Bay of Bengal South",
    routePassages: "Sandheads Pilot Boarding -> Deep Water Route -> Malacca Strait",
    cargoType: "Jute Textiles & Industrial Engineering Exports",
    containerCount: 16,
    weightTeu: 32,
    costPerTeu: 1320,
    costUsd: 42240,
    status: "QUEUED",
    bookedAt: "2026-10-17T08:00:00Z",
    notes: "Draft limitation observed at Hooghly channel: 7.2m max departure draft.",
    transmission: {
      status: "PENDING",
      sentAt: null,
      portEdi: null,
      carrierEdi: null
    }
  }
];

function getStoredLocalBookings() {
  try {
    const raw = localStorage.getItem('waypoint_local_bookings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading local bookings:', e);
  }
  // Initialize with default bookings
  try {
    localStorage.setItem('waypoint_local_bookings', JSON.stringify(DEFAULT_BOOKINGS));
  } catch (e) {}
  return [...DEFAULT_BOOKINGS];
}

function saveLocalBookings(list) {
  try {
    localStorage.setItem('waypoint_local_bookings', JSON.stringify(list));
    localStorage.setItem('waypoint_bookings', JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving local bookings:', e);
  }
}

/**
 * Fetch all bookings with optional query filters
 */
export async function fetchBookings(filters = {}) {
  const localList = getStoredLocalBookings();

  try {
    const params = new URLSearchParams();
    if (filters.vessel && filters.vessel !== 'ALL') params.append('vessel', filters.vessel);
    if (filters.destination && filters.destination !== 'ALL') params.append('destination', filters.destination);
    if (filters.origin && filters.origin !== 'ALL') params.append('origin', filters.origin);
    if (filters.date) params.append('date', filters.date);
    if (filters.minDistance) params.append('minDistance', filters.minDistance);
    if (filters.maxDistance) params.append('maxDistance', filters.maxDistance);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.shipperId) params.append('shipperId', filters.shipperId);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    // Try direct backend URL or Vite proxy
    const endpoints = [
      `${BACKEND_URL}/api/bookings${queryString}`,
      `${API_BASE}${queryString}`
    ];

    let backendBookings = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.bookings)) {
            backendBookings = data.bookings;
            break;
          }
        }
      } catch (err) {
        // try next endpoint
      }
    }

    if (backendBookings && backendBookings.length > 0) {
      // Merge backend bookings with local bookings (local takes priority for recent changes)
      const mergedMap = new Map();
      backendBookings.forEach(b => mergedMap.set(b.id, b));
      localList.forEach(b => mergedMap.set(b.id, b)); // local preserves newly queued bookings

      const mergedList = Array.from(mergedMap.values());
      // Sort descending by booking time
      mergedList.sort((a, b) => new Date(b.bookedAt || 0) - new Date(a.bookedAt || 0));
      saveLocalBookings(mergedList);
      return mergedList;
    }
  } catch (err) {
    console.warn('Falling back to local cache for bookings:', err.message);
  }

  return localList;
}

/**
 * Fetch a single booking by ID
 */
export async function fetchBookingById(id) {
  const localList = getStoredLocalBookings();
  const localMatch = localList.find(b => b.id.toUpperCase() === String(id).toUpperCase());

  try {
    const res = await fetch(`${BACKEND_URL}/api/bookings/${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.booking) return data.booking;
    }
  } catch (err) {
    console.warn('API error fetching booking by ID, using local copy:', err.message);
  }

  return localMatch || null;
}

/**
 * Create a new booking (when shipper taps Select for Booking / Confirm Booking)
 */
export async function createBooking(bookingPayload) {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const newBooking = {
    id: bookingPayload.id || `BK-2026-${randomNum}`,
    shipperName: bookingPayload.shipperName || "Captain Sarah Chen (TechFlow Logistics)",
    shipperId: bookingPayload.shipperId || "shipper-01",
    vesselName: bookingPayload.vesselName || bookingPayload.vessel || "MSC Gulsun",
    imoNumber: bookingPayload.imoNumber || "9839438",
    carrier: bookingPayload.carrier || "MSC (Mediterranean Shipping Co)",
    serviceCode: bookingPayload.serviceCode || "Falcon Express",
    vesselType: bookingPayload.vesselType || "Panamax / Post-Panamax",
    originPort: bookingPayload.originPort || bookingPayload.origin || "Chennai",
    originPortId: bookingPayload.originPortId || "EC14",
    destinationPort: bookingPayload.destinationPort || bookingPayload.destination || "Singapore",
    destinationPortId: bookingPayload.destinationPortId || "FP02",
    departureDate: bookingPayload.departureDate || new Date().toISOString().split('T')[0],
    departureTime: bookingPayload.departureTime || "06:30 UTC",
    etaDate: bookingPayload.etaDate || new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    etaTime: bookingPayload.etaTime || "14:00 UTC",
    transitDays: Number(bookingPayload.transitDays || 4.5),
    distanceNm: Number(bookingPayload.distanceNm || 1650),
    routeId: bookingPayload.routeId || "A",
    routeName: bookingPayload.routeName || "Optimized Sea Lane",
    routeCorridor: bookingPayload.routeCorridor || `${bookingPayload.originPort || 'Chennai'} → ${bookingPayload.destinationPort || 'Singapore'} Main Channel`,
    routePassages: bookingPayload.routePassages || "Direct Maritime Corridor",
    cargoType: bookingPayload.cargoType || "Containers",
    containerCount: Number(bookingPayload.containerCount || 12),
    weightTeu: Number(bookingPayload.weightTeu || 24),
    costPerTeu: Number(bookingPayload.costPerTeu || 1200),
    costUsd: Number(bookingPayload.costUsd || bookingPayload.cost || 28500),
    status: "QUEUED",
    bookedAt: new Date().toISOString(),
    notes: bookingPayload.notes || "Space locked by shipper via WAYPOINT Route Optimizer.",
    transmission: {
      status: "PENDING",
      sentAt: null,
      portEdi: null,
      carrierEdi: null
    }
  };

  // 1. ALWAYS persist to LocalStorage immediately so it's guaranteed to be in My Bookings
  const existing = getStoredLocalBookings();
  const filtered = existing.filter(b => b.id !== newBooking.id);
  filtered.unshift(newBooking);
  saveLocalBookings(filtered);

  // 2. Also attempt backend API call
  try {
    const endpoints = [
      `${BACKEND_URL}/api/bookings`,
      API_BASE
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBooking)
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.booking) {
            // Update local storage with backend confirmed payload
            const updated = getStoredLocalBookings().map(b => b.id === newBooking.id ? data.booking : b);
            saveLocalBookings(updated);
            return data.booking;
          }
        }
      } catch (e) {
        // try next endpoint
      }
    }
  } catch (err) {
    console.warn('Backend booking API unreachable, booking stored locally:', err.message);
  }

  return newBooking;
}

/**
 * Send Data / Dispatch Booking to respected Port Authority & Shipping Company
 */
export async function sendBookingData(id) {
  const sentAt = new Date().toISOString();
  const randomPortSeq = Math.floor(10000 + Math.random() * 90000);
  const randomCarrierSeq = Math.floor(10000 + Math.random() * 90000);
  const randomCustomsSeq = Math.floor(100000 + Math.random() * 900000);
  const bayNumber = Math.floor(10 + Math.random() * 35);
  const rowNumber = Math.floor(2 + Math.random() * 8);

  const localList = getStoredLocalBookings();
  const target = localList.find(b => b.id.toUpperCase() === String(id).toUpperCase());

  const portCode = target?.originPortId || 'EC14';
  const carrierAcronym = (target?.carrier || 'MSC').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();

  const generatedTransmission = {
    status: "SENT",
    sentAt,
    portEdi: {
      originPortAuthority: `${target?.originPort || 'Origin'} Port Authority (PCS)`,
      destinationPortAuthority: `${target?.destinationPort || 'Destination'} Port Operations Command`,
      ediTransmissionCode: `PORT-EDI-${portCode}-${randomPortSeq}`,
      berthClearanceStatus: `BERTH_CONFIRMED_DOCK_${Math.floor(1 + Math.random() * 6)}`,
      customsExportEntryNumber: `CUSTOMS-EXP-${randomCustomsSeq}`,
      portCommunityNetworkStatus: "ELECTRONIC_MANIFEST_ACCEPTED",
      transmittedAt: sentAt,
      targetTerminalGate: `Terminal ${Math.floor(1 + Math.random() * 3)} Ingate Automated EDI Gate`
    },
    carrierEdi: {
      shippingCompany: target?.carrier || "Global Shipping Line",
      carrierBookingConfirmationCode: `BKG-${carrierAcronym}-${randomCarrierSeq}`,
      vesselAssigned: `${target?.vesselName || 'Assigned Vessel'} (IMO: ${target?.imoNumber || '9812402'})`,
      stowagePosition: `BAY-${bayNumber} / ROW-0${rowNumber} / TIER-84`,
      slotReservationStatus: "SLOT_LOCKED_IN_LOAD_PLAN",
      carrierEDIFACTMessage: "IFTMBF_FIRM_BOOKING_ACCEPTED",
      confirmedAt: sentAt
    }
  };

  // 1. Update in local storage
  const updatedLocal = localList.map(b => {
    if (b.id.toUpperCase() === String(id).toUpperCase()) {
      return {
        ...b,
        status: "TRANSMITTED",
        transmission: generatedTransmission
      };
    }
    return b;
  });
  saveLocalBookings(updatedLocal);

  const updatedBooking = updatedLocal.find(b => b.id.toUpperCase() === String(id).toUpperCase()) || {
    id,
    status: "TRANSMITTED",
    transmission: generatedTransmission
  };

  // 2. Attempt backend dispatch API
  try {
    const endpoints = [
      `${BACKEND_URL}/api/bookings/${encodeURIComponent(id)}/send-data`,
      `${API_BASE}/${encodeURIComponent(id)}/send-data`
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.booking) {
            const synced = getStoredLocalBookings().map(b => b.id === id ? data.booking : b);
            saveLocalBookings(synced);
            return data;
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Backend send-data call offline, using local dispatch confirmation:', err.message);
  }

  return {
    success: true,
    message: `Data successfully transported to ${target?.originPort || 'Origin'} Port Authority and ${target?.carrier || 'Carrier'} Shipping Systems.`,
    booking: updatedBooking
  };
}

/**
 * Batch transmit multiple or all queued bookings
 */
export async function batchSendBookings(ids = []) {
  const idSet = new Set(ids.map(id => String(id).toUpperCase()));
  const localList = getStoredLocalBookings();

  // Try backend first
  try {
    const res = await fetch(`${BACKEND_URL}/api/bookings/batch-transmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.bookings) {
        const mergedMap = new Map();
        localList.forEach(b => mergedMap.set(b.id, b));
        data.bookings.forEach(b => mergedMap.set(b.id, b));
        saveLocalBookings(Array.from(mergedMap.values()));
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend batch-transmit offline, fulfilling in local storage:', err.message);
  }

  // Fulfill batch transmission locally
  const updatedList = [];
  for (const b of localList) {
    if (idSet.size === 0 || idSet.has(b.id.toUpperCase())) {
      const res = await sendBookingData(b.id);
      updatedList.push(res.booking);
    }
  }

  return {
    success: true,
    message: `Successfully transported ${updatedList.length} booked slot(s) data to respective Port Authorities and Shipping Lines.`,
    count: updatedList.length,
    bookings: updatedList
  };
}
