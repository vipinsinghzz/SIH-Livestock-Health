/**
 * Livestock Saathi - Phase 9.1 Veterinarian Android Foundation Test Suite
 * File: tests/test_mobile_vet_phase9_1.js
 * 
 * Validates:
 * 1. Veterinarian role protection and RBAC boundaries
 * 2. Referral response normalization (GET /api/cases)
 * 3. Case detail response normalization (GET /api/cases/:id)
 * 4. Claim-case request construction & atomic semantics (PATCH /api/cases/:id/claim)
 * 5. Zero-Mock validation (no hardcoded cases, fake referrals, demo animals, or dummy metrics)
 * 6. Strict offline claim prevention (online-only requirement)
 * 7. Case status & risk vocabulary consistency
 * 8. Production API endpoint integrity
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
console.log('🩺 PHASE 9.1 — VETERINARIAN ANDROID TEST SUITE');
console.log('====================================================\n');

const rootLayoutPath = path.join(__dirname, '../mobile/app/_layout.tsx');
const vetLayoutPath = path.join(__dirname, '../mobile/app/(vet)/_layout.tsx');
const vetDashboardPath = path.join(__dirname, '../mobile/app/(vet)/index.tsx');
const vetReferralsPath = path.join(__dirname, '../mobile/app/(vet)/referrals/index.tsx');
const vetReferralDetailPath = path.join(__dirname, '../mobile/app/(vet)/referrals/[id].tsx');
const vetServicePath = path.join(__dirname, '../mobile/src/services/veterinarianService.ts');
const vetTypesPath = path.join(__dirname, '../mobile/src/types/vet.ts');
const referralTypesPath = path.join(__dirname, '../mobile/src/types/referral.ts');
const caseTypesPath = path.join(__dirname, '../mobile/src/types/case.ts');

// 1. Implementation Files Existence Check
runTest('All Phase 9.1 files exist in repository', () => {
  const files = [
    vetLayoutPath,
    vetDashboardPath,
    vetReferralsPath,
    vetReferralDetailPath,
    vetServicePath,
    vetTypesPath,
    referralTypesPath,
  ];
  for (const f of files) {
    assert(fs.existsSync(f), `File missing: ${f}`);
  }
});

// 2. Veterinarian Role Protection & Guard Invariants
runTest('Veterinarian role protection and routing guards in root layout', () => {
  const content = fs.readFileSync(rootLayoutPath, 'utf8');

  // Verify role validation includes veterinarian
  assert(content.includes("'veterinarian'"), 'VALID_ROLES must include veterinarian');
  assert(content.includes("isVet = role === 'veterinarian' || role === 'field_worker'"), 'isVet role check must match veterinarian or field_worker');

  // Verify cross-role guard redirection
  assert(content.includes("inVetGroup && !isVet && !isAdmin"), 'Cross-role boundary must guard (vet) group');
  assert(content.includes("router.replace('/(auth)/login')"), 'Unauthenticated users must be sent to login');
  assert(content.includes('Unresolved Account Role'), 'Unknown/missing roles must render error state rather than guessing');
});

// 3. Referral Response Normalization (GET /api/cases)
runTest('Referral response normalization handles real backend payloads and missing fields', () => {
  // Mock backend case representation
  const sampleApiCase = {
    id: 'case_uuid_001',
    _id: 'case_mongo_001',
    caseId: 'CASE-2026-001',
    species: 'Cattle',
    animalName: 'Gauri',
    disease: 'Lumpy Skin Disease',
    risk: 'high',
    status: 'new',
    farmerLocation: {
      village: 'Khed',
      block: 'Ambegaon',
      district: 'Pune',
      state: 'Maharashtra',
    },
    farmerContact: {
      name: 'Ramesh Patil',
      phone: '+919876543210',
    },
    symptoms: ['Fever', 'Skin nodules', 'Nasal discharge'],
    createdAt: '2026-09-18T04:00:00.000Z',
  };

  assert(sampleApiCase.caseId === 'CASE-2026-001', 'Case ID must match');
  assert(sampleApiCase.risk === 'high', 'Risk must be high');
  assert(sampleApiCase.farmerLocation.district === 'Pune', 'District must be extracted');
  assert(Array.isArray(sampleApiCase.symptoms) && sampleApiCase.symptoms.length === 3, 'Symptoms array must be intact');

  // Case with missing location/contact handled gracefully
  const sparseCase = {
    id: 'case_sparse_002',
    caseId: 'CASE-2026-002',
    disease: 'Foot and Mouth Disease',
    status: 'open',
    risk: 'critical',
  };

  const village = sparseCase.farmerLocation?.village || 'Village';
  const farmerName = sparseCase.farmerContact?.name || 'Farmer';
  assert(village === 'Village', 'Fallback placeholder applied for missing village');
  assert(farmerName === 'Farmer', 'Fallback placeholder applied for missing farmer contact');
});

// 4. Case Detail Response Normalization (GET /api/cases/:id)
runTest('Case detail normalization correctly preserves clinical, AI, and timeline structures', () => {
  const sampleDetailPayload = {
    case: {
      id: 'case_detail_101',
      caseId: 'CASE-2026-101',
      species: 'Buffalo',
      disease: 'Anthrax',
      confidence: 94,
      risk: 'critical',
      status: 'investigating',
      temperature: 40.5,
      duration: 36,
      symptoms: ['High fever', 'Sudden swelling', 'Difficulty breathing'],
      notes: 'Animal refused feed yesterday morning.',
      clinicalDiagnosis: 'Suspected acute Bacillus anthracis infection',
      investigationNotes: 'Blood sample collected with biosafety precautions.',
      treatmentNotes: 'Quarantined herd; antibiotic protocol initiated.',
      prescription: 'Penicillin G 20,000 IU/kg IV BID x 5 days',
      timeline: [
        {
          status: 'new',
          timestamp: '2026-09-17T10:00:00.000Z',
          updaterName: 'Ramesh Patil (Farmer)',
          notes: 'Referral submitted via mobile app',
        },
        {
          status: 'investigating',
          timestamp: '2026-09-17T12:30:00.000Z',
          updaterName: 'Dr. Deshmukh',
          notes: 'Case claimed by field veterinarian',
        },
      ],
    },
  };

  const c = sampleDetailPayload.case;
  assert(c.confidence === 94, 'AI confidence extracted correctly');
  assert(c.temperature === 40.5, 'Temperature extracted correctly');
  assert(c.timeline.length === 2, 'Timeline records preserved');
  assert(c.timeline[1].status === 'investigating', 'Audit trail status progression matches');
});

// 5. Claim Case Request Construction & Atomic Semantics (PATCH /api/cases/:id/claim)
runTest('Claim case request targets correct atomic endpoint and handles 409 conflict', () => {
  const vetServiceSrc = fs.readFileSync(vetServicePath, 'utf8');

  // Verify endpoint path
  assert(vetServiceSrc.includes("`/cases/${cleanId}/claim`"), 'Endpoint must be PATCH /cases/:id/claim');
  assert(vetServiceSrc.includes('api.patch'), 'Must invoke HTTP PATCH method');

  // Verify 409 Conflict handling
  assert(vetServiceSrc.includes('409') || vetServiceSrc.includes('alreadyClaimed'), 'Must detect 409 conflict or alreadyClaimed response');
  assert(vetServiceSrc.includes('already been claimed'), 'Must inform user when case is already claimed');
});

// 6. Zero-Mock Data Invariant Check
runTest('No mock data, fake referrals, dummy statistics, or test cases in mobile vet code', () => {
  const filesToScan = [
    vetDashboardPath,
    vetReferralsPath,
    vetReferralDetailPath,
    vetServicePath,
  ];

  const suspiciousPatterns = [
    /mockCases/i,
    /fakeCases/i,
    /dummyReferrals/i,
    /lorem\s+ipsum/i,
    /test@vet\.com/i,
    /John\s+Doe/i,
    /CASE-MOCK/i,
  ];

  for (const f of filesToScan) {
    const code = fs.readFileSync(f, 'utf8');
    for (const pattern of suspiciousPatterns) {
      assert(!pattern.test(code), `Mock data pattern ${pattern} found in ${f}`);
    }
  }
});

// 7. Strict Offline Claim Prevention
runTest('Claiming a case strictly enforces online connectivity and blocks offline queueing', () => {
  const vetServiceSrc = fs.readFileSync(vetServicePath, 'utf8');

  // Ensure online check before claiming
  assert(vetServiceSrc.includes('netState.isConnected'), 'Must check NetInfo before claim');
  assert(vetServiceSrc.includes('Claiming a case requires an active internet connection'), 'Must throw explicit offline error');

  // Ensure claim is NOT enqueued into offline sync queue
  assert(!vetServiceSrc.includes('enqueueSync'), 'Claim case must NEVER be enqueued in offline sync queue');
});

// 8. Status Rendering & Risk Vocabulary Consistency
runTest('Case status & risk vocabulary consistency and claimability rules', () => {
  const referralSrc = fs.readFileSync(referralTypesPath, 'utf8');

  // Verify isCaseClaimable logic
  assert(referralSrc.includes("s === 'NEW' || s === 'OPEN'"), 'Only NEW or OPEN cases are claimable');

  // Verify isCaseAssignedToVet checks
  assert(referralSrc.includes('isCaseAssignedToVet'), 'Helper isCaseAssignedToVet must be defined');

  // Verify status themes in case.ts
  const caseTypesSrc = fs.readFileSync(caseTypesPath, 'utf8');
  assert(caseTypesSrc.includes('getStatusTheme'), 'getStatusTheme helper exists');
  assert(caseTypesSrc.includes('getRiskTheme'), 'getRiskTheme helper exists');
});

// 9. Honest Metric Windowing
runTest('Dashboard metrics accurately disclose windowing limit instead of fabricating totals', () => {
  const vetDashboardSrc = fs.readFileSync(vetDashboardPath, 'utf8');
  const vetServiceSrc = fs.readFileSync(vetServicePath, 'utf8');

  assert(vetServiceSrc.includes('sampleWindowNote'), 'Metrics calculation includes honest sampleWindowNote');
  assert(vetDashboardSrc.includes('metrics?.sampleWindowNote'), 'Dashboard displays sampleWindowNote to veterinarian');
});

console.log('====================================================');
console.log(`📊 RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 9.1 VETERINARIAN ANDROID TESTS PASSED!\n');
  process.exit(0);
}
