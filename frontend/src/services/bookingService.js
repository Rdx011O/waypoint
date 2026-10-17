// WAYPOINT — Booking & Logistics Queue API Service
// Client interface for booking creation, queue retrieval, and port/carrier data dispatch.

const API_BASE = '/api/bookings';

/**
 * Fetch all bookings with optional query filters
 */
export async function fetchBookings(filters = {}) {
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
    const res = await fetch(`${API_BASE}${queryString}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.bookings || [];
  } catch (err) {
    console.warn('Falling back to local cache for bookings:', err.message);
    const local = localStorage.getItem('waypoint_local_bookings');
    return local ? JSON.parse(local) : [];
  }
}

/**
 * Fetch a single booking by ID
 */
export async function fetchBookingById(id) {
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.booking || null;
  } catch (err) {
    console.error('Error fetching booking by ID:', err);
    return null;
  }
}

/**
 * Create a new booking (when shipper taps Select for Booking)
 */
export async function createBooking(bookingPayload) {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingPayload)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.booking;
  } catch (err) {
    console.warn('API error, saving booking locally:', err.message);
    const fallbackBooking = {
      id: `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      ...bookingPayload,
      status: 'QUEUED',
      bookedAt: new Date().toISOString(),
      transmission: { status: 'PENDING', sentAt: null, portEdi: null, carrierEdi: null }
    };
    const local = localStorage.getItem('waypoint_local_bookings');
    const existing = local ? JSON.parse(local) : [];
    existing.unshift(fallbackBooking);
    localStorage.setItem('waypoint_local_bookings', JSON.stringify(existing));
    return fallbackBooking;
  }
}

/**
 * Send Data / Dispatch Booking to respected Port Authority & Shipping Company
 */
export async function sendBookingData(id) {
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}/send-data`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error sending booking data:', err);
    throw err;
  }
}

/**
 * Batch transmit multiple or all queued bookings
 */
export async function batchSendBookings(ids = []) {
  try {
    const res = await fetch(`${API_BASE}/batch-transmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error batch sending bookings:', err);
    throw err;
  }
}
