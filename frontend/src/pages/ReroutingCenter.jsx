// WAYPOINT — Rerouting Center (Section 8 & Table 5)
import React, { useState } from 'react';
import { WAYPOINT_DATA } from '../data/maritimeData';
import Icon from '../components/Icon';

export default function ReroutingCenter({ onAcceptReroute, onNavigateToCompare, onNavigateToRiskMap }) {
  const sc = WAYPOINT_DATA.reroutingScenario;
  const [confirmModal, setConfirmModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleConfirm = () => {
    setConfirmModal(false);
    onAcceptReroute({
      scenario: sc.title,
      vessel: sc.affectedVessel,
      costDelta: sc.impactDelta.costChange,
      etaDelta: sc.impactDelta.etaChange,
      riskDelta: sc.impactDelta.riskChange
    });
    setStatusMessage('Alternative southern bypass accepted. Safe teal corridor broadcast to vessel master.');
  };

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
            Rerouting Center
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Dynamic avoidance algorithms and operational course recalculation for vessels en route.
          </p>
        </div>
        <span className="tag tag-crit">Active Disruption Simulation</span>
      </div>

      <div className="box box-warning">
        <strong>OPERATIONAL WARNING (ASD-STE100)</strong>
        This scenario represents a technical simulation. Do not transmit commands to active vessels without certified naval dispatch authorization.
      </div>

      {statusMessage && (
        <div className="box box-note" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="CheckCircle2" size={16} color="var(--safe-teal)" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Disruption Alert Banner */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(248, 113, 113, 0.15), rgba(16, 28, 51, 0.8))',
        border: '1px solid rgba(248, 113, 113, 0.35)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <Icon name="AlertTriangle" size={17} color="var(--hazard-red)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FECACA' }}>
              {sc.title} — Region: {sc.region}
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Direct hazard to <strong>{sc.affectedVessel}</strong> on route <strong>{sc.departure} → {sc.destination}</strong> carrying {sc.cargo}.
          </p>
        </div>
        <span className="tag tag-crit">{sc.severity} Severity</span>
      </div>

      {/* Figure 3 SVG Graphic from Manual */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '18px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>
            Figure 3. Original Route (Crossing Hazard) vs Alternative Route (Southern Bypass)
          </div>
          <span className="tag tag-live">Interactive Vector Topology</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <svg viewBox="0 0 640 260" role="img" style={{ maxWidth: '100%', height: 'auto', background: '#080E1A', borderRadius: '6px' }}>
            <defs>
              <marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0 0L8 4L0 8z" fill="#2DD4BF" />
              </marker>
              <marker id="ao" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0 0L8 4L0 8z" fill="#F87171" />
              </marker>
            </defs>
            <rect width="640" height="260" fill="#080E1A" />
            <ellipse cx="320" cy="112" rx="70" ry="42" fill="#F87171" fillOpacity=".22" stroke="#F87171" strokeDasharray="5 4" />
            <text x="320" y="116" textAnchor="middle" fill="#F87171" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="700">
              Hazard Zone (Cyclone ASANI Core)
            </text>
            <path d="M70 150 C 170 130, 240 112, 320 112 S 480 120, 570 100" fill="none" stroke="#F87171" strokeWidth="3" markerEnd="url(#ao)" />
            <path d="M70 150 C 150 215, 270 225, 360 200 S 520 150, 570 100" fill="none" stroke="#2DD4BF" strokeWidth="3" markerEnd="url(#ar)" />
            <circle cx="70" cy="150" r="7" fill="#38BDF8" />
            <circle cx="570" cy="100" r="7" fill="#38BDF8" />
            <g fontFamily="Inter, sans-serif" fontSize="12" fill="#F8FAFC">
              <text x="40" y="176">Mumbai (Nhava Sheva)</text>
              <text x="540" y="86">Singapore</text>
              <text x="200" y="232" fill="#2DD4BF" fontWeight="700">Alternative Bypass Route (Safe)</text>
              <text x="150" y="104" fill="#F87171" fontWeight="700">Original Track (Severe Hazard)</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Table 5: Route Impact Matrix */}
      <div className="table-wrap" style={{ marginBottom: '20px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Evaluation Parameter</th>
              <th style={{ textAlign: 'right' }}>Original Track</th>
              <th style={{ textAlign: 'right' }}>Alternative Bypass</th>
              <th style={{ textAlign: 'right' }}>Variance / Operational Delta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cost (USD)</td>
              <td className="mono" style={{ textAlign: 'right' }}>$18,400</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--safe-teal)', fontWeight: 700 }}>$19,250</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--caution-amber)' }}>{sc.impactDelta.costChange}</td>
            </tr>
            <tr>
              <td>Estimated Transit (ETA)</td>
              <td className="mono" style={{ textAlign: 'right' }}>12.5 days</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--safe-teal)', fontWeight: 700 }}>13.1 days</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--caution-amber)' }}>{sc.impactDelta.etaChange}</td>
            </tr>
            <tr>
              <td>Risk Index Score (/100)</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--hazard-red)', fontWeight: 700 }}>68 (Severe)</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--safe-teal)', fontWeight: 700 }}>19 (Safe)</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--safe-teal)', fontWeight: 700 }}>{sc.impactDelta.riskChange}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Decision Bar (Section 8.1) */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <button className="btn btn-safe" onClick={() => setConfirmModal(true)}>
          <Icon name="CheckCircle2" size={15} />
          <span>Accept Alternative Route</span>
        </button>
        <button className="btn btn-outline" onClick={() => setStatusMessage('Original route maintained. Master advised of wave height > 5m.')}>
          <Icon name="AlertTriangle" size={15} />
          <span>Keep Original Route</span>
        </button>
        <button className="btn btn-outline" onClick={onNavigateToCompare}>
          <Icon name="Scale" size={15} />
          <span>Compare Other Alternatives</span>
        </button>
        <button className="btn btn-outline" onClick={onNavigateToRiskMap}>
          <Icon name="Map" size={15} />
          <span>View Risk Factors</span>
        </button>
      </div>

      {/* Rerouting Audit History */}
      <div>
        <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
          Historical Avoidance Log
        </h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Decision ID</th>
                <th>Timestamp</th>
                <th>Vessel</th>
                <th>Route Adjustment</th>
                <th>Operational Justification</th>
                <th>Outcome Metric</th>
              </tr>
            </thead>
            <tbody>
              {sc.decisionHistory.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{h.id}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{h.timestamp}</td>
                  <td><strong>{h.vessel}</strong></td>
                  <td>{h.route}</td>
                  <td>{h.reason}</td>
                  <td style={{ color: 'var(--safe-teal)', fontWeight: 600 }}>{h.savings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Confirm Reroute Instruction</div>
              <button className="modal-close" onClick={() => setConfirmModal(false)}>
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="box box-warning">
              <strong>OPERATIONAL DISPATCH NOTIFICATION</strong>
              Accepting this recommendation instructs vessel MV Orient Mariner to alter waypoint trajectory south around Cyclone ASANI.
            </div>
            <div className="table-wrap" style={{ marginBottom: '16px' }}>
              <table className="data-table">
                <tbody>
                  <tr><td>New Schedule (ETA)</td><td className="mono" style={{ textAlign: 'right' }}>+0.6 days (13.1d total)</td></tr>
                  <tr><td>Incremental Bunker Cost</td><td className="mono" style={{ textAlign: 'right' }}>+$850 USD</td></tr>
                  <tr><td>Risk Abatement</td><td className="mono" style={{ textAlign: 'right', color: 'var(--safe-teal)', fontWeight: 700 }}>-49 Points (72% reduction)</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setConfirmModal(false)}>Cancel</button>
              <button className="btn btn-safe" onClick={handleConfirm}>
                <Icon name="CheckCircle2" size={14} />
                <span>Confirm & Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
