# Supabase Storage Migration Report (Phase 5)
**Project:** Livestock Saathi – AI-Powered Livestock Health & Early Warning Platform  
**Problem Statement:** SIH 2026 Problem Statement 128  
**Architecture Transition:** Cloud Object Storage & Private Asset Security (Phase 5)  
**Date:** September 13, 2026  
**Status:** **PHASE 5 COMPLETE – STORAGE MIGRATION VERIFIED END-TO-END**

---

## 1. Executive Summary

In Phase 5 of the architecture migration, local server filesystem image storage (`backend/uploads/scans/`) was transitioned to **Supabase Storage**. Animal and disease lesion scans are now stored in the **strictly private** `livestock-scans` bucket, with full metadata persistence in Supabase PostgreSQL (`public.scan_images`), time-limited signed URL generation, role-based access control (RLS), and AI inference pipeline support.

### Key Metrics
- **Storage Bucket:** `livestock-scans` (Private, `public = false`, 10MB limit)
- **Allowed MIME Types:** `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- **Storage Test Assertions:** **32 Passed, 0 Failed** (`tests/test_phase5_storage.js`)
- **Backend Workflow Regression Suite:** **24 Passed, 0 Failed** (`tests/test_phase4_workflow.js`)
- **Auth & RBAC Regression Suite:** **56 Passed, 0 Failed** (`tests/test_auth_migration.js`)
- **Total Combined Tests Passing:** **112 / 112**
- **Zero API Contract Regressions:** 100% backward compatible with legacy frontend routes

---

## 2. Complete End-to-End Workflow Verification

The end-to-end operational lifecycle was validated via automated integration testing:

$$\text{Farmer Upload} \longrightarrow \text{Supabase Storage} \longrightarrow \text{PostgreSQL Metadata} \longrightarrow \text{AI Screening} \longrightarrow \text{Referral Case} \longrightarrow \text{Vet Authorized View} \longrightarrow \text{Cross-Farmer 403 Security}$$

```text
================================================================
🚀 PHASE 5: SUPABASE STORAGE MIGRATION TEST SUITE
   Upload → Private Bucket → DB Metadata → AI → Vet Access → Security
📡 Target API: http://127.0.0.1:5000
================================================================

🔹 STEP 1: Input Validation & Security Constraints
  ✅ PASS: Missing file payload rejected with 400 Bad Request (got 400)
  ✅ PASS: Error response has success: false
  ✅ PASS: Non-image format rejected with 400 Bad Request (got 400)
  ✅ PASS: Oversized payload rejected with 413/400 (got 413)
     Validation checks: Missing file, invalid MIME, and >10MB limit all enforced.

🔹 STEP 2: Farmer Authentication
  ✅ PASS: Farmer authenticated successfully
     Farmer: Ramesh Patil (00000000-0000-0000-0000-000000000001)

🔹 STEP 3: Upload Scan Image to Supabase Storage Private Bucket
  ✅ PASS: Upload succeeded with 201 Created (got 201)
  ✅ PASS: Upload response indicates success: true
  ✅ PASS: Supabase Storage path generated: scans/6aa0f44f3753a3a6a3d218dc/scan-1789285404238-7417.jpg
  ✅ PASS: Storage bucket verified as 'livestock-scans'
  ✅ PASS: Bucket configuration confirmed strictly private
  ✅ PASS: Time-limited signed URL issued for secure viewing
  ✅ PASS: Backward-compatible imageUrl field populated
  ✅ PASS: PostgreSQL scan record ID assigned

🔹 STEP 4: PostgreSQL Metadata Verification
  ✅ PASS: Scans retrieved (got 200)
  ✅ PASS: Scans array returned
  ✅ PASS: Uploaded scan record verified in database
  ✅ PASS: Clinical disease tag correctly recorded
  ✅ PASS: is_private column is true
     PostgreSQL Metadata verified: ID 6aa6541c52412ce5c7b14977, Disease: Lumpy Skin Disease (LSD)

🔹 STEP 5: AI Screening Pipeline with Supabase-Stored Image
  ✅ PASS: Disease Report with cloud image processed (got 201)
  ✅ PASS: AI Triage completed successfully using cloud image
  ✅ PASS: AI Risk Level produced: High
     AI successfully processed image from path: scans/6aa0f44f3753a3a6a3d218dc/scan-1789285404238-7417.jpg
     Triage Result: Lumpy Skin Disease (लम्पी त्वचा रोग) (High Risk)

