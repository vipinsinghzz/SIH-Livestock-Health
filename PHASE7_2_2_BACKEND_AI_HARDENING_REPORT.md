# Phase 7.2.2: Backend Startup Decoupling & Honest AI Fallback Report
**Livestock Saathi (पशुरक्षक)** – AI-Powered Livestock Health & Early Warning Platform  
**SIH 2026 Problem Statement 128**  
**Execution Date:** September 13, 2026  
**Phase Status:** Complete (100% Backend & AI Hardening Verified)

---

## 1. Executive Summary

Phase 7.2.2 addressed the primary backend production blockers identified during the Phase 7.1 audit:
1. **Mandatory MongoDB Startup Dependency Eliminated:** The backend previously terminated via `process.exit(1)` when MongoDB was unreachable or when `MONGODB_URI` was absent. This has been removed; the backend now boots successfully and operates purely with Supabase PostgreSQL as the primary database.
2. **Production CORS Architecture:** Replaced the invalid wildcard `cors({ origin: '*', credentials: true })` with dynamic `FRONTEND_URL` origin resolution, trailing-slash normalization, and explicit origin credential support. Unauthorized origins are strictly rejected with HTTP 403 Forbidden.
3. **Honest AI Fallback:** Eliminated the fabricated "Lumpy Skin Disease" / 78% confidence fallback in `backend/services/aiModelService.js`. When the Python AI microservice is offline or times out, the backend returns honest `aiUnavailable: true`, preserves null for unverified clinical fields, and leaves submitted reports in `'Reported'` status for official veterinary physical examination.

---

## 2. MongoDB Dependency Decoupling

### 2.1 The Issue
`backend/config/db.js` previously executed `process.exit(1)` within its `catch` block. In serverless or containerized cloud environments where only Supabase PostgreSQL was configured, the Node.js API server crashed on boot.

### 2.2 Implementation Details
- **`backend/config/db.js`:**
  - Added `mongoose.set('bufferCommands', false)` so database operations do not hang for 10 seconds waiting for an unreachable MongoDB instance.
  - If `MONGODB_URI` is not set: logs `[Database] MONGODB_URI not set. Running in Supabase PostgreSQL primary mode.` and returns `null` immediately.
  - If `MONGODB_URI` is set: attempts connection with `serverSelectionTimeoutMS: 3000`. On failure, logs a clear warning and returns `null` without calling `process.exit`.
- **`backend/server.js`:**
  - MongoDB connection invocation made non-blocking and isolated (`connectDB().catch(...)`).
- **`backend/services/aiModelService.js`:**
  - `checkSpatiotemporalOutbreak` now queries the Supabase PostgreSQL `reports` table as primary.
  - Legacy Mongoose query is attempted only if `mongoose.connection.readyState === 1`.
- **Primary Source of Truth:**
  - Supabase PostgreSQL remains the definitive source of truth across all 27 tables. All active production workflows (Auth, Animals, Reports, AI Triage, Cases, Containment, Realtime CDC) execute against Supabase.

---

## 3. Production CORS Architecture

### 3.1 The Issue
Modern browsers reject cross-origin XMLHttpRequests/Fetch when `credentials: true` is combined with wildcard `Access-Control-Allow-Origin: *`.

### 3.2 Implementation Details (`backend/server.js`)
- Implemented `resolveAllowedOrigins()`:
  - Reads `FRONTEND_URL` environment variable supporting comma-separated URLs (e.g. `https://pashumitra.in,https://app.pashumitra.in`).
  - Normalizes trailing slashes (e.g. `https://pashumitra.in/` matches `https://pashumitra.in`).
  - In development/testing: automatically whitelists `localhost` and `127.0.0.1` ports (`5173`, `3000`, `5000`).
  - In production (`NODE_ENV === 'production'`): restricts strictly to configured `FRONTEND_URL` domains.
- CORS Origin Handler:
  - Requests without origin header (server-to-server, curl, mobile native) pass through safely.
  - Allowed browser origins receive explicit `Access-Control-Allow-Origin: <origin>` and `Access-Control-Allow-Credentials: true`.
  - Unauthorized origins are rejected via `callback(new Error('CORS policy rejection...'))` handled by `errorHandler.js` returning HTTP 403 Forbidden.

---

## 4. Honest AI Fallback & Failure Classification

### 4.1 Elimination of Fabricated Data
Previously, `aiModelService.js` caught microservice connection errors and returned a fabricated diagnosis (`possibleCondition: 'Lumpy Skin Disease'`, `confidenceScore: 78%`). This was completely removed.

### 4.2 Error Classification Matrix
`backend/services/aiModelService.js` now classifies failures into distinct operational categories:

