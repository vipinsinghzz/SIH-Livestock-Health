/**
 * PashuCare - Diagnostic Laboratory Service
 * File: mobile/src/services/labService.ts
 * 
 * Production service managing laboratory referrals, diagnostic tracking,
 * and result confirmation backed by GET, POST, and PATCH /api/lab-referrals.
 * 
 * CRITICAL ARCHITECTURE RULES:
 * 1. There is NO GET /api/lab-referrals/:id endpoint on the backend.
 *    Single referral details are obtained via list retrieval or SQLite cache.
 * 2. Laboratory mutations (create, update pipeline status, confirm pathogen) are
 *    STRICTLY ONLINE ONLY. No fake local mutations or sync_queue entries.
 * 3. Results and referrals are safely cached in SQLite for offline consultation.
 */

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import {
  LabReferral,
  CreateLabReferralPayload,
  UpdateLabReferralPayload
} from '../types/lab';
import {
  saveLabReferralsCache,
  getCachedLabReferrals
} from './localDatabase';
import { getSavedUserProfile } from './secureStorage';

export interface GetLabReferralsParams {
  status?: string;
  sampleType?: string;
  caseId?: string;
  searchQuery?: string;
}

export interface GetLabReferralsResult {
  referrals: LabReferral[];
  count: number;
  fromCache: boolean;
}

export interface GetLabReferralDetailResult {
  referral: LabReferral;
  fromCache: boolean;
}

export interface CreateLabReferralResult {
  success: boolean;
  message: string;
  referral: LabReferral;
}

export interface UpdateLabReferralResult {
  success: boolean;
  message: string;
  referral: LabReferral;
}