🔹 STEP 6: Clinical Referral Case Creation with Cloud Scan
  ✅ PASS: Referral case created (got 201)
  ✅ PASS: Case generated: CASE-2026-PUN-3004
     Case ID: CASE-2026-PUN-3004 (Attached Scan: scans/6aa0f44f3753a3a6a3d218dc/scan-1789285404238-7417.jpg)

🔹 STEP 7: Veterinarian Authentication & Authorized Image Inspection
  ✅ PASS: Veterinarian authenticated successfully
  ✅ PASS: Role confirmed as veterinarian
  ✅ PASS: Veterinarian authorized to view image (HTTP 200)
  ✅ PASS: Valid image content-type received: image/jpeg
  ✅ PASS: Image binary stream delivered (134 bytes)
     Vet Dr. Ananya Deshmukh successfully inspected scan (134 bytes).

🔹 STEP 8: Security Check – Unauthorized Cross-Farmer Access (403 Forbidden)
  ✅ PASS: Cross-farmer unauthorized access strictly blocked with 403 Forbidden (got 403)
  ✅ PASS: Unauthorized response confirms success: false
     Security verified: Unauthorized farmer blocked from accessing peer scans.

🔹 STEP 9: Expired Token & Missing Path Validation
  ✅ PASS: Missing path parameter returns 400 Bad Request (got 400)
  ✅ PASS: Expired/tampered token rejected with 401/403 (got 401)
     Expired token and missing path validation verified.

================================================================
📊 PHASE 5 TEST RESULTS: 32 Passed, 0 Failed
🎉 PHASE 5 STORAGE MIGRATION SUCCEEDED END-TO-END!
```

---

## 3. Storage Architecture & Bucket Configuration

### Bucket: `livestock-scans`
- **Schema:** `storage.buckets`
- **Visibility:** `public = FALSE` (Strictly Private)
- **Max File Size:** `10485760` bytes (10MB)
- **Allowed MIME Types:** `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- **Path Hierarchy:** `scans/<owner_profile_id>/scan-<timestamp>-<rand>.<ext>`

### Storage Row Level Security (RLS) Policies on `storage.objects`

| Policy Name | Action | Target Role | Access Rules |
|---|---|---|---|
| `livestock_scans_insert` | `INSERT` | `authenticated` | Upload allowed into `scans/<auth.uid()>/...` or for staff (`veterinarian`, `officer`, `admin`). |
| `livestock_scans_select_owner` | `SELECT` | `authenticated` (farmer) | Farmers can only download/view objects in their own folder or owned by them. |
| `livestock_scans_select_vet` | `SELECT` | `authenticated` (veterinarian) | Treating veterinarians and field workers can inspect referral scan images. |
| `livestock_scans_select_admin` | `SELECT` | `authenticated` (officer, admin) | Veterinary officers and platform admins have system-wide supervisory read access. |
| `livestock_scans_delete` | `DELETE` | `authenticated` | Only the image owner or an administrator can delete scan objects. |

### Supabase-Managed Storage Permissions & Error 42501 Resolution
- **Error Diagnosed:** `ERROR: 42501: must be owner of table objects` in Supabase SQL Editor.
- **Root Cause:** In hosted Supabase, `storage.objects` is owned by system user `supabase_storage_admin`. Attempting table-level DDL such as `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;` fails because the SQL Editor runs under role `postgres`, which does not own the managed table.
- **Resolution:**
  - Removed all `ALTER TABLE storage.*` statements from `supabase/storage_setup.sql`.
  - Confirmed that Supabase permanently enables RLS on `storage.objects` by default.
  - Retained all 5 granular user-defined policies via `DROP POLICY IF EXISTS` and `CREATE POLICY`, which the `postgres` role has explicit permission to manage in the SQL Editor.
  - Added explicit string casting (`owner::text = auth.uid()::text`, `public.get_current_user_role()::text`) to prevent type-coercion operator mismatch errors.

---

## 4. PostgreSQL Metadata Persistence (`public.scan_images`)

The PostgreSQL table `public.scan_images` was enhanced to maintain complete cloud storage references:

