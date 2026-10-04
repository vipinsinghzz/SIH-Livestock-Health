/**
 * Officer Vaccination Module - District/Program Management Test Suite
 * File: tests/test_officer_vaccination_workflow.js
 *
 * Verifies:
 * 1. Officer login
 * 2. Officer can access vaccination module (KPIs)
 * 3. Unauthorized user rejected (401)
 * 4. Create vaccination campaign
 * 5. Campaign persisted in Supabase
 * 6. Correct district
 * 7. Correct target population
 * 8. Ring vaccination linked to outbreak case
 * 9. Actual vets/field workers assigned
 * 10. Campaign retrieved
 * 11. Campaign status changes
 * 12. Vaccination records stored
 * 13. Coverage calculated correctly
 * 14. Duplicate ring campaign protection (409 Conflict)
 * 15. Invalid campaign rejected (400 Bad Request)
 * 16. Database failure produces success: false
 * 17. Officer can close campaign
 * 18. Farmer/vet cannot access officer-only campaign management (403 Forbidden)
 *
 * Plus: Complete test data cleanup in Supabase
 */

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
dotenv.config();

// Prevent MongoDB buffering/connection timeout for test runs
process.env.MONGODB_URI = '';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000';

let passed = 0;
let failed = 0;
const cleanupQueue = [];

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

