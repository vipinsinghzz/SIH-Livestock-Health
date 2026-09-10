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
      },
      {
        name: 'Dr. Rajesh Shinde',
        role: 'field_worker',
        email: 'vet2@pashurakshak.in',
        phone: '+919822088990',
        passwordHash: vetPasswordHash,
        village: 'Shirur Town',
        block: 'Shirur',
        district: 'Pune',
        registrationNo: 'MAH-VET-2024-9182',
        department: 'Department of Animal Husbandry, Maharashtra',
        preferredLanguage: 'mr'
      }
    ]);

    const [farmer1, vetUser, officerUser, farmer2, farmer3, vetUser2] = users;
    console.log(`[Seeder] Seeded ${users.length} users.`);

    // 2. Create Livestock Profiles with Comprehensive Vaccination Schedules
    const now = Date.now();
    const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000);
    const daysFromNow = (d) => new Date(now + d * 24 * 60 * 60 * 1000);

    const animals = await Animal.create([
      {
        tagId: 'MH-12-P-1001',
        name: 'Lakshmi (लक्ष्मी)',
        species: 'Cattle',
        breed: 'Gir Cow',
        age: 4,
        gender: 'Female',
        healthStatus: 'Healthy',
        milkYieldDaily: '14.5 L',
        lastCheckup: '28 Aug 2026',
        ownerId: farmer1._id,
        village: 'Malegaon Bk',
        block: 'Baramati',
        district: 'Pune',
        vaccinations: [
          { name: 'FMD (खुरपका-मुंहपका)', date: daysAgo(170), nextDue: daysFromNow(10), status: 'Completed', camp: 'Baramati Polyclinic' },
          { name: 'LSD (लम्पी त्वचा रोग)', date: daysAgo(340), nextDue: daysFromNow(25), status: 'Completed', camp: 'Gram Panchayat Camp' },
          { name: 'Brucellosis (ब्रूसीलोसिस)', date: daysAgo(60), nextDue: daysFromNow(120), status: 'Completed', camp: 'Dorlewadi Sub-Center' }
        ],
        vaccinationHistory: [
          { vaccine: 'FMD', date: daysAgo(170), nextDue: daysFromNow(10), dose: 'Booster Dose', batchNumber: 'FMD-2026-01', administeredBy: 'Dr. Ananya Deshmukh', camp: 'Baramati Polyclinic' },
          { vaccine: 'LSD', date: daysAgo(340), nextDue: daysFromNow(25), dose: 'Annual Dose', batchNumber: 'LSD-2025-99', administeredBy: 'Dr. Suresh Patil', camp: 'Gram Panchayat Camp' }
        ],
        treatmentHistory: [
          { condition: 'Mild Mastitis', date: daysAgo(120), treatment: 'Intramammary antibiotic infusion' }
        ],
        timeline: [
          { type: 'Health Check', title: 'Routine Health Checkup', date: '28 Aug 2026', doctor: 'Dr. Ananya Deshmukh', notes: 'Normal vitals, healthy rumen motility' },
          { type: 'Vaccination', title: 'FMD Booster Dose', date: '15 Jun 2026', doctor: 'Baramati Veterinary Camp', notes: 'Given subcutaneously, no adverse reaction' }
        ]
      },
      {
        tagId: 'MH-12-P-1002',
        name: 'Gauri (गौरी)',
        species: 'Buffalo',
        breed: 'Murrah',
        age: 5,
        gender: 'Female',
        healthStatus: 'Needs Attention',
        milkYieldDaily: '11.0 L',
        lastCheckup: '02 Sep 2026',
        ownerId: farmer1._id,
        village: 'Malegaon Bk',
        block: 'Baramati',
        district: 'Pune',
        vaccinations: [
          { name: 'HS (गलघोंटू)', date: daysAgo(175), nextDue: daysFromNow(5), status: 'Completed', camp: 'Jalochi Sub-Centre' },
          { name: 'FMD (खुरपका-मुंहपका)', date: daysAgo(190), nextDue: daysAgo(8), status: 'Overdue', camp: 'Malegaon Camp' }
        ],
        vaccinationHistory: [
          { vaccine: 'HS', date: daysAgo(175), nextDue: daysFromNow(5), dose: 'Annual Booster', batchNumber: 'HS-2026-ALUM', administeredBy: 'Dr. Ananya Deshmukh', camp: 'Jalochi Sub-Centre' }
        ],
        timeline: [
          { type: 'Health Check', title: 'Mild Udder Warmth Noticed', date: '02 Sep 2026', doctor: 'Dr. Suresh Patil', notes: 'Early mastitis suspected, milk test recommended' }
        ]
      },
      {
        tagId: 'MH-12-P-1003',
        name: 'Kalyani (कल्याणी)',
        species: 'Cattle',
        breed: 'Crossbred HF',
        age: 3,
        gender: 'Female',
        healthStatus: 'Healthy',
        milkYieldDaily: '16.0 L',
        lastCheckup: '15 Aug 2026',
        ownerId: farmer1._id,
        village: 'Malegaon Bk',
        block: 'Baramati',
        district: 'Pune',
        vaccinations: [
          { name: 'FMD (खुरपका-मुंहपका)', date: daysAgo(160), nextDue: daysFromNow(20), status: 'Completed', camp: 'Baramati Polyclinic' }
        ],
        vaccinationHistory: [
          { vaccine: 'FMD', date: daysAgo(160), nextDue: daysFromNow(20), dose: 'Primary Dose', batchNumber: 'FMD-2026-03', administeredBy: 'Dr. Ananya Deshmukh', camp: 'Baramati Polyclinic' }
        ],
        timeline: [
          { type: 'Milk Production', title: 'Peak Lactation Recorded', date: '15 Aug 2026', notes: '16 Liters per day' }
        ]
      },
      {
        tagId: 'MH-12-P-2001',
        name: 'Chotu (छोटू)',
        species: 'Goat',
        breed: 'Osmanabadi',
        age: 2,
        gender: 'Male',
        healthStatus: 'Healthy',
        milkYieldDaily: 'N/A',
        lastCheckup: '20 Aug 2026',
        ownerId: farmer2._id,
        village: 'Koregaon Bhima',
        block: 'Shirur',
        district: 'Pune',
        vaccinations: [
          { name: 'PPR (बकरी प्लेग)', date: daysAgo(300), nextDue: daysFromNow(65), status: 'Completed', camp: 'Shirur Breeding Centre' }
        ],
        vaccinationHistory: [
          { vaccine: 'PPR', date: daysAgo(300), nextDue: daysFromNow(65), dose: 'Annual Dose', batchNumber: 'PPR-2025-01', administeredBy: 'Dr. Suresh Kulkarni', camp: 'Shirur Breeding Centre' }
        ],
        timeline: [
          { type: 'Vaccination', title: 'PPR Annual Dose', date: '12 Sep 2025', notes: 'Administered at Shirur camp' }
        ]
      },
      {
        tagId: 'MH-12-P-2002',
        name: 'Moti (मोती)',
        species: 'Cattle',
        breed: 'Khillari Bull',
        age: 6,
        gender: 'Male',
        healthStatus: 'Healthy',
        milkYieldDaily: 'N/A',
        lastCheckup: '10 Aug 2026',
        ownerId: farmer2._id,
        village: 'Koregaon Bhima',
        block: 'Shirur',
        district: 'Pune',
        vaccinations: [
          { name: 'FMD (खुरपका-मुंहपका)', date: daysAgo(175), nextDue: daysFromNow(5), status: 'Completed', camp: 'Shirur Clinic' }
        ],
        vaccinationHistory: [
          { vaccine: 'FMD', date: daysAgo(175), nextDue: daysFromNow(5), dose: 'Booster Dose', batchNumber: 'FMD-2026-07', administeredBy: 'Dr. Ananya Deshmukh', camp: 'Shirur Clinic' }
        ],
        timeline: [
          { type: 'Health Check', title: 'Pre-breeding fitness evaluation', date: '10 Aug 2026', doctor: 'Dr. Ananya Deshmukh', notes: 'Healthy muscular bull' }
        ]
      },
      {
        tagId: 'MH-12-P-3001',
        name: 'Radha (राधा)',
        species: 'Cattle',
        breed: 'Dangi Cow',
        age: 3,
        gender: 'Female',
        healthStatus: 'Healthy',
        milkYieldDaily: '9.5 L',
        lastCheckup: '01 Sep 2026',
        ownerId: farmer3._id,
        village: 'Chakan',
        block: 'Khed',
        district: 'Pune',
        vaccinations: [
          { name: 'HS (गलघोंटू)', date: daysAgo(180), nextDue: daysFromNow(2), status: 'Completed', camp: 'Khed Taluka Hospital' }
        ],
        vaccinationHistory: [
          { vaccine: 'HS', date: daysAgo(180), nextDue: daysFromNow(2), dose: 'Booster Dose', batchNumber: 'HS-2026-91', administeredBy: 'Dr. Ananya Deshmukh', camp: 'Khed Taluka Hospital' }
        ],
        timeline: [
          { type: 'Health Check', title: 'General Inspection', date: '01 Sep 2026', notes: 'Healthy condition' }
        ]
      }
    ]);

    console.log(`[Seeder] Seeded ${animals.length} livestock profiles.`);

    // 3. Create Sample Reports and AI Triage Results
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

    // 6. Create Vaccination Drives & Camps (SIH PS-128)
    await VaccinationDrive.create([
      {
        campId: 'CAMP-FMD-01',
        vaccine: 'FMD',
        vaccineFullName: 'Foot and Mouth Disease (FMD)',
        targetSpecies: 'Cattle & Buffalo',
        village: 'Malegaon Bk',
        venue: 'Primary Veterinary Dispensary, Malegaon Bk',
        block: 'Baramati',
        district: 'Pune',
        coordinates: { lat: 18.1517, lng: 74.5772 },
        organizingHospital: 'Baramati Veterinary Polyclinic',
        assignedOfficer: 'Dr. Ananya Deshmukh',
        assignedOfficerId: vetUser._id,
        capacity: 250,
        targetCount: 250,
        bookedSlots: 38,
        remainingSlots: 212,
        coveredCount: 38,
        campDate: daysFromNow(3),
        startDate: daysFromNow(3),
        startTime: '10:00 AM',
        endTime: '04:00 PM',
        cost: 'Free (Govt Drive)',
        isFree: true,
        contactNumber: '1962',
        status: 'Upcoming',
        notes: 'Annual FMD ring vaccination camp for Baramati cluster.'
      },
      {
        campId: 'CAMP-LSD-02',
        vaccine: 'LSD',
        vaccineFullName: 'Lumpy Skin Disease (LSD)',
        targetSpecies: 'Cattle',
        village: 'Kathephal',
        venue: 'Gram Panchayat Veterinary Clinic, Kathephal',
        block: 'Baramati',
        district: 'Pune',
        coordinates: { lat: 18.1632, lng: 74.5885 },
        organizingHospital: 'National Livestock Mission (NLM)',
        assignedOfficer: 'Dr. Suresh Kulkarni',
        assignedOfficerId: officerUser._id,
        capacity: 200,
        targetCount: 200,
        bookedSlots: 45,
        remainingSlots: 155,
        coveredCount: 45,
        campDate: daysFromNow(6),
        startDate: daysFromNow(6),
        startTime: '09:30 AM',
        endTime: '02:30 PM',
        cost: 'Free (Govt Drive)',
        isFree: true,
        contactNumber: '1962',
        status: 'Upcoming',
        notes: 'Preventive Goat Pox homologous vaccine for LSD prevention.'
      },
      {
        campId: 'CAMP-HS-03',
        vaccine: 'HS',
        vaccineFullName: 'Hemorrhagic Septicemia (HS)',
        targetSpecies: 'Cattle & Buffalo',
        village: 'Jalochi',
        venue: 'Animal Health Sub-Centre, Jalochi',
        block: 'Baramati',
        district: 'Pune',
        coordinates: { lat: 18.1401, lng: 74.561 },
        organizingHospital: 'District Animal Husbandry Office, Pune',
        assignedOfficer: 'Dr. Ananya Deshmukh',
        assignedOfficerId: vetUser._id,
        capacity: 200,
        targetCount: 200,
        bookedSlots: 60,
        remainingSlots: 140,
        coveredCount: 60,
        campDate: daysFromNow(9),
        startDate: daysFromNow(9),
        startTime: '09:00 AM',
        endTime: '03:00 PM',
        cost: 'Free (Govt Drive)',
        isFree: true,
        contactNumber: '1962',
        status: 'Upcoming',
        notes: 'Pre-monsoon booster drive for Haemorrhagic Septicaemia.'
      },
      {
        campId: 'CAMP-BQ-04',
        vaccine: 'BQ',
        vaccineFullName: 'Black Quarter (BQ)',
        targetSpecies: 'Cattle & Buffalo',
        village: 'Baramati Town',
        venue: 'Taluka Veterinary Polyclinic, Baramati',
        block: 'Baramati',
        district: 'Pune',
        coordinates: { lat: 18.155, lng: 74.58 },
        organizingHospital: 'Baramati Taluka Hospital',
        assignedOfficer: 'Dr. Ananya Deshmukh',
        assignedOfficerId: vetUser._id,
        capacity: 150,
        targetCount: 150,
        bookedSlots: 42,
        remainingSlots: 108,
        coveredCount: 42,
        campDate: daysFromNow(1),
        startDate: daysFromNow(1),
        startTime: '10:00 AM',
        endTime: '03:30 PM',
        cost: 'Free (Govt Drive)',
        isFree: true,
        contactNumber: '1962',
        status: 'Ongoing',
        notes: 'Active spot vaccination camp for young stock.'
      },
      {
        campId: 'CAMP-BRUC-05',
        vaccine: 'Brucellosis',
        vaccineFullName: 'Brucellosis (Calfhood S19)',
        targetSpecies: 'Female Calves (Cattle & Buffalo)',
        village: 'Dorlewadi',
        venue: 'Veterinary Sub-Center, Dorlewadi',
        block: 'Baramati',
        district: 'Pune',
        coordinates: { lat: 18.17, lng: 74.59 },
        organizingHospital: 'National Animal Disease Control Programme',
        assignedOfficer: 'Dr. Suresh Kulkarni',
        assignedOfficerId: officerUser._id,
        capacity: 100,
        targetCount: 100,
        bookedSlots: 18,
        remainingSlots: 82,
        coveredCount: 18,
        campDate: daysFromNow(15),
        startDate: daysFromNow(15),
        startTime: '10:30 AM',
        endTime: '02:00 PM',
        cost: 'Free (Govt Drive)',
        isFree: true,
        contactNumber: '1962',
        status: 'Upcoming',
        notes: 'Calfhood vaccination for 4-8 month female calves.'
      },
      {
        campId: 'CAMP-PPR-06',
        vaccine: 'PPR',
        vaccineFullName: 'Peste des Petits Ruminants (PPR)',
        targetSpecies: 'Goat & Sheep',
        village: 'Koregaon Bhima',
        venue: 'Sheep & Goat Breeding Centre, Shirur',
        block: 'Shirur',
        district: 'Pune',
        coordinates: { lat: 18.8276, lng: 74.3774 },
        organizingHospital: 'Maharashtra Sheep & Goat Dev Corporation',
        assignedOfficer: 'Dr. Suresh Kulkarni',
        assignedOfficerId: officerUser._id,
        capacity: 300,
        targetCount: 300,
        bookedSlots: 75,
        remainingSlots: 225,
        coveredCount: 75,
        campDate: daysFromNow(19),
        startDate: daysFromNow(19),
        startTime: '09:00 AM',
        endTime: '01:00 PM',
        cost: 'Free (Govt Drive)',
        isFree: true,
        contactNumber: '1962',
        status: 'Upcoming',
        notes: 'Targeted mass flock vaccination for small ruminants.'
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
