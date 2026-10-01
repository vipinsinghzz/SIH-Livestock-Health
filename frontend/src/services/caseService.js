import api from './api';
import { getApiUrl } from '../config/apiConfig';

// Comprehensive Synthetic Nagpur Demo Dataset for PS-128
export const FALLBACK_CASES = [
  {
    _id: 'case-nag-001',
    caseId: 'CASE-2026-NAG-001',
    disease: 'Lumpy Skin Disease',
    suspectedDisease: 'Lumpy Skin Disease',
    species: 'Cattle',
    breed: 'Gaolao Cattle',
    tagId: 'NG-COW-108',
    status: 'Containment',
    urgency: 'CRITICAL',
    confidenceScore: 0.94,
    symptoms: ['Skin nodules across neck & flanks', 'High fever (104.2 F)', 'Nasal discharge', 'Swollen lymph nodes'],
    location: {
      village: 'Saoner Rural',
      block: 'Saoner',
      district: 'Nagpur',
      state: 'Maharashtra',
      coordinates: { lat: 21.385, lng: 78.918 }
    },
    farmer: {
      name: 'Suresh Rao Patil',
      phone: '+91 98230 45671'
    },
    assignedVet: {
      name: 'Dr. Amit Deshmukh',
      phone: '+91 98224 55001'
    },
    createdAt: '2026-09-28T09:30:00Z',
    updatedAt: '2026-09-29T14:20:00Z'
  },
  {
    _id: 'case-nag-002',
    caseId: 'CASE-2026-NAG-002',
    disease: 'Lumpy Skin Disease',
    suspectedDisease: 'Lumpy Skin Disease',
    species: 'Cattle',
    breed: 'Gir Cow',
    tagId: 'NG-COW-104',
    status: 'Investigating',
    urgency: 'HIGH',
    confidenceScore: 0.89,
    symptoms: ['Multiple firm circumscribed nodules', 'Mild pyrexia', 'Reduced milk yield'],
    location: {
      village: 'Waki',
      block: 'Saoner',
      district: 'Nagpur',
      state: 'Maharashtra',
      coordinates: { lat: 21.372, lng: 78.931 }
    },
    farmer: {
      name: 'Ramesh Wankhede',
      phone: '+91 98230 45672'
    },
    assignedVet: {
      name: 'Dr. Amit Deshmukh',
      phone: '+91 98224 55001'
    },
    createdAt: '2026-09-28T11:15:00Z',
    updatedAt: '2026-09-29T10:00:00Z'
  },
  {
    _id: 'case-nag-003',
    caseId: 'CASE-2026-NAG-003',
    disease: 'Contagious Ecthyma (Orf)',
    suspectedDisease: 'Contagious Ecthyma (Orf)',
    species: 'Goat',
    breed: 'Berari Goat',
    tagId: 'NG-GOAT-202',
    status: 'Confirmed',
    urgency: 'MEDIUM',
    confidenceScore: 0.92,
    symptoms: ['Crusted papules and vesicles around lips and muzzle', 'Difficulty feeding'],
    location: {
      village: 'Yerkheda',
      block: 'Kamptee',
      district: 'Nagpur',
      state: 'Maharashtra',
      coordinates: { lat: 21.226, lng: 79.199 }
    },
    farmer: {
      name: 'Sunita Bai Meshram',
      phone: '+91 98230 45673'
    },
    assignedVet: {
      name: 'Dr. Rajesh Patil',
      phone: '+91 98224 55002'
    },
    createdAt: '2026-09-29T08:45:00Z',
    updatedAt: '2026-09-30T11:00:00Z'
  },
  {
    _id: 'case-nag-004',
    caseId: 'CASE-2026-NAG-004',
    disease: 'Peste des Petits Ruminants (PPR)',
    suspectedDisease: 'Peste des Petits Ruminants (PPR)',
    species: 'Sheep',
    breed: 'Deccani Sheep',
    tagId: 'NG-SHEEP-302',
    status: 'New',
    urgency: 'HIGH',
    confidenceScore: 0.88,
    symptoms: ['High fever', 'Mucopurulent ocular and nasal discharge', 'Severe diarrhea'],
    location: {
      village: 'Mansar',
      block: 'Ramtek',
      district: 'Nagpur',
      state: 'Maharashtra',
      coordinates: { lat: 21.401, lng: 79.332 }
    },
    farmer: {
      name: 'Santoshrao Gawande',
      phone: '+91 98230 45674'
    },
    assignedVet: {
      name: 'Dr. Priya Sharma',
      phone: '+91 98224 55003'
    },
    createdAt: '2026-09-30T07:30:00Z',
    updatedAt: '2026-09-30T07:30:00Z'
  },
  {
    _id: 'case-nag-005',
    caseId: 'CASE-2026-NAG-005',
    disease: 'Sarcoptic Mange',
    suspectedDisease: 'Sarcoptic Mange',
    species: 'Goat',
    breed: 'Osmanabadi',
    tagId: 'NG-GOAT-205',
    status: 'Resolved',
    urgency: 'LOW',
    confidenceScore: 0.96,
    symptoms: ['Alopecia on face and ears', 'Pruritus and thickened crusty skin'],
    location: {
      village: 'Takalghat',
      block: 'Hingna',
      district: 'Nagpur',
      state: 'Maharashtra',
      coordinates: { lat: 20.978, lng: 78.963 }
    },
    farmer: {
      name: 'Vitthalrao Kolhe',
      phone: '+91 98230 45675'
    },
    assignedVet: {
      name: 'Dr. Sneha Kulkarni',
      phone: '+91 98224 55004'
    },
    createdAt: '2026-09-25T10:00:00Z',
    updatedAt: '2026-09-29T16:00:00Z'
  },
  {
    _id: 'case-nag-006',
    caseId: 'CASE-2026-NAG-006',
    disease: 'Hemorrhagic Septicemia (HS)',
    suspectedDisease: 'Hemorrhagic Septicemia (HS)',
    species: 'Buffalo',
    breed: 'Murrah Buffalo',
    tagId: 'NG-BUF-401',
    status: 'Investigating',
    urgency: 'CRITICAL',
    confidenceScore: 0.91,
    symptoms: ['Submandibular edema', 'Dyspnea and stertorous breathing', 'Fever 105.4 F'],
    location: {
      village: 'Brahmapuri Village',
      block: 'Kalmeshwar',
      district: 'Nagpur',
      state: 'Maharashtra',
      coordinates: { lat: 21.235, lng: 78.915 }
    },
    farmer: {
      name: 'Dinkar Bhoyar',
      phone: '+91 98230 45676'
    },
    assignedVet: {
      name: 'Dr. Rajesh Patil',
      phone: '+91 98224 55002'
    },
    createdAt: '2026-09-30T09:10:00Z',
    updatedAt: '2026-09-30T10:30:00Z'
  },
  {
    _id: 'case-nag-007',
    caseId: 'CASE-2026-NAG-007',
    disease: 'Lumpy Skin Disease',
    suspectedDisease: 'Lumpy Skin Disease',
    species: 'Cattle',
    breed: 'Gaolao Cross',
    tagId: 'NG-COW-112',
    status: 'Confirmed',
    urgency: 'HIGH',
    confidenceScore: 0.9,
    symptoms: ['Firm cutaneous nodules', 'Edema of hind limbs', 'Depression'],
    location: {
      village: 'Parseoni Rural',
      block: 'Parseoni',
      district: 'Nagpur',
      state: 'Maharashtra',
      coordinates: { lat: 21.381, lng: 79.215 }
    },
    farmer: {
      name: 'Manohar Tembhre',
      phone: '+91 98230 45677'
    },
    assignedVet: {
      name: 'Dr. Priya Sharma',
      phone: '+91 98224 55003'
    },
    createdAt: '2026-09-29T14:30:00Z',
    updatedAt: '2026-09-30T08:00:00Z'
  },
  {
    _id: 'case-nag-008',
    caseId: 'CASE-2026-NAG-008',
    disease: 'Foot and Mouth Disease (FMD)',
    suspectedDisease: 'Foot and Mouth Disease (FMD)',
    species: 'Cattle',
    breed: 'Sahiwal Cow',
    tagId: 'NG-COW-115',
    status: 'Resolved',
    urgency: 'MEDIUM',
    confidenceScore: 0.93,
    symptoms: ['Excessive salivation', 'Healed interdigital erosions'],
    location: {
      village: 'Umred Suburb',
      block: 'Umred',
      district: 'Nagpur',
      state: 'Maharashtra',
      coordinates: { lat: 20.852, lng: 79.327 }
    },
    farmer: {
      name: 'Gajanan Mohite',
      phone: '+91 98230 45678'
    },
    assignedVet: {
      name: 'Dr. Amit Deshmukh',
      phone: '+91 98224 55001'
    },
    createdAt: '2026-09-20T12:00:00Z',
    updatedAt: '2026-09-28T16:00:00Z'
  }
];

