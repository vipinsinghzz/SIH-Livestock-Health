/**
 * =========================================================================================
 * PASHURAKSHAK AI TRIAGE & EPIDEMIOLOGICAL RISK SIMULATOR
 * File: backend/services/aiSimulator.js
 * =========================================================================================
 * NOTE / ARCHITECTURE CONTRACT:
 * This module is a high-fidelity MOCK AI SERVICE simulating veterinary triage, confidence
 * scoring, and spatiotemporal outbreak detection.
 * 
 * SWAPPING IN A REAL AI MODEL:
 * When a real ML/DL disease-prediction model (e.g., FastText/BioBERT, XGBoost, or an external
 * microservice endpoint) is deployed, replace the implementation of `runTriage(reportData)`
 * in this file (or point to `aiInferenceClient.js`).
 * 
 * CONTRACT:
 * Input:
 *   reportData: {
 *     species: string,
 *     symptoms: string[],
 *     mortalityCount: number,
 *     affectedCount?: number,
 *     location: { lat: number, lng: number, village: string, block: string, district: string },
 *     notes?: string
 *   }
 * 
 * Output: Promise<{
 *   riskLevel: "Low" | "Moderate" | "High" | "Critical",
 *   suspectedDiseases: Array<{ name: string, confidenceScore: number, urgency: string }>,
 *   recommendedAction: string,
 *   outbreakFlag: boolean,
 *   clusterDetails: { matchedCasesCount: number, timeWindowDays: number, block: string },
 *   explanation: string,
 *   modelVersion: "mock-v0.1"
 * }>
 * =========================================================================================
 */

const Report = require('../models/Report');

// Static clinical symptom dictionary for major livestock diseases in India
const DISEASE_KNOWLEDGE_BASE = [
  {
    name: 'Foot and Mouth Disease (FMD)',
    species: ['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig'],
    keywords: [
      'blister', 'blisters', 'mouth blister', 'hoof blister', 'drooling', 'excessive salivation',
      'salivation', 'lameness', 'limping', 'high fever', 'fever', 'loss of appetite', 'anorexia',
      'mouth sores', 'ulcers in mouth', 'lesions on tongue'
    ],
    baseAction: 'Isolate affected animals immediately. Disinfect sheds with 4% washing soda. Restrict movement of animals and notify Block Veterinary Officer within 12 hours.',
    baseSeverity: 'High'
  },
  {
    name: 'Lumpy Skin Disease (LSD)',
    species: ['Cattle', 'Buffalo'],
    keywords: [
      'lumps', 'nodules', 'skin nodules', 'skin lumps', 'swollen lymph nodes', 'fever',
      'high fever', 'watery eyes', 'nasal discharge', 'edema', 'swollen legs', 'drop in milk yield'
    ],
    baseAction: 'Isolate infected cattle, apply fly/mosquito repellents, disinfect lesions with antiseptic spray. Notify para-vet for ring vaccination around 5km radius.',
    baseSeverity: 'High'
  },
  {
    name: 'Haemorrhagic Septicaemia (HS)',
    species: ['Cattle', 'Buffalo'],
    keywords: [
      'throat swelling', 'swollen throat', 'submandibular edema', 'difficulty breathing',
      'grunting', 'respiratory distress', 'sudden death', 'high fever', 'severe depression',
      'salivation', 'rapid breathing'
    ],
    baseAction: 'URGENT: HS is acutely fatal. Administer emergency broad-spectrum antibiotics (oxytetracycline/sulfonamides) under veterinary supervision immediately.',
    baseSeverity: 'Critical'
  },
  {
    name: 'Anthrax',
    species: ['Cattle', 'Buffalo', 'Goat', 'Sheep'],
    keywords: [
      'sudden death', 'unexplained death', 'dark blood', 'unclotted blood', 'bleeding from nose',
      'bleeding from mouth', 'bleeding from rectum', 'bloat', 'rigor mortis absent', 'trembling',
      'staggering'
    ],
    baseAction: 'DO NOT OPEN CARCASS. Anthrax spore hazard. Cordon off area, notify District Disease Control room, arrange deep burial with quicklime (>2 meters deep).',
    baseSeverity: 'Critical'
  },
  {
    name: 'Peste des Petits Ruminants (PPR)',
    species: ['Goat', 'Sheep'],
    keywords: [
      'high fever', 'mouth sores', 'nasal discharge', 'foul diarrhea', 'diarrhea', 'pneumonia',
      'crusted lips', 'conjunctivitis', 'dehydration', 'coughing'
    ],
    baseAction: 'Isolate sick small ruminants. Provide rehydration therapy and supportive antibiotics. Initiate emergency PPR ring vaccination in village.',
    baseSeverity: 'High'
  },
  {
    name: 'Blackleg (BQ)',
    species: ['Cattle', 'Buffalo', 'Sheep'],
    keywords: [
      'acute lameness', 'hot painful swelling', 'swelling in thigh', 'shoulder swelling',
      'crackling sound', 'crepitus', 'high fever', 'rapid death', 'darkened muscle'
    ],
    baseAction: 'Quarantine affected herd. Administer high-dose penicillin immediately if caught early. Vaccinate healthy in-contact cattle.',
    baseSeverity: 'High'
  },
  {
    name: 'Rabies',
    species: ['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Other'],
    keywords: [
      'aggression', 'bellowing', 'inability to swallow', 'choking', 'salivation', 'paralysis',
      'restlessness', 'biting', 'hyperexcitability', 'dog bite history'
    ],
    baseAction: 'STRICT DANGER: Suspected Rabies. Do not put hands in mouth of animal. Restrict contact, notify veterinary team immediately for rabies protocol.',
    baseSeverity: 'Critical'
  },
  {
    name: 'Avian Influenza',
    species: ['Poultry'],
    keywords: [
      'sudden death in birds', 'flock mortality', 'purple wattle', 'cyanotic comb', 'respiratory distress',
      'coughing', 'drop in egg production', 'swelling of head', 'watery diarrhea'
    ],
    baseAction: 'ALERT: Potential Avian Influenza. Stop movement of birds and poultry products. Contact District Animal Husbandry department for biosecurity and culling protocols.',
    baseSeverity: 'Critical'
  },
  {
    name: 'Brucellosis',
    species: ['Cattle', 'Buffalo', 'Goat', 'Sheep'],
    keywords: [
      'abortion in late pregnancy', 'retained placenta', 'stillbirth', 'infertility', 'orchitis', 'swollen joints'
    ],
    baseAction: 'Collect placenta/serum sample with gloves (Zoonotic risk to humans). Avoid raw milk consumption. Isolate aborted dam.',
    baseSeverity: 'Moderate'
  },
  {
    name: 'Bovine Mastitis',
    species: ['Cattle', 'Buffalo'],
    keywords: [
      'swollen udder', 'hard udder', 'painful udder', 'clots in milk', 'blood in milk',
      'yellow watery milk', 'reduced milk', 'fever'
    ],
    baseAction: 'Perform California Mastitis Test (CMT). Discard contaminated milk. Apply cold/warm compresses and consult vet for intramammary infusion.',
    baseSeverity: 'Moderate'
  }
];

