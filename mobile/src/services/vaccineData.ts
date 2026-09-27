/**
 * Livestock Saathi - Indian Livestock Vaccines Data & Geodesic Tools
 * File: mobile/src/services/vaccineData.ts
 * 
 * Source of truth matching web VaccinationPage.jsx & vaccineData.js:
 * - Haversine distance calculator for veterinary camps
 * - SIH PS-128 Government Vaccination Drives repository
 * - Standard herd demo data for seamless initial onboarding
 * - Next due date calculator (+6m for FMD, +12m for others)
 */

import { Animal } from '../types/animal';

export interface FormattedVaccinationCamp {
  id: string;
  campId?: string;
  vaccineName: string;
  fullNameEn: string;
  fullNameHi: string;
  fullNameMr: string;
  dateEn: string;
  dateHi: string;
  dateMr: string;
  villageEn: string;
  villageHi: string;
  villageMr: string;
  block: string;
  district?: string;
  state?: string;
  lat: number;
  lng: number;
  targetAnimalsEn: string;
  targetAnimalsHi: string;
  targetAnimalsMr: string;
  costEn: string;
  costHi: string;
  costMr: string;
  isFree: boolean;
  organizerEn: string;
  organizerHi: string;
  organizerMr: string;
  remainingSlots: number;
  distanceKm: number;
  contactNumber?: string;
  assignedOfficer?: string;
  status?: string;
}

