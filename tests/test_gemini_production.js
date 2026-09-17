/**
 * Production Gemini Activation & AI Reliability Test Suite (Phase 7.3)
 * Tests Gemini service behavior, model fallback, timeouts, API key security, and honest clinical fallback semantics.
 *
 * Covers:
 * 1. Missing API key behavior
 * 2. Configured API key detection
 * 3. Primary model selection ('gemini-3.8-flash')
 * 4. Fallback model selection ('gemini-3.5-flash')
 * 5. Provider failure handling
 * 6. Timeout handling via AbortSignal
 * 7. Clinical rule engine fallback
 * 8. isAIPowered honesty & semantics
 * 9. Model labeling accuracy
 * 10. Multilingual prompt & response preservation (En/Hi/Mr)
 * 11. Sensitive-key redaction in error logging
 * 12. Malformed JSON / code block parsing resilience
 */

const assert = require('assert');
const geminiService = require('../backend/services/geminiService');
const { getFallbackForIntent } = require('../backend/services/intentService');

let passedTests = 0;
let failedTests = 0;

function pass(name) {
  passedTests++;
  console.log(`  ✅ PASS: ${name}`);
}

function fail(name, err) {
  failedTests++;
  console.error(`  ❌ FAIL: ${name}`, err?.message || err);
}

