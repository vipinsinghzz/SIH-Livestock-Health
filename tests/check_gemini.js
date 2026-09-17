/**
 * Quick Google Gemini Diagnostic Script
 * Run with: node tests/check_gemini.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n======================================================');
console.log('🔍 GOOGLE GEMINI API STATUS CHECK');
console.log('======================================================\n');

// 1. Read API Key from backend/.env
let key = process.env.GEMINI_API_KEY || '';
try {
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
    if (match && match[1]) {
      key = match[1].trim();
    }
  }
} catch (e) {}

console.log('Step 1: Inspecting Configured Key:');
if (!key || key.includes('your_gemini_api_key')) {
  console.log('  ❌ No valid GEMINI_API_KEY configured in backend/.env');
  console.log('\n👉 To fix:');
  console.log('   1. Go to https://aistudio.google.com/');
  console.log('   2. Click "Get API Key" -> "Create API Key"');
  console.log('   3. Put it in backend/.env: GEMINI_API_KEY=AIzaSy...');
  process.exit(0);
}

const isAiStudioKey = key.startsWith('AIzaSy');
console.log(`  - Key present: YES`);
console.log(`  - Prefix: ${key.substring(0, 7)}...`);
console.log(`  - Standard Google AI Studio format (AIzaSy...): ${isAiStudioKey ? '✅ YES' : '⚠️ NO (Starts with ' + key.substring(0, 6) + ')'}`);

// 2. Test Live Ping to Google AI Studio API
console.log('\nStep 2: Sending Live Test Request to Google AI Studio...');
const modelsToTest = ['gemini-1.5-flash', 'gemini-2.0-flash'];

(async () => {
  let isWorking = false;

  for (const model of modelsToTest) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    try {
      const startTime = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with exactly: "GEMINI_ONLINE"' }] }]
        })
      });
      const latency = Date.now() - startTime;
      const json = await res.json();

      if (res.ok) {
        const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        console.log(`\n  ✅ SUCCESS! Model ${model} is ONLINE!`);
        console.log(`  ⏱️ Latency: ${latency}ms`);
        console.log(`  🤖 Reply: ${reply}`);
        isWorking = true;
        break;
      } else {
        console.log(`\n  ❌ Model ${model} failed (HTTP ${res.status}):`);
        console.log(`     Error: ${json?.error?.message || JSON.stringify(json)}`);
      }
    } catch (err) {
      console.log(`\n  ❌ Network request failed for ${model}: ${err.message}`);
    }
  }

  console.log('\n======================================================');
  if (isWorking) {
    console.log('🎉 RESULT: Google Gemini is 100% OPERATIONAL & WORKING!');
  } else {
    console.log('⚠️ RESULT: Google Gemini is currently NOT working.');
    console.log('\nReason: Your GEMINI_API_KEY is rejected by Google (HTTP 401 Unauthorized).');
    console.log('A valid Google AI Studio key must begin with "AIzaSy...".');
    console.log('\n👉 Quick Fix (Takes 60 seconds):');
    console.log('   1. Open: https://aistudio.google.com/');
    console.log('   2. Click "Get API Key" -> "Create API Key"');
    console.log('   3. Copy your key (begins with AIzaSy...)');
    console.log('   4. Put it in:');
    console.log('      • backend/.env  -> GEMINI_API_KEY=AIzaSy...');
    console.log('      • Railway/Render -> Environment Variables -> GEMINI_API_KEY');
  }
  console.log('======================================================\n');
})();