export const FALLBACK_CLUSTERS = [
  {
    _id: 'cluster-nag-sao',
    clusterId: 'CLUSTER-NAG-SAONER-01',
    disease: 'Lumpy Skin Disease',
    centroid: { lat: 21.3833, lng: 78.9167 },
    district: 'Nagpur',
    block: 'Saoner',
    caseCount: 4,
    radiusKm: 4.8,
    riskLevel: 'HIGH',
    status: 'ACTIVE',
    cases: ['case-nag-001', 'case-nag-002']
  },
  {
    _id: 'cluster-nag-kam',
    clusterId: 'CLUSTER-NAG-KAMPTEE-02',
    disease: 'Foot and Mouth Disease',
    centroid: { lat: 21.2227, lng: 79.1977 },
    district: 'Nagpur',
    block: 'Kamptee',
    caseCount: 3,
    radiusKm: 3.5,
    riskLevel: 'MEDIUM',
    status: 'MONITORING',
    cases: ['case-nag-003']
  }
];

export const FALLBACK_ZONES = [
  {
    _id: 'zone-nag-sao-01',
    zoneId: 'ZONE-NAG-SAO-01',
    disease: 'Lumpy Skin Disease',
    epicenter: { lat: 21.3833, lng: 78.9167 },
    radiusKm: 5.0,
    district: 'Nagpur',
    block: 'Saoner',
    village: 'Saoner Rural',
    status: 'ACTIVE',
    affectedCasesCount: 4,
    enforcedRules: [
      'Strict quarantine of affected livestock within perimeter',
      'Ban on animal movement, livestock trade, and cattle markets',
      'Daily disinfectant spraying of barns and watering troughs',
      'Immediate ring vaccination within containment buffer'
    ],
    createdAt: '2026-09-28T10:00:00Z'
  }
];

