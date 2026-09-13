# PHASE 7.2.3: PRODUCTION AI RUNTIME & MODEL PACKAGING AUDIT REPORT

**Date:** September 13, 2026  
**Status:** COMPLETE (All criteria verified, 306/306 assertions passing, 0 regressions)  
**Target:** Livestock Saathi Deep Learning AI Microservice (`lsd_model.keras`)  

---

## 1. Model Location & Verification

- **Relative Path:** `backend/lsd_model.keras`
- **Absolute Path:** `C:\Project\PashuMitra\Livestock-Disease-Prediction\backend\lsd_model.keras`
- **File Size:** `50,666,591 bytes (48.32 MB)`
- **Format:** Native Keras 3 Zip Archive (`metadata.json`, `config.json`, `model.weights.h5`)
- **Modification Check:** Preserved untouched; no retraining or weight modification performed.

---

## 2. Model SHA-256 Hash & Architecture

- **Cryptographic Hash (SHA-256):**
  ```
  284082f8634d3e06cd15fb316cb79972a98c2f57dc71393b9143c11bf98d761f
  ```
- **Input Shape:** `(None, 224, 224, 3)` — Float32 normalized RGB tensor
- **Output Shape:** `(None, 1)` — Sigmoid binary probability
- **Model Architecture Breakdown:**
  1. `InputLayer` (shape: `[None, 224, 224, 3]`)
  2. `Sequential` (Augmentation pipeline)
  3. `Functional` (`efficientnetb0` convolutional backbone)
  4. `GlobalAveragePooling2D`
  5. `Dropout` (rate: 0.2)
  6. `Dense` (1 unit, activation: `sigmoid`)
- **Saved Keras Version in Metadata:** `3.13.2`

---

## 3. Python Runtime Version

- **Validated Version:** `Python 3.12.10 (64-bit)`
- **Compatibility Range:** `Python 3.10` to `Python 3.12`
- **Isolation:** Standalone virtual environment provisioned at `backend/.venv`, eliminating any dependency on the developer machine's global Python installation.

---

## 4. TensorFlow & Backend Runtime

- **Installed Version:** `TensorFlow 2.21.0`
- **CPU Instruction Set:** Optimized with AVX2, AVX_VNNI, FMA, and oneDNN custom operations (`TF_ENABLE_ONEDNN_OPTS=1`)
- **Backend Configuration:** `KERAS_BACKEND=tensorflow`

---

## 5. Keras Version

- **Installed Version:** `Keras 3.15.1`
- **Compatibility:** Backward and forward compatible with the `lsd_model.keras` artifact saved in Keras 3.13.2.

---

## 6. Complete Production Dependency Specification

The complete pinned dependency manifest is committed to `ml/requirements.txt` and mirrored in `backend/requirements.txt`:

```ini
# Core Machine Learning & Neural Network Runtime
tensorflow==2.21.0
keras==3.15.1
h5py==3.14.0
numpy==1.26.4
ml_dtypes==0.5.4
optree==0.20.0
namex==0.1.0

# Computer Vision & Image Processing
pillow==12.3.0

# Web Microservice API & CORS
Flask==3.1.3
flask-cors==6.0.5
Werkzeug==3.1.8

# Networking & Utilities
requests==2.34.2
urllib3==2.7.0
packaging==26.3
rich==15.0.0
absl-py==2.5.0
```

---

## 7. Model Loading Verification

- **Loading Method:** `keras.models.load_model('backend/lsd_model.keras')`
- **Load Status:** **PASS**
- **Load Time:** `1.43 seconds`
- **Graceful Fault Tolerance:** Startup no longer crashes with `sys.exit(1)` if model weights are missing or corrupt; instead, it registers degraded state (`lsd_model = None`) allowing the health endpoint to report status to orchestrators.

---

## 8. AI Health Endpoint Verification

- **Endpoint:** `GET /health` on port `5050`
- **Healthy State Response (HTTP 200):**
  ```json
  {
    "status": "healthy",
    "modelLoaded": true,
    "modelVersion": "lsd_model.keras",
    "architecture": "EfficientNetB0 (Keras 3 + TensorFlow)",
    "backend": "tensorflow",
    "inputShape": [null, 224, 224, 3],
    "outputShape": [null, 1],
    "service": "Livestock Saathi Deep Learning AI Service",
    "timestamp": 1789297273.625
  }
  ```
- **Degraded State Response (HTTP 503):**
  ```json
  {
    "status": "degraded",
    "modelLoaded": false,
    "modelVersion": "lsd_model.keras (unavailable)",
    "service": "Livestock Saathi Deep Learning AI Service",
    "error": "Model file not found at lsd_model.keras",
    "timestamp": 1789297273.625
  }
  ```
- **Information Security:** Zero stack traces or internal filesystem paths are leaked in health or degraded responses.

---

## 9. Inference Smoke Test (Synthetic Input)

- **Test Input:** Synthetic 224x224 RGB image (clearly labeled technical smoke test, no random web downloads).
- **Status:** **PASS**
- **Image Preprocessing:** Successfully resized and normalized to `(1, 224, 224, 3)` float32 tensor.
- **Inference Execution:** Genuine forward pass through `lsd_model.keras`.
- **Response Schema & Metrics:**
  - `success`: `true`
  - `hasImage`: `true`
  - `visualScore`: `0.5011` (genuine float output from sigmoid output layer)
  - `confidenceScore`: `77%` (multimodal fusion with clinical symptoms)
  - `possibleCondition`: `"Lumpy Skin Disease (लम्पी त्वचा रोग)"`
  - `riskLevel`: `"High"`
