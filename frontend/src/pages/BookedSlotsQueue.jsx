// WAYPOINT — Booked Slots Dispatch Queue (Logistics Console / Operations Command)
// Multi-criteria filterable queue for booked slots with 1-click EDI data transmission to Port Authorities & Shipping Companies.

import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { fetchBookings, sendBookingData, batchSendBookings } from '../services/bookingService';

export default function BookedSlotsQueue({ onNavigate }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transmittingId, setTransmittingId] = useState(null);
  const [isBatchTransmitting, setIsBatchTransmitting] = useState(false);
  const [transmissionSuccess, setTransmissionSuccess] = useState(null);

  // Filters
  const [filterVessel, setFilterVessel] = useState('ALL');
  const [filterDestination, setFilterDestination] = useState('ALL');
  const [filterOrigin, setFilterOrigin] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [filterDistance, setFilterDistance] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await fetchBookings();
      setBookings(data);
    } catch (err) {
      console.error('Error loading queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Extract unique options for filter dropdowns
  const uniqueVessels = Array.from(new Set(bookings.map(b => b.vesselName).filter(Boolean))).sort();
  const uniqueDestinations = Array.from(new Set(bookings.map(b => b.destinationPort).filter(Boolean))).sort();
  const uniqueOrigins = Array.from(new Set(bookings.map(b => b.originPort).filter(Boolean))).sort();

  // Handle individual Send Data
  const handleSendData = async (bookingId) => {
    setTransmittingId(bookingId);
    setTransmissionSuccess(null);
    try {
      const res = await sendBookingData(bookingId);
      // Update local state with transmitted booking
      setBookings(prev => prev.map(b => b.id === bookingId ? res.booking : b));
      setTransmissionSuccess({
        id: bookingId,
        message: res.message || `Data transported to Port Authority & Shipping Line.`,
        portEdi: res.booking.transmission?.portEdi,
        carrierEdi: res.booking.transmission?.carrierEdi
      });
      setTimeout(() => setTransmissionSuccess(null), 8000);
    } catch (err) {
      alert(`Transmission failed: ${err.message}`);
    } finally {
      setTransmittingId(null);
    }
  };

  // Handle Send All Queued Data
  const handleSendAllQueued = async () => {
    const queuedIds = bookings.filter(b => b.status === 'QUEUED').map(b => b.id);
    if (queuedIds.length === 0) {
      alert('No slots currently pending in queue.');
      return;
    }

    if (!window.confirm(`Transmit data for all ${queuedIds.length} queued slots to their respected Port Authorities and Shipping Lines?`)) {
      return;
    }

    setIsBatchTransmitting(true);
    try {
      const res = await batchSendBookings(queuedIds);
      await loadQueue();
      setTransmissionSuccess({
        id: 'BATCH',
        message: res.message || `Successfully transported data for ${queuedIds.length} booked slots!`
      });
      setTimeout(() => setTransmissionSuccess(null), 8000);
    } catch (err) {
      alert(`Batch transmission error: ${err.message}`);
    } finally {
      setIsBatchTransmitting(false);
    }
  };

  // Filter logic
  const filteredBookings = bookings.filter(b => {
    // Vessel
    if (filterVessel !== 'ALL' && b.vesselName !== filterVessel) return false;
    // Destination
    if (filterDestination !== 'ALL' && b.destinationPort !== filterDestination) return false;
    // Origin Port
    if (filterOrigin !== 'ALL' && b.originPort !== filterOrigin) return false;
    // Date
    if (filterDate && b.departureDate !== filterDate && (!b.bookedAt || !b.bookedAt.startsWith(filterDate))) {
      return false;
    }
    // Distance
    const dist = Number(b.distanceNm || 0);
    if (filterDistance === 'SHORT' && dist >= 1800) return false;
    if (filterDistance === 'MEDIUM' && (dist < 1800 || dist > 3500)) return false;
    if (filterDistance === 'LONG' && dist <= 3500) return false;
    // Status
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
    // Search keyword
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = b.id?.toLowerCase().includes(q);
      const matchVessel = b.vesselName?.toLowerCase().includes(q);
      const matchCarrier = b.carrier?.toLowerCase().includes(q);
      const matchCargo = b.cargoType?.toLowerCase().includes(q);
      const matchShipper = b.shipperName?.toLowerCase().includes(q);
      const matchDest = b.destinationPort?.toLowerCase().includes(q);
      if (!matchId && !matchVessel && !matchCarrier && !matchCargo && !matchShipper && !matchDest) {
        return false;
      }
    }
    return true;
  });

  const queuedCount = bookings.filter(b => b.status === 'QUEUED').length;
  const transmittedCount = bookings.filter(b => b.status === 'TRANSMITTED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--accent-cyan)',
            marginBottom: '4px'
          }}>
            <Icon name="Layers" size={13} />
            Logistics Console • Operations Command
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            Booked Slots Dispatch Queue
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Filter booked vessel slots across ships, destinations, dates, and ports. Send electronic manifests directly to respected Port Authorities & Shipping Companies.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={loadQueue}>
            <Icon name="RefreshCw" size={14} className={loading ? 'spinning' : ''} />
            <span>Sync Queue</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSendAllQueued}
            disabled={isBatchTransmitting || queuedCount === 0}
            style={{
              background: queuedCount > 0 ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : 'var(--bg-surface-elevated)',
              boxShadow: queuedCount > 0 ? '0 4px 14px rgba(2, 132, 199, 0.4)' : 'none'
            }}
          >
            <Icon name="Send" size={14} />
            <span>{isBatchTransmitting ? 'Transporting Data...' : `Send All Queued Data (${queuedCount})`}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {transmissionSuccess && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid var(--safe-teal)',
          borderRadius: 'var(--radius-md)',
          color: '#E2E8F0',
          fontSize: '13px',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--safe-teal)' }}>
              <Icon name="CheckCircle2" size={18} />
              <span>Data Successfully Transported to Port Authorities & Shipping Lines!</span>
            </div>
            <button
              onClick={() => setTransmissionSuccess(null)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
            >
              <Icon name="X" size={16} />
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#CBD5E1' }}>
            {transmissionSuccess.message}
          </div>
          {transmissionSuccess.portEdi && (
            <div style={{
              display: 'flex',
              gap: '16px',
              fontSize: '11px',
              fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.3)',
              padding: '6px 12px',
              borderRadius: '4px',
              color: '#38BDF8'
            }}>
              <span>EDI Token: <strong>{transmissionSuccess.portEdi.ediTransmissionCode}</strong></span>
              <span>Berth: <strong>{transmissionSuccess.portEdi.berthClearanceStatus}</strong></span>
              <span>Carrier Slot: <strong>{transmissionSuccess.carrierEdi?.carrierBookingConfirmationCode}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Filter Control Console */}
      <div className="card" style={{ padding: '18px 20px', background: 'var(--bg-surface)' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="Filter" size={14} color="var(--accent-cyan)" />
            <span>Filter Categories (Ship, Destination, Booking Dates, Port, Distance)</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
            <span style={{ color: 'var(--caution-amber)' }}>● {queuedCount} Awaiting Send</span>
            <span style={{ color: 'var(--safe-teal)' }}>● {transmittedCount} Transmitted</span>
          </div>
        </div>

        {/* 6-Category Filters Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '14px'
        }}>
          {/* 1. Filter by Ship / Vessel */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
              Ship / Vessel
            </label>
            <select
              className="form-control"
              value={filterVessel}
              onChange={(e) => setFilterVessel(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <option value="ALL">All Ships ({uniqueVessels.length})</option>
              {uniqueVessels.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* 2. Filter by Destination Port */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
              Destination Port
            </label>
            <select
              className="form-control"
              value={filterDestination}
              onChange={(e) => setFilterDestination(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <option value="ALL">All Destinations ({uniqueDestinations.length})</option>
              {uniqueDestinations.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 3. Filter by Origin Port */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
              Origin Port
            </label>
            <select
              className="form-control"
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <option value="ALL">All Origins ({uniqueOrigins.length})</option>
              {uniqueOrigins.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* 4. Filter by Booking / Departure Date */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
              Departure / Booking Date
            </label>
            <input
              type="date"
              className="form-control"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            />
          </div>

          {/* 5. Filter by Distance */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
              Voyage Distance (nm)
            </label>
            <select
              className="form-control"
              value={filterDistance}
              onChange={(e) => setFilterDistance(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <option value="ALL">All Distances</option>
              <option value="SHORT">Short Range (&lt; 1,800 nm)</option>
              <option value="MEDIUM">Medium Range (1,800 - 3,500 nm)</option>
              <option value="LONG">Long Ocean (&gt; 3,500 nm)</option>
            </select>
          </div>

          {/* 6. Filter by Status */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
              Transmission Status
            </label>
            <select
              className="form-control"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="QUEUED">Queued (Pending Send)</option>
              <option value="TRANSMITTED">Transmitted (Verified)</option>
            </select>
          </div>
        </div>

        {/* Bottom Search & Reset Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search keyword: Reference, Cargo, Shipper, Carrier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '12px', width: '100%' }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Icon name="Search" size={13} />
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Showing <strong>{filteredBookings.length}</strong> of {bookings.length} slots
            </span>

            {(filterVessel !== 'ALL' || filterDestination !== 'ALL' || filterOrigin !== 'ALL' || filterDate || filterDistance !== 'ALL' || filterStatus !== 'ALL' || searchQuery) && (
              <button
                className="btn btn-outline btn-xs"
                onClick={() => {
                  setFilterVessel('ALL');
                  setFilterDestination('ALL');
                  setFilterOrigin('ALL');
                  setFilterDate('');
                  setFilterDistance('ALL');
                  setFilterStatus('ALL');
                  setSearchQuery('');
                }}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                <Icon name="X" size={11} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Queue Manifest Table & Cards */}
      {loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ marginBottom: '8px' }}><Icon name="RefreshCw" size={20} className="spinning" /></div>
          Loading operations dispatch queue...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: '0 0 6px' }}>No Booked Slots Match Filter Criteria</h3>
          <p style={{ fontSize: '12px', margin: 0 }}>
            Adjust your filter settings for ship, destination, dates, or distance to view queued shipments.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredBookings.map(b => {
            const isTransmitted = b.status === 'TRANSMITTED';
            const isTransmitting = transmittingId === b.id;
            const transmission = b.transmission || {};

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  background: 'var(--bg-surface)',
                  border: isTransmitted ? '1px solid rgba(45, 212, 191, 0.35)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '3px 8px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: 'var(--accent-cyan)',
                      fontSize: '12px'
                    }}>
                      {b.id}
                    </span>

                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>
                      {b.shipperName}
                    </span>

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      • Booked: {new Date(b.bookedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isTransmitted ? (
                      <span className="badge badge-teal" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px' }}>
                        <Icon name="ShieldCheck" size={12} />
                        <span>Transmitted to Port & Carrier</span>
                      </span>
                    ) : (
                      <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px' }}>
                        <Icon name="Clock" size={12} />
                        <span>In Queue (Pending Send)</span>
                      </span>
                    )}

                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      ${(Number(b.costUsd) || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Specs Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  background: 'rgba(7, 13, 24, 0.4)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '11.5px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Ship & IMO:</span>
                    <strong style={{ color: '#fff' }}>{b.vesselName}</strong>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{b.carrier} ({b.imoNumber})</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Voyage Route:</span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{b.originPort} → {b.destinationPort}</strong>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Dep: {b.departureDate} ({b.departureTime})</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Distance & ETA:</span>
                    <strong style={{ color: '#fff' }}>{b.distanceNm} nm</strong> ({b.transitDays} days)
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>ETA: {b.etaDate}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Cargo & Containers:</span>
                    <strong style={{ color: '#fff' }}>{b.containerCount} Containers</strong> ({b.weightTeu} TEU)
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.cargoType}
                    </div>
                  </div>
                </div>

                {/* Bottom Bar with "Send Data" Action Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="Compass" size={12} color="var(--accent-cyan)" />
                    <span>Passage: <strong>{b.routePassages || b.routeCorridor}</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isTransmitted ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        color: 'var(--safe-teal)',
                        background: 'rgba(45, 212, 191, 0.1)',
                        padding: '4px 10px',
                        borderRadius: '4px'
                      }}>
                        <Icon name="CheckCircle2" size={13} />
                        <span>Data Transported: <strong>{transmission.portEdi?.ediTransmissionCode || 'PCS-VERIFIED'}</strong></span>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSendData(b.id)}
                        disabled={isTransmitting}
                        style={{
                          fontSize: '11.5px',
                          padding: '6px 14px',
                          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                          boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)'
                        }}
                      >
                        <Icon name={isTransmitting ? 'RefreshCw' : 'Send'} size={13} className={isTransmitting ? 'spinning' : ''} />
                        <span>{isTransmitting ? 'Transporting Data to Port & Carrier...' : 'Send Data (Transport to Port & Carrier)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
