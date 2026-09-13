-- =====================================================================================
-- LIVESTOCK SAATHI – AI-POWERED LIVESTOCK HEALTH & EARLY WARNING PLATFORM
-- SIH 2026 Problem Statement 128
-- Supabase PostgreSQL Seed Data Script
-- Populates realistic demo users, livestock, clinical cases, containment zones,
-- vaccination camps, AI triage outputs, lab referrals, and bilingual advisories.
-- =====================================================================================

BEGIN;

-- Clean existing data in dependency order
TRUNCATE TABLE
    public.audit_logs,
    public.notifications,
    public.advisories,
    public.lab_referrals,
    public.triage_results,
    public.reports,
    public.case_notified_vets,
    public.case_timeline,
    public.disease_cases,
    public.containment_zones,
    public.vaccination_camp_registrations,
    public.vaccination_drives,
    public.animal_treatments,
    public.animal_vaccinations,
    public.animal_timeline,
    public.animals,
    public.profiles
CASCADE;

-- -------------------------------------------------------------------------------------
-- 1. SEED PROFILES / USERS (Fixed UUIDs for deterministic foreign key linkage)
-- -------------------------------------------------------------------------------------
-- User IDs:
-- Farmer 1 (Ramesh Patil):    '00000000-0000-0000-0000-000000000001'
-- Vet 1 (Dr. Ananya Deshmukh):'00000000-0000-0000-0000-000000000002'
-- Officer (Dr. Suresh Kulkarni):'00000000-0000-0000-0000-000000000003'
-- Farmer 2 (Santosh Shinde):   '00000000-0000-0000-0000-000000000004'
-- Farmer 3 (Sunita Gaikwad):   '00000000-0000-0000-0000-000000000005'
-- Vet 2 (Dr. Rajesh Shinde):  '00000000-0000-0000-0000-000000000006'
-- Vet 3 (Dr. Priya Joshi - Nagpur): '00000000-0000-0000-0000-000000000007'
-- Vet 4 (Dr. Sachin Pawar - Nashik):'00000000-0000-0000-0000-000000000008'

