-- =====================================================================================
-- LIVESTOCK SAATHI – AI-POWERED LIVESTOCK HEALTH & EARLY WARNING PLATFORM
-- SIH 2026 Problem Statement 128
-- Supabase Storage Architecture & RLS Security Configuration
-- File: supabase/storage_setup.sql
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. CREATE PRIVATE STORAGE BUCKET: livestock-scans
-- -------------------------------------------------------------------------------------
-- Sensitive livestock lesion and disease diagnostic images are strictly private.
-- Only authorized farmers, treating veterinarians, and animal husbandry officials
-- may access scans through time-limited signed URLs or authenticated proxy routes.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'livestock-scans',
    'livestock-scans',
    FALSE, -- STRICTLY PRIVATE
    10485760, -- 10MB maximum file size
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -------------------------------------------------------------------------------------
-- 2. ENHANCE public.scan_images METADATA TABLE
-- -------------------------------------------------------------------------------------
-- Ensure table exists and stores complete Supabase Storage references alongside clinical tags

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

ALTER TABLE public.scan_images
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS bucket_id VARCHAR(64) DEFAULT 'livestock-scans',
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(64) DEFAULT 'image/jpeg',
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS sha256_hash VARCHAR(64) DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_scan_images_storage_path ON public.scan_images(storage_path);
CREATE INDEX IF NOT EXISTS idx_scan_images_created_at ON public.scan_images(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 3. STORAGE ROW LEVEL SECURITY (RLS) POLICIES ON storage.objects
-- -------------------------------------------------------------------------------------
-- NOTE: Row Level Security is permanently enabled on storage.objects by default in Supabase.
-- DO NOT run "ALTER TABLE storage.objects ...": storage.objects is owned by supabase_storage_admin
-- and will trigger "ERROR: 42501: must be owner of table objects".
-- Policies are created directly using DROP POLICY IF EXISTS and CREATE POLICY.

-- 3A. INSERT POLICY: Authenticated Users (Farmers, Vets, Officers)
-- Upload path format: scans/<owner_profile_id>/<timestamp>-<random>.<ext>
DROP POLICY IF EXISTS "livestock_scans_insert" ON storage.objects;
CREATE POLICY "livestock_scans_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'livestock-scans'
    AND (
        -- User can upload to their own folder: scans/<auth.uid()>/...
        (storage.foldername(name))[1] = 'scans'
        AND (
            (storage.foldername(name))[2] = auth.uid()::text
            OR (storage.foldername(name))[2] = public.get_current_profile_id()::text
            OR public.get_current_user_role()::text IN ('veterinarian', 'field_worker', 'officer', 'admin')
        )
    )
);

-- 3B. SELECT POLICY: Image Owner (Farmer Access Control)
-- Farmers can only view images belonging to their own animals / uploaded by them.
DROP POLICY IF EXISTS "livestock_scans_select_owner" ON storage.objects;
CREATE POLICY "livestock_scans_select_owner"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'livestock-scans'
    AND (
        -- Directly matching storage owner or path segment
        owner::text = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
        OR (storage.foldername(name))[2] = public.get_current_profile_id()::text
    )
);

-- 3C. SELECT POLICY: Authorized Veterinarians
-- Veterinarians and field workers can inspect scans for clinical referral cases.
DROP POLICY IF EXISTS "livestock_scans_select_vet" ON storage.objects;
CREATE POLICY "livestock_scans_select_vet"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'livestock-scans'
    AND public.get_current_user_role()::text IN ('veterinarian', 'field_worker')
);

-- 3D. SELECT POLICY: Government Officers & Platform Administrators
-- Veterinary officers and admins can audit and monitor all livestock scans.
DROP POLICY IF EXISTS "livestock_scans_select_admin" ON storage.objects;
CREATE POLICY "livestock_scans_select_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'livestock-scans'
    AND public.get_current_user_role()::text IN ('officer', 'admin')
);

-- 3E. UPDATE/DELETE POLICY: Owner & Admin Management
DROP POLICY IF EXISTS "livestock_scans_delete" ON storage.objects;
CREATE POLICY "livestock_scans_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'livestock-scans'
    AND (
        owner::text = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
        OR (storage.foldername(name))[2] = public.get_current_profile_id()::text
        OR public.get_current_user_role()::text = 'admin'
    )
);

-- -------------------------------------------------------------------------------------
-- 4. VERIFICATION HELPER FUNCTION
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_scan_access(
    p_storage_path TEXT,
    p_user_id UUID,
    p_user_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- Admins and officers always have access
    IF p_user_role IN ('admin', 'officer') THEN
        RETURN TRUE;
    END IF;

    -- Veterinarians have clinical examination access
    IF p_user_role IN ('veterinarian', 'field_worker') THEN
        RETURN TRUE;
    END IF;

    -- Farmers only have access if they own the scan image
    SELECT owner_id INTO v_owner_id
    FROM public.scan_images
    WHERE storage_path = p_storage_path
    LIMIT 1;

    IF v_owner_id IS NOT NULL AND v_owner_id = p_user_id THEN
        RETURN TRUE;
    END IF;

    -- Check if storage path prefix matches user id
    IF p_storage_path LIKE 'scans/' || p_user_id::text || '/%' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