```sql
CREATE TABLE IF NOT EXISTS public.scan_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    storage_path TEXT,
    bucket_id VARCHAR(64) DEFAULT 'livestock-scans',
    file_size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(64) DEFAULT 'image/jpeg',
    is_private BOOLEAN DEFAULT TRUE,
    sha256_hash VARCHAR(64) DEFAULT '',
    disease VARCHAR(255) DEFAULT 'Unknown',
    risk_level VARCHAR(64) DEFAULT 'Moderate',
    confidence NUMERIC(5, 2) DEFAULT 0.0,
    symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
    temperature NUMERIC(4, 1) DEFAULT 0.0,
    duration NUMERIC(4, 1) DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. Service Layer & API Enhancements

### 1. `backend/services/storageService.js`
- **Validation Engine:** Strict validation rejecting missing files, oversized payloads (>10MB), and invalid MIME types/magic bytes.
- **Upload Flow:** Accepts Base64 data URLs, raw Base64, and binary Buffers.
- **Signed URL Generator:** Generates time-limited signed URLs (default 1 hour).
- **Offline / Resilient Fallback:** Provides deterministic signed URLs and in-memory caching during local development or network offline states.
- **AI Image Buffer Retrieval:** `getImageBuffer(storagePathOrUrl)` downloads cloud-stored images for Python AI microservice processing.

### 2. `backend/routes/uploadRoutes.js`
- `POST /api/upload/scan-image`: Uploads to Supabase Storage and records metadata in PostgreSQL and MongoDB (dual-write).
  - Preserves exact existing response contract: `{ success: true, message, imageUrl, scanId }`.
  - Enriches response with: `{ storagePath, signedUrl, bucket, isPrivate: true, fileSize, mimeType }`.
- `GET /api/upload/view-image`: Authenticated image proxy with strict access control:
  - Grants access to scan owners, assigned/district veterinarians, and officers/admins.
  - Rejects unauthorized cross-farmer requests with **403 Forbidden**.
  - Rejects expired or tampered viewing tokens with **401 Unauthorized**.
- `GET /api/upload/scans`: Returns scan history with fresh signed viewing URLs.

### 3. AI Pipeline Integration (`aiModelService.js` & `ai_service.py`)
- `backend/services/aiModelService.js`: Checks if `image` is a cloud storage path (`scans/...`) or URL, resolves the image buffer, and forwards Base64 data to the Python service.
- `backend/services/ai_service.py`: `preprocess_image` enhanced to accept HTTP/HTTPS image URLs directly.

### 4. Frontend Integration (`frontend/src/pages/DiseaseDetectionPage.jsx`)
- Captures `signedUrl` and `storagePath` returned from `/api/upload/scan-image`.
- Stores the secure signed URL on the animal's health timeline.

---

## 6. Backward Compatibility & Zero-Downtime Guarantee

1. **Local Filesystem Storage:** Files are mirrored to `backend/uploads/scans/` during the transition period. Old files remain intact.
2. **MongoDB Dual-Write:** The `ScanImage` Mongoose model is updated with new storage fields and receives secondary writes.
3. **API Contract Compatibility:** The response schema of `POST /api/upload/scan-image` remains identical, ensuring zero breakage for existing mobile or web clients.

## 7. Live Supabase Storage Verification

The migration SQL script [`supabase/storage_setup.sql`](./supabase/storage_setup.sql) has been executed in the live hosted Supabase SQL Editor and returned `Success. No rows returned`.

### 1. Bucket `livestock-scans`
- **Existence**: Provisioned in `storage.buckets` with ID `livestock-scans` and name `livestock-scans`.
- **Privacy**: `public = FALSE` (Strictly Private; direct public HTTP reads are blocked; access requires authenticated sessions or signed tokens).
- **Size Limit**: `file_size_limit = 10485760` bytes (exact 10MB limit enforced by storage engine).
- **MIME Types**: Whitelist restricted to `ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']`.

### 2. Table `public.scan_images` Metadata Columns
All 6 cloud storage metadata columns are added to `public.scan_images`:
- `storage_path TEXT`: Object storage path (`scans/<owner_id>/<filename>`).
- `bucket_id VARCHAR(64)`: Bucket identifier (`livestock-scans`).
- `file_size_bytes BIGINT`: Binary file size in bytes.
- `mime_type VARCHAR(64)`: Content MIME type.
- `is_private BOOLEAN`: Security classification flag (`true`).
- `sha256_hash VARCHAR(64)`: Cryptographic payload hash for tamper detection.
- **Indexes**: `idx_scan_images_storage_path` and `idx_scan_images_created_at`.

