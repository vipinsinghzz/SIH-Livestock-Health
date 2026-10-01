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
    id: 'camp-lsd-nag-sao',
    vaccineName: 'LSD',
    fullNameEn: 'Lumpy Skin Disease (LSD) Ring Vaccination',
    fullNameHi: 'लम्पी त्वचा रोग रिंग टीकाकरण',
    fullNameMr: 'लंपी त्वचा रोग रिंग लसीकरण',
    dateEn: '15 Oct 2026 • 09:00 AM - 03:30 PM',
    dateHi: '15 अक्टूबर 2026 • सुबह 09:00 से दोपहर 03:30',
    dateMr: '१५ ऑक्टोबर २०२६ • सकाळी ०९:०० ते दुपारी ०३:३०',
    villageEn: 'Taluka Veterinary Polyclinic, Saoner',
    villageHi: 'तालुका पशु चिकित्सालय, सावनेर',
    villageMr: 'तालुका पशुवैद्यकीय सर्वचिकित्सालय, सावनेर',
    block: 'Saoner',
    district: 'Nagpur',
    lat: 21.3833,
    lng: 78.9167,
    targetAnimalsEn: 'Cattle & Buffalo',
    targetAnimalsHi: 'गाय एवं भैंस',
    targetAnimalsMr: 'गाय आणि म्हैस',
    costEn: 'Free (Govt Emergency Drive)',
    costHi: 'निःशुल्क (सरकारी आपातकालीन अभियान)',
    costMr: 'मोफत (शासकीय आपत्कालीन मोहीम)',
    isFree: true,
    organizerEn: 'District Animal Husbandry Office, Nagpur (Ring Taskforce)',
    organizerHi: 'जिला पशुपालन कार्यालय, नागपुर',
    organizerMr: 'जिल्हा पशुसंवर्धन कार्यालय, नागपूर',
    remainingSlots: 145,
  },
  {
    id: 'camp-fmd-nag-kam',
    vaccineName: 'FMD',
    fullNameEn: 'Foot and Mouth Disease (FMD - NADCP Phase IV)',
    fullNameHi: 'खुरपका-मुंहपका (NADCP चरण IV)',
    fullNameMr: 'लाळ-खुरकूत (NADCP टप्पा IV)',
    dateEn: '18 Oct 2026 • 09:30 AM - 04:00 PM',
    dateHi: '18 अक्टूबर 2026 • सुबह 09:30 से शाम 04:00',
    dateMr: '१८ ऑक्टोबर २०२६ • सकाळी ०९:३० ते दुपारी ०४:००',
    villageEn: 'Primary Veterinary Dispensary, Yerkheda, Kamptee',
    villageHi: 'प्राथमिक पशु चिकित्सा केंद्र, येरखेड़ा, कामठी',
    villageMr: 'प्राथमिक पशुवैद्यकीय दवाखाना, येरखेडा, कामठी',
    block: 'Kamptee',
    district: 'Nagpur',
    lat: 21.2227,
    lng: 79.1977,
    targetAnimalsEn: 'Cattle & Buffalo',
    targetAnimalsHi: 'गाय एवं भैंस',
    targetAnimalsMr: 'गाय आणि म्हैस',
    costEn: 'Free (NADCP Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'Dept of Animal Husbandry, Maharashtra & Zilla Parishad Nagpur',
    organizerHi: 'पशुपालन विभाग, महाराष्ट्र शासन व जिला परिषद नागपुर',
    organizerMr: 'पशुसंवर्धन विभाग, महाराष्ट्र शासन व जिल्हा परिषद नागपूर',
    remainingSlots: 92,
  },
  {
    id: 'camp-hs-nag-hin',
    vaccineName: 'HS',
    fullNameEn: 'Hemorrhagic Septicemia (HS) Pre-Monsoon Booster',
    fullNameHi: 'गलघोंटू रोग प्रतिरक्षण',
    fullNameMr: 'घटसर्प प्रतिबंधक लसीकरण',
    dateEn: '22 Oct 2026 • 09:00 AM - 02:30 PM',
    dateHi: '22 अक्टूबर 2026 • सुबह 09:00 से दोपहर 02:30',
    dateMr: '२२ ऑक्टोबर २०२६ • सकाळी ०९:०० ते दुपारी ०२:३०',
    villageEn: 'Veterinary Dispensary, Takalghat, Hingna',
    villageHi: 'पशु चिकित्सालय, टाकळघाट, हिंगणा',
    villageMr: 'पशुवैद्यकीय दवाखाना, टाकळघाट, हिंगणा',
    block: 'Hingna',
    district: 'Nagpur',
    lat: 20.9786,
    lng: 78.9632,
    targetAnimalsEn: 'Cattle & Buffalo',
    targetAnimalsHi: 'गाय एवं भैंस',
    targetAnimalsMr: 'गाय आणि म्हैस',
    costEn: 'Free (Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'Zilla Parishad Animal Husbandry Division, Nagpur',
    organizerHi: 'जिला परिषद पशुपालन प्रभाग, नागपुर',
    organizerMr: 'जिल्हा परिषद पशुसंवर्धन विभाग, नागपूर',
    remainingSlots: 68,
  },
  {
    id: 'camp-ppr-nag-ram',
    vaccineName: 'PPR',
    fullNameEn: 'Peste des Petits Ruminants (PPR Goat Plague)',
    fullNameHi: 'बकरी प्लेग (PPR) सुरक्षा अभियान',
    fullNameMr: 'शेळी-मेंढी प्लेग (PPR) सुरक्षा मोहीम',
    dateEn: '25 Oct 2026 • 10:00 AM - 03:00 PM',
    dateHi: '25 अक्टूबर 2026 • सुबह 10:00 से दोपहर 03:00',
    dateMr: '२५ ऑक्टोबर २०२६ • सकाळी १०:०० ते दुपारी ०३:००',
    villageEn: 'Veterinary Aid Centre, Mansar, Ramtek',
    villageHi: 'पशु सहायता केंद्र, मनसर, रामटेक',
    villageMr: 'पशुवैद्यकीय सहाय्य केंद्र, मनसर, रामटेक',
    block: 'Ramtek',
    district: 'Nagpur',
    lat: 21.3986,
    lng: 79.3288,
    targetAnimalsEn: 'Goat & Sheep',
    targetAnimalsHi: 'बकरी एवं भेड़',
    targetAnimalsMr: 'शेळी आणि मेंढी',
    costEn: 'Free (Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'Maharashtra Sheep & Goat Dev Corporation, Nagpur',
    organizerHi: 'महाराष्ट्र मेंढी व शेळी विकास महामंडळ, नागपुर',
    organizerMr: 'महाराष्ट्र मेंढी व शेळी विकास महामंडळ, नागपूर',
    remainingSlots: 110,
  },
  {
    id: 'camp-bq-nag-kal',
    vaccineName: 'BQ',
    fullNameEn: 'Black Quarter (BQ) Prevention Camp',
    fullNameHi: 'लंगड़ा बुखार (फऱ्या) टीकाकरण',
    fullNameMr: 'फऱ्या रोग प्रतिबंधक शिबिर',
    dateEn: '28 Oct 2026 • 10:00 AM - 03:00 PM',
    dateHi: '28 अक्टूबर 2026 • सुबह 10:00 से दोपहर 03:00',
    dateMr: '२८ ऑक्टोबर २०२६ • सकाळी १०:०० ते दुपारी ०३:००',
    villageEn: 'Veterinary Dispensary, Kalmeshwar Market Yard',
    villageHi: 'पशु चिकित्सालय, कलमेश्वर',
    villageMr: 'पशुवैद्यकीय दवाखाना, कळमेश्वर बाजार समिती',
    block: 'Kalmeshwar',
    district: 'Nagpur',
    lat: 21.2333,
    lng: 78.9167,
    targetAnimalsEn: 'Cattle & Buffalo',
    targetAnimalsHi: 'गाय एवं भैंस',
    targetAnimalsMr: 'गाय आणि म्हैस',
    costEn: 'Free (Govt Drive)',
    costHi: 'निःशुल्क (सरकारी अभियान)',
    costMr: 'मोफत (शासकीय मोहीम)',
    isFree: true,
    organizerEn: 'District Animal Husbandry Office, Nagpur',
    organizerHi: 'जिला पशुपालन कार्यालय, नागपुर',
    organizerMr: 'जिल्हा पशुसंवर्धन कार्यालय, नागपूर',
    remainingSlots: 85,
  },
];

