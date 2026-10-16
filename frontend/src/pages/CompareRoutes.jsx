// WAYPOINT — Route Comparison & Intelligence (Powered by CSV Dataset & Routing Algorithm)
import React, { useState, useEffect } from 'react';
import { synthesizeMaritimeRoutes } from '../services/routingAlgorithm';
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

  useEffect(() => {
    // Read from session storage or synthesize default corridor
    const stored = sessionStorage.getItem('waypoint_current_scenario');
    if (stored) {
      try {
        setScenario(JSON.parse(stored));
        return;
      } catch (e) {
        console.warn("Stored scenario parse error:", e);
      }
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
  }, []);

  if (!scenario) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Synthesizing multi-criteria maritime route corridors...
      </div>
    );
  }

  const { origin, destination, cargoType, vesselType, routes, matchedCarriers, draftWarning, draftFeasible } = scenario;

  const handleBookRoute = async (route) => {
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
      badge: 'Active'
    };

    const res = await saveRouteToCloud(routeRecord, userProfile?.uid);
    setConfirmModalRoute(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

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
            Cargo: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{cargoType}</span> • 
            Vessel: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{vesselType}</span> • 
            Great-Circle Distance: <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{scenario.realSeaDistanceNm} nm</span>
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

      {/* Draft feasibility banner */}
      {draftWarning ? (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(248, 113, 113, 0.12)',
          border: '1px solid var(--hazard-red)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#FECACA',
          fontSize: '12.5px'
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
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--safe-teal)',
          fontSize: '12px'
        }}>
          <Icon name="CheckCircle2" size={15} />
          <span>Draft Feasibility Verified: {origin.name} maximum draft ({origin.maxDraftM}m) accommodates {vesselType} permissible draft.</span>
        </div>
      )}

      {/* 4 Route Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px'
      }}>
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
                  position: 'absolute',
                  top: '-10px',
                  right: '14px',
                  background: 'var(--safe-teal)',
                  color: '#070D18',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  Recommended
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  {r.name}
                </span>
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
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
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
                  <Icon name="Info" size={13} />
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
                  {/* Cost Bar */}
                  <rect
                    x={xPos}
                    y={yPos}
                    width="44"
                    height={barHeight}
                    rx="4"
                    fill={isRec ? '#2DD4BF' : '#38BDF8'}
                    opacity={isRec ? 0.95 : 0.75}
                  />
                  <text
                    x={xPos + 22}
                    y={yPos - 6}
                    fill="#F8FAFC"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    ${(r.cost / 1000).toFixed(1)}k
                  </text>
                  <text
                    x={xPos + 22}
                    y="138"
                    fill="#94A3B8"
                    fontSize="11"
                    fontWeight="500"
                    fontFamily="Inter"
                    textAnchor="middle"
                  >
                    Route {r.id}
                  </text>
                  <text
                    x={xPos + 22}
                    y="152"
                    fill="#64748B"
                    fontSize="9.5"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
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

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '10px'
        }}>
          {matchedCarriers.map((c, i) => (
            <div
              key={i}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {c.company}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', textTransform: 'capitalize' }}>
                {c.category.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                Calls: {c.callType}
              </div>
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
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '12px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-sm)'
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
                <button className="btn btn-outline" onClick={() => setSelectedBreakdown(null)}>
                  Close
                </button>
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
              You are locking in <strong>{confirmModalRoute.name}</strong> for the voyage from <strong>{origin.name}</strong> to <strong>{destination.name}</strong>.
            </p>

            <div style={{
              padding: '12px 14px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px'
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
              <button className="btn btn-outline" onClick={() => setConfirmModalRoute(null)}>
                Cancel
              </button>
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
