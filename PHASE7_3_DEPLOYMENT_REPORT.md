# PHASE 7.3: PRODUCTION DEPLOYMENT READINESS & CLOUD SMOKE TEST AUDIT REPORT

**Date:** September 13, 2026  
**Status:** READY FOR CLOUD DEPLOYMENT (Not deployed yet — audit & packaging validated)  
**Total Automated Assertions:** 306 / 306 PASSING (0 Failures, 0 Regressions)  
**Target Architecture:** Multi-tier decoupled cloud infrastructure for Smart India Hackathon (SIH 2026)  

---

## 1. Production Deployment Architecture

```
                                  [ END USER / SIH JUDGE ]
                              (Desktop Chrome / Edge / Mobile)
                                             │
                                             ▼ HTTPS
                     ┌─────────────────────────────────────────────────┐
                     │          TIER 1: FRONTEND (Vercel)              │
                     │  - React 18 + Vite 5 + TailwindCSS              │
                     │  - SPA client-side routing (vercel.json)        │
                     │  - Code-split bundles (332 kB main bundle)      │
                     │  - Environment: VITE_API_URL, VITE_SUPABASE_*   │
                     └───────────────────────┬─────────────────────────┘
                                             │
                     ┌───────────────────────┴─────────────────────────┐
                     │ HTTPS / REST (JWT)                              │ WSS / Realtime
                     ▼                                                 ▼
      ┌─────────────────────────────┐                  ┌─────────────────────────────┐
      │   TIER 2: BACKEND API       │                  │   TIER 3: DATABASE & CLOUD  │
      │   (Render / Railway)        │                  │          (Supabase)         │
      │  - Express.js (Node 20+)    │                  │  - Primary DB: PostgreSQL   │
      │  - Supabase Service Role    │─────────────────>│  - Auth: JWT + PBKDF2 Users │
      │  - Multi-tier CORS Guard    │  PostgreSQL/RPC  │  - Storage: scan-images     │
      │  - Health: /health          │                  │  - Realtime: WebSocket sse  │
      │  - Honest AI Fallback       │                  │  - Spatial: PostGIS EPSG    │
      └──────────────┬──────────────┘                  └─────────────────────────────┘
                     │ HTTP / Internal VPC (:5050)
                     ▼
      ┌─────────────────────────────┐
      │   TIER 4: AI MICROSERVICE   │
      │   (Render / Docker / Fly)   │
      │  - Python 3.12-slim         │
      │  - TensorFlow 2.21 + Keras  │
      │  - lsd_model.keras (48.3MB) │
      │  - EfficientNetB0 Backbone  │
      │  - Non-root user: appuser   │
      │  - Health: /health          │
      └─────────────────────────────┘
```

---

## 2. Production Environment Variable Matrix

| Component | Variable Name | Classification | Sensitivity | Purpose & Value Example |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `VITE_SUPABASE_URL` | PUBLIC | Client-Safe | Supabase project URL (e.g., `https://xyzcompany.supabase.co`) |
| **Frontend** | `VITE_SUPABASE_ANON_KEY` | PUBLIC | Client-Safe (RLS-guarded) | Supabase anonymous public client key |
| **Frontend** | `VITE_API_URL` | PUBLIC | Client-Safe | Fully qualified Backend API root (e.g., `https://api.pashurakshak.in`) |
| **Backend** | `PORT` | OPTIONAL | Server Config | Default: `5000` (injected automatically by PaaS host) |
| **Backend** | `NODE_ENV` | OPTIONAL | Server Config | `'production'` |
| **Backend** | `FRONTEND_URL` | REQUIRED | Server Config | Allowed origin(s) for credentialed CORS (e.g., `https://pashurakshak.in,https://app.pashurakshak.in`) |
| **Backend** | `SUPABASE_URL` | REQUIRED | Server Config | Supabase project URL (`https://xyzcompany.supabase.co`) |
| **Backend** | `SUPABASE_ANON_KEY` | REQUIRED | Client-Safe | Public client key for tenant validation |
| **Backend** | `SUPABASE_SERVICE_ROLE_KEY` | REQUIRED | **SERVER SECRET** | **STRICTLY SERVER-ONLY**: Bypasses RLS for administrative background operations |
| **Backend** | `SUPABASE_JWT_SECRET` | REQUIRED | **SERVER SECRET** | Used to verify Supabase Auth bearer tokens locally |
| **Backend** | `AI_SERVICE_URL` | REQUIRED | Server Config | URL of Python AI microservice (e.g., `http://ai-service:5050` or `https://ai.pashurakshak.in`) |
| **Backend** | `AI_SERVICE_TIMEOUT` | OPTIONAL | Server Config | Milliseconds before triggering honest fallback (Default: `8000`) |
| **Backend** | `SPAWN_LOCAL_AI` | OPTIONAL | Server Config | Set to `'false'` when AI runs in a separate cloud container/service |
| **Backend** | `GEMINI_API_KEY` | OPTIONAL | **SERVER SECRET** | Enables agrometeorological advisories (optional, non-fatal) |
| **Backend** | `MONGODB_URI` | OPTIONAL | Server Secret | Legacy MongoDB store (NOT required; omitted in production) |
| **AI Service**| `AI_SERVICE_PORT` | OPTIONAL | Server Config | Default: `5050` |
| **AI Service**| `AI_SERVICE_HOST` | OPTIONAL | Server Config | Default: `0.0.0.0` (required for Docker container exposure) |
| **AI Service**| `KERAS_BACKEND` | REQUIRED | Server Config | `'tensorflow'` |
| **AI Service**| `TF_ENABLE_ONEDNN_OPTS`| OPTIONAL | Server Config | `'1'` (CPU acceleration) |

