# Phase 7.2.1: Frontend Production Hardening Report
**Livestock Saathi (पशुरक्षक)** – AI-Powered Livestock Health & Early Warning Platform  
**SIH 2026 Problem Statement 128**  
**Execution Date:** September 13, 2026  
**Phase Status:** Complete (100% Frontend Hardening & Verification)

---

## 1. Executive Summary

Phase 7.2.1 focused strictly on **production hardening of the client layer**, addressing the critical frontend vulnerabilities and performance bottlenecks identified in the Phase 7.1 production audit. No database schema changes, SQL scripts, backend migrations, or Supabase alterations were made.

### Key Outcomes:
- **Centralized API URL Architecture:** Created `frontend/src/config/apiConfig.js` supporting `VITE_API_URL` with resilient trailing slash and `/api` path normalization. Works seamlessly in both local proxy development (`/api`) and split-domain production deployments (`https://api.pashumitra.in`).
- **Route-Level Code Splitting:** Converted all 16 page-level imports in `frontend/src/App.jsx` to `React.lazy()` wrapped with `React.Suspense` and a branded `AppLoadingScreen`. Separated large vendor chunks (`vendor-supabase`, `vendor-charts`, `vendor-leaflet`) via Vite Rollup `manualChunks`.
- **Initial Bundle Reduction: -81.7%:** The initial JavaScript bundle dropped from **1,821.94 kB** (1.82 MB monolithic bundle triggering Vite 500kB warning) down to **332.59 kB** (gzip: 113.27 kB). Zero chunks exceed 500 kB.
- **AI Triage Disclaimer Standardization:** Updated all user-facing AI screens (`DiseaseDetectionPage.jsx`, `KisanSaathiPage.jsx`, `ReportDetail.jsx`) to explicitly state: *"AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis"*. High/Critical severity states urgently direct farmers to registered veterinarians. Offline and failure states no longer fabricate disease conditions.
- **Regression Safety:** All 214 automated integration and unit assertions passed with 100% success rate across Auth, Workflow, Storage, and Realtime/GIS suites.

---

## 2. API URL Configuration Changes

### 2.1 The Problem
Previously, `frontend/src/services/api.js` hardcoded `baseURL: '/api'`. While functioning under Vite's local dev server proxy, this would break when deploying the frontend to static hosting (Vercel/Netlify/Cloudflare Pages) with the backend running on a different domain (Render/Railway/AWS). Additionally, hardcoded `http://localhost:5000` strings were found in `AnimalDetailModal.jsx`, and EventSource SSE URLs in `caseService.js` were constructed with raw relative strings.

### 2.2 Centralized Architecture (`frontend/src/config/apiConfig.js`)
Created a centralized URL resolver exporting:
- `API_BASE_URL`: Base URL for REST calls with `/api` suffix.
- `API_ROOT_URL`: Root server host URL for raw static asset links.
- `getApiUrl(endpoint)`: Safe path joiner preventing duplicate `/api/api` or missing slashes.
- `getImageUrl(relativePath)`: Resolves local uploads, Supabase signed URLs, and fallback images.
- `resolveApiConfig(rawUrl)`: Pure, fully testable normalization function.

#### Normalization Matrix:
| `VITE_API_URL` Input | Normalized `API_BASE_URL` | Normalized `API_ROOT_URL` | Resulting Endpoint (`/cases`) |
|---|---|---|---|
| *(undefined / empty)* | `'/api'` | `''` | `'/api/cases'` |
| `'https://api.pashumitra.in'` | `'https://api.pashumitra.in/api'` | `'https://api.pashumitra.in'` | `'https://api.pashumitra.in/api/cases'` |
| `'https://api.pashumitra.in/'` | `'https://api.pashumitra.in/api'` | `'https://api.pashumitra.in'` | `'https://api.pashumitra.in/api/cases'` |
| `'https://api.pashumitra.in/api'` | `'https://api.pashumitra.in/api'` | `'https://api.pashumitra.in'` | `'https://api.pashumitra.in/api/cases'` |
| `'https://api.pashumitra.in/api/'` | `'https://api.pashumitra.in/api'` | `'https://api.pashumitra.in'` | `'https://api.pashumitra.in/api/cases'` |

