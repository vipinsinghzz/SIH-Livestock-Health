/**
 * PashuCare - Central API Service
 * File: mobile/src/services/api.ts
 * 
 * Production-ready Axios instance configured with timeouts, error mapping,
 * token injection, hardware-backed token sync, and structured error responses.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { getSavedAuthToken } from './secureStorage';

export interface ApiErrorResponse {
  message: string;
  status: number;
  data?: unknown;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status: number = 500, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// In-memory token cache synchronized with SecureStore
let authToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = (): string | null => authToken;

export const setOnUnauthorizedCallback = (callback: (() => void) | null) => {
  onUnauthorizedCallback = callback;
};

export const api: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Attach Bearer token if present
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = authToken;
    if (!token) {
      try {
        token = await getSavedAuthToken();
        if (token) {
          authToken = token;
        }
      } catch (e) {
        // Fall back gracefully if secure store read fails
      }
    }
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Response Interceptor: Normalize and extract clean error messages
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.response) {
      const status = error.response.status;

      // When encountering 401 Unauthorized, notify auth layer
      if (status === 401 && onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }

      // Server responded with an error status (4xx, 5xx)
      const serverMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        `Request failed with status ${status}`;

      return Promise.reject(
        new ApiError(serverMessage, status, error.code, error.response.data)
      );
    } else if (error.request) {
      // Request was made but no response was received (Network error, timeout)
      return Promise.reject(
        new ApiError('Network connection failed. Please verify your internet connectivity.', 0, 'NETWORK_ERROR')
      );
    } else {
      // Something happened while setting up the request
      return Promise.reject(
        new ApiError(error.message || 'An unexpected error occurred.', 500, 'REQUEST_SETUP_ERROR')
      );
    }
  }
);

export default api;