INSERT INTO public.profiles (
    id, name, role, is_active, phone, email, password_hash,
    village, block, district, state, latitude, longitude,
    registration_no, department, preferred_language, specialization,
    availability, is_available, clinic_name, rating, experience, emergency_available
) VALUES
-- 1. Farmer Ramesh Patil (Baramati)
(
    '00000000-0000-0000-0000-000000000001',
    'Ramesh Patil (रमेश पाटील)',
    'farmer',
    TRUE,
    '+919822011223',
    'farmer@pashurakshak.in',
    crypt('Farmer@123', gen_salt('bf', 10)),
    'Malegaon Bk',
    'Baramati',
    'Pune',
    'Maharashtra',
    18.1517,
    74.5772,
    '',
    '',
    'hi',
    'General Livestock Farmer',
    'AVAILABLE',
    TRUE,
    '',
    5.0,
    12,
    FALSE
),
-- 2. Vet Dr. Ananya Deshmukh (Baramati)
(
    '00000000-0000-0000-0000-000000000002',
    'Dr. Ananya Deshmukh (डॉ. अनन्या देशमुख)',
    'veterinarian',
    TRUE,
    '+919822022334',
    'vet@pashurakshak.in',
    crypt('Vet@123', gen_salt('bf', 10)),
    'Baramati Town',
    'Baramati',
    'Pune',
    'Maharashtra',
    18.1540,
    74.5810,
    'MAH-VET-2022-4819',
    'Department of Animal Husbandry, Govt. of Maharashtra',
    'en',
    'Epidemiology & Livestock Disease Control',
    'AVAILABLE',
    TRUE,
    'Baramati Polyclinic Veterinary Hospital',
    4.9,
    8,
    TRUE
),
-- 3. Officer Dr. Suresh Kulkarni (District HQ, Pune)
(
    '00000000-0000-0000-0000-000000000003',
    'Dr. Suresh Kulkarni (डॉ. सुरेश कुलकर्णी)',
    'officer',
    TRUE,
    '+919822033445',
    'officer@pashurakshak.in',
    crypt('Admin@123', gen_salt('bf', 10)),
    'Shivajinagar',
    'Haveli',
    'Pune',
    'Maharashtra',
    18.5314,
    73.8446,
    'MAH-VET-1998-1002',
    'District Animal Husbandry Office, Pune',
    'en',
    'Chief Veterinary Surveillance Officer',
    'AVAILABLE',
    TRUE,
    'District Veterinary Headquarters, Pune',
    4.9,
    22,
    TRUE
),
-- 4. Farmer Santosh Shinde (Shirur)
(
    '00000000-0000-0000-0000-000000000004',
    'Santosh Shinde (संतोष शिंदे)',
    'farmer',
    TRUE,
    '+919822044556',
    'santosh@pashurakshak.in',
    crypt('Farmer@123', gen_salt('bf', 10)),
    'Koregaon Bhima',
    'Shirur',
    'Pune',
    'Maharashtra',
    18.8276,
    74.3774,
    '',
    '',
    'mr',
    'Dairy Cattle Farmer',
    'AVAILABLE',
    TRUE,
    '',
    4.8,
    15,
    FALSE
),
-- 5. Farmer Sunita Gaikwad (Khed)
(
    '00000000-0000-0000-0000-000000000005',
    'Sunita Gaikwad (सुनीता गायकवाड)',
    'farmer',
    TRUE,
    '+919822055667',
    'sunita@pashurakshak.in',
    crypt('Farmer@123', gen_salt('bf', 10)),
    'Chakan',
    'Khed',
    'Pune',
    'Maharashtra',
    18.7597,
    73.8585,
    '',
    '',
    'hi',
    'Indigenous Breed Conserver',
    'AVAILABLE',
    TRUE,
    '',
    5.0,
    9,
    FALSE
),
-- 6. Vet Dr. Rajesh Shinde (Shirur)
(
    '00000000-0000-0000-0000-000000000006',
    'Dr. Rajesh Shinde (डॉ. राजेश शिंदे)',
    'field_worker',
    TRUE,
    '+919822088990',
    'vet2@pashurakshak.in',
    crypt('Vet@123', gen_salt('bf', 10)),
    'Shirur Town',
    'Shirur',
    'Pune',
    'Maharashtra',
    18.8250,
    74.3790,
    'MAH-VET-2024-9182',
    'Taluka Veterinary Dispensary, Shirur',
    'mr',
    'Bovine Clinical Diagnostics & Triage',
    'AVAILABLE',
    TRUE,
    'Shirur Taluka Veterinary Clinic',
    4.7,
    6,
    TRUE
),
-- 7. Vet Dr. Priya Joshi (Nagpur)
(
    '00000000-0000-0000-0000-000000000007',
    'Dr. Priya Joshi',
    'veterinarian',
    TRUE,
    '+919823011221',
    'priya.vet@pashurakshak.in',
    crypt('Vet@123', gen_salt('bf', 10)),
    'Civil Lines',
    'Nagpur Urban',
    'Nagpur',
    'Maharashtra',
    21.1458,
    79.0882,
    'MAH-VET-2021-3312',
    'Government Veterinary Hospital, Nagpur',
    'en',
    'Infectious Disease Surveillance',
    'AVAILABLE',
    TRUE,
    'Nagpur Central Veterinary Hospital',
    4.9,
    11,
    TRUE
),
-- 8. Vet Dr. Sachin Pawar (Nashik)
(
    '00000000-0000-0000-0000-000000000008',
    'Dr. Sachin Pawar',
    'veterinarian',
    TRUE,
    '+919823022332',
    'sachin.vet@pashurakshak.in',
    crypt('Vet@123', gen_salt('bf', 10)),
    'Panchavati',
    'Nashik',
    'Nashik',
    'Maharashtra',
    19.9975,
    73.7898,
    'MAH-VET-2019-7781',
    'Zilla Parishad Animal Husbandry, Nashik',
    'hi',
    'Ruminant Surgery & Biosecurity',
    'AVAILABLE',
    TRUE,
    'Nashik Zilla Veterinary Dispensary',
    4.8,
    14,
    TRUE
);

-- -------------------------------------------------------------------------------------
-- 2. SEED ANIMALS
-- -------------------------------------------------------------------------------------
-- Animal IDs:
-- Animal 1 (Lakshmi): '10000000-0000-0000-0000-000000000001'
-- Animal 2 (Gauri):   '10000000-0000-0000-0000-000000000002'
-- Animal 3 (Raja):    '10000000-0000-0000-0000-000000000003'
-- Animal 4 (Manik):   '10000000-0000-0000-0000-000000000004'
-- Animal 5 (Ganga):   '10000000-0000-0000-0000-000000000005'

