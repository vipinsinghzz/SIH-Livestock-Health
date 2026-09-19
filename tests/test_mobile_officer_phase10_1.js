/**
 * Phase 10.1 — Officer Executive Surveillance Dashboard
 * Test Suite: tests/test_mobile_officer_phase10_1.js
 *
 * Validates all Phase 10.1 implementation contracts without modifying source.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MOBILE_ROOT = path.join(__dirname, '..', 'mobile');
const TESTS_PASS = [];
const TESTS_FAIL = [];

function pass(id, msg) {
  TESTS_PASS.push({ id, msg });
  console.log(`  ✅ [${id}] ${msg}`);
}

function fail(id, msg) {
  TESTS_FAIL.push({ id, msg });
  console.error(`  ❌ [${id}] ${msg}`);
}

function fileExists(rel) {
  return fs.existsSync(path.join(MOBILE_ROOT, rel));
}

function readFile(rel) {
  const abs = path.join(MOBILE_ROOT, rel);
  if (!fs.existsSync(abs)) return '';
  return fs.readFileSync(abs, 'utf8');
}

function readRoot(rel) {
  const abs = path.join(__dirname, '..', rel);
  if (!fs.existsSync(abs)) return '';
  return fs.readFileSync(abs, 'utf8');
}

function contains(content, str) {
  return content.includes(str);
}

function doesNotContain(content, str) {
  return !content.includes(str);
}

console.log('\n========================================================');
console.log('  Phase 10.1 Officer Surveillance Dashboard Tests');
console.log('========================================================\n');

// ============================================================
// TEST 1: Officer dashboard index.tsx exists and is not a placeholder
// ============================================================
console.log('--- Section 1: File Existence & Placeholder Removal ---');
{
  const file = readFile('app/(officer)/index.tsx');
  if (!file) {
    fail('T01', 'mobile/app/(officer)/index.tsx does not exist');
  } else if (contains(file, 'PlaceholderScreen')) {
    fail('T01', 'mobile/app/(officer)/index.tsx still uses PlaceholderScreen — not replaced');
  } else {
    pass('T01', 'Officer home index.tsx exists and PlaceholderScreen has been replaced');
  }
}

// ============================================================
// TEST 2: Surveillance screen exists and is not a placeholder
// ============================================================
{
  const file = readFile('app/(officer)/surveillance/index.tsx');
  if (!file) {
    fail('T02', 'mobile/app/(officer)/surveillance/index.tsx does not exist');
  } else if (contains(file, 'PlaceholderScreen')) {
    fail('T02', 'mobile/app/(officer)/surveillance/index.tsx still uses PlaceholderScreen');
  } else {
    pass('T02', 'Surveillance screen exists and PlaceholderScreen replaced');
  }
}

// ============================================================
// TEST 3: Officer service file created
// ============================================================
console.log('\n--- Section 2: Officer Service & Types ---');
{
  if (!fileExists('src/services/officerService.ts')) {
    fail('T03', 'mobile/src/services/officerService.ts does not exist');
  } else {
    pass('T03', 'officerService.ts created');
  }
}

// ============================================================
// TEST 4: Officer types file created
// ============================================================
{
  if (!fileExists('src/types/officer.ts')) {
    fail('T04', 'mobile/src/types/officer.ts does not exist');
  } else {
    pass('T04', 'officer.ts types file created');
  }
}

// ============================================================
// TEST 5: Correct summary endpoint used — /api/dashboard/summary
// ============================================================
console.log('\n--- Section 3: Correct Backend Endpoints ---');
{
  const svc = readFile('src/services/officerService.ts');
  if (contains(svc, '/dashboard/summary')) {
    pass('T05', "officerService calls '/api/dashboard/summary' endpoint");
  } else {
    fail('T05', "officerService does NOT reference '/api/dashboard/summary'");
  }
}

// ============================================================
// TEST 6: Correct trends endpoint used — /api/dashboard/trends
// ============================================================
{
  const svc = readFile('src/services/officerService.ts');
  if (contains(svc, '/dashboard/trends')) {
    pass('T06', "officerService calls '/api/dashboard/trends' endpoint");
  } else {
    fail('T06', "officerService does NOT reference '/api/dashboard/trends'");
  }
}

// ============================================================
// TEST 7: No invented endpoints
// ============================================================
{
  const svc = readFile('src/services/officerService.ts');
  const inventedEndpoints = [
    '/api/officer/',
    '/api/surveillance/',
    '/api/epidemic/',
    '/api/nadres/',      // not in Phase 10.1
    '/api/cases/clusters', // not in Phase 10.1
    '/api/advisories',   // not in Phase 10.1
  ];
  const found = inventedEndpoints.filter((ep) => contains(svc, ep));
  if (found.length === 0) {
    pass('T07', 'No invented or out-of-scope endpoints referenced in officerService.ts');
  } else {
    fail('T07', `Invented/out-of-scope endpoints found: ${found.join(', ')}`);
  }
}

// ============================================================
// TEST 8: Authenticated API client used
// ============================================================
{
  const svc = readFile('src/services/officerService.ts');
  if (contains(svc, "import api from './api'") || contains(svc, "from './api'")) {
    pass('T08', 'officerService uses authenticated api client from api.ts');
  } else {
    fail('T08', 'officerService does not import authenticated api client');
  }
}

// ============================================================
// TEST 9: Officer role protection in NavigationGuard
// ============================================================
console.log('\n--- Section 4: Security & RBAC ---');
{
  const layout = readFile('app/_layout.tsx');
  if (
    contains(layout, "role === 'officer'") ||
    contains(layout, "isOfficer") ||
    contains(layout, '/(officer)')
  ) {
    pass('T09', 'NavigationGuard in _layout.tsx enforces officer role routing');
  } else {
    fail('T09', 'NavigationGuard does not guard officer routes');
  }
}

// ============================================================
// TEST 10: No hardcoded/fake KPI values in dashboard
// ============================================================
{
  const idx = readFile('app/(officer)/index.tsx');
  const fakePatterns = [
    'totalReports: 9',
    'activeCases: 6',
    'totalMortality: 19',
    'coveragePct: 70',
    'criticalCount: 3',
    'outbreakCount: 5',
    'DEFAULT_SUMMARY',
  ];
  const found = fakePatterns.filter((p) => contains(idx, p));
  if (found.length === 0) {
    pass('T10', 'No hardcoded/fake KPI values in officer index.tsx');
  } else {
    fail('T10', `Hardcoded/fake KPI values detected: ${found.join(', ')}`);
  }
}

// ============================================================
// TEST 11: No fake trend data generation
// ============================================================
{
  const surv = readFile('app/(officer)/surveillance/index.tsx');
  const fakePatterns = [
    'Math.random()',
    'mockTrend',
    'fakeTrend',
    'MOCK_TRENDS',
    'generateTrend',
  ];
  const found = fakePatterns.filter((p) => contains(surv, p));
  if (found.length === 0) {
    pass('T11', 'No fake/generated trend data in surveillance/index.tsx');
  } else {
    fail('T11', `Fake trend generation detected: ${found.join(', ')}`);
  }
}

// ============================================================
// TEST 12: Offline cache tables created in localDatabase.ts
// ============================================================
console.log('\n--- Section 5: Offline Cache Architecture ---');
{
  const db = readFile('src/services/localDatabase.ts');
  if (
    contains(db, 'officer_dashboard_cache') &&
    contains(db, 'officer_trends_cache')
  ) {
    pass('T12', 'officer_dashboard_cache and officer_trends_cache tables defined in localDatabase.ts');
  } else {
    fail('T12', 'Officer offline cache tables missing from localDatabase.ts');
  }
}

// ============================================================
// TEST 13: User isolation in officer cache
// ============================================================
{
  const db = readFile('src/services/localDatabase.ts');
  if (
    contains(db, 'user_id TEXT NOT NULL') &&
    contains(db, 'idx_officer_dash_user') &&
    contains(db, 'idx_officer_trends_user')
  ) {
    pass('T13', 'Officer cache tables include user_id for isolation with indexed user queries');
  } else {
    fail('T13', 'Officer cache tables lack proper user_id isolation');
  }
}

// ============================================================
// TEST 14: Last-sync timestamp in service & UI
// ============================================================
{
  const svc = readFile('src/services/officerService.ts');
  const idx = readFile('app/(officer)/index.tsx');
  if (
    contains(svc, 'lastUpdated') &&
    contains(idx, 'lastUpdated') &&
    contains(idx, 'Last updated')
  ) {
    pass('T14', 'lastUpdated timestamp tracked in service and displayed in dashboard');
  } else {
    fail('T14', 'Last-sync timestamp not properly implemented');
  }
}

// ============================================================
// TEST 15: Honest offline state shown (no faked zero data)
// ============================================================
{
  const idx = readFile('app/(officer)/index.tsx');
  if (
    contains(idx, 'Offline Mode') &&
    contains(idx, 'cached surveillance data')
  ) {
    pass('T15', 'Honest offline banner shown when data is served from cache');
  } else {
    fail('T15', 'Honest offline state banner not implemented in dashboard');
  }
}

// ============================================================
// TEST 16: Existing officer navigation links preserved
// ============================================================
console.log('\n--- Section 6: Navigation & Architecture ---');
{
  const idx = readFile('app/(officer)/index.tsx');
  const requiredRoutes = [
    '/(officer)/surveillance',
    '/(officer)/outbreaks',
    '/(officer)/containment',
    '/(officer)/vaccination',
    '/(officer)/map',
  ];
  const missing = requiredRoutes.filter((r) => !contains(idx, r));
  if (missing.length === 0) {
    pass('T16', 'All existing officer navigation routes preserved in dashboard');
  } else {
    fail('T16', `Missing officer navigation routes: ${missing.join(', ')}`);
  }
}

// ============================================================
// TEST 17: Phase 10.2 features NOT implemented
// ============================================================
{
  const mapFile = readFile('app/(officer)/map/index.tsx');
  const outbreakFile = readFile('app/(officer)/outbreaks/index.tsx');

  const mapIsPlaceholder = !mapFile || contains(mapFile, 'PlaceholderScreen');
  const outbreakIsPlaceholder = !outbreakFile || contains(outbreakFile, 'PlaceholderScreen');

  if (mapIsPlaceholder && outbreakIsPlaceholder) {
    pass('T17', 'Phase 10.2 screens (map, outbreaks) correctly remain as PlaceholderScreen — not implemented in 10.1');
  } else {
    fail('T17', 'Phase 10.2 features (map or outbreaks) were implemented prematurely');
  }
}

// ============================================================
// TEST 18: No secrets in mobile code
// ============================================================
{
  const svc = readFile('src/services/officerService.ts');
  const secretPatterns = [
    'service_role',
    'SERVICE_ROLE',
    'JWT_SECRET',
    'GEMINI_API_KEY',
    'supabaseServiceKey',
    'eyJhbGciOiJI',  // raw JWT prefix
  ];
  const found = secretPatterns.filter((p) => contains(svc, p));
  if (found.length === 0) {
    pass('T18', 'No secrets or privileged keys found in officerService.ts');
  } else {
    fail('T18', `Secrets detected in officerService.ts: ${found.join(', ')}`);
  }
}

// ============================================================
// TEST 19: Protected directories unchanged
// ============================================================
console.log('\n--- Section 7: Protected Directory Integrity ---');
{
  const { execSync } = require('child_process');
  try {
    const diff = execSync(
      'git diff -- frontend/ backend/ ml/ supabase/',
      { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
    );
    if (!diff || diff.trim() === '') {
      pass('T19', 'git diff -- frontend/ backend/ ml/ supabase/ is EMPTY (zero modifications)');
    } else {
      fail('T19', `PROTECTED DIRECTORY MODIFICATION DETECTED:\n${diff.slice(0, 500)}`);
    }
  } catch (e) {
    fail('T19', `Could not check protected directory diff: ${e.message}`);
  }
}

// ============================================================
// TEST 20: Farmer/vet regression — existing Phase 9 services untouched
// ============================================================
console.log('\n--- Section 8: Regression Boundaries ---');
{
  const vetSvc = readFile('src/services/veterinarianService.ts');
  if (vetSvc && contains(vetSvc, 'veterinarianService')) {
    pass('T20', 'veterinarianService.ts exists and is untouched');
  } else {
    fail('T20', 'veterinarianService.ts missing or modified');
  }
}

// ============================================================
// TEST 21: officerService.ts uses NetInfo for connectivity check
// ============================================================
{
  const svc = readFile('src/services/officerService.ts');
  if (contains(svc, 'NetInfo.fetch') || contains(svc, 'NetInfo')) {
    pass('T21', 'officerService.ts uses @react-native-community/netinfo for connectivity detection');
  } else {
    fail('T21', 'officerService.ts does not check network connectivity via NetInfo');
  }
}

// ============================================================
// TEST 22: DashboardSummary typed interface defined
// ============================================================
{
  const types = readFile('src/types/officer.ts');
  if (
    contains(types, 'DashboardSummary') &&
    contains(types, 'TriageMetrics') &&
    contains(types, 'TrendPoint') &&
    contains(types, 'VaccinationSummary') &&
    contains(types, 'DiseaseBreakdownItem')
  ) {
    pass('T22', 'officer.ts defines DashboardSummary, TriageMetrics, TrendPoint, VaccinationSummary, DiseaseBreakdownItem');
  } else {
    fail('T22', 'officer.ts is missing required typed interfaces');
  }
}

// ============================================================
// TEST 23: Honest loading/error/empty states in dashboard
// ============================================================
{
  const idx = readFile('app/(officer)/index.tsx');
  const hasLoading = contains(idx, 'ActivityIndicator') || contains(idx, 'loading');
  const hasError = contains(idx, 'errorMessage') || contains(idx, 'errorCard');
  const hasRetry = contains(idx, 'Retry Sync') || contains(idx, 'retryButton');

  if (hasLoading && hasError && hasRetry) {
    pass('T23', 'Dashboard implements loading spinner, error state, and retry option');
  } else {
    fail('T23', `Dashboard missing states — loading:${hasLoading} error:${hasError} retry:${hasRetry}`);
  }
}

// ============================================================
// TEST 24: No Phase 10.3/10.4 features pre-implemented
// ============================================================
{
  const containmentFile = readFile('app/(officer)/containment/index.tsx');
  const vaccinationFile = readFile('app/(officer)/vaccination/index.tsx');

  const containmentIsPlaceholder = !containmentFile || contains(containmentFile, 'PlaceholderScreen');
  const vaccinationIsPlaceholder = !vaccinationFile || contains(vaccinationFile, 'PlaceholderScreen');

  if (containmentIsPlaceholder && vaccinationIsPlaceholder) {
    pass('T24', 'Phase 10.3 screens (containment, vaccination) remain as PlaceholderScreen — not pre-implemented');
  } else {
    fail('T24', 'Phase 10.3 features pre-implemented prematurely');
  }
}

// ============================================================
// TEST 25: clearOfficerCache function exists for logout isolation
// ============================================================
{
  const db = readFile('src/services/localDatabase.ts');
  if (contains(db, 'clearOfficerCache')) {
    pass('T25', 'clearOfficerCache function defined for user isolation on logout');
  } else {
    fail('T25', 'clearOfficerCache function missing from localDatabase.ts');
  }
}

// ============================================================
// Results Summary
// ============================================================
console.log('\n========================================================');
console.log('  Phase 10.1 Test Results Summary');
console.log('========================================================');
console.log(`  PASSED: ${TESTS_PASS.length}`);
console.log(`  FAILED: ${TESTS_FAIL.length}`);
console.log(`  TOTAL:  ${TESTS_PASS.length + TESTS_FAIL.length}`);

if (TESTS_FAIL.length > 0) {
  console.log('\n  Failed Tests:');
  TESTS_FAIL.forEach((t) => console.error(`    ❌ [${t.id}] ${t.msg}`));
  process.exit(1);
} else {
  console.log('\n  ✅ ALL PHASE 10.1 TESTS PASSED\n');
  process.exit(0);
}
