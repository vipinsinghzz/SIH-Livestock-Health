import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pashurakshak_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired, clear local storage
      localStorage.removeItem('pashurakshak_token');
      localStorage.removeItem('pashurakshak_user');
      const path = window.location.pathname;
      const isPublicPath =
        path === '/login' ||
        path === '/register' ||
        path === '/' ||
        path.startsWith('/landing') ||
        path.startsWith('/select-language') ||
        path.startsWith('/language') ||
        path.startsWith('/kisan') ||
        path.startsWith('/report-sick') ||
        path.startsWith('/report_sick') ||
        path.startsWith('/report%20sick') ||
        path.startsWith('/disease') ||
        path.startsWith('/scan') ||
        path.startsWith('/veterinary-help') ||
        path.startsWith('/government-schemes');

      if (!isPublicPath) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
