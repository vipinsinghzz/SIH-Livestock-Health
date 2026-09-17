/**
 * Livestock Saathi - Kisan Saathi AI Service
 * File: mobile/src/services/kisanSaathiService.ts
 * 
 * Communicates with the production backend endpoint POST /api/kisan-saathi/consult.
 * Reuses the existing authenticated Axios instance (api.ts) with automatic Bearer
 * token injection, error mapping, and network failure handling.
 */

import api, { ApiError } from './api';
import {
  KisanSaathiConsultRequest,
  KisanSaathiConsultResponse
} from '../types/kisanSaathi';

export const kisanSaathiService = {
  /**
   * Dispatches a conversational consultation request to the backend.
   * Handles authenticated and guest requests gracefully.
   * Preserves isAIPowered and model identifiers to clearly distinguish Gemini from
   * the veterinary clinical rule engine fallback.
   */
  async consultKisanSaathi(
    request: KisanSaathiConsultRequest
  ): Promise<KisanSaathiConsultResponse> {
    try {
      const response = await api.post<KisanSaathiConsultResponse>(
        '/kisan-saathi/consult',
        request
      );

      if (response.data && response.data.success) {
        return {
          ...response.data,
          // Ensure flags are strictly boolean
          isAIPowered: Boolean(response.data.isAIPowered),
          model: response.data.model || 'veterinary-clinical-engine'
        };
      }

      // If success is false in payload
      throw new ApiError(
        response.data?.error || 'Unable to generate consultation response.',
        response.status
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        // Handle specific HTTP status scenarios cleanly
        if (error.status === 400) {
          throw new ApiError(error.message || 'Invalid request. Please check your message.', 400, 'BAD_REQUEST');
        }
        if (error.status === 401) {
          throw new ApiError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED');
        }
        if (error.status === 403) {
          throw new ApiError('Access restricted. Please verify your permissions.', 403, 'FORBIDDEN');
        }
        if (error.status === 408 || error.code === 'ECONNABORTED') {
          throw new ApiError('Request timed out. Please try again in a moment.', 408, 'TIMEOUT');
        }
        if (error.status === 429) {
          throw new ApiError('Too many requests. Please wait a few seconds before asking again.', 429, 'RATE_LIMITED');
        }
        if (error.status >= 500) {
          throw new ApiError('Kisan Saathi is temporarily unavailable. Please try again.', error.status, 'SERVER_ERROR');
        }
        throw error;
      }

      // Generic or network error fallback
      throw new ApiError(
        'Unable to connect to Kisan Saathi. Please check your internet connection.',
        0,
        'NETWORK_ERROR'
      );
    }
  }
};

export default kisanSaathiService;