INSERT INTO public.animals (
    id, tag_id, name, species, breed, age, gender,
    health_status, milk_yield_daily, last_checkup,
    owner_id, village, block, district
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'MH-12-P-1001',
    'Lakshmi (लक्ष्मी)',
    'Cattle',
    'Gir Cow',
    4,
    'Female',
    'Needs Attention',
    '14.5 L',
    '08 Sep 2026',
    '00000000-0000-0000-0000-000000000001',
    'Malegaon Bk',
    'Baramati',
    'Pune'
),
(
    '10000000-0000-0000-0000-000000000002',
    'MH-12-P-1002',
    'Gauri (गौरी)',
    'Buffalo',
    'Murrah Buffalo',
    5,
    'Female',
    'Healthy',
    '16.0 L',
    '15 Aug 2026',
    '00000000-0000-0000-0000-000000000001',
    'Malegaon Bk',
    'Baramati',
    'Pune'
),
(
    '10000000-0000-0000-0000-000000000003',
    'MH-12-P-1003',
    'Raja (राजा)',
    'Cattle',
    'Khillari Bull',
    3,
    'Male',
    'Critical',
    'N/A',
    '10 Sep 2026',
    '00000000-0000-0000-0000-000000000004',
    'Koregaon Bhima',
    'Shirur',
    'Pune'
),
(
    '10000000-0000-0000-0000-000000000004',
    'MH-12-P-1004',
    'Manik (माणिक)',
    'Goat',
    'Osmanabadi Goat',
    2,
    'Male',
    'Healthy',
    '2.0 L',
    '01 Sep 2026',
    '00000000-0000-0000-0000-000000000004',
    'Koregaon Bhima',
    'Shirur',
    'Pune'
),
(
    '10000000-0000-0000-0000-000000000005',
    'MH-12-P-1005',
    'Ganga (गंगा)',
    'Cattle',
    'Sahiwal Cow',
    4,
    'Female',
    'Healthy',
    '13.0 L',
    '05 Sep 2026',
    '00000000-0000-0000-0000-000000000005',
    'Chakan',
    'Khed',
    'Pune'
);

-- -------------------------------------------------------------------------------------
-- 3. SEED ANIMAL CHILD TABLES (Timeline, Vaccinations, Treatments)
-- -------------------------------------------------------------------------------------
INSERT INTO public.animal_timeline (
    animal_id, event_type, title, date, doctor, notes,
    disease, confidence, symptoms, advisory, temperature, duration
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'AI Health Scan',
    'Skin Nodules & High Fever Detected',
    '10/09/2026',
    'Dr. Ananya Deshmukh',
    'Lesions observed across neck and flanks. Suspected Lumpy Skin Disease.',
    'Lumpy Skin Disease (LSD)',
    89.0,
    ARRAY['skin_nodules', 'high_fever', 'reduced_milk_yield'],
    'Immediate isolation, neem oil fly repellent, and sodium hypochlorite disinfection.',
    40.2,
    3.0
),
(
    '10000000-0000-0000-0000-000000000001',
    'Vaccination',
    'FMD Primary Vaccination Dose',
    '15/06/2026',
    'Dr. Rajesh Shinde',
    'Administered under National Animal Disease Control Programme (NADCP).',
    '',
    NULL,
    ARRAY[]::TEXT[],
    'Monitor for local swelling at injection site.',
    NULL,
    NULL
);

INSERT INTO public.animal_vaccinations (
    animal_id, vaccine_name, date, next_due, status, dose, batch_number, administered_by, camp
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'FMD Trivalent Inactivated Vaccine',
    NOW() - INTERVAL '90 days',
    NOW() + INTERVAL '90 days',
    'Completed',
    'Primary Dose',
    'FMD-2026-B819',
    'Dr. Rajesh Shinde',
    'Baramati Govt Vaccination Drive'
),
(
    '10000000-0000-0000-0000-000000000001',
    'Lumpy Skin Live Attenuated (Goat Pox Strain)',
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '335 days',
    'Completed',
    'Annual Booster',
    'LSD-GP-9912',
    'Dr. Ananya Deshmukh',
    'Emergency Ring Buffer Camp - Malegaon'
),
(
    '10000000-0000-0000-0000-000000000002',
    'Haemorrhagic Septicaemia (HS) Alum Precipitated',
    NOW() - INTERVAL '120 days',
    NOW() + INTERVAL '60 days',
    'Completed',
    'Pre-Monsoon Dose',
    'HS-2026-M441',
    'Dr. Ananya Deshmukh',
    'Primary Veterinary Dispensary, Malegaon'
);

INSERT INTO public.animal_treatments (
    animal_id, condition, treatment, date, vet_id
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'Suspected Lumpy Skin Disease (Stage 2 Nodules)',
    'Prescribed Meloxicam (antipyretic), Enrofloxacin (broad spectrum coverage), and topical povidone-iodine.',
    NOW() - INTERVAL '2 days',
    '00000000-0000-0000-0000-000000000002'
);

-- -------------------------------------------------------------------------------------
-- 4. SEED VACCINATION DRIVES
-- -------------------------------------------------------------------------------------
-- Drive IDs:
-- Drive 1 (Baramati Ring Camp): '20000000-0000-0000-0000-000000000001'
-- Drive 2 (Shirur Routine FMD): '20000000-0000-0000-0000-000000000002'
-- Drive 3 (Khed Pre-Monsoon HS):'20000000-0000-0000-0000-000000000003'

