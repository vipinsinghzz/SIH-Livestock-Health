/**
 * Livestock Saathi - Secure Storage Service
 * File: mobile/src/services/secureStorage.ts
 * 
 * Hardware-backed secure storage using expo-secure-store (Android KeyStore / iOS Keychain).
 * Never uses plain unencrypted AsyncStorage for sensitive authentication credentials.
 */

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  SUPABASE_SESSION: 'sb_livestocksaathi_auth_token',
  AUTH_TOKEN: 'livestocksaathi_jwt_token',
  REFRESH_TOKEN: 'livestocksaathi_refresh_token',
  USER_PROFILE: 'livestocksaathi_user_profile',
} as const;

/**
 * Standard Storage Adapter for Supabase Client Session Persistence
 */
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
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
    return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.warn('[SecureStore] Failed to get auth token:', error);
    return null;
  }
}

export async function getSavedRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
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
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PROFILE);
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
    ]);
  } catch (error) {
    console.warn('[SecureStore] Failed to clear secure auth data:', error);
  }
}
