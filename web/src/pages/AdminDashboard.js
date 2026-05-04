import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut, supabase, getCustomers, getDevices, getLoans,
  getDashboardStats, createCustomer, createDevice, createLoan,
  createEnrollmentToken, recordPayment, getPayments, issueCommand, updateDevice } from '../lib/supabase';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [active, setActive] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [customers, setCustomers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, c, d, l] = await Promise.all([
        getDashboardStats(), getCustomers(), getDevices(), getLoans()
      ]);
      setStats(s || {});
      setCustomers(c.data || []);
      setDevices(d.data || []);
      setLoans(l.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const NAV = [
    { id: 'overview', label: 'Overview', icon: '◈' },
    { id: 'customers', label: 'Customers', icon: '◉' },
    { id: 'enroll-customer', label: 'Enroll Customer', icon: '⊕' },
    { id: 'devices', label: 'Devices', icon: '⬡' },
    { id: 'enroll-device', label: 'Link Device', icon: '⊞' },
    { id: 'loans', label: 'Loans', icon: '◑' },
    { id: 'payments', label: 'Record Payment', icon: '✦' },
  ];

  const pages = {
    overview: <Overview stats={stats} loans={loans} />,
    customers: <CustomersList customers={customers} refresh={refresh} showToast={showToast} profile={profile} />,
    'enroll-customer': <EnrollCustomer refresh={refresh} showToast={showToast} profile={profile} setActive={setActive} />,
    devices: <DevicesList devices={devices} refresh={refresh} showToast={showToast} profile={profile} />,
    'enroll-device': <LinkDevice customers={customers} devices={devices} refresh={refresh} showToast={showToast} profile={profile} />,
    loans: <LoansList loans={loans} />,
    payments: <RecordPayment loans={loans} refresh={refresh} showToast={showToast} profile={profile} />,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      <div className="vx-grid-bg" />

      {/* Mobile Top Bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', height: 56 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 3 }}>VERTEX GO</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name}</span>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '1.4rem', cursor: 'pointer', padding: '4px 8px' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, zIndex: 199, background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-bright)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          {NAV.map(item => (
            <div key={item.id}
              onClick={() => { setActive(item.id); setMenuOpen(false); }}
              style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: active === item.id ? 'var(--accent-cyan)' : 'var(--text-secondary)', background: active === item.id ? 'rgba(0,212,255,0.08)' : 'transparent', fontSize: '0.95rem', fontWeight: active === item.id ? 600 : 400 }}>
              <span>{item.icon}</span><span>{item.label}</span>
              {active === item.id && <span style={{ marginLeft: 'auto', color: 'var(--accent-cyan)' }}>▸</span>}
            </div>
          ))}
          <div onClick={handleSignOut} style={{ padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: 'var(--accent-red)', fontSize: '0.95rem' }}>
            <span>⏻</span><span>Sign Out</span>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar (mobile) */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', overflowX: 'auto' }}>
        {NAV.slice(0, 5).map(item => (
          <button key={item.id} onClick={() => { setActive(item.id); setMenuOpen(false); }}
            style={{ flex: 1, minWidth: 56, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: active === item.id ? 'var(--accent-cyan)' : 'var(--text-muted)', borderTop: active === item.id ? '2px solid var(--accent-cyan)' : '2px solid transparent', transition: 'all 0.15s' }}>
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span style={{ fontSize: '0.6rem', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ paddingTop: 64, paddingBottom: 72, minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="vx-spinner" />
          </div>
        ) : (
          <div style={{ padding: '1rem', maxWidth: 900, margin: '0 auto' }} className="fade-in">
            {pages[active]}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '5rem', left: '1rem', right: '1rem', zIndex: 9999, background: toast.type === 'success' ? 'rgba(0,255,136,0.15)' : 'rgba(255,51,85,0.15)', border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,136,0.4)' : 'rgba(255,51,85,0.4)'}`, color: toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', borderRadius: 8, padding: '0.875rem 1rem', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease', textAlign: 'center' }}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ stats, loans }) {
  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2 }}>Dashboard</h1>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Customers', value: stats.totalCustomers ?? 0, cls: '' },
          { label: 'Active Loans', value: stats.activeLoans ?? 0, cls: 'green' },
          { label: 'Overdue', value: stats.overdueLoans ?? 0, cls: 'red' },
          { label: 'Revenue (MTD)', value: `K${(stats.monthlyRevenue || 0).toFixed(0)}`, cls: 'orange' },
        ].map((s, i) => (
          <div className={`vx-stat ${s.cls}`} key={i}>
            <div className="vx-stat-value" style={{ fontSize: '1.6rem' }}>{s.value}</div>
            <div className="vx-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="vx-card" style={{ padding: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: 2, color: 'var(--text-secondary)', marginBottom: '0.875rem', textTransform: 'uppercase' }}>Recent Loans</div>
        {loans.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>No loans yet</div>}
        {loans.slice(0, 5).map(loan => (
          <div key={loan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{loan.customers?.full_name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{loan.devices?.device_model || '—'} · K{loan.daily_rate}/day</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: loan.balance_due > 0 ? 'var(--accent-orange)' : 'var(--accent-green)', fontWeight: 700, fontSize: '0.875rem' }}>K{(loan.balance_due || 0).toFixed(0)}</div>
              <span className={`vx-badge ${loan.status === 'active' ? 'vx-badge-info' : 'vx-badge-success'}`} style={{ fontSize: '0.65rem' }}>{loan.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Enroll Customer ───────────────────────────────────────────────────────────
function EnrollCustomer({ refresh, showToast, profile, setActive }) {
  const [form, setForm] = useState({ full_name: '', phone_number: '', id_number: '' });
  const [idFile, setIdFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIdFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone_number.trim() || !form.id_number.trim()) {
      showToast('Please fill all fields', 'error'); return;
    }
    setLoading(true);
    try {
      let id_image_url = null;

      // Upload ID image if provided
      if (idFile) {
        try {
          const ext = idFile.name.split('.').pop();
          const path = `${form.id_number.replace(/\//g, '-')}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from('id-images')
            .upload(path, idFile, { upsert: true });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('id-images').getPublicUrl(path);
            id_image_url = urlData.publicUrl;
          }
        } catch (uploadEx) {
          console.warn('ID upload failed, continuing without image:', uploadEx);
        }
      }

      const customerData = {
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        id_number: form.id_number.trim(),
        account_number: form.id_number.trim(),
        enrolled_by: profile?.id || null,
      };
      if (id_image_url) customerData.id_image_url = id_image_url;

      const { data, error } = await createCustomer(customerData);

      if (error) {
        if (error.code === '23505') {
          showToast('A customer with this ID number already exists', 'error');
        } else {
          showToast(error.message || 'Failed to enroll customer', 'error');
        }
        setLoading(false);
        return;
      }

      showToast(`✓ ${form.full_name} enrolled! Account: ${form.id_number}`);
      setForm({ full_name: '', phone_number: '', id_number: '' });
      setPreview(null);
      setIdFile(null);
      await refresh();
      setActive('customers');
    } catch (e) {
      console.error('Enroll error:', e);
      showToast(e.message || 'Enrollment failed', 'error');
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2, marginBottom: '1.25rem' }}>Enroll Customer</h1>
      <div className="vx-card">
        <div className="vx-form-group">
          <label className="vx-label">Full Name *</label>
          <input className="vx-input" placeholder="John Banda" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="vx-form-group">
          <label className="vx-label">Phone Number *</label>
          <input className="vx-input" placeholder="+260 97X XXX XXX" type="tel" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
        </div>
        <div className="vx-form-group">
          <label className="vx-label">National ID Number * (becomes Account Number)</label>
          <input className="vx-input" placeholder="123456/78/9" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} />
          {form.id_number && (
            <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              Account #: <strong>{form.id_number}</strong>
            </div>
          )}
        </div>
        <div className="vx-form-group">
          <label className="vx-label">ID Document / Photo (optional)</label>
          <div onClick={() => fileRef.current.click()}
            style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '1.25rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)', minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
            {preview ? (
              <img src={preview} alt="ID" style={{ maxHeight: 120, borderRadius: 6, maxWidth: '100%' }} />
            ) : (
              <>
                <div style={{ fontSize: '1.75rem' }}>📷</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Tap to upload ID photo</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
          {idFile && <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--accent-green)' }}>✓ {idFile.name}</div>}
        </div>
        <button
          className="vx-btn vx-btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '0.95rem', letterSpacing: 2, marginTop: 4 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <span className="vx-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              ENROLLING...
            </span>
          ) : '⊕ ENROLL CUSTOMER'}
        </button>
      </div>
    </div>
  );
}

// ── Customers List ────────────────────────────────────────────────────────────
function CustomersList({ customers, showToast, profile }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.account_number?.includes(search) ||
    c.phone_number?.includes(search)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2 }}>Customers</h1>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{customers.length} total</span>
      </div>
      <input className="vx-input" placeholder="Search name, account, phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No customers found</div>}
        {filtered.map(c => {
          const loan = c.loans?.[0];
          return (
            <div key={c.id} className="vx-card" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => setSelected(c)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>{c.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>#{c.account_number}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.phone_number}</div>
                </div>
                <span className={`vx-badge ${loan ? (loan.status === 'active' ? 'vx-badge-info' : 'vx-badge-success') : 'vx-badge-warning'}`}>
                  {loan ? loan.status : 'No Loan'}
                </span>
              </div>
              {loan && (
                <div style={{ marginTop: '0.625rem' }}>
                  <div className="vx-progress">
                    <div className="vx-progress-bar" style={{ width: `${Math.min(100, (loan.total_paid / loan.device_price) * 100)}%` }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                    K{loan.total_paid} paid · K{(loan.balance_due || 0).toFixed(0)} remaining
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selected && <CustomerModal customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CustomerModal({ customer, onClose }) {
  const loan = customer.loans?.[0];
  const pct = loan ? Math.min(100, (loan.total_paid / loan.device_price) * 100) : 0;
  return (
    <div className="vx-modal-overlay" onClick={onClose}>
      <div className="vx-modal" onClick={e => e.stopPropagation()}>
        <div className="vx-modal-title">◉ Customer Profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1rem' }}>
          <div><div className="vx-label">Name</div><div style={{ fontWeight: 600 }}>{customer.full_name}</div></div>
          <div><div className="vx-label">Account #</div><div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{customer.account_number}</div></div>
          <div><div className="vx-label">Phone</div><div style={{ fontSize: '0.875rem' }}>{customer.phone_number}</div></div>
          <div><div className="vx-label">National ID</div><div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{customer.id_number}</div></div>
        </div>
        {customer.id_image_url && <img src={customer.id_image_url} alt="ID" style={{ maxHeight: 100, borderRadius: 6, marginBottom: '1rem', border: '1px solid var(--border)' }} />}
        {loan && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.875rem', marginBottom: '1rem' }}>
            <div className="vx-label" style={{ marginBottom: '0.75rem' }}>Loan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <div><div className="vx-label" style={{ fontSize: '0.65rem' }}>Device</div><div>{loan.devices?.device_model || '—'}</div></div>
              <div><div className="vx-label" style={{ fontSize: '0.65rem' }}>Price</div><div>K{loan.device_price}</div></div>
              <div><div className="vx-label" style={{ fontSize: '0.65rem' }}>Daily</div><div style={{ color: 'var(--accent-cyan)' }}>K{loan.daily_rate}</div></div>
              <div><div className="vx-label" style={{ fontSize: '0.65rem' }}>Balance</div><div style={{ color: 'var(--accent-orange)' }}>K{(loan.balance_due || 0).toFixed(2)}</div></div>
            </div>
            <div className="vx-progress">
              <div className="vx-progress-bar" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{pct.toFixed(0)}% paid</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="vx-btn vx-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Close</button>
          <a href={`/customer/${customer.account_number}`} target="_blank" rel="noreferrer" className="vx-btn vx-btn-primary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>View Portal</a>
        </div>
      </div>
    </div>
  );
}

// ── Devices List ──────────────────────────────────────────────────────────────
function DevicesList({ devices, refresh, showToast, profile }) {
  const [cmdLoading, setCmdLoading] = useState('');
  const sendCommand = async (device, cmd) => {
    setCmdLoading(device.id + cmd);
    try {
      await issueCommand(device.id, cmd, profile.id);
      await updateDevice(device.id, { is_locked: cmd === 'lock' });
      showToast(`${cmd.toUpperCase()} command sent`);
      refresh();
    } catch (e) { showToast(e.message, 'error'); }
    setCmdLoading('');
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2 }}>Devices</h1>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{devices.length} total</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {devices.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No devices enrolled yet</div>}
        {devices.map(d => (
          <div key={d.id} className="vx-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{d.device_name || d.device_model || 'Unknown Device'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.device_imei}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{d.customers?.full_name || 'Unassigned'} · K{d.daily_rate}/day</div>
              </div>
              <span className={`vx-badge ${d.is_locked ? 'vx-badge-danger' : 'vx-badge-success'}`}>
                {d.is_locked ? '🔒 Locked' : '🔓 Active'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className={`vx-badge ${d.is_enrolled ? 'vx-badge-success' : 'vx-badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                {d.is_enrolled ? 'Enrolled' : 'Pending'}
              </span>
              {!d.is_locked ? (
                <button className="vx-btn vx-btn-danger vx-btn-sm" disabled={cmdLoading === d.id + 'lock'} onClick={() => sendCommand(d, 'lock')}>Lock</button>
              ) : (
                <button className="vx-btn vx-btn-success vx-btn-sm" disabled={cmdLoading === d.id + 'unlock'} onClick={() => sendCommand(d, 'unlock')}>Unlock</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Link Device ───────────────────────────────────────────────────────────────
function LinkDevice({ customers, refresh, showToast, profile }) {
  const [step, setStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [form, setForm] = useState({ device_imei: '', device_name: '', device_model: '', device_price: '', daily_rate: '' });
  const [loading, setLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState(null);

  const handleGenerate = async () => {
    if (!selectedCustomer || !form.device_imei || !form.daily_rate || !form.device_price) {
      showToast('Fill all fields', 'error'); return;
    }
    setLoading(true);
    try {
      const { data: device, error: devErr } = await createDevice({
        device_imei: form.device_imei.trim(),
        device_name: form.device_name.trim(),
        device_model: form.device_model.trim(),
        daily_rate: parseFloat(form.daily_rate),
        customer_id: selectedCustomer,
        enrolled_by: profile.id,
        is_enrolled: false,
      });
      if (devErr) throw new Error(devErr.message);

      const { error: loanErr } = await createLoan({
        customer_id: selectedCustomer,
        device_id: device.id,
        device_price: parseFloat(form.device_price),
        daily_rate: parseFloat(form.daily_rate),
      });
      if (loanErr) throw new Error(loanErr.message);

      const { data: token, error: tokErr } = await createEnrollmentToken({
        device_id: device.id,
        customer_id: selectedCustomer,
        daily_rate: parseFloat(form.daily_rate),
        created_by: profile.id,
      });
      if (tokErr) throw new Error(tokErr.message);

      const customer = customers.find(c => c.id === selectedCustomer);
      setTokenResult({ token: token.token, device, customer });
      setStep(3);
      refresh();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2, marginBottom: '1rem' }}>Link Device</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {['Customer', 'Device', 'Token'].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step > i + 1 ? 'var(--accent-green)' : step === i + 1 ? 'var(--accent-cyan)' : 'var(--border)', color: step >= i + 1 ? 'var(--bg-primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem' }}>{i + 1}</div>
            <div style={{ fontSize: '0.65rem', color: step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="vx-card">
          <div className="vx-form-group">
            <label className="vx-label">Select Customer</label>
            <select className="vx-select" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
              <option value="">-- Choose customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.account_number})</option>)}
            </select>
          </div>
          <button className="vx-btn vx-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!selectedCustomer} onClick={() => setStep(2)}>Next →</button>
        </div>
      )}

      {step === 2 && (
        <div className="vx-card">
          {[
            { key: 'device_imei', label: 'Device IMEI *', placeholder: '35XXXXXXXXXXXX', type: 'text' },
            { key: 'device_name', label: 'Device Name *', placeholder: 'Samsung Galaxy A15', type: 'text' },
            { key: 'device_model', label: 'Model Number', placeholder: 'SM-A155F', type: 'text' },
            { key: 'device_price', label: 'Total Price (K) *', placeholder: '2500', type: 'number' },
            { key: 'daily_rate', label: 'Daily Payment (K) *', placeholder: '25', type: 'number' },
          ].map(f => (
            <div className="vx-form-group" key={f.key}>
              <label className="vx-label">{f.label}</label>
              <input className="vx-input" type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
          {form.device_price && form.daily_rate && (
            <div className="vx-alert vx-alert-info" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
              ~{Math.ceil(parseFloat(form.device_price) / parseFloat(form.daily_rate))} days · K{form.daily_rate}/day
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="vx-btn vx-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>← Back</button>
            <button className="vx-btn vx-btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Token →'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && tokenResult && (
        <div className="vx-card">
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>Enrollment Ready!</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.82rem' }}>{tokenResult.customer?.full_name} · {tokenResult.device?.device_name}</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <div className="vx-label" style={{ marginBottom: 6 }}>Enrollment Token</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-cyan)', wordBreak: 'break-all', background: 'var(--bg-primary)', borderRadius: 6, padding: '0.75rem', border: '1px solid var(--border-bright)', letterSpacing: 1 }}>
              {tokenResult.token}
            </div>
            <button className="vx-btn vx-btn-secondary vx-btn-sm" style={{ marginTop: 8 }} onClick={() => { navigator.clipboard.writeText(tokenResult.token); showToast('Token copied!'); }}>
              Copy Token
            </button>
          </div>
          <div className="vx-alert vx-alert-info" style={{ fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.7 }}>
            <strong>Enrollment Steps:</strong><br />
            1. Factory reset the phone<br />
            2. Tap screen 6x on welcome screen<br />
            3. Enter token above<br />
            4. Vertex Go installs as Device Owner<br />
            5. Log in with account: <strong>{tokenResult.customer?.account_number}</strong>
          </div>
          <button className="vx-btn vx-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setStep(1); setSelectedCustomer(''); setForm({ device_imei: '', device_name: '', device_model: '', device_price: '', daily_rate: '' }); setTokenResult(null); }}>
            Enroll Another
          </button>
        </div>
      )}
    </div>
  );
}

// ── Loans List ────────────────────────────────────────────────────────────────
function LoansList({ loans }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2 }}>Loans</h1>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{loans.length} total</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {loans.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No loans yet</div>}
        {loans.map(loan => {
          const pct = Math.min(100, (loan.total_paid / loan.device_price) * 100);
          return (
            <div key={loan.id} className="vx-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{loan.customers?.full_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{loan.devices?.device_model || '—'}</div>
                </div>
                <span className={`vx-badge ${loan.status === 'active' ? 'vx-badge-info' : loan.status === 'completed' ? 'vx-badge-success' : 'vx-badge-danger'}`}>{loan.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '0.625rem', fontSize: '0.8rem' }}>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PRICE</div><div>K{loan.device_price}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PAID</div><div style={{ color: 'var(--accent-green)' }}>K{loan.total_paid}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>BALANCE</div><div style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>K{(loan.balance_due || 0).toFixed(0)}</div></div>
              </div>
              <div className="vx-progress">
                <div className="vx-progress-bar" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent-green)' : pct > 50 ? 'var(--accent-cyan)' : 'var(--accent-orange)' }} />
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{pct.toFixed(0)}% · K{loan.daily_rate}/day</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Record Payment ────────────────────────────────────────────────────────────
function RecordPayment({ loans, refresh, showToast, profile }) {
  const [selectedLoan, setSelectedLoan] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);

  const activeLoans = loans.filter(l => l.status === 'active');
  const loan = activeLoans.find(l => l.id === selectedLoan);

  useEffect(() => {
    if (selectedLoan) {
      getPayments(selectedLoan).then(({ data }) => setPayments(data || []));
    }
  }, [selectedLoan]);

  const handlePay = async () => {
    if (!selectedLoan || !amount) { showToast('Select loan and enter amount', 'error'); return; }
    setLoading(true);
    try {
      const { error } = await recordPayment({
        loan_id: selectedLoan,
        customer_id: loan.customer_id,
        amount: parseFloat(amount),
        recorded_by: profile.id,
        notes,
      });
      if (error) throw error;
      showToast(`✓ K${amount} recorded — device unlocked!`);
      setAmount(''); setNotes('');
      refresh();
      const { data } = await getPayments(selectedLoan);
      setPayments(data || []);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2, marginBottom: '1rem' }}>Record Payment</h1>
      <div className="vx-card" style={{ marginBottom: '1rem' }}>
        <div className="vx-form-group">
          <label className="vx-label">Select Customer / Loan</label>
          <select className="vx-select" value={selectedLoan} onChange={e => setSelectedLoan(e.target.value)}>
            <option value="">-- Choose loan --</option>
            {activeLoans.map(l => <option key={l.id} value={l.id}>{l.customers?.full_name} — Balance: K{(l.balance_due || 0).toFixed(0)}</option>)}
          </select>
        </div>
        {loan && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.875rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>DAILY RATE</div><div style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>K{loan.daily_rate}</div></div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>BALANCE DUE</div><div style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>K{(loan.balance_due || 0).toFixed(2)}</div></div>
          </div>
        )}
        <div className="vx-form-group">
          <label className="vx-label">Amount (K)</label>
          <input className="vx-input" type="number" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} />
          {loan && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {[loan.daily_rate, loan.daily_rate * 7, loan.daily_rate * 30].map(a => (
                <button key={a} className="vx-btn vx-btn-secondary vx-btn-sm" onClick={() => setAmount(a.toFixed(2))}>K{a.toFixed(0)}</button>
              ))}
            </div>
          )}
        </div>
        <div className="vx-form-group">
          <label className="vx-label">Notes (optional)</label>
          <input className="vx-input" placeholder="Mobile money ref, cash..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button className="vx-btn vx-btn-success" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '0.9rem' }} onClick={handlePay} disabled={loading || !selectedLoan || !amount}>
          {loading ? 'Processing...' : '✦ Record & Unlock Device'}
        </button>
      </div>

      {selectedLoan && payments.length > 0 && (
        <div className="vx-card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>Payment History</div>
          {payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>K{p.amount}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{p.notes || 'Payment'}</div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{new Date(p.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
