// Veterinary Directory & Assistance Service
// SIH PS-128: Dynamic rural veterinary healthcare network powered by MongoDB & GPS Haversine distance
import api from './api';

export const veterinaryService = {
  /**
   * Fetch nearby active/available veterinarians based on GPS or district fallback
   * @param {Object} options { lat, lng, district, search, specialization, category, emergencyOnly, limit }
   */
  async getNearbyVeterinarians(options = {}) {
    try {
      const params = {};
      if (options.lat !== undefined && options.lat !== null) params.lat = options.lat;
      if (options.lng !== undefined && options.lng !== null) params.lng = options.lng;
      if (options.district && options.district !== 'All') params.district = options.district;
      if (options.search) params.search = options.search;
      if (options.specialization && options.specialization !== 'All') params.specialization = options.specialization;
      if (options.category && options.category !== 'All') params.category = options.category;
      if (options.emergencyOnly) params.emergencyOnly = true;
      if (options.limit) params.limit = options.limit;

      const response = await api.get('/veterinarians/nearby', { params });
      if (response.data && response.data.success) {
        return {
          success: true,
          nearestVets: response.data.nearestVets || [],
          veterinarians: response.data.veterinarians || [],
          meta: response.data.meta || {}
        };
      }
      return { success: false, nearestVets: [], veterinarians: [], meta: {} };
    } catch (error) {
      console.error('Failed to fetch nearby veterinarians:', error);
      return { success: false, nearestVets: [], veterinarians: [], meta: {}, error: error.message };
    }
  },

  /**
   * Backward-compatible helper for legacy components
   */
  async getNearbyCenters(filters = {}) {
    const res = await this.getNearbyVeterinarians(filters);
    return res.veterinarians || [];
  },

  /**
   * Fetch veterinarian details by ID
   */
  async getCenterById(id) {
    try {
      const response = await api.get(`/veterinarians/${id}`);
      return response.data?.data || null;
    } catch (error) {
      console.error(`Failed to fetch veterinarian ${id}:`, error);
      return null;
    }
  },

  /**
   * Fetch list of all Maharashtra districts with active veterinarian counts
   */
  async getDistricts() {
    try {
      const response = await api.get('/veterinarians/districts');
      return response.data?.districts || [];
    } catch (error) {
      console.error('Failed to fetch districts:', error);
      return [];
    }
  }
};

export default veterinaryService;
