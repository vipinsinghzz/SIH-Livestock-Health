// ICAR-NIVEDI NADRES Frontend Service
import api from './api';

export const nadresService = {
  async getDistrictForewarning(district = 'Nagpur', state = 'Maharashtra') {
    try {
      const res = await api.get(`/nadres/forewarning?district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`);
      return res.data;
    } catch (err) {
      console.warn('[nadresService] Could not fetch NADRES forewarning:', err.message);
      return {
        success: false,
        source: 'ICAR-NIVEDI NADRES',
        highRiskDiseases: [],
        moderateRiskDiseases: []
      };
    }
  },

  async getHistoricalTrends(diseaseId = 11) {
    try {
      const res = await api.get(`/nadres/trends?diseaseId=${diseaseId}`);
      return res.data;
    } catch (err) {
      console.warn('[nadresService] Could not fetch NADRES trends:', err.message);
      return {
        success: false,
        topAffectedStates: []
      };
    }
  },

  async getVillageAlerts(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await api.get(`/nadres/alerts?${query}`);
      return res.data;
    } catch (err) {
      console.warn('[nadresService] Could not fetch village alerts:', err.message);
      return {
        success: false,
        alerts: []
      };
    }
  }
};

export default nadresService;
