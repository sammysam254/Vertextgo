import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First: read from localStorage instantly — no network call needed
    const role = localStorage.getItem('vx_role');
    const userId = localStorage.getItem('vx_user_id');
    const email = localStorage.getItem('vx_email');

    if (role && userId && email) {
      // We have cached credentials — use them immediately
      setUser({ id: userId, email });
      setProfile({ id: userId, email, role, is_active: true, full_name: email.split('@')[0] });
      setLoading(false);

      // Verify session is still valid in background
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          // Session expired — clear and redirect to login
          localStorage.removeItem('vx_role');
          localStorage.removeItem('vx_user_id');
          localStorage.removeItem('vx_email');
          window.location.replace('/login');
        }
      });
      return;
    }

    // No cached credentials — check Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        try {
          const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (p) {
            setProfile(p);
            localStorage.setItem('vx_role', p.role);
            localStorage.setItem('vx_user_id', session.user.id);
            localStorage.setItem('vx_email', session.user.email);
          }
        } catch (e) { console.error(e); }
      } else {
        // No session — redirect to login
        window.location.replace('/login');
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      window.location.replace('/login');
    });

    // Safety timeout
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const signOut = async () => {
    localStorage.removeItem('vx_role');
    localStorage.removeItem('vx_user_id');
    localStorage.removeItem('vx_email');
    localStorage.removeItem('sb-tonlofhigkpbcsmfesjq-auth-token');
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