// Default demo herd for zero-state onboarding (matching web Nagpur herd)
export const DEFAULT_HERD: Animal[] = [
  {
    _id: 'anim-gauri-nag',
    id: 'anim-gauri-nag',
    tagId: 'NG-COW-101',
    name: 'Gauri',
    species: 'Cattle',
    breed: 'Gaolao Cattle',
    age: 3,
    gender: 'Female',
    healthStatus: 'Healthy',
    village: 'Yerkheda',
    block: 'Kamptee',
    district: 'Nagpur',
    vaccinations: [
      { vaccine: 'FMD (Foot and Mouth Disease)', date: '2026-03-15', nextDue: '2026-09-15', status: 'Completed' },
      { vaccine: 'LSD (Lumpy Skin Disease)', date: '2026-04-10', nextDue: '2026-10-10', status: 'Due Soon' },
    ],
    vaccinationHistory: [
      {
        vaccine: 'FMD (Foot and Mouth Disease)',
        date: '2026-03-15',
        nextDue: '2026-09-15',
        dose: 'Primary Dose',
        batchNumber: 'FMD-2026-NG01',
        administeredBy: 'Dr. Rajesh Patil',
        camp: 'Kamptee Veterinary Camp',
      },
    ],
  },
  {
    _id: 'anim-surabhi-nag',
    id: 'anim-surabhi-nag',
    tagId: 'NG-COW-102',
    name: 'Surabhi',
    species: 'Cattle',
    breed: 'Gir Cow',
    age: 4,
    gender: 'Female',
    healthStatus: 'Healthy',
    village: 'Saoner Rural',
    block: 'Saoner',
    district: 'Nagpur',
    vaccinations: [
      { vaccine: 'LSD (Lumpy Skin Disease)', date: '2026-02-20', nextDue: '2026-10-20', status: 'Completed' },
      { vaccine: 'HS (Hemorrhagic Septicemia)', date: '2026-05-12', nextDue: '2026-11-12', status: 'Completed' },
    ],
    vaccinationHistory: [
      {
        vaccine: 'LSD (Lumpy Skin Disease)',
        date: '2026-02-20',
        nextDue: '2026-10-20',
        dose: 'Annual Booster',
        batchNumber: 'LSD-2026-NG88',
        administeredBy: 'Dr. Amit Deshmukh',
        camp: 'Saoner Polyclinic Ring Camp',
      },
    ],
  },
  {
    _id: 'anim-kalu-nag',
    id: 'anim-kalu-nag',
    tagId: 'NG-GOAT-201',
    name: 'Kalu',
    species: 'Goat',
    breed: 'Berari Goat',
    age: 2,
    gender: 'Male',
    healthStatus: 'Healthy',
    village: 'Takalghat',
    block: 'Hingna',
    district: 'Nagpur',
    vaccinations: [
      { vaccine: 'PPR (Peste des Petits Ruminants)', date: '2026-04-05', nextDue: '2026-10-05', status: 'Due Soon' },
    ],
    vaccinationHistory: [
      {
        vaccine: 'PPR (Peste des Petits Ruminants)',
        date: '2026-04-05',
        nextDue: '2026-10-05',
        dose: 'Primary Dose',
        batchNumber: 'PPR-2026-NG44',
        administeredBy: 'Dr. Sneha Kulkarni',
        camp: 'Hingna Dispensary Camp',
      },
    ],
  },
];
