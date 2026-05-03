import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import EnrollDevice from './pages/EnrollDevice';

const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#00d4ff', fontFamily: 'monospace' }}>
    <div style={{ textAlign: 'center' }}>
      <div className="vx-spinner" />
      <p style={{ marginTop: 16, letterSpacing: 4 }}>VERTEX GO</p>
    </div>
  </div>
);

const PrivateRoute = ({ children, roles }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <Navigate to="/login" replace />;
  // Kick out deactivated users immediately
  if (!profile.is_active) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/login" replace />;
  return children;
};

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
        !profile ? <Navigate to="/login" replace /> :
        !profile.is_active ? <Navigate to="/login" replace /> :
        profile.role === 'super_admin' ? <Navigate to="/super-admin" replace /> :
        <Navigate to="/admin" replace />
      } />
      <Route path="*" element={<Navigate to="/login" replace />} />
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
