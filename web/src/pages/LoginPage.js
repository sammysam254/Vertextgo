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

    // Hard timeout — never stuck more than 10 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
      setError('Request timed out. Check your connection and try again.');
    }, 10000);

    try {
      // Step 1: Sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        clearTimeout(timeout);
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (!data?.user) {
        clearTimeout(timeout);
        setError('Login failed. Try again.');
        setLoading(false);
        return;
      }

      // Step 2: Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .maybeSingle();

      clearTimeout(timeout);

      // No profile = still go to admin (enroller default)
      if (!profile) {
        window.location.href = '/admin';
        return;
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        setError('Your account is deactivated. Contact administrator.');
        setLoading(false);
        return;
      }

      // Step 3: Redirect
      if (profile.role === 'super_admin') {
        window.location.href = '/super-admin';
      } else {
        window.location.href = '/admin';
      }

    } catch (err) {
      clearTimeout(timeout);
      console.error(err);
      setError('Error: ' + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '1rem' }}>
      <div className="vx-grid-bg" />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '6px', lineHeight: 1 }}>
            VERTEX
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-secondary)', letterSpacing: '8px', marginTop: '2px' }}>
            GO
          </div>
          <div style={{ width: '60px', height: '2px', background: 'var(--accent-cyan)', margin: '12px auto 0' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '10px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Device Finance Platform
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '12px', padding: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            STAFF LOGIN
          </h2>

          {error && (
            <div style={{ background: 'rgba(255,51,85,0.1)', border: '1px solid rgba(255,51,85,0.3)', color: '#ff8099', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleLogin} autoComplete="on">
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                EMAIL ADDRESS
              </label>
              <input
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '0.75rem 1rem', fontSize: '0.95rem', width: '100%', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none' }}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                PASSWORD
              </label>
              <input
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '0.75rem 1rem', fontSize: '0.95rem', width: '100%', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none' }}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.875rem', background: loading ? '#007a99' : 'var(--accent-cyan)', color: '#060B14', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 700, letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <>
                  <span style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#060B14', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
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
