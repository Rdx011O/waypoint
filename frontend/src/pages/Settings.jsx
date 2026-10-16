// WAYPOINT — Account & System Preferences (Settings)
// Fixes bug where account preference data was not bound to authenticated user credentials
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { WAYPOINT_DATA } from '../data/maritimeData';

export default function Settings() {
  const { userProfile, currentRole, updateProfileData } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states initialized directly from authenticated user credentials
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    org: '',
    timezone: 'UTC+05:30 (IST - Mumbai)',
    phone: '+91 98200 45678',
    defaultPriority: 'balanced',
    emailAlerts: true,
    stormAlerts: true,
    portCongestionAlerts: true,
    aisAutoRefresh: true,
    theme: 'deep-ocean'
  });

  // Sync state whenever userProfile loads or changes from Firebase
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.name || '',
        email: userProfile.email || '',
        org: userProfile.org || (currentRole === 'shipper' ? 'Ocean Cargo Exporters Ltd.' : 'Pacific Fleet Command Operations'),
        timezone: userProfile.timezone || (currentRole === 'shipper' ? 'UTC+05:30 (IST - Mumbai)' : 'UTC+08:00 (SGT - Singapore)')
      }));
    }
  }, [userProfile, currentRole]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateProfileData({
        name: formData.name,
        org: formData.org,
        timezone: formData.timezone,
        phone: formData.phone,
        emailAlerts: formData.emailAlerts,
        stormAlerts: formData.stormAlerts
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const isShipper = currentRole === 'shipper';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px' }}>
      {/* Page Title */}
      <div>
        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--accent-cyan)',
          fontWeight: 700,
          marginBottom: '4px'
        }}>
          System Configuration
        </div>
        <h1 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          margin: 0
        }}>
          Account & Maritime Preferences
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Personalize credentials, notification thresholds, and telemetry data sources.
        </p>
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
          fontSize: '13px',
          fontWeight: 500
        }}>
          <Icon name="CheckCircle2" size={18} />
          <span>Account preferences successfully synchronized with Firebase Cloud Firestore.</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '4px'
      }}>
        {[
          { id: 'profile', label: 'User Profile & Identity', icon: 'User' },
          { id: 'routing', label: 'Routing & Risk Thresholds', icon: 'Sliders' },
          { id: 'datasources', label: 'Telemetry & Data Sources', icon: 'Radio' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon name={tab.icon} size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: User Profile & Identity */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Account Information
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Bound directly to your authenticated session credentials
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: isShipper ? 'rgba(45, 212, 191, 0.12)' : 'rgba(251, 191, 36, 0.12)',
              border: `1px solid ${isShipper ? 'rgba(45, 212, 191, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
              color: isShipper ? 'var(--safe-teal)' : 'var(--caution-amber)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}>
              <Icon name={isShipper ? 'Package' : 'Compass'} size={13} />
              <span>{isShipper ? 'Shipper Role' : 'Logistics Manager'}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                placeholder="Operator Name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (Credential Identity)</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                disabled
                style={{ opacity: 0.75, cursor: 'not-allowed', background: 'rgba(0,0,0,0.2)' }}
              />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Primary login identifier verified via Firebase Authentication.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Organization / Shipping Line</label>
              <input
                type="text"
                name="org"
                className="form-control"
                value={formData.org}
                onChange={handleChange}
                placeholder="Enterprise or Vessel Line"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Operational Timezone</label>
              <select
                name="timezone"
                className="form-control"
                value={formData.timezone}
                onChange={handleChange}
              >
                <option value="UTC+05:30 (IST - Mumbai)">UTC+05:30 (IST - Mumbai / Nhava Sheva)</option>
                <option value="UTC+08:00 (SGT - Singapore)">UTC+08:00 (SGT - Singapore / Pasir Panjang)</option>
                <option value="UTC+00:00 (GMT - London)">UTC+00:00 (GMT - Felixstowe / London)</option>
                <option value="UTC+01:00 (CET - Rotterdam)">UTC+01:00 (CET - Rotterdam / Antwerp)</option>
                <option value="UTC+04:00 (GST - Dubai)">UTC+04:00 (GST - Jebel Ali / Dubai)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Emergency VHF / Contact Phone</label>
              <input
                type="text"
                name="phone"
                className="form-control"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role Security Status</label>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <Icon name="Lock" size={13} color="var(--safe-teal)" />
                  <span>Immutable Role-Based Access Control</span>
                </div>
                <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                  Role privileges cannot be switched mid-session to ensure maritime compliance.
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ minWidth: '150px' }}
            >
              {isSaving ? (
                <>
                  <Icon name="RefreshCw" size={15} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Icon name="Save" size={15} />
                  <span>Save Account Preferences</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Routing & Risk Thresholds */}
      {activeTab === 'routing' && (
        <form onSubmit={handleSave} className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>
            Route Engine & Hazard Preferences
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 20px' }}>
            Configure default multi-criteria route optimization algorithms and trigger alerts
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Default Route Optimization Priority</label>
              <select
                name="defaultPriority"
                className="form-control"
                value={formData.defaultPriority}
                onChange={handleChange}
              >
                <option value="balanced">Best Balanced (Optimal ETA, Risk & Fuel)</option>
                <option value="cost">Lowest Cost (Fuel conservation & economical lanes)</option>
                <option value="fastest">Fastest Transit (Express dispatch)</option>
                <option value="risk">Lowest Risk (Perishable / high-value cargo)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Wave Height Advisory Trigger</label>
              <select className="form-control" defaultValue="4.0">
                <option value="3.5">&gt; 3.5 meters (Moderate swell alert)</option>
                <option value="4.0">&gt; 4.0 meters (Recommended for container cargo)</option>
                <option value="5.0">&gt; 5.0 meters (Severe gale warning)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Real-time Alert Dispatch Channels
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="emailAlerts"
                  checked={formData.emailAlerts}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
                />
                <span>Email instant dispatch notifications for Critical Cyclone Advisories</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="stormAlerts"
                  checked={formData.stormAlerts}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
                />
                <span>Automatic route deviation suggestions when hazard risk exceeds 50/100</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="portCongestionAlerts"
                  checked={formData.portCongestionAlerts}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
                />
                <span>Port wait-time spikes (&gt; 36 hours delay warning)</span>
              </label>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Icon name="Save" size={15} />
              <span>Update Risk Preferences</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Telemetry & Data Sources (Table 7) */}
      {activeTab === 'datasources' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                System Telemetry Feeds & External APIs
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                As specified in Table 7: Data Source Status
              </p>
            </div>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
              <Icon name="RefreshCw" size={13} />
              <span>Test All Endpoints</span>
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data Source</th>
                  <th>Operational Status</th>
                  <th>Description / Endpoint Target</th>
                </tr>
              </thead>
              <tbody>
                {WAYPOINT_DATA.dataSources.map((ds, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name={idx === 0 ? 'Database' : idx === 1 ? 'Radio' : idx === 2 ? 'CloudRain' : 'Anchor'} size={15} color="var(--accent-cyan)" />
                        <span>{ds.source}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ds.tagClass === 'tag-live' ? 'badge-teal' : ds.tagClass === 'tag-demo' ? 'badge-amber' : 'badge-crit'}`}>
                        {ds.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {ds.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '14px 16px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Firebase Cloud Database (Live Project)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Project ID: <code>waypoint-maritime</code> | Region: <code>asia-south1 / us-central</code>
              </div>
            </div>
            <span className="badge badge-teal">Connected</span>
          </div>
        </div>
      )}
    </div>
  );
}
