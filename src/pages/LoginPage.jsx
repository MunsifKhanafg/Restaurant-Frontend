import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, clearError } from '../store/slices/authSlice';
import toast from 'react-hot-toast';

// ── Shared Logo Component ──
function AurumLogo({ size = 64 }) {
  const s = size;
  const vb = 42;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${vb} ${vb}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="21" cy="21" r="20" stroke="#D4AF37" strokeWidth="1.2" fill="none" opacity="0.6"/>
      <circle cx="21" cy="21" r="16" stroke="#D4AF37" strokeWidth="0.6" fill="none" opacity="0.35"/>
      <circle cx="21" cy="21" r="18" fill="url(#loginLogoGrad2)"/>
      <path d="M16 9 L16 17 Q16 19 17.5 19.5 L17.5 33" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M14 9 L14 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M16 9 L16 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M18 9 L18 15" stroke="#0D0D0D" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M26 9 L26 16 Q30 18 30 21 L26 22 L26 33" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M13 21 Q21 23.5 29 21" stroke="#0D0D0D" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5"/>
      <defs>
        <radialGradient id="loginLogoGrad2" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#E8C84A"/>
          <stop offset="100%" stopColor="#A07808"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });

  // ── Staff/Admin manual sign-in ──
  // The server returns the real role from the DB — we trust that, not the UI.
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      const role = result.payload.data?.role;
      toast.success('Welcome back!');
      // Role-based redirect: only real admins/managers reach the dashboard.
      if (role === 'admin' || role === 'manager') {
        navigate('/');
      } else {
        navigate('/pos');
      }
    } else {
      toast.error(result.payload || 'Invalid email or password');
    }
  };

  // ── Customer quick-login (waiter role — POS only) ──
  // No admin shortcut exists. Admin must use the form above with their own credentials.
  const handleCustomerLogin = async () => {
    dispatch(clearError());
    const result = await dispatch(login({
      email: 'customer@aurumdining.com',
      password: 'customer123',
    }));
    if (login.fulfilled.match(result)) {
      toast.success('Welcome! Logged in as Customer');
      navigate('/pos');
    } else {
      toast.error(result.payload || 'Login failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundImage:
        'radial-gradient(ellipse at 20% 50%, rgba(232,73,15,0.05) 0%, transparent 60%), ' +
        'radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.04) 0%, transparent 50%)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ margin: '0 auto 14px', width: '64px', height: '64px', filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.45))' }}>
            <AurumLogo size={64} />
          </div>
          <h1 style={{
            fontFamily: '"Cormorant Garamond", serif', fontSize: '28px', fontWeight: '700',
            background: 'linear-gradient(135deg, #E8C84A 0%, #D4AF37 50%, #B8960C 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: '4px', letterSpacing: '0.02em',
          }}>
            Aurum Dining
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Staff Portal
          </p>
        </div>

        {/* ── Sign-In Card ── */}
        <div className="glass-card-elevated" style={{ padding: '36px' }}>
          <h2 style={{
            fontFamily: '"Sora", sans-serif', fontSize: '20px', fontWeight: '700',
            color: 'var(--text-primary)', marginBottom: '6px',
          }}>
            Sign In
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '11px', color: 'var(--text-muted)',
                letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px',
              }}>
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className="input-dark"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: '11px', color: 'var(--text-muted)',
                letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px',
              }}>
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input-dark"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--red-muted)',
                border: '1px solid rgba(220,38,38,0.25)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--red)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-gold"
              disabled={loading}
              style={{ padding: '13px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', marginTop: '4px' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* ── Customer Quick-Access ── */}
        {/* Admin has NO shortcut — they must sign in with their own credentials above */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 14px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.15)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Quick Access
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.15)' }} />
        </div>

        <button
          onClick={handleCustomerLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px', fontSize: '13px',
            fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(212,175,55,0.35)',
            background: 'rgba(212,175,55,0.07)', color: 'var(--gold)',
            letterSpacing: '0.03em', transition: 'all 0.2s',
            fontFamily: '"DM Sans", sans-serif',
            opacity: loading ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(212,175,55,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.07)'; }}
        >
          <span>🍽️</span>
          <span>Continue as Customer</span>
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
          Aurum Dining &copy; {new Date().getFullYear()} — All rights reserved
        </p>
      </div>
    </div>
  );
}
