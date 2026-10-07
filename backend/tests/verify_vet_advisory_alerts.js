/**
 * PashuCare - End-to-End Verification Test
 * File: backend/tests/verify_vet_advisory_alerts.js
 * 
 * Verifies complete parity and functionality for:
 * 1. Veterinarian and Farmer Authentication & JWT Roles
 * 2. GET /api/notifications (District clinical alerts + personal notifications)
 * 3. Role Security (Farmer isolation vs Vet clinical surveillance)
 * 4. GET /api/advisories (Official biosecurity bulletins)
 * 5. GET /api/cases/advisories (Dynamic AI epidemiological directives)
 * 6. PATCH /api/notifications/:id/read (Server-side read state sync)
 * 7. POST /api/notifications/mark-all-read (Server-side bulk read sync)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 RUNNING VETERINARIAN ADVISORY & ALERT SYSTEM VERIFICATION');
  console.log(`🌐 Target Base URL: ${BASE_URL}`);
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}: ${details}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Authenticate as Veterinarian
    // -------------------------------------------------------------
    console.log('📋 Test Suite 1: Authentication & Role Verification');
    const vetLoginRes = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'vet@pashurakshak.in',
        password: 'Vet@123'
      })
    });

    assert(vetLoginRes.data?.success, 'Veterinarian login succeeds');
    const vetToken = vetLoginRes.data?.token;
    const vetUser = vetLoginRes.data?.user;
    assert(vetUser?.role === 'veterinarian', 'Veterinarian account has role="veterinarian"', `role: ${vetUser?.role}`);
    assert(Boolean(vetToken), 'Received valid JWT bearer token for veterinarian');

    const vetHeaders = { Authorization: `Bearer ${vetToken}` };

    // -------------------------------------------------------------
    // Test 2: Authenticate as Farmer
    // -------------------------------------------------------------
    const farmerLoginRes = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'farmer@pashurakshak.in',
        password: 'Farmer@123'
      })
    });

    assert(farmerLoginRes.data?.success, 'Farmer login succeeds');
    const farmerToken = farmerLoginRes.data?.token;
    const farmerUser = farmerLoginRes.data?.user;
    assert(farmerUser?.role === 'farmer', 'Farmer account has role="farmer"', `role: ${farmerUser?.role}`);
    const farmerHeaders = { Authorization: `Bearer ${farmerToken}` };

    // -------------------------------------------------------------
    // Test 3: Unauthenticated Access Blocked
    // -------------------------------------------------------------
    console.log('\n🔒 Test Suite 2: Role Authorization & Security');
    const unauthRes = await apiFetch('/notifications');
    assert(unauthRes.status === 401, 'Unauthenticated request correctly rejected with HTTP 401', `status: ${unauthRes.status}`);

    // -------------------------------------------------------------
    // Test 4: Veterinarian Clinical Alerts Feed
    // -------------------------------------------------------------
    console.log('\n🚨 Test Suite 3: Veterinarian Clinical Alerts Feed');
    const vetDistrict = vetUser?.district || 'Nagpur';
    const vetNotifsRes = await apiFetch(`/notifications?district=${encodeURIComponent(vetDistrict)}`, {
      headers: vetHeaders
    });

    assert(vetNotifsRes.data?.success === true, 'GET /notifications returns success: true');
    assert(Array.isArray(vetNotifsRes.data?.notifications), 'Notifications response contains array');
    console.log(`     📊 Vet Alerts count: ${vetNotifsRes.data?.count}, unreadCount: ${vetNotifsRes.data?.unreadCount}`);

    const alerts = vetNotifsRes.data?.notifications || [];
    if (alerts.length > 0) {
      const sample = alerts[0];
      assert(Boolean(sample.id), 'Alert contains unique id', sample.id);
      assert(Boolean(sample.title), 'Alert contains title', sample.title);
      assert(Boolean(sample.message), 'Alert contains message');
      assert(Boolean(sample.createdAt), 'Alert contains createdAt timestamp', sample.createdAt);
      assert(['Critical', 'High', 'Moderate', 'Low'].includes(sample.severity) || !sample.severity, 'Alert severity conforms to valid taxonomy', `severity: ${sample.severity}`);
      assert(Boolean(sample.status), 'Alert contains status', sample.status);
    }

    // -------------------------------------------------------------
    // Test 5: Farmer Role Isolation
    // -------------------------------------------------------------
    console.log('\n🛡️ Test Suite 4: Farmer Role Isolation');
    const farmerNotifsRes = await apiFetch('/notifications', {
      headers: farmerHeaders
    });

    assert(farmerNotifsRes.data?.success === true, 'GET /notifications for farmer returns success: true');
    const farmerAlerts = farmerNotifsRes.data?.notifications || [];
    const hasVetDistrictAlerts = farmerAlerts.some(
      (n) => n.id && (n.id.startsWith('district-case-') || n.id.startsWith('district-zone-') || n.id.startsWith('district-cluster-'))
    );
    assert(!hasVetDistrictAlerts, 'Farmer notifications DO NOT include veterinarian district surveillance alerts (strict isolation)');

    // -------------------------------------------------------------
    // Test 6: Official Biosecurity Advisories (GET /api/advisories)
    // -------------------------------------------------------------
    console.log('\n📜 Test Suite 5: Official Biosecurity Advisories');
    const advisoriesRes = await apiFetch(`/advisories?district=${encodeURIComponent(vetDistrict)}`, {
      headers: vetHeaders
    });

    assert(advisoriesRes.data?.success === true, 'GET /advisories returns success: true');
    assert(Array.isArray(advisoriesRes.data?.advisories), 'GET /advisories returns advisories array');
    console.log(`     📊 Official Advisories count: ${advisoriesRes.data?.count || advisoriesRes.data?.advisories?.length}`);

    if (advisoriesRes.data?.advisories?.length > 0) {
      const sampleAdv = advisoriesRes.data.advisories[0];
      const titleStr = typeof sampleAdv.title === 'object' ? sampleAdv.title.en : sampleAdv.title || sampleAdv.titleEn;
      const messageStr = typeof sampleAdv.message === 'object' ? sampleAdv.message.en : sampleAdv.message || sampleAdv.messageEn;
      assert(Boolean(titleStr), 'Advisory contains title', titleStr);
      assert(Boolean(messageStr), 'Advisory contains message guidelines');
      assert(Boolean(sampleAdv.severity), 'Advisory contains severity rating', sampleAdv.severity);
      assert(Boolean(sampleAdv.targetDistrict), 'Advisory contains targetDistrict', sampleAdv.targetDistrict);
    }

    // -------------------------------------------------------------
    // Test 7: Dynamic AI Epidemiological Advisory (GET /api/cases/advisories)
    // -------------------------------------------------------------
    console.log('\n🧠 Test Suite 6: Dynamic AI Epidemiological Directives');
    const dynamicAdvRes = await apiFetch(`/cases/advisories?district=${encodeURIComponent(vetDistrict)}`, {
      headers: vetHeaders
    });

    assert(dynamicAdvRes.data?.success === true, 'GET /cases/advisories returns success: true');
    assert(Boolean(dynamicAdvRes.data?.summary), 'Dynamic advisory returns district summary telemetry');
    assert(typeof dynamicAdvRes.data?.summary?.activeCasesCount === 'number', 'Summary contains activeCasesCount', `count: ${dynamicAdvRes.data?.summary?.activeCasesCount}`);
    assert(Array.isArray(dynamicAdvRes.data?.recommendations), 'Dynamic advisory returns recommendations array');

    // -------------------------------------------------------------
    // Test 8: Read / Unread Status Synchronization
    // -------------------------------------------------------------
    console.log('\n📬 Test Suite 7: Server-side Read / Unread State Sync');
    if (alerts.length > 0) {
      const targetAlert = alerts[0];
      const readRes = await apiFetch(`/notifications/${encodeURIComponent(targetAlert.id)}/read`, {
        method: 'PATCH',
        headers: vetHeaders
      });

      assert(readRes.data?.success === true, `PATCH /notifications/:id/read succeeds for alert ${targetAlert.id}`);

      const markAllRes = await apiFetch('/notifications/mark-all-read', {
        method: 'POST',
        headers: vetHeaders
      });
      assert(markAllRes.data?.success === true, 'POST /notifications/mark-all-read succeeds');
    }

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`🏁 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================');

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Verification encountered unexpected error:', error.message);
    process.exit(1);
  }
}

runVerification();
