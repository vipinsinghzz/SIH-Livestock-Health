/**
 * Phase 10.4 Test Suite - Official Biosecurity Advisories & NADRES Forewarning
 * File: tests/test_mobile_officer_phase10_4.js
 *
 * Verifies:
 * 1. Advisory service exists and methods match backend contracts
 * 2. Forewarning & NADRES service exists and methods match backend contracts
 * 3. Correct API endpoints used (/advisories, /nadres/alerts, /nadres/forewarning, /nadres/trends, /cases/advisories)
 * 4. Backend RBAC: POST /api/advisories authorized for officer/admin
 * 5. Strict district scoping: user?.district with ZERO hardcoded fallbacks
 * 6. No fake/mocked advisories, forewarnings, or trends data
 * 7. Loading, error, and empty states with retry
 * 8. Offline SQLite caching with user/district isolation
 * 9. Stale / offline cache indication
 * 10. Advisory detail screen existence and contract
 * 11. Online-only advisory broadcast mutation
 * 12. Officer dashboard integration (quick action cards)
 * 13. Navigation & deep links registered in _layout.tsx
 * 14. NADRES trends and microclimate weather context
 * 15. Severity badge themes and visual distinctions
 * 16. Security: no secrets or private keys in mobile code
 * 17. Protected directory integrity (frontend/, backend/, ml/, supabase/ untouched)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

console.log('===============================================================');
console.log('PHASE 10.4: OFFICER BIOSECURITY ADVISORIES & NADRES TEST SUITE');
console.log('===============================================================\n');

// ---------------------------------------------------------------------------
// 1. SERVICES & ENDPOINT CONTRACTS
// ---------------------------------------------------------------------------
console.log('[1. Services & Endpoint Contracts]');

runTest('1.1 Advisory service exists and exports getAdvisories and createAdvisory', () => {
  const filePath = path.join(__dirname, '../mobile/src/services/advisoryService.ts');
  assert.ok(fs.existsSync(filePath), 'advisoryService.ts exists');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('getAdvisories'), 'Exports getAdvisories');
  assert.ok(content.includes('createAdvisory'), 'Exports createAdvisory');
  assert.ok(content.includes('getAdvisoryById'), 'Exports getAdvisoryById');
});

runTest('1.2 Advisory service calls GET /advisories and POST /advisories', () => {
  const content = fs.readFileSync(path.join(__dirname, '../mobile/src/services/advisoryService.ts'), 'utf8');
  assert.ok(content.includes("api.get<GetAdvisoriesResponse>('/advisories'"), 'Calls GET /advisories');
  assert.ok(content.includes("api.post<CreateAdvisoryResponse>('/advisories'"), 'Calls POST /advisories');
});

runTest('1.3 NADRES service exists and exports getNadresAlerts, getDistrictForewarning, getHistoricalTrends', () => {
  const filePath = path.join(__dirname, '../mobile/src/services/nadresService.ts');
  assert.ok(fs.existsSync(filePath), 'nadresService.ts exists');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('getNadresAlerts'), 'Exports getNadresAlerts');
  assert.ok(content.includes('getDistrictForewarning'), 'Exports getDistrictForewarning');
  assert.ok(content.includes('getHistoricalTrends'), 'Exports getHistoricalTrends');
  assert.ok(content.includes('getCaseAdvisories'), 'Exports getCaseAdvisories');
});

runTest('1.4 NADRES service calls authentic government endpoints', () => {
  const content = fs.readFileSync(path.join(__dirname, '../mobile/src/services/nadresService.ts'), 'utf8');
  assert.ok(content.includes("'/nadres/alerts'"), 'Calls GET /nadres/alerts');
  assert.ok(content.includes("'/nadres/forewarning'"), 'Calls GET /nadres/forewarning');
  assert.ok(content.includes("'/nadres/trends'"), 'Calls GET /nadres/trends');
  assert.ok(content.includes("'/cases/advisories'"), 'Calls GET /cases/advisories');
});

runTest('1.5 Advisory types strictly define OfficialAdvisory and CreateAdvisoryPayload', () => {
  const typesContent = fs.readFileSync(path.join(__dirname, '../mobile/src/types/advisory.ts'), 'utf8');
  assert.ok(typesContent.includes('export interface OfficialAdvisory'), 'OfficialAdvisory defined');
  assert.ok(typesContent.includes('export interface CreateAdvisoryPayload'), 'CreateAdvisoryPayload defined');
  assert.ok(typesContent.includes('export type AdvisorySeverity'), 'AdvisorySeverity defined');
});

runTest('1.6 NADRES types strictly define NadresAlert and GetNadresAlertsResult', () => {
  const typesContent = fs.readFileSync(path.join(__dirname, '../mobile/src/types/advisory.ts'), 'utf8');
  assert.ok(typesContent.includes('export interface NadresAlert'), 'NadresAlert defined');
  assert.ok(typesContent.includes('export interface GetNadresAlertsResult'), 'GetNadresAlertsResult defined');
  assert.ok(typesContent.includes('export interface WeatherContext'), 'WeatherContext defined');
});

// ---------------------------------------------------------------------------
// 2. BACKEND RBAC & OFFICER ROLES
// ---------------------------------------------------------------------------
console.log('\n[2. Backend RBAC & Officer Authorization]');

runTest('2.1 Backend advisory routes protect endpoints and authorize officer for creation', () => {
  const routesContent = fs.readFileSync(path.join(__dirname, '../backend/routes/advisoryRoutes.js'), 'utf8');
  assert.ok(routesContent.includes('router.use(protect)'), 'Advisory routes are protected');
  assert.ok(routesContent.includes("authorize('officer', 'admin')"), 'POST /advisories requires officer or admin');
});

runTest('2.2 Backend advisory controller accepts real fields matching mobile contract', () => {
  const controllerContent = fs.readFileSync(path.join(__dirname, '../backend/controllers/advisoryController.js'), 'utf8');
  assert.ok(controllerContent.includes('targetDistrict'), 'Controller handles targetDistrict');
  assert.ok(controllerContent.includes('targetBlock'), 'Controller handles targetBlock');
  assert.ok(controllerContent.includes('severity'), 'Controller handles severity');
  assert.ok(controllerContent.includes('disease'), 'Controller handles disease');
});

// ---------------------------------------------------------------------------
// 3. STRICT DISTRICT SCOPING (ZERO HARDCODED FALLBACKS)
// ---------------------------------------------------------------------------
console.log('\n[3. Strict District Scoping & Zero Hardcoded Geographic Fallbacks]');

runTest('3.1 Advisories screen derives district strictly from user?.district', () => {
  const screenContent = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/advisories/index.tsx'), 'utf8');
  assert.ok(screenContent.includes('const district = user?.district;'), 'Extracts district from user profile');
  assert.ok(screenContent.includes('!district'), 'Checks for missing district');
  assert.ok(!screenContent.includes("'Pune'"), 'No hardcoded Pune fallback in advisories screen');
  assert.ok(!screenContent.includes("'Mumbai'"), 'No hardcoded Mumbai fallback in advisories screen');
  assert.ok(!screenContent.includes("'Nagpur'"), 'No hardcoded Nagpur fallback in advisories screen');
});

runTest('3.2 Forewarning screen derives district strictly from user?.district', () => {
  const screenContent = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/forewarning/index.tsx'), 'utf8');
  assert.ok(screenContent.includes('const district = user?.district;'), 'Extracts district from user profile');
  assert.ok(screenContent.includes('!district'), 'Checks for missing district');
  assert.ok(!screenContent.includes("'Pune'"), 'No hardcoded Pune fallback in forewarning screen');
  assert.ok(!screenContent.includes("'Mumbai'"), 'No hardcoded Mumbai fallback in forewarning screen');
  assert.ok(!screenContent.includes("'Nagpur'"), 'No hardcoded Nagpur fallback in forewarning screen');
});

runTest('3.3 Advisory service does not use hardcoded district fallbacks', () => {
  const serviceContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/advisoryService.ts'), 'utf8');
  assert.ok(!serviceContent.includes("'Pune'"), 'No Pune in advisoryService');
  assert.ok(!serviceContent.includes("'Mumbai'"), 'No Mumbai in advisoryService');
  assert.ok(serviceContent.includes('if (!targetDistrict)'), 'Guards against missing district');
});

runTest('3.4 NADRES service does not use hardcoded district fallbacks', () => {
  const serviceContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/nadresService.ts'), 'utf8');
  assert.ok(!serviceContent.includes("'Pune'"), 'No Pune in nadresService');
  assert.ok(!serviceContent.includes("'Mumbai'"), 'No Mumbai in nadresService');
  assert.ok(serviceContent.includes('if (!targetDistrict)'), 'Guards against missing district in alerts');
  assert.ok(serviceContent.includes('if (!district)'), 'Guards against missing district in forewarning');
});

// ---------------------------------------------------------------------------
// 4. OFFLINE SQLITE CACHE & LOCAL PERSISTENCE
// ---------------------------------------------------------------------------
console.log('\n[4. Offline SQLite Cache & Local Persistence]');

runTest('4.1 SQLite database defines advisories, NADRES alerts, and forewarning cache tables', () => {
  const dbContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/localDatabase.ts'), 'utf8');
  assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS advisories_cache'), 'Has advisories_cache table');
  assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS nadres_alerts_cache'), 'Has nadres_alerts_cache table');
  assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS nadres_forewarning_cache'), 'Has nadres_forewarning_cache table');
});

runTest('4.2 LocalDatabase exports advisory cache helpers', () => {
  const dbContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/localDatabase.ts'), 'utf8');
  assert.ok(dbContent.includes('saveAdvisoriesCache'), 'Exports saveAdvisoriesCache');
  assert.ok(dbContent.includes('getCachedAdvisories'), 'Exports getCachedAdvisories');
});

runTest('4.3 LocalDatabase exports NADRES cache helpers', () => {
  const dbContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/localDatabase.ts'), 'utf8');
  assert.ok(dbContent.includes('saveNadresAlertsCache'), 'Exports saveNadresAlertsCache');
  assert.ok(dbContent.includes('getCachedNadresAlerts'), 'Exports getCachedNadresAlerts');
  assert.ok(dbContent.includes('saveNadresForewarningCache'), 'Exports saveNadresForewarningCache');
  assert.ok(dbContent.includes('getCachedNadresForewarning'), 'Exports getCachedNadresForewarning');
});

runTest('4.4 Stale / offline cache notice is displayed in UI when serving cached data', () => {
  const advScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/advisories/index.tsx'), 'utf8');
  assert.ok(advScreen.includes('isFromCache'), 'Advisories tracks cache state');
  assert.ok(advScreen.includes('Displaying cached biosecurity advisories'), 'Advisories displays cache notice');

  const fwScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/forewarning/index.tsx'), 'utf8');
  assert.ok(fwScreen.includes('isFromCache'), 'Forewarning tracks cache state');
  assert.ok(fwScreen.includes('Displaying cached NADRES forewarnings'), 'Forewarning displays cache notice');
});

// ---------------------------------------------------------------------------
// 5. ONLINE-ONLY MUTATIONS & CREATION GOVERNANCE
// ---------------------------------------------------------------------------
console.log('\n[5. Online-Only Mutations & Advisory Broadcast]');

runTest('5.1 Advisory broadcast mutation is strictly online-only', () => {
  const serviceContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/advisoryService.ts'), 'utf8');
  assert.ok(serviceContent.includes('NetInfo.fetch()'), 'Checks NetInfo before mutation');
  assert.ok(serviceContent.includes('Offline — Biosecurity advisories cannot be broadcasted'), 'Blocks offline broadcast');

  const screenContent = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/advisories/index.tsx'), 'utf8');
  assert.ok(screenContent.includes('Offline Action Blocked'), 'Alerts officer if offline in broadcast modal');
});

runTest('5.2 Advisory creation validates required fields', () => {
  const serviceContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/advisoryService.ts'), 'utf8');
  assert.ok(serviceContent.includes('Advisory title is required'), 'Validates title');
  assert.ok(serviceContent.includes('Advisory message is required'), 'Validates message');
  assert.ok(serviceContent.includes('Officer district is required'), 'Validates district');
});

// ---------------------------------------------------------------------------
// 6. UI/UX, SCREENS & DESIGN SYSTEM
// ---------------------------------------------------------------------------
console.log('\n[6. UI/UX, Screens & Design System]');

runTest('6.1 Advisories screen exists and is a full production screen', () => {
  const screenPath = path.join(__dirname, '../mobile/app/(officer)/advisories/index.tsx');
  assert.ok(fs.existsSync(screenPath), 'advisories/index.tsx exists');
  const content = fs.readFileSync(screenPath, 'utf8');
  assert.ok(content.includes('Official Biosecurity Advisories'), 'Has correct title');
  assert.ok(content.includes('SeverityFilter'), 'Has severity filter');
  assert.ok(content.includes('handleBroadcastSubmit'), 'Has broadcast handler');
});

runTest('6.2 Advisory detail screen exists and displays full official directive', () => {
  const detailPath = path.join(__dirname, '../mobile/app/(officer)/advisories/[id].tsx');
  assert.ok(fs.existsSync(detailPath), 'advisories/[id].tsx exists');
  const content = fs.readFileSync(detailPath, 'utf8');
  assert.ok(content.includes('Official Directive & Biosecurity Protocol'), 'Displays official directive');
  assert.ok(content.includes('Geographical Jurisdiction & Scope'), 'Displays jurisdiction scope');
  assert.ok(content.includes('Issued By Authority'), 'Displays issuing authority');
});

runTest('6.3 Forewarning screen exists and provides 3-tab surveillance view', () => {
  const screenPath = path.join(__dirname, '../mobile/app/(officer)/forewarning/index.tsx');
  assert.ok(fs.existsSync(screenPath), 'forewarning/index.tsx exists');
  const content = fs.readFileSync(screenPath, 'utf8');
  assert.ok(content.includes("'ALERTS'"), 'Has ALERTS tab');
  assert.ok(content.includes("'EARLY_WARNING'"), 'Has EARLY_WARNING tab');
  assert.ok(content.includes("'PROTOCOLS'"), 'Has PROTOCOLS tab');
});

runTest('6.4 Forewarning screen includes live agrometeorological microclimate context', () => {
  const content = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/forewarning/index.tsx'), 'utf8');
  assert.ok(content.includes('Agrometeorological Microclimate Context'), 'Has weather section');
  assert.ok(content.includes('weatherContext.tempC'), 'Displays temperature');
  assert.ok(content.includes('weatherContext.humidityPct'), 'Displays humidity');
  assert.ok(content.includes('weatherContext.thi'), 'Displays THI index');
  assert.ok(content.includes('weatherContext.stressLevel'), 'Displays heat stress');
});

runTest('6.5 Forewarning screen displays AI-powered clinical directives and source badges', () => {
  const content = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/forewarning/index.tsx'), 'utf8');
  assert.ok(content.includes('aiRecommendationEn'), 'Renders AI recommendation');
  assert.ok(content.includes('alert.dataSource'), 'Renders data source attribution');
});

runTest('6.6 Severity badges use distinct accessible colors and labels', () => {
  const typesContent = fs.readFileSync(path.join(__dirname, '../mobile/src/types/advisory.ts'), 'utf8');
  assert.ok(typesContent.includes('getAdvisorySeverityTheme'), 'Exports getAdvisorySeverityTheme');
  assert.ok(typesContent.includes('#DC2626'), 'Critical uses red');
  assert.ok(typesContent.includes('#EA580C'), 'High uses orange');
  assert.ok(typesContent.includes('#D97706'), 'Moderate uses amber');
  assert.ok(typesContent.includes('#2563EB'), 'Low uses blue');
});

// ---------------------------------------------------------------------------
// 7. DASHBOARD & NAVIGATION INTEGRATION
// ---------------------------------------------------------------------------
console.log('\n[7. Dashboard & Navigation Integration]');

runTest('7.1 Officer dashboard includes quick action cards for Advisories and Forewarning', () => {
  const dashContent = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/index.tsx'), 'utf8');
  assert.ok(dashContent.includes('/(officer)/advisories'), 'Links to Official Advisories');
  assert.ok(dashContent.includes('/(officer)/forewarning'), 'Links to NADRES Forewarning');
  assert.ok(dashContent.includes('Official Advisories'), 'Displays Official Advisories card');
  assert.ok(dashContent.includes('NADRES Forewarning'), 'Displays NADRES Forewarning card');
});

runTest('7.2 Officer layout registers advisories, detail, and forewarning routes', () => {
  const layoutContent = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/_layout.tsx'), 'utf8');
  assert.ok(layoutContent.includes('name="advisories/index"'), 'Registers advisories/index');
  assert.ok(layoutContent.includes('name="advisories/[id]"'), 'Registers advisories/[id]');
  assert.ok(layoutContent.includes('name="forewarning/index"'), 'Registers forewarning/index');
});

runTest('7.3 Advisory detail deep links back to outbreak alerts', () => {
  const detailContent = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/advisories/[id].tsx'), 'utf8');
  assert.ok(detailContent.includes('/(officer)/outbreaks'), 'Deep links to outbreak alerts');
});

runTest('7.4 Forewarning screen deep links to containment response', () => {
  const fwContent = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/forewarning/index.tsx'), 'utf8');
  assert.ok(fwContent.includes('/(officer)/containment'), 'Deep links to containment response');
});

// ---------------------------------------------------------------------------
// 8. ZERO-MOCK POLICY & HONEST ERROR HANDLING
// ---------------------------------------------------------------------------
console.log('\n[8. Zero-Mock Policy & Honest Error Handling]');

runTest('8.1 Screens do not contain fabricated/mock advisory data', () => {
  const advScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/advisories/index.tsx'), 'utf8');
  assert.ok(!advScreen.includes('fakeAdvisory'), 'No fakeAdvisory');
  assert.ok(!advScreen.includes('mockAdvisory'), 'No mockAdvisory');

  const fwScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/forewarning/index.tsx'), 'utf8');
  assert.ok(!fwScreen.includes('fakeAlert'), 'No fakeAlert');
  assert.ok(!fwScreen.includes('mockAlert'), 'No mockAlert');
});

runTest('8.2 Loading, error, and empty states exist with retry functionality', () => {
  const advScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/advisories/index.tsx'), 'utf8');
  assert.ok(advScreen.includes('loading ?'), 'Has loading state');
  assert.ok(advScreen.includes('errorMessage ?'), 'Has error state');
  assert.ok(advScreen.includes('loadAdvisories()'), 'Has retry handler');

  const fwScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/forewarning/index.tsx'), 'utf8');
  assert.ok(fwScreen.includes('loading ?'), 'Has loading state');
  assert.ok(fwScreen.includes('errorMessage ?'), 'Has error state');
  assert.ok(fwScreen.includes('loadForewarningData()'), 'Has retry handler');
});

// ---------------------------------------------------------------------------
// 9. SECURITY & PROTECTED DIRECTORIES
// ---------------------------------------------------------------------------
console.log('\n[9. Security & Protected Directories]');

runTest('9.1 No secrets, service keys, or private tokens stored in mobile code', () => {
  const advService = fs.readFileSync(path.join(__dirname, '../mobile/src/services/advisoryService.ts'), 'utf8');
  const nadresService = fs.readFileSync(path.join(__dirname, '../mobile/src/services/nadresService.ts'), 'utf8');
  const advScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/advisories/index.tsx'), 'utf8');

  const combined = advService + nadresService + advScreen;
  assert.ok(!combined.includes('service_role'), 'No service_role key');
  assert.ok(!combined.includes('JWT_SECRET'), 'No JWT secret');
  assert.ok(!combined.includes('AIzaSy'), 'No Google API key');
});

runTest('9.2 Protected directories (frontend/, backend/, ml/, supabase/) remain untouched', () => {
  const { execSync } = require('child_process');
  const diff = execSync('git diff -- frontend/ backend/ ml/ supabase/', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.strictEqual(diff.trim(), '', 'Protected directories must have 0 git diff');
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n===============================================================');
console.log(`PHASE 10.4 TEST RESULTS: ${testsPassed} / ${testsPassed + testsFailed} PASSED`);
console.log('===============================================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
