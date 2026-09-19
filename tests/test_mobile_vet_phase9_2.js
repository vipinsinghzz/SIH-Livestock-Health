/**
 * Livestock Saathi - Phase 9.2 Veterinarian Clinical Case Workflow Test Suite
 * File: tests/test_mobile_vet_phase9_2.js
 * 
 * Validates:
 * 1. Status endpoint path is correct (PATCH /api/cases/:id/status)
 * 2. PATCH payload uses actual backend field names
 * 3. No client veterinarian ID injection in mutation body
 * 4. No fake clinical defaults or prefilled mock diagnoses
 * 5. Offline mutation is strictly blocked (online-only)
 * 6. Diagnosis payload normalization
 * 7. Treatment payload normalization
 * 8. Prescription payload normalization
 * 9. Status transition handling & 5-stage lifecycle
 * 10. Conflict (409) and authorization (403) error handling
 * 11. AI preliminary screening disclaimer preservation
 * 12. Timeline is read from server response (zero local event fabrication)
 * 13. No direct Supabase mutation (all writes route through Express backend)
 * 14. Zero exposed secrets
 * 15. Veterinarian role guard remains intact
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
console.log('🩺 PHASE 9.2 — VETERINARIAN CLINICAL WORKFLOW TESTS');
console.log('====================================================\n');

const vetServicePath = path.join(__dirname, '../mobile/src/services/veterinarianService.ts');
const vetTypesPath = path.join(__dirname, '../mobile/src/types/vet.ts');
const referralDetailPath = path.join(__dirname, '../mobile/app/(vet)/referrals/[id].tsx');
const vetCasesPath = path.join(__dirname, '../mobile/app/(vet)/cases/index.tsx');
const rootLayoutPath = path.join(__dirname, '../mobile/app/_layout.tsx');

const vetServiceSrc = fs.readFileSync(vetServicePath, 'utf8');
const vetTypesSrc = fs.readFileSync(vetTypesPath, 'utf8');
const referralDetailSrc = fs.readFileSync(referralDetailPath, 'utf8');
const vetCasesSrc = fs.readFileSync(vetCasesPath, 'utf8');
const rootLayoutSrc = fs.readFileSync(rootLayoutPath, 'utf8');

// 1. Status Endpoint Path Correctness
runTest('1. Status endpoint path is PATCH /api/cases/:id/status', () => {
  assert(
    vetServiceSrc.includes("`/cases/${cleanId}/status`"),
    'Must target `/cases/${cleanId}/status`'
  );
  assert(
    vetServiceSrc.includes('api.patch'),
    'Must use HTTP PATCH method'
  );
});

// 2. Payload Uses Actual Backend Field Names
runTest('2. PATCH payload uses actual backend field names', () => {
  const backendFields = [
    'status',
    'clinicalDiagnosis',
    'affectedCount',
    'investigationNotes',
    'treatmentNotes',
    'prescription',
    'notes',
  ];

  for (const f of backendFields) {
    assert(
      vetTypesSrc.includes(`${f}?`) || vetTypesSrc.includes(`${f}:`),
      `UpdateCaseStatusPayload must define field "${f}"`
    );
    assert(
      vetServiceSrc.includes(`body.${f}`) || vetServiceSrc.includes(`${f}: payload.${f}`),
      `veterinarianService must map "${f}" into body`
    );
  }
});

// 3. No Client Veterinarian ID Injection
runTest('3. No client veterinarian ID injection in mutation body', () => {
  // Extract body construction in updateCaseStatus
  const updateMethodStart = vetServiceSrc.indexOf('updateCaseStatus(');
  assert(updateMethodStart !== -1, 'updateCaseStatus method must exist');
  const updateMethodBody = vetServiceSrc.slice(updateMethodStart, updateMethodStart + 2500);

  assert(
    !updateMethodBody.includes('body.vetId'),
    'Must NOT inject client-controlled body.vetId'
  );
  assert(
    !updateMethodBody.includes('body.assignedVetId'),
    'Must NOT inject client-controlled body.assignedVetId'
  );
  assert(
    !updateMethodBody.includes('body.updaterId'),
    'Must NOT inject client-controlled body.updaterId'
  );
});

// 4. No Fake Clinical Defaults
runTest('4. No fake clinical defaults or prefilled mock diagnoses', () => {
  const filesToScan = [referralDetailSrc, vetCasesSrc, vetServiceSrc];
  const forbiddenMocks = [
    /"FMD"/,
    /"HS"/,
    /"77%"/,
    /mockDiagnosis/i,
    /fakeDiagnosis/i,
    /dummyPrescription/i,
  ];

  for (const src of filesToScan) {
    for (const pattern of forbiddenMocks) {
      assert(!pattern.test(src), `Forbidden mock pattern ${pattern} detected`);
    }
  }
});

// 5. Offline Mutation is Blocked
runTest('5. Offline mutation is strictly blocked (online-only)', () => {
  assert(
    vetServiceSrc.includes('NetInfo.fetch()'),
    'Must fetch NetInfo state before mutation'
  );
  assert(
    vetServiceSrc.includes('Clinical updates require an active internet connection'),
    'Must throw explicit offline error'
  );
  // Ensure not enqueued into offline queue
  const updateMethodStart = vetServiceSrc.indexOf('updateCaseStatus(');
  const updateMethodBody = vetServiceSrc.slice(updateMethodStart, updateMethodStart + 2500);
  assert(
    !updateMethodBody.includes('enqueueSync'),
    'Must NEVER enqueue clinical mutations into offline queue'
  );
});

// 6. Diagnosis Payload Normalization
runTest('6. Diagnosis payload normalization', () => {
  assert(
    vetServiceSrc.includes('body.clinicalDiagnosis = String(payload.clinicalDiagnosis).trim()'),
    'clinicalDiagnosis must be string-trimmed before sending'
  );
});

// 7. Treatment Payload Normalization
runTest('7. Treatment payload normalization', () => {
  assert(
    vetServiceSrc.includes('body.treatmentNotes = String(payload.treatmentNotes).trim()'),
    'treatmentNotes must be string-trimmed before sending'
  );
});

// 8. Prescription Payload Normalization
runTest('8. Prescription payload normalization', () => {
  assert(
    vetServiceSrc.includes('body.prescription = String(payload.prescription).trim()'),
    'prescription must be string-trimmed before sending'
  );
});

// 9. Status Transition Handling & 5-Stage Lifecycle
runTest('9. Status transition handling supports 4 clinical target stages', () => {
  const stages = ['Investigating', 'Confirmed', 'Containment', 'Resolved'];
  for (const st of stages) {
    assert(
      vetTypesSrc.includes(`'${st}'`),
      `ClinicalStage type must include '${st}'`
    );
    assert(
      referralDetailSrc.includes(`id: '${st}'`),
      `Referral detail clinical stage selector must include '${st}'`
    );
  }
});

// 10. Conflict (409) and Authorization (403) Error Handling
runTest('10. Conflict (409) and Authorization (403) error handling', () => {
  assert(
    vetServiceSrc.includes('status === 403'),
    'Must detect 403 Forbidden status'
  );
  assert(
    vetServiceSrc.includes('status === 409'),
    'Must detect 409 Conflict status'
  );
  assert(
    vetServiceSrc.includes('Case was updated by another user'),
    'Must inform user when case is updated concurrently'
  );
});

// 11. AI Preliminary Screening Disclaimer Preservation
runTest('11. AI preliminary screening disclaimer preservation', () => {
  const disclaimer =
    'AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis.';
  assert(
    referralDetailSrc.includes(disclaimer),
    `Referral detail must preserve exact AI disclaimer: "${disclaimer}"`
  );
});

// 12. Timeline is Read from Server Response
runTest('12. Timeline is read from server response (zero local event fabrication)', () => {
  assert(
    referralDetailSrc.includes('caseItem.timeline.map('),
    'Timeline must map over caseItem.timeline'
  );
  assert(
    !referralDetailSrc.includes('caseItem.timeline.push'),
    'Must NOT fabricate or push timeline events locally'
  );
});

// 13. No Direct Supabase Mutation
runTest('13. No direct Supabase mutation in mobile clinical workflow', () => {
  assert(
    !referralDetailSrc.includes("supabase.from('disease_cases')"),
    'referrals/[id].tsx must NOT mutate disease_cases directly via Supabase'
  );
  assert(
    !vetServiceSrc.includes("supabase.from('disease_cases').update"),
    'veterinarianService must NOT mutate disease_cases directly via Supabase'
  );
});

// 14. Zero Exposed Secrets
runTest('14. Zero exposed secrets in Phase 9.2 files', () => {
  const filesToScan = [vetServiceSrc, referralDetailSrc, vetCasesSrc, vetTypesSrc];
  const secretPatterns = [
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SUPABASE_JWT_SECRET/i,
    /GEMINI_API_KEY/i,
  ];

  for (const src of filesToScan) {
    for (const pattern of secretPatterns) {
      assert(!pattern.test(src), `Secret pattern ${pattern} found!`);
    }
  }
});

// 15. Veterinarian Role Guard Remains Intact
runTest('15. Veterinarian role guard remains intact in root layout', () => {
  assert(
    rootLayoutSrc.includes("const isVet = role === 'veterinarian' || role === 'field_worker';"),
    'Root layout role guard must retain veterinarian/field_worker synonym'
  );
});

console.log('====================================================');
console.log(`📊 RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 9.2 VETERINARIAN CLINICAL WORKFLOW TESTS PASSED!\n');
  process.exit(0);
}