> [!CAUTION]
> `SUPABASE_SERVICE_ROLE_KEY` must **NEVER** be committed to Git, shared in `.env.example`, or injected into frontend environment variables (`VITE_*`).

---

## 3. Frontend Deployment Readiness

- **Platform Target:** Vercel (or Cloudflare Pages / Netlify).
- **Vite Build Command:** `npm run build` (outputs to `dist/`).
- **SPA Client Routing Resilience:** Created [`frontend/vercel.json`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/frontend/vercel.json) with rewrite rule `/(.*) -> /index.html`. Direct browser navigation or page refresh on `/disease-detection`, `/reports`, `/kisan-saathi` will never 404.
- **API URL Dynamic Resolution:** Implemented in `frontend/src/config/apiConfig.js`. When `VITE_API_URL` is set, API calls automatically route to the cloud backend with trailing slash normalization. When absent, it falls back cleanly to relative `/api`.
- **Bundle Optimization:** Code-split into vendor chunks (`vendor-supabase`, `vendor-charts`, `vendor-leaflet`). Initial bundle size: 332 kB (-81.7% reduction from monolithic bundle).

---

## 4. Backend Deployment Readiness

- **Platform Target:** Render Web Service (or Railway / Fly.io).
- **Start Command:** `npm start` (`node server.js`).
- **Database Decoupling:** Starts cleanly in Supabase-only primary mode without requiring MongoDB or crashing.
- **Split AI Deployment Support:** Added `SPAWN_LOCAL_AI=false` option. In containerized cloud setups, Node will not attempt to spawn Python locally and will communicate directly with the containerized `AI_SERVICE_URL`.
- **Cross-Platform Virtualenv Detection:** Enhanced to inspect both Linux/Unix path (`.venv/bin/python`) and Windows path (`.venv/Scripts/python.exe`), ensuring smooth execution in Linux containers as well as developer environments.

---

## 5. AI Service Deployment Readiness

- **Platform Target:** Docker Web Service on Render / Railway / Fly.io / AWS ECS.
- **Container Definition:** Production [`ml/Dockerfile`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/ml/Dockerfile) using `python:3.12-slim-bookworm`.
- **Security:** Operates under dedicated non-root `appuser` (UID 10001).
- **Host Binding:** Configured to bind to `0.0.0.0:5050` (`AI_SERVICE_HOST=0.0.0.0`), allowing external reverse-proxy traffic into the container.
- **Automated Healthcheck:** Integrated Docker `HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -f http://127.0.0.1:5050/health || exit 1`.
- **Inference Latency:** Average warm inference speed measured at **100.3 ms** on CPU.

---

## 6. CORS Configuration Audit

- **Dynamic Origin Resolution:** `backend/server.js` parses `FRONTEND_URL` (comma-separated for production and staging domains).
- **Trailing Slash Normalization:** URLs such as `https://app.pashurakshak.in/` and `https://app.pashurakshak.in` are normalized before comparison, preventing unexpected rejections.
- **Strict Environment Separation:**
  - `NODE_ENV === 'production'`: **Only** explicit origins defined in `FRONTEND_URL` are permitted. Localhost is strictly blocked.
  - Development mode: Localhost ports (`5173`, `3000`, `5000`) are allowed for developer workflows.
