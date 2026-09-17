/**
 * Backend Vaccination Supabase Migration & IDOR Security Test Suite
 * File: tests/test_vaccination_migration.js
 *
 * Verifies:
 * 1. Vaccination drives can be fetched (GET /api/vaccination-drives -> 200)
 * 2. Vaccination drive detail works (GET /api/vaccination-drives/:id -> 200)
 * 3. Farmer registrations can be fetched (GET /api/vaccination-drives/my-registrations -> 200)
 * 4. Camp registration succeeds with owned animal (POST /api/vaccination-drives/:id/register -> 200)
 * 5. Camp registration rejects another farmer's animal (IDOR -> 403)
 * 6. Invalid animal rejected (404)
 * 7. Nonexistent drive rejected (404)
 * 8. Capacity handled correctly (slots remaining check -> 400)
 * 9. Duplicate registration handled correctly (409 Conflict)
 * 10. Unauthenticated request rejected where required (401)
 * 11. Single animal ownership is enforced (GET /api/animals/:id -> 403 for non-owner farmer)
 */

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000';

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

async function ensureBackendRunning() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) return;
  } catch (e) { }

  console.log(`[Test Setup] API server not running at ${BASE_URL}. Starting test backend...`);
  require('../backend/server');
  await new Promise(resolve => setTimeout(resolve, 1500));
}

