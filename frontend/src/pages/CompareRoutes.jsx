// WAYPOINT — Route Comparison & Intelligence (Powered by CSV Dataset & Routing Algorithm)
import React, { useState, useEffect } from 'react';
import { synthesizeMaritimeRoutes } from '../services/routingAlgorithm';
import { getVesselSchedulesForDate } from '../services/vesselScheduleService';
import { CSV_INDIAN_PORTS, CSV_FOREIGN_PORTS } from '../data/maritimeCsvData';
import { saveRouteToCloud } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function CompareRoutes({ onNavigate }) {
  const { userProfile } = useAuth();
  const [scenario, setScenario] = useState(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [confirmModalRoute, setConfirmModalRoute] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedVesselId, setSelectedVesselId] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);

  useEffect(() => {
    // Read from session storage or synthesize default corridor
    const stored = sessionStorage.getItem('waypoint_current_scenario');
    let parsed = null;
    if (stored) {
      try {
        parsed = JSON.parse(stored);
      } catch (e) {
        console.warn('Stored scenario parse error:', e);
      }
    }

    if (parsed && parsed.routes && parsed.routes.length > 0) {
      setScenario(parsed);
      // Restore schedule data from stored payload if available
      if (parsed.scheduleData) {
        setScheduleData(parsed.scheduleData);
        const preselected = parsed.selectedVessel;
        if (preselected) setSelectedVesselId(preselected.id);
      } else {
        // Re-derive schedule from stored params
        const sd = getVesselSchedulesForDate({
          originId: parsed.originId || 'EC14',
          destId: parsed.destId || 'FP02',
          departureDate: parsed.departureDate,
          cargoType: parsed.cargoType,
          vesselType: parsed.vesselType,
          weight: parsed.weight || 25000
        });
        setScheduleData(sd);
        if (parsed.selectedVessel) setSelectedVesselId(parsed.selectedVessel.id);
      }
      return;
    }

    // Default synthesis: Chennai -> Singapore
    const defaultOrigin = CSV_INDIAN_PORTS.find(p => p.portId === 'EC14') || CSV_INDIAN_PORTS[0];
    const defaultDest = CSV_FOREIGN_PORTS.find(p => p.portId === 'FP02') || CSV_FOREIGN_PORTS[0];
    const synth = synthesizeMaritimeRoutes({
      originPort: defaultOrigin,
      destPort: defaultDest,
      cargoType: 'Containers',
      vesselType: 'Panamax / Post-Panamax',
      benchmarkBudget: 25000
    });
    setScenario(synth);

    const sd = getVesselSchedulesForDate({
      originId: 'EC14',
      destId: 'FP02',
      departureDate: new Date().toISOString().split('T')[0],
      cargoType: 'Containers',
      vesselType: 'Panamax / Post-Panamax',
      weight: 25000
    });
    setScheduleData(sd);
  }, []);

  if (!scenario || !scenario.routes) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Synthesizing multi-criteria maritime route corridors...
      </div>
    );
  }

  const { origin, destination, cargoType, vesselType, routes, matchedCarriers, draftWarning } = scenario;

  const handleSelectVessel = (v) => {
    if (v.status === 'UNAVAILABLE') return;
    setSelectedVesselId(v.id);
    // Persist selection into session scenario
    const stored = sessionStorage.getItem('waypoint_current_scenario');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.selectedVessel = v;
        sessionStorage.setItem('waypoint_current_scenario', JSON.stringify(parsed));
        setScenario(prev => ({ ...prev, selectedVessel: v }));
      } catch (e) { /* ignore */ }
    }
  };

  const handleBookRoute = async (route) => {
    const chosenVessel = selectedVesselId
      ? scheduleData?.vessels?.find(v => v.id === selectedVesselId)
      : scenario.selectedVessel;

    const routeRecord = {
      name: `${origin.name} → ${destination.name} (${route.name})`,
      origin: origin.name,
      dest: destination.name,
      cargo: cargoType,
      cost: `$${route.cost.toLocaleString()}`,
      transit: `${route.transitDays} d`,
      risk: route.riskScore,
      distanceNm: route.distanceNm,
      lastSaved: new Date().toISOString().split('T')[0],
      badge: 'Active',
      vessel: chosenVessel ? chosenVessel.vesselName : null,
      carrier: chosenVessel ? chosenVessel.carrier : null,
      departureDate: scenario.departureDate || null,
      departureTime: chosenVessel ? chosenVessel.departureTime : null
    };

    await saveRouteToCloud(routeRecord, userProfile?.uid);
    setConfirmModalRoute(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const selectedVessel = selectedVesselId
    ? scheduleData?.vessels?.find(v => v.id === selectedVesselId) || scenario.selectedVessel
    : scenario.selectedVessel;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--accent-cyan)',
            fontWeight: 700,
            marginBottom: '4px'
          }}>
            Multi-Criteria Route Evaluation
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            {origin.name} → {destination.name}
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Cargo: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{cargoType}</span> •{' '}
            Vessel: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{vesselType}</span> •{' '}
            Great-Circle Distance: <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{scenario.realSeaDistanceNm} nm</span>
            {scenario.departureDate && (
              <> • Departure: <span className="mono" style={{ color: 'var(--safe-teal)' }}>{scenario.departureDate}</span></>
            )}
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => onNavigate && onNavigate('plan')}
        >
          <Icon name="ArrowLeftRight" size={14} />
          <span>Adjust Shipment Parameters</span>
        </button>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(45, 212, 191, 0.12)',
          border: '1px solid var(--safe-teal)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--safe-teal)',
          fontSize: '13px'
        }}>
          <Icon name="CheckCircle2" size={18} />
          <span>Route successfully booked and committed to Cloud Portfolio (Firestore).</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — Available Ships on Port for Selected Date
          ═══════════════════════════════════════════════════════════ */}
      {scheduleData && scheduleData.vessels && scheduleData.vessels.length > 0 && (
        <div className="card" style={{ padding: '20px', border: '1px solid var(--accent-cyan)' }}>
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="Calendar" size={16} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Available Ships at {origin.name}
                </h3>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Scheduled port calls for{' '}
                <strong style={{ color: 'var(--accent-cyan)' }}>{scheduleData.formattedDate}</strong>
                {' '}• {scheduleData.summary.availableCount} available, {scheduleData.summary.limitedCount} limited, {scheduleData.summary.fullCount} fully booked
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Instant Availability Badge */}
              <span className={`badge ${
                scheduleData.availabilityMessage.type === 'success' ? 'badge-teal'
                : scheduleData.availabilityMessage.type === 'warning' ? 'badge-amber'
                : 'badge-red'
              }`} style={{ fontSize: '11px' }}>
                {scheduleData.availabilityMessage.type === 'success' ? '✓' : scheduleData.availabilityMessage.type === 'warning' ? '⚠' : '✕'}{' '}
                {scheduleData.availabilityMessage.title}
              </span>
            </div>
          </div>

          {/* Instant Availability Message */}
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: scheduleData.availabilityMessage.type === 'success'
              ? 'rgba(45, 212, 191, 0.10)'
              : scheduleData.availabilityMessage.type === 'warning'
                ? 'rgba(251, 191, 36, 0.10)'
                : 'rgba(248, 113, 113, 0.10)',
            border: `1px solid ${
              scheduleData.availabilityMessage.type === 'success' ? 'rgba(45,212,191,0.3)'
              : scheduleData.availabilityMessage.type === 'warning' ? 'rgba(251,191,36,0.3)'
              : 'rgba(248,113,113,0.3)'
            }`,
            marginBottom: '14px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <Icon
              name={scheduleData.availabilityMessage.type === 'success' ? 'CheckCircle2' : 'AlertTriangle'}
              size={15}
              color={
                scheduleData.availabilityMessage.type === 'success' ? 'var(--safe-teal)'
                : scheduleData.availabilityMessage.type === 'warning' ? 'var(--warn-amber)'
                : 'var(--hazard-red)'
              }
            />
            <span style={{ lineHeight: 1.5 }}>{scheduleData.availabilityMessage.text}</span>
          </div>

          {/* Vessel Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px'
          }}>
            {scheduleData.vessels.map((v) => {
              const isSelected = selectedVesselId === v.id;
              const isAvail = v.status === 'AVAILABLE';
              const isLimited = v.status === 'LIMITED';
              const isFull = v.status === 'UNAVAILABLE';

              return (
                <div
                  key={v.id}
                  onClick={() => handleSelectVessel(v)}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected
                      ? 'rgba(56, 189, 248, 0.12)'
                      : isFull
                        ? 'rgba(30, 41, 59, 0.4)'
                        : 'var(--bg-surface-alt)',
                    border: `1.5px solid ${
                      isSelected ? 'var(--accent-cyan)'
                      : isFull ? 'rgba(239,68,68,0.25)'
                      : 'var(--border-subtle)'
                    }`,
                    cursor: isFull ? 'not-allowed' : 'pointer',
                    opacity: isFull ? 0.7 : 1,
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Vessel Name + Availability Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isSelected && <Icon name="Check" size={14} color="var(--accent-cyan)" />}
                        <span>{v.vesselName}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>{v.carrier}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{v.imoNumber} • {v.vesselType}</div>
                    </div>
                    <span className={`badge ${isAvail ? 'badge-teal' : isLimited ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                      {isAvail ? '✓ Available' : isLimited ? '⚠ Limited' : '✕ Full'}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px 10px',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>Departure</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="Clock" size={11} color="var(--accent-cyan)" />
                        {v.departureTime}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>Transit</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v.transitDays}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>Rate</div>
                      <div style={{ fontWeight: 700, color: 'var(--safe-teal)' }}>
                        ${v.pricing.ratePerUnitUsd.toLocaleString()} {v.pricing.rateUnit}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>Est. Total</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        ${v.pricing.estimatedTotalUsd.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>Capacity Remaining</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${v.capacity.percentRemaining}%`,
                            height: '100%',
                            background: v.capacity.percentRemaining > 20 ? 'var(--safe-teal)' : v.capacity.percentRemaining > 0 ? 'var(--warn-amber)' : 'var(--hazard-red)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {v.capacity.available} / {v.capacity.total}
                        </span>
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>Route Corridor</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{v.routeCorridor}</div>
                    </div>
                  </div>

                  {/* Status Note */}
                  <div style={{ fontSize: '10.5px', color: isAvail ? 'var(--safe-teal)' : isLimited ? 'var(--warn-amber)' : 'var(--hazard-red)' }}>
                    {v.statusNote}
                  </div>

                  {!isFull && (
                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '11px', padding: '5px 10px' }}
                      onClick={(e) => { e.stopPropagation(); handleSelectVessel(v); }}
                    >
                      <Icon name={isSelected ? 'Check' : 'Compass'} size={12} />
                      <span>{isSelected ? 'Selected for Booking' : 'Select This Ship'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmed Vessel & Scheduled Departure Callout */}
      {selectedVessel && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid var(--accent-cyan)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Icon name="Ship" size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.05em' }}>
                Confirmed Vessel Allocation & Scheduled Call
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                {selectedVessel.vesselName}{' '}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>({selectedVessel.imoNumber})</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Carrier: <strong style={{ color: 'var(--text-primary)' }}>{selectedVessel.carrier}</strong>
                {' '}• Departure:{' '}
                <strong style={{ color: 'var(--accent-cyan)' }}>
                  {scenario.departureDate} at {selectedVessel.departureTime}
                </strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right', fontSize: '11px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Corridor Assigned:</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedVessel.routeCorridor}</div>
            </div>
            <span className="badge badge-teal">
              ✓ Space Locked ({selectedVessel.capacity?.available || 'Confirmed'})
            </span>
          </div>
        </div>
      )}

      {/* Draft feasibility banner */}
      {draftWarning ? (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(248, 113, 113, 0.12)',
          border: '1px solid var(--hazard-red)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', gap: '12px',
          color: '#FECACA', fontSize: '12.5px'
        }}>
          <Icon name="AlertTriangle" size={18} color="var(--hazard-red)" />
          <div>{draftWarning}</div>
        </div>
      ) : (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(45, 212, 191, 0.08)',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', gap: '10px',
          color: 'var(--safe-teal)', fontSize: '12px'
        }}>
          <Icon name="CheckCircle2" size={15} />
          <span>Draft Feasibility Verified: {origin.name} maximum draft ({origin.maxDraftM}m) accommodates {vesselType} permissible draft.</span>
        </div>
      )}

      {/* 4 Route Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {routes.map((r) => {
          const isRec = r.isRecommended;
          return (
            <div
              key={r.id}
              className="card"
              style={{
                border: `1.5px solid ${isRec ? 'var(--safe-teal)' : 'var(--border-subtle)'}`,
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                background: isRec ? 'rgba(16, 28, 51, 0.95)' : 'var(--bg-surface)'
              }}
            >
              {isRec && (
                <div style={{
                  position: 'absolute', top: '-10px', right: '14px',
                  background: 'var(--safe-teal)', color: '#070D18',
                  padding: '2px 8px', borderRadius: '12px',
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase'
                }}>
                  Recommended
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{r.name}</span>
                <span className={`badge ${r.badgeColor === 'teal' ? 'badge-teal' : 'badge-amber'}`}>
                  Risk {r.riskScore}/100
                </span>
              </div>

              {/* Cost & Transit Figures */}
              <div style={{ margin: '12px 0 16px' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  ${r.cost.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Estimated total voyage spend ({r.budgetStatus} budget)
                </div>
              </div>

              {/* Specs */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
                padding: '10px 0',
                borderTop: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '11.5px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Transit: </span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.transitDays} days</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Distance: </span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.distanceNm} nm</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Hazards: </span>
                  <span style={{ fontWeight: 600, color: r.hazards > 0 ? 'var(--caution-amber)' : 'var(--safe-teal)' }}>
                    {r.hazards} detected
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Fuel Burn: </span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.breakdown.co2Emissions}</span>
                </div>
              </div>

              {/* Waypoint snippet */}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '12px 0' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Routing Track:</div>
                <div style={{ lineHeight: '1.4' }}>
                  {r.waypoints.slice(0, 3).join(' → ')}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => setSelectedBreakdown(r)}
                >
                  <Icon name="Scale" size={13} />
                  <span>Breakdown</span>
                </button>
                <button
                  className={`btn ${isRec ? 'btn-primary' : 'btn-safe'} btn-sm`}
                  style={{ flex: 1 }}
                  onClick={() => setConfirmModalRoute(r)}
                >
                  <Icon name="Check" size={13} />
                  <span>Select Route</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Figure 2: Visual Cost & Transit Trade-off Chart */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Figure 2: Route Cost & Transit Trade-off Comparison
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Normalized against benchmark budget and safe voyage thresholds
            </p>
          </div>
          <span className="badge badge-teal">ASD-STE100 Spec</span>
        </div>

        {/* SVG Bar Chart */}
        <div style={{ width: '100%', height: '160px', position: 'relative' }}>
          <svg width="100%" height="160" viewBox="0 0 700 160" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="60" y1="20" x2="680" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="60" y1="70" x2="680" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="60" y1="120" x2="680" y2="120" stroke="rgba(255,255,255,0.08)" />
            {/* Benchmark Budget Line */}
            <line x1="60" y1="50" x2="680" y2="50" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="5" />
            <text x="682" y="53" fill="#F59E0B" fontSize="9.5" fontFamily="Inter" textAnchor="end">Benchmark Cap</text>
            {/* Bars for 4 routes */}
            {routes.map((r, idx) => {
              const xPos = 100 + idx * 145;
              const maxCost = Math.max(...routes.map(rt => rt.cost));
              const barHeight = (r.cost / (maxCost * 1.15)) * 100;
              const yPos = 120 - barHeight;
              const isRec = r.isRecommended;
              return (
                <g key={r.id}>
                  <rect x={xPos} y={yPos} width="44" height={barHeight} rx="4"
                    fill={isRec ? '#2DD4BF' : '#38BDF8'} opacity={isRec ? 0.95 : 0.75} />
                  <text x={xPos + 22} y={yPos - 6} fill="#F8FAFC" fontSize="10" fontWeight="600"
                    fontFamily="JetBrains Mono" textAnchor="middle">
                    ${(r.cost / 1000).toFixed(1)}k
                  </text>
                  <text x={xPos + 22} y="138" fill="#94A3B8" fontSize="11" fontWeight="500"
                    fontFamily="Inter" textAnchor="middle">
                    Route {r.id}
                  </text>
                  <text x={xPos + 22} y="152" fill="#64748B" fontSize="9.5"
                    fontFamily="JetBrains Mono" textAnchor="middle">
                    {r.transitDays}d
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Matched Carriers Section from shipping_lines_by_port.csv */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Verified Carrier Services at {origin.name}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Extracted from <code>shipping_lines_by_port.csv</code> for cargo category "{cargoType}"
            </p>
          </div>
          <span className="badge badge-teal">
            {matchedCarriers.length} Carriers Available
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {matchedCarriers.map((c, i) => (
            <div
              key={i}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.company}</div>
              <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', textTransform: 'capitalize' }}>
                {c.category.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Calls: {c.callType}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown Modal */}
      {selectedBreakdown && (
        <div className="modal-overlay" onClick={() => setSelectedBreakdown(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedBreakdown.name}</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Detailed Cost & Environmental Dissection
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedBreakdown(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                padding: '12px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bunker Fuel Cost</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {selectedBreakdown.breakdown.bunkerCost}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Canal & Port Surcharges</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {selectedBreakdown.breakdown.canalAndPortFees}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Maritime Security & Insurance</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {selectedBreakdown.breakdown.securityAndInsurance}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CO2 GHG Footprint</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--safe-teal)', fontFamily: 'var(--font-mono)' }}>
                    {selectedBreakdown.breakdown.co2Emissions}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Hydrographic & Weather Window
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {selectedBreakdown.breakdown.weatherWindow}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Planned Waypoint Sequence
                </div>
                <ol style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {selectedBreakdown.waypoints.map((wp, idx) => (
                    <li key={idx}>{wp}</li>
                  ))}
                </ol>
              </div>

              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setSelectedBreakdown(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalRoute && (
        <div className="modal-overlay" onClick={() => setConfirmModalRoute(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Route Selection</h3>
              <button className="modal-close" onClick={() => setConfirmModalRoute(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px' }}>
              You are locking in <strong>{confirmModalRoute.name}</strong> for the voyage from{' '}
              <strong>{origin.name}</strong> to <strong>{destination.name}</strong>.
              {selectedVessel && (
                <> The allocated vessel is <strong>{selectedVessel.vesselName}</strong> ({selectedVessel.carrier}),
                  departing <strong>{scenario.departureDate} at {selectedVessel.departureTime}</strong>.</>
              )}
            </p>

            <div style={{
              padding: '12px 14px', background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-sm)', marginBottom: '20px',
              display: 'flex', justifyContent: 'space-between', fontSize: '12px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Cost: </span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${confirmModalRoute.cost.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Transit ETA: </span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{confirmModalRoute.transitDays} days</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setConfirmModalRoute(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleBookRoute(confirmModalRoute)}>
                <Icon name="Check" size={14} />
                <span>Save to Cloud Portfolio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
