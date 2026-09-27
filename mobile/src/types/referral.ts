/**
 * Livestock Saathi - Veterinarian Referral & Triage Queue Types
 * File: mobile/src/types/referral.ts
 */

import { DiseaseCase } from './case';

export type ReferralFilterType =
  | 'all'
  | 'New'
  | 'Investigating'
  | 'Confirmed'
  | 'Containment'
  | 'Resolved'
  | 'my_cases';

export interface ReferralQueueState {
  filter: ReferralFilterType;
  district: string;
  cases: DiseaseCase[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  isOffline: boolean;
}

/**
 * Evaluates whether a case is unassigned and available to be claimed by a veterinarian
 */
export function isCaseClaimable(c: DiseaseCase): boolean {
  if (!c) return false;
  const s = String(c.status || '').toUpperCase();
  if (s !== 'NEW' && s !== 'OPEN') return false;
  // If assignedVetId is already present, it is not claimable
  if (c.assignedVetId || (c as any).assignedVet) return false;
  return true;
}

/**
 * Checks whether a case is assigned to the specified veterinarian
 */
export function isCaseAssignedToVet(c: DiseaseCase, vetId?: string): boolean {
  if (!c || !vetId) return false;
  const targetId = String(vetId).trim();

  // Check populated assignedVetId
  if (typeof c.assignedVetId === 'object' && c.assignedVetId !== null) {
    const aid = String((c.assignedVetId as any).id || (c.assignedVetId as any)._id || '').trim();
    if (aid === targetId) return true;
  } else if (c.assignedVetId) {
    if (String(c.assignedVetId).trim() === targetId) return true;
  }

  // Check assignedVet property if present
  if (typeof (c as any).assignedVet === 'object' && (c as any).assignedVet !== null) {
    const aid = String((c as any).assignedVet.id || (c as any).assignedVet._id || '').trim();
    if (aid === targetId) return true;
  } else if ((c as any).assignedVet) {
    if (String((c as any).assignedVet).trim() === targetId) return true;
  }

  return false;
}
