/**
 * Comprehensive Veterinary Workflow End-to-End Test Suite
 * File: tests/test_complete_veterinary_workflow.js
 *
 * Covers the complete 5-stage Veterinary Lifecycle:
 * 1. Farmer initiates referral (POST /api/cases)
 * 2. Notification & case_notified_vets verified in Supabase
 * 3. District Veterinarian fetches open cases (GET /api/cases?district=Nagpur)
 * 4. Vet claims case (PATCH /api/cases/:id/claim) -> status: Investigating
 * 5. Vet updates status with investigation notes (PATCH /api/cases/:id/status)
 * 6. Vet creates Lab referral linked to case (POST /api/lab-referrals)
 * 7. Lab referral fetched & verified (GET /api/lab-referrals)
 * 8. Lab sample updated to Result Confirmed (PATCH /api/lab-referrals/:id)
 * 9. Case clinical diagnosis updated & advanced to Confirmed (PATCH /api/cases/:id/status)
 * 10. Vet creates Containment Zone (POST /api/cases/containment-zones)
 * 11. Containment Zone status verified in Supabase & case advanced to Containment
 * 12. Ring vaccination drive scheduled (POST /api/cases/:id/schedule-ring-vaccination)
 * 13. Case marked Resolved with prescription & treatment notes (PATCH /api/cases/:id/status)
 * 14. Verification of animal_treatments record in Supabase
 * 15. Farmer queries case details and verifies full timeline audit trail
 * 16. Cleanup of test artifacts
 */

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const http = require('http');
const https = require('https');
const { supabase, createSupabaseToken } = require('../backend/config/supabaseClient');
const supabaseDb = require('../backend/services/supabaseDb');

const PORT = process.env.TEST_PORT || process.env.PORT || 5000;
const BASE_URL = process.env.TEST_API_URL || `http://127.0.0.1:${PORT}`;

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

