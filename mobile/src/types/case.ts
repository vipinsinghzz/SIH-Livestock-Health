/**
 * Livestock Saathi - Case & Disease Tracking Types
 * File: mobile/src/types/case.ts
 * 
 * Accurately models the production backend DiseaseCase schema from backend/models/DiseaseCase.js.
 */

export type CaseStatus =
  | 'New'
  | 'Investigating'
  | 'Confirmed'
  | 'Containment'
  | 'Resolved'
  | 'OPEN'
  | 'ACCEPTED'
  | 'IN_TREATMENT'
  | 'RESOLVED';

export type NormalizedCaseStatus =
  | 'New'
  | 'Investigating'
  | 'Confirmed'
  | 'Containment'
  | 'Resolved';

export type CaseRisk = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface CaseTimelineEvent {
  status?: string;
  updatedBy?: string | { _id: string; name?: string; role?: string };
  updaterName?: string;
  timestamp?: string;
  notes?: string;
}

export interface PopulatedVet {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  registrationNo?: string;
  department?: string;
  district?: string;
  block?: string;
  role?: string;
}

export interface PopulatedAnimal {
  _id: string;
  tagId?: string;
  name?: string;
  species?: string;
  breed?: string;
  age?: number;
  gender?: string;
}

export interface PopulatedFarmer {
  _id: string;
  name?: string;
  phone?: string;
  village?: string;
  block?: string;
  district?: string;
}

export interface DiseaseCase {
  _id: string;
  id?: string;
  caseId: string;
  isPendingSync?: boolean;
  farmerId?: PopulatedFarmer | string;
  animalId?: PopulatedAnimal | null;
  animalName?: string;
  species?: string;
  image?: string;
  disease: string;
  confidence?: number;
  risk?: CaseRisk;
  districtId?: string;
  state?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  farmerLocation?: {
    village?: string;
    block?: string;
    district?: string;
    state?: string;
  };
  farmerContact?: {
    name?: string;
    phone?: string;
  };
  symptoms?: string[];
  /** Body temperature (natively Celsius, e.g. 39.5°C; Fahrenheit converted if > 45) */
  temperature?: number;
  /** Duration of symptoms (natively Hours, e.g. 24, 48) */
  duration?: number;
  affectedCount?: number;
  notes?: string;
  clinicalDiagnosis?: string;
  investigationNotes?: string;
  status: CaseStatus;
  containmentZoneId?: any;
  ringVaccinationDriveId?: any;
  assignedVetId?: PopulatedVet | null;
  notifiedVets?: Array<{
    vetId?: string;
    name?: string;
    phone?: string;
    notifiedAt?: string;
    deliveryStatus?: string;
    channel?: string;
    error?: string;
  }>;
  acceptedAt?: string | null;
  confirmedAt?: string | null;
  containmentStartedAt?: string | null;
  treatmentStartedAt?: string | null;
  resolvedAt?: string | null;
  treatmentNotes?: string;
  prescription?: string;
  timeline?: CaseTimelineEvent[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCaseInput {
  animalId?: string | null;
  animalName?: string;
  species?: string;
  image?: string;
  disease: string;
  confidence?: number;
  risk?: CaseRisk | string;
  coordinates?: { lat: number; lng: number };
  symptoms?: string[];
  temperature?: number;
  duration?: number;
  affectedCount?: number;
  notes?: string;
  village?: string;
  block?: string;
  district?: string;
}

export interface CaseListResponse {
  success: boolean;
  count: number;
  cases: DiseaseCase[];
}

export interface CaseDetailResponse {
  success: boolean;
  case: DiseaseCase;
}

export interface CreateCaseResponse {
  success: boolean;
  message: string;
  case: DiseaseCase;
  /** True when the backend reused an existing active case (duplicate protection) */
  reused?: boolean;
  matchingVetsCount?: number;
  matchingVets?: Array<{ id: string; name: string; role: string }>;
}

export type CaseFilter = 'All' | 'New' | 'Investigating' | 'Confirmed' | 'Containment' | 'Resolved' | 'HighRisk';

/**
 * Normalizes production status values to canonical 5-stage lifecycle:
 * New -> Investigating -> Confirmed -> Containment -> Resolved
 */
export function normalizeCaseStatus(status?: string): NormalizedCaseStatus {
  if (!status) return 'New';
  const upper = status.toUpperCase().trim();
  if (upper === 'NEW' || upper === 'OPEN') return 'New';
  if (upper === 'INVESTIGATING' || upper === 'ACCEPTED') return 'Investigating';
  if (upper === 'CONTAINMENT' || upper === 'IN_TREATMENT') return 'Containment';
  if (upper === 'RESOLVED' || upper === 'CLOSED') return 'Resolved';
  if (upper === 'CONFIRMED') return 'Confirmed';
  return 'New';
}

/**
 * Returns color tokens and icons for normalized case statuses
 */
export function getStatusTheme(status?: string): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
} {
  const norm = normalizeCaseStatus(status);
  switch (norm) {
    case 'New':
      return {
        label: 'New Referral',
        color: '#2563EB',
        bgColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        icon: '🆕',
      };
    case 'Investigating':
      return {
        label: 'Investigating',
        color: '#D97706',
        bgColor: '#FFFBEB',
        borderColor: '#FDE68A',
        icon: '🔍',
      };
    case 'Confirmed':
      return {
        label: 'Confirmed',
        color: '#DC2626',
        bgColor: '#FEF2F2',
        borderColor: '#FECACA',
        icon: '⚠️',
      };
    case 'Containment':
      return {
        label: 'Containment',
        color: '#7C3AED',
        bgColor: '#F5F3FF',
        borderColor: '#DDD6FE',
        icon: '🛡️',
      };
    case 'Resolved':
      return {
        label: 'Resolved',
        color: '#16A34A',
        bgColor: '#F0FDF4',
        borderColor: '#BBF7D0',
        icon: '✅',
      };
    default:
      return {
        label: status || 'Pending',
        color: '#4B5563',
        bgColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        icon: '📋',
      };
  }
}

/**
 * Returns color tokens for risk levels
 */
export function getRiskTheme(risk?: string): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const norm = (risk || 'MODERATE').toUpperCase().trim();
  switch (norm) {
    case 'CRITICAL':
      return {
        label: 'Critical Risk',
        color: '#991B1B',
        bgColor: '#FEE2E2',
        borderColor: '#F87171',
      };
    case 'HIGH':
      return {
        label: 'High Risk',
        color: '#C2410C',
        bgColor: '#FFEDD5',
        borderColor: '#FDBA74',
      };
    case 'MODERATE':
      return {
        label: 'Moderate Risk',
        color: '#D97706',
        bgColor: '#FEF3C7',
        borderColor: '#FCD34D',
      };
    case 'LOW':
      return {
        label: 'Low Risk',
        color: '#15803D',
        bgColor: '#DCFCE7',
        borderColor: '#86EFAC',
      };
    default:
      return {
        label: risk || 'Moderate',
        color: '#4B5563',
        bgColor: '#F3F4F6',
        borderColor: '#E5E7EB',
      };
  }
}

