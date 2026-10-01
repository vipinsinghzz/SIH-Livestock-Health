/**
 * PashuCare - Containment & Ring Vaccination Service
 * File: mobile/src/services/containmentService.ts
 * 
 * Production service managing:
 * - GET /api/cases/containment-zones (Active containment perimeters)
 * - POST /api/cases/containment-zones (Declare quarantine buffer around confirmed outbreak)
 * - PATCH /api/cases/containment-zones/:zoneId/status (Advance ACTIVE -> CONTAINED -> LIFTED)
 * - POST /api/cases/:id/schedule-ring-vaccination (Emergency Ring Vaccination scheduling)
 * - GET /api/cases/clusters (PostGIS spatial outbreak clustering <= 5km)
 * - GET /api/cases/advisories (Dynamic AI epidemiological advisory)
 * 
 * CRITICAL ARCHITECTURE RULES:
 * 1. Mutations (create zone, update status, schedule ring drive) are STRICTLY ONLINE ONLY.
 *    No fake local mutations or sync_queue entries.
 * 2. Spatial layers and containment perimeters are safely cached in SQLite for offline map view.
 * 3. Exact backend statuses (ACTIVE, CONTAINED, LIFTED) are preserved.
 */

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import {
  ContainmentZone,
  OutbreakCluster,
  CreateContainmentZonePayload,
  UpdateContainmentZonePayload,
  ScheduleRingVaccinationPayload,
  RingVaccinationResult,
  OutbreakAdvisoryResponse,
} from '../types/containment';
import {
  saveContainmentZonesCache,
  getCachedContainmentZones,
  saveOutbreakClustersCache,
  getCachedOutbreakClusters,
} from './localDatabase';

export interface GetContainmentZonesResult {
  zones: ContainmentZone[];
  count: number;
  fromCache: boolean;
}

export interface GetOutbreakClustersResult {
  clusters: OutbreakCluster[];
  count: number;
  district: string;
  fromCache: boolean;
}

export interface CreateContainmentZoneResult {
  success: boolean;
  message: string;
  zone: ContainmentZone;
  case?: any;
}

export interface UpdateContainmentZoneResult {
  success: boolean;
  message: string;
  zone: ContainmentZone;
}

