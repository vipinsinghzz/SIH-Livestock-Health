// Google Gemini LLM Service for Livestock Agrometeorological AI Recommendations
// Synthesizes live NADRES disease risks, local microclimate/weather, and bovine THI into trilingual recommendations

const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];

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
    location = 'Nagpur, Maharashtra',
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

    // Cache key incorporates microclimate conditions and specific location
    const cleanLocKey = (location || '').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 35);
    const cacheKey = `gemini_${(diseaseName || '').toLowerCase()}_${riskLevel}_${cleanLocKey}_${Math.round(tempC)}_${Math.round(humidityPct / 10)}_${Math.round(thi)}`;
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
1. ADDRESS ONLY THE SPECIFIED LOCATION: "${location}". NEVER invent or mention any other town, taluka, or district (e.g. do not mention Baramati if location is Khed or Nagpur).
2. If high humidity or rain (>60% humidity or precipitation): emphasize vector (mosquito/fly) breeding control, mud-rot foot hygiene, or fungal/bacterial spread.
3. If high heat/THI (>78 THI): emphasize shaded shed ventilation, hydration, and avoiding vaccination stress during peak daylight heat.
4. Keep each recommendation to 1-2 powerful, actionable sentences specifically for the farmer.
5. Output STRICT JSON only with 3 keys:
{
  "recommendationEn": "English advisory",
  "recommendationHi": "Hindi advisory in Devanagari script",
  "recommendationMr": "Marathi advisory in Devanagari script"
}
`;

    const apiKey = this.getApiKey();

    for (const model of GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[GeminiService] Model ${model} returned status ${response.status}:`, errorText.substring(0, 150));
          continue; // Try next model
        }

        const json = await response.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        let parsed = null;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(clean);
        }

        if (parsed && parsed.recommendationEn) {
          const result = {
            recommendationEn: parsed.recommendationEn.trim(),
            recommendationHi: parsed.recommendationHi ? parsed.recommendationHi.trim() : null,
            recommendationMr: parsed.recommendationMr ? parsed.recommendationMr.trim() : null,
            model,
            isAIPowered: true,
            generatedAt: new Date().toISOString()
          };

          geminiCache.set(cacheKey, { timestamp: Date.now(), data: result });
          return result;
        }
      } catch (err) {
        console.warn(`[GeminiService] Model ${model} execution failed:`, err.message);
      }
    }

    return null; // Graceful fallback to clinical rule engine
  }

  /**
   * Generates intelligent, personalized livestock consultation for Kisan Saathi AI (PS-128)
   * Uses intent detection to scope context dynamically and prevent medical bleeding into unrelated questions.
   */
  async generatePersonalizedConsultation({
    query,
    language = 'hi',
    animal = null,
    diagnosis = null,
    symptoms = [],
    districtAlerts = [],
    district = 'Nagpur',
    state = 'Maharashtra',
    weather = null,
    farmerName = 'किसान मित्र',
    conversationHistory = []
  }) {
    if (!this.isConfigured()) {
      return null;
    }

    const { detectIntent, INTENTS } = require('./intentService');

    // 1. Detect Intent and determine context scoping
    const intentResult = detectIntent(query, { animal, diagnosis, symptoms, conversationHistory });
    const {
      intent,
      shouldIncludeDiagnosis,
      shouldIncludeAnimal,
      shouldIncludeAlerts,
      shouldIncludeHelpline
    } = intentResult;

    const langKey = (language || 'hi').split('-')[0].toLowerCase();
    const langMap = {
      hi: 'Hindi (हिंदी)',
      mr: 'Marathi (मराठी)',
      en: 'English',
      gu: 'Gujarati (ગુજરાતી)',
      pa: 'Punjabi (ਪੰਜਾਬੀ)',
      bn: 'Bengali (বাংলা)',
      ta: 'Tamil (தமிழ்)',
      te: 'Telugu (తెలుగు)',
      kn: 'Kannada (ಕನ್ನಡ)',
      ml: 'Malayalam (മലയാളം)',
      or: 'Odia (ଓଡ଼ିଆ)'
    };
    const languageName = langMap[langKey] || 'Hindi (हिंदी)';

    // 2. Build selectively scoped context sections based strictly on intent
    const contextSections = [];

    // Animal Profile: ONLY if relevant
    if (shouldIncludeAnimal && animal) {
      contextSections.push(`PATIENT PROFILE:
- Name: ${animal.name || 'Animal'}
- Species: ${animal.species || 'Cattle'}
- Breed: ${animal.breed || 'Unknown'}
- Age: ${animal.age ? `${animal.age} years old` : 'Unknown'}
- Health Status: ${animal.healthStatus || 'Healthy'}
- Milk Yield: ${animal.milkYieldDaily || 'N/A'}`);
    }

    // AI Medical Diagnosis: ONLY if relevant to the question
    if (shouldIncludeDiagnosis && diagnosis && (diagnosis.possibleCondition || diagnosis.predictedDisease)) {
      contextSections.push(`ACTIVE CLINICAL DIAGNOSIS:
- Condition: ${diagnosis.possibleCondition || diagnosis.predictedDisease}
- Confidence: ${diagnosis.confidenceScore || diagnosis.confidence || 85}%
- Risk Level: ${diagnosis.riskLevel || 'Moderate'}
- Findings: ${diagnosis.explanation || diagnosis.description || 'Clinical observation'}`);
    }

    // Active Symptoms: ONLY if relevant
    if (shouldIncludeDiagnosis && Array.isArray(symptoms) && symptoms.length > 0) {
      contextSections.push(`SYMPTOMS: ${symptoms.join(', ')}`);
    }

    // Outbreak Alerts: ONLY if relevant
    if (shouldIncludeAlerts && Array.isArray(districtAlerts) && districtAlerts.length > 0) {
      contextSections.push(`DISTRICT EPIDEMIOLOGICAL ALERTS (${district} District):
${districtAlerts.map(a => `- Active ${a.diseaseName} (${a.riskLevel} Risk)`).join('\n')}`);
    }

    // Recent Conversation turns (to prevent repeating what was just said)
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recentTurns = conversationHistory
        .slice(-4)
        .map(m => {
          const role = m.sender === 'farmer' || m.sender === 'user' ? 'Farmer' : 'Saathi';
          const snippet = (m.text || '').replace(/\n+/g, ' ').slice(0, 120);
          return `${role}: "${snippet}"`;
        })
        .join('\n');
      if (recentTurns) {
        contextSections.push(`RECENT CONVERSATION TURNS:\n${recentTurns}`);
      }
    }

    // 3. Build Intent-Specific Directives
    let intentDirective = '';
    switch (intent) {
      case INTENTS.JOKE_OR_HUMOR:
        intentDirective = `INTENT: JOKE / HUMOR / ENTERTAINMENT
- Tell a short, cheerful, clean, culturally relatable rural/farmer joke or riddle in ${languageName} (under 40 words).
- ABSOLUTELY FORBIDDEN: Do NOT mention any disease, animal patient, diagnosis, quarantine, medical treatment, or emergency numbers like 1962.`;
        break;

      case INTENTS.GREETING_SIMPLE:
        intentDirective = `INTENT: SIMPLE CASUAL GREETING
- Give a warm, polite 1-2 sentence greeting in ${languageName} and ask how you can help with their livestock today.
- DO NOT mention any medical diagnosis, disease, outbreak, or helpline.`;
        break;

      case INTENTS.GENERAL_HUSBANDRY:
        intentDirective = `INTENT: GENERAL ANIMAL HUSBANDRY (Milk, Nutrition, Feed, or Breeding)
- Provide 3-5 concise, practical, high-value bullet points or tips answering the farmer's question in ${languageName}.
- DO NOT mention previous diseases, quarantine, or emergency numbers. Answer purely about nutrition, lactation, feed, or breeding.`;
        break;

      case INTENTS.VACCINATION_INQUIRY:
        intentDirective = `INTENT: VACCINATION GUIDANCE
- Provide a crisp vaccination schedule (FMD, HS, BQ, Brucellosis) with ideal age and season in ${languageName}.
- Mention that vaccination is available at local government veterinary camps. DO NOT treat this as a disease emergency.`;
        break;

      case INTENTS.GOVERNMENT_SCHEME:
        intentDirective = `INTENT: GOVERNMENT SCHEME & SUBSIDIES
- Explain the relevant scheme (KCC, dairy subsidy, insurance) in 3-4 simple bullet points in ${languageName} (eligibility, benefits, how to apply at bank/block).`;
        break;

      case INTENTS.DISEASE_FOLLOWUP:
        intentDirective = `INTENT: MEDICAL FOLLOW-UP
- The farmer is asking a specific follow-up about the previously diagnosed condition (${diagnosis?.possibleCondition || diagnosis?.predictedDisease || 'the condition'}).
- Answer their direct question concisely in ${languageName}. Give practical home management, wound care, or care instructions.
- DO NOT restart from scratch or repeat introductory boilerplate. Get straight to the answer.`;
        break;

      case INTENTS.NEW_SYMPTOM_OR_DISEASE:
        intentDirective = `INTENT: CLINICAL SYMPTOM EVALUATION
- Address the reported symptoms concisely in ${languageName}.
- Give 2-3 safe domestic first-aid steps, tell the farmer what to observe, and advise consulting a veterinarian or calling 1962 if symptoms worsen.`;
        break;

      case INTENTS.EMERGENCY:
        intentDirective = `INTENT: EMERGENCY SOS
- Provide urgent, life-saving first-aid steps in ${languageName} and emphasize contacting veterinary helpline 1962 immediately.`;
        break;

      default:
        intentDirective = `INTENT: GENERAL LIVESTOCK QUERY
- Answer the user's specific query clearly, concisely, and helpfully in ${languageName} (2-3 short paragraphs or 3-4 bullet points).
- Do not dump unrelated medical context.`;
    }

    // 4. Construct Prompt
    const prompt = `
You are Kisan Saathi AI (किसान साथी), an expert livestock assistant for farmers in India.
Farmer: ${farmerName} in ${district} District, ${state}.

${contextSections.length > 0 ? contextSections.join('\n\n') + '\n\n' : ''}USER'S CURRENT QUERY:
"${query}"

${intentDirective}

UNIVERSAL QUALITY & ANTI-REPETITION RULES:
1. Target Language: Respond ONLY in ${languageName} using natural rural phrasing in the correct native script.
2. Anti-Repetition: DO NOT start every response with formulaic greetings like "नमस्ते किसान भाई... आपकी स्थिति चिंताजनक है...". If this is an ongoing conversation, be direct and conversational.
3. Conciseness: Keep responses short and focused (around 50-130 words, or 3-5 bullet points). NEVER dump all medical recommendations into unrelated questions.
4. Scope Discipline: Give ONLY information relevant to the user's current question.
5. Return STRICT JSON:
{
  "reply": "Your response in ${languageName}",
  "riskLevel": "${shouldIncludeHelpline ? 'Moderate' : 'Low'}",
  "keyAdvice": ["Key takeaway 1", "Key takeaway 2"]
}
`;

    const apiKey = this.getApiKey();

    for (const model of GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: intent === INTENTS.JOKE_OR_HUMOR ? 0.7 : 0.3,
              maxOutputTokens: 600,
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          const err = await response.text();
          console.warn(`[GeminiService] Consultation model ${model} status ${response.status}:`, err.substring(0, 120));
          continue;
        }

        const json = await response.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        let parsed = null;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(clean);
        }

        if (parsed && parsed.reply) {
          return {
            success: true,
            reply: parsed.reply.trim(),
            riskLevel: parsed.riskLevel || (shouldIncludeHelpline ? 'Moderate' : 'Low'),
            keyAdvice: parsed.keyAdvice || [],
            intent,
            model,
            isAIPowered: true,
            timestamp: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn(`[GeminiService] Consultation model ${model} error:`, err.message);
      }
    }

    return null;
  }
}

module.exports = new GeminiService();
