/**
 * Frontend Supabase Client Configuration
 * File: frontend/src/config/supabaseClient.js
 * 
 * Public Supabase client initialized strictly with VITE_SUPABASE_ANON_KEY.
 * SECURITY: NEVER import or use SUPABASE_SERVICE_ROLE_KEY here.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock-supabase.pashurakshak.internal';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mockAnonKeyForDevelopmentAndTestingOnly';

export const isLiveSupabase = supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('mock-supabase') && 
  !supabaseUrl.includes('[your-project');

let supabaseInstance = null;

try {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sb-pashurakshak-auth-token'
    }
  });
} catch (err) {
  console.warn('[Supabase Client] Failed to initialize standard client:', err.message);
  // Fallback minimal interface so app never crashes if config is missing
  supabaseInstance = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: {}, error: new Error('Supabase client unconfigured') }),
      signUp: async () => ({ data: {}, error: new Error('Supabase client unconfigured') }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    }
  };
}

export const supabase = supabaseInstance;
export default supabase;
