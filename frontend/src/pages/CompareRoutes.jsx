// WAYPOINT — Route Comparison & Intelligence (Table 4 & Figure 2)
import React, { useState } from 'react';
import { WAYPOINT_DATA } from '../data/maritimeData';
import Icon from '../components/Icon';

export default function CompareRoutes({ onConfirmRoute, onBackToPlan }) {
  const routes = WAYPOINT_DATA.routeOptions;
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [confirmModalRoute, setConfirmModalRoute] = useState(null);

  return (
    <div>
      <div style={{
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: '4px' }}>
            Route Intelligence & Comparison
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Synthesized options for Mumbai (Nhava Sheva) → Singapore (Jurong) under active weather constraints.
          </p>
        </div>

        <button className="btn btn-outline" onClick={onBackToPlan}>
          <Icon name="ArrowLeftRight" size={14} />
          <span>Adjust Shipment Parameters</span>
        </button>
      </div>

      <div className="box box-note">
        <strong>OPERATOR GUIDANCE (ASD-STE100)</strong>
        Route A carries the Recommended status due to its optimal balance between bunker fuel burn, schedule predictability, and hazard avoidance. All alternatives remain active.
      </div>

      {/* 4 Route Option Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px',
        marginBottom: '22px'
      }}>
        {routes.map((r) => {
          const isRec = r.isRecommended;
          return (
            <div
              key={r.id}
              style={{
                background: 'var(--bg-surface)',
                border: `1.5px solid ${isRec ? 'var(--safe-teal)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: isRec ? '0 0 20px rgba(45, 212, 191, 0.12)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {isRec && (
                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                  <span className="tag tag-live">★ Recommended</span>
                </div>
              )}

              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', marginBottom: '12px', paddingRight: isRec ? '80px' : '0' }}>
                {r.name}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div style={{ background: 'var(--bg-surface-alt)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>EST. COST</div>
                  <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                    ${r.cost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '10px', color: r.budgetStatus === 'Within' ? 'var(--safe-teal)' : 'var(--hazard-red)' }}>
                    {r.budgetStatus} Budget
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface-alt)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TRANSIT TIME</div>
                  <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                    {r.transitDays} d
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {r.distanceNm} nm
                  </div>
                </div>
              </div>

              {/* Risk Score Index Bar */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Risk Score Index</span>
                  <span className="mono" style={{
                    fontWeight: 700,
                    color: r.riskScore < 25 ? 'var(--safe-teal)' : r.riskScore < 35 ? 'var(--caution-amber)' : 'var(--hazard-red)'
                  }}>
                    {r.riskScore}/100
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-surface-alt)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${r.riskScore}%`,
                    background: r.riskScore < 25 ? 'var(--safe-teal)' : r.riskScore < 35 ? 'var(--caution-amber)' : 'var(--hazard-red)',
                    borderRadius: '3px'
                  }} />
                </div>
              </div>

              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                En Route Hazards: <strong style={{ color: r.hazards === 0 ? 'var(--safe-teal)' : 'var(--caution-amber)' }}>{r.hazards} Active</strong>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm btn-full"
                  onClick={() => setSelectedBreakdown(r)}
                >
                  <Icon name="Eye" size={13} />
                  <span>Breakdown</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-full"
                  onClick={() => setConfirmModalRoute(r)}
                >
                  <Icon name="CheckCircle2" size={13} />
                  <span>Select Route</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Figure 2: Risk score by route SVG visualization */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>
            Figure 2. Comparative Risk Score by Route (Lower is Safer)
          </div>
          <span className="tag tag-demo">Scale: 6px / Risk Point</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <svg viewBox="0 0 640 250" role="img" style={{ maxWidth: '100%', height: 'auto', background: '#080E1A', borderRadius: '6px' }}>
            <rect width="640" height="250" fill="#080E1A" />
            <g fontFamily="Inter, sans-serif" fontSize="12" fill="#F8FAFC">
              <text x="16" y="34" fontWeight="700">Risk score comparison (ASD-STE100 standard)</text>
              
              <text x="16" y="76">Route A</text>
              <rect x="90" y="62" width="144" height="18" rx="4" fill="#2DD4BF" />
              <text x="242" y="76" fontFamily="JetBrains Mono" fontWeight="600">24 (Optimal)</text>

              <text x="16" y="116">Route B</text>
              <rect x="90" y="102" width="228" height="18" rx="4" fill="#FBBF24" />
              <text x="326" y="116" fontFamily="JetBrains Mono" fontWeight="600">38</text>

              <text x="16" y="156">Route C</text>
              <rect x="90" y="142" width="186" height="18" rx="4" fill="#FBBF24" />
              <text x="284" y="156" fontFamily="JetBrains Mono" fontWeight="600">31</text>

              <text x="16" y="196">Route D</text>
              <rect x="90" y="182" width="72" height="18" rx="4" fill="#2DD4BF" />
              <text x="170" y="196" fontFamily="JetBrains Mono" fontWeight="600">12 (Safest)</text>
            </g>
            <line x1="90" y1="50" x2="90" y2="214" stroke="#1E293B" strokeWidth="1.5" />
            <text x="16" y="236" fill="#94A3B8" fontSize="11" fontFamily="Inter, sans-serif">
              Bar length is 6 px per risk point. Route D delivers lowest oceanic swell exposure.
            </text>
          </svg>
        </div>
      </div>

      {/* Breakdown Modal */}
      {selectedBreakdown && (
        <div className="modal-overlay" onClick={() => setSelectedBreakdown(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{selectedBreakdown.name} — Cost & Risk Breakdown</div>
              <button className="modal-close" onClick={() => setSelectedBreakdown(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-surface-alt)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TOTAL CONTRACTED COST</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  ${selectedBreakdown.cost.toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-alt)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ESTIMATED TRANSIT TIME</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                  {selectedBreakdown.transitDays} Days
                </div>
              </div>
            </div>

            <div className="table-wrap" style={{ marginBottom: '14px' }}>
              <table className="data-table">
                <tbody>
                  <tr><td>Bunker Fuel Expense</td><td className="mono" style={{ textAlign: 'right' }}>{selectedBreakdown.breakdown.bunkerCost}</td></tr>
                  <tr><td>Canal & Port Tariffs</td><td className="mono" style={{ textAlign: 'right' }}>{selectedBreakdown.breakdown.canalAndPortFees}</td></tr>
                  <tr><td>Maritime Security & War Risk</td><td className="mono" style={{ textAlign: 'right' }}>{selectedBreakdown.breakdown.securityAndInsurance}</td></tr>
                  <tr><td>Cargo Stevedoring</td><td className="mono" style={{ textAlign: 'right' }}>{selectedBreakdown.breakdown.handling}</td></tr>
                  <tr><td>Estimated Carbon Emissions</td><td className="mono" style={{ textAlign: 'right' }}>{selectedBreakdown.breakdown.co2Emissions}</td></tr>
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              <strong>Waypoints:</strong> {selectedBreakdown.waypoints.join(' → ')}
            </div>

            <div className="box box-note" style={{ marginBottom: 0 }}>
              <strong>METEOROLOGICAL WINDOW</strong>
              {selectedBreakdown.breakdown.weatherWindow}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalRoute && (
        <div className="modal-overlay" onClick={() => setConfirmModalRoute(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Confirm Dispatch Booking</div>
              <button className="modal-close" onClick={() => setConfirmModalRoute(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginBottom: '14px' }}>
              You are dispatching cargo via <strong>{confirmModalRoute.name}</strong>. This record will synchronize directly to your Cloud Firestore portfolio.
            </p>

            <div className="table-wrap" style={{ marginBottom: '16px' }}>
              <table className="data-table">
                <tbody>
                  <tr><td>Contracted Rate</td><td className="mono" style={{ textAlign: 'right' }}>${confirmModalRoute.cost.toLocaleString()}</td></tr>
                  <tr><td>Estimated Transit</td><td className="mono" style={{ textAlign: 'right' }}>{confirmModalRoute.transitDays} Days</td></tr>
                  <tr><td>Risk Score</td><td className="mono" style={{ textAlign: 'right' }}>{confirmModalRoute.riskScore}/100</td></tr>
                  <tr><td>Active Sea Hazards</td><td className="mono" style={{ textAlign: 'right' }}>{confirmModalRoute.hazards}</td></tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setConfirmModalRoute(null)}>
                Cancel
              </button>
              <button className="btn btn-safe" onClick={() => {
                onConfirmRoute(confirmModalRoute);
                setConfirmModalRoute(null);
              }}>
                <Icon name="CheckCircle2" size={14} />
                <span>Confirm & Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