### 2.3 Frontend Services Updated
1. `frontend/src/services/api.js`: Axios instance now uses `baseURL: API_BASE_URL`. Preserves existing request/response interceptors, Supabase session auth headers, 401 error handling, and file upload transformations.
2. `frontend/src/services/caseService.js`: EventSource SSE URL now constructs `new EventSource(getApiUrl('/cases/stream?token=' + encodeURIComponent(token)))`.
3. `frontend/src/components/AnimalDetailModal.jsx`: Replaced hardcoded `http://localhost:5000` image URL fallback with `getImageUrl(item.image)`.
4. `frontend/.env.example`: Added documentation for `VITE_API_URL`.

---

## 3. Route-Level Code Splitting

### 3.1 Implementation in `App.jsx`
All 16 application pages are now loaded dynamically via `React.lazy()`:
- `LandingPage`, `Login`, `Register`, `SelectLanguagePage`
- `FarmerDashboard`, `FieldWorkerDashboard`, `ReportsList`, `ReportDetail`
- `AnimalsList`, `VaccinationPage`, `EmergencySOSPage`, `VeterinaryHelpPage`
- `KisanSaathiPage`, `DiseaseDetectionPage`, `AdvisoriesPage`, `GovernmentSchemesPage`

Lightweight shared infrastructure components remain eagerly loaded:
- `Navbar`, `OfflineBanner`, `AuthContext`, `ProtectedRoute`, `RoleRoute`, `AppLoadingScreen`.

### 3.2 Loading Fallback (`AppLoadingScreen`)
Integrated a professional, accessible fallback screen featuring:
- Branded Livestock Saathi emblem and pulse animation.
- Multilingual loading indicators in Hindi, Marathi, and English.
- Smooth CSS backdrop transition matching the design system.

### 3.3 Vite Rollup Chunking Strategy (`vite.config.js`)
Configured `build.rollupOptions.output.manualChunks` to split large third-party dependencies into independent, cached bundles:
- `vendor-supabase`: `@supabase/supabase-js` (227 kB)
- `vendor-charts`: `recharts` (383 kB) – loaded only when opening analytics dashboards.
- `vendor-leaflet`: `leaflet`, `react-leaflet` (296 kB) – loaded only when viewing spatial GIS maps.

---

## 4. Bundle Measurements: Before vs After

| Metric | Before Phase 7.2.1 | After Phase 7.2.1 | Impact |
|---|:---:|:---:|:---:|
| **Initial Entry Bundle** | **1,821.94 kB** (`index-SwNE9CYn.js`) | **332.59 kB** (`index-CerK-dDc.js`) | **-81.7% reduction** 📉 |
| **Gzip Compressed Size** | **~520 kB** | **113.27 kB** | **-78.2% reduction** |
| **Largest Single Chunk** | 1,821.94 kB | 383.80 kB (`vendor-charts`) | Zero chunks > 500 kB |
| **Total Chunks Generated** | 1 monolithic bundle | 58 optimized chunks | Modular caching enabled |
| **Vite Chunk Size Warning** | ⚠️ `(!) Some chunks are larger than 500 kB` | ✅ **Clean build (No warnings)** | Standards compliant |
| **Build Time** | 9.81s | 7.95s | Faster compilation |

### Page Chunk Breakdown (Post-Split):
- `KisanSaathiPage`: 41.07 kB (gzip: 13.25 kB)
- `VaccinationPage`: 46.83 kB (gzip: 13.62 kB)
- `DiseaseDetectionPage`: 47.07 kB (gzip: 13.84 kB)
- `AnimalDetailModal`: 62.74 kB (gzip: 19.31 kB)
- `ReportsList`: 68.50 kB (gzip: 19.92 kB)
- `Dashboard`: 117.75 kB (gzip: 28.55 kB)

---

## 5. AI Triage Disclaimer & UI Labeling

