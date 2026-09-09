import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pashurakshak_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('pashurakshak_token');
      const storedUser = localStorage.getItem('pashurakshak_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          // Verify with /me in background
          const res = await api.get('/auth/me');
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('pashurakshak_user', JSON.stringify(res.data.user));
          }
        } catch (e) {
          console.warn('[AuthContext] Session expired or invalid');
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', {
      identifier,
      email: identifier,
      phone: identifier,
      password
    });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('pashurakshak_token', res.data.token);
      localStorage.setItem('pashurakshak_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('pashurakshak_token', res.data.token);
      localStorage.setItem('pashurakshak_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
  };

  const logout = () => {
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

  // Quick Persona switcher for easy evaluation across different farmers and roles
  const loginAsPersona = async (personaKey) => {
    const credentials = {
      farmer: { email: 'farmer@pashurakshak.in', password: 'Farmer@123' },
      farmer_ramesh: { email: 'farmer@pashurakshak.in', password: 'Farmer@123' },
      farmer_santosh: { email: 'santosh@pashurakshak.in', password: 'Farmer@123' },
      farmer_sunita: { email: 'sunita@pashurakshak.in', password: 'Farmer@123' },
      field_worker: { email: 'vet@pashurakshak.in', password: 'Vet@123' },
      officer: { email: 'officer@pashurakshak.in', password: 'Admin@123' },
      admin: { email: 'officer@pashurakshak.in', password: 'Admin@123' }
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