INSERT INTO public.vaccination_drives (
    id, camp_id, state, district, block, village, venue,
    latitude, longitude, vaccine, vaccine_full_name, target_species,
    camp_date, start_time, end_time, cost, is_free,
    organizing_hospital, assigned_officer, assigned_officer_id,
    capacity, booked_slots, remaining_slots, target_count, covered_count, status, notes
) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'RING-CAMP-2026-PUN-1042',
    'Maharashtra',
    'Pune',
    'Baramati',
    'Malegaon Rural',
    'Malegaon Gram Panchayat Animal Health Centre',
    18.1517,
    74.5772,
    'Lumpy Skin Disease (Neethling strain)',
    'Lumpy Skin Disease Live Attenuated Homologous Vaccine',
    'Cattle & Buffalo',
    NOW() + INTERVAL '2 days',
    '08:30 AM',
    '05:00 PM',
    'Free (Emergency Outbreak Ring)',
    TRUE,
    'District Veterinary Outbreak Response Unit, Pune',
    'Dr. Ananya Deshmukh',
    '00000000-0000-0000-0000-000000000002',
    300,
    45,
    255,
    300,
    45,
    'Upcoming',
    'Emergency 5km ring vaccination protocol triggered for active LSD containment.'
),
(
    '20000000-0000-0000-0000-000000000002',
    'CAMP-2026-PUN-SHIRUR-01',
    'Maharashtra',
    'Pune',
    'Shirur',
    'Koregaon Bhima',
    'Taluka Veterinary Dispensary, Shirur Main Road',
    18.8276,
    74.3774,
    'FMD Trivalent Inactivated Vaccine',
    'Foot and Mouth Disease Inactivated Oil-Adjuvant Vaccine',
    'Cattle, Buffalo, Sheep & Goat',
    NOW() + INTERVAL '5 days',
    '09:00 AM',
    '04:30 PM',
    'Free (Govt Drive)',
    TRUE,
    'Shirur Taluka Veterinary Polyclinic',
    'Dr. Rajesh Shinde',
    '00000000-0000-0000-0000-000000000006',
    250,
    80,
    170,
    250,
    80,
    'Upcoming',
    'Bi-annual FMD mass vaccination drive under National Livestock Mission.'
),
(
    '20000000-0000-0000-0000-000000000003',
    'CAMP-2026-PUN-KHED-02',
    'Maharashtra',
    'Pune',
    'Khed',
    'Chakan',
    'Primary Veterinary Centre, Chakan Market Yard',
    18.7597,
    73.8585,
    'HS + BQ Combined Vaccine',
    'Haemorrhagic Septicaemia & Black Quarter Alum-Precipitated Vaccine',
    'Cattle & Buffalo',
    NOW() - INTERVAL '3 days',
    '09:00 AM',
    '04:00 PM',
    'Free (Govt Drive)',
    TRUE,
    'Khed Veterinary Dispensary',
    'Dr. Suresh Kulkarni',
    '00000000-0000-0000-0000-000000000003',
    200,
    192,
    8,
    200,
    192,
    'Completed',
    'Successful pre-monsoon clostridial coverage achieved.'
);

-- Registrations in vaccination camp
INSERT INTO public.vaccination_camp_registrations (
    drive_id, farmer_id, farmer_name, farmer_phone, animal_ids, animal_count, token
) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Ramesh Patil',
    '+919822011223',
    ARRAY['MH-12-P-1002'],
    1,
    '#CAMP-PUN-8120'
);

-- -------------------------------------------------------------------------------------
-- 5. SEED CONTAINMENT ZONES
-- -------------------------------------------------------------------------------------
-- Zone IDs:
-- Zone 1 (Baramati LSD): '30000000-0000-0000-0000-000000000001'
-- Zone 2 (Shirur FMD):   '30000000-0000-0000-0000-000000000002'

INSERT INTO public.containment_zones (
    id, zone_id, disease, district, block, village,
    center_lat, center_lng, radius_km, status,
    enforced_rules, created_by_vet_id, creator_name,
    ring_vaccination_drive_id, notes, contained_at
) VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'ZONE-2026-PUN-9821',
    'Lumpy Skin Disease',
    'Pune',
    'Baramati',
    'Malegaon Rural',
    18.1517,
    74.5772,
    5.0,
    'ACTIVE',
    ARRAY[
        'Strict quarantine of affected livestock within perimeter',
        'Ban on animal movement, livestock trade, and cattle markets',
        'Daily disinfectant spraying of barns and watering troughs',
        'Immediate ring vaccination within containment buffer'
    ],
    '00000000-0000-0000-0000-000000000002',
    'Dr. Ananya Deshmukh',
    '20000000-0000-0000-0000-000000000001',
    'Declared following confirmation of 3 nodular cases in Malegaon sector.',
    NOW() - INTERVAL '1 day'
),
(
    '30000000-0000-0000-0000-000000000002',
    'ZONE-2026-PUN-9844',
    'Foot and Mouth Disease (FMD)',
    'Pune',
    'Shirur',
    'Koregaon Bhima',
    18.8276,
    74.3774,
    5.0,
    'ACTIVE',
    ARRAY[
        'Strict quarantine of affected livestock within perimeter',
        'Complete restriction of cloven-hoofed animals on transit roads',
        'Potassium permanganate foot-baths at village entry points',
        'Closure of local cattle bazaar for 21 days'
    ],
    '00000000-0000-0000-0000-000000000006',
    'Dr. Rajesh Shinde',
    '20000000-0000-0000-0000-000000000002',
    'Active vesicular salivation outbreak identified in dairy clusters.',
    NOW() - INTERVAL '2 days'
);