| Error Type | Trigger | Classification | User-Facing Result |
|---|---|:---:|---|
| **Connection Refused** | `ECONNREFUSED`, `ENOTFOUND`, fetch failed | `SERVICE_UNAVAILABLE` | `aiUnavailable: true`, `message: "AI screening is temporarily unavailable..."` |
| **Request Timeout** | Request exceeds `AI_SERVICE_TIMEOUT` (8000ms) | `TIMEOUT` | `aiUnavailable: true`, `message: "AI screening is temporarily unavailable..."` |
| **Microservice 500** | Python server internal error | `INFERENCE_ERROR` | `aiUnavailable: true`, sanitized notice (no server paths leaked) |
| **Bad JSON** | Non-JSON response payload | `MALFORMED_RESPONSE` | `aiUnavailable: true`, safe fallback |
| **Missing Input** | Empty symptoms array and no image | `VALIDATION_ERROR` | HTTP 400 Bad Request: `"Please provide an animal image or at least one symptom..."` |

### 4.3 Standardized AI Unavailable Response Contract
```json
{
  "success": false,
  "aiUnavailable": true,
  "errorType": "SERVICE_UNAVAILABLE",
  "message": "AI screening is temporarily unavailable. Your report has been saved and can still be reviewed by a veterinarian.",
  "riskLevel": "Pending",
  "possibleCondition": null,
  "confidenceScore": null,
  "visualScore": null,
  "hasImage": true,
  "suspectedDiseases": [],
  "recommendedAction": "Veterinary clinical examination recommended.",
  "immediateFirstAid": [
    "Isolate animal in dry, clean shed.",
    "Provide clean water and fresh green fodder.",
    "Contact veterinary dispensary for examination."
  ],
  "clinicalObservations": ["High Fever", "Cutaneous Nodules"],
  "outbreakFlag": false,
  "clusterDetails": {},
  "explanation": "AI screening is temporarily unavailable. Report queued for official veterinary examination.",
  "modelVersion": "lsd_model.keras (unavailable)"
}
```

---

## 5. Report-Saving Behavior When AI is Offline

### 5.1 The Workflow
```
Farmer Report Submission (POST /api/reports)
              ↓
Report Persisted in Supabase PostgreSQL (status: 'Reported')
              ↓
Call AI Microservice (lsd_model.keras via HTTP :5050)
              ↓
      [AI Service Offline]
              ↓
Report REMAINS in 'Reported' status
              ↓
triageResult set to null (NO fake database triage row)
              ↓
Return HTTP 201 Created with aiUnavailable: true
              ↓
Case Visible in Veterinarian Queue for Clinical Review
```

### 5.2 Verification
- If AI succeeds: Report status advances to `'Triaged'`, `triage_results` row is written with model confidence, and advisory is generated.
- If AI is unavailable: Report status remains `'Reported'`, `triageResult` is `null`, and veterinarian can perform physical diagnosis and lab referral.

---

## 6. Environment Variables Documentation

Updated `backend/.env.example` with clear documentation for production operators:

| Variable | Required in Prod? | Default | Description |
|---|:---:|:---:|---|
| `PORT` | Optional | `5000` | HTTP port for the Node.js API server |
| `NODE_ENV` | Recommended | `development` | Setting to `production` enables strict CORS and error masking |
| `FRONTEND_URL` | **Required in Prod** | *(localhost dev)* | Comma-separated allowed origins (e.g. `https://pashumitra.in`) |
| `SUPABASE_URL` | **Required** | — | Supabase project API URL |
| `SUPABASE_ANON_KEY` | **Required** | — | Public anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** | — | Secret backend service role key (NEVER expose to frontend) |
| `AI_SERVICE_URL` | Optional | `http://127.0.0.1:5050` | Python AI microservice endpoint |
| `AI_SERVICE_TIMEOUT` | Optional | `8000` | Microservice fetch timeout in milliseconds |
| `PYTHON_PATH` | Optional | `python` | Path to Python interpreter for auto-spawn |
| `MONGODB_URI` | **Optional (Legacy)** | — | Legacy data store; backend operates fully without it |

---

## 7. Security & Information Leakage Prevention

1. **Production Error Masking (`backend/middleware/errorHandler.js`):** In `production`, internal 500 errors return generic `"Internal Server Error"` without leaking raw SQL queries, stack traces, or internal server paths.
2. **CORS Rejection Status:** Unauthorized cross-origin requests receive explicit HTTP 403 Forbidden with clear log notices.
3. **Buffer Command Disabling:** Mongoose command buffering is disabled, preventing memory bloat and hung connections when MongoDB is offline.
4. **Credential Isolation:** Service role keys and passwords are never returned in error or triage payloads.

