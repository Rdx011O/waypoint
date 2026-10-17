// WAYPOINT — Sidebar Component
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { WAYPOINT_DATA } from '../data/maritimeData';
import Icon from './Icon';

export default function Sidebar({ currentPage, onNavigate, mobileOpen, onCloseMobile }) {
  const { currentRole, userProfile, logout } = useAuth();
  const isShipper = currentRole === 'shipper';
  const navItems = WAYPOINT_DATA.navItems[currentRole] || [];

  const initials = (userProfile?.name || 'OP')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'open' : ''}`}
        onClick={onCloseMobile}
      />

      <aside className={`sidebar-aside ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Header with Pure Typographic Logo (NO icon) */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div className="waypoint-brand">
            WAYPOINT<span className="brand-dot">.</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-strong)',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                padding: '5px 9px',
                display: 'none',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700
              }}
              className="mobile-close-btn"
              aria-label="Close navigation menu"
            >
              <span>Close</span>
              <Icon name="X" size={15} />
            </button>
          )}
        </div>

        {/* Locked Role Badge (NO account switch option) */}
        <div style={{
          margin: '12px 14px 6px',
          padding: '8px 12px',
          background: isShipper ? 'rgba(45, 212, 191, 0.08)' : 'rgba(251, 191, 36, 0.08)',
          border: `1px solid ${isShipper ? 'rgba(45, 212, 191, 0.25)' : 'rgba(251, 191, 36, 0.25)'}`,
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ color: isShipper ? 'var(--safe-teal)' : 'var(--caution-amber)' }}>
            <Icon name={isShipper ? 'Package' : 'Compass'} size={15} />
          </div>
          <div style={{
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: isShipper ? 'var(--safe-teal)' : 'var(--caution-amber)'
          }}>
            {isShipper ? 'Shipper Workspace' : 'Logistics Console'}
          </div>
        </div>

        {/* Role-Specific Navigation Suite */}
        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{
            fontSize: '9.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            padding: '8px 10px 4px'
          }}>
            {isShipper ? 'Shipper Operations' : 'Fleet Command'}
          </div>

          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%'
                }}
              >
                <Icon name={item.iconName} size={16} />
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer with Authenticated User Details & Sign Out */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          background: '#060B14'
        }}>
          <div
            onClick={() => {
              onNavigate('settings');
              if (onCloseMobile) onCloseMobile();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: 'var(--radius-sm)',
              transition: 'background 0.15s'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '11.5px',
              border: '1px solid var(--border-strong)',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden', lineHeight: 1.25 }}>
              <div style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}>
                {userProfile?.name || 'Operator'}
              </div>
              <div style={{
                fontSize: '10.5px',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}>
                {userProfile?.email || 'authenticated'}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              if (onCloseMobile) onCloseMobile();
            }}
            style={{
              marginTop: '10px',
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hazard-bg)';
              e.currentTarget.style.borderColor = 'var(--hazard-red)';
              e.currentTarget.style.color = 'var(--hazard-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Icon name="LogOut" size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
