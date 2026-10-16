// WAYPOINT — Alerts Center (Section 9 & Table 6)
import React, { useState } from 'react';
import { WAYPOINT_DATA } from '../data/maritimeData';
import Icon from '../components/Icon';

export default function AlertsCenter({ onNavigateToRiskMap }) {
  const [alerts, setAlerts] = useState(WAYPOINT_DATA.alerts);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [sevFilter, setSevFilter] = useState('all');
  const [regFilter, setRegFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = alerts.filter(a => {
    if (sevFilter !== 'all' && a.severity !== sevFilter) return false;
    if (regFilter !== 'all' && !a.region.includes(regFilter)) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const markReviewed = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Reviewed' } : a));
    setSelectedAlert(null);
  };

  return (
    <div>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: '4px' }}>
          Alerts Center
        </h1>
        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Active meteorological advisories, navigational choke-points, and port queue notifications.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Active Alerts</div>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '3px 0' }}>05</div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Across global sea corridors</div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(248, 113, 113, 0.35)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--hazard-red)', textTransform: 'uppercase' }}>Critical Hazards</div>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--hazard-red)', margin: '3px 0' }}>02</div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Immediate evasion required</div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(251, 191, 36, 0.35)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--caution-amber)', textTransform: 'uppercase' }}>High Severity</div>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--caution-amber)', margin: '3px 0' }}>01</div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Continuous radar tracking</div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Routes Affected</div>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-cyan)', margin: '3px 0' }}>04</div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Corridors flagged for review</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <select className="select-input" style={{ width: 'auto' }} value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
          <option value="all">All Severities</option>
          <option value="Critical">Critical Severity</option>
          <option value="High">High Severity</option>
          <option value="Medium">Medium Severity</option>
          <option value="Low">Low / Advisory</option>
        </select>

        <select className="select-input" style={{ width: 'auto' }} value={regFilter} onChange={(e) => setRegFilter(e.target.value)}>
          <option value="all">All Oceanic Basins</option>
          <option value="Arabian Sea">Arabian Sea</option>
          <option value="Bay of Bengal">Bay of Bengal</option>
          <option value="Indian Ocean">Western Indian Ocean</option>
          <option value="Singapore">Singapore / Malacca</option>
        </select>

        <select className="select-input" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Reviewed">Reviewed</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Alert Title</th>
              <th>Oceanic Region</th>
              <th>Severity</th>
              <th>Category</th>
              <th>Timestamp</th>
              <th>Affected Corridors</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.title}</strong></td>
                <td>{a.region}</td>
                <td>
                  <span className={`tag tag-${a.severityClass}`}>{a.severity}</span>
                </td>
                <td>{a.type}</td>
                <td className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.date}</td>
                <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{a.routesAffected}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setSelectedAlert(a)}>
                    <Icon name="Eye" size={13} />
                    <span>Review</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-over Detail Drawer */}
      {selectedAlert && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600 }}>
          <div
            onClick={() => setSelectedAlert(null)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
          />
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            maxWidth: '430px',
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-strong)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 40px rgba(0,0,0,0.7)',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className={`tag tag-${selectedAlert.severityClass}`}>{selectedAlert.severity} Severity</span>
                <span className="tag tag-demo">{selectedAlert.type}</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedAlert(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>

            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
              {selectedAlert.title}
            </h2>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Region: {selectedAlert.region} • Area Radius: {selectedAlert.area}
            </div>

            <div className="box box-warning">
              <strong>METEOROLOGICAL INTELLIGENCE</strong>
              {selectedAlert.description}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Recommended Navigational Mitigation
              </div>
              <div style={{
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--border-subtle)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12.5px',
                lineHeight: 1.5
              }}>
                {selectedAlert.action}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Active Corridors Affected: <strong>{selectedAlert.routesAffected}</strong><br />
              Forecast Duration: <strong>{selectedAlert.duration}</strong>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button
                className="btn btn-outline btn-full"
                onClick={() => {
                  setSelectedAlert(null);
                  onNavigateToRiskMap();
                }}
              >
                <Icon name="Map" size={14} />
                <span>View on Map</span>
              </button>
              <button
                className="btn btn-safe btn-full"
                onClick={() => markReviewed(selectedAlert.id)}
              >
                <Icon name="CheckCircle2" size={14} />
                <span>Mark as Reviewed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
