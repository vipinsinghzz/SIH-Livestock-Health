/**
 * Livestock Saathi - Map & GIS Type Definitions
 * File: mobile/src/types/map.ts
 * 
 * Defines domain models, layer toggles, and coordinate interfaces for the Farmer Health Map.
 * Strictly models authentic backend GIS fields and PostGIS spatial responses.
 */

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends MapCoordinates {
  latitudeDelta: number;
  longitudeDelta: number;
}

export type MapLayerKey = 'vets' | 'containment' | 'cases' | 'camps';

export interface MapLayerConfig {
  key: MapLayerKey;
  label: string;
  icon: string;
  active: boolean;
  color: string;
  description: string;
}

export interface VeterinaryFacilityMarker {
  id: string;
  name: string;
  clinicName: string;
  phone: string;
  specialization: string;
  emergencyAvailable: boolean;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  services?: string[];
  district?: string;
}

export interface ContainmentZoneOverlay {
  id: string;
  zoneId: string;
  disease: string;
  district: string;
  block?: string;
  village?: string;
  center: {
    lat: number;
    lng: number;
  };
  radiusKm: number;
  status: string;
  enforcedRules?: string[];
  createdAt?: string;
}

export interface NearbyDiseaseCaseMarker {
  id: string;
  caseId: string;
  disease: string;
  risk: string;
  species?: string;
  latitude: number;
  longitude: number;
  village?: string;
  isFuzzed: boolean;
  createdAt: string;
}

export interface VaccinationCampMarker {
  id: string;
  title: string;
  vaccine: string;
  district: string;
  village?: string;
  latitude: number;
  longitude: number;
  startDate?: string;
  status: string;
  coveragePercentage?: number;
  distanceKm?: number;
}

export interface FarmerMapData {
  veterinarians: VeterinaryFacilityMarker[];
  containmentZones: ContainmentZoneOverlay[];
  nearbyCases: NearbyDiseaseCaseMarker[];
  vaccinationCamps: VaccinationCampMarker[];
  referenceLocation: MapCoordinates;
  district?: string;
}
