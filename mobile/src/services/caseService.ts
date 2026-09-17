/**
 * Livestock Saathi - Case Service
 * File: mobile/src/services/caseService.ts
 * 
 * Communicates with production /api/cases endpoints for farmer referral cases and health alerts.
 */

import api from './api';
import {
  DiseaseCase,
  CaseListResponse,
  CaseDetailResponse,
  CreateCaseInput,
  CreateCaseResponse,
} from '../types/case';

export * from '../types/case';

export const caseService = {
  /**
   * Fetch all referral cases for the authenticated farmer
   */
  async getFarmerCases(params?: {
    status?: string;
    disease?: string;
    limit?: number;
  }): Promise<DiseaseCase[]> {
    const response = await api.get<CaseListResponse>('/cases', { params });
    return response.data.cases || [];
  },

  /**
   * Fetch details of a specific disease referral case by MongoDB ID or human-friendly Case ID (CASE-2026-...)
   */
  async getCaseById(id: string): Promise<DiseaseCase> {
    const response = await api.get<CaseDetailResponse>(`/cases/${id}`);
    return response.data.case;
  },

  /**
   * Create a new referral case linked to an animal and clinical diagnosis
   */
  async createCase(payload: CreateCaseInput): Promise<DiseaseCase> {
    const response = await api.post<CreateCaseResponse>('/cases', payload);
    return response.data.case;
  },
};

export default caseService;
