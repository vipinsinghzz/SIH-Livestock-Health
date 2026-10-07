/**
 * PashuCare - Supabase Mobile Client Configuration
 * File: mobile/src/config/supabaseClient.ts
 * 
 * Configured specifically for React Native / Expo with hardware-backed
 * expo-secure-store persistence.
 * 
 * SECURITY: NEVER expose SUPABASE_SERVICE_ROLE_KEY here.
 * Only public EXPO_PUBLIC_SUPABASE_ANON_KEY is permitted.
 */

import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ENV,
  DEFAULT_PRODUCTION_SUPABASE_URL,
  DEFAULT_PRODUCTION_SUPABASE_ANON_KEY,
} from './env';
import { ExpoSecureStoreAdapter } from '../services/secureStorage';

const supabaseUrl = ENV.SUPABASE_URL || DEFAULT_PRODUCTION_SUPABASE_URL;
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY || DEFAULT_PRODUCTION_SUPABASE_ANON_KEY;

export const isLiveSupabase =
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('mock-supabase') &&
  !supabaseUrl.includes('[your-project');

let supabaseInstance: SupabaseClient | null = null;

try {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (err) {
  console.warn('[Supabase Client] Failed to initialize standard client:', err);
  // Fallback minimal interface so the application boots safely without crashing
  supabaseInstance = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: {}, error: new Error('Supabase client unconfigured') }),
      signUp: async () => ({ data: {}, error: new Error('Supabase client unconfigured') }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: new Error('Supabase client unconfigured') }),
      setSession: async () => ({ data: { session: null, user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  } as unknown as SupabaseClient;
}

export const supabase = supabaseInstance as SupabaseClient;
export default supabase;
