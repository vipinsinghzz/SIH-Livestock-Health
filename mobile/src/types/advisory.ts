/**
 * PashuCare - Official Biosecurity Advisories & NADRES Forewarning Types
 * File: mobile/src/types/advisory.ts
 *
 * Production domain models matching backend contracts for:
 * - GET /api/advisories
 * - POST /api/advisories
 * - GET /api/nadres/alerts
 * - GET /api/nadres/forewarning
 * - GET /api/nadres/trends
 * - GET /api/cases/advisories
 */

export type AdvisorySeverity = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface LocalizedText {
  en?: string;
  hi?: string;
  mr?: string;
}

export interface OfficialAdvisory {
  _id?: string;
  id: string;
  title: string | LocalizedText;
  titleEn?: string;
  titleHi?: string;
  message: string | LocalizedText;
  messageEn?: string;
  messageHi?: string;
  severity: AdvisorySeverity;
  disease?: string;
  targetVillage?: string;
  targetBlock?: string;
  targetDistrict: string;
  issuedBy?: string;
  reportId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAdvisoryPayload {
  title: string | { en: string; hi?: string };
  message: string | { en: string; hi?: string };
  severity: AdvisorySeverity;
  disease?: string;
  targetVillage?: string;
  targetBlock?: string;
  targetDistrict?: string;
}

export interface GetAdvisoriesResponse {
  success: boolean;
  count: number;
  advisories: OfficialAdvisory[];
}

export interface CreateAdvisoryResponse {
  success: boolean;
  message: string;
  advisory: OfficialAdvisory;
}

export interface GetAdvisoriesResult {
  advisories: OfficialAdvisory[];
  count: number;
  fromCache: boolean;
  lastUpdated: number | null;
}

export interface WeatherContext {
  tempC: number;
  humidityPct: number;
  condition: string;
  thi: number;
  stressLevel: string;
}

export interface NadresAlert {
  id: string;
  diseaseName: string;
  affectedDistrict: string;
  district: string;
  state: string;
  village?: string;
  block?: string;
  speciesAffected: string;
  riskLevel: 'Critical' | 'High' | 'Moderate' | 'Low' | string;
  riskBadgeEn: string;
  riskBadgeHi?: string;
  riskBadgeMr?: string;
  isOutbreak: boolean;
  outbreakFlag?: boolean;
  reportedLocation: string;
  reportedDate: string;
  reportedDateStr?: string;
  dataSource: string;
  dataSourceEn?: string;
  dataSourceHi?: string;
  dataSourceMr?: string;
  affectedCount?: number | null;
  mortalityCount?: number | null;
  symptoms?: string[];
  aiRecommendationEn?: string;
  aiRecommendationHi?: string;
  aiRecommendationMr?: string;
  weatherContext?: WeatherContext | null;
  aiModel?: string;
  isAIPowered?: boolean;
}

export interface GetNadresAlertsResponse {
  success: boolean;
  district: string;
  state: string;
  totalAlerts: number;
  alerts: NadresAlert[];
  weatherContext?: WeatherContext | null;
  dataSource?: string;
  fetchedAt?: string;
}

export interface GetNadresAlertsResult {
  alerts: NadresAlert[];
  totalAlerts: number;
  weatherContext?: WeatherContext | null;
  dataSource?: string;
  fromCache: boolean;
  lastUpdated: number | null;
}

export interface NadresForewarningDisease {
  disease_id?: number | string;
  disease_name?: string;
  diseaseName?: string;
  outcome?: string;
  risk?: string;
  species?: string;
  cattle?: number;
  buaffalo?: number;
  goat?: number;
  sheep?: number;
  poultry?: number;
  pig?: number;
}

export interface NadresForewarningResponse {
  success: boolean;
  source?: string;
  highRiskDiseases?: NadresForewarningDisease[];
  moderateRiskDiseases?: NadresForewarningDisease[];
  data?: NadresForewarningDisease[];
  [key: string]: any;
}

export interface GetNadresForewarningResult {
  forewarning: NadresForewarningResponse | null;
  fromCache: boolean;
  lastUpdated: number | null;
}

export interface NadresTrendsResponse {
  success: boolean;
  diseaseId?: number | string;
  topAffectedStates?: Array<{ state: string; count: number }>;
  [key: string]: any;
}

export interface GetNadresTrendsResult {
  trends: NadresTrendsResponse | null;
  fromCache: boolean;
  lastUpdated: number | null;
}

export interface AdvisorySeverityTheme {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getAdvisorySeverityTheme(severity?: string): AdvisorySeverityTheme {
  const norm = String(severity || 'Moderate').toLowerCase().trim();
  switch (norm) {
    case 'critical':
      return {
        label: 'CRITICAL BIOSECURITY ALERT',
        color: '#DC2626',
        bgColor: '#FEF2F2',
        borderColor: '#FECACA',
      };
    case 'high':
      return {
        label: 'HIGH RISK ADVISORY',
        color: '#EA580C',
        bgColor: '#FFF7ED',
        borderColor: '#FFEDD5',
      };
    case 'moderate':
      return {
        label: 'MODERATE PRECAUTION',
        color: '#D97706',
        bgColor: '#FFFBEB',
        borderColor: '#FEF3C7',
      };
    case 'low':
      return {
        label: 'ROUTINE SURVEILLANCE',
        color: '#2563EB',
        bgColor: '#EFF6FF',
        borderColor: '#DBEAFE',
      };
    default:
      return {
        label: (severity || 'Advisory').toUpperCase(),
        color: '#475569',
        bgColor: '#F1F5F9',
        borderColor: '#E2E8F0',
      };
  }
}
