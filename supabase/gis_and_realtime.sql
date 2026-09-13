-- =====================================================================================
-- LIVESTOCK SAATHI – AI-POWERED LIVESTOCK HEALTH & EARLY WARNING PLATFORM
-- SIH 2026 Problem Statement 128
-- Phase 6: PostGIS Spatial Queries & Realtime CDC Configuration (Hardened & Audited)
-- File: supabase/gis_and_realtime.sql
-- =====================================================================================

-- Ensure PostGIS is enabled
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -------------------------------------------------------------------------------------
-- 0. IDEMPOTENT CLEANUP OF OBSOLETE FUNCTION OVERLOADS
-- Safely drop legacy/unhardened function signatures from earlier Phase 1-2 schema.sql
-- (Specifically: the 2-argument get_spatial_outbreak_clusters(text, double precision)
-- which causes PostgreSQL ERROR 42725 "function name is not unique" when revoked/granted)
-- -------------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_spatial_outbreak_clusters(text, double precision);
DROP FUNCTION IF EXISTS public.get_spatial_outbreak_clusters(text);
DROP FUNCTION IF EXISTS public.get_nearby_cases(double precision, double precision, double precision, integer);
DROP FUNCTION IF EXISTS public.get_nearby_cases(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.get_nearby_cases(double precision, double precision);
DROP FUNCTION IF EXISTS public.get_containment_zones_spatial(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.get_containment_zones_spatial();
DROP FUNCTION IF EXISTS public.get_vaccination_coverage_around_point(double precision, double precision);
DROP FUNCTION IF EXISTS public.get_disease_spatial_density(text);
DROP FUNCTION IF EXISTS public.get_disease_spatial_density();

-- -------------------------------------------------------------------------------------
-- 1. SPATIAL QUERY: Cases Within Radius & Time Window (PostGIS ST_DWithin)
-- Hardened: Role-based coordinate fuzzing, radius capping, district lockdown, and caller auth
-- Signature: (double precision, double precision, double precision, integer, text)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_nearby_cases(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 15.0,
    p_days INTEGER DEFAULT 30,
    p_district TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    case_id VARCHAR(64),
    disease VARCHAR(255),
    species VARCHAR(64),
    risk risk_level_type,
    status case_status_type,
    affected_count INTEGER,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    district_id VARCHAR(128),
    village VARCHAR(128),
    block VARCHAR(128),
    confidence INTEGER,
    distance_km NUMERIC,
    is_fuzzed BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_caller_role public.user_role := 'farmer';
    v_caller_profile_id UUID := NULL;
    v_caller_district VARCHAR(128) := NULL;
    v_is_service_role BOOLEAN := FALSE;
    v_effective_radius_km DOUBLE PRECISION;
    v_effective_district TEXT := p_district;
    v_ref_geom GEOMETRY;
    v_cutoff_time TIMESTAMPTZ;
    v_row_limit INTEGER := 100;
BEGIN
    -- 1. Check service_role
    IF current_setting('request.jwt.claim.role', true) = 'service_role' OR auth.role() = 'service_role' THEN
        v_is_service_role := TRUE;
        v_caller_role := 'admin';
    END IF;

    -- 2. Reject unauthenticated anonymous access
    IF v_auth_uid IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated RPC call' USING ERRCODE = '42501';
    END IF;

    -- 3. Resolve caller profile & role
    IF NOT v_is_service_role AND v_auth_uid IS NOT NULL THEN
        SELECT p.id, p.role, p.district 
        INTO v_caller_profile_id, v_caller_role, v_caller_district
        FROM public.profiles p
        WHERE p.auth_user_id = v_auth_uid OR p.id = v_auth_uid
        LIMIT 1;

        IF v_caller_role IS NULL THEN
            v_caller_role := 'farmer';
        END IF;
    END IF;

    -- 4. Apply role-based constraints on search perimeter, enumeration limits & district scope
    IF v_caller_role = 'farmer' THEN
        -- Farmers can query max 10.0 km radius and max 30 cases
        v_effective_radius_km := LEAST(COALESCE(p_radius_km, 10.0), 10.0);
        v_row_limit := 30;
        -- Restrict farmer searches to farmer's own district to prevent cross-district surveillance probes
        IF v_caller_district IS NOT NULL AND v_caller_district <> '' THEN
            v_effective_district := v_caller_district;
        END IF;
    ELSIF v_caller_role IN ('veterinarian', 'field_worker') THEN
        -- Vets can query up to 30.0 km radius for clinical triage
        v_effective_radius_km := LEAST(COALESCE(p_radius_km, 30.0), 30.0);
        v_row_limit := 100;
    ELSE
        -- Officers & Admins supervisory access up to 100.0 km
        v_effective_radius_km := LEAST(COALESCE(p_radius_km, 100.0), 100.0);
        v_row_limit := 200;
    END IF;

    v_ref_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    v_cutoff_time := NOW() - (COALESCE(p_days, 30) || ' days')::INTERVAL;

    -- 5. Return query with role-based coordinate privacy protection
    RETURN QUERY
    SELECT
        dc.id,
        dc.case_id,
        dc.disease,
        dc.species,
        dc.risk,
        dc.status,
        dc.affected_count,
        -- Coordinate Privacy: Exact GPS for owner, vet, officer, admin; Fuzzed (~1.1 km) for peer farmers
        CASE 
            WHEN v_caller_role IN ('veterinarian', 'field_worker', 'officer', 'admin') OR dc.farmer_id = v_caller_profile_id OR v_is_service_role
            THEN dc.latitude
            ELSE ROUND(dc.latitude::numeric, 2)::DOUBLE PRECISION
        END AS latitude,
        CASE 
            WHEN v_caller_role IN ('veterinarian', 'field_worker', 'officer', 'admin') OR dc.farmer_id = v_caller_profile_id OR v_is_service_role
            THEN dc.longitude
            ELSE ROUND(dc.longitude::numeric, 2)::DOUBLE PRECISION
        END AS longitude,
        dc.district_id,
        -- Location detail masking for peer farmers
        CASE 
            WHEN v_caller_role IN ('veterinarian', 'field_worker', 'officer', 'admin') OR dc.farmer_id = v_caller_profile_id OR v_is_service_role
            THEN COALESCE(dc.farmer_location->>'village', '')
            ELSE 'Vicinity (~1.5km)'
        END AS village,
        COALESCE(dc.farmer_location->>'block', '') AS block,
        dc.confidence,
        ROUND((ST_Distance(dc.coordinates_geom::geography, v_ref_geom::geography) / 1000.0)::numeric, 2) AS distance_km,
        (v_caller_role = 'farmer' AND dc.farmer_id != v_caller_profile_id) AS is_fuzzed,
        dc.created_at
    FROM public.disease_cases dc
    WHERE dc.coordinates_geom IS NOT NULL
      AND dc.created_at >= v_cutoff_time
      AND ST_DWithin(dc.coordinates_geom::geography, v_ref_geom::geography, v_effective_radius_km * 1000.0)
      AND (v_effective_district IS NULL OR v_effective_district = '' OR dc.district_id ILIKE ('%' || v_effective_district || '%'))
    ORDER BY distance_km ASC, dc.created_at DESC
    LIMIT v_row_limit;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 2. SPATIAL QUERY: Containment Zones Intersecting a Coordinate Point
-- Hardened: Role-based center privacy (fuzzed center for farmers; exact for clinicians/officers)
-- No private case identifiers, farmer identities, or clinical notes exposed
-- Signature: (double precision, double precision)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_containment_zones_spatial(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    zone_id VARCHAR(64),
    disease VARCHAR(255),
    district VARCHAR(128),
    block VARCHAR(128),
    village VARCHAR(128),
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_km NUMERIC(5, 2),
    distance_from_center_km NUMERIC,
    is_inside BOOLEAN,
    status containment_status_type,
    enforced_rules TEXT[],
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_caller_role public.user_role := 'farmer';
    v_is_service_role BOOLEAN := FALSE;
    v_point GEOMETRY;
BEGIN
    IF current_setting('request.jwt.claim.role', true) = 'service_role' OR auth.role() = 'service_role' THEN
        v_is_service_role := TRUE;
        v_caller_role := 'admin';
    END IF;

    IF v_auth_uid IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated RPC call' USING ERRCODE = '42501';
    END IF;

    IF NOT v_is_service_role AND v_auth_uid IS NOT NULL THEN
        SELECT p.role INTO v_caller_role
        FROM public.profiles p
        WHERE p.auth_user_id = v_auth_uid OR p.id = v_auth_uid
        LIMIT 1;

        IF v_caller_role IS NULL THEN
            v_caller_role := 'farmer';
        END IF;
    END IF;

    v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    RETURN QUERY
    SELECT
        cz.id,
        cz.zone_id,
        cz.disease,
        cz.district,
        cz.block,
        cz.village,
        -- Public Safety Privacy: Exact perimeter center for vets & officers; Rounded to ~1.1km for farmers to prevent index farm triangulation
        CASE
            WHEN v_caller_role IN ('veterinarian', 'field_worker', 'officer', 'admin') OR v_is_service_role
            THEN cz.center_lat
            ELSE ROUND(cz.center_lat::numeric, 2)::DOUBLE PRECISION
        END AS center_lat,
        CASE
            WHEN v_caller_role IN ('veterinarian', 'field_worker', 'officer', 'admin') OR v_is_service_role
            THEN cz.center_lng
            ELSE ROUND(cz.center_lng::numeric, 2)::DOUBLE PRECISION
        END AS center_lng,
        cz.radius_km,
        ROUND((ST_Distance(cz.center_geom::geography, v_point::geography) / 1000.0)::numeric, 2) AS distance_from_center_km,
        (ST_Distance(cz.center_geom::geography, v_point::geography) <= (cz.radius_km * 1000.0)) AS is_inside,
        cz.status,
        cz.enforced_rules,
        cz.created_at
    FROM public.containment_zones cz
    WHERE cz.center_geom IS NOT NULL
      AND cz.status = 'ACTIVE'
    ORDER BY distance_from_center_km ASC
    LIMIT 20;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 3. SPATIAL QUERY: Vaccination Coverage Around Outbreak Point
-- Hardened: Caller authorization (FARMERS DENIED; VET/OFFICER/ADMIN ALLOWED)
-- DATA INTEGRITY: NULL when zero animals (NEVER 75%)
-- Signature: (double precision, double precision, double precision)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_vaccination_coverage_around_point(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 10.0
)
RETURNS TABLE (
    total_animals BIGINT,
    vaccinated_animals BIGINT,
    coverage_percentage NUMERIC,
    nearby_drives_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_caller_role public.user_role := NULL;
    v_is_service_role BOOLEAN := FALSE;
    v_ref_geom GEOMETRY;
    v_effective_radius_km DOUBLE PRECISION;
    v_total BIGINT := 0;
    v_vaccinated BIGINT := 0;
    v_drives BIGINT := 0;
    v_pct NUMERIC := NULL; -- Strict Data Integrity: NULL when no census data
BEGIN
    -- 1. Check service_role
    IF current_setting('request.jwt.claim.role', true) = 'service_role' OR auth.role() = 'service_role' THEN
        v_is_service_role := TRUE;
    END IF;

    -- 2. Reject unauthenticated anonymous access
    IF v_auth_uid IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated RPC call' USING ERRCODE = '42501';
    END IF;

    -- 3. Role Authorization: Farmers are denied regional aggregate surveillance stats
    IF NOT v_is_service_role THEN
        SELECT p.role INTO v_caller_role
        FROM public.profiles p
        WHERE p.auth_user_id = v_auth_uid OR p.id = v_auth_uid
        LIMIT 1;

        IF v_caller_role IS NULL OR v_caller_role = 'farmer' THEN
            RAISE EXCEPTION 'Access Denied: Regional vaccination coverage analytics are restricted to veterinary and authorized animal husbandry personnel'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    v_effective_radius_km := LEAST(COALESCE(p_radius_km, 10.0), 50.0);
    v_ref_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    -- Count total animals registered in profiles within radius
    SELECT COUNT(a.id) INTO v_total
    FROM public.animals a
    JOIN public.profiles p ON p.id = a.owner_id
    WHERE p.coordinates_geom IS NOT NULL
      AND ST_DWithin(p.coordinates_geom::geography, v_ref_geom::geography, v_effective_radius_km * 1000.0);

    -- Count animals with at least one active vaccination record
    SELECT COUNT(DISTINCT av.animal_id) INTO v_vaccinated
    FROM public.animal_vaccinations av
    JOIN public.animals a ON a.id = av.animal_id
    JOIN public.profiles p ON p.id = a.owner_id
    WHERE p.coordinates_geom IS NOT NULL
      AND ST_DWithin(p.coordinates_geom::geography, v_ref_geom::geography, v_effective_radius_km * 1000.0)
      AND av.status IN ('COMPLETED', 'Administered');

    -- Count active or upcoming vaccination drives in surveillance buffer
    SELECT COUNT(vd.id) INTO v_drives
    FROM public.vaccination_drives vd
    WHERE vd.coordinates_geom IS NOT NULL
      AND ST_DWithin(vd.coordinates_geom::geography, v_ref_geom::geography, v_effective_radius_km * 1000.0);

    -- DATA INTEGRITY ENFORCEMENT:
    -- If total registered animals > 0, compute accurate ratio.
    -- If total = 0, return NULL (Never invent or fabricate 75%!).
    IF v_total > 0 THEN
        v_pct := ROUND(((v_vaccinated::numeric / v_total::numeric) * 100.0), 1);
    ELSE
        v_pct := NULL;
    END IF;

    RETURN QUERY
    SELECT v_total, v_vaccinated, v_pct, v_drives;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 4. SPATIAL QUERY: PostGIS DBSCAN Outbreak Clustering
-- Hardened: Role restriction (VET/OFFICER/ADMIN ONLY; FARMER DENIED)
-- Geographically Defensible Metric Projection: Dynamic UTM Zone Selection
--   - Maharashtra spans 72.6°E to 80.9°E across UTM Zone 43N (72°E - 78°E) and 44N (78°E - 84°E)
--   - Western & Central Maharashtra (Pune, Satara, Nashik, Mumbai, etc.) -> EPSG:32643
--   - Eastern Maharashtra / Vidarbha (Nagpur, Wardha, Chandrapur, Gadchiroli, etc.) -> EPSG:32644
-- Signature: (text, double precision, integer)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_spatial_outbreak_clusters(
    p_district TEXT DEFAULT 'Pune',
    p_distance_km DOUBLE PRECISION DEFAULT 5.0,
    p_min_cases INTEGER DEFAULT 2
)
RETURNS TABLE (
    cluster_id INTEGER,
    disease VARCHAR(255),
    case_count BIGINT,
    total_affected BIGINT,
    centroid_lat DOUBLE PRECISION,
    centroid_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION,
    risk_tier risk_level_type,
    is_outbreak BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_caller_role public.user_role := NULL;
    v_is_service_role BOOLEAN := FALSE;
    v_eps_meters DOUBLE PRECISION;
    v_target_srid INTEGER := 32643; -- Default to UTM Zone 43N (Western & Central Maharashtra)
    v_avg_lng DOUBLE PRECISION;
BEGIN
    -- 1. Check service_role
    IF current_setting('request.jwt.claim.role', true) = 'service_role' OR auth.role() = 'service_role' THEN
        v_is_service_role := TRUE;
    END IF;

    -- 2. Reject unauthenticated anonymous access
    IF v_auth_uid IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated RPC call' USING ERRCODE = '42501';
    END IF;

    -- 3. Verify caller role (FARMERS ARE STRICTLY RESTRICTED)
    IF NOT v_is_service_role THEN
        SELECT p.role INTO v_caller_role
        FROM public.profiles p
        WHERE p.auth_user_id = v_auth_uid OR p.id = v_auth_uid
        LIMIT 1;

        IF v_caller_role IS NULL OR v_caller_role = 'farmer' THEN
            RAISE EXCEPTION 'Access Denied: Outbreak clustering is restricted to veterinary and animal husbandry officers' USING ERRCODE = '42501';
        END IF;
    END IF;

    v_eps_meters := COALESCE(p_distance_km, 5.0) * 1000.0;

    -- 4. Geographically Defensible Dynamic UTM Zone Resolution:
    -- Maharashtra is split near the 78°E meridian between UTM Zone 43N and UTM Zone 44N.
    -- Dynamically evaluate the centroid of matching outbreak records to pick the distortion-minimizing UTM zone:
    SELECT AVG(dc.longitude) INTO v_avg_lng
    FROM public.disease_cases dc
    WHERE dc.coordinates_geom IS NOT NULL
      AND dc.status IN ('New', 'Investigating', 'Confirmed', 'Containment', 'OPEN', 'ACCEPTED', 'IN_TREATMENT')
      AND (p_district IS NULL OR p_district = '' OR dc.district_id ILIKE ('%' || p_district || '%'));

    IF v_avg_lng IS NOT NULL AND v_avg_lng >= 78.0 THEN
        v_target_srid := 32644; -- Eastern Maharashtra / Vidarbha (Nagpur, Chandrapur, Gadchiroli, etc.)
    ELSE
        v_target_srid := 32643; -- Western & Central Maharashtra (Pune, Satara, Solapur, Nashik, etc.)
    END IF;

    -- 5. Execute DBSCAN metric clustering in planar meters using the optimal UTM zone
    RETURN QUERY
    WITH clustered_points AS (
        SELECT
            dc.id,
            dc.disease,
            dc.affected_count,
            dc.latitude,
            dc.longitude,
            ST_ClusterDBSCAN(
                ST_Transform(dc.coordinates_geom, v_target_srid),
                eps := v_eps_meters,
                minpoints := COALESCE(p_min_cases, 2)
            ) OVER (PARTITION BY dc.disease) AS cid
        FROM public.disease_cases dc
        WHERE dc.coordinates_geom IS NOT NULL
          AND dc.status IN ('New', 'Investigating', 'Confirmed', 'Containment', 'OPEN', 'ACCEPTED', 'IN_TREATMENT')
          AND (p_district IS NULL OR p_district = '' OR dc.district_id ILIKE ('%' || p_district || '%'))
    )
    SELECT
        (cp.cid + 1)::INTEGER AS cluster_id,
        cp.disease,
        COUNT(*)::BIGINT AS case_count,
        COALESCE(SUM(cp.affected_count), COUNT(*))::BIGINT AS total_affected,
        ROUND(AVG(cp.latitude)::numeric, 4)::DOUBLE PRECISION AS centroid_lat,
        ROUND(AVG(cp.longitude)::numeric, 4)::DOUBLE PRECISION AS centroid_lng,
        p_distance_km AS radius_km,
        CASE
            WHEN COUNT(*) >= 4 OR SUM(cp.affected_count) >= 15 THEN 'Critical'::risk_level_type
            WHEN COUNT(*) >= 2 THEN 'High'::risk_level_type
            ELSE 'Moderate'::risk_level_type
        END AS risk_tier,
        (COUNT(*) >= COALESCE(p_min_cases, 2)) AS is_outbreak
    FROM clustered_points cp
    WHERE cp.cid IS NOT NULL
    GROUP BY cp.cid, cp.disease
    ORDER BY case_count DESC, total_affected DESC;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 5. SPATIAL QUERY: Disease Density Aggregation by Geographic Block
-- Hardened: Role restriction (VET/OFFICER/ADMIN ONLY; FARMER DENIED)
-- Signature: (text, integer)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_disease_spatial_density(
    p_district TEXT DEFAULT 'Pune',
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    district VARCHAR(128),
    block VARCHAR(128),
    case_count BIGINT,
    total_affected BIGINT,
    dominant_disease VARCHAR(255),
    highest_risk risk_level_type,
    centroid_lat DOUBLE PRECISION,
    centroid_lng DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_caller_role public.user_role := NULL;
    v_is_service_role BOOLEAN := FALSE;
    v_cutoff_time TIMESTAMPTZ;
BEGIN
    IF current_setting('request.jwt.claim.role', true) = 'service_role' OR auth.role() = 'service_role' THEN
        v_is_service_role := TRUE;
    END IF;

    IF v_auth_uid IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated RPC call' USING ERRCODE = '42501';
    END IF;

    IF NOT v_is_service_role THEN
        SELECT p.role INTO v_caller_role
        FROM public.profiles p
        WHERE p.auth_user_id = v_auth_uid OR p.id = v_auth_uid
        LIMIT 1;

        IF v_caller_role IS NULL OR v_caller_role = 'farmer' THEN
            RAISE EXCEPTION 'Access Denied: Spatial density aggregation is restricted to veterinary and animal husbandry officers' USING ERRCODE = '42501';
        END IF;
    END IF;

    v_cutoff_time := NOW() - (COALESCE(p_days, 30) || ' days')::INTERVAL;

    RETURN QUERY
    WITH block_cases AS (
        SELECT
            dc.district_id AS b_district,
            COALESCE(NULLIF(dc.farmer_location->>'block', ''), 'Central Sector') AS b_block,
            dc.disease,
            dc.risk,
            dc.affected_count,
            dc.latitude,
            dc.longitude
        FROM public.disease_cases dc
        WHERE dc.created_at >= v_cutoff_time
          AND dc.status NOT IN ('Resolved', 'RESOLVED')
          AND (p_district IS NULL OR p_district = '' OR dc.district_id ILIKE ('%' || p_district || '%'))
    )
    SELECT
        bc.b_district::VARCHAR(128),
        bc.b_block::VARCHAR(128),
        COUNT(*)::BIGINT AS case_count,
        COALESCE(SUM(bc.affected_count), 0)::BIGINT AS total_affected,
        MODE() WITHIN GROUP (ORDER BY bc.disease)::VARCHAR(255) AS dominant_disease,
        MAX(bc.risk) AS highest_risk,
        ROUND(AVG(bc.latitude)::numeric, 4)::DOUBLE PRECISION AS centroid_lat,
        ROUND(AVG(bc.longitude)::numeric, 4)::DOUBLE PRECISION AS centroid_lng
    FROM block_cases bc
    GROUP BY bc.b_district, bc.b_block
    ORDER BY case_count DESC;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 6. EXECUTE PRIVILEGES & ROLE SECURITY HARDENING (UNAMBIGUOUS TYPED SIGNATURES)
-- Revoke all execute privileges from PUBLIC and anonymous users.
-- Grant execute privileges exclusively to authenticated users and service_role.
-- Unambiguous parameter type signatures prevent PostgreSQL ERROR 42725 on overloads.
-- -------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_nearby_cases(double precision, double precision, double precision, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_containment_zones_spatial(double precision, double precision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_vaccination_coverage_around_point(double precision, double precision, double precision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_spatial_outbreak_clusters(text, double precision, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_disease_spatial_density(text, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_nearby_cases(double precision, double precision, double precision, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_containment_zones_spatial(double precision, double precision) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_vaccination_coverage_around_point(double precision, double precision, double precision) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_spatial_outbreak_clusters(text, double precision, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_disease_spatial_density(text, integer) TO authenticated, service_role;

-- -------------------------------------------------------------------------------------
-- 7. REALTIME REPLICATION CONFIGURATION FOR OPERATIONAL TABLES
-- Ensure REPLICA IDENTITY FULL for complete payload changes in WebSocket broadcasts
-- Add to supabase_realtime publication idempotently without table ownership errors
-- -------------------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    target_tables text[] := ARRAY[
        'disease_cases',
        'notifications',
        'containment_zones',
        'vaccination_drives',
        'disease_reports'
    ];
BEGIN
    FOR tbl IN SELECT unnest(target_tables) LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
            IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_publication_tables 
                    WHERE pubname = 'supabase_realtime' 
                      AND schemaname = 'public' 
                      AND tablename = tbl
                ) THEN
                    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;
