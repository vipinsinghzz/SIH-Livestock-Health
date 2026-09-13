import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { supabase, isLiveSupabase } from '../config/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pashurakshak_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth & subscribe to Supabase Auth state changes
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const storedToken = localStorage.getItem('pashurakshak_token');
      const storedUser = localStorage.getItem('pashurakshak_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (isMounted) {
            setUser(parsedUser);
            setToken(storedToken);
          }

          // Verify session in background with backend
          const res = await api.get('/auth/me');
          if (res.data?.user && isMounted) {
            setUser(res.data.user);
            localStorage.setItem('pashurakshak_user', JSON.stringify(res.data.user));
          }
        } catch (e) {
          console.warn('[AuthContext] Session expired or invalid');
          if (isMounted) logout();
        }
      } else if (isLiveSupabase && supabase?.auth) {
        // Check for active Supabase session
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token && isMounted) {
            setToken(session.access_token);
            localStorage.setItem('pashurakshak_token', session.access_token);
            const res = await api.get('/auth/me');
            if (res.data?.user && isMounted) {
              setUser(res.data.user);
              localStorage.setItem('pashurakshak_user', JSON.stringify(res.data.user));
            }
          }
        } catch (err) {
          console.warn('[AuthContext] Supabase session check error:', err);
        }
      }

      if (isMounted) setLoading(false);
    };

    initAuth();

    // Subscribe to Supabase Auth State Changes
    let authSubscription = null;
    if (supabase?.auth?.onAuthStateChange) {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return;

          if (event === 'SIGNED_IN' && session) {
            setToken(session.access_token);
            localStorage.setItem('pashurakshak_token', session.access_token);
            try {
              const res = await api.get('/auth/me');
              if (res.data?.user && isMounted) {
                setUser(res.data.user);
                localStorage.setItem('pashurakshak_user', JSON.stringify(res.data.user));
              }
            } catch (e) {}
          } else if (event === 'SIGNED_OUT') {
            setToken(null);
            setUser(null);
            localStorage.removeItem('pashurakshak_token');
            localStorage.removeItem('pashurakshak_user');
          }
        });
        authSubscription = data?.subscription;
      } catch (e) {}
    }

    return () => {
      isMounted = false;
      if (authSubscription?.unsubscribe) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const login = async (identifier, password) => {
    // 1. Authenticate via Backend (which handles Supabase Auth & dual verification)
    const res = await api.post('/auth/login', {
      identifier,
      email: identifier,
      phone: identifier,
      password
    });

    if (res.data.success) {
      const authToken = res.data.token;
      const authUser = res.data.user;

      setToken(authToken);
      setUser(authUser);
      localStorage.setItem('pashurakshak_token', authToken);
      localStorage.setItem('pashurakshak_user', JSON.stringify(authUser));

      // 2. If live Supabase client is active and refresh token available, set Supabase session
      if (isLiveSupabase && res.data.refreshToken && supabase?.auth?.setSession) {
        try {
          await supabase.auth.setSession({
            access_token: authToken,
            refresh_token: res.data.refreshToken
          });
        } catch (e) {}
      }

      return authUser;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.success) {
      const authToken = res.data.token;
      const authUser = res.data.user;

      setToken(authToken);
      setUser(authUser);
      localStorage.setItem('pashurakshak_token', authToken);
      localStorage.setItem('pashurakshak_user', JSON.stringify(authUser));
      return authUser;
    }
  };

  const logout = async () => {
    try {
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      }
    } catch (e) {}

    try {
      const u = JSON.parse(localStorage.getItem('pashurakshak_user') || '{}');
      const uid = u._id || u.id;
      if (uid) localStorage.removeItem(`cached_animals_${uid}`);
    } catch (e) {}

    localStorage.removeItem('cached_animals');
    setToken(null);
    setUser(null);
    localStorage.removeItem('pashurakshak_token');
    localStorage.removeItem('pashurakshak_user');
  };

  // Quick Persona switcher for seamless evaluation across different personas & roles
  const loginAsPersona = async (personaKey) => {
    const credentials = {
      farmer: { email: 'farmer@pashurakshak.in', password: 'Farmer@123' },
      farmer_ramesh: { email: 'farmer@pashurakshak.in', password: 'Farmer@123' },
      farmer_santosh: { email: 'santosh@pashurakshak.in', password: 'Farmer@123' },
      farmer_sunita: { email: 'sunita@pashurakshak.in', password: 'Farmer@123' },
      field_worker: { email: 'vet@pashurakshak.in', password: 'Vet@123' },
      veterinarian: { email: 'vet@pashurakshak.in', password: 'Vet@123' },
      field_worker_2: { email: 'vet2@pashurakshak.in', password: 'Vet@123' },
      vet2: { email: 'vet2@pashurakshak.in', password: 'Vet@123' },
      officer: { email: 'officer@pashurakshak.in', password: 'Admin@123' },
      admin: { email: 'admin@pashurakshak.in', password: 'Admin@123' }
    };

    const creds = credentials[personaKey] || credentials.farmer;
    return await login(creds.email, creds.password);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, loginAsPersona }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
