# PHASE 8.3: RENDER AI MICROSERVICE DEPLOYMENT GUIDE

**Project:** Livestock Saathi — AI-Powered Livestock Disease Detection & Outbreak Intelligence  
**Component:** Deep Learning AI Microservice (Tier 1 of Cloud Deployment)  
**Target Platform:** Render (Docker Web Service)  
**Repository:** `https://github.com/vipinsinghzz/SIH-Livestock-Health.git`  
**Target Branch:** `main` (Production commit: `059b433`)  
**Container Specification:** Python 3.12-slim | Keras 3.x | TensorFlow CPU | EfficientNetB0 (`lsd_model.keras`)  

---

## 1. Architectural Role & Pre-Deployment Audit

The AI Microservice is the foundational machine learning engine of Livestock Saathi. It must be deployed **FIRST** before the backend API, because the backend requires the AI service's live cloud URL (`AI_SERVICE_URL`) to perform automated screening, clinical triage, and circuit-breaking health probes.

### Pre-Deployment Verification Summary
- **Model File:** [`backend/lsd_model.keras`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/backend/lsd_model.keras) (50.67 MB, SHA-256: `284082f8634d3e06cd15fb316cb79972a98c2f57dc71393b9143c11bf98d761f`).
- **Container Definition:** [`ml/Dockerfile`](file:///c:/Project/PashuMitra/Livestock-Disease-Prediction/ml/Dockerfile) using `python:3.12-slim-bookworm`.
- **Security:** Non-root execution under dedicated Linux user `appuser` (UID 10001).
- **Inference Runtime:** Keras 3.15.1 on TensorFlow 2.x CPU with oneDNN acceleration (`TF_ENABLE_ONEDNN_OPTS=1`).
- **Health Probing:** Native `GET /health` endpoint reporting real-time model loading and input/output tensors.
- **Automated Test Baseline:** 12/12 Python AI tests and 23/23 Node integration tests passing locally.

---

## 2. Resource Tier Sizing & Recommendation for SIH Demo

| Resource Tier | RAM | CPU | Pricing | Assessment for SIH Live Demo |
| :--- | :---: | :---: | :---: | :--- |
| **Free Tier** | 512 MB | 0.1 vCPU | Free | ⚠️ **HIGH RISK (NOT RECOMMENDED):** TensorFlow + Keras + model weights consume ~400–450 MB baseline. During container boot or image inference, memory spikes cause Linux Out-Of-Memory (`OOMKilled - Exit Code 137`). Free tier also spins down after 15 min of inactivity (50s cold start). |
| **Starter Tier** | **1 GB** | **0.5 vCPU** | **$7 / mo** | ✅ **SAFEST BUDGET TIER (RECOMMENDED):** Sufficient headroom for TensorFlow memory footprint (~550 MB max), zero OOM crashes, persistent uptime (does not sleep), warm inference latency ~100–150 ms. |
| **Standard Tier**| **2 GB** | **1.0 vCPU** | **$15 / mo** | 🚀 **MAXIMUM PERFORMANCE:** Ideal for high-throughput multi-user stress testing during live jury presentation. |

> [!IMPORTANT]  
> If using the **Free Tier**, you MUST ping the health endpoint 2 minutes before demonstrating to judges to ensure the model is warm and loaded in memory. If possible, select the **Starter Tier (1 GB)** for guaranteed 100% uptime and zero presentation lag.

---

## 3. Step-by-Step Render Dashboard Instructions

Follow these exact steps in your browser:

### Step 1: Open Render Dashboard
- **MANUAL ACTION REQUIRED:** Navigate to [https://dashboard.render.com/](https://dashboard.render.com/) in your browser.
- Log in with your GitHub account (`vipinsinghzz`).

---

### Step 2: Create a New Web Service
- **MANUAL ACTION REQUIRED:** Click the **"New +"** button in the top navigation bar.
- **MANUAL ACTION REQUIRED:** Select **"Web Service"**.
- **MANUAL ACTION REQUIRED:** Choose **"Build and deploy from a Git repository"** and click **Next**.

---

### Step 3: Connect GitHub Repository
- **MANUAL ACTION REQUIRED:** Locate and select the repository:  
  `vipinsinghzz/SIH-Livestock-Health`
  *(If it does not appear in the list, click "Configure account" and grant Render access to this repository).*
- Click **"Connect"**.

---

### Step 4: Configure Service Parameters
Enter the exact settings below into the Render configuration form:

| Field Name | Exact Value to Enter / Select | Notes / Critical Instructions |
| :--- | :--- | :--- |
| **Name** | `livestock-saathi-ai` | Name of your service (becomes `https://livestock-saathi-ai.onrender.com`) |
| **Region** | `Singapore` (or `Frankfurt` / `Ohio`) | Choose the region closest to India (Singapore recommended for SIH) |
| **Branch** | `main` | Production branch with commit `059b433` |
| **Root Directory** | *(LEAVE COMPLETELY BLANK)* | Do NOT enter anything here. Leaving it blank uses the repo root |
| **Runtime** | `Docker` | Select Docker from the dropdown |
| **Dockerfile Path** | `ml/Dockerfile` | Relative path to the production Dockerfile |
| **Docker Build Context** | `.` | **CRITICAL:** Single period `.` (repository root). Do NOT use `ml/`! |
| **Instance Type** | `Starter ($7/mo)` or `Free` | Starter (1 GB RAM) recommended to prevent OOM |

> [!CAUTION]  
> **CRITICAL SETTING — DOCKER BUILD CONTEXT:**  
> The Dockerfile executes:  
> `COPY backend/lsd_model.keras /app/lsd_model.keras`  
> If Docker Build Context is set to `ml/`, Docker cannot see the `backend/` folder and the build will immediately fail with `COPY failed: file not found in build context`.  
> You MUST ensure **Docker Build Context** is set to `.` (the repository root).

---

### Step 5: Configure Health Check Path
Scroll down to the **"Advanced"** section:
- **MANUAL ACTION REQUIRED:** Click **"Advanced"** to expand advanced settings.
- **MANUAL ACTION REQUIRED:** Locate the **"Health Check Path"** field.
- **MANUAL ACTION REQUIRED:** Enter:  
  `/health`

---

### Step 6: Configure Environment Variables
In the **"Environment Variables"** section of the form, add the following variables:

| Variable Name | Required / Optional | Value | Purpose |
| :--- | :---: | :---: | :--- |
| `AI_SERVICE_PORT` | **REQUIRED** | `5050` | Port the Flask server listens on |
| `PORT` | **REQUIRED** | `5050` | Render port routing indicator |
| `KERAS_BACKEND` | **REQUIRED** | `tensorflow` | Pinned backend neural runtime |
| `TF_ENABLE_ONEDNN_OPTS` | **REQUIRED** | `1` | CPU numerical acceleration |
| `PYTHONUNBUFFERED` | Optional | `1` | Real-time container stdout/stderr flush |

> [!WARNING]  
> **VARIABLES THAT MUST NEVER BE ENTERED HERE:**  
> - Do NOT enter `SUPABASE_SERVICE_ROLE_KEY` (The AI service has zero database access; this is defense-in-depth).  
> - Do NOT enter `GEMINI_API_KEY` (Only the Node.js backend handles external LLM APIs).  
> - Do NOT enter any database connection strings or JWT secrets.

---

### Step 7: Launch Service
- **MANUAL ACTION REQUIRED:** Click the purple **"Create Web Service"** button at the bottom of the page.
- Render will pull commit `059b433`, initiate the multi-stage Docker build, copy `lsd_model.keras`, install pinned dependencies, and start the container.

---

## 4. Expected Deployment Behavior & Log Output

During deployment, monitor the live build logs in the Render dashboard. You should observe this exact progression:

### Phase A: Build & Layer Installation (Duration: ~2–4 minutes)
```text
==> Cloning from https://github.com/vipinsinghzz/SIH-Livestock-Health...
==> Checking out commit 059b43398c835aba2c7b9bc58bad32065b72aebc in branch main
==> Using Dockerfile at ml/Dockerfile
==> Using context .
==> Step 1/14 : FROM python:3.12-slim-bookworm
==> Step 6/14 : RUN pip install --no-cache-dir -r requirements.txt
...
==> Step 7/14 : COPY backend/lsd_model.keras /app/lsd_model.keras
==> Step 8/14 : COPY backend/services/ai_service.py /app/services/ai_service.py
==> Step 9/14 : USER appuser
==> Step 11/14 : HEALTHCHECK ... CMD curl -f http://127.0.0.1:5050/health || exit 1
==> Exporting image ... DONE
```

### Phase B: Startup & Neural Network Loading (Duration: ~15–20 seconds)
```text
==> Starting service with 'python services/ai_service.py'
2026-09-13 18:38:00 [INFO] Loading deep learning model from: /app/lsd_model.keras
2026-09-13 18:38:15 [INFO] Model loaded successfully! Input: (None, 224, 224, 3), Output: (None, 1)
2026-09-13 18:38:15 [INFO] Starting Livestock Saathi AI Microservice on 0.0.0.0:5050...
 * Serving Flask app 'ai_service'
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5050
```

### Phase C: Health Check Passing
```text
==> Health check path /health responded with 200 OK
==> Your service is live 🎉
```

---

## 5. Post-Deployment Verification Commands

Once Render displays the green **"Live"** badge:

### 1. Obtain Your Public AI Service URL
- **MANUAL ACTION REQUIRED:** Copy the URL displayed directly below your service title in the Render dashboard:  
  `https://livestock-saathi-ai.onrender.com` (or similar).

---

### 2. Run Public Health Verification
Open PowerShell on your computer and run (replace with your actual Render URL):

```powershell
curl -i https://livestock-saathi-ai.onrender.com/health
```

#### Expected HTTP 200 Response:
```json
{
  "architecture": "EfficientNetB0 (Keras 3 + TensorFlow)",
  "backend": "tensorflow",
  "inputShape": [null, 224, 224, 3],
  "modelLoaded": true,
  "modelVersion": "lsd_model.keras",
  "outputShape": [null, 1],
  "service": "Livestock Saathi Deep Learning AI Service",
  "status": "healthy"
}
```

---

### 3. Run Inference Smoke-Test
Test clinical symptom triage and image processing via HTTP POST:

```powershell
Invoke-RestMethod -Uri "https://livestock-saathi-ai.onrender.com/predict" -Method Post -ContentType "application/json" -Body '{"symptoms": ["skin_nodules", "high_fever", "enlarged_lymph_nodes"], "species": "Cattle", "temperature": 40.8, "duration": 48}'
```

#### Expected Prediction Response:
```json
{
  "success": true,
  "assessmentType": "AI-Assisted Preliminary Screening",
  "disclaimer": "AI-assisted preliminary screening and risk assessment only. Not a veterinary diagnosis or medical certificate.",
  "possibleCondition": "Lumpy Skin Disease (लम्पी त्वचा रोग)",
  "confidenceScore": 95,
  "riskLevel": "Critical",
  "modelVersion": "lsd_model.keras (EfficientNetB0)"
}
```

---

## 6. Common Troubleshooting & Emergency Fixes

| Symptom / Error | Cause | Instant Fix in Render Dashboard |
| :--- | :--- | :--- |
| `COPY failed: file not found in build context: backend/lsd_model.keras` | Docker Build Context was set to `ml/` instead of `.` | Go to **Settings** → **Build & Deploy** → Change **Docker Build Context** to `.` (single dot). Click **Save Changes** and trigger manual deploy. |
| `Container terminated with exit code 137 (OOMKilled)` | RAM exceeded 512 MB Free tier limit during TensorFlow initialization | Go to **Settings** → Change **Instance Type** from `Free` to `Starter ($7/mo - 1 GB RAM)`. |
| Health check timed out on `/health` | Cold start took longer than default 10 seconds | Go to **Settings** → Under Health Check, the initial delay is standard. If using Free tier, perform a manual HTTP GET request to wake the instance. |
| `PORT` routing mismatch / 502 Bad Gateway | Render expected port 10000 instead of 5050 | Ensure environment variable `PORT` is set to `5050` and `AI_SERVICE_PORT` is set to `5050`. In Render's port detection field, specify `5050`. |

---

## 7. Next Action (Preparation for Phase 8.4)

- **MANUAL ACTION REQUIRED:** Once your AI microservice is live and verified via `/health`, copy the assigned URL (e.g. `https://livestock-saathi-ai.onrender.com`).
- **DO NOT deploy the backend yet.**
- Provide the live AI URL in the chat. We will then proceed to **Phase 8.4 — Render Backend API Deployment**, injecting this URL as `AI_SERVICE_URL`.

---

**STATUS: GUIDE GENERATED. NO APPLICATION CODE MODIFIED. READY FOR MANUAL RENDER SETUP.**
