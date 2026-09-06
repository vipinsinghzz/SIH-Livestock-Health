import { NetInfoState } from '@react-native-community/netinfo';

interface SyncItem {
  id: string;
  type: 'SYMPTOM_LOG' | 'VACCINATION' | 'ANIMAL_REGISTRATION';
  payload: any;
  timestamp: number;
}

class OfflineSyncManager {
  private outbox: SyncItem[] = [];

  constructor() {
    // In a real app, initialize SQLite or WatermelonDB outbox here
  }

  async queueAction(type: SyncItem['type'], payload: any) {
    const item: SyncItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      payload,
      timestamp: Date.now()
    };
    
    this.outbox.push(item);
    console.log(`[OfflineSync] Queued action: ${type}`);
    // Persist to local storage
  }

  async handleConnectivityChange(state: NetInfoState) {
    if (state.isConnected && state.isInternetReachable) {
      console.log('[OfflineSync] Network restored. Syncing outbox...');
      await this.syncOutbox();
    }
  }

  private async syncOutbox() {
    if (this.outbox.length === 0) return;

    console.log(`[OfflineSync] Processing ${this.outbox.length} queued items...`);
    
    for (const item of [...this.outbox]) {
      try {
        // Mock backend API call
        // await api.post(this.getEndpointForType(item.type), item.payload);
        
        console.log(`[OfflineSync] Successfully synced item ${item.id}`);
        this.outbox = this.outbox.filter(i => i.id !== item.id);
      } catch (error) {
        console.error(`[OfflineSync] Failed to sync item ${item.id}`, error);
        // Leave in outbox for next retry
      }
    }
  }
}

export const syncManager = new OfflineSyncManager();
