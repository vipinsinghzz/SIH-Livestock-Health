-- =====================================================================================
-- LIVESTOCK SAATHI – AI-POWERED LIVESTOCK HEALTH & EARLY WARNING PLATFORM
-- SIH 2026 Problem Statement 128
-- Supabase PostgreSQL Relational & Spatial Database Schema
-- Version: 1.0.1 (Corrected & Dependency-Verified)
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -------------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -------------------------------------------------------------------------------------
-- 2. CUSTOM DOMAINS & ENUM TYPES
-- -------------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('farmer', 'field_worker', 'veterinarian', 'officer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE vet_availability AS ENUM ('AVAILABLE', 'ACTIVE', 'BUSY', 'OFF_DUTY', 'ON_CALL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE animal_species AS ENUM ('Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE animal_gender AS ENUM ('Female', 'Male');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE health_status_type AS ENUM ('Healthy', 'Needs Attention', 'Critical', 'Recovered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE risk_level_type AS ENUM ('Low', 'Moderate', 'High', 'Critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE case_status_type AS ENUM ('New', 'Investigating', 'Confirmed', 'Containment', 'Resolved', 'OPEN', 'ACCEPTED', 'IN_TREATMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE report_status_type AS ENUM ('Reported', 'Triaged', 'Field Verified', 'Escalated', 'Contained', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE containment_status_type AS ENUM ('ACTIVE', 'CONTAINED', 'LIFTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE drive_status_type AS ENUM ('Upcoming', 'Ongoing', 'Completed', 'Scheduled', 'Active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notification_status_type AS ENUM ('QUEUED', 'DELIVERED', 'FAILED', 'READ');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE delivery_channel_type AS ENUM ('SSE', 'SMS', 'WHATSAPP', 'IN_APP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -------------------------------------------------------------------------------------
-- 3. UTILITY FUNCTIONS & AUTOMATED TRIGGERS
-- -------------------------------------------------------------------------------------

-- Trigger function to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically keep PostGIS Point geometries synchronized with lat/lng
CREATE OR REPLACE FUNCTION public.sync_point_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND NOT (NEW.latitude = 0.0 AND NEW.longitude = 0.0) THEN
        NEW.coordinates_geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for containment zone center coordinates
CREATE OR REPLACE FUNCTION public.sync_containment_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.center_lat IS NOT NULL AND NEW.center_lng IS NOT NULL AND NOT (NEW.center_lat = 0.0 AND NEW.center_lng = 0.0) THEN
        NEW.center_geom = ST_SetSRID(ST_MakePoint(NEW.center_lng, NEW.center_lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------------------------
-- 4. PROFILES / USERS (Farmers, Field Workers, Veterinarians, Officers, Admins)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID, -- Optional linkage to Supabase auth.users
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'farmer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    village VARCHAR(255) DEFAULT '',
    block VARCHAR(255) DEFAULT '',
    district VARCHAR(255) NOT NULL DEFAULT 'Pune',
    state VARCHAR(255) NOT NULL DEFAULT 'Maharashtra',
    latitude DOUBLE PRECISION DEFAULT 0.0,
    longitude DOUBLE PRECISION DEFAULT 0.0,
    coordinates_geom geometry(Point, 4326),
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
    rating NUMERIC(3, 2) DEFAULT 4.8 CHECK (rating >= 0.0 AND rating <= 5.0),
    experience INTEGER DEFAULT 6 CHECK (experience >= 0),
    emergency_available BOOLEAN DEFAULT TRUE,
    services TEXT[] DEFAULT ARRAY['Emergency Treatment', 'Vaccination', 'Clinical Triage', 'Artificial Insemination'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_geom ON public.profiles USING GIST(coordinates_geom);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_sync_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();

-- -------------------------------------------------------------------------------------
-- 5. ANIMALS (Livestock Master Record)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) DEFAULT '',
    species animal_species NOT NULL DEFAULT 'Cattle',
    breed VARCHAR(255) DEFAULT 'Indigenous / Mixed',
    age INTEGER DEFAULT 3 CHECK (age >= 0),
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

CREATE INDEX IF NOT EXISTS idx_animals_owner ON public.animals(owner_id);
CREATE INDEX IF NOT EXISTS idx_animals_tag_id ON public.animals(tag_id);
CREATE INDEX IF NOT EXISTS idx_animals_district ON public.animals(district);
CREATE INDEX IF NOT EXISTS idx_animals_species ON public.animals(species);
CREATE INDEX IF NOT EXISTS idx_animals_health_status ON public.animals(health_status);

CREATE TRIGGER trg_animals_updated_at
    BEFORE UPDATE ON public.animals
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- 6. ANIMAL TIMELINE (Normalized Animal Medical Events)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.animal_timeline (
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
    confidence NUMERIC(5, 2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
    symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
    advisory TEXT DEFAULT '',
    temperature NUMERIC(4, 1),
    duration NUMERIC(4, 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animal_timeline_animal ON public.animal_timeline(animal_id, created_at DESC);

-- -------------------------------------------------------------------------------------
-- 7. ANIMAL VACCINATIONS (Individual Animal Vaccination Schedule & History)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.animal_vaccinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    vaccine_name VARCHAR(255) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_due TIMESTAMPTZ,
    status VARCHAR(64) DEFAULT 'Completed',
    dose VARCHAR(64) DEFAULT 'Primary Dose',
    batch_number VARCHAR(128) DEFAULT '',
    administered_by VARCHAR(255) DEFAULT '',
    camp VARCHAR(255) DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animal_vacc_animal ON public.animal_vaccinations(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_vacc_next_due ON public.animal_vaccinations(next_due);

-- -------------------------------------------------------------------------------------
-- 8. ANIMAL TREATMENTS (Veterinary Prescriptions & Interventions)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.animal_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
    condition VARCHAR(255) NOT NULL,
    treatment TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animal_treatments_animal ON public.animal_treatments(animal_id);

-- -------------------------------------------------------------------------------------
-- 9. VACCINATION DRIVES (District Camps & Ring Vaccination Drives)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vaccination_drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id VARCHAR(64) UNIQUE,
    state VARCHAR(128) NOT NULL DEFAULT 'Maharashtra',
    district VARCHAR(128) NOT NULL,
    block VARCHAR(128) NOT NULL,
    village VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    coordinates_geom geometry(Point, 4326),
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
    capacity INTEGER NOT NULL DEFAULT 200 CHECK (capacity >= 1),
    booked_slots INTEGER NOT NULL DEFAULT 0 CHECK (booked_slots >= 0),
    remaining_slots INTEGER NOT NULL DEFAULT 200 CHECK (remaining_slots >= 0),
    target_count INTEGER NOT NULL DEFAULT 200 CHECK (target_count >= 1),
    covered_count INTEGER NOT NULL DEFAULT 0 CHECK (covered_count >= 0),
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    status drive_status_type NOT NULL DEFAULT 'Upcoming',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vacc_drives_district_block ON public.vaccination_drives(district, block, status);
CREATE INDEX IF NOT EXISTS idx_vacc_drives_camp_date ON public.vaccination_drives(camp_date);
CREATE INDEX IF NOT EXISTS idx_vacc_drives_geom ON public.vaccination_drives USING GIST(coordinates_geom);

CREATE TRIGGER trg_vacc_drives_updated_at
    BEFORE UPDATE ON public.vaccination_drives
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_vacc_drives_sync_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON public.vaccination_drives
    FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();

-- -------------------------------------------------------------------------------------
-- 10. VACCINATION CAMP REGISTRATIONS (Farmer Slot Bookings & Tokens)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vaccination_camp_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES public.vaccination_drives(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    farmer_name VARCHAR(255) DEFAULT '',
    farmer_phone VARCHAR(32) DEFAULT '',
    animal_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    animal_count INTEGER NOT NULL DEFAULT 1 CHECK (animal_count >= 1),
    token VARCHAR(64) NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_regs_drive ON public.vaccination_camp_registrations(drive_id);
CREATE INDEX IF NOT EXISTS idx_camp_regs_farmer ON public.vaccination_camp_registrations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_camp_regs_phone ON public.vaccination_camp_registrations(farmer_phone);

-- -------------------------------------------------------------------------------------
-- 11. SURVEILLANCE REPORTS (Field Reports & Direct Symptom Logging)
-- Created before disease_cases and containment_zones so they can reference reports
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id VARCHAR(64) NOT NULL UNIQUE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    animal_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
    herd_id VARCHAR(64),
    species animal_species NOT NULL DEFAULT 'Cattle',
    symptoms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    mortality_count INTEGER NOT NULL DEFAULT 0 CHECK (mortality_count >= 0),
    affected_count INTEGER NOT NULL DEFAULT 1 CHECK (affected_count >= 1),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    coordinates_geom geometry(Point, 4326),
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

CREATE INDEX IF NOT EXISTS idx_reports_district_block ON public.reports(district, block, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_geom ON public.reports USING GIST(coordinates_geom);

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reports_sync_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();

-- -------------------------------------------------------------------------------------
-- 12. AI TRIAGE RESULTS (lsd_model.keras + Multimodal Clinical Screening Outputs)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.triage_results (
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

CREATE INDEX IF NOT EXISTS idx_triage_risk ON public.triage_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_triage_outbreak ON public.triage_results(outbreak_flag);

CREATE TRIGGER trg_triage_updated_at
    BEFORE UPDATE ON public.triage_results
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- 13. LAB REFERRALS (Diagnostic Sample Pipeline)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_referrals (
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

CREATE INDEX IF NOT EXISTS idx_lab_referrals_report ON public.lab_referrals(report_id);
CREATE INDEX IF NOT EXISTS idx_lab_referrals_status ON public.lab_referrals(status);

CREATE TRIGGER trg_lab_referrals_updated_at
    BEFORE UPDATE ON public.lab_referrals
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- 14. DISEASE CASES (PS-128 5-Stage Disease Referral System)
-- Created before containment_zones so containment_zones can reference disease_cases.id
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disease_cases (
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
    coordinates_geom geometry(Point, 4326),
    farmer_location JSONB DEFAULT '{}'::JSONB,
    farmer_contact JSONB DEFAULT '{}'::JSONB,
    symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
    temperature NUMERIC(4, 1) DEFAULT 0.0,
    duration NUMERIC(4, 1) DEFAULT 0.0,
    affected_count INTEGER NOT NULL DEFAULT 1 CHECK (affected_count >= 1),
    notes TEXT DEFAULT '',
    clinical_diagnosis TEXT DEFAULT '',
    investigation_notes TEXT DEFAULT '',
    status case_status_type NOT NULL DEFAULT 'New',
    containment_zone_id UUID, -- Foreign key constraint added below after containment_zones table is created
    ring_vaccination_drive_id UUID REFERENCES public.vaccination_drives(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_cases_district_status ON public.disease_cases(district_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_farmer_id ON public.disease_cases(farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_vet ON public.disease_cases(assigned_vet_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_disease ON public.disease_cases(disease);
CREATE INDEX IF NOT EXISTS idx_cases_geom ON public.disease_cases USING GIST(coordinates_geom);

CREATE TRIGGER trg_cases_updated_at
    BEFORE UPDATE ON public.disease_cases
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cases_sync_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON public.disease_cases
    FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();

-- -------------------------------------------------------------------------------------
-- 15. CASE TIMELINE (Normalized Status Transition Audit Trail)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.case_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.disease_cases(id) ON DELETE CASCADE,
    status VARCHAR(64) NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updater_name VARCHAR(255) DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_timeline_case ON public.case_timeline(case_id, created_at DESC);

-- -------------------------------------------------------------------------------------
-- 16. CASE NOTIFIED VETERINARIANS (Audit of Dispatched Referral Alerts)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.case_notified_vets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.disease_cases(id) ON DELETE CASCADE,
    vet_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT '',
    phone VARCHAR(32) DEFAULT '',
    notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivery_status VARCHAR(32) DEFAULT 'SENT',
    channel delivery_channel_type DEFAULT 'SSE',
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_notified_vets_case ON public.case_notified_vets(case_id);
CREATE INDEX IF NOT EXISTS idx_notified_vets_vet ON public.case_notified_vets(vet_id);

-- -------------------------------------------------------------------------------------
-- 17. CONTAINMENT ZONES (Outbreak Quarantines & Biosecurity Perimeters)
-- Declares case_id and report_id with proper foreign key constraints
-- -------------------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_containment_district_status ON public.containment_zones(district, status);
CREATE INDEX IF NOT EXISTS idx_containment_case_id ON public.containment_zones(case_id);
CREATE INDEX IF NOT EXISTS idx_containment_report_id ON public.containment_zones(report_id);
CREATE INDEX IF NOT EXISTS idx_containment_geom ON public.containment_zones USING GIST(center_geom);

CREATE TRIGGER trg_containment_updated_at
    BEFORE UPDATE ON public.containment_zones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_containment_sync_geom
    BEFORE INSERT OR UPDATE OF center_lat, center_lng ON public.containment_zones
    FOR EACH ROW EXECUTE FUNCTION public.sync_containment_geom();

-- Circular Foreign Key Constraint: Link disease_cases to containment_zones
ALTER TABLE public.disease_cases
    DROP CONSTRAINT IF EXISTS fk_case_containment_zone,
    ADD CONSTRAINT fk_case_containment_zone
    FOREIGN KEY (containment_zone_id) REFERENCES public.containment_zones(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS idx_cases_containment_zone ON public.disease_cases(containment_zone_id);

-- -------------------------------------------------------------------------------------
-- 18. ADVISORIES (Bilingual Preventive Veterinary Bulletins)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advisories (
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

CREATE INDEX IF NOT EXISTS idx_advisories_district_block ON public.advisories(target_district, target_block, severity);

CREATE TRIGGER trg_advisories_updated_at
    BEFORE UPDATE ON public.advisories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- 19. NOTIFICATIONS (Persistent Audit & Real-time Notification Queue)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
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

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_case ON public.notifications(case_id);

CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- 20. SCAN IMAGES (Lesion Image Metadata Linked to Supabase Storage)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_images (
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

CREATE INDEX IF NOT EXISTS idx_scan_images_animal ON public.scan_images(animal_id);
CREATE INDEX IF NOT EXISTS idx_scan_images_owner ON public.scan_images(owner_id);

CREATE TRIGGER trg_scan_images_updated_at
    BEFORE UPDATE ON public.scan_images
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- 21. AUDIT LOGS (System-wide Clinical & Administrative Traceability)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) DEFAULT '',
    actor_role VARCHAR(64) DEFAULT '',
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    details JSONB DEFAULT '{}'::JSONB,
    ip_address VARCHAR(64) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at DESC);

-- -------------------------------------------------------------------------------------
-- 22. STORED PROCEDURES & ADVANCED BUSINESS LOGIC
-- -------------------------------------------------------------------------------------

-- A. Race-Condition-Free Atomic Case Claim Procedure
CREATE OR REPLACE FUNCTION public.claim_disease_case(
    p_case_identifier TEXT,
    p_vet_id UUID,
    p_vet_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_case RECORD;
    v_updated_case RECORD;
BEGIN
    -- Attempt atomic CAS (Compare-And-Swap)
    UPDATE public.disease_cases
    SET status = 'Investigating',
        assigned_vet_id = p_vet_id,
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE (id::text = p_case_identifier OR case_id = p_case_identifier)
      AND status IN ('New', 'OPEN')
      AND assigned_vet_id IS NULL
    RETURNING * INTO v_updated_case;

    IF FOUND THEN
        -- Add audit entry to case_timeline
        INSERT INTO public.case_timeline (case_id, status, updated_by, updater_name, notes)
        VALUES (
            v_updated_case.id,
            'Investigating',
            p_vet_id,
            p_vet_name,
            FORMAT('Case claimed by Dr. %s. Clinical investigation initiated.', p_vet_name)
        );

        -- Mark notifications as read for this vet
        UPDATE public.notifications
        SET status = 'READ', updated_at = NOW()
        WHERE case_id = v_updated_case.id AND recipient_id = p_vet_id;

        RETURN jsonb_build_object(
            'success', true,
            'claimed', true,
            'case', to_jsonb(v_updated_case)
        );
    ELSE
        -- Case was either already claimed or does not exist
        SELECT id, case_id, status, assigned_vet_id INTO v_case
        FROM public.disease_cases
        WHERE (id::text = p_case_identifier OR case_id = p_case_identifier);

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'CASE_NOT_FOUND',
                'message', 'Disease referral case does not exist.'
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'ALREADY_CLAIMED',
                'current_status', v_case.status,
                'assigned_vet_id', v_case.assigned_vet_id,
                'message', 'Case is already claimed or in an active investigation status.'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- B. PostGIS-Powered Outbreak Clustering (Replacing JS Haversine Loop)
-- Returns spatial outbreak clusters within threshold distance (default 5.0 km)
-- Uses two-tier CTE to guarantee no nested aggregate function calls
CREATE OR REPLACE FUNCTION public.get_spatial_outbreak_clusters(
    p_district TEXT,
    p_distance_km DOUBLE PRECISION DEFAULT 5.0
)
RETURNS TABLE (
    cluster_id INTEGER,
    disease VARCHAR(255),
    case_count BIGINT,
    total_affected BIGINT,
    centroid_lat DOUBLE PRECISION,
    centroid_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION,
    risk_tier TEXT,
    is_outbreak BOOLEAN
) AS $$
DECLARE
    v_eps DOUBLE PRECISION := (p_distance_km / 111.32); -- Approx degrees for 5km
BEGIN
    RETURN QUERY
    WITH clustered_cases AS (
        SELECT
            dc.id,
            dc.case_id,
            dc.disease,
            dc.species,
            dc.risk,
            dc.affected_count,
            dc.latitude,
            dc.longitude,
            dc.coordinates_geom,
            ST_ClusterDBSCAN(dc.coordinates_geom, eps := v_eps, minpoints := 1) OVER(PARTITION BY dc.disease) AS cid
        FROM public.disease_cases dc
        WHERE dc.district_id ILIKE p_district
          AND dc.status NOT IN ('Resolved', 'RESOLVED')
          AND dc.coordinates_geom IS NOT NULL
    ),
    cluster_summaries AS (
        SELECT
            cc.cid AS c_id,
            cc.disease AS c_disease,
            COUNT(cc.id) AS c_case_count,
            COALESCE(SUM(cc.affected_count), 0)::BIGINT AS c_total_affected,
            ROUND(AVG(cc.latitude)::numeric, 4)::DOUBLE PRECISION AS c_lat,
            ROUND(AVG(cc.longitude)::numeric, 4)::DOUBLE PRECISION AS c_lng,
            BOOL_OR(cc.risk = 'Critical') AS c_has_critical,
            (COUNT(cc.id) >= 2) AS c_is_outbreak
        FROM clustered_cases cc
        GROUP BY cc.cid, cc.disease
    )
    SELECT
        cs.c_id AS cluster_id,
        cs.c_disease AS disease,
        cs.c_case_count AS case_count,
        cs.c_total_affected AS total_affected,
        cs.c_lat AS centroid_lat,
        cs.c_lng AS centroid_lng,
        ROUND(
            COALESCE(
                MAX(
                    ST_Distance(
                        cc.coordinates_geom::geography,
                        ST_SetSRID(ST_MakePoint(cs.c_lng, cs.c_lat), 4326)::geography
                    )
                ) / 1000.0,
                2.5
            )::numeric,
            1
        )::DOUBLE PRECISION AS radius_km,
        CASE
            WHEN cs.c_case_count >= 3 OR cs.c_total_affected >= 10 OR cs.c_has_critical THEN 'Critical'
            WHEN cs.c_case_count >= 2 OR cs.c_total_affected >= 5 THEN 'High'
            ELSE 'Moderate'
        END AS risk_tier,
        cs.c_is_outbreak AS is_outbreak
    FROM cluster_summaries cs
    JOIN clustered_cases cc ON cc.cid = cs.c_id AND cc.disease = cs.c_disease
    GROUP BY cs.c_id, cs.c_disease, cs.c_case_count, cs.c_total_affected, cs.c_lat, cs.c_lng, cs.c_has_critical, cs.c_is_outbreak
    ORDER BY is_outbreak DESC, total_affected DESC;
END;
$$ LANGUAGE plpgsql;

-- C. PostGIS Proximity Query for Nearest Available Veterinarians
CREATE OR REPLACE FUNCTION public.get_nearby_veterinarians(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 50.0,
    p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    phone VARCHAR(32),
    email VARCHAR(255),
    district VARCHAR(255),
    block VARCHAR(255),
    village VARCHAR(255),
    clinic_name VARCHAR(255),
    specialization VARCHAR(255),
    rating NUMERIC(3, 2),
    experience INTEGER,
    services TEXT[],
    emergency_available BOOLEAN,
    distance_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.phone,
        p.email,
        p.district,
        p.block,
        p.village,
        p.clinic_name,
        p.specialization,
        p.rating,
        p.experience,
        p.services,
        p.emergency_available,
        ROUND((ST_Distance(p.coordinates_geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000.0)::numeric, 1) AS distance_km
    FROM public.profiles p
    WHERE p.role = 'veterinarian'
      AND p.is_active = TRUE
      AND p.is_available = TRUE
      AND p.coordinates_geom IS NOT NULL
      AND ST_DWithin(p.coordinates_geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000.0)
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------------------------
-- 23. ANALYTICS VIEWS (Fast Dashboard KPI Computation)
-- -------------------------------------------------------------------------------------

-- View: District Surveillance Summary
CREATE OR REPLACE VIEW public.v_district_surveillance_summary AS
SELECT
    r.district,
    COUNT(r.id) AS total_reports,
    COUNT(r.id) FILTER (WHERE r.status IN ('Reported', 'Triaged', 'Field Verified', 'Escalated')) AS active_cases,
    COUNT(r.id) FILTER (WHERE r.status IN ('Contained', 'Closed')) AS contained_cases,
    COALESCE(SUM(r.mortality_count), 0) AS total_mortality,
    COALESCE(SUM(r.affected_count), 0) AS total_affected,
    COUNT(tr.id) FILTER (WHERE tr.risk_level = 'Critical') AS critical_cases,
    COUNT(tr.id) FILTER (WHERE tr.risk_level = 'High') AS high_risk_cases,
    COUNT(tr.id) FILTER (WHERE tr.risk_level = 'Moderate') AS moderate_risk_cases,
    COUNT(tr.id) FILTER (WHERE tr.risk_level = 'Low') AS low_risk_cases,
    COUNT(tr.id) FILTER (WHERE tr.outbreak_flag = TRUE) AS outbreak_clusters_flagged
FROM public.reports r
LEFT JOIN public.triage_results tr ON tr.report_id = r.id
GROUP BY r.district;

-- View: 30-Day Temporal Trendlines
CREATE OR REPLACE VIEW public.v_daily_epidemic_trends AS
SELECT
    DATE_TRUNC('day', r.created_at)::DATE AS trend_date,
    r.district,
    COUNT(r.id) AS daily_cases,
    COALESCE(SUM(r.mortality_count), 0) AS daily_mortalities,
    COUNT(tr.id) FILTER (WHERE tr.risk_level IN ('Critical', 'High')) AS critical_cases,
    COUNT(tr.id) FILTER (WHERE tr.outbreak_flag = TRUE) AS outbreaks_detected
FROM public.reports r
LEFT JOIN public.triage_results tr ON tr.report_id = r.id
WHERE r.created_at >= NOW() - INTERVAL '30 days'
GROUP BY trend_date, r.district
ORDER BY trend_date DESC;

-- -------------------------------------------------------------------------------------

-- -------------------------------------------------------------------------------------
-- 24. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY (RLS) ACROSS ALL 18 RELATIONAL TABLES
-- -------------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_camp_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notified_vets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containment_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------------------
-- 3. SECURITY HELPER FUNCTIONS (Optimized STABLE routines for RLS policies)
-- -------------------------------------------------------------------------------------

-- Returns the public.profiles.id corresponding to the authenticated Supabase auth.uid()
-- Supports both indirect linkage (auth_user_id = auth.uid()) and direct ID matching (id = auth.uid())
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID AS $$
    SELECT id FROM public.profiles 
    WHERE (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
       OR (id = auth.uid())
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns the current user's role (farmer, field_worker, veterinarian, officer, admin)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles 
    WHERE (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
       OR (id = auth.uid())
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns the current user's jurisdiction district
CREATE OR REPLACE FUNCTION public.get_current_user_district()
RETURNS VARCHAR AS $$
    SELECT district FROM public.profiles 
    WHERE (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
       OR (id = auth.uid())
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -------------------------------------------------------------------------------------
-- 4. RLS POLICIES FOR PROFILES
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (
    auth_user_id = auth.uid() OR
    id = auth.uid() OR
    id = public.get_current_profile_id()
)
WITH CHECK (
    auth_user_id = auth.uid() OR
    id = auth.uid() OR
    id = public.get_current_profile_id()
);

DROP POLICY IF EXISTS "profiles_insert_registration" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insertable on registration" ON public.profiles;
CREATE POLICY "profiles_insert_registration"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (true);

-- -------------------------------------------------------------------------------------
-- 5. RLS POLICIES FOR ANIMALS & MEDICAL HISTORIES
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "animals_select" ON public.animals;
DROP POLICY IF EXISTS "Animals viewable by owner and district vets" ON public.animals;
CREATE POLICY "animals_select"
ON public.animals FOR SELECT TO authenticated
USING (
    owner_id = public.get_current_profile_id() OR
    owner_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker')
);

DROP POLICY IF EXISTS "animals_insert" ON public.animals;
DROP POLICY IF EXISTS "Farmers can insert own animals" ON public.animals;
CREATE POLICY "animals_insert"
ON public.animals FOR INSERT TO authenticated
WITH CHECK (
    owner_id = public.get_current_profile_id() OR
    owner_id = auth.uid() OR
    public.get_current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "animals_update" ON public.animals;
DROP POLICY IF EXISTS "Farmers can update own animals" ON public.animals;
CREATE POLICY "animals_update"
ON public.animals FOR UPDATE TO authenticated
USING (
    owner_id = public.get_current_profile_id() OR
    owner_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin')
)
WITH CHECK (
    owner_id = public.get_current_profile_id() OR
    owner_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin')
);

DROP POLICY IF EXISTS "animals_delete" ON public.animals;
CREATE POLICY "animals_delete"
ON public.animals FOR DELETE TO authenticated
USING (
    owner_id = public.get_current_profile_id() OR
    owner_id = auth.uid() OR
    public.get_current_user_role() = 'admin'
);

-- Animal timeline, vaccinations, and treatments
-- Explicitly qualifies public.<table_name>.animal_id to prevent inner subquery scope shadowing
DROP POLICY IF EXISTS "animal_timeline_select" ON public.animal_timeline;
DROP POLICY IF EXISTS "Animal child records viewable" ON public.animal_timeline;
CREATE POLICY "animal_timeline_select"
ON public.animal_timeline FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.animals a
        WHERE a.id = public.animal_timeline.animal_id
          AND (
              a.owner_id = public.get_current_profile_id() OR
              a.owner_id = auth.uid() OR
              public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker')
          )
    )
);

DROP POLICY IF EXISTS "animal_timeline_insert" ON public.animal_timeline;
CREATE POLICY "animal_timeline_insert"
ON public.animal_timeline FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.animals a
        WHERE a.id = public.animal_timeline.animal_id
          AND (
              a.owner_id = public.get_current_profile_id() OR
              a.owner_id = auth.uid() OR
              public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker')
          )
    )
);

DROP POLICY IF EXISTS "animal_vaccinations_select" ON public.animal_vaccinations;
DROP POLICY IF EXISTS "Animal vaccinations viewable" ON public.animal_vaccinations;
CREATE POLICY "animal_vaccinations_select"
ON public.animal_vaccinations FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.animals a
        WHERE a.id = public.animal_vaccinations.animal_id
          AND (
              a.owner_id = public.get_current_profile_id() OR
              a.owner_id = auth.uid() OR
              public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker')
          )
    )
);

DROP POLICY IF EXISTS "animal_vaccinations_insert" ON public.animal_vaccinations;
CREATE POLICY "animal_vaccinations_insert"
ON public.animal_vaccinations FOR INSERT TO authenticated
WITH CHECK (
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker') OR
    EXISTS (
        SELECT 1 FROM public.animals a
        WHERE a.id = public.animal_vaccinations.animal_id
          AND (a.owner_id = public.get_current_profile_id() OR a.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "animal_treatments_select" ON public.animal_treatments;
DROP POLICY IF EXISTS "Animal treatments viewable" ON public.animal_treatments;
CREATE POLICY "animal_treatments_select"
ON public.animal_treatments FOR SELECT TO authenticated
USING (
    vet_id = public.get_current_profile_id() OR
    vet_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker') OR
    EXISTS (
        SELECT 1 FROM public.animals a
        WHERE a.id = public.animal_treatments.animal_id
          AND (a.owner_id = public.get_current_profile_id() OR a.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "animal_treatments_insert" ON public.animal_treatments;
CREATE POLICY "animal_treatments_insert"
ON public.animal_treatments FOR INSERT TO authenticated
WITH CHECK (
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin')
);

-- -------------------------------------------------------------------------------------
-- 6. RLS POLICIES FOR VACCINATION DRIVES & REGISTRATIONS
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "vaccination_drives_select" ON public.vaccination_drives;
DROP POLICY IF EXISTS "Vaccination drives publicly viewable" ON public.vaccination_drives;
CREATE POLICY "vaccination_drives_select"
ON public.vaccination_drives FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "vaccination_drives_manage" ON public.vaccination_drives;
DROP POLICY IF EXISTS "Officers can manage vaccination drives" ON public.vaccination_drives;
CREATE POLICY "vaccination_drives_manage"
ON public.vaccination_drives FOR ALL TO authenticated
USING (
    assigned_officer_id = public.get_current_profile_id() OR
    assigned_officer_id = auth.uid() OR
    public.get_current_user_role() IN ('officer', 'admin')
)
WITH CHECK (
    assigned_officer_id = public.get_current_profile_id() OR
    assigned_officer_id = auth.uid() OR
    public.get_current_user_role() IN ('officer', 'admin')
);

DROP POLICY IF EXISTS "camp_regs_select" ON public.vaccination_camp_registrations;
DROP POLICY IF EXISTS "Camp registrations viewable" ON public.vaccination_camp_registrations;
CREATE POLICY "camp_regs_select"
ON public.vaccination_camp_registrations FOR SELECT TO authenticated
USING (
    farmer_id = public.get_current_profile_id() OR
    farmer_id = auth.uid() OR
    public.get_current_user_role() IN ('officer', 'veterinarian', 'admin')
);

DROP POLICY IF EXISTS "camp_regs_insert" ON public.vaccination_camp_registrations;
DROP POLICY IF EXISTS "Farmers can register for camps" ON public.vaccination_camp_registrations;
CREATE POLICY "camp_regs_insert"
ON public.vaccination_camp_registrations FOR INSERT TO authenticated
WITH CHECK (
    farmer_id = public.get_current_profile_id() OR
    farmer_id = auth.uid() OR
    public.get_current_user_role() IN ('officer', 'admin')
);

-- -------------------------------------------------------------------------------------
-- 7. RLS POLICIES FOR SURVEILLANCE REPORTS, TRIAGE & LABS
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "Reports viewable by author and district staff" ON public.reports;
CREATE POLICY "reports_select"
ON public.reports FOR SELECT TO authenticated
USING (
    reporter_id = public.get_current_profile_id() OR
    reporter_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker')
);

DROP POLICY IF EXISTS "reports_insert" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
CREATE POLICY "reports_insert"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (
    reporter_id = public.get_current_profile_id() OR
    reporter_id = auth.uid() OR
    public.get_current_user_role() IN ('field_worker', 'admin')
);

DROP POLICY IF EXISTS "reports_update" ON public.reports;
CREATE POLICY "reports_update"
ON public.reports FOR UPDATE TO authenticated
USING (
    reporter_id = public.get_current_profile_id() OR
    reporter_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin')
);

DROP POLICY IF EXISTS "triage_results_select" ON public.triage_results;
DROP POLICY IF EXISTS "Triage results viewable" ON public.triage_results;
CREATE POLICY "triage_results_select"
ON public.triage_results FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "triage_results_manage" ON public.triage_results;
CREATE POLICY "triage_results_manage"
ON public.triage_results FOR ALL TO authenticated
USING (public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker'))
WITH CHECK (public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker'));

DROP POLICY IF EXISTS "lab_referrals_select" ON public.lab_referrals;
DROP POLICY IF EXISTS "Lab referrals viewable" ON public.lab_referrals;
CREATE POLICY "lab_referrals_select"
ON public.lab_referrals FOR SELECT TO authenticated
USING (
    collected_by = public.get_current_profile_id() OR
    collected_by = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker') OR
    EXISTS (
        SELECT 1 FROM public.reports r 
        WHERE r.id = public.lab_referrals.report_id 
          AND (r.reporter_id = public.get_current_profile_id() OR r.reporter_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "lab_referrals_manage" ON public.lab_referrals;
CREATE POLICY "lab_referrals_manage"
ON public.lab_referrals FOR ALL TO authenticated
USING (public.get_current_user_role() IN ('veterinarian', 'officer', 'admin'))
WITH CHECK (public.get_current_user_role() IN ('veterinarian', 'officer', 'admin'));

-- -------------------------------------------------------------------------------------
-- 8. RLS POLICIES FOR DISEASE CASES & REFERRALS (PS-128 CORE)
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "disease_cases_select" ON public.disease_cases;
DROP POLICY IF EXISTS "Disease cases access policy" ON public.disease_cases;
CREATE POLICY "disease_cases_select"
ON public.disease_cases FOR SELECT TO authenticated
USING (
    farmer_id = public.get_current_profile_id() OR
    farmer_id = auth.uid() OR
    assigned_vet_id = public.get_current_profile_id() OR
    assigned_vet_id = auth.uid() OR
    public.get_current_user_role() = 'admin' OR
    (
        public.get_current_user_role() IN ('veterinarian', 'officer', 'field_worker') AND
        district_id ILIKE public.get_current_user_district()
    )
);

DROP POLICY IF EXISTS "disease_cases_insert" ON public.disease_cases;
CREATE POLICY "disease_cases_insert"
ON public.disease_cases FOR INSERT TO authenticated
WITH CHECK (
    farmer_id = public.get_current_profile_id() OR
    farmer_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker')
);

DROP POLICY IF EXISTS "disease_cases_update" ON public.disease_cases;
DROP POLICY IF EXISTS "Vets and Officers can update cases" ON public.disease_cases;
CREATE POLICY "disease_cases_update"
ON public.disease_cases FOR UPDATE TO authenticated
USING (
    assigned_vet_id = public.get_current_profile_id() OR
    assigned_vet_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin')
)
WITH CHECK (
    assigned_vet_id = public.get_current_profile_id() OR
    assigned_vet_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin')
);

-- Case Timeline & Notified Vets
-- CRITICAL FIX: Explicitly qualifies public.case_timeline.case_id (UUID)
-- Eliminates scope shadowing against public.disease_cases.case_id (VARCHAR) which previously caused:
-- ERROR 42883: operator does not exist: uuid = character varying
DROP POLICY IF EXISTS "case_timeline_select" ON public.case_timeline;
DROP POLICY IF EXISTS "Case timeline viewable" ON public.case_timeline;
CREATE POLICY "case_timeline_select"
ON public.case_timeline FOR SELECT TO authenticated
USING (
    updated_by = public.get_current_profile_id() OR
    updated_by = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin') OR
    EXISTS (
        SELECT 1 FROM public.disease_cases dc
        WHERE dc.id = public.case_timeline.case_id
          AND (
              dc.farmer_id = public.get_current_profile_id() OR
              dc.farmer_id = auth.uid() OR
              dc.assigned_vet_id = public.get_current_profile_id() OR
              dc.assigned_vet_id = auth.uid() OR
              public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'field_worker')
          )
    )
);

DROP POLICY IF EXISTS "case_timeline_insert" ON public.case_timeline;
CREATE POLICY "case_timeline_insert"
ON public.case_timeline FOR INSERT TO authenticated
WITH CHECK (
    updated_by = public.get_current_profile_id() OR
    updated_by = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin', 'farmer')
);

DROP POLICY IF EXISTS "case_notified_vets_select" ON public.case_notified_vets;
DROP POLICY IF EXISTS "Case notified vets viewable" ON public.case_notified_vets;
CREATE POLICY "case_notified_vets_select"
ON public.case_notified_vets FOR SELECT TO authenticated
USING (
    vet_id = public.get_current_profile_id() OR
    vet_id = auth.uid() OR
    public.get_current_user_role() IN ('officer', 'admin') OR
    EXISTS (
        SELECT 1 FROM public.disease_cases dc
        WHERE dc.id = public.case_notified_vets.case_id
          AND (dc.farmer_id = public.get_current_profile_id() OR dc.farmer_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "case_notified_vets_insert" ON public.case_notified_vets;
CREATE POLICY "case_notified_vets_insert"
ON public.case_notified_vets FOR INSERT TO authenticated
WITH CHECK (true);

-- -------------------------------------------------------------------------------------
-- 9. RLS POLICIES FOR CONTAINMENT ZONES & ADVISORIES (PUBLIC HEALTH VISIBILITY)
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "containment_zones_select" ON public.containment_zones;
DROP POLICY IF EXISTS "Containment zones viewable by all" ON public.containment_zones;
CREATE POLICY "containment_zones_select"
ON public.containment_zones FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "containment_zones_manage" ON public.containment_zones;
DROP POLICY IF EXISTS "Veterinarians and officers can manage containment" ON public.containment_zones;
CREATE POLICY "containment_zones_manage"
ON public.containment_zones FOR ALL TO authenticated
USING (
    created_by_vet_id = public.get_current_profile_id() OR
    created_by_vet_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin')
)
WITH CHECK (
    created_by_vet_id = public.get_current_profile_id() OR
    created_by_vet_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin')
);

DROP POLICY IF EXISTS "advisories_select" ON public.advisories;
DROP POLICY IF EXISTS "Advisories viewable by all" ON public.advisories;
CREATE POLICY "advisories_select"
ON public.advisories FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "advisories_manage" ON public.advisories;
DROP POLICY IF EXISTS "Officers can manage advisories" ON public.advisories;
CREATE POLICY "advisories_manage"
ON public.advisories FOR ALL TO authenticated
USING (public.get_current_user_role() IN ('officer', 'admin'))
WITH CHECK (public.get_current_user_role() IN ('officer', 'admin'));

-- -------------------------------------------------------------------------------------
-- 10. RLS POLICIES FOR NOTIFICATIONS & SCAN IMAGES
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "notifications_select"
ON public.notifications FOR SELECT TO authenticated
USING (
    recipient_id = public.get_current_profile_id() OR
    recipient_id = auth.uid()
);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark own notifications as read" ON public.notifications;
CREATE POLICY "notifications_update"
ON public.notifications FOR UPDATE TO authenticated
USING (
    recipient_id = public.get_current_profile_id() OR
    recipient_id = auth.uid()
)
WITH CHECK (
    recipient_id = public.get_current_profile_id() OR
    recipient_id = auth.uid()
);

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "scan_images_select" ON public.scan_images;
DROP POLICY IF EXISTS "Scan images viewable by owner and vets" ON public.scan_images;
CREATE POLICY "scan_images_select"
ON public.scan_images FOR SELECT TO authenticated
USING (
    owner_id = public.get_current_profile_id() OR
    owner_id = auth.uid() OR
    public.get_current_user_role() IN ('veterinarian', 'officer', 'admin')
);

DROP POLICY IF EXISTS "scan_images_insert" ON public.scan_images;
DROP POLICY IF EXISTS "Scan images insertable" ON public.scan_images;
CREATE POLICY "scan_images_insert"
ON public.scan_images FOR INSERT TO authenticated
WITH CHECK (
    owner_id = public.get_current_profile_id() OR
    owner_id = auth.uid() OR
    public.get_current_user_role() IN ('farmer', 'veterinarian', 'field_worker', 'admin')
);

-- -------------------------------------------------------------------------------------
-- 11. RLS POLICIES FOR AUDIT LOGS (ADMINISTRATIVE ACCESS ONLY)
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs viewable by officers and admins" ON public.audit_logs;
CREATE POLICY "audit_logs_select"
ON public.audit_logs FOR SELECT TO authenticated
USING (
    actor_id = public.get_current_profile_id() OR
    actor_id = auth.uid() OR
    public.get_current_user_role() IN ('officer', 'admin')
);

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insertable by system" ON public.audit_logs;
CREATE POLICY "audit_logs_insert"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- -------------------------------------------------------------------------------------
-- 12. SUPABASE REALTIME CONFIGURATION (CDC FOR SSE & WEBSOCKETS)
-- -------------------------------------------------------------------------------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.disease_cases;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.containment_zones;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vaccination_drives;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.disease_cases REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.containment_zones REPLICA IDENTITY FULL;
ALTER TABLE public.reports REPLICA IDENTITY FULL;
ALTER TABLE public.vaccination_drives REPLICA IDENTITY FULL;

-- =====================================================================================
-- END OF RLS & REALTIME CONFIGURATION
-- =====================================================================================