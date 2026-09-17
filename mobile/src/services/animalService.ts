/**
 * Livestock Saathi - Animal Service
 * File: mobile/src/services/animalService.ts
 * 
 * Communicates with production /api/animals endpoints for animal profile management.
 * Provides offline caching in SQLite and mutation queueing when disconnected.
 */

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import { Animal, AnimalCreateInput, AnimalUpdateInput } from '../types/animal';
import {
  getCachedAnimals,
  saveAnimalsCache,
  saveLocalPendingAnimal,
  enqueueSyncItem,
} from './localDatabase';
import { getSavedUserProfile } from './secureStorage';
import syncService from './syncService';

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
   * Falls back to offline SQLite cache when disconnected.
   */
  async getAnimals(params?: {
    species?: string;
    village?: string;
    block?: string;
    district?: string;
  }): Promise<Animal[]> {
    const netState = await NetInfo.fetch();
    const user = await getSavedUserProfile<{ id?: string; _id?: string }>();
    const farmerId = user?.id || user?._id || '';

    if (netState.isConnected && netState.isInternetReachable !== false) {
      try {
        const response = await api.get<AnimalListResponse>('/animals', { params });
        const animals = response.data.animals || [];
        if (farmerId && animals.length > 0) {
          await saveAnimalsCache(farmerId, animals);
        }
        return animals;
      } catch (err) {
        console.warn('[AnimalService] Network fetch failed, falling back to cache:', err);
      }
    }

    // Fallback to SQLite cache
    if (farmerId) {
      const { animals } = await getCachedAnimals(farmerId);
      if (params?.species && params.species !== 'All') {
        return animals.filter((a) => a.species === params.species);
      }
      return animals;
    }

    return [];
  },

  /**
   * Fetch full profile and health history of a single animal
   */
  async getAnimalById(id: string): Promise<Animal> {
    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable !== false) {
      try {
        const response = await api.get<AnimalDetailResponse>(`/animals/${id}`);
        return response.data.animal;
      } catch (err) {
        console.warn('[AnimalService] Network animal detail fetch failed:', err);
      }
    }

    // Offline fallback from local cache
    const user = await getSavedUserProfile<{ id?: string; _id?: string }>();
    const farmerId = user?.id || user?._id || '';
    if (farmerId) {
      const { animals } = await getCachedAnimals(farmerId);
      const match = animals.find(
        (a) => (a.id || a._id) === id || a.tagId === id
      );
      if (match) return match;
    }

    throw new Error('Animal details unavailable offline.');
  },

  /**
   * Register a new animal in the farmer's herd
   * If offline, stores locally with temporary ID, marks pending sync, and enqueues in SQLite sync queue.
   */
  async createAnimal(payload: AnimalCreateInput): Promise<Animal> {
    const netState = await NetInfo.fetch();
    const user = await getSavedUserProfile<{ id?: string; _id?: string }>();
    const farmerId = user?.id || user?._id || 'local_farmer';

    if (netState.isConnected && netState.isInternetReachable !== false) {
      try {
        const response = await api.post<AnimalMutationResponse>('/animals', payload);
        const serverAnimal = response.data.animal;
        if (farmerId && serverAnimal) {
          const { animals } = await getCachedAnimals(farmerId);
          await saveAnimalsCache(farmerId, [serverAnimal, ...animals]);
        }
        return serverAnimal;
      } catch (err: any) {
        const isNetworkError =
          err.status === 0 ||
          err.code === 'NETWORK_ERROR' ||
          err.code === 'ECONNABORTED' ||
          !err.response;

        if (!isNetworkError) {
          // Re-throw server 4xx validation or business errors
          throw err;
        }
        console.warn('[AnimalService] Online creation failed with network error, queueing offline:', err.message);
      }
    }

    // Offline creation workflow
    const localTempId = `local_anim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const localAnimal: Animal = {
      id: localTempId,
      _id: localTempId,
      tagId: payload.tagId || `TAG-${Date.now().toString().slice(-6)}`,
      name: payload.name || 'Livestock Animal',
      species: payload.species,
      breed: payload.breed || 'Indigenous',
      age: payload.age || 2,
      gender: payload.gender || 'Female',
      healthStatus: payload.healthStatus || 'Healthy',
      milkYieldDaily: payload.milkYieldDaily || undefined,
      village: payload.village || '',
      block: payload.block || '',
      district: payload.district || '',
      ownerId: farmerId,
      isPendingSync: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveLocalPendingAnimal(farmerId, localAnimal);
    await enqueueSyncItem({
      farmerId,
      entityType: 'ANIMAL',
      operation: 'CREATE',
      localId: localTempId,
      endpoint: '/animals',
      payload: payload as any,
    });

    // Notify sync status listeners of pending item
    syncService.setActiveFarmer(farmerId);

    return localAnimal;
  },

  /**
   * Update animal details, health status, or add timeline/vaccination/treatment records
   */
  async updateAnimal(id: string, updates: AnimalUpdateInput): Promise<Animal> {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('Updating animal records requires an active network connection.');
    }
    const response = await api.patch<AnimalMutationResponse>(`/animals/${id}`, updates);
    return response.data.animal;
  },
};

export default animalService;
