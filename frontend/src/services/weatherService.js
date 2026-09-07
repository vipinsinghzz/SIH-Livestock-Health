// Agrometeorological Weather & Heat Stress Service for Indian Livestock

export const weatherService = {
  getWeatherData(location = { district: 'Sehore', state: 'Madhya Pradesh' }) {
    // Current realistic Indian weather data
    const tempC = 32.5;
    const humidityPct = 76;
    const rainfallMm = 4.2;

    // Calculate Temperature-Humidity Index (THI) for cattle/buffalo
    // THI = (1.8 * T + 32) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26))
    const thi = Math.round((1.8 * tempC + 32) - ((0.55 - 0.0055 * humidityPct) * (1.8 * tempC - 26)));

    let heatStressLevel = 'Normal';
    let alertHi = 'मौसम अनुकूल है। सामान्य दिनचर्या बनाए रखें।';
    let alertEn = 'Weather is favorable for livestock. Maintain normal routine.';

    if (thi >= 80) {
      heatStressLevel = 'Severe Heat Stress';
      alertHi = '⚠️ आज गर्मी और नमी अत्यधिक है (THI 82)। पशुओं पर दिन में 3-4 बार ठंडे पानी का छिड़काव करें और खूब स्वच्छ पानी पिलाएं।';
      alertEn = '⚠️ Extreme heat and humidity detected (THI 82). Sprinkle cool water on animals 3-4 times daily and ensure continuous drinking water.';
    } else if (thi >= 72) {
      heatStressLevel = 'Moderate Stress';
      alertHi = 'आज गर्मी और नमी अधिक है। पशुओं को पर्याप्त पानी, छायादार स्थान दें और धूप में न चरने भेजें।';
      alertEn = 'Today temperature and humidity are high. Ensure cool shade, fresh water, and avoid afternoon grazing.';
    }

    return {
      temperature: tempC,
      condition: 'Partly Cloudy',
      humidity: humidityPct,
      rainfall: rainfallMm,
      windSpeedKmH: 14,
      thiScore: thi,
      heatStressLevel,
      alertHi,
      alertEn,
      location: `${location.district || 'Sehore'}, ${location.state || 'Madhya Pradesh'}`
    };
  }
};

export default weatherService;
