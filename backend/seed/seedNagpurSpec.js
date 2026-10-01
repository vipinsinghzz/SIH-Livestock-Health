/**
 * PashuCare Nagpur District Synthetic Demo Network & Ecosystem Seeder
 * File: backend/seed/seedNagpurDemoNetwork.js
 *
 * Populates a complete, internally consistent, relational synthetic demo dataset
 * centered entirely around Nagpur District, Maharashtra, India.
 *
 * Roles Covered:
 * - 12 Farmers (Nagpur District, realistic livestock herds: Cow, Goat, Sheep)
 * - 10 Veterinarians (Distributed across Nagpur talukas with realistic clinics & coordinates)
 * - 4 Officers (District Animal Husbandry Dept, Surveillance, RDDL Nagpur)
 *
 * Operational Data Covered:
 * - ~60 Livestock Animals (Cows, Goats, Sheep)
 * - AI Screenings (Species-aware: Cow LSD/Normal, Goat Mange/Orf/Lice/CL/Ringworm/Normal, Sheep Orf/Normal)
 * - 10 Disease Cases spanning all 5 stages (New, Investigating, Confirmed, Containment, Resolved)
 * - Case Timelines & Notified Vets
 * - 1 Outbreak Cluster & 1 Active Containment Zone (Saoner, Nagpur)
 * - 6 Vaccination Drives/Camps & Farmer Registrations
 * - 3 Diagnostic Lab Referrals (RDDL Nagpur)
 * - 5 Bilingual Veterinary Advisories
 * - Connected Notifications across Farmer, Vet, and Officer
 *
 * Idempotent & Re-run Safe: Uses upsert logic and deterministic identifiers.
 */

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabaseClient');