async function request(url, options = {}, body = null) {
  const isHttps = url.startsWith('https');
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
          raw: data
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function ensureBackendRunning() {
  try {
    const res = await request(`${BASE_URL}/health`);
    if (res.status === 200) {
      console.log(`[Test Setup] API server already running at ${BASE_URL}`);
      return;
    }
  } catch (e) {}

  console.log(`[Test Setup] Starting API server on port ${PORT}...`);
  require('../backend/server');
  await new Promise((resolve) => setTimeout(resolve, 2500));
}

async function runCompleteVeterinaryWorkflowTests() {
  await ensureBackendRunning();

  console.log('================================================================');
  console.log('🧪 END-TO-END VETERINARY WORKFLOW INTEGRATION TEST');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  // Actors
  const farmerData = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Ramesh Patil (रमेश पाटील)',
    email: 'farmer@pashurakshak.in',
    role: 'farmer',
    district: 'Nagpur'
  };
  const farmerToken = createSupabaseToken(farmerData);

  const vetData = {
    id: '00000000-0000-0000-0000-000000000007',
    name: 'Dr. Priya Joshi',
    email: 'priya.vet@pashurakshak.in',
    role: 'veterinarian',
    district: 'Nagpur'
  };
  const vetToken = createSupabaseToken(vetData);

  // Setup: Create test animal in Nagpur for farmer
  const testTagId = `VET-TEST-${Date.now()}`;
  const { data: createdAnimal, error: animalErr } = await supabase
    .from('animals')
    .insert({
      owner_id: farmerData.id,
      tag_id: testTagId,
      species: 'Cattle',
      name: 'Nandi Vet Test',
      breed: 'Gir',
      gender: 'Male',
      district: 'Nagpur',
      village: 'Kamptee',
      block: 'Kamptee'
    })
    .select()
    .single();

  if (animalErr || !createdAnimal) {
    throw new Error(`Failed to create test animal in Supabase: ${animalErr?.message}`);
  }
  console.log(`Created test animal: ${createdAnimal.id} (${testTagId})`);

  let createdCaseId = null;
  let createdCaseUuid = null;
  let createdLabReferralId = null;
  let createdZoneId = null;

  try {
    // ---------------------------------------------------------------------------
    // STAGE 1: Farmer Referral (POST /api/cases)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 1: Farmer Creates Referral Case');
    const referralPayload = {
      animalId: createdAnimal.id,
      animalName: createdAnimal.name,
      species: createdAnimal.species,
      disease: 'Lumpy Skin Disease (Outbreak Suspected)',
      confidence: 94.5,
      risk: 'High',
      district: 'Nagpur',
      symptoms: ['Nodules on skin', 'High fever', 'Loss of appetite'],
      location: {
        district: 'Nagpur',
        village: 'Kamptee',
        coordinates: [79.20, 21.22]
      }
    };

    const createCaseRes = await request(
      `${BASE_URL}/api/cases`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${farmerToken}` }
      },
      referralPayload
    );

    assert(createCaseRes.status === 201, `Case created with HTTP 201 (got ${createCaseRes.status})`);
    assert(!!createCaseRes.body?.case?.caseId, 'Response returns generated caseId');
    createdCaseId = createCaseRes.body.case.caseId;
    createdCaseUuid = createCaseRes.body.case.id;
    console.log(`  Case created: ${createdCaseId} (UUID: ${createdCaseUuid})`);

    // ---------------------------------------------------------------------------
    // STAGE 2: Verification of Notifications & Notified Vets
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 2: Verify Supabase Notifications & case_notified_vets');
    const { data: notifiedVets, error: notifErr } = await supabase
      .from('case_notified_vets')
      .select('*')
      .eq('case_id', createdCaseUuid);

    assert(!notifErr && notifiedVets?.length > 0, `Notified vets recorded in Supabase (count: ${notifiedVets?.length})`);
    const isPriyaNotified = notifiedVets.some((v) => v.vet_id === vetData.id || v.veterinarian_id === vetData.id);
    assert(isPriyaNotified, `Dr. Priya Joshi was notified for case ${createdCaseId}`);

    // ---------------------------------------------------------------------------
    // STAGE 3: Veterinarian Fetches District Cases (GET /api/cases)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 3: Veterinarian Fetches Cases for Nagpur District');
    const getCasesRes = await request(
      `${BASE_URL}/api/cases?district=Nagpur`,
      {
        headers: { Authorization: `Bearer ${vetToken}` }
      }
    );

    assert(getCasesRes.status === 200, `Vet GET /api/cases returns HTTP 200 (got ${getCasesRes.status})`);
    const foundCase = getCasesRes.body?.cases?.find((c) => c.caseId === createdCaseId || c.case_id === createdCaseId);
    assert(!!foundCase, `Case ${createdCaseId} is present in veterinarian portal list`);
    assert(foundCase.status === 'New', 'Initial status is "New"');

    // ---------------------------------------------------------------------------
    // STAGE 4: Veterinarian Claims Case (PATCH /api/cases/:id/claim)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 4: Dr. Priya Joshi Claims the Case');
    const claimRes = await request(
      `${BASE_URL}/api/cases/${createdCaseId}/claim`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${vetToken}` }
      }
    );

    assert(claimRes.status === 200, `Claim endpoint returns HTTP 200 (got ${claimRes.status})`);
    assert(claimRes.body?.case?.status === 'Investigating', 'Status advanced to "Investigating" upon claim');
    assert(
      claimRes.body?.case?.assignedVetId?.id === vetData.id ||
      claimRes.body?.case?.assignedVetId === vetData.id ||
      claimRes.body?.case?.assignedVet?.id === vetData.id,
      'Assigned veterinarian correctly matches Dr. Priya Joshi'
    );

    // ---------------------------------------------------------------------------
    // STAGE 5: Advance Status with Investigation Notes (PATCH /api/cases/:id/status)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 5: Veterinarian Updates Investigation Notes');
    const updateNotesRes = await request(
      `${BASE_URL}/api/cases/${createdCaseId}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${vetToken}` }
      },
      {
        status: 'Investigating',
        notes: 'Field visit conducted at Kamptee farm. 14 circumscribed skin nodules observed, rectal temp 104.2 F.',
        investigationNotes: 'Skin lesions consistent with Capripoxvirus presentation. Sample needed for confirmatory PCR.',
        affectedCount: 2
      }
    );

    assert(updateNotesRes.status === 200, `Status update returns HTTP 200 (got ${updateNotesRes.status})`);
    assert(updateNotesRes.body?.case?.investigationNotes?.includes('Capripoxvirus'), 'Investigation notes saved in Supabase');

    // ---------------------------------------------------------------------------
    // STAGE 6: Veterinarian Creates Lab Referral (POST /api/lab-referrals)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 6: Create Lab Referral Linked to Case');
    const labPayload = {
      caseId: createdCaseId,
      animalId: createdAnimal.id,
      sampleType: 'Skin Scrapie / Serum',
      suspectedDisease: 'Lumpy Skin Disease Virus',
      urgency: 'HIGH',
      notes: 'Diagnostic PCR requested for Capripoxvirus genome confirmation'
    };

    const createLabRes = await request(
      `${BASE_URL}/api/lab-referrals`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${vetToken}` }
      },
      labPayload
    );

    assert(createLabRes.status === 201, `Lab referral created with HTTP 201 (got ${createLabRes.status})`);
    assert(!!createLabRes.body?.referral?.id, 'Lab referral returns ID');
    createdLabReferralId = createLabRes.body.referral.id;
    console.log(`  Lab referral ID: ${createdLabReferralId}`);

    // ---------------------------------------------------------------------------
    // STAGE 7: Get Lab Referrals (GET /api/lab-referrals)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 7: Fetch Lab Referrals');
    const getLabRes = await request(
      `${BASE_URL}/api/lab-referrals`,
      {
        headers: { Authorization: `Bearer ${vetToken}` }
      }
    );

    assert(getLabRes.status === 200, `GET /api/lab-referrals returns HTTP 200 (got ${getLabRes.status})`);
    const foundLab = getLabRes.body?.referrals?.find((r) => r.id === createdLabReferralId);
    assert(!!foundLab, 'Created lab referral is found in Supabase list');
    assert(
      foundLab.status === 'Collected' ||
      foundLab.status === 'SAMPLE_COLLECTED' ||
      foundLab.status === 'PENDING',
      'Lab sample status is initialized'
    );

    // ---------------------------------------------------------------------------
    // STAGE 8: Lab Sample Result Confirmed (PATCH /api/lab-referrals/:id)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 8: Update Lab Sample to Result Confirmed');
    const updateLabRes = await request(
      `${BASE_URL}/api/lab-referrals/${createdLabReferralId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${vetToken}` }
      },
      {
        status: 'RESULT_CONFIRMED',
        testResult: 'POSITIVE',
        resultNotes: 'RT-PCR confirmed Capripoxvirus (LSDV) DNA detected with high viral load.'
      }
    );

    assert(updateLabRes.status === 200, `Lab update returns HTTP 200 (got ${updateLabRes.status})`);
    assert(updateLabRes.body?.referral?.status === 'RESULT_CONFIRMED', 'Lab referral status updated to RESULT_CONFIRMED');

    // ---------------------------------------------------------------------------
    // STAGE 9: Advance Case to Confirmed (PATCH /api/cases/:id/status)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 9: Advance Case Status to "Confirmed"');
    const confirmCaseRes = await request(
      `${BASE_URL}/api/cases/${createdCaseId}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${vetToken}` }
      },
      {
        status: 'Confirmed',
        clinicalDiagnosis: 'Lumpy Skin Disease (Capripoxvirus) - Laboratory Confirmed',
        notes: 'Laboratory PCR confirmation received positive. Containment measures initiated immediately.'
      }
    );

    assert(confirmCaseRes.status === 200, `Confirm status update returns HTTP 200 (got ${confirmCaseRes.status})`);
    assert(confirmCaseRes.body?.case?.status === 'Confirmed', 'Case status is now "Confirmed"');

    // ---------------------------------------------------------------------------
    // STAGE 10: Create Containment Zone (POST /api/cases/containment-zones)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 10: Create Containment Zone around Outbreak Epicenter');
    const containmentPayload = {
      caseId: createdCaseId,
      epicenterLat: 21.22,
      epicenterLng: 79.20,
      radiusKm: 5.0,
      zoneType: 'INFECTED_ZONE',
      disease: 'Lumpy Skin Disease',
      district: 'Nagpur',
      state: 'Maharashtra',
      village: 'Kamptee',
      quarantineStrictness: 'MANDATORY_LOCKDOWN'
    };

    const createZoneRes = await request(
      `${BASE_URL}/api/cases/containment-zones`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${vetToken}` }
      },
      containmentPayload
    );

    assert(createZoneRes.status === 201, `Containment zone created with HTTP 201 (got ${createZoneRes.status})`);
    assert(!!createZoneRes.body?.zone?.zoneId, 'Zone returns zoneId');
    createdZoneId = createZoneRes.body.zone.zoneId;
    console.log(`  Containment zone created: ${createdZoneId}`);

    // Verify containment zones query
    const getZonesRes = await request(
      `${BASE_URL}/api/cases/containment-zones?district=Nagpur`,
      {
        headers: { Authorization: `Bearer ${vetToken}` }
      }
    );
    assert(getZonesRes.status === 200, `GET containment zones returns HTTP 200 (got ${getZonesRes.status})`);
    const foundZone = getZonesRes.body?.zones?.find((z) => z.zoneId === createdZoneId);
    assert(!!foundZone, `Zone ${createdZoneId} found in district containment zones`);

    // ---------------------------------------------------------------------------
    // STAGE 11: Schedule Ring Vaccination (POST /api/cases/:id/schedule-ring-vaccination)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 11: Schedule Ring Vaccination Drive for Outbreak Case');
    const ringVaccinePayload = {
      targetVillages: ['Kamptee', 'Kanhan', 'New Kamptee'],
      targetRadiusKm: 5.0,
      vaccineName: 'Goat Pox Vaccine (Heterologous for LSD)',
      targetAnimals: 350,
      targetSpecies: 'Cattle',
      scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
    };

    const ringRes = await request(
      `${BASE_URL}/api/cases/${createdCaseId}/schedule-ring-vaccination`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${vetToken}` }
      },
      ringVaccinePayload
    );

    assert(ringRes.status === 201 || ringRes.status === 200, `Ring vaccination scheduled with HTTP 201/200 (got ${ringRes.status})`);
    assert(!!ringRes.body?.drive?.id, 'Vaccination drive created and linked');

    // ---------------------------------------------------------------------------
    // STAGE 12: Resolve Case with Treatment & Prescription (PATCH /api/cases/:id/status)
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 12: Advance Case to "Resolved" with Prescription');
    const resolveCaseRes = await request(
      `${BASE_URL}/api/cases/${createdCaseId}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${vetToken}` }
      },
      {
        status: 'Resolved',
        treatmentNotes: 'Antiseptic wound dressing applied to ruptured nodules. Anti-inflammatory and multivitamin course completed. Full clinical recovery.',
        prescription: 'Flunixin Meglumine 10ml IM x 3 days, Enrofloxacin 10% 15ml IM x 5 days, Topical Iodoform spray daily',
        notes: 'Case resolved. Animal fully recovered, lesions healed. Isolation protocol successfully terminated.'
      }
    );

    assert(resolveCaseRes.status === 200, `Resolve status update returns HTTP 200 (got ${resolveCaseRes.status})`);
    assert(resolveCaseRes.body?.case?.status === 'Resolved', 'Case status is now "Resolved"');

    // ---------------------------------------------------------------------------
    // STAGE 13: Verify animal_treatments Record in Supabase
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 13: Verify animal_treatments Record in Supabase');
    const { data: treatments, error: treatErr } = await supabase
      .from('animal_treatments')
      .select('*')
      .eq('animal_id', createdAnimal.id);

    assert(!treatErr && treatments?.length > 0, `animal_treatments entry created in Supabase (count: ${treatments?.length})`);
    const hasPrescription = treatments.some(
      (t) => (t.treatment && t.treatment.includes('Flunixin Meglumine')) ||
             (t.prescription && t.prescription.includes('Flunixin Meglumine'))
    );
    assert(hasPrescription, 'Prescription details accurately stored in animal_treatments');
    const hasVet = treatments.some((t) => t.vet_id === vetData.id);
    assert(hasVet, 'Prescribing vet matches Dr. Priya Joshi');

    // ---------------------------------------------------------------------------
    // STAGE 14: Farmer Case Retrieval & Audit Trail Verification
    // ---------------------------------------------------------------------------
    console.log('\n🔹 STEP 14: Farmer Retrieves Full Case & Timeline');
    const farmerCaseRes = await request(
      `${BASE_URL}/api/cases/${createdCaseId}`,
      {
        headers: { Authorization: `Bearer ${farmerToken}` }
      }
    );

    assert(farmerCaseRes.status === 200, `Farmer GET /api/cases/:id returns HTTP 200 (got ${farmerCaseRes.status})`);
    const fetchedCase = farmerCaseRes.body?.case;
    assert(fetchedCase.status === 'Resolved', 'Farmer sees case status as "Resolved"');
    assert(
      fetchedCase.assignedVet?.name === 'Dr. Priya Joshi' ||
      fetchedCase.assignedVetId?.name === 'Dr. Priya Joshi',
      'Farmer sees Dr. Priya Joshi as assigned veterinarian'
    );
    assert(Array.isArray(fetchedCase.timeline) && fetchedCase.timeline.length >= 4, `Full audit trail in timeline (events: ${fetchedCase.timeline?.length})`);
    assert(Array.isArray(fetchedCase.treatments) && fetchedCase.treatments.length > 0, 'Treatments attached to case record for farmer');

  } finally {
    // ---------------------------------------------------------------------------
    // CLEANUP: Clean up test records
    // ---------------------------------------------------------------------------
    console.log('\n🔹 CLEANUP: Cleaning up test records from database...');
    if (createdZoneId) {
      await supabase.from('containment_zones').delete().eq('zone_id', createdZoneId);
      console.log(`  Removed containment zone: ${createdZoneId}`);
    }
    if (createdLabReferralId) {
      await supabase.from('lab_referrals').delete().eq('id', createdLabReferralId);
      console.log(`  Removed lab referral: ${createdLabReferralId}`);
    }
    if (createdCaseUuid) {
      await supabase.from('case_timeline').delete().eq('case_id', createdCaseUuid);
      await supabase.from('case_notified_vets').delete().eq('case_id', createdCaseUuid);
      await supabase.from('disease_cases').delete().eq('id', createdCaseUuid);
      console.log(`  Removed case records for: ${createdCaseUuid}`);
    }
    if (createdAnimal?.id) {
      await supabase.from('animal_treatments').delete().eq('animal_id', createdAnimal.id);
      await supabase.from('animals').delete().eq('id', createdAnimal.id);
      console.log(`  Removed test animal: ${createdAnimal.id}`);
    }
  }

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCompleteVeterinaryWorkflowTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