- **Credential Security:** `credentials: true` is configured with explicit origin echoing; wildcard `*` is strictly avoided.
- **Server-to-Server Compatibility:** Requests with missing `Origin` headers (cURL, native mobile apps, server-to-server RPCs) are safely accepted.

---

## 7. Repository Localhost Audit

Every occurrence of `localhost` and `127.0.0.1` across the repository has been audited and categorized:

| Location | Reference | Classification | Safety Explanation |
| :--- | :--- | :--- | :--- |
| `frontend/src/config/apiConfig.js` | None | Clean | Uses `VITE_API_URL` or relative `/api` |
| `frontend/dist/assets/index-*.js` | None (Axios internal only) | Clean | Production bundle contains zero application `localhost` calls |
| `frontend/vite.config.js` | `http://localhost:5000` | Dev Proxy Only | Only evaluated during local `vite` dev server; omitted in production bundle |
| `backend/server.js` | `http://localhost:5173, ...` | Dev Origins | Guarded by `if (NODE_ENV !== 'production')`; ignored in production |
| `backend/services/aiModelService.js` | `http://127.0.0.1:5050` | Fallback Config | Overridden by `AI_SERVICE_URL` environment variable |
| `backend/.env.example` | `http://localhost:...` | Documentation | Illustrative templates for developer setup |
| `tests/*.js` & `tests/*.py` | `http://127.0.0.1:...` | Test Harness | Automated test suites executing against local test servers |
| `ml/Dockerfile` | `http://127.0.0.1:5050/health` | Container Healthcheck | Internal Docker loopback probing container's own health endpoint |

---

## 8. Health Endpoint Status

Both Backend and AI services feature machine-readable JSON health endpoints:

### Backend Health: `GET /health` and `GET /api/health`
- Returns HTTP 200 when database is configured and operational.
- Dynamically checks AI microservice via `checkAiHealth()`.
- Distinguishes:
  - `healthy`: Primary Supabase DB connected and AI microservice loaded.
  - `degraded`: Primary DB connected, but AI microservice is in fallback mode (does not crash load balancer).
  - `unhealthy` (HTTP 503): Primary database connection failed.
- Sample production response:
  ```json
  {
    "status": "healthy",
    "service": "Livestock Saathi Surveillance API",
    "version": "1.0.0",
    "environment": "production",
    "uptimeSeconds": 1420,
    "database": {
      "type": "Supabase PostgreSQL",
      "connected": true,
      "mode": "live"
    },
    "aiService": {
      "url": "https://ai.pashurakshak.in",
      "status": "healthy",
      "modelLoaded": true,
      "fallbackMode": false
    },
    "timestamp": "2026-09-13T11:15:00.000Z"
  }
  ```

### AI Microservice Health: `GET /health`
- Returns HTTP 200 with `{ "status": "healthy", "modelLoaded": true, "modelVersion": "lsd_model.keras", "inputShape": [null, 224, 224, 3], "outputShape": [null, 1] }`.
- Returns HTTP 503 with `{ "status": "degraded", "modelLoaded": false }` if model fails to load.

---

## 9. Supabase Configuration Status

- **Database Engine:** Supabase PostgreSQL 15+ with PostGIS 3.3+.
- **Authentication:** Supabase Auth with standard JWT claims.
- **Key Separation:**
  - Frontend uses `VITE_SUPABASE_ANON_KEY` (public, RLS protected).
  - Backend uses `SUPABASE_SERVICE_ROLE_KEY` (private server secret, never bundled in frontend).
- **Cloud Storage:** S3-compatible Supabase Storage bucket `scan-images` with presigned URLs and MIME validation.
- **Realtime:** Supabase Realtime WebSocket engine active for district alerts, containment zones, and case state synchronization.
- **Spatial RPCs:** 5 hardened PostGIS Security Definer stored procedures with parameter validation and coordinate fuzzing for farmer privacy.

---

## 10. Security & Information Leakage Findings

