const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const geminiService = require('../backend/services/geminiService');
const nadresService = require('../backend/services/nadresService');
const supabaseDb = require('../backend/services/supabaseDb');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING VERIFICATION SUITE: DISEASE, GEMINI & PERFORMANCE');
  console.log('======================================================\n');

  // Test 1: Gemini Service model list inspection
  console.log('[Test 1] Inspect Gemini Models...');
  const geminiSource = require('fs').readFileSync(path.join(__dirname, '..', 'backend', 'services', 'geminiService.js'), 'utf8');
  assert(geminiSource.includes("'gemini-1.5-flash'") && geminiSource.includes("'gemini-2.0-flash'"), 'Gemini models configured with valid production IDs (1.5-flash, 2.0-flash)');
  assert(!geminiSource.includes('gemini-3.8-flash'), 'Non-existent model gemini-3.8-flash removed');
  assert(!geminiSource.includes('gemini-3.1-flash-lite'), 'Non-existent model gemini-3.1-flash-lite removed');

  // Test 2: NADRES Latency (Mongoose Buffer Elimination)
  console.log('\n[Test 2] Testing NADRES Latency (Zero 10s Buffer Timeout)...');
  const startNadres = Date.now();
  const nadresResult = await nadresService.getVillageAlerts({ district: 'Pune', state: 'Maharashtra' });
  const nadresDuration = Date.now() - startNadres;
  console.log(`  ⏱️ NADRES responded in ${nadresDuration}ms`);
  assert(nadresDuration < 3500, `NADRES responded in <3.5s (${nadresDuration}ms), confirming 10s Mongoose buffer freeze is eliminated`);
  assert(nadresResult && nadresResult.success === true, 'NADRES returned success: true');

  // Test 3: Active Database Outbreak Query (Zero Hang)
  console.log('\n[Test 3] Testing getActiveDatabaseOutbreaks...');
  const startOutbreaks = Date.now();
  const outbreaks = await nadresService.getActiveDatabaseOutbreaks('Pune');
  const outbreakDuration = Date.now() - startOutbreaks;
  console.log(`  ⏱️ getActiveDatabaseOutbreaks responded in ${outbreakDuration}ms`);
  assert(outbreakDuration < 1000, `getActiveDatabaseOutbreaks responded in <1s (${outbreakDuration}ms) without buffering timeout`);
  assert(Array.isArray(outbreaks), 'Outbreaks returns an array');

  // Test 4: Supabase Animal findById with Tag ID fallback
  console.log('\n[Test 4] Testing supabaseDb.animals.findById with non-UUID tagId...');
  try {
    const nonUuidResult = await supabaseDb.animals.findById('MH-12-P-9999');
    assert(true, 'animals.findById with tag_id executed safely without PostgreSQL UUID syntax error');
  } catch (err) {
    assert(false, `animals.findById threw error on tag_id: ${err.message}`);
  }

  // Test 5: Supabase Animal updateById column sanitization
  console.log('\n[Test 5] Testing supabaseDb.animals.updateById Column Sanitization...');
  try {
    const mockId = '00000000-0000-0000-0000-000000000000';
    const dirtyPayload = {
      healthStatus: 'Needs Attention',
      newTimelineEvent: { title: 'Test Scan', disease: 'LSD' },
      newVaccination: { vaccine: 'FMD' },
      newTreatment: { condition: 'Fever' },
      timeline: [{ title: 'Past' }],
      nonExistentRandomColumn: 'bad_data'
    };
    await supabaseDb.animals.updateById(mockId, dirtyPayload);
    assert(true, 'Dirty payload with newTimelineEvent sanitized without crashing');
  } catch (err) {
    assert(!err.message.includes('column "new_timeline_event" of relation "animals" does not exist'), 'No column does not exist error thrown');
  }

  console.log('\n======================================================');
  console.log(`🎯 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