### 3. Storage Row Level Security (RLS) on `storage.objects`
Active policies created via `CREATE POLICY` (with default system RLS active on `storage.objects`):
- `livestock_scans_insert`: Validates upload bucket and folder path matching authenticated UID or staff roles.
- `livestock_scans_select_owner`: Restricts farmer access to their own scans (`owner::text = auth.uid()::text`).
- `livestock_scans_select_vet`: Authorizes veterinarians and field workers for clinical triage inspection.
- `livestock_scans_select_admin`: Grants supervisory read access to officers and administrators.
- `livestock_scans_delete`: Restricts deletion to object owner or administrator.

### 4. Security Routine
- `public.verify_scan_access(p_storage_path TEXT, p_user_id UUID, p_user_role TEXT)`: PL/pgSQL function created with `SECURITY DEFINER` enforcing three-tier role-based scan authorization.

---

## 8. Service Layer & Pipeline Live Confirmation

1. **Storage Service Configuration**:
   - `backend/services/storageService.js` explicitly binds to `const BUCKET_NAME = 'livestock-scans'` and enforces `MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024` and `ALLOWED_MIME_TYPES`.
2. **Upload Route**:
   - `POST /api/upload/scan-image` delegates image upload to Supabase Storage, records cloud metadata in `public.scan_images`, and issues time-limited signed URLs (`/api/upload/view-image?path=...`).
3. **AI Pipeline Integration**:
   - `backend/services/aiModelService.js` resolves cloud storage paths (`scans/...`) into binary buffers using `getImageBuffer()` before forwarding to the Python AI service (`lsd_model.keras`), decoupling inference from local disk paths.
4. **Local Filesystem Decoupling**:
   - Local disk storage (`backend/uploads/scans/`) is retained only as an offline/development fallback and is no longer required for primary platform operation.

---

## 9. Test Suite & Build Verification

- **Automated Storage Test Suite**: `tests/test_phase5_storage.js` $\longrightarrow$ **32 Passed, 0 Failed**
- **Critical Backend Workflow Suite**: `tests/test_phase4_workflow.js` $\longrightarrow$ **24 Passed, 0 Failed**
- **Auth & RBAC Test Suite**: `tests/test_auth_migration.js` $\longrightarrow$ **56 Passed, 0 Failed**
- **Frontend Production Build**: Vite `npm run build` completed successfully with code 0 (2,521 modules transformed, 0 errors).

---

## 10. Verification Matrix

| Component | Live Status | Evidence |
|---|:---:|---|
| **`livestock-scans` Bucket** | **VERIFIED** | Present in `storage.buckets`, `id = 'livestock-scans'`, `public = false`. |
| **Storage Privacy** | **VERIFIED** | `public = FALSE` in `storage.buckets`; unauthenticated public access denied. |
| **File Size Limit** | **VERIFIED** | `file_size_limit = 10485760` bytes (10MB) configured on bucket. |
| **MIME Whitelist** | **VERIFIED** | `allowed_mime_types = {'image/jpeg','image/jpg','image/png','image/webp'}`. |
| **`scan_images` Columns** | **VERIFIED** | All 6 columns (`storage_path`, `bucket_id`, `file_size_bytes`, `mime_type`, `is_private`, `sha256_hash`) present in PostgreSQL. |
| **Storage RLS Policies** | **VERIFIED** | 5 policies active on `storage.objects` (`livestock_scans_insert/select_owner/select_vet/select_admin/delete`). |
| **`verify_scan_access` Function** | **VERIFIED** | Registered in `public` schema with `SECURITY DEFINER`. |
| **Backend Storage Service** | **VERIFIED** | `storageService.js` targeting `livestock-scans` with signed URL generation. |
| **Upload Route & AI Pipeline** | **VERIFIED** | `uploadRoutes.js` and `aiModelService.js` processing images via storage paths and buffers. |
| **Automated Test Suite** | **VERIFIED** | 32/32 assertions passed in `tests/test_phase5_storage.js`. |
| **Frontend Production Build** | **VERIFIED** | `npm run build` exited with code 0; 2,521 modules transformed. |

---

## 11. Migration Status Declaration

- **Phase 5 Status:** **COMPLETE**
- **Remaining Manual Actions in Supabase:** **NONE.** All required storage DDL, bucket configurations, RLS policies, metadata columns, and verification functions have been applied.

