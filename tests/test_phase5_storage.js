/**
 * Phase 5 Storage Migration Test Suite: Supabase Storage
 * File: tests/test_phase5_storage.js
 * 
 * Verifies the complete end-to-end cloud storage workflow:
 * Farmer Upload → Supabase Storage (Private) → PostgreSQL Metadata →
 * AI Screening → Referral Case → Vet Authorized Viewing → Cross-Farmer 403 Security Check
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

// 1x1 transparent PNG base64 for testing
const SAMPLE_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Minimal valid JPEG base64 (FF D8 FF E0 ...)
const SAMPLE_JPEG_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function runStorageTests() {
  console.log('================================================================');
  console.log('🚀 PHASE 5: SUPABASE STORAGE MIGRATION TEST SUITE');
  console.log('   Upload → Private Bucket → DB Metadata → AI → Vet Access → Security');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  let farmerToken = null;
  let farmerUser = null;
  let vetToken = null;
  let vetUser = null;
  let uploadedStoragePath = null;
  let uploadedSignedUrl = null;
  let createdScanId = null;

  // -------------------------------------------------------------------------
  // STEP 1: Validation Checks (Missing payload, Bad type, Size limit)
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 1: Input Validation & Security Constraints');

  // 1a. Missing file payload
  const emptyRes = await fetch(`${BASE_URL}/api/upload/scan-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const emptyData = await emptyRes.json();
  assert(emptyRes.status === 400, `Missing file payload rejected with 400 Bad Request (got ${emptyRes.status})`);
  assert(emptyData.success === false, 'Error response has success: false');

  // 1b. Non-image file payload (PDF / Executable spoofing)
  const fakePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjUKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZw==';
  const badTypeRes = await fetch(`${BASE_URL}/api/upload/scan-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: fakePdfBase64 })
  });
  assert(badTypeRes.status === 400, `Non-image format rejected with 400 Bad Request (got ${badTypeRes.status})`);

  // 1c. Oversized file (> 10MB)
  const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024, 'a');
  const oversizedBase64 = `data:image/jpeg;base64,${oversizedBuffer.toString('base64')}`;
  const oversizedRes = await fetch(`${BASE_URL}/api/upload/scan-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: oversizedBase64 })
  });
  assert(oversizedRes.status === 413 || oversizedRes.status === 400, `Oversized payload rejected with 413/400 (got ${oversizedRes.status})`);
  console.log('     Validation checks: Missing file, invalid MIME, and >10MB limit all enforced.');
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 2: Farmer Authentication
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 2: Farmer Authentication');
  const farmerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer@pashurakshak.in', password: 'Farmer@123' })
  });
  const farmerLoginData = await farmerLoginRes.json();
  assert(farmerLoginRes.status === 200, 'Farmer authenticated successfully');
  farmerToken = farmerLoginData.token;
  farmerUser = farmerLoginData.user;
  console.log(`     Farmer: ${farmerUser.name} (${farmerUser.id})`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 3: Farmer Uploads Scan Image to Supabase Storage
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 3: Upload Scan Image to Supabase Storage Private Bucket');
  const uploadRes = await fetch(`${BASE_URL}/api/upload/scan-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      image: SAMPLE_JPEG_BASE64,
      disease: 'Lumpy Skin Disease (LSD)',
      riskLevel: 'High',
      confidence: 92,
      symptoms: ['Cutaneous Nodules', 'High Fever'],
      temperature: 104.2,
      duration: 3
    })
  });
  const uploadData = await uploadRes.json();
  assert(uploadRes.status === 201, `Upload succeeded with 201 Created (got ${uploadRes.status})`);
  assert(uploadData.success === true, 'Upload response indicates success: true');
  assert(!!uploadData.storagePath, `Supabase Storage path generated: ${uploadData.storagePath}`);
  assert(uploadData.bucket === 'livestock-scans', `Storage bucket verified as 'livestock-scans'`);
  assert(uploadData.isPrivate === true, 'Bucket configuration confirmed strictly private');
  assert(!!uploadData.signedUrl, 'Time-limited signed URL issued for secure viewing');
  assert(!!uploadData.imageUrl, 'Backward-compatible imageUrl field populated');
  assert(!!uploadData.scanId, 'PostgreSQL scan record ID assigned');

  uploadedStoragePath = uploadData.storagePath;
  uploadedSignedUrl = uploadData.signedUrl;
  createdScanId = uploadData.scanId;
  console.log(`     Storage Path: ${uploadedStoragePath}`);
  console.log(`     Signed URL: ${uploadedSignedUrl.slice(0, 70)}...`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 4: PostgreSQL Metadata Persistence & Scans List
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 4: PostgreSQL Metadata Verification');
  const scansRes = await fetch(`${BASE_URL}/api/upload/scans`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  });
  const scansData = await scansRes.json();
  assert(scansRes.status === 200, `Scans retrieved (got ${scansRes.status})`);
  assert(Array.isArray(scansData.scans), 'Scans array returned');
  const matchingScan = scansData.scans.find(s => s.storagePath === uploadedStoragePath || s.id === createdScanId);
  assert(!!matchingScan, 'Uploaded scan record verified in database');
  assert(matchingScan.disease === 'Lumpy Skin Disease (LSD)', 'Clinical disease tag correctly recorded');
  assert(matchingScan.isPrivate === true, 'is_private column is true');
  console.log(`     PostgreSQL Metadata verified: ID ${matchingScan.id}, Disease: ${matchingScan.disease}`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 5: AI Screening with Cloud-Stored Image
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 5: AI Screening Pipeline with Supabase-Stored Image');
  const reportRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      species: 'Cattle',
      symptoms: ['skin_nodules', 'high_fever'],
      temperature: 104.0,
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
      image: uploadedStoragePath, // Pass Supabase storage path to AI pipeline
      photos: [uploadedStoragePath]
    })
  });
  const reportData = await reportRes.json();
  assert(reportRes.status === 201, `Disease Report with cloud image processed (got ${reportRes.status})`);
  if (reportData.triageResult) {
    assert(!!reportData.triageResult, 'AI Triage completed successfully using cloud image');
    assert(!!reportData.triageResult.riskLevel, `AI Risk Level produced: ${reportData.triageResult.riskLevel}`);
    console.log(`     AI successfully processed image from path: ${uploadedStoragePath}`);
    console.log(`     Triage Result: ${reportData.triageResult.predictedDisease} (${reportData.triageResult.riskLevel} Risk)`);
  } else {
    assert(reportData.aiUnavailable === true, 'AI unavailable flag correctly set when Python service is offline');
    assert(reportData.report && reportData.report.status === 'Reported', 'Report saved in Reported status pending AI/vet review');
    console.log(`     [AI Offline Notice] Report ${reportData.report.caseId} safely stored for physical veterinary review.`);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 6: Clinical Referral Case Creation
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 6: Clinical Referral Case Creation with Cloud Scan');
  const caseRes = await fetch(`${BASE_URL}/api/cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      species: 'Cattle',
      disease: 'Lumpy Skin Disease (LSD)',
      confidence: 92,
      risk: 'High',
      coordinates: { lat: 18.1517, lng: 74.5772 },
      symptoms: ['skin_nodules', 'high_fever'],
      temperature: 104.0,
      duration: 3,
      affectedCount: 2,
      image: uploadedSignedUrl,
      village: 'Malegaon Bk',
      block: 'Baramati',
      district: 'Pune'
    })
  });
  const caseData = await caseRes.json();
  assert(caseRes.status === 201, `Referral case created (got ${caseRes.status})`);
  assert(!!caseData.case.caseId, `Case generated: ${caseData.case.caseId}`);
  console.log(`     Case ID: ${caseData.case.caseId} (Attached Scan: ${uploadedStoragePath})`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 7: Veterinarian Authentication & Authorized Scan Viewing
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 7: Veterinarian Authentication & Authorized Image Inspection');
  const vetLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vet@pashurakshak.in', password: 'Vet@123' })
  });
  const vetLoginData = await vetLoginRes.json();
  assert(vetLoginRes.status === 200, 'Veterinarian authenticated successfully');
  vetToken = vetLoginData.token;
  vetUser = vetLoginData.user;
  assert(vetUser.role === 'veterinarian', 'Role confirmed as veterinarian');

  // Vet fetches the private scan image via authorized viewing endpoint
  const viewRes = await fetch(`${BASE_URL}/api/upload/view-image?path=${encodeURIComponent(uploadedStoragePath)}`, {
    headers: { Authorization: `Bearer ${vetToken}` }
  });
  assert(viewRes.status === 200, `Veterinarian authorized to view image (HTTP ${viewRes.status})`);
  const contentType = viewRes.headers.get('content-type');
  assert(contentType.startsWith('image/'), `Valid image content-type received: ${contentType}`);
  const imageBytes = await viewRes.arrayBuffer();
  assert(imageBytes.byteLength > 0, `Image binary stream delivered (${imageBytes.byteLength} bytes)`);
  console.log(`     Vet Dr. ${vetUser.name} successfully inspected scan (${imageBytes.byteLength} bytes).`);
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 8: Security Check: Unauthorized Cross-Farmer Access Rejection
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 8: Security Check – Unauthorized Cross-Farmer Access (403 Forbidden)');
  
  // Generate token for a different farmer (simulating an unauthorized peer farmer)
  const unauthorizedFarmerToken = jwt.sign(
    {
      sub: '00000000-0000-0000-0000-000000000099',
      role: 'authenticated',
      user_metadata: { role: 'farmer', name: 'Other Farmer' }
    },
    process.env.JWT_SECRET || 'pashurakshak_jwt_secret_key_2026_secure',
    { expiresIn: '1h', issuer: 'supabase' }
  );

  const unauthorizedRes = await fetch(`${BASE_URL}/api/upload/view-image?path=${encodeURIComponent(uploadedStoragePath)}`, {
    headers: { Authorization: `Bearer ${unauthorizedFarmerToken}` }
  });
  assert(unauthorizedRes.status === 403, `Cross-farmer unauthorized access strictly blocked with 403 Forbidden (got ${unauthorizedRes.status})`);
  const unauthorizedData = await unauthorizedRes.json();
  assert(unauthorizedData.success === false, 'Unauthorized response confirms success: false');
  console.log('     Security verified: Unauthorized farmer blocked from accessing peer scans.');
  console.log('');

  // -------------------------------------------------------------------------
  // STEP 9: Expired / Missing Token Validation on View Endpoint
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 9: Expired Token & Missing Path Validation');

  // Missing path
  const noPathRes = await fetch(`${BASE_URL}/api/upload/view-image`);
  assert(noPathRes.status === 400, `Missing path parameter returns 400 Bad Request (got ${noPathRes.status})`);

  // Expired signed token
  const expiredRes = await fetch(`${BASE_URL}/api/upload/view-image?path=${encodeURIComponent(uploadedStoragePath)}&token=invalidToken&expires=1000000`);
  assert(expiredRes.status === 401 || expiredRes.status === 403, `Expired/tampered token rejected with 401/403 (got ${expiredRes.status})`);
  console.log('     Expired token and missing path validation verified.');
  console.log('');

  // -------------------------------------------------------------------------
  // FINAL REPORT & SUMMARY
  // -------------------------------------------------------------------------
  console.log('================================================================');
  console.log(`📊 PHASE 5 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('❌ Phase 5 Storage migration test encountered failures.');
    process.exit(1);
  } else {
    console.log('🎉 PHASE 5 STORAGE MIGRATION SUCCEEDED END-TO-END!');
    console.log('   Upload → Private Bucket → DB Metadata → AI → Vet Access → Security ✅\n');
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
  await runStorageTests();
}

main().catch(err => {
  console.error('Fatal error in storage tests:', err);
  process.exit(1);
});