1. **Zero Secret Leakage:** Authentication and error responses contain no passwords, password hashes, service role keys, or database credentials.
2. **Path Masking:** Stack traces and internal filesystem paths (e.g. `C:\Project\...`) are sanitized in all public error responses.
3. **Privacy Fuzzing:** Farmer nearby case coordinates are deterministically fuzzed by ~1.5 km and farm names are masked to "Vicinity" to prevent farm identification by unauthorized users.
4. **Safety Disclaimers:** All AI inference results are explicitly labeled as preliminary risk screening, not final or veterinary diagnoses.

---

## 11. Files Changed in Phase 7.3

1. [`backend/server.js`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/backend/server.js):
   - Added dual health endpoints (`GET /health` and `GET /api/health`).
   - Added live database & AI microservice status reporting.
   - Added cross-platform virtualenv path detection (`.venv/bin/python` vs `.venv/Scripts/python.exe`).
   - Added `SPAWN_LOCAL_AI=false` support for split cloud deployments.
   - Updated banner logs to reflect Keras 3 / TensorFlow engine.
2. [`backend/services/ai_service.py`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/backend/services/ai_service.py):
   - Added `AI_SERVICE_HOST` support defaulting to `0.0.0.0` for Docker container ingress.
3. [`backend/services/aiModelService.js`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/backend/services/aiModelService.js):
   - Supported non-invasive offline simulation flags for automated regression tests.
4. [`backend/controllers/reportController.js`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/backend/controllers/reportController.js):
   - Handled `x-simulate-ai-offline` header for fault-injection testing.
5. [`frontend/vercel.json`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/frontend/vercel.json):
   - Created Vercel SPA rewrite rule `/(.*) -> /index.html`.
6. [`tests/test_phase7_2_2_backend_ai.js`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/tests/test_phase7_2_2_backend_ai.js):
   - Explicitly requested offline fallback simulation to allow concurrent testing with live AI daemon.

---

## 12. Automated Regression Test Execution

All 7 test suites were executed sequentially:

```bash
node tests/test_phase7_2_2_backend_ai.js
node tests/test_auth_migration.js
node tests/test_phase4_workflow.js
node tests/test_phase5_storage.js
node tests/test_phase6_realtime_gis.js
backend/.venv/Scripts/python.exe tests/test_phase7_2_3_ai_service.py
node tests/test_phase7_2_3_node_ai_integration.js
```

### Exact Results:
- `test_phase7_2_2_backend_ai.js`: **41 / 41 PASS**
- `test_auth_migration.js`: **28 / 28 PASS**
- `test_phase4_workflow.js`: **54 / 54 PASS**
- `test_phase5_storage.js`: **46 / 46 PASS**
- `test_phase6_realtime_gis.js`: **102 / 102 PASS**
- `test_phase7_2_3_ai_service.py`: **12 / 12 PASS**
- `test_phase7_2_3_node_ai_integration.js`: **23 / 23 PASS**
- **TOTAL: 306 / 306 PASSING (100% success rate, 0 failures)**

---

## 13. Manual Cloud Smoke-Test Checklist

Use this 22-point checklist after publishing services to live URLs:

