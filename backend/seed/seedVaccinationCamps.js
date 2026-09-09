/**
 * Vaccination Camps Database Seeder for SIH PS-128
 * File: backend/seed/seedVaccinationCamps.js
 * Populates 400 realistic, geographically consistent vaccination camp records
 * across Maharashtra (Pune/Baramati, Satara, Ahmednagar, Nagpur),
 * Madhya Pradesh (Sehore, Bhopal), Rajasthan (Jaipur), Gujarat (Anand), and UP (Barabanki).
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const VaccinationDrive = require('../models/VaccinationDrive');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pashurakshak';

// Disease dictionary with veterinary details
const VACCINE_SPECS = [
  {
    code: 'FMD',
    nameEn: 'Foot and Mouth Disease (FMD)',
    nameHi: 'खुरपका-मुंहपका रोग (FMD)',
    nameMr: 'लाळ-खुरकूत रोग (FMD)',
    targetSpecies: 'Cattle & Buffalo',
    batchPrefix: 'FMD-2026-IN',
    weight: 30
  },
  {
    code: 'LSD',
    nameEn: 'Lumpy Skin Disease (LSD)',
    nameHi: 'लम्पी त्वचा रोग (LSD)',
    nameMr: 'लंपी त्वचा रोग (LSD)',
    targetSpecies: 'Cattle',
    batchPrefix: 'LSD-2026-GOATPOX',
    weight: 25
  },
  {
    code: 'HS',
    nameEn: 'Haemorrhagic Septicaemia (HS)',
    nameHi: 'गलघोंटू रोग (HS)',
    nameMr: 'घटसर्प रोग (HS)',
    targetSpecies: 'Cattle & Buffalo',
    batchPrefix: 'HS-2026-ALUM',
    weight: 15
  },
  {
    code: 'BQ',
    nameEn: 'Black Quarter (BQ)',
    nameHi: 'लंगड़ा बुखार (BQ)',
    nameMr: 'फऱ्या रोग (BQ)',
    targetSpecies: 'Cattle & Buffalo',
    batchPrefix: 'BQ-2026-CL',
    weight: 10
  },
  {
    code: 'Brucellosis',
    nameEn: 'Brucellosis (Calfhood S19)',
    nameHi: 'ब्रुसेलोसिस (बछड़ा टीकाकरण)',
    nameMr: 'ब्रुसेलोसिस (वासरांचे लसीकरण)',
    targetSpecies: 'Female Calves (Cattle & Buffalo)',
    batchPrefix: 'BRUC-2026-S19',
    weight: 10
  },
  {
    code: 'PPR',
    nameEn: 'Peste des Petits Ruminants (PPR)',
    nameHi: 'बकरी प्लेग (PPR)',
    nameMr: 'शेळी-मेंढी प्लेग (PPR)',
    targetSpecies: 'Goat & Sheep',
    batchPrefix: 'PPR-2026-ATTN',
    weight: 8
  },
  {
    code: 'Rabies',
    nameEn: 'Anti-Rabies Prophylaxis (ARV)',
    nameHi: 'रेबीज रोधी टीकाकरण (ARV)',
    nameMr: 'रेबीज प्रतिबंधक लस (ARV)',
    targetSpecies: 'Canines & Livestock',
    batchPrefix: 'RAB-2026-CELL',
    weight: 2
  }
];

// Weighted selection helper
function pickWeightedVaccine() {
  const total = VACCINE_SPECS.reduce((acc, v) => acc + v.weight, 0);
  let rnd = Math.random() * total;
  for (const v of VACCINE_SPECS) {
    if (rnd < v.weight) return v;
    rnd -= v.weight;
  }
  return VACCINE_SPECS[0];
}

// Geographic Clusters
const HUBS = [
  {
    state: 'Maharashtra',
    district: 'Pune',
    count: 160,
    blocks: [
      {
        name: 'Baramati',
        count: 55,
        lat: 18.1517,
        lng: 74.5772,
        villages: [
          'Malegaon Bk', 'Malegaon Kh', 'Rui', 'Jalochi', 'Dorlewadi', 'Songaon',
          'Shirsuphal', 'Gunawadi', 'Supe', 'Morgaon', 'Late', 'Undawadi',
          'Karhati', 'Kambaleshwar', 'Pimpali', 'Bhavaninagar', 'Medhad',
          'Deulgaon Rasal', 'Katewadi', 'Varkute', 'Korhale Bk', 'Tardobachiwadi',
          'Paravadi', 'Murum', 'Anjangaon', 'Pandare', 'Sawal', 'Nimbut',
          'Bajrangnagar', 'Sangvi', 'Nirawagaj', 'Kololi', 'Shirasane'
        ]
      },
      {
        name: 'Indapur',
        count: 30,
        lat: 18.1158,
        lng: 75.0272,
        villages: [
          'Nimgaon Ketki', 'Bavda', 'Walchandnagar', 'Shelgaon', 'Lasurne',
          'Palasdeo', 'Anthurne', 'Kalamb', 'Varkute', 'Kalthan', 'Taratgaon',
          'Shingnapur', 'Redni', 'Bijawadi', 'Loni Deokar'
        ]
      },
      {
        name: 'Daund',
        count: 25,
        lat: 18.4658,
        lng: 74.5824,
        villages: [
          'Patas', 'Kurkumbh', 'Kedgaon', 'Yawat', 'Kashti', 'Boripardhi',
          'Girim', 'Khadki', 'Gopalwadi', 'Sonwadi', 'Malad', 'Ravangaon'
        ]
      },
      {
        name: 'Shirur',
        count: 25,
        lat: 18.8276,
        lng: 74.3774,
        villages: [
          'Koregaon Bhima', 'Sanaswadi', 'Shikrapur', 'Pabal', 'Talegaon Dhamdhere',
          'Nighoj', 'Mandavgan Pharata', 'Inamgaon', 'Ranjangaon Ganpati', 'Kendur'
        ]
      },
      {
        name: 'Haveli',
        count: 13,
        lat: 18.5089,
        lng: 73.9259,
        villages: [
          'Wagholi', 'Loni Kalbhor', 'Uruli Kanchan', 'Manjari', 'Theur',
          'Phursungi', 'Khadakwasla', 'Donje'
        ]
      },
      {
        name: 'Khed',
        count: 12,
        lat: 18.855,
        lng: 73.91,
        villages: [
          'Chakan', 'Rajgurunagar', 'Alandi Rural', 'Khed Shivapur',
          'Shell Pimpalgaon', 'Medankarwadi'
        ]
      }
    ]
  },
  {
    state: 'Maharashtra',
    district: 'Satara',
    count: 30,
    blocks: [
      {
        name: 'Phaltan',
        count: 15,
        lat: 17.9867,
        lng: 74.4328,
        villages: ['Girvi', 'Taradgaon', 'Nimbhore', 'Vathar', 'Sakharwadi', 'Barad']
      },
      {
        name: 'Karad',
        count: 15,
        lat: 17.2889,
        lng: 74.1844,
        villages: ['Malkapur', 'Ogalewadi', 'Kole', 'Masur', 'Shenoli', 'Umbraj']
      }
    ]
  },
  {
    state: 'Maharashtra',
    district: 'Ahmednagar',
    count: 30,
    blocks: [
      {
        name: 'Shrigonda',
        count: 15,
        lat: 18.6167,
        lng: 74.6983,
        villages: ['Belwandi', 'Kashti', 'Mandavgan', 'Pedgaon', 'Chambhurdi']
      },
      {
        name: 'Rahuri',
        count: 15,
        lat: 19.3889,
        lng: 74.6542,
        villages: ['Devlali Pravara', 'Taklimiyan', 'Songaon', 'Baragaon Nandur']
      }
    ]
  },
  {
    state: 'Maharashtra',
    district: 'Nagpur',
    count: 25,
    blocks: [
      {
        name: 'Kamptee',
        count: 13,
        lat: 21.2227,
        lng: 79.1983,
        villages: ['Kanhan', 'Yerkheda', 'Bhilgaon', 'Khamla Rural', 'Gondegaon']
      },
      {
        name: 'Hingna',
        count: 12,
        lat: 21.0667,
        lng: 78.9667,
        villages: ['Wadi', 'Digdoh', 'Nildoh', 'Mandva', 'Sukli']
      }
    ]
  },
  {
    state: 'Madhya Pradesh',
    district: 'Sehore',
    count: 35,
    blocks: [
      {
        name: 'Sehore Sadar',
        count: 18,
        lat: 23.2032,
        lng: 77.0844,
        villages: ['Shyampur', 'Doraha', 'Mandi', 'Bijori', 'Barkheda Hasan', 'Mungawali']
      },
      {
        name: 'Ashta',
        count: 17,
        lat: 23.0189,
        lng: 76.7214,
        villages: ['Jawar', 'Khachrod', 'Siddiqganj', 'Kothri', 'Kajlas', 'Bhanwar']
      }
    ]
  },
  {
    state: 'Madhya Pradesh',
    district: 'Bhopal',
    count: 25,
    blocks: [
      {
        name: 'Berasia',
        count: 13,
        lat: 23.6333,
        lng: 77.4333,
        villages: ['Lalariya', 'Dungariya', 'Gunga', 'Narsingarh Road', 'Runaha']
      },
      {
        name: 'Phanda',
        count: 12,
        lat: 23.2167,
        lng: 77.3167,
        villages: ['Bairagarh Kalan', 'Barkheda Bondar', 'Ratibad', 'Mendori', 'Kolar Rural']
      }
    ]
  },
  {
    state: 'Rajasthan',
    district: 'Jaipur',
    count: 35,
    blocks: [
      {
        name: 'Bassi',
        count: 18,
        lat: 26.8333,
        lng: 76.05,
        villages: ['Kanota', 'Toonga', 'Banswara Rural', 'Dhana', 'Rohini', 'Bhojpura']
      },
      {
        name: 'Chaksu',
        count: 17,
        lat: 26.6,
        lng: 75.95,
        villages: ['Kothun', 'Kadera', 'Padampura', 'Nimera', 'Shivdaspura', 'Titariya']
      }
    ]
  },
  {
    state: 'Gujarat',
    district: 'Anand',
    count: 30,
    blocks: [
      {
        name: 'Anand',
        count: 15,
        lat: 22.5645,
        lng: 72.9289,
        villages: ['Mogri', 'Karamsad', 'Bakrol', 'Hadgood', 'Gamdi', 'Chikhodra']
      },
      {
        name: 'Borsad',
        count: 15,
        lat: 22.4114,
        lng: 72.9014,
        villages: ['Bhadran', 'Vasad Rural', 'Kavitha', 'Dharmaj', 'Alarsa', 'Davol']
      }
    ]
  },
  {
    state: 'Uttar Pradesh',
    district: 'Barabanki',
    count: 30,
    blocks: [
      {
        name: 'Nawabganj',
        count: 15,
        lat: 26.9274,
        lng: 81.1843,
        villages: ['Satrikh', 'Badosarai', 'Harakh', 'Dewa Sharif Rural', 'Banki', 'Masauli']
      },
      {
        name: 'Fatehpur',
        count: 15,
        lat: 27.1724,
        lng: 81.2189,
        villages: ['Belhara', 'Mahmoodabad Border', 'Kursi', 'Kintoor', 'Suratganj']
      }
    ]
  }
];

const VENUE_TEMPLATES = [
  'Primary Veterinary Dispensary',
  'Gram Panchayat Bhawan Premises',
  'Village Dairy Cooperative Chilling Center',
  'Kisan Seva Kendra & Veterinary Camp',
  'Zilla Parishad Primary School Grounds',
  'Agricultural Produce Market Committee Sub-Yard',
  'Taluka Veterinary Polyclinic Campus',
  'Community Animal Health Shed'
];

const ORGANIZER_TEMPLATES = [
  'Department of Animal Husbandry, Govt. of {STATE}',
  'District Animal Husbandry Office, {DISTRICT}',
  'National Animal Disease Control Programme (NADCP)',
  'Zilla Parishad Veterinary Health Cell, {DISTRICT}',
  'District Cooperative Milk Producers Union Ltd ({DISTRICT})',
  'Taluka Veterinary Polyclinic, {BLOCK}'
];

const VET_DOCTORS = {
  Maharashtra: [
    'Dr. Ananya Deshmukh (B.V.Sc & A.H.)',
    'Dr. Suresh Kulkarni (M.V.Sc - Surgery)',
    'Dr. Sunil Sharma (B.V.Sc)',
    'Dr. R. K. Shinde (LDO - Baramati)',
    'Dr. Priya Patil (Veterinary Surgeon)',
    'Dr. Nilesh Gaikwad (Extension Vet)',
    'Dr. Snehal More (B.V.Sc)',
    'Dr. Deepak Jadhav (Veterinary Officer)',
    'Dr. Vaishali Bhosale (Assistant Director)',
    'Dr. Sachin Pawar (Mobile Vet Unit)'
  ],
  'Madhya Pradesh': [
    'Dr. Vikramaditya Sharma (M.V.Sc - Medicine)',
    'Dr. Rajesh Meena (Veterinary Assistant Surgeon)',
    'Dr. Anita Chouhan (B.V.Sc)',
    'Dr. Pradeep Verma (Livestock Development Officer)',
    'Dr. Sanjay Tiwari (District Vet Officer)'
  ],
  Rajasthan: [
    'Dr. Mahendra Choudhary (Senior Vet Officer)',
    'Dr. Kavita Sharma (B.V.Sc & A.H.)',
    'Dr. Devendra Rathore (LDO - Jaipur)',
    'Dr. Mukesh Yadav (Veterinary Surgeon)'
  ],
  Gujarat: [
    'Dr. Bhavesh Patel (NDDB Livestock Specialist)',
    'Dr. Hiren Desai (Animal Husbandry Officer)',
    'Dr. Chirag Solanki (B.V.Sc & A.H.)',
    'Dr. Jignesh Shah (Cooperative Vet)'
  ],
  'Uttar Pradesh': [
    'Dr. Arvind Verma (Veterinary Medical Officer)',
    'Dr. Santosh Mishra (Livestock Development Officer)',
    'Dr. Rakesh Yadav (Veterinary Surgeon)',
    'Dr. Poonam Singh (B.V.Sc & A.H.)'
  ]
};

async function seedVaccinationCamps() {
  try {
    console.log('[Seeder] Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('[Seeder] Connected successfully.');

    // 1. Fetch existing users to link assigned officers
    const existingVets = await User.find({
      role: { $in: ['field_worker', 'officer'] }
    }).lean();

    const userVetMap = {};
    existingVets.forEach((u) => {
      userVetMap[u.name.toLowerCase()] = u._id;
    });

    console.log(`[Seeder] Found ${existingVets.length} existing veterinary users for FK linking.`);

    // 2. Remove outdated, inconsistent records
    console.log('[Seeder] Cleaning existing vaccinationdrives collection...');
    const deleteRes = await VaccinationDrive.deleteMany({});
    console.log(`[Seeder] Removed ${deleteRes.deletedCount} old records.`);

    // 3. Generate 400 realistic records
    const records = [];
    let globalIndex = 1;
    const now = new Date('2026-09-09T00:00:00.000Z');

    for (const hub of HUBS) {
      const state = hub.state;
      const district = hub.district;
      const stateDoctors = VET_DOCTORS[state] || VET_DOCTORS.Maharashtra;

      for (const blockObj of hub.blocks) {
        const blockName = blockObj.name;
        const baseLat = blockObj.lat;
        const baseLng = blockObj.lng;
        const villages = blockObj.villages;
        const targetCampCount = blockObj.count;

        for (let i = 0; i < targetCampCount; i++) {
          const villageName = villages[i % villages.length];
          const vaccine = pickWeightedVaccine();

          // Small deterministic geo offset per village (~0.5km to 8km from block center)
          const angle = (i * 137.5) * (Math.PI / 180); // golden angle distribution
          const radiusKm = 0.8 + ((i * 1.7) % 7.5);
          const latOffset = (radiusKm / 111) * Math.cos(angle);
          const lngOffset = (radiusKm / (111 * Math.cos((baseLat * Math.PI) / 180))) * Math.sin(angle);
          const lat = Math.round((baseLat + latOffset) * 10000) / 10000;
          const lng = Math.round((baseLng + lngOffset) * 10000) / 10000;

          // Status & Date distribution: 60% Upcoming, 15% Ongoing, 25% Completed
          const ratio = (i % 20) / 20;
          let status = 'Upcoming';
          let campDate = new Date(now);
          let bookedSlots = 0;
          let coveredCount = 0;
          const capacity = 150 + ((i * 25) % 350); // 150 to 500

          if (ratio < 0.6) {
            // Upcoming (1 to 28 days in future)
            status = 'Upcoming';
            const daysAhead = 1 + (i % 28);
            campDate = new Date(now.getTime() + daysAhead * 24 * 3600 * 1000);
            bookedSlots = Math.round(capacity * (0.1 + ((i * 3) % 40) / 100)); // 10% to 50% booked
            coveredCount = 0;
          } else if (ratio < 0.75) {
            // Ongoing (Today)
            status = 'Ongoing';
            campDate = new Date(now);
            bookedSlots = Math.round(capacity * (0.5 + ((i * 2) % 35) / 100)); // 50% to 85% booked
            coveredCount = Math.round(bookedSlots * 0.6); // Partially vaccinated today
          } else {
            // Completed (1 to 28 days in past)
            status = 'Completed';
            const daysAgo = 1 + (i % 28);
            campDate = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000);
            bookedSlots = Math.round(capacity * (0.85 + ((i * 2) % 15) / 100)); // 85% to 100% booked
            coveredCount = bookedSlots; // Fully completed
          }

          const remainingSlots = Math.max(0, capacity - bookedSlots);

          // Doctor & FK linking
          const assignedDoctor = stateDoctors[i % stateDoctors.length];
          let assignedOfficerId = null;
          if (assignedDoctor.includes('Ananya')) {
            assignedOfficerId = userVetMap['dr. ananya deshmukh'] || null;
          } else if (assignedDoctor.includes('Kulkarni')) {
            assignedOfficerId = userVetMap['dr. suresh kulkarni'] || null;
          } else if (assignedDoctor.includes('Sunil Sharma')) {
            assignedOfficerId = userVetMap['dr. sunil sharma'] || null;
          }

          // Venue & Organizer
          const venueTemplate = VENUE_TEMPLATES[i % VENUE_TEMPLATES.length];
          const venue = `${venueTemplate}, ${villageName}`;

          const orgTemplate = ORGANIZER_TEMPLATES[i % ORGANIZER_TEMPLATES.length];
          const organizingHospital = orgTemplate
            .replace('{STATE}', state)
            .replace('{DISTRICT}', district)
            .replace('{BLOCK}', blockName);

          const startHour = 9 + (i % 2); // 9 AM or 10 AM
          const startTime = `${startHour.toString().padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'} AM`;
          const endTime = '04:00 PM';

          const stateCode = state.substring(0, 2).toUpperCase();
          const distCode = district.substring(0, 3).toUpperCase();
          const campId = `CAMP-${stateCode}-${distCode}-${globalIndex.toString().padStart(4, '0')}`;

          const contactPhone =
            i % 5 === 0
              ? '1962'
              : `+91 ${98220 + (i % 70000)} ${10000 + ((i * 73) % 89999)}`;

          records.push({
            campId,
            state,
            district,
            block: blockName,
            village: villageName,
            venue,
            coordinates: { lat, lng },
            vaccine: vaccine.code,
            vaccineFullName: vaccine.nameEn,
            targetSpecies: vaccine.targetSpecies,
            campDate,
            startTime,
            endTime,
            cost: 'Free (Govt Drive)',
            isFree: true,
            organizingHospital,
            assignedOfficer: assignedDoctor,
            assignedOfficerId,
            contactNumber: contactPhone,
            capacity,
            bookedSlots,
            remainingSlots,
            targetCount: capacity,
            coveredCount,
            startDate: campDate,
            endDate: new Date(campDate.getTime() + 8 * 3600 * 1000),
            status,
            notes: 'Mandatory ring immunization and biometric RFID tagging drive under PS-128.'
          });

          globalIndex++;
        }
      }
    }

    console.log(`[Seeder] Inserting ${records.length} structured vaccination camp records...`);
    const inserted = await VaccinationDrive.insertMany(records);
    console.log(`[Seeder] SUCCESS! Seeded ${inserted.length} vaccination camps.`);

    // Verification stats
    const stats = await VaccinationDrive.aggregate([
      {
        $group: {
          _id: { state: '$state', district: '$district', status: '$status' },
          count: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          totalBooked: { $sum: '$bookedSlots' }
        }
      },
      { $sort: { '_id.state': 1, '_id.district': 1 } }
    ]);

    console.log('\n[Seeder Verification Summary]:');
    console.table(
      stats.map((s) => ({
        State: s._id.state,
        District: s._id.district,
        Status: s._id.status,
        Count: s.count,
        Capacity: s.totalCapacity,
        Booked: s.totalBooked
      }))
    );

    const totalInDb = await VaccinationDrive.countDocuments();
    console.log(`\nVerified Total Documents in DB: ${totalInDb}`);

    await mongoose.disconnect();
    console.log('[Seeder] Disconnected from MongoDB. Complete!');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]:', error);
    process.exit(1);
  }
}

seedVaccinationCamps();
