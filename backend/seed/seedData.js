/**
 * Database Seeder for PashuRakshak Surveillance Platform
 * File: backend/seed/seedData.js
 * Populates realistic demo users, livestock profiles, reports, AI triage outputs,
 * lab referrals, bilingual advisories, and vaccination drives across Pune district.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Animal = require('../models/Animal');
const Report = require('../models/Report');
const TriageResult = require('../models/TriageResult');
const LabReferral = require('../models/LabReferral');
const Advisory = require('../models/Advisory');
const VaccinationDrive = require('../models/VaccinationDrive');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pashurakshak';

async function seedDatabase() {
  try {
    console.log('[Seeder] Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('[Seeder] Connected! Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Animal.deleteMany({}),
      Report.deleteMany({}),
      TriageResult.deleteMany({}),
      LabReferral.deleteMany({}),
      Advisory.deleteMany({}),
      VaccinationDrive.deleteMany({})
    ]);

    console.log('[Seeder] Existing data cleared.');

    // 1. Create Demo Users
    const salt = await bcrypt.genSalt(10);
    const farmerPasswordHash = await bcrypt.hash('Farmer@123', salt);
    const vetPasswordHash = await bcrypt.hash('Vet@123', salt);
    const adminPasswordHash = await bcrypt.hash('Admin@123', salt);

    const users = await User.create([
      {
        name: 'Ramesh Patil',
        role: 'farmer',
        email: 'farmer@pashurakshak.in',
        phone: '+919822011223',
        passwordHash: farmerPasswordHash,
        village: 'Malegaon Bk',
        block: 'Baramati',
        district: 'Pune',
        preferredLanguage: 'hi'
      },
      {
        name: 'Dr. Ananya Deshmukh',
        role: 'field_worker',
        email: 'vet@pashurakshak.in',
        phone: '+919822022334',
        passwordHash: vetPasswordHash,
        village: 'Baramati Town',
        block: 'Baramati',
        district: 'Pune',
        preferredLanguage: 'en'
      },
      {
        name: 'Dr. Suresh Kulkarni',
        role: 'officer',
        email: 'officer@pashurakshak.in',
        phone: '+919822033445',
        passwordHash: adminPasswordHash,
        village: 'Shivajinagar',
        block: 'Haveli',
        district: 'Pune',
        preferredLanguage: 'en'
      },
      {
        name: 'Santosh Shinde',
        role: 'farmer',
        email: 'santosh@pashurakshak.in',
        phone: '+919822044556',
        passwordHash: farmerPasswordHash,
        village: 'Koregaon Bhima',
        block: 'Shirur',
        district: 'Pune',
        preferredLanguage: 'hi'
      },
      {
        name: 'Sunita Gaikwad',
        role: 'farmer',
        email: 'sunita@pashurakshak.in',
        phone: '+919822055667',
        passwordHash: farmerPasswordHash,
        village: 'Chakan',
        block: 'Khed',
        district: 'Pune',
        preferredLanguage: 'hi'
      }
    ]);

    const [farmer1, vetUser, officerUser, farmer2, farmer3] = users;
    console.log(`[Seeder] Seeded ${users.length} users.`);

    // 2. Create Livestock Profiles
    const animals = await Animal.create([
      {
        tagId: 'MH-12-P-1001',
        species: 'Cattle',
        breed: 'Gir Cow',
        age: 4,
        ownerId: farmer1._id,
        village: 'Malegaon Bk',
        block: 'Baramati',
        district: 'Pune',
        vaccinationHistory: [
          { vaccine: 'FMD', date: new Date('2025-10-10'), nextDue: new Date('2026-04-10') },
          { vaccine: 'LSD', date: new Date('2025-11-15'), nextDue: new Date('2026-11-15') }
        ],
        treatmentHistory: [
          { condition: 'Mild Mastitis', date: new Date('2025-12-01'), treatment: 'Intramammary antibiotic infusion' }
        ]
      },
      {
        tagId: 'MH-12-P-1002',
        species: 'Buffalo',
        breed: 'Murrah',
        age: 5,
        ownerId: farmer1._id,
        village: 'Malegaon Bk',
        block: 'Baramati',
        district: 'Pune',
        vaccinationHistory: [
          { vaccine: 'HS', date: new Date('2025-08-20'), nextDue: new Date('2026-08-20') }
        ]
      },
      {
        tagId: 'MH-12-P-1003',
        species: 'Cattle',
        breed: 'Crossbred HF',
        age: 3,
        ownerId: farmer1._id,
        village: 'Malegaon Bk',
        block: 'Baramati',
        district: 'Pune',
        vaccinationHistory: []
      },
      {
        tagId: 'MH-12-P-2001',
        species: 'Goat',
        breed: 'Osmanabadi',
        age: 2,
        ownerId: farmer2._id,
        village: 'Koregaon Bhima',
        block: 'Shirur',
        district: 'Pune',
        vaccinationHistory: [
          { vaccine: 'PPR', date: new Date('2025-09-12'), nextDue: new Date('2028-09-12') }
        ]
      },
      {
        tagId: 'MH-12-P-2002',
        species: 'Cattle',
        breed: 'Khillari Bull',
        age: 6,
        ownerId: farmer2._id,
        village: 'Koregaon Bhima',
        block: 'Shirur',
        district: 'Pune',
        vaccinationHistory: [
          { vaccine: 'FMD', date: new Date('2025-05-15'), nextDue: new Date('2025-11-15') }
        ]
      },
      {
        tagId: 'MH-12-P-3001',
        species: 'Cattle',
        breed: 'Dangi Cow',
        age: 3,
        ownerId: farmer3._id,
        village: 'Chakan',
        block: 'Khed',
        district: 'Pune',
        vaccinationHistory: []
      }
    ]);

    console.log(`[Seeder] Seeded ${animals.length} livestock profiles.`);

    // 3. Create Sample Reports and AI Triage Results
    const now = Date.now();
    const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000);

    const reportDefinitions = [
      // Cluster 1 in Baramati (FMD Outbreak)
      {
        caseId: 'CASE-20260901-1021',
        reporterId: farmer1._id,
        animalId: animals[0]._id,
        species: 'Cattle',
        symptoms: ['mouth blisters', 'excessive salivation', 'hoof blister', 'lameness', 'high fever'],
        mortalityCount: 0,
        affectedCount: 2,
        location: { lat: 18.1517, lng: 74.5772, village: 'Malegaon Bk', block: 'Baramati', district: 'Pune' },
        status: 'Escalated',
        createdAt: daysAgo(3),
        triage: {
          riskLevel: 'High',
          suspectedDiseases: [
            { name: 'Foot and Mouth Disease (FMD)', confidenceScore: 0.93 },
            { name: 'Bovine Viral Diarrhea', confidenceScore: 0.32 }
          ],
          recommendedAction: 'Isolate affected cattle immediately. Restrict cattle movement within 5km radius. Disinfect sheds with 4% washing soda.',
          outbreakFlag: true,
          clusterDetails: { matchedCasesCount: 3, timeWindowDays: 14, block: 'Baramati' },
          explanation: 'CLUSTER OUTBREAK DETECTED: 3 matching cases in Baramati block within 14 days. High symptom correlation with FMD (93% confidence).',
          modelVersion: 'mock-v0.1'
        }
      },
      {
        caseId: 'CASE-20260902-1022',
        reporterId: farmer1._id,
        animalId: animals[1]._id,
        species: 'Buffalo',
        symptoms: ['mouth blisters', 'excessive salivation', 'drooling', 'limping'],
        mortalityCount: 0,
        affectedCount: 3,
        location: { lat: 18.1632, lng: 74.5885, village: 'Kathephal', block: 'Baramati', district: 'Pune' },
        status: 'Field Verified',
        createdAt: daysAgo(2),
        triage: {
          riskLevel: 'High',
          suspectedDiseases: [
            { name: 'Foot and Mouth Disease (FMD)', confidenceScore: 0.89 },
            { name: 'Vesicular Stomatitis', confidenceScore: 0.41 }
          ],
          recommendedAction: 'Quarantine herd. Administer mouth wash with 1% potassium permanganate and notify local veterinary dispensary.',
          outbreakFlag: true,
          clusterDetails: { matchedCasesCount: 3, timeWindowDays: 14, block: 'Baramati' },
          explanation: 'CLUSTER OUTBREAK DETECTED: Correlates with ongoing FMD cluster in Baramati block.',
          modelVersion: 'mock-v0.1'
        }
      },
      {
        caseId: 'CASE-20260903-1023',
        reporterId: vetUser._id,
        animalId: animals[2]._id,
        species: 'Cattle',
        symptoms: ['hoof blister', 'lameness', 'fever', 'loss of appetite'],
        mortalityCount: 0,
        affectedCount: 1,
        location: { lat: 18.1401, lng: 74.5610, village: 'Jalochi', block: 'Baramati', district: 'Pune' },
        status: 'Triaged',
        createdAt: daysAgo(1),
        triage: {
          riskLevel: 'High',
          suspectedDiseases: [
            { name: 'Foot and Mouth Disease (FMD)', confidenceScore: 0.86 }
          ],
          recommendedAction: 'Isolate animal and initiate ring vaccination protocol in Jalochi village.',
          outbreakFlag: true,
          clusterDetails: { matchedCasesCount: 3, timeWindowDays: 14, block: 'Baramati' },
          explanation: 'Secondary spread detected within 4km of Malegaon outbreak epicenter.',
          modelVersion: 'mock-v0.1'
        }
      },

      // Critical HS Case in Khed
      {
        caseId: 'CASE-20260901-2011',
        reporterId: farmer3._id,
        animalId: animals[5]._id,
        species: 'Cattle',
        symptoms: ['throat swelling', 'difficulty breathing', 'sudden death', 'high fever', 'grunting'],
        mortalityCount: 2,
        affectedCount: 4,
        location: { lat: 18.8500, lng: 73.9000, village: 'Chakan', block: 'Khed', district: 'Pune' },
        status: 'Escalated',
        createdAt: daysAgo(4),
        triage: {
          riskLevel: 'Critical',
          suspectedDiseases: [
            { name: 'Haemorrhagic Septicaemia (HS)', confidenceScore: 0.94 },
            { name: 'Anthrax', confidenceScore: 0.42 }
          ],
          recommendedAction: 'CRITICAL: Administer emergency oxytetracycline to remaining herd under vet supervision. Dispatch rapid response unit.',
          outbreakFlag: true,
          clusterDetails: { matchedCasesCount: 1, timeWindowDays: 14, block: 'Khed' },
          explanation: 'Acute mortality event with characteristic submandibular edema and respiratory collapse. Severe HS risk.',
          modelVersion: 'mock-v0.1'
        }
      },

      // Lumpy Skin Disease in Shirur
      {
        caseId: 'CASE-20260828-3015',
        reporterId: farmer2._id,
        animalId: animals[4]._id,
        species: 'Cattle',
        symptoms: ['skin nodules', 'skin lumps', 'swollen lymph nodes', 'fever', 'nasal discharge'],
        mortalityCount: 0,
        affectedCount: 2,
        location: { lat: 18.8276, lng: 74.3774, village: 'Koregaon Bhima', block: 'Shirur', district: 'Pune' },
        status: 'Contained',
        createdAt: daysAgo(8),
        triage: {
          riskLevel: 'High',
          suspectedDiseases: [
            { name: 'Lumpy Skin Disease (LSD)', confidenceScore: 0.91 }
          ],
          recommendedAction: 'Isolate cattle, apply vector-control spray, notify village dispensary for ring vaccination.',
          outbreakFlag: false,
          clusterDetails: { matchedCasesCount: 0, timeWindowDays: 14, block: 'Shirur' },
          explanation: 'Nodular lesions and systemic fever match LSD pathology.',
          modelVersion: 'mock-v0.1'
        }
      },

      // PPR in Small Ruminants (Goats) in Shirur
      {
        caseId: 'CASE-20260825-4019',
        reporterId: farmer2._id,
        animalId: animals[3]._id,
        species: 'Goat',
        symptoms: ['high fever', 'mouth sores', 'nasal discharge', 'foul diarrhea'],
        mortalityCount: 1,
        affectedCount: 5,
        location: { lat: 18.8150, lng: 74.3620, village: 'Sanaswadi', block: 'Shirur', district: 'Pune' },
        status: 'Closed',
        createdAt: daysAgo(12),
        triage: {
          riskLevel: 'High',
          suspectedDiseases: [
            { name: 'Peste des Petits Ruminants (PPR)', confidenceScore: 0.88 },
            { name: 'Goat Pox', confidenceScore: 0.35 }
          ],
          recommendedAction: 'Isolate small ruminants. Provide rehydration therapy and supportive antibiotics.',
          outbreakFlag: false,
          clusterDetails: { matchedCasesCount: 0, timeWindowDays: 14, block: 'Shirur' },
          explanation: 'Enteritis and oral stomatitis in goat herd indicate acute PPR.',
          modelVersion: 'mock-v0.1'
        }
      },

      // Anthrax Alert in Haveli
      {
        caseId: 'CASE-20260829-5022',
        reporterId: officerUser._id,
        species: 'Cattle',
        symptoms: ['sudden death', 'dark blood from nose', 'unclotted blood', 'bloat'],
        mortalityCount: 1,
        affectedCount: 1,
        location: { lat: 18.5204, lng: 73.8567, village: 'Hadapsar Rural', block: 'Haveli', district: 'Pune' },
        status: 'Contained',
        createdAt: daysAgo(6),
        triage: {
          riskLevel: 'Critical',
          suspectedDiseases: [
            { name: 'Anthrax', confidenceScore: 0.95 }
          ],
          recommendedAction: 'DO NOT OPEN CARCASS. Deep burial with quicklime under police and veterinary escort. Quarantine farm.',
          outbreakFlag: false,
          clusterDetails: { matchedCasesCount: 0, timeWindowDays: 14, block: 'Haveli' },
          explanation: 'Unclotted hemorrhage from natural orifices with sudden mortality is pathognomonic for Anthrax.',
          modelVersion: 'mock-v0.1'
        }
      },

      // Mild Mastitis Case in Baramati (Low/Moderate)
      {
        caseId: 'CASE-20260904-6031',
        reporterId: farmer1._id,
        species: 'Buffalo',
        symptoms: ['swollen udder', 'clots in milk', 'reduced milk'],
        mortalityCount: 0,
        affectedCount: 1,
        location: { lat: 18.1700, lng: 74.5900, village: 'Dorlewadi', block: 'Baramati', district: 'Pune' },
        status: 'Triaged',
        createdAt: daysAgo(1),
        triage: {
          riskLevel: 'Moderate',
          suspectedDiseases: [
            { name: 'Bovine Mastitis', confidenceScore: 0.82 }
          ],
          recommendedAction: 'Perform CMT test, milk out affected quarter completely, administer intramammary medication.',
          outbreakFlag: false,
          clusterDetails: { matchedCasesCount: 0, timeWindowDays: 14, block: 'Baramati' },
          explanation: 'Localized mammary gland inflammation without systemic spread.',
          modelVersion: 'mock-v0.1'
        }
      },

      // Avian Influenza Alert (Poultry) in Indapur
      {
        caseId: 'CASE-20260903-7040',
        reporterId: farmer1._id,
        species: 'Poultry',
        symptoms: ['sudden death in birds', 'flock mortality', 'purple wattle', 'respiratory distress'],
        mortalityCount: 15,
        affectedCount: 50,
        location: { lat: 18.1167, lng: 75.0333, village: 'Nimgaon', block: 'Indapur', district: 'Pune' },
        status: 'Escalated',
        createdAt: daysAgo(2),
        triage: {
          riskLevel: 'Critical',
          suspectedDiseases: [
            { name: 'Avian Influenza', confidenceScore: 0.92 },
            { name: 'Newcastle Disease', confidenceScore: 0.65 }
          ],
          recommendedAction: 'ALERT: Cease all poultry transport. Deploy biosecurity barrier and contact state diagnostic laboratory.',
          outbreakFlag: true,
          clusterDetails: { matchedCasesCount: 1, timeWindowDays: 14, block: 'Indapur' },
          explanation: 'Mass mortality event in broiler flock with cyanotic wattles.',
          modelVersion: 'mock-v0.1'
        }
      }
    ];

    const createdReports = [];

    for (const rDef of reportDefinitions) {
      const triage = rDef.triage;
      delete rDef.triage;

      const report = await Report.create(rDef);
      createdReports.push(report);

      await TriageResult.create({
        reportId: report._id,
        riskLevel: triage.riskLevel,
        suspectedDiseases: triage.suspectedDiseases,
        recommendedAction: triage.recommendedAction,
        outbreakFlag: triage.outbreakFlag,
        clusterDetails: triage.clusterDetails,
        explanation: triage.explanation,
        modelVersion: triage.modelVersion
      });
    }

    console.log(`[Seeder] Seeded ${createdReports.length} reports and triage results.`);

    // 4. Create Lab Referrals for high risk cases
    await LabReferral.create([
      {
        reportId: createdReports[0]._id, // FMD Baramati case 1
        sampleType: 'Vesicular Fluid',
        collectionDate: daysAgo(2),
        referredLab: 'Western Regional Disease Diagnostic Laboratory (WRDDL), Pune',
        status: 'In Transit',
        collectedBy: vetUser._id,
        resultSummary: { notes: 'Collected fluid from unruptured buccal vesicle on ice pack.' }
      },
      {
        reportId: createdReports[3]._id, // HS Khed case
        sampleType: 'Blood / Serum',
        collectionDate: daysAgo(3),
        referredLab: 'District Disease Diagnostic Laboratory (DDDL), Pune',
        status: 'Received',
        collectedBy: vetUser._id,
        resultSummary: { notes: 'Peripheral blood smear prepared on-site, staining in progress.' }
      },
      {
        reportId: createdReports[4]._id, // LSD Shirur case
        sampleType: 'Skin Lesion / Scab',
        collectionDate: daysAgo(7),
        referredLab: 'State Veterinary Diagnostic Institute, Aundh, Pune',
        status: 'Result Confirmed',
        collectedBy: vetUser._id,
        resultSummary: {
          confirmedDisease: 'Lumpy Skin Disease (Capripoxvirus PCR Positive)',
          notes: 'PCR confirmed Capripoxvirus genome. Advise 5km ring vaccination.',
          confirmedDate: daysAgo(5)
        }
      }
    ]);

    console.log('[Seeder] Seeded Lab Referrals.');

    // 5. Create Bilingual Advisories
    await Advisory.create([
      {
        reportId: createdReports[0]._id,
        title: {
          en: 'URGENT: Foot & Mouth Disease Outbreak Warning - Baramati Block',
          hi: 'अति आवश्यक: बारामती ब्लॉक में खुरपका-मुंहपका (FMD) महामारी चेतावनी'
        },
        message: {
          en: 'Active FMD cluster confirmed across Malegaon and Kathephal. Quarantine all cloven-hoofed animals. Disinfect stalls with 4% sodium carbonate. Strict ban on weekly livestock markets in Baramati.',
          hi: 'मालेगांव और काटेफल में खुरपका-मुंहपका का प्रकोप फैला है। पशुओं को अलग रखें, 4% कपड़े धोने के सोडे से गौशाला साफ करें। बारामती के साप्ताहिक पशु बाजार पर रोक।'
        },
        severity: 'Critical',
        disease: 'Foot and Mouth Disease (FMD)',
        targetVillage: 'All',
        targetBlock: 'Baramati',
        targetDistrict: 'Pune',
        issuedBy: 'Dr. Suresh Kulkarni, District Animal Husbandry Officer'
      },
      {
        reportId: createdReports[4]._id,
        title: {
          en: 'Advisory: Lumpy Skin Disease (LSD) Precautions in Shirur',
          hi: 'सलाह: शिरूर ब्लॉक में लंपी त्वचा रोग से बचाव हेतु निर्देश'
        },
        message: {
          en: 'LSD cases detected. Cattle farmers are advised to use mosquito netting, apply neem oil or insect repellents, and participate in the ongoing goat pox vaccine drive.',
          hi: 'लंपी त्वचा रोग के मामले पाए गए हैं। किसान पशुओं को कीटनाशक स्प्रे लगाएं, नीम का धुआं करें और गोट पॉक्स टीकाकरण अवश्य करवाएं।'
        },
        severity: 'High',
        disease: 'Lumpy Skin Disease (LSD)',
        targetVillage: 'Koregaon Bhima',
        targetBlock: 'Shirur',
        targetDistrict: 'Pune',
        issuedBy: 'PashuRakshak AI Surveillance System'
      },
      {
        title: {
          en: 'Pre-Monsoon Vaccination Alert: Haemorrhagic Septicaemia (Galghotu)',
          hi: 'मानसून पूर्व टीकाकरण चेतावनी: गलघोंटू (HS) रोग रोकथाम'
        },
        message: {
          en: 'Monsoon season increases susceptibility to HS in cattle and buffaloes. Ensure mandatory vaccination at your nearest Gram Panchayat dispensary before rains intensify.',
          hi: 'बरसात के मौसम में पशुओं में गलघोंटू रोग का खतरा बढ़ जाता है। बारिश शुरू होने से पहले अपने नजदीकी पशु चिकित्सालय में टीका अवश्य लगवाएं।'
        },
        severity: 'Moderate',
        disease: 'Haemorrhagic Septicaemia (HS)',
        targetVillage: 'All',
        targetBlock: 'All',
        targetDistrict: 'Pune',
        issuedBy: 'Department of Animal Husbandry, Govt of Maharashtra'
      }
    ]);

    console.log('[Seeder] Seeded Multilingual Advisories.');

    // 6. Create Vaccination Drives
    await VaccinationDrive.create([
      {
        vaccine: 'FMD (Foot and Mouth Disease)',
        targetSpecies: 'Cattle & Buffalo',
        village: 'Malegaon & Neighboring Hamlets',
        block: 'Baramati',
        district: 'Pune',
        targetCount: 5000,
        coveredCount: 3850,
        startDate: daysAgo(10),
        status: 'Active'
      },
      {
        vaccine: 'Lumpy Skin Disease (LSD)',
        targetSpecies: 'Cattle',
        village: 'Koregaon Bhima & Sanaswadi',
        block: 'Shirur',
        district: 'Pune',
        targetCount: 3500,
        coveredCount: 2900,
        startDate: daysAgo(15),
        status: 'Active'
      },
      {
        vaccine: 'Haemorrhagic Septicaemia (HS)',
        targetSpecies: 'Cattle & Buffalo',
        village: 'Chakan & Rajgurunagar',
        block: 'Khed',
        district: 'Pune',
        targetCount: 4000,
        coveredCount: 1650,
        startDate: daysAgo(5),
        status: 'Active'
      },
      {
        vaccine: 'PPR (Goat Plague)',
        targetSpecies: 'Goat & Sheep',
        village: 'Nimgaon Rural',
        block: 'Indapur',
        district: 'Pune',
        targetCount: 2500,
        coveredCount: 2150,
        startDate: daysAgo(20),
        status: 'Active'
      }
    ]);

    console.log('[Seeder] Seeded Vaccination Drives.');
    console.log('[Seeder] ===============================================');
    console.log('[Seeder] DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('[Seeder] ===============================================');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]:', error);
    process.exit(1);
  }
}

seedDatabase();
