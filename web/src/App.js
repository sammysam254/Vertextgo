import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import EnrollDevice from './pages/EnrollDevice';

// Simple auth check - no context, no hooks, just localStorage
const isLoggedIn = () => !!localStorage.getItem('vx_user_id');
const getRole = () => localStorage.getItem('vx_role') || '';

const PrivateRoute = ({ children, roles }) => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(getRole())) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
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
        <Route path="/" element={
          !isLoggedIn() ? <Navigate to="/login" replace /> :
          getRole() === 'super_admin' ? <Navigate to="/super-admin" replace /> :
          <Navigate to="/admin" replace />
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
