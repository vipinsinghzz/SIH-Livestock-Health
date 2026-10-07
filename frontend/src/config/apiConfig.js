/**
 * Frontend API Configuration
 * File: frontend/src/config/apiConfig.js
 * 
 * Centralizes backend API URL resolution supporting:
 * - Local development Vite proxy (default: relative '/api')
 * - Production split-domain deployments via VITE_API_URL
 * - Trailing slash and prefix normalization
 * - Safe image URL and SSE stream resolution
 */

/**
 * Normalizes user-configured backend base URL
 * 
 * Examples:
 *   '' or undefined                    -> { baseURL: '/api', rootURL: '' }
 *   'https://api.example.com'          -> { baseURL: 'https://api.example.com/api', rootURL: 'https://api.example.com' }
 *   'https://api.example.com/'         -> { baseURL: 'https://api.example.com/api', rootURL: 'https://api.example.com' }
 *   'https://api.example.com/api'      -> { baseURL: 'https://api.example.com/api', rootURL: 'https://api.example.com' }
 *   'https://api.example.com/api/'     -> { baseURL: 'https://api.example.com/api', rootURL: 'https://api.example.com' }
 */
export function resolveApiConfig(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      baseURL: '/api',
      rootURL: ''
    };
  }

  // Remove trailing slashes
  const cleanUrl = rawUrl.trim().replace(/\/+$/, '');

  // When running locally in browser on localhost/127.0.0.1, always prefer the local /api proxy
  // if rawUrl points to remote Railway to prevent cross-origin CORS rejections
  if (typeof window !== 'undefined' && window.location) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost && cleanUrl.includes('railway.app')) {
      return {
        baseURL: '/api',
        rootURL: ''
      };
    }
  }

  if (cleanUrl.endsWith('/api')) {
    return {
      baseURL: cleanUrl,
      rootURL: cleanUrl.slice(0, -4)
    };
  }

  return {
    baseURL: `${cleanUrl}/api`,
    rootURL: cleanUrl
  };
}

const rawApiUrl = import.meta.env.VITE_API_URL;
const { baseURL, rootURL } = resolveApiConfig(rawApiUrl);

export const API_BASE_URL = baseURL;
export const API_ROOT_URL = rootURL;

/**
 * Builds a fully qualified API endpoint URL for native Web APIs (EventSource, fetch)
 * 
 * @param {string} path - API endpoint path (e.g. '/cases/stream' or 'cases/stream')
 * @returns {string} Absolute or relative API URL
 */
export function getApiUrl(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL.endsWith('/api') && cleanPath.startsWith('/api/')) {
    return `${API_ROOT_URL || ''}${cleanPath}`;
  }
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Normalizes backend-served image paths (e.g. legacy /uploads/... or external URLs)
 * 
 * @param {string} imagePath - Image URL or relative storage path
 * @returns {string} Normalized image source URL
 */
export function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath;
  }
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${API_ROOT_URL || ''}${cleanPath}`;
}
