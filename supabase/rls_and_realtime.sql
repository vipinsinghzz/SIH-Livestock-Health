-- =====================================================================================
-- LIVESTOCK SAATHI – AI-POWERED LIVESTOCK HEALTH & EARLY WARNING PLATFORM
-- SIH 2026 Problem Statement 128
-- Supabase PostgreSQL Row Level Security (RLS) & Realtime Configuration
-- Version: 1.0.2 (Corrected & Type-Verified: Fully Qualified Table Scopes)
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. COLUMN DATA TYPE SAFETY AUDIT
-- Guarantees public.profiles.auth_user_id is strictly UUID matching auth.uid()
-- -------------------------------------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'auth_user_id' 
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN auth_user_id TYPE UUID USING auth_user_id::UUID;
    END IF;
END $$;

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
