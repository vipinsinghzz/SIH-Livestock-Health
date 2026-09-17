/**
 * Livestock Saathi - Vaccination & Preventive Health Service
 * File: mobile/src/services/vaccinationService.ts
 * 
 * Communicates with production endpoints for government vaccination drives,
 * camp registrations, and preventive health advisories.
 */

import api from './api';
import {
  VaccinationDrive,
  CampRegistration,
  PreventiveAdvisory,
} from '../types/vaccination';

export interface VaccinationDrivesResponse {
  success: boolean;
  count: number;
  drives: VaccinationDrive[];
}

export interface CampRegistrationsResponse {
  success: boolean;
  count: number;
  registrations: CampRegistration[];
}

export interface RegisterCampPayload {
  animalIds?: string[];
  animalCount?: number;
  farmerName?: string;
  farmerPhone?: string;
}

export interface RegisterCampResponse {
  success: boolean;
  message: string;
  token?: string;
  bookedSlots?: number;
  remainingSlots?: number;
}

export interface AdvisoriesResponse {
  success: boolean;
  count: number;
  advisories: PreventiveAdvisory[];
}

export const vaccinationService = {
  /**
   * Fetch upcoming and ongoing government vaccination drives/camps
   */
  async getVaccinationDrives(params?: {
    district?: string;
    block?: string;
    status?: string;
    vaccine?: string;
    search?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    limit?: number;
  }): Promise<VaccinationDrive[]> {
    const response = await api.get<VaccinationDrivesResponse>('/vaccination-drives', { params });
    return response.data.drives || [];
  },

  /**
   * Fetch camps registered by the authenticated farmer
   */
  async getMyRegistrations(): Promise<CampRegistration[]> {
    const response = await api.get<CampRegistrationsResponse>('/vaccination-drives/my-registrations');
    return response.data.registrations || [];
  },

  /**
   * Register farmer's livestock for a government vaccination drive
   */
  async registerForCamp(
    campId: string,
    payload: RegisterCampPayload
  ): Promise<RegisterCampResponse> {
    const response = await api.post<RegisterCampResponse>(
      `/vaccination-drives/${campId}/register`,
      payload
    );
    return response.data;
  },

  /**
   * Fetch active preventive advisories by district
   */
  async getAdvisories(params?: {
    district?: string;
    block?: string;
    severity?: string;
  }): Promise<PreventiveAdvisory[]> {
    const response = await api.get<AdvisoriesResponse>('/advisories', { params });
    return response.data.advisories || [];
  },
};

export default vaccinationService;
