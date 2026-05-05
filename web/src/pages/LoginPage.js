import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = 'https://tonlofhigkpbcsmfesjq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmxvZmhpZ2twYmNzbWZlc2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjE2MzUsImV4cCI6MjA5MzM5NzYzNX0.fgbSNhM_Tjfw7IlmQfQkR2Fc1qgKQkpbJGqbyyiyXXk';

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
      // Step 1: Auth via raw fetch — fastest possible, no SDK overhead
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const authRes = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email: email.trim(), password }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      const authData = await authRes.json();

      if (!authRes.ok || authData.error) {
        setError(authData.error_description || authData.error || 'Invalid email or password');
        setLoading(false);
        return;
      }

      const accessToken = authData.access_token;
      const userId = authData.user?.id;

      if (!accessToken || !userId) {
        setError('Login failed — no token received');
        setLoading(false);
        return;
      }

      // Step 2: Set session in Supabase client so rest of app works
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: authData.refresh_token,
      });

      // Step 3: Fetch profile via raw fetch too
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role,is_active&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const profiles = await profileRes.json();
      const profile = profiles?.[0];

      if (!profile) {
        // No profile = go to admin by default
        window.location.href = '/admin';
        return;
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        setError('Your account is deactivated. Contact administrator.');
        setLoading(false);
        return;
      }

      // Step 4: Redirect based on role
      window.location.href = profile.role === 'super_admin' ? '/super-admin' : '/admin';

    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Connection timed out. Check your internet and try again.');
      } else {
        setError('Error: ' + (err.message || 'Unknown error'));
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
      {/* Grid background */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '2.8rem', fontWeight: 900, color: '#00D4FF', letterSpacing: '6px', lineHeight: 1 }}>VERTEX</div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '1.1rem', color: '#7A9BB5', letterSpacing: '8px', marginTop: '2px' }}>GO</div>
          <div style={{ width: '50px', height: '2px', background: '#00D4FF', margin: '10px auto' }} />
          <div style={{ color: '#3D5872', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Device Finance Platform</div>
        </div>

        {/* Card */}
        <div style={{ background: '#111D2E', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '12px', padding: '2rem', boxShadow: '0 0 30px rgba(0,212,255,0.1)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7A9BB5', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            STAFF LOGIN
          </div>

          {error && (
            <div style={{ background: 'rgba(255,51,85,0.12)', border: '1px solid rgba(255,51,85,0.35)', color: '#ff8099', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7A9BB5', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>EMAIL ADDRESS</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
                disabled={loading}
                style={{ width: '100%', background: '#0D1526', border: '1px solid #1E3A52', borderRadius: '6px', color: '#E8F4FD', padding: '0.75rem 1rem', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7A9BB5', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>PASSWORD</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
                style={{ width: '100%', background: '#0D1526', border: '1px solid #1E3A52', borderRadius: '6px', color: '#E8F4FD', padding: '0.75rem 1rem', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.9rem', background: loading ? '#007a99' : '#00D4FF', color: '#060B14', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 800, letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontFamily: 'system-ui, sans-serif' }}
            >
              {loading ? (
                <>
                  <span style={{ width: 18, height: 18, border: '2px solid rgba(6,11,20,0.3)', borderTopColor: '#060B14', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  SIGNING IN...
                </>
              ) : 'SIGN IN →'}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <a href="/customer/lookup" style={{ color: '#3D5872', fontSize: '0.8rem', textDecoration: 'none' }}>
              Customer? Check your loan status →
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#3D5872', fontSize: '0.72rem', marginTop: '1.5rem' }}>
          VERTEX GO © {new Date().getFullYear()} · Secure Device Finance
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #00D4FF !important; box-shadow: 0 0 0 2px rgba(0,212,255,0.15); }
      `}</style>
    </div>
  );
}
