import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import EnrollDevice from './pages/EnrollDevice';

const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060B14', color: '#00D4FF', flexDirection: 'column', gap: 16 }}>
    <div style={{ width: 40, height: 40, border: '3px solid #1E3A52', borderTopColor: '#00D4FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <div style={{ letterSpacing: 4, fontSize: '0.85rem' }}>VERTEX GO</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const PrivateRoute = ({ children, roles }) => {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // Check localStorage directly as fallback
  const role = profile?.role || localStorage.getItem('vx_role');
  const userId = profile?.id || localStorage.getItem('vx_user_id');

  if (!userId || !role) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/login" replace />;

  return children;
};

const RootRedirect = () => {
  const role = localStorage.getItem('vx_role');
  const userId = localStorage.getItem('vx_user_id');
  if (!userId || !role) return <Navigate to="/login" replace />;
  return role === 'super_admin'
    ? <Navigate to="/super-admin" replace />
    : <Navigate to="/admin" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