---

## 8. Test Execution & Verification

### 8.1 Dedicated Phase 7.2.2 Test Suite (`tests/test_phase7_2_2_backend_ai.js`)
All 41 assertions passed with 100% success rate:
- **Group 1 (MongoDB Decoupling):** `connectDB()` returns `null` without calling `process.exit` when `MONGODB_URI` is absent or unreachable. Primary DB verified via Supabase.
- **Group 2 (Production CORS):** `http://localhost:5173` allowed with credentials; `https://malicious-attacker-domain.evil.com` rejected with 403 Forbidden; no-origin curl/mobile allowed.
- **Group 3 (Honest AI Fallback):** Direct triage returns `success: false`, `aiUnavailable: true`, `possibleCondition: null`, `confidenceScore: null`, 0 occurrences of fake LSD.
- **Group 4 (Failure Classification):** 400 Bad Request on empty symptoms/image; timeout handled safely without crash.
- **Group 5 (Report Persistence):** Report created with 201 Created and persisted in Supabase database in `'Reported'` status with `triageResult: null`.
- **Group 6 (Security):** Zero password, key, or filesystem path leaks.

### 8.2 Full Platform Regression Suite
| Test Suite | File | Tests Run | Result | Duration |
|---|---|:---:|:---:|:---:|
| **Phase 7.2.2 Backend & AI Suite** | `tests/test_phase7_2_2_backend_ai.js` | 41 | ✅ **41/41 Passed** | 3.8s |
| **Auth Migration Suite** | `tests/test_auth_migration.js` | 56 | ✅ **56/56 Passed** | 1.1s |
| **Workflow Integration Suite** | `tests/test_phase4_workflow.js` | 24 | ✅ **24/24 Passed** | 1.3s |
| **Storage Migration Suite** | `tests/test_phase5_storage.js` | 32 | ✅ **32/32 Passed** | 1.5s |
| **Realtime & GIS Intelligence** | `tests/test_phase6_realtime_gis.js` | 102 | ✅ **102/102 Passed** | 2.4s |
| **Vite Production Build** | `npm run build` | 1 | ✅ **Success (Code 0)** | 4.79s |
| **TOTAL ASSERTIONS** | | **256** | **100% Passed (0 Failed)** | **14.9s** |

---

## 9. Files Modified

| File | Modification Summary |
|---|---|
| `backend/config/db.js` | Removed `process.exit(1)`; made MongoDB connection optional; disabled Mongoose buffering |
| `backend/server.js` | Non-blocking MongoDB startup; implemented dynamic production CORS with `FRONTEND_URL` and credentials |
| `backend/middleware/errorHandler.js` | Added CORS 403 rejection handling; sanitized 500 error messages in production |
| `backend/services/aiModelService.js` | Replaced fabricated LSD fallback with honest `aiUnavailable`; added error classification & timeout |
| `backend/controllers/reportController.js` | Honest fallback in direct triage & report creation; report persists in 'Reported' status when AI down |
| `backend/services/supabaseDb.js` | Exported `supabase` client; query Supabase reports primarily in cluster checks |
| `backend/.env.example` | Documented `FRONTEND_URL`, `AI_SERVICE_URL`, `AI_SERVICE_TIMEOUT`, and optional MongoDB status |
| `tests/test_phase4_workflow.js` | Distinguished AI-online vs AI-offline behavior in report assertions |
| `tests/test_phase5_storage.js` | Distinguished AI-online vs AI-offline behavior in report assertions |
| `tests/test_phase7_2_2_backend_ai.js` | **NEW**: 41-assertion test suite verifying startup decoupling, CORS, and honest AI fallback |
| `PHASE7_2_2_BACKEND_AI_HARDENING_REPORT.md` | **NEW**: This report |

---

## 10. Remaining Production Issues (From Phase 7.1 Audit)

### 🔴 Remaining P0 Blockers
1. **AI Microservice Python Environment (`backend/services/ai_service.py`):**  
   Missing `keras` / `tensorflow` runtime packages in the global Python environment. Requires a dedicated Python virtualenv / requirements setup script.

### 🟠 Remaining P1 Issues
1. **Static Health Endpoint (`backend/server.js`):**  
   `GET /api/health` returns static `{ status: 'online' }` without checking PostgreSQL, Supabase Storage, or AI microservice liveliness.
2. **Process Supervision for Python AI Service:**  
   Child process spawned in `server.js` needs auto-restart handling on unexpected exit.
3. **Mobile App Prototype (`farmer-app`):**  
   UI skeleton prototype only (~18% complete); use PWA web app on mobile devices for SIH demonstrations.
