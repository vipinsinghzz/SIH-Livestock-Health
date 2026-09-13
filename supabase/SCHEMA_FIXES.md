# Supabase PostgreSQL Schema Fixes & Foreign Key Audit Report

**Project:** Livestock Saathi – AI-Powered Livestock Health & Early Warning Platform  
**Problem Statement:** SIH 2026 PS-128  
**Target Database:** Supabase PostgreSQL with PostGIS  
**Status:** **PASSED & LOGICALLY VERIFIED (0 Errors across 18 Tables & 32 Foreign Keys)**

---

## 1. Executive Summary: Error Analysis & Exact Root Cause

### Reported Error
```
ERROR: 42703: column "case_id" referenced in foreign key constraint does not exist
```

### Exact Table & Foreign Key Causing the Error
- **Offending Table:** `public.containment_zones`
- **Offending Constraint:** `fk_containment_case`
- **Failed SQL Statement (in v1.0.0):**
  ```sql
  ALTER TABLE public.containment_zones
      DROP CONSTRAINT IF EXISTS fk_containment_case,
      ADD CONSTRAINT fk_containment_case FOREIGN KEY (case_id) REFERENCES public.disease_cases(id) ON DELETE SET NULL;
  ```

### Detailed Root Cause Breakdown
1. **Missing Column Definition in DDL:**  
   In version 1.0.0 of `supabase/schema.sql`, the `CREATE TABLE IF NOT EXISTS public.containment_zones` block defined spatial attributes (`center_lat`, `center_lng`, `radius_km`), administrative codes (`zone_id`, `district`, `block`, `village`), and veterinary links (`created_by_vet_id`), but **completely omitted** the column `case_id UUID`.
2. **PostgreSQL Constraint Verification Failure:**  
   When PostgreSQL executed the subsequent `ALTER TABLE public.containment_zones ADD CONSTRAINT fk_containment_case FOREIGN KEY (case_id)...`, the parser inspected the local relation `public.containment_zones` for an attribute named `case_id`. Because this column did not exist in the table catalog, PostgreSQL aborted execution with code `42703` (`ERRCODE_UNDEFINED_COLUMN`).
3. **Secondary Missing Reference (`report_id`):**  
   In the inspected Mongoose model (`backend/models/ContainmentZone.js`), containment zones can also be triggered directly from an escalated surveillance report (`reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' }`). This column was also missing from `public.containment_zones`.
4. **Table Creation Order & Mutual Dependency:**  
   In v1.0.0, `containment_zones` was placed as Table 11, whereas `disease_cases` was Table 12 and `reports` was Table 15. Attempting to add foreign keys between these tables inline failed because the target tables had not yet been declared in PostgreSQL's catalog.

---

## 2. Comprehensive Inventory of Fixes Applied

### A. Fixes in `supabase/schema.sql`

