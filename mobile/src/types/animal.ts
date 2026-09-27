/**
 * Livestock Saathi - Animal & Case Types
 * File: mobile/src/types/animal.ts
 * 
 * Accurately models the production backend schemas from Animal.js and DiseaseCase models.
 */

export type AnimalSpecies = 'Cattle' | 'Buffalo' | 'Goat' | 'Sheep' | 'Pig' | 'Poultry' | 'Other';
export type AnimalGender = 'Female' | 'Male';
export type AnimalHealthStatus = 'Healthy' | 'Needs Attention' | 'Critical';

export interface TimelineEvent {
  type: string;
  title: string;
  date: string;
  doctor?: string;
  notes?: string;
  image?: string;
  status?: string;
  disease?: string;
  confidence?: number;
  symptoms?: string[];
  advisory?: string;
  temperature?: number;
  duration?: number;
}

export interface VaccinationRecord {
  vaccine: string;
  date?: string | Date;
  nextDue?: string | Date;
  dose?: string;
  batchNumber?: string;
  administeredBy?: string;
  camp?: string;
  notes?: string;
  status?: 'Completed' | 'Scheduled' | 'Overdue';
}

export interface TreatmentRecord {
  condition: string;
  date?: string | Date;
  treatment: string;
  vetId?: string;
}

export interface Animal {
  id?: string;
  _id: string;
  tagId: string;
  name: string;
  species: AnimalSpecies;
  breed: string;
  age: number;
  gender: AnimalGender;
  healthStatus: AnimalHealthStatus;
  milkYieldDaily?: string;
  lastCheckup?: string;
  village?: string;
  block?: string;
  district?: string;
  ownerId?: string;
  timeline?: TimelineEvent[];
  vaccinationHistory?: VaccinationRecord[];
  vaccinations?: VaccinationRecord[];
  treatmentHistory?: TreatmentRecord[];
  createdAt?: string;
  updatedAt?: string;
  isPendingSync?: boolean;
}

export interface AnimalCreateInput {
  tagId?: string;
  name?: string;
  species: AnimalSpecies;
  breed?: string;
  age?: number;
  gender?: AnimalGender;
  healthStatus?: AnimalHealthStatus;
  milkYieldDaily?: string;
  village?: string;
  block?: string;
  district?: string;
}

export interface AnimalUpdateInput {
  name?: string;
  breed?: string;
  age?: number;
  gender?: AnimalGender;
  healthStatus?: AnimalHealthStatus;
  milkYieldDaily?: string;
  newTimelineEvent?: Partial<TimelineEvent>;
  newVaccination?: Partial<VaccinationRecord>;
  newTreatment?: Partial<TreatmentRecord>;
  vaccinationHistory?: VaccinationRecord[];
  timeline?: TimelineEvent[];
}

export interface CaseSummary {
  _id: string;
  caseId: string;
  disease: string;
  status: 'New' | 'OPEN' | 'Investigating' | 'ACCEPTED' | 'Confirmed' | 'Containment' | 'IN_TREATMENT' | 'Resolved' | 'RESOLVED' | 'Closed';
  severity?: 'Low' | 'Moderate' | 'High' | 'Critical';
  animalId?: {
    _id: string;
    tagId?: string;
    name?: string;
    species?: string;
    breed?: string;
  };
  assignedVetId?: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt?: string;
}
