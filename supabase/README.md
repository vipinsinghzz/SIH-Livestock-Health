# Supabase PostgreSQL Database Specification & Setup Guide
## Livestock Saathi – AI-Powered Livestock Health & Early Warning Platform
**Smart India Hackathon (SIH) 2026 — Problem Statement 128**

This directory contains the complete, production-grade **PostgreSQL schema** and **seed data** for the Supabase migration of the Livestock Saathi platform. It replaces the legacy MongoDB/Mongoose datastore with a normalized, PostGIS-enabled relational database.

---

## Directory Contents

| File | Purpose |
| :--- | :--- |
| `schema.sql` | Complete DDL script (v1.0.1): PostGIS extensions, custom ENUMs, 18 normalized relational tables, deferrable foreign keys, GiST indexes, triggers, atomic claim stored procedures, PostGIS spatial clustering functions, analytics views, RLS policies, and Realtime publications. |
| `rls_and_realtime.sql` | Standalone script to enable Row Level Security (RLS), 31 access policies, and Supabase Realtime CDC on existing databases. |
| `seed.sql` | Realistic, deterministic seed data matching the SIH 2026 demo scenarios: demo accounts (Farmer, Veterinarian, Officer), livestock with medical histories, active referral cases, containment zones, vaccination drives, AI triage outputs, and lab referrals. |
| `SCHEMA_FIXES.md` | Full root-cause diagnosis of foreign key error `42703`, topological reordering audit, and 32-foreign-key verification matrix. |
| `RLS_FIX_REPORT.md` | Root-cause diagnosis of operator error `42883`, scope shadowing resolution, and type-safety verification report. |
| `VERIFICATION.md` | Comprehensive 8-pillar verification audit report and post-execution checklist. |
| `README.md` | Setup instructions, architecture overview, and database administration guide. |

---

## Prerequisites