export const labService = {
  /**
   * List all lab referrals with optional status and sampleType filtering.
   * Backed by GET /api/lab-referrals. Falls back to SQLite cache when offline.
   */
  async getLabReferrals(params?: GetLabReferralsParams): Promise<GetLabReferralsResult> {
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    const user = await getSavedUserProfile<any>();
    const userId = user?.id || user?._id || 'local_user';

    if (isOnline) {
      try {
        const queryParams: Record<string, string> = {};
        if (params?.status && params.status !== 'all') {
          queryParams.status = params.status;
        }
        if (params?.sampleType && params.sampleType !== 'all') {
          queryParams.sampleType = params.sampleType;
        }

        const response = await api.get<{
          success: boolean;
          count: number;
          referrals: LabReferral[];
        }>('/lab-referrals', { params: queryParams });

        const rawReferrals = response.data?.referrals || [];

        // Save server records into SQLite cache
        await saveLabReferralsCache(userId, rawReferrals);

        // Client-side filtering if caseId or searchQuery supplied
        let filtered = rawReferrals;
        if (params?.caseId) {
          const targetCaseId = params.caseId.toLowerCase().trim();
          filtered = filtered.filter((r) => {
            const cId = (r.report?.caseId || r.report?.case_id || '').toLowerCase();
            const repId = (r.reportId || r.report_id || '').toLowerCase();
            return cId === targetCaseId || repId === targetCaseId;
          });
        }

        if (params?.searchQuery && params.searchQuery.trim()) {
          const q = params.searchQuery.toLowerCase().trim();
          filtered = filtered.filter((r) => {
            const diseaseMatch = (r.resultSummary?.confirmedDisease || '').toLowerCase().includes(q);
            const notesMatch = (r.resultSummary?.notes || '').toLowerCase().includes(q);
            const sampleMatch = (r.sampleType || '').toLowerCase().includes(q);
            const labMatch = (r.referredLab || '').toLowerCase().includes(q);
            const caseMatch = (r.report?.caseId || '').toLowerCase().includes(q);
            const animalMatch = (r.report?.animalTag || r.report?.species || '').toLowerCase().includes(q);
            const villageMatch = (r.report?.village || '').toLowerCase().includes(q);
            return diseaseMatch || notesMatch || sampleMatch || labMatch || caseMatch || animalMatch || villageMatch;
          });
        }

        return {
          referrals: filtered,
          count: filtered.length,
          fromCache: false
        };
      } catch (err: any) {
        console.warn('[LabService] Online fetch failed, falling back to SQLite cache:', err?.message);
      }
    }

    // Offline SQLite cache fallback
    const { referrals: cached } = await getCachedLabReferrals(userId);
    let filtered = cached;

    if (params?.status && params.status !== 'all') {
      const targetStatus = params.status.toLowerCase().trim();
      filtered = filtered.filter((r) => String(r.status || '').toLowerCase() === targetStatus);
    }

    if (params?.sampleType && params.sampleType !== 'all') {
      const targetSample = params.sampleType.toLowerCase().trim();
      filtered = filtered.filter((r) => String(r.sampleType || '').toLowerCase() === targetSample);
    }

    if (params?.caseId) {
      const targetCaseId = params.caseId.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        const cId = (r.report?.caseId || r.report?.case_id || '').toLowerCase();
        const repId = (r.reportId || r.report_id || '').toLowerCase();
        return cId === targetCaseId || repId === targetCaseId;
      });
    }

    if (params?.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        const diseaseMatch = (r.resultSummary?.confirmedDisease || '').toLowerCase().includes(q);
        const notesMatch = (r.resultSummary?.notes || '').toLowerCase().includes(q);
        const sampleMatch = (r.sampleType || '').toLowerCase().includes(q);
        const labMatch = (r.referredLab || '').toLowerCase().includes(q);
        const caseMatch = (r.report?.caseId || '').toLowerCase().includes(q);
        const animalMatch = (r.report?.animalTag || r.report?.species || '').toLowerCase().includes(q);
        const villageMatch = (r.report?.village || '').toLowerCase().includes(q);
        return diseaseMatch || notesMatch || sampleMatch || labMatch || caseMatch || animalMatch || villageMatch;
      });
    }

    return {
      referrals: filtered,
      count: filtered.length,
      fromCache: true
    };
  },

  /**
   * Fetch details of a single lab referral.
   * NOTE: There is NO GET /api/lab-referrals/:id endpoint.
   * This method uses the list query or the SQLite cache to find the referral.
   */
  async getLabReferralById(id: string): Promise<GetLabReferralDetailResult> {
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      throw new Error('Valid lab referral ID is required.');
    }

    // Try fetching from list or cache
    const { referrals, fromCache } = await this.getLabReferrals();
    const match = referrals.find((r) => (r.id || r._id) === cleanId);

    if (match) {
      return { referral: match, fromCache };
    }

    // Direct SQLite cache lookup if not found in filtered list
    const user = await getSavedUserProfile<any>();
    const userId = user?.id || user?._id || 'local_user';
    const { referrals: cached } = await getCachedLabReferrals(userId);
    const cachedMatch = cached.find((r) => (r.id || r._id) === cleanId);

    if (cachedMatch) {
      return { referral: cachedMatch, fromCache: true };
    }

    throw new Error('Diagnostic lab referral not found on device or server.');
  },

  /**
   * Create a new lab sample referral for a case or report.
   * Backed by POST /api/lab-referrals.
   * 
   * CRITICAL: Strictly ONLINE ONLY.
   */
  async createLabReferral(payload: CreateLabReferralPayload): Promise<CreateLabReferralResult> {
    const targetRefId = payload.caseId || payload.reportId;
    if (!targetRefId) {
      throw new Error('Case ID or Report ID is required to order a lab referral.');
    }

    if (!payload.sampleType) {
      throw new Error('Sample type is required for laboratory submission.');
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      throw new Error('Creating a laboratory referral requires an active internet connection.');
    }

    const body: Record<string, any> = {
      sampleType: payload.sampleType
    };

    if (payload.caseId) body.caseId = payload.caseId;
    if (payload.reportId) body.reportId = payload.reportId;
    if (payload.referredLab) body.referredLab = payload.referredLab;
    if (payload.collectionDate) body.collectionDate = payload.collectionDate;
    if (payload.notes) body.notes = payload.notes;

    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        referral: LabReferral;
      }>('/lab-referrals', body);

      const referral = response.data?.referral;
      if (!referral) {
        throw new Error('Server returned an empty lab referral response.');
      }

      // Reconcile into SQLite cache
      const user = await getSavedUserProfile<any>();
      const userId = user?.id || user?._id || 'local_user';
      const { referrals: cached } = await getCachedLabReferrals(userId);
      const updated = [referral, ...cached.filter((r) => (r.id || r._id) !== (referral.id || referral._id))];
      await saveLabReferralsCache(userId, updated);

      return {
        success: true,
        message: response.data?.message || 'Sample collection logged and lab referral generated successfully.',
        referral
      };
    } catch (err: any) {
      const responseData = err.data || err.response?.data;
      const msg = responseData?.message || err.message || 'Failed to create lab referral.';
      throw new Error(msg);
    }
  },

  /**
   * Update lab referral status along the 5-stage pipeline and record confirmed findings.
   * Backed by PATCH /api/lab-referrals/:id.
   * 
   * CRITICAL: Strictly ONLINE ONLY.
   */
  async updateLabReferral(
    id: string,
    payload: UpdateLabReferralPayload
  ): Promise<UpdateLabReferralResult> {
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      throw new Error('Valid lab referral ID is required for updates.');
    }

    if (payload.status === 'Result Confirmed' && !payload.confirmedDisease?.trim()) {
      throw new Error('Confirmed pathogen/disease result is required when confirming laboratory results.');
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      throw new Error('Updating a laboratory referral requires an active internet connection.');
    }

    const body: Record<string, any> = {};
    if (payload.status) body.status = payload.status;
    if (payload.confirmedDisease !== undefined) body.confirmedDisease = payload.confirmedDisease.trim();
    if (payload.notes !== undefined) body.notes = payload.notes.trim();

    try {
      const response = await api.patch<{
        success: boolean;
        message: string;
        referral: LabReferral;
      }>(`/lab-referrals/${cleanId}`, body);

      const referral = response.data?.referral;
      if (!referral) {
        throw new Error('Server returned an empty lab update response.');
      }

      // Reconcile into SQLite cache
      const user = await getSavedUserProfile<any>();
      const userId = user?.id || user?._id || 'local_user';
      const { referrals: cached } = await getCachedLabReferrals(userId);
      const updated = cached.map((r) =>
        (r.id || r._id) === cleanId ? { ...r, ...referral } : r
      );
      if (!updated.some((r) => (r.id || r._id) === cleanId)) {
        updated.unshift(referral);
      }
      await saveLabReferralsCache(userId, updated);

      return {
        success: true,
        message: response.data?.message || 'Lab referral updated successfully.',
        referral
      };
    } catch (err: any) {
      const responseData = err.data || err.response?.data;
      const msg = responseData?.message || err.message || 'Failed to update lab referral.';
      throw new Error(msg);
    }
  }
};
