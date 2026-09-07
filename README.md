# 🛡️ PashuRakshak (पशुरक्षक)
### AI-Simulated Animal Health Surveillance & Decision-Support Platform

[![Tech Stack](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20TailwindCSS-emerald)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-blue)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20%7C%20Mongoose-green)](https://www.mongodb.com/)
[![GIS](https://img.shields.io/badge/GIS-Leaflet%20Mapping-orange)](https://leafletjs.com/)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Mock%20Simulator%20v0.1-indigo)](https://github.com/)

**PashuRakshak** is a full-stack, offline-first livestock disease early-warning and decision-support web platform engineered for Indian farmers, field veterinarians, para-vets, and state animal husbandry departments.

It simulates intelligent clinical triage, risk scoring, and spatiotemporal outbreak cluster detection behind an API contract that is **100% plug-and-play swappable** for a real Machine Learning / Deep Learning model with zero frontend changes.

---

## 🏛️ System Architecture

```
                                 ┌───────────────────────────────┐
                                 │       React (Vite) Client     │
                                 │   (TailwindCSS + i18next)     │
                                 └───────────────┬───────────────┘
                                                 │
                                 ┌───────────────┴───────────────┐
                                 │  Dexie.js (IndexedDB Queue)   │
                                 │   [Auto-sync when Online]     │
                                 └───────────────┬───────────────┘
                                                 │ REST API (JWT)
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Node.js Express Server (MVC)                          │
│                                                                                 │
│  Controllers: Auth, Reports, Animals, LabReferrals, Advisories, Dashboard, IVR  │
│  Middleware:  JWT Authentication, Role-Based Access Control (RBAC), Errors     │
└───────────────┬─────────────────────────────────────────────────┬───────────────┘
                │                                                 │
                ▼                                                 ▼
┌────────────────────────────────┐              ┌─────────────────────────────────┐
│   MongoDB Database (Mongoose)  │              │    Mock AI Simulator Service    │
│  - Users (RBAC)                │              │  (/services/aiSimulator.js)     │
│  - Animals & Health Records    │◄─────────────┤  - Clinical Overlap Scoring     │
│  - Disease Reports             │  14-day      │  - Random Variance Jitter (±8%) │
│  - Triage Results              │  Cluster     │  - Simulated Latency (800-1800ms│
│  - Diagnostic Lab Referrals    │  Detection   │  - Spatiotemporal Outbreak Flag │
│  - Multilingual Advisories     │              │  - Model Version: "mock-v0.1"   │
│  - Vaccination Drives          │              └─────────────────────────────────┘
└────────────────────────────────┘                                │
                                                                  ▼
                                                ┌─────────────────────────────────┐
                                                │   [FUTURE SWAP TO REAL MODEL]   │
                                                │   FastAPI / TensorFlow Serving  │
                                                └─────────────────────────────────┘
```

---

## 🚀 Key Features

1. **Intelligent Mock AI Triage Engine (`backend/services/aiSimulator.js`)**:
   - Matches clinical symptom keywords against knowledge bases for **Foot and Mouth Disease (FMD)**, **Lumpy Skin Disease (LSD)**, **Haemorrhagic Septicaemia (HS)**, **Anthrax**, **Peste des Petits Ruminants (PPR)**, **Avian Influenza**, **Blackleg**, and **Rabies**.
   - Emulates neural model inference time with an artificial delay ($800\text{ms} - 1800\text{ms}$).
   - **Smart Spatiotemporal Outbreak Detection**: Automatically queries MongoDB for recent reports within the same sub-district block in the last 14 days sharing matching symptoms; if $\ge 2$ cases match, triggers `outbreakFlag: true` and elevates urgency to High/Critical!
   - Every response outputs `modelVersion: "mock-v0.1"` and displays a clear `"Simulated AI — Demo Mode"` badge in the UI.

2. **Geospatial Risk Mapping (Leaflet GIS)**:
   - Pins color-coded by risk level (Green: Low, Amber: Moderate, Orange: High, Red: Critical with pulsing outer ring).
   - Dynamic 5km outbreak containment buffer circles.
   - Agro-meteorological humidity/weather risk overlay layer.
   - Interactive popups with case ID, symptoms, confidence score, and detail links.

3. **Offline-First Resilience (Dexie.js + Service Worker)**:
   - Form-based reporting functions without active internet connection.
   - Offline reports queue locally in browser IndexedDB.
   - Network listener automatically detects restoration and syncs queued reports with a visible status counter and "Sync Now" button.

4. **Rural-Friendly Multi-Step Wizard**:
   - 4-step guided submission tailored for low-literacy users.
   - Large touch targets with animal emojis and visual symptom chips.
   - One-tap GPS auto-detection + photo upload preview.

5. **Role-Based Portals & Dashboards**:
   - **Farmer Dashboard**: Large action buttons ("Report Sick Animal", "My Animals", "Advisories", Toll-Free 1962 helpline).
   - **Field Veterinarian Dashboard**: Active surveillance queue, triage verification, and one-click Diagnostic Sample Referral to laboratories.
   - **District Officer Command Center**: Real-time GIS map, 30-day temporal epidemic trend line/area chart (Recharts), top disease breakdown, and case escalation funnel.

6. **Multilingual Support (i18next)**:
   - English & Hindi (`हिंदी`) with an instant header language toggle.
   - Templated automatic advisories generated in both languages whenever High or Critical risk cases are flagged.

7. **IVR Telephony Ingestion Simulator**:
   - `/api/ivr/webhook` compatible with Twilio and Exotel voice transcription payloads.
   - Interactive web testbench for testing simulated farmer phone calls.

---

## 🔑 Pre-Seeded Demo Credentials

The database includes ready-to-test personas across all three roles. Quick-login buttons are also available on the login page for 1-click evaluation:

| Persona Role | Name | Email | Password | Assigned Location |
| :--- | :--- | :--- | :--- | :--- |
| **🌾 Farmer** | Ramesh Patil | `farmer@pashurakshak.in` | `Farmer@123` | Malegaon, Baramati |
| **🩺 Field Vet** | Dr. Ananya Deshmukh | `vet@pashurakshak.in` | `Vet@123` | Baramati Town |
| **🏛️ District Officer** | Dr. Suresh Kulkarni | `officer@pashurakshak.in` | `Admin@123` | Shivajinagar, Haveli (Pune) |

---

## 🛠️ Step-by-Step Setup Guide

### 1. Prerequisites
- **Node.js**: `v18+` (Tested on `v24`)
- **MongoDB**: Community Server running locally on `localhost:27017` (or MongoDB Atlas URI)

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Seed the database with realistic Pune district livestock cases & outbreaks
npm run seed

# Run the automated backend verification test suite
node test_api.js

# Start the backend server (Runs on http://localhost:5000)
npm start
```

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start the Vite development server (Runs on http://localhost:5173)
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 🔄 Swapping in a Real AI Model

The entire codebase has been decoupled so that **only one single file** needs to be modified or replaced when an actual ML model is deployed:

### Target File: `backend/services/aiSimulator.js`

### Step 1: Expected Input Contract
The route controller passes this standardized `reportData` object to `runTriage(reportData)`:
```javascript
{
  species: "Cattle",                   // Livestock species
  symptoms: ["mouth blisters", ...],   // Array of normalized symptom strings
  mortalityCount: 0,                   // Number of recorded deaths
  affectedCount: 2,                    // Number of sick animals
  location: {
    lat: 18.1517,
    lng: 74.5772,
    village: "Malegaon Bk",
    block: "Baramati",
    district: "Pune"
  },
  notes: "Optional field observations"
}
```

### Step 2: Expected Output Contract
Your real model must resolve a Promise matching this exact schema:
```javascript
{
  riskLevel: "Low" | "Moderate" | "High" | "Critical",
  suspectedDiseases: [
    { name: "Foot and Mouth Disease (FMD)", confidenceScore: 0.94 }
  ],
  recommendedAction: "Isolate herd, notify block veterinary dispensary.",
  outbreakFlag: true, // boolean
  clusterDetails: {
    matchedCasesCount: 3,
    timeWindowDays: 14,
    block: "Baramati"
  },
  explanation: "Neural prediction identified strong FMD markers with spatial clustering.",
  modelVersion: "prod-v1.0" // Change from "mock-v0.1" to your production model tag
}
```

### Step 3: Implementation Code Diff
To call a real Python FastAPI / PyTorch / TensorFlow Serving microservice, replace `aiSimulator.js` with:

```javascript
// Example: backend/services/aiSimulator.js (Real Model Client)
const axios = require('axios');
const Report = require('../models/Report');

async function runTriage(reportData, currentReportId = null) {
  try {
    // 1. Call real model inference endpoint
    const aiServiceUrl = process.env.REAL_AI_SERVICE_URL || 'http://localhost:8000/predict';
    const response = await axios.post(aiServiceUrl, {
      species: reportData.species,
      symptoms: reportData.symptoms,
      mortalityCount: reportData.mortalityCount
    });

    const { riskLevel, suspectedDiseases, recommendedAction } = response.data;

    // 2. Spatial-temporal cluster validation against MongoDB
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const nearbyCasesCount = await Report.countDocuments({
      'location.block': reportData.location.block,
      'location.district': reportData.location.district,
      createdAt: { $gte: fourteenDaysAgo }
    });

    const outbreakFlag = nearbyCasesCount >= 2 && ['High', 'Critical'].includes(riskLevel);

    return {
      riskLevel,
      suspectedDiseases,
      recommendedAction,
      outbreakFlag,
      clusterDetails: {
        matchedCasesCount: nearbyCasesCount,
        timeWindowDays: 14,
        block: reportData.location.block
      },
      explanation: outbreakFlag
        ? `Outbreak alert: ${nearbyCasesCount} similar cases reported in ${reportData.location.block} within 14 days.`
        : `Model prediction based on reported clinical signs.`,
      modelVersion: "prod-v1.0"
    };
  } catch (err) {
    console.error('Real model error, falling back to local heuristic:', err.message);
    // Graceful fallback
  }
}

module.exports = { runTriage };
```

Zero frontend modifications are required. The UI will automatically display the new predictions and update the badge from `v0.1` to `prod-v1.0`.

---

## 📡 REST API Endpoints Overview

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new farmer/vet/officer |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/api/auth/me` | Protected | Fetch current logged-in user profile |
| `POST` | `/api/reports` | Protected | Submit case report, triggers AI triage |
| `GET` | `/api/reports` | Protected | List/filter cases by district/block/risk/status |
| `GET` | `/api/reports/:id` | Protected | Detailed case view with AI rationale & labs |
| `PATCH`| `/api/reports/:id/status` | Vet/Admin | Update escalation lifecycle status |
| `GET` | `/api/animals` | Protected | Fetch registered livestock profiles |
| `POST` | `/api/animals` | Protected | Register new livestock profile |
| `POST` | `/api/lab-referrals` | Vet/Admin | Create diagnostic sample referral |
| `PATCH`| `/api/lab-referrals/:id` | Vet/Admin | Update lab test progress & confirmed results |
| `GET` | `/api/advisories` | Protected | Fetch localized advisories (EN/HI) |
| `POST` | `/api/advisories` | Officer | Broadcast official emergency advisory |
| `GET` | `/api/dashboard/summary` | Protected | Aggregated case counts, mortalities, coverage |
| `GET` | `/api/dashboard/trends` | Protected | 30-day temporal epidemic curve data |
| `POST` | `/api/ivr/webhook` | Public | Inbound voice telephony symptom webhook stub |
| `GET` | `/api/vaccination-drives`| Protected | List village vaccination campaigns |
| `PATCH`| `/api/vaccination-drives/:id`| Vet/Admin| Update doses administered |

Postman collection file is available in the repository root: [`postman_collection.json`](./postman_collection.json).

---

## 📄 License
Licensed under the ISC License. Developed for livestock health decision support.