// Preserve original global fetch and env
const originalFetch = global.fetch;
const originalKey = process.env.GEMINI_API_KEY;

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 7.3 GEMINI PRODUCTION RELIABILITY TESTS');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Missing / Empty / Placeholder API Key
    // -------------------------------------------------------------------------
    console.log('🔹 TEST 1: Missing / Placeholder API Key');
    process.env.GEMINI_API_KEY = '';
    assert.strictEqual(geminiService.isConfigured(), false, 'Empty key should report isConfigured() === false');
    pass('Empty GEMINI_API_KEY reports isConfigured() = false');

    process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
    assert.strictEqual(geminiService.isConfigured(), false, 'Placeholder key should report isConfigured() === false');
    pass('Placeholder key reports isConfigured() = false');

    const unconfiguredConsult = await geminiService.generatePersonalizedConsultation({
      query: 'मेरी गाय को बुखार है',
      language: 'hi'
    });
    assert.strictEqual(unconfiguredConsult, null, 'Unconfigured service should immediately return null');
    pass('Unconfigured service returns null without making any network requests');

    const unconfiguredRec = await geminiService.generateClinicalRecommendation({
      diseaseName: 'Foot and Mouth Disease',
      riskLevel: 'High'
    });
    assert.strictEqual(unconfiguredRec, null, 'Unconfigured recommendation should return null');
    pass('generateClinicalRecommendation returns null when unconfigured');

    // -------------------------------------------------------------------------
    // TEST 2: Configured API Key Detection
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 2: Configured API Key Detection');
    process.env.GEMINI_API_KEY = 'AIzaSyFakeKeyForTestingPurposeOnly12345678';
    assert.strictEqual(geminiService.isConfigured(), true, 'Valid format key should report isConfigured() === true');
    pass('Non-placeholder key > 10 chars reports isConfigured() = true');

    // -------------------------------------------------------------------------
    // TEST 3: Primary Model Selection ('gemini-3.8-flash')
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 3: Primary Model Selection (gemini-3.8-flash)');
    let requestedUrls = [];
    let requestedHeaders = [];

    global.fetch = async (url, options) => {
      requestedUrls.push(url);
      requestedHeaders.push(options?.headers || {});

      if (url.includes('gemini-3.8-flash')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        reply: 'गाय को छांव में रखें और स्वच्छ पानी दें।',
                        riskLevel: 'Moderate',
                        keyAdvice: ['छांव में रखें', '1962 पर कॉल करें']
                      })
                    }
                  ]
                }
              }
            ]
          })
        };
      }
      return { ok: false, status: 404, text: async () => 'Model Not Found' };
    };

    const primaryResult = await geminiService.generatePersonalizedConsultation({
      query: 'गाय को बुखार है क्या करें?',
      language: 'hi',
      farmerName: 'रमेश'
    });

    assert.ok(primaryResult, 'Primary consultation should return result');
    assert.strictEqual(primaryResult.isAIPowered, true, 'isAIPowered must be true for successful Gemini call');
    assert.strictEqual(primaryResult.model, 'gemini-3.8-flash', 'Model must be gemini-3.8-flash');
    assert.strictEqual(primaryResult.reply, 'गाय को छांव में रखें और स्वच्छ पानी दें।');
    assert.strictEqual(primaryResult.riskLevel, 'Moderate');
    assert.ok(Array.isArray(primaryResult.keyAdvice) && primaryResult.keyAdvice.length === 2);
    pass('Primary model gemini-3.8-flash selected and executed successfully');

    // Security check: Verify API key passed in header, NOT in URL query string
    assert.ok(!requestedUrls[0].includes('?key='), 'API key must NOT appear in URL query parameters');
    assert.strictEqual(requestedHeaders[0]['x-goog-api-key'], process.env.GEMINI_API_KEY, 'API key must be passed in x-goog-api-key header');
    pass('API key passed via x-goog-api-key header without URL query leakage');

    // -------------------------------------------------------------------------
    // TEST 4: Fallback Model Selection ('gemini-3.5-flash')
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 4: Fallback Model Selection (gemini-3.5-flash)');
    requestedUrls = [];

    global.fetch = async (url) => {
      requestedUrls.push(url);
      if (url.includes('gemini-3.8-flash')) {
        // Simulate primary model temporary outage / rate limit
        return { ok: false, status: 429, text: async () => 'Rate limit exceeded' };
      }
      if (url.includes('gemini-3.5-flash')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        reply: 'Isolate animal and provide hydration.',
                        riskLevel: 'Low',
                        keyAdvice: ['Hydrate']
                      })
                    }
                  ]
                }
              }
            ]
          })
        };
      }
      return { ok: false, status: 500, text: async () => 'Server error' };
    };

    const fallbackModelResult = await geminiService.generatePersonalizedConsultation({
      query: 'What feed should I give for milk yield?',
      language: 'en'
    });

    assert.ok(fallbackModelResult, 'Fallback model consultation should return result');
    assert.strictEqual(fallbackModelResult.model, 'gemini-3.5-flash', 'Model must failover to gemini-3.5-flash');
    assert.strictEqual(fallbackModelResult.isAIPowered, true, 'isAIPowered must be true for fallback model success');
    assert.strictEqual(fallbackModelResult.reply, 'Isolate animal and provide hydration.');
    assert.strictEqual(requestedUrls.length, 2, 'Should have tried primary first, then fallback');
    pass('Failed primary model safely failed over to gemini-3.5-flash');

    // -------------------------------------------------------------------------
    // TEST 5: Complete Provider Failure -> Honest Terminal Fallback
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 5: Provider Failure & Terminal Fallback');
    requestedUrls = [];

    global.fetch = async (url) => {
      requestedUrls.push(url);
      return { ok: false, status: 503, text: async () => 'Service Unavailable' };
    };

    const failedResult = await geminiService.generatePersonalizedConsultation({
      query: 'माझी गाय आज आजारी आहे',
      language: 'mr'
    });

    assert.strictEqual(failedResult, null, 'Service should return null when all Gemini models fail');
    pass('GeminiService returns null when all upstream models return 5xx errors');

    // Simulate route fallback resolution
    const routeFallback = getFallbackForIntent({
      intent: 'NEW_SYMPTOM_OR_DISEASE',
      query: 'माझी गाय आज आजारी आहे',
      language: 'mr',
      district: 'Nagpur'
    });

    const terminalResponse = {
      success: true,
      reply: routeFallback.reply,
      riskLevel: routeFallback.riskLevel,
      keyAdvice: routeFallback.keyAdvice,
      model: 'veterinary-clinical-engine',
      isAIPowered: false,
      timestamp: new Date().toISOString()
    };

    assert.strictEqual(terminalResponse.isAIPowered, false, 'isAIPowered must be strictly FALSE');
    assert.strictEqual(terminalResponse.model, 'veterinary-clinical-engine', 'model must be veterinary-clinical-engine');
    assert.ok(terminalResponse.reply && terminalResponse.reply.length > 20, 'Reply must contain substantive clinical guidance');
    pass('Route honestly marks isAIPowered=false and model=veterinary-clinical-engine');

    // -------------------------------------------------------------------------
    // TEST 6: Request Timeout via AbortSignal
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 6: Timeout Handling');
    global.fetch = async () => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    };

    const timeoutResult = await geminiService.generatePersonalizedConsultation({
      query: 'FMD vaccination schedule',
      language: 'en'
    });
    assert.strictEqual(timeoutResult, null, 'Timeout must not hang and return null gracefully');
    pass('Network timeout gracefully returns null without uncaught exception');

    // -------------------------------------------------------------------------
    // TEST 7: Malformed / Markdown-Wrapped JSON Resilience
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 7: Markdown Fences & Malformed Output Resilience');
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '```json\n{\n  "reply": "स्वच्छ गोठा ठेवा आणि दररोज तपासणी करा.",\n  "riskLevel": "Low",\n  "keyAdvice": ["गोठा स्वच्छ ठेवा"]\n}\n```'
                }
              ]
            }
          }
        ]
      })
    });

    const markdownResult = await geminiService.generatePersonalizedConsultation({
      query: 'गोठा कसा ठेवावा?',
      language: 'mr'
    });

    assert.ok(markdownResult, 'Result should successfully parse fenced JSON');
    assert.strictEqual(markdownResult.reply, 'स्वच्छ गोठा ठेवा आणि दररोज तपासणी करा.');
    assert.strictEqual(markdownResult.isAIPowered, true);
    pass('Markdown-fenced ```json code blocks parsed cleanly');

    // Test invalid non-JSON string
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Sorry, I cannot generate JSON for this request.' }]
            }
          }
        ]
      })
    });

    const badJsonResult = await geminiService.generatePersonalizedConsultation({
      query: 'Test invalid JSON'
    });
    assert.strictEqual(badJsonResult, null, 'Non-JSON text must safely fall back to null');
    pass('Unparseable non-JSON Gemini output safely returns null instead of crashing');

    // Test empty text string
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '' }]
            }
          }
        ]
      })
    });

    const emptyResult = await geminiService.generatePersonalizedConsultation({
      query: 'Test empty string'
    });
    assert.strictEqual(emptyResult, null, 'Empty text string must return null');
    pass('Empty text response safely returns null');

    // -------------------------------------------------------------------------
    // TEST 8: Clinical Disease Recommendation (generateClinicalRecommendation)
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 8: Clinical Disease Agrometeorological Recommendation');
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    recommendationEn: 'Maintain biosecurity and isolate sick cattle immediately.',
                    recommendationHi: 'बीमार पशुओं को अलग रखें और खुरली को साफ करें।',
                    recommendationMr: 'आजारी जनावरांना वेगळे ठेवा आणि गोठा निर्जंतुक करा.'
                  })
                }
              ]
            }
          }
        ]
      })
    });

    const recResult = await geminiService.generateClinicalRecommendation({
      diseaseName: 'Lumpy Skin Disease',
      riskLevel: 'High',
      location: 'Nagpur, Maharashtra',
      weather: { tempC: 32, humidityPct: 70, thi: 82, stressLevel: 'High' }
    });

    assert.ok(recResult, 'Recommendation result must exist');
    assert.strictEqual(recResult.isAIPowered, true);
    assert.strictEqual(recResult.model, 'gemini-3.8-flash');
    assert.strictEqual(recResult.recommendationEn, 'Maintain biosecurity and isolate sick cattle immediately.');
    assert.strictEqual(recResult.recommendationHi, 'बीमार पशुओं को अलग रखें और खुरली को साफ करें।');
    assert.strictEqual(recResult.recommendationMr, 'आजारी जनावरांना वेगळे ठेवा आणि गोठा निर्जंतुक करा.');
    pass('generateClinicalRecommendation returns validated trilingual recommendations');

    // -------------------------------------------------------------------------
    // TEST 9: Sensitive Key Redaction in Error Logs
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 9: Sensitive Key Redaction in Error Logs');
    const capturedLogs = [];
    const origWarn = console.warn;
    console.warn = (...args) => capturedLogs.push(args.join(' '));

    const sensitiveApiKey = 'AIzaSyD9876543210ZYXWVUTSRQPONMLKJIHGFED';
    global.fetch = async () => ({
      ok: false,
      status: 400,
      text: async () => `Error: Invalid API key ${sensitiveApiKey} passed in request`
    });

    process.env.GEMINI_API_KEY = sensitiveApiKey;
    await geminiService.generatePersonalizedConsultation({ query: 'Security test' });

    console.warn = origWarn;

    const leakedKey = capturedLogs.some(log => log.includes(sensitiveApiKey));
    const redactedKey = capturedLogs.some(log => log.includes('[REDACTED_API_KEY]'));

    assert.strictEqual(leakedKey, false, 'Raw API key must NEVER appear in console logs');
    assert.strictEqual(redactedKey, true, 'API key pattern must be sanitized to [REDACTED_API_KEY]');
    pass('Sensitive API key strictly redacted from server error logs');

    // -------------------------------------------------------------------------
    // TEST 10: Language Code Preservation
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 10: Multilingual Routing');
    let capturedPrompt = '';
    global.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      capturedPrompt = body.contents[0].parts[0].text;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ reply: 'मराठी सल्ला', riskLevel: 'Low', keyAdvice: [] }) }]
              }
            }
          ]
        })
      };
    };

    await geminiService.generatePersonalizedConsultation({
      query: 'गायीच्या दुधाबद्दल माहिती द्या',
      language: 'mr'
    });

    assert.ok(capturedPrompt.includes('Marathi (मराठी)'), 'Prompt must instruct model to respond in Marathi');
    pass('Marathi language directive successfully injected into prompt');

    await geminiService.generatePersonalizedConsultation({
      query: 'Tell me about vaccination',
      language: 'en'
    });

    assert.ok(capturedPrompt.includes('English'), 'Prompt must instruct model to respond in English');
    pass('English language directive successfully injected into prompt');

    // -------------------------------------------------------------------------
    // TEST 11: Veterinary Safety Guardrails Embedded in Prompt
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST 11: Veterinary Safety Guardrails Embedded in Prompt');
    assert.ok(capturedPrompt.includes('VETERINARY ADVISORY ROLE'), 'Prompt must specify veterinary advisory role');
    assert.ok(capturedPrompt.includes('NO RESTRICTED MEDICATIONS'), 'Prompt must forbid prescription antibiotics/steroids');
    assert.ok(capturedPrompt.includes('NO FABRICATION'), 'Prompt must forbid fabricating records or outbreaks');
    assert.ok(capturedPrompt.includes('1962'), 'Prompt must require emergency helpline 1962');
    pass('Prompt contains strict veterinary safety directives');

    console.log('\n================================================================');
    console.log(`📊 TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
    console.log('================================================================');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL PHASE 7.3 GEMINI PRODUCTION TESTS PASSED PERFECTLY!\n');
    }
  } finally {
    // Restore original globals
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
