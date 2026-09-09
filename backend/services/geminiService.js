// Google Gemini LLM Service for Livestock Agrometeorological AI Recommendations
// Synthesizes live NADRES disease risks, local microclimate/weather, and bovine THI into trilingual recommendations

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// In-memory cache with 30-minute TTL to preserve API quota
const geminiCache = new Map();

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  getApiKey() {
    return process.env.GEMINI_API_KEY || this.apiKey || '';
  }

  isConfigured() {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 10 && !key.includes('your_gemini_api_key'));
  }

  /**
   * Generates trilingual clinical disease recommendations taking local weather and heat stress into account.
   */
  async generateClinicalRecommendation({
    diseaseName,
    riskLevel,
    location = 'Baramati, Pune',
    weather = null,
    herdContext = 'Cattle, Buffalo, Goats'
  }) {
    if (!this.isConfigured()) {
      return null; // Signals fallback to verified veterinary clinical rule engine
    }

    const tempC = weather?.tempC ?? 28;
    const humidityPct = weather?.humidityPct ?? 65;
    const thi = weather?.thi ?? 75;
    const stressLevel = weather?.stressLevel ?? 'Normal';
    const condition = weather?.condition ?? 'Mainly clear';
    const precipitationMm = weather?.precipitationMm ?? 0;

    // Cache key incorporates microclimate conditions
    const cacheKey = `gemini_${(diseaseName || '').toLowerCase()}_${riskLevel}_${Math.round(tempC)}_${Math.round(humidityPct / 10)}_${Math.round(thi)}`;
    const cached = geminiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      return cached.data;
    }

    const prompt = `
You are a senior veterinary epidemiologist & livestock agrometeorology specialist in India.
Synthesize a concise, highly practical clinical advisory for rural farmers facing a nearby livestock disease alert.

INPUT CONTEXT:
- Disease: ${diseaseName}
- Risk Level: ${riskLevel.toUpperCase()}
- Location: ${location}
- Livestock: ${herdContext}
- Microclimate / Weather:
  * Temperature: ${tempC}°C
  * Relative Humidity: ${humidityPct}%
  * Precipitation / Rain: ${precipitationMm} mm (${condition})
  * Bovine Temperature-Humidity Index (THI): ${thi} (${stressLevel} Heat Stress)

CLINICAL & AGROMETEOROLOGICAL GUIDELINES:
1. If high humidity or rain (>60% humidity or precipitation): emphasize vector (mosquito/fly) breeding control, mud-rot foot hygiene, or fungal/bacterial spread.
2. If high heat/THI (>78 THI): emphasize shaded shed ventilation, hydration, and avoiding vaccination stress during peak daylight heat.
3. Keep each recommendation to 1-2 powerful, actionable sentences specifically for the farmer.
4. Output STRICT JSON only with 3 keys:
{
  "recommendationEn": "English advisory",
  "recommendationHi": "Hindi advisory in Devanagari script",
  "recommendationMr": "Marathi advisory in Devanagari script"
}
`;

    try {
      const apiKey = this.getApiKey();
      const endpoint = `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600,
            responseMimeType: 'application/json'
          }
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[GeminiService] API returned ${response.status}:`, errorText.substring(0, 200));
        return null;
      }

      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return null;

      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Remove markdown code fences if model enclosed JSON in ```json ... ```
        const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(clean);
      }

      if (parsed && parsed.recommendationEn) {
        const result = {
          recommendationEn: parsed.recommendationEn.trim(),
          recommendationHi: parsed.recommendationHi ? parsed.recommendationHi.trim() : null,
          recommendationMr: parsed.recommendationMr ? parsed.recommendationMr.trim() : null,
          model: 'gemini-1.5-flash',
          isAIPowered: true,
          generatedAt: new Date().toISOString()
        };

        geminiCache.set(cacheKey, { timestamp: Date.now(), data: result });
        return result;
      }

      return null;
    } catch (err) {
      console.warn('[GeminiService] Execution failed or timed out:', err.message);
      return null; // Graceful fallback
    }
  }
}

module.exports = new GeminiService();
