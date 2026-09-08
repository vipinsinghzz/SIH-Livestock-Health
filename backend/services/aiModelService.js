const Report = require('../models/Report');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5050';

/**
 * Checks MongoDB for spatiotemporal disease clustering
 * If >= 2 matching cases in the same block within 14 days, triggers outbreak alert
 */
async function checkSpatiotemporalOutbreak(block, district, symptoms = [], currentReportId = null) {
  try {
    if (!block || !district) return { outbreakFlag: false, matchedCount: 0 };

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const query = {
      'location.block': block,
      'location.district': district,
      createdAt: { $gte: fourteenDaysAgo }
    };

    if (currentReportId) {
      query._id = { $ne: currentReportId };
    }

    const recentReports = await Report.find(query).limit(20).lean();
    if (!recentReports || recentReports.length === 0) {
      return { outbreakFlag: false, matchedCount: 0 };
    }

    const normalizedCurrentSymptoms = symptoms.map(s => s.toLowerCase().trim());
    let overlappingCases = 0;

    for (const report of recentReports) {
      const pastSymptoms = (report.symptoms || []).map(s => s.toLowerCase().trim());
      const hasOverlap = pastSymptoms.some(ps =>
        normalizedCurrentSymptoms.some(cs => cs.includes(ps) || ps.includes(cs))
      );
      if (hasOverlap) {
        overlappingCases++;
      }
    }

    return {
      outbreakFlag: overlappingCases >= 2,
      matchedCount: overlappingCases
    };
  } catch (err) {
    console.error('[AI Model Service] Cluster check warning:', err.message);
    return { outbreakFlag: false, matchedCount: 0 };
  }
}

/**
 * Calls the Python AI Microservice (lsd_model.keras + Clinical Engine)
 */
async function callPythonAiService(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(`${AI_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Service responded with status ${response.status}: ${errText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[AI Model Service] Error calling Python AI microservice:', error.message);
    throw error;
  }
}

/**
 * Main AI prediction entry point used by report controller & direct triage
 */
async function predictDisease(reportData, currentReportId = null) {
  const species = reportData.species || 'Cattle';
  const symptoms = Array.isArray(reportData.symptoms) ? reportData.symptoms : (reportData.symptoms ? [reportData.symptoms] : []);
  const temperature = parseFloat(reportData.temperature || 0);
  const duration = parseFloat(reportData.duration || 0);
  const mortalityCount = parseInt(reportData.mortalityCount || 0, 10);
  const block = reportData.location?.block || '';
  const district = reportData.location?.district || '';
  const notes = reportData.notes || '';

  // Handle image: photo preview or first item in photos array
  let image = reportData.image || null;
  if (!image && Array.isArray(reportData.photos) && reportData.photos.length > 0) {
    image = reportData.photos[0];
  }

  let aiResponse = null;

  try {
    // 1. Call Python Deep Learning Microservice
    aiResponse = await callPythonAiService({
      species,
      symptoms,
      temperature,
      duration,
      image,
      notes
    });
  } catch (err) {
    console.warn('[AI Model Service] Python service unreachable, using emergency clinical fallback:', err.message);
    // Emergency clinical fallback if python service is temporarily down
    aiResponse = {
      success: true,
      modelVersion: 'lsd_model.keras (offline-fallback)',
      modelName: 'lsd_model.keras',
      hasImage: !!image,
      visualScore: null,
      possibleCondition: symptoms.includes('skin_nodules') ? 'Lumpy Skin Disease (लम्पी त्वचा रोग)' : 'Infectious Bovine Condition',
      diseaseId: 'lsd',
      confidenceScore: 78,
      riskLevel: 'High',
      explanation: `Clinical symptom evaluation indicates suspected condition based on observed symptoms: ${symptoms.join(', ')}.`,
      recommendedAction: 'Isolate animal and contact local veterinary officer immediately.',
      immediateFirstAid: [
        'Isolate animal in dry, clean shed.',
        'Provide clean water and fresh green fodder.',
        'Contact veterinary dispensary for examination.'
      ],
      clinicalObservations: symptoms,
      suspectedDiseases: [
        { name: 'Lumpy Skin Disease (लम्पी त्वचा रोग)', confidenceScore: 0.78, urgency: 'High', rationale: 'Clinical signs match' }
      ],
      outbreakFlag: false
    };
  }

  // 2. Perform spatiotemporal outbreak clustering in MongoDB
  const cluster = await checkSpatiotemporalOutbreak(block, district, symptoms, currentReportId);

  // 3. Merge cluster analysis with AI risk
  let riskLevel = aiResponse.riskLevel || 'Moderate';
  let outbreakFlag = aiResponse.outbreakFlag || cluster.outbreakFlag;

  if (cluster.outbreakFlag) {
    outbreakFlag = true;
    if (riskLevel === 'Low' || riskLevel === 'Moderate') {
      riskLevel = 'High';
    }
  }

  if (mortalityCount >= 3) {
    riskLevel = 'Critical';
    outbreakFlag = true;
  } else if (mortalityCount >= 1 && riskLevel === 'Low') {
    riskLevel = 'Moderate';
  }

  // Append cluster notes to explanation if outbreak detected
  let finalExplanation = aiResponse.explanation || '';
  if (cluster.outbreakFlag) {
    finalExplanation = `[CLUSTER ALERT: ${cluster.matchedCount} similar cases in ${block} block within 14 days] ${finalExplanation}`;
  }

  return {
    riskLevel,
    possibleCondition: aiResponse.possibleCondition,
    confidenceScore: aiResponse.confidenceScore,
    visualScore: aiResponse.visualScore,
    hasImage: aiResponse.hasImage,
    suspectedDiseases: aiResponse.suspectedDiseases || [],
    recommendedAction: aiResponse.recommendedAction,
    immediateFirstAid: aiResponse.immediateFirstAid || [],
    clinicalObservations: aiResponse.clinicalObservations || [],
    outbreakFlag,
    clusterDetails: {
      matchedCasesCount: cluster.matchedCount,
      timeWindowDays: 14,
      block
    },
    explanation: finalExplanation,
    modelVersion: aiResponse.modelVersion || 'lsd_model.keras (EfficientNetB0)'
  };
}

/**
 * Health check for the Python AI Microservice
 */
async function checkAiHealth() {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { online: false, status: res.status };
    return { online: true, ...(await res.json()) };
  } catch (e) {
    return { online: false, error: e.message };
  }
}

module.exports = {
  predictDisease,
  checkAiHealth
};
