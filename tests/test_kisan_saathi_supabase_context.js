/**
 * End-to-End Test Suite: Phase 7.2 - Kisan Saathi Backend Supabase Context Hardening
 * File: tests/test_kisan_saathi_supabase_context.js
 *
 * Verifies:
 * 1. Unauthenticated request without animalId succeeds (general consultation)
 * 2. Authenticated farmer without animalId succeeds
 * 3. Authenticated farmer with valid owned animalId succeeds and resolves Supabase record
 * 4. Authenticated farmer with another farmer's animalId is blocked with 403 Forbidden (IDOR protected)
 * 5. Authenticated farmer with nonexistent animalId returns 404 Not Found
 * 6. Authenticated farmer with animalId + conflicting client animal object uses authoritative DB record
 * 7. Staff role (vet/admin) has legitimate animal access across herds
 * 8. Missing optional animal context is handled cleanly
 * 9. Supabase animal lookup failure is handled honestly without leaking database internals
 * 10. Mongo disconnected behavior: zero 10s buffer freeze when Mongo is offline
 * 11. Unauthenticated request with animalId is rejected with 401 Unauthorized
 */

const path = require('path');
const dotenv = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.resolve(__dirname, '..', 'backend', '.env') });
const jwt = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));
const mongoose = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'mongoose'));
const supabaseDb = require('../backend/services/supabaseDb');
const geminiService = require('../backend/services/geminiService');