-- -------------------------------------------------------------------------------------
-- 6. SEED DISEASE CASES (PS-128 Referral Cases)
-- -------------------------------------------------------------------------------------
-- Case IDs:
-- Case 1 (Baramati LSD): '40000000-0000-0000-0000-000000000001'
-- Case 2 (Shirur FMD):   '40000000-0000-0000-0000-000000000002'
-- Case 3 (Khed Blackleg):'40000000-0000-0000-0000-000000000003'

INSERT INTO public.disease_cases (
    id, case_id, farmer_id, animal_id, animal_name, species,
    disease, confidence, risk, district_id, state,
    latitude, longitude, farmer_location, farmer_contact,
    symptoms, temperature, duration, affected_count,
    notes, clinical_diagnosis, investigation_notes, status,
    containment_zone_id, ring_vaccination_drive_id, assigned_vet_id,
    accepted_at, confirmed_at, containment_started_at,
    treatment_notes, prescription
) VALUES
(
    '40000000-0000-0000-0000-000000000001',
    'CASE-2026-PUN-1042',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Lakshmi',
    'Cattle',
    'Lumpy Skin Disease',
    89,
    'High',
    'Pune',
    'Maharashtra',
    18.1517,
    74.5772,
    '{"village": "Malegaon Bk", "block": "Baramati", "district": "Pune", "state": "Maharashtra"}'::JSONB,
    '{"name": "Ramesh Patil", "phone": "+919822011223"}'::JSONB,
    ARRAY['skin_nodules', 'high_fever', 'reduced_milk_yield', 'lethargy'],
    40.2,
    3.0,
    2,
    'Farmer noted firm nodular skin lesions across body with sharp drop in morning milk yield.',
    'Clinical examination confirms acute Lumpy Skin Disease (Capripoxvirus).',
    'Field inspection completed. Nodules measured 2-5 cm in diameter. Barn isolated with mosquito netting.',
    'Containment',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day',
    'Administered supportive therapy. Fly repellents applied. Herd isolated.',
    'Meloxicam 10ml IM, Enrofloxacin 15ml IM for 3 days, topical Povidone-iodine.'
),
(
    '40000000-0000-0000-0000-000000000002',
    'CASE-2026-PUN-1088',
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000003',
    'Raja',
    'Cattle',
    'Foot and Mouth Disease (FMD)',
    94,
    'Critical',
    'Pune',
    'Maharashtra',
    18.8276,
    74.3774,
    '{"village": "Koregaon Bhima", "block": "Shirur", "district": "Pune", "state": "Maharashtra"}'::JSONB,
    '{"name": "Santosh Shinde", "phone": "+919822044556"}'::JSONB,
    ARRAY['mouth_lesions', 'drooling', 'foot_lesions', 'high_fever', 'lameness'],
    40.8,
    2.0,
    4,
    'Ropey salivation and severe lameness in working bull and 3 heifers.',
    'Aphthovirus infection confirmed clinically by oral and interdigital vesicles.',
    'High contagion risk due to proximity to dairy co-operative milk collection centre.',
    'Investigating',
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000006',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '18 hours',
    NULL,
    'Ulcers washed with 1% potassium permanganate solution. Soft mash feeding recommended.',
    'Boric acid glycerin for mouth, antiseptic fly repellent spray for hooves.'
),
(
    '40000000-0000-0000-0000-000000000003',
    'CASE-2026-PUN-1094',
    '00000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000005',
    'Ganga',
    'Cattle',
    'Blackleg (Clostridial)',
    82,
    'High',
    'Pune',
    'Maharashtra',
    18.7597,
    73.8585,
    '{"village": "Chakan", "block": "Khed", "district": "Pune", "state": "Maharashtra"}'::JSONB,
    '{"name": "Sunita Gaikwad", "phone": "+919822055667"}'::JSONB,
    ARRAY['lameness', 'high_fever', 'joint_swelling', 'lethargy'],
    39.9,
    1.0,
    1,
    'Heifer developed hot, painful swelling on upper left thigh with severe limp.',
    'Suspected early-stage Blackleg (Clostridium chauvoei).',
    'Crepitation on palpation. High priority intervention.',
    'New',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '',
    ''
);

