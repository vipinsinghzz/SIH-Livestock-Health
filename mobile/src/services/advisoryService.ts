/**
 * PashuCare - Official Biosecurity Advisories Service
 * File: mobile/src/services/advisoryService.ts
 *
 * Production service managing:
 * - GET /api/advisories (District biosecurity advisories & bulletins)
 * - POST /api/advisories (Officer broadcast of official quarantine & disease advisories)
 *
 * CRITICAL ARCHITECTURE RULES:
 * 1. Mutations (POST /advisories) are STRICTLY ONLINE ONLY.
 *    No fake local mutations or sync_queue entries.
 * 2. District scoping strictly derives from authenticated officer profile.
 *    Zero hardcoded geographic fallbacks.
 * 3. Offline reads are served from local SQLite cache with lastUpdated timestamp.
 */

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import {
  OfficialAdvisory,
  CreateAdvisoryPayload,
  GetAdvisoriesResponse,
  CreateAdvisoryResponse,
  GetAdvisoriesResult,
} from '../types/advisory';
import {
  saveAdvisoriesCache,
  getCachedAdvisories,
} from './localDatabase';

export const advisoryService = {
  /**
   * Fetch district advisories with optional severity filtering.
   * Backed by GET /api/advisories. Falls back to SQLite cache when offline.
   */
  async getAdvisories(params?: {
    district?: string;
    severity?: string;
  }): Promise<GetAdvisoriesResult> {
    const targetDistrict = params?.district;
    if (!targetDistrict) {
      return { advisories: [], count: 0, fromCache: false, lastUpdated: null };
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (isOnline) {
      try {
        const queryParams: Record<string, string> = {
          district: targetDistrict,
        };
        if (params?.severity && params.severity !== 'ALL' && params.severity !== 'All') {
          queryParams.severity = params.severity;
        }

        const response = await api.get<GetAdvisoriesResponse>('/advisories', {
          params: queryParams,
        });

        const rawAdvisories = response.data?.advisories || [];
        const validAdvisories: OfficialAdvisory[] = rawAdvisories.map((a: any) => ({
          _id: a._id || a.id,
          id: String(a.id || a._id || ''),
          title: a.title,
          titleEn: typeof a.title === 'object' ? a.title?.en : a.titleEn || a.title,
          titleHi: typeof a.title === 'object' ? a.title?.hi : a.titleHi,
          message: a.message,
          messageEn: typeof a.message === 'object' ? a.message?.en : a.messageEn || a.message,
          messageHi: typeof a.message === 'object' ? a.message?.hi : a.messageHi,
          severity: a.severity || 'Moderate',
          disease: a.disease || 'General Livestock Alert',
          targetVillage: a.targetVillage || 'All',
          targetBlock: a.targetBlock || 'All',
          targetDistrict: a.targetDistrict || targetDistrict,
          issuedBy: a.issuedBy || 'District Animal Husbandry Department',
          reportId: a.reportId || null,
          createdAt: a.createdAt || new Date().toISOString(),
          updatedAt: a.updatedAt,
        }));

        // Persist server records into SQLite cache asynchronously
        saveAdvisoriesCache(targetDistrict, validAdvisories).catch((err) => {
          console.warn('[AdvisoryService] Failed to cache advisories:', err);
        });

        return {
          advisories: validAdvisories,
          count: validAdvisories.length,
          fromCache: false,
          lastUpdated: Date.now(),
        };
      } catch (err: any) {
        console.warn('[AdvisoryService] Live fetch failed, falling back to SQLite cache:', err.message);
        // Fall through to offline cache check
      }
    }

    // Offline mode or server network failure: retrieve from SQLite cache
    const cached = await getCachedAdvisories(targetDistrict);
    let filteredAdvisories = cached.advisories;

    if (params?.severity && params.severity !== 'ALL' && params.severity !== 'All') {
      const normSev = params.severity.toLowerCase();
      filteredAdvisories = filteredAdvisories.filter(
        (a) => String(a.severity).toLowerCase() === normSev
      );
    }

    return {
      advisories: filteredAdvisories,
      count: filteredAdvisories.length,
      fromCache: true,
      lastUpdated: cached.lastUpdated,
    };
  },

  /**
   * Broadcast official advisory / bulletin.
   * Backed by POST /api/advisories (Authorized: Officer, Admin).
   * STRICTLY ONLINE ONLY. Rejects execution if device is disconnected.
   */
  async createAdvisory(payload: CreateAdvisoryPayload): Promise<CreateAdvisoryResponse> {
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      throw new Error(
        'Offline — Biosecurity advisories cannot be broadcasted without network connection. Connect to internet and retry.'
      );
    }

    if (!payload.title || (typeof payload.title === 'string' && !payload.title.trim())) {
      throw new Error('Advisory title is required.');
    }
    if (!payload.message || (typeof payload.message === 'string' && !payload.message.trim())) {
      throw new Error('Advisory message is required.');
    }
    if (!payload.targetDistrict) {
      throw new Error('Officer district is required to issue an advisory.');
    }

    const titleEn = typeof payload.title === 'object' ? payload.title.en : payload.title.trim();
    const titleHi = typeof payload.title === 'object' ? payload.title.hi || titleEn : titleEn;
    const msgEn = typeof payload.message === 'object' ? payload.message.en : payload.message.trim();
    const msgHi = typeof payload.message === 'object' ? payload.message.hi || msgEn : msgEn;

    const requestBody = {
      title: { en: titleEn, hi: titleHi },
      message: { en: msgEn, hi: msgHi },
      severity: payload.severity || 'Moderate',
      disease: payload.disease?.trim() || 'General Livestock Alert',
      targetVillage: payload.targetVillage?.trim() || 'All',
      targetBlock: payload.targetBlock?.trim() || 'All',
      targetDistrict: payload.targetDistrict,
    };

    const response = await api.post<CreateAdvisoryResponse>('/advisories', requestBody);

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || 'Server rejected advisory creation.');
    }

    const created = response.data.advisory;
    const normalized: OfficialAdvisory = {
      _id: created._id || created.id,
      id: String(created.id || created._id || ''),
      title: created.title,
      titleEn,
      titleHi,
      message: created.message,
      messageEn: msgEn,
      messageHi: msgHi,
      severity: created.severity || payload.severity,
      disease: created.disease || requestBody.disease,
      targetVillage: created.targetVillage || requestBody.targetVillage,
      targetBlock: created.targetBlock || requestBody.targetBlock,
      targetDistrict: created.targetDistrict || payload.targetDistrict,
      issuedBy: created.issuedBy || 'District Animal Husbandry Department',
      reportId: created.reportId || null,
      createdAt: created.createdAt || new Date().toISOString(),
      updatedAt: created.updatedAt,
    };

    // Update cache with the newly created advisory
    getCachedAdvisories(payload.targetDistrict).then((cached) => {
      const updatedList = [normalized, ...cached.advisories.filter((a) => a.id !== normalized.id)];
      saveAdvisoriesCache(payload.targetDistrict!, updatedList).catch(() => {});
    }).catch(() => {});

    return {
      success: true,
      message: response.data.message || 'Advisory issued successfully.',
      advisory: normalized,
    };
  },

  /**
   * Retrieve a single advisory by ID from cached or live list.
   */
  async getAdvisoryById(id: string, district?: string): Promise<OfficialAdvisory | null> {
    if (!id) return null;
    if (district) {
      const cached = await getCachedAdvisories(district);
      const found = cached.advisories.find((a) => a.id === id || a._id === id);
      if (found) return found;
    }
    // If not found in cache or no district provided, fetch all and search
    const all = await this.getAdvisories({ district: district || '' });
    return all.advisories.find((a) => a.id === id || a._id === id) || null;
  },
};
