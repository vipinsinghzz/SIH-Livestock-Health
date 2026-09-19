/**
 * Livestock Saathi - Vaccination & Preventive Health Types
 * File: mobile/src/types/vaccination.ts
 * 
 * Accurately models the production backend VaccinationDrive, Advisory, and Animal vaccination schemas.
 */

import { Animal, VaccinationRecord } from './animal';

export type VaccinationStatus = 'Completed' | 'Scheduled' | 'Overdue';

export interface EnrichedVaccinationItem extends VaccinationRecord {
  id: string;
  animalId: string;
  animalName: string;
  tagId: string;
  species: string;
  computedStatus: VaccinationStatus;
}

export interface VaccinationDrive {
  _id: string;
  campId?: string;
  state: string;
  district: string;
  block: string;
  village: string;
  venue: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  vaccine: string;
  vaccineFullName?: string;
  targetSpecies?: string;
  campDate: string;
  startTime?: string;
  endTime?: string;
  cost?: string;
  isFree?: boolean;
  organizingHospital: string;
  assignedOfficer: string;
  contactNumber?: string;
  capacity: number;
  bookedSlots: number;
  remainingSlots: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Scheduled' | 'Active';
  distanceKm?: number | null;
  coveragePercentage?: number;
}

export interface CampRegistration {
  campId?: string;
  driveId?: string;
  vaccine: string;
  vaccineFullName?: string;
  venue: string;
  village: string;
  block: string;
  district: string;
  campDate: string;
  startTime?: string;
  endTime?: string;
  assignedOfficer?: string;
  token: string;
  animalCount: number;
  animalIds?: string[];
  registeredAt: string;
  status?: string;
}

export interface PreventiveAdvisory {
  _id: string;
  title: string | { en?: string; hi?: string };
  message: string | { en?: string; hi?: string };
  severity?: 'Low' | 'Moderate' | 'High' | 'Critical';
  disease?: string;
  targetVillage?: string;
  targetBlock?: string;
  targetDistrict?: string;
  createdAt?: string;
}

export interface VaccinationSummaryMetrics {
  due: number;
  overdue: number;
  upcoming: number;
  completed: number;
  allRecords: EnrichedVaccinationItem[];
}

export type VaccinationFilter = 'All' | 'Due' | 'Overdue' | 'Upcoming' | 'Completed';

/**
 * Normalizes and computes authoritative vaccination metrics across the farmer's herd.
 * Shared between Farmer Dashboard and Farmer Vaccination Home to guarantee 100% numerical consistency.
 */
export function calculateVaccinationMetrics(animals: Animal[] = []): VaccinationSummaryMetrics {
  let dueCount = 0;
  let overdueCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;
  const allRecords: EnrichedVaccinationItem[] = [];

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  animals.forEach((animal) => {
    const rawList = [
      ...(animal.vaccinations || []).map((v) => ({
        vaccine: (v as any).name || v.vaccine || 'Routine Vaccination',
        date: v.date,
        nextDue: v.nextDue,
        status: v.status,
        batchNumber: v.batchNumber,
        camp: v.camp,
        dose: v.dose,
        administeredBy: v.administeredBy,
        notes: v.notes,
      })),
      ...(animal.vaccinationHistory || []),
    ];

    rawList.forEach((rec, idx) => {
      let computedStatus: VaccinationStatus = 'Completed';

      if (rec.status === 'Overdue') {
        computedStatus = 'Overdue';
      } else if (rec.status === 'Scheduled') {
        computedStatus = 'Scheduled';
      }

      let isDueSoon = false;
      let isOverdueByDate = false;
      let isUpcomingByDate = false;

      if (rec.nextDue) {
        const nextTime = new Date(rec.nextDue).getTime();
        if (!isNaN(nextTime)) {
          if (nextTime < now) {
            isOverdueByDate = true;
            computedStatus = 'Overdue';
          } else if (nextTime <= now + thirtyDaysMs) {
            isDueSoon = true;
            if (computedStatus !== 'Overdue') {
              computedStatus = 'Scheduled';
            }
          } else {
            isUpcomingByDate = true;
            if (computedStatus !== 'Overdue' && computedStatus !== 'Scheduled') {
              computedStatus = 'Scheduled';
            }
          }
        }
      }

      if (computedStatus === 'Overdue' || isOverdueByDate) {
        overdueCount += 1;
      } else if (isDueSoon || rec.status === 'Scheduled') {
        dueCount += 1;
      } else if (isUpcomingByDate) {
        upcomingCount += 1;
      } else if (rec.status === 'Completed' || (!rec.nextDue && rec.date)) {
        completedCount += 1;
      }

      const uniqueId = `${animal._id || animal.id || 'anim'}-${rec.vaccine}-${idx}`;

      allRecords.push({
        ...rec,
        id: uniqueId,
        animalId: animal._id || animal.id || '',
        animalName: animal.name || animal.tagId || 'Unnamed Animal',
        tagId: animal.tagId || 'N/A',
        species: animal.species || 'Livestock',
        computedStatus,
      });
    });
  });

  return {
    due: dueCount,
    overdue: overdueCount,
    upcoming: upcomingCount,
    completed: completedCount,
    allRecords,
  };
}

// ============================================================================
// Phase 10.3: Mass Vaccination Campaign Governance Types
// ============================================================================

export interface CreateVaccinationDrivePayload {
  vaccine: string;
  vaccineFullName?: string;
  targetSpecies?: string;
  village: string;
  block: string;
  district?: string;
  state?: string;
  venue?: string;
  capacity?: number;
  targetCount?: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  cost?: string;
  notes?: string;
}

export interface CreateVaccinationDriveResponse {
  success: boolean;
  message: string;
  drive: VaccinationDrive;
}

export interface UpdateVaccinationDrivePayload {
  coveredCount?: number;
  incrementCoveredBy?: number;
  status?: 'Upcoming' | 'Ongoing' | 'Completed';
}

export interface UpdateVaccinationDriveResponse {
  success: boolean;
  message: string;
  drive: VaccinationDrive;
}

