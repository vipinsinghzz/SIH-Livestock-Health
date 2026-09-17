# Phase 8.2 — Farmer Android Map + Outbreak/Risk Information Report

**Project**: Livestock Saathi — AI-Powered Livestock Health Assistant  
**Repository**: SIH-Livestock-Health  
**Scope**: Mobile-only implementation (`mobile/`), strictly adhering to read-only constraints on `backend/`, `frontend/`, `ml/`, and `supabase/`.  
**Execution Date**: September 17, 2026  

---

## 1. Existing GIS Endpoints Discovered

A comprehensive read-only audit of `backend/routes/`, `backend/controllers/caseController.js`, `backend/controllers/veterinaryController.js`, `backend/controllers/vaccinationController.js`, `backend/services/gisService.js`, and `supabase/` identified the following spatial endpoints:

| Endpoint | Method | Auth | Role Access | Primary Function |
| :--- | :--- | :--- | :--- | :--- |
| `/api/veterinarians/nearby` | `GET` | Optional / Bearer | **Public / Farmer / All** | GPS proximity search for certified veterinarians, clinics, and emergency availability. |
| `/api/cases/containment-zones`| `GET` | Bearer (`protect`) | **Farmer / All Authenticated** | Active quarantine perimeters with center coords, radius, and enforced movement rules. |
| `/api/cases/nearby` | `GET` | Bearer (`protect`) | **Farmer (Fuzzed) / Staff** | PostGIS `ST_DWithin` disease reports within radius with built-in farmer coordinate fuzzing. |
| `/api/vaccination-drives` | `GET` | Optional / Bearer | **Public / Farmer / All** | Government vaccination drives and camps with spatial coordinates and coverage metrics. |
| `/api/cases/clusters` | `GET` | Bearer (`authorize`)| **Staff Only** (Vet/Officer/Admin) | Spatial outbreak proximity clustering (<= 5km density). **Blocked for farmers with 403**. |
| `/api/cases/risk-analysis` | `GET` | Bearer (`authorize`)| **Staff Only** (Vet/Officer/Admin) | On-demand epidemiological transmission model. **Blocked for farmers with 403**. |

---

## 2. Exact API Contracts

### A. Nearby Veterinarians (`GET /api/veterinarians/nearby`)
- **Query Params**: `lat`, `lng`, `district`, `emergencyOnly`, `specialization`, `search`, `limit` (default: 25).
- **Response Format**:
  ```json
  {
    "success": true,
    "count": 6,
    "totalAvailable": 6,
    "searchMetadata": {
      "hasGpsLocation": true,
      "distanceSource": "GPS",
      "userCoordinates": { "lat": 18.5204, "lng": 73.8567 },
      "referenceCoordinates": { "lat": 18.5204, "lng": 73.8567 },
      "district": "Pune"
    },
    "nearestVets": [...],
    "veterinarians": [
      {
        "id": "00000000-0000-0000-0000-000000000006",
        "name": "Dr. Rajesh Shinde",
        "role": "field_worker",
        "isActive": true,
        "phone": "+919822088990",
        "district": "Pune",
        "block": "Shirur",
        "latitude": 18.825,
        "longitude": 74.379,
        "clinicName": "Shirur Taluka Veterinary Clinic",
        "specialization": "Bovine Clinical Diagnostics & Triage",
        "emergencyAvailable": true,
        "services": ["Emergency Treatment", "Vaccination", "Clinical Triage"],
        "distanceKm": 64.6
      }
    ]
  }
  ```

### B. Containment Quarantine Zones (`GET /api/cases/containment-zones`)
- **Query Params**: `district`, `status`
- **Response Format**:
  ```json
  {
    "success": true,
    "district": "Pune",
    "count": 1,
    "zones": [
      {
        "id": "zone-uuid",
        "zoneId": "ZONE-PUNE-01",
        "disease": "Foot and Mouth Disease",
        "district": "Pune",
        "block": "Haveli",
        "village": "Manjari",
        "center": { "lat": 18.53, "lng": 73.87 },
        "radiusKm": 5.0,
        "status": "ACTIVE",
        "enforcedRules": ["Movement Restriction", "Mandatory Ring Vaccination"],
        "createdAt": "2026-09-17T12:00:00.000Z"
      }
    ]
  }
  ```

### C. Nearby Cases with Coordinate Fuzzing (`GET /api/cases/nearby`)
- **Query Params**: `lat`, `lng`, `radiusKm` (capped at 10.0 for farmers), `days` (default: 30), `district`
- **Backend Privacy Enforcement**:
  - Automatically checks `req.user.role === 'farmer'`.
  - Caps radius strictly to 10.0 km and results to 30 cases.
  - Applies `gisService.fuzzCoordinates(lat, lng, 1.5)` creating a randomized 1.5km ring around peer farms.
  - Masks village name to `'Vicinity (~1.5km)'` and sets `isFuzzed: true`.
  - Excludes all personal farmer names and phone numbers.
