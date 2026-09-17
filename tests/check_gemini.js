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

const isLegacyAiStudioKey = key.startsWith('AIzaSy');
const isNewAuthKey = key.startsWith('AQ.');
console.log(`  - Key present: YES`);
console.log(`  - Prefix: ${key.substring(0, 7)}...`);
if (isLegacyAiStudioKey) {
  console.log(`  - Key Format: Classic Google Cloud API Key (AIzaSy...) ✅`);
} else if (isNewAuthKey) {
  console.log(`  - Key Format: New Google AI Studio Auth Key (AQ....) ℹ️`);
} else {
  console.log(`  - Key Format: Custom / Unknown prefix (${key.substring(0, 6)}...) ⚠️`);
}

// 2. Test Live Ping to Google AI Studio API
console.log('\nStep 2: Sending Live Test Request to Google AI Studio API...');
const modelsToTest = ['gemini-1.5-flash', 'gemini-2.0-flash'];

(async () => {
  let isWorking = false;

  for (const model of modelsToTest) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const startTime = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
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
        console.log(`\n  ❌ Model ${model} returned HTTP ${res.status}:`);
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
    console.log('⚠️ RESULT: Google Gemini is currently NOT working with this key.');
    console.log('\nℹ️ Why this happens:');
    console.log('1. Google AI Studio recently started issuing keys starting with "AQ." (Auth Keys).');
    console.log('   However, many Google REST endpoints and project quotas reject them unless bound');
    console.log('   to a paid/standard Google Cloud Project or sent via specific Google SDKs.');
    console.log('2. The guaranteed, universally-compatible key format starts with "AIzaSy...".');
    console.log('\n👉 How to get a working "AIzaSy..." key in 60 seconds (100% Free):');
    console.log('   1. Visit Google Cloud Console Credentials:');
    console.log('      https://console.cloud.google.com/apis/credentials');
    console.log('   2. Select any project (or create one).');
    console.log('   3. Click "+ CREATE CREDENTIALS" at the top -> Select "API key".');
    console.log('   4. It will immediately generate a key starting with: AIzaSy...');
    console.log('   5. Make sure "Generative Language API" is enabled in your project:');
    console.log('      https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
    console.log('   6. Update backend/.env:');
    console.log('      GEMINI_API_KEY=AIzaSy...');
    console.log('   7. Add GEMINI_API_KEY=AIzaSy... to your Railway environment variables.');
  }
  console.log('======================================================\n');
})();
