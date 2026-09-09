// Agrometeorological Weather & Heat Stress Service for Indian Livestock
import api from './api';

export const weatherService = {
  async getLiveWeather(location = {}) {
    const district = location.district || 'Nagpur';
    const state = location.state || 'Maharashtra';
    const lat = location.lat || (location.location?.lat) || 0;
    const lng = location.lng || (location.location?.lng) || 0;

    try {
      const res = await api.get(`/weather?lat=${lat}&lng=${lng}&district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`);
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[WeatherService] Could not fetch live weather from server:', err.message);
    }

    // Direct browser fetch from Open-Meteo if backend API is unreachable
    try {
      const latitude = lat || 21.1458;
      const longitude = lng || 79.0882;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = await res.json();
        const current = json.current || {};
        const tempC = Math.round((current.temperature_2m ?? 27) * 10) / 10;
        const humidityPct = Math.round(current.relative_humidity_2m ?? 70);
        const thi = Math.round((1.8 * tempC + 32) - ((0.55 - 0.0055 * humidityPct) * (1.8 * tempC - 26)));

        return {
          temperature: tempC,
          humidity: humidityPct,
          thiScore: thi,
          heatStressLevel: thi >= 84 ? 'Severe Heat Stress' : thi >= 78 ? 'Moderate Heat Stress' : 'Mild Heat Stress',
          alertEn: `Current weather: ${tempC}°C, Humidity ${humidityPct}%. Ensure clean water and shade for livestock.`,
          alertHi: `वर्तमान मौसम: ${tempC}°C, नमी ${humidityPct}%। पशुओं के लिए स्वच्छ पानी और छाया का प्रबंध रखें।`,
          alertMr: `सध्याचे हवामान: ${tempC}°C, आर्द्रता ${humidityPct}%. जनावरांसाठी स्वच्छ पाणी आणि सावलीची सोय करा.`,
          isLive: true,
          location: `${district}, ${state}`
        };
      }
    } catch (e) {}

    // Fallback
    return {
      temperature: 26,
      humidity: 80,
      thiScore: 76,
      heatStressLevel: 'Mild Heat Stress',
      alertEn: 'Weather is favorable for livestock. Maintain continuous clean drinking water.',
      alertHi: 'मौसम अनुकूल है। स्वच्छ पीने का पानी और सामान्य दिनचर्या बनाए रखें।',
      alertMr: 'हवामान अनुकूल आहे. स्वच्छ पिण्याचे पाणी उपलब्ध ठेवा.',
      isLive: false,
      location: `${district}, ${state}`
    };
  }
};

export default weatherService;