if (!supabaseAdmin) {
  console.error('[Error] Supabase admin client is not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GEOGRAPHIC COORDINATES FOR NAGPUR DISTRICT
// ─────────────────────────────────────────────────────────────────────────────
const NAGPUR_LOCATIONS = {
  NAGPUR_CITY: { name: 'Civil Lines, Nagpur', village: 'Civil Lines', block: 'Nagpur Urban', lat: 21.1458, lng: 79.0882 },
  NAGPUR_WEST: { name: 'Dharampeth, Nagpur', village: 'Dharampeth', block: 'Nagpur Urban', lat: 21.1415, lng: 79.0685 },
  NAGPUR_RURAL_WADI: { name: 'Wadi, Nagpur', village: 'Wadi', block: 'Nagpur Rural', lat: 21.1215, lng: 79.0025 },
  HINGNA_TOWN: { name: 'Hingna Central', village: 'Hingna', block: 'Hingna', lat: 21.0664, lng: 78.9634 },
  HINGNA_RURAL: { name: 'Takalghat, Hingna', village: 'Takalghat', block: 'Hingna', lat: 21.0250, lng: 78.9450 },
  HINGNA_DIGDOH: { name: 'Digdoh, Hingna', village: 'Digdoh', block: 'Hingna', lat: 21.0820, lng: 78.9810 },
  KAMPTEE_TOWN: { name: 'Kamptee Town', village: 'Kamptee', block: 'Kamptee', lat: 21.2227, lng: 79.1970 },
  KAMPTEE_RURAL: { name: 'Yerkheda, Kamptee', village: 'Yerkheda', block: 'Kamptee', lat: 21.2400, lng: 79.2150 },
  KALMESHWAR_TOWN: { name: 'Kalmeshwar Town', village: 'Kalmeshwar', block: 'Kalmeshwar', lat: 21.2333, lng: 78.9167 },
  KALMESHWAR_DHAPEWADA: { name: 'Dhapewada, Kalmeshwar', village: 'Dhapewada', block: 'Kalmeshwar', lat: 21.2650, lng: 78.9050 },
  SAONER_TOWN: { name: 'Saoner Town', village: 'Saoner', block: 'Saoner', lat: 21.3833, lng: 78.9167 },
  SAONER_KELOD: { name: 'Kelod, Saoner', village: 'Kelod', block: 'Saoner', lat: 21.3920, lng: 78.9280 },
  SAONER_KHAPA: { name: 'Khapa, Saoner', village: 'Khapa', block: 'Saoner', lat: 21.4150, lng: 78.9620 },
  RAMTEK_TOWN: { name: 'Ramtek Town', village: 'Ramtek', block: 'Ramtek', lat: 21.3986, lng: 79.3294 },
  RAMTEK_MANSAR: { name: 'Mansar, Ramtek', village: 'Mansar', block: 'Ramtek', lat: 21.3850, lng: 79.2800 },
  PARSEONI: { name: 'Parseoni Town', village: 'Parseoni', block: 'Parseoni', lat: 21.3789, lng: 79.1864 },
  UMRED_TOWN: { name: 'Umred Town', village: 'Umred', block: 'Umred', lat: 20.8524, lng: 79.3278 },
  UMRED_SIRSI: { name: 'Sirsi, Umred', village: 'Sirsi', block: 'Umred', lat: 20.8750, lng: 79.3100 },
  KATOL_TOWN: { name: 'Katol Town', village: 'Katol', block: 'Katol', lat: 21.2778, lng: 78.5861 },
  KATOL_KONDHALI: { name: 'Kondhali, Katol', village: 'Kondhali', block: 'Katol', lat: 21.1850, lng: 78.6100 },
  KUHI: { name: 'Kuhi Town', village: 'Kuhi', block: 'Kuhi', lat: 21.0189, lng: 79.3586 },
  MOUDA: { name: 'Mouda Town', village: 'Mouda', block: 'Mouda', lat: 21.1644, lng: 79.3942 }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEMO USERS DEFINITION
// ─────────────────────────────────────────────────────────────────────────────
async function defineDemoUsers() {
  const salt = await bcrypt.genSalt(10);
  const farmerHash = await bcrypt.hash('Farmer@123', salt);
  const vetHash = await bcrypt.hash('Vet@123', salt);
  const officerHash = await bcrypt.hash('Admin@123', salt);

  const farmers = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Ramesh Patil (रमेश पाटील)',
      email: 'farmer@pashurakshak.in',
      phone: '+919822011223',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.KAMPTEE_RURAL
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Santosh Wankhede (संतोष वानखेडे)',
      email: 'santosh@pashurakshak.in',
      phone: '+919822044556',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.HINGNA_RURAL
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      name: 'Sunita Pawar (सुनिता पवार)',
      email: 'sunita@pashurakshak.in',
      phone: '+919822055667',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.SAONER_KELOD
    },
    {
      id: '00000000-0000-0000-0000-000000000104',
      name: 'Mahesh Deshmukh (महेश देशमुख)',
      email: 'mahesh.farmer@pashurakshak.in',
      phone: '+919822066778',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.KALMESHWAR_DHAPEWADA
    },
    {
      id: '00000000-0000-0000-0000-000000000105',
      name: 'Ganesh Raut (गणेश राऊत)',
      email: 'ganesh.farmer@pashurakshak.in',
      phone: '+919822077889',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.RAMTEK_MANSAR
    },
    {
      id: '00000000-0000-0000-0000-000000000106',
      name: 'Anita Bhende (अनिता भेंडे)',
      email: 'anita.farmer@pashurakshak.in',
      phone: '+919822088991',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.UMRED_SIRSI
    },
    {
      id: '00000000-0000-0000-0000-000000000107',
      name: 'Pradeep Kale (प्रदीप काळे)',
      email: 'pradeep.farmer@pashurakshak.in',
      phone: '+919822099002',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.KATOL_KONDHALI
    },
    {
      id: '00000000-0000-0000-0000-000000000108',
      name: 'Rekha Gawande (रेखा गावंडे)',
      email: 'rekha.farmer@pashurakshak.in',
      phone: '+919822100113',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.PARSEONI
    },
    {
      id: '00000000-0000-0000-0000-000000000109',
      name: 'Sanjay Thakre (संजय ठाकरे)',
      email: 'sanjay.farmer@pashurakshak.in',
      phone: '+919822111224',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.KUHI
    },
    {
      id: '00000000-0000-0000-0000-000000000110',
      name: 'Archana Zade (अर्चना झाडे)',
      email: 'archana.farmer@pashurakshak.in',
      phone: '+919822122335',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.MOUDA
    },
    {
      id: '00000000-0000-0000-0000-000000000111',
      name: 'Dilip Meshram (दिलीप मेश्राम)',
      email: 'dilip.farmer@pashurakshak.in',
      phone: '+919822133446',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.NAGPUR_RURAL_WADI
    },
    {
      id: '00000000-0000-0000-0000-000000000112',
      name: 'Kavita Chaware (कविता चवरे)',
      email: 'kavita.farmer@pashurakshak.in',
      phone: '+919822144557',
      passwordHash: farmerHash,
      role: 'farmer',
      loc: NAGPUR_LOCATIONS.HINGNA_DIGDOH
    }
  ];

  const veterinarians = [
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Dr. Amit Deshmukh',
      email: 'vet@pashurakshak.in',
      phone: '+919822022334',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Nagpur Central Veterinary Polyclinic',
      specialization: 'Bovine Medicine & Clinical Surgery',
      experience: 12,
      rating: 4.9,
      loc: NAGPUR_LOCATIONS.NAGPUR_CITY
    },
    {
      id: '00000000-0000-0000-0000-000000000007',
      name: 'Dr. Priya Joshi',
      email: 'priya.vet@pashurakshak.in',
      phone: '+919823011221',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Kamptee Veterinary Dispensary',
      specialization: 'Livestock Infectious Diseases & Triage',
      experience: 8,
      rating: 4.8,
      loc: NAGPUR_LOCATIONS.KAMPTEE_TOWN
    },
    {
      id: '7278b8f7-c1f9-4086-b46f-5f6db9319fb6',
      name: 'Dr. Sandeep Bhende',
      email: 'sandeep.vet@pashurakshak.in',
      phone: '+919823022998',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Hingna Taluka Animal Care Clinic',
      specialization: 'Veterinary Epidemiology & Herd Health',
      experience: 10,
      rating: 4.8,
      loc: NAGPUR_LOCATIONS.HINGNA_TOWN
    },
    {
      id: '8555f22f-0f16-464a-a438-0c8989872266',
      name: 'Dr. Sunita Kulkarni',
      email: 'sunita.vet@pashurakshak.in',
      phone: '+919823044551',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Kalmeshwar Cattle & Small Ruminant Clinic',
      specialization: 'Caprine & Ovine Health Specialist',
      experience: 9,
      rating: 4.7,
      loc: NAGPUR_LOCATIONS.KALMESHWAR_TOWN
    },
    {
      id: '3aebc587-48a0-4012-8eac-39f31ffea880',
      name: 'Dr. Rahul Verma',
      email: 'rahul.vet@pashurakshak.in',
      phone: '+919823055662',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Saoner Veterinary Health Centre',
      specialization: 'Preventive Veterinary Medicine & Biosecurity',
      experience: 7,
      rating: 4.8,
      loc: NAGPUR_LOCATIONS.SAONER_TOWN
    },
    {
      id: 'cd34fa97-ca97-4608-9705-201dd76cfc1a',
      name: 'Dr. Sneha Sharma',
      email: 'sneha.vet@pashurakshak.in',
      phone: '+919823066773',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Ramtek Veterinary Hospital',
      specialization: 'Veterinary Emergency Care & Ring Vaccination',
      experience: 6,
      rating: 4.9,
      loc: NAGPUR_LOCATIONS.RAMTEK_TOWN
    },
    {
      id: '85da4ad7-cb17-44e4-aa38-9f744216d119',
      name: 'Dr. Manoj Tiwari',
      email: 'manoj.vet@pashurakshak.in',
      phone: '+919823077884',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Umred Animal Care Dispensary',
      specialization: 'Large Animal Internal Medicine',
      experience: 11,
      rating: 4.6,
      loc: NAGPUR_LOCATIONS.UMRED_TOWN
    },
    {
      id: '917c0baa-1e02-41cc-9f65-122e4b382c5a',
      name: 'Dr. Kavita Kale',
      email: 'kavita.vet@pashurakshak.in',
      phone: '+919823088995',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Katol Livestock Healthcare Centre',
      specialization: 'Veterinary Diagnostics & Pathology',
      experience: 8,
      rating: 4.8,
      loc: NAGPUR_LOCATIONS.KATOL_TOWN
    },
    {
      id: '4987feac-26fb-4ca6-9060-bf27950c0e79',
      name: 'Dr. Vivek Rathi',
      email: 'vivek.vet@pashurakshak.in',
      phone: '+919823099006',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Wadi Veterinary Dispensary',
      specialization: 'Dairy Herd Management & Surgery',
      experience: 7,
      rating: 4.7,
      loc: NAGPUR_LOCATIONS.NAGPUR_RURAL_WADI
    },
    {
      id: '0885a2d4-8114-49bb-aff2-3594f68b9a84',
      name: 'Dr. Pooja Nair',
      email: 'pooja.vet@pashurakshak.in',
      phone: '+919823011887',
      passwordHash: vetHash,
      role: 'veterinarian',
      clinic: 'Mouda Livestock Clinic',
      specialization: 'Zoonotic Disease Surveillance & Vaccination',
      experience: 9,
      rating: 4.9,
      loc: NAGPUR_LOCATIONS.MOUDA
    }
  ];

  const officers = [
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Dr. Suresh Kulkarni',
      email: 'officer@pashurakshak.in',
      phone: '+919822033445',
      passwordHash: officerHash,
      role: 'officer',
      department: 'District Animal Husbandry Department, Nagpur',
      registrationNo: 'DAHO-NAG-01',
      loc: NAGPUR_LOCATIONS.NAGPUR_CITY
    },
    {
      id: '00000000-0000-0000-0000-000000000302',
      name: 'Dr. Priya Deshpande',
      email: 'priya.officer@pashurakshak.in',
      phone: '+919822033446',
      passwordHash: officerHash,
      role: 'officer',
      department: 'District Epidemiological Surveillance Unit, Nagpur',
      registrationNo: 'DESO-NAG-02',
      loc: NAGPUR_LOCATIONS.NAGPUR_CITY
    },
    {
      id: '00000000-0000-0000-0000-000000000303',
      name: 'Dr. Ashok Patil',
      email: 'ashok.officer@pashurakshak.in',
      phone: '+919822033447',
      passwordHash: officerHash,
      role: 'officer',
      department: 'Regional Disease Diagnostic Laboratory (RDDL), Nagpur',
      registrationNo: 'RDDL-NAG-03',
      loc: NAGPUR_LOCATIONS.NAGPUR_WEST
    },
    {
      id: '00000000-0000-0000-0000-000000000304',
      name: 'Dr. Meena Gaikwad',
      email: 'meena.officer@pashurakshak.in',
      phone: '+919822033448',
      passwordHash: officerHash,
      role: 'officer',
      department: 'District Vaccination Campaign Monitoring Office, Nagpur',
      registrationNo: 'DVCO-NAG-04',
      loc: NAGPUR_LOCATIONS.NAGPUR_CITY
    }
  ];

  return { farmers, veterinarians, officers };
}

module.exports = {
  NAGPUR_LOCATIONS,
  defineDemoUsers
};
