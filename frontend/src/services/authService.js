import api from './api';

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

  logout() {
    localStorage.removeItem('pashurakshak_token');
    localStorage.removeItem('pashurakshak_user');
  }
};

export default authService;
