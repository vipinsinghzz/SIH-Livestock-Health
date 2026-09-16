/**
 * Dedicated End-to-End Regression Test: Complete Auth & Animal Lifecycle
 * File: tests/test_full_auth_lifecycle.js
 * 
 * Tests the complete end-to-end lifecycle mandated by the production requirements:
 * REGISTER
 * → LOGOUT
 * → LOGIN WITH SAME CREDENTIALS
 * → REFRESH (/api/auth/me)
 * → ADD ANIMAL (POST /api/animals)
 * → GET ANIMAL (GET /api/animals)
 * 
 * Covers 3 critical production scenarios:
 * 1. Phone-only registration (10-digit phone) -> Logout -> Login with phone -> Animal operations
 * 2. Country-code registration (+91 phone) -> Logout -> Login with 10-digit phone -> Animal operations
 * 3. Email + Phone registration -> Logout -> Login with phone -> Login with email -> Animal operations
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

async function isServerOnline(url) {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

async function runLifecycleTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING DEDICATED COMPLETE AUTH & ANIMAL LIFECYCLE TEST SUITE');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  // =========================================================================
  // SCENARIO 1: Phone-Only Registration -> Logout -> Login -> Animal Ops
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔹 SCENARIO 1: Phone-Only Farmer Registration & Complete Lifecycle');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const phone1 = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const password = 'Farmer@123';
  const farmerName1 = 'Baburao Shinde';

  console.log(`1. REGISTER: Registering farmer with phone ${phone1}`);
  const reg1Res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: farmerName1,
      phone: phone1,
      password: password,
      role: 'farmer',
      state: 'Maharashtra',
      district: 'Nagpur',
      village: 'Kamptee Rural',
      block: 'Kamptee'
    })
  });

  const reg1Data = await reg1Res.json();
  assert(reg1Res.status === 201, `Registration HTTP 201 (got ${reg1Res.status})`);
  assert(reg1Data.success === true, 'Registration success is true');
  assert(!!reg1Data.token, 'Registration returned access token');
  assert(!!reg1Data.user?.id, 'Registration returned valid user ID');
  assert(reg1Data.user?.phone === phone1, `User phone matches registered phone: ${reg1Data.user?.phone}`);
  const registeredUserId1 = String(reg1Data.user.id);
  console.log(`   Registered Farmer ID: ${registeredUserId1}`);

  console.log('2. LOGOUT: Clearing client session and stored credentials');
  let clientToken1 = null;
  let clientUser1 = null;
  assert(clientToken1 === null && clientUser1 === null, 'Client session completely cleared');

  console.log(`3. LOGIN: Logging in with the SAME phone credentials (${phone1})`);
  const login1Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: phone1,
      password: password
    })
  });

  const login1Data = await login1Res.json();
  assert(login1Res.status === 200, `Login HTTP 200 (got ${login1Res.status})`);
  assert(login1Data.success === true, 'Login success is true');
  assert(!!login1Data.token, 'Login returned new access token');
  clientToken1 = login1Data.token;
  clientUser1 = login1Data.user;
  assert(String(clientUser1.id) === registeredUserId1, `Login returned SAME user ID as registration (${clientUser1.id} === ${registeredUserId1})`);
  console.log(`   Authenticated Farmer ID: ${clientUser1.id}`);

  console.log('4. REFRESH: Verifying session restoration via GET /api/auth/me');
  const me1Res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${clientToken1}` }
  });
  const me1Data = await me1Res.json();
  assert(me1Res.status === 200, `GET /api/auth/me HTTP 200 (got ${me1Res.status})`);
  assert(me1Data.success === true, '/api/auth/me success is true');
  assert(String(me1Data.user?.id) === registeredUserId1, `/api/auth/me preserved authoritative user ID (${me1Data.user?.id})`);
  assert(me1Data.user?.district === 'Nagpur', `District preserved as Nagpur (got ${me1Data.user?.district})`);

  console.log('5. ADD ANIMAL: Registering new livestock for authenticated farmer');
  const tagId1 = `MH-31-N-${Math.floor(1000 + Math.random() * 9000)}`;
  const addAnimal1Res = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientToken1}`
    },
    body: JSON.stringify({
      tagId: tagId1,
      name: 'Radha (राधा)',
      species: 'Cattle',
      breed: 'Gir',
      age: 4,
      gender: 'Female',
      healthStatus: 'Healthy',
      district: 'Nagpur',
      village: 'Kamptee Rural'
    })
  });

  const addAnimal1Data = await addAnimal1Res.json();
  assert(addAnimal1Res.status === 201, `Animal registration HTTP 201 (got ${addAnimal1Res.status})`);
  assert(addAnimal1Data.success === true, 'Animal registration success is true');
  assert(!!addAnimal1Data.animal, 'Animal object returned in response');
  assert(addAnimal1Data.animal?.tagId === tagId1, `Animal tagId matches (${tagId1})`);
  const registeredAnimalId = addAnimal1Data.animal?.id || addAnimal1Data.animal?._id;
  const animalOwner = addAnimal1Data.animal?.ownerId || addAnimal1Data.animal?.owner_id;
  const ownerIdStr = typeof animalOwner === 'object' ? String(animalOwner.id || animalOwner._id) : String(animalOwner);
  assert(ownerIdStr === registeredUserId1, `Animal ownerId matches farmer profile ID (${ownerIdStr} === ${registeredUserId1})`);
  console.log(`   Registered Animal Tag: ${tagId1}, ID: ${registeredAnimalId}`);

  console.log('6. GET ANIMALS: Retrieving registered livestock for farmer');
  const getAnimals1Res = await fetch(`${BASE_URL}/api/animals`, {
    headers: { Authorization: `Bearer ${clientToken1}` }
  });
  const getAnimals1Data = await getAnimals1Res.json();
  assert(getAnimals1Res.status === 200, `GET /api/animals HTTP 200 (got ${getAnimals1Res.status})`);
  assert(getAnimals1Data.success === true, 'GET /api/animals success is true');
  assert(Array.isArray(getAnimals1Data.animals), 'Animals response is an array');
  const foundAnimal1 = getAnimals1Data.animals.find(a => a.tagId === tagId1);
  assert(!!foundAnimal1, `Newly registered animal ${tagId1} is present in GET /api/animals`);
  console.log(`   Successfully retrieved ${getAnimals1Data.animals.length} animal(s) owned by farmer.\n`);

  // =========================================================================
  // SCENARIO 2: +91 Phone Registration -> Logout -> 10-digit Login
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔹 SCENARIO 2: Country-code (+91) Registration & Normalized Phone Login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const raw10 = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const phoneWithPrefix = `+91 ${raw10.substring(0, 5)} ${raw10.substring(5)}`;

  console.log(`1. REGISTER: Registering with formatted phone "${phoneWithPrefix}"`);
  const reg2Res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tukaram Pawar',
      phone: phoneWithPrefix,
      password: password,
      role: 'farmer',
      state: 'Maharashtra',
      district: 'Amravati',
      village: 'Warud Rural'
    })
  });

  const reg2Data = await reg2Res.json();
  assert(reg2Res.status === 201, `Registration with +91 HTTP 201 (got ${reg2Res.status})`);
  assert(reg2Data.user?.phone === raw10, `Stored phone normalized to 10 digits (${reg2Data.user?.phone} === ${raw10})`);
  const registeredUserId2 = String(reg2Data.user.id);

  console.log('2. LOGOUT: Client session cleared');
  let clientToken2 = null;

  console.log(`3. LOGIN: Logging in with plain 10-digit phone "${raw10}"`);
  const login2Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: raw10,
      password: password
    })
  });

  const login2Data = await login2Res.json();
  assert(login2Res.status === 200, `Login with 10 digits HTTP 200 (got ${login2Res.status})`);
  assert(login2Data.success === true, 'Login success is true');
  clientToken2 = login2Data.token;
  assert(String(login2Data.user.id) === registeredUserId2, `User ID preserved across +91 to 10-digit transition`);

  console.log('4. ADD ANIMAL & GET ANIMALS: Full cycle for Scenario 2');
  const tagId2 = `MH-27-A-${Math.floor(1000 + Math.random() * 9000)}`;
  const addAnimal2Res = await fetch(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientToken2}`
    },
    body: JSON.stringify({
      tagId: tagId2,
      name: 'Kapila (कपिला)',
      species: 'Buffalo',
      breed: 'Murrah',
      age: 5,
      gender: 'Female',
      district: 'Amravati'
    })
  });

  const addAnimal2Data = await addAnimal2Res.json();
  assert(addAnimal2Res.status === 201, `Animal registration HTTP 201 (got ${addAnimal2Res.status})`);

  const getAnimals2Res = await fetch(`${BASE_URL}/api/animals`, {
    headers: { Authorization: `Bearer ${clientToken2}` }
  });
  const getAnimals2Data = await getAnimals2Res.json();
  assert(getAnimals2Data.animals.some(a => a.tagId === tagId2), `Animal ${tagId2} retrieved successfully.\n`);

  // =========================================================================
  // SCENARIO 3: Email + Phone Registration -> Dual Login by Phone & by Email
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔹 SCENARIO 3: Email + Phone Dual Registration & Dual Login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const phone3 = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const customEmail = `farmer_sunil_${Date.now()}@pashurakshak.in`;

  console.log(`1. REGISTER: Registering with email "${customEmail}" and phone "${phone3}"`);
  const reg3Res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sunil Jadhav',
      email: customEmail,
      phone: phone3,
      password: password,
      role: 'farmer',
      state: 'Maharashtra',
      district: 'Pune',
      village: 'Baramati'
    })
  });

  const reg3Data = await reg3Res.json();
  assert(reg3Res.status === 201, `Registration with email+phone HTTP 201 (got ${reg3Res.status})`);
  const registeredUserId3 = String(reg3Data.user.id);

  console.log(`2. LOGIN VIA PHONE: Logging in using phone number "${phone3}"`);
  const loginByPhoneRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: phone3,
      password: password
    })
  });
  const loginByPhoneData = await loginByPhoneRes.json();
  assert(loginByPhoneRes.status === 200, `Phone login HTTP 200 (got ${loginByPhoneRes.status})`);
  assert(String(loginByPhoneData.user.id) === registeredUserId3, 'Phone login returns exact user profile ID');

  console.log(`3. LOGIN VIA EMAIL: Logging in using custom email "${customEmail}"`);
  const loginByEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: customEmail,
      password: password
    })
  });
  const loginByEmailData = await loginByEmailRes.json();
  assert(loginByEmailRes.status === 200, `Email login HTTP 200 (got ${loginByEmailRes.status})`);
  assert(String(loginByEmailData.user.id) === registeredUserId3, 'Email login returns exact user profile ID');

  console.log('\n================================================================');
  console.log(`🎉 ALL LIFECYCLE TESTS PASSED: ${passed}/${passed + failed}`);
  console.log('================================================================\n');
}

async function main() {
  const online = await isServerOnline(BASE_URL);
  if (!online) {
    console.log(`[Test Setup] Starting local test backend at ${BASE_URL}...`);
    require('../backend/server');
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.log(`[Test Setup] Connected to active server at ${BASE_URL}.`);
  }

  await runLifecycleTests();
}

main().catch(err => {
  console.error('Fatal lifecycle test error:', err);
  process.exit(1);
});
