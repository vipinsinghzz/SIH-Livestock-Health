/**
 * PashuCare - Environment Configuration
 * File: mobile/src/config/env.ts
 * 
 * Centralizes resolution of public environment variables with safe production fallbacks.
 */

const DEFAULT_API_BASE = 'https://sih-livestock-health-production.up.railway.app/api';

/**
 * Clean and normalize API base URL
 */
function normalizeApiUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return DEFAULT_API_BASE;
  }
  const clean = rawUrl.trim().replace(/\/+$/, '');
  if (clean.endsWith('/api')) {
    return clean;
  }
  return `${clean}/api`;
}

export const ENV = {
  API_URL: normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL),
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
} as const;

/**
 * Resolve relative or absolute endpoint path against base URL
 */
export function getApiEndpoint(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${ENV.API_URL}${cleanPath}`;
}

export default ENV;