// Haversine formula for distance in km
export function calculateDistance(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Calculate next due date (+6 months for FMD, +1 year for others)
export function calculateNextBoosterDate(vaccineName: string, fromDate: Date = new Date()): Date {
  const nextDate = new Date(fromDate);
  if (vaccineName.toUpperCase().includes('FMD')) {
    nextDate.setMonth(nextDate.getMonth() + 6);
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  return nextDate;
}

export const VACCINE_FILTER_OPTIONS = [
  'All',
  'FMD',
  'LSD',
  'HS',
  'BQ',
  'Brucellosis',
  'PPR',
] as const;

export type VaccineFilterType = typeof VACCINE_FILTER_OPTIONS[number];

export const RADIUS_FILTER_OPTIONS = [5, 10, 20, 'all'] as const;

export type RadiusFilterType = typeof RADIUS_FILTER_OPTIONS[number];

// Upcoming vaccination camps data (SIH PS-128 Source of Truth)
export const INITIAL_CAMPS_DATA: Omit<FormattedVaccinationCamp, 'distanceKm'>[] = [
  {
    id: 'camp-fmd-1',
    vaccineName: 'FMD',
    fullNameEn: 'Foot and Mouth Disease (FMD)',
    fullNameHi: 'खुरपका-मुंहपका',
    fullNameMr: 'लाळ-खुरकूत',
    dateEn: '12 Sept 2026 • 10:00 AM - 04:00 PM',
    dateHi: '12 सितम्बर 2026 • सुबह 10:00 से शाम 04:00',
    dateMr: '१२ सप्टेंबर २०२६ • सकाळी १०:०० ते दुपारी ०४:००',
    villageEn: 'Primary Veterinary Dispensary, Malegaon Bk',
    villageHi: 'प्राथमिक पशु चिकित्सालय, मालेगांव बुद्रुक',
    villageMr: 'प्राथमिक पशुवैद्यकीय दवाखाना, माळेगाव बु.',
    block: 'Baramati',
    lat: 18.1517,
    lng: 74.5772,
    targetAnimalsEn: 'Cattle & Buffalo',
    targetAnimalsHi: 'गाय एवं भैंस',
    targetAnimalsMr: 'गाय आणि म्हैस',
    costEn: 'Free (Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'Dept of Animal Husbandry, Maharashtra (NADCP)',
    organizerHi: 'पशुपालन विभाग, महाराष्ट्र शासन (NADCP)',
    organizerMr: 'पशुसंवर्धन विभाग, महाराष्ट्र शासन (NADCP)',
    remainingSlots: 48,
  },
  {
    id: 'camp-lsd-2',
    vaccineName: 'LSD',
    fullNameEn: 'Lumpy Skin Disease (LSD)',
    fullNameHi: 'लम्पी त्वचा रोग',
    fullNameMr: 'लंपी त्वचा रोग',
    dateEn: '15 Sept 2026 • 09:30 AM - 02:30 PM',
    dateHi: '15 सितम्बर 2026 • सुबह 09:30 से दोपहर 02:30',
    dateMr: '१५ सप्टेंबर २०२६ • सकाळी ०९:३० ते दुपारी ०२:३०',
    villageEn: 'Gram Panchayat Veterinary Clinic, Kathephal',
    villageHi: 'ग्राम पंचायत पशु चिकित्सा केंद्र, काटेफळ',
    villageMr: 'ग्रामपंचायत पशुवैद्यकीय केंद्र, काटेफळ',
    block: 'Baramati',
    lat: 18.1632,
    lng: 74.5885,
    targetAnimalsEn: 'Cattle',
    targetAnimalsHi: 'गाय एवं गोवंश',
    targetAnimalsMr: 'गाय आणि गोवंश',
    costEn: 'Free (Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'National Livestock Mission (NLM)',
    organizerHi: 'राष्ट्रीय पशुधन मिशन',
    organizerMr: 'राष्ट्रीय पशुधन मिशन',
    remainingSlots: 32,
  },
  {
    id: 'camp-hs-3',
    vaccineName: 'HS',
    fullNameEn: 'Hemorrhagic Septicemia (HS)',
    fullNameHi: 'गलघोंटू रोग',
    fullNameMr: 'घटसर्प रोग',
    dateEn: '18 Sept 2026 • 09:00 AM - 03:00 PM',
    dateHi: '18 सितम्बर 2026 • सुबह 09:00 से दोपहर 03:00',
    dateMr: '१८ सप्टेंबर २०२६ • सकाळी ०९:०० ते दुपारी ०३:००',
    villageEn: 'Animal Health Sub-Centre, Jalochi',
    villageHi: 'पशु स्वास्थ्य उपकेंद्र, जलोची',
    villageMr: 'पशु आरोग्य उपकेंद्र, जलोची',
    block: 'Baramati',
    lat: 18.1401,
    lng: 74.561,
    targetAnimalsEn: 'Cattle & Buffalo',
    targetAnimalsHi: 'गाय एवं भैंस',
    targetAnimalsMr: 'गाय आणि म्हैस',
    costEn: 'Free (Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'District Animal Husbandry Office, Pune',
    organizerHi: 'जिला पशुपालन कार्यालय, पुणे',
    organizerMr: 'जिल्हा पशुसंवर्धन कार्यालय, पुणे',
    remainingSlots: 60,
  },
  {
    id: 'camp-bq-4',
    vaccineName: 'BQ',
    fullNameEn: 'Black Quarter (BQ)',
    fullNameHi: 'लंगड़ा बुखार',
    fullNameMr: 'फऱ्या रोग',
    dateEn: '21 Sept 2026 • 10:00 AM - 03:30 PM',
    dateHi: '21 सितम्बर 2026 • सुबह 10:00 से दोपहर 03:30',
    dateMr: '२१ सप्टेंबर २०२६ • सकाळी १०:०० ते दुपारी ०३:३०',
    villageEn: 'Taluka Veterinary Polyclinic, Baramati',
    villageHi: 'तालुका पशु चिकित्सालय, बारामती',
    villageMr: 'तालुका पशुवैद्यकीय सर्वचिकित्सालय, बारामती',
    block: 'Baramati',
    lat: 18.155,
    lng: 74.58,
    targetAnimalsEn: 'Cattle & Buffalo',
    targetAnimalsHi: 'गाय एवं भैंस',
    targetAnimalsMr: 'गाय आणि म्हैस',
    costEn: 'Free (Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'Zilla Parishad Pune',
    organizerHi: 'जिला परिषद पुणे',
    organizerMr: 'जिल्हा परिषद पुणे',
    remainingSlots: 25,
  },
  {
    id: 'camp-bruc-5',
    vaccineName: 'Brucellosis',
    fullNameEn: 'Brucellosis (Calfhood S19)',
    fullNameHi: 'ब्रुसेलोसिस (बछड़ा टीकाकरण)',
    fullNameMr: 'ब्रुसेलोसिस (वासरांचे लसीकरण)',
    dateEn: '24 Sept 2026 • 10:30 AM - 02:00 PM',
    dateHi: '24 सितम्बर 2026 • सुबह 10:30 से दोपहर 02:00',
    dateMr: '२४ सप्टेंबर २०२६ • सकाळी १०:३० ते दुपारी ०२:००',
    villageEn: 'Veterinary Sub-Center, Dorlewadi',
    villageHi: 'पशु उपकेंद्र, दोर्लेवाडी',
    villageMr: 'पशुवैद्यकीय उपकेंद्र, दोर्लेवाडी',
    block: 'Baramati',
    lat: 18.17,
    lng: 74.59,
    targetAnimalsEn: 'Female Calves (Cattle & Buffalo)',
    targetAnimalsHi: 'मादा बछिया (गोवंश एवं भैंस)',
    targetAnimalsMr: 'मादी वासरे (गाय आणि म्हैस)',
    costEn: 'Free (Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'National Animal Disease Control Programme',
    organizerHi: 'राष्ट्रीय पशु रोग नियंत्रण कार्यक्रम',
    organizerMr: 'राष्ट्रीय पशु रोग नियंत्रण कार्यक्रम',
    remainingSlots: 18,
  },
  {
    id: 'camp-ppr-6',
    vaccineName: 'PPR',
    fullNameEn: 'Peste des Petits Ruminants (PPR)',
    fullNameHi: 'बकरी प्लेग (PPR)',
    fullNameMr: 'शेळी प्लेग (PPR)',
    dateEn: '28 Sept 2026 • 09:00 AM - 01:00 PM',
    dateHi: '28 सितम्बर 2026 • सुबह 09:00 से दोपहर 01:00',
    dateMr: '२८ सप्टेंबर २०२६ • सकाळी ०९:०० ते दुपारी ०१:००',
    villageEn: 'Sheep & Goat Breeding Centre, Shirur',
    villageHi: 'भेड़-बकरी प्रजनन विकास केंद्र, शिरूर',
    villageMr: 'मेंढी व शेळी विकास केंद्र, शिरूर',
    block: 'Shirur',
    lat: 18.8276,
    lng: 74.3774,
    targetAnimalsEn: 'Goat & Sheep',
    targetAnimalsHi: 'बकरी एवं भेड़',
    targetAnimalsMr: 'शेळी आणि मेंढी',
    costEn: 'Free (Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'Maharashtra Sheep & Goat Dev Corporation',
    organizerHi: 'महाराष्ट्र मेंढी व शेळी विकास महामंडळ',
    organizerMr: 'महाराष्ट्र मेंढी व शेळी विकास महामंडळ',
    remainingSlots: 75,
  },
];

// Default demo herd for zero-state onboarding (matching web)
export const DEFAULT_HERD: Animal[] = [
  {
    _id: 'anim-tommy',
    id: 'anim-tommy',
    tagId: 'MH-12-P-1092',
    name: 'Tommy',
    species: 'Cattle',
    breed: 'Gir Cow',
    age: 3,
    gender: 'Female',
    healthStatus: 'Healthy',
    vaccinations: [
      { vaccine: 'FMD (Foot and Mouth Disease)', date: '2026-03-15', nextDue: '2026-09-15', status: 'Completed' },
      { vaccine: 'HS (Hemorrhagic Septicemia)', date: '2026-05-10', nextDue: '2026-11-10', status: 'Completed' },
    ],
    vaccinationHistory: [
      {
        vaccine: 'FMD (Foot and Mouth Disease)',
        date: '2026-03-15',
        nextDue: '2026-09-15',
        dose: 'Primary Dose',
        batchNumber: 'FMD-2026-01',
        administeredBy: 'Dr. R. K. Shinde',
        camp: 'Baramati Veterinary Camp',
      },
    ],
  },
  {
    _id: 'anim-lakshmi',
    id: 'anim-lakshmi',
    tagId: 'MH-12-P-1093',
    name: 'Lakshmi',
    species: 'Cattle',
    breed: 'Sahiwal',
    age: 4,
    gender: 'Female',
    healthStatus: 'Healthy',
    vaccinations: [
      { vaccine: 'LSD (Lumpy Skin Disease)', date: '2026-02-20', nextDue: '2026-09-20', status: 'Completed' },
    ],
    vaccinationHistory: [
      {
        vaccine: 'LSD (Lumpy Skin Disease)',
        date: '2026-02-20',
        nextDue: '2026-09-20',
        dose: 'Annual Booster',
        batchNumber: 'LSD-2026-88',
        administeredBy: 'Dr. Suresh Patil',
        camp: 'Malegaon Sub-Centre',
      },
    ],
  },
];
