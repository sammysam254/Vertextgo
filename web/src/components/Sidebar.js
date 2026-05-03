import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';

export default function Sidebar({ items, activeItem, onSelect, role }) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="vx-sidebar">
      <div className="vx-sidebar-logo">
        <div>
          <div>VERTEX GO</div>
          <span>{role === 'super_admin' ? 'SUPER ADMIN' : role === 'admin' ? 'ADMIN' : 'ENROLLER'}</span>
        </div>
      </div>

      <nav style={{ flex: 1, paddingTop: '0.5rem', overflowY: 'auto' }}>
        {items.map((item, i) => (
          item.section ? (
            <div key={i} className="vx-nav-section">{item.section}</div>
          ) : (
            <div
              key={i}
              className={`vx-nav-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          )
        ))}
      </nav>

      <div style={{ borderTop: '1px solid var(--border)', padding: '1rem' }}>
        <div style={{ padding: '0.5rem 0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.full_name || 'User'}</div>
          <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>{profile?.email}</div>
        </div>
        <button className="vx-btn vx-btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }} onClick={handleSignOut}>
          ⏻ Sign Out
        </button>
      </div>
    </div>
  );
}
