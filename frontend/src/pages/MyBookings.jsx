// WAYPOINT — My Bookings (Shipper Operations Cockpit)
// Displays complete manifest details, slot reservations, and EDI data transport receipts.

import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { fetchBookings } from '../services/bookingService';

export default function MyBookings({ onNavigate }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchBookings();
      setBookings(data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = bookings.filter(b => {
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = b.id.toLowerCase().includes(q);
      const matchVessel = b.vesselName?.toLowerCase().includes(q);
      const matchPort = b.destinationPort?.toLowerCase().includes(q) || b.originPort?.toLowerCase().includes(q);
      const matchCarrier = b.carrier?.toLowerCase().includes(q);
      if (!matchId && !matchVessel && !matchPort && !matchCarrier) return false;
    }
    return true;
  });

  const totalBookings = bookings.length;
  const queuedCount = bookings.filter(b => b.status === 'QUEUED').length;
  const transmittedCount = bookings.filter(b => b.status === 'TRANSMITTED').length;
  const totalSpend = bookings.reduce((sum, b) => sum + (Number(b.costUsd) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
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
            <Icon name="Bookmark" size={13} />
            Shipper Operations Cockpit
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            My Slot Bookings & Manifests
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Persistent booking database with live slot confirmations, customs status, and EDI port/carrier transmission receipts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={loadData}>
            <Icon name="RefreshCw" size={14} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate && onNavigate('plan')}>
            <Icon name="Package" size={14} />
            <span>Plan New Shipment</span>
          </button>
          <button className="btn btn-safe" onClick={() => onNavigate && onNavigate('tracking')}>
            <Icon name="Radio" size={14} />
            <span>Cargo GPS Live</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        <div className="card" style={{ padding: '14px 18px', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Total Confirmed Bookings</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalBookings}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
            Active across sea lanes
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Queued for Dispatch</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--caution-amber)', marginTop: '4px' }}>
            {queuedCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Awaiting port transmission
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Transmitted to Port & Carrier</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--safe-teal)', marginTop: '4px' }}>
            {transmittedCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--safe-teal)', marginTop: '2px' }}>
            EDI confirmed & locked
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Committed Voyage Spend</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            ${totalSpend.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Current dispatch cycle
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Booking ID, Vessel, Port, Carrier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '12.5px', width: '100%' }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Icon name="Search" size={14} />
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Status:</span>
          {['ALL', 'QUEUED', 'TRANSMITTED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`btn btn-xs ${filterStatus === st ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              {st === 'ALL' && 'All Bookings'}
              {st === 'QUEUED' && `Queued (${queuedCount})`}
              {st === 'TRANSMITTED' && `Transmitted (${transmittedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ marginBottom: '8px' }}><Icon name="RefreshCw" size={20} className="spinning" /></div>
          Synchronizing booking records with maritime operations database...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: '0 0 6px' }}>No Bookings Found</h3>
          <p style={{ fontSize: '12px', margin: '0 0 16px' }}>
            {searchQuery ? 'No bookings match your search query.' : 'You have not booked any shipments yet.'}
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate && onNavigate('compare')}>
            <Icon name="Scale" size={14} />
            <span>Compare Routes & Select Ship</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(b => {
            const isTransmitted = b.status === 'TRANSMITTED';
            const transmission = b.transmission || {};

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: '18px 20px',
                  background: 'var(--bg-surface)',
                  border: isTransmitted ? '1px solid rgba(45, 212, 191, 0.3)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Top Reference & Status Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '12px',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      padding: '4px 10px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>{b.id}</span>
                      <button
                        onClick={() => copyToClipboard(b.id, b.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent-cyan)' }}
                        title="Copy Reference ID"
                      >
                        <Icon name={copiedId === b.id ? 'Check' : 'FileDown'} size={12} />
                      </button>
                    </div>

                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Booked on {new Date(b.bookedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isTransmitted ? (
                      <span className="badge badge-teal" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px' }}>
                        <Icon name="ShieldCheck" size={13} />
                        <span>Transmitted to Port & Shipping Line</span>
                      </span>
                    ) : (
                      <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px' }}>
                        <Icon name="Clock" size={13} />
                        <span>Queued in Logistics Dispatch</span>
                      </span>
                    )}

                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                      ${(Number(b.costUsd) || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Main Manifest Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  {/* Column 1: Voyage Corridor & Ports */}
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Voyage Corridor
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{b.originPort}</span>
                      <Icon name="ArrowLeftRight" size={12} color="var(--accent-cyan)" />
                      <span>{b.destinationPort}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Departure: <strong style={{ color: 'var(--accent-cyan)' }}>{b.departureDate} at {b.departureTime}</strong>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Estimated Arrival: <strong style={{ color: 'var(--text-primary)' }}>{b.etaDate} at {b.etaTime}</strong>
                    </div>
                  </div>

                  {/* Column 2: Allocated Vessel & Carrier */}
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Allocated Vessel & Line
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="Ship" size={14} color="var(--accent-cyan)" />
                      <span>{b.vesselName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>({b.imoNumber})</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Carrier: <strong style={{ color: 'var(--text-primary)' }}>{b.carrier}</strong>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Class: <span>{b.vesselType}</span>
                    </div>
                  </div>

                  {/* Column 3: Cargo & Container Manifest */}
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Cargo Manifest
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {b.cargoType}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '12px' }}>
                      <span>Containers: <strong style={{ color: 'var(--accent-cyan)' }}>{b.containerCount} Units</strong></span>
                      <span>Weight: <strong style={{ color: 'var(--text-primary)' }}>{b.weightTeu} TEU</strong></span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Distance: <span className="mono">{b.distanceNm} nm</span> ({b.transitDays} days transit)
                    </div>
                  </div>
                </div>

                {/* ─── Port Authority & Shipping Line EDI Transport Receipt ─── */}
                {isTransmitted && transmission.portEdi && transmission.carrierEdi ? (
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(45, 212, 191, 0.08)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      borderBottom: '1px solid rgba(45, 212, 191, 0.2)',
                      paddingBottom: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--safe-teal)', fontSize: '12px', fontWeight: 700 }}>
                        <Icon name="ShieldCheck" size={15} />
                        <span>Port Authority & Shipping Line Transmission Verified</span>
                      </div>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Transmitted: {new Date(transmission.sentAt).toUTCString()}
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '14px',
                      fontSize: '11.5px'
                    }}>
                      {/* Port Authority EDI Box */}
                      <div style={{ background: 'rgba(7, 13, 24, 0.5)', padding: '8px 12px', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '4px' }}>
                          🏛️ Port Authority Community System (PCS)
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          EDI Token: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{transmission.portEdi.ediTransmissionCode}</strong>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Berth Clearance: <strong style={{ color: 'var(--safe-teal)' }}>{transmission.portEdi.berthClearanceStatus}</strong>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Customs Code: <span style={{ fontFamily: 'monospace' }}>{transmission.portEdi.customsExportEntryNumber}</span>
                        </div>
                      </div>

                      {/* Shipping Line Carrier EDI Box */}
                      <div style={{ background: 'rgba(7, 13, 24, 0.5)', padding: '8px 12px', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--safe-teal)', fontWeight: 700, marginBottom: '4px' }}>
                          🚢 {b.carrier} Fleet EDIFACT
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          Carrier BKG Ref: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{transmission.carrierEdi.carrierBookingConfirmationCode}</strong>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Stowage Bay: <strong style={{ color: 'var(--accent-cyan)' }}>{transmission.carrierEdi.stowagePosition}</strong>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Slot Allocation: <span style={{ color: 'var(--safe-teal)' }}>{transmission.carrierEdi.slotReservationStatus}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11.5px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warn-amber)' }}>
                      <Icon name="Clock" size={14} />
                      <span>Slot locked in local operations database. Waiting for Logistics Command to send electronic data to Port Authorities & Carrier.</span>
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Status: In Dispatch Queue</span>
                  </div>
                )}

                {/* Bottom Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Corridor: <strong>{b.routeCorridor}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => setSelectedBooking(b)}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      <Icon name="Eye" size={12} />
                      <span>View Full Details</span>
                    </button>

                    <button
                      className="btn btn-primary btn-xs"
                      onClick={() => onNavigate && onNavigate('tracking')}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      <Icon name="Radio" size={12} />
                      <span>Track in Cargo GPS</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="Package" size={18} color="var(--accent-cyan)" />
                <span>Booking Manifest Details ({selectedBooking.id})</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedBooking(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '6px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Shipper Name:</span>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{selectedBooking.shipperName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Booking Status:</span>
                  <div style={{ fontWeight: 700, color: selectedBooking.status === 'TRANSMITTED' ? 'var(--safe-teal)' : 'var(--warn-amber)' }}>
                    {selectedBooking.status}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Vessel & Line:</span>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{selectedBooking.vesselName} ({selectedBooking.carrier})</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Scheduled Departure:</span>
                  <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{selectedBooking.departureDate} at {selectedBooking.departureTime}</div>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Route Waypoints & Navigation Passages:</span>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {selectedBooking.routePassages || selectedBooking.routeCorridor}
                </div>
              </div>

              {selectedBooking.notes && (
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Shipper Notes & Instructions:</span>
                  <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {selectedBooking.notes}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-outline" onClick={() => setSelectedBooking(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => { setSelectedBooking(null); onNavigate && onNavigate('tracking'); }}>
                  <Icon name="Radio" size={13} />
                  <span>Open in Cargo Tracking</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
