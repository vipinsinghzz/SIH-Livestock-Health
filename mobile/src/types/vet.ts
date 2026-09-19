/**
 * Livestock Saathi - Veterinarian Domain Types
 * File: mobile/src/types/vet.ts
 * 
 * Production types representing veterinarian profiles, clinical dashboard metrics,
 * and case claim results derived strictly from the backend API contracts.
 */

import { DiseaseCase } from './case';

export interface VeterinarianProfile {
  id: string;
  _id?: string;
  auth_user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'veterinarian' | 'field_worker';
  district?: string;
  state?: string;
  village?: string;
  block?: string;
  registrationNo?: string;
  department?: string;
  location?: {
    lat: number;
    lng: number;
  };
  preferredLanguage?: string;
}

export interface VetDashboardMetrics {
  newReferralsCount: number;
  investigatingCount: number;
  myCasesCount: number;
  confirmedCount: number;
  containmentCount: number;
  resolvedCount: number;
  totalRecentCases: number;
  sampleWindowLimit: number;
  sampleWindowNote: string;
}

export interface ClaimCaseResult {
  success: boolean;
  message: string;
  case?: DiseaseCase;
  alreadyClaimed?: boolean;
  assignedVet?: {
    id?: string;
    _id?: string;
    name?: string;
  };
  status?: string;
}
