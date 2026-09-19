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
