import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import EnrollDevice from './pages/EnrollDevice';

const PrivateRoute = ({ children, roles }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/unauthorized" replace />;
  if (!profile.is_active) return <Navigate to="/login" replace />;
  return children;
};

const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0a0e1a', color: '#00d4ff', fontFamily: 'monospace', fontSize: '1.2rem'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div className="vx-spinner" />
      <p style={{ marginTop: 16, letterSpacing: 4 }}>VERTEX GO</p>
    </div>
  </div>
);

const Router = () => {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/customer/:accountNumber" element={<CustomerDashboard />} />
      <Route path="/enroll" element={<EnrollDevice />} />
      <Route path="/super-admin/*" element={
        <PrivateRoute roles={['super_admin']}>
          <SuperAdminDashboard />
        </PrivateRoute>
      } />
      <Route path="/admin/*" element={
        <PrivateRoute roles={['super_admin', 'admin', 'enroller']}>
          <AdminDashboard />
        </PrivateRoute>
      } />
      <Route path="/" element={
        profile ? (
          profile.role === 'super_admin' ? <Navigate to="/super-admin" replace /> :
          <Navigate to="/admin" replace />
        ) : <Navigate to="/login" replace />
      } />
      <Route path="/unauthorized" element={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#ff4444' }}>
          <h1>Access Denied</h1>
        </div>
      } />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  );
}
