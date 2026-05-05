import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, getCustomers, getDevices, getLoans, getDashboardStats,
  createCustomer, createDevice, createLoan, createEnrollmentToken,
  recordPayment, getPayments, issueCommand, updateDevice } from '../lib/supabase';

const SUPABASE_URL = 'https://tonlofhigkpbcsmfesjq.supabase.co';

function signOutNow() {
  localStorage.removeItem('vx_role');
  localStorage.removeItem('vx_user_id');
  localStorage.removeItem('vx_email');
  localStorage.removeItem('sb-tonlofhigkpbcsmfesjq-auth-token');
  supabase.auth.signOut().finally(() => {
    window.location.replace('/login');
  });
}

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

  const NAV = [
    { id: 'overview', label: 'Overview', icon: '◈' },
    { id: 'customers', label: 'Customers', icon: '◉' },
    { id: 'enroll-customer', label: 'Enroll Customer', icon: '⊕' },
    { id: 'devices', label: 'Devices', icon: '⬡' },
    { id: 'enroll-device', label: 'Link Device', icon: '⊞' },
    { id: 'loans', label: 'Loans', icon: '◑' },
    { id: 'payments', label: 'Payments', icon: '✦' },
  ];

  const pages = {
    overview: <Overview stats={stats} loans={loans} />,
    customers: <CustomersList customers={customers} refresh={refresh} showToast={showToast} profile={profile} />,
    'enroll-customer': <EnrollCustomer refresh={refresh} showToast={showToast} profile={profile} setActive={setActive} />,
    devices: <DevicesList devices={devices} refresh={refresh} showToast={showToast} profile={profile} />,
    'enroll-device': <LinkDevice customers={customers} refresh={refresh} showToast={showToast} profile={profile} />,
    loans: <LoansList loans={loans} />,
    payments: <RecordPayment loans={loans} refresh={refresh} showToast={showToast} profile={profile} />,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      <div className="vx-grid-bg" />

      {/* Top Bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', height: 56 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 3 }}>VERTEX GO</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.full_name || localStorage.getItem('vx_email')}
          </span>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '1.4rem', cursor: 'pointer', padding: '4px 8px' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, zIndex: 199, background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-bright)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          {NAV.map(item => (
            <div key={item.id} onClick={() => { setActive(item.id); setMenuOpen(false); }}
              style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: active === item.id ? 'var(--accent-cyan)' : 'var(--text-secondary)', background: active === item.id ? 'rgba(0,212,255,0.08)' : 'transparent', fontSize: '0.95rem' }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </div>
          ))}
          <div onClick={signOutNow} style={{ padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: 'var(--accent-red)', fontSize: '0.95rem' }}>
            <span>⏻</span><span>Sign Out</span>
          </div>
        </div>
      )}

      {/* Bottom Tabs */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex' }}>
        {NAV.slice(0, 5).map(item => (
          <button key={item.id} onClick={() => { setActive(item.id); setMenuOpen(false); }}
            style={{ flex: 1, minWidth: 56, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: active === item.id ? 'var(--accent-cyan)' : 'var(--text-muted)', borderTop: active === item.id ? '2px solid var(--accent-cyan)' : '2px solid transparent' }}>
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span style={{ fontSize: '0.58rem', whiteSpace: 'nowrap' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
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

      {toast && (
        <div style={{ position: 'fixed', bottom: '5rem', left: '1rem', right: '1rem', zIndex: 9999, background: toast.type === 'success' ? 'rgba(0,255,136,0.15)' : 'rgba(255,51,85,0.15)', border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,136,0.4)' : 'rgba(255,51,85,0.4)'}`, color: toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', borderRadius: 8, padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}

function Overview({ stats, loans }) {
  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2 }}>Dashboard</h1>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Customers', value: stats.totalCustomers ?? 0, cls: '' },
          { label: 'Active Loans', value: stats.activeLoans ?? 0, cls: 'green' },
          { label: 'Overdue', value: stats.overdueLoans ?? 0, cls: 'red' },
          { label: 'Revenue MTD', value: `K${(stats.monthlyRevenue || 0).toFixed(0)}`, cls: 'orange' },
        ].map((s, i) => (
          <div className={`vx-stat ${s.cls}`} key={i}>
            <div className="vx-stat-value" style={{ fontSize: '1.6rem' }}>{s.value}</div>
            <div className="vx-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="vx-card" style={{ padding: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: 2, color: 'var(--text-secondary)', marginBottom: '0.875rem', textTransform: 'uppercase' }}>Recent Loans</div>
        {loans.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No loans yet</div>}
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

function EnrollCustomer({ refresh, showToast, profile, setActive }) {
  const [form, setForm] = useState({ full_name: '', phone_number: '', id_number: '' });
  const [idFile, setIdFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone_number.trim() || !form.id_number.trim()) {
      showToast('Please fill all fields', 'error'); return;
    }
    setLoading(true);
    try {
      let id_image_url = null;
      if (idFile) {
        try {
          const ext = idFile.name.split('.').pop();
          const path = `${form.id_number.replace(/\//g, '-')}.${ext}`;
          const { error: upErr } = await supabase.storage.from('id-images').upload(path, idFile, { upsert: true });
          if (!upErr) {
            const { data: u } = supabase.storage.from('id-images').getPublicUrl(path);
            id_image_url = u.publicUrl;
          }
        } catch (e) { console.warn('Upload skipped:', e); }
      }
      const { error } = await createCustomer({
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        id_number: form.id_number.trim(),
        account_number: form.id_number.trim(),
        enrolled_by: profile?.id || localStorage.getItem('vx_user_id'),
        ...(id_image_url && { id_image_url }),
      });
      if (error) {
        showToast(error.code === '23505' ? 'Customer with this ID already exists' : error.message, 'error');
        setLoading(false); return;
      }
      showToast(`✓ ${form.full_name} enrolled!`);
      setForm({ full_name: '', phone_number: '', id_number: '' });
      setPreview(null); setIdFile(null);
      await refresh();
      setActive('customers');
    } catch (e) { showToast(e.message, 'error'); }
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
          <label className="vx-label">National ID Number * (= Account Number)</label>
          <input className="vx-input" placeholder="123456/78/9" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} />
          {form.id_number && <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>Account #: <strong>{form.id_number}</strong></div>}
        </div>
        <div className="vx-form-group">
          <label className="vx-label">ID Photo (optional)</label>
          <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '1.25rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
            {preview ? <img src={preview} alt="ID" style={{ maxHeight: 100, borderRadius: 6, maxWidth: '100%' }} /> : <><div style={{ fontSize: '1.75rem' }}>📷</div><div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Tap to upload ID photo</div></>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (!f) return; setIdFile(f); const r = new FileReader(); r.onloadend = () => setPreview(r.result); r.readAsDataURL(f); }} />
        </div>
        <button className="vx-btn vx-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '0.95rem', letterSpacing: 2 }} onClick={handleSubmit} disabled={loading}>
          {loading ? <><span className="vx-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> ENROLLING...</> : '⊕ ENROLL CUSTOMER'}
        </button>
      </div>
    </div>
  );
}

function CustomersList({ customers, showToast, profile }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const filtered = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.account_number?.includes(search) || c.phone_number?.includes(search)
  );
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2 }}>Customers</h1>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{customers.length}</span>
      </div>
      <input className="vx-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem' }} />
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
                  <div className="vx-progress"><div className="vx-progress-bar" style={{ width: `${Math.min(100, (loan.total_paid / loan.device_price) * 100)}%` }} /></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>K{loan.total_paid} paid · K{(loan.balance_due || 0).toFixed(0)} left</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selected && (
        <div className="vx-modal-overlay" onClick={() => setSelected(null)}>
          <div className="vx-modal" onClick={e => e.stopPropagation()}>
            <div className="vx-modal-title">◉ Customer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1rem' }}>
              <div><div className="vx-label">Name</div><div style={{ fontWeight: 600 }}>{selected.full_name}</div></div>
              <div><div className="vx-label">Account #</div><div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{selected.account_number}</div></div>
              <div><div className="vx-label">Phone</div><div>{selected.phone_number}</div></div>
              <div><div className="vx-label">ID</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{selected.id_number}</div></div>
            </div>
            {selected.id_image_url && <img src={selected.id_image_url} alt="ID" style={{ maxHeight: 100, borderRadius: 6, marginBottom: '1rem' }} />}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="vx-btn vx-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSelected(null)}>Close</button>
              <a href={`/customer/${selected.account_number}`} target="_blank" rel="noreferrer" className="vx-btn vx-btn-primary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>Customer View</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DevicesList({ devices, refresh, showToast, profile }) {
  const [cmdLoading, setCmdLoading] = useState('');
  const sendCmd = async (device, cmd) => {
    setCmdLoading(device.id + cmd);
    try {
      await issueCommand(device.id, cmd, profile?.id || localStorage.getItem('vx_user_id'));
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
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{devices.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {devices.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No devices yet</div>}
        {devices.map(d => (
          <div key={d.id} className="vx-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{d.device_name || d.device_model || 'Device'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.device_imei}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{d.customers?.full_name || 'Unassigned'} · K{d.daily_rate}/day</div>
              </div>
              <span className={`vx-badge ${d.is_locked ? 'vx-badge-danger' : 'vx-badge-success'}`}>{d.is_locked ? '🔒 Locked' : '🔓 Active'}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`vx-badge ${d.is_enrolled ? 'vx-badge-success' : 'vx-badge-warning'}`} style={{ fontSize: '0.65rem' }}>{d.is_enrolled ? 'Enrolled' : 'Pending'}</span>
              {!d.is_locked
                ? <button className="vx-btn vx-btn-danger vx-btn-sm" disabled={cmdLoading === d.id + 'lock'} onClick={() => sendCmd(d, 'lock')}>Lock</button>
                : <button className="vx-btn vx-btn-success vx-btn-sm" disabled={cmdLoading === d.id + 'unlock'} onClick={() => sendCmd(d, 'unlock')}>Unlock</button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Link Device with QR Code ──────────────────────────────────────────────────
function LinkDevice({ customers, refresh, showToast, profile }) {
  const [step, setStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [form, setForm] = useState({ device_imei: '', device_name: '', device_model: '', device_price: '', daily_rate: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const qrRef = useRef();

  const handleGenerate = async () => {
    if (!selectedCustomer || !form.device_imei || !form.daily_rate || !form.device_price) {
      showToast('Fill all required fields', 'error'); return;
    }
    setLoading(true);
    try {
      const userId = profile?.id || localStorage.getItem('vx_user_id');

      const { data: device, error: devErr } = await createDevice({
        device_imei: form.device_imei.trim(),
        device_name: form.device_name.trim(),
        device_model: form.device_model.trim(),
        daily_rate: parseFloat(form.daily_rate),
        customer_id: selectedCustomer,
        enrolled_by: userId,
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

      const { data: tokenData, error: tokErr } = await createEnrollmentToken({
        device_id: device.id,
        customer_id: selectedCustomer,
        daily_rate: parseFloat(form.daily_rate),
        created_by: userId,
      });
      if (tokErr) throw new Error(tokErr.message);

      const customer = customers.find(c => c.id === selectedCustomer);

      // Build the DPC QR payload for Android Device Owner enrollment
      const qrPayload = JSON.stringify({
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
          "com.vertexgo.app/.VertexGoDeviceAdminReceiver",
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
          `https://github.com/sammysam254/vertextgo/releases/latest/download/VertexGo_release.apk`,
        "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false,
        "android.app.extra.PROVISIONING_WIFI_SSID": "",
        "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
          "enrollment_token": tokenData.token,
          "customer_account": customer?.account_number,
          "device_id": device.id,
          "supabase_url": SUPABASE_URL,
        }
      });

      setResult({
        token: tokenData.token,
        qrPayload,
        device,
        customer,
        deviceId: device.id,
      });
      setStep(3);
      refresh();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  };

  // Generate QR using Google Charts API (no library needed)
  const getQRUrl = (text) => {
    const encoded = encodeURIComponent(text);
    return `https://chart.googleapis.com/chart?chs=280x280&cht=qr&chl=${encoded}&choe=UTF-8`;
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2, marginBottom: '1rem' }}>Link Device</h1>

      {/* Steps */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {['Customer', 'Device Info', 'Token & QR'].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step > i + 1 ? 'var(--accent-green)' : step === i + 1 ? 'var(--accent-cyan)' : 'var(--border)', color: step >= i + 1 ? 'var(--bg-primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem' }}>{step > i + 1 ? '✓' : i + 1}</div>
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
            { key: 'device_imei', label: 'IMEI *', placeholder: '35XXXXXXXXXXXX' },
            { key: 'device_name', label: 'Device Name *', placeholder: 'Samsung Galaxy A15' },
            { key: 'device_model', label: 'Model Number', placeholder: 'SM-A155F' },
            { key: 'device_price', label: 'Total Price (K) *', placeholder: '2500' },
            { key: 'daily_rate', label: 'Daily Payment (K) *', placeholder: '25' },
          ].map(f => (
            <div className="vx-form-group" key={f.key}>
              <label className="vx-label">{f.label}</label>
              <input className="vx-input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} type={f.key.includes('price') || f.key.includes('rate') ? 'number' : 'text'} />
            </div>
          ))}
          {form.device_price && form.daily_rate && (
            <div className="vx-alert vx-alert-info" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
              ~{Math.ceil(parseFloat(form.device_price) / parseFloat(form.daily_rate))} days to complete · K{form.daily_rate}/day
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="vx-btn vx-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>← Back</button>
            <button className="vx-btn vx-btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleGenerate} disabled={loading}>
              {loading ? <><span className="vx-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</> : '⊞ Generate Token & QR'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="vx-card">
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>Enrollment Ready!</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4 }}>
              {result.customer?.full_name} · {result.device?.device_name}
            </div>
          </div>

          {/* QR CODE */}
          <div style={{ background: 'white', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <img
              src={getQRUrl(result.qrPayload)}
              alt="DPC Enrollment QR"
              style={{ width: 240, height: 240 }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Scan on phone during factory reset setup to enroll as Device Owner
          </div>

          {/* Token */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <div className="vx-label" style={{ marginBottom: 6 }}>Enrollment Token</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)', wordBreak: 'break-all', background: 'var(--bg-primary)', borderRadius: 6, padding: '0.75rem', border: '1px solid var(--border-bright)' }}>
              {result.token}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="vx-btn vx-btn-secondary vx-btn-sm" onClick={() => { navigator.clipboard.writeText(result.token); showToast('Token copied!'); }}>
                Copy Token
              </button>
              <button className="vx-btn vx-btn-secondary vx-btn-sm" onClick={() => { navigator.clipboard.writeText(result.qrPayload); showToast('QR payload copied!'); }}>
                Copy QR Data
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="vx-alert vx-alert-info" style={{ fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.8 }}>
            <strong>📱 Device Enrollment Steps:</strong><br />
            1. Factory reset the target phone<br />
            2. On "Welcome" screen, tap screen <strong>6 times</strong><br />
            3. Scan the QR code above with a QR scanner<br />
            4. Vertex Go installs automatically as Device Owner<br />
            5. Customer logs in with: <strong>{result.customer?.account_number}</strong>
          </div>

          <button className="vx-btn vx-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => { setStep(1); setSelectedCustomer(''); setForm({ device_imei: '', device_name: '', device_model: '', device_price: '', daily_rate: '' }); setResult(null); }}>
            Enroll Another Device
          </button>
        </div>
      )}
    </div>
  );
}

function LoansList({ loans }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 2 }}>Loans</h1>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{loans.length}</span>
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
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{loan.devices?.device_model || '—'} · K{loan.daily_rate}/day</div>
                </div>
                <span className={`vx-badge ${loan.status === 'active' ? 'vx-badge-info' : loan.status === 'completed' ? 'vx-badge-success' : 'vx-badge-danger'}`}>{loan.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PRICE</div><div>K{loan.device_price}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PAID</div><div style={{ color: 'var(--accent-green)' }}>K{loan.total_paid}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>LEFT</div><div style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>K{(loan.balance_due || 0).toFixed(0)}</div></div>
              </div>
              <div className="vx-progress">
                <div className="vx-progress-bar" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent-green)' : pct > 50 ? 'var(--accent-cyan)' : 'var(--accent-orange)' }} />
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{pct.toFixed(0)}% paid</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecordPayment({ loans, refresh, showToast, profile }) {
  const [selectedLoan, setSelectedLoan] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const activeLoans = loans.filter(l => l.status === 'active');
  const loan = activeLoans.find(l => l.id === selectedLoan);

  useEffect(() => {
    if (selectedLoan) getPayments(selectedLoan).then(({ data }) => setPayments(data || []));
  }, [selectedLoan]);

  const handlePay = async () => {
    if (!selectedLoan || !amount) { showToast('Select loan and enter amount', 'error'); return; }
    setLoading(true);
    try {
      const { error } = await recordPayment({
        loan_id: selectedLoan,
        customer_id: loan.customer_id,
        amount: parseFloat(amount),
        recorded_by: profile?.id || localStorage.getItem('vx_user_id'),
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
          <label className="vx-label">Select Customer</label>
          <select className="vx-select" value={selectedLoan} onChange={e => setSelectedLoan(e.target.value)}>
            <option value="">-- Choose --</option>
            {activeLoans.map(l => <option key={l.id} value={l.id}>{l.customers?.full_name} — K{(l.balance_due || 0).toFixed(0)} left</option>)}
          </select>
        </div>
        {loan && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.875rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>DAILY</div><div style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>K{loan.daily_rate}</div></div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>BALANCE</div><div style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>K{(loan.balance_due || 0).toFixed(2)}</div></div>
          </div>
        )}
        <div className="vx-form-group">
          <label className="vx-label">Amount (K)</label>
          <input className="vx-input" type="number" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} />
          {loan && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {[loan.daily_rate, loan.daily_rate * 7, loan.daily_rate * 30].map(a => (
                <button key={a} className="vx-btn vx-btn-secondary vx-btn-sm" onClick={() => setAmount(a.toFixed(2))}>K{a.toFixed(0)}</button>
              ))}
            </div>
          )}
        </div>
        <div className="vx-form-group">
          <label className="vx-label">Notes</label>
          <input className="vx-input" placeholder="Mobile money ref, cash..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button className="vx-btn vx-btn-success" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }} onClick={handlePay} disabled={loading || !selectedLoan || !amount}>
          {loading ? 'Processing...' : '✦ Record & Unlock Device'}
        </button>
      </div>
      {payments.length > 0 && (
        <div className="vx-card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>Payment History</div>
          {payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
              <div><div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>K{p.amount}</div><div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{p.notes || 'Payment'}</div></div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{new Date(p.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
