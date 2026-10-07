/**
 * PashuCare - Environment Configuration
 * File: mobile/src/config/env.ts
 * 
 * Centralizes resolution of public environment variables with safe production fallbacks.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const DEFAULT_PRODUCTION_API_URL = 'https://sih-livestock-health-production.up.railway.app/api';
export const DEFAULT_PRODUCTION_SUPABASE_URL = 'https://obgcmrgjulmgumdroixq.supabase.co';
export const DEFAULT_PRODUCTION_SUPABASE_ANON_KEY = 'sb_publishable_JA0FFLO2mmxQ1Xiu7hdfzw_Fjnu6wvY';

/**
 * Clean and normalize API base URL
 */
function normalizeApiUrl(rawUrl?: string): string {
  const url = rawUrl?.trim();
  if (!url) {
    return DEFAULT_PRODUCTION_API_URL;
  }
  const clean = url.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

export const ENV = {
  API_URL: normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || DEFAULT_PRODUCTION_API_URL),
  SUPABASE_URL: (process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_PRODUCTION_SUPABASE_URL).trim(),
  SUPABASE_ANON_KEY: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_PRODUCTION_SUPABASE_ANON_KEY).trim(),
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
