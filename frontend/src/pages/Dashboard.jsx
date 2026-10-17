import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { WAYPOINT_DATA } from '../data/maritimeData';
import MarineMap from '../components/MarineMap';
import Icon from '../components/Icon';
import BookedSlotsQueue from './BookedSlotsQueue';

export default function Dashboard({ onNavigate, onOpenAlert }) {
  const { currentRole } = useAuth();
  const isShipper = currentRole === 'shipper';
  const kpis = WAYPOINT_DATA.dashboardKpis;
  const alerts = WAYPOINT_DATA.alerts.slice(0, 4);

  const [opsTab, setOpsTab] = useState('overview'); // 'overview' | 'queue'
  const [activeLayers, setActiveLayers] = useState({
    routes: true,
    vessels: true,
    hazards: true,
    ports: true,
    risks: false
  });

  const toggleLayer = (key) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: '4px' }}>
            {isShipper ? 'Shipment & Cargo Overview' : 'Maritime Operations Command'}
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            {isShipper
              ? 'Multi-lane dispatch tracking, synthesized route options, and active cargo status.'
              : 'Fleet corridor oversight, real-time meteorological hazard telemetry, and choke avoidance.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isShipper ? (
            <>
              <button
                className="btn btn-primary"
                onClick={() => onNavigate('mybookings')}
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
              >
                <Icon name="Bookmark" size={15} />
                <span>My Bookings</span>
              </button>
              <button className="btn btn-primary" onClick={() => onNavigate('tracking')} style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}>
                <Icon name="Radio" size={15} />
                <span>Live Cargo GPS</span>
              </button>
              <button className="btn btn-outline" onClick={() => onNavigate('plan')}>
                <Icon name="Package" size={15} />
                <span>Plan New Shipment</span>
              </button>
              <button className="btn btn-outline" onClick={() => onNavigate('saved')}>
                <Icon name="Bookmark" size={15} />
                <span>Saved Portfolios</span>
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn ${opsTab === 'queue' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setOpsTab(opsTab === 'queue' ? 'overview' : 'queue')}
                style={{
                  background: opsTab === 'queue' ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : undefined
                }}
              >
                <Icon name="Layers" size={15} />
                <span>{opsTab === 'queue' ? 'Return to Fleet Map' : 'Booked Slots Queue'}</span>
              </button>
              <button className="btn btn-primary" onClick={() => onNavigate('riskmap')}>
                <Icon name="Map" size={15} />
                <span>Full Risk Map</span>
              </button>
              <button className="btn btn-outline" onClick={() => onNavigate('rerouting')}>
                <Icon name="RefreshCw" size={15} />
                <span>Rerouting Center</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Manager Operations Command Tab Switcher */}
      {!isShipper && (
        <div style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '4px',
          borderRadius: '8px',
          width: 'fit-content',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setOpsTab('overview')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: opsTab === 'overview' ? 'var(--accent-cyan)' : 'transparent',
              color: opsTab === 'overview' ? '#070D18' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon name="Compass" size={13} />
            <span>Fleet Overview & Hazards</span>
          </button>

          <button
            onClick={() => setOpsTab('queue')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: opsTab === 'queue' ? 'var(--accent-cyan)' : 'transparent',
              color: opsTab === 'queue' ? '#070D18' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon name="Layers" size={13} />
            <span>Booked Slots Queue (Dispatch Command)</span>
          </button>
        </div>
      )}

      {/* If Manager selected Queue tab, display BookedSlotsQueue */}
      {!isShipper && opsTab === 'queue' ? (
        <BookedSlotsQueue onNavigate={onNavigate} />
      ) : (
        <>
          {/* Caution Callout */}
          <div className="box box-caution">
            <strong>OPERATIONAL DEMONSTRATION NOTICE</strong>
            All figures and route coordinates are demonstration values based on ASD-STE100 specifications. Do not execute as physical ship navigation instructions.
          </div>

      {/* 6 Key Figures (Table 3) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {kpis.map((k) => (
          <div
            key={k.id}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '13px 15px',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{k.label}</span>
              <span style={{ color: k.status === 'crit' ? 'var(--hazard-red)' : k.status === 'warn' ? 'var(--caution-amber)' : 'var(--safe-teal)' }}>
                <Icon name={k.iconName} size={15} />
              </span>
            </div>
            <div className="mono" style={{
              fontSize: '22px',
              fontWeight: 800,
              color: k.status === 'crit' ? 'var(--hazard-red)' : k.status === 'warn' ? 'var(--caution-amber)' : '#fff',
              lineHeight: 1.15,
              marginBottom: '4px'
            }}>
              {k.value}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{k.trend}</div>
          </div>
        ))}
      </div>

      {/* Map & Alerts Split Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '18px'
      }} className="dashboard-grid">
        {/* Map Container */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Layer Controls Toolbar */}
          <div style={{
            padding: '9px 14px',
            background: 'var(--bg-surface-alt)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="Compass" size={15} color="var(--accent-cyan)" />
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>Global Sea Corridors</span>
            </div>

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {[
                { key: 'routes', label: 'Routes' },
                { key: 'vessels', label: 'Vessels' },
                { key: 'hazards', label: 'Hazards' },
                { key: 'ports', label: 'Ports' },
                { key: 'risks', label: 'Risk Zones' }
              ].map((l) => (
                <button
                  key={l.key}
                  onClick={() => toggleLayer(l.key)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '20px',
                    fontSize: '10.5px',
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

          <MarineMap activeLayers={activeLayers} height="460px" />
        </div>

        {/* Active Risk Alerts Panel */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Icon name="ShieldAlert" size={16} color="var(--hazard-red)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Active Sea Alerts</span>
            </div>
            <span className="tag tag-crit">05 Critical</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', flex: 1, overflowY: 'auto' }}>
            {alerts.map((a) => (
              <div
                key={a.id}
                onClick={() => onOpenAlert(a)}
                style={{
                  background: 'var(--bg-surface-alt)',
                  borderLeft: `3px solid ${a.severityClass === 'crit' ? 'var(--hazard-red)' : 'var(--caution-amber)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 11px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{a.title}</span>
                  <span className={`tag tag-${a.severityClass}`}>{a.severity}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Region: {a.region}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.routesAffected}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            {isShipper ? (
              <button className="btn btn-outline btn-full btn-sm" onClick={() => onNavigate('plan')}>
                <Icon name="Package" size={13} />
                <span>Synthesize Safe Avoidance Route</span>
              </button>
            ) : (
              <button className="btn btn-outline btn-full btn-sm" onClick={() => onNavigate('rerouting')}>
                <Icon name="RefreshCw" size={13} />
                <span>Launch Rerouting Center</span>
              </button>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
