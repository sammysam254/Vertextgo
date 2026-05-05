import React from 'react';

export default function Sidebar({ items, activeItem, onSelect, role }) {
  const handleSignOut = () => {
    localStorage.removeItem('vx_role');
    localStorage.removeItem('vx_user_id');
    localStorage.removeItem('vx_email');
    localStorage.removeItem('sb-tonlofhigkpbcsmfesjq-auth-token');
    window.location.replace('/login');
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
            <div key={i} className={`vx-nav-item ${activeItem === item.id ? 'active' : ''}`} onClick={() => onSelect(item.id)}>
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          )
        ))}
      </nav>
      <div style={{ borderTop: '1px solid var(--border)', padding: '1rem' }}>
        <button className="vx-btn vx-btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }} onClick={handleSignOut}>
          ⏻ Sign Out
        </button>
      </div>
    </div>
  );
}
