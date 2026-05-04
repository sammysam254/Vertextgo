import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) { console.error('Profile error:', error); return null; }
      return data;
    } catch (e) {
      console.error('Profile exception:', e);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (mounted) setProfile(p);
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        // ALWAYS set loading false — even on error
        if (mounted) setLoading(false);
      }
    };

    // Safety timeout — never stay loading more than 5 seconds
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    init().then(() => clearTimeout(timeout));

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        const p = await fetchProfile(session.user.id);
        if (mounted) { setProfile(p); setLoading(false); }
      } else {
        setUser(null);
        setProfile(null);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
