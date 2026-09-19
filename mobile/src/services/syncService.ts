/**
 * Livestock Saathi - Synchronization Service
 * File: mobile/src/services/syncService.ts
 * 
 * Manages network state transitions, background synchronization of queued mutations,
 * bounded retry strategies, and authoritative server data reconciliation.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import api from './api';
import {
  getPendingSyncQueue,
  getPendingSyncCount,
  updateSyncItemStatus,
  removeSyncItem,
  reconcileAnimalCacheId,
  reconcileCaseCacheId,
  SyncQueueItem,
} from './localDatabase';
import { AnimalMutationResponse } from './animalService';
import { CreateCaseResponse } from '../types/case';

export type NetworkStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_ERROR';

export interface SyncState {
  status: NetworkStatus;
  pendingCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

class SyncService {
  private currentStatus: NetworkStatus = 'ONLINE';
  private isSyncing = false;
  private lastSyncAt: number | null = null;
  private lastError: string | null = null;
  private listeners = new Set<SyncListener>();
  private activeFarmerId: string | null = null;

  constructor() {
    this.initNetworkMonitoring();
  }

  /**
   * Set active farmer context for queue scoping
   */
  setActiveFarmer(farmerId: string | null) {
    this.activeFarmerId = farmerId;
    this.notifyState();
    if (this.currentStatus === 'ONLINE' && farmerId) {
      this.syncNow(farmerId);
    }
  }

  /**
   * Register state listener
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current sync and network state snapshot
   */
  getState(): SyncState {
    return {
      status: this.currentStatus,
      pendingCount: 0, // Computed asynchronously in notifyState
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    };
  }

  /**
   * Initialize NetInfo event listener
   */
  private initNetworkMonitoring() {
    NetInfo.addEventListener(async (state: NetInfoState) => {
      const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (!isConnected) {
        this.currentStatus = 'OFFLINE';
        await this.notifyState();
      } else {
        if (this.currentStatus === 'OFFLINE') {
          this.currentStatus = 'ONLINE';
          await this.notifyState();
          // Network restored: trigger queue synchronization
          if (this.activeFarmerId) {
            this.syncNow(this.activeFarmerId);
          }
        }
      }
    });
  }

  /**
   * Broadcast state changes to all subscribers
   */
  private async notifyState() {
    let pendingCount = 0;
    if (this.activeFarmerId) {
      try {
        pendingCount = await getPendingSyncCount(this.activeFarmerId);
      } catch (err) {
        console.warn('[SyncService] Error reading pending sync count:', err);
      }
    }
    const state: SyncState = {
      status: this.isSyncing ? 'SYNCING' : this.currentStatus,
      pendingCount,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    };

    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {}
    }
  }

  /**
   * Execute pending sync queue FIFO
   */
  async syncNow(farmerId?: string): Promise<{ synced: number; failed: number }> {
    const targetFarmerId = farmerId || this.activeFarmerId;
    if (!targetFarmerId || this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    // Check connectivity first
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      this.currentStatus = 'OFFLINE';
      await this.notifyState();
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.currentStatus = 'SYNCING';
    await this.notifyState();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const queue = await getPendingSyncQueue(targetFarmerId);

      for (const item of queue) {
        try {
          await updateSyncItemStatus(item.id, 'SYNCING');

          if (item.entityType === 'ANIMAL' && item.operation === 'CREATE') {
            const res = await api.post<AnimalMutationResponse>(item.endpoint, item.payload);
            if (res.data?.success && res.data.animal) {
              await reconcileAnimalCacheId(item.localId, res.data.animal, item.farmerId);
              await removeSyncItem(item.id);
              syncedCount++;
            } else {
              throw new Error(res.data?.message || 'Server rejected animal record.');
            }
          } else if (item.entityType === 'CASE' && item.operation === 'CREATE') {
            const res = await api.post<CreateCaseResponse>(item.endpoint, item.payload);
            if (res.data?.success && res.data.case) {
              await reconcileCaseCacheId(item.localId, res.data.case, item.farmerId);
              await removeSyncItem(item.id);
              syncedCount++;
            } else {
              throw new Error(res.data?.message || 'Server rejected case record.');
            }
          }
        } catch (itemErr: any) {
          console.warn(`[SyncService] Failed item ${item.id}:`, itemErr.message);

          const isNetworkError =
            itemErr.status === 0 ||
            itemErr.code === 'NETWORK_ERROR' ||
            itemErr.code === 'ECONNABORTED';

          if (isNetworkError) {
            // Transient connection failure: halt loop and keep item for next reconnect
            await updateSyncItemStatus(item.id, 'PENDING');
            this.currentStatus = 'OFFLINE';
            break;
          } else {
            // Server rejected payload (4xx error)
            failedCount++;
            await updateSyncItemStatus(item.id, 'FAILED', true, itemErr.message);
          }
        }
      }

      this.lastSyncAt = Date.now();
      this.currentStatus = failedCount > 0 ? 'SYNC_ERROR' : 'ONLINE';
    } catch (globalErr: any) {
      console.warn('[SyncService] Global synchronization exception:', globalErr);
      this.lastError = globalErr.message;
      this.currentStatus = 'SYNC_ERROR';
    } finally {
      this.isSyncing = false;
      await this.notifyState();
    }

    return { synced: syncedCount, failed: failedCount };
  }
}

export const syncService = new SyncService();
export default syncService;
