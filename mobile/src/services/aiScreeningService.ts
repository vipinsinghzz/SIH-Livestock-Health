/**
 * Livestock Saathi - AI Disease Screening Service
 * File: mobile/src/services/aiScreeningService.ts
 * 
 * Communicates with the live production backend endpoint POST /api/reports/triage
 * to run multimodal inference (lsd_model.keras + 27 clinical symptoms).
 */

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import { AiScreeningRequest, AiScreeningResponse } from '../types/aiScreening';

export interface ScanImageUploadResult {
  success: boolean;
  message: string;
  imageUrl?: string;
  signedUrl?: string;
  storagePath?: string;
  scanId?: string;
}

export const aiScreeningService = {
  /**
   * Evaluates animal symptoms and lesion image using production AI triage engine
   */
  async runTriageScreening(payload: AiScreeningRequest): Promise<AiScreeningResponse> {
    // 1. Verify real internet connectivity (No fake offline inference)
    const netState = await NetInfo.fetch();
    if (netState.isConnected === false) {
      throw new Error('AI screening requires an active internet connection. Please check your network and retry.');
    }

    try {
      const response = await api.post<AiScreeningResponse>('/reports/triage', payload, {
        timeout: 25000, // Deep learning inference may take up to 20-25 seconds on cold starts
      });

      return response.data;
    } catch (error: any) {
      // If server responded with aiUnavailable status in body
      if (error.response?.data?.aiUnavailable) {
        return error.response.data as AiScreeningResponse;
      }

      // If network timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return {
          success: false,
          aiUnavailable: true,
          errorType: 'TIMEOUT',
          message: 'The AI screening engine timed out while analyzing the image and symptoms. Please retry.',
          riskLevel: 'Pending',
          possibleCondition: null,
          confidenceScore: null,
          visualScore: null,
          hasImage: Boolean(payload.image),
          suspectedDiseases: [],
          recommendedAction: 'Veterinary physical examination recommended.',
          immediateFirstAid: [
            'Isolate the animal in a clean, shaded shed.',
            'Provide fresh drinking water and digestible fodder.',
            'Consult your nearest veterinary center for physical evaluation.'
          ],
          clinicalObservations: payload.symptoms,
          explanation: 'AI inference service timed out. Preliminary screening could not be completed.',
          modelVersion: 'lsd_model.keras (unavailable)'
        };
      }

      // If network connection failed
      if (!error.response) {
        throw new Error('Unable to connect to the livestock health server. Please verify your internet connectivity and try again.');
      }

      throw error;
    }
  },

  /**
   * Persists captured scan image in private Supabase Storage bucket 'livestock-scans'
   */
  async uploadScanImage(
    imageData: string,
    metadata: {
      animalId?: string;
      disease?: string;
      riskLevel?: string;
      confidence?: number;
      symptoms?: string[];
      temperature?: number;
      duration?: number;
    }
  ): Promise<ScanImageUploadResult> {
    try {
      const response = await api.post<ScanImageUploadResult>('/upload/scan-image', {
        image: imageData,
        ...metadata,
      });
      return response.data;
    } catch (err: any) {
      console.warn('[AiScreeningService] Storage upload notice:', err.message);
      return {
        success: false,
        message: err.message || 'Image storage skipped.',
      };
    }
  },
};

export default aiScreeningService;
