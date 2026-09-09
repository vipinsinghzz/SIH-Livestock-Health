import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getPendingReports, markReportSynced, saveOfflineReport } from '../services/offlineDb';
import api from '../services/api';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState(null);
  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await getPendingReports();
      setPendingCount(Array.isArray(pending) ? pending.length : 0);
    } catch (err) {
      console.warn('[OfflineContext] Error counting pending reports:', err?.message || err);
    }
  }, []);

  const syncOfflineReports = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      const pending = await getPendingReports();
      if (!pending || pending.length === 0) {
        return;
      }

      console.log(`[OfflineContext] Syncing ${pending.length} queued offline reports...`);
      let successCount = 0;

      for (const item of pending) {
        try {
          const payload = { ...item };
          delete payload.id;
          delete payload.synced;
          delete payload.createdAt;

          await api.post('/reports', payload);
          await markReportSynced(item.id);
          successCount++;
        } catch (postErr) {
          console.warn(`[OfflineContext] Failed to sync report #${item.id}:`, postErr.message);
        }
      }

      await refreshPendingCount();
      if (successCount > 0) {
        setSyncStatusMessage(`Successfully synced ${successCount} offline report(s) to server!`);
        setTimeout(() => setSyncStatusMessage(null), 5000);
      }
    } catch (err) {
      console.warn('[OfflineContext] Sync error:', err?.message || err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, refreshPendingCount]);

  // Check pending on mount
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Auto-sync only when coming online
  useEffect(() => {
    if (isOnline) {
      syncOfflineReports();
    }
  }, [isOnline]);

  const queueReport = async (reportData) => {
    const id = await saveOfflineReport(reportData);
    await refreshPendingCount();
    return id;
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        syncStatusMessage,
        syncOfflineReports,
        queueReport,
        refreshPendingCount
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