### 5.1 Standards Applied
All AI diagnostic screens were audited for terminology to ensure regulatory compliance and medical accuracy:
- **Rule 1:** Replaced claims of definitive "diagnosis" with *"AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis."*
- **Rule 2:** Removed all occurrences of AI presented as a "doctor" (e.g. `Kisan Saathi AI Doctor` → `Kisan Saathi AI Preliminary Screening`).
- **Rule 3:** For High or Critical severity assessments, rendered urgent, high-contrast consultation banners directing farmers to physical examination by a registered veterinarian.
- **Rule 4:** For AI service offline / failure modes, eliminated fake 92% LSD disease fallbacks in the frontend service; now renders:
  *"AI screening is temporarily unavailable. Your report has been saved and can still be reviewed by a veterinarian."*

### 5.2 Screens Updated
1. `frontend/src/services/diseaseDetectionService.js`:
   - Offline fallback returns `success: false`, `aiUnavailable: true`, and the standardized notification message.
2. `frontend/src/pages/DiseaseDetectionPage.jsx`:
   - Added persistent medical disclaimer banner atop AI assessment results.
   - Added urgent alert banner for High / Critical cases: *"High / Critical Risk: Please consult a Registered Veterinarian or local Veterinary Dispensary immediately for clinical confirmation."*
   - Timeline record author updated to `assessedBy: 'AI-Assisted Preliminary Triage (lsd_model.keras)'`.
3. `frontend/src/pages/KisanSaathiPage.jsx`:
   - Header changed from `AI Disease Diagnosis (रोग निदान)` to `AI Preliminary Screening (रोग प्रारंभिक जांच)`.
   - Result card renders bilingual medical disclaimer: *"AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis. (यह प्रारंभिक AI जोखिम जांच है, अधिकृत पशुचिकित्सकीय निदान नहीं।)"*
   - Urges immediate physical examination at nearest veterinary dispensary for High/Critical risk.
   - Timeline event logs `doctor: 'AI Preliminary Screening (Kisan Saathi)'`.
   - Voice assistant summaries in Hindi, Marathi, and English include the disclaimer notice.
4. `frontend/src/pages/ReportDetail.jsx`:
   - Card title updated to `पशु एआई ट्राइएज प्रारंभिक जांच (AI Preliminary Triage Screening)`.
   - Differential diagnosis subtitle updated to `संभावित बीमारियां (Suspected Conditions / Preliminary Indications)`.
   - Prominent blue disclaimer banner added.
5. `frontend/src/pages/FarmerDashboard.jsx`:
   - Updated quick-action tile from `Early Diagnosis` to `Early Screening`.

---

## 6. Regression Testing & Verification

All four automated backend/frontend test suites were executed sequentially against the running system:

### 6.1 Test Execution Results
| Test Suite | File | Tests Run | Result | Duration |
|---|---|:---:|:---:|:---:|
| **Auth Migration Suite** | `tests/test_auth_migration.js` | 56 | ✅ **56/56 Passed** | 1.1s |
| **Workflow Integration Suite** | `tests/test_phase4_workflow.js` | 24 | ✅ **24/24 Passed** | 1.4s |
| **Storage Migration Suite** | `tests/test_phase5_storage.js` | 32 | ✅ **32/32 Passed** | 1.6s |
| **Realtime & GIS Intelligence** | `tests/test_phase6_realtime_gis.js` | 102 | ✅ **102/102 Passed** | 2.5s |
| **Vite Production Build** | `npm run build` | 1 | ✅ **Success (Code 0)** | 7.95s |
| **TOTAL ASSERTIONS** | | **215** | **100% Passed (0 Failed)** | **14.5s** |

### 6.2 Verified Workflows
- Supabase Authentication (Farmer, Vet, Officer, Admin)
- Role-based route guards and session recovery
- Animal profile creation and tag assignment
- Disease reporting, AI screening, and case auto-triage
- PostGIS veterinary proximity discovery (< 2.5 km)
- Veterinarian queue access, case claiming, and 5-stage lifecycle
- Private Supabase Storage image upload and token-authenticated streaming
- Outbreak DBSCAN clustering, dual-zone UTM projection, and coordinate fuzzing

