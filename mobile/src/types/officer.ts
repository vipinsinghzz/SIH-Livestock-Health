/**
 * Livestock Saathi - Officer Executive Surveillance & KPI Types
 * File: mobile/src/types/officer.ts
 *
 * Production domain models matching the backend contracts for:
 * - GET /api/dashboard/summary
 * - GET /api/dashboard/trends
 */

export interface TriageMetrics {
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  outbreakCount: number;
}

export interface DiseaseBreakdownItem {
  name: string;
  cases: number;
  avgConfidencePct: number;
}

export interface StatusFunnel {
  Reported?: number;
  Triaged?: number;
  'Field Verified'?: number;
  Escalated?: number;
  Contained?: number;
  Closed?: number;
  [key: string]: number | undefined;
}

export interface BlockDistributionItem {
  _id: string; // Block name (e.g., "Baramati", "Shirur", "Haveli")
  count: number;
  deaths: number;
}

export interface VaccinationSummary {
  totalTarget: number;
  totalCovered: number;
  coveragePct: number;
}

export interface LabPipeline {
  [status: string]: number;
}

export interface DashboardSummary {
  totalReports: number;
  activeCases: number;
  containedCases: number;
  totalMortality: number;
  totalAffected: number;
  triageMetrics: TriageMetrics;
  diseaseBreakdown: DiseaseBreakdownItem[];
  statusFunnel: StatusFunnel;
  blockDistribution: BlockDistributionItem[];
  vaccination: VaccinationSummary;
  labPipeline: LabPipeline;
}

export interface TrendPoint {
  date: string;
  displayDate: string;
  cases: number;
  mortalities: number;
  criticalCases: number;
  outbreaks: number;
}

export interface DashboardSummaryResponse {
  success: boolean;
  data: DashboardSummary;
}

export interface DashboardTrendsResponse {
  success: boolean;
  data: TrendPoint[];
}

export interface OfficerDashboardFilters {
  district?: string;
  block?: string;
}

export interface CachedOfficerDashboard {
  summary: DashboardSummary;
  lastUpdated: number;
  district: string;
  block: string;
}

export interface CachedOfficerTrends {
  trends: TrendPoint[];
  lastUpdated: number;
  district: string;
  block: string;
}

export interface GetDashboardSummaryResult {
  summary: DashboardSummary;
  fromCache: boolean;
  lastUpdated: number | null;
}

export interface GetDashboardTrendsResult {
  trends: TrendPoint[];
  fromCache: boolean;
  lastUpdated: number | null;
}

// ============================================================================
// Phase 10.2: Spatial Outbreak Surveillance & GIS Types
// ============================================================================

export interface OfficerRiskFactor {
  factor: string;
  points: number;
  rationale: string;
}

export interface OfficerRiskRecommendation {
  recommended?: boolean;
  suggestedRadiusKm?: number;
  quarantineAdvised?: boolean;
  movementRestriction?: string;
  ringVaccinationAdvised?: boolean;
  targetRadiusKm?: number;
  priority?: string;
}

export interface OfficerRiskAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  factors: OfficerRiskFactor[];
  containmentRecommendation: {
    recommended: boolean;
    suggestedRadiusKm: number;
    quarantineAdvised: boolean;
    movementRestriction: string;
  };
  vaccinationRecommendation: {
    ringVaccinationAdvised: boolean;
    targetRadiusKm: number;
    priority: string;
  };
  disclaimer: string;
}

export interface OfficerNearbyCasesSummary {
  totalInRadius: number;
  insideContainment: boolean;
  vaccinationCoveragePct: number | null;
}

export interface OfficerRiskAnalysisResponse {
  success: boolean;
  district: string;
  coordinates: { lat: number; lng: number };
  riskAnalysis: OfficerRiskAnalysis;
  nearbyCasesSummary: OfficerNearbyCasesSummary;
}

export interface OfficerNearbyCase {
  id: string;
  caseId: string;
  disease: string;
  species: string;
  risk: string;
  status: string;
  affectedCount: number;
  latitude: number;
  longitude: number;
  district: string;
  village: string;
  block?: string;
  confidence?: number;
  distanceKm: number;
  createdAt: string;
  isFuzzed?: boolean;
}

export interface OfficerNearbyCasesResponse {
  success: boolean;
  count: number;
  radiusKm: number;
  days: number;
  cases: OfficerNearbyCase[];
}

export type OfficerMapLayer = 'containment' | 'clusters' | 'cases';

