const path = require('path');
const dotenv = require(path.join(process.cwd(), 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const { supabase } = require('../backend/config/supabaseClient');
const supabaseDb = require('../backend/services/supabaseDb');
const notificationService = require('../backend/services/notificationService');

async function runProductionVerification() {
  console.log('================================================================');
  console.log('🔍 LIVE PRODUCTION SUPABASE REFERRAL INTEGRITY VERIFICATION');
  console.log('Target: https://obgcmrgjulmgumdroixq.supabase.co');
  console.log('================================================================\n');

  // 1. Verify Veterinarians in Nagpur
  console.log('--- 1. Querying District Vets for Nagpur ---');
  const nagpurVets = await supabaseDb.veterinarians.findByDistrict('Nagpur');
  console.log(`Found ${nagpurVets.length} vets in Nagpur:`);
  nagpurVets.forEach(v => console.log(`  - ${v.name} (${v.role}) [ID: ${v.id}]`));

  if (nagpurVets.length !== 2) {
    throw new Error(`Expected 2 vets in Nagpur, got ${nagpurVets.length}`);
  }

  // 2. Create a Real Referral Case in Supabase
  console.log('\n--- 2. Creating ONE Live Referral Case in Supabase ---');
  const caseId = `CASE-2026-NAG-${Math.floor(1000 + Math.random() * 9000)}`;
  const farmerId = '00000000-0000-0000-0000-000000000001';

  const newCase = await supabaseDb.diseaseCases.create({
    caseId,
    farmerId,
    animalName: 'Gauri (Cow)',
    species: 'Cattle',
    disease: 'Lumpy Skin Disease',
    confidence: 94,
    risk: 'High',
    districtId: 'Nagpur',
    state: 'Maharashtra',
    latitude: 21.1458,
    longitude: 79.0882,
    farmerLocation: {
      village: 'Kamptee',
      block: 'Kamptee',
      district: 'Nagpur',
      state: 'Maharashtra'
    },
    farmerContact: {
      name: 'Ramesh Patil (रमेश पाटील)',
      phone: '+919822011223'
    },
    symptoms: ['Nodules on skin', 'High fever', 'Loss of appetite'],
    temperature: 40.2,
    duration: 48,
    affectedCount: 1,
    notes: 'Visible skin nodules observed on neck and torso',
    status: 'New',
    timelineNotes: 'Referral case initiated following AI detection (Lumpy Skin Disease - 94% confidence).'
  });

  console.log(`Created Case in Supabase: ${newCase.caseId} (UUID: ${newCase.id})`);

  // 3. Dispatch Notifications via fixed NotificationService
  console.log('\n--- 3. Dispatching Notifications to District Vets ---');
  const notifiedVets = await notificationService.notifyDistrictVets(newCase, nagpurVets);
  console.log(`notificationService returned ${notifiedVets.length} dispatched records.`);

  // 4. Verify Supabase Database Records
  console.log('\n--- 4. Verifying Exact Supabase Production Records ---');
  const { data: dbCases } = await supabase.from('disease_cases').select('*').eq('id', newCase.id);
  const { data: dbNotifs } = await supabase.from('notifications').select('*').eq('case_id', newCase.id);
  const { data: dbNotifiedVets } = await supabase.from('case_notified_vets').select('*').eq('case_id', newCase.id);
  const { data: dbTimeline } = await supabase.from('case_timeline').select('*').eq('case_id', newCase.id);

  console.log(`  disease_cases count:      ${dbCases.length} (Expected: 1)`);
  console.log(`  notifications count:      ${dbNotifs.length} (Expected: 2, matching 2 vets)`);
  console.log(`  case_notified_vets count: ${dbNotifiedVets.length} (Expected: 2, matching 2 vets)`);
  console.log(`  case_timeline count:      ${dbTimeline.length} (Expected: 1)`);

  const exactMatches = 
    dbCases.length === 1 &&
    dbNotifs.length === nagpurVets.length &&
    dbNotifiedVets.length === nagpurVets.length &&
    dbTimeline.length === 1;

  console.log('\n--- Exact 1-to-1 Parity Check ---');
  if (exactMatches) {
    console.log('✅ PASS: Exact 1-to-1 match confirmed! (2 vets = 2 notifications = 2 case_notified_vets)');
  } else {
    console.error('❌ FAIL: Discrepancy detected in record counts!');
    process.exit(1);
  }

  // 5. Test Duplicate Referral Prevention
  console.log('\n--- 5. Testing Duplicate Referral Prevention ---');
  const duplicateCheck = await supabaseDb.diseaseCases.findActiveByAnimalOrFarmer({
    farmerId,
    disease: 'Lumpy Skin Disease'
  });

  if (duplicateCheck && duplicateCheck.caseId === caseId) {
    console.log(`✅ PASS: Duplicate check accurately retrieved existing active case ${duplicateCheck.caseId}`);
  } else {
    console.error('❌ FAIL: Duplicate check failed to find existing active case.');
    process.exit(1);
  }

  // 6. Test Vet Portal Visibility
  console.log('\n--- 6. Testing Veterinarian Portal Visibility ---');
  const vetPortalCases = await supabaseDb.diseaseCases.find({ district: 'Nagpur' });
  const foundInVetPortal = vetPortalCases.some(c => c.caseId === caseId);
  if (foundInVetPortal) {
    console.log(`✅ PASS: Case ${caseId} is immediately visible in Vet Portal district feed for Nagpur!`);
  } else {
    console.error(`❌ FAIL: Case ${caseId} not visible in Vet Portal!`);
    process.exit(1);
  }

  // 7. Test Farmer Status Retrieval
  console.log('\n--- 7. Testing Farmer Status Retrieval ---');
  const farmerCaseView = await supabaseDb.diseaseCases.findById(caseId);
  if (farmerCaseView && farmerCaseView.status === 'New') {
    console.log(`✅ PASS: Farmer retrieved case ${farmerCaseView.caseId} with status: ${farmerCaseView.status}`);
  } else {
    console.error('❌ FAIL: Farmer could not retrieve case status.');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL LIVE PRODUCTION SUPABASE VERIFICATION CHECKS PASSED!');
  console.log('================================================================\n');
}

runProductionVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
