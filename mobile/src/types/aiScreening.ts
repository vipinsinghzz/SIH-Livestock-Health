/**
 * PashuCare - AI Screening Types & Symptom Dictionary
 * File: mobile/src/types/aiScreening.ts
 * 
 * Strict TypeScript definitions modeling the production AI screening
 * payload and multimodal fusion response from lsd_model.keras + Clinical Engine.
 */

import { AnimalSpecies } from './animal';

export interface SymptomTag {
  id: string;
  labelEn: string;
  nameEn: string;
  labelHi: string;
  labelMr?: string;
}

export const SYMPTOMS_27: SymptomTag[] = [
  { id: 'skin_nodules', labelEn: 'Skin nodules', nameEn: 'Skin nodules (LSD lesions)', labelHi: 'त्वचा पर गांठें', labelMr: 'त्वचेवर गाठी' },
  { id: 'high_fever', labelEn: 'High fever (>39.5°C)', nameEn: 'High fever', labelHi: 'तेज बुखार', labelMr: 'तीव्र ताप' },
  { id: 'reduced_milk_yield', labelEn: 'Reduced milk yield', nameEn: 'Sudden drop in milk', labelHi: 'दूध में अचानक गिरावट', labelMr: 'दूध उत्पादनात घट' },
  { id: 'nasal_discharge', labelEn: 'Nasal discharge', nameEn: 'Mucous from nose', labelHi: 'नाक बहना', labelMr: 'नाकातून स्त्राव' },
  { id: 'eye_discharge', labelEn: 'Eye discharge', nameEn: 'Watery/pus discharge from eyes', labelHi: 'आंखों से कीचड़ या पानी', labelMr: 'डोळ्यांतून पाणी किंवा पू' },
  { id: 'drooling', labelEn: 'Excess drooling', nameEn: 'Salivation / drooling', labelHi: 'मुंह से लार गिरना', labelMr: 'लाळ गळणे' },
  { id: 'mouth_lesions', labelEn: 'Mouth lesions', nameEn: 'Blisters/lesions in mouth', labelHi: 'मुंह में छाले', labelMr: 'तोंडात फोड' },
  { id: 'foot_lesions', labelEn: 'Foot lesions', nameEn: 'Hoof blisters / lesions', labelHi: 'खुर में छाले व घाव', labelMr: 'खुरांमध्ये जखमा किंवा फोड' },
  { id: 'lameness', labelEn: 'Lameness', nameEn: 'Difficulty walking / limp', labelHi: 'लंगड़ापन', labelMr: 'लंगडणे' },
  { id: 'low_appetite', labelEn: 'Low appetite', nameEn: 'Refusing feed', labelHi: 'चारा न खाना', labelMr: 'चारा न खाणे' },
  { id: 'lethargy', labelEn: 'Lethargy & weakness', nameEn: 'Weak / inactive', labelHi: 'सुस्ती व कमजोरी', labelMr: 'सुस्ती व अशक्तपणा' },
  { id: 'cough', labelEn: 'Cough', nameEn: 'Persistent cough', labelHi: 'खांसी', labelMr: 'खोकला' },
  { id: 'difficulty_breathing', labelEn: 'Difficulty breathing', nameEn: 'Labored / rapid respiration', labelHi: 'सांस में तकलीफ', labelMr: 'श्वास घेण्यास त्रास' },
  { id: 'swelling_neck', labelEn: 'Swelling in neck', nameEn: 'Throat/brisket swelling', labelHi: 'गले व गर्दन में सूजन', labelMr: 'मानेला सूज' },
  { id: 'joint_swelling', labelEn: 'Joint swelling', nameEn: 'Swollen legs / joints', labelHi: 'जोड़ों में सूजन', labelMr: 'सांध्यांना सूज' },
  { id: 'skin_pustules', labelEn: 'Skin pustules', nameEn: 'Ruptured pus sores', labelHi: 'त्वचा पर फफोले व मवाद', labelMr: 'त्वचेवर फोड व पू' },
  { id: 'diarrhea', labelEn: 'Diarrhea', nameEn: 'Watery stool', labelHi: 'दस्त', labelMr: 'जुलाब' },
  { id: 'bloody_diarrhea', labelEn: 'Bloody diarrhea', nameEn: 'Blood in stool', labelHi: 'खूनी दस्त', labelMr: 'रक्ताचे जुलाब' },
  { id: 'blood_in_urine', labelEn: 'Blood in urine', nameEn: 'Red / dark urine', labelHi: 'पेशाब में खून', labelMr: 'लघवीमध्ये रक्त' },
  { id: 'jaundice', labelEn: 'Jaundice', nameEn: 'Yellow eyes / mucous', labelHi: 'पीलिया', labelMr: 'कावीळ' },
  { id: 'anemia', labelEn: 'Anemia / Pale body', nameEn: 'Pale eyes and gums', labelHi: 'खून की कमी', labelMr: 'रक्ताची कमतरता' },
  { id: 'pale_mucous_membranes', labelEn: 'Pale mucous membranes', nameEn: 'White/pale gums', labelHi: 'सफेद मसूड़े व आंखें', labelMr: 'पांढरे हिरडे व डोळे' },
  { id: 'fever', labelEn: 'Mild/Moderate Fever', nameEn: 'Elevated body temperature', labelHi: 'बुखार', labelMr: 'ताप' },
  { id: 'weight_loss', labelEn: 'Weight loss', nameEn: 'Rapid emaciation', labelHi: 'वजन में गिरावट', labelMr: 'वजन कमी होणे' },
  { id: 'oral_ulcers', labelEn: 'Oral ulcers', nameEn: 'Deep sores on tongue/palate', labelHi: 'मुंह में अल्सर', labelMr: 'तोंडातील व्रण' },
  { id: 'tick_infestation', labelEn: 'Tick infestation', nameEn: 'Visible external parasites', labelHi: 'चिचड़ी व किलनी', labelMr: 'गोचीड' },
  { id: 'sudden_death', labelEn: 'Sudden death in herd', nameEn: 'Unexplained livestock mortality', labelHi: 'अचानक मृत्यु', labelMr: 'अचानक मृत्यू' },
];

export interface AiScreeningRequest {
  species: AnimalSpecies;
  symptoms: string[];
  temperature?: number;
  duration?: number;
  image?: string | null; // Base64 data URL
  notes?: string;
  location?: {
    village?: string;
    block?: string;
    district?: string;
  };
}

export interface SuspectedDisease {
  name: string;
  confidenceScore: number;
  urgency: 'Critical' | 'High' | 'Moderate' | 'Low' | string;
  rationale: string;
}

export interface ClusterDetails {
  matchedCasesCount?: number;
  timeWindowDays?: number;
  block?: string;
}

export interface AiScreeningResponse {
  success: boolean;
  aiUnavailable?: boolean;
  errorType?: 'SERVICE_UNAVAILABLE' | 'TIMEOUT' | 'INFERENCE_ERROR' | string;
  message?: string;
  riskLevel: 'Critical' | 'High' | 'Moderate' | 'Low' | 'Pending' | string;
  possibleCondition: string | null;
  confidenceScore: number | null;
  visualScore: number | null;
  hasImage: boolean;
  suspectedDiseases: SuspectedDisease[];
  recommendedAction?: string;
  immediateFirstAid?: string[];
  clinicalObservations?: string[];
  outbreakFlag?: boolean;
  clusterDetails?: ClusterDetails;
  explanation?: string;
  modelVersion?: string;
  assessmentType?: string;
  disclaimer?: string;
  timestamp?: string;
}
