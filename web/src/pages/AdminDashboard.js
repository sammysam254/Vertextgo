import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';
import {
  supabase, getCustomers, getDevices, getLoans, getDashboardStats,
  createCustomer, createDevice, createLoan, createEnrollmentToken,
  recordPayment, getPayments, issueCommand, updateDevice
} from '../lib/supabase';

const SIDEBAR_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { section: 'CUSTOMERS' },
  { id: 'customers', label: 'All Customers', icon: '◉' },
  { id: 'enroll-customer', label: 'Enroll Customer', icon: '⊕' },
  { section: 'DEVICES' },
  { id: 'devices', label: 'Device Fleet', icon: '⬡' },
  { id: 'enroll-device', label: 'Link to Device', icon: '⊞' },
  { section: 'LOANS' },
  { id: 'loans', label: 'Active Loans', icon: '◑' },
  { id: 'payments', label: 'Record Payment', icon: '✦' },
];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [active, setActive] = useState('overview');
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
    const [s, c, d, l] = await Promise.all([getDashboardStats(), getCustomers(), getDevices(), getLoans()]);
    setStats(s);
    setCustomers(c.data || []);
    setDevices(d.data || []);
    setLoans(l.data || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const pages = {
    overview: <Overview stats={stats} loans={loans} />,
    customers: <CustomersList customers={customers} refresh={refresh} showToast={showToast} profile={profile} />,
    'enroll-customer': <EnrollCustomer refresh={refresh} showToast={showToast} profile={profile} setActive={setActive} />,
    devices: <DevicesList devices={devices} refresh={refresh} showToast={showToast} profile={profile} />,
    'enroll-device': <LinkDeviceToCustomer customers={customers} devices={devices} refresh={refresh} showToast={showToast} profile={profile} />,
    loans: <LoansList loans={loans} refresh={refresh} showToast={showToast} profile={profile} />,
    payments: <RecordPayment loans={loans} refresh={refresh} showToast={showToast} profile={profile} />,
  };

  return (
    <div className="vx-layout">
      <div className="vx-grid-bg" />
      <Sidebar items={SIDEBAR_ITEMS} activeItem={active} onSelect={setActive} role={profile?.role} />

      <main className="vx-main" style={{ position: 'relative', zIndex: 1 }}>
        {loading && active === 'overview' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="vx-spinner" />
          </div>
        ) : (
          <div className="fade-in">{pages[active]}</div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          background: toast.type === 'success' ? 'rgba(0,255,136,0.15)' : 'rgba(255,51,85,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,136,0.4)' : 'rgba(255,51,85,0.4)'}`,
          color: toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
          borderRadius: '8px', padding: '1rem 1.5rem', fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease'
        }}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ stats, loans }) {
  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: 'var(--accent-cyan)' }}>Dashboard</h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="vx-stat">
          <div className="vx-stat-value">{stats.totalCustomers ?? '—'}</div>
          <div className="vx-stat-label">Total Customers</div>
        </div>
        <div className="vx-stat green">
          <div className="vx-stat-value" style={{ color: 'var(--accent-green)' }}>{stats.activeLoans ?? '—'}</div>
          <div className="vx-stat-label">Active Loans</div>
        </div>
        <div className="vx-stat red">
          <div className="vx-stat-value" style={{ color: 'var(--accent-red)' }}>{stats.overdueLoans ?? '—'}</div>
          <div className="vx-stat-label">Overdue Today</div>
        </div>
        <div className="vx-stat orange">
          <div className="vx-stat-value" style={{ color: 'var(--accent-orange)' }}>
            K{(stats.monthlyRevenue || 0).toFixed(0)}
          </div>
          <div className="vx-stat-label">This Month Revenue</div>
        </div>
      </div>

      <div className="vx-card">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Recent Active Loans
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="vx-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Device</th>
                <th>Daily Rate</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.slice(0, 8).map(loan => (
                <tr key={loan.id}>
                  <td>{loan.customers?.full_name || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{loan.devices?.device_model || loan.devices?.device_name || '—'}</td>
                  <td>K{loan.daily_rate}</td>
                  <td style={{ color: loan.balance_due > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                    K{(loan.balance_due || 0).toFixed(2)}
                  </td>
                  <td>
                    <span className={`vx-badge ${loan.status === 'active' ? 'vx-badge-info' : loan.status === 'completed' ? 'vx-badge-success' : 'vx-badge-danger'}`}>
                      {loan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Enroll Customer ──────────────────────────────────────────────────────────
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
    if (!form.full_name || !form.phone_number || !form.id_number) {
      showToast('Please fill all fields', 'error'); return;
    }
    setLoading(true);
    try {
      let id_image_url = null;
      if (idFile) {
        const ext = idFile.name.split('.').pop();
        const path = `${form.id_number}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('id-images').upload(path, idFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('id-images').getPublicUrl(path);
          id_image_url = urlData.publicUrl;
        }
      }
      const { error } = await createCustomer({
        ...form,
        account_number: form.id_number,
        id_image_url,
        enrolled_by: profile.id,
      });
      if (error) throw error;
      showToast(`Customer ${form.full_name} enrolled! Account: ${form.id_number}`);
      setForm({ full_name: '', phone_number: '', id_number: '' });
      setPreview(null); setIdFile(null);
      refresh();
      setActive('customers');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: 'var(--accent-cyan)' }}>Enroll Customer</h1>
      </div>
      <div style={{ maxWidth: 580 }}>
        <div className="vx-card">
          <div className="vx-form-group">
            <label className="vx-label">Full Name</label>
            <input className="vx-input" placeholder="John Doe" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="vx-form-group">
            <label className="vx-label">Phone Number</label>
            <input className="vx-input" placeholder="+260 97X XXX XXX" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
          </div>
          <div className="vx-form-group">
            <label className="vx-label">National ID Number (= Account Number)</label>
            <input className="vx-input" placeholder="123456/78/9" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} />
            {form.id_number && (
              <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                Account # will be: <strong>{form.id_number}</strong>
              </div>
            )}
          </div>

          {/* ID Upload */}
          <div className="vx-form-group">
            <label className="vx-label">Upload ID Document / Photo</label>
            <div
              onClick={() => fileRef.current.click()}
              style={{
                border: '2px dashed var(--border)', borderRadius: '8px', padding: '1.5rem',
                textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
                background: 'var(--bg-secondary)'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {preview ? (
                <img src={preview} alt="ID Preview" style={{ maxHeight: 160, borderRadius: 6, maxWidth: '100%' }} />
              ) : (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Click to upload ID photo or document</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>JPG, PNG, PDF supported</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          <button className="vx-btn vx-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem', letterSpacing: '2px' }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'ENROLLING...' : '⊕ ENROLL CUSTOMER'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Customers List ───────────────────────────────────────────────────────────
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
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: 'var(--accent-cyan)' }}>Customers</h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{customers.length} total</div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input className="vx-input" placeholder="Search by name, account number, phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
      </div>

      <div className="vx-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vx-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Account #</th>
                <th>Phone</th>
                <th>Device</th>
                <th>Loan Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const loan = c.loans?.[0];
                const device = loan?.devices;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.full_name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{c.account_number}</td>
                    <td>{c.phone_number}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{device?.device_model || '—'}</td>
                    <td>
                      {loan ? (
                        <span className={`vx-badge ${loan.status === 'active' ? 'vx-badge-info' : 'vx-badge-success'}`}>{loan.status}</span>
                      ) : <span className="vx-badge vx-badge-warning">No Loan</span>}
                    </td>
                    <td>
                      <button className="vx-btn vx-btn-secondary vx-btn-sm" onClick={() => setSelected(c)}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <CustomerDetailModal customer={selected} onClose={() => setSelected(null)} profile={profile} showToast={showToast} />}
    </div>
  );
}

