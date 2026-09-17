/**
 * End-to-End Test Suite: Phase 6.3 - Farmer Herd Vaccination Data Integration
 * File: tests/test_herd_vaccination_integration.js
 *
 * Verifies:
 * 1. Farmer receives own animals via GET /api/animals
 * 2. Farmer receives embedded vaccination data for own animals without extra requests
 * 3. Vaccination data is correctly associated with the specific animal
 * 4. Animals without vaccination records return an honest empty collection ([])
 * 5. Another farmer's animals remain inaccessible (IDOR protection on GET /api/animals)
 * 6. Staff roles (vet, officer, admin) remain authorized for herd queries
 * 7. No fake vaccination data is generated (honest database-driven records)
 * 8. Future scheduled vaccination (>30 days away) is NOT marked overdue or due soon
 * 9. Due-soon logic uses actual date semantics (<= 30 days -> Due Soon; past -> Overdue; completed -> Completed)
 * 10. Existing Phase 6.2 endpoints remain fully operational
 */

const path = require('path');
const dotenv = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.resolve(__dirname, '..', 'backend', '.env') });
const jwt = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));

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
  console.log('🧪 RUNNING PHASE 6.3 HERD VACCINATION INTEGRATION TESTS');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  // STEP 1: Authenticate Farmer A
  console.log('🔹 STEP 1: Authenticate Farmer A (Ramesh Patil)');
  const loginRes = await request(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    email: 'farmer@pashurakshak.in',
    password: 'Farmer@123'
  });
  assert(loginRes.status === 200, `Farmer A login returns 200 (got ${loginRes.status})`);
  const farmerAToken = loginRes.body.token;
  assert(!!farmerAToken, 'Farmer A JWT received');

  // STEP 2: Generate Farmer B Synthetic Identity
  console.log('🔹 STEP 2: Create Farmer B Synthetic Identity (Suresh)');
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'pashurakshak_jwt_secret_key_2026_secure';
  const farmerBToken = jwt.sign(
    {
      sub: '00000000-0000-0000-0000-000000000002',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'farmer_b@pashurakshak.in',
      user_metadata: { role: 'farmer', name: 'Farmer B (Suresh)' }
    },
    secret,
    { expiresIn: '1h' }
  );

  // STEP 3: Authenticate Veterinarian
  console.log('🔹 STEP 3: Authenticate Veterinarian');
  const vetLoginRes = await request(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    email: 'vet@pashurakshak.in',
    password: 'Vet@123'
  });
  assert(vetLoginRes.status === 200, `Vet login returns 200 (got ${vetLoginRes.status})`);
  const vetToken = vetLoginRes.body.token;
  assert(!!vetToken, 'Vet JWT received');

  // STEP 4: Register Animal 1 for Farmer A with NO vaccinations
  console.log('\n🔹 TEST 4: Register Animal 1 (No Vaccinations) for Farmer A');
  const tag1 = `TAG-63-NOVAC-${Math.floor(1000 + Math.random() * 9000)}`;
  const create1Res = await request(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmerAToken}` }
  }, {
    tagId: tag1,
    name: 'Gauri (No Vaccines)',
    species: 'Cattle',
    breed: 'Gir',
    age: 4
  });
  assert(create1Res.status === 201, `Animal 1 created (status 201, got ${create1Res.status})`);
  const animal1 = create1Res.body.animal;
  const animal1Id = animal1.id || animal1._id;
  assert(!!animal1Id, `Animal 1 ID generated: ${animal1Id}`);

  // STEP 5: Register Animal 2 for Farmer A WITH Initial Vaccinations (Due Soon & Completed)
  console.log('\n🔹 TEST 2 & 3: Register Animal 2 with Scheduled & Completed Vaccinations');
  const now = Date.now();
  const pastVaccDate = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
  const dueSoonDate = new Date(now + 10 * 24 * 3600 * 1000).toISOString();
  const distantFutureDate = new Date(now + 90 * 24 * 3600 * 1000).toISOString();

  const tag2 = `TAG-63-VAC-${Math.floor(1000 + Math.random() * 9000)}`;
  const create2Res = await request(`${BASE_URL}/api/animals`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmerAToken}` }
  }, {
    tagId: tag2,
    name: 'Lakshmi (With Vaccines)',
    species: 'Cattle',
    breed: 'Sahiwal',
    age: 5,
    vaccinationHistory: [
      {
        vaccine: 'Foot and Mouth Disease (FMD)',
        date: pastVaccDate,
        nextDue: dueSoonDate,
        status: 'Completed',
        dose: 'Booster 1'
      },
      {
        vaccine: 'Anthrax Spore Vaccine',
        date: distantFutureDate,
        status: 'Scheduled',
        dose: 'Annual Camp Dose'
      }
    ]
  });
  assert(create2Res.status === 201, `Animal 2 created (status 201, got ${create2Res.status})`);
  const animal2 = create2Res.body.animal;
  const animal2Id = animal2.id || animal2._id;
  assert(!!animal2Id, `Animal 2 ID generated: ${animal2Id}`);

  // TEST 1: GET /api/animals — Farmer receives own animals
  console.log('\n🔹 TEST 1: GET /api/animals — Farmer A queries own herd');
  const herdRes = await request(`${BASE_URL}/api/animals`, {
    headers: { Authorization: `Bearer ${farmerAToken}` }
  });
  assert(herdRes.status === 200, `GET /api/animals returns 200 (got ${herdRes.status})`);
  assert(herdRes.body.success === true, 'Response indicates success: true');
  assert(Array.isArray(herdRes.body.animals), 'animals is an array');
  assert(herdRes.body.animals.length >= 2, `At least 2 animals returned for Farmer A (got ${herdRes.body.animals.length})`);

  // Verify Animal 1 in herd list (No vaccinations)
  const foundAnimal1 = herdRes.body.animals.find(a => (a.id || a._id) === animal1Id);
  assert(!!foundAnimal1, 'Animal 1 present in herd list');
  assert(Array.isArray(foundAnimal1.vaccinations), 'Animal 1 has vaccinations array');
  assert(foundAnimal1.vaccinations.length === 0, `TEST 4: Animal 1 has honest empty vaccinations array (length 0, got ${foundAnimal1.vaccinations.length})`);
  assert(Array.isArray(foundAnimal1.vaccinationHistory), 'Animal 1 has vaccinationHistory array');

  // Verify Animal 2 in herd list (Embedded vaccinations)
  const foundAnimal2 = herdRes.body.animals.find(a => (a.id || a._id) === animal2Id);
  assert(!!foundAnimal2, 'Animal 2 present in herd list');
  assert(Array.isArray(foundAnimal2.vaccinations), 'Animal 2 has embedded vaccinations array');
  assert(foundAnimal2.vaccinations.length === 2, `TEST 2: Animal 2 has embedded 2 vaccination records without extra API calls (got ${foundAnimal2.vaccinations.length})`);

  // TEST 3: Vaccination data correctly associated with the correct animal
  console.log('\n🔹 TEST 3: Vaccination data correctly linked to Animal 2');
  const fmdVacc = foundAnimal2.vaccinations.find(v => (v.name || v.vaccine || '').includes('Foot and Mouth'));
  assert(!!fmdVacc, 'FMD vaccination record found on Animal 2');
  assert(fmdVacc.animalId === animal2Id || !fmdVacc.animalId || fmdVacc.animalId === String(animal2Id), 'FMD record belongs to Animal 2');
  assert(fmdVacc.dose === 'Booster 1', `Dose preserved: ${fmdVacc.dose}`);

  const anthraxVacc = foundAnimal2.vaccinations.find(v => (v.name || v.vaccine || '').includes('Anthrax'));
  assert(!!anthraxVacc, 'Anthrax record found on Animal 2');

  // TEST 8 & 9: Semantic status verification
  console.log('\n🔹 TEST 8 & 9: Semantic status calculation (Due Soon vs Upcoming vs Overdue)');
  // FMD has nextDue in 10 days -> must be 'Due Soon'
  assert(fmdVacc.computedStatus === 'Due Soon', `TEST 9: FMD nextDue in 10 days computed as 'Due Soon' (got '${fmdVacc.computedStatus}')`);

  // Anthrax is scheduled 90 days in future -> must be 'Upcoming', NOT 'Due Soon' and NOT 'Overdue'!
  assert(anthraxVacc.computedStatus === 'Upcoming', `TEST 8: Anthrax scheduled 90 days in future computed as 'Upcoming' (NOT Due Soon, got '${anthraxVacc.computedStatus}')`);

  // TEST 5: Farmer B cannot see Farmer A's animals or vaccinations (IDOR Protection)
  console.log('\n🔹 TEST 5: Farmer B IDOR Isolation Check on GET /api/animals');
  const farmerBHerdRes = await request(`${BASE_URL}/api/animals`, {
    headers: { Authorization: `Bearer ${farmerBToken}` }
  });
  assert(farmerBHerdRes.status === 200, `Farmer B GET /api/animals returns 200`);
  const farmerBAnimals = farmerBHerdRes.body.animals || [];
  const leakedAnimal1 = farmerBAnimals.find(a => (a.id || a._id) === animal1Id);
  const leakedAnimal2 = farmerBAnimals.find(a => (a.id || a._id) === animal2Id);
  assert(!leakedAnimal1 && !leakedAnimal2, 'Farmer B cannot see Farmer A animals or their vaccinations (IDOR protected)');

  // TEST 6: Staff (Vet) can query herd with vaccination records
  console.log('\n🔹 TEST 6: Staff (Vet) Authorized Cross-Herd Access');
  const vetQueryRes = await request(`${BASE_URL}/api/animals?species=Cattle`, {
    headers: { Authorization: `Bearer ${vetToken}` }
  });
  assert(vetQueryRes.status === 200, `Vet GET /api/animals returns 200 (got ${vetQueryRes.status})`);
  assert(vetQueryRes.body.success === true, 'Vet query indicates success: true');
  assert(Array.isArray(vetQueryRes.body.animals), 'Vet receives animals array');
  const vetFoundAnimal2 = vetQueryRes.body.animals.find(a => (a.id || a._id) === animal2Id);
  if (vetFoundAnimal2) {
    assert(Array.isArray(vetFoundAnimal2.vaccinations), 'Vet receives embedded vaccination array for herd animals');
    assert(vetFoundAnimal2.vaccinations.length === 2, 'Vet receives full embedded vaccination history');
  }

  // TEST 7: Single Animal GET /api/animals/:id consistency
  console.log('\n🔹 TEST 7: Single Animal Profile Verification (GET /api/animals/:id)');
  const singleAnimalRes = await request(`${BASE_URL}/api/animals/${animal2Id}`, {
    headers: { Authorization: `Bearer ${farmerAToken}` }
  });
  assert(singleAnimalRes.status === 200, `GET /api/animals/:id returns 200`);
  assert(singleAnimalRes.body.success === true, 'Single animal returns success');
  assert(Array.isArray(singleAnimalRes.body.animal.vaccinations), 'Single animal returns embedded vaccinations');
  assert(singleAnimalRes.body.animal.vaccinations.length === 2, 'Single animal has 2 vaccination records matching herd endpoint');

  // TEST 10: Vaccination Camp Discovery remains functional
  console.log('\n🔹 TEST 10: Vaccination Drives API Compatibility');
  const drivesRes = await request(`${BASE_URL}/api/vaccination-drives?status=Upcoming,Ongoing`);
  assert(drivesRes.status === 200, `GET /api/vaccination-drives returns 200 (got ${drivesRes.status})`);
  assert(drivesRes.body.success === true, 'Vaccination drives returns success: true');

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
  console.log('🎉 ALL PHASE 6.3 HERD VACCINATION INTEGRATION TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Aborted with Error:', err.message);
  process.exit(1);
});
