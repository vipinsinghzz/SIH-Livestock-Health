/**
 * Livestock Saathi - Veterinarian API & Clinical Service
 * File: mobile/src/services/veterinarianService.ts
 * 
 * Communicates with verified production backend endpoints:
 * - GET   /api/cases               (District referrals & assigned clinical cases)
 * - GET   /api/cases/:id           (Referral clinical examination & audit timeline)
 * - PATCH /api/cases/:id/claim     (Atomic case claiming with race-condition protection)
 * 
 * Strict Offline Architecture:
 * - SAFE OFFLINE READ: Cache case lists and details in SQLite.
 * - ONLINE ONLY: Case claiming (strictly blocked offline; requires server-side atomic lock).
 * - ZERO MOCK DATA: Consumes authentic backend payloads.
 */

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import {
  DiseaseCase,
  CaseListResponse,
  CaseDetailResponse
} from '../types/case';
import {
  VeterinarianProfile,
  VetDashboardMetrics,
  ClaimCaseResult
} from '../types/vet';
import {
  ReferralFilterType,
  isCaseAssignedToVet
} from '../types/referral';
import {
  saveCasesCache,
  getCachedCases
} from './localDatabase';
import { getSavedUserProfile } from './secureStorage';

export interface GetReferralsResult {
  cases: DiseaseCase[];
  fromCache: boolean;
}

export interface GetReferralDetailResult {
  case: DiseaseCase;
  fromCache: boolean;
}

