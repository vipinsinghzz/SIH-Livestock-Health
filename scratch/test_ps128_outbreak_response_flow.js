// Native fetch integration test for PS128 Outbreak Map & Response flow
const API_BASE = 'http://127.0.0.1:5000/api';

async function req(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTest() {
  console.log('=== STARTING PS-128 OUTBREAK MAP & RESPONSE SYSTEM INTEGRATION TEST ===\n');

  try {
    // 1. Authenticate Farmer
    console.log('1. Authenticating Farmer (farmer@pashurakshak.in)...');
    const farmerLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'farmer@pashurakshak.in', password: 'Farmer@123' })
    });
    if (!farmerLogin.ok) throw new Error(`Farmer login failed: ${JSON.stringify(farmerLogin.data)}`);
    const farmerToken = farmerLogin.data.token;
    const farmerUser = farmerLogin.data.user;
    console.log(`✓ Farmer authenticated: ${farmerUser.name} (${farmerUser.district || 'Pune'})\n`);

    // 2. Authenticate Vet 1 (Dr. Ananya Deshmukh)
    console.log('2. Authenticating Vet 1 (vet@pashurakshak.in)...');
    const vet1Login = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'vet@pashurakshak.in', password: 'Vet@123' })
    });
    if (!vet1Login.ok) throw new Error(`Vet 1 login failed: ${JSON.stringify(vet1Login.data)}`);
    const vet1Token = vet1Login.data.token;
    const vet1User = vet1Login.data.user;
    console.log(`✓ Vet 1 authenticated: ${vet1User.name}, District: ${vet1User.district}\n`);

    // 3. Authenticate Vet 2 (Dr. Rajesh Shinde)
    console.log('3. Authenticating Vet 2 (vet2@pashurakshak.in)...');
    const vet2Login = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'vet2@pashurakshak.in', password: 'Vet@123' })
    });
    if (!vet2Login.ok) throw new Error(`Vet 2 login failed: ${JSON.stringify(vet2Login.data)}`);
    const vet2Token = vet2Login.data.token;
    const vet2User = vet2Login.data.user;
    console.log(`✓ Vet 2 authenticated: ${vet2User.name}, District: ${vet2User.district}\n`);

    // 4. Farmer creates a new referral case
    console.log('4. Farmer creating DiseaseCase with Lumpy Skin Disease in Pune...');
    const createCaseRes = await req('/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        species: 'Cattle',
        animalName: 'Gauri',
        disease: 'Lumpy Skin Disease',
        confidence: 94,
        risk: 'Critical',
        affectedCount: 2,
        district: 'Pune',
        coordinates: { lat: 18.5204, lng: 73.8567 },
        symptoms: ['Skin Nodules', 'High Fever', 'Enlarged Lymph Nodes', 'Lethargy'],
        temperature: 40.2,
        duration: 4,
        notes: 'Multiple nodules erupted over neck and flank over past 48 hours.'
      })
    });
    if (!createCaseRes.ok) throw new Error(`Create case failed: ${JSON.stringify(createCaseRes.data)}`);
    const newCase = createCaseRes.data.case;
    console.log(`✓ Case Created: ${newCase.caseId} (Status: ${newCase.status}, Affected: ${newCase.affectedCount})`);
    console.log(`  Matching district vets notified: ${createCaseRes.data.matchingVetsCount}\n`);

    // 5. Vet 1 queries district cases
    console.log('5. Vet 1 retrieving district cases in Pune...');
    const vetCasesRes = await req('/cases?district=Pune', {
      headers: { Authorization: `Bearer ${vet1Token}` }
    });
    const foundInQueue = vetCasesRes.data.cases?.find((c) => c._id === newCase._id);
    if (!foundInQueue) throw new Error('Newly created case not found in district vet queue!');
    console.log(`✓ Case ${newCase.caseId} found in Vet queue. Status: ${foundInQueue.status}\n`);

    // 6. Concurrency Test: Atomic Case Claim
    console.log('6. Testing Concurrency: Vet 1 claims case first...');
    const claimRes1 = await req(`/cases/${newCase._id}/claim`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vet1Token}` }
    });
    if (!claimRes1.ok) throw new Error(`Claim failed: ${JSON.stringify(claimRes1.data)}`);
    console.log(`✓ Vet 1 claimed successfully: status = ${claimRes1.data.case.status}, assigned to Dr. ${claimRes1.data.case.assignedVetId.name}`);

    console.log('   Now Vet 2 attempts to claim the same case...');
    const claimRes2 = await req(`/cases/${newCase._id}/claim`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vet2Token}` }
    });
    if (claimRes2.status === 409) {
      console.log(`✓ PASS: Race condition prevented! Vet 2 received 409 Conflict: "${claimRes2.data.message}"\n`);
    } else {
      throw new Error(`FAILED: Expected 409 Conflict for Vet 2, got: ${claimRes2.status} ${JSON.stringify(claimRes2.data)}`);
    }

    // 7. Vet 1 advances status: Investigating -> Confirmed
    console.log('7. Vet 1 confirming clinical diagnosis...');
    const confirmRes = await req(`/cases/${newCase._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vet1Token}` },
      body: JSON.stringify({
        status: 'Confirmed',
        clinicalDiagnosis: 'Lumpy Skin Disease (Field Confirmed by Lesion PCR & Clinical Signs)',
        affectedCount: 3,
        investigationNotes: 'Visited farm, isolated 3 crossbred heifers with cutaneous nodules.'
      })
    });
    if (!confirmRes.ok) throw new Error(`Confirm failed: ${JSON.stringify(confirmRes.data)}`);
    console.log(`✓ Case updated to: ${confirmRes.data.case.status}`);
    console.log(`  Clinical Diagnosis: ${confirmRes.data.case.clinicalDiagnosis}\n`);

    // 8. Vet 1 declares Containment Zone around case
    console.log('8. Vet 1 declaring 5km Containment Zone for case...');
    const zoneRes = await req('/cases/containment-zones', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vet1Token}` },
      body: JSON.stringify({
        caseId: newCase._id,
        disease: 'Lumpy Skin Disease',
        district: 'Pune',
        radiusKm: 5.0,
        enforcedRules: [
          'Mandatory isolation of affected animals',
          'Strict ban on cattle transport across 5km perimeter',
          'Daily disinfectant spraying of barns with 1% Virkon-S'
        ],
        notes: 'Emergency quarantine established following confirmed LSD cluster.'
      })
    });
    if (!zoneRes.ok) throw new Error(`Containment zone creation failed: ${JSON.stringify(zoneRes.data)}`);
    const createdZone = zoneRes.data.zone;
    console.log(`✓ Containment Zone Declared: ${createdZone.zoneId} (${createdZone.radiusKm} km radius, Status: ${createdZone.status})`);
    console.log(`  Linked Case Status advanced to: ${zoneRes.data.case?.status}\n`);

    // 9. Vet 1 schedules Emergency Ring Vaccination
    console.log('9. Vet 1 scheduling Emergency Ring Vaccination drive for the containment zone...');
    const ringRes = await req(`/cases/${newCase._id}/schedule-ring-vaccination`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vet1Token}` },
      body: JSON.stringify({
        venue: 'Primary Veterinary Clinic & Outreach Unit, Malegaon',
        campDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        capacity: 350,
        notes: 'Ring vaccination for all healthy bovine within 5km of outbreak index case.'
      })
    });
    if (!ringRes.ok) throw new Error(`Ring vaccination failed: ${JSON.stringify(ringRes.data)}`);
    const scheduledDrive = ringRes.data.drive;
    console.log(`✓ Ring Vaccination Scheduled: ${scheduledDrive.campId}`);
    console.log(`  Vaccine: ${scheduledDrive.vaccine}`);
    console.log(`  Capacity: ${scheduledDrive.capacity} doses`);
    console.log(`  Linked to Case ID: ${ringRes.data.case.ringVaccinationDriveId}\n`);

    // 10. Spatial Outbreak Clusters
    console.log('10. Querying Spatial Outbreak Clusters in Pune (<= 5km grouping)...');
    const clustersRes = await req('/cases/clusters?district=Pune', {
      headers: { Authorization: `Bearer ${vet1Token}` }
    });
    if (!clustersRes.ok) throw new Error(`Clusters query failed: ${JSON.stringify(clustersRes.data)}`);
    console.log(`✓ Spatial Clusters in Pune: ${clustersRes.data.count} cluster(s)`);
    clustersRes.data.clusters.forEach((cl) => {
      console.log(`  • [${cl.clusterId}] ${cl.disease} | Cases: ${cl.caseCount}, Affected: ${cl.totalAffected}, Radius: ${cl.radiusKm}km, Outbreak: ${cl.isOutbreak}, Risk: ${cl.risk}`);
    });
    console.log();

    // 11. Dynamic AI Preventive Advisory
    console.log('11. Querying Dynamic AI Preventive Advisory for Pune...');
    const advRes = await req('/cases/advisories?district=Pune', {
      headers: { Authorization: `Bearer ${vet1Token}` }
    });
    if (!advRes.ok) throw new Error(`Advisory failed: ${JSON.stringify(advRes.data)}`);
    console.log(`✓ Dynamic Advisory Summary:`);
    console.log(`  Active Cases: ${advRes.data.summary.activeCasesCount}`);
    console.log(`  Total Animals Affected: ${advRes.data.summary.totalAnimalsAffected}`);
    console.log(`  Active Containment Zones: ${advRes.data.summary.activeContainmentZones}`);
    console.log(`  Top Recommendations:`);
    advRes.data.recommendations.forEach((rec) => {
      console.log(`  - [${rec.priority}] ${rec.disease}: ${rec.protocol}`);
    });
    console.log();

    // 12. Vet 1 marks Case Resolved
    console.log('12. Vet 1 marking case Resolved after treatment...');
    const resolveRes = await req(`/cases/${newCase._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vet1Token}` },
      body: JSON.stringify({
        status: 'Resolved',
        treatmentNotes: 'Heifers showed complete skin lesion regression, normal body temperature, returned to feeding.',
        prescription: 'Neem-turmeric ointment applied, course of multivitamins and supportive fluids completed.'
      })
    });
    if (!resolveRes.ok) throw new Error(`Resolve failed: ${JSON.stringify(resolveRes.data)}`);
    console.log(`✓ Case status successfully updated to: ${resolveRes.data.case.status}`);
    console.log(`  Resolved At: ${resolveRes.data.case.resolvedAt}\n`);

    console.log('=== ALL PS-128 VETERINARY OUTBREAK MAP & RESPONSE TESTS PASSED! ===');
  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTest();
