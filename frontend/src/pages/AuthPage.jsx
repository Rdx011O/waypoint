// WAYPOINT — Authentication Page (Sign In & Sign Up)
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function AuthPage() {
  const { login, signup, demoLogin, loading } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [error, setError] = useState('');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupRole, setSignupRole] = useState('shipper');
  const [signupName, setSignupName] = useState('');
  const [signupOrg, setSignupOrg] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginEmail || !loginPassword) {
      setError('Please provide both your work email and password.');
      return;
    }
    const res = await login(loginEmail, loginPassword);
    if (!res.success) {
      setError(res.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!signupName || !signupOrg || !signupEmail || !signupPassword) {
      setError('Please fill in all required registration fields.');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    const res = await signup(signupName, signupOrg, signupEmail, signupPassword, signupRole);
    if (!res.success) {
      setError(res.error || 'Account creation failed. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 25%, #152442 0%, #080E1A 75%)',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Background nautical grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.04,
        backgroundImage: 'radial-gradient(#38BDF8 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '510px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '34px 30px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Pure Typographic Logo with NO icon */}
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <div className="waypoint-brand" style={{ fontSize: '22px' }}>
            WAYPOINT<span className="brand-dot">.</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', letterSpacing: '0.04em' }}>
            MARITIME ROUTE INTELLIGENCE PLATFORM
          </div>
        </div>

        {/* Auth Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'var(--bg-surface-alt)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '3px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            style={{
              background: tab === 'login' ? 'var(--bg-surface-elevated)' : 'transparent',
              border: 'none',
              color: tab === 'login' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '9px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(''); }}
            style={{
              background: tab === 'signup' ? 'var(--bg-surface-elevated)' : 'transparent',
              border: 'none',
              color: tab === 'signup' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '9px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="box box-warning" style={{ marginBottom: '16px' }}>
            <strong>Authentication Notice</strong>
            {error}
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label className="input-label" htmlFor="login-email">Work Email</label>
              <input
                id="login-email"
                type="email"
                className="text-input"
                placeholder="e.g. operator@oceancargo.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="input-label" htmlFor="login-pass">Password</label>
              <input
                id="login-pass"
                type="password"
                className="text-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ padding: '10px' }}>
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <Icon name="ChevronRight" size={15} />
            </button>

            {/* Role Demo Access */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              textAlign: 'center',
              margin: '20px 0 14px',
              color: 'var(--text-muted)',
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '0.08em'
            }}>
              <div style={{ flex: 1, borderBottom: '1px solid var(--border-subtle)' }} />
              <span style={{ padding: '0 10px' }}>QUICK DEMO ACCESS (BY ROLE)</span>
              <div style={{ flex: 1, borderBottom: '1px solid var(--border-subtle)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ textAlign: 'left', padding: '10px', height: 'auto', display: 'flex', gap: '9px', alignItems: 'flex-start' }}
                onClick={() => demoLogin('shipper')}
              >
                <div style={{ color: 'var(--safe-teal)', marginTop: '2px' }}>
                  <Icon name="Package" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Shipper / Exporter</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Plan, Compare & Book</div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                style={{ textAlign: 'left', padding: '10px', height: 'auto', display: 'flex', gap: '9px', alignItems: 'flex-start' }}
                onClick={() => demoLogin('manager')}
              >
                <div style={{ color: 'var(--caution-amber)', marginTop: '2px' }}>
                  <Icon name="Compass" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Logistics Manager</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Fleet, Reroute & Alerts</div>
                </div>
              </button>
            </div>
          </form>
        )}

        {/* 2. SIGN UP FORM */}
        {tab === 'signup' && (
          <form onSubmit={handleSignupSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label className="input-label">Select Your Operating Role *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  onClick={() => setSignupRole('shipper')}
                  style={{
                    background: signupRole === 'shipper' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface-alt)',
                    border: `2px solid ${signupRole === 'shipper' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ color: 'var(--safe-teal)', marginBottom: '4px' }}>
                    <Icon name="Package" size={18} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Shipper / Exporter</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                    Cargo dispatch, route evaluation, bookings & manifests.
                  </div>
                </div>

                <div
                  onClick={() => setSignupRole('manager')}
                  style={{
                    background: signupRole === 'manager' ? 'rgba(251, 191, 36, 0.08)' : 'var(--bg-surface-alt)',
                    border: `2px solid ${signupRole === 'manager' ? 'var(--caution-amber)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ color: 'var(--caution-amber)', marginBottom: '4px' }}>
                    <Icon name="Compass" size={18} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Logistics Manager</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                    Fleet radar, emergency reroute, active weather warnings & analytics.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label className="input-label" htmlFor="reg-name">Full Name *</label>
                <input
                  id="reg-name"
                  type="text"
                  className="text-input"
                  placeholder="e.g. Captain James Dao"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label" htmlFor="reg-org">Organization *</label>
                <input
                  id="reg-org"
                  type="text"
                  className="text-input"
                  placeholder="e.g. Ocean Cargo Exporters"
                  value={signupOrg}
                  onChange={(e) => setSignupOrg(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label className="input-label" htmlFor="reg-email">Work Email *</label>
              <input
                id="reg-email"
                type="email"
                className="text-input"
                placeholder="name@company.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label className="input-label" htmlFor="reg-pass">Create Password *</label>
              <input
                id="reg-pass"
                type="password"
                className="text-input"
                placeholder="Minimum 6 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-safe btn-full" disabled={loading} style={{ padding: '10px' }}>
              {loading ? 'Creating Account...' : 'Register & Enter Portal'}
              <Icon name="ChevronRight" size={15} />
            </button>
          </form>
        )}

        <div style={{
          marginTop: '22px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <Icon name="Lock" size={12} />
          <span>Cloud Firestore & Firebase Authentication Active</span>
        </div>
      </div>
    </div>
  );
}
