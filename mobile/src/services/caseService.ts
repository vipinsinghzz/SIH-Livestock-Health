/**
 * Livestock Saathi - Case Service
 * File: mobile/src/services/caseService.ts
 * 
 * Communicates with production /api/cases endpoints for farmer referral cases and health alerts.
 * Provides durable offline caching and local creation with "Pending Sync" state.
 */

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import {
  DiseaseCase,
  CaseListResponse,
  CaseDetailResponse,
  CreateCaseInput,
  CreateCaseResponse,
} from '../types/case';
import {
  getCachedCases,
  saveCasesCache,
  saveLocalPendingCase,
  enqueueSyncItem,
} from './localDatabase';
import { getSavedUserProfile } from './secureStorage';
import syncService from './syncService';

export * from '../types/case';

export const caseService = {
  /**
   * Fetch all referral cases for the authenticated farmer
   * Falls back to local SQLite cache when disconnected.
   */
  async getFarmerCases(params?: {
    status?: string;
    disease?: string;
    limit?: number;
  }): Promise<DiseaseCase[]> {
    const netState = await NetInfo.fetch();
    const user = await getSavedUserProfile<{ id?: string; _id?: string }>();
    const farmerId = user?.id || user?._id || '';

    if (netState.isConnected && netState.isInternetReachable !== false) {
      try {
        const response = await api.get<CaseListResponse>('/cases', { params });
        const cases = response.data.cases || [];
        if (farmerId && cases.length > 0) {
          await saveCasesCache(farmerId, cases);
        }
        return cases;
      } catch (err) {
        console.warn('[CaseService] Network fetch failed, falling back to cache:', err);
      }
    }

    // Fallback to SQLite cache
    if (farmerId) {
      const { cases } = await getCachedCases(farmerId);
      if (params?.status) {
        return cases.filter((c) => c.status === params.status);
      }
      return cases;
    }

    return [];
  },

  /**
   * Fetch details of a specific disease referral case by MongoDB ID or Case ID
   */
  async getCaseById(id: string): Promise<DiseaseCase> {
    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable !== false) {
      try {
        const response = await api.get<CaseDetailResponse>(`/cases/${id}`);
        return response.data.case;
      } catch (err) {
        console.warn('[CaseService] Network case detail fetch failed:', err);
      }
    }

    // Offline fallback from local cache
    const user = await getSavedUserProfile<{ id?: string; _id?: string }>();
    const farmerId = user?.id || user?._id || '';
    if (farmerId) {
      const { cases } = await getCachedCases(farmerId);
      const match = cases.find(
        (c) => (c.id || c._id) === id || c.caseId === id
      );
      if (match) return match;
    }

    throw new Error('Case details unavailable offline.');
  },

  /**
   * Create a new referral case linked to an animal and clinical diagnosis
   * If offline, assigns temporary ID and "Pending Sync" status, enqueuing for background sync.
   * STRICT ZERO-MOCK: Never fabricates an official server Case ID format.
   */
  async createCase(payload: CreateCaseInput): Promise<DiseaseCase & { reused?: boolean }> {
    const netState = await NetInfo.fetch();
    const user = await getSavedUserProfile<{ id?: string; _id?: string }>();
    const farmerId = user?.id || user?._id || 'local_farmer';

    if (netState.isConnected && netState.isInternetReachable !== false) {
      try {
        const response = await api.post<CreateCaseResponse>('/cases', payload);
        const serverCase = response.data.case;
        const reused = response.data.reused === true;
        if (farmerId && serverCase) {
          const { cases } = await getCachedCases(farmerId);
          await saveCasesCache(farmerId, [serverCase, ...cases]);
        }
        return { ...serverCase, reused };
      } catch (err: any) {
        const isNetworkError =
          err.status === 0 ||
          err.code === 'NETWORK_ERROR' ||
          err.code === 'ECONNABORTED' ||
          !err.response;

        if (!isNetworkError) {
          // Re-throw server 4xx validation or business errors
          throw err;
        }
        console.warn('[CaseService] Online creation failed with network error, queueing offline:', err.message);
      }
    }

    // Offline creation workflow
    const localTempId = `local_case_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const localCase: DiseaseCase = {
      _id: localTempId,
      id: localTempId,
      caseId: 'Pending Sync',
      isPendingSync: true,
      disease: payload.disease,
      status: 'New',
      risk: (payload.risk as any) || 'Moderate',
      animalId: payload.animalId
        ? {
            _id: payload.animalId,
            name: payload.animalName || 'Livestock Animal',
            species: payload.species || 'Cattle',
          }
        : null,
      animalName: payload.animalName,
      species: payload.species,
      symptoms: payload.symptoms || [],
      temperature: payload.temperature,
      duration: payload.duration,
      affectedCount: payload.affectedCount || 1,
      notes: payload.notes,
      farmerLocation: {
        village: payload.village || '',
        block: payload.block || '',
        district: payload.district || '',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveLocalPendingCase(farmerId, localCase);
    await enqueueSyncItem({
      farmerId,
      entityType: 'CASE',
      operation: 'CREATE',
      localId: localTempId,
      endpoint: '/cases',
      payload: payload as any,
    });

    // Notify sync service of pending change
    syncService.setActiveFarmer(farmerId);

    return localCase;
  },
};

export default caseService;