- **Response Format**:
  ```json
  {
    "success": true,
    "count": 2,
    "radiusKm": 10.0,
    "days": 30,
    "cases": [
      {
        "id": "case-uuid",
        "caseId": "CASE-2026-0042",
        "disease": "Lumpy Skin Disease",
        "risk": "High",
        "species": "Cattle",
        "latitude": 18.5421,
        "longitude": 73.8692,
        "village": "Vicinity (~1.5km)",
        "isFuzzed": true,
        "createdAt": "2026-09-17T10:00:00.000Z"
      }
    ]
  }
  ```

### D. Vaccination Camps (`GET /api/vaccination-drives`)
- **Query Params**: `district`, `status`, `lat`, `lng`, `radius`
- **Response Format**:
  ```json
  {
    "success": true,
    "count": 3,
    "drives": [
      {
        "id": "drive-uuid",
        "title": "National Animal Disease Control FMD Drive",
        "vaccine": "FMD Trivalent Vaccine",
        "district": "Pune",
        "village": "Wagholi",
        "latitude": 18.58,
        "longitude": 73.98,
        "status": "Active",
        "coveragePercentage": 74,
        "distanceKm": 12.3
      }
    ]
  }
  ```

---

## 3. Farmer-Accessible GIS Data

Farmers can legitimately access:
1. **Nearby Veterinary Dispensaries and Doctors** (Clinics, contact numbers, specializations, distance).
2. **Quarantine Containment Zones** (Circular perimeters, affected disease, quarantine rules).
3. **Privacy-Preserving Vicinity Disease Cases** (Nearby disease warnings within 10 km).
4. **Vaccination Camp Locations** (Dates, vaccine types, village venues).

Farmers **cannot** access:
1. **Raw Outbreak Spatial Clusters** (`/api/cases/clusters` returns HTTP 403 Forbidden).
2. **Epidemiological Risk Modeling Pipeline** (`/api/cases/risk-analysis` returns HTTP 403 Forbidden).

---

## 4. Privacy Analysis

- **Farmer Anonymity**: Peer farmer names, phone numbers, and individual identification are completely stripped by the backend `GET /api/cases/nearby` handler before serialization.
- **Coordinate Fuzzing**: Peer farm coordinates are displaced within a ~1.5 km random ring radius using `fuzzCoordinates` in `backend/services/gisService.js`.
- **Village Masking**: Specific farm cadastral/village names for peer reports are masked to `'Vicinity (~1.5km)'`.
- **Farmer's Own Cases**: If a case belongs to the authenticated farmer, exact coordinates are preserved so the farmer can view their own animal.
- **Client Handling**: Mobile map cards display only epidemiological data (disease, species, risk tier, vicinity).

---

## 5. Map Library and Version

- **Library**: `react-native-maps` version `1.18.0` (installed via `npx expo install react-native-maps`).
- **Location Module**: `expo-location` version `~18.0.7` (installed via `npx expo install expo-location`).
- **Compatibility**: Verified against Expo SDK 52 (`~52.0.30`) with `npx expo-doctor` (18/18 checks passed).

---

## 6. Implemented Map Layers

The map includes interactive horizontal pill layer toggles:
1. **🏥 Vet Help** (`vets`): Renders green pin markers for certified veterinarians and taluka dispensaries.
2. **🛡️ Containment** (`containment`): Renders red semi-transparent circular overlays (`Circle`) showing active quarantine perimeters and enforced movement restrictions.
3. **⚠️ Nearby Cases** (`cases`): Renders color-coded risk markers (Amber for Moderate, Crimson for High/Critical) for fuzzed disease cases within 10km.
4. **💉 Camps** (`camps`): Renders teal pin markers for government vaccination drives.

---

## 7. Location Permission Behavior

- Android foreground location permission requested via `expo-location` (`Location.requestForegroundPermissionsAsync()`).
- Clear explanatory prompt provided: *"Location access helps locate your nearest veterinary dispensary and regional disease warnings."*
- **If Granted**: Map automatically centers on the device's real GPS coordinates and enables the native location indicator dot (`showsUserLocation={true}`).
- **If Denied**: Non-blocking graceful fallback. Displays an informational top chip: *"📍 Tap to enable GPS for precise nearby veterinary dispensaries"*, while centering on the farmer's registered district centroid (or default Maharashtra center: Pune `18.5204, 73.8567`).

---

## 8. Marker & Polygon Behavior

- **Veterinarian Pin Tap**:
  - Opens bottom sheet card displaying Clinic Name, Doctor Name, Specialization, and Emergency status.
  - Direct action button: `📞 Call Clinic` initiating native phone dialer (`tel:+91...`).
- **Containment Zone Tap**:
  - Highlights perimeter radius in meters.
  - Displays quarantine disease and list of active containment rules (e.g. *"Movement Restriction • Mandatory Ring Vaccination"*).
- **Nearby Case Pin Tap**:
  - Displays disease name, risk tier badge, species, and approximate vicinity.
  - Action button: `🩺 View My Health Cases` navigating to `/(farmer)/cases`.
- **Vaccination Camp Pin Tap**:
  - Displays camp title, vaccine, village venue, and coverage.
  - Action button: `💉 Open Vaccination Schedule` navigating to `/(farmer)/vaccination`.

---

