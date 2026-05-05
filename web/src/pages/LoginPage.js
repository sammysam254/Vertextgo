import React, { useState } from 'react';

const SUPABASE_URL = 'https://tonlofhigkpbcsmfesjq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmxvZmhpZ2twYmNzbWZlc2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjE2MzUsImV4cCI6MjA5MzM5NzYzNX0.fgbSNhM_Tjfw7IlmQfQkR2Fc1qgKQkpbJGqbyyiyXXk';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus('Connecting...');

    try {
      setStatus('Authenticating...');

      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.access_token) {
        setError(data.error_description || data.error || 'Invalid email or password');
        setLoading(false);
        setStatus('');
        return;
      }

      setStatus('Getting profile...');

      // Store session in localStorage exactly how Supabase SDK expects it
      const sessionKey = `sb-tonlofhigkpbcsmfesjq-auth-token`;
      const sessionData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        expires_in: data.expires_in,
        token_type: 'bearer',
        user: data.user,
      };
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));

      // Get profile
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=role,is_active&limit=1`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${data.access_token}`,
          },
        }
      );

      const profiles = await profileRes.json();
      const profile = Array.isArray(profiles) ? profiles[0] : null;

      if (profile && !profile.is_active) {
        localStorage.removeItem(sessionKey);
        setError('Your account has been deactivated.');
        setLoading(false);
        setStatus('');
        return;
      }

      const role = profile?.role || 'admin';
      setStatus('Redirecting...');

      const dest = role === 'super_admin' ? '/super-admin' : '/admin';
      window.location.replace(dest);

    } catch (err) {
      setError('Network error: ' + err.message);
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#00D4FF', letterSpacing: '6px' }}>VERTEX</div>
          <div style={{ fontSize: '1.1rem', color: '#7A9BB5', letterSpacing: '8px' }}>GO</div>
          <div style={{ width: '50px', height: '2px', background: '#00D4FF', margin: '10px auto' }} />
          <div style={{ color: '#3D5872', fontSize: '0.72rem', letterSpacing: '2px' }}>DEVICE FINANCE PLATFORM</div>
        </div>

        <div style={{ background: '#111D2E', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '12px', padding: '2rem', boxShadow: '0 0 40px rgba(0,212,255,0.08)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7A9BB5', letterSpacing: '3px', marginBottom: '1.5rem' }}>STAFF LOGIN</div>

          {error && (
            <div style={{ background: 'rgba(255,51,85,0.12)', border: '1px solid rgba(255,51,85,0.3)', color: '#ff8099', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              ⚠ {error}
            </div>
          )}

          {loading && status && (
            <div style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem', textAlign: 'center' }}>
              {status}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7A9BB5', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>EMAIL</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required disabled={loading} autoComplete="email"
                style={{ width: '100%', background: '#0D1526', border: '1px solid #1E3A52', borderRadius: '6px', color: '#E8F4FD', padding: '12px 14px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7A9BB5', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>PASSWORD</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required disabled={loading} autoComplete="current-password"
                style={{ width: '100%', background: '#0D1526', border: '1px solid #1E3A52', borderRadius: '6px', color: '#E8F4FD', padding: '12px 14px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', background: loading ? '#005f73' : '#00D4FF', color: '#060B14', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 800, letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#060B14', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  {status || 'SIGNING IN...'}
                </>
              ) : 'SIGN IN →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <a href="/customer/lookup" style={{ color: '#3D5872', fontSize: '0.78rem', textDecoration: 'none' }}>Customer? Check your loan →</a>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
