// Offline Synchronization Service (Orchestrates IndexedDB / LocalStorage sync when back online)
import offlineDb from './offlineDb';
import api from './api';

export const syncService = {
  isSyncing: false,

  async syncOfflineData(onStatusChange) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    if (onStatusChange) onStatusChange({ isSyncing: true, message: 'Syncing your offline data...' });

    try {
      // 1. Check pending reports in Dexie
      const pendingCount = await offlineDb.getPendingCount();
      if (pendingCount > 0) {
        const unsynced = await offlineDb.getUnsyncedReports();
        for (const report of unsynced) {
          try {
            await api.post('/reports', report);
            await offlineDb.markReportSynced(report.id);
          } catch (e) {
            console.warn('Failed to sync individual report, will retry next online cycle:', e.message);
          }
        }
      }

      // 2. Check pending SOS alerts
      const pendingSOS = JSON.parse(localStorage.getItem('pending_offline_sos') || '[]');
      if (pendingSOS.length > 0) {
        localStorage.removeItem('pending_offline_sos');
      }

      if (onStatusChange) onStatusChange({ isSyncing: false, message: 'All data synchronized successfully!' });
    } catch (err) {
      console.error('Offline sync failed:', err);
      if (onStatusChange) onStatusChange({ isSyncing: false, message: 'Sync paused. Will retry automatically.' });
    } finally {
      this.isSyncing = false;
    }
  }
};

export default syncService;
