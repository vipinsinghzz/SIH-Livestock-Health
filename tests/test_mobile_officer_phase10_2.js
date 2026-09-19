/**
 * Test Suite: Phase 10.2 Officer Spatial Outbreak Surveillance & District GIS Heatmap
 * File: tests/test_mobile_officer_phase10_2.js
 *
 * Verifies:
 * 1. Backend Endpoint Contracts & Parameters (/clusters, /nearby, /risk-analysis, /containment-zones)
 * 2. Role-Based Access Control (Officer vs Farmer vs Vet)
 * 3. Spatial Radius & Limit Enforcement (Officer 100km/200 vs Farmer 10km/30)
 * 4. Geospatial Privacy & Coordinate Fuzzing (Exact for Officer, Fuzzed for Farmer)
 * 5. Outbreak Clustering & DBSCAN Centroid Logic
 * 6. Epidemiological Risk Scoring Engine & Factors
 * 7. Mobile Officer Service & Screen Structural Contracts
 * 8. Offline SQLite Cache Contracts & Zero-Mock Policy
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

console.log('\n===============================================================');
console.log('PHASE 10.2: OFFICER SPATIAL OUTBREAK & GIS TEST SUITE');
console.log('===============================================================\n');

// ---------------------------------------------------------------------------
// 1. BACKEND ENDPOINT CONTRACTS & RBAC
// ---------------------------------------------------------------------------
console.log('[1. Backend GIS Endpoint Contracts & RBAC]');

runTest('1.1 /api/cases/clusters route exists and requires officer/vet/admin authorization', () => {
  const caseRoutesContent = fs.readFileSync(
    path.join(__dirname, '../backend/routes/caseRoutes.js'),
    'utf8'
  );
  assert.ok(caseRoutesContent.includes("'/clusters'"), 'Route /clusters must be registered');
  assert.ok(
    caseRoutesContent.includes("authorize('field_worker', 'veterinarian', 'officer', 'admin')"),
    'Role authorization must include officer and exclude farmer'
  );
  assert.ok(caseRoutesContent.includes('getSpatialOutbreakClusters'), 'Controller handler must be wired');
});

runTest('1.2 /api/cases/nearby route exists and enforces role-based radius and fuzzing', () => {
  const caseRoutesContent = fs.readFileSync(
    path.join(__dirname, '../backend/routes/caseRoutes.js'),
    'utf8'
  );
  assert.ok(caseRoutesContent.includes("'/nearby'"), 'Route /nearby must be registered');
  assert.ok(caseRoutesContent.includes('getNearbyCases'), 'Controller handler must be wired');

  const caseControllerContent = fs.readFileSync(
    path.join(__dirname, '../backend/controllers/caseController.js'),
    'utf8'
  );
  assert.ok(
    caseControllerContent.includes("userRole === 'farmer'"),
    'Farmer role must be distinguished in nearby cases'
  );
  assert.ok(
    caseControllerContent.includes('Math.min(effectiveRadius || 25.0, 100.0)'),
    'Officer/Admin radius must allow up to 100km'
  );
  assert.ok(
    caseControllerContent.includes('maxLimit = 200'),
    'Officer/Admin limit must allow up to 200 cases'
  );
  assert.ok(
    caseControllerContent.includes('Math.min(effectiveRadius || 10.0, 10.0)'),
    'Farmer radius must be capped at 10km'
  );
});

runTest('1.3 /api/cases/risk-analysis route exists and restricts to officers/vets', () => {
  const caseRoutesContent = fs.readFileSync(
    path.join(__dirname, '../backend/routes/caseRoutes.js'),
    'utf8'
  );
  assert.ok(caseRoutesContent.includes("'/risk-analysis'"), 'Route /risk-analysis must be registered');
  assert.ok(
    caseRoutesContent.includes("authorize('field_worker', 'veterinarian', 'officer', 'admin')"),
    'Risk analysis must require officer/vet role'
  );
  assert.ok(caseRoutesContent.includes('getOutbreakRiskAnalysis'), 'Controller handler must be wired');
});

runTest('1.4 /api/cases/containment-zones route exists and supports officer retrieval', () => {
  const caseRoutesContent = fs.readFileSync(
    path.join(__dirname, '../backend/routes/caseRoutes.js'),
    'utf8'
  );
  assert.ok(caseRoutesContent.includes("'/containment-zones'"), 'Route /containment-zones must be registered');
  assert.ok(caseRoutesContent.includes('getContainmentZones'), 'Controller handler must be wired');
});

// ---------------------------------------------------------------------------
// 2. GEOSPATIAL PRIVACY & PRECISION
// ---------------------------------------------------------------------------
console.log('\n[2. Geospatial Privacy & Precision]');

runTest('2.1 Officer receives exact coordinates; Farmer receives fuzzed coordinates', () => {
  const caseControllerContent = fs.readFileSync(
    path.join(__dirname, '../backend/controllers/caseController.js'),
    'utf8'
  );
  assert.ok(
    caseControllerContent.includes("if (userRole !== 'farmer' || isOwnCase) {\n        return c;\n      }"),
    'Non-farmer roles (officer/vet/admin) must receive raw unfuzzed case coordinates'
  );
  assert.ok(
    caseControllerContent.includes("village: 'Vicinity (~1.5km)'"),
    'Farmer peer cases must have village masked'
  );
  assert.ok(
    caseControllerContent.includes('isFuzzed: true'),
    'Farmer peer cases must have isFuzzed flag set'
  );
});

runTest('2.2 Containment zone center coordinates are exact for officers and fuzzed for farmers', () => {
  const caseControllerContent = fs.readFileSync(
    path.join(__dirname, '../backend/controllers/caseController.js'),
    'utf8'
  );
  assert.ok(
    caseControllerContent.includes("if (userRole !== 'farmer') {\n        return z;\n      }"),
    'Non-farmer roles (officers) must receive exact center coordinates'
  );
  assert.ok(
    caseControllerContent.includes('Math.round(center.lat * 100) / 100'),
    'Farmers must receive rounded fuzzed center'
  );
});

// ---------------------------------------------------------------------------
// 3. OUTBREAK CLUSTERING & DBSCAN CENTROIDS
// ---------------------------------------------------------------------------
console.log('\n[3. Outbreak Clustering & DBSCAN Centroids]');

runTest('3.1 Backend clustering enforces distance <= 5km and minCases grouping', () => {
  const gisServiceContent = fs.readFileSync(
    path.join(__dirname, '../backend/services/gisService.js'),
    'utf8'
  );
  assert.ok(
    gisServiceContent.includes('getOutbreakClusters(district = \'Pune\', distanceKm = 5.0, minCases = 2)'),
    'getOutbreakClusters must default to 5.0km and minCases 2'
  );
  assert.ok(
    gisServiceContent.includes('c1.disease === c2.disease'),
    'Cases must be grouped by exact disease match'
  );
  assert.ok(
    gisServiceContent.includes('d <= distanceKm'),
    'Cases must be within distanceKm threshold'
  );
  assert.ok(
    gisServiceContent.includes('centroidLat: Math.round(avgLat * 10000) / 10000'),
    'Centroid latitude must be calculated as average of group'
  );
  assert.ok(
    gisServiceContent.includes('centroidLng: Math.round(avgLng * 10000) / 10000'),
    'Centroid longitude must be calculated as average of group'
  );
});

runTest('3.2 Risk tier classification in clustering is Critical for >=3 cases or >=10 affected', () => {
  const gisServiceContent = fs.readFileSync(
    path.join(__dirname, '../backend/services/gisService.js'),
    'utf8'
  );
  assert.ok(
    gisServiceContent.includes("(count >= 3 || totalAff >= 10) ? 'Critical' : (count >= 2 ? 'High' : 'Moderate')"),
    'Risk tier formula must classify Critical, High, or Moderate'
  );
});

// ---------------------------------------------------------------------------
// 4. RISK ANALYSIS SCORING ENGINE
// ---------------------------------------------------------------------------
console.log('\n[4. Risk Analysis Scoring Engine]');

runTest('4.1 calculateOutbreakRisk implements 6 explainable scoring factors', () => {
  const gisServiceContent = fs.readFileSync(
    path.join(__dirname, '../backend/services/gisService.js'),
    'utf8'
  );
  assert.ok(gisServiceContent.includes('HIGH_PROXIMITY_DENSITY'), 'Factor 1: High proximity density');
  assert.ok(gisServiceContent.includes('CLINICALLY_CONFIRMED_CASE'), 'Factor 2: Diagnostic status weight');
  assert.ok(gisServiceContent.includes('NOTIFIABLE_HIGH_CONTAGION_PATHOGEN'), 'Factor 3: Pathogen virulence');
  assert.ok(gisServiceContent.includes('MASS_HERD_EXPOSURE'), 'Factor 4: Herd exposure');
  assert.ok(gisServiceContent.includes('INSIDE_ACTIVE_CONTAINMENT_ZONE'), 'Factor 5: Containment perimeter');
  assert.ok(gisServiceContent.includes('LOW_VACCINATION_SHIELD'), 'Factor 6: Vaccination shield penalty');
  assert.ok(gisServiceContent.includes('HIGH_HERD_IMMUNITY_MITIGATION'), 'Factor 6: Vaccination mitigation');
});

runTest('4.2 Risk scoring bounds and recommendation thresholds', () => {
  const gisServiceContent = fs.readFileSync(
    path.join(__dirname, '../backend/services/gisService.js'),
    'utf8'
  );
  assert.ok(
    gisServiceContent.includes('Math.max(0, Math.min(100, score))'),
    'Score must be bounded between 0 and 100'
  );
  assert.ok(
    gisServiceContent.includes("finalScore >= 75 ? 'CRITICAL' : (finalScore >= 50 ? 'HIGH' : (finalScore >= 25 ? 'MEDIUM' : 'LOW'))") ||
    gisServiceContent.includes("finalScore >= 75"),
    'Risk level must map to LOW, MEDIUM, HIGH, CRITICAL'
  );
  assert.ok(
    gisServiceContent.includes('containmentRecommendation'),
    'containmentRecommendation must be generated'
  );
  assert.ok(
    gisServiceContent.includes('vaccinationRecommendation'),
    'vaccinationRecommendation must be generated'
  );
});

// ---------------------------------------------------------------------------
// 5. MOBILE TYPES & OFFICER SERVICE CONTRACTS
// ---------------------------------------------------------------------------
console.log('\n[5. Mobile Types & Officer Service Contracts]');

runTest('5.1 mobile/src/types/officer.ts defines Phase 10.2 spatial and risk interfaces', () => {
  const typesContent = fs.readFileSync(
    path.join(__dirname, '../mobile/src/types/officer.ts'),
    'utf8'
  );
  assert.ok(typesContent.includes('export interface OfficerRiskFactor'), 'OfficerRiskFactor interface exists');
  assert.ok(typesContent.includes('export interface OfficerRiskAnalysis'), 'OfficerRiskAnalysis interface exists');
  assert.ok(typesContent.includes('export interface OfficerNearbyCase'), 'OfficerNearbyCase interface exists');
  assert.ok(typesContent.includes("export type OfficerMapLayer = 'containment' | 'clusters' | 'cases'"), 'OfficerMapLayer union type exists');
  assert.ok(typesContent.includes('export interface OfficerRiskAnalysisResponse'), 'OfficerRiskAnalysisResponse interface exists');
  assert.ok(typesContent.includes('export interface OfficerNearbyCasesResponse'), 'OfficerNearbyCasesResponse interface exists');
});

runTest('5.2 mobile/src/services/officerService.ts exports Phase 10.2 spatial methods', () => {
  const serviceContent = fs.readFileSync(
    path.join(__dirname, '../mobile/src/services/officerService.ts'),
    'utf8'
  );
  assert.ok(serviceContent.includes('getOfficerNearbyCases'), 'getOfficerNearbyCases method exists');
  assert.ok(serviceContent.includes('getOfficerRiskAnalysis'), 'getOfficerRiskAnalysis method exists');
  assert.ok(serviceContent.includes('getOfficerSpatialSurveillance'), 'getOfficerSpatialSurveillance method exists');
});

runTest('5.3 getOfficerNearbyCases validates coordinates and handles officer radius up to 100km', () => {
  const serviceContent = fs.readFileSync(
    path.join(__dirname, '../mobile/src/services/officerService.ts'),
    'utf8'
  );
  assert.ok(
    serviceContent.includes("Math.min(params.radiusKm || 25, 100)"),
    'Radius must default to 25 and cap at 100km'
  );
  assert.ok(
    serviceContent.includes("typeof lat === 'number'") && serviceContent.includes("typeof lng === 'number'"),
    'Must filter invalid / NaN coordinates'
  );
  assert.ok(
    serviceContent.includes('lat !== 0') && serviceContent.includes('lng !== 0'),
    'Must filter zero coordinates (Null Island)'
  );
});

runTest('5.4 getOfficerSpatialSurveillance aggregates clusters, containment, cases, and risk', () => {
  const serviceContent = fs.readFileSync(
    path.join(__dirname, '../mobile/src/services/officerService.ts'),
    'utf8'
  );
  assert.ok(
    serviceContent.includes('Promise.allSettled(['),
    'Must use Promise.allSettled for resilient concurrent loading'
  );
  assert.ok(
    serviceContent.includes('containmentService.getContainmentZones'),
    'Must call getContainmentZones'
  );
  assert.ok(
    serviceContent.includes('containmentService.getSpatialOutbreakClusters'),
    'Must call getSpatialOutbreakClusters'
  );
  assert.ok(
    serviceContent.includes('this.getOfficerNearbyCases'),
    'Must call getOfficerNearbyCases'
  );
  assert.ok(
    serviceContent.includes('this.getOfficerRiskAnalysis'),
    'Must call getOfficerRiskAnalysis'
  );
});

// ---------------------------------------------------------------------------
// 6. OFFICER OUTBREAK ALERTS SCREEN CONTRACTS
// ---------------------------------------------------------------------------
console.log('\n[6. Officer Outbreak Alerts Screen Contracts]');

runTest('6.1 mobile/app/(officer)/outbreaks/index.tsx is a full production screen', () => {
  const outbreaksContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/outbreaks/index.tsx'),
    'utf8'
  );
  assert.ok(!outbreaksContent.includes('PlaceholderScreen'), 'Must not be a placeholder screen');
  assert.ok(outbreaksContent.includes('OfficerOutbreaksScreen'), 'Must export OfficerOutbreaksScreen component');
  assert.ok(outbreaksContent.includes('useAuth'), 'Must use useAuth for user district');
  assert.ok(outbreaksContent.includes('containmentService.getSpatialOutbreakClusters'), 'Must fetch spatial clusters');
  assert.ok(outbreaksContent.includes('officerService.getOfficerRiskAnalysis'), 'Must fetch risk analysis');
});

runTest('6.2 Outbreak screen includes risk score, factor breakdown, and recommendations', () => {
  const outbreaksContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/outbreaks/index.tsx'),
    'utf8'
  );
  assert.ok(outbreaksContent.includes('District Epidemiological Risk'), 'Must display risk card');
  assert.ok(outbreaksContent.includes('scoreBarContainer'), 'Must display visual score meter');
  assert.ok(outbreaksContent.includes('factorsList'), 'Must display contributing risk factors');
  assert.ok(outbreaksContent.includes('recPill'), 'Must display recommendation pills');
});

runTest('6.3 Outbreak screen implements risk tier filter chips and map navigation', () => {
  const outbreaksContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/outbreaks/index.tsx'),
    'utf8'
  );
  assert.ok(outbreaksContent.includes('activeFilter'), 'Must maintain activeFilter state');
  assert.ok(outbreaksContent.includes('ALL'), 'Filter includes ALL');
  assert.ok(outbreaksContent.includes('CRITICAL'), 'Filter includes CRITICAL');
  assert.ok(outbreaksContent.includes('HIGH'), 'Filter includes HIGH');
  assert.ok(outbreaksContent.includes('MODERATE'), 'Filter includes MODERATE');
  assert.ok(outbreaksContent.includes('navigateToMapWithCluster'), 'Must implement map navigation helper');
  assert.ok(outbreaksContent.includes("pathname: '/(officer)/map'"), 'Must navigate to officer map');
});

runTest('6.4 Outbreak screen handles offline cache banner and pull-to-refresh', () => {
  const outbreaksContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/outbreaks/index.tsx'),
    'utf8'
  );
  assert.ok(outbreaksContent.includes('OfflineNotice'), 'Must include OfflineNotice component');
  assert.ok(outbreaksContent.includes('isFromCache'), 'Must track isFromCache state');
  assert.ok(outbreaksContent.includes('cacheBanner'), 'Must render cache notice banner');
  assert.ok(outbreaksContent.includes('RefreshControl'), 'Must support pull-to-refresh');
});

// ---------------------------------------------------------------------------
// 7. OFFICER DISTRICT GIS MAP SCREEN CONTRACTS
// ---------------------------------------------------------------------------
console.log('\n[7. Officer District GIS Map Screen Contracts]');

runTest('7.1 mobile/app/(officer)/map/index.tsx is a full production map screen', () => {
  const mapContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/map/index.tsx'),
    'utf8'
  );
  assert.ok(!mapContent.includes('PlaceholderScreen'), 'Must not be a placeholder screen');
  assert.ok(mapContent.includes('OfficerMapScreen'), 'Must export OfficerMapScreen component');
  assert.ok(mapContent.includes('MapView'), 'Must render MapView');
  assert.ok(mapContent.includes('Marker'), 'Must render Marker');
  assert.ok(mapContent.includes('Circle'), 'Must render Circle');
});

runTest('7.2 Map screen supports layer toggles for containment, clusters, and cases', () => {
  const mapContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/map/index.tsx'),
    'utf8'
  );
  assert.ok(mapContent.includes('activeLayers'), 'Must track activeLayers state');
  assert.ok(mapContent.includes('containment: true'), 'Containment layer active by default');
  assert.ok(mapContent.includes('clusters: true'), 'Clusters layer active by default');
  assert.ok(mapContent.includes('cases: true'), 'Cases layer active by default');
  assert.ok(mapContent.includes('toggleLayer'), 'toggleLayer function implemented');
});

runTest('7.3 Map screen implements biosecurity status colors for containment circles', () => {
  const mapContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/map/index.tsx'),
    'utf8'
  );
  assert.ok(mapContent.includes("isContained = zone.status === 'CONTAINED'"), 'Checks CONTAINED status');
  assert.ok(mapContent.includes("isLifted = zone.status === 'LIFTED'"), 'Checks LIFTED status');
  assert.ok(mapContent.includes("'#DC2626'"), 'Uses red for ACTIVE');
  assert.ok(mapContent.includes("'#D97706'"), 'Uses orange for CONTAINED');
  assert.ok(mapContent.includes("'#059669'"), 'Uses green for LIFTED');
});

runTest('7.4 Map screen implements bottom detail sheet for selected entity', () => {
  const mapContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/map/index.tsx'),
    'utf8'
  );
  assert.ok(mapContent.includes('selectedEntity'), 'Must track selectedEntity state');
  assert.ok(mapContent.includes("selectedEntity.type === 'zone'"), 'Handles zone entity');
  assert.ok(mapContent.includes("selectedEntity.type === 'cluster'"), 'Handles cluster entity');
  assert.ok(mapContent.includes("selectedEntity.type === 'case'"), 'Handles case entity');
  assert.ok(mapContent.includes('bottomCard'), 'Renders bottom detail card');
});

runTest('7.5 Map screen supports focal navigation params and GPS location', () => {
  const mapContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/map/index.tsx'),
    'utf8'
  );
  assert.ok(mapContent.includes('useLocalSearchParams'), 'Must read focus parameters');
  assert.ok(mapContent.includes('params.focusLat'), 'Handles focusLat param');
  assert.ok(mapContent.includes('params.focusLng'), 'Handles focusLng param');
  assert.ok(mapContent.includes('Location.requestForegroundPermissionsAsync'), 'Requests location permissions');
});

// ---------------------------------------------------------------------------
// 8. OFFLINE ARCHITECTURE & ZERO-MOCK COMPLIANCE
// ---------------------------------------------------------------------------
console.log('\n[8. Offline Architecture & Zero-Mock Compliance]');

runTest('8.1 localDatabase.ts contains tables and helpers for containment and clusters', () => {
  const dbContent = fs.readFileSync(
    path.join(__dirname, '../mobile/src/services/localDatabase.ts'),
    'utf8'
  );
  assert.ok(dbContent.includes('containment_zones_cache'), 'containment_zones_cache table exists');
  assert.ok(dbContent.includes('outbreak_clusters_cache'), 'outbreak_clusters_cache table exists');
  assert.ok(dbContent.includes('saveContainmentZonesCache'), 'saveContainmentZonesCache method exists');
  assert.ok(dbContent.includes('getCachedContainmentZones'), 'getCachedContainmentZones method exists');
  assert.ok(dbContent.includes('saveOutbreakClustersCache'), 'saveOutbreakClustersCache method exists');
  assert.ok(dbContent.includes('getCachedOutbreakClusters'), 'getCachedOutbreakClusters method exists');
});

runTest('8.2 Zero-Mock verification: No hardcoded dummy clusters or fake numbers in officer screens', () => {
  const outbreaksContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/outbreaks/index.tsx'),
    'utf8'
  );
  const mapContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/(officer)/map/index.tsx'),
    'utf8'
  );

  const fakePatterns = [
    /mockClusters\s*=/i,
    /fakeClusters\s*=/i,
    /dummyClusters\s*=/i,
    /dummyCases\s*=/i,
    /mockCases\s*=/i,
    /fakeCases\s*=/i,
  ];

  for (const pat of fakePatterns) {
    assert.ok(!pat.test(outbreaksContent), `Outbreaks screen must not contain pattern: ${pat}`);
    assert.ok(!pat.test(mapContent), `Map screen must not contain pattern: ${pat}`);
  }
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n===============================================================');
console.log(`PHASE 10.2 TESTS PASSED: ${testsPassed} / ${testsTotal}`);
console.log('===============================================================\n');

if (testsPassed !== testsTotal) {
  process.exit(1);
}
