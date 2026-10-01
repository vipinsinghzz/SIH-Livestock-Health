/**
 * Master Synthetic Demo Network Seeder for Nagpur District, Maharashtra
 * File: backend/seed/seedNagpurDemoNetwork.js
 */

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { supabaseAdmin } = require('../config/supabaseClient');
const { NAGPUR_LOCATIONS, defineDemoUsers } = require('./seedNagpurSpec');

async function runSeed() {
  console.log('================================================================');
  console.log('🚀 SEEDING PASHUCARE SYNTHETIC DEMO NETWORK (NAGPUR DISTRICT)');
  console.log('Target Supabase:', process.env.SUPABASE_URL);
  console.log('================================================================\n');

  const { farmers, veterinarians, officers } = await defineDemoUsers();
  const allUsers = [...farmers, ...veterinarians, ...officers];

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 1: AUTH USERS & PROFILES PROVISIONING
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`[Step 1] Provisioning ${allUsers.length} Supabase Auth users & Profiles...`);

  const { data: existingAuthData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const authEmailMap = new Map();
  (existingAuthData?.users || []).forEach(u => {
    if (u.email) authEmailMap.set(u.email.toLowerCase(), u);
  });

  for (const u of allUsers) {
    let authId = null;
    const existingAuth = authEmailMap.get(u.email.toLowerCase());

    const defaultPassword = u.role === 'farmer' ? 'Farmer@123' : u.role === 'officer' ? 'Admin@123' : 'Vet@123';

    if (existingAuth) {
      authId = existingAuth.id;
    } else {
      try {
        const { data: createdAuth, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            name: u.name,
            role: u.role,
            phone: u.phone,
            district: 'Nagpur',
            state: 'Maharashtra',
            village: u.loc.village,
            block: u.loc.block
          }
        });
        if (createAuthErr) {
          // If already exists, we will retrieve id below
        } else if (createdAuth?.user) {
          authId = createdAuth.user.id;
        }
      } catch (e) {
        // Fallback to fetch id
      }
    }

    if (!authId) {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      const match = (userList?.users || []).find(x => x.email?.toLowerCase() === u.email.toLowerCase());
      if (match) authId = match.id;
    }

    if (authId) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(authId, {
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            name: u.name,
            role: u.role,
            phone: u.phone,
            district: 'Nagpur',
            state: 'Maharashtra',
            village: u.loc.village,
            block: u.loc.block
          }
        });
      } catch (err) {
        console.warn(`  Notice updating auth user ${u.email}:`, err.message);
      }
    }

    // Upsert profile row into public.profiles
    const profilePayload = {
      id: u.id,
      auth_user_id: authId,
      name: u.name,
      role: u.role,
      is_active: true,
      phone: u.phone,
      email: u.email,
      password_hash: u.passwordHash,
      village: u.loc.village,
      block: u.loc.block,
      district: 'Nagpur',
      state: 'Maharashtra',
      latitude: u.loc.lat,
      longitude: u.loc.lng,
      clinic_name: u.clinic || '',
      specialization: u.specialization || 'General Veterinary Physician',
      experience: u.experience || 6,
      rating: u.rating || 4.8,
      department: u.department || (u.role === 'veterinarian' ? 'Department of Animal Husbandry, Nagpur' : ''),
      registration_no: u.registrationNo || '',
      availability: 'AVAILABLE',
      is_available: true,
      data_source: 'NAGPUR_DEMO_2026',
      preferred_language: 'hi',
      services: ['Emergency Triage', 'Vaccination', 'Clinical Surgery', 'Artificial Insemination'],
      updated_at: new Date().toISOString()
    };

    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'email' });

    if (profErr) {
      console.warn(`  Profile upsert error for ${u.email}:`, profErr.message);
    }
  }
  console.log('  ✓ Auth & Profile provisioning complete.');

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 2: MIGRATE EXISTING PUNE TEST DATA TO NAGPUR
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 2] Migrating existing Pune demo records to Nagpur...');

  // 2a. Update any old profiles still marked Pune or below lat 20.0
  await supabaseAdmin
    .from('profiles')
    .update({
      district: 'Nagpur',
      block: 'Nagpur Urban',
      village: 'Civil Lines',
      latitude: NAGPUR_LOCATIONS.NAGPUR_CITY.lat,
      longitude: NAGPUR_LOCATIONS.NAGPUR_CITY.lng
    })
    .or('district.eq.Pune,latitude.lt.20.0');

  // 2b. Update existing disease cases that were given Pune coords or Baramati
  await supabaseAdmin
    .from('disease_cases')
    .update({
      case_id: 'CASE-2026-NAG-3629',
      district_id: 'Nagpur',
      latitude: NAGPUR_LOCATIONS.KATOL_TOWN.lat,
      longitude: NAGPUR_LOCATIONS.KATOL_TOWN.lng,
      farmer_location: {
        district: 'Nagpur',
        block: 'Katol',
        village: 'Katol Rural',
        state: 'Maharashtra'
      }
    })
    .eq('case_id', 'CASE-2026-PUN-3629');

  await supabaseAdmin
    .from('disease_cases')
    .update({
      district_id: 'Nagpur',
      latitude: NAGPUR_LOCATIONS.KAMPTEE_RURAL.lat,
      longitude: NAGPUR_LOCATIONS.KAMPTEE_RURAL.lng,
      farmer_location: {
        district: 'Nagpur',
        block: 'Kamptee',
        village: 'Yerkheda',
        state: 'Maharashtra'
      }
    })
    .eq('case_id', 'CASE-2026-NAG-4409');

  await supabaseAdmin
    .from('disease_cases')
    .update({
      district_id: 'Nagpur',
      latitude: NAGPUR_LOCATIONS.NAGPUR_RURAL_WADI.lat,
      longitude: NAGPUR_LOCATIONS.NAGPUR_RURAL_WADI.lng
    })
    .lt('latitude', 20.0);

  // 2c. Update existing animals that were marked Pune
  await supabaseAdmin
    .from('animals')
    .update({
      district: 'Nagpur',
      block: 'Kamptee',
      village: 'Yerkheda'
    })
    .eq('district', 'Pune');

  // 2d. Clean up old Pune containment zone
  await supabaseAdmin
    .from('containment_zones')
    .delete()
    .or('district.eq.Pune,center_latitude.lt.20.0');

  // 2e. Migrate older ring vaccination camps with Pune/Baramati coordinates
  const nagpurLocationsList = [
    { block: 'Saoner', village: 'Kelod', venue: 'Emergency Ring Vaccination Center - Kelod', lat: 21.3920, lng: 78.9280 },
    { block: 'Kalmeshwar', village: 'Dhapewada', venue: 'Emergency Ring Vaccination Center - Dhapewada', lat: 21.2400, lng: 78.9100 },
    { block: 'Ramtek', village: 'Mansar', venue: 'Emergency Ring Vaccination Center - Mansar', lat: 21.4010, lng: 79.2550 },
    { block: 'Nagpur Rural', village: 'Bori', venue: 'Emergency Ring Vaccination Center - Bori', lat: 20.9100, lng: 78.9800 }
  ];
  const { data: oldPuneDrives } = await supabaseAdmin
    .from('vaccination_drives')
    .select('id')
    .or('latitude.lt.20.0,venue.ilike.%malegaon%,block.ilike.%baramati%');

  if (oldPuneDrives && oldPuneDrives.length > 0) {
    for (let i = 0; i < oldPuneDrives.length; i++) {
      const loc = nagpurLocationsList[i % nagpurLocationsList.length];
      await supabaseAdmin
        .from('vaccination_drives')
        .update({
          district: 'Nagpur',
          block: loc.block,
          village: loc.village,
          venue: loc.venue,
          latitude: loc.lat,
          longitude: loc.lng
        })
        .eq('id', oldPuneDrives[i].id);
    }
  }

  // 2f. Migrate older reports with Pune/Baramati locations
  await supabaseAdmin
    .from('reports')
    .update({
      district: 'Nagpur',
      block: 'Hingna',
      village: 'Hingna Central',
      latitude: NAGPUR_LOCATIONS.HINGNA_TOWN.lat,
      longitude: NAGPUR_LOCATIONS.HINGNA_TOWN.lng
    })
    .or('latitude.lt.20.0,block.ilike.%baramati%,village.ilike.%malegaon%');

  // 2g. Migrate older lab referrals to RDDL Nagpur
  await supabaseAdmin
    .from('lab_referrals')
    .update({ referred_lab: 'Regional Disease Diagnostic Laboratory (RDDL), Nagpur' })
    .ilike('referred_lab', '%pune%');

  console.log('  ✓ Pune migration complete.');

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 3: PROVISION LIVESTOCK NETWORK (~60 ANIMALS ACROSS 12 FARMERS)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 3] Provisioning synthetic livestock herds for 12 farmers...');

  const ANIMAL_TEMPLATES = [
    // Ramesh Patil (Kamptee)
    { tag: 'NG-COW-101', name: 'Lakshmi (लक्ष्मी)', species: 'Cattle', breed: 'Gaolao (गावळाऊ)', age: 4, gender: 'Female', status: 'Needs Attention', ownerIdx: 0, milk: '14.5 L' },
    { tag: 'NG-COW-102', name: 'Gauri (गौरी)', species: 'Cattle', breed: 'Gir (गीर)', age: 5, gender: 'Female', status: 'Healthy', ownerIdx: 0, milk: '16.0 L' },
    { tag: 'NG-COW-103', name: 'Nandi (नंदी)', species: 'Cattle', breed: 'Gaolao (गावळाऊ)', age: 3, gender: 'Male', status: 'Healthy', ownerIdx: 0, milk: '0.0 L' },
    { tag: 'NG-GOAT-201', name: 'Sundari (सुंदरी)', species: 'Goat', breed: 'Berari (बेरारी)', age: 2, gender: 'Female', status: 'Critical', ownerIdx: 0, milk: '2.5 L' },
    { tag: 'NG-GOAT-202', name: 'Champa (चंपा)', species: 'Goat', breed: 'Osmanabadi (उस्मानाबादी)', age: 3, gender: 'Female', status: 'Healthy', ownerIdx: 0, milk: '3.0 L' },
    { tag: 'NG-SHEEP-301', name: 'Raju (राजू)', species: 'Sheep', breed: 'Deccani (दख्खनी)', age: 2, gender: 'Male', status: 'Healthy', ownerIdx: 0, milk: '1.0 L' },

    // Santosh Wankhede (Hingna)
    { tag: 'NG-COW-104', name: 'Kamdhenu (कामधेनु)', species: 'Cattle', breed: 'Sahiwal (साहिवाल)', age: 6, gender: 'Female', status: 'Healthy', ownerIdx: 1, milk: '18.0 L' },
    { tag: 'NG-COW-105', name: 'Radha (राधा)', species: 'Cattle', breed: 'Gaolao (गावळाऊ)', age: 3, gender: 'Female', status: 'Healthy', ownerIdx: 1, milk: '12.0 L' },
    { tag: 'NG-COW-106', name: 'Ganga (गंगा)', species: 'Cattle', breed: 'Gir (गीर)', age: 4, gender: 'Female', status: 'Healthy', ownerIdx: 1, milk: '15.0 L' },
    { tag: 'NG-COW-107', name: 'Surya (सूर्य)', species: 'Cattle', breed: 'Khillari (खिल्लारी)', age: 5, gender: 'Male', status: 'Healthy', ownerIdx: 1, milk: '0.0 L' },
    { tag: 'NG-GOAT-203', name: 'Babli (बबली)', species: 'Goat', breed: 'Berari (बेरारी)', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 1, milk: '2.0 L' },
    { tag: 'NG-GOAT-204', name: 'Muniya (मुनिया)', species: 'Goat', breed: 'Osmanabadi', age: 1, gender: 'Female', status: 'Healthy', ownerIdx: 1, milk: '1.8 L' },
    { tag: 'NG-SHEEP-302', name: 'Bheema (भीमा)', species: 'Sheep', breed: 'Deccani (दख्खनी)', age: 3, gender: 'Male', status: 'Recovered', ownerIdx: 1, milk: '0.0 L' },

    // Sunita Pawar (Saoner - Outbreak epicenter)
    { tag: 'NG-COW-108', name: 'Kasturi (कस्तुरी)', species: 'Cattle', breed: 'Gaolao (गावळाऊ)', age: 4, gender: 'Female', status: 'Critical', ownerIdx: 2, milk: '8.0 L' },
    { tag: 'NG-COW-109', name: 'Tulsi (तुलसी)', species: 'Cattle', breed: 'Gir (गीर)', age: 5, gender: 'Female', status: 'Needs Attention', ownerIdx: 2, milk: '9.5 L' },
    { tag: 'NG-COW-110', name: 'Basanti (बसंती)', species: 'Cattle', breed: 'Gaolao', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 2, milk: '11.0 L' },
    { tag: 'NG-GOAT-205', name: 'Pari (परी)', species: 'Goat', breed: 'Berari (बेरारी)', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 2, milk: '2.2 L' },
    { tag: 'NG-SHEEP-303', name: 'Kalu (काळू)', species: 'Sheep', breed: 'Deccani', age: 2, gender: 'Male', status: 'Healthy', ownerIdx: 2, milk: '0.0 L' },

    // Mahesh Deshmukh (Kalmeshwar)
    { tag: 'NG-COW-111', name: 'Sonu (सोनू)', species: 'Cattle', breed: 'Gir', age: 3, gender: 'Female', status: 'Healthy', ownerIdx: 3, milk: '13.0 L' },
    { tag: 'NG-COW-112', name: 'Monu (मोनू)', species: 'Cattle', breed: 'Sahiwal', age: 4, gender: 'Female', status: 'Healthy', ownerIdx: 3, milk: '15.0 L' },
    { tag: 'NG-GOAT-206', name: 'Rani (राणी)', species: 'Goat', breed: 'Osmanabadi', age: 3, gender: 'Female', status: 'Needs Attention', ownerIdx: 3, milk: '2.5 L' },
    { tag: 'NG-SHEEP-304', name: 'Sheru (शेरू)', species: 'Sheep', breed: 'Madgyal (माडग्याळ)', age: 2, gender: 'Male', status: 'Healthy', ownerIdx: 3, milk: '0.0 L' },

    // Ganesh Raut (Ramtek)
    { tag: 'NG-COW-113', name: 'Bhavani (भवानी)', species: 'Cattle', breed: 'Gaolao', age: 5, gender: 'Female', status: 'Needs Attention', ownerIdx: 4, milk: '11.5 L' },
    { tag: 'NG-COW-114', name: 'Mangala (मंगळा)', species: 'Cattle', breed: 'Red Sindhi', age: 4, gender: 'Female', status: 'Healthy', ownerIdx: 4, milk: '14.0 L' },
    { tag: 'NG-GOAT-207', name: 'Sheela (शीला)', species: 'Goat', breed: 'Berari', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 4, milk: '2.0 L' },
    { tag: 'NG-SHEEP-305', name: 'Somu (सोमू)', species: 'Sheep', breed: 'Deccani', age: 1, gender: 'Male', status: 'Healthy', ownerIdx: 4, milk: '0.0 L' },

    // Anita Bhende (Umred)
    { tag: 'NG-COW-115', name: 'Kalyani (कल्याणी)', species: 'Cattle', breed: 'Gir', age: 4, gender: 'Female', status: 'Recovered', ownerIdx: 5, milk: '14.0 L' },
    { tag: 'NG-COW-116', name: 'Tara (तारा)', species: 'Cattle', breed: 'Gaolao', age: 3, gender: 'Female', status: 'Healthy', ownerIdx: 5, milk: '13.0 L' },
    { tag: 'NG-GOAT-208', name: 'Geeta (गीता)', species: 'Goat', breed: 'Osmanabadi', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 5, milk: '2.1 L' },
    { tag: 'NG-SHEEP-306', name: 'Golu (गोलू)', species: 'Sheep', breed: 'Deccani', age: 3, gender: 'Male', status: 'Healthy', ownerIdx: 5, milk: '0.0 L' },

    // Pradeep Kale (Katol)
    { tag: 'NG-COW-117', name: 'Kapila (कपिला)', species: 'Cattle', breed: 'Sahiwal', age: 5, gender: 'Female', status: 'Healthy', ownerIdx: 6, milk: '16.5 L' },
    { tag: 'NG-GOAT-209', name: 'Gauri (गौरी)', species: 'Goat', breed: 'Berari', age: 2, gender: 'Female', status: 'Needs Attention', ownerIdx: 6, milk: '2.4 L' },
    { tag: 'NG-GOAT-210', name: 'Kusum (कुसुम)', species: 'Goat', breed: 'Sirohi', age: 3, gender: 'Female', status: 'Healthy', ownerIdx: 6, milk: '3.2 L' },
    { tag: 'NG-SHEEP-307', name: 'Shambu (शंभू)', species: 'Sheep', breed: 'Madgyal', age: 2, gender: 'Male', status: 'Healthy', ownerIdx: 6, milk: '0.0 L' },

    // Rekha Gawande (Parseoni)
    { tag: 'NG-COW-118', name: 'Yamuna (यमुना)', species: 'Cattle', breed: 'Gaolao', age: 4, gender: 'Female', status: 'Needs Attention', ownerIdx: 7, milk: '12.0 L' },
    { tag: 'NG-COW-119', name: 'Saraswati (सरस्वती)', species: 'Cattle', breed: 'Gir', age: 3, gender: 'Female', status: 'Healthy', ownerIdx: 7, milk: '13.5 L' },
    { tag: 'NG-GOAT-211', name: 'Pooja (पूजा)', species: 'Goat', breed: 'Berari', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 7, milk: '2.0 L' },

    // Sanjay Thakre (Kuhi)
    { tag: 'NG-COW-120', name: 'Anandi (आनंदी)', species: 'Cattle', breed: 'Gir', age: 5, gender: 'Female', status: 'Healthy', ownerIdx: 8, milk: '15.0 L' },
    { tag: 'NG-COW-121', name: 'Chandani (चांदणी)', species: 'Cattle', breed: 'Gaolao', age: 3, gender: 'Female', status: 'Healthy', ownerIdx: 8, milk: '12.5 L' },
    { tag: 'NG-GOAT-212', name: 'Komal (कोमल)', species: 'Goat', breed: 'Osmanabadi', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 8, milk: '2.3 L' },
    { tag: 'NG-SHEEP-308', name: 'Ballu (बल्लू)', species: 'Sheep', breed: 'Deccani', age: 2, gender: 'Male', status: 'Healthy', ownerIdx: 8, milk: '0.0 L' },

    // Archana Zade (Mouda)
    { tag: 'NG-COW-122', name: 'Gopi (गोपी)', species: 'Cattle', breed: 'Gaolao', age: 4, gender: 'Female', status: 'Healthy', ownerIdx: 9, milk: '13.0 L' },
    { tag: 'NG-GOAT-213', name: 'Nisha (निशा)', species: 'Goat', breed: 'Berari', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 9, milk: '2.2 L' },
    { tag: 'NG-SHEEP-309', name: 'Badal (बादल)', species: 'Sheep', breed: 'Madgyal', age: 1, gender: 'Male', status: 'Healthy', ownerIdx: 9, milk: '0.0 L' },

    // Dilip Meshram (Wadi, Nagpur Rural)
    { tag: 'NG-COW-123', name: 'Revati (रेवती)', species: 'Cattle', breed: 'Sahiwal', age: 4, gender: 'Female', status: 'Healthy', ownerIdx: 10, milk: '16.0 L' },
    { tag: 'NG-GOAT-214', name: 'Dimple (डिंपल)', species: 'Goat', breed: 'Osmanabadi', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 10, milk: '2.1 L' },

    // Kavita Chaware (Digdoh, Hingna)
    { tag: 'NG-COW-124', name: 'Shalini (शालिनी)', species: 'Cattle', breed: 'Gir', age: 4, gender: 'Female', status: 'Healthy', ownerIdx: 11, milk: '14.0 L' },
    { tag: 'NG-GOAT-215', name: 'Chutki (चुटकী)', species: 'Goat', breed: 'Berari', age: 2, gender: 'Female', status: 'Healthy', ownerIdx: 11, milk: '2.0 L' },
    { tag: 'NG-SHEEP-310', name: 'Rocky (रॉकी)', species: 'Sheep', breed: 'Deccani', age: 2, gender: 'Male', status: 'Healthy', ownerIdx: 11, milk: '0.0 L' }
  ];

  const animalMap = new Map(); // tag -> animal object

  for (const t of ANIMAL_TEMPLATES) {
    const owner = farmers[t.ownerIdx];
    const animalPayload = {
      tag_id: t.tag,
      name: t.name,
      species: t.species,
      breed: t.breed,
      age: t.age,
      gender: t.gender,
      health_status: t.status,
      milk_yield_daily: t.milk,
      last_checkup: new Date(Date.now() - Math.floor(Math.random() * 15 + 1) * 86400000).toLocaleDateString('en-GB'),
      owner_id: owner.id,
      village: owner.loc.village,
      block: owner.loc.block,
      district: 'Nagpur',
      updated_at: new Date().toISOString()
    };

    const { data: upsertedAnimal, error: aErr } = await supabaseAdmin
      .from('animals')
      .upsert(animalPayload, { onConflict: 'tag_id' })
      .select('*')
      .single();

    if (aErr) {
      console.warn(`  Animal upsert notice for ${t.tag}:`, aErr.message);
    } else if (upsertedAnimal) {
      animalMap.set(t.tag, upsertedAnimal);
    }
  }
  console.log(`  ✓ Seeded ${animalMap.size} livestock animals across Nagpur district.`);

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 4: PROVISION SPECIES-SPECIFIC AI SCREENINGS & SCAN IMAGES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 4] Provisioning species-specific AI screenings (Cow LSD/Normal, Goat Mange/Orf/CL/Lice, Sheep Orf)...');

  const AI_SCANS = [
    // 1. Cow with Lumpy Skin Disease (Ramesh Patil)
    {
      animalTag: 'NG-COW-101',
      ownerId: farmers[0].id,
      disease: 'Lumpy Skin Disease (LSD)',
      risk: 'High',
      confidence: 94,
      symptoms: ['skin_nodules', 'high_fever', 'reduced_milk_yield', 'lethargy'],
      temp: 40.2,
      duration: 48,
      explanation: 'Characteristic circumscribed cutaneous nodules (2-5cm) observed on cervical and torso regions with pyrexia. High likelihood of Lumpy Skin Disease.',
      advisory: 'Strictly isolate the cow. Apply topical antiseptic to nodules. Restrict biting insect contact with mosquito netting. Immediate veterinary notification required.'
    },
    // 2. Cow with Normal / Healthy Skin (Santosh Wankhede)
    {
      animalTag: 'NG-COW-104',
      ownerId: farmers[1].id,
      disease: 'Normal / Healthy Skin',
      risk: 'Low',
      confidence: 96,
      symptoms: [],
      temp: 38.6,
      duration: 0,
      explanation: 'Dermatological examination indicates uniform coat texture with no cutaneous nodulation or ulceration. Skin integrity is intact.',
      advisory: 'Maintain standard herd hygiene, ensure clean drinking water and balanced nutritional feed.'
    },
    // 3. Goat with Mange (Ramesh Patil)
    {
      animalTag: 'NG-GOAT-201',
      ownerId: farmers[0].id,
      disease: 'Mange (खरुज)',
      risk: 'High',
      confidence: 89,
      symptoms: ['skin_pustules', 'lethargy', 'weight_loss'],
      temp: 39.4,
      duration: 72,
      explanation: 'Severe hyperkeratosis, crusting, and pruritic alopecia around muzzle and ears. Highly consistent with Sarcoptic / Psoroptic mange infestation.',
      advisory: 'Isolate goat immediately. Consult veterinarian for subcutaneous ivermectin injection and topical amitraz wash.'
    },
    // 4. Goat with Caseous Lymphadenitis (Mahesh Deshmukh)
    {
      animalTag: 'NG-GOAT-206',
      ownerId: farmers[3].id,
      disease: 'Caseous Lymphadenitis (CL)',
      risk: 'Moderate',
      confidence: 84,
      symptoms: ['joint_swelling', 'weight_loss'],
      temp: 39.1,
      duration: 96,
      explanation: 'Encapsulated abscessation observed at parotid/prescapular lymph node region. Suspected Corynebacterium pseudotuberculosis infection.',
      advisory: 'Prevent abscess rupture in grazing paddock. Disinfect pen. Veterinary surgical drainage and diagnostic culture recommended.'
    },
    // 5. Sheep with Contagious Ecthyma / Orf (Santosh Wankhede)
    {
      animalTag: 'NG-SHEEP-302',
      ownerId: farmers[1].id,
      disease: 'Contagious Ecthyma / Orf (ऑर्फ़)',
      risk: 'High',
      confidence: 91,
      symptoms: ['mouth_lesions', 'reduced_milk_yield'],
      temp: 39.8,
      duration: 36,
      explanation: 'Papulovesicular scabs and proliferative pustular crusted lesions localized on oral commissures and lips. Parapoxvirus suspected.',
      advisory: 'Isolate animal from lambs. Treat locally with potassium permanganate antiseptic rinse and fly-repellent ointment. Zoonotic precaution: use gloves.'
    },
    // 6. Cow with Severe LSD (Sunita Pawar, Saoner outbreak)
    {
      animalTag: 'NG-COW-108',
      ownerId: farmers[2].id,
      disease: 'Lumpy Skin Disease (LSD)',
      risk: 'Critical',
      confidence: 96,
      symptoms: ['skin_nodules', 'high_fever', 'difficulty_breathing', 'eye_discharge'],
      temp: 40.8,
      duration: 60,
      explanation: 'Confluent necrotizing cutaneous nodules across neck, dewlap, and udder with severe pyrexia and respiratory distress. Critical acute LSD.',
      advisory: 'Immediate biosecurity containment. Administer anti-inflammatory and supportive fluid therapy under strict veterinary guidance. Disinfect shed.'
    }
  ];

  for (const scan of AI_SCANS) {
    const animal = animalMap.get(scan.animalTag);
    if (!animal) continue;

    // Scan image table
    await supabaseAdmin
      .from('scan_images')
      .upsert({
        animal_id: animal.id,
        owner_id: scan.ownerId,
        image_url: 'https://obgcmrgjulmgumdroixq.supabase.co/storage/v1/object/public/scans/demo/lesion_sample.jpg',
        disease: scan.disease,
        risk_level: scan.risk,
        confidence: scan.confidence,
        symptoms: scan.symptoms,
        temperature: scan.temp,
        duration: scan.duration,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    // Animal timeline entry
    await supabaseAdmin
      .from('animal_timeline')
      .insert({
        animal_id: animal.id,
        event_type: 'AI Health Screening',
        title: `AI Health Scan: ${scan.disease} (${scan.risk} Risk)`,
        date: new Date().toLocaleDateString('en-GB'),
        doctor: '',
        notes: `AI Confidence: ${scan.confidence}%. ${scan.explanation}`,
        status: scan.risk === 'Low' ? 'Healthy' : scan.risk === 'Critical' ? 'Critical' : 'Needs Attention',
        disease: scan.disease,
        confidence: scan.confidence,
        symptoms: scan.symptoms,
        advisory: scan.advisory,
        temperature: scan.temp,
        duration: scan.duration
      });
  }
  console.log('  ✓ AI screenings and medical timelines recorded.');

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 5: PROVISION 10 DISEASE CASES ACROSS 5 LIFECYCLE STAGES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 5] Provisioning 10 connected disease cases across Nagpur district...');

  const CASE_DEFINITIONS = [
    // Case 1: NEW (Cow LSD, Kamptee)
    {
      caseId: 'CASE-2026-NAG-1001',
      farmerIdx: 0,
      animalTag: 'NG-COW-101',
      disease: 'Lumpy Skin Disease',
      risk: 'High',
      confidence: 94,
      status: 'New',
      assignedVetIdx: null,
      loc: NAGPUR_LOCATIONS.KAMPTEE_RURAL,
      notes: 'Firm nodules observed on cow neck and back. Mild fever 40.2°C.',
      symptoms: ['skin_nodules', 'high_fever'],
      temp: 40.2,
      duration: 48
    },
    // Case 2: INVESTIGATING (Goat Mange, Kamptee - Claimed by Dr. Priya Joshi)
    {
      caseId: 'CASE-2026-NAG-1002',
      farmerIdx: 0,
      animalTag: 'NG-GOAT-201',
      disease: 'Mange (खरुज)',
      risk: 'High',
      confidence: 89,
      status: 'Investigating',
      assignedVetIdx: 1, // Dr. Priya Joshi
      acceptedHoursAgo: 4,
      loc: NAGPUR_LOCATIONS.KAMPTEE_RURAL,
      notes: 'Intense itching and crust formation around ears and muzzle.',
      investigationNotes: 'Physical examination completed by Dr. Priya Joshi. Deep skin scraping collected for microscopic confirmation.',
      symptoms: ['skin_pustules', 'lethargy'],
      temp: 39.4,
      duration: 72
    },
    // Case 3: CONFIRMED (Cow LSD, Saoner - Dr. Rahul Verma) -> CLUSTER MEMBER A
    {
      caseId: 'CASE-2026-NAG-1003',
      farmerIdx: 2, // Sunita Pawar
      animalTag: 'NG-COW-108',
      disease: 'Lumpy Skin Disease',
      risk: 'Critical',
      confidence: 96,
      status: 'Confirmed',
      assignedVetIdx: 4, // Dr. Rahul Verma
      acceptedHoursAgo: 24,
      confirmedHoursAgo: 18,
      loc: NAGPUR_LOCATIONS.SAONER_KELOD,
      notes: 'Multiple nodules discharging serous fluid. Milk dropped by 60%.',
      clinicalDiagnosis: 'Clinical examination and PCR swab confirmed acute Capripoxvirus (LSD). High fever 40.8°C.',
      investigationNotes: 'Herd examined. 2 neighboring cattle showing mild pyrexia. Biosecurity perimeter requested.',
      treatmentNotes: 'Antipyretic (Meloxicam 0.5mg/kg), antibiotic coverage (Oxytetracycline LA), supportive vitamins.',
      prescription: 'Inj. Melonex 15ml IM OD x 3 days, Inj. Steclin 20ml IM alternate day, Iocare spray topically.',
      symptoms: ['skin_nodules', 'high_fever', 'difficulty_breathing'],
      temp: 40.8,
      duration: 60
    },
    // Case 4: CONTAINMENT (Cow LSD, Saoner - Dr. Rahul Verma) -> CLUSTER MEMBER B
    {
      caseId: 'CASE-2026-NAG-1004',
      farmerIdx: 2, // Sunita Pawar
      animalTag: 'NG-COW-109',
      disease: 'Lumpy Skin Disease',
      risk: 'Critical',
      confidence: 93,
      status: 'Containment',
      assignedVetIdx: 4, // Dr. Rahul Verma
      acceptedHoursAgo: 36,
      confirmedHoursAgo: 28,
      containmentHoursAgo: 12,
      loc: { ...NAGPUR_LOCATIONS.SAONER_KELOD, lat: 21.3920, lng: 78.9280 }, // ~2.3 km from Case 3
      notes: 'Secondary case in same block showing generalized nodules and prescapular lymphadenopathy.',
      clinicalDiagnosis: 'Confirmed Lumpy Skin Disease cluster outbreak.',
      investigationNotes: 'Part of Saoner-Kelod transmission pocket. Movement control and quarantine enforced.',
      treatmentNotes: 'Daily wound dressing with povidone iodine, aerosol insecticide to prevent myiasis.',
      prescription: 'Inj. Enrofloxacin 10% 15ml IM, Vitamin H (Biotin) supplement, potassium permanganate footwash.',
      symptoms: ['skin_nodules', 'high_fever', 'eye_discharge'],
      temp: 40.4,
      duration: 48
    },
    // Case 5: RESOLVED (Sheep Orf, Hingna - Dr. Sandeep Bhende)
    {
      caseId: 'CASE-2026-NAG-1005',
      farmerIdx: 1, // Santosh Wankhede
      animalTag: 'NG-SHEEP-302',
      disease: 'Contagious Ecthyma / Orf (ऑर्फ़)',
      risk: 'Moderate',
      confidence: 91,
      status: 'Resolved',
      assignedVetIdx: 2, // Dr. Sandeep Bhende
      acceptedHoursAgo: 120,
      confirmedHoursAgo: 110,
      resolvedHoursAgo: 12,
      loc: NAGPUR_LOCATIONS.HINGNA_RURAL,
      notes: 'Crusts on lips, animal was unable to suckle or graze.',
      clinicalDiagnosis: 'Contagious Ecthyma (Orf). Lesions dried and healed after 7 days of treatment.',
      investigationNotes: 'Treated with antiseptic washes and soft mash feeding. Full recovery verified.',
      treatmentNotes: 'Course completed. Animal resumed normal grazing. No herd secondary cases.',
      prescription: 'Potassium permanganate 1:1000 wash BID, Glycerine-iodine application to lips.',
      symptoms: ['mouth_lesions'],
      temp: 39.0,
      duration: 24
    },
    // Case 6: INVESTIGATING (Goat CL, Kalmeshwar - Dr. Sunita Kulkarni)
    {
      caseId: 'CASE-2026-NAG-1006',
      farmerIdx: 3, // Mahesh Deshmukh
      animalTag: 'NG-GOAT-206',
      disease: 'Caseous Lymphadenitis (CL)',
      risk: 'Moderate',
      confidence: 84,
      status: 'Investigating',
      assignedVetIdx: 3, // Dr. Sunita Kulkarni
      acceptedHoursAgo: 8,
      loc: NAGPUR_LOCATIONS.KALMESHWAR_DHAPEWADA,
      notes: 'Swelling on neck below left ear. Non-painful firm mass.',
      investigationNotes: 'Needle aspirate taken. Sample sent to Regional Disease Diagnostic Lab (RDDL), Nagpur.',
      symptoms: ['joint_swelling'],
      temp: 39.1,
      duration: 96
    },
    // Case 7: CONFIRMED (Cow HS, Ramtek - Dr. Sneha Sharma)
    {
      caseId: 'CASE-2026-NAG-1007',
      farmerIdx: 4, // Ganesh Raut
      animalTag: 'NG-COW-113',
      disease: 'Haemorrhagic Septicaemia (HS)',
      risk: 'High',
      confidence: 91,
      status: 'Confirmed',
      assignedVetIdx: 5, // Dr. Sneha Sharma
      acceptedHoursAgo: 16,
      confirmedHoursAgo: 8,
      loc: NAGPUR_LOCATIONS.RAMTEK_MANSAR,
      notes: 'High fever, hot painful swelling under throat, rapid difficult breathing with snoring.',
      clinicalDiagnosis: 'Acute Haemorrhagic Septicaemia. Pasteurella multocida identified on peripheral blood smear.',
      investigationNotes: 'Prompt emergency antibiotic instituted. Immediate notification sent to district office.',
      treatmentNotes: 'Aggressive therapy with Sulfadimidine 33.3% IV and anti-inflammatory injection.',
      prescription: 'Inj. Sulfadimidine 100ml IV stat, Inj. Vetalgin 15ml IM, Ring vaccination alert issued.',
      symptoms: ['swelling_neck', 'high_fever', 'difficulty_breathing'],
      temp: 41.2,
      duration: 18
    },
    // Case 8: RESOLVED (Cow FMD, Umred - Dr. Manoj Tiwari)
    {
      caseId: 'CASE-2026-NAG-1008',
      farmerIdx: 5, // Anita Bhende
      animalTag: 'NG-COW-115',
      disease: 'Foot and Mouth Disease (FMD)',
      risk: 'Moderate',
      confidence: 88,
      status: 'Resolved',
      assignedVetIdx: 6, // Dr. Manoj Tiwari
      acceptedHoursAgo: 168,
      confirmedHoursAgo: 144,
      resolvedHoursAgo: 24,
      loc: NAGPUR_LOCATIONS.UMRED_SIRSI,
      notes: 'Profuse salivation and vesicles on tongue and interdigital cleft of feet.',
      clinicalDiagnosis: 'FMD recovered. Mouth ulcers healed; foot lesions resolved with copper sulphate wash.',
      investigationNotes: 'Ring vaccination completed for all 18 cattle in Sirsi village.',
      treatmentNotes: 'Supportive care: sodium carbonate mouth wash, antibiotic cover, antiseptic dressing.',
      prescription: 'Boric acid powder with glycerine paste for tongue, Himax ointment for hooves.',
      symptoms: ['drooling', 'mouth_lesions', 'foot_lesions'],
      temp: 39.2,
      duration: 72
    },
    // Case 9: NEW (Goat Lice Infestation, Katol)
    {
      caseId: 'CASE-2026-NAG-1009',
      farmerIdx: 6, // Pradeep Kale
      animalTag: 'NG-GOAT-209',
      disease: 'Lice Infestation & Dermatitis',
      risk: 'Moderate',
      confidence: 88,
      status: 'New',
      assignedVetIdx: null,
      loc: NAGPUR_LOCATIONS.KATOL_KONDHALI,
      notes: 'Severe scratching, loss of fleece on flanks, visible crawling ectoparasites on skin.',
      symptoms: ['tick_infestation', 'skin_pustules'],
      temp: 38.9,
      duration: 48
    },
    // Case 10: INVESTIGATING (Cow LSD, Parseoni - Dr. Sneha Sharma)
    {
      caseId: 'CASE-2026-NAG-1010',
      farmerIdx: 7, // Rekha Gawande
      animalTag: 'NG-COW-118',
      disease: 'Lumpy Skin Disease',
      risk: 'High',
      confidence: 90,
      status: 'Investigating',
      assignedVetIdx: 5, // Dr. Sneha Sharma
      acceptedHoursAgo: 6,
      loc: NAGPUR_LOCATIONS.PARSEONI,
      notes: 'Nodules spreading on neck and shoulder. Decreased feed intake.',
      investigationNotes: 'Dr. Sneha Sharma attending. Temperature recorded 40.1°C. Ring vaccination recommended.',
      symptoms: ['skin_nodules', 'high_fever'],
      temp: 40.1,
      duration: 36
    }
  ];

  const caseMap = new Map(); // caseId -> case row

  for (const c of CASE_DEFINITIONS) {
    const farmer = farmers[c.farmerIdx];
    const animal = animalMap.get(c.animalTag);
    const assignedVet = c.assignedVetIdx !== null ? veterinarians[c.assignedVetIdx] : null;

    const acceptedAt = c.acceptedHoursAgo ? new Date(Date.now() - c.acceptedHoursAgo * 3600000).toISOString() : null;
    const confirmedAt = c.confirmedHoursAgo ? new Date(Date.now() - c.confirmedHoursAgo * 3600000).toISOString() : null;
    const containmentAt = c.containmentHoursAgo ? new Date(Date.now() - c.containmentHoursAgo * 3600000).toISOString() : null;
    const resolvedAt = c.resolvedHoursAgo ? new Date(Date.now() - c.resolvedHoursAgo * 3600000).toISOString() : null;

    const casePayload = {
      case_id: c.caseId,
      farmer_id: farmer.id,
      animal_id: animal ? animal.id : null,
      animal_name: animal ? animal.name : 'Livestock',
      species: animal ? animal.species : 'Cattle',
      disease: c.disease,
      confidence: c.confidence,
      risk: c.risk,
      district_id: 'Nagpur',
      state: 'Maharashtra',
      latitude: c.loc.lat,
      longitude: c.loc.lng,
      farmer_location: {
        village: c.loc.village,
        block: c.loc.block,
        district: 'Nagpur',
        state: 'Maharashtra'
      },
      farmer_contact: {
        name: farmer.name,
        phone: farmer.phone
      },
      symptoms: c.symptoms,
      temperature: c.temp,
      duration: c.duration,
      affected_count: 1,
      notes: c.notes,
      clinical_diagnosis: c.clinicalDiagnosis || '',
      investigation_notes: c.investigationNotes || '',
      status: c.status,
      assigned_vet_id: assignedVet ? assignedVet.id : null,
      accepted_at: acceptedAt,
      confirmed_at: confirmedAt,
      containment_started_at: containmentAt,
      resolved_at: resolvedAt,
      treatment_notes: c.treatmentNotes || '',
      prescription: c.prescription || '',
      updated_at: new Date().toISOString()
    };

    const { data: upsertedCase, error: caseErr } = await supabaseAdmin
      .from('disease_cases')
      .upsert(casePayload, { onConflict: 'case_id' })
      .select('*')
      .single();

    if (caseErr) {
      console.warn(`  Case upsert notice for ${c.caseId}:`, caseErr.message);
    } else if (upsertedCase) {
      caseMap.set(c.caseId, upsertedCase);

      // Add timeline audit entries
      await supabaseAdmin
        .from('case_timeline')
        .insert({
          case_id: upsertedCase.id,
          status: 'New',
          notes: 'Referral case initiated following AI screening detection.',
          updater_name: farmer.name
        });

      if (assignedVet) {
        await supabaseAdmin
          .from('case_timeline')
          .insert({
            case_id: upsertedCase.id,
            status: 'Investigating',
            updated_by: assignedVet.id,
            updater_name: assignedVet.name,
            notes: `Case assigned to ${assignedVet.name}. Physical clinical investigation underway.`
          });
      }

      if (c.status === 'Confirmed' || c.status === 'Containment' || c.status === 'Resolved') {
        await supabaseAdmin
          .from('case_timeline')
          .insert({
            case_id: upsertedCase.id,
            status: 'Confirmed',
            updated_by: assignedVet ? assignedVet.id : null,
            updater_name: assignedVet ? assignedVet.name : 'Veterinary Officer',
            notes: c.clinicalDiagnosis || 'Clinical confirmation verified by attending veterinarian.'
          });
      }

      if (c.status === 'Containment') {
        await supabaseAdmin
          .from('case_timeline')
          .insert({
            case_id: upsertedCase.id,
            status: 'Containment',
            updated_by: assignedVet ? assignedVet.id : null,
            updater_name: assignedVet ? assignedVet.name : 'Veterinary Officer',
            notes: 'Biosecurity perimeter and movement restriction enforced around outbreak premises.'
          });
      }

      if (c.status === 'Resolved') {
        await supabaseAdmin
          .from('case_timeline')
          .insert({
            case_id: upsertedCase.id,
            status: 'Resolved',
            updated_by: assignedVet ? assignedVet.id : null,
            updater_name: assignedVet ? assignedVet.name : 'Attending Veterinarian',
            notes: c.treatmentNotes || 'Treatment protocol completed with full clinical recovery.'
          });
      }

      // Add notified vets audit
      const nearbyVets = [veterinarians[0], veterinarians[1], veterinarians[4]];
      for (const nv of nearbyVets) {
        await supabaseAdmin
          .from('case_notified_vets')
          .insert({
            case_id: upsertedCase.id,
            vet_id: nv.id,
            name: nv.name,
            phone: nv.phone,
            delivery_status: 'SENT',
            channel: 'SSE'
          });
      }
    }
  }
  console.log(`  ✓ Seeded ${caseMap.size} disease referral cases with full audit timelines.`);

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 6: OUTBREAK CLUSTERS & CONTAINMENT ZONES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 6] Provisioning active containment zone (Saoner-Kelod cluster)...');

  const saonerCase = caseMap.get('CASE-2026-NAG-1004');

  const containmentPayload = {
    zone_id: 'ZONE-2026-NAG-4101',
    case_id: saonerCase ? saonerCase.id : null,
    disease: 'Lumpy Skin Disease',
    district: 'Nagpur',
    block: 'Saoner',
    village: 'Kelod',
    center_lat: 21.3880,
    center_lng: 78.9220,
    radius_km: 5.0,
    status: 'ACTIVE',
    enforced_rules: [
      'Strict quarantine of affected cattle within 5 km perimeter',
      'Prohibition of livestock movement, cattle transportation, and village markets',
      'Daily disinfection spraying of barns, sheds, and watering troughs',
      'Emergency ring vaccination covering all susceptible bovines in buffer zone'
    ],
    created_by_vet_id: veterinarians[4].id, // Dr. Rahul Verma (Saoner)
    creator_name: veterinarians[4].name,
    notes: 'Spatial cluster: 2 active LSD cases identified within 2.3 km in Saoner block. Containment protocol active.',
    contained_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: upsertedZone, error: zoneErr } = await supabaseAdmin
    .from('containment_zones')
    .upsert(containmentPayload, { onConflict: 'zone_id' })
    .select('*')
    .single();

  if (zoneErr) {
    console.warn('  Containment zone upsert notice:', zoneErr.message);
  } else if (upsertedZone && saonerCase) {
    // Link case to containment zone
    await supabaseAdmin
      .from('disease_cases')
      .update({ containment_zone_id: upsertedZone.id })
      .eq('id', saonerCase.id);
    console.log('  ✓ Active containment zone ZONE-2026-NAG-4101 established in Saoner, Nagpur.');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 7: VACCINATION CAMPS & REGISTRATIONS (6 DRIVES)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 7] Provisioning 6 vaccination drives across Nagpur district...');

  const VACCINATION_DRIVES = [
    {
      campId: 'CAMP-2026-NAG-01',
      venue: 'Kamptee Taluka Mobile Ring Vaccination Post',
      village: 'Kamptee',
      block: 'Kamptee',
      lat: NAGPUR_LOCATIONS.KAMPTEE_TOWN.lat,
      lng: NAGPUR_LOCATIONS.KAMPTEE_TOWN.lng,
      vaccine: 'Lumpy Skin Disease (Neethling strain)',
      vaccineFullName: 'Lumpy Skin Disease Live Attenuated Vaccine',
      targetSpecies: 'Cattle & Buffalo',
      campDate: new Date().toISOString(), // Today
      cost: 'Free (Govt Drive)',
      isFree: true,
      organizingHospital: 'Kamptee Government Veterinary Dispensary',
      assignedOfficer: 'Dr. Suresh Kulkarni',
      assignedOfficerId: officers[0].id,
      capacity: 300,
      bookedSlots: 45,
      remainingSlots: 255,
      targetCount: 300,
      coveredCount: 35,
      status: 'Ongoing'
    },
    {
      campId: 'CAMP-2026-NAG-02',
      venue: 'Saoner Biosecurity Buffer Ring Vaccination Post',
      village: 'Kelod',
      block: 'Saoner',
      lat: NAGPUR_LOCATIONS.SAONER_KELOD.lat,
      lng: NAGPUR_LOCATIONS.SAONER_KELOD.lng,
      vaccine: 'Lumpy Skin Disease (Neethling strain)',
      vaccineFullName: 'Lumpy Skin Disease Emergency Ring Vaccine',
      targetSpecies: 'Cattle & Buffalo',
      campDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      cost: 'Free (Govt Emergency Drive)',
      isFree: true,
      organizingHospital: 'Saoner Veterinary Hospital',
      assignedOfficer: 'Dr. Meena Gaikwad',
      assignedOfficerId: officers[3].id,
      capacity: 500,
      bookedSlots: 120,
      remainingSlots: 380,
      targetCount: 500,
      coveredCount: 0,
      status: 'Upcoming'
    },
    {
      campId: 'CAMP-2026-NAG-03',
      venue: 'Hingna Central Cattle & Small Ruminant Immunization Camp',
      village: 'Hingna',
      block: 'Hingna',
      lat: NAGPUR_LOCATIONS.HINGNA_TOWN.lat,
      lng: NAGPUR_LOCATIONS.HINGNA_TOWN.lng,
      vaccine: 'FMD Trivalent Vaccine',
      vaccineFullName: 'Foot & Mouth Disease Inactivated Adjuvanted Vaccine',
      targetSpecies: 'Cattle, Buffalo, Goat, Sheep',
      campDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      cost: 'Free (Govt Drive)',
      isFree: true,
      organizingHospital: 'Hingna Taluka Veterinary Polyclinic',
      assignedOfficer: 'Dr. Suresh Kulkarni',
      assignedOfficerId: officers[0].id,
      capacity: 400,
      bookedSlots: 85,
      remainingSlots: 315,
      targetCount: 400,
      coveredCount: 0,
      status: 'Upcoming'
    },
    {
      campId: 'CAMP-2026-NAG-04',
      venue: 'Kalmeshwar Comprehensive Livestock Health Camp',
      village: 'Kalmeshwar',
      block: 'Kalmeshwar',
      lat: NAGPUR_LOCATIONS.KALMESHWAR_TOWN.lat,
      lng: NAGPUR_LOCATIONS.KALMESHWAR_TOWN.lng,
      vaccine: 'HS + BQ Combined Vaccine',
      vaccineFullName: 'Haemorrhagic Septicaemia & Blackquarter Combined Vaccine',
      targetSpecies: 'Cattle & Buffalo',
      campDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      cost: 'Free (Govt Drive)',
      isFree: true,
      organizingHospital: 'Kalmeshwar Veterinary Dispensary',
      assignedOfficer: 'Dr. Priya Deshpande',
      assignedOfficerId: officers[1].id,
      capacity: 350,
      bookedSlots: 60,
      remainingSlots: 290,
      targetCount: 350,
      coveredCount: 0,
      status: 'Upcoming'
    },
    {
      campId: 'CAMP-2026-NAG-05',
      venue: 'Ramtek Small Ruminant PPR Immunization Post',
      village: 'Ramtek',
      block: 'Ramtek',
      lat: NAGPUR_LOCATIONS.RAMTEK_TOWN.lat,
      lng: NAGPUR_LOCATIONS.RAMTEK_TOWN.lng,
      vaccine: 'PPR Vaccine (Goat Plague)',
      vaccineFullName: 'Peste des Petits Ruminants Live Vaccine',
      targetSpecies: 'Goat & Sheep',
      campDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      cost: 'Free (National Control Programme)',
      isFree: true,
      organizingHospital: 'Ramtek Veterinary Hospital',
      assignedOfficer: 'Dr. Meena Gaikwad',
      assignedOfficerId: officers[3].id,
      capacity: 250,
      bookedSlots: 40,
      remainingSlots: 210,
      targetCount: 250,
      coveredCount: 0,
      status: 'Upcoming'
    },
    {
      campId: 'CAMP-2026-NAG-06',
      venue: 'Nagpur Central Dairy Cattle Vaccination Camp',
      village: 'Civil Lines',
      block: 'Nagpur Urban',
      lat: NAGPUR_LOCATIONS.NAGPUR_CITY.lat,
      lng: NAGPUR_LOCATIONS.NAGPUR_CITY.lng,
      vaccine: 'FMD Trivalent Vaccine',
      vaccineFullName: 'Foot & Mouth Disease Oil Adjuvanted Vaccine',
      targetSpecies: 'Cattle & Buffalo',
      campDate: new Date(Date.now() - 7 * 86400000).toISOString(), // Completed
      cost: 'Free (Govt Drive)',
      isFree: true,
      organizingHospital: 'Nagpur District Veterinary Hospital',
      assignedOfficer: 'Dr. Suresh Kulkarni',
      assignedOfficerId: officers[0].id,
      capacity: 500,
      bookedSlots: 480,
      remainingSlots: 20,
      targetCount: 500,
      coveredCount: 465,
      status: 'Completed'
    }
  ];

  const driveMap = new Map();

  for (const vd of VACCINATION_DRIVES) {
    const drivePayload = {
      camp_id: vd.campId,
      state: 'Maharashtra',
      district: 'Nagpur',
      block: vd.block,
      village: vd.village,
      venue: vd.venue,
      latitude: vd.lat,
      longitude: vd.lng,
      vaccine: vd.vaccine,
      vaccine_full_name: vd.vaccineFullName,
      target_species: vd.targetSpecies,
      camp_date: vd.campDate,
      start_time: '09:30 AM',
      end_time: '04:30 PM',
      cost: vd.cost,
      is_free: vd.isFree,
      organizing_hospital: vd.organizingHospital,
      assigned_officer: vd.assignedOfficer,
      assigned_officer_id: vd.assignedOfficerId,
      contact_number: '1962',
      capacity: vd.capacity,
      booked_slots: vd.bookedSlots,
      remaining_slots: vd.remainingSlots,
      target_count: vd.targetCount,
      covered_count: vd.coveredCount,
      status: vd.status,
      updated_at: new Date().toISOString()
    };

    const { data: upsertedDrive, error: dErr } = await supabaseAdmin
      .from('vaccination_drives')
      .upsert(drivePayload, { onConflict: 'camp_id' })
      .select('*')
      .single();

    if (dErr) {
      console.warn(`  Drive upsert notice for ${vd.campId}:`, dErr.message);
    } else if (upsertedDrive) {
      driveMap.set(vd.campId, upsertedDrive);
    }
  }

  // Farmer Registrations
  const drive1 = driveMap.get('CAMP-2026-NAG-01');
  const drive2 = driveMap.get('CAMP-2026-NAG-02');
  const drive3 = driveMap.get('CAMP-2026-NAG-03');
  const drive4 = driveMap.get('CAMP-2026-NAG-04');
  const drive5 = driveMap.get('CAMP-2026-NAG-05');
  const drive6 = driveMap.get('CAMP-2026-NAG-06');

  const REGISTRATIONS = [
    { drive: drive1, farmer: farmers[0], animals: ['NG-COW-102', 'NG-COW-103'], count: 2, token: 'TOKEN-NAG-101' },
    { drive: drive2, farmer: farmers[2], animals: ['NG-GOAT-201', 'NG-GOAT-202'], count: 2, token: 'TOKEN-NAG-102' },
    { drive: drive3, farmer: farmers[1], animals: ['NG-COW-104', 'NG-COW-105', 'NG-GOAT-203'], count: 3, token: 'TOKEN-NAG-103' },
    { drive: drive4, farmer: farmers[3], animals: ['NG-COW-110'], count: 1, token: 'TOKEN-NAG-104' },
    { drive: drive5, farmer: farmers[4], animals: ['NG-COW-113', 'NG-COW-114'], count: 2, token: 'TOKEN-NAG-105' },
    { drive: drive6, farmer: farmers[5], animals: ['NG-COW-118'], count: 1, token: 'TOKEN-NAG-106' },
  ];

  for (const reg of REGISTRATIONS) {
    if (!reg.drive) continue;
    const regPayload = {
      drive_id: reg.drive.id,
      farmer_id: reg.farmer.id,
      farmer_name: reg.farmer.name,
      farmer_phone: reg.farmer.phone,
      animal_ids: reg.animals,
      animal_count: reg.count,
      token: reg.token,
      registered_at: new Date(Date.now() - 2 * 86400000).toISOString()
    };

    const { data: existingReg } = await supabaseAdmin
      .from('vaccination_camp_registrations')
      .select('id')
      .eq('token', reg.token)
      .maybeSingle();

    if (existingReg) {
      await supabaseAdmin
        .from('vaccination_camp_registrations')
        .update(regPayload)
        .eq('id', existingReg.id);
    } else {
      await supabaseAdmin
        .from('vaccination_camp_registrations')
        .insert(regPayload);
    }
  }

  console.log(`  ✓ Seeded ${driveMap.size} vaccination camps with farmer registrations.`);

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 8: SURVEILLANCE REPORTS, SPECIES-SPECIFIC AI TRIAGE & LAB REFERRALS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 8] Provisioning Reports, Species-Specific AI Triage & Lab Referrals (RDDL Nagpur)...');

  const reportPayloads = [
    {
      case_id: 'CASE-2026-NAG-1003',
      reporter_id: farmers[2].id,
      species: 'Cattle',
      symptoms: ['skin_nodules', 'high_fever', 'milk_drop'],
      latitude: NAGPUR_LOCATIONS.SAONER_KELOD.lat,
      longitude: NAGPUR_LOCATIONS.SAONER_KELOD.lng,
      village: 'Kelod',
      block: 'Saoner',
      district: 'Nagpur',
      status: 'Escalated',
      triage: {
        risk_level: 'High',
        outbreak_flag: true,
        cluster_details: { matchedCasesCount: 2, block: 'Saoner', radiusKm: 2.3 },
        visual_score: 0.92,
        model_version: 'cow_lsd_model.keras (EfficientNetB0)',
        suspected_diseases: [
          { name: 'Lumpy Skin Disease (लम्पी त्वचा रोग)', confidenceScore: 0.92, rationale: 'Cow LSD model detected nodular skin lesions with 92% confidence fused with 40.2C pyrexia' },
          { name: 'Pseudo-Cowpox', confidenceScore: 0.08, rationale: 'Excluded due to generalized distribution' }
        ],
        recommended_action: 'Strict isolation of affected cow in fly-proof shed. Initiate supportive antipyretic & antibiotic therapy.',
        immediate_first_aid: [
          'Strictly isolate infected cattle in fly-proof shed',
          'Apply neem oil / fly-repellent spray twice daily',
          'Clean ruptured skin nodules with potassium permanganate 1:1000'
        ],
        explanation: 'Cow LSD species-specific model detected severe nodular dermopathy. Part of active Saoner containment cluster.'
      }
    },
    {
      case_id: 'CASE-2026-NAG-1006',
      reporter_id: farmers[3].id,
      species: 'Goat',
      symptoms: ['lymph_node_enlargement', 'weight_loss'],
      latitude: NAGPUR_LOCATIONS.KALMESHWAR_DHAPEWADA.lat,
      longitude: NAGPUR_LOCATIONS.KALMESHWAR_DHAPEWADA.lng,
      village: 'Dhapewada',
      block: 'Kalmeshwar',
      district: 'Nagpur',
      status: 'Field Verified',
      triage: {
        risk_level: 'High',
        outbreak_flag: false,
        cluster_details: {},
        visual_score: 0.91,
        model_version: 'goat_cl_classifier_v1',
        suspected_diseases: [
          { name: 'Caseous Lymphadenitis / CL (गाठ रोग)', confidenceScore: 0.91, rationale: 'Goat CL Model identified characteristic encapsulated abscess at parotid lymph node' }
        ],
        recommended_action: 'Isolate affected goat. Surgical lancet drainage with antiseptic packing by veterinarian.',
        immediate_first_aid: [
          'Do not burst or puncture the abscess yourself',
          'Separate goat from healthy herd',
          'Disinfect feeding trough with 2% chlorhexidine'
        ],
        explanation: 'Goat CL species-specific classifier detected superficial abscess indicative of Corynebacterium pseudotuberculosis.'
      }
    },
    {
      case_id: 'CASE-2026-NAG-1007',
      reporter_id: farmers[4].id,
      species: 'Cattle',
      symptoms: ['swelling_neck', 'high_fever', 'salivation'],
      latitude: NAGPUR_LOCATIONS.RAMTEK_MANSAR.lat,
      longitude: NAGPUR_LOCATIONS.RAMTEK_MANSAR.lng,
      village: 'Mansar',
      block: 'Ramtek',
      district: 'Nagpur',
      status: 'Field Verified',
      triage: {
        risk_level: 'Critical',
        outbreak_flag: false,
        cluster_details: {},
        visual_score: 0.94,
        model_version: 'cattle_clinical_triage_v2',
        suspected_diseases: [
          { name: 'Haemorrhagic Septicaemia (HS / घटसर्प)', confidenceScore: 0.94, rationale: 'Submandibular oedema, stertorous breathing, and 41.0C hyperthermia' }
        ],
        recommended_action: 'Emergency veterinarian administration of IV sulfadimidine / oxytetracycline immediately.',
        immediate_first_aid: [
          'Keep animal in cool ventilated shelter',
          'Offer cold water in small frequent quantities',
          'Veterinary emergency intervention urgently required'
        ],
        explanation: 'Clinical AI rule fusion identified peracute Haemorrhagic Septicaemia requiring immediate antimicrobial therapy.'
      }
    },
    {
      case_id: 'CASE-2026-NAG-1002',
      reporter_id: farmers[1].id,
      species: 'Goat',
      symptoms: ['skin_crusting', 'severe_itching', 'hair_loss'],
      latitude: NAGPUR_LOCATIONS.KATOL_TOWN.lat,
      longitude: NAGPUR_LOCATIONS.KATOL_TOWN.lng,
      village: 'Katol Rural',
      block: 'Katol',
      district: 'Nagpur',
      status: 'Field Verified',
      triage: {
        risk_level: 'Moderate',
        outbreak_flag: false,
        cluster_details: {},
        visual_score: 0.88,
        model_version: 'goat_mange_classifier_v1',
        suspected_diseases: [
          { name: 'Sarcoptic Mange (खरुज)', confidenceScore: 0.88, rationale: 'Goat Mange Classifier identified crusted alopecia and intense pruritus lesions' }
        ],
        recommended_action: 'Subcutaneous ivermectin injection and topical sulfur wash.',
        immediate_first_aid: [
          'Isolate goat from herd',
          'Apply sulfur ointment to lesions',
          'Disinfect housing with deltamethrin spray'
        ],
        explanation: 'Goat Mange classifier identified severe mite dermatosis.'
      }
    },
    {
      case_id: 'CASE-2026-NAG-1004',
      reporter_id: farmers[5].id,
      species: 'Goat',
      symptoms: ['scabby_mouth_lesions', 'reluctance_to_eat'],
      latitude: NAGPUR_LOCATIONS.HINGNA_TOWN.lat,
      longitude: NAGPUR_LOCATIONS.HINGNA_TOWN.lng,
      village: 'Hingna Central',
      block: 'Hingna',
      district: 'Nagpur',
      status: 'Reported',
      triage: {
        risk_level: 'Moderate',
        outbreak_flag: false,
        cluster_details: {},
        visual_score: 0.89,
        model_version: 'goat_orf_classifier_v1',
        suspected_diseases: [
          { name: 'Contagious Ecthyma / Orf (बोकड खरुज)', confidenceScore: 0.89, rationale: 'Goat Orf Classifier identified characteristic papular/scab lesions at oral commissures' }
        ],
        recommended_action: 'Topical antiseptic paint, soft nutritious diet, gloves for handler.',
        immediate_first_aid: [
          'Wear protective gloves when handling animal (zoonotic)',
          'Apply glycerin & iodine paint on lip crusts',
          'Provide tender green grass / gruel'
        ],
        explanation: 'Goat Orf classifier recognized parapoxvirus dermal lesions.'
      }
    },
    {
      case_id: 'CASE-2026-NAG-1001',
      reporter_id: farmers[4].id,
      species: 'Sheep',
      symptoms: ['lip_crusts', 'mucosal_lesions'],
      latitude: NAGPUR_LOCATIONS.RAMTEK_MANSAR.lat,
      longitude: NAGPUR_LOCATIONS.RAMTEK_MANSAR.lng,
      village: 'Mansar',
      block: 'Ramtek',
      district: 'Nagpur',
      status: 'Field Verified',
      triage: {
        risk_level: 'Moderate',
        outbreak_flag: false,
        cluster_details: {},
        visual_score: 0.86,
        model_version: 'sheep_orf_classifier_v1',
        suspected_diseases: [
          { name: 'Contagious Ecthyma / Orf (मेंढी खरुज)', confidenceScore: 0.86, rationale: 'Sheep Orf Classifier detected lip nodules and crusted scabs' }
        ],
        recommended_action: 'Isolation and topical antibiotic/antiseptic spray.',
        immediate_first_aid: [
          'Separate from flock to prevent vector spread',
          'Apply potassium permanganate wash'
        ],
        explanation: 'Sheep Orf model confirmed parapox crust formation.'
      }
    },
    {
      case_id: 'CASE-2026-NAG-7019',
      reporter_id: farmers[0].id,
      species: 'Cattle',
      symptoms: ['normal_appetite', 'normal_vital_signs'],
      latitude: NAGPUR_LOCATIONS.NAGPUR_RURAL_WADI.lat,
      longitude: NAGPUR_LOCATIONS.NAGPUR_RURAL_WADI.lng,
      village: 'Wadi',
      block: 'Nagpur Rural',
      district: 'Nagpur',
      status: 'Closed',
      triage: {
        risk_level: 'Low',
        outbreak_flag: false,
        cluster_details: {},
        visual_score: 0.96,
        model_version: 'cow_health_classifier_v2',
        suspected_diseases: [
          { name: 'Normal / Healthy (निरोगी)', confidenceScore: 0.96, rationale: 'Clear mucous membranes, normal skin turgor, no dermal lesions' }
        ],
        recommended_action: 'Continue routine balanced diet, clean water, and regular deworming.',
        immediate_first_aid: [
          'Maintain regular feeding and clean water intake'
        ],
        explanation: 'Cow Health Classifier detected normal physiological status.'
      }
    }
  ];

  for (const rp of reportPayloads) {
    const { triage, ...reportData } = rp;
    const { data: rep, error: rErr } = await supabaseAdmin
      .from('reports')
      .upsert(reportData, { onConflict: 'case_id' })
      .select('*')
      .single();

    if (rep && triage) {
      const triagePayload = {
        report_id: rep.id,
        risk_level: triage.risk_level,
        suspected_diseases: triage.suspected_diseases,
        recommended_action: triage.recommended_action,
        immediate_first_aid: triage.immediate_first_aid,
        outbreak_flag: triage.outbreak_flag,
        cluster_details: triage.cluster_details,
        explanation: triage.explanation,
        visual_score: triage.visual_score,
        model_version: triage.model_version,
        updated_at: new Date().toISOString()
      };

      const { error: trErr } = await supabaseAdmin
        .from('triage_results')
        .upsert(triagePayload, { onConflict: 'report_id' });

      if (trErr) {
        console.warn(`  Triage upsert notice for ${rp.case_id}:`, trErr.message);
      }
    }

    if (rep && (rp.case_id === 'CASE-2026-NAG-1003' || rp.case_id === 'CASE-2026-NAG-1006' || rp.case_id === 'CASE-2026-NAG-1007')) {
      const sampleType = rp.species === 'Goat' ? 'Lymph Node Aspirate / Pus Swab' : 'Skin Scab & Biopsy (Capripox)';
      
      const { data: existingRef } = await supabaseAdmin
        .from('lab_referrals')
        .select('id')
        .eq('report_id', rep.id)
        .maybeSingle();

      const referralPayload = {
        report_id: rep.id,
        sample_type: sampleType,
        collection_date: new Date().toISOString(),
        referred_lab: 'Regional Disease Diagnostic Laboratory (RDDL), Nagpur',
        status: rp.case_id === 'CASE-2026-NAG-1003' ? 'In Analysis' : rp.case_id === 'CASE-2026-NAG-1007' ? 'Confirmed' : 'Collected',
        collected_by: veterinarians[4].id,
        result_summary: {
          labName: 'RDDL Nagpur',
          method: 'Real-Time PCR / Culture',
          finding: rp.case_id === 'CASE-2026-NAG-1003' ? 'Capripoxvirus DNA detected' : 'Under testing'
        }
      };

      if (existingRef) {
        await supabaseAdmin.from('lab_referrals').update(referralPayload).eq('id', existingRef.id);
      } else {
        await supabaseAdmin.from('lab_referrals').insert(referralPayload);
      }
    }
  }
  console.log('  ✓ Seeded reports, species-specific AI triage & lab referrals (RDDL Nagpur).');

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 9: BILINGUAL PREVENTIVE ADVISORIES (5 BULLETINS)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 9] Provisioning 5 bilingual veterinary advisories for Nagpur...');

  const ADVISORIES = [
    {
      title_en: 'Emergency Biosecurity Notice: Saoner-Kelod LSD Containment Buffer',
      title_hi: 'आपातकालीन जैव-सुरक्षा सूचना: सावनेर-केलोड लंपी त्वचा रोग नियंत्रण क्षेत्र',
      message_en: 'Active containment zone enforced within 5km of Kelod. Strictly prohibit bovine cattle transport and village weekly bazaars. Mandatory daily shed disinfection.',
      message_hi: 'केलोड के 5 किमी दायरे में नियंत्रण क्षेत्र लागू किया गया है। पशु परिवहन एवं साप्ताहिक हाट-बाजारों पर पूर्ण प्रतिबंध। गौशालाओं में कीटाणुनाशक छिड़काव अनिवार्य।',
      severity: 'Critical',
      disease: 'Lumpy Skin Disease',
      target_block: 'Saoner',
      target_village: 'Kelod'
    },
    {
      title_en: 'Monsoon Haemorrhagic Septicaemia (गलघोंटू) Pre-Monsoon Ring Vaccination',
      title_hi: 'मानसून पूर्व गलघोंटू (HS) टीकाकरण चेतावनी - नागपुर जिला',
      message_en: 'Farmers in low-lying river basins of Kamptee, Parseoni, and Ramtek must ensure timely vaccination against Pasteurella multocida before rains start.',
      message_hi: 'कामठी, पारशिवनी और रामटेक के नदी तटवर्ती क्षेत्रों के किसान वर्षा पूर्व अपने गोवंश को गलघोंटू (HS) का टीका अवश्य लगवाएं।',
      severity: 'High',
      disease: 'Haemorrhagic Septicaemia',
      target_block: 'All',
      target_village: 'All'
    },
    {
      title_en: 'Vidarbha Caprine Ectoparasite (Mange & Lice) Management Advisory',
      title_hi: 'विदर्भ बकरी पालन: खरुज (Mange) व गोचीड/ऊ नियंत्रण सलाह',
      message_en: 'Recent seasonal humidity has increased Sarcoptic mange incidents in goat herds. Isolate itching goats, apply neem-based wash, and consult local dispensary.',
      message_hi: 'बकरियों में खुजली और बाल झड़ने की समस्या होने पर तुरंत अलग करें। नीम का काढ़ा लगाएं एवं पशु चिकित्सालय से संपर्क करें।',
      severity: 'Moderate',
      disease: 'Mange & Lice',
      target_block: 'All',
      target_village: 'All'
    },
    {
      title_en: 'FMD Ring Vaccination Schedule Announced for Kamptee & Hingna Blocks',
      title_hi: 'कामठी एवं हिंगणा ब्लॉक में खुरपका-मुंहपका (FMD) टीकाकरण अभियान',
      message_en: 'Mobile vaccination vans will operate across 24 villages. Cattle, buffaloes, sheep, and goats above 4 months are eligible for free immunization.',
      message_hi: '24 गांवों में मोबाइल टीकाकरण दल दौरा करेगा। 4 माह से अधिक आयु के सभी गाय, भैंस, भेड़ एवं बकरियों का निःशुल्क टीकाकरण कराएं।',
      severity: 'Moderate',
      disease: 'Foot and Mouth Disease',
      target_block: 'Kamptee',
      target_village: 'All'
    },
    {
      title_en: 'Clean Drinking Water & Heat Stress Mitigation for Dairy Bovines',
      title_hi: 'दुधारू पशुओं में स्वच्छ पेयजल एवं ग्रीष्मकालीन तनाव प्रबंधन',
      message_en: 'Ensure continuous availability of cool, potable water and electrolyte mineral supplementation to maintain daily milk yield during high THI index.',
      message_hi: 'दुग्ध उत्पादन सामान्य बनाए रखने हेतु पशुओं को दिन में 3-4 बार स्वच्छ शीतल जल एवं मिनरल मिक्सचर अवश्य दें।',
      severity: 'Low',
      disease: 'General Health',
      target_block: 'All',
      target_village: 'All'
    }
  ];

  for (const adv of ADVISORIES) {
    await supabaseAdmin
      .from('advisories')
      .insert({
        ...adv,
        target_district: 'Nagpur',
        issued_by: 'Office of the District Animal Husbandry Officer, Nagpur',
        updated_at: new Date().toISOString()
      });
  }
  console.log('  ✓ Seeded 5 bilingual veterinary advisories.');

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 10: CONNECTED NOTIFICATIONS ACROSS FARMER, VET, AND OFFICER
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 10] Provisioning notifications for Farmers, Vets, and Officers...');

  const NOTIFICATIONS = [
    // Farmer Notifications
    {
      recipient_id: farmers[0].id, // Ramesh Patil
      case_id: caseMap.get('CASE-2026-NAG-1002')?.id,
      case_number: 'CASE-2026-NAG-1002',
      type: 'CASE_ASSIGNED',
      title: 'Veterinarian Assigned to Your Case',
      message: 'Dr. Priya Joshi has claimed your referral case for Sundari (Goat) and initiated investigation.',
      district: 'Nagpur',
      status: 'DELIVERED'
    },
    {
      recipient_id: farmers[0].id,
      case_id: caseMap.get('CASE-2026-NAG-1001')?.id,
      case_number: 'CAMP-2026-NAG-01',
      type: 'VACCINATION_ALERT',
      title: 'Vaccination Camp in Your Village Today',
      message: 'Kamptee Taluka Mobile Ring Vaccination Post is active today at Kamptee Dispensary. Token: TOKEN-NAG-101.',
      district: 'Nagpur',
      status: 'DELIVERED'
    },
    {
      recipient_id: farmers[2].id, // Sunita Pawar
      case_id: caseMap.get('CASE-2026-NAG-1004')?.id,
      case_number: 'ZONE-2026-NAG-4101',
      type: 'CONTAINMENT_ALERT',
      title: 'Biosecurity Containment Perimeter Enforced',
      message: 'Your premises are within the Saoner-Kelod 5km containment zone. Please follow quarantine protocols.',
      district: 'Nagpur',
      status: 'DELIVERED'
    },

    // Veterinarian Notifications
    {
      recipient_id: veterinarians[1].id, // Dr. Priya Joshi
      case_id: caseMap.get('CASE-2026-NAG-1001')?.id,
      case_number: 'CASE-2026-NAG-1001',
      type: 'NEW_REFERRAL_ALERT',
      title: 'New Urgent Referral: Cow LSD in Kamptee',
      message: 'Ramesh Patil reported suspected Lumpy Skin Disease (94% AI confidence) in Yerkheda, Kamptee.',
      district: 'Nagpur',
      status: 'DELIVERED'
    },
    {
      recipient_id: veterinarians[4].id, // Dr. Rahul Verma
      case_id: caseMap.get('CASE-2026-NAG-1003')?.id,
      case_number: 'CASE-2026-NAG-1003',
      type: 'LAB_SAMPLE_DISPATCHED',
      title: 'Lab Sample Dispatched to RDDL Nagpur',
      message: 'PCR swab for Case CASE-2026-NAG-1003 is registered at Regional Disease Diagnostic Lab, Nagpur.',
      district: 'Nagpur',
      status: 'DELIVERED'
    },

    // Officer Notifications
    {
      recipient_id: officers[0].id, // Dr. Suresh Kulkarni (DAHO Nagpur)
      case_id: caseMap.get('CASE-2026-NAG-1004')?.id,
      case_number: 'ZONE-2026-NAG-4101',
      type: 'EPIDEMIC_SURVEILLANCE_CLUSTER',
      title: 'EPIDEMIC ALERT: Saoner LSD Cluster Active',
      message: '2 confirmed cases in Saoner block within 2.3km. 5.0km containment zone activated. Ring vaccination scheduled.',
      district: 'Nagpur',
      status: 'DELIVERED'
    },
    {
      recipient_id: officers[1].id, // Dr. Priya Deshpande (Surveillance Officer)
      case_id: caseMap.get('CASE-2026-NAG-1007')?.id,
      case_number: 'CASE-2026-NAG-1007',
      type: 'DISEASE_NOTIFICATION_HS',
      title: 'Acute HS Notification from Ramtek Block',
      message: 'Dr. Sneha Sharma verified Haemorrhagic Septicaemia in Mansar village. Ring vaccination alert triggered.',
      district: 'Nagpur',
      status: 'DELIVERED'
    }
  ];

  for (const n of NOTIFICATIONS) {
    if (n.case_id) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          ...n,
          updated_at: new Date().toISOString()
        });
    }
  }
  console.log('  ✓ Seeded connected multi-role notifications.');

  console.log('\n================================================================');
  console.log('🎉 NAGPUR SYNTHETIC DEMO NETWORK SUCCESSFULLY SEEDED & VERIFIED');
  console.log('================================================================');
}

runSeed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal seeding error:', err);
    process.exit(1);
  });
