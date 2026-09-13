# Comprehensive Migration Plan: MongoDB to Supabase PostgreSQL
## Livestock Saathi – AI-Powered Livestock Health & Early Warning Platform
**Smart India Hackathon (SIH) 2026 — Problem Statement 128**
**Document Version:** 1.0.0  
**Architect:** Lead Software Architect  
**Status:** Pre-Migration Architectural Blueprint (Awaiting Approval)  

---

## Executive Summary & Inspection Overview

A comprehensive architectural audit of the **Livestock Saathi** platform was conducted across the entire codebase. The platform is an end-to-end multi-tier livestock disease surveillance, early warning, and decision-support system composed of:
1. **Web Frontend (`frontend/`):** React 18 + Vite SPA, styled with TailwindCSS, featuring role-based dashboards (`FarmerDashboard`, `FieldWorkerDashboard`, `AdminDashboard`), Leaflet GIS maps, Dexie.js (IndexedDB) offline support, and multi-language support (English, Hindi, Marathi).
2. **Next.js Vet Portal (`vet-portal/`):** Next.js 16 + React 19 administrative portal with server-side rendered triage queues and KPI cards.
3. **Mobile Farmer App (`farmer-app/`):** React Native 0.86 + Expo 57 with `@react-native-community/netinfo` offline outbox sync.
4. **Unified Node.js Backend (`backend/`):** Express 4 REST API, with custom JWT authentication, Server-Sent Events (SSE) real-time event broker, and child process orchestration.
5. **Deep Learning AI Service (`backend/services/ai_service.py`):** Flask microservice loading `lsd_model.keras` (EfficientNetB0) running inference over visual lesion inputs fused with 27 clinical symptoms.
6. **External Integrations:** Google Gemini LLM API (bilingual clinical advisory), ICAR-NIVEDI NADRES district forewarning API, Open-Meteo live agrometeorological weather API, and OpenStreetMap Nominatim reverse geocoding.

Currently, the primary datastore is **MongoDB** via **Mongoose 8**, consisting of **11 distinct collections** with heavy denormalization (embedded timeline events, vaccination lists, and notification delivery receipts), MongoDB Aggregation pipelines for analytics, and in-memory Haversine distance computations.

This document details the complete, zero-data-loss blueprint to migrate the database and backend services to **Supabase PostgreSQL** with **PostGIS**, **Supabase Storage**, **Supabase Realtime**, and **Row Level Security (RLS)**.

---

