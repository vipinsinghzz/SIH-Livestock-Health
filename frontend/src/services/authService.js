import api from './api';
import { supabase } from '../config/supabaseClient';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.token) {
      localStorage.setItem('pashurakshak_token', response.data.token);
      localStorage.setItem('pashurakshak_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (response.data?.token) {
      localStorage.setItem('pashurakshak_token', response.data.token);
      localStorage.setItem('pashurakshak_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getCurrentUser() {
    const saved = localStorage.getItem('pashurakshak_user');
    return saved ? JSON.parse(saved) : null;
  },

  async logout() {
    try {
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      }
    } catch (e) {}
    localStorage.removeItem('pashurakshak_token');
    localStorage.removeItem('pashurakshak_user');
    localStorage.removeItem('cached_animals');
  }
};

export default authService;