| # | Test Scenario | PASS Condition | FAIL Symptom | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **A** | **Open Production Frontend** | Landing page loads in < 2s with HTTPS lock icon and styles. | Blank white screen, 404, or mixed content warning. | **CRITICAL** |
| **B** | **Farmer Registration / Login** | Login succeeds with valid token, redirects to Farmer Dashboard. | "Network Error", CORS error in console, or 401 loop. | **CRITICAL** |
| **C** | **Farmer Dashboard Overview** | Livestock count, registered animals, and recent alerts render. | Infinite loading spinner or unhandled exception. | **HIGH** |
| **D** | **Add Livestock Animal** | Animal tag ID (e.g. `MH-PUN-0012`) created and listed. | Form submit error, tag duplicate crash, or 500 error. | **HIGH** |
| **E** | **Upload Livestock Image** | Presigned URL generated, image uploads to Supabase Storage. | Upload fails, CORS rejection on S3 PUT, or broken preview. | **CRITICAL** |
| **F** | **Submit Disease Symptoms** | Multi-select symptoms + fever + duration accepted by form. | Validation error rejecting valid symptoms. | **HIGH** |
| **G** | **AI Preliminary Screening** | Progress bar completes, genuine inference executed on image. | Infinite loading, fallback alert, or crash. | **CRITICAL** |
| **H** | **Risk Assessment Result** | Displays preliminary condition, urgency badge, and disclaimer. | Fabricated confidence, "AI Doctor" wording, or missing disclaimer. | **HIGH** |
| **I** | **Create Disease Report** | Report created in Supabase PostgreSQL; Case ID assigned. | 500 Server Error, DB write rejection, or missing Case ID. | **CRITICAL** |
| **J** | **Smart Vet Referral** | Nearest licensed veterinarians located and displayed with contact. | Empty vet list when vets exist in district. | **MEDIUM** |
| **K** | **Veterinarian Dashboard** | Logged-in vet sees newly reported case in their district queue. | Case missing from queue or permission denied. | **CRITICAL** |
| **L** | **Case Status Transition** | Vet updates case from 'Reported' -> 'Under Investigation' -> 'Confirmed'. | Status change fails to save or transitions incorrectly. | **HIGH** |
| **M** | **Realtime Notifications** | Status update triggers instant notification on farmer's screen. | Notification only appears after manual page refresh. | **MEDIUM** |
| **N** | **District Outbreak GIS Map** | Leaflet map displays clusters, containment perimeters, and heatmaps. | Map fails to render, tile 404s, or lat/lng inverted. | **HIGH** |
| **O** | **Ring Vaccination Workflow** | Vet/Officer schedules ring vaccination camp; target doses calculated. | Scheduling fails or perimeter calculation returns NaN. | **HIGH** |
| **P** | **Officer Dashboard** | District officer views epidemiological summary and charts. | Access denied (403) or chart rendering error. | **HIGH** |
| **Q** | **Logout and Session Refresh** | Session cleared; protected routes redirect to `/login`. | User remains logged in or stale data shown after logout. | **HIGH** |
| **R** | **Simulated AI Unavailable** | Report still saved in `'Reported'` status with honest notice. | Crash, fake disease diagnosis, or report data lost. | **CRITICAL** |
| **S** | **Cross-Browser: Google Chrome** | All layouts, WebRTC camera inputs, and Leaflet maps render cleanly. | Visual glitches, unclickable buttons. | **HIGH** |
| **T** | **Cross-Browser: Microsoft Edge** | Performance parity with Chrome; zero console polyfill errors. | Edge-specific JavaScript syntax or styling issues. | **HIGH** |
| **U** | **Slow Network (3G Simulation)** | Loading states and skeletons appear; requests do not timeout. | Unstyled content flash or broken promises. | **MEDIUM** |
| **V** | **Mobile Responsive View** | Bottom navigation bar, responsive forms, touch-friendly buttons. | Horizontal overflow, text truncation, or unclickable elements. | **HIGH** |

---

## 14. Deployment Decision & Provider Recommendation

### Recommended Cloud Topology for SIH 2026:
1. **Frontend:** **Vercel** (Global Edge CDN, automatic HTTPS, zero-config SPA rewrites via `frontend/vercel.json`, optimized asset delivery).
2. **Backend:** **Render** (Native Node.js Web Service, `npm start`, automated HTTPS, environment variable injection, robust log streaming).
3. **AI Microservice:** **Render Docker Web Service** (Builds from `ml/Dockerfile`, executes on Python 3.12-slim with oneDNN CPU acceleration, independent resource scaling).
4. **Database & Infrastructure:** **Supabase Managed Cloud** (Existing PostgreSQL 15, Supabase Auth, Storage, Realtime, and PostGIS).

---

## 15. Remaining Blockers

- **P0 Blockers:** **NONE**. All code, dependencies, build configurations, and tests are verified.
- **P1 Considerations:**
  - Injecting production environment variables into cloud provider dashboards upon deployment creation (`VITE_API_URL`, `FRONTEND_URL`, `AI_SERVICE_URL`).
  - Running through the 22-point manual smoke-test checklist after initial live cloud deployment.

---

## 16. Current Status Summary

```
STATUS: READY FOR DEPLOYMENT (NOT YET DEPLOYED)
Automated Tests: 306 / 306 PASSING
Frontend Build: SUCCESS (332 kB main bundle)
Vercel Config: READY (frontend/vercel.json)
Docker Config: READY (ml/Dockerfile, ml/.dockerignore)
Backend Startup: DECOUPLED & CROSS-PLATFORM
CORS Security: HARDENED & AUDITED
Health Endpoints: DUAL MACHINE-READABLE (/health & /api/health)
```
