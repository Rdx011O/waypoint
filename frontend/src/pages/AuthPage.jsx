// WAYPOINT — Authentication Page (Sign In & Sign Up / Create Account)
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function AuthPage({ onDone, initialTab = 'signup' }) {
  const { login, signup, demoLogin, loading, userProfile, isLoggedIn, logout } = useAuth();
  const [tab, setTab] = useState(initialTab); // 'login' | 'signup'
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
    setSuccessMsg('');
    if (!loginEmail || !loginPassword) {
      setError('Please provide both your work email and password.');
      return;
    }
    const res = await login(loginEmail, loginPassword);
    if (res.success) {
      setSuccessMsg('Authentication successful! Loading workspace...');
      if (onDone) setTimeout(onDone, 600);
    } else {
      setError(res.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!signupName.trim() || !signupOrg.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      setError('Please fill in all required registration fields (*).');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    const res = await signup(signupName, signupOrg, signupEmail, signupPassword, signupRole);
    if (res.success) {
      setSuccessMsg(`Welcome aboard, ${signupName}! Account created successfully as ${signupRole === 'manager' ? 'Logistics Manager' : 'Shipper'}.`);
      if (onDone) setTimeout(onDone, 800);
    } else {
      setError(res.error || 'Account creation failed. Please try again.');
    }
  };

  const handleDemoAccess = async (role) => {
    setError('');
    setSuccessMsg('');
    const res = await demoLogin(role);
    if (res.success) {
      setSuccessMsg(`Entered as demo ${role === 'manager' ? 'Logistics Manager' : 'Shipper'}.`);
      if (onDone) setTimeout(onDone, 500);
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
        maxWidth: '540px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '34px 30px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)'
      }} className="auth-card">
        {/* Typographic Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div className="waypoint-brand" style={{ fontSize: '24px' }}>
              WAYPOINT<span className="brand-dot">.</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', letterSpacing: '0.04em' }}>
              MARITIME ROUTE INTELLIGENCE & DISPATCH PLATFORM
            </div>
          </div>
          {onDone && isLoggedIn && (
            <button
              onClick={onDone}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              <Icon name="X" size={14} />
              <span>Back to App</span>
            </button>
          )}
        </div>

        {/* Existing Session Alert */}
        {isLoggedIn && userProfile && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid var(--accent-cyan)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Active Authenticated Session
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                {userProfile.name} <span style={{ fontSize: '11.5px', color: 'var(--accent-cyan)' }}>({userProfile.email})</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Role: <strong>{userProfile.role === 'manager' ? 'Logistics Operations Manager' : 'Shipper / Cargo Exporter'}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {onDone && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onDone}
                  style={{ fontSize: '11.5px' }}
                >
                  <span>Dashboard</span>
                  <Icon name="ArrowRight" size={13} />
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={logout}
                style={{ fontSize: '11.5px' }}
              >
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Auth Mode Tabs (Sign In vs Create Account) */}
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
            onClick={() => { setTab('signup'); setError(''); setSuccessMsg(''); }}
            style={{
              background: tab === 'signup' ? 'var(--bg-surface-elevated)' : 'transparent',
              border: 'none',
              color: tab === 'signup' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontWeight: 700,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon name="UserPlus" size={14} />
            <span>Create Account</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
            style={{
              background: tab === 'login' ? 'var(--bg-surface-elevated)' : 'transparent',
              border: 'none',
              color: tab === 'login' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontWeight: 700,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon name="LogIn" size={14} />
            <span>Sign In</span>
          </button>
        </div>

        {error && (
          <div className="box box-warning" style={{ marginBottom: '16px', fontSize: '12.5px' }}>
            <strong style={{ display: 'block', marginBottom: '2px' }}>Authentication Notice</strong>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10B981',
            borderRadius: 'var(--radius-sm)',
            color: '#10B981',
            fontSize: '12.5px',
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Icon name="CheckCircle2" size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ─── 1. CREATE ACCOUNT FORM (SIGN UP) ─── */}
        {tab === 'signup' && (
          <form onSubmit={handleSignupSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                Select Your Operating Role *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  onClick={() => setSignupRole('shipper')}
                  style={{
                    background: signupRole === 'shipper' ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-surface-alt)',
                    border: `2px solid ${signupRole === 'shipper' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ color: 'var(--safe-teal)' }}>
                      <Icon name="Package" size={18} />
                    </div>
                    {signupRole === 'shipper' && (
                      <span style={{ fontSize: '10px', background: 'var(--safe-teal)', color: '#070D18', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>SELECTED</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>Shipper / Exporter</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                    Shipment planning, route cost comparison, slot booking & container tracking.
                  </div>
                </div>

                <div
                  onClick={() => setSignupRole('manager')}
                  style={{
                    background: signupRole === 'manager' ? 'rgba(251, 191, 36, 0.12)' : 'var(--bg-surface-alt)',
                    border: `2px solid ${signupRole === 'manager' ? 'var(--caution-amber)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ color: 'var(--caution-amber)' }}>
                      <Icon name="Compass" size={18} />
                    </div>
                    {signupRole === 'manager' && (
                      <span style={{ fontSize: '10px', background: 'var(--caution-amber)', color: '#070D18', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>SELECTED</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>Logistics Manager</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                    Fleet radar, Booked Slots Queue (dispatch), weather rerouting & alerts.
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
                  required
                />
              </div>
              <div>
                <label className="input-label" htmlFor="reg-org">Organization / Line *</label>
                <input
                  id="reg-org"
                  type="text"
                  className="text-input"
                  placeholder="e.g. Ocean Cargo Exporters"
                  value={signupOrg}
                  onChange={(e) => setSignupOrg(e.target.value)}
                  required
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
                required
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="input-label" htmlFor="reg-pass" style={{ margin: 0 }}>Create Password *</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                >
                  {showPassword ? 'Hide' : 'Show'} Password
                </button>
              </div>
              <input
                id="reg-pass"
                type={showPassword ? "text" : "password"}
                className="text-input"
                placeholder="Minimum 6 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="btn btn-safe btn-full" disabled={loading} style={{ padding: '12px', fontSize: '13.5px', fontWeight: 700 }}>
              {loading ? 'Creating Verified Account...' : 'Register & Enter Workspace'}
              <Icon name="ChevronRight" size={16} />
            </button>
          </form>
        )}

        {/* ─── 2. SIGN IN FORM ─── */}
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
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="input-label" htmlFor="login-pass" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                >
                  {showPassword ? 'Hide' : 'Show'} Password
                </button>
              </div>
              <input
                id="login-pass"
                type={showPassword ? "text" : "password"}
                className="text-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ padding: '12px', fontSize: '13.5px', fontWeight: 700 }}>
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <Icon name="ChevronRight" size={16} />
            </button>
          </form>
        )}

        {/* ─── Quick Role Demo Access ─── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          textAlign: 'center',
          margin: '22px 0 14px',
          color: 'var(--text-muted)',
          fontSize: '10.5px',
          fontWeight: 700,
          letterSpacing: '0.08em'
        }}>
          <div style={{ flex: 1, borderBottom: '1px solid var(--border-subtle)' }} />
          <span style={{ padding: '0 10px' }}>OR INSTANT 1-CLICK DEMO ACCESS</span>
          <div style={{ flex: 1, borderBottom: '1px solid var(--border-subtle)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ textAlign: 'left', padding: '10px', height: 'auto', display: 'flex', gap: '9px', alignItems: 'flex-start' }}
            onClick={() => handleDemoAccess('shipper')}
          >
            <div style={{ color: 'var(--safe-teal)', marginTop: '2px' }}>
              <Icon name="Package" size={18} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Demo Shipper</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Plan, Compare & Book</div>
            </div>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            style={{ textAlign: 'left', padding: '10px', height: 'auto', display: 'flex', gap: '9px', alignItems: 'flex-start' }}
            onClick={() => handleDemoAccess('manager')}
          >
            <div style={{ color: 'var(--caution-amber)', marginTop: '2px' }}>
              <Icon name="Compass" size={18} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Demo Manager</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Fleet & Dispatch Queue</div>
            </div>
          </button>
        </div>

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
          <span>Cloud Firestore & Client Cryptographic Session Active</span>
        </div>
      </div>
    </div>
  );
}
