/**
 * Livestock Saathi - Officer Surveillance & Executive Dashboard Service
 * File: mobile/src/services/officerService.ts
 *
 * Communicates with audited production backend endpoints:
 * - GET /api/dashboard/summary
 * - GET /api/dashboard/trends
 *
 * Provides offline read caching via local SQLite database with user isolation.
 * Strictly adheres to zero fake fallback data, zero mock numbers, and honest error handling.
 */

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import {
  DashboardSummary,
  TrendPoint,
  DashboardSummaryResponse,
  DashboardTrendsResponse,
  OfficerDashboardFilters,
  GetDashboardSummaryResult,
  GetDashboardTrendsResult,
} from '../types/officer';
import {
  saveOfficerDashboardCache,
  getCachedOfficerDashboard,
  saveOfficerTrendsCache,
  getCachedOfficerTrends,
} from './localDatabase';

export const officerService = {
  /**
   * Fetch aggregated executive dashboard summary metrics.
   * Backed by GET /api/dashboard/summary.
   * If online: fetches from server, updates SQLite cache, returns live data.
   * If offline or server error: falls back to user-isolated SQLite cache.
   * If no cache exists: throws an honest descriptive error (never returns fake data).
   */
  async getDashboardSummary(
    userId: string,
    filters?: OfficerDashboardFilters
  ): Promise<GetDashboardSummaryResult> {
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    const targetDistrict = filters?.district || 'All';
    const targetBlock = filters?.block || 'All';

    if (isOnline) {
      try {
        const queryParams: Record<string, string> = {};
        if (filters?.district && filters.district !== 'All') {
          queryParams.district = filters.district;
        }
        if (filters?.block && filters.block !== 'All') {
          queryParams.block = filters.block;
        }

        const response = await api.get<DashboardSummaryResponse>('/dashboard/summary', {
          params: queryParams,
        });

        if (response.data && response.data.success && response.data.data) {
          const liveSummary = response.data.data;
          const now = Date.now();

          // Persist to user-isolated SQLite cache asynchronously
          saveOfficerDashboardCache(userId, targetDistrict, targetBlock, liveSummary).catch((err) => {
            console.warn('[OfficerService] Failed to cache dashboard summary:', err);
          });

          return {
            summary: liveSummary,
            fromCache: false,
            lastUpdated: now,
          };
        }
      } catch (err: any) {
        console.warn('[OfficerService] Live summary fetch failed, checking offline cache:', err.message);
        // Fall through to offline cache check
      }
    }

    // Offline mode or network failure: retrieve from user-isolated SQLite cache
    const cached = await getCachedOfficerDashboard(userId, targetDistrict, targetBlock);
    if (cached && cached.summary) {
      return {
        summary: cached.summary,
        fromCache: true,
        lastUpdated: cached.lastUpdated,
      };
    }

    // Honest failure: do NOT substitute fabricated numbers or fake zeroes
    if (!isOnline) {
      throw new Error('Offline — no cached surveillance data available.');
    }
    throw new Error('Unable to retrieve epidemiological surveillance data from server.');
  },

  /**
   * Fetch 30-day temporal epidemic progression data for charts.
   * Backed by GET /api/dashboard/trends.
   * If online: fetches from server, updates SQLite cache, returns live trends.
   * If offline or error: falls back to user-isolated SQLite cache.
   * If no cache exists: returns empty array with fromCache: false or throws if disconnected.
   */
  async getDashboardTrends(
    userId: string,
    filters?: OfficerDashboardFilters
  ): Promise<GetDashboardTrendsResult> {
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    const targetDistrict = filters?.district || 'All';
    const targetBlock = filters?.block || 'All';

    if (isOnline) {
      try {
        const queryParams: Record<string, string> = {};
        if (filters?.district && filters.district !== 'All') {
          queryParams.district = filters.district;
        }
        if (filters?.block && filters.block !== 'All') {
          queryParams.block = filters.block;
        }

        const response = await api.get<DashboardTrendsResponse>('/dashboard/trends', {
          params: queryParams,
        });

        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const liveTrends = response.data.data;
          const now = Date.now();

          // Persist to user-isolated SQLite cache asynchronously
          saveOfficerTrendsCache(userId, targetDistrict, targetBlock, liveTrends).catch((err) => {
            console.warn('[OfficerService] Failed to cache dashboard trends:', err);
          });

          return {
            trends: liveTrends,
            fromCache: false,
            lastUpdated: now,
          };
        }
      } catch (err: any) {
        console.warn('[OfficerService] Live trends fetch failed, checking offline cache:', err.message);
        // Fall through to offline cache check
      }
    }

    // Offline mode or network failure: retrieve from user-isolated SQLite cache
    const cached = await getCachedOfficerTrends(userId, targetDistrict, targetBlock);
    if (cached && cached.trends && cached.trends.length > 0) {
      return {
        trends: cached.trends,
        fromCache: true,
        lastUpdated: cached.lastUpdated,
      };
    }

    if (!isOnline) {
      return {
        trends: [],
        fromCache: true,
        lastUpdated: null,
      };
    }

    return {
      trends: [],
      fromCache: false,
      lastUpdated: null,
    };
  },
};
