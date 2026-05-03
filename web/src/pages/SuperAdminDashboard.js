import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';
import { supabase, getUsers, updateUserRole, deactivateUser, activateUser, getDashboardStats, getLoans, getCustomers } from '../lib/supabase';

const SIDEBAR_ITEMS = [
  { id: 'overview', label: 'System Overview', icon: '◈' },
  { section: 'USER MANAGEMENT' },
  { id: 'users', label: 'All Staff', icon: '◉' },
  { id: 'create-user', label: 'Create User', icon: '⊕' },
  { section: 'DATA' },
  { id: 'all-loans', label: 'All Loans', icon: '◑' },
  { id: 'all-customers', label: 'All Customers', icon: '⬡' },
  { id: 'reports', label: 'Reports', icon: '✦' },
];

export default function SuperAdminDashboard() {
  const { profile } = useAuth();
  const [active, setActive] = useState('overview');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [u, s, l, c] = await Promise.all([
        getUsers(), getDashboardStats(), getLoans(), getCustomers()
      ]);
      setUsers(u.data || []);
      setStats(s);
      setLoans(l.data || []);
      setCustomers(c.data || []);
    } catch (e) {
      showToast('Failed to load data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const pages = {
    overview: <SystemOverview stats={stats} users={users} loans={loans} />,
    users: <UserManagement users={users} profile={profile} refresh={refresh} showToast={showToast} />,
    'create-user': <CreateUser refresh={refresh} showToast={showToast} profile={profile} setActive={setActive} />,
    'all-loans': <AllLoans loans={loans} />,
    'all-customers': <AllCustomers customers={customers} />,
    reports: <Reports stats={stats} loans={loans} />,
  };

  return (
    <div className="vx-layout">
      <div className="vx-grid-bg" />
      <Sidebar items={SIDEBAR_ITEMS} activeItem={active} onSelect={setActive} role="super_admin" />
      <main className="vx-main" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 6, padding: '0.5rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem' }}>
          <span style={{ color: '#a78bfa', fontWeight: 700, letterSpacing: 2 }}>⬡ SUPER ADMIN</span>
          <span style={{ color: 'var(--text-muted)' }}>Full system access · {profile?.full_name}</span>
        </div>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="vx-spinner" />
          </div>
        ) : (
          <div className="fade-in">{pages[active]}</div>
        )}
      </main>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          background: toast.type === 'success' ? 'rgba(0,255,136,0.15)' : 'rgba(255,51,85,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,136,0.4)' : 'rgba(255,51,85,0.4)'}`,
          color: toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
          borderRadius: 8, padding: '1rem 1.5rem', fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease'
        }}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── System Overview ───────────────────────────────────────────────────────────
function SystemOverview({ stats, users, loans }) {
  const totalRevenue = loans.reduce((s, l) => s + Number(l.total_paid || 0), 0);
  const completedLoans = loans.filter(l => l.status === 'completed').length;

  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: '#a78bfa' }}>System Overview</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Customers', value: stats.totalCustomers || 0, cls: '' },
          { label: 'Active Loans', value: stats.activeLoans || 0, cls: 'green' },
          { label: 'Completed Loans', value: completedLoans, cls: 'purple' },
          { label: 'Overdue Today', value: stats.overdueLoans || 0, cls: 'red' },
          { label: 'Monthly Revenue', value: `K${(stats.monthlyRevenue || 0).toFixed(0)}`, cls: 'orange' },
          { label: 'Staff Users', value: users.length, cls: '' },
        ].map((s, i) => (
          <div className={`vx-stat ${s.cls}`} key={i}>
            <div className="vx-stat-value" style={{ fontSize: '1.75rem' }}>{s.value}</div>
            <div className="vx-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="vx-card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Staff Breakdown
          </div>
          {[
            { label: 'Super Admins', count: users.filter(u => u.role === 'super_admin').length, color: '#a78bfa' },
            { label: 'Admins', count: users.filter(u => u.role === 'admin').length, color: 'var(--accent-cyan)' },
            { label: 'Enrollers', count: users.filter(u => u.role === 'enroller').length, color: 'var(--accent-green)' },
            { label: 'Deactivated', count: users.filter(u => !u.is_active).length, color: 'var(--accent-red)' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{r.label}</span>
              <span style={{ color: r.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{r.count}</span>
            </div>
          ))}
        </div>

        <div className="vx-card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Recent Staff
          </div>
          {users.slice(0, 6).map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: u.is_active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{u.full_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
              <span className={`vx-badge ${u.role === 'super_admin' ? 'vx-badge-purple' : u.role === 'admin' ? 'vx-badge-info' : 'vx-badge-success'}`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Create User ───────────────────────────────────────────────────────────────
function CreateUser({ refresh, showToast, profile, setActive }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'admin' });
  const [loading, setLoading] = useState(false);
  const [serviceKey, setServiceKey] = useState(localStorage.getItem('vx_service_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('vx_service_key'));

  const saveServiceKey = () => {
    localStorage.setItem('vx_service_key', serviceKey);
    setShowKeyInput(false);
    showToast('Service key saved locally');
  };

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.password) {
      showToast('Fill all fields', 'error'); return;
    }
    if (form.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error'); return;
    }
    if (!serviceKey) {
      showToast('Service role key required', 'error');
      setShowKeyInput(true); return;
    }
    setLoading(true);

    try {
      // Use service role key to create auth user
      const SUPABASE_URL = 'https://tonlofhigkpbcsmfesjq.supabase.co';

      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          email_confirm: true,
          user_metadata: { full_name: form.full_name }
        })
      });

      const authData = await authRes.json();

      if (!authRes.ok || authData.error) {
        throw new Error(authData.error?.message || authData.msg || 'Failed to create auth user');
      }

      const userId = authData.id;

      // Insert profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        is_active: true,
        created_by: profile.id,
      });

      if (profileError) throw profileError;

      showToast(`✓ ${form.full_name} created as ${form.role}`);
      setForm({ full_name: '', email: '', password: '', role: 'admin' });
      refresh();
      setActive('users');
    } catch (e) {
      showToast(e.message || 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: '#a78bfa' }}>Create Staff User</h1>
      </div>
      <div style={{ maxWidth: 520 }}>

        {/* Service Key Setup */}
        {showKeyInput && (
          <div className="vx-card" style={{ marginBottom: '1rem', borderColor: 'rgba(124,58,237,0.4)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, color: '#a78bfa', marginBottom: '0.75rem', letterSpacing: 2 }}>
              ⚡ ONE-TIME SETUP
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
              To create auth users, enter your Supabase <strong style={{ color: 'var(--text-primary)' }}>service_role key</strong>.
              <br />Find it at: Supabase → Settings → API → service_role
            </p>
            <div className="vx-form-group">
              <label className="vx-label">Service Role Key</label>
              <input
                className="vx-input"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={serviceKey}
                onChange={e => setServiceKey(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="vx-btn vx-btn-primary" onClick={saveServiceKey} style={{ flex: 1, justifyContent: 'center', background: '#7c3aed' }}>
                Save Key
              </button>
              {localStorage.getItem('vx_service_key') && (
                <button className="vx-btn vx-btn-secondary" onClick={() => setShowKeyInput(false)} style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {!showKeyInput && (
          <div className="vx-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 2, textTransform: 'uppercase' }}>
                New Staff Account
              </div>
              <button className="vx-btn vx-btn-secondary vx-btn-sm" onClick={() => setShowKeyInput(true)}>
                Change Key
              </button>
            </div>

            <div className="vx-form-group">
              <label className="vx-label">Full Name</label>
              <input className="vx-input" placeholder="John Banda" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="vx-form-group">
              <label className="vx-label">Email Address</label>
              <input className="vx-input" type="email" placeholder="john@vertexgo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="vx-form-group">
              <label className="vx-label">Password</label>
              <input className="vx-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="vx-form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="vx-label">Role</label>
              <select className="vx-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="enroller">Enroller — Enroll customers & generate tokens</option>
                <option value="admin">Admin — Enroller + record payments & lock/unlock</option>
                <option value="super_admin">Super Admin — Full system control</option>
              </select>
            </div>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {form.role === 'enroller' && '📋 Can enroll customers, upload IDs, link devices, generate enrollment QR tokens.'}
              {form.role === 'admin' && '🔧 All enroller permissions + record payments, manually lock/unlock devices.'}
              {form.role === 'super_admin' && '⬡ All permissions + create/remove users, change roles, view all reports.'}
            </div>

            <button
              className="vx-btn vx-btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '0.95rem', letterSpacing: '2px', background: '#7c3aed' }}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'CREATING...' : '⊕ CREATE USER'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── User Management ───────────────────────────────────────────────────────────
function UserManagement({ users, profile, refresh, showToast }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [serviceKey] = useState(localStorage.getItem('vx_service_key') || '');

  const handleRoleChange = async (userId, newRole) => {
    if (userId === profile.id) { showToast('Cannot change your own role', 'error'); return; }
    const { error } = await updateUserRole(userId, newRole);
    if (error) showToast(error.message, 'error');
    else { showToast('Role updated successfully'); refresh(); }
  };

  const handleToggleActive = async (user) => {
    if (user.id === profile.id) { showToast('Cannot deactivate yourself', 'error'); return; }
    const { error } = user.is_active ? await deactivateUser(user.id) : await activateUser(user.id);
    if (error) showToast(error.message, 'error');
    else {
      showToast(`User ${user.is_active ? 'deactivated — access revoked' : 'activated — access restored'}`);
      refresh();
    }
    setConfirmAction(null);
  };

  const handleDelete = async (user) => {
    if (user.id === profile.id) { showToast('Cannot delete yourself', 'error'); return; }

    try {
      // Delete profile first
      await supabase.from('profiles').delete().eq('id', user.id);

      // Delete auth user if service key available
      if (serviceKey) {
        await fetch(`https://tonlofhigkpbcsmfesjq.supabase.co/auth/v1/admin/users/${user.id}`, {
          method: 'DELETE',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          }
        });
      }

      showToast(`${user.full_name} deleted permanently`);
      refresh();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setConfirmAction(null);
  };

  const activeUsers = users.filter(u => u.is_active);
  const inactiveUsers = users.filter(u => !u.is_active);

  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: '#a78bfa' }}>Staff Management</h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {activeUsers.length} active · {inactiveUsers.length} deactivated
        </div>
      </div>

      {/* Active Users */}
      <div style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-green)', letterSpacing: 2, textTransform: 'uppercase' }}>
        Active Staff
      </div>
      <div className="vx-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vx-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>
                    {u.full_name}
                    {u.id === profile.id && (
                      <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(0,212,255,0.1)', padding: '1px 6px', borderRadius: 10 }}>YOU</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                  <td>
                    {u.id !== profile.id ? (
                      <select
                        className="vx-select"
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
                      >
                        <option value="enroller">Enroller</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    ) : (
                      <span className="vx-badge vx-badge-purple">{u.role}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {u.id !== profile.id && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="vx-btn vx-btn-danger vx-btn-sm"
                          onClick={() => setConfirmAction({ type: 'deactivate', user: u })}
                        >
                          Deactivate
                        </button>
                        <button
                          className="vx-btn vx-btn-sm"
                          style={{ background: 'rgba(255,51,85,0.3)', color: '#ff3355', border: '1px solid rgba(255,51,85,0.5)' }}
                          onClick={() => setConfirmAction({ type: 'delete', user: u })}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {activeUsers.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No active users</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deactivated Users */}
      {inactiveUsers.length > 0 && (
        <>
          <div style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-red)', letterSpacing: 2, textTransform: 'uppercase' }}>
            Deactivated Staff (No Access)
          </div>
          <div className="vx-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="vx-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {inactiveUsers.map(u => (
                    <tr key={u.id} style={{ opacity: 0.6 }}>
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                      <td><span className="vx-badge vx-badge-danger">{u.role}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="vx-btn vx-btn-success vx-btn-sm" onClick={() => setConfirmAction({ type: 'activate', user: u })}>
                            Restore
                          </button>
                          <button
                            className="vx-btn vx-btn-sm"
                            style={{ background: 'rgba(255,51,85,0.3)', color: '#ff3355', border: '1px solid rgba(255,51,85,0.5)' }}
                            onClick={() => setConfirmAction({ type: 'delete', user: u })}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="vx-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="vx-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
              {confirmAction.type === 'delete' ? '🗑️' : confirmAction.type === 'deactivate' ? '⚠️' : '✅'}
            </div>
            <h3 style={{ marginBottom: 8, fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: confirmAction.type === 'delete' ? 'var(--accent-red)' : 'var(--text-primary)' }}>
              {confirmAction.type === 'delete' ? 'Delete User Permanently?' :
               confirmAction.type === 'deactivate' ? 'Deactivate User?' : 'Restore User?'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{confirmAction.user.full_name}</strong> · {confirmAction.user.role}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {confirmAction.type === 'delete' && 'This cannot be undone. The user will be permanently removed from the system.'}
              {confirmAction.type === 'deactivate' && 'User will immediately lose all access to the system. They cannot log in.'}
              {confirmAction.type === 'activate' && 'User will regain their previous access level.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="vx-btn vx-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button
                className={`vx-btn ${confirmAction.type === 'activate' ? 'vx-btn-success' : 'vx-btn-danger'}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  if (confirmAction.type === 'delete') handleDelete(confirmAction.user);
                  else handleToggleActive(confirmAction.user);
                }}
              >
                {confirmAction.type === 'delete' ? 'Delete' : confirmAction.type === 'deactivate' ? 'Deactivate' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── All Loans ─────────────────────────────────────────────────────────────────
function AllLoans({ loans }) {
  const totalRevenue = loans.reduce((s, l) => s + Number(l.total_paid || 0), 0);
  const totalOutstanding = loans.reduce((s, l) => s + Number(l.balance_due || 0), 0);
  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: '#a78bfa' }}>All Loans</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="vx-stat green"><div className="vx-stat-value">K{totalRevenue.toFixed(0)}</div><div className="vx-stat-label">Total Collected</div></div>
        <div className="vx-stat orange"><div className="vx-stat-value">K{totalOutstanding.toFixed(0)}</div><div className="vx-stat-label">Outstanding</div></div>
        <div className="vx-stat"><div className="vx-stat-value">{loans.length}</div><div className="vx-stat-label">Total Loans</div></div>
      </div>
      <div className="vx-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vx-table">
            <thead><tr><th>Customer</th><th>Device</th><th>Price</th><th>Paid</th><th>Balance</th><th>Daily</th><th>Status</th></tr></thead>
            <tbody>
              {loans.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No loans yet</td></tr>}
              {loans.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.customers?.full_name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{l.devices?.device_model || '—'}</td>
                  <td>K{l.device_price}</td>
                  <td style={{ color: 'var(--accent-green)' }}>K{l.total_paid}</td>
                  <td style={{ color: l.balance_due > 0 ? 'var(--accent-orange)' : 'var(--accent-green)', fontWeight: 600 }}>K{(l.balance_due || 0).toFixed(2)}</td>
                  <td>K{l.daily_rate}</td>
                  <td><span className={`vx-badge ${l.status === 'active' ? 'vx-badge-info' : l.status === 'completed' ? 'vx-badge-success' : 'vx-badge-danger'}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── All Customers ─────────────────────────────────────────────────────────────
function AllCustomers({ customers }) {
  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: '#a78bfa' }}>All Customers</h1>
        <div style={{ color: 'var(--text-secondary)' }}>{customers.length} enrolled</div>
      </div>
      <div className="vx-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vx-table">
            <thead><tr><th>Name</th><th>Account #</th><th>Phone</th><th>ID Number</th><th>Enrolled</th></tr></thead>
            <tbody>
              {customers.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No customers yet</td></tr>}
              {customers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.full_name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{c.account_number}</td>
                  <td>{c.phone_number}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.id_number}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────
function Reports({ stats, loans }) {
  const byStatus = {
    active: loans.filter(l => l.status === 'active').length,
    completed: loans.filter(l => l.status === 'completed').length,
    defaulted: loans.filter(l => l.status === 'defaulted').length,
  };
  const collectionRate = loans.length > 0 ? ((byStatus.completed / loans.length) * 100).toFixed(1) : 0;
  return (
    <div>
      <div className="vx-topbar">
        <h1 className="vx-page-title" style={{ color: '#a78bfa' }}>Reports</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="vx-card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Loan Portfolio</div>
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{status}</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
              <div className="vx-progress">
                <div className="vx-progress-bar" style={{ width: `${loans.length > 0 ? (count / loans.length) * 100 : 0}%`, background: status === 'completed' ? 'var(--accent-green)' : status === 'defaulted' ? 'var(--accent-red)' : 'var(--accent-cyan)' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--accent-green)' }}>{collectionRate}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Collection Rate</div>
          </div>
        </div>
        <div className="vx-card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Key Metrics</div>
          {[
            { label: 'Total Customers', value: stats.totalCustomers || 0 },
            { label: 'Active Loans', value: stats.activeLoans || 0 },
            { label: 'Overdue Today', value: stats.overdueLoans || 0 },
            { label: 'Monthly Revenue', value: `K${(stats.monthlyRevenue || 0).toFixed(0)}` },
            { label: 'Total Loans', value: loans.length },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
