/**
 * PashuCare - Secure Storage Service
 * File: mobile/src/services/secureStorage.ts
 * 
 * Hardware-backed secure storage using expo-secure-store (Android KeyStore / iOS Keychain).
 * Never uses plain unencrypted AsyncStorage for sensitive authentication credentials.
 */

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  SUPABASE_SESSION: 'sb_pashucare_auth_token',
  AUTH_TOKEN: 'pashucare_jwt_token',
  REFRESH_TOKEN: 'pashucare_refresh_token',
  USER_PROFILE: 'pashucare_user_profile',
  APP_LANGUAGE: 'pashucare_app_language',
} as const;

// Legacy key aliases for seamless zero-logout session preservation
const LEGACY_STORAGE_KEYS = {
  SUPABASE_SESSION: 'sb_livestocksaathi_auth_token',
  AUTH_TOKEN: 'livestocksaathi_jwt_token',
  REFRESH_TOKEN: 'livestocksaathi_refresh_token',
  USER_PROFILE: 'livestocksaathi_user_profile',
  APP_LANGUAGE: 'livestocksaathi_app_language',
} as const;

/**
 * Standard Storage Adapter for Supabase Client Session Persistence
 */
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val) return val;
      if (key === STORAGE_KEYS.SUPABASE_SESSION) {
        return await SecureStore.getItemAsync(LEGACY_STORAGE_KEYS.SUPABASE_SESSION);
      }
      return null;
    } catch (error) {
      console.warn(`[SecureStore] Error reading key "${key}":`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(`[SecureStore] Error writing key "${key}":`, error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[SecureStore] Error deleting key "${key}":`, error);
    }
  },
};

/**
 * Token and Profile helpers
 */
export async function saveAuthTokens(token: string, refreshToken?: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
    if (refreshToken) {
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  } catch (error) {
    console.warn('[SecureStore] Failed to save auth tokens:', error);
  }
}

export async function getSavedAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    if (token) return token;
    return await SecureStore.getItemAsync(LEGACY_STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.warn('[SecureStore] Failed to get auth token:', error);
    return null;
  }
}

export async function getSavedRefreshToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    if (token) return token;
    return await SecureStore.getItemAsync(LEGACY_STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.warn('[SecureStore] Failed to get refresh token:', error);
    return null;
  }
}

export async function saveUserProfile(user: unknown): Promise<void> {
  try {
    const serialized = JSON.stringify(user);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_PROFILE, serialized);
  } catch (error) {
    console.warn('[SecureStore] Failed to save user profile:', error);
  }
}

export async function getSavedUserProfile<T = unknown>(): Promise<T | null> {
  try {
    let raw = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PROFILE);
    if (!raw) {
      raw = await SecureStore.getItemAsync(LEGACY_STORAGE_KEYS.USER_PROFILE);
    }
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('[SecureStore] Failed to parse user profile:', error);
    return null;
  }
}

export async function clearAllSecureAuthData(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_PROFILE),
      SecureStore.deleteItemAsync(STORAGE_KEYS.SUPABASE_SESSION),
      SecureStore.deleteItemAsync(LEGACY_STORAGE_KEYS.AUTH_TOKEN),
      SecureStore.deleteItemAsync(LEGACY_STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(LEGACY_STORAGE_KEYS.USER_PROFILE),
      SecureStore.deleteItemAsync(LEGACY_STORAGE_KEYS.SUPABASE_SESSION),
    ]);
  } catch (error) {
    console.warn('[SecureStore] Failed to clear secure auth data:', error);
  }
}

export async function saveAppLanguage(lang: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.APP_LANGUAGE, lang);
  } catch (error) {
    console.warn('[SecureStore] Failed to save app language:', error);
  }
}

export async function getSavedAppLanguage(): Promise<string | null> {
  try {
    const lang = await SecureStore.getItemAsync(STORAGE_KEYS.APP_LANGUAGE);
    if (lang) return lang;
    return await SecureStore.getItemAsync(LEGACY_STORAGE_KEYS.APP_LANGUAGE);
  } catch (error) {
    console.warn('[SecureStore] Failed to get app language:', error);
    return null;
  }
}

