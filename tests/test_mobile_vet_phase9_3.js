/**
 * PashuCare - Phase 9.3 Diagnostic Lab Tests Test Suite
 * File: tests/test_mobile_vet_phase9_3.js
 * 
 * Validates:
 * 1. Lab service existence & API interface
 * 2. GET /api/lab-referrals integration path
 * 3. POST /api/lab-referrals create referral contract
 * 4. PATCH /api/lab-referrals/:id update contract
 * 5. Exact 5-stage status pipeline vocabulary
 * 6. Result Confirmed requires confirmedDisease
 * 7. Case integration (caseId support, bidirectional navigation)
 * 8. Zero GET-by-ID endpoint assumption
 * 9. Offline read & SQLite cache reconciliation
 * 10. Create lab referral strictly blocked offline
 * 11. Update lab referral strictly blocked offline
 * 12. No fake lab data or mock generators in service
 * 13. No invented PDF / report file uploads
 * 14. AI disclaimer retention
 * 15. Protected directories integrity check
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
    testsFailed++;
  }
}

console.log('====================================================');
console.log('🔬 PHASE 9.3 — DIAGNOSTIC LAB TESTS TEST SUITE');
console.log('====================================================\n');

const labServicePath = path.join(__dirname, '../mobile/src/services/labService.ts');
const labTypesPath = path.join(__dirname, '../mobile/src/types/lab.ts');
const labsIndexPath = path.join(__dirname, '../mobile/app/(vet)/labs/index.tsx');
const labDetailPath = path.join(__dirname, '../mobile/app/(vet)/labs/[id].tsx');
const localDbPath = path.join(__dirname, '../mobile/src/services/localDatabase.ts');
const referralDetailPath = path.join(__dirname, '../mobile/app/(vet)/referrals/[id].tsx');
const vetDashboardPath = path.join(__dirname, '../mobile/app/(vet)/index.tsx');
const vetLayoutPath = path.join(__dirname, '../mobile/app/(vet)/_layout.tsx');

const labServiceSrc = fs.readFileSync(labServicePath, 'utf8');
const labTypesSrc = fs.readFileSync(labTypesPath, 'utf8');
const labsIndexSrc = fs.readFileSync(labsIndexPath, 'utf8');
const labDetailSrc = fs.readFileSync(labDetailPath, 'utf8');
const localDbSrc = fs.readFileSync(localDbPath, 'utf8');
const referralDetailSrc = fs.readFileSync(referralDetailPath, 'utf8');
const vetDashboardSrc = fs.readFileSync(vetDashboardPath, 'utf8');
const vetLayoutSrc = fs.readFileSync(vetLayoutPath, 'utf8');

// 1. Lab Service Existence & Interface
runTest('1. Lab service exists and exports required methods', () => {
  assert(fs.existsSync(labServicePath), 'labService.ts must exist');
  assert(labServiceSrc.includes('getLabReferrals'), 'Must implement getLabReferrals');
  assert(labServiceSrc.includes('getLabReferralById'), 'Must implement getLabReferralById');
  assert(labServiceSrc.includes('createLabReferral'), 'Must implement createLabReferral');
  assert(labServiceSrc.includes('updateLabReferral'), 'Must implement updateLabReferral');
});

// 2. GET /api/lab-referrals Integration Path
runTest('2. GET /api/lab-referrals integration path and query parameters', () => {
  assert(labServiceSrc.includes("api.get"), 'Must use api.get');
  assert(labServiceSrc.includes("'/lab-referrals'"), 'Must call /lab-referrals endpoint');
  assert(labServiceSrc.includes("queryParams.status"), 'Must support status query parameter');
  assert(labServiceSrc.includes("queryParams.sampleType"), 'Must support sampleType query parameter');
});

// 3. POST /api/lab-referrals Create Referral Contract
runTest('3. POST /api/lab-referrals create referral contract', () => {
  assert(labServiceSrc.includes("api.post"), 'Must use api.post');
  assert(labServiceSrc.includes("'/lab-referrals'"), 'Must call /lab-referrals endpoint');
  assert(
    labServiceSrc.includes("sampleType: payload.sampleType") || labServiceSrc.includes("body.sampleType"),
    'Must include sampleType'
  );
  assert(labServiceSrc.includes("body.caseId"), 'Must support caseId linkage');
  assert(!labServiceSrc.includes("body.collectedBy"), 'Must NOT inject client-controlled collectedBy');
});

// 4. PATCH /api/lab-referrals/:id Update Contract
runTest('4. PATCH /api/lab-referrals/:id update contract', () => {
  assert(labServiceSrc.includes("api.patch"), 'Must use api.patch');
  assert(labServiceSrc.includes("`/lab-referrals/${cleanId}`"), 'Must call /lab-referrals/:id');
  assert(labServiceSrc.includes("body.status"), 'Must support status update');
  assert(labServiceSrc.includes("body.confirmedDisease"), 'Must support confirmedDisease update');
  assert(labServiceSrc.includes("body.notes"), 'Must support notes update');
});

// 5. Exact 5-Stage Status Pipeline Vocabulary
runTest('5. Exact 5-stage status pipeline vocabulary matches backend schema', () => {
  const statuses = ['Collected', 'In Transit', 'Received', 'Result Pending', 'Result Confirmed'];
  statuses.forEach((s) => {
    assert(labTypesSrc.includes(`'${s}'`), `lab.ts must include status '${s}'`);
  });
});

// 6. Result Confirmed Validation
runTest('6. Result Confirmed requires confirmedDisease in service and UI', () => {
  assert(
    labServiceSrc.includes("payload.status === 'Result Confirmed' && !payload.confirmedDisease?.trim()"),
    'Service must validate that confirmedDisease is present when status is Result Confirmed'
  );
  assert(
    labDetailSrc.includes("targetStatus === 'Result Confirmed' && !confirmedDiseaseInput.trim()"),
    'Detail screen must prompt if confirmedDisease is missing on confirmation'
  );
});

// 7. Case Integration
runTest('7. Case integration: order lab test from Case Detail and navigate to case', () => {
  assert(
    referralDetailSrc.includes("labService.createLabReferral"),
    'referrals/[id].tsx must integrate labService.createLabReferral'
  );
  assert(
    referralDetailSrc.includes("Order Diagnostic Lab Test"),
    'referrals/[id].tsx must provide action button to order lab test'
  );
  assert(
    labDetailSrc.includes("/(vet)/referrals/"),
    'labs/[id].tsx must link back to attending case detail'
  );
});

// 8. Zero GET-by-ID Endpoint Assumption
runTest('8. No GET-by-ID endpoint assumption (uses list/cache resolution)', () => {
  assert(
    !labServiceSrc.includes("api.get(`/lab-referrals/${"),
    'Must NOT assume or call nonexistent GET /api/lab-referrals/:id'
  );
  assert(
    labServiceSrc.includes("getLabReferralById"),
    'getLabReferralById must resolve from list or cache'
  );
});

// 9. Offline Read & SQLite Caching
runTest('9. Offline read and SQLite cache persistence', () => {
  assert(localDbSrc.includes('lab_referrals_cache'), 'localDatabase.ts must define lab_referrals_cache table');
  assert(localDbSrc.includes('saveLabReferralsCache'), 'localDatabase.ts must export saveLabReferralsCache');
  assert(localDbSrc.includes('getCachedLabReferrals'), 'localDatabase.ts must export getCachedLabReferrals');
  assert(labServiceSrc.includes('saveLabReferralsCache'), 'labService must cache server records');
  assert(labServiceSrc.includes('getCachedLabReferrals'), 'labService must read from cache when offline');
});

// 10. Create Lab Referral Blocked Offline
runTest('10. Create lab referral is strictly blocked offline (online-only)', () => {
  assert(
    labServiceSrc.includes("Creating a laboratory referral requires an active internet connection"),
    'createLabReferral must reject execution when offline'
  );
  assert(
    !labServiceSrc.includes("enqueueSyncItem"),
    'createLabReferral must NOT insert into sync_queue'
  );
});

// 11. Update Lab Referral Blocked Offline
runTest('11. Update lab referral is strictly blocked offline (online-only)', () => {
  assert(
    labServiceSrc.includes("Updating a laboratory referral requires an active internet connection"),
    'updateLabReferral must reject execution when offline'
  );
});

// 12. No Fake Lab Data
runTest('12. No fake lab data or mock generators in service', () => {
  assert(!labServiceSrc.includes('Math.random()'), 'Service must not generate fake sample IDs');
  assert(!labServiceSrc.includes('INITIAL_LAB_SAMPLES'), 'Service must not hardcode mock lab datasets');
});

// 13. No Invented PDF / Report File Uploads
runTest('13. No invented PDF attachments or fabricated report uploads', () => {
  assert(!labTypesSrc.includes('attachmentUrl'), 'Must not invent attachmentUrl');
  assert(!labTypesSrc.includes('pdfUrl'), 'Must not invent pdfUrl');
  assert(!labServiceSrc.includes('multipart/form-data'), 'Must not invent file upload endpoints');
});

// 14. AI Disclaimer Retention
runTest('14. AI preliminary screening disclaimer is retained', () => {
  assert(
    referralDetailSrc.includes('AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis.'),
    'AI preliminary screening disclaimer must remain intact in case workflow'
  );
});

// 15. Protected Directories Integrity
runTest('15. Protected directories (frontend/, backend/, ml/, supabase/) remain untouched', () => {
  const diff = execSync('git diff -- frontend/ backend/ ml/ supabase/').toString().trim();
  assert.strictEqual(diff, '', 'Protected directories diff must be completely empty');
});

console.log('====================================================');
console.log(`📊 RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 9.3 DIAGNOSTIC LAB TESTS PASSED!\n');
}
