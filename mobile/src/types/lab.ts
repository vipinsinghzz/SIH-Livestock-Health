/**
 * Livestock Saathi - Diagnostic Laboratory Domain Types
 * File: mobile/src/types/lab.ts
 * 
 * Production types representing laboratory sample referrals, diagnostic tracking,
 * and result confirmation derived strictly from the backend API schema.
 */

export type LabReferralStatus =
  | 'Collected'
  | 'In Transit'
  | 'Received'
  | 'Result Pending'
  | 'Result Confirmed';

export type LabSampleType =
  | 'Blood / Serum'
  | 'Nasal / Oral Swab'
  | 'Vesicular Fluid'
  | 'Skin Lesion / Scab'
  | 'Milk Sample'
  | 'Tissue Sample'
  | 'Fecal Sample'
  | 'Other';

export const SAMPLE_TYPES: LabSampleType[] = [
  'Blood / Serum',
  'Nasal / Oral Swab',
  'Vesicular Fluid',
  'Skin Lesion / Scab',
  'Milk Sample',
  'Tissue Sample',
  'Fecal Sample',
  'Other'
];

export const DESTINATION_LABS: string[] = [
  'District Disease Diagnostic Laboratory (DDDL), Pune',
  'Western Regional Disease Diagnostic Laboratory (WRDDL), Pune',
  'State Veterinary Diagnostic Institute, Aundh, Pune',
  'ICAR-National Institute of High Security Animal Diseases (NIHSAD)'
];

export interface LabResultSummary {
  confirmedDisease?: string;
  notes?: string;
  confirmedDate?: string;
}

export interface LabReferralReport {
  id?: string;
  caseId?: string;
  case_id?: string;
  animalId?: string;
  animal_id?: string;
  animalTag?: string;
  species?: string;
  symptoms?: string[];
  village?: string;
  block?: string;
  district?: string;
  notes?: string;
  status?: string;
}

export interface LabReferralCollector {
  id?: string;
  name?: string;
  phone?: string;
  role?: string;
}

export interface LabReferral {
  id: string;
  _id?: string;
  reportId?: string;
  report_id?: string;
  sampleType: string;
  sample_type?: string;
  collectionDate: string;
  collection_date?: string;
  referredLab: string;
  referred_lab?: string;
  status: LabReferralStatus | string;
  collectedBy?: string;
  collected_by?: string;
  resultSummary?: LabResultSummary;
  result_summary?: LabResultSummary;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  report?: LabReferralReport;
  collector?: LabReferralCollector;
}

export interface CreateLabReferralPayload {
  caseId?: string;
  reportId?: string;
  sampleType: string;
  referredLab?: string;
  notes?: string;
  collectionDate?: string;
}

export interface UpdateLabReferralPayload {
  status?: LabReferralStatus | string;
  confirmedDisease?: string;
  notes?: string;
}

export interface LabStatusTheme {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  stepIndex: number;
}

export function getLabStatusTheme(status?: string): LabStatusTheme {
  const norm = String(status || 'Collected').trim();

  switch (norm) {
    case 'Collected':
      return {
        label: 'Collected',
        color: '#0369A1', // blue-700
        bgColor: '#E0F2FE', // blue-50
        borderColor: '#BAE6FD',
        stepIndex: 0
      };
    case 'In Transit':
      return {
        label: 'In Transit',
        color: '#D97706', // amber-600
        bgColor: '#FEF3C7', // amber-50
        borderColor: '#FDE68A',
        stepIndex: 1
      };
    case 'Received':
      return {
        label: 'Received at Lab',
        color: '#7C3AED', // purple-600
        bgColor: '#F5F3FF', // purple-50
        borderColor: '#DDD6FE',
        stepIndex: 2
      };
    case 'Result Pending':
    case 'Testing':
      return {
        label: 'Testing Underway',
        color: '#C026D3', // fuchsia-600
        bgColor: '#FDF4FF', // fuchsia-50
        borderColor: '#F5D0FE',
        stepIndex: 3
      };
    case 'Result Confirmed':
    case 'Confirmed':
      return {
        label: 'Result Confirmed',
        color: '#059669', // emerald-600
        bgColor: '#ECFDF5', // emerald-50
        borderColor: '#A7F3D0',
        stepIndex: 4
      };
    default:
      return {
        label: norm,
        color: '#475569',
        bgColor: '#F1F5F9',
        borderColor: '#CBD5E1',
        stepIndex: 0
      };
  }
}