---

## 7. Files Modified in Phase 7.2.1

| File | Action | Purpose |
|---|:---:|---|
| `frontend/src/config/apiConfig.js` | **NEW** | Centralized API URL resolution with `VITE_API_URL` and path normalization |
| `frontend/src/services/api.js` | **MODIFY** | Updated Axios `baseURL` to use centralized `API_BASE_URL` |
| `frontend/src/services/caseService.js` | **MODIFY** | Updated EventSource SSE connection to use `getApiUrl()` |
| `frontend/src/components/AnimalDetailModal.jsx` | **MODIFY** | Replaced hardcoded `localhost:5000` with `getImageUrl()` |
| `frontend/.env.example` | **MODIFY** | Documented `VITE_API_URL` environment variable |
| `frontend/src/App.jsx` | **MODIFY** | Implemented route-level code-splitting with `React.lazy` and `Suspense` |
| `frontend/vite.config.js` | **MODIFY** | Configured `manualChunks` for Supabase, Leaflet, and Recharts |
| `frontend/src/services/diseaseDetectionService.js` | **MODIFY** | Offline fallback returns honest AI unavailability instead of fake LSD |
| `frontend/src/pages/DiseaseDetectionPage.jsx` | **MODIFY** | Medical disclaimer banner, vet consultation notice, honest fallback UI |
| `frontend/src/pages/KisanSaathiPage.jsx` | **MODIFY** | Renamed to Preliminary Screening, added disclaimers, removed AI doctor |
| `frontend/src/pages/ReportDetail.jsx` | **MODIFY** | Updated triage header and added prominent bilingual medical disclaimer |
| `frontend/src/pages/FarmerDashboard.jsx` | **MODIFY** | Updated Early Diagnosis tile to Early Screening |
| `PHASE7_1_PRODUCTION_AUDIT.md` | **MODIFY** | Annotated resolved P0 #1, P1 #2, and P1 #3 items |
| `PHASE7_2_1_FRONTEND_HARDENING_REPORT.md` | **NEW** | This detailed hardening report |

---

## 8. Remaining Production Issues (From Phase 7.1 Audit)

### 🔴 Remaining P0 Blockers
1. **Backend Startup Dependency on MongoDB (`backend/config/db.js`):**  
   If MongoDB is unreachable, `connectDB()` executes `process.exit(1)`. When deploying to a cloud host where Supabase is the primary database, the backend crashes on boot. Graceful connection failure handling is needed.
2. **CORS Configuration Flaw (`backend/server.js`):**  
   `cors({ origin: '*', credentials: true })` causes modern browsers to reject cross-origin requests with credentials. Must support `process.env.FRONTEND_URL` or dynamic allowed origin list.
3. **AI Microservice Python Dependencies (`backend/services/ai_service.py`):**  
   Production Python environment must have `keras` / `tensorflow` packages provisioned to run `lsd_model.keras` without falling back to Node.js.

### 🟠 Remaining P1 Issues
1. **Backend AI Fallback Fabrication (`backend/services/aiModelService.js`):**  
   When Python AI is offline, the backend currently constructs a fake LSD diagnosis. Must be updated in Phase 7.2.2 to return `aiUnavailable: true` with honest notification.
2. **Static Health Endpoint (`backend/server.js`):**  
   `GET /api/health` returns static `{ status: 'online' }` without checking PostgreSQL, Supabase Storage, or AI microservice liveliness.
3. **Process Supervision for Python AI Service:**  
   Child process spawned in `server.js` needs auto-restart handling on unexpected exit.

---

## 9. Next Recommended Task

**PHASE 7.2.2 — BACKEND STARTUP DECOUPLING & HONEST AI FALLBACK**  
1. Decouple MongoDB startup crash in `backend/config/db.js` (allow backend to boot successfully with Supabase alone).
2. Fix CORS origin configuration in `backend/server.js` to support `FRONTEND_URL` with credentials.
3. Update `backend/services/aiModelService.js` to return honest `aiUnavailable` status when Python AI service is down.