-- Case Timeline Entries
INSERT INTO public.case_timeline (case_id, status, updated_by, updater_name, notes) VALUES
(
    '40000000-0000-0000-0000-000000000001',
    'New',
    '00000000-0000-0000-0000-000000000001',
    'Ramesh Patil',
    'Referral case initiated following AI detection (Lumpy Skin Disease - 89% confidence).'
),
(
    '40000000-0000-0000-0000-000000000001',
    'Investigating',
    '00000000-0000-0000-0000-000000000002',
    'Dr. Ananya Deshmukh',
    'Case claimed by Dr. Ananya Deshmukh. Clinical investigation initiated on-site.'
),
(
    '40000000-0000-0000-0000-000000000001',
    'Confirmed',
    '00000000-0000-0000-0000-000000000002',
    'Dr. Ananya Deshmukh',
    'Case transitioned to Confirmed. Clinical diagnosis: acute Lumpy Skin Disease.'
),
(
    '40000000-0000-0000-0000-000000000001',
    'Containment',
    '00000000-0000-0000-0000-000000000002',
    'Dr. Ananya Deshmukh',
    'Containment Zone ZONE-2026-PUN-9821 established (5.0 km radius). Ring camp scheduled.'
);

-- Case Notified Vets
INSERT INTO public.case_notified_vets (case_id, vet_id, name, phone, notified_at, delivery_status, channel) VALUES
(
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Dr. Ananya Deshmukh',
    '+919822022334',
    NOW() - INTERVAL '3 days',
    'SENT',
    'SSE'
),
(
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000006',
    'Dr. Rajesh Shinde',
    '+919822088990',
    NOW() - INTERVAL '3 days',
    'SENT',
    'SSE'
);

-- -------------------------------------------------------------------------------------
-- 7. SEED REPORTS & AI TRIAGE RESULTS
-- -------------------------------------------------------------------------------------
-- Report IDs:
-- Report 1: '50000000-0000-0000-0000-000000000001'
-- Report 2: '50000000-0000-0000-0000-000000000002'

INSERT INTO public.reports (
    id, case_id, reporter_id, animal_id, species,
    symptoms, mortality_count, affected_count,
    latitude, longitude, village, block, district,
    photos, temperature, duration, status,
    reporter_contact, notes
) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    'CASE-20260910-1042',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Cattle',
    ARRAY['skin_nodules', 'high_fever', 'reduced_milk_yield'],
    0,
    2,
    18.1517,
    74.5772,
    'Malegaon Bk',
    'Baramati',
    'Pune',
    ARRAY['/uploads/scans/scan-demo-lsd-nodule.jpg'],
    40.2,
    3.0,
    'Escalated',
    '{"name": "Ramesh Patil", "phone": "+919822011223"}'::JSONB,
    'Skin nodules spreading quickly over back and neck.'
),
(
    '50000000-0000-0000-0000-000000000002',
    'CASE-20260911-1088',
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000003',
    'Cattle',
    ARRAY['mouth_lesions', 'drooling', 'foot_lesions', 'high_fever'],
    0,
    4,
    18.8276,
    74.3774,
    'Koregaon Bhima',
    'Shirur',
    'Pune',
    ARRAY['/uploads/scans/scan-demo-fmd-mouth.jpg'],
    40.8,
    2.0,
    'Triaged',
    '{"name": "Santosh Shinde", "phone": "+919822044556"}'::JSONB,
    'Blisters in mouth, unable to chew feed, salivating heavily.'
);