// Stub Gemini LLM calls to prevent quota usage and external auth errors
geminiService.generatePersonalizedConsultation = async ({ query, animal }) => {
  return {
    reply: `Clinical consultation guidance for ${animal ? animal.name : 'livestock'}: Monitor vitals and isolate if feverish.`,
    riskLevel: 'Moderate',
    keyAdvice: ['Isolate animal', 'Provide lukewarm water', 'Contact vet helpline 1962'],
    model: 'mock-gemini-livestock-expert',
    isAIPowered: true,
    timestamp: new Date().toISOString()
  };
};

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function request(url, options = {}, body = null) {
  const isHttps = url.startsWith('https');
  const client = isHttps ? require('https') : require('http');

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
      res.on('data', chunk => data += chunk);
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
    if (res.status === 200) return;
  } catch (e) { }

  console.log(`[Test Setup] API server not running at ${BASE_URL}. Starting test backend...`);
  require('../backend/server');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function runTests() {
  await ensureBackendRunning();

  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 7.2: KISAN SAATHI SUPABASE CONTEXT HARDENING TESTS');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  // SETUP: Authenticate actors
  console.log('🔹 SETUP: Authenticate test actors');
  const loginFarmerA = await request(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    email: 'farmer@pashurakshak.in',
    password: 'Farmer@123'
  });
  assert(loginFarmerA.status === 200, `Farmer A login returned 200 (got ${loginFarmerA.status})`);
  const farmerAToken = loginFarmerA.body.token;

  const loginVet = await request(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    email: 'vet@pashurakshak.in',
    password: 'Vet@123'
  });
  assert(loginVet.status === 200, `Vet login returned 200 (got ${loginVet.status})`);
  const vetToken = loginVet.body.token;

  // Create synthetic Farmer B token (different owner)
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'pashurakshak_jwt_secret_key_2026_secure';
  const farmerBToken = jwt.sign(
    {
      sub: '00000000-0000-0000-0000-000000000099',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'farmer_other@pashurakshak.in',
      user_metadata: { role: 'farmer', name: 'Farmer Other' }
    },
    secret,
    { expiresIn: '1h' }
  );

  // Register dedicated test animal owned by Farmer A
  console.log('🔹 SETUP: Register dedicated test animal for Farmer A');
  const createRes = await request(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmerAToken}` }
  }, {
    tagId: `TAG-SAATHI-${Date.now().toString().slice(-4)}`,
    name: 'Lakshmi Cow',
    species: 'Cattle',
    breed: 'Gir',
    age: 4,
    gender: 'Female',
    healthStatus: 'Healthy',
    milkYieldDaily: '12.0 L'
  });
  assert(createRes.status === 201, `Created dedicated test animal (got ${createRes.status})`);
  const testAnimal = createRes.body.animal;
  assert(!!testAnimal && !!testAnimal.id, `Test animal resolved: ${testAnimal.id} (${testAnimal.name})`);
  const testAnimalId = testAnimal.id;
  const testAnimalName = testAnimal.name;

  console.log('\n----------------------------------------------------------------');

  // TEST 1: Unauthenticated request without animalId
  console.log('🔹 TEST 1: Unauthenticated consult without animalId');
  const t1Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, { method: 'POST' }, {
    query: 'मेरी गाय दूध कम दे रही है, क्या करूं?',
    language: 'hi'
  });
  assert(t1Res.status === 200, `Expected 200 OK, got ${t1Res.status}`);
  assert(t1Res.body.success === true, 'Response indicates success: true');
  assert(typeof t1Res.body.reply === 'string' && t1Res.body.reply.length > 0, 'Reply received');
  assert(t1Res.body.animal === null, 'No animal attached in response when animalId omitted');

  // TEST 2: Authenticated farmer without animalId
  console.log('🔹 TEST 2: Authenticated farmer consult without animalId');
  const t2Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmerAToken}` }
  }, {
    query: 'What is the recommended feed for milch cattle in summer?',
    language: 'en'
  });
  assert(t2Res.status === 200, `Expected 200 OK, got ${t2Res.status}`);
  assert(t2Res.body.success === true, 'Response indicates success: true');
  assert(typeof t2Res.body.reply === 'string', 'Reply text received');
  assert(Array.isArray(t2Res.body.keyAdvice), 'keyAdvice is an array');

  // TEST 3: Authenticated farmer with valid owned animalId
  console.log('🔹 TEST 3: Authenticated farmer with valid owned animalId');
  const t3Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmerAToken}` }
  }, {
    query: `मेरी ${testAnimalName} को बुखार लग रहा है, क्या प्राथमिक उपचार दें?`,
    animalId: testAnimalId,
    language: 'hi'
  });
  assert(t3Res.status === 200, `Expected 200 OK, got ${t3Res.status}`);
  assert(t3Res.body.success === true, 'Response indicates success: true');
  assert(t3Res.body.animal !== null, 'Animal object attached in response');
  assert(t3Res.body.animal.id === testAnimalId || t3Res.body.animal._id === testAnimalId, 'Returned animal ID matches database record');
  assert(t3Res.body.animal.name === testAnimalName, 'Authoritative animal name returned');
  assert(typeof t3Res.body.reply === 'string', 'Personalized clinical reply generated');

  // TEST 4: Authenticated farmer with another farmer's animalId (IDOR Protection)
  console.log('🔹 TEST 4: Authenticated farmer querying another farmer\'s animalId (IDOR protection)');
  const t4Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmerBToken}` }
  }, {
    query: 'Check status of this animal',
    animalId: testAnimalId,
    language: 'en'
  });
  assert(t4Res.status === 403, `Expected 403 Forbidden for cross-farmer IDOR access, got ${t4Res.status}`);
  assert(t4Res.body.success === false, 'Access correctly denied');
  assert(t4Res.body.message.includes('not authorized'), 'Message explains unauthorized access');

  // TEST 5: Authenticated farmer with nonexistent animalId
  console.log('🔹 TEST 5: Authenticated farmer with nonexistent animalId');
  const t5Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmerAToken}` }
  }, {
    query: 'Check status',
    animalId: '00000000-0000-0000-0000-999999999999',
    language: 'en'
  });
  assert(t5Res.status === 404, `Expected 404 Not Found, got ${t5Res.status}`);
  assert(t5Res.body.success === false, 'Response indicates success: false');
  assert(t5Res.body.message.toLowerCase().includes('not found'), 'Message indicates animal not found');

  // TEST 6: Authenticated farmer with animalId + conflicting client animal object
  console.log('🔹 TEST 6: Conflicting client animal object cannot override authoritative DB record');
  const t6Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmerAToken}` }
  }, {
    query: `मेरी ${testAnimalName} बीमार है`,
    animalId: testAnimalId,
    animal: {
      name: 'Spoofed Buffalo Name',
      species: 'Elephant',
      breed: 'FakeBreed'
    },
    language: 'hi'
  });
  assert(t6Res.status === 200, `Expected 200 OK, got ${t6Res.status}`);
  assert(t6Res.body.animal.species !== 'Elephant', 'Client animal species override ignored (authoritative species preserved)');
  assert(t6Res.body.animal.name === testAnimalName, 'Authoritative animal name preserved over client spoof');

  // TEST 7: Staff role (Vet) legitimate animal access
  console.log('🔹 TEST 7: Staff role (Veterinarian) legitimate animal access');
  const t7Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${vetToken}` }
  }, {
    query: `Patient ${testAnimalName} has high fever and swelling, please advise treatment`,
    animalId: testAnimalId,
    language: 'en'
  });
  assert(t7Res.status === 200, `Staff vet received 200 OK (got ${t7Res.status})`);
  assert(t7Res.body.success === true, 'Staff consult permitted');
  assert(t7Res.body.animal !== null, 'Animal data accessible to authorized veterinarian');
  assert(t7Res.body.animal.name === testAnimalName, 'Vet received correct authoritative animal profile');

  // TEST 8: Missing optional animal context
  console.log('🔹 TEST 8: Missing optional animal context with clinical query');
  const t8Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, { method: 'POST' }, {
    query: 'What are the symptoms of Foot and Mouth disease?',
    language: 'en',
    animal: null,
    animalId: null
  });
  assert(t8Res.status === 200, `Expected 200 OK, got ${t8Res.status}`);
  assert(t8Res.body.success === true, 'General clinical query succeeds without animal');
  assert(t8Res.body.animal === null, 'No animal in response');

  // TEST 9: Supabase animal lookup failure handling
  console.log('🔹 TEST 9: Supabase lookup exception handling');
  // Temporarily stub supabaseDb.animals.findById to throw an error
  const originalFindById = supabaseDb.animals.findById;
  supabaseDb.animals.findById = async () => {
    throw new Error('PostgreSQL connection timeout simulated');
  };
  try {
    const t9Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerAToken}` }
    }, {
      query: 'Check animal',
      animalId: testAnimalId
    });
    assert(t9Res.status === 500, `Expected 500 on DB exception, got ${t9Res.status}`);
    assert(t9Res.body.success === false, 'Success is false');
    assert(t9Res.body.message === 'Unable to retrieve animal record at this time.', 'Honest message returned without leaking DB internals');
  } finally {
    supabaseDb.animals.findById = originalFindById;
  }

  // TEST 10: MongoDB disconnected behavior (zero 10s hang)
  console.log('🔹 TEST 10: Mongo disconnected behavior (zero 10s hang)');
  const startMs = Date.now();
  // Simulate readyState = 0 (disconnected)
  const originalReadyState = mongoose.connection ? mongoose.connection.readyState : 0;
  if (mongoose.connection) {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
  }

  try {
    // 10.1 Look up a nonexistent ID when Mongo is disconnected
    const lookupRes = await supabaseDb.animals.findById('00000000-0000-0000-0000-111111111111');
    const elapsed = Date.now() - startMs;
    assert(lookupRes === null, 'Nonexistent record returns null');
    assert(elapsed < 1000, `Lookup completed in ${elapsed}ms (well under 10,000ms buffer hang)`);

    // 10.2 Consult endpoint call when Mongo is disconnected
    const t10Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerAToken}` }
    }, {
      query: 'मेरी गाय दूध कम दे रही है',
      animalId: testAnimalId
    });
    assert(t10Res.status === 200, `Consult succeeded with 200 while Mongo is disconnected (got ${t10Res.status})`);
    assert(t10Res.body.success === true, 'Supabase serves animal data seamlessly');
  } finally {
    if (mongoose.connection) {
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
    }
  }

  // TEST 11: Unauthenticated request with animalId (Security check)
  console.log('🔹 TEST 11: Unauthenticated request with animalId rejected with 401');
  const t11Res = await request(`${BASE_URL}/api/kisan-saathi/consult`, { method: 'POST' }, {
    query: 'Tell me about this animal',
    animalId: testAnimalId
  });
  assert(t11Res.status === 401, `Expected 401 Unauthorized for unauthenticated animalId lookup, got ${t11Res.status}`);
  assert(t11Res.body.success === false, 'Access denied to unauthenticated user with animalId');

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');
  console.log('🎉 ALL KISAN SAATHI SUPABASE CONTEXT HARDENING TESTS PASSED!');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
  });
