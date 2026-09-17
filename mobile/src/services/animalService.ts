/**
 * Livestock Saathi - Animal Service
 * File: mobile/src/services/animalService.ts
 * 
 * Communicates with production /api/animals endpoints for animal profile management.
 */

import api from './api';
import { Animal, AnimalCreateInput, AnimalUpdateInput } from '../types/animal';

export interface AnimalListResponse {
  success: boolean;
  count: number;
  animals: Animal[];
}

export interface AnimalDetailResponse {
  success: boolean;
  animal: Animal;
}

export interface AnimalMutationResponse {
  success: boolean;
  message: string;
  animal: Animal;
}

export const animalService = {
  /**
   * Fetch all animals owned by the current farmer (or filtered by query params)
   */
  async getAnimals(params?: {
    species?: string;
    village?: string;
    block?: string;
    district?: string;
  }): Promise<Animal[]> {
    const response = await api.get<AnimalListResponse>('/animals', { params });
    return response.data.animals || [];
  },

  /**
   * Fetch full profile and health history of a single animal
   */
  async getAnimalById(id: string): Promise<Animal> {
    const response = await api.get<AnimalDetailResponse>(`/animals/${id}`);
    return response.data.animal;
  },

  /**
   * Register a new animal in the farmer's herd
   */
  async createAnimal(payload: AnimalCreateInput): Promise<Animal> {
    const response = await api.post<AnimalMutationResponse>('/animals', payload);
    return response.data.animal;
  },

  /**
   * Update animal details, health status, or add timeline/vaccination/treatment records
   */
  async updateAnimal(id: string, updates: AnimalUpdateInput): Promise<Animal> {
    const response = await api.patch<AnimalMutationResponse>(`/animals/${id}`, updates);
    return response.data.animal;
  },
};

export default animalService;