/**
 * Normalizes text and matches against keyword dictionaries
 */
function calculateDiseaseConfidence(reportedSymptoms, reportedSpecies, disease) {
  // Check species compatibility
  const speciesMatch = !disease.species || disease.species.includes(reportedSpecies) || disease.species.includes('Other');
  if (!speciesMatch) {
    return 0;
  }

  const normalizedInput = reportedSymptoms.map(s => s.toLowerCase().trim()).join(' ');
  let matches = 0;
  let totalKeywords = disease.keywords.length;

  for (const keyword of disease.keywords) {
    if (normalizedInput.includes(keyword.toLowerCase())) {
      matches += 1;
    }
  }

  if (matches === 0) return 0;

  // Confidence formula: base match ratio + non-linear weight for multiple matching symptoms
  let score = (matches / Math.min(totalKeywords, 5)) * 0.75 + (matches > 2 ? 0.15 : 0.05);

  // Add controlled randomness (jitter of +/- 5-8%) to simulate real ML variance
  const jitter = (Math.random() * 0.14) - 0.07;
  score = Math.min(0.97, Math.max(0.20, score + jitter));

  return parseFloat(score.toFixed(2));
}

/**
 * Checks MongoDB for spatiotemporal disease clustering
 * If >= 2 matching cases in the same block within 14 days, triggers outbreak alert
 */
async function checkSpatiotemporalOutbreak(block, district, symptoms, currentReportId = null) {
  try {
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

    // Count recent reports with at least one overlapping symptom
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

    // Flag outbreak if >= 2 recent matching cases found
    const outbreakFlag = overlappingCases >= 2;
    return {
      outbreakFlag,
      matchedCount: overlappingCases
    };
  } catch (err) {
    console.error('[AI Simulator] Cluster check warning:', err.message);
    return { outbreakFlag: false, matchedCount: 0 };
  }
}

