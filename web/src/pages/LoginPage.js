import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
        // Fetch profile to determine role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          setError('Profile not found. Contact administrator.');
          setLoading(false);
          return;
        }

        if (!profile.is_active) {
          setError('Your account has been deactivated.');
          setLoading(false);
          return;
        }

        // Route based on role
        if (profile.role === 'super_admin') {
          navigate('/super-admin');
        } else {
          navigate('/admin');
        }
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div className="vx-grid-bg" />
      <div style={{ position: 'absolute', top: '-200px', left: '-200px', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,102,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-200px', right: '-200px', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px', padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '6px', lineHeight: 1, textShadow: 'var(--glow-cyan)' }}>
            VERTEX
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--text-secondary)', letterSpacing: '8px', marginTop: '2px' }}>
            GO
          </div>
          <div style={{ width: '60px', height: '2px', background: 'var(--accent-cyan)', margin: '16px auto 0', boxShadow: 'var(--glow-cyan)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Device Finance Platform
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '12px', padding: '2.5rem', boxShadow: 'var(--glow-cyan), 0 40px 80px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            STAFF LOGIN
          </h2>

          {error && (
            <div className="vx-alert vx-alert-error" style={{ marginBottom: '1.5rem' }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="vx-form-group">
              <label className="vx-label">Email Address</label>
              <input
                className="vx-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@vertexgo.com"
                required
              />
            </div>
            <div className="vx-form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="vx-label">Password</label>
              <input
                className="vx-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              className="vx-btn vx-btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '1rem', letterSpacing: '2px' }}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN →'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <a href="/customer/lookup" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>
              Customer? Check your loan status →
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2rem', letterSpacing: '1px' }}>
          VERTEX GO © {new Date().getFullYear()} · Secure Device Finance
        </p>
      </div>
    </div>
  );
}