export const veterinarianService = {
  /**
   * Fetch district referrals and assigned cases for the authenticated veterinarian.
   * Caches successful responses in SQLite. Falls back to SQLite when offline.
   */
  async getVeterinarianReferrals(params?: {
    district?: string;
    status?: string;
    filter?: string;
    disease?: string;
    limit?: number;
  }): Promise<GetReferralsResult> {
    const netState = await NetInfo.fetch();
    const user = await getSavedUserProfile<VeterinarianProfile>();
    const vetId = user?.id || user?._id || 'local_vet';

    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (isOnline) {
      try {
        const queryParams: Record<string, any> = {
          limit: params?.limit || 100,
        };

        if (params?.district) queryParams.district = params.district;
        if (params?.status && params.status !== 'all') queryParams.status = params.status;
        if (params?.filter) queryParams.filter = params.filter;
        if (params?.disease) queryParams.disease = params.disease;

        const response = await api.get<CaseListResponse>('/cases', { params: queryParams });
        const cases = response.data?.cases || [];

        if (vetId && Array.isArray(cases) && cases.length > 0) {
          await saveCasesCache(vetId, cases);
        }

        return { cases, fromCache: false };
      } catch (err: any) {
        console.warn('[VeterinarianService] Online referrals fetch failed, falling back to cache:', err?.message);
      }
    }

    // Offline SQLite cache fallback
    if (vetId) {
      const { cases: cachedCases } = await getCachedCases(vetId);
      let filtered = cachedCases;

      if (params?.filter === 'my_cases') {
        filtered = filtered.filter((c) => isCaseAssignedToVet(c, vetId));
      } else if (params?.status && params.status !== 'all') {
        filtered = filtered.filter((c) => {
          const s = String(c.status || '').toLowerCase();
          const target = params.status!.toLowerCase();
          return s === target;
        });
      }

      return { cases: filtered, fromCache: true };
    }

    return { cases: [], fromCache: true };
  },

  /**
   * Fetch details of a specific referral case by ID.
   * Backed by GET /api/cases/:id. Falls back to SQLite cache when offline.
   */
  async getReferralById(id: string): Promise<GetReferralDetailResult> {
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      throw new Error('Valid case ID is required.');
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (isOnline) {
      try {
        const response = await api.get<CaseDetailResponse>(`/cases/${cleanId}`);
        const caseDoc = response.data?.case;
        if (!caseDoc) {
          throw new Error('Case not found on server.');
        }

        // Update single case record in local SQLite cache
        const user = await getSavedUserProfile<VeterinarianProfile>();
        const vetId = user?.id || user?._id || 'local_vet';
        if (vetId) {
          const { cases: currentCached } = await getCachedCases(vetId);
          const updated = [caseDoc, ...currentCached.filter((c) => (c.id || c._id) !== cleanId && c.caseId !== cleanId)];
          await saveCasesCache(vetId, updated);
        }

        return { case: caseDoc, fromCache: false };
      } catch (err: any) {
        console.warn('[VeterinarianService] Online case detail fetch failed:', err?.message);
      }
    }

    // Offline SQLite read
    const user = await getSavedUserProfile<VeterinarianProfile>();
    const vetId = user?.id || user?._id || 'local_vet';
    if (vetId) {
      const { cases: cachedCases } = await getCachedCases(vetId);
      const match = cachedCases.find(
        (c) => (c.id || c._id) === cleanId || c.caseId === cleanId
      );
      if (match) {
        return { case: match, fromCache: true };
      }
    }

    throw new Error('Case details are unavailable offline. Please reconnect to an active internet connection.');
  },

  /**
   * Atomic Case Claiming
   * Backed by PATCH /api/cases/:id/claim
   * 
   * CRITICAL ARCHITECTURE RULE:
   * Case claiming is strictly ONLINE ONLY. It relies on the backend atomic lock
   * to eliminate race conditions between multiple field veterinarians.
   * Offline queuing is explicitly forbidden.
   */
  async claimCase(caseId: string): Promise<ClaimCaseResult> {
    const cleanId = String(caseId || '').trim();
    if (!cleanId) {
      throw new Error('Valid case ID is required to claim.');
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      throw new Error('Claiming a case requires an active internet connection.');
    }

    try {
      const response = await api.patch<{
        success: boolean;
        message: string;
        case?: DiseaseCase;
        alreadyClaimed?: boolean;
        assignedVet?: any;
        status?: string;
      }>(`/cases/${cleanId}/claim`);

      const updatedCase = response.data?.case;

      // Reconcile into local SQLite cache if available
      if (updatedCase) {
        const user = await getSavedUserProfile<VeterinarianProfile>();
        const vetId = user?.id || user?._id || 'local_vet';
        if (vetId) {
          const { cases: cachedCases } = await getCachedCases(vetId);
          const updated = cachedCases.map((c) =>
            (c.id || c._id) === cleanId || c.caseId === cleanId ? updatedCase : c
          );
          await saveCasesCache(vetId, updated);
        }
      }

      return {
        success: true,
        message: response.data?.message || 'Case claimed successfully.',
        case: updatedCase,
      };
    } catch (err: any) {
      // 409 Conflict: Case already claimed by another doctor
      const responseData = err.data || err.response?.data;
      if (err.status === 409 || responseData?.alreadyClaimed) {
        const assignedName = responseData?.assignedVet?.name || 'another veterinarian';
        throw new Error(`This case has already been claimed by ${assignedName}.`);
      }

      const serverMessage = responseData?.message || err.message || 'Failed to claim case.';
      throw new Error(serverMessage);
    }
  },

  /**
   * Compute real dashboard clinical metrics from district referral data.
   * Strictly adheres to honest statistics disclosure without fabricating dataset-wide totals.
   */
  async getDashboardMetrics(district?: string): Promise<{
    metrics: VetDashboardMetrics;
    recentCases: DiseaseCase[];
    fromCache: boolean;
  }> {
    const user = await getSavedUserProfile<VeterinarianProfile>();
    const vetId = user?.id || user?._id || '';

    const { cases, fromCache } = await this.getVeterinarianReferrals({
      district: district || user?.district,
      limit: 100,
    });

    let newCount = 0;
    let investigatingCount = 0;
    let myCasesCount = 0;
    let confirmedCount = 0;
    let containmentCount = 0;
    let resolvedCount = 0;

    for (const c of cases) {
      const s = String(c.status || '').toUpperCase();
      if (s === 'NEW' || s === 'OPEN') {
        newCount++;
      } else if (s === 'INVESTIGATING' || s === 'ACCEPTED') {
        investigatingCount++;
      } else if (s === 'CONFIRMED') {
        confirmedCount++;
      } else if (s === 'CONTAINMENT' || s === 'IN_TREATMENT') {
        containmentCount++;
      } else if (s === 'RESOLVED' || s === 'CLOSED') {
        resolvedCount++;
      }

      if (vetId && isCaseAssignedToVet(c, vetId)) {
        myCasesCount++;
      }
    }

    const metrics: VetDashboardMetrics = {
      newReferralsCount: newCount,
      investigatingCount,
      myCasesCount,
      confirmedCount,
      containmentCount,
      resolvedCount,
      totalRecentCases: cases.length,
      sampleWindowLimit: 100,
      sampleWindowNote: `Metrics computed from latest ${cases.length} district referral records.`,
    };

    return {
      metrics,
      recentCases: cases.slice(0, 5),
      fromCache,
    };
  },
};

export default veterinarianService;
