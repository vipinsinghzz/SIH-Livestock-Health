/**
 * Livestock Saathi - Authentication Context
 * File: mobile/src/context/AuthContext.tsx
 * 
 * Provides centralized authentication state management, hardware-backed session persistence,
 * Supabase auth synchronization, and role resolution for the Android mobile application.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAuthToken, setOnUnauthorizedCallback, ApiError } from '../services/api';
import { supabase, isLiveSupabase } from '../config/supabaseClient';
import {
  saveAuthTokens,
  getSavedAuthToken,
  getSavedRefreshToken,
  saveUserProfile,
  getSavedUserProfile,
  clearAllSecureAuthData,
} from '../services/secureStorage';
import { clearFarmerCache } from '../services/localDatabase';
import syncService from '../services/syncService';

export type UserRole = 'farmer' | 'veterinarian' | 'field_worker' | 'officer' | 'admin';

export interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  district?: string;
  state?: string;
  village?: string;
  block?: string;
  registrationNo?: string;
  department?: string;
  preferredLanguage?: string;
}

export interface RegisterData {
  name: string;
  phone: string;
  password: string;
  role?: UserRole;
  email?: string;
  district?: string;
  state?: string;
  village?: string;
  block?: string;
  registrationNo?: string;
  department?: string;
  preferredLanguage?: string;
  location?: { lat: number; lng: number };
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (data: RegisterData) => Promise<AuthUser>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  loginAsPersona: (personaKey: 'farmer' | 'vet' | 'officer' | 'admin') => Promise<AuthUser>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const handleLogout = useCallback(async () => {
    try {
      if (isLiveSupabase && supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      // Ignore signOut network errors during local logout
    }

    if (user?.id) {
      await clearFarmerCache(user.id);
    }
    syncService.setActiveFarmer(null);

    await clearAllSecureAuthData();
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, [user]);

  // Initialize Auth & restore persisted session from Android Keystore
  useEffect(() => {
    let isMounted = true;

    // Register 401 handler with API client to trigger automatic clean logout
    setOnUnauthorizedCallback(() => {
      if (isMounted) {
        handleLogout();
      }
    });

    const initAuth = async () => {
      try {
        const storedToken = await getSavedAuthToken();
        const storedUser = await getSavedUserProfile<AuthUser>();

        if (storedToken && storedUser) {
          if (isMounted) {
            setAuthToken(storedToken);
            setToken(storedToken);
            setUser(storedUser);
            syncService.setActiveFarmer(storedUser.id || storedUser._id || null);
          }

          // Verify session in background with existing backend
          try {
            const res = await api.get<{ success: boolean; user: AuthUser }>('/auth/me');
            if (res.data?.user && isMounted) {
              setUser(res.data.user);
              await saveUserProfile(res.data.user);
            }
          } catch (e) {
            console.warn('[AuthContext] Background token verification failed:', e);
            if (isMounted) {
              await handleLogout();
            }
          }
        } else if (isLiveSupabase && supabase?.auth) {
          // Check for active Supabase session
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token && isMounted) {
              setAuthToken(session.access_token);
              setToken(session.access_token);
              await saveAuthTokens(session.access_token, session.refresh_token);

              const res = await api.get<{ success: boolean; user: AuthUser }>('/auth/me');
              if (res.data?.user && isMounted) {
                setUser(res.data.user);
                await saveUserProfile(res.data.user);
              }
            }
          } catch (err) {
            console.warn('[AuthContext] Supabase session check error:', err);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Initialization error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      setOnUnauthorizedCallback(null);
    };
  }, [handleLogout]);

  const login = async (identifier: string, password: string): Promise<AuthUser> => {
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      throw new ApiError('Please provide email or phone and password.', 400);
    }

    // Authenticate with existing production backend
    const res = await api.post<{
      success: boolean;
      token: string;
      refreshToken?: string;
      user: AuthUser;
      message?: string;
    }>('/auth/login', {
      identifier: cleanIdentifier,
      email: cleanIdentifier,
      phone: cleanIdentifier,
      password,
    });

    if (res.data.success && res.data.user) {
      const authTokenValue = res.data.token;
      const authUserValue = res.data.user;

      setAuthToken(authTokenValue);
      setToken(authTokenValue);
      setUser(authUserValue);

      // Persist in Android Keystore
      await saveAuthTokens(authTokenValue, res.data.refreshToken);
      await saveUserProfile(authUserValue);
      syncService.setActiveFarmer(authUserValue.id || authUserValue._id || null);

      // Synchronize live Supabase client if refreshToken is provided
      if (isLiveSupabase && res.data.refreshToken && supabase?.auth?.setSession) {
        try {
          await supabase.auth.setSession({
            access_token: authTokenValue,
            refresh_token: res.data.refreshToken,
          });
        } catch (e) {
          // Continue if Supabase client sync fails
        }
      }

      return authUserValue;
    } else {
      throw new ApiError(res.data.message || 'Login failed. Please verify credentials.', 401);
    }
  };

  const register = async (data: RegisterData): Promise<AuthUser> => {
    const res = await api.post<{
      success: boolean;
      token: string;
      user: AuthUser;
      message?: string;
    }>('/auth/register', data);

    if (res.data.success && res.data.user) {
      const authTokenValue = res.data.token;
      const authUserValue = res.data.user;

      setAuthToken(authTokenValue);
      setToken(authTokenValue);
      setUser(authUserValue);

      await saveAuthTokens(authTokenValue);
      await saveUserProfile(authUserValue);
      syncService.setActiveFarmer(authUserValue.id || authUserValue._id || null);

      return authUserValue;
    } else {
      throw new ApiError(res.data.message || 'Registration failed.', 400);
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new ApiError('Please enter a valid email address.', 400);
    }

    try {
      if (isLiveSupabase && supabase?.auth?.resetPasswordForEmail) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (error) {
          throw new ApiError(error.message, 400);
        }
      }

      return {
        success: true,
        message: 'Password reset instructions sent to your email.',
      };
    } catch (err: any) {
      throw new ApiError(err.message || 'Failed to send password reset email.', 400);
    }
  };

  const loginAsPersona = async (personaKey: 'farmer' | 'vet' | 'officer' | 'admin'): Promise<AuthUser> => {
    const personaMap = {
      farmer: { email: 'farmer@pashurakshak.in', password: 'Farmer@123' },
      vet: { email: 'vet@pashurakshak.in', password: 'Vet@123' },
      officer: { email: 'officer@pashurakshak.in', password: 'Admin@123' },
      admin: { email: 'admin@pashurakshak.in', password: 'Admin@123' },
    };

    const creds = personaMap[personaKey] || personaMap.farmer;
    return await login(creds.email, creds.password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        forgotPassword,
        logout: handleLogout,
        loginAsPersona,
        isAuthenticated: Boolean(user && token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