-- Triage Results (1-to-1 with Reports)
INSERT INTO public.triage_results (
    report_id, risk_level, suspected_diseases, recommended_action,
    immediate_first_aid, outbreak_flag, cluster_details,
    explanation, visual_score, model_version
) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    'High',
    '[
        {"name": "Lumpy Skin Disease (लम्पी त्वचा रोग)", "confidenceScore": 0.89, "rationale": "lsd_model.keras visual score 0.91 fused with skin nodules, high fever and milk yield drop"},
        {"name": "Pseudo-Cowpox", "confidenceScore": 0.11, "rationale": "Papular lesions without generalised high fever"}
    ]'::JSONB,
    'Isolate affected cattle immediately in fly-proof shade. Request government veterinary inspection for supportive antipyretic therapy.',
    ARRAY[
        'Strictly isolate the infected cattle in a separate, fly-proof shelter.',
        'Apply neem oil or herbal fly repellents twice daily to protect against vectors.',
        'Clean burst skin lesions with mild potassium permanganate (1:1000) or povidone-iodine.',
        'Feed soft green fodder and clean water mixed with oral rehydration salts.'
    ],
    TRUE,
    '{"matchedCasesCount": 3, "timeWindowDays": 14, "block": "Baramati"}'::JSONB,
    '[CLUSTER ALERT: 3 similar cases in Baramati block within 14 days] lsd_model.keras (EfficientNetB0) visual analysis: 91% match for Lumpy Skin lesions. Fused with high fever (40.2°C) and milk reduction.',
    0.9124,
    'lsd_model.keras (EfficientNetB0)'
),
(
    '50000000-0000-0000-0000-000000000002',
    'Critical',
    '[
        {"name": "Foot and Mouth Disease (खुरपका-मुंहपका)", "confidenceScore": 0.94, "rationale": "Pathognomonic combination of oral blisters, excessive ropey salivation and interdigital ulcers"},
        {"name": "Vesicular Stomatitis", "confidenceScore": 0.06, "rationale": "Similar lesions but clinically less contagious"}
    ]'::JSONB,
    'CRITICAL: Strict biosecurity quarantine. Halt all cattle transit. Call toll-free 1962 or Block Veterinary Officer immediately.',
    ARRAY[
        'Quarantine animal immediately to stop rapid airborne and contact spread to other animals.',
        'Wash oral lesions with 1% potassium permanganate (KMnO4) or 2% sodium bicarbonate solution.',
        'Apply boric acid glycerin ointment to oral ulcers and fly-repellent antiseptic to foot lesions.',
        'Provide soft cooked mash or gruel as mouth pain prevents chewing coarse dry fodder.'
    ],
    TRUE,
    '{"matchedCasesCount": 4, "timeWindowDays": 14, "block": "Shirur"}'::JSONB,
    'EMERGENCY WARNING: High contagion index. Rapid spread detected across Shirur dairy corridor.',
    0.8850,
    'lsd_model.keras (EfficientNetB0)'
);

-- -------------------------------------------------------------------------------------
-- 8. SEED LAB REFERRALS
-- -------------------------------------------------------------------------------------
INSERT INTO public.lab_referrals (
    report_id, sample_type, collection_date, referred_lab,
    status, collected_by, result_summary
) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    'Skin Lesion / Scab',
    NOW() - INTERVAL '2 days',
    'District Disease Diagnostic Laboratory (DDDL), Pune',
    'Result Confirmed',
    '00000000-0000-0000-0000-000000000002',
    '{"confirmedDisease": "Lumpy Skin Disease (Capripoxvirus DNA detected via PCR)", "confirmedDate": "2026-09-12T14:30:00Z", "notes": "PCR positive for LSDV. Lineage homogeneous to Western Maharashtra 2024-26 clade."}'::JSONB
),
(
    '50000000-0000-0000-0000-000000000002',
    'Vesicular Fluid',
    NOW() - INTERVAL '1 day',
    'District Disease Diagnostic Laboratory (DDDL), Pune',
    'In Transit',
    '00000000-0000-0000-0000-000000000006',
    '{"notes": "Sample dispatched in cold chain transport box with ice packs."}'::JSONB
);

-- -------------------------------------------------------------------------------------
-- 9. SEED BILINGUAL ADVISORIES
-- -------------------------------------------------------------------------------------
INSERT INTO public.advisories (
    report_id, title_en, title_hi, message_en, message_hi,
    severity, disease, target_village, target_block, target_district, issued_by
) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    'High Alert: Lumpy Skin Disease Outbreak in Baramati Block',
    'सतर्कता अलर्ट: बारामती ब्लॉक में लम्पी त्वचा रोग (LSD) का प्रकोप',
    'Active clusters of Lumpy Skin Disease detected in Malegaon Bk. All dairy farmers are advised to isolate symptomatic cattle in mosquito-netted pens and report immediately to toll-free 1962.',
    'मालेगांव बुद्रुक क्षेत्र में लम्पी त्वचा रोग के सक्रिय मामले मिले हैं। सभी किसान भाई अपने प्रभावित पशुओं को अलग हवादार बाड़े में बांधें और तुरंत 1962 पर सूचना दें।',
    'Critical',
    'Lumpy Skin Disease',
    'Malegaon Rural',
    'Baramati',
    'Pune',
    'District Animal Husbandry Department, Pune'
),
(
    '50000000-0000-0000-0000-000000000002',
    'Movement Restriction Advisory: Foot and Mouth Disease in Shirur',
    'पशु आवागमन प्रतिबंध: शिरूर क्षेत्र में खुरपका-मुंहपका (FMD) चेतावनी',
    'To prevent the transmission of FMD, animal trade markets within 10km of Koregaon Bhima are temporarily suspended. Disinfect vehicle tires with 4% sodium carbonate.',
    'खुरपका-मुंहपका के प्रसार को रोकने के लिए कोरेगांव भीमा के 10 किमी दायरे में पशु मेलों पर अस्थायी रोक लगाई गई है। बाड़ों और खुरली में चूने का छिड़काव करें।',
    'High',
    'Foot and Mouth Disease (FMD)',
    'All',
    'Shirur',
    'Pune',
    'Deputy Commissioner of Animal Husbandry, Pune'
),
(
    NULL,
    'Monsoon Seasonal Advisory: Prevention of Haemorrhagic Septicaemia (HS)',
    'मानसून मौसमी एडवाइजरी: गलघोंटू (एचएस) रोग से बचाव',
    'Waterlogged grazing lands increase exposure to Pasteurella multocida. Ensure cattle and buffaloes receive pre-monsoon alum-precipitated vaccinations before water stagnation occurs.',
    'जलभराव वाले चरागाहों में गलघोंटू का खतरा बढ़ जाता है। जलभराव से पहले सभी गोवंश और भैंसों का गलघोंटू का टीका अवश्य लगवाएं।',
    'Moderate',
    'Haemorrhagic Septicaemia (HS)',
    'All',
    'All',
    'Pune',
    'State Veterinary Disease Surveillance Network'
);