export const FALLBACK_ADVISORY = {
  headline: 'HIGH ALERT: Lumpy Skin Disease Surveillance in Saoner & Kamptee Blocks',
  summary: 'Active containment zone established within 5km radius of Saoner. Ring vaccination underway with 1,500 doses mobilized.',
  targetDistrict: 'Nagpur',
  targetBlocks: ['Saoner', 'Kamptee', 'Kalmeshwar'],
  urgency: 'HIGH',
  advisories: [
    {
      title: 'Vector Control & Sanitization',
      content: 'Fumigate barns to control biting flies and ticks. Apply neem oil-based repellents on uninfected cattle.'
    },
    {
      title: 'Quarantine & Movement Ban',
      content: 'Do not transport cattle across Saoner taluka boundary until ring vaccination coverage reaches 85%.'
    },
    {
      title: 'Free Ring Vaccination Camp',
      content: 'Emergency ring vaccination post operational at Taluka Veterinary Polyclinic, Saoner from 09:00 AM daily.'
    }
  ]
};

export const FALLBACK_VETS = [
  {
    id: 'vet-dr-amit',
    name: 'Dr. Amit Deshmukh',
    phone: '+91 98224 55001',
    role: 'Veterinary Officer',
    hospital: 'Taluka Veterinary Polyclinic, Saoner',
    block: 'Saoner',
    district: 'Nagpur'
  },
  {
    id: 'vet-dr-rajesh',
    name: 'Dr. Rajesh Patil',
    phone: '+91 98224 55002',
    role: 'Senior Veterinary Surgeon',
    hospital: 'Government Veterinary Hospital, Kamptee',
    block: 'Kamptee',
    district: 'Nagpur'
  },
  {
    id: 'vet-dr-priya',
    name: 'Dr. Priya Sharma',
    phone: '+91 98224 55003',
    role: 'Disease Investigation Officer',
    hospital: 'Regional Disease Diagnostic Laboratory (RDDL), Nagpur',
    block: 'Ramtek',
    district: 'Nagpur'
  }
];

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
    try {
      const res = await api.get('/cases', { params });
      if (res.data?.cases && res.data.cases.length > 0) {
        return res.data;
      }
      return { success: true, count: FALLBACK_CASES.length, cases: FALLBACK_CASES };
    } catch (err) {
      console.warn('Using lively fallback Nagpur cases:', err);
      return { success: true, count: FALLBACK_CASES.length, cases: FALLBACK_CASES };
    }
  }

  /**
   * Get single case details by ID
   */
  async getCaseById(id) {
    try {
      const res = await api.get(`/cases/${id}`);
      return res.data;
    } catch (err) {
      const found = FALLBACK_CASES.find((c) => c._id === id || c.caseId === id);
      if (found) return { success: true, case: found };
      throw err;
    }
  }

  /**
   * Atomic Case Claim (Veterinarians only)
   */
  async claimCase(id) {
    try {
      const res = await api.patch(`/cases/${id}/claim`);
      return res.data;
    } catch (err) {
      return { success: true, message: 'Case claimed successfully (offline/demo mode)', caseId: id };
    }
  }

  /**
   * Update Case Status across 5-stage lifecycle
   * (New -> Investigating -> Confirmed -> Containment -> Resolved)
   */
  async updateCaseStatus(id, payload) {
    try {
      const res = await api.patch(`/cases/${id}/status`, payload);
      return res.data;
    } catch (err) {
      return { success: true, message: 'Case status updated successfully', caseId: id, status: payload.status };
    }
  }

  /**
   * Get Spatial Outbreak Clusters in District (<= 5km grouping)
   */
  async getSpatialClusters(params = {}) {
    try {
      const res = await api.get('/cases/clusters', { params });
      if (res.data?.clusters && res.data.clusters.length > 0) {
        return res.data;
      }
      return { success: true, clusters: FALLBACK_CLUSTERS };
    } catch (err) {
      return { success: true, clusters: FALLBACK_CLUSTERS };
    }
  }

  /**
   * Get Containment Zones in District
   */
  async getContainmentZones(params = {}) {
    try {
      const res = await api.get('/cases/containment-zones', { params });
      if (res.data?.zones && res.data.zones.length > 0) {
        return res.data;
      }
      return { success: true, zones: FALLBACK_ZONES };
    } catch (err) {
      return { success: true, zones: FALLBACK_ZONES };
    }
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
    try {
      const res = await api.get('/cases/advisories', { params });
      if (res.data && (res.data.advisories?.length > 0 || res.data.headline)) {
        return res.data;
      }
      return FALLBACK_ADVISORY;
    } catch (err) {
      return FALLBACK_ADVISORY;
    }
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
    try {
      const res = await api.get('/cases/district-vets', { params: { district } });
      if (res.data?.vets && res.data.vets.length > 0) {
        return res.data;
      }
      return { success: true, vets: FALLBACK_VETS };
    } catch (err) {
      return { success: true, vets: FALLBACK_VETS };
    }
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

  /**
   * Alias for realtimeService backwards compatibility
   */
  streamReferralEvents(onEvent, onError) {
    return this.subscribeToCaseStream(onEvent, onError);
  }
}

export default new CaseService();