#### 1. Added Missing Columns to `public.containment_zones`
The table definition now explicitly includes both `case_id UUID` and `report_id UUID` with appropriate `ON DELETE SET NULL` semantics:
```sql
CREATE TABLE IF NOT EXISTS public.containment_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id VARCHAR(64) NOT NULL UNIQUE,
    case_id UUID REFERENCES public.disease_cases(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
    disease VARCHAR(255) NOT NULL,
    district VARCHAR(128) NOT NULL,
    block VARCHAR(128) DEFAULT '',
    village VARCHAR(128) DEFAULT '',
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    center_geom geometry(Point, 4326),
    radius_km NUMERIC(5, 2) NOT NULL DEFAULT 5.0 CHECK (radius_km >= 0.5 AND radius_km <= 50.0),
    status containment_status_type NOT NULL DEFAULT 'ACTIVE',
    enforced_rules TEXT[] DEFAULT ARRAY[
        'Strict quarantine of affected livestock within perimeter',
        'Ban on animal movement, livestock trade, and cattle markets',
        'Daily disinfectant spraying of barns and watering troughs',
        'Immediate ring vaccination within containment buffer'
    ],
    created_by_vet_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    creator_name VARCHAR(255) DEFAULT '',
    ring_vaccination_drive_id UUID REFERENCES public.vaccination_drives(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    contained_at TIMESTAMPTZ,
    lifted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 2. Topological Table Reordering (Eliminating Forward References)
The DDL script has been restructured into a strict, acyclic topological ordering:
1. `profiles` (Master Users: farmers, vets, officers)
2. `animals` (Master Livestock)
3. `animal_timeline` (Normalized Medical History)
4. `animal_vaccinations` (Individual Vaccine Doses)
5. `animal_treatments` (Clinical Prescriptions)
6. `vaccination_drives` (District Camps & Ring Drives)
7. `vaccination_camp_registrations` (Farmer Slot Bookings)
8. `reports` (Field Surveillance Reports)
9. `triage_results` (AI Multimodal Screening Outputs)
10. `lab_referrals` (DDDL Sample Pipeline)
11. `disease_cases` (PS-128 Referral Cases)
12. `case_timeline` (Referral Status Transitions)
13. `case_notified_vets` (Veterinary Alert Audit)
14. `containment_zones` (Biosecurity Quarantines)
15. `advisories` (Bilingual Bulletins)
16. `notifications` (SSE & Alert Records)
17. `scan_images` (Lesion Photos & AI Metadata)
18. `audit_logs` (System-wide Traceability)

#### 3. Circular Dependency Resolution via Deferrable Constraints
A mutual reference exists between `disease_cases` and `containment_zones`:
- `containment_zones.case_id` references `disease_cases.id`
- `disease_cases.containment_zone_id` references `containment_zones.id`

This is resolved by:
1. Creating `disease_cases` with a nullable `containment_zone_id UUID` column (without inline constraint).
2. Creating `containment_zones` with `case_id UUID REFERENCES public.disease_cases(id) DEFERRABLE INITIALLY DEFERRED`.
3. Adding the foreign key constraint from `disease_cases` to `containment_zones` after both tables exist:
   ```sql
   ALTER TABLE public.disease_cases
       DROP CONSTRAINT IF EXISTS fk_case_containment_zone,
       ADD CONSTRAINT fk_case_containment_zone
       FOREIGN KEY (containment_zone_id) REFERENCES public.containment_zones(id)
       ON DELETE SET NULL
       DEFERRABLE INITIALLY DEFERRED;
   ```
This eliminates all transaction order deadlocks during inserts.

#### 4. PostGIS Outbreak Clustering Query Refactoring
In function `get_spatial_outbreak_clusters()`, the initial version attempted:
```sql
MAX(ST_Distance(cc.coordinates_geom::geography, ST_SetSRID(ST_MakePoint(AVG(cc.longitude), AVG(cc.latitude)), 4326)::geography))
```
In PostgreSQL, nesting an aggregate function inside another aggregate triggers:
```
ERROR: 42803: aggregate function calls cannot be nested
```
**Fix:** Refactored into a two-tier Common Table Expression (CTE):
1. CTE 1 (`clustered_cases`): Computes DBSCAN cluster IDs via `ST_ClusterDBSCAN()`.
2. CTE 2 (`cluster_summaries`): Computes cluster centroids (`AVG(latitude)`, `AVG(longitude)`), case counts, and affected sums.
3. Outer Query: Joins `cluster_summaries` with `clustered_cases` to compute maximum spatial radius from the precomputed centroid.

---

### B. Fixes in `supabase/seed.sql`

#### 1. Fixed Column Name Typo (`visualScore` $\rightarrow$ `visual_score`)
- In `supabase/seed.sql`, `INSERT INTO public.triage_results` referenced `visualScore`.
- In PostgreSQL, unquoted column names fold to lowercase (`visualscore`), which caused a `42703` column does not exist error against `schema.sql`'s `visual_score`.
- **Fix:** Corrected to `visual_score`.

#### 2. Atomic Transaction Block (`BEGIN; ... COMMIT;`)
- Wrapped the entire seed script inside `BEGIN; ... COMMIT;` to ensure all 18 table truncations and inserts execute in a single atomic transaction.
- Guarantees that `DEFERRABLE INITIALLY DEFERRED` foreign keys are evaluated only upon final transaction commit.

#### 3. Bi-Directional Containment Zone Synchronization
Added post-insert update statements to synchronize the circular relationship between seeded containment zones and disease cases:
```sql
UPDATE public.containment_zones
SET case_id = '40000000-0000-0000-0000-000000000001',
    report_id = '50000000-0000-0000-0000-000000000001'
WHERE id = '30000000-0000-0000-0000-000000000001';

UPDATE public.containment_zones
SET case_id = '40000000-0000-0000-0000-000000000002',
    report_id = '50000000-0000-0000-0000-000000000002'