// ─── Customer Detail Modal ────────────────────────────────────────────────────
function CustomerDetailModal({ customer, onClose, profile, showToast }) {
  const loan = customer.loans?.[0];
  const device = loan?.devices;
  const pct = loan ? Math.min(100, (loan.total_paid / loan.device_price) * 100) : 0;

  return (
    <div className="vx-modal-overlay" onClick={onClose}>
      <div className="vx-modal" onClick={e => e.stopPropagation()}>
        <div className="vx-modal-title">◉ Customer Profile</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div className="vx-label">Full Name</div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{customer.full_name}</div>
          </div>
          <div>
            <div className="vx-label">Account Number</div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700 }}>{customer.account_number}</div>
          </div>
          <div>
            <div className="vx-label">Phone</div>
            <div>{customer.phone_number}</div>
          </div>
          <div>
            <div className="vx-label">National ID</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{customer.id_number}</div>
          </div>
        </div>

        {customer.id_image_url && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="vx-label" style={{ marginBottom: 8 }}>ID Document</div>
            <img src={customer.id_image_url} alt="ID" style={{ maxHeight: 120, borderRadius: 6, border: '1px solid var(--border)' }} />
          </div>
        )}

        {loan && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <div className="vx-label" style={{ marginBottom: '0.75rem' }}>Loan Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div><div className="vx-label">Device</div><div>{device?.device_model || device?.device_name || '—'}</div></div>
              <div><div className="vx-label">Device Price</div><div>K{loan.device_price}</div></div>
              <div><div className="vx-label">Daily Rate</div><div style={{ color: 'var(--accent-cyan)' }}>K{loan.daily_rate}/day</div></div>
              <div><div className="vx-label">Balance Due</div><div style={{ color: loan.balance_due > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>K{(loan.balance_due || 0).toFixed(2)}</div></div>
            </div>
            <div className="vx-label">Payment Progress</div>
            <div className="vx-progress" style={{ marginTop: 6 }}>
              <div className="vx-progress-bar" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent-green)' : pct > 50 ? 'var(--accent-cyan)' : 'var(--accent-orange)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Paid: K{loan.total_paid}</span>
              <span>{pct.toFixed(1)}%</span>
              <span>Total: K{loan.device_price}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="vx-btn vx-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Close</button>
          <a href={`/customer/${customer.account_number}`} target="_blank" rel="noreferrer" className="vx-btn vx-btn-primary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
            Customer View →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Devices List ─────────────────────────────────────────────────────────────
function DevicesList({ devices, refresh, showToast, profile }) {
  const [cmdLoading, setCmdLoading] = useState('');

  const sendCommand = async (device, cmd) => {
    setCmdLoading(device.id + cmd);
    try {
      await issueCommand(device.id, cmd, profile.id);
      await updateDevice(device.id, { is_locked: cmd === 'lock' });
      showToast(`${cmd.toUpperCase()} command sent to ${device.device_name || device.device_imei}`);
      refresh();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setCmdLoading('');
    }
  };

  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: 'var(--accent-cyan)' }}>Device Fleet</h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{devices.length} devices</div>
      </div>

      <div className="vx-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vx-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>IMEI</th>
                <th>Customer</th>
                <th>Daily Rate</th>
                <th>Enrolled</th>
                <th>Lock State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.device_name || d.device_model || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.device_imei}</td>
                  <td>{d.customers?.full_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                  <td>K{d.daily_rate}</td>
                  <td>
                    <span className={`vx-badge ${d.is_enrolled ? 'vx-badge-success' : 'vx-badge-warning'}`}>
                      {d.is_enrolled ? 'Enrolled' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <span className={`vx-badge ${d.is_locked ? 'vx-badge-danger' : 'vx-badge-success'}`}>
                      {d.is_locked ? '🔒 Locked' : '🔓 Unlocked'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {!d.is_locked ? (
                        <button className="vx-btn vx-btn-danger vx-btn-sm" disabled={cmdLoading === d.id + 'lock'} onClick={() => sendCommand(d, 'lock')}>
                          Lock
                        </button>
                      ) : (
                        <button className="vx-btn vx-btn-success vx-btn-sm" disabled={cmdLoading === d.id + 'unlock'} onClick={() => sendCommand(d, 'unlock')}>
                          Unlock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Link Device to Customer (Enrollment) ────────────────────────────────────
function LinkDeviceToCustomer({ customers, devices, refresh, showToast, profile }) {
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
      // Create device
      const { data: device, error: devErr } = await createDevice({
        ...form,
        daily_rate: parseFloat(form.daily_rate),
        customer_id: selectedCustomer,
        enrolled_by: profile.id,
        is_enrolled: false,
      });
      if (devErr) throw devErr;

      // Create loan
      const { error: loanErr } = await createLoan({
        customer_id: selectedCustomer,
        device_id: device.id,
        device_price: parseFloat(form.device_price),
        daily_rate: parseFloat(form.daily_rate),
      });
      if (loanErr) throw loanErr;

      // Create enrollment token
      const { data: token, error: tokErr } = await createEnrollmentToken({
        device_id: device.id,
        customer_id: selectedCustomer,
        daily_rate: parseFloat(form.daily_rate),
        created_by: profile.id,
      });
      if (tokErr) throw tokErr;

      const customer = customers.find(c => c.id === selectedCustomer);
      setTokenResult({ token: token.token, device, customer });
      setStep(3);
      refresh();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: 'var(--accent-cyan)' }}>Link Device to Customer</h1>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['Select Customer', 'Device Details', 'Enrollment QR'].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step > i + 1 ? 'var(--accent-green)' : step === i + 1 ? 'var(--accent-cyan)' : 'var(--border)',
              color: step >= i + 1 ? 'var(--bg-primary)' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.8rem'
            }}>{i + 1}</div>
            <span style={{ fontSize: '0.875rem', color: step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>
            {i < 2 && <div style={{ width: 24, height: 1, background: 'var(--border)', margin: '0 4px' }} />}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 560 }}>
        {step === 1 && (
          <div className="vx-card">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>
              Step 1: Select Customer
            </div>
            <div className="vx-form-group">
              <label className="vx-label">Customer</label>
              <select className="vx-select" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                <option value="">-- Choose customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.account_number})</option>
                ))}
              </select>
            </div>
            <button className="vx-btn vx-btn-primary" disabled={!selectedCustomer} onClick={() => setStep(2)} style={{ width: '100%', justifyContent: 'center' }}>
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="vx-card">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>
              Step 2: Device Information
            </div>
            {[
              { key: 'device_imei', label: 'Device IMEI', placeholder: '35XXXXXXXXXXXX' },
              { key: 'device_name', label: 'Device Name', placeholder: 'e.g. Samsung Galaxy A15' },
              { key: 'device_model', label: 'Device Model', placeholder: 'e.g. SM-A155F' },
              { key: 'device_price', label: 'Total Device Price (K)', placeholder: '2500.00' },
              { key: 'daily_rate', label: 'Daily Payment Amount (K)', placeholder: '25.00' },
            ].map(f => (
              <div className="vx-form-group" key={f.key}>
                <label className="vx-label">{f.label}</label>
                <input className="vx-input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            {form.device_price && form.daily_rate && (
              <div className="vx-alert vx-alert-info">
                📊 Est. {Math.ceil(form.device_price / form.daily_rate)} days to complete · K{form.daily_rate}/day
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="vx-btn vx-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>← Back</button>
              <button className="vx-btn vx-btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : '⊞ Generate Enrollment Token →'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && tokenResult && (
          <div className="vx-card">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>✅</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                Enrollment Ready!
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.875rem' }}>
                Customer: <strong>{tokenResult.customer?.full_name}</strong> · Device: {tokenResult.device?.device_name}
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div className="vx-label" style={{ marginBottom: 8 }}>Android Enrollment Token</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--accent-cyan)',
                wordBreak: 'break-all', background: 'var(--bg-primary)', borderRadius: 6,
                padding: '0.75rem 1rem', border: '1px solid var(--border-bright)', letterSpacing: 1
              }}>
                {tokenResult.token}
              </div>
              <button className="vx-btn vx-btn-secondary vx-btn-sm" style={{ marginTop: 8 }} onClick={() => { navigator.clipboard.writeText(tokenResult.token); showToast('Token copied!'); }}>
                Copy Token
              </button>
            </div>

            <div className="vx-alert vx-alert-info" style={{ fontSize: '0.85rem' }}>
              <div>
                <strong>Android Enrollment Steps:</strong>
                <ol style={{ marginTop: 8, paddingLeft: 16, lineHeight: 2 }}>
                  <li>Factory reset the device</li>
                  <li>On setup, tap the screen 6 times to trigger DPC enrollment</li>
                  <li>Scan the QR code or enter the token above</li>
                  <li>Vertex Go Device Admin app will auto-install</li>
                  <li>Log in with customer account: <strong>{tokenResult.customer?.account_number}</strong></li>
                </ol>
              </div>
            </div>

            <button className="vx-btn vx-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setStep(1); setSelectedCustomer(''); setForm({ device_imei: '', device_name: '', device_model: '', device_price: '', daily_rate: '' }); setTokenResult(null); }}>
              Enroll Another Device
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loans List ───────────────────────────────────────────────────────────────
function LoansList({ loans, refresh, showToast, profile }) {
  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: 'var(--accent-cyan)' }}>Active Loans</h1>
      </div>
      <div className="vx-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vx-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Device</th>
                <th>Price</th>
                <th>Daily</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map(loan => {
                const pct = Math.min(100, (loan.total_paid / loan.device_price) * 100);
                return (
                  <tr key={loan.id}>
                    <td style={{ fontWeight: 600 }}>{loan.customers?.full_name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{loan.devices?.device_model || '—'}</td>
                    <td>K{loan.device_price}</td>
                    <td style={{ color: 'var(--accent-cyan)' }}>K{loan.daily_rate}</td>
                    <td style={{ color: 'var(--accent-green)' }}>K{loan.total_paid}</td>
                    <td style={{ color: loan.balance_due > 0 ? 'var(--accent-orange)' : 'var(--accent-green)', fontWeight: 600 }}>
                      K{(loan.balance_due || 0).toFixed(2)}
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="vx-progress">
                        <div className="vx-progress-bar" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent-green)' : pct > 50 ? 'var(--accent-cyan)' : 'var(--accent-orange)' }} />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{pct.toFixed(0)}%</div>
                    </td>
                    <td>
                      <span className={`vx-badge ${loan.status === 'active' ? 'vx-badge-info' : loan.status === 'completed' ? 'vx-badge-success' : 'vx-badge-danger'}`}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Record Payment ───────────────────────────────────────────────────────────
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
      showToast(`Payment of K${amount} recorded. Device unlocked!`);
      setAmount(''); setNotes('');
      refresh();
      const { data } = await getPayments(selectedLoan);
      setPayments(data || []);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: 'var(--accent-cyan)' }}>Record Payment</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: 900 }}>
        <div>
          <div className="vx-card">
            <div className="vx-form-group">
              <label className="vx-label">Select Loan / Customer</label>
              <select className="vx-select" value={selectedLoan} onChange={e => setSelectedLoan(e.target.value)}>
                <option value="">-- Choose loan --</option>
                {activeLoans.map(l => (
                  <option key={l.id} value={l.id}>{l.customers?.full_name} · Balance: K{(l.balance_due || 0).toFixed(2)}</option>
                ))}
              </select>
            </div>

            {loan && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div><div className="vx-label" style={{ marginBottom: 2 }}>Daily Rate</div><div style={{ color: 'var(--accent-cyan)' }}>K{loan.daily_rate}</div></div>
                  <div><div className="vx-label" style={{ marginBottom: 2 }}>Balance Due</div><div style={{ color: 'var(--accent-orange)' }}>K{(loan.balance_due || 0).toFixed(2)}</div></div>
                </div>
              </div>
            )}

            <div className="vx-form-group">
              <label className="vx-label">Payment Amount (K)</label>
              <input className="vx-input" type="number" placeholder="25.00" value={amount} onChange={e => setAmount(e.target.value)} />
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
              <input className="vx-input" placeholder="Mobile money ref, cash, etc." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <button className="vx-btn vx-btn-success" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem', letterSpacing: '1px' }} onClick={handlePay} disabled={loading || !selectedLoan || !amount}>
              {loading ? 'Processing...' : '✦ Record Payment & Unlock Device'}
            </button>
          </div>
        </div>

        {selectedLoan && (
          <div>
            <div className="vx-card">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Payment History
              </div>
              {payments.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No payments yet</div>
              ) : (
                payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <div>
                      <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>K{p.amount}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.notes || 'Payment'}</div>
                    </div>
                    <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