/**
 * Returns numeric priority for disease case criticality:
 * 0: Critical (highest urgency)
 * 1: High Risk / High-mortality diseases (FMD, Anthrax, Blackleg, HS, etc.)
 * 2: Moderate Risk (Lumpy, Pox, Mastitis, Mange, Brucellosis, etc.)
 * 3: Intermediate / Unspecified
 * 4: Low Risk / Normal / Healthy observations (lowest urgency)
 */
export function getCaseCriticalityPriority(c: DiseaseCase): number {
  const r = (c.risk || '').toUpperCase().trim();
  const d = (c.disease || '').toLowerCase();

  // Explicit Critical
  if (r === 'CRITICAL' || d.includes('critical')) return 0;

  // High Risk or dangerous epidemic conditions
  if (
    r === 'HIGH' ||
    d.includes('anthrax') ||
    d.includes('fmd') ||
    d.includes('foot and mouth') ||
    d.includes('hemorrhagic') ||
    d.includes('blackleg') ||
    d.includes('enterotoxemia')
  ) {
    return 1;
  }

  // Moderate Risk
  if (
    r === 'MODERATE' ||
    r === 'MEDIUM' ||
    d.includes('lumpy') ||
    d.includes('pox') ||
    d.includes('mastitis') ||
    d.includes('mange') ||
    d.includes('orf') ||
    d.includes('brucellosis')
  ) {
    return 2;
  }

  // Low Risk or Healthy / Normal observations
  if (r === 'LOW' || d.includes('healthy') || d.includes('normal')) {
    return 4;
  }

  return 3;
}

/**
 * Sorts disease cases by criticality in descending urgency (Critical first, Healthy last)
 */
export function sortCasesByCriticality(caseList: DiseaseCase[]): DiseaseCase[] {
  return [...caseList].sort((a, b) => {
    const pA = getCaseCriticalityPriority(a);
    const pB = getCaseCriticalityPriority(b);

    if (pA !== pB) {
      return pA - pB;
    }

    // Secondary tie-breaker: newest first
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateB !== dateA && !isNaN(dateB) && !isNaN(dateA)) {
      return dateB - dateA;
    }

    return (a.caseId || '').localeCompare(b.caseId || '');
  });
}

