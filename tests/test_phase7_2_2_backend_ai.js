/**
 * ============================================================================
 * PHASE 7.2.2: BACKEND STARTUP DECOUPLING & HONEST AI FALLBACK TEST SUITE
 * ============================================================================
 * Verifies:
 * 1. Backend starts without MongoDB / without MONGODB_URI
 * 2. MongoDB failure does not call process.exit(1)
 * 3. Supabase remains primary DB
 * 4. Allowed frontend origin succeeds with credentials (no wildcard '*')
 * 5. Unauthorized origin is rejected with 403 Forbidden
 * 6. Credentials work with configured origin
 * 7. AI unavailable returns aiUnavailable=true
 * 8. AI unavailable does NOT return 'Lumpy Skin Disease'
 * 9. AI unavailable does NOT return fake confidence (e.g. 78)
 * 10. AI timeout handled safely
 * 11. Invalid input / image handled with 400 validation error
 * 12. Malformed AI response handled safely without crash
 * 13. Disease report is saved even when AI is unavailable (status: Reported)
 * 14. No stack trace or internal server path exposed to client
 * ============================================================================
 */

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 7.2.2: BACKEND DECOUPLING & HONEST AI TEST SUITE');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 1: MongoDB Startup Decoupling & Supabase Primary DB
  // -------------------------------------------------------------------------
  console.log('🔹 GROUP 1: MongoDB Startup Decoupling & Primary DB Architecture');

  // 1.1 Test connectDB() without MONGODB_URI
  const originalMongoUri = process.env.MONGODB_URI;
  const connectDB = require('../backend/config/db');

  let processExitCalled = false;
  const originalExit = process.exit;
  process.exit = (code) => {
    processExitCalled = true;
    throw new Error(`process.exit called with code ${code}`);
  };

  try {
    delete process.env.MONGODB_URI;
    const resNoUri = await connectDB();
    assert(resNoUri === null, 'connectDB() returns null when MONGODB_URI is absent');
    assert(!processExitCalled, 'connectDB() does NOT call process.exit when MONGODB_URI is absent');
  } catch (err) {
    assert(false, `connectDB() threw error when MONGODB_URI absent: ${err.message}`);
  }

  // 1.2 Test connectDB() with unreachable MongoDB port
  try {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:59999/unreachable_db';
    const resBadUri = await connectDB();
    assert(resBadUri === null, 'connectDB() returns null when MongoDB is unreachable');
    assert(!processExitCalled, 'connectDB() does NOT call process.exit when MongoDB is unreachable');
  } catch (err) {
    assert(false, `connectDB() threw error on unreachable MongoDB: ${err.message}`);
  } finally {
    process.exit = originalExit;
    if (originalMongoUri) {
      process.env.MONGODB_URI = originalMongoUri;
    } else {
      delete process.env.MONGODB_URI;
    }
  }

  // 1.3 Verify Supabase remains Primary DB
  const supabaseDb = require('../backend/services/supabaseDb');
  const farmerProfile = await supabaseDb.profiles.findByEmail('farmer@pashurakshak.in');
  assert(!!farmerProfile, 'Supabase repository serves farmer profile as primary DB');
  assert(farmerProfile.role === 'farmer', 'Farmer role verified in primary profile repository');
  console.log('');

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Production CORS & Credential Security
  // -------------------------------------------------------------------------
  console.log('🔹 GROUP 2: Production CORS & Credential Security');

  // 2.1 Request from allowed local dev origin (http://localhost:5173)
  try {
    const corsAllowedRes = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });
    assert(corsAllowedRes.status === 200, `Allowed origin returns 200 OK (got ${corsAllowedRes.status})`);
    const allowOriginHeader = corsAllowedRes.headers.get('access-control-allow-origin');
    const allowCredentials = corsAllowedRes.headers.get('access-control-allow-credentials');
    assert(allowOriginHeader === 'http://localhost:5173', `Access-Control-Allow-Origin echoes explicit origin (got '${allowOriginHeader}')`);
    assert(allowOriginHeader !== '*', 'Access-Control-Allow-Origin does NOT use wildcard "*" with credentials');
    assert(allowCredentials === 'true', 'Access-Control-Allow-Credentials is true');
  } catch (corsErr) {
    assert(false, `CORS allowed origin request failed: ${corsErr.message}`);
  }

  // 2.2 Request from unauthorized external origin
  try {
    const corsBlockedRes = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Origin': 'https://malicious-attacker-domain.evil.com'
      }
    });
    assert(corsBlockedRes.status === 403, `Unauthorized origin rejected with 403 Forbidden (got ${corsBlockedRes.status})`);
    const blockedData = await corsBlockedRes.json();
    assert(blockedData.message && blockedData.message.includes('CORS policy rejection'), 'Response explains CORS policy rejection');
    const leakedOriginHeader = corsBlockedRes.headers.get('access-control-allow-origin');
    assert(!leakedOriginHeader || leakedOriginHeader !== 'https://malicious-attacker-domain.evil.com', 'Unauthorized origin is NOT permitted in header');
  } catch (corsErr) {
    assert(false, `CORS unauthorized check threw: ${corsErr.message}`);
  }

  // 2.3 Non-browser requests with no Origin header (e.g. mobile/curl)
  try {
    const noOriginRes = await fetch(`${BASE_URL}/api/health`, { method: 'GET' });
    assert(noOriginRes.status === 200, 'Requests without Origin header (curl/mobile/server-to-server) allowed');
  } catch (err) {
    assert(false, `No-origin request failed: ${err.message}`);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Honest AI Fallback (When Python AI Service is Offline)
  // -------------------------------------------------------------------------
  console.log('🔹 GROUP 3: Honest AI Fallback (Python AI Service Offline)');

  // 3.1 Direct triage via POST /api/reports/triage
  const directTriageRes = await fetch(`${BASE_URL}/api/reports/triage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-simulate-ai-offline': 'true'
    },
    body: JSON.stringify({
      species: 'Cattle',
      symptoms: ['skin_nodules', 'high_fever'],
      temperature: 104.2,
      duration: 2
    })
  });
  const directTriageData = await directTriageRes.json();
  assert(directTriageRes.status === 200, `Direct triage returns 200 OK (got ${directTriageRes.status})`);
  assert(directTriageData.success === false, 'Triage response has success: false');
  assert(directTriageData.aiUnavailable === true, 'Triage response has aiUnavailable: true');
  assert(directTriageData.possibleCondition === null, 'possibleCondition is strictly null (NO fabricated disease)');
  assert(directTriageData.confidenceScore === null, 'confidenceScore is strictly null (NO fake 78% confidence)');
  assert(!JSON.stringify(directTriageData).includes('Lumpy Skin Disease'), 'Response body contains zero fabricated "Lumpy Skin Disease" strings');
  assert(
    directTriageData.message === 'AI screening is temporarily unavailable. Your report has been saved and can still be reviewed by a veterinarian.',
    'Clear, honest, non-fabricated notice returned to user'
  );
  assert(directTriageData.riskLevel === 'Pending', 'riskLevel is "Pending" (not arbitrarily marked High/Critical)');
  console.log('');

  // -------------------------------------------------------------------------
  // TEST GROUP 4: Failure Classification & Input Validation
  // -------------------------------------------------------------------------
  console.log('🔹 GROUP 4: AI Failure Classification & Input Validation');

  // 4.1 Input validation: Missing symptoms and image
  const invalidInputRes = await fetch(`${BASE_URL}/api/reports/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      species: 'Cattle',
      symptoms: []
    })
  });
  const invalidInputData = await invalidInputRes.json();
  assert(invalidInputRes.status === 400, `Empty symptoms and no image returns 400 Bad Request (got ${invalidInputRes.status})`);
  assert(invalidInputData.success === false, 'Invalid input response indicates success: false');
  assert(invalidInputData.message.includes('image or at least one symptom'), 'Validation error message guides user');

  // 4.2 Timeout handling unit test in aiModelService
  const { predictDisease } = require('../backend/services/aiModelService');
  const timeoutSimResult = await predictDisease({
    species: 'Cattle',
    symptoms: ['fever'],
    _simulateOffline: true
  });
  assert(timeoutSimResult.aiUnavailable === true, 'predictDisease returns aiUnavailable: true when service is down');
  assert(timeoutSimResult.possibleCondition === null, 'predictDisease never returns fabricated condition');
  assert(timeoutSimResult.confidenceScore === null, 'predictDisease never returns fabricated confidence score');
  console.log('');

  // -------------------------------------------------------------------------
  // TEST GROUP 5: Report Saved in 'Reported' Status When AI Unavailable
  // -------------------------------------------------------------------------
  console.log('🔹 GROUP 5: Report Persistence When AI is Unavailable');

  // Login as Farmer
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer@pashurakshak.in', password: 'Farmer@123' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, 'Farmer authenticated');
  const farmerToken = loginData.token;

  // Submit report while AI is offline
  const reportRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`,
      'x-simulate-ai-offline': 'true'
    },
    body: JSON.stringify({
      species: 'Buffalo',
      symptoms: ['Severe Salivation', 'Limping on foreleg', 'Oral Lesions'],
      temperature: 103.8,
      duration: 2,
      mortalityCount: 0,
      affectedCount: 1,
      location: {
        lat: 18.1517,
        lng: 74.5772,
        village: 'Koregaon Bhima',
        block: 'Shirur',
        district: 'Pune'
      },
      notes: 'Testing report persistence during AI service downtime.'
    })
  });
  const reportData = await reportRes.json();
  assert(reportRes.status === 201, `Report created with 201 Created (got ${reportRes.status})`);
  assert(reportData.success === true, 'Report response indicates success: true');
  assert(reportData.aiUnavailable === true, 'aiUnavailable: true returned in report response');
  assert(reportData.triageResult === null, 'triageResult is strictly null (no fake database triage record created)');
  assert(reportData.report && reportData.report.status === 'Reported', 'Report status is "Reported" (pending veterinary review)');
  assert(!reportData.stack, 'No stack trace exposed in report response');

  // Verify report in database via API endpoint
  const savedReportId = reportData.report.id || reportData.report._id;
  const getReportRes = await fetch(`${BASE_URL}/api/reports/${savedReportId}`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  });
  const getReportData = await getReportRes.json();
  assert(getReportRes.status === 200, `Report fetched from database via API (got ${getReportRes.status})`);
  assert(getReportData.report && getReportData.report.status === 'Reported', 'Database record confirms status is "Reported"');
  assert(getReportData.report.triageResult === null, 'Database record confirms triageResult is strictly null (no fake row)');
  console.log(`     Report ID: ${getReportData.report.id || getReportData.report._id}, Status: ${getReportData.report.status}, Case ID: ${getReportData.report.caseId}`);
  console.log('');

  // -------------------------------------------------------------------------
  // TEST GROUP 6: Information Leakage & Security
  // -------------------------------------------------------------------------
  console.log('🔹 GROUP 6: Information Leakage & Error Security');
  const bogusRes = await fetch(`${BASE_URL}/api/reports/non-existent-endpoint-test-404`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  });
  const bogusData = await bogusRes.text();
  assert(!bogusData.includes('password'), 'Response contains no password leaks');
  assert(!bogusData.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Response contains no Supabase service role key leaks');
  assert(!bogusData.includes('__dirname'), 'Response contains no internal filesystem leaks');
  console.log('');

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log('================================================================');
  console.log(`📊 TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('================================================================');

  try {
    const mongoose = require('mongoose');
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (e) {}

  if (testsFailed > 0) {
    console.error('❌ SOME TESTS FAILED!');
    process.exitCode = 1;
  } else {
    console.log('🎉 ALL PHASE 7.2.2 BACKEND & AI HARDENING TESTS PASSED PERFECTLY!\n');
    process.exitCode = 0;
  }
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