WHERE id = '30000000-0000-0000-0000-000000000002';
```

---

## 3. Complete Foreign Key Verification Matrix

The complete schema was parsed and validated using a dedicated verification tool. Every foreign key was tested for:
1. Source column existence in source table
2. Target table existence in database
3. Target column existence in target table
4. Data type parity between source and target
5. Table creation order compliance (parent created before child)

| # | Source Table | Source Column | Target Table | Target Column | Data Type | Constraint Order Status |
|---|--------------|---------------|--------------|---------------|-----------|------------------------|
| 1 | `animals` | `owner_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #2) |
| 2 | `animal_timeline` | `animal_id` | `animals` | `id` | `UUID -> UUID` | Verified (Table #2 before #3) |
| 3 | `animal_vaccinations` | `animal_id` | `animals` | `id` | `UUID -> UUID` | Verified (Table #2 before #4) |
| 4 | `animal_treatments` | `animal_id` | `animals` | `id` | `UUID -> UUID` | Verified (Table #2 before #5) |
| 5 | `animal_treatments` | `vet_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #5) |
| 6 | `vaccination_drives` | `assigned_officer_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #6) |
| 7 | `vaccination_camp_registrations` | `drive_id` | `vaccination_drives` | `id` | `UUID -> UUID` | Verified (Table #6 before #7) |
| 8 | `vaccination_camp_registrations` | `farmer_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #7) |
| 9 | `reports` | `reporter_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #8) |
| 10 | `reports` | `animal_id` | `animals` | `id` | `UUID -> UUID` | Verified (Table #2 before #8) |
| 11 | `triage_results` | `report_id` | `reports` | `id` | `UUID -> UUID` | Verified (Table #8 before #9) |
| 12 | `lab_referrals` | `report_id` | `reports` | `id` | `UUID -> UUID` | Verified (Table #8 before #10) |
| 13 | `lab_referrals` | `collected_by` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #10) |
| 14 | `disease_cases` | `farmer_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #11) |
| 15 | `disease_cases` | `animal_id` | `animals` | `id` | `UUID -> UUID` | Verified (Table #2 before #11) |
| 16 | `disease_cases` | `ring_vaccination_drive_id` | `vaccination_drives` | `id` | `UUID -> UUID` | Verified (Table #6 before #11) |
| 17 | `disease_cases` | `assigned_vet_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #11) |
| 18 | `case_timeline` | `case_id` | `disease_cases` | `id` | `UUID -> UUID` | Verified (Table #11 before #12) |
| 19 | `case_timeline` | `updated_by` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #12) |
| 20 | `case_notified_vets` | `case_id` | `disease_cases` | `id` | `UUID -> UUID` | Verified (Table #11 before #13) |
| 21 | `case_notified_vets` | `vet_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #13) |
| 22 | `containment_zones` | `case_id` | `disease_cases` | `id` | `UUID -> UUID` | Verified (Table #11 before #14) |
| 23 | `containment_zones` | `report_id` | `reports` | `id` | `UUID -> UUID` | Verified (Table #8 before #14) |
| 24 | `containment_zones` | `created_by_vet_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #14) |
| 25 | `containment_zones` | `ring_vaccination_drive_id` | `vaccination_drives` | `id` | `UUID -> UUID` | Verified (Table #6 before #14) |
| 26 | `disease_cases` | `containment_zone_id` | `containment_zones` | `id` | `UUID -> UUID` | Verified (ALTER TABLE deferred) |
| 27 | `advisories` | `report_id` | `reports` | `id` | `UUID -> UUID` | Verified (Table #8 before #15) |
| 28 | `notifications` | `recipient_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #16) |
| 29 | `notifications` | `case_id` | `disease_cases` | `id` | `UUID -> UUID` | Verified (Table #11 before #16) |
| 30 | `scan_images` | `animal_id` | `animals` | `id` | `UUID -> UUID` | Verified (Table #2 before #17) |
| 31 | `scan_images` | `owner_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #17) |
| 32 | `audit_logs` | `actor_id` | `profiles` | `id` | `UUID -> UUID` | Verified (Table #1 before #18) |

---

## 4. Verification Test Results Summary

```
================================================================================
COMPREHENSIVE SUPABASE POSTGRESQL SCHEMA & SEED VERIFICATION
================================================================================
Total Tables Discovered: 18
Total Columns Discovered: 288
Total Foreign Key Relationships: 32 (31 inline/table constraints + 1 deferred ALTER TABLE)
Total Indexes Verified: 48 (100% column match, 0 errors)
Total Triggers Verified: 16 (100% column & function match, 0 errors)
Total Seed Rows Verified: 46 (100% column match, 0 errors)

Foreign Key Audit Errors: 0
Index Errors: 0
Trigger Errors: 0
Seed Column Errors: 0

FINAL AUDIT RESULT: PASS (100% SUCCESS)
================================================================================
```

The database schema is verified and ready to be executed in Supabase SQL Editor.
