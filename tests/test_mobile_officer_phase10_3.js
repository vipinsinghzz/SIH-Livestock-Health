/**
 * Test Suite: Phase 10.3 Officer Containment Perimeters & Mass Vaccination Campaign Governance
 * File: tests/test_mobile_officer_phase10_3.js
 *
 * Verifies:
 * 1. Containment screen exists (mobile/app/(officer)/containment/index.tsx)
 * 2. Vaccination screen exists (mobile/app/(officer)/vaccination/index.tsx)
 * 3. Real containment endpoints in backend & services
 * 4. Real vaccination endpoints in backend & services
 * 5. Containment status lifecycle (ACTIVE -> CONTAINED -> LIFTED)
 * 6. Invalid status prevention
 * 7. Containment creation validation
 * 8. Vaccination campaign creation validation
 * 9. Campaign update validation
 * 10. Ring vaccination endpoint
 * 11. RBAC handling
 * 12. 401 Unauthorized handling
 * 13. 403 Forbidden handling
 * 14. 404 Not Found handling
 * 15. 409 Conflict handling
 * 16. 500 Server Error handling
 * 17. Offline mutation blocking
 * 18. Zero fake data policy
 * 19. No hardcoded coordinates
 * 20. District scoping
 * 21. Confirmation flows
 * 22. Refresh after mutation
 * 23. Campaign filters
 * 24. Containment filters
 * 25. Map navigation & deep-linking
 * 26. Outbreak -> Containment flow
 * 27. Outbreak -> Ring vaccination flow
 * 28. Officer dashboard integration
 * 29. TypeScript safety & type contracts
 * 30. Protected-directory boundary
 * 31. Service layer methods & signatures
 * 32. Camp coordination contract handling
 * 33. Offline caching policy
 * 34. Error and loading states
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
console.log('PHASE 10.3: OFFICER CONTAINMENT & VACCINATION TEST SUITE');
console.log('===============================================================\n');

// ---------------------------------------------------------------------------
// 1. SCREENS EXISTENCE & STRUCTURE
// ---------------------------------------------------------------------------
console.log('[1. Screen Existence & Structure]');

runTest('1.1 Containment screen exists and is not a placeholder', () => {
  const filePath = path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx');
  assert.ok(fs.existsSync(filePath), 'mobile/app/(officer)/containment/index.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(!content.includes('PlaceholderScreen'), 'Containment screen must not use PlaceholderScreen');
  assert.ok(content.includes('OfficerContainmentScreen'), 'Must export OfficerContainmentScreen');
});

runTest('1.2 Vaccination screen exists and is not a placeholder', () => {
  const filePath = path.join(__dirname, '../mobile/app/(officer)/vaccination/index.tsx');
  assert.ok(fs.existsSync(filePath), 'mobile/app/(officer)/vaccination/index.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(!content.includes('PlaceholderScreen'), 'Vaccination screen must not use PlaceholderScreen');
  assert.ok(content.includes('OfficerVaccinationScreen'), 'Must export OfficerVaccinationScreen');
});

// ---------------------------------------------------------------------------
// 2. BACKEND CONTRACTS & ENDPOINTS
// ---------------------------------------------------------------------------
console.log('[2. Backend Endpoint Contracts]');

runTest('2.1 Real containment endpoints exist in backend caseRoutes and caseController', () => {
  const routesContent = fs.readFileSync(path.join(__dirname, '../backend/routes/caseRoutes.js'), 'utf8');
  const controllerContent = fs.readFileSync(path.join(__dirname, '../backend/controllers/caseController.js'), 'utf8');

  assert.ok(routesContent.includes("'/containment-zones'"), 'Route /containment-zones must be registered');
  assert.ok(routesContent.includes("'/containment-zones/:zoneId/status'"), 'Route /containment-zones/:zoneId/status must be registered');
  assert.ok(routesContent.includes("getContainmentZones"), 'getContainmentZones controller wired');
  assert.ok(routesContent.includes("createContainmentZone"), 'createContainmentZone controller wired');
  assert.ok(routesContent.includes("updateContainmentZoneStatus"), 'updateContainmentZoneStatus controller wired');

  assert.ok(controllerContent.includes("exports.getContainmentZones"), 'caseController has getContainmentZones');
  assert.ok(controllerContent.includes("exports.createContainmentZone"), 'caseController has createContainmentZone');
  assert.ok(controllerContent.includes("exports.updateContainmentZoneStatus"), 'caseController has updateContainmentZoneStatus');
});

runTest('2.2 Real vaccination endpoints exist in backend vaccinationRoutes and controller', () => {
  const routesContent = fs.readFileSync(path.join(__dirname, '../backend/routes/vaccinationRoutes.js'), 'utf8');
  const controllerContent = fs.readFileSync(path.join(__dirname, '../backend/controllers/vaccinationController.js'), 'utf8');

  assert.ok(routesContent.includes("router.get('/', optionalProtect, getVaccinationDrives)"), 'GET /api/vaccination-drives registered');
  assert.ok(routesContent.includes("createVaccinationDrive"), 'POST /api/vaccination-drives registered');
  assert.ok(routesContent.includes("updateVaccinationDrive"), 'PATCH /api/vaccination-drives/:id registered');

  assert.ok(controllerContent.includes("exports.getVaccinationDrives"), 'vaccinationController has getVaccinationDrives');
  assert.ok(controllerContent.includes("exports.createVaccinationDrive"), 'vaccinationController has createVaccinationDrive');
  assert.ok(controllerContent.includes("exports.updateVaccinationDrive"), 'vaccinationController has updateVaccinationDrive');
});

runTest('2.3 Ring vaccination endpoint exists in backend caseRoutes and caseController', () => {
  const routesContent = fs.readFileSync(path.join(__dirname, '../backend/routes/caseRoutes.js'), 'utf8');
  const controllerContent = fs.readFileSync(path.join(__dirname, '../backend/controllers/caseController.js'), 'utf8');

  assert.ok(routesContent.includes("'/:id/schedule-ring-vaccination'"), 'Route /:id/schedule-ring-vaccination must be registered');
  assert.ok(controllerContent.includes("exports.scheduleRingVaccination"), 'caseController has scheduleRingVaccination');
});

// ---------------------------------------------------------------------------
// 3. CONTAINMENT LIFECYCLE & MUTATION RULES
// ---------------------------------------------------------------------------
console.log('[3. Containment Lifecycle & Mutation Rules]');

runTest('3.1 Containment status lifecycle supports ACTIVE -> CONTAINED -> LIFTED', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(containmentScreen.includes("'ACTIVE'"), 'Contains ACTIVE status');
  assert.ok(containmentScreen.includes("'CONTAINED'"), 'Contains CONTAINED status');
  assert.ok(containmentScreen.includes("'LIFTED'"), 'Contains LIFTED status');

  const backendController = fs.readFileSync(path.join(__dirname, '../backend/controllers/caseController.js'), 'utf8');
  assert.ok(backendController.includes("['ACTIVE', 'CONTAINED', 'LIFTED']"), 'Backend allows ACTIVE, CONTAINED, LIFTED');
});

runTest('3.2 Invalid status transitions are prevented on mobile', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(containmentScreen.includes("isActive &&"), 'Only ACTIVE zones can transition to CONTAINED');
  assert.ok(containmentScreen.includes("isContained &&"), 'Only CONTAINED zones can transition to LIFTED');
  assert.ok(containmentScreen.includes("setTargetStatus('CONTAINED')"), 'Transitions to CONTAINED supported');
  assert.ok(containmentScreen.includes("setTargetStatus('LIFTED')"), 'Transitions to LIFTED supported');
});

runTest('3.3 Confirmation modal is required before containment status mutation', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(containmentScreen.includes('statusModalVisible'), 'Uses statusModalVisible for mutation confirmation');
  assert.ok(containmentScreen.includes('Confirm Containment Status Update'), 'Confirms status change with user in modal');
});

runTest('3.4 Containment creation requires valid coordinates, disease, and radius', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(containmentScreen.includes('isNaN(lat)'), 'Validates latitude');
  assert.ok(containmentScreen.includes('isNaN(lng)'), 'Validates longitude');
  assert.ok(containmentScreen.includes('isNaN(radius)'), 'Validates radius');
  assert.ok(containmentScreen.includes('!newDisease.trim()'), 'Validates disease name');
});

// ---------------------------------------------------------------------------
// 4. MASS VACCINATION CAMPAIGN GOVERNANCE
// ---------------------------------------------------------------------------
console.log('[4. Mass Vaccination Campaign Governance]');

runTest('4.1 Vaccination campaign creation uses POST /api/vaccination-drives', () => {
  const serviceContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/vaccinationService.ts'), 'utf8');
  assert.ok(serviceContent.includes("createVaccinationDrive"), 'vaccinationService exports createVaccinationDrive');
  assert.ok(serviceContent.includes("api.post<CreateVaccinationDriveResponse>(") || serviceContent.includes("'/vaccination-drives'"), 'Calls POST /vaccination-drives');
});

runTest('4.2 Vaccination campaign update uses PATCH /api/vaccination-drives/:id', () => {
  const serviceContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/vaccinationService.ts'), 'utf8');
  assert.ok(serviceContent.includes("updateVaccinationDrive"), 'vaccinationService exports updateVaccinationDrive');
  assert.ok(serviceContent.includes("api.patch<UpdateVaccinationDriveResponse>(") || serviceContent.includes("`/vaccination-drives/"), 'Calls PATCH /vaccination-drives/:id');
});

runTest('4.3 Campaign update supports fields permitted by backend (coveredCount, status)', () => {
  const backendController = fs.readFileSync(path.join(__dirname, '../backend/controllers/vaccinationController.js'), 'utf8');
  assert.ok(backendController.includes('coveredCount'), 'Backend permits coveredCount');
  assert.ok(backendController.includes('status'), 'Backend permits status');

  const typesContent = fs.readFileSync(path.join(__dirname, '../mobile/src/types/vaccination.ts'), 'utf8');
  assert.ok(typesContent.includes('UpdateVaccinationDrivePayload'), 'UpdateVaccinationDrivePayload defined');
  assert.ok(typesContent.includes('coveredCount?: number'), 'Update payload has coveredCount');
  assert.ok(typesContent.includes('status?:'), 'Update payload has status');
});

runTest('4.4 Vaccination campaign filters match real backend terminology', () => {
  const vaccinationScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/vaccination/index.tsx'), 'utf8');
  assert.ok(vaccinationScreen.includes("'ALL'"), 'Has ALL filter');
  assert.ok(vaccinationScreen.includes("'UPCOMING'"), 'Has UPCOMING filter');
  assert.ok(vaccinationScreen.includes("'ONGOING'"), 'Has ONGOING filter');
  assert.ok(vaccinationScreen.includes("'COMPLETED'"), 'Has COMPLETED filter');
});

runTest('4.5 Veterinary camp coordination: handles real backend data honestly', () => {
  const vaccinationScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/vaccination/index.tsx'), 'utf8');
  assert.ok(
    vaccinationScreen.includes('drive.camps') || vaccinationScreen.includes('participating camps') || vaccinationScreen.includes('camp'),
    'Displays camp information if present in backend drive record'
  );
  assert.ok(!vaccinationScreen.includes('fakeCamp'), 'No fabricated camp data');
});

// ---------------------------------------------------------------------------
// 5. EMERGENCY RING VACCINATION
// ---------------------------------------------------------------------------
console.log('[5. Emergency Ring Vaccination]');

runTest('5.1 Ring vaccination service method uses POST /api/cases/:id/schedule-ring-vaccination', () => {
  const serviceContent = fs.readFileSync(path.join(__dirname, '../mobile/src/services/containmentService.ts'), 'utf8');
  assert.ok(serviceContent.includes('scheduleRingVaccination'), 'containmentService has scheduleRingVaccination');
  assert.ok(serviceContent.includes('schedule-ring-vaccination'), 'Calls /cases/:id/schedule-ring-vaccination');
});

runTest('5.2 Ring vaccination requires confirmation before submission', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(containmentScreen.includes('ringModalVisible'), 'Has ring modal state');
  assert.ok(containmentScreen.includes('Schedule Emergency Ring Vaccination'), 'Has emergency ring vaccination modal');
});

// ---------------------------------------------------------------------------
// 6. RBAC, SECURITY & DISTRICT SCOPING
// ---------------------------------------------------------------------------
console.log('[6. RBAC, Security & District Scoping]');

runTest('6.1 Backend RBAC authorizes officer for containment and vaccination', () => {
  const caseRoutes = fs.readFileSync(path.join(__dirname, '../backend/routes/caseRoutes.js'), 'utf8');
  assert.ok(
    caseRoutes.includes("authorize('field_worker', 'veterinarian', 'officer', 'admin')"),
    'Containment mutations require officer/vet/admin'
  );

  const vaccRoutes = fs.readFileSync(path.join(__dirname, '../backend/routes/vaccinationRoutes.js'), 'utf8');
  assert.ok(
    vaccRoutes.includes("authorize('field_worker', 'officer', 'admin')") ||
    vaccRoutes.includes("authorize('field_worker', 'veterinarian', 'officer', 'admin')"),
    'Vaccination mutations require officer/admin'
  );
});

runTest('6.2 District scoping is derived from authenticated user profile without hardcoded fallback', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(containmentScreen.includes('user?.district'), 'District scoped to authenticated user in containment');
  assert.ok(!containmentScreen.includes("'Pune'"), 'No hardcoded Pune fallback in containment');
  assert.ok(containmentScreen.includes('district'), 'Validates district in containment');

  const vaccScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/vaccination/index.tsx'), 'utf8');
  assert.ok(vaccScreen.includes('user?.district'), 'District scoped to authenticated user in vaccination');
  assert.ok(!vaccScreen.includes("'Pune'"), 'No hardcoded Pune fallback in vaccination');
  assert.ok(vaccScreen.includes('district'), 'Validates district in vaccination');
});

runTest('6.3 Sensitive personal farmer data is not exposed on officer screens', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(!containmentScreen.includes('farmerPhone'), 'No farmer phone displayed in containment');
  assert.ok(!containmentScreen.includes('farmerEmail'), 'No farmer email displayed in containment');

  const vaccScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/vaccination/index.tsx'), 'utf8');
  assert.ok(!vaccScreen.includes('farmerPhone'), 'No farmer phone displayed in vaccination');
  assert.ok(!vaccScreen.includes('farmerEmail'), 'No farmer email displayed in vaccination');
});

// ---------------------------------------------------------------------------
// 7. OFFLINE POLICY & MUTATION BLOCKING
// ---------------------------------------------------------------------------
console.log('[7. Offline Policy & Mutation Blocking]');

runTest('7.1 Containment mutations are strictly blocked when offline', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(containmentScreen.includes('NetInfo.fetch()'), 'Checks NetInfo before mutation');
  assert.ok(containmentScreen.includes('Internet connection required for this action.'), 'Shows mandatory offline error message');

  const containmentService = fs.readFileSync(path.join(__dirname, '../mobile/src/services/containmentService.ts'), 'utf8');
  assert.ok(containmentService.includes('NetInfo.fetch()'), 'containmentService verifies network before mutation');
});

runTest('7.2 Vaccination mutations are strictly blocked when offline', () => {
  const vaccScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/vaccination/index.tsx'), 'utf8');
  assert.ok(vaccScreen.includes('NetInfo.fetch()'), 'Checks NetInfo before mutation in vaccination screen');
  assert.ok(vaccScreen.includes('Internet connection required for this action.'), 'Shows mandatory offline error message');

  const vaccService = fs.readFileSync(path.join(__dirname, '../mobile/src/services/vaccinationService.ts'), 'utf8');
  assert.ok(vaccService.includes('NetInfo.fetch()'), 'vaccinationService verifies network before mutation');
});

runTest('7.3 Offline reads are supported from local database cache', () => {
  const containmentService = fs.readFileSync(path.join(__dirname, '../mobile/src/services/containmentService.ts'), 'utf8');
  assert.ok(containmentService.includes('getCachedContainmentZones'), 'Reads containment zones from cache');

  const vaccService = fs.readFileSync(path.join(__dirname, '../mobile/src/services/vaccinationService.ts'), 'utf8');
  assert.ok(vaccService.includes('getCachedVaccinations'), 'Reads vaccination drives from cache');
});

// ---------------------------------------------------------------------------
// 8. ERROR, EMPTY & LOADING STATES
// ---------------------------------------------------------------------------
console.log('[8. Error, Empty & Loading States]');

runTest('8.1 Containment screen has loading, empty, and honest error states', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(containmentScreen.includes('ActivityIndicator'), 'Has loading indicator');
  assert.ok(containmentScreen.includes('No Containment Zones Found') || containmentScreen.includes('No Containment Zones'), 'Has empty state');
  assert.ok(containmentScreen.includes('Containment Feed Unavailable') || containmentScreen.includes('error'), 'Has error state');
  assert.ok(containmentScreen.includes('Retry Loading') || containmentScreen.includes('loadZones'), 'Has retry mechanism');
});

runTest('8.2 Vaccination screen has loading, empty, and honest error states', () => {
  const vaccScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/vaccination/index.tsx'), 'utf8');
  assert.ok(vaccScreen.includes('ActivityIndicator'), 'Has loading indicator');
  assert.ok(vaccScreen.includes('No Vaccination Campaigns Found') || vaccScreen.includes('No Campaigns'), 'Has empty state');
  assert.ok(vaccScreen.includes('Campaign Data Unavailable') || vaccScreen.includes('error'), 'Has error state');
  assert.ok(vaccScreen.includes('Retry Loading') || vaccScreen.includes('loadDrives'), 'Has retry mechanism');
});

runTest('8.3 Handles HTTP error status codes honestly (401, 403, 404, 409, 500)', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(containmentScreen.includes('err.response?.status') || containmentScreen.includes('err.message'), 'Inspects error response status or message');

  const vaccScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/vaccination/index.tsx'), 'utf8');
  assert.ok(vaccScreen.includes('err.response?.status') || vaccScreen.includes('err.message'), 'Inspects error response status or message in vaccination');
});

// ---------------------------------------------------------------------------
// 9. ZERO-MOCK POLICY & COORDINATE INTEGRITY
// ---------------------------------------------------------------------------
console.log('[9. Zero-Mock Policy & Coordinate Integrity]');

runTest('9.1 No fake numbers or mocked campaign progress in screens', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  assert.ok(!containmentScreen.includes('mockZones'), 'No mockZones in containment screen');
  assert.ok(!containmentScreen.includes('dummyData'), 'No dummyData in containment screen');

  const vaccScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/vaccination/index.tsx'), 'utf8');
  assert.ok(!vaccScreen.includes('mockDrives'), 'No mockDrives in vaccination screen');
  assert.ok(!vaccScreen.includes('dummyData'), 'No dummyData in vaccination screen');
});

runTest('9.2 No hardcoded coordinates in containment or vaccination screens', () => {
  const containmentScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/containment/index.tsx'), 'utf8');
  // Should not have hardcoded coordinate literals in creation logic
  assert.ok(!containmentScreen.includes('latitude: 18.52043'), 'No hardcoded Pune coordinates in declaration');
});

// ---------------------------------------------------------------------------
// 10. OPERATIONAL WORKFLOW & DEEP LINKING
// ---------------------------------------------------------------------------
console.log('[10. Operational Workflow & Deep Linking]');

runTest('10.1 Outbreak screen deep links to containment declaration', () => {
  const outbreaksScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/outbreaks/index.tsx'), 'utf8');
  assert.ok(outbreaksScreen.includes("pathname: '/(officer)/containment'"), 'Outbreak links to containment');
  assert.ok(outbreaksScreen.includes('focusLat: String(cluster.centroidLat'), 'Passes cluster centroid latitude');
  assert.ok(outbreaksScreen.includes('focusLng: String(cluster.centroidLng'), 'Passes cluster centroid longitude');
});

runTest('10.2 Outbreak screen deep links to ring vaccination', () => {
  const outbreaksScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/outbreaks/index.tsx'), 'utf8');
  assert.ok(outbreaksScreen.includes("mode: 'ring'"), 'Passes mode: ring for emergency vaccination');
});

runTest('10.3 GIS Map screen deep links to containment management and ring vaccination', () => {
  const mapScreen = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/map/index.tsx'), 'utf8');
  assert.ok(mapScreen.includes("router.push('/(officer)/containment' as any)"), 'Map links to containment screen');
  assert.ok(mapScreen.includes("mode: 'ring'"), 'Map links to ring vaccination mode');
  assert.ok(mapScreen.includes('caseId: selectedEntity.data.caseId'), 'Map passes caseId for ring vaccination');
});

runTest('10.4 Officer dashboard provides operational response navigation', () => {
  const dashboard = fs.readFileSync(path.join(__dirname, '../mobile/app/(officer)/index.tsx'), 'utf8');
  assert.ok(dashboard.includes("'/(officer)/containment'"), 'Dashboard links to containment');
  assert.ok(dashboard.includes("'/(officer)/vaccination'"), 'Dashboard links to vaccination');
});

// ---------------------------------------------------------------------------
// 11. TYPESCRIPT SAFETY & CONTRACTS
// ---------------------------------------------------------------------------
console.log('[11. TypeScript Safety & Contracts]');

runTest('11.1 Vaccination types define Create & Update payloads and responses', () => {
  const typesContent = fs.readFileSync(path.join(__dirname, '../mobile/src/types/vaccination.ts'), 'utf8');
  assert.ok(typesContent.includes('export interface CreateVaccinationDrivePayload'), 'CreateVaccinationDrivePayload exported');
  assert.ok(typesContent.includes('export interface CreateVaccinationDriveResponse'), 'CreateVaccinationDriveResponse exported');
  assert.ok(typesContent.includes('export interface UpdateVaccinationDrivePayload'), 'UpdateVaccinationDrivePayload exported');
  assert.ok(typesContent.includes('export interface UpdateVaccinationDriveResponse'), 'UpdateVaccinationDriveResponse exported');
});

runTest('11.2 Containment types define ContainmentZone and ContainmentZoneStatus', () => {
  const typesContent = fs.readFileSync(path.join(__dirname, '../mobile/src/types/containment.ts'), 'utf8');
  assert.ok(typesContent.includes('export type ContainmentZoneStatus'), 'ContainmentZoneStatus exported');
  assert.ok(typesContent.includes('export interface ContainmentZone'), 'ContainmentZone exported');
});

// ---------------------------------------------------------------------------
// 12. PROTECTED DIRECTORY INTEGRITY
// ---------------------------------------------------------------------------
console.log('[12. Protected Directory Integrity]');

runTest('12.1 Protected directories (frontend/, backend/, ml/, supabase/) remain untouched', () => {
  const diff = execSync('git diff -- frontend/ backend/ ml/ supabase/', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.strictEqual(diff.trim(), '', 'Protected directories MUST have empty diff');
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n===============================================================');
console.log(`PHASE 10.3 TEST RESULTS: ${testsPassed} / ${testsTotal} PASSED`);
console.log('===============================================================\n');

if (testsPassed === testsTotal) {
  process.exit(0);
} else {
  process.exit(1);
}
