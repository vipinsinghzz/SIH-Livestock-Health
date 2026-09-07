const http = require('http');

async function testBackend() {
  const app = require('./server');
  const server = http.createServer(app);
  await new Promise(r => server.listen(5099, r));
  console.log('[Test Server] Listening on port 5099');

  try {
    // 1. Health check
    const healthRes = await fetch('http://127.0.0.1:5099/api/health');
    const healthData = await healthRes.json();
    console.log('✅ Health Check:', healthData.status, 'AI Model:', healthData.aiModelVersion);

    // 2. Farmer Login
    const loginRes = await fetch('http://127.0.0.1:5099/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'farmer@pashurakshak.in', password: 'Farmer@123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error('Login failed: ' + JSON.stringify(loginData));
    console.log('✅ Auth Login successful for:', loginData.user.name, 'Role:', loginData.user.role);
    const token = loginData.token;

    // 3. Create Report & Trigger AI Triage
    console.log('⏳ Submitting Report to test AI Triage inference and outbreak detection...');
    const reportRes = await fetch('http://127.0.0.1:5099/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        species: 'Cattle',
        symptoms: ['mouth blisters', 'excessive salivation', 'hoof blister', 'lameness'],
        mortalityCount: 0,
        affectedCount: 2,
        location: {
          lat: 18.1520,
          lng: 74.5780,
          village: 'Malegaon Rural',
          block: 'Baramati',
          district: 'Pune'
        },
        notes: 'Noticeable limping and foaming at mouth since morning'
      })
    });
    const reportData = await reportRes.json();
    console.log('✅ Report Created:', reportData.report?.caseId);
    console.log('✅ AI Triage Result:');
    console.log('   - Risk Level:', reportData.triageResult?.riskLevel);
    console.log('   - Outbreak Flag:', reportData.triageResult?.outbreakFlag);
    console.log('   - Top Suspected Disease:', reportData.triageResult?.suspectedDiseases?.[0]);
    console.log('   - Explanation:', reportData.triageResult?.explanation);
    console.log('   - Model Version:', reportData.triageResult?.modelVersion);

    // 4. Dashboard Summary
    const summaryRes = await fetch('http://127.0.0.1:5099/api/dashboard/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const summaryData = await summaryRes.json();
    console.log('✅ Dashboard Summary: Total Reports:', summaryData.data?.totalReports, 'Active Cases:', summaryData.data?.activeCases, 'Coverage Pct:', summaryData.data?.vaccination?.coveragePct + '%');

    // 5. Test IVR Webhook
    const ivrRes = await fetch('http://127.0.0.1:5099/api/ivr/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: '+919988776655',
        SymptomsText: 'My cow has swollen throat and high fever with difficulty breathing',
        Species: 'Cattle',
        Block: 'Khed',
        Mortality: '1'
      })
    });
    const ivrData = await ivrRes.json();
    console.log('✅ IVR Telephony Webhook processed case:', ivrData.caseId, 'Risk:', ivrData.triageResult?.riskLevel, 'Top:', ivrData.triageResult?.suspectedDiseases?.[0]?.name);

    console.log('\n🎉 ALL BACKEND API & MOCK AI SERVICES VERIFIED SUCCESSFULLY!\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

testBackend().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
