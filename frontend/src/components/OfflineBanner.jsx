import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useOffline } from '../context/OfflineContext';
import { useTranslation } from 'react-i18next';

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncStatusMessage, syncOfflineReports } = useOffline();
  const { t } = useTranslation();

  if (isOnline && pendingCount === 0 && !syncStatusMessage) {
    return null;
  }

  return (
    <aside aria-label="Offline status and sync notices" className="sticky top-0 z-50 w-full transition-all duration-300">
      {/* Offline Alert */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <WifiOff className="w-5 h-5 flex-shrink-0 animate-pulse text-amber-200" />
            <span>{t('offline.banner')}</span>
          </div>
        </div>
      )}

      {/* Pending Sync Bar */}
      {pendingCount > 0 && (
        <div className="bg-emerald-800 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between shadow-inner">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-emerald-300" />
              <span>
                {t(pendingCount === 1 ? 'offline.pending_count' : 'offline.pending_count_plural', { count: pendingCount })}
              </span>
            </div>
            <button
              onClick={syncOfflineReports}
              disabled={!isOnline || isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1 rounded bg-white text-emerald-800 font-semibold shadow hover:bg-emerald-50 transition ${
                !isOnline ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? t('offline.syncing') : t('offline.sync_now')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {syncStatusMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{syncStatusMessage}</span>
        </div>
      )}
    </aside>
  );
}