## 9. Offline Behavior

- If offline or network connection is interrupted:
  - Displays top banner: **"Map data unavailable offline • Live layers may be incomplete"** with a functional **"Retry"** button.
  - The vector base map remains pan-able and zoom-able without crashing.
  - Zero fabricated or mock cached markers are rendered.

---

## 10. Mock-Data Audit

- Grep search executed across:
  - `mobile/src/types/map.ts`
  - `mobile/src/services/mapService.ts`
  - `mobile/app/(farmer)/map/index.tsx`
- Search queries: `mock`, `dummy`, `sample`, `fake`, `hardcoded coordinates`, `hardcoded hospitals`, `hardcoded veterinary clinics`, `test markers`.
- **Result**: **ZERO** production fake map data.

---

## 11. Performance Considerations

- Uses aggregated spatial endpoints (`/api/veterinarians/nearby`, `/api/cases/containment-zones`, `/api/cases/nearby`, `/api/vaccination-drives`).
- Avoids N+1 requests: All layers are loaded concurrently using `Promise.allSettled`.
- Map re-renders during panning are minimized via `useCallback` and memoized summary strings.

---

## 12. Security

- All requests use existing JWT authentication headers via `api.ts`.
- GPS coordinates are only transmitted as query parameters to endpoints that legitimately require distance calculations (`/veterinarians/nearby`, `/cases/nearby`).
- No private keys, Supabase service-role keys, or secrets exist in the mobile code.

---

## 13. Test Results

### A. Dedicated Mobile Map GIS Unit Tests (`tests/test_mobile_map.js`)
- Test 1: Direct lat/lng coordinate extraction — **PASS**
- Test 2: PostGIS GeoJSON coordinate extraction (`[lng, lat]` -> `{ lat, lng }`) — **PASS**
- Test 3: Zero/invalid coordinates rejection — **PASS**
- Test 4: Containment zone circle geometry (radius in meters for Circle) — **PASS**
- Test 5: Privacy-preserving nearby case normalization (zero private identity) — **PASS**
- Test 6: Safe default region center coordinates — **PASS**
- **Summary**: 6/6 tests passed with 0 failures.

### B. Mobile TypeScript Compilation
- Command: `cd mobile && npx tsc --noEmit`
- **Result**: Exited with code 0 (0 errors).

### C. Expo Doctor
- Command: `cd mobile && npx expo-doctor`
- **Result**: 18/18 checks passed. No issues detected!

### D. Static Android Bundle Export
- Command: `cd mobile && npx expo export --platform android`
- **Result**: Exited with code 0. Bundled 1051 modules into `_expo/static/js/android/entry-ff92237eaa3545fdb5bcf44282b2f187.hbc (3.74 MB)`.

### E. Frontend Production Build
- Command: `cd frontend && npm run build`
- **Result**: Exited with code 0 (built in 5.26s).

### F. Backend Auth Migration Regression Suite
- Command: `node tests/test_auth_migration.js`
- **Result**: 56/56 checks passed.

### G. Prior Phase Mobile Notifications Regression
- Command: `node tests/test_mobile_notifications.js`
- **Result**: 8/8 checks passed.

---

## 14. Scope Verification

- Read-only directory diff:
  ```bash
  git diff -- frontend/ backend/ ml/ supabase/
  ```
  **Result**: Exactly **0 diffs** across all four read-only directories.
- Working tree check (`git status --short`):
  - Modified: `mobile/app/(farmer)/map/index.tsx`
  - Modified: `mobile/package.json`
  - Modified: `mobile/package-lock.json`
  - Untracked: `mobile/src/services/mapService.ts`
  - Untracked: `mobile/src/types/map.ts`
  - Untracked: `tests/test_mobile_map.js`
  - Untracked: `PHASE8_2_FARMER_MAP_REPORT.md`

---

## 15. Remaining GIS Limitations

1. **Staff-Only Outbreak Clusters**: The backend endpoint `/api/cases/clusters` is restricted by role authorization to `veterinarian`, `field_worker`, `officer`, and `admin`. Farmers receive 403 if calling this endpoint. Consequently, outbreak information for farmers is provided through Containment Zones and Privacy-Fuzzed Nearby Cases rather than the raw clustering endpoint.
2. **Offline Tile Caching**: The vector map tiles require an internet connection; if disconnected, the map indicates an offline banner.

---

## FARMER MAP STATUS

**PARTIAL — SOME GIS LAYERS NOT AVAILABLE TO FARMERS**

### Explanation:
The Farmer Android Map is fully functional, production-connected, and verified:
- `react-native-maps` and `expo-location` are installed and integrated with Expo SDK 52.
- 4 real spatial layers are operational: **Veterinary Dispensaries & Clinics**, **Containment Quarantine Zones**, **Privacy-Fuzzed Local Disease Cases**, and **Vaccination Camps**.
- However, status is **PARTIAL** because raw outbreak spatial clustering (`/api/cases/clusters`) and risk analysis modeling (`/api/cases/risk-analysis`) are restricted to staff roles (`veterinarian`, `officer`, `admin`) by backend authorization policy and cannot be accessed directly by farmers.
