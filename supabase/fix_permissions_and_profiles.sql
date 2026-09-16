-- =====================================================================================
-- LIVESTOCK SAATHI – PRODUCTION DATABASE PERMISSION & PROFILE REPAIR MIGRATION
-- Fixes PostgreSQL Error 42501 (permission denied for table profiles)
-- Enables automatic user profile synchronization & backfills existing orphaned auth.users
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. TABLE & SCHEMA GRANTS (Ensures PostgREST service_role & postgres have full access)
-- -------------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;

-- Ensure authenticated role can read and write profiles
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- Ensure authenticated role can manage animals
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.animals TO authenticated;
GRANT SELECT ON TABLE public.animals TO anon;

-- -------------------------------------------------------------------------------------
-- 2. VERIFY ROW LEVEL SECURITY & POLICIES ON PROFILES
-- -------------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view profiles
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to insert profile on registration
DROP POLICY IF EXISTS "profiles_insert_registration" ON public.profiles;
CREATE POLICY "profiles_insert_registration"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
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

-- -------------------------------------------------------------------------------------
-- 3. AUTOMATIC PROFILE SYNCHRONIZATION TRIGGER (SECURITY DEFINER)
-- Bypasses RLS and table grants when user is created in auth.users
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
        '',
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------------------------------
-- 4. BACKFILL ORPHANED auth.users INTO public.profiles
-- Safely creates profiles for any existing users in auth.users that lack a profile
-- -------------------------------------------------------------------------------------
INSERT INTO public.profiles (
    id,
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
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    u.id,
    COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    CASE 
        WHEN LOWER(COALESCE(u.raw_user_meta_data->>'role', 'farmer')) IN ('veterinarian', 'field_worker') THEN 'veterinarian'::public.user_role
        WHEN LOWER(COALESCE(u.raw_user_meta_data->>'role', 'farmer')) = 'officer' THEN 'officer'::public.user_role
        WHEN LOWER(COALESCE(u.raw_user_meta_data->>'role', 'farmer')) = 'admin' THEN 'admin'::public.user_role
        ELSE 'farmer'::public.user_role
    END,
    TRUE,
    COALESCE(u.raw_user_meta_data->>'phone', u.phone, ''),
    LOWER(u.email),
    '',
    COALESCE(u.raw_user_meta_data->>'village', ''),
    COALESCE(u.raw_user_meta_data->>'block', ''),
    COALESCE(u.raw_user_meta_data->>'district', 'Pune'),
    COALESCE(u.raw_user_meta_data->>'state', 'Maharashtra'),
    COALESCE(u.raw_user_meta_data->>'registration_no', u.raw_user_meta_data->>'registrationNo', ''),
    COALESCE(u.raw_user_meta_data->>'department', ''),
    COALESCE(u.raw_user_meta_data->>'preferred_language', u.raw_user_meta_data->>'preferredLanguage', 'hi'),
    u.created_at,
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.auth_user_id = u.id OR LOWER(p.email) = LOWER(u.email)
);
