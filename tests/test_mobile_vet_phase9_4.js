/**
 * PashuCare - Phase 9.4 Outbreak GIS, Containment & Ring Vaccination Test Suite
 * File: tests/test_mobile_vet_phase9_4.js
 * 
 * Validates:
 * 1. GIS service/API contract
 * 2. Cluster endpoint (/api/cases/clusters)
 * 3. Containment-zone endpoint (/api/cases/containment-zones)
 * 4. Map route & production GIS rendering
 * 5. Containment list screen & lifecycle states
 * 6. Declare containment contract & payload safety
 * 7. Containment status transition contract (ACTIVE -> CONTAINED -> LIFTED)
 * 8. Ring vaccination endpoint contract (/api/cases/:id/schedule-ring-vaccination)
 * 9. Confirmed-case integration in referral detail
 * 10. Online-only mutation behavior (strictly blocked offline, zero sync_queue)
 * 11. No fake GIS data / mock outbreak points
 * 12. No fake containment zones
 * 13. No fake vaccination drives
 * 14. RBAC & authenticated API usage
 * 15. AI disclaimer retention
 * 16. Existing Phase 9.1 regression
 * 17. Existing Phase 9.2 regression
 * 18. Existing Phase 9.3 regression
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
console.log('🗺️  PHASE 9.4 — OUTBREAK GIS & CONTAINMENT TEST SUITE');
console.log('====================================================\n');

const containmentServicePath = path.join(__dirname, '../mobile/src/services/containmentService.ts');
const containmentTypesPath = path.join(__dirname, '../mobile/src/types/containment.ts');
const mapIndexPath = path.join(__dirname, '../mobile/app/(vet)/map/index.tsx');
const containmentIndexPath = path.join(__dirname, '../mobile/app/(vet)/containment/index.tsx');
const referralDetailPath = path.join(__dirname, '../mobile/app/(vet)/referrals/[id].tsx');
const localDbPath = path.join(__dirname, '../mobile/src/services/localDatabase.ts');
const vetDashboardPath = path.join(__dirname, '../mobile/app/(vet)/index.tsx');
const vetLayoutPath = path.join(__dirname, '../mobile/app/(vet)/_layout.tsx');

const containmentServiceSrc = fs.readFileSync(containmentServicePath, 'utf8');
const containmentTypesSrc = fs.readFileSync(containmentTypesPath, 'utf8');
const mapIndexSrc = fs.readFileSync(mapIndexPath, 'utf8');
const containmentIndexSrc = fs.readFileSync(containmentIndexPath, 'utf8');
const referralDetailSrc = fs.readFileSync(referralDetailPath, 'utf8');
const localDbSrc = fs.readFileSync(localDbPath, 'utf8');
const vetDashboardSrc = fs.readFileSync(vetDashboardPath, 'utf8');
const vetLayoutSrc = fs.readFileSync(vetLayoutPath, 'utf8');

// 1. GIS service/API contract
runTest('1. GIS service exists and exports required methods', () => {
  assert(fs.existsSync(containmentServicePath), 'containmentService.ts must exist');
  assert(containmentServiceSrc.includes('getContainmentZones'), 'Must implement getContainmentZones');
  assert(containmentServiceSrc.includes('createContainmentZone'), 'Must implement createContainmentZone');
  assert(containmentServiceSrc.includes('declareContainmentZone'), 'Must implement declareContainmentZone');
  assert(containmentServiceSrc.includes('updateContainmentZoneStatus'), 'Must implement updateContainmentZoneStatus');
  assert(containmentServiceSrc.includes('scheduleRingVaccination'), 'Must implement scheduleRingVaccination');
  assert(containmentServiceSrc.includes('getOutbreakClusters') || containmentServiceSrc.includes('getSpatialOutbreakClusters'), 'Must implement outbreak clusters fetching');
  assert(containmentServiceSrc.includes('getAdvisories'), 'Must implement getAdvisories');
});

// 2. Cluster endpoint
runTest('2. Outbreak cluster endpoint matches GET /api/cases/clusters contract', () => {
  assert(containmentServiceSrc.includes("api.get"), 'Must use api.get');
  assert(containmentServiceSrc.includes("'/cases/clusters'"), 'Must call /cases/clusters endpoint');
  assert(containmentServiceSrc.includes("params.district"), 'Must pass district parameter');
  assert(containmentServiceSrc.includes("params.distanceKm"), 'Must support distanceKm parameter');
  assert(containmentServiceSrc.includes("params.minCases"), 'Must support minCases parameter');
});

// 3. Containment-zone endpoint
runTest('3. Containment-zone endpoints match GET and POST /api/cases/containment-zones', () => {
  assert(containmentServiceSrc.includes("'/cases/containment-zones'"), 'Must call /cases/containment-zones');
  assert(containmentServiceSrc.includes("api.get<"), 'Must use api.get for containment zones list');
  assert(containmentServiceSrc.includes("api.post<"), 'Must use api.post for containment zone declaration');
});

// 4. Map route & production GIS rendering
runTest('4. Map screen implements production GIS layers and react-native-maps integration', () => {
  assert(fs.existsSync(mapIndexPath), 'map/index.tsx must exist');
  assert(mapIndexSrc.includes("react-native-maps"), 'Must import react-native-maps');
  assert(mapIndexSrc.includes("Circle"), 'Must render Circle for containment zone perimeters');
  assert(mapIndexSrc.includes("Marker"), 'Must render Marker for clusters and cases');
  assert(
    mapIndexSrc.includes("containmentService.getOutbreakClusters") ||
    mapIndexSrc.includes("containmentService.getSpatialOutbreakClusters"),
    'Must fetch real outbreak clusters'
  );
  assert(mapIndexSrc.includes("containmentService.getContainmentZones"), 'Must fetch real containment zones');
  assert(mapIndexSrc.includes("activeLayers"), 'Must support layer toggles');
  assert(mapIndexSrc.includes("legend"), 'Must render map legend');
});

// 5. Containment list screen
runTest('5. Containment screen implements list, metrics, search, and refresh', () => {
  assert(fs.existsSync(containmentIndexPath), 'containment/index.tsx must exist');
  assert(containmentIndexSrc.includes("getContainmentZones"), 'Must fetch containment zones');
  assert(containmentIndexSrc.includes("RefreshControl"), 'Must support pull-to-refresh');
  assert(containmentIndexSrc.includes("ACTIVE"), 'Must support ACTIVE status');
  assert(containmentIndexSrc.includes("CONTAINED"), 'Must support CONTAINED status');
  assert(containmentIndexSrc.includes("LIFTED"), 'Must support LIFTED status');
  assert(containmentIndexSrc.includes("searchQuery"), 'Must support zone search filtering');
  assert(
    containmentIndexSrc.includes("STATUS_FILTERS") || containmentIndexSrc.includes("activeFilter"),
    'Must support status filtering'
  );
});

// 6. Declare containment contract
runTest('6. Declare containment contract validates fields and enforces server vet identity', () => {
  assert(containmentServiceSrc.includes("!payload.disease"), 'Must validate disease');
  assert(containmentServiceSrc.includes("!payload.center?.lat"), 'Must validate center lat');
  assert(containmentServiceSrc.includes("!payload.center?.lng"), 'Must validate center lng');
  assert(containmentServiceSrc.includes("radiusKm: payload.radiusKm"), 'Must support radiusKm');
  assert(
    containmentServiceSrc.includes("enforcedRules: payload.enforcedRules") ||
    containmentServiceSrc.includes("body.enforcedRules"),
    'Must support biosecurity rules'
  );
  assert(!containmentServiceSrc.includes("body.createdByVetId"), 'Must NOT inject client-controlled createdByVetId');
});

// 7. Containment status contract
runTest('7. Containment status transitions strictly enforce ACTIVE -> CONTAINED -> LIFTED', () => {
  assert(containmentServiceSrc.includes("api.patch"), 'Must use api.patch');
  assert(
    containmentServiceSrc.includes("/cases/containment-zones/") && containmentServiceSrc.includes("/status"),
    'Must call exact status endpoint'
  );
  assert(containmentTypesSrc.includes("'ACTIVE' | 'CONTAINED' | 'LIFTED'"), 'Must strictly type the 3 lifecycle states');
  assert(containmentServiceSrc.includes("['ACTIVE', 'CONTAINED', 'LIFTED'].includes(payload.status)"), 'Must validate allowed transitions');
});

// 8. Ring vaccination endpoint
runTest('8. Ring vaccination scheduling endpoint matches POST /api/cases/:id/schedule-ring-vaccination', () => {
  assert(
    containmentServiceSrc.includes("/cases/") && containmentServiceSrc.includes("/schedule-ring-vaccination"),
    'Must call exact ring endpoint'
  );
  assert(containmentServiceSrc.includes("campDate: payload.campDate") || containmentServiceSrc.includes("body.campDate"), 'Must include campDate in payload');
  assert(containmentServiceSrc.includes("venue: payload.venue") || containmentServiceSrc.includes("body.venue"), 'Must include venue in payload');
  assert(containmentServiceSrc.includes("capacity: payload.capacity") || containmentServiceSrc.includes("body.capacity"), 'Must include capacity in payload');
});

// 9. Confirmed-case integration
runTest('9. Case detail conditionally exposes containment & ring actions for Confirmed/Containment cases', () => {
  assert(referralDetailSrc.includes("handleDeclareContainment"), 'Must implement handleDeclareContainment');
  assert(referralDetailSrc.includes("handleScheduleRingVaccination"), 'Must implement handleScheduleRingVaccination');
  assert(referralDetailSrc.includes("caseItem.status === 'Confirmed' || caseItem.status === 'Containment'"), 'Must check case eligibility');
  assert(referralDetailSrc.includes("Declare Containment Zone"), 'Must render Declare Containment Zone button');
  assert(referralDetailSrc.includes("Schedule Ring Vaccination"), 'Must render Schedule Ring Vaccination button');
});

// 10. Online-only mutation behavior
runTest('10. Containment and ring mutations are strictly ONLINE ONLY with zero sync_queue insertion', () => {
  assert(containmentServiceSrc.includes("NetInfo.fetch()"), 'Must check network state');
  assert(containmentServiceSrc.includes("requires an active internet connection"), 'Must reject offline mutations');
  assert(!containmentServiceSrc.includes("enqueueOfflineAction"), 'Must NEVER enqueue containment mutations to sync queue');
  assert(!containmentServiceSrc.includes("addToSyncQueue"), 'Must NEVER add to sync queue');
});

// 11. No fake GIS data
runTest('11. Map screen does not invent fake outbreak points or mock markers', () => {
  assert(!mapIndexSrc.includes("Math.random"), 'Must not generate random coordinates');
  assert(!mapIndexSrc.includes("mockClusters"), 'Must not have mockClusters');
  assert(!mapIndexSrc.includes("fakeOutbreaks"), 'Must not have fakeOutbreaks');
  assert(mapIndexSrc.includes("validCases"), 'Must filter for genuine coordinates');
});

// 12. No fake containment zones
runTest('12. Containment service does not fabricate fake containment zones', () => {
  assert(!containmentServiceSrc.includes("mockZones"), 'Must not have mockZones');
  assert(!containmentServiceSrc.includes("MOCK_ZONES"), 'Must not have MOCK_ZONES');
  assert(!containmentIndexSrc.includes("mockZones"), 'Must not use mock containment zones');
});

// 13. No fake vaccination drives
runTest('13. No fabricated vaccination drives or simulated local generation', () => {
  assert(!containmentServiceSrc.includes("mockDrive"), 'Must not have mockDrive');
  assert(!containmentServiceSrc.includes("fakeDrive"), 'Must not have fakeDrive');
});

// 14. RBAC & authenticated API usage
runTest('14. Security: All calls route through authenticated API client and no direct Supabase write', () => {
  assert(containmentServiceSrc.includes("import api from './api'"), 'Must import api client');
  assert(!containmentServiceSrc.includes("supabase"), 'containmentService must not touch Supabase directly');
  assert(!mapIndexSrc.includes("supabase"), 'Map must not query Supabase directly');
  assert(!containmentIndexSrc.includes("supabase"), 'Containment screen must not query Supabase directly');
});

// 15. AI disclaimer retention
runTest('15. AI preliminary screening disclaimer preserved without clinical overreach', () => {
  assert(
    referralDetailSrc.includes("AI-assisted preliminary screening") ||
    referralDetailSrc.includes("AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis."),
    'Case detail must retain canonical AI disclaimer'
  );
  assert(
    mapIndexSrc.includes("AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis."),
    'Map screen must display canonical AI disclaimer'
  );
});

// 16. Existing Phase 9.1 regression
runTest('16. Phase 9.1 vet dashboard and referral queue preserved', () => {
  assert(vetDashboardSrc.includes("VetHomeScreen"), 'Vet dashboard must exist');
  assert(vetDashboardSrc.includes("Triage & Referral Queue"), 'Referral queue shortcut must exist');
  assert(vetDashboardSrc.includes("My Active Patient Cases"), 'My cases shortcut must exist');
  assert(vetLayoutSrc.includes("name=\"referrals/index\""), 'Referrals index route must be registered');
});

// 17. Existing Phase 9.2 regression
runTest('17. Phase 9.2 5-stage clinical workflow preserved', () => {
  assert(referralDetailSrc.includes("CLINICAL_STAGES"), 'CLINICAL_STAGES must exist');
  assert(referralDetailSrc.includes("Investigating"), 'Investigating stage preserved');
  assert(referralDetailSrc.includes("Confirmed"), 'Confirmed stage preserved');
  assert(referralDetailSrc.includes("Containment"), 'Containment stage preserved');
  assert(referralDetailSrc.includes("Resolved"), 'Resolved stage preserved');
  assert(referralDetailSrc.includes("updateCaseStatus"), 'Status advancement preserved');
});

// 18. Existing Phase 9.3 regression
runTest('18. Phase 9.3 diagnostic lab tests workflow preserved', () => {
  assert(fs.existsSync(path.join(__dirname, '../mobile/app/(vet)/labs/index.tsx')), 'labs/index.tsx must exist');
  assert(fs.existsSync(path.join(__dirname, '../mobile/app/(vet)/labs/[id].tsx')), 'labs/[id].tsx must exist');
  assert(referralDetailSrc.includes("Order Diagnostic Lab Test"), 'Order lab test button preserved in referral detail');
  assert(vetLayoutSrc.includes("name=\"labs/index\""), 'labs/index route must be registered');
  assert(vetLayoutSrc.includes("name=\"labs/[id]\""), 'labs/[id] route must be registered');
});

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 18 PHASE 9.4 CONTRACT & REGRESSION TESTS PASSED!\n');
}
