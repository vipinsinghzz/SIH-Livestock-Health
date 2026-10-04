/**
 * PashuCare - Vaccination & Program Management Service
 * File: frontend/src/services/vaccinationService.js
 *
 * Dedicated client-side service for Officer Vaccination & District/Program Management:
 * - Real-time Supabase KPIs
 * - Mass campaign creation & lifecycle transitions
 * - Outbreak-driven Ring Vaccination coordination
 * - Field worker & Veterinarian team assignment
 * - Coverage analytics & dose administration recording
 */

import api from './api';

export const vaccinationService = {
  /**
   * Fetch operational KPI statistics for the Officer dashboard
   */
  async getOfficerKpis(params = {}) {
    const response = await api.get('/vaccination-drives/kpis', { params });
    return response.data?.data || null;
  },

  /**
   * Fetch all vaccination campaigns / drives with optional filters
   */
  async getVaccinationDrives(params = {}) {
    const response = await api.get('/vaccination-drives', { params });
    return response.data?.drives || [];
  },

  /**
   * Fetch single vaccination drive by ID
   */
  async getVaccinationDriveById(id) {
    const response = await api.get(`/vaccination-drives/${id}`);
    return response.data?.drive || null;
  },

  /**
   * Create a standard vaccination campaign
   */
  async createCampaign(payload) {
    const response = await api.post('/vaccination-drives', payload);
    return response.data;
  },

  /**
   * Schedule an outbreak-driven ring vaccination campaign
   */
  async createRingCampaign(payload) {
    const response = await api.post('/vaccination-drives/ring-campaign', payload);
    return response.data;
  },

  /**
   * Fetch available veterinarians & field workers with real availability
   */
  async getAvailableStaff(params = {}) {
    const response = await api.get('/vaccination-drives/available-staff', { params });
    return response.data?.staff || [];
  },

  /**
   * Assign a veterinarian or field worker to a campaign
   */
  async assignTeam(driveId, payload) {
    const response = await api.post(`/vaccination-drives/${driveId}/assign-team`, payload);
    return response.data;
  },

  /**
   * Update campaign status (Scheduled -> Active/Ongoing -> Completed)
   */
  async updateCampaignStatus(driveId, status, notes = '') {
    const response = await api.patch(`/vaccination-drives/${driveId}/status`, { status, notes });
    return response.data;
  },

  /**
   * Close and archive a vaccination campaign
   */
  async closeCampaign(driveId, notes = '') {
    const response = await api.post(`/vaccination-drives/${driveId}/close`, { notes });
    return response.data;
  },

  /**
   * Record administered vaccination doses against a campaign
   */
  async recordVaccinationDose(driveId, payload) {
    const response = await api.post(`/vaccination-drives/${driveId}/record-vaccination`, payload);
    return response.data;
  },

  /**
   * Fetch block and village level coverage analytics
   */
  async getCoverageAnalytics(params = {}) {
    const response = await api.get('/vaccination-drives/coverage-analytics', { params });
    return response.data?.data || null;
  },

  /**
   * Fetch active outbreak cases in district for ring vaccination targeting
   */
  async getActiveOutbreaks(params = {}) {
    const response = await api.get('/vaccination-drives/active-outbreaks', { params });
    return response.data?.cases || [];
  },

  /**
   * Delete a campaign (for test data cleanup or decommissioning)
   */
  async deleteCampaign(driveId) {
    const response = await api.delete(`/vaccination-drives/${driveId}`);
    return response.data;
  }
};

export default vaccinationService;
