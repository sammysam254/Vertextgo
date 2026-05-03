import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomerByAccount } from '../lib/supabase';

export default function CustomerDashboard() {
  const { accountNumber } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    if (accountNumber && accountNumber !== 'lookup') {
      fetchCustomer(accountNumber);
    } else {
      setLoading(false);
    }
  }, [accountNumber]);

  const fetchCustomer = async (acc) => {
    setLoading(true);
    const { data: customer, error: err } = await getCustomerByAccount(acc);
    if (err || !customer) { setError('Account not found. Check your ID number.'); setLoading(false); return; }
    setData(customer);
    setLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="vx-spinner" />
    </div>
  );

  // Lookup screen
  if (!accountNumber || accountNumber === 'lookup' || !data) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="vx-grid-bg" />
        <div style={{ maxWidth: 420, width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '4px' }}>VERTEX GO</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '0.875rem' }}>Check your loan status</div>
          </div>
          <div className="vx-card">
            {error && <div className="vx-alert vx-alert-error">{error}</div>}
            <div className="vx-form-group">
              <label className="vx-label">Your National ID Number / Account Number</label>
              <input className="vx-input" placeholder="e.g. 123456/78/9" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && navigate(`/customer/${searchInput}`)} />
            </div>
            <button className="vx-btn vx-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} onClick={() => navigate(`/customer/${searchInput}`)}>
              Check My Loan →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const loan = data.loans?.[0];
  const device = loan?.devices;
  const pct = loan ? Math.min(100, (loan.total_paid / loan.device_price) * 100) : 0;
  const daysLeft = loan ? Math.ceil((loan.device_price - loan.total_paid) / loan.daily_rate) : 0;
  const isOverdue = loan && new Date() > new Date(loan.next_due_date);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '1rem', position: 'relative' }}>
      <div className="vx-grid-bg" />

      {/* Header */}
      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', padding: '2rem 0 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '4px' }}>VERTEX GO</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4, letterSpacing: 2 }}>LOAN PORTAL</div>
        </div>

        {/* Customer Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', boxShadow: 'var(--glow-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>{data.full_name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: 4 }}>ACC# {data.account_number}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>{data.phone_number}</div>
            </div>
            {loan && (
              <div className={`vx-device-status ${device?.is_locked ? 'locked' : 'unlocked'}`}>
                {device?.is_locked ? '🔒 LOCKED' : '🔓 ACTIVE'}
              </div>
            )}
          </div>
        </div>

        {loan ? (
          <>
            {/* Overdue Alert */}
            {isOverdue && (
              <div className="vx-alert vx-alert-error" style={{ marginBottom: '1rem' }}>
                <div>
                  <strong>⚠ Payment Overdue</strong>
                  <div style={{ marginTop: 4, fontSize: '0.85rem' }}>
                    Your device may be locked. Please make a payment of at least K{loan.daily_rate} to unlock it.
                  </div>
                </div>
              </div>
            )}

            {/* Loan Details */}
            <div className="vx-card" style={{ marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Loan Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Device', value: device?.device_name || device?.device_model || '—' },
                  { label: 'Total Price', value: `K${loan.device_price}` },
                  { label: 'Daily Rate', value: `K${loan.daily_rate}/day`, highlight: true },
                  { label: 'Amount Paid', value: `K${loan.total_paid}`, color: 'var(--accent-green)' },
                  { label: 'Balance Left', value: `K${(loan.balance_due || 0).toFixed(2)}`, color: loan.balance_due > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' },
                  { label: 'Days Remaining', value: daysLeft > 0 ? `~${daysLeft} days` : 'Complete!', color: daysLeft > 0 ? 'var(--text-primary)' : 'var(--accent-green)' },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontWeight: 600, color: item.color || 'var(--text-primary)', fontSize: '0.95rem' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Payment Progress</span>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{pct.toFixed(1)}%</span>
              </div>
              <div className="vx-progress" style={{ height: 10, borderRadius: 5 }}>
                <div
                  className="vx-progress-bar"
                  style={{
                    width: `${pct}%`,
                    borderRadius: 5,
                    background: pct >= 100 ? 'var(--accent-green)' :
                      pct > 60 ? 'var(--accent-cyan)' :
                      pct > 30 ? 'var(--accent-orange)' : 'var(--accent-red)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>K0</span>
                <span>K{loan.device_price}</span>
              </div>
            </div>

            {/* Next payment info */}
            <div style={{ background: 'var(--bg-card)', border: `1px solid ${isOverdue ? 'rgba(255,51,85,0.4)' : 'rgba(0,212,255,0.2)'}`, borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                    {isOverdue ? 'Payment Overdue Since' : 'Next Payment Due'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: isOverdue ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                    {loan.next_due_date ? new Date(loan.next_due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Minimum Due</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    K{loan.daily_rate}
                  </div>
                </div>
              </div>
            </div>

            {pct >= 100 && (
              <div className="vx-alert vx-alert-success">
                🎉 Congratulations! Your device is fully paid off. You own it free and clear!
              </div>
            )}
          </>
        ) : (
          <div className="vx-alert vx-alert-info">
            No active loan found for this account. Contact your Vertex Go agent for assistance.
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          <p>Questions? Contact your Vertex Go agent</p>
          <p style={{ marginTop: 4 }}>VERTEX GO © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
