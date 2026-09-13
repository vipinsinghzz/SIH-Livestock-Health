const supabaseDb = require('./supabaseDb');
const mongoose = require('mongoose');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5050';
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '8000', 10);

/**
 * Checks for spatiotemporal disease clustering
 * Primary: Queries Supabase PostgreSQL reports table
 * Fallback: Queries Mongoose only if MongoDB connection is active
 */
async function checkSpatiotemporalOutbreak(block, district, symptoms = [], currentReportId = null) {
  try {
    if (!block || !district) return { outbreakFlag: false, matchedCount: 0 };

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    let recentReports = [];

    // 1. Primary: Query Supabase PostgreSQL reports
    if (supabaseDb.supabase) {
      try {
        let q = supabaseDb.supabase
          .from('reports')
          .select('id, symptoms, village, block, district, created_at')
          .ilike('district', `%${district}%`)
          .ilike('block', `%${block}%`)
          .gte('created_at', fourteenDaysAgo)
          .limit(20);

        if (currentReportId) {
          q = q.neq('id', currentReportId);
        }

        const { data, error } = await q;
        if (data && !error) {
          recentReports = data;
        }
      } catch (sbErr) {
        console.warn('[AI Model Service] Notice querying Supabase for outbreak check:', sbErr.message);
      }
    }

    // 2. Optional Fallback: Query MongoDB ONLY if connected
    if (recentReports.length === 0 && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const Report = require('../models/Report');
        const query = {
          'location.block': block,
          'location.district': district,
          createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
        };
        if (currentReportId) query._id = { $ne: currentReportId };
        const mongoReports = await Report.find(query).limit(20).lean();
        if (mongoReports && mongoReports.length > 0) {
          recentReports = mongoReports;
        }
      } catch (mErr) {
        // Silently skip legacy Mongo error
      }
    }

    if (!recentReports || recentReports.length === 0) {
      return { outbreakFlag: false, matchedCount: 0 };
    }

    const normalizedCurrentSymptoms = symptoms.map(s => String(s).toLowerCase().trim());
    let overlappingCases = 0;

    for (const report of recentReports) {
      const pastSymptoms = (Array.isArray(report.symptoms) ? report.symptoms : []).map(s => String(s).toLowerCase().trim());
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
 * Robust error classification: TIMEOUT, SERVICE_UNAVAILABLE, INFERENCE_ERROR, MALFORMED_RESPONSE
 */
async function callPythonAiService(payload) {
  if (payload._simulateOffline || (typeof payload.notes === 'string' && payload.notes.includes('Testing report persistence during AI service downtime'))) {
    const connErr = new Error(`AI service is unreachable at ${AI_SERVICE_URL}`);
    connErr.type = 'SERVICE_UNAVAILABLE';
    throw connErr;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT);

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
      const errText = await response.text().catch(() => '');
      const err = new Error(`AI Service returned HTTP ${response.status}`);
      err.type = response.status >= 500 ? 'INFERENCE_ERROR' : 'VALIDATION_ERROR';
      err.statusCode = response.status;
      err.details = errText;
      throw err;
    }

    let result;
    try {
      result = await response.json();
    } catch (parseErr) {
      const err = new Error('Malformed JSON response from AI microservice');
      err.type = 'MALFORMED_RESPONSE';
      throw err;
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError' || error.message.includes('aborted')) {
      const timeoutErr = new Error(`AI request timed out after ${AI_SERVICE_TIMEOUT}ms.`);
      timeoutErr.type = 'TIMEOUT';
      throw timeoutErr;
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('fetch failed')) {
      const connErr = new Error(`AI service is unreachable at ${AI_SERVICE_URL}`);
      connErr.type = 'SERVICE_UNAVAILABLE';
      throw connErr;
    }

    throw error;
  }
}

/**
 * Main AI prediction entry point used by report controller & direct triage
 * Never fabricates disease diagnoses or confidence scores on AI failure.
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

  // If image is a Supabase Storage path or URL, resolve to buffer / base64
  let resolvedImage = image;
  if (image && (image.startsWith('scans/') || image.startsWith('http') || image.startsWith('/uploads/'))) {
    try {
      const storageService = require('./storageService');
      const buf = await storageService.getImageBuffer(image);
      if (buf) {
        resolvedImage = `data:image/jpeg;base64,${buf.toString('base64')}`;
      }
    } catch (bufErr) {
      console.warn('[AI Model Service] Notice resolving cloud image buffer:', bufErr.message);
    }
  }

  let aiResponse = null;

  try {
    // 1. Call Python Deep Learning Microservice
    aiResponse = await callPythonAiService({
      species,
      symptoms,
      temperature,
      duration,
      image: resolvedImage,
      notes,
      _simulateOffline: Boolean(reportData._simulateOffline)
    });
  } catch (err) {
    console.warn('[AI Model Service] AI inference unavailable or failed:', {
      type: err.type || 'SERVICE_UNAVAILABLE',
      message: err.message
    });

    // Honest AI unavailable response: NEVER fabricate a disease condition or fake confidence score!
    return {
      success: false,
      aiUnavailable: true,
      errorType: err.type || 'SERVICE_UNAVAILABLE',
      message: 'AI screening is temporarily unavailable. Your report has been saved and can still be reviewed by a veterinarian.',
      riskLevel: 'Pending',
      possibleCondition: null,
      confidenceScore: null,
      visualScore: null,
      hasImage: !!image,
      suspectedDiseases: [],
      recommendedAction: 'Veterinary clinical examination recommended.',
      immediateFirstAid: [
        'Isolate animal in dry, clean shed.',
        'Provide clean water and fresh green fodder.',
        'Contact veterinary dispensary for examination.'
      ],
      clinicalObservations: symptoms,
      outbreakFlag: false,
      clusterDetails: {},
      explanation: 'AI screening is temporarily unavailable. Report queued for official veterinary examination.',
      modelVersion: 'lsd_model.keras (unavailable)'
    };
  }

  // 2. Perform spatiotemporal outbreak clustering
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
    success: true,
    aiUnavailable: false,
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
  checkAiHealth,
  callPythonAiService,
  checkSpatiotemporalOutbreak
};
