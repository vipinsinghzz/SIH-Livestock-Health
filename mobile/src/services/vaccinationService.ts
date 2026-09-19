/**
 * Livestock Saathi - Vaccination & Preventive Health Service
 * File: mobile/src/services/vaccinationService.ts
 * 
 * Communicates with production endpoints for government vaccination drives,
 * camp registrations, and preventive health advisories.
 * Supported by offline read caches for offline reference.
 */

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import {
  VaccinationDrive,
  CampRegistration,
  PreventiveAdvisory,
  CreateVaccinationDrivePayload,
  CreateVaccinationDriveResponse,
  UpdateVaccinationDrivePayload,
  UpdateVaccinationDriveResponse,
} from '../types/vaccination';
import {
  saveVaccinationsCache,
  getCachedVaccinations,
  saveAdvisoriesCache,
  getCachedAdvisories,
} from './localDatabase';

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
   * Caches to SQLite when online, and serves cached drives when disconnected.
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
    const netState = await NetInfo.fetch();

    if (netState.isConnected && netState.isInternetReachable !== false) {
      try {
        const response = await api.get<VaccinationDrivesResponse>('/vaccination-drives', { params });
        const drives = response.data.drives || [];
        if (drives.length > 0) {
          await saveVaccinationsCache(params?.district || 'All', drives);
        }
        return drives;
      } catch (err) {
        console.warn('[VaccinationService] Drives fetch failed, falling back to cache:', err);
      }
    }

    // Offline cache fallback
    const { drives } = await getCachedVaccinations(params?.district);
    return drives;
  },

  /**
   * Fetch camps registered by the authenticated farmer
   */
  async getMyRegistrations(): Promise<CampRegistration[]> {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return [];
    }
    const response = await api.get<CampRegistrationsResponse>('/vaccination-drives/my-registrations');
    return response.data.registrations || [];
  },

  /**
   * Register farmer's livestock for a government vaccination drive
   * Requires live server connection to verify slot capacity and generate authoritative token.
   */
  async registerForCamp(
    campId: string,
    payload: RegisterCampPayload
  ): Promise<RegisterCampResponse> {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('Camp registration requires an active internet connection to allocate official slots.');
    }
    const response = await api.post<RegisterCampResponse>(
      `/vaccination-drives/${campId}/register`,
      payload
    );
    return response.data;
  },

  /**
   * Fetch active preventive advisories by district
   * Caches advisories to SQLite and falls back to cached data when offline.
   */
  async getAdvisories(params?: {
    district?: string;
    block?: string;
    severity?: string;
  }): Promise<PreventiveAdvisory[]> {
    const netState = await NetInfo.fetch();

    if (netState.isConnected && netState.isInternetReachable !== false) {
      try {
        const response = await api.get<AdvisoriesResponse>('/advisories', { params });
        const advisories = response.data.advisories || [];
        if (advisories.length > 0) {
          await saveAdvisoriesCache(params?.district || 'All', advisories);
        }
        return advisories;
      } catch (err) {
        console.warn('[VaccinationService] Advisories fetch failed, falling back to cache:', err);
      }
    }

    // Offline cache fallback
    const { advisories } = await getCachedAdvisories(params?.district);
    return advisories;
  },

  /**
   * Create a new government vaccination campaign/drive
   * Backed by POST /api/vaccination-drives.
   * STRICTLY ONLINE ONLY.
   */
  async createVaccinationDrive(
    payload: CreateVaccinationDrivePayload
  ): Promise<CreateVaccinationDriveResponse> {
    if (!payload.vaccine?.trim()) {
      throw new Error('Vaccine name is required.');
    }
    if (!payload.village?.trim() || !payload.block?.trim()) {
      throw new Error('Target village and block are required.');
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      throw new Error('Internet connection required for this action.');
    }

    try {
      const response = await api.post<CreateVaccinationDriveResponse>(
        '/vaccination-drives',
        payload
      );

      if (!response.data?.success || !response.data?.drive) {
        throw new Error(response.data?.message || 'Server returned an invalid campaign creation response.');
      }

      // Reconcile into local SQLite cache
      const dist = payload.district || response.data.drive.district || 'All';
      const { drives: cached } = await getCachedVaccinations(dist);
      await saveVaccinationsCache(dist, [response.data.drive, ...cached]);

      return response.data;
    } catch (err: any) {
      const responseData = err.data || err.response?.data;
      const msg = responseData?.message || err.message || 'Failed to create vaccination campaign.';
      throw new Error(msg);
    }
  },

  /**
   * Update vaccination campaign progress or status
   * Backed by PATCH /api/vaccination-drives/:id.
   * STRICTLY ONLINE ONLY.
   */
  async updateVaccinationDrive(
    id: string,
    payload: UpdateVaccinationDrivePayload
  ): Promise<UpdateVaccinationDriveResponse> {
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      throw new Error('Valid campaign ID is required.');
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      throw new Error('Internet connection required for this action.');
    }

    try {
      const response = await api.patch<UpdateVaccinationDriveResponse>(
        `/vaccination-drives/${encodeURIComponent(cleanId)}`,
        payload
      );

      if (!response.data?.success || !response.data?.drive) {
        throw new Error(response.data?.message || 'Server returned an invalid campaign update response.');
      }

      // Reconcile into local SQLite cache
      const updatedDrive = response.data.drive;
      const dist = updatedDrive.district || 'All';
      const { drives: cached } = await getCachedVaccinations(dist);
      const updated = cached.map((d) =>
        (d._id || (d as any).id) === cleanId ? { ...d, ...updatedDrive } : d
      );
      if (!updated.some((d) => (d._id || (d as any).id) === cleanId)) {
        updated.unshift(updatedDrive);
      }
      await saveVaccinationsCache(dist, updated);

      return response.data;
    } catch (err: any) {
      const responseData = err.data || err.response?.data;
      const msg = responseData?.message || err.message || 'Failed to update vaccination campaign.';
      throw new Error(msg);
    }
  },
};


export default vaccinationService;
