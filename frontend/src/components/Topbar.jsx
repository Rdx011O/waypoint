// WAYPOINT — Topbar Component
import React from 'react';
import Icon from './Icon';

export default function Topbar({ currentPage, onNavigate, onToggleMobile, alertCount = 5 }) {
  const pageTitles = {
    dashboard: 'Dashboard',
    plan: 'Plan a Shipment',
    compare: 'Route Intelligence & Comparison',
    saved: 'Saved Routes Portfolio',
    riskmap: 'Live Risk Map',
    rerouting: 'Rerouting Center',
    alerts: 'Alerts Center',
    analytics: 'Maritime Analytics',
    assistant: 'Route Assistant Copilot',
    settings: 'Configuration & Settings'
  };

  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'rgba(8, 14, 26, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleMobile}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px'
          }}
          className="mobile-hamburger-btn"
        >
          <Icon name="Menu" size={19} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>
            {pageTitles[currentPage] || 'Overview'}
          </span>
          <span className="tag tag-demo" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
            DEMO DATA
          </span>
        </div>
      </div>

      {/* Center Search Input */}
      <div style={{ flex: 1, maxWidth: '380px', margin: '0 16px' }} className="topbar-search-wrap">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          padding: '6px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          <Icon name="Search" size={14} />
          <span>Search sea corridors, ports, IMO vessels...</span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 9px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--safe-teal)',
            boxShadow: '0 0 8px var(--safe-teal)'
          }} />
          <span className="mono">Firebase Live</span>
        </div>

        <button
          onClick={() => onNavigate('alerts')}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.15s ease'
          }}
          title="Active Sea Alerts"
        >
          <Icon name="ShieldAlert" size={15} />
          {alertCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--hazard-red)',
              color: '#fff',
              fontSize: '9.5px',
              fontWeight: 700,
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {alertCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigate('settings')}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Settings"
        >
          <Icon name="Settings" size={15} />
        </button>
      </div>
    </header>
  );
}