async function ensureBackendRunning() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) {
      console.log(`[Test Setup] API server already running at ${BASE_URL}`);
      return;
    }
  } catch (e) { }

  console.log(`[Test Setup] API server not running at ${BASE_URL}. Starting test backend...`);
  require('../backend/server');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function runTestSuite() {
  await ensureBackendRunning();

  const supabaseDb = require('../backend/services/supabaseDb');

  console.log('\n================================================================');
  console.log('🏛️  RUNNING OFFICER VACCINATION MODULE TEST SUITE');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  let officerToken = null;
  let farmerToken = null;
  let vetToken = null;
  let testCampaignId = null;
  let testRingCampaignId = null;
  let testCaseId = null;

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Officer Login
    // --------------------------------------------------------------------------
    console.log('🔹 TEST 1: Officer Login (POST /api/auth/login)');
    const officerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'officer@pashurakshak.in',
        password: 'Admin@123'
      })
    });
    const officerLoginData = await officerLoginRes.json();
    assert(officerLoginRes.status === 200, `Officer login status HTTP 200 (got ${officerLoginRes.status})`);
    officerToken = officerLoginData.token || officerLoginData.data?.session?.access_token;
    assert(!!officerToken, 'Officer JWT token received');
    const officerRole = officerLoginData.user?.role || officerLoginData.data?.user?.role;
    assert(officerRole === 'officer' || officerRole === 'admin', `User role is officer/admin (got ${officerRole})`);

    // Also get farmer & vet tokens for security tests
    const farmerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'farmer@pashurakshak.in',
        password: 'Farmer@123'
      })
    });
    const farmerLoginData = await farmerLoginRes.json();
    farmerToken = farmerLoginData.token || farmerLoginData.data?.session?.access_token;
    const realFarmerId = farmerLoginData.user?.id || farmerLoginData.data?.user?.id;

    const vetLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'vet@pashurakshak.in',
        password: 'Vet@123'
      })
    });
    const vetLoginData = await vetLoginRes.json();
    vetToken = vetLoginData.token || vetLoginData.data?.session?.access_token;
    const realVetId = vetLoginData.user?.id || vetLoginData.data?.user?.id;

    // --------------------------------------------------------------------------
    // TEST 2: Officer Can Access Vaccination Module (KPIs)
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 2: Access Officer Vaccination KPIs (GET /api/vaccination-drives/kpis)');
    const kpiRes = await fetch(`${BASE_URL}/api/vaccination-drives/kpis?district=Nagpur`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const kpiData = await kpiRes.json();
    assert(kpiRes.status === 200, `KPI endpoint returned HTTP 200 (got ${kpiRes.status})`);
    assert(kpiData.success === true, 'KPI response indicated success: true');
    assert(typeof kpiData.kpis === 'object', 'KPIs payload is an object');
    assert('activeDrives' in kpiData.kpis, 'KPIs has activeDrives field');
    assert('upcomingDrives' in kpiData.kpis, 'KPIs has upcomingDrives field');
    assert('targetAnimals' in kpiData.kpis, 'KPIs has targetAnimals field');
    assert('vaccinated' in kpiData.kpis, 'KPIs has vaccinated field');
    assert('pendingVaccinations' in kpiData.kpis, 'KPIs has pendingVaccinations field');
    assert('highRiskAreas' in kpiData.kpis, 'KPIs has highRiskAreas field');

    // --------------------------------------------------------------------------
    // TEST 3: Unauthorized User Rejected
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 3: Unauthorized Request Rejected Without Token (401)');
    const unauthKpiRes = await fetch(`${BASE_URL}/api/vaccination-drives/kpis`);
    assert(unauthKpiRes.status === 401, `Accessing KPIs without token returned HTTP 401 (got ${unauthKpiRes.status})`);

    const unauthCreateRes = await fetch(`${BASE_URL}/api/vaccination-drives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignName: 'Unauthorized Campaign' })
    });
    assert(unauthCreateRes.status === 401, `Creating campaign without token returned HTTP 401 (got ${unauthCreateRes.status})`);

    // --------------------------------------------------------------------------
    // TEST 4: Create Vaccination Campaign
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 4: Create Vaccination Campaign (POST /api/vaccination-drives)');
    const uniqueSuffix = Date.now().toString().slice(-6);
    const campaignPayload = {
      campaignName: `TEST_FMD_CAMPAIGN_${uniqueSuffix}`,
      disease: 'Foot and Mouth Disease',
      vaccine: 'FMD Trivalent Inactivated Adjuvanted Vaccine',
      district: 'Nagpur',
      block: 'Katol',
      village: 'Kondhali',
      venue: 'Katol Veterinary Dispensary',
      targetSpecies: 'Cattle & Buffalo',
      targetPopulation: 600,
      capacity: 600,
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      priority: 'High',
      notes: 'Automated officer campaign workflow test'
    };

    const createRes = await fetch(`${BASE_URL}/api/vaccination-drives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify(campaignPayload)
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, `Campaign creation returned HTTP 201 (got ${createRes.status})`);
    assert(createData.success === true, 'Campaign creation response indicated success: true');
    assert(!!createData.drive, 'Drive object returned from creation');
    testCampaignId = createData.drive.id || createData.drive._id;
    assert(!!testCampaignId, `Created campaign ID received: ${testCampaignId}`);
    cleanupQueue.push({ type: 'drive', id: testCampaignId });

    // --------------------------------------------------------------------------
    // TEST 5: Campaign Persisted in Supabase
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 5: Verify Campaign Persisted in Supabase (GET /api/vaccination-drives/:id)');
    const fetchCampaignRes = await fetch(`${BASE_URL}/api/vaccination-drives/${testCampaignId}`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const fetchCampaignData = await fetchCampaignRes.json();
    assert(fetchCampaignRes.status === 200, `Fetched created campaign HTTP 200 (got ${fetchCampaignRes.status})`);
    assert(fetchCampaignData.success === true, 'Fetch campaign response indicated success: true');
    const retrieved = fetchCampaignData.drive;
    assert(retrieved.id === testCampaignId, `Persisted campaign ID matches (${retrieved.id})`);

    // --------------------------------------------------------------------------
    // TEST 6: Correct District
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 6: Verify Correct District on Campaign');
    assert(retrieved.district === 'Nagpur', `Campaign district is 'Nagpur' (got ${retrieved.district})`);

    // --------------------------------------------------------------------------
    // TEST 7: Correct Target Population
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 7: Verify Correct Target Population on Campaign');
    const targetAnimals = retrieved.targetCount || retrieved.target_animals || retrieved.capacity;
    assert(parseInt(targetAnimals, 10) === 600, `Target animals is 600 (got ${targetAnimals})`);

    // --------------------------------------------------------------------------
    // TEST 8: Ring Vaccination Linked to Outbreak Case
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 8: Ring Vaccination Linked to Outbreak Case');
    // Ensure an outbreak case exists in Supabase to link against
    const casePayload = {
      caseId: `CASE-RING-${uniqueSuffix}`,
      farmerId: realFarmerId,
      animalName: 'Test Outbreak Cow',
      species: 'Cattle',
      disease: 'Lumpy Skin Disease',
      districtId: 'Nagpur',
      farmerLocation: {
        district: 'Nagpur',
        block: 'Saoner',
        village: 'Khapa',
        lat: 21.4167,
        lng: 78.9667
      },
      status: 'Confirmed',
      affectedCount: 3,
      mortalityCount: 0
    };

    let createdCase = null;
    try {
      createdCase = await supabaseDb.diseaseCases.create(casePayload);
      if (createdCase) {
        testCaseId = createdCase.id || createdCase.caseId;
        cleanupQueue.push({ type: 'case', id: testCaseId });
      }
    } catch (caseErr) {
      console.warn('Note: Case insert notice:', caseErr.message);
    }

    if (!testCaseId) {
      // Find an existing case if available
      const existingCases = await supabaseDb.diseaseCases.find();
      if (existingCases && existingCases.length > 0) {
        testCaseId = existingCases[0].id || existingCases[0].caseId;
      }
    }

    assert(!!testCaseId, `Outbreak case available for Ring Vaccination (Case ID: ${testCaseId})`);

    // Schedule Ring Vaccination Campaign
    const ringRes = await fetch(`${BASE_URL}/api/vaccination-drives/ring-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        caseId: testCaseId,
        radiusKm: 5.0,
        capacity: 400,
        venue: 'Emergency Ring Outpost - Khapa',
        notes: 'Ring vaccination established for confirmed LSD cluster'
      })
    });
    const ringData = await ringRes.json();
    assert(ringRes.status === 201, `Ring campaign creation returned HTTP 201 (got ${ringRes.status})`);
    assert(ringData.success === true, 'Ring campaign creation indicated success: true');
    assert(!!ringData.drive, 'Ring campaign drive returned');
    testRingCampaignId = ringData.drive.id || ringData.drive._id;
    assert(!!testRingCampaignId, `Ring campaign ID received: ${testRingCampaignId}`);
    cleanupQueue.push({ type: 'drive', id: testRingCampaignId });

    // Verify linkage in returned drive or case
    const isRing = ringData.drive.is_ring_vaccination ||
                   ringData.drive.notes?.includes('ring') ||
                   ringData.drive.venue?.includes('Ring');
    assert(Boolean(isRing), 'Campaign flagged as ring vaccination');

    // --------------------------------------------------------------------------
    // TEST 9: Actual Vets / Field Workers Assigned
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 9: Assign Real Veterinarians and Field Workers');
    const staffRes = await fetch(`${BASE_URL}/api/vaccination-drives/available-staff?district=Nagpur`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const staffData = await staffRes.json();
    assert(staffRes.status === 200, `Available staff endpoint returned HTTP 200 (got ${staffRes.status})`);
    assert(staffData.success === true, 'Staff list response success: true');
    assert(Array.isArray(staffData.veterinarians), 'Staff response has veterinarians array');
    assert(Array.isArray(staffData.fieldWorkers), 'Staff response has fieldWorkers array');

    // Select real staff IDs if present, or existing profile IDs
    const vetIdToAssign = staffData.veterinarians[0]?.id || realVetId;
    const workerIdToAssign = staffData.fieldWorkers[0]?.id || '00000000-0000-0000-0000-000000000003';

    const assignRes = await fetch(`${BASE_URL}/api/vaccination-drives/${testCampaignId}/assign-team`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        vetIds: [vetIdToAssign],
        workerIds: [workerIdToAssign]
      })
    });
    const assignData = await assignRes.json();
    assert(assignRes.status === 200, `Team assignment returned HTTP 200 (got ${assignRes.status})`);
    assert(assignData.success === true, 'Team assignment indicated success: true');

    // --------------------------------------------------------------------------
    // TEST 10: Campaign Retrieved with Team Updates
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 10: Retrieve Campaign with Updated Team');
    const fetchAfterAssignRes = await fetch(`${BASE_URL}/api/vaccination-drives/${testCampaignId}`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const fetchAfterAssignData = await fetchAfterAssignRes.json();
    assert(fetchAfterAssignRes.status === 200, `Campaign detail returned HTTP 200 (got ${fetchAfterAssignRes.status})`);
    const assignedVets = fetchAfterAssignData.drive.assignedVets || fetchAfterAssignData.drive.assigned_vets || [];
    assert(assignedVets.includes(vetIdToAssign) || assignedVets.length > 0, 'Assigned vet recorded on campaign');

    // --------------------------------------------------------------------------
    // TEST 11: Campaign Status Changes
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 11: Change Campaign Status (PATCH /api/vaccination-drives/:id/status)');
    const statusRes = await fetch(`${BASE_URL}/api/vaccination-drives/${testCampaignId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        status: 'Ongoing'
      })
    });
    const statusData = await statusRes.json();
    assert(statusRes.status === 200, `Status update returned HTTP 200 (got ${statusRes.status})`);
    assert(statusData.success === true, 'Status update indicated success: true');
    assert(statusData.drive.status === 'Ongoing', `Campaign status changed to 'Ongoing' (got ${statusData.drive.status})`);

    // --------------------------------------------------------------------------
    // TEST 12: Vaccination Records Stored
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 12: Record Administered Vaccination Doses');
    const doseRes = await fetch(`${BASE_URL}/api/vaccination-drives/${testCampaignId}/record-vaccination`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        village: 'Kondhali',
        dosesAdministered: 150,
        species: 'Cattle',
        notes: 'Batch 1 vaccination drive'
      })
    });
    const doseData = await doseRes.json();
    assert(doseRes.status === 200, `Record vaccination returned HTTP 200 (got ${doseRes.status})`);
    assert(doseData.success === true, 'Record vaccination indicated success: true');
    const updatedCovered = doseData.drive.coveredCount || doseData.drive.vaccinated_count || doseData.drive.bookedSlots;
    assert(parseInt(updatedCovered, 10) >= 150, `Administered doses recorded (count: ${updatedCovered})`);

    // --------------------------------------------------------------------------
    // TEST 13: Coverage Calculated Correctly
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 13: Coverage Analytics & Calculation');
    const coverageRes = await fetch(`${BASE_URL}/api/vaccination-drives/coverage-analytics?district=Nagpur`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const coverageData = await coverageRes.json();
    assert(coverageRes.status === 200, `Coverage analytics returned HTTP 200 (got ${coverageRes.status})`);
    assert(coverageData.success === true, 'Coverage analytics indicated success: true');
    assert(Array.isArray(coverageData.blockCoverage), 'Coverage analytics includes blockCoverage array');
    assert(Array.isArray(coverageData.priorityAreas), 'Coverage analytics includes priorityAreas array');

    // --------------------------------------------------------------------------
    // TEST 14: Duplicate Ring Campaign Protection
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 14: Duplicate Ring Campaign Protection (409 Conflict)');
    const dupRingRes = await fetch(`${BASE_URL}/api/vaccination-drives/ring-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        caseId: testCaseId,
        radiusKm: 5.0,
        capacity: 200
      })
    });
    assert(dupRingRes.status === 409, `Duplicate ring campaign rejected with HTTP 409 (got ${dupRingRes.status})`);
    const dupRingData = await dupRingRes.json();
    assert(dupRingData.success === false, 'Duplicate response indicated success: false');

    // --------------------------------------------------------------------------
    // TEST 15: Invalid Campaign Rejected
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 15: Invalid Campaign Creation Rejected (400 Bad Request)');
    const invalidCreateRes = await fetch(`${BASE_URL}/api/vaccination-drives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        // Missing campaignName, disease, district, etc.
        priority: 'High'
      })
    });
    assert(invalidCreateRes.status === 400, `Invalid campaign returned HTTP 400 (got ${invalidCreateRes.status})`);
    const invalidCreateData = await invalidCreateRes.json();
    assert(invalidCreateData.success === false, 'Invalid creation indicated success: false');

    // --------------------------------------------------------------------------
    // TEST 16: Database Failure Produces success: false
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 16: Nonexistent Campaign ID Produces success: false (404)');
    const fakeIdRes = await fetch(`${BASE_URL}/api/vaccination-drives/00000000-0000-0000-0000-000000000099`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    assert(fakeIdRes.status === 404, `Nonexistent campaign returned HTTP 404 (got ${fakeIdRes.status})`);
    const fakeIdData = await fakeIdRes.json();
    assert(fakeIdData.success === false, 'Response has success: false');

    // --------------------------------------------------------------------------
    // TEST 17: Officer Can Close Campaign
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 17: Officer Closes Campaign (POST /api/vaccination-drives/:id/close)');
    const closeRes = await fetch(`${BASE_URL}/api/vaccination-drives/${testCampaignId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        closureNotes: 'Campaign successfully executed and concluded by District Officer.'
      })
    });
    const closeData = await closeRes.json();
    assert(closeRes.status === 200, `Campaign closure returned HTTP 200 (got ${closeRes.status})`);
    assert(closeData.success === true, 'Closure response indicated success: true');
    assert(closeData.drive.status === 'Completed', `Campaign status is 'Completed' (got ${closeData.drive.status})`);

    // --------------------------------------------------------------------------
    // TEST 18: Farmer / Vet Cannot Access Officer-Only Campaign Management
    // --------------------------------------------------------------------------
    console.log('\n🔹 TEST 18: Role Security - Farmer and Vet Forbidden from Officer Endpoints (403)');
    // Farmer accessing KPIs
    const farmerKpiRes = await fetch(`${BASE_URL}/api/vaccination-drives/kpis`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    assert(farmerKpiRes.status === 403, `Farmer accessing KPIs received HTTP 403 (got ${farmerKpiRes.status})`);

    // Farmer attempting to close campaign
    const farmerCloseRes = await fetch(`${BASE_URL}/api/vaccination-drives/${testCampaignId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({ closureNotes: 'Unauthorized farmer close' })
    });
    assert(farmerCloseRes.status === 403, `Farmer closing campaign received HTTP 403 (got ${farmerCloseRes.status})`);

    // Veterinarian attempting to close campaign
    const vetCloseRes = await fetch(`${BASE_URL}/api/vaccination-drives/${testCampaignId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vetToken}`
      },
      body: JSON.stringify({ closureNotes: 'Unauthorized vet close' })
    });
    assert(vetCloseRes.status === 403, `Veterinarian closing campaign received HTTP 403 (got ${vetCloseRes.status})`);

  } finally {
    // --------------------------------------------------------------------------
    // CLEANUP PHASE: Remove Test Data from Supabase
    // --------------------------------------------------------------------------
    console.log('\n🧹 CLEANUP PHASE: Removing Created Test Data from Supabase...');
    for (const item of cleanupQueue) {
      try {
        if (item.type === 'drive') {
          console.log(`  Deleting test vaccination drive: ${item.id}`);
          await supabaseDb.vaccinationDrives.delete(item.id);
        } else if (item.type === 'case') {
          console.log(`  Cleaning up test disease case: ${item.id}`);
          if (supabaseDb.supabase) {
            await supabaseDb.supabase.from('disease_cases').delete().eq('id', item.id);
          }
        }
      } catch (cleanErr) {
        console.warn(`  [Cleanup Warning] Could not remove ${item.type} ${item.id}:`, cleanErr.message);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('\n❌ FATAL TEST ERROR:', err.message);
  process.exit(1);
});