## Table of Contents
- [A. Current Architecture](#a-current-architecture)
- [B. Current MongoDB Collections & Models](#b-current-mongodb-collections--models)
- [C. Relationships Between Collections](#c-relationships-between-collections)
- [D. All MongoDB Queries That Need Replacement](#d-all-mongodb-queries-that-need-replacement)
- [E. All APIs Affected](#e-all-apis-affected)
- [F. Proposed PostgreSQL / Supabase Schema](#f-proposed-postgresql--supabase-schema)
- [G. Proposed Relationships and Foreign Keys](#g-proposed-relationships-and-foreign-keys)
- [H. Authentication Migration Strategy](#h-authentication-migration-strategy)
- [I. Storage Migration Strategy](#i-storage-migration-strategy)
- [J. Realtime Requirements](#j-realtime-requirements)
- [K. GIS / PostGIS Requirements](#k-gis--postgis-requirements)
- [L. Row Level Security (RLS) Strategy](#l-row-level-security-rls-strategy)
- [M. Required Environment Variables](#m-required-environment-variables)
- [N. Migration Risks & Mitigation Matrix](#n-migration-risks--mitigation-matrix)
- [O. Testing Strategy](#o-testing-strategy)
- [P. Rollback Strategy](#p-rollback-strategy)

---

## A. Current Architecture

```
                                  +-------------------------------------------------------------+
                                  |                    CLIENT APPLICATIONS                      |
                                  |                                                             |
                                  |  +---------------------+  +-----------------+  +----------+ |
                                  |  | Web Frontend (Vite) |  | Next.js Portal  |  | Expo App | |
                                  |  | (React 18/Dexie DB) |  | (Vet Portal)    |  | (Mobile) | |
                                  |  +----------+----------+  +--------+--------+  +----+-----+ |
                                  +-------------|----------------------|----------------|-------+
                                                |                      |                |
                                                |  HTTP REST / SSE     |                |
                                                v                      v                v
+-----------------------------------------------------------------------------------------------+
|                                      EXPRESS 4 BACKEND                                        |
|  (backend/server.js - Port 5000)                                                             |
|                                                                                               |
|  +------------------+  +------------------+  +------------------+  +------------------------+ |
|  | Auth Controller  |  | Case Controller  |  | Animal Service   |  | Dashboard Controller   | |
|  | (JWT + Bcrypt)   |  | (5-Stage Triage) |  | (Records/Sync)   |  | (Aggregation Pipeline) | |
|  +------------------+  +------------------+  +------------------+  +------------------------+ |
|  | Lab Controller   |  | Vacc Controller  |  | Vet Controller   |  | Kisan Saathi (LLM)     | |
|  +------------------+  +------------------+  +------------------+  +------------------------+ |
|                                                                                               |
|  +---------------------------+  +----------------------------+  +---------------------------+ |
|  | In-Memory SSE Hub         |  | Local Disk Storage         |  | Geocoding Service         | |
|  | (NotificationService.js)  |  | (/uploads/scans/*.jpg)     |  | (Nominatim + Cache)       | |
|  +---------------------------+  +----------------------------+  +---------------------------+ |
+-----------------------------------------------|-----------------------------------------------+
           |                                    | HTTP (Port 5050)
           | Mongoose 8 Driver                  v
           v                           +-----------------------------+
+-----------------------+              |   PYTHON FLASK AI SERVICE   |
|   MONGODB DATABASE    |              |   (backend/services/        |
| (pashurakshak db)     |              |    ai_service.py)           |
| 11 Collections        |              |                             |
| Geo Indexes: Lat/Lng  |              |   Model: lsd_model.keras    |
+-----------------------+              |   Architecture:             |
                                       |   EfficientNetB0            |
                                       +-----------------------------+
```

### Architectural Characteristics:
1. **Stateful In-Memory Components:**
   - Active SSE connections are tracked in `Map<clientId, client>` within `notificationService.js`.
   - Nominatim geocoding results are cached in an in-memory `Map`.
2. **File Storage:**
   - Scan photos sent as Base64 strings are decoded and stored directly onto local filesystem storage in `backend/uploads/scans/` and served as static Express routes.
3. **Deep Learning Coupling:**
   - The Python Flask service (`ai_service.py`) is decoupled from the database; it exposes `/predict` and `/health` via REST HTTP. Database lookups for 14-day spatiotemporal outbreak clustering occur in Node.js before/after calling the Python microservice.
4. **Offline Capability:**
   - The React frontend uses Dexie.js (IndexedDB) with `offlineReports`, `offlineCases`, and `offlineCaseActions` stores. When network is restored, `syncService.js` flushes pending records to `/api/reports`.

---

## B. Current MongoDB Collections & Models

All schemas are declared using Mongoose in `backend/models/`:

### 1. `User` (`backend/models/User.js`)
- **Collection Name:** `users`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `name`: String (Required, trimmed)
  - `role`: String (Enum: `['farmer', 'field_worker', 'veterinarian', 'officer', 'admin']`, default: `'farmer'`)
  - `isActive`: Boolean (Default: `true`)
  - `phone`: String (Required, trimmed, indexed)
  - `email`: String (Required, unique, lowercase, trimmed)
  - `passwordHash`: String (Bcrypt hash)
  - `village`: String (Default: `''`)
  - `block`: String (Default: `''`)
  - `district`: String (Default: `'Pune'`)
  - `state`: String (Default: `'Maharashtra'`)
  - `location`: Subdocument `{ lat: Number, lng: Number }` (Default: `{ 0, 0 }`)
  - `registrationNo`: String (Veterinary registration / council ID)
  - `department`: String (Government dept or private clinic affiliation)
  - `preferredLanguage`: String (Enum/String: `'hi'`, `'en'`, `'mr'`, default: `'hi'`)
  - `specialization`: String (Default: `'General Veterinary Physician'`)
  - `availability`: String (Enum: `['AVAILABLE', 'ACTIVE', 'BUSY', 'OFF_DUTY', 'ON_CALL']`)
  - `isAvailable`: Boolean (Default: `true`)
  - `isDummy`: Boolean (Default: `false`)
  - `dataSource`: String (Default: `'SYSTEM'`)
  - `area`: String
  - `clinicName`: String
  - `rating`: Number (Default: `4.8`)
  - `experience`: Number (Default: `6` years)
  - `emergencyAvailable`: Boolean (Default: `true`)
  - `services`: Array of String (Default: `['Emergency Treatment', 'Vaccination', 'Clinical Triage', 'Artificial Insemination']`)
  - `createdAt`, `updatedAt`: Timestamps

### 2. `Animal` (`backend/models/Animal.js`)
- **Collection Name:** `animals`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `tagId`: String (Unique, uppercase, trimmed, required)
  - `name`: String
  - `species`: String (Enum: `['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other']`)
  - `breed`: String (Default: `'Indigenous / Mixed'`)
  - `age`: Number (In years)
  - `gender`: String (Enum: `['Female', 'Male']`)
  - `healthStatus`: String (Enum: `['Healthy', 'Needs Attention', 'Critical', 'Recovered']`)
  - `milkYieldDaily`: String
  - `lastCheckup`: String
  - `ownerId`: ObjectId (Ref: `User`, required)
  - `village`: String (Required)
  - `block`: String (Required)
  - `district`: String (Required, default: `'Pune'`)
  - `timeline`: Array of Subdocuments `{ type, title, date, doctor, notes, image, status, disease, confidence, symptoms: [String], advisory, temperature, duration }`
  - `vaccinations`: Array of Subdocuments `{ name, date, nextDue, status, batchNumber, camp }`
  - `vaccinationHistory`: Array of Subdocuments `{ vaccine, date, nextDue, dose, batchNumber, administeredBy, camp, notes }`
  - `treatmentHistory`: Array of Subdocuments `{ condition, date, treatment, vetId: Ref(User) }`
  - `createdAt`, `updatedAt`: Timestamps

### 3. `DiseaseCase` (`backend/models/DiseaseCase.js`)
- **Collection Name:** `diseasecases`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `caseId`: String (Unique, indexed, human-friendly: e.g., `CASE-2026-PUN-1234`)
  - `farmerId`: ObjectId (Ref: `User`, required, indexed)
  - `animalId`: ObjectId (Ref: `Animal`, nullable)
  - `animalName`: String
  - `species`: String (Default: `'Cattle'`)
  - `image`: String (URL or base64 data)
  - `disease`: String (Required, trimmed)
  - `confidence`: Number (0 - 100, default: `85`)
  - `risk`: String (Enum: `['Low', 'Moderate', 'High', 'Critical']`)
  - `districtId`: String (Indexed, required, e.g., `'Pune'`)
  - `state`: String (Default: `'Maharashtra'`)
  - `coordinates`: Subdocument `{ lat: Number, lng: Number }` (Required)
  - `farmerLocation`: Subdocument `{ village, block, district, state }`
  - `farmerContact`: Subdocument `{ name, phone }`
  - `symptoms`: Array of String
  - `temperature`: Number
  - `duration`: Number
  - `affectedCount`: Number (Default: `1`)
  - `notes`: String
  - `clinicalDiagnosis`: String
  - `investigationNotes`: String
  - `status`: String (Enum: `['New', 'Investigating', 'Confirmed', 'Containment', 'Resolved', 'OPEN', 'ACCEPTED', 'IN_TREATMENT']`)
  - `containmentZoneId`: ObjectId (Ref: `ContainmentZone`, nullable)
  - `ringVaccinationDriveId`: ObjectId (Ref: `VaccinationDrive`, nullable)
  - `assignedVetId`: ObjectId (Ref: `User`, indexed, nullable)
  - `notifiedVets`: Array of Subdocuments `{ vetId: Ref(User), name, phone, notifiedAt, deliveryStatus, channel, error }`
  - `acceptedAt`: Date
  - `confirmedAt`: Date
  - `containmentStartedAt`: Date
  - `treatmentStartedAt`: Date
  - `resolvedAt`: Date
  - `treatmentNotes`: String
  - `prescription`: String
  - `timeline`: Array of Subdocuments `{ status, updatedBy: Ref(User), updaterName, timestamp, notes }`
  - `createdAt`, `updatedAt`: Timestamps
- **Indexes:**
  - `{ districtId: 1, status: 1, createdAt: -1 }`
  - `{ farmerId: 1, createdAt: -1 }`
  - `{ assignedVetId: 1, status: 1 }`

### 4. `Report` (`backend/models/Report.js`)
- **Collection Name:** `reports`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `caseId`: String (Unique, required)
  - `reporterId`: ObjectId (Ref: `User`, required)
  - `animalId`: ObjectId (Ref: `Animal`, nullable)
  - `herdId`: String (Nullable)
  - `species`: String (Enum: `['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other']`)
  - `symptoms`: Array of String
  - `mortalityCount`: Number (Default: `0`)
  - `affectedCount`: Number (Default: `1`)
  - `location`: Subdocument `{ lat: Number, lng: Number, village: String, block: String, district: String }`
  - `photos`: Array of String (URLs / base64)
  - `temperature`: Number
  - `duration`: Number
  - `status`: String (Enum: `['Reported', 'Triaged', 'Field Verified', 'Escalated', 'Contained', 'Closed']`)
  - `reporterContact`: Subdocument `{ phone, name }`
  - `notes`: String
  - `createdAt`, `updatedAt`: Timestamps
- **Indexes:**
  - `{ 'location.lat': 1, 'location.lng': 1 }`
  - `{ 'location.district': 1, 'location.block': 1, createdAt: -1 }`

### 5. `TriageResult` (`backend/models/TriageResult.js`)
- **Collection Name:** `triageresults`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `reportId`: ObjectId (Ref: `Report`, unique, required)
  - `riskLevel`: String (Enum: `['Low', 'Moderate', 'High', 'Critical']`)
  - `suspectedDiseases`: Array of Subdocuments `{ name: String, confidenceScore: Number, rationale: String }`
  - `recommendedAction`: String
  - `immediateFirstAid`: Array of String
  - `outbreakFlag`: Boolean (Default: `false`)
  - `clusterDetails`: Subdocument `{ matchedCasesCount: Number, timeWindowDays: Number, block: String }`
  - `explanation`: String
  - `visualScore`: Number (Nullable)
  - `modelVersion`: String (Default: `'lsd_model.keras (EfficientNetB0)'`)
  - `createdAt`, `updatedAt`: Timestamps

### 6. `ContainmentZone` (`backend/models/ContainmentZone.js`)
- **Collection Name:** `containmentzones`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `zoneId`: String (Unique, indexed, e.g., `ZONE-2026-PUN-9876`)
  - `caseId`: ObjectId (Ref: `DiseaseCase`, nullable)
  - `reportId`: ObjectId (Ref: `Report`, nullable)
  - `disease`: String (Required)
  - `district`: String (Required, indexed)
  - `block`: String
  - `village`: String
  - `center`: Subdocument `{ lat: Number, lng: Number }` (Required)
  - `radiusKm`: Number (Default: `5.0`, min: `0.5`, max: `50.0`)
  - `status`: String (Enum: `['ACTIVE', 'CONTAINED', 'LIFTED']`, default: `'ACTIVE'`)
  - `enforcedRules`: Array of String
  - `createdByVetId`: ObjectId (Ref: `User`, required)
  - `creatorName`: String
  - `ringVaccinationDriveId`: ObjectId (Ref: `VaccinationDrive`, nullable)
  - `notes`: String
  - `containedAt`: Date
  - `liftedAt`: Date
  - `createdAt`, `updatedAt`: Timestamps
- **Indexes:**
  - `{ district: 1, status: 1 }`
  - `{ 'center.lat': 1, 'center.lng': 1 }`

### 7. `VaccinationDrive` (`backend/models/VaccinationDrive.js`)
- **Collection Name:** `vaccinationdrives`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `campId`: String (Unique, indexed)
  - `state`: String (Default: `'Maharashtra'`)
  - `district`: String (Required, indexed)
  - `block`: String (Required, indexed)
  - `village`: String (Required)
  - `venue`: String (Required)
  - `coordinates`: Subdocument `{ lat: Number, lng: Number }` (Required)
  - `vaccine`: String (Required)
  - `vaccineFullName`: String
  - `targetSpecies`: String (Default: `'Cattle & Buffalo'`)
  - `campDate`: Date (Required, indexed)
  - `startTime`: String (Default: `'09:30 AM'`)
  - `endTime`: String (Default: `'04:00 PM'`)
  - `cost`: String (Default: `'Free (Govt Drive)'`)
  - `isFree`: Boolean (Default: `true`)
  - `organizingHospital`: String (Required)
  - `assignedOfficer`: String (Required)
  - `assignedOfficerId`: ObjectId (Ref: `User`)
  - `contactNumber`: String (Default: `'1962'`)
  - `capacity`: Number (Required, default: `200`)
  - `bookedSlots`: Number (Default: `0`)
  - `remainingSlots`: Number (Default: `200`)
  - `targetCount`: Number (Default: `200`)
  - `coveredCount`: Number (Default: `0`)
  - `startDate`, `endDate`: Date
  - `status`: String (Enum: `['Upcoming', 'Ongoing', 'Completed', 'Scheduled', 'Active']`)
  - `registrations`: Array of Subdocuments `{ farmerId: Ref(User), farmerName, farmerPhone, animalIds: [String], animalCount, token, registeredAt }`
  - `notes`: String
  - `createdAt`, `updatedAt`: Timestamps
- **Indexes:**
  - `{ district: 1, block: 1, status: 1 }`
  - `{ 'coordinates.lat': 1, 'coordinates.lng': 1 }`

### 8. `LabReferral` (`backend/models/LabReferral.js`)
- **Collection Name:** `labreferrals`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `reportId`: ObjectId (Ref: `Report`, required)
  - `sampleType`: String (Enum: Blood, Nasal/Oral Swab, Vesicular Fluid, Skin Lesion/Scab, Milk, Tissue, Fecal, Other)
  - `collectionDate`: Date (Default: `Date.now`)
  - `referredLab`: String (Required)
  - `status`: String (Enum: `['Collected', 'In Transit', 'Received', 'Result Pending', 'Result Confirmed']`)
  - `collectedBy`: ObjectId (Ref: `User`)
  - `resultSummary`: Subdocument `{ confirmedDisease, notes, confirmedDate }`
  - `createdAt`, `updatedAt`: Timestamps

### 9. `Advisory` (`backend/models/Advisory.js`)
- **Collection Name:** `advisories`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `reportId`: ObjectId (Ref: `Report`, nullable)
  - `title`: Subdocument `{ en: String, hi: String }` (Required)
  - `message`: Subdocument `{ en: String, hi: String }` (Required)
  - `severity`: String (Enum: `['Low', 'Moderate', 'High', 'Critical']`)
  - `disease`: String (Default: `'General Health'`)
  - `targetVillage`, `targetBlock`, `targetDistrict`: String
  - `issuedBy`: String
  - `createdAt`, `updatedAt`: Timestamps

### 10. `Notification` (`backend/models/Notification.js`)
- **Collection Name:** `notifications`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `recipientId`: ObjectId (Ref: `User`, required, indexed)
  - `caseId`: ObjectId (Ref: `DiseaseCase`, required, indexed)
  - `caseNumber`: String
  - `type`: String (Enum: `['NEW_CASE_ALERT', 'CASE_CLAIMED', 'CASE_STATUS_UPDATE']`)
  - `title`: String (Required)
  - `message`: String (Required)
  - `district`: String (Required)
  - `status`: String (Enum: `['QUEUED', 'DELIVERED', 'FAILED', 'READ']`)
  - `retryCount`: Number (Default: `0`)
  - `lastAttemptAt`: Date
  - `error`: String
  - `metadata`: Subdocument `{ disease, risk, confidence, animalSpecies, farmerName, farmerPhone }`
  - `createdAt`, `updatedAt`: Timestamps
- **Indexes:**
  - `{ recipientId: 1, status: 1, createdAt: -1 }`

### 11. `ScanImage` (`backend/models/ScanImage.js`)
- **Collection Name:** `scanimages`
- **Fields:**
  - `_id`: ObjectId (Primary Key)
  - `animalId`: ObjectId (Ref: `Animal`, nullable)
  - `ownerId`: ObjectId (Ref: `User`, nullable)
  - `imageUrl`: String (Required, path in `/uploads/scans/`)
  - `disease`: String
  - `riskLevel`: String
  - `confidence`: Number
  - `symptoms`: Array of String
  - `temperature`: Number
  - `duration`: Number
  - `createdAt`, `updatedAt`: Timestamps

---

## C. Relationships Between Collections

The MongoDB models use document references (`ObjectId` + `ref`) combined with denormalized embedded arrays:

```mermaid
erDiagram
    USERS ||--o{ ANIMALS : owns
    USERS ||--o{ REPORTS : reports
    USERS ||--o{ DISEASE_CASES : logs_or_claims
    USERS ||--o{ CONTAINMENT_ZONES : declares
    USERS ||--o{ VACCINATION_DRIVES : manages
    USERS ||--o{ NOTIFICATIONS : receives

    ANIMALS ||--o{ REPORTS : referenced_in
    ANIMALS ||--o{ DISEASE_CASES : referenced_in
    ANIMALS ||--o{ SCAN_IMAGES : linked_to

    REPORTS ||--|| TRIAGE_RESULTS : triaged_as
    REPORTS ||--o{ LAB_REFERRALS : generates_sample
    REPORTS ||--o{ ADVISORIES : triggers

    DISEASE_CASES ||--o{ NOTIFICATIONS : triggers_alerts
    DISEASE_CASES ||--o| CONTAINMENT_ZONES : triggers_zone
    DISEASE_CASES ||--o| VACCINATION_DRIVES : triggers_ring_camp

    CONTAINMENT_ZONES ||--o| VACCINATION_DRIVES : coordinates_with
```

### Relational Normalization Analysis for PostgreSQL:
1. **`Animal.timeline`**: Currently an array of subdocuments in MongoDB. In PostgreSQL, this should be normalized to an `animal_timeline` table for clean indexing, queries, and foreign keys.
2. **`Animal.vaccinations` & `vaccinationHistory`**: Redundant embedded arrays. In PostgreSQL, this is unified into `animal_vaccinations`.
3. **`Animal.treatmentHistory`**: Normalized into `animal_treatments` linked to `users.id` (vet).
4. **`DiseaseCase.timeline`**: Normalized into `case_timeline` audit table.
5. **`DiseaseCase.notifiedVets`**: Normalized into `case_notified_vets` dispatch tracking table.
6. **`VaccinationDrive.registrations`**: Normalized into `vaccination_camp_registrations` table.

---

## D. All MongoDB Queries That Need Replacement

Below is the complete catalog of every query in the backend controllers, its purpose, and its equivalent Supabase / PostgreSQL query.

### 1. User & Authentication Queries (`authController.js`, `veterinaryController.js`, `middleware/auth.js`)
| Location | Current MongoDB Query | Proposed PostgreSQL / Supabase Query |
| :--- | :--- | :--- |
| `authController.js:45` | `User.findOne({ $or: [{ email }, { phone }] })` | `SELECT * FROM profiles WHERE email = $1 OR phone = $2 LIMIT 1;` |
| `authController.js:62` | `User.create({ name, phone, email, passwordHash, ... })` | `INSERT INTO profiles (name, phone, email, password_hash, ...) VALUES (...) RETURNING *;` |
| `authController.js:124` | `User.findOne({ $or: [{ email: loginKey }, { phone: loginKey }] })` | `SELECT * FROM profiles WHERE email = LOWER($1) OR phone = $1 LIMIT 1;` |
| `middleware/auth.js:22` | `User.findById(decoded.id).select('-passwordHash')` | `SELECT id, name, role, email, phone, district, block, village FROM profiles WHERE id = $1;` |
| `veterinaryController.js:160` | `User.find({ role: 'veterinarian', isActive: true, ... })` | `SELECT * FROM profiles WHERE role = 'veterinarian' AND is_active = true AND district ILIKE $1;` |
| `veterinaryController.js:308` | `User.aggregate([{ $match: { role: 'veterinarian' } }, { $group: { _id: '$district', ... } }])` | `SELECT district, COUNT(*) AS vet_count, COUNT(*) FILTER (WHERE availability IN ('AVAILABLE','ACTIVE')) AS available_count FROM profiles WHERE role = 'veterinarian' AND is_active = true GROUP BY district ORDER BY district;` |

### 2. Animal Management Queries (`animalController.js`, `kisanSaathiRoutes.js`)
| Location | Current MongoDB Query | Proposed PostgreSQL / Supabase Query |
| :--- | :--- | :--- |
| `animalController.js:24` | `Animal.find(query).populate('ownerId').sort({ createdAt: -1 }).lean()` | `SELECT a.*, json_build_object('name', p.name, 'phone', p.phone, 'village', p.village) AS owner FROM animals a JOIN profiles p ON a.owner_id = p.id WHERE ($1::uuid IS NULL OR a.owner_id = $1) ORDER BY a.created_at DESC;` |
| `animalController.js:44` | `Animal.findById(id).populate('ownerId').lean()` | `SELECT a.*, to_json(p.*) AS owner FROM animals a JOIN profiles p ON a.owner_id = p.id WHERE a.id = $1;` |
| `animalController.js:102` | `Animal.findOne({ tagId })` | `SELECT id FROM animals WHERE tag_id = UPPER($1);` |
| `animalController.js:110` | `Animal.create({ tagId, species, breed, ... })` | `INSERT INTO animals (tag_id, species, breed, ...) VALUES (...) RETURNING *;` |
| `animalController.js:168` | `Animal.findById(id)` / `Animal.findOne({ tagId })` | `SELECT * FROM animals WHERE id = $1 OR tag_id = $1;` |
| `animalController.js:206` | Embedded `animal.vaccinationHistory.push(...)`, `animal.save()` | `INSERT INTO animal_vaccinations (animal_id, vaccine_name, date, next_due, ...) VALUES (...);` |
| `animalController.js:229` | Embedded `animal.treatmentHistory.push(...)`, `animal.save()` | `INSERT INTO animal_treatments (animal_id, condition, treatment, vet_id) VALUES (...);` |
| `animalController.js:238` | Embedded `animal.timeline.unshift(...)`, `animal.save()` | `INSERT INTO animal_timeline (animal_id, type, title, notes, ...) VALUES (...);` |

### 3. Disease Referral & Outbreak Queries (`caseController.js`)
| Location | Current MongoDB Query | Proposed PostgreSQL / Supabase Query |
| :--- | :--- | :--- |
| `caseController.js:131` | `User.find({ role: { $in: ['field_worker', 'veterinarian', 'officer'] }, district, isActive: true })` | `SELECT id, name, phone, email, district, block, role FROM profiles WHERE role IN ('field_worker', 'veterinarian', 'officer') AND district ILIKE $1 AND is_active = true;` |
| `caseController.js:165` | `DiseaseCase.create({ caseId, farmerId, animalId, disease, ... })` | `INSERT INTO disease_cases (case_id, farmer_id, animal_id, disease, risk, latitude, longitude, coordinates_geom, ...) VALUES (..., ST_SetSRID(ST_MakePoint($lng, $lat), 4326), ...) RETURNING *;` |
| `caseController.js:213` | `Notification.create(notificationData)` | `INSERT INTO notifications (recipient_id, case_id, type, title, message, ...) VALUES (...);` |
| `caseController.js:321` | `DiseaseCase.find(query).populate('farmerId').populate('assignedVetId')...` | `SELECT c.*, to_json(f.*) AS farmer, to_json(v.*) AS assigned_vet FROM disease_cases c JOIN profiles f ON c.farmer_id = f.id LEFT JOIN profiles v ON c.assigned_vet_id = v.id WHERE (c.district_id ILIKE $1 OR c.assigned_vet_id = $2) ORDER BY c.created_at DESC LIMIT $3;` |
| `caseController.js:356` | `DiseaseCase.findOne({ caseId: id })` / `findById(id)` | `SELECT * FROM disease_cases WHERE id = $1 OR case_id = $1;` |
| `caseController.js:445` | `DiseaseCase.findOneAndUpdate({ _id: id, status: { $in: ['New', 'OPEN'] }, assignedVetId: null }, { $set: { status: 'Investigating', assignedVetId }, $push: { timeline: ... } }, { new: true })` | **Atomic CAS Query:** `UPDATE disease_cases SET status = 'Investigating', assigned_vet_id = $1, accepted_at = NOW(), updated_at = NOW() WHERE (id = $2 OR case_id = $2) AND status IN ('New', 'OPEN') AND assigned_vet_id IS NULL RETURNING *;` (Followed by `INSERT INTO case_timeline (...)`) |
| `caseController.js:658` | `DiseaseCase.find({ districtId, status: { $nin: ['Resolved', 'RESOLVED'] } })` | `SELECT id, case_id, disease, species, risk, status, affected_count, latitude, longitude FROM disease_cases WHERE district_id ILIKE $1 AND status NOT IN ('Resolved', 'RESOLVED');` |
| `caseController.js:857` | `ContainmentZone.create({ zoneId, disease, district, center, radiusKm, ... })` | `INSERT INTO containment_zones (zone_id, disease, district, center_lat, center_lng, center_geom, radius_km, ...) VALUES (..., ST_SetSRID(ST_MakePoint($lng, $lat), 4326), ...) RETURNING *;` |
| `caseController.js:933` | `ContainmentZone.find(query).populate('caseId').populate('createdByVetId')` | `SELECT z.*, to_json(c.*) AS case, to_json(v.*) AS created_by FROM containment_zones z LEFT JOIN disease_cases c ON z.case_id = c.id JOIN profiles v ON z.created_by_vet_id = v.id WHERE z.district ILIKE $1 ORDER BY z.created_at DESC;` |
| `caseController.js:972` | `ContainmentZone.findOne({ zoneId })` -> update status | `UPDATE containment_zones SET status = $1, notes = CONCAT(notes, ' | ', $2), updated_at = NOW() WHERE zone_id = $3 OR id = $3 RETURNING *;` |
| `caseController.js:1043`| `VaccinationDrive.create({ campId, district, block, vaccine, ... })` | `INSERT INTO vaccination_drives (camp_id, district, block, vaccine, coordinates_geom, ...) VALUES (...);` |

### 4. Surveillance Reports & AI Triage Queries (`reportController.js`, `aiModelService.js`, `dashboardController.js`)
| Location | Current MongoDB Query | Proposed PostgreSQL / Supabase Query |
| :--- | :--- | :--- |
| `aiModelService.js:25` | `Report.find({ 'location.block': block, 'location.district': district, createdAt: { $gte: 14DaysAgo } })` | `SELECT id, symptoms, created_at FROM reports WHERE block ILIKE $1 AND district ILIKE $2 AND created_at >= NOW() - INTERVAL '14 days';` |
| `reportController.js:91` | `Report.create({ caseId, reporterId, species, symptoms, location, ... })` | `INSERT INTO reports (case_id, reporter_id, species, symptoms, latitude, longitude, location_geom, village, block, district, ...) VALUES (...) RETURNING *;` |
| `reportController.js:132`| `TriageResult.create({ reportId, riskLevel, suspectedDiseases, ... })` | `INSERT INTO triage_results (report_id, risk_level, suspected_diseases, immediate_first_aid, ...) VALUES (...) RETURNING *;` |
| `reportController.js:209`| `Report.find(query).populate('reporterId').skip().limit()` | `SELECT r.*, to_json(p.*) AS reporter, to_json(tr.*) AS triage_result FROM reports r JOIN profiles p ON r.reporter_id = p.id LEFT JOIN triage_results tr ON tr.report_id = r.id WHERE ($1::text IS NULL OR r.district ILIKE $1) ORDER BY r.created_at DESC LIMIT $2 OFFSET $3;` |
| `dashboardController.js:33` | `Report.aggregate([{ $group: { totalDeaths: { $sum: '$mortalityCount' }, totalAffected: { $sum: '$affectedCount' } } }])` | `SELECT COALESCE(SUM(mortality_count), 0) AS total_deaths, COALESCE(SUM(affected_count), 0) AS total_affected FROM reports WHERE ($1::text IS NULL OR district ILIKE $1);` |
| `dashboardController.js:42` | `TriageResult.aggregate([{ $group: { criticalCount: { $sum: ... } } }])` | `SELECT COUNT(*) FILTER (WHERE tr.risk_level = 'Critical') AS critical_count, COUNT(*) FILTER (WHERE tr.risk_level = 'High') AS high_count, COUNT(*) FILTER (WHERE tr.risk_level = 'Moderate') AS moderate_count, COUNT(*) FILTER (WHERE tr.risk_level = 'Low') AS low_count, COUNT(*) FILTER (WHERE tr.outbreak_flag = true) AS outbreak_count FROM triage_results tr JOIN reports r ON tr.report_id = r.id WHERE ($1::text IS NULL OR r.district ILIKE $1);` |
| `dashboardController.js:65` | `TriageResult.aggregate([... $unwind: '$suspectedDiseases' ...])` | `SELECT d->>'name' AS disease_name, COUNT(*) AS case_count, ROUND(AVG((d->>'confidenceScore')::numeric) * 100) AS avg_confidence FROM triage_results tr, jsonb_array_elements(tr.suspected_diseases) d GROUP BY disease_name ORDER BY case_count DESC LIMIT 8;` |
| `dashboardController.js:80` | `Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])` | `SELECT status, COUNT(*) AS count FROM reports GROUP BY status;` |
| `dashboardController.js:108`| `VaccinationDrive.aggregate([{ $group: { totalTarget: { $sum: '$targetCount' }, totalCovered: { $sum: '$coveredCount' } } }])` | `SELECT COALESCE(SUM(target_count), 0) AS total_target, COALESCE(SUM(covered_count), 0) AS total_covered FROM vaccination_drives WHERE ($1::text IS NULL OR district ILIKE $1);` |

### 5. Vaccination Drives & Camp Registrations (`vaccinationController.js`)
| Location | Current MongoDB Query | Proposed PostgreSQL / Supabase Query |
| :--- | :--- | :--- |
| `vaccinationController.js:81` | `VaccinationDrive.find(query).sort({ campDate: 1 }).limit(250)` | `SELECT vd.*, ST_Distance(vd.coordinates_geom, ST_SetSRID(ST_MakePoint($user_lng, $user_lat), 4326)::geography) / 1000.0 AS distance_km FROM vaccination_drives vd WHERE ($1::text IS NULL OR vd.district ILIKE $1) ORDER BY vd.camp_date ASC LIMIT $2;` |
| `vaccinationController.js:145`| `VaccinationDrive.find({ 'registrations.farmerId': userId })` | `SELECT r.*, vd.camp_id, vd.vaccine, vd.venue, vd.camp_date, vd.start_time, vd.end_time FROM vaccination_camp_registrations r JOIN vaccination_drives vd ON r.drive_id = vd.id WHERE r.farmer_id = $1 OR r.farmer_phone = $2 ORDER BY vd.camp_date ASC;` |
| `vaccinationController.js:236`| Embedded `drive.registrations.push(...)`, `drive.save()` | `INSERT INTO vaccination_camp_registrations (drive_id, farmer_id, farmer_name, farmer_phone, animal_ids, animal_count, token) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;` (Wrapped in SQL transaction updating `booked_slots` and `remaining_slots`). |

---

## E. All APIs Affected

| Endpoint | Method | Role Scoping | MongoDB Controller | Supabase Migration Action |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | `authController.register` | Insert into Supabase `auth.users` + `public.profiles` |
| `/api/auth/login` | `POST` | Public | `authController.login` | Authenticate with Supabase Auth or verify `password_hash` in `public.profiles` |
| `/api/auth/me` | `GET` | Authenticated | `authController.getMe` | Select from `public.profiles` by `auth.uid()` |
| `/api/animals` | `GET` | Authenticated | `animalController.getAnimals` | Select from `animals` (Farmers restricted by `owner_id`) |
| `/api/animals` | `POST` | Authenticated | `animalController.createAnimal` | Insert into `animals` table + initial `animal_timeline` |
| `/api/animals/:id` | `GET` | Authenticated | `animalController.getAnimalById` | Join `animals`, `animal_timeline`, `animal_vaccinations`, `reports` |
| `/api/animals/:id` | `PATCH` | Authenticated | `animalController.updateAnimal` | Update `animals` + insert child history row |
| `/api/cases` | `POST` | Authenticated | `caseController.createCase` | Insert `disease_cases` + dispatch notifications |
| `/api/cases` | `GET` | Authenticated | `caseController.getCases` | Select `disease_cases` (Farmers see own; Vets see district) |
| `/api/cases/:id` | `GET` | Authenticated | `caseController.getCaseById` | Select single `disease_cases` with joins |
| `/api/cases/:id/claim` | `PATCH` | Vet, Field Worker, Admin | `caseController.claimCase` | Atomic SQL CAS on `disease_cases` status and `assigned_vet_id` |
| `/api/cases/:id/status` | `PATCH` | Assigned Vet, Admin | `caseController.updateCaseStatus` | Update `disease_cases.status` + insert `case_timeline` |
| `/api/cases/clusters` | `GET` | Vet, Field Worker, Admin | `caseController.getSpatialOutbreakClusters` | PostGIS `ST_ClusterDBSCAN` or Haversine SQL view |
| `/api/cases/containment-zones` | `GET` | Authenticated | `caseController.getContainmentZones` | Select from `containment_zones` |
| `/api/cases/containment-zones` | `POST` | Vet, Field Worker, Admin | `caseController.createContainmentZone` | Insert `containment_zones` with `center_geom` |
| `/api/cases/containment-zones/:zoneId/status` | `PATCH` | Vet, Admin | `caseController.updateContainmentZoneStatus` | Update `containment_zones.status` |
| `/api/cases/:id/schedule-ring-vaccination` | `POST` | Vet, Admin | `caseController.scheduleRingVaccination` | Insert `vaccination_drives` + link to `disease_cases` |
| `/api/cases/advisories` | `GET` | Authenticated | `caseController.getAdvisories` | Aggregate active `disease_cases` by disease |
| `/api/cases/district-vets` | `GET` | Authenticated | `caseController.getDistrictVets` | Select `profiles` where role IN vet/field_worker |
| `/api/cases/stream` | `GET` | Authenticated | `caseController.streamCases` | Bridge Supabase Realtime broadcast or PostgreSQL LISTEN/NOTIFY |
| `/api/reports/triage` | `POST` | Public / Auth | `reportController.runDirectTriage` | Calls Python AI + checks `reports` clustering in Postgres |
| `/api/reports` | `POST` | Authenticated | `reportController.createReport` | Insert `reports` + insert `triage_results` |
| `/api/reports` | `GET` | Authenticated | `reportController.getReports` | Select `reports` joined with `triage_results` |
| `/api/reports/:id` | `GET` | Authenticated | `reportController.getReportById` | Select `reports` + `triage_results` + `lab_referrals` |
| `/api/reports/:id/status` | `PATCH` | Field Worker, Officer | `reportController.updateReportStatus` | Update `reports.status` |
| `/api/lab-referrals` | `GET` | Authenticated | `labController.getLabReferrals` | Select `lab_referrals` joined with `reports` |
| `/api/lab-referrals` | `POST` | Field Worker, Officer | `labController.createLabReferral` | Insert `lab_referrals` + update `reports.status` |
| `/api/lab-referrals/:id` | `PATCH` | Field Worker, Officer | `labController.updateLabReferral` | Update `lab_referrals.status` and `result_summary` |
| `/api/vaccination-drives` | `GET` | Public / Optional Auth | `vaccinationController.getVaccinationDrives` | Select `vaccination_drives` with PostGIS distance |
| `/api/vaccination-drives/my-registrations` | `GET` | Farmers | `vaccinationController.getMyRegistrations` | Select from `vaccination_camp_registrations` |
| `/api/vaccination-drives/:id/register` | `POST` | Public / Farmers | `vaccinationController.registerForCamp` | Insert `vaccination_camp_registrations` with atomic slot decrement |
| `/api/veterinarians/nearby` | `GET` | Public / Auth | `veterinaryController.getNearbyVeterinarians` | PostGIS distance query on `profiles` |
| `/api/veterinarians/districts` | `GET` | Public | `veterinaryController.getDistrictsWithVets` | SQL Group By on `profiles.district` |
| `/api/dashboard/summary` | `GET` | Authenticated | `dashboardController.getSummary` | SQL Aggregations on `reports`, `triage_results`, `vaccination_drives` |
| `/api/dashboard/trends` | `GET` | Authenticated | `dashboardController.getTrends` | SQL Date series aggregation over past 30 days |
| `/api/upload/scan-image` | `POST` | Public / Auth | `uploadRoutes.js` | Upload binary/base64 to Supabase Storage bucket `livestock-scans` |
| `/api/upload/scans` | `GET` | Authenticated | `uploadRoutes.js` | Select from `scan_images` table |
| `/api/ivr/webhook` | `POST` | Public Webhook | `ivrController.ivrWebhook` | Insert `reports` + shadow user in `profiles` |
| `/api/kisan-saathi/consult` | `POST` | Public / Auth | `kisanSaathiRoutes.js` | Select `animals` by ID, fetch NADRES/weather, call Gemini |

---

## F. Proposed PostgreSQL / Supabase Schema

The proposed schema utilizes **PostGIS** for spatial data and indexing, **UUID** primary keys, normalized child tables, and **JSONB** where flexible semi-structured data is beneficial.

```sql
-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Custom ENUM Types
CREATE TYPE user_role AS ENUM ('farmer', 'field_worker', 'veterinarian', 'officer', 'admin');
CREATE TYPE vet_availability AS ENUM ('AVAILABLE', 'ACTIVE', 'BUSY', 'OFF_DUTY', 'ON_CALL');
CREATE TYPE animal_species AS ENUM ('Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other');
CREATE TYPE animal_gender AS ENUM ('Female', 'Male');
CREATE TYPE health_status_type AS ENUM ('Healthy', 'Needs Attention', 'Critical', 'Recovered');
CREATE TYPE risk_level_type AS ENUM ('Low', 'Moderate', 'High', 'Critical');
CREATE TYPE case_status_type AS ENUM ('New', 'Investigating', 'Confirmed', 'Containment', 'Resolved', 'OPEN', 'ACCEPTED', 'IN_TREATMENT');
CREATE TYPE report_status_type AS ENUM ('Reported', 'Triaged', 'Field Verified', 'Escalated', 'Contained', 'Closed');
CREATE TYPE containment_status_type AS ENUM ('ACTIVE', 'CONTAINED', 'LIFTED');
CREATE TYPE drive_status_type AS ENUM ('Upcoming', 'Ongoing', 'Completed', 'Scheduled', 'Active');
CREATE TYPE notification_status_type AS ENUM ('QUEUED', 'DELIVERED', 'FAILED', 'READ');

-- 2. Profiles Table (Linked to Supabase auth.users or standalone custom auth)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'farmer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    village VARCHAR(255) DEFAULT '',
    block VARCHAR(255) DEFAULT '',
    district VARCHAR(255) NOT NULL DEFAULT 'Pune',
    state VARCHAR(255) NOT NULL DEFAULT 'Maharashtra',
    latitude DOUBLE PRECISION DEFAULT 0.0,
    longitude DOUBLE PRECISION DEFAULT 0.0,
    location_geom geometry(Point, 4326),
    registration_no VARCHAR(128) DEFAULT '',
    department VARCHAR(255) DEFAULT '',
    preferred_language VARCHAR(8) DEFAULT 'hi',
    specialization VARCHAR(255) DEFAULT 'General Veterinary Physician',
    availability vet_availability DEFAULT 'AVAILABLE',
    is_available BOOLEAN DEFAULT TRUE,
    is_dummy BOOLEAN DEFAULT FALSE,
    data_source VARCHAR(64) DEFAULT 'SYSTEM',
    area VARCHAR(255) DEFAULT '',
    clinic_name VARCHAR(255) DEFAULT '',
    rating NUMERIC(3, 2) DEFAULT 4.8,
    experience INTEGER DEFAULT 6,
    emergency_available BOOLEAN DEFAULT TRUE,
    services TEXT[] DEFAULT ARRAY['Emergency Treatment', 'Vaccination', 'Clinical Triage', 'Artificial Insemination'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_district ON public.profiles(district);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_location_geom ON public.profiles USING GIST(location_geom);

-- 3. Animals Table
CREATE TABLE public.animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) DEFAULT '',
    species animal_species NOT NULL DEFAULT 'Cattle',
    breed VARCHAR(255) DEFAULT 'Indigenous / Mixed',
    age INTEGER DEFAULT 3,
    gender animal_gender DEFAULT 'Female',
    health_status health_status_type DEFAULT 'Healthy',
    milk_yield_daily VARCHAR(64) DEFAULT '12.0 L',
    last_checkup VARCHAR(64) DEFAULT TO_CHAR(NOW(), 'DD/MM/YYYY'),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    village VARCHAR(255) NOT NULL,
    block VARCHAR(255) NOT NULL,
    district VARCHAR(255) NOT NULL DEFAULT 'Pune',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_animals_owner ON public.animals(owner_id);
CREATE INDEX idx_animals_tag_id ON public.animals(tag_id);
CREATE INDEX idx_animals_district ON public.animals(district);

-- 4. Animal Timeline (Normalized Child Table)
CREATE TABLE public.animal_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    event_type VARCHAR(64) DEFAULT 'Health Check',
    title VARCHAR(255) NOT NULL,
    date VARCHAR(64) DEFAULT TO_CHAR(NOW(), 'DD/MM/YYYY'),
    doctor VARCHAR(255) DEFAULT '',
    notes TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    status VARCHAR(64) DEFAULT '',
    disease VARCHAR(255) DEFAULT '',
    confidence NUMERIC(5, 2),
    symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
    advisory TEXT DEFAULT '',
    temperature NUMERIC(4, 1),
    duration NUMERIC(4, 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_animal_timeline_animal_id ON public.animal_timeline(animal_id);

-- 5. Animal Vaccinations (Normalized Child Table)
CREATE TABLE public.animal_vaccinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    vaccine_name VARCHAR(255) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    next_due TIMESTAMPTZ,
    status VARCHAR(64) DEFAULT 'Completed',
    dose VARCHAR(64) DEFAULT 'Primary Dose',
    batch_number VARCHAR(128) DEFAULT '',
    administered_by VARCHAR(255) DEFAULT '',
    camp VARCHAR(255) DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_animal_vaccinations_animal ON public.animal_vaccinations(animal_id);

-- 6. Animal Treatments (Normalized Child Table)
CREATE TABLE public.animal_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    condition VARCHAR(255) NOT NULL,
    treatment TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Disease Cases Table (PS-128 Referral Engine)
CREATE TABLE public.disease_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id VARCHAR(64) NOT NULL UNIQUE,
    farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    animal_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
    animal_name VARCHAR(255) DEFAULT '',
    species VARCHAR(64) DEFAULT 'Cattle',
    image_url TEXT DEFAULT '',
    disease VARCHAR(255) NOT NULL,
    confidence INTEGER DEFAULT 85 CHECK (confidence >= 0 AND confidence <= 100),
    risk risk_level_type NOT NULL DEFAULT 'High',
    district_id VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL DEFAULT 'Maharashtra',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    coordinates_geom geometry(Point, 4326) NOT NULL,
    farmer_location JSONB DEFAULT '{}'::JSONB,
    farmer_contact JSONB DEFAULT '{}'::JSONB,
    symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
    temperature NUMERIC(4, 1) DEFAULT 0.0,
    duration NUMERIC(4, 1) DEFAULT 0.0,
    affected_count INTEGER NOT NULL DEFAULT 1,
    notes TEXT DEFAULT '',
    clinical_diagnosis TEXT DEFAULT '',
    investigation_notes TEXT DEFAULT '',
    status case_status_type NOT NULL DEFAULT 'New',
    containment_zone_id UUID, -- Forward reference defined later
    ring_vaccination_drive_id UUID, -- Forward reference defined later
    assigned_vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    containment_started_at TIMESTAMPTZ,
    treatment_started_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    treatment_notes TEXT DEFAULT '',
    prescription TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_district_status ON public.disease_cases(district_id, status, created_at DESC);
CREATE INDEX idx_cases_farmer_id ON public.disease_cases(farmer_id, created_at DESC);
CREATE INDEX idx_cases_assigned_vet ON public.disease_cases(assigned_vet_id, status);
CREATE INDEX idx_cases_coordinates_geom ON public.disease_cases USING GIST(coordinates_geom);

-- 8. Case Timeline (Normalized Audit Table)
CREATE TABLE public.case_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.disease_cases(id) ON DELETE CASCADE,
    status VARCHAR(64) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updater_name VARCHAR(255) DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_timeline_case_id ON public.case_timeline(case_id);

-- 9. Containment Zones Table
CREATE TABLE public.containment_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id VARCHAR(64) NOT NULL UNIQUE,
    case_id UUID REFERENCES public.disease_cases(id) ON DELETE SET NULL,
    disease VARCHAR(255) NOT NULL,
    district VARCHAR(128) NOT NULL,
    block VARCHAR(128) DEFAULT '',
    village VARCHAR(128) DEFAULT '',
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    center_geom geometry(Point, 4326) NOT NULL,
    radius_km NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
    status containment_status_type NOT NULL DEFAULT 'ACTIVE',
    enforced_rules TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_by_vet_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    creator_name VARCHAR(255) DEFAULT '',
    ring_vaccination_drive_id UUID, -- Forward reference
    notes TEXT DEFAULT '',
    contained_at TIMESTAMPTZ,
    lifted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_containment_district_status ON public.containment_zones(district, status);
CREATE INDEX idx_containment_center_geom ON public.containment_zones USING GIST(center_geom);

-- Add foreign key constraint back to disease_cases
ALTER TABLE public.disease_cases
    ADD CONSTRAINT fk_case_containment_zone
    FOREIGN KEY (containment_zone_id) REFERENCES public.containment_zones(id) ON DELETE SET NULL;

-- 10. Vaccination Drives Table
CREATE TABLE public.vaccination_drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id VARCHAR(64) UNIQUE,
    state VARCHAR(128) NOT NULL DEFAULT 'Maharashtra',
    district VARCHAR(128) NOT NULL,
    block VARCHAR(128) NOT NULL,
    village VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    coordinates_geom geometry(Point, 4326) NOT NULL,
    vaccine VARCHAR(255) NOT NULL,
    vaccine_full_name VARCHAR(255),
    target_species VARCHAR(128) DEFAULT 'Cattle & Buffalo',
    camp_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_time VARCHAR(32) DEFAULT '09:30 AM',
    end_time VARCHAR(32) DEFAULT '04:00 PM',
    cost VARCHAR(64) DEFAULT 'Free (Govt Drive)',
    is_free BOOLEAN NOT NULL DEFAULT TRUE,
    organizing_hospital VARCHAR(255) NOT NULL,
    assigned_officer VARCHAR(255) NOT NULL,
    assigned_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_number VARCHAR(32) DEFAULT '1962',
    capacity INTEGER NOT NULL DEFAULT 200,
    booked_slots INTEGER NOT NULL DEFAULT 0,
    remaining_slots INTEGER NOT NULL DEFAULT 200,
    target_count INTEGER NOT NULL DEFAULT 200,
    covered_count INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    status drive_status_type NOT NULL DEFAULT 'Upcoming',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vacc_drives_district_block ON public.vaccination_drives(district, block, status);
CREATE INDEX idx_vacc_drives_camp_date ON public.vaccination_drives(camp_date);
CREATE INDEX idx_vacc_drives_geom ON public.vaccination_drives USING GIST(coordinates_geom);

-- Add foreign key constraints back
ALTER TABLE public.disease_cases
    ADD CONSTRAINT fk_case_vaccination_drive
    FOREIGN KEY (ring_vaccination_drive_id) REFERENCES public.vaccination_drives(id) ON DELETE SET NULL;

ALTER TABLE public.containment_zones
    ADD CONSTRAINT fk_zone_vaccination_drive
    FOREIGN KEY (ring_vaccination_drive_id) REFERENCES public.vaccination_drives(id) ON DELETE SET NULL;

-- 11. Vaccination Camp Registrations (Normalized Child Table)
CREATE TABLE public.vaccination_camp_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES public.vaccination_drives(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    farmer_name VARCHAR(255) DEFAULT '',
    farmer_phone VARCHAR(32) DEFAULT '',
    animal_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    animal_count INTEGER NOT NULL DEFAULT 1,
    token VARCHAR(64) NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_camp_regs_drive ON public.vaccination_camp_registrations(drive_id);
CREATE INDEX idx_camp_regs_farmer ON public.vaccination_camp_registrations(farmer_id);
CREATE INDEX idx_camp_regs_phone ON public.vaccination_camp_registrations(farmer_phone);

-- 12. Surveillance Reports Table
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id VARCHAR(64) NOT NULL UNIQUE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    animal_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
    herd_id VARCHAR(64),
    species animal_species NOT NULL DEFAULT 'Cattle',
    symptoms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    mortality_count INTEGER NOT NULL DEFAULT 0,
    affected_count INTEGER NOT NULL DEFAULT 1,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_geom geometry(Point, 4326) NOT NULL,
    village VARCHAR(255) NOT NULL,
    block VARCHAR(255) NOT NULL,
    district VARCHAR(255) NOT NULL DEFAULT 'Pune',
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    temperature NUMERIC(4, 1) DEFAULT 0.0,
    duration NUMERIC(4, 1) DEFAULT 0.0,
    status report_status_type NOT NULL DEFAULT 'Reported',
    reporter_contact JSONB DEFAULT '{}'::JSONB,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_district_block ON public.reports(district, block, created_at DESC);
CREATE INDEX idx_reports_location_geom ON public.reports USING GIST(location_geom);

-- 13. AI Triage Results Table
CREATE TABLE public.triage_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
    risk_level risk_level_type NOT NULL DEFAULT 'Low',
    suspected_diseases JSONB NOT NULL DEFAULT '[]'::JSONB,
    recommended_action TEXT NOT NULL,
    immediate_first_aid TEXT[] DEFAULT ARRAY[]::TEXT[],
    outbreak_flag BOOLEAN NOT NULL DEFAULT FALSE,
    cluster_details JSONB DEFAULT '{}'::JSONB,
    explanation TEXT NOT NULL,
    visual_score NUMERIC(5, 4),
    model_version VARCHAR(128) DEFAULT 'lsd_model.keras (EfficientNetB0)',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Lab Referrals Table
CREATE TABLE public.lab_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    sample_type VARCHAR(128) NOT NULL DEFAULT 'Blood / Serum',
    collection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    referred_lab VARCHAR(255) NOT NULL DEFAULT 'District Disease Diagnostic Laboratory (DDDL), Pune',
    status VARCHAR(64) NOT NULL DEFAULT 'Collected',
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    result_summary JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_referrals_report ON public.lab_referrals(report_id);

-- 15. Advisories Table
CREATE TABLE public.advisories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    title_en TEXT NOT NULL,
    title_hi TEXT NOT NULL,
    message_en TEXT NOT NULL,
    message_hi TEXT NOT NULL,
    severity risk_level_type NOT NULL DEFAULT 'Moderate',
    disease VARCHAR(255) DEFAULT 'General Health',
    target_village VARCHAR(255) DEFAULT 'All',
    target_block VARCHAR(255) DEFAULT 'All',
    target_district VARCHAR(255) DEFAULT 'Pune',
    issued_by VARCHAR(255) DEFAULT 'District Animal Husbandry Department',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.disease_cases(id) ON DELETE CASCADE,
    case_number VARCHAR(64) DEFAULT '',
    type VARCHAR(64) NOT NULL DEFAULT 'NEW_CASE_ALERT',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    district VARCHAR(128) NOT NULL,
    status notification_status_type NOT NULL DEFAULT 'DELIVERED',
    retry_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    error TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_status ON public.notifications(recipient_id, status, created_at DESC);

-- 17. Scan Images Table
CREATE TABLE public.scan_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    disease VARCHAR(255) DEFAULT 'Unknown',
    risk_level VARCHAR(64) DEFAULT 'Moderate',
    confidence NUMERIC(5, 2) DEFAULT 0.0,
    symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
    temperature NUMERIC(4, 1) DEFAULT 0.0,
    duration NUMERIC(4, 1) DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scan_images_animal ON public.scan_images(animal_id);
```

---

## G. Proposed Relationships and Foreign Keys

| Parent Table | Child Table | Foreign Key Column | Action On Delete | Business Reason |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | `animals` | `animals.owner_id` | `CASCADE` | When a farmer account is deleted, their animal profiles are removed. |
| `animals` | `animal_timeline` | `animal_timeline.animal_id` | `CASCADE` | Timeline entries belong to the animal lifecycle. |
| `animals` | `animal_vaccinations`| `animal_vaccinations.animal_id` | `CASCADE` | Individual vaccination logs are tied directly to the animal. |
| `animals` | `animal_treatments` | `animal_treatments.animal_id` | `CASCADE` | Treatment records belong to the animal. |
| `profiles` | `animal_treatments` | `animal_treatments.vet_id` | `SET NULL` | If a veterinarian account is removed, treatment record is preserved. |
| `profiles` | `disease_cases` | `disease_cases.farmer_id` | `RESTRICT` | Prevent deletion of farmer records with active clinical cases. |
| `profiles` | `disease_cases` | `disease_cases.assigned_vet_id`| `SET NULL` | If an assigned vet leaves, the case becomes unassigned for reclaim. |
| `animals` | `disease_cases` | `disease_cases.animal_id` | `SET NULL` | If an animal record is deleted, the historical case log remains intact. |
| `disease_cases`| `case_timeline` | `case_timeline.case_id` | `CASCADE` | Status history is bound to the parent case. |
| `disease_cases`| `containment_zones`| `containment_zones.case_id` | `SET NULL` | Containment zones remain active even if case is archived. |
| `containment_zones`| `disease_cases` | `disease_cases.containment_zone_id` | `SET NULL` | Case references the active containment zone. |
| `vaccination_drives`| `disease_cases`| `disease_cases.ring_vaccination_drive_id` | `SET NULL` | Case references the emergency ring camp. |
| `vaccination_drives`| `vaccination_camp_registrations` | `registrations.drive_id` | `CASCADE` | Registrations belong to the specific drive. |
| `profiles` | `vaccination_camp_registrations` | `registrations.farmer_id` | `SET NULL` | Preserves slot count and token even if farmer deletes account. |
| `profiles` | `reports` | `reports.reporter_id` | `RESTRICT` | Reports cannot have dangling orphan reporters. |
| `reports` | `triage_results` | `triage_results.report_id` | `CASCADE` | 1-to-1 relationship between report and AI triage result. |
| `reports` | `lab_referrals` | `lab_referrals.report_id` | `CASCADE` | Lab samples originate from a specific report. |
| `profiles` | `notifications` | `notifications.recipient_id`| `CASCADE` | Notifications are owned by the recipient user. |
| `disease_cases`| `notifications` | `notifications.case_id` | `CASCADE` | Notifications reference the disease case. |

---

## H. Authentication Migration Strategy

### Current Authentication Overview:
- Custom JWT issued via `jsonwebtoken.sign({ id }, JWT_SECRET, { expiresIn: '7d' })`.
- Users log in with either **Email** OR **Mobile Phone Number**.
- Password verified with `bcrypt.compare(enteredPassword, user.passwordHash)`.
- Request authorization checks `req.user.role` extracted by `middleware/auth.js`.

### Target Architecture:
We recommend a **Dual-Compatible Supabase Architecture**:
1. **Option 1 (Recommended — Phased Hybrid):**
   - Keep the Express `/api/auth/register` and `/api/auth/login` endpoints operational.
   - Replace Mongoose queries with PostgreSQL queries against `public.profiles`.
   - Issue JWTs signed with Supabase's `JWT_SECRET` containing the standard Supabase claims:
     ```json
     {
       "sub": "user_uuid",
       "role": "authenticated",
       "user_role": "farmer",
       "district": "Pune",
       "iss": "supabase",
       "exp": 1773456789
     }
     ```
   - **Why:** This ensures **100% backward compatibility** with the web frontend, mobile Expo app, and Next.js vet portal without forcing every farmer to undergo password resets or SMS OTP reconfiguration during the migration.
2. **Option 2 (Supabase GoTrue Native):**
   - Migrate users into Supabase's `auth.users` table using a server-side migration script with the Supabase Admin API (`supabase.auth.admin.createUser`).
   - Trigger a PostgreSQL trigger `on_auth_user_created` that automatically inserts/updates `public.profiles`.

---

## I. Storage Migration Strategy

### Current Image Upload Pipeline:
- Route: `POST /api/upload/scan-image` (`uploadRoutes.js`) and embedded in `POST /api/reports`.
- Incoming format: Base64 data URL (`data:image/jpeg;base64,...`).
- Storage target: Local server filesystem in `backend/uploads/scans/scan-[timestamp]-[rand].jpg`.
- Served statically via `app.use('/uploads', express.static(...))`.
- Metadata saved to `ScanImage` collection.

### Supabase Storage Replacement:
1. **Bucket Creation:**
   - Create a dedicated public Supabase Storage bucket: `livestock-scans`.
2. **Upload Adapter:**
   - In `backend/routes/uploadRoutes.js`, decode the incoming Base64 buffer:
     ```javascript
     const { data, error } = await supabase.storage
       .from('livestock-scans')
       .upload(`scans/${filename}`, fileBuffer, {
         contentType: `image/${extension}`,
         upsert: false
       });
     ```
   - Retrieve the public URL:
     ```javascript
     const { data: { publicUrl } } = supabase.storage
       .from('livestock-scans')
       .getPublicUrl(`scans/${filename}`);
     ```
   - Store `publicUrl` into the `scan_images` table in PostgreSQL.
3. **Migration of Existing Files:**
   - A one-time Node.js migration script scans `backend/uploads/scans/`, uploads all existing `.jpg` files to `livestock-scans/scans/`, and updates the image URLs in the database.

---

## J. Realtime Requirements

### Current Realtime Mechanism:
- `backend/services/notificationService.js` implements a custom Server-Sent Events (SSE) stream on `GET /api/cases/stream`.
- Connected clients (`this.clients = new Map()`) receive unicast and multicast events:
  - `connected`
  - `ping` (heartbeat every 25s)
  - `NEW_CASE_ALERT` (when a new case is reported in their district)
  - `CASE_CLAIMED` (when a vet claims a case)
  - `CASE_STATUS_UPDATE` (when a case advances across stages)
  - `CONTAINMENT_ZONE_CREATED`
  - `CONTAINMENT_ZONE_UPDATED`
  - `RING_VACCINATION_SCHEDULED`

### Supabase Realtime Architecture:
1. **Direct Client Realtime (Modern Path):**
   - Frontends can subscribe directly to Supabase Realtime channels using the Supabase client:
     ```javascript
     supabase
       .channel('district-cases')
       .on('postgres_changes', {
         event: '*',
         schema: 'public',
         table: 'disease_cases',
         filter: `district_id=eq.${userDistrict}`
       }, (payload) => {
         handleCaseEvent(payload);
       })
       .subscribe();
     ```
2. **Backend SSE Compatibility Layer (Zero-Frontend-Breakage Path):**
   - The backend `notificationService.js` will listen to PostgreSQL `LISTEN/NOTIFY` or Supabase Realtime and continue to pipe events down `GET /api/cases/stream` to keep the existing `caseService.subscribeToCaseStream()` functioning seamlessly without modifying frontend bundle code.

---

## K. GIS / PostGIS Requirements

Spatial analysis is foundational to SIH Problem Statement 128 for outbreak prevention and emergency containment.

### Current Implementation:
- Coordinates stored as `{ lat: Number, lng: Number }`.
- Distance computed in Node.js via JavaScript Haversine formulas.
- Outbreak clusters computed in memory by nested loops in `caseController.js` comparing pairs `<= 5.0 km`.

### PostGIS Transformation:
1. **Geometry Column:**
   - Add `geometry(Point, 4326)` to `profiles`, `disease_cases`, `reports`, `containment_zones`, and `vaccination_drives`.
   - Maintain automated triggers that keep `coordinates_geom` synced with `latitude` and `longitude`:
     ```sql
     CREATE OR REPLACE FUNCTION update_geom_column()
     RETURNS TRIGGER AS $$
     BEGIN
       IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
         NEW.coordinates_geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
       END IF;
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;

     CREATE TRIGGER trg_disease_cases_geom
     BEFORE INSERT OR UPDATE ON public.disease_cases
     FOR EACH ROW EXECUTE FUNCTION update_geom_column();
     ```
2. **Spatial Outbreak Clustering Query (`ST_ClusterDBSCAN`):**
   - Instead of nested JavaScript Haversine loops, execute spatial clustering natively in PostgreSQL:
     ```sql
     SELECT
         disease,
         ST_ClusterDBSCAN(coordinates_geom::geometry, eps := 0.045, minpoints := 2) OVER(PARTITION BY disease) AS cluster_id,
         id, case_id, species, risk, status, affected_count, latitude, longitude
     FROM public.disease_cases
     WHERE district_id ILIKE $1
       AND status NOT IN ('Resolved', 'RESOLVED');
     ```
3. **Nearby Veterinarian / Vaccination Drive Proximity:**
   - Utilize PostGIS `ST_DWithin` and `ST_Distance` on geography:
     ```sql
     SELECT
         id, name, phone, clinic_name, specialization, rating,
         ST_Distance(location_geom::geography, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography) / 1000.0 AS distance_km
     FROM public.profiles
     WHERE role = 'veterinarian'
       AND is_active = true
       AND ST_DWithin(location_geom::geography, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography, $radius_meters)
     ORDER BY distance_km ASC
     LIMIT 3;
     ```

---

## L. Row Level Security (RLS) Strategy

Row Level Security ensures multi-tenant role isolation at the database layer.

```sql
-- Enable RLS across core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containment_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_drives ENABLE ROW LEVEL SECURITY;

-- Helper functions to extract claims from JWT
CREATE OR REPLACE FUNCTION auth.current_user_role() RETURNS user_role AS $$
    SELECT (auth.jwt() ->> 'user_role')::user_role;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.current_user_district() RETURNS TEXT AS $$
    SELECT (auth.jwt() ->> 'district')::TEXT;
$$ LANGUAGE sql STABLE;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = auth_user_id);

-- Animals Policies
CREATE POLICY "Farmers can view and edit their own animals"
ON public.animals FOR ALL TO authenticated
USING (owner_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
WITH CHECK (owner_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Veterinary staff can view animals in their district"
ON public.animals FOR SELECT TO authenticated
USING (auth.current_user_role() IN ('field_worker', 'veterinarian', 'officer', 'admin'));

-- Disease Cases Policies
CREATE POLICY "Farmers can view their own reported cases"
ON public.disease_cases FOR SELECT TO authenticated
USING (farmer_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vets and Field Workers can view and claim district cases"
ON public.disease_cases FOR ALL TO authenticated
USING (
    auth.current_user_role() = 'admin' OR
    (auth.current_user_role() IN ('field_worker', 'veterinarian', 'officer') AND district_id ILIKE auth.current_user_district())
);
```

---

## M. Required Environment Variables

### Environment Diff & Specification:

```diff
# Core Server Configuration
PORT=5000
NODE_ENV=development

-# MongoDB Connection
-MONGODB_URI=mongodb://127.0.0.1:27017/pashurakshak

+# Supabase & PostgreSQL Connection
+SUPABASE_URL=https://[your-project-ref].supabase.co
+SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
+SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
+DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
+DIRECT_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Authentication & Security
-JWT_SECRET=pashurakshak_jwt_secret_key_2026_secure
+JWT_SECRET=[supabase-jwt-secret-or-custom-secret]
JWT_EXPIRES_IN=7d

# AI Microservice & External Services
AI_SERVICE_URL=http://127.0.0.1:5050
PYTHON_PATH=python
KERAS_BACKEND=tensorflow
GEMINI_API_KEY=AQ.Ab8RN6LlpZmkh0ZeSDr0jkuh4StO6xzHSNoN49QjrSrc-30rOA
```

---

## N. Migration Risks & Mitigation Matrix

| Risk ID | Risk Description | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **R-1** | **Bcrypt Password Hash Incompatibility:** MongoDB stored passwords with `bcryptjs` 10 rounds; direct Supabase GoTrue authentication might fail if GoTrue expects standard argon2 or different salt formats. | High | High | Use the Hybrid Auth strategy: maintain the Express authentication route verifying existing bcrypt hashes against `public.profiles.password_hash`, issuing Supabase-compatible JWTs. |
| **R-2** | **ObjectId vs. UUID Format Breaks Frontends:** Frontends expecting 24-character hexadecimal MongoDB ObjectIds (e.g., `_id.toString()`) might fail if receiving 36-character UUIDs. | High | Medium | Add compatibility mapping in Express controllers so both `id` and `_id` are populated with the UUID string on all outgoing JSON responses. |
| **R-3** | **Race Conditions in Concurrent Case Claims:** Two veterinarians claiming the same disease referral simultaneously. | High | Low | Implement PostgreSQL Atomic CAS: `UPDATE disease_cases SET status = 'Investigating', assigned_vet_id = $1 WHERE id = $2 AND status = 'New' AND assigned_vet_id IS NULL RETURNING *;`. Check rows affected; if 0, return `409 Conflict`. |
| **R-4** | **PostGIS Extension Availability:** Cloud hosting or local dev environments lacking the PostGIS binary extension. | High | Low | Include fallback Haversine SQL functions in pure PL/pgSQL if PostGIS extensions cannot be initialized in a restricted environment. |
| **R-5** | **Offline Sync ID Mismatches:** Mobile or web apps attempting to sync cached offline reports using temporary numeric or string IDs. | Medium | Medium | Maintain the existing `caseId` string scheme (e.g., `CASE-2026-PUN-1234`) as a secondary unique key alongside the UUID primary key. |
| **R-6** | **Disruption of Child Python AI Process:** Modifying backend dependencies could break the Python `child_process.spawn`. | High | Low | Do not modify `server.js` child process spawning logic or `ai_service.py`. The Python service communicates purely over HTTP localhost and is unaffected by the DB change. |

---

## O. Testing Strategy

### 1. Database Schema & Migration Verification:
- Run PostgreSQL migration script against Supabase instance.
- Validate foreign key constraints, triggers, and PostGIS index creation.
- Execute automated seeder script inserting demo users, animals, disease cases, and vaccination camps into PostgreSQL.

### 2. Automated Regression Test Suite (`backend/test_api.js`):
- Health check verification: `GET /api/health`.
- Authentication verification: Farmer login via mobile phone and email.
- Disease triage & report submission: `POST /api/reports` verifying AI triage response.
- Case claim atomic test: Simulate 2 concurrent requests claiming the same case to ensure only one succeeds and the other receives 409.
- Dashboard aggregation verification: `GET /api/dashboard/summary` matching KPI calculations.
- Vaccination drive booking & appointment token issuance: `POST /api/vaccination-drives/:id/register`.
- IVR Webhook verification: `POST /api/ivr/webhook`.

### 3. Frontend End-to-End Verification:
- **Farmer Web App:** Test animal registration, disease detection workflow with photo upload, nearby vet map search, and camp registration.
- **Veterinarian Web App (`FieldWorkerDashboard`):** Test referral case queue filtering, case claim, 5-stage status transition, containment zone creation, and ring vaccination scheduling.
- **Next.js Portal (`vet-portal/`):** Verify dashboard KPI statistics and case queue data retrieval.
- **Mobile Expo App (`farmer-app/`):** Verify offline outbox queue and connectivity restore listener.

---

## P. Rollback Strategy

To guarantee zero operational downtime and zero risk of data loss:

1. **Phase 1 (Inspection & Schema Provisioning):**
   - No code modifications. PostgreSQL schema and Supabase project provisioned in isolation.
2. **Phase 2 (Dual-Database Abstraction Layer):**
   - Implement a Repository Pattern or Database Client layer with an environment toggle:
     `DATABASE_DRIVER=supabase` vs `DATABASE_DRIVER=mongodb`.
3. **Phase 3 (Data Backfill & Verification):**
   - ETL script copies all historical records from MongoDB to Supabase PostgreSQL.
   - Run automated verification scripts verifying checksums and row counts.
4. **Phase 4 (Shadow Read/Write):**
   - Backend writes to both MongoDB and Supabase, reading primarily from Supabase.
5. **Instant Rollback Mechanism:**
   - If any unhandled exception occurs or latency exceeds SLA, flipping `DATABASE_DRIVER=mongodb` reverts 100% of queries back to MongoDB without code redeployment.
   - MongoDB collections and schemas will remain completely intact in the repository throughout the entire migration process.

---

## Conclusion & Next Steps

This migration plan provides a comprehensive, field-by-field, and query-by-query blueprint to successfully transition **Livestock Saathi** from MongoDB to **Supabase PostgreSQL**.

**Execution is halted. Ready to proceed upon user review and authorization.**
