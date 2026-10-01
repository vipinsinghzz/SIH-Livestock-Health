/**
 * PashuCare - Outbreak Surveillance, Containment & Ring Vaccination Types
 * File: mobile/src/types/containment.ts
 * 
 * Production domain models and payload contracts strictly matching the backend schema
 * for quarantine containment perimeters, PostGIS outbreak clusters, and ring vaccination.
 */

export type ContainmentZoneStatus = 'ACTIVE' | 'CONTAINED' | 'LIFTED';

export interface ContainmentCoordinates {
  lat: number;
  lng: number;
}

export interface ContainmentZone {
  id: string;
  _id?: string;
  zoneId: string;
  caseId?: string;
  case_id?: string;
  disease: string;
  district: string;
  block?: string;
  village?: string;
  center?: ContainmentCoordinates;
  centerLat?: number;
  centerLng?: number;
  radiusKm: number;
  radius_km?: number;
  status: ContainmentZoneStatus;
  enforcedRules?: string[];
  enforced_rules?: string[];
  createdByVetId?: string;
  created_by_vet_id?: string;
  creatorName?: string;
  creator_name?: string;
  ringVaccinationDriveId?: string;
  ring_vaccination_drive_id?: string;
  notes?: string;
  containedAt?: string;
  contained_at?: string;
  liftedAt?: string;
  lifted_at?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface OutbreakCluster {
  clusterId?: string;
  id?: string;
  disease: string;
  count: number;
  caseCount?: number;
  centroidLat?: number;
  centroidLng?: number;
  radiusKm?: number;
  isOutbreak?: boolean;
  risk?: 'Critical' | 'High' | 'Moderate' | 'Low' | string;
  riskTier?: string;
  village?: string;
  district?: string;
  cases?: Array<{
    id?: string;
    caseId?: string;
    disease?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

export interface CreateContainmentZonePayload {
  caseId?: string;
  disease: string;
  district?: string;
  block?: string;
  village?: string;
  center: ContainmentCoordinates;
  radiusKm?: number;
  enforcedRules?: string[];
  notes?: string;
}

export interface UpdateContainmentZonePayload {
  status: ContainmentZoneStatus;
  notes?: string;
}

export interface ScheduleRingVaccinationPayload {
  campDate?: string;
  venue?: string;
  capacity?: number;
  notes?: string;
}

export interface RingVaccinationResult {
  success: boolean;
  message: string;
  drive?: any;
  case?: any;
}

export interface OutbreakAdvisorySummary {
  activeCasesCount: number;
  totalAnimalsAffected: number;
  activeContainmentZones: number;
  topDiseases: Array<{ name: string; count: number }>;
}

export interface OutbreakRecommendation {
  disease: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | string;
  protocol: string;
  actions: string[];
}

export interface OutbreakAdvisoryResponse {
  success: boolean;
  district: string;
  summary: OutbreakAdvisorySummary;
  recommendations: OutbreakRecommendation[];
  generatedAt: string;
}

export interface ContainmentStatusTheme {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getContainmentStatusTheme(status?: string): ContainmentStatusTheme {
  const norm = String(status || 'ACTIVE').toUpperCase().trim();
  switch (norm) {
    case 'ACTIVE':
      return {
        label: 'ACTIVE QUARANTINE',
        color: '#DC2626', // red-600
        bgColor: '#FEF2F2', // red-50
        borderColor: '#FECACA', // red-200
      };
    case 'CONTAINED':
      return {
        label: 'CONTAINED',
        color: '#D97706', // amber-600
        bgColor: '#FFFBEB', // amber-50
        borderColor: '#FDE68A', // amber-200
      };
    case 'LIFTED':
      return {
        label: 'QUARANTINE LIFTED',
        color: '#059669', // emerald-600
        bgColor: '#ECFDF5', // emerald-50
        borderColor: '#A7F3D0', // emerald-200
      };
    default:
      return {
        label: norm,
        color: '#475569',
        bgColor: '#F1F5F9',
        borderColor: '#CBD5E1',
      };
  }
}

export const DEFAULT_CONTAINMENT_RULES = [
  'Strict quarantine of affected livestock within perimeter',
  'Ban on animal movement, livestock trade, and cattle markets',
  'Daily disinfectant spraying of barns and watering troughs',
  'Immediate ring vaccination within containment buffer'
];
