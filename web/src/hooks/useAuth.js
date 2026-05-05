import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [profile, setProfile] = useState({
    id: localStorage.getItem('vx_user_id'),
    email: localStorage.getItem('vx_email'),
    role: localStorage.getItem('vx_role'),
    full_name: localStorage.getItem('vx_email'),
    is_active: true,
  });

  // Refresh profile from DB in background — non-blocking
  useEffect(() => {
    const userId = localStorage.getItem('vx_user_id');
    if (!userId) return;
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); })
      .catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ profile, user: profile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