export const containmentService = {
  /**
   * Fetch containment zones for district with optional status filtering.
   * Backed by GET /api/cases/containment-zones. Falls back to SQLite cache when offline.
   */
  async getContainmentZones(params?: {
    district?: string;
    status?: string;
  }): Promise<GetContainmentZonesResult> {
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    const targetDistrict = params?.district;
    if (!targetDistrict) {
      return { zones: [], count: 0, fromCache: false };
    }

    if (isOnline) {
      try {
        const queryParams: Record<string, string> = {};
        if (params?.district) queryParams.district = params.district;
        if (params?.status && params.status !== 'all') queryParams.status = params.status;

        const response = await api.get<{
          success: boolean;
          count: number;
          zones: ContainmentZone[];
        }>('/cases/containment-zones', { params: queryParams });

        const rawZones = response.data?.zones || [];

        // Save server records into SQLite cache
        await saveContainmentZonesCache(targetDistrict, rawZones);

        return {
          zones: rawZones,
          count: rawZones.length,
          fromCache: false,
        };
      } catch (err: any) {
        console.warn('[ContainmentService] Online fetch failed, falling back to SQLite cache:', err?.message);
      }
    }

    // Offline SQLite cache fallback
    const { zones: cached } = await getCachedContainmentZones(targetDistrict);
    let filtered = cached;

    if (params?.status && params.status !== 'all') {
      const targetStatus = params.status.toUpperCase().trim();
      filtered = filtered.filter((z) => String(z.status || '').toUpperCase() === targetStatus);
    }

    return {
      zones: filtered,
      count: filtered.length,
      fromCache: true,
    };
  },

  /**
   * Declare a new quarantine containment zone around an outbreak or case.
   * Backed by POST /api/cases/containment-zones.
   * 
   * CRITICAL: Strictly ONLINE ONLY.
   */
  async createContainmentZone(
    payload: CreateContainmentZonePayload
  ): Promise<CreateContainmentZoneResult> {
    if (!payload.disease) {
      throw new Error('Disease name is required for containment zone declaration.');
    }

    if (!payload.center?.lat || !payload.center?.lng) {
      throw new Error('Center GPS coordinates (lat, lng) are required.');
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      throw new Error('Declaring a containment zone requires an active internet connection.');
    }

    const body: Record<string, any> = {
      disease: payload.disease,
      center: payload.center,
      radiusKm: payload.radiusKm || 5.0,
    };

    if (payload.caseId) body.caseId = payload.caseId;
    if (payload.district) body.district = payload.district;
    if (payload.block) body.block = payload.block;
    if (payload.village) body.village = payload.village;
    if (payload.enforcedRules && payload.enforcedRules.length) body.enforcedRules = payload.enforcedRules;
    if (payload.notes) body.notes = payload.notes;

    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        zone: ContainmentZone;
        case?: any;
      }>('/cases/containment-zones', body);

      const zone = response.data?.zone;
      if (!zone) {
        throw new Error('Server returned an empty containment zone response.');
      }

      // Reconcile into SQLite cache
      const dist = payload.district || zone.district;
      if (dist) {
        const { zones: cached } = await getCachedContainmentZones(dist);
        const updated = [zone, ...cached.filter((z) => (z.id || z.zoneId) !== (zone.id || zone.zoneId))];
        await saveContainmentZonesCache(dist, updated);
      }

      return {
        success: true,
        message: response.data?.message || `Containment Zone ${zone.zoneId} established successfully.`,
        zone,
        case: response.data?.case,
      };
    } catch (err: any) {
      const responseData = err.data || err.response?.data;
      const msg = responseData?.message || err.message || 'Failed to create containment zone.';
      throw new Error(msg);
    }
  },

  /**
   * Alias for createContainmentZone to match Phase 9.4 specification.
   */
  async declareContainmentZone(
    payload: CreateContainmentZonePayload
  ): Promise<CreateContainmentZoneResult> {
    return this.createContainmentZone(payload);
  },

  /**
   * Update status of an existing containment zone (ACTIVE -> CONTAINED -> LIFTED).
   * Backed by PATCH /api/cases/containment-zones/:zoneId/status.
   * 
   * CRITICAL: Strictly ONLINE ONLY.
   */
  async updateContainmentZoneStatus(
    zoneId: string,
    payload: UpdateContainmentZonePayload
  ): Promise<UpdateContainmentZoneResult> {
    const cleanId = String(zoneId || '').trim();
    if (!cleanId) {
      throw new Error('Valid zone ID is required for updating containment status.');
    }

    if (!['ACTIVE', 'CONTAINED', 'LIFTED'].includes(payload.status)) {
      throw new Error('Invalid status. Must be ACTIVE, CONTAINED, or LIFTED.');
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      throw new Error('Updating containment zone status requires an active internet connection.');
    }

    const body: Record<string, any> = {
      status: payload.status,
    };
    if (payload.notes !== undefined) body.notes = payload.notes;

    try {
      const response = await api.patch<{
        success: boolean;
        message: string;
        zone: ContainmentZone;
      }>(`/cases/containment-zones/${encodeURIComponent(cleanId)}/status`, body);

      const zone = response.data?.zone;
      if (!zone) {
        throw new Error('Server returned an empty containment zone update response.');
      }

      // Reconcile into SQLite cache
      const dist = zone.district;
      if (dist) {
        const { zones: cached } = await getCachedContainmentZones(dist);
        const updated = cached.map((z) =>
          (z.id || z.zoneId) === cleanId ? { ...z, ...zone } : z
        );
        if (!updated.some((z) => (z.id || z.zoneId) === cleanId)) {
          updated.unshift(zone);
        }
        await saveContainmentZonesCache(dist, updated);
      }

      return {
        success: true,
        message: response.data?.message || `Containment zone status updated to ${payload.status}.`,
        zone,
      };
    } catch (err: any) {
      const responseData = err.data || err.response?.data;
      const msg = responseData?.message || err.message || 'Failed to update containment zone status.';
      throw new Error(msg);
    }
  },

  /**
   * Schedule emergency ring vaccination for an outbreak case or containment buffer.
   * Backed by POST /api/cases/:id/schedule-ring-vaccination.
   * 
   * CRITICAL: Strictly ONLINE ONLY.
   */
  async scheduleRingVaccination(
    caseId: string,
    payload: ScheduleRingVaccinationPayload
  ): Promise<RingVaccinationResult> {
    const cleanCaseId = String(caseId || '').trim();
    if (!cleanCaseId) {
      throw new Error('Valid case ID is required for scheduling ring vaccination.');
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      throw new Error('Scheduling ring vaccination requires an active internet connection.');
    }

    const body: Record<string, any> = {};
    if (payload.campDate) body.campDate = payload.campDate;
    if (payload.venue) body.venue = payload.venue;
    if (payload.capacity) body.capacity = payload.capacity;
    if (payload.notes) body.notes = payload.notes;

    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        drive: any;
        case: any;
      }>(`/cases/${encodeURIComponent(cleanCaseId)}/schedule-ring-vaccination`, body);

      return {
        success: true,
        message: response.data?.message || 'Emergency ring vaccination drive scheduled successfully.',
        drive: response.data?.drive,
        case: response.data?.case,
      };
    } catch (err: any) {
      const responseData = err.data || err.response?.data;
      const msg = responseData?.message || err.message || 'Failed to schedule ring vaccination.';
      throw new Error(msg);
    }
  },

  /**
   * Fetch spatial outbreak clusters (PostGIS DBSCAN <= 5km proximity).
   * Backed by GET /api/cases/clusters. Falls back to SQLite cache when offline.
   */
  async getSpatialOutbreakClusters(params?: {
    district?: string;
    distanceKm?: number;
    minCases?: number;
  }): Promise<GetOutbreakClustersResult> {
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    const targetDistrict = params?.district;
    if (!targetDistrict) {
      return { clusters: [], count: 0, district: '', fromCache: false };
    }

    if (isOnline) {
      try {
        const queryParams: Record<string, any> = {};
        if (params?.district) queryParams.district = params.district;
        if (params?.distanceKm) queryParams.distanceKm = params.distanceKm;
        if (params?.minCases) queryParams.minCases = params.minCases;

        const response = await api.get<{
          success: boolean;
          district: string;
          count: number;
          clusters: OutbreakCluster[];
        }>('/cases/clusters', { params: queryParams });

        const rawClusters = response.data?.clusters || [];

        // Save server records into SQLite cache
        await saveOutbreakClustersCache(targetDistrict, rawClusters);

        return {
          clusters: rawClusters,
          count: rawClusters.length,
          district: response.data?.district || targetDistrict,
          fromCache: false,
        };
      } catch (err: any) {
        console.warn('[ContainmentService] Clusters fetch failed, falling back to SQLite cache:', err?.message);
      }
    }

    // Offline SQLite cache fallback
    const { clusters: cached } = await getCachedOutbreakClusters(targetDistrict);
    return {
      clusters: cached,
      count: cached.length,
      district: targetDistrict,
      fromCache: true,
    };
  },

  /**
   * Alias for getSpatialOutbreakClusters to match Phase 9.4 specification.
   */
  async getOutbreakClusters(params?: {
    district?: string;
    distanceKm?: number;
    minCases?: number;
  }): Promise<GetOutbreakClustersResult> {
    return this.getSpatialOutbreakClusters(params);
  },

  /**
   * Fetch dynamic AI epidemiological advisory for the district.
   * Backed by GET /api/cases/advisories.
   */
  async getAdvisories(params?: { district?: string }): Promise<OutbreakAdvisoryResponse | null> {
    try {
      const response = await api.get<OutbreakAdvisoryResponse>('/cases/advisories', { params });
      return response.data;
    } catch (err: any) {
      console.warn('[ContainmentService] Advisory fetch error:', err?.message);
      return null;
    }
  },
};