async function runVaccinationTests() {
  await ensureBackendRunning();

  console.log('================================================================');
  console.log('🧪 RUNNING VACCINATION SUPABASE MIGRATION & IDOR SECURITY TESTS');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Authenticate Farmer A (Ramesh Patil)
  console.log('🔹 STEP 1: Authenticate Farmer A');
  const loginResA = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'farmer@pashurakshak.in',
      password: 'Farmer@123'
    })
  });
  const loginDataA = await loginResA.json();
  assert(loginResA.status === 200, `Farmer A login HTTP 200 (got ${loginResA.status})`);
  const tokenA = loginDataA.token || loginDataA.data?.session?.access_token;
  assert(!!tokenA, 'Farmer A token received');

  // 2. Create Farmer B Synthetic Token (Suresh Rao - Different Profile)
  console.log('🔹 STEP 2: Create Farmer B Synthetic Identity');
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'pashurakshak_jwt_secret_key_2026_secure';
  const tokenB = jwt.sign(
    {
      sub: '00000000-0000-0000-0000-000000000005',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'farmer_b@pashurakshak.in',
      user_metadata: {
        name: 'Suresh Rao',
        role: 'farmer',
        district: 'Pune',
        phone: '+919822055555'
      },
      iss: 'supabase'
    },
    secret,
    { expiresIn: '1h' }
  );

  // 3. TEST 1: Vaccination drives can be fetched
  console.log('\n🔹 TEST 1: Fetch Vaccination Drives (GET /api/vaccination-drives)');
  const drivesRes = await fetch(`${BASE_URL}/api/vaccination-drives?status=Upcoming,Ongoing&limit=10`);
  const drivesData = await drivesRes.json();
  assert(drivesRes.status === 200, `GET /api/vaccination-drives HTTP 200 (got ${drivesRes.status})`);
  assert(drivesData.success === true, 'Response indicates success: true');
  assert(Array.isArray(drivesData.drives), 'Drives is an array');
  assert(drivesData.drives.length > 0, `At least 1 drive found (got ${drivesData.drives.length})`);
  const targetDrive = drivesData.drives[0];
  const driveId = targetDrive.id || targetDrive._id;
  assert(!!driveId, `Target drive ID verified: ${driveId}`);

  // 4. TEST 2: Single Drive Detail works
  console.log('\n🔹 TEST 2: Fetch Single Drive Detail (GET /api/vaccination-drives/:id)');
  const singleDriveRes = await fetch(`${BASE_URL}/api/vaccination-drives/${driveId}`);
  const singleDriveData = await singleDriveRes.json();
  assert(singleDriveRes.status === 200, `GET /api/vaccination-drives/:id HTTP 200 (got ${singleDriveRes.status})`);
  assert(singleDriveData.success === true, 'Single drive response success: true');
  assert(!!singleDriveData.drive, 'Drive object returned');
  assert(singleDriveData.drive.vaccine === targetDrive.vaccine, 'Vaccine name matches');

  // 5. Register an animal for Farmer A to test ownership
  console.log('\n🔹 STEP 5: Register Animal for Farmer A');
  const tagA = `TAG-A-${Date.now().toString().slice(-6)}`;
  const createAnimResA = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      tagId: tagA,
      name: 'Radha Cow',
      species: 'Cattle',
      breed: 'Gir',
      age: 3,
      gender: 'Female',
      healthStatus: 'Healthy'
    })
  });
  const animDataA = await createAnimResA.json();
  assert(createAnimResA.status === 201, `Animal registered for Farmer A (status ${createAnimResA.status})`);
  const animalIdA = animDataA.animal.id || animDataA.animal._id;
  assert(!!animalIdA, `Farmer A animal ID: ${animalIdA}`);

  // 6. TEST 11: Single Animal IDOR Enforcement (Farmer B cannot access Farmer A's animal)
  console.log('\n🔹 TEST 11: Single Animal IDOR Check (GET /api/animals/:id)');
  const idorAnimalRes = await fetch(`${BASE_URL}/api/animals/${animalIdA}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert(idorAnimalRes.status === 403, `Farmer B blocked from viewing Farmer A animal (got HTTP ${idorAnimalRes.status})`);

  // Farmer A CAN access their own animal
  const ownerAnimalRes = await fetch(`${BASE_URL}/api/animals/${animalIdA}`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(ownerAnimalRes.status === 200, `Farmer A can view their own animal (got HTTP 200)`);

  // 7. TEST 6: Invalid animal rejected on camp registration
  console.log('\n🔹 TEST 6: Reject Invalid Animal (POST /api/vaccination-drives/:id/register)');
  const invalidAnimalRes = await fetch(`${BASE_URL}/api/vaccination-drives/${driveId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      animalIds: ['00000000-0000-0000-0000-999999999999'],
      farmerName: 'Ramesh Patil'
    })
  });
  assert(invalidAnimalRes.status === 404, `Invalid animal ID returns 404 (got ${invalidAnimalRes.status})`);

  // 8. TEST 5: IDOR on Camp Registration (Farmer B tries to register Farmer A's animal)
  console.log('\n🔹 TEST 5: Reject Registration of Another Farmer\'s Animal (IDOR Guard)');
  const idorCampRes = await fetch(`${BASE_URL}/api/vaccination-drives/${driveId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`
    },
    body: JSON.stringify({
      animalIds: [animalIdA],
      farmerName: 'Suresh Rao'
    })
  });
  assert(idorCampRes.status === 403, `Registering another farmer's animal blocked with 403 (got ${idorCampRes.status})`);

  // 9. TEST 7: Nonexistent drive rejected
  console.log('\n🔹 TEST 7: Reject Nonexistent Drive Registration');
  const nonDriveRes = await fetch(`${BASE_URL}/api/vaccination-drives/00000000-0000-0000-0000-999999999999/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      animalIds: [animalIdA]
    })
  });
  assert(nonDriveRes.status === 404, `Nonexistent drive returns 404 (got ${nonDriveRes.status})`);

  // 10. TEST 4: Camp registration succeeds with owned animal
  console.log('\n🔹 TEST 4: Camp Registration Succeeds with Owned Animal');
  const validRegRes = await fetch(`${BASE_URL}/api/vaccination-drives/${driveId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      animalIds: [animalIdA],
      farmerName: 'Ramesh Patil',
      farmerPhone: '+919822011223'
    })
  });
  const validRegData = await validRegRes.json();
  assert(validRegRes.status === 200, `Camp registration HTTP 200 (got ${validRegRes.status})`);
  assert(validRegData.success === true, 'Registration success: true');
  assert(!!validRegData.token, `Registration token generated: ${validRegData.token}`);
  assert(validRegData.linkedAnimalsCount === 1, `Linked animals count: ${validRegData.linkedAnimalsCount}`);

  // 11. TEST 9: Duplicate registration handled correctly
  console.log('\n🔹 TEST 9: Reject Duplicate Registration (409 Conflict)');
  const dupRegRes = await fetch(`${BASE_URL}/api/vaccination-drives/${driveId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      animalIds: [animalIdA],
      farmerName: 'Ramesh Patil'
    })
  });
  assert(dupRegRes.status === 409, `Duplicate registration returns 409 Conflict (got ${dupRegRes.status})`);

  // 12. TEST 3: Farmer registrations can be fetched
  console.log('\n🔹 TEST 3: Farmer Registrations Retrieval (GET /api/vaccination-drives/my-registrations)');
  const myRegsRes = await fetch(`${BASE_URL}/api/vaccination-drives/my-registrations`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const myRegsData = await myRegsRes.json();
  assert(myRegsRes.status === 200, `GET /api/vaccination-drives/my-registrations HTTP 200 (got ${myRegsRes.status})`);
  assert(myRegsData.success === true, 'Response indicates success: true');
  assert(Array.isArray(myRegsData.registrations), 'Registrations is array');
  assert(myRegsData.registrations.length > 0, `Found ${myRegsData.registrations.length} registrations for Farmer A`);
  const matchedReg = myRegsData.registrations.find(r => r.token === validRegData.token);
  assert(!!matchedReg, `Farmer registration with token ${validRegData.token} verified in list`);

  // 13. TEST 10: Unauthenticated request rejected where required
  console.log('\n🔹 TEST 10: Unauthenticated Rejection (GET /api/vaccination-drives/my-registrations without token)');
  const noAuthRes = await fetch(`${BASE_URL}/api/vaccination-drives/my-registrations`);
  assert(noAuthRes.status === 401, `Unauthenticated request blocked with 401 (got ${noAuthRes.status})`);

  // 14. TEST 8: Capacity handled correctly
  console.log('\n🔹 TEST 8: Capacity / Slot Boundary Check');
  // Register with count exceeding remaining slots
  const overCapRes = await fetch(`${BASE_URL}/api/vaccination-drives/${driveId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`
    },
    body: JSON.stringify({
      animalCount: 999999
    })
  });
  assert(overCapRes.status === 400, `Excess capacity request rejected with 400 (got ${overCapRes.status})`);

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');
  console.log('🎉 ALL VACCINATION SUPABASE MIGRATION TESTS PASSED PERFECTLY!\n');
}

runVaccinationTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
