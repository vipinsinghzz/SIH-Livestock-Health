/**
 * Phase 4 Critical Workflow Test Suite
 * File: tests/test_phase4_workflow.js
 * 
 * Verifies the full end-to-end operational lifecycle:
 * Farmer → Animal → Disease Report → AI Screening → Case Creation → Vet Referral → Vet Dashboard → Case Tracking.
 */

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runCriticalWorkflow() {
  console.log('================================================================');
  console.log('🚀 PHASE 4: CRITICAL BACKEND WORKFLOW INTEGRATION TEST');
  console.log('   Farmer → Animal → Report → AI → Case → Referral → Vet → Tracking');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  let farmerToken = null;
  let farmerUser = null;
  let vetToken = null;
  let vetUser = null;
  let createdAnimal = null;
  let createdReport = null;
  let createdCase = null;

  // -------------------------------------------------------------------------
  // STEP 1: Farmer Login
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 1: Farmer Authentication');
  const farmerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'farmer@pashurakshak.in',
      password: 'Farmer@123'
    })
  });
  const farmerData = await farmerLoginRes.json();
  assert(farmerLoginRes.status === 200, 'Farmer authenticated successfully');
  assert(!!farmerData.token, 'Supabase Auth token issued for Farmer');
  farmerToken = farmerData.token;
  farmerUser = farmerData.user;
  console.log(`     Farmer: ${farmerUser.name} (${farmerUser.email})`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 2: Animal Registration
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 2: Animal Profile Registration');
  const animalTag = `MH-12-P-${Math.floor(1000 + Math.random() * 9000)}`;
  const animalRes = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      tagId: animalTag,
      name: 'Gauri (गौरी)',
      species: 'Cattle',
      breed: 'Gir Indigenous',
      age: 4,
      gender: 'Female',
      healthStatus: 'Healthy',
      milkYieldDaily: '14.0 L',
      village: 'Malegaon Bk',
      block: 'Baramati',
      district: 'Pune'
    })
  });
  const animalData = await animalRes.json();
  assert(animalRes.status === 201, `Animal registered (HTTP ${animalRes.status})`);
  assert(animalData.animal && animalData.animal.tagId === animalTag, `Animal Tag ID is ${animalTag}`);
  createdAnimal = animalData.animal;
  console.log(`     Animal ID: ${createdAnimal.id || createdAnimal._id}, Tag: ${createdAnimal.tagId}`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 3 & 4: Disease Report & AI Screening / Triage
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 3 & 4: Disease Report Submission & AI Screening');
  const reportRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      animalId: createdAnimal.id || createdAnimal._id,
      species: 'Cattle',
      symptoms: ['High Fever (104°F)', 'Cutaneous Nodules across neck', 'Excessive Salivation', 'Lethargy'],
      temperature: 104.2,
      duration: 3,
      mortalityCount: 0,
      affectedCount: 2,
      location: {
        lat: 18.1517,
        lng: 74.5772,
        village: 'Malegaon Bk',
        block: 'Baramati',
        district: 'Pune'
      },
      notes: 'Cow displaying acute nodular skin eruption and elevated body temperature.'
    })
  });
  const reportData = await reportRes.json();
  assert(reportRes.status === 201, `Report created (HTTP ${reportRes.status})`);
  assert(reportData.report && !!reportData.report.caseId, 'Unique readable Case ID generated for report');
  if (reportData.triageResult) {
    assert(!!reportData.triageResult, 'AI Screening produced automated TriageResult');
    assert(!!reportData.triageResult.riskLevel, `AI Risk Level assigned: ${reportData.triageResult.riskLevel}`);
    const displayDisease = reportData.triageResult.predictedDisease || reportData.triageResult.suspectedDiseases?.[0]?.name || 'Suspected Condition';
    console.log(`     AI Predicted Disease: ${displayDisease}`);
    console.log(`     AI Risk Level: ${reportData.triageResult.riskLevel}`);
  } else {
    assert(reportData.aiUnavailable === true, 'AI unavailable flag correctly set when Python service is offline');
    assert(reportData.report.status === 'Reported', 'Report remains in Reported status pending veterinary review');
    console.log(`     [AI Offline Notice] Report ${reportData.report.caseId} safely stored for physical veterinary review.`);
  }
  createdReport = reportData.report;
  console.log(`     Report Case ID: ${createdReport.caseId}`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 5: Referral Case Creation
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 5: Clinical Referral Case Creation');
  const caseRes = await fetch(`${BASE_URL}/api/cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      animalId: createdAnimal.id || createdAnimal._id,
      animalName: createdAnimal.name,
      species: 'Cattle',
      disease: 'Lumpy Skin Disease',
      confidence: 92,
      risk: 'High',
      coordinates: { lat: 18.1517, lng: 74.5772 },
      symptoms: ['High Fever', 'Cutaneous Nodules', 'Salivation'],
      temperature: 104.2,
      duration: 3,
      affectedCount: 2,
      notes: 'Urgent veterinary examination required for suspected LSD outbreak.',
      village: 'Malegaon Bk',
      block: 'Baramati',
      district: 'Pune'
    })
  });
  const caseData = await caseRes.json();
  assert(caseRes.status === 201, `Referral Case created (HTTP ${caseRes.status})`);
  assert(caseData.case && !!caseData.case.caseId, `Referral Case Number: ${caseData.case?.caseId}`);
  createdCase = caseData.case;
  console.log(`     Case Created: ${createdCase.caseId} (Status: ${createdCase.status})`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 6: Vet Referral Discovery
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 6: Veterinary Referral Discovery (Nearby Search)');
  const vetHelpRes = await fetch(`${BASE_URL}/api/veterinarians/nearby?lat=18.1517&lng=74.5772&district=Pune`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  });
  const vetHelpData = await vetHelpRes.json();
  assert(vetHelpRes.status === 200, `Nearby veterinary search successful (HTTP ${vetHelpRes.status})`);
  assert(Array.isArray(vetHelpData.veterinarians) && vetHelpData.veterinarians.length > 0, 'Matching veterinarians returned');
  const nearest = vetHelpData.nearestVets?.[0] || vetHelpData.veterinarians[0];
  assert(!!nearest.name, `Nearest vet identified: Dr. ${nearest.name}`);
  console.log(`     Found ${vetHelpData.totalAvailable} veterinarians in district.`);
  console.log(`     Nearest Vet: Dr. ${nearest.name} (${nearest.distanceKm || 0} km away)`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 7: Vet Authentication & Dashboard Queue
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 7: Veterinarian Authentication & Dashboard Access');
  const vetLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'vet@pashurakshak.in',
      password: 'Vet@123'
    })
  });
  const vetLoginData = await vetLoginRes.json();
  assert(vetLoginRes.status === 200, 'Veterinarian authenticated successfully');
  vetToken = vetLoginData.token;
  vetUser = vetLoginData.user;
  assert(vetUser.role === 'veterinarian', 'User role confirmed as "veterinarian"');

  // Vet fetches active cases
  const vetCasesRes = await fetch(`${BASE_URL}/api/cases`, {
    headers: { Authorization: `Bearer ${vetToken}` }
  });
  const vetCasesData = await vetCasesRes.json();
  assert(vetCasesRes.status === 200, `Vet retrieved case queue (HTTP ${vetCasesRes.status})`);
  assert(Array.isArray(vetCasesData.cases), 'Vet received active case list');
  const targetInQueue = vetCasesData.cases.find(c => c.caseId === createdCase.caseId || String(c._id) === String(createdCase._id));
  assert(!!targetInQueue, `Created case ${createdCase.caseId} visible in Vet Queue`);
  console.log(`     Vet: Dr. ${vetUser.name}`);
  console.log(`     Active Cases in Queue: ${vetCasesData.cases.length}`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 8: Case Tracking (Claim Case & Advance Status)
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 8: Case Tracking (Claiming & Status Transition)');
  const caseLookupId = createdCase._id ? createdCase._id.toString() : createdCase.caseId;

  // 8a. Vet Claims Case
  const claimRes = await fetch(`${BASE_URL}/api/cases/${caseLookupId}/claim`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vetToken}`
    }
  });
  const claimData = await claimRes.json();
  assert(claimRes.status === 200, `Case claimed by Veterinarian (HTTP ${claimRes.status})`);
  assert(claimData.case.status === 'Investigating' || claimData.case.status === 'ACCEPTED', `Case status updated to '${claimData.case.status}'`);
  console.log(`     Case Claimed! Status: ${claimData.case.status}`);

  // 8b. Vet Updates Status to Confirmed with Clinical Prescription
  const updateRes = await fetch(`${BASE_URL}/api/cases/${caseLookupId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vetToken}`
    },
    body: JSON.stringify({
      status: 'Confirmed',
      clinicalDiagnosis: 'Clinically verified Lumpy Skin Disease (Capripoxvirus). Nodular eruption active.',
      investigationNotes: 'Isolated animal in quarantine paddock. Administered antipyretics and antiseptic dressing.',
      prescription: 'Meloxicam 15ml IM OD x 3 days, Enrofloxacin 10% 15ml IM OD x 5 days, Topical Iodoform on lesions.'
    })
  });
  const updateData = await updateRes.json();
  assert(updateRes.status === 200, `Case advanced to Confirmed status (HTTP ${updateRes.status})`);
  assert(updateData.case.status === 'Confirmed', 'Case status successfully updated to "Confirmed"');
  console.log(`     Case Status Advanced: ${updateData.case.status}`);

  // 8c. Verify Audit Timeline on Case
  const finalCaseRes = await fetch(`${BASE_URL}/api/cases/${caseLookupId}`, {
    headers: { Authorization: `Bearer ${vetToken}` }
  });
  const finalCaseData = await finalCaseRes.json();
  assert(finalCaseRes.status === 200, 'Case details and timeline retrieved');
  assert(Array.isArray(finalCaseData.case.timeline) && finalCaseData.case.timeline.length >= 2, 'Audit timeline records multiple stage transitions');
  console.log(`     Audit Timeline entries: ${finalCaseData.case.timeline.length}`);
  console.log('');

  // -------------------------------------------------------------------------
  // FINAL REPORT & SUMMARY
  // -------------------------------------------------------------------------
  console.log('================================================================');
  console.log(`📊 WORKFLOW TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('❌ Critical workflow encountered failures.');
    process.exit(1);
  } else {
    console.log('🎉 CRITICAL WORKFLOW SUCCEEDED END-TO-END!');
    console.log('   Farmer → Animal → Disease Report → AI Screening → Case Creation → Vet Referral → Vet Dashboard → Case Tracking ✅\n');
    process.exit(0);
  }
}

async function isServerOnline(url) {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

async function main() {
  const online = await isServerOnline(BASE_URL);
  if (!online) {
    console.log(`[Setup] Starting backend server on ${BASE_URL}...`);
    require('../backend/server');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  await runCriticalWorkflow();
}

main().catch(err => {
  console.error('Fatal error in workflow test:', err);
  process.exit(1);
});
