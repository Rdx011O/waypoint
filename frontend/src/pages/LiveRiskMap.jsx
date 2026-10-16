// WAYPOINT — Live Risk Map (Logistics Manager Cockpit)
import React, { useState } from 'react';
import { WAYPOINT_DATA } from '../data/maritimeData';
import MarineMap from '../components/MarineMap';
import Icon from '../components/Icon';

export default function LiveRiskMap({ onNavigateToReroute, onOpenAlert }) {
  const routes = WAYPOINT_DATA.routeOptions;
  const vessels = WAYPOINT_DATA.vessels;
  const alerts = WAYPOINT_DATA.alerts;

  const [activeLayers, setActiveLayers] = useState({
    routes: true,
    vessels: true,
    hazards: true,
    ports: true,
    risks: true
  });
  const [focusedRoute, setFocusedRoute] = useState('A');

  const toggleLayer = (key) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div style={{
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: '4px' }}>
            Live Risk Map
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            High-fidelity oceanic layer monitoring weather hazards, AIS vessel telemetry, and regional choke-points.
          </p>
        </div>

        {/* Layer Toggles */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'routes', label: 'Routes' },
            { key: 'vessels', label: `Fleet (${vessels.length})` },
            { key: 'hazards', label: `Hazards (${alerts.length})` },
            { key: 'ports', label: 'Ports' },
            { key: 'risks', label: 'Storm Core' }
          ].map((l) => (
            <button
              key={l.key}
              onClick={() => toggleLayer(l.key)}
              style={{
                padding: '4px 9px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeLayers[l.key] ? 'var(--accent-cyan)' : 'var(--border-strong)',
                background: activeLayers[l.key] ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
                color: activeLayers[l.key] ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="box box-note">
        <strong>OPERATOR NOTICE (ASD-STE100)</strong>
        The map distinguishes forecast weather hazards from observed sea telemetry. Select any route or hazard circle to review mitigation guidelines.
      </div>

      {/* 3-Column Cockpit Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '270px 1fr 290px',
        gap: '16px',
        alignItems: 'start'
      }} className="live-risk-grid">
        {/* Left: Route Explorer & Fleet */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          maxHeight: '620px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Icon name="Compass" size={15} color="var(--accent-cyan)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Route Corridors</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' }}>
            {routes.map((r) => (
              <div
                key={r.id}
                onClick={() => setFocusedRoute(r.id)}
                style={{
                  background: focusedRoute === r.id ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-surface-alt)',
                  border: `1px solid ${focusedRoute === r.id ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 11px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{r.name}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  Risk: {r.riskScore}/100 • {r.transitDays}d • ${r.cost.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Icon name="Ship" size={15} color="var(--safe-teal)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Active Fleet</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {vessels.map((v) => (
              <div
                key={v.id}
                style={{
                  background: 'var(--bg-surface-alt)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  fontSize: '11px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{v.name}</span>
                  <span className={`tag tag-${v.status === 'On Track' ? 'live' : v.status === 'Rerouting' ? 'crit' : 'warn'}`}>
                    {v.status}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                  {v.type} • {v.speed} • Dest: {v.dest}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Leaflet Marine Map */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden'
        }}>
          <MarineMap
            height="620px"
            center={[12, 85]}
            zoom={4}
            activeLayers={activeLayers}
            focusedRouteId={focusedRoute}
          />
        </div>

        {/* Right: Risk Intelligence Panel */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '620px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <Icon name="ShieldAlert" size={16} color="var(--hazard-red)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Risk Intelligence</span>
          </div>

          <div style={{
            background: 'var(--bg-surface-alt)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '14px'
          }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OVERALL CORRIDOR RISK</div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--caution-amber)', margin: '2px 0' }}>
              34 <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ 100</span>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--caution-amber)' }}>
              Elevated due to Bay of Bengal cyclone envelope.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Hazards:</span>
              <strong style={{ color: 'var(--hazard-red)' }}>5 Monitored</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Severe Choke Point:</span>
              <strong style={{ color: 'var(--hazard-red)' }}>Cyclone ASANI (55kts)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Affected Corridors:</span>
              <span>Malacca Approach</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Est. Transit Delay:</span>
              <strong style={{ color: 'var(--caution-amber)' }}>+18 to 36 hours</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Telemetry Provider:</span>
              <span className="mono">Simulated SAT-AIS</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 'auto', padding: '10px' }}
            onClick={onNavigateToReroute}
          >
            <Icon name="RefreshCw" size={14} />
            <span>Launch Rerouting Center</span>
          </button>
        </div>
      </div>
    </div>
  );
}
