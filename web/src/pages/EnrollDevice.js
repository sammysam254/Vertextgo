import React from 'react';
export default function EnrollDevice() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📱</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: 3 }}>DEVICE ENROLLMENT</h2>
        <p style={{ marginTop: 8 }}>This page is opened automatically on the Android device during enrollment.</p>
      </div>
    </div>
  );
}