/**
 * Main AI Triage Inference Simulator
 * mimics 800ms - 1800ms neural inference latency
 */
async function runTriage(reportData, currentReportId = null) {
  console.log(`[AI Simulator - mock-v0.1] Initiating simulated triage for ${reportData.species} in Block: ${reportData.location?.block}...`);

  // Artificial inference delay between 800ms and 1800ms
  const simulatedDelay = Math.floor(Math.random() * 1000) + 800;
  await new Promise(resolve => setTimeout(resolve, simulatedDelay));

  const symptoms = reportData.symptoms || [];
  const species = reportData.species || 'Cattle';
  const mortalityCount = parseInt(reportData.mortalityCount, 10) || 0;
  const block = reportData.location?.block || 'Unknown';
  const district = reportData.location?.district || 'Pune';

  // 1. Evaluate candidate diseases
  const candidateResults = [];

  for (const disease of DISEASE_KNOWLEDGE_BASE) {
    const score = calculateDiseaseConfidence(symptoms, species, disease);
    if (score > 0.25) {
      candidateResults.push({
        name: disease.name,
        confidenceScore: score,
        urgency: disease.baseSeverity,
        baseAction: disease.baseAction
      });
    }
  }

  // Sort descending by confidence score
  candidateResults.sort((a, b) => b.confidenceScore - a.confidenceScore);

  // Fallback if no specific disease was matched
  if (candidateResults.length === 0) {
    candidateResults.push({
      name: 'Unspecified Viral / Bacterial Infection',
      confidenceScore: 0.45,
      urgency: 'Low',
      baseAction: 'Provide clean drinking water and oral electrolytes. Observe for 24h. Consult para-vet if symptoms persist.'
    });
  }

  const topMatch = candidateResults[0];

  // 2. Check for spatiotemporal outbreak clustering
  const cluster = await checkSpatiotemporalOutbreak(block, district, symptoms, currentReportId);

  // 3. Derive riskLevel
  let riskLevel = 'Low';
  if (mortalityCount >= 3 || topMatch.confidenceScore >= 0.85 || (topMatch.urgency === 'Critical' && topMatch.confidenceScore >= 0.60)) {
    riskLevel = 'Critical';
  } else if (mortalityCount >= 1 || topMatch.confidenceScore >= 0.70 || cluster.outbreakFlag) {
    riskLevel = 'High';
  } else if (topMatch.confidenceScore >= 0.45) {
    riskLevel = 'Moderate';
  }

  // Force outbreakFlag if mortality >= 3 or cluster detected
  const isOutbreak = cluster.outbreakFlag || (riskLevel === 'Critical' && mortalityCount >= 2);

  // 4. Generate structured explanation
  let explanation = '';
  if (isOutbreak) {
    explanation = `CLUSTER OUTBREAK DETECTED: ${cluster.matchedCount} similar symptomatic cases recorded in ${block} block within the last 14 days. Primary candidate is ${topMatch.name} (confidence ${(topMatch.confidenceScore * 100).toFixed(0)}%).`;
  } else if (mortalityCount > 0) {
    explanation = `Elevated risk due to ${mortalityCount} reported mortality event(s). Clinical presentation correlates strongly with ${topMatch.name} (${(topMatch.confidenceScore * 100).toFixed(0)}% match).`;
  } else {
    explanation = `Symptom profile matches characteristic presentation of ${topMatch.name} (${(topMatch.confidenceScore * 100).toFixed(0)}% confidence score).`;
  }

  const recommendedAction = topMatch.baseAction || 'Isolate animal and notify local veterinary dispensary.';

  console.log(`[AI Simulator - mock-v0.1] Completed inference: Risk=${riskLevel}, TopDisease=${topMatch.name}, Outbreak=${isOutbreak} (Latency: ${simulatedDelay}ms)`);

  return {
    riskLevel,
    suspectedDiseases: candidateResults.slice(0, 4).map(d => ({
      name: d.name,
      confidenceScore: d.confidenceScore
    })),
    recommendedAction,
    outbreakFlag: isOutbreak,
    clusterDetails: {
      matchedCasesCount: cluster.matchedCount,
      timeWindowDays: 14,
      block
    },
    explanation,
    modelVersion: 'mock-v0.1'
  };
}

module.exports = {
  runTriage,
  DISEASE_KNOWLEDGE_BASE
};
