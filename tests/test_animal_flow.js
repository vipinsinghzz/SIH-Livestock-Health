/**
 * Comprehensive Animal Registration & Retrieval Flow Test Suite
 * File: tests/test_animal_flow.js
 * 
 * Verifies:
 * 1. /api/auth/me returns valid profiles.id (not raw auth.users or arbitrary ID)
 * 2. POST /api/animals registers animal linked to profiles.id (status 201)
 * 3. District preservation (e.g. Nagpur instead of hardcoded Pune)
 * 4. GET /api/animals returns farmer's registered animals (status 200)
 * 5. Farmer cannot register animal under another user's ownerId (anti-spoofing)
 * 6. Duplicate tag_id rejection (status 400)
 * 7. Missing species validation (status 400)
 * 8. Unauthenticated rejection (status 401)
 */

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

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
    if (res.status === 200) return;
  } catch (e) {}

  console.log(`[Test Setup] Starting API server on port 5000...`);
  require('../backend/server');
  await new Promise((resolve) => setTimeout(resolve, 2500));
}

async function runAnimalFlowTests() {
  await ensureBackendRunning();
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE ANIMAL FLOW TEST SUITE');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  let farmerToken = null;
  let farmerUser = null;

  // -------------------------------------------------------------------------
  // 1. Farmer Authentication & /api/auth/me Profile Resolution
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 1: Farmer Login & /api/auth/me Verification');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'farmer@pashurakshak.in',
      password: 'Farmer@123'
    })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, `Farmer login HTTP 200 (got ${loginRes.status})`);
  assert(!!loginData.token, 'Auth token received');
  farmerToken = loginData.token;

  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  });
  const meData = await meRes.json();
  assert(meRes.status === 200, `GET /api/auth/me HTTP 200 (got ${meRes.status})`);
  assert(!!meData.user, 'User profile object returned by /api/auth/me');
  assert(!!meData.user.id, `Resolved user.id exists: ${meData.user?.id}`);
  assert(meData.user.role === 'farmer', `User role is farmer (got ${meData.user?.role})`);
  farmerUser = meData.user;
  console.log(`     Resolved Farmer Profile ID: ${farmerUser.id}`);
  console.log('');

  // -------------------------------------------------------------------------
  // 2. Add Animal with Custom District (Nagpur) - Must Return HTTP 201
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 2: Add Animal with Custom Location (Nagpur)');
  const uniqueTag = `NG-${Math.floor(100000 + Math.random() * 900000)}`;
  const createAnimalRes = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      tagId: uniqueTag,
      name: 'Radha (राधा)',
      species: 'Buffalo',
      breed: 'Murrah',
      age: 5,
      gender: 'Female',
      healthStatus: 'Healthy',
      milkYieldDaily: '16.5 L',
      district: 'Nagpur',
      block: 'Kamptee',
      village: 'Kamptee Rural'
    })
  });

  const createAnimalData = await createAnimalRes.json();
  assert(createAnimalRes.status === 201, `Animal registered with HTTP 201 (got ${createAnimalRes.status})`);
  assert(createAnimalData.success === true, 'Response contains success: true');
  assert(!!createAnimalData.animal, 'Response contains animal object');
  assert(createAnimalData.animal.tagId === uniqueTag, `Tag ID matches ${uniqueTag}`);
  assert(createAnimalData.animal.species === 'Buffalo', 'Species is Buffalo');
  assert(createAnimalData.animal.breed === 'Murrah', 'Breed is Murrah');
  assert(createAnimalData.animal.district === 'Nagpur', `District preserved as Nagpur (got '${createAnimalData.animal.district}')`);
  
  const createdOwnerId = String(createAnimalData.animal.ownerId?.id || createAnimalData.animal.ownerId || createAnimalData.animal.owner_id);
  assert(createdOwnerId === String(farmerUser.id), `Animal owner_id matches farmer profiles.id (${createdOwnerId})`);
  console.log(`     Registered Animal ID: ${createAnimalData.animal.id}, Tag: ${uniqueTag}`);
  console.log('');

  // -------------------------------------------------------------------------
  // 3. GET /api/animals - Verified Fetch for Authenticated Farmer
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 3: GET /api/animals for Authenticated Farmer');
  const getAnimalsRes = await fetch(`${BASE_URL}/api/animals`, {
    headers: { Authorization: `Bearer ${farmerToken}` }
  });
  const getAnimalsData = await getAnimalsRes.json();
  assert(getAnimalsRes.status === 200, `GET /api/animals HTTP 200 (got ${getAnimalsRes.status})`);
  assert(getAnimalsData.success === true, 'Response contains success: true');
  assert(Array.isArray(getAnimalsData.animals), 'Response contains animals array');
  const foundAnimal = getAnimalsData.animals.find(a => a.tagId === uniqueTag);
  assert(!!foundAnimal, `Registered animal with tag ${uniqueTag} is present in GET /api/animals list`);
  console.log(`     Found ${getAnimalsData.animals.length} total animals for this farmer`);
  console.log('');

  // -------------------------------------------------------------------------
  // 4. Anti-Spoofing Check: Farmer cannot register animal under another ownerId
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 4: Anti-Spoofing Check (Attacker cannot specify foreign ownerId)');
  const spoofedTag = `SP-${Math.floor(100000 + Math.random() * 900000)}`;
  const foreignOwnerId = '00000000-0000-0000-0000-999999999999';
  const spoofRes = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      tagId: spoofedTag,
      name: 'Spoof Test',
      species: 'Cattle',
      ownerId: foreignOwnerId
    })
  });
  const spoofData = await spoofRes.json();
  assert(spoofRes.status === 201, `Spoof attempt handled (HTTP ${spoofRes.status})`);
  const actualOwnerId = String(spoofData.animal.ownerId?.id || spoofData.animal.ownerId || spoofData.animal.owner_id);
  assert(actualOwnerId === String(farmerUser.id), `Server correctly bound animal to authenticated user (${actualOwnerId}) and ignored foreign ownerId`);
  console.log('');

  // -------------------------------------------------------------------------
  // 5. Duplicate Tag ID Rejection
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 5: Duplicate Tag ID Rejection');
  const dupRes = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      tagId: uniqueTag, // Re-use the existing tag from Test 2
      name: 'Duplicate Copy',
      species: 'Cattle'
    })
  });
  const dupData = await dupRes.json();
  assert(dupRes.status === 400, `Duplicate tag rejected with HTTP 400 (got ${dupRes.status})`);
  assert(dupData.success === false, 'Duplicate tag returns success: false');
  assert(dupData.message && dupData.message.includes('already registered'), `Helpful error message returned: "${dupData.message}"`);
  console.log('');

  // -------------------------------------------------------------------------
  // 6. Validation Rejection: Missing Species
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 6: Validation Rejection on Missing Species');
  const missingSpeciesRes = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      tagId: `INV-${Date.now()}`,
      name: 'No Species'
      // species is omitted
    })
  });
  const missingSpeciesData = await missingSpeciesRes.json();
  assert(missingSpeciesRes.status === 400, `Missing species rejected with HTTP 400 (got ${missingSpeciesRes.status})`);
  assert(missingSpeciesData.success === false, 'Missing species returns success: false');
  console.log('');

  // -------------------------------------------------------------------------
  // 7. Authentication Rejection: Unauthenticated Request
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 7: Authentication Rejection for Missing Token');
  const unauthRes = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tagId: `UNAUTH-${Date.now()}`,
      species: 'Cattle'
    })
  });
  assert(unauthRes.status === 401, `Unauthenticated request rejected with HTTP 401 (got ${unauthRes.status})`);
  // -------------------------------------------------------------------------
  // 8. Production Edge Case: Synthetic Token ID Profile Auto-Resolution & Add Animal
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 8: Production Scenario (Synthetic ID Token & Auto-Provision)');
  const { createSupabaseToken } = require('../backend/config/supabaseClient');
  const syntheticToken = createSupabaseToken({
    id: '00000000-0000-0000-0000-01a0a548f9c7',
    _id: '00000000-0000-0000-0000-01a0a548f9c7',
    auth_user_id: '00000000-0000-0000-0000-01a0a548f9c7',
    name: 'Vipin Singh',
    email: 'farmer_7878738970@livestocksathi.in',
    phone: '7878738970',
    role: 'farmer',
    district: 'Nagpur'
  });

  const synthMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${syntheticToken}` }
  });
  const synthMeData = await synthMeRes.json();
  assert(synthMeRes.status === 200, `GET /api/auth/me for synthetic token HTTP 200 (got ${synthMeRes.status})`);
  assert(!!synthMeData.user, 'Synthetic user profile resolved');

  const synthTag = `PROD-${Math.floor(100000 + Math.random() * 900000)}`;
  const synthAnimalRes = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${syntheticToken}`
    },
    body: JSON.stringify({
      tagId: synthTag,
      name: 'Gauri (गौरी)',
      species: 'Cattle',
      breed: 'Gir',
      age: 4,
      gender: 'Female',
      healthStatus: 'Healthy',
      district: 'Nagpur',
      village: 'Kamptee'
    })
  });
  const synthAnimalData = await synthAnimalRes.json();
  assert(synthAnimalRes.status === 201, `Synthetic token animal registered HTTP 201 (got ${synthAnimalRes.status})`);
  assert(synthAnimalData.success === true, 'Synthetic token response indicates success: true');
  assert(!!synthAnimalData.animal, 'Synthetic token response contains animal record');
  console.log(`     Registered Animal with synthetic user token: ${synthAnimalData.animal?.tagId || synthTag}`);
  console.log('');

  console.log('================================================================');
  console.log(`🎉 ALL ANIMAL FLOW TESTS PASSED: ${passed}/${passed + failed}`);
  console.log('================================================================\n');
  process.exit(0);
}

runAnimalFlowTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