1. **Supabase Project:** A hosted project at [supabase.com](https://supabase.com) OR a local development instance via Supabase CLI.
2. **PostgreSQL Extensions Required:**
   - `postgis` (v3.0+ for spatial calculations and indexing)
   - `pgcrypto` (for bcrypt password hashing and cryptographic random UUIDs)
   - `uuid-ossp` (for UUID generation)

> [!NOTE]
> All three extensions are pre-installed and available out-of-the-box on Supabase.

---

## Setup Instructions

### Option A: Via the Supabase Web Dashboard (Fastest)

1. Open your project on the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to the **SQL Editor** from the left sidebar.
3. Click **New Query**, copy the entire contents of [`schema.sql`](./schema.sql), paste it into the editor, and click **Run**.
   - Verify that all tables, triggers, functions, and views are created with `Success. No rows returned`.
4. Open another query tab, copy the contents of [`seed.sql`](./seed.sql), paste it into the editor, and click **Run**.
5. Navigate to the **Table Editor** to inspect the populated records across `profiles`, `animals`, `disease_cases`, `containment_zones`, `vaccination_drives`, etc.
6. Navigate to **Storage** in the dashboard:
   - Create a new public bucket named `livestock-scans`.
   - Set the bucket policy to allow public reads.

---

### Option B: Via the Supabase CLI (Local Development)

```bash
# 1. Install Supabase CLI if not already installed
npm install -g supabase

# 2. Initialize Supabase in the project root
cd c:\Project\PashuMitra\Livestock-Disease-Prediction
supabase init

# 3. Start local Docker containers
supabase start

# 4. Apply schema and seed
supabase db reset
# Or apply directly via psql:
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/schema.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed.sql
```

---

## Core Schema Entities & Architecture

### 1. User Profiles & Jurisdictions (`profiles`)
- Stores farmers, field workers, veterinarians, and government officers.
- Coordinates are stored as standard `latitude` / `longitude` floats AND as a PostGIS `coordinates_geom geometry(Point, 4326)`.
- Automated trigger `trg_profiles_sync_geom` keeps the PostGIS point synchronized whenever coordinates are modified.
- Passwords are encrypted using standard 10-round bcrypt hashes via `pgcrypto.crypt()`, allowing seamless password validation with existing client passwords (`Farmer@123`, `Vet@123`, `Admin@123`).

### 2. Livestock Management (`animals`, `animal_timeline`, `animal_vaccinations`, `animal_treatments`)
- Normalized from MongoDB's single deeply-nested document into a parent `animals` table with foreign-keyed child tables.
- Preserves animal tag numbers (`tag_id`), species, breed, age, gender, and daily milk yield.
- Fully compatible with India's National Animal Identification System (INAPH / Bharat Pashudhan).

### 3. PS-128 Referral & Clinical Case Tracking (`disease_cases`, `case_timeline`, `case_notified_vets`)
- Implements the canonical 5-stage case lifecycle:
  $$\text{New} \longrightarrow \text{Investigating} \longrightarrow \text{Confirmed} \longrightarrow \text{Containment} \longrightarrow \text{Resolved}$$
- **Atomic Claiming:** Includes stored function `claim_disease_case(p_case_identifier, p_vet_id, p_vet_name)` executing atomic Compare-And-Swap (CAS) to eliminate race conditions between competing veterinarians.
- Audit trail preserved in `case_timeline` with timestamp and updater name.
- Real-time notification dispatch records tracked in `case_notified_vets`.

### 4. Outbreak Prevention & Containment (`containment_zones`, `vaccination_drives`, `vaccination_camp_registrations`)
- Spatial containment zones defined by center point (`center_geom`) and radius buffer (`radius_km`, 0.5km to 50km).
- Links outbreak cases directly to emergency ring vaccination camps.
- Vaccination drive slot booking managed with check constraints (`booked_slots <= capacity`).

### 5. Surveillance Reports, AI Triage & Labs (`reports`, `triage_results`, `lab_referrals`)
- Reports hold field symptom observations, animal associations, and photos.
- `triage_results` stores multimodal inference outcomes from `lsd_model.keras` (EfficientNetB0) and clinical rule fusion.
- `lab_referrals` manages sample collection (blood serum, vesicular fluid, scabs) and confirmation workflows with District Disease Diagnostic Laboratories (DDDL).

### 6. Bilingual Advisories & Real-Time Alerts (`advisories`, `notifications`, `scan_images`, `audit_logs`)
- Bilingual advisory bulletins (`title_en`, `title_hi`, `message_en`, `message_hi`).
- Persistent notification audit queue for WebSocket / Realtime delivery.
- System-wide immutable clinical audit log (`audit_logs`).

---

## Spatial PostGIS Functions

The database includes built-in PostGIS functions to replace in-memory JavaScript math:

### 1. Spatial Outbreak Clustering: `get_spatial_outbreak_clusters`
Replaces the $O(n^2)$ client-side Haversine clustering loop with native spatial clustering:
```sql
SELECT * FROM public.get_spatial_outbreak_clusters('Pune', 5.0);
```
**Output Columns:**
- `cluster_id`: Sequential cluster identifier.
- `disease`: Disease name (e.g. `Lumpy Skin Disease`).
- `case_count`: Number of active cases in cluster.
- `total_affected`: Sum of livestock infected.
- `centroid_lat`, `centroid_lng`: Geographic center of the outbreak.
- `radius_km`: Recommended quarantine / containment radius.
- `risk_tier`: `Critical`, `High`, or `Moderate`.
- `is_outbreak`: `true` if $\ge 2$ matching cases within 5km.

### 2. Nearest Veterinarian Discovery: `get_nearby_veterinarians`
Discovers the closest active, available veterinary physicians using spatial indexing:
```sql
-- Search within 50km radius of Baramati (18.1517, 74.5772)
SELECT * FROM public.get_nearby_veterinarians(18.1517, 74.5772, 50.0, 3);
```

---

## Analytics Views

Two pre-computed views are provided for real-time dashboard analytics:

1. **`v_district_surveillance_summary`**:
   Delivers instantaneous aggregated KPIs for `/api/dashboard/summary` (total reports, active cases, contained cases, mortalities, and risk breakdown).
   ```sql
   SELECT * FROM public.v_district_surveillance_summary WHERE district = 'Pune';
   ```

2. **`v_daily_epidemic_trends`**:
   Rolls up daily cases, mortalities, and outbreaks over the trailing 30 days for temporal chart rendering (`/api/dashboard/trends`).
   ```sql
   SELECT * FROM public.v_daily_epidemic_trends WHERE district = 'Pune' LIMIT 30;
   ```

---

## Demo Accounts in Seed Data

| Role | Name | Email | Password | Location |
| :--- | :--- | :--- | :--- | :--- |
| **Farmer** | Ramesh Patil | `farmer@pashurakshak.in` | `Farmer@123` | Baramati, Pune |
| **Veterinarian** | Dr. Ananya Deshmukh | `vet@pashurakshak.in` | `Vet@123` | Baramati, Pune |
| **Officer / Admin** | Dr. Suresh Kulkarni | `officer@pashurakshak.in` | `Admin@123` | Haveli, Pune |
| **Farmer** | Santosh Shinde | `santosh@pashurakshak.in` | `Farmer@123` | Shirur, Pune |
| **Farmer** | Sunita Gaikwad | `sunita@pashurakshak.in` | `Farmer@123` | Khed, Pune |
| **Field Worker** | Dr. Rajesh Shinde | `vet2@pashurakshak.in` | `Vet@123` | Shirur, Pune |