-- -------------------------------------------------------------------------------------
-- 10. SEED NOTIFICATIONS
-- -------------------------------------------------------------------------------------
INSERT INTO public.notifications (
    recipient_id, case_id, case_number, type, title, message,
    district, status, metadata
) VALUES
(
    '00000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    'CASE-2026-PUN-1042',
    'NEW_CASE_ALERT',
    '🚨 New High Risk Referral: Lumpy Skin Disease',
    'Farmer Ramesh Patil reported suspected Lumpy Skin Disease in Baramati.',
    'Pune',
    'READ',
    '{"disease": "Lumpy Skin Disease", "risk": "High", "confidence": 89, "animalSpecies": "Cattle", "farmerName": "Ramesh Patil", "farmerPhone": "+919822011223"}'::JSONB
),
(
    '00000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000002',
    'CASE-2026-PUN-1088',
    'NEW_CASE_ALERT',
    '🚨 New Critical Risk Referral: Foot and Mouth Disease (FMD)',
    'Farmer Santosh Shinde reported suspected Foot and Mouth Disease in Shirur.',
    'Pune',
    'DELIVERED',
    '{"disease": "Foot and Mouth Disease (FMD)", "risk": "Critical", "confidence": 94, "animalSpecies": "Cattle", "farmerName": "Santosh Shinde", "farmerPhone": "+919822044556"}'::JSONB
);

-- -------------------------------------------------------------------------------------
-- 11. SEED SCAN IMAGES
-- -------------------------------------------------------------------------------------
INSERT INTO public.scan_images (
    animal_id, owner_id, image_url, disease, risk_level, confidence,
    symptoms, temperature, duration
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '/uploads/scans/scan-demo-lsd-nodule.jpg',
    'Lumpy Skin Disease (लम्पी त्वचा रोग)',
    'High',
    89.0,
    ARRAY['skin_nodules', 'high_fever', 'reduced_milk_yield'],
    40.2,
    3.0
);

-- -------------------------------------------------------------------------------------
-- 12. SEED AUDIT LOGS
-- -------------------------------------------------------------------------------------
INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action, entity_type, entity_id, details
) VALUES
(
    '00000000-0000-0000-0000-000000000002',
    'Dr. Ananya Deshmukh',
    'veterinarian',
    'CLAIM_CASE',
    'disease_cases',
    '40000000-0000-0000-0000-000000000001',
    '{"caseId": "CASE-2026-PUN-1042", "action": "Atomic claim of new clinical referral"}'::JSONB
),
(
    '00000000-0000-0000-0000-000000000002',
    'Dr. Ananya Deshmukh',
    'veterinarian',
    'DECLARE_CONTAINMENT',
    'containment_zones',
    '30000000-0000-0000-0000-000000000001',
    '{"zoneId": "ZONE-2026-PUN-9821", "radiusKm": 5.0, "disease": "Lumpy Skin Disease"}'::JSONB
);

-- -------------------------------------------------------------------------------------
-- 13. SYNCHRONIZE CIRCULAR FOREIGN KEYS (Containment Zones -> Cases & Reports)
-- -------------------------------------------------------------------------------------
UPDATE public.containment_zones
SET case_id = '40000000-0000-0000-0000-000000000001',
    report_id = '50000000-0000-0000-0000-000000000001'
WHERE id = '30000000-0000-0000-0000-000000000001';

UPDATE public.containment_zones
SET case_id = '40000000-0000-0000-0000-000000000002',
    report_id = '50000000-0000-0000-0000-000000000002'
WHERE id = '30000000-0000-0000-0000-000000000002';

COMMIT;

-- =====================================================================================
-- END OF SEED SCRIPT
-- =====================================================================================
