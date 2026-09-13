import api from './api';
import { getApiUrl } from '../config/apiConfig';

class CaseService {
  /**
   * Create a new referral case from AI diagnosis result or Field Worker report
   */
  async createCase(payload) {
    const res = await api.post('/cases', payload);
    return res.data;
  }

  /**
   * Alias for field workers logging a direct clinical case
   */
  async createFieldCase(payload) {
    return this.createCase(payload);
  }

  /**
   * Get referral cases with optional status / filter / district params
   */
  async getCases(params = {}) {
    const res = await api.get('/cases', { params });
    return res.data;
  }

  /**
   * Get single case details by ID
   */
  async getCaseById(id) {
    const res = await api.get(`/cases/${id}`);
    return res.data;
  }

  /**
   * Atomic Case Claim (Veterinarians only)
   */
  async claimCase(id) {
    const res = await api.patch(`/cases/${id}/claim`);
    return res.data;
  }

  /**
   * Update Case Status across 5-stage lifecycle
   * (New -> Investigating -> Confirmed -> Containment -> Resolved)
   */
  async updateCaseStatus(id, payload) {
    const res = await api.patch(`/cases/${id}/status`, payload);
    return res.data;
  }

  /**
   * Get Spatial Outbreak Clusters in District (<= 5km grouping)
   */
  async getSpatialClusters(params = {}) {
    const res = await api.get('/cases/clusters', { params });
    return res.data;
  }

  /**
   * Get Containment Zones in District
   */
  async getContainmentZones(params = {}) {
    const res = await api.get('/cases/containment-zones', { params });
    return res.data;
  }

  /**
   * Create Containment Zone for an Outbreak Case
   */
  async createContainmentZone(payload) {
    const res = await api.post('/cases/containment-zones', payload);
    return res.data;
  }

  /**
   * Update Containment Zone status (ACTIVE -> CONTAINED -> LIFTED)
   */
  async updateContainmentZoneStatus(zoneId, payload) {
    const res = await api.patch(`/cases/containment-zones/${zoneId}/status`, payload);
    return res.data;
  }

  /**
   * Schedule Ring Vaccination for Case
   */
  async scheduleRingVaccination(caseId, payload) {
    const res = await api.post(`/cases/${caseId}/schedule-ring-vaccination`, payload);
    return res.data;
  }

  /**
   * Get Dynamic AI Preventive Advisory based on district disease cases & clusters
   */
  async getAdvisories(params = {}) {
    const res = await api.get('/cases/advisories', { params });
    return res.data;
  }

  /**
   * Retry failed notifications (poor connectivity handling)
   */
  async retryNotifications(id) {
    const res = await api.post(`/cases/${id}/retry-notifications`);
    return res.data;
  }

  /**
   * Get active veterinarians in district
   */
  async getDistrictVets(district) {
    const res = await api.get('/cases/district-vets', { params: { district } });
    return res.data;
  }

  /**
   * Subscribe to real-time referral SSE stream
   */
  subscribeToCaseStream(onEvent, onError) {
    const token = localStorage.getItem('pashurakshak_token');
    if (!token) return () => {};

    const url = getApiUrl(`/cases/stream?token=${encodeURIComponent(token)}`);
    let eventSource = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed) return;
      eventSource = new EventSource(url);

      eventSource.addEventListener('connected', (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: 'connected', ...data });
        } catch (err) {}
      });

      eventSource.addEventListener('NEW_CASE_ALERT', (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: 'NEW_CASE_ALERT', ...data });
        } catch (err) {}
      });

      eventSource.addEventListener('CASE_CLAIMED', (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: 'CASE_CLAIMED', ...data });
        } catch (err) {}
      });

      eventSource.addEventListener('CASE_ASSIGNED', (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: 'CASE_ASSIGNED', ...data });
        } catch (err) {}
      });

      eventSource.addEventListener('CASE_STATUS_UPDATE', (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: 'CASE_STATUS_UPDATE', ...data });
        } catch (err) {}
      });

      eventSource.addEventListener('CONTAINMENT_ZONE_CREATED', (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: 'CONTAINMENT_ZONE_CREATED', ...data });
        } catch (err) {}
      });

      eventSource.addEventListener('CONTAINMENT_ZONE_UPDATED', (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: 'CONTAINMENT_ZONE_UPDATED', ...data });
        } catch (err) {}
      });

      eventSource.addEventListener('RING_VACCINATION_SCHEDULED', (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: 'RING_VACCINATION_SCHEDULED', ...data });
        } catch (err) {}
      });

      eventSource.onerror = (err) => {
        if (onError) onError(err);
        eventSource.close();
        if (!isClosed) {
          setTimeout(connect, 5000); // Auto-reconnect with 5s backoff
        }
      };
    };

    connect();

    // Return cleanup unsubscribe function
    return () => {
      isClosed = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }
}

export default new CaseService();