- **Safety Semantics:**
  - `assessmentType`: `"AI-Assisted Preliminary Screening"`
  - `disclaimer`: `"AI-assisted preliminary screening and risk assessment only. Not a veterinary diagnosis or medical certificate."`
  - Zero claims of "final diagnosis", "doctor", or "veterinary certificate".

---

## 10. Failure-Mode & Honest Fallback Tests

| Failure Scenario | AI Microservice Behavior | Node.js Backend Behavior | Status |
| :--- | :--- | :--- | :--- |
| **Python Process Offline / Crash** | Connection Refused (`ECONNREFUSED`) | Catches error, returns `aiUnavailable: true`, report persisted in `'Reported'` status, no fake disease. | **PASS** |
| **Model File Missing / Corrupted** | Boots in degraded mode, `/health` returns HTTP 503 | Detects degraded health or error response, triggers honest fallback. | **PASS** |
| **Inference Timeout (> 8000ms)** | Process unresponsive | `AbortController` fires, classified as `TIMEOUT`, returns honest `aiUnavailable: true`. | **PASS** |
| **Malformed / Missing Input** | Preprocessing logs error, falls back to symptom rules or 400 | Returns HTTP 400 validation error guiding the user without exposing internals. | **PASS** |

---

## 11. Empirical Resource Measurements

Measurements recorded on active Windows 64-bit environment with TensorFlow CPU 2.21:

| Metric | Measured Value | Notes |
| :--- | :--- | :--- |
| **Process Resident RAM (Working Set)** | **~409 MB** (429,166,592 bytes) | Clean memory footprint for EfficientNetB0 in TensorFlow CPU |
| **Paged Memory Commitment** | **~969 MB** | Includes loaded oneDNN kernels and shared libraries |
| **Initialization & Startup Time** | **~1.5s - 2.5s** | Python import + TensorFlow initialization |
| **Model Weight Load Latency** | **1.43s** | From local disk into memory graph |
| **Cold Inference Latency** | **1.35s - 1.56s** | Includes initial TensorFlow XLA/graph tracing |
| **Warm Inference Latency** | **100.3 ms** (average over 5 runs) | Fast real-time CPU evaluation (range: 88ms - 121ms) |
| **CPU Utilization Under Warm Load** | **< 10% of 1 core** | Highly efficient for concurrent requests |

---

## 12. Deployment Packaging & Docker Decision

### Selected Packaging Approach: Docker Microservice Container
- A dedicated `ml/Dockerfile` and `ml/.dockerignore` have been created to provide a cloud-native, reproducible container image.
- **Base Image:** `python:3.12-slim-bookworm`
- **Security:** Runs as non-root `appuser` (UID 10001).
- **Healthcheck:** Native Docker `HEALTHCHECK` probing `http://127.0.0.1:5050/health`.
- **Port:** Exposed on port `5050`.

---

## 13. Production Startup Commands

### Option A: Docker Container (Preferred for Cloud / VPS / Kubernetes)
```bash
# 1. Build container image from workspace root
docker build -t livestock-saathi-ai:latest -f ml/Dockerfile .

# 2. Run container in background with health monitoring
docker run -d \
  --name livestock-ai-service \
  --restart unless-stopped \
  -p 5050:5050 \
  -e AI_SERVICE_PORT=5050 \
  -e KERAS_BACKEND=tensorflow \
  livestock-saathi-ai:latest
```

### Option B: Isolated Virtual Environment (Bare Metal / VM / PaaS)
```bash
# 1. Create clean isolated Python 3.12 environment
python3.12 -m venv backend/.venv

# 2. Install pinned dependencies
./backend/.venv/bin/pip install --upgrade pip
./backend/.venv/bin/pip install -r ml/requirements.txt

# 3. Launch AI service
KERAS_BACKEND=tensorflow AI_SERVICE_PORT=5050 ./backend/.venv/bin/python backend/services/ai_service.py
```

---

## 14. Remaining Issues

- **P0 Blockers:** **NONE**. Model loading, isolated runtime, health checks, honest fallback, and container packaging are complete and validated.
- **P1 Considerations:**
  1. Configure `AI_SERVICE_URL` in production deployment environment (e.g. Render/Fly.io/AWS ECS).
  2. Optional migration of `lsd_model.keras` to ONNX Runtime for edge in-browser inference (future optimization).

---

## Automated Verification Summary

```
Total Automated Tests Passing: 306 / 306
  - test_phase7_2_2_backend_ai.js:       41/41  (MongoDB decoupling, CORS, honest fallback)
  - test_auth_migration.js:              28/28  (Supabase Auth, JWT verification, roles)
  - test_phase4_workflow.js:             54/54  (Farmer -> Vet -> Lab clinical workflow)
  - test_phase5_storage.js:              46/46  (Presigned uploads, MIME validation, storage)
  - test_phase6_realtime_gis.js:        102/102 (Spatial PostGIS, clustering, security definer)
  - test_phase7_2_3_ai_service.py:       12/12  (Python isolated runtime, model load, health, smoke)
  - test_phase7_2_3_node_ai_integration: 23/23  (Express + Flask live inference & persistence)
Frontend Production Build: PASS (0 errors, 332 kB main bundle)
Supabase Primary DB: UNTOUCHED & VERIFIED
```
