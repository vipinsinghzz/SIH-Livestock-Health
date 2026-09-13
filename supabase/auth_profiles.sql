-- =====================================================================================
-- LIVESTOCK SAATHI – AI-POWERED LIVESTOCK HEALTH & EARLY WARNING PLATFORM
-- SIH 2026 Problem Statement 128
-- Supabase Auth & Public Profiles Linkage Migration
-- Version: 1.0.0
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. FOREIGN KEY CONSTRAINT: public.profiles -> auth.users
-- Links the public profiles record directly to Supabase Auth's user identity
-- -------------------------------------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        -- Add foreign key constraint if it doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_profiles_auth_user' 
              AND table_name = 'profiles'
        ) THEN
            ALTER TABLE public.profiles
                ADD CONSTRAINT fk_profiles_auth_user
                FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
                ON DELETE CASCADE;
        END IF;

        -- Create unique index on auth_user_id to ensure 1-to-1 linkage
        CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id_unique 
            ON public.profiles(auth_user_id) 
            WHERE auth_user_id IS NOT NULL;
    END IF;
END $$;

-- -------------------------------------------------------------------------------------
-- 2. AUTOMATIC PROFILE SYNCHRONIZATION TRIGGER
-- When a user signs up or is created via Supabase Auth (auth.users),
-- automatically provision or link their corresponding row in public.profiles.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
    v_raw_role TEXT;
    v_name TEXT;
    v_phone TEXT;
    v_district TEXT;
    v_state TEXT;
    v_village TEXT;
    v_block TEXT;
    v_reg_no TEXT;
    v_dept TEXT;
    v_lang TEXT;
    v_spec TEXT;
BEGIN
    -- Extract user metadata passed from Supabase Auth client or Admin API
    v_name     := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_phone    := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, '');
    v_district := COALESCE(NEW.raw_user_meta_data->>'district', 'Pune');
    v_state    := COALESCE(NEW.raw_user_meta_data->>'state', 'Maharashtra');
    v_village  := COALESCE(NEW.raw_user_meta_data->>'village', '');
    v_block    := COALESCE(NEW.raw_user_meta_data->>'block', '');
    v_reg_no   := COALESCE(NEW.raw_user_meta_data->>'registration_no', NEW.raw_user_meta_data->>'registrationNo', '');
    v_dept     := COALESCE(NEW.raw_user_meta_data->>'department', '');
    v_lang     := COALESCE(NEW.raw_user_meta_data->>'preferred_language', NEW.raw_user_meta_data->>'preferredLanguage', 'hi');
    v_spec     := COALESCE(NEW.raw_user_meta_data->>'specialization', 'General Veterinary Physician');

    -- Map string role to public.user_role enum (support field_worker as alias to veterinarian)
    v_raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'));
    IF v_raw_role IN ('veterinarian', 'field_worker') THEN
        v_role := 'veterinarian'::public.user_role;
    ELSIF v_raw_role = 'officer' THEN
        v_role := 'officer'::public.user_role;
    ELSIF v_raw_role = 'admin' THEN
        v_role := 'admin'::public.user_role;
    ELSE
        v_role := 'farmer'::public.user_role;
    END IF;

    -- Upsert profile record linked to the new auth.users record
    INSERT INTO public.profiles (
        auth_user_id,
        name,
        role,
        is_active,
        phone,
        email,
        password_hash,
        village,
        block,
        district,
        state,
        registration_no,
        department,
        preferred_language,
        specialization,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        v_name,
        v_role,
        TRUE,
        v_phone,
        LOWER(NEW.email),
        '', -- Password hash is securely managed inside auth.users
        v_village,
        v_block,
        v_district,
        v_state,
        v_reg_no,
        v_dept,
        v_lang,
        v_spec,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        name = CASE WHEN public.profiles.name = '' OR public.profiles.name IS NULL THEN EXCLUDED.name ELSE public.profiles.name END,
        role = EXCLUDED.role,
        phone = CASE WHEN public.profiles.phone = '' OR public.profiles.phone IS NULL THEN EXCLUDED.phone ELSE public.profiles.phone END,
        district = CASE WHEN public.profiles.district = '' OR public.profiles.district IS NULL THEN EXCLUDED.district ELSE public.profiles.district END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger firing on every new user registration in Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------------------------------
-- 3. SYNC HELPER FUNCTION FOR EXISTING SEEDED PROFILES
-- Links existing public.profiles records with auth.users accounts having matching emails
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_existing_auth_profiles()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    UPDATE public.profiles p
    SET auth_user_id = u.id,
        updated_at = NOW()
    FROM auth.users u
    WHERE LOWER(p.email) = LOWER(u.email)
      AND (p.auth_user_id IS NULL OR p.auth_user_id != u.id);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
