import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          setError('Profile not found. Contact your administrator.');
          setLoading(false);
          return;
        }

        if (!profile.is_active) {
          setError('Your account has been deactivated.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Use window.location instead of navigate — guaranteed to work
        if (profile.role === 'super_admin') {
          window.location.href = '/super-admin';
        } else {
          window.location.href = '/admin';
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '1rem' }}>
      <div className="vx-grid-bg" />
      <div style={{ position: 'absolute', top: '-200px', left: '-200px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(0,102,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-200px', right: '-200px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '6px', lineHeight: 1, textShadow: '0 0 20px rgba(0,212,255,0.4)' }}>
            VERTEX
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--text-secondary)', letterSpacing: '8px', marginTop: '2px' }}>
            GO
          </div>
          <div style={{ width: '60px', height: '2px', background: 'var(--accent-cyan)', margin: '12px auto 0', boxShadow: '0 0 20px rgba(0,212,255,0.4)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '10px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Device Finance Platform
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '12px', padding: '2rem', boxShadow: '0 0 20px rgba(0,212,255,0.15), 0 40px 80px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            STAFF LOGIN
          </h2>

          {error && (
            <div style={{ background: 'rgba(255,51,85,0.1)', border: '1px solid rgba(255,51,85,0.3)', color: '#ff8099', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleLogin} autoComplete="on">
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '0.75rem 1rem', fontSize: '0.95rem', width: '100%', outline: 'none', boxSizing: 'border-box' }}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                Password
              </label>
              <input
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '0.75rem 1rem', fontSize: '0.95rem', width: '100%', outline: 'none', boxSizing: 'border-box' }}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.875rem', background: loading ? '#007a99' : 'var(--accent-cyan)', color: 'var(--bg-primary)', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 700, letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s', fontFamily: 'var(--font-body)' }}
            >
              {loading ? (
                <>
                  <span className="vx-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  SIGNING IN...
                </>
              ) : 'SIGN IN →'}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <a href="/customer/lookup" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>
              Customer? Check your loan status →
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '1.5rem', letterSpacing: '1px' }}>
          VERTEX GO © {new Date().getFullYear()} · Secure Device Finance
        </p>
      </div>
    </div>
  );
}
