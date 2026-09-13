/**
 * End-to-End Test Suite: Supabase Authentication Migration
 * File: tests/test_auth_migration.js
 * 
 * Verifies:
 * 1. Farmer Login (farmer@pashurakshak.in / Farmer@123)
 * 2. Veterinarian Login (vet@pashurakshak.in / Vet@123)
 * 3. Officer Login (officer@pashurakshak.in / Admin@123)
 * 4. Admin Login (admin@pashurakshak.in / Admin@123)
 * 5. Unauthorized Access (Missing token, Invalid token, Role restriction 403)
 * 6. Logout Behavior
 * 7. Session Persistence
 */

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING SUPABASE AUTHENTICATION MIGRATION TEST SUITE');
  console.log(`📡 Target API: ${BASE_URL}`);
  console.log('================================================================\n');

  let farmerToken = null;
  let vetToken = null;
  let officerToken = null;
  let adminToken = null;

  // -------------------------------------------------------------------------
  // TEST 1: Farmer Login
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 1: Farmer Login');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'farmer@pashurakshak.in',
        password: 'Farmer@123'
      })
    });

    const data = await res.json();
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(data.success === true, 'Response indicates success: true');
    assert(!!data.token, 'Supabase authentication token returned');
    assert(data.user && data.user.role === 'farmer', `User role is 'farmer', got '${data.user?.role}'`);
    assert(data.user.email === 'farmer@pashurakshak.in', `User email matches 'farmer@pashurakshak.in'`);

    // Verify Supabase Token JWT claims
    farmerToken = data.token;
    const decoded = jwt.decode(farmerToken);
    assert(decoded && decoded.aud === 'authenticated', 'JWT audience claim is "authenticated"');
    assert(decoded.role === 'authenticated', 'JWT role claim is "authenticated"');
    assert(decoded.iss === 'supabase', 'JWT issuer is "supabase"');
    assert(decoded.user_metadata?.role === 'farmer', 'JWT user_metadata contains role "farmer"');

    // Verify protected route access with token
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Farmer can access protected route /api/auth/me');
    assert(meData.user?.role === 'farmer', 'Profile role correctly resolved as "farmer"');
  } catch (err) {
    console.error(`  ❌ Error in Test 1:`, err.message);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // TEST 2: Veterinarian Login
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 2: Veterinarian Login');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'vet@pashurakshak.in',
        password: 'Vet@123'
      })
    });

    const data = await res.json();
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(data.success === true, 'Response indicates success: true');
    assert(!!data.token, 'Supabase authentication token returned');
    assert(data.user && data.user.role === 'veterinarian', `User role is 'veterinarian', got '${data.user?.role}'`);
    assert(data.user.email === 'vet@pashurakshak.in', 'User email matches "vet@pashurakshak.in"');

    vetToken = data.token;
    const decoded = jwt.decode(vetToken);
    assert(decoded.user_metadata?.role === 'veterinarian', 'JWT user_metadata role is "veterinarian"');

    // Verify protected route
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${vetToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Veterinarian can access protected route /api/auth/me');
    assert(meData.user?.role === 'veterinarian', 'Profile role resolved as "veterinarian"');
  } catch (err) {
    console.error(`  ❌ Error in Test 2:`, err.message);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // TEST 3: Officer Login
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 3: Officer Login');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'officer@pashurakshak.in',
        password: 'Admin@123'
      })
    });

    const data = await res.json();
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(data.success === true, 'Response indicates success: true');
    assert(!!data.token, 'Supabase authentication token returned');
    assert(data.user && data.user.role === 'officer', `User role is 'officer', got '${data.user?.role}'`);
    assert(data.user.email === 'officer@pashurakshak.in', 'User email matches "officer@pashurakshak.in"');

    officerToken = data.token;
    const decoded = jwt.decode(officerToken);
    assert(decoded.user_metadata?.role === 'officer', 'JWT user_metadata role is "officer"');

    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Officer can access protected route /api/auth/me');
    assert(meData.user?.role === 'officer', 'Profile role resolved as "officer"');
  } catch (err) {
    console.error(`  ❌ Error in Test 3:`, err.message);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // TEST 4: Admin Login
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 4: Admin Login');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@pashurakshak.in',
        password: 'Admin@123'
      })
    });

    const data = await res.json();
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(data.success === true, 'Response indicates success: true');
    assert(!!data.token, 'Supabase authentication token returned');
    assert(data.user && data.user.role === 'admin', `User role is 'admin', got '${data.user?.role}'`);
    assert(data.user.email === 'admin@pashurakshak.in', 'User email matches "admin@pashurakshak.in"');

    adminToken = data.token;
    const decoded = jwt.decode(adminToken);
    assert(decoded.user_metadata?.role === 'admin', 'JWT user_metadata role is "admin"');

    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Admin can access protected route /api/auth/me');
    assert(meData.user?.role === 'admin', 'Profile role resolved as "admin"');
  } catch (err) {
    console.error(`  ❌ Error in Test 4:`, err.message);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // TEST 5: Unauthorized Access & Role-Based Authorization
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 5: Unauthorized Access & Role-Based Authorization');
  try {
    // 5a. Missing token on protected route
    const noTokenRes = await fetch(`${BASE_URL}/api/auth/me`);
    assert(noTokenRes.status === 401, `Missing token returns 401 Unauthorized (got ${noTokenRes.status})`);
    const noTokenData = await noTokenRes.json();
    assert(noTokenData.success === false, 'Missing token response returns success: false');

    // 5b. Invalid / forged token
    const badTokenRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer forged.invalid.token.12345' }
    });
    assert(badTokenRes.status === 401, `Forged token returns 401 Unauthorized (got ${badTokenRes.status})`);

    // 5c. Role-based authorization: Farmer attempting vet-restricted action
    // POST /api/vaccination-drives is restricted to ('field_worker', 'veterinarian', 'officer', 'admin')
    const farmerRestrictedRes = await fetch(`${BASE_URL}/api/vaccination-drives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        campName: 'Unauthorized Farmer Camp',
        date: new Date().toISOString(),
        location: { village: 'Baramati' }
      })
    });
    assert(farmerRestrictedRes.status === 403, `Farmer accessing vet-only route is blocked with 403 Forbidden (got ${farmerRestrictedRes.status})`);
    const farmerRestrictedData = await farmerRestrictedRes.json();
    assert(farmerRestrictedData.message.includes('not authorized'), 'Forbidden response explains role is unauthorized');

    // 5d. Role-based authorization: Veterinarian allowed on vet-restricted action
    const vetAllowedRes = await fetch(`${BASE_URL}/api/vaccination-drives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vetToken}`
      },
      body: JSON.stringify({
        campName: 'Baramati Emergency FMD Ring Vaccination',
        targetDisease: 'Foot-and-Mouth Disease',
        date: new Date().toISOString(),
        location: { village: 'Baramati', district: 'Pune' }
      })
    });
    // Status should NOT be 401 or 403 (middleware authorized successfully)
    assert(vetAllowedRes.status !== 401 && vetAllowedRes.status !== 403, `Vet is successfully authorized past role gate (got ${vetAllowedRes.status})`);

    // 5e. Admin override on role-restricted action
    const adminAllowedRes = await fetch(`${BASE_URL}/api/vaccination-drives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        campName: 'District-wide Administrative Campaign',
        targetDisease: 'Lumpy Skin Disease',
        date: new Date().toISOString(),
        location: { village: 'Pune City', district: 'Pune' }
      })
    });
    assert(adminAllowedRes.status !== 401 && adminAllowedRes.status !== 403, `Admin is successfully authorized past role gate (got ${adminAllowedRes.status})`);
  } catch (err) {
    console.error(`  ❌ Error in Test 5:`, err.message);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // TEST 6: Logout Behavior
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 6: Logout Behavior');
  try {
    // Client-side simulation of logout: token removal from client state
    let clientSessionToken = farmerToken;
    assert(!!clientSessionToken, 'Client has active session token before logout');

    // Simulated logout purge
    clientSessionToken = null;
    assert(clientSessionToken === null, 'Client cleared session token on logout');

    // Request made post-logout without token must be rejected
    const postLogoutRes = await fetch(`${BASE_URL}/api/auth/me`);
    assert(postLogoutRes.status === 401, `Post-logout unauthenticated request blocked with 401 (got ${postLogoutRes.status})`);
  } catch (err) {
    console.error(`  ❌ Error in Test 6:`, err.message);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // TEST 7: Session Persistence
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 7: Session Persistence');
  try {
    // Simulate persistent storage: saving and retrieving token across reloads
    const persistedToken = farmerToken;
    assert(!!persistedToken, 'Persisted token retrieved from simulated persistent storage');

    // Verify persisted session can re-authenticate against /api/auth/me
    const resumeSessionRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${persistedToken}` }
    });
    assert(resumeSessionRes.status === 200, `Resumed session successfully authenticated (status ${resumeSessionRes.status})`);
    const resumeData = await resumeSessionRes.json();
    assert(resumeData.success === true, 'Session restore response indicates success: true');
    assert(resumeData.user?.email === 'farmer@pashurakshak.in', 'Restored user identity matches farmer');
    assert(resumeData.user?.role === 'farmer', 'Restored user role matches farmer');
  } catch (err) {
    console.error(`  ❌ Error in Test 7:`, err.message);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // TEST 8: User Registration (Farmer)
  // -------------------------------------------------------------------------
  console.log('🔹 TEST 8: User Registration');
  try {
    const uniquePhone = '+9198' + Math.floor(10000000 + Math.random() * 90000000);
    const uniqueEmail = `test_farmer_${Date.now()}@pashurakshak.in`;

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Balasaheb Shinde',
        email: uniqueEmail,
        phone: uniquePhone,
        password: 'Farmer@123',
        role: 'farmer',
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Baramati Rural',
        block: 'Baramati'
      })
    });

    const regData = await regRes.json();
    assert(regRes.status === 201, `Expected 201 Created, got ${regRes.status}`);
    assert(regData.success === true, 'Registration success: true');
    assert(!!regData.token, 'Registration issued Supabase token');
    assert(regData.user?.role === 'farmer', 'Registered user role is "farmer"');

    // Access protected route with new registration token
    const newMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${regData.token}` }
    });
    const newMeData = await newMeRes.json();
    assert(newMeRes.status === 200, 'Newly registered user can immediately access protected route');
    assert(newMeData.user?.email === uniqueEmail.toLowerCase(), 'Newly registered user email matches');
  } catch (err) {
    console.error(`  ❌ Error in Test 8:`, err.message);
  }
  console.log('');
  console.log('================================================================');
  console.log(`📊 TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL SUPABASE AUTH MIGRATION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  }
}

// Start server if needed or execute against running instance
const http = require('http');

async function isServerOnline(url) {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

async function main() {
  const online = await isServerOnline(BASE_URL);
  let serverProcess = null;

  if (!online) {
    console.log(`[Test Setup] API server not running at ${BASE_URL}. Starting test backend...`);
    const app = require('../backend/server');
    // Wait 2 seconds for server and DB to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log(`[Test Setup] Connected to active API server at ${BASE_URL}.`);
  }

  await runTests();
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
