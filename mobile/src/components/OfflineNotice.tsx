/**
 * PashuCare - UI Component: OfflineNotice
 * File: mobile/src/components/OfflineNotice.tsx
 * 
 * Persistent network connectivity & mutation synchronization indicator.
 * Displays offline status, syncing animations, and pending mutation counts.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import syncService, { SyncState } from '../services/syncService';
import { colors, typography, spacing } from '../theme';

import { useAppLanguage } from '../services/i18n';

export const OfflineNotice: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());
  const { t } = useAppLanguage();

  useEffect(() => {
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (syncState.status === 'ONLINE' && syncState.pendingCount === 0) {
    return null;
  }

  const isOffline = syncState.status === 'OFFLINE';
  const isSyncing = syncState.status === 'SYNCING';
  const isError = syncState.status === 'SYNC_ERROR';

  const backgroundColor = isSyncing
    ? '#2563EB'
    : isOffline
    ? '#D97706'
    : isError
    ? '#DC2626'
    : '#4B5563';

  const handlePress = () => {
    if (!isSyncing) {
      syncService.syncNow();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={isSyncing ? 1 : 0.8}
      onPress={handlePress}
      disabled={isSyncing}
      style={[styles.banner, { backgroundColor }]}
    >
      {isSyncing && (
        <ActivityIndicator
          size="small"
          color="#FFFFFF"
          style={styles.spinner}
        />
      )}
      <Text style={styles.text} numberOfLines={1}>
        {isOffline && `⚠️ ${t('common.offlineMode')}`}
        {isSyncing && `🔄 ${t('common.syncing')}`}
        {isError && `⚠️ Sync issue: ${syncState.pendingCount} queued (Tap to retry)`}
        {syncState.status === 'ONLINE' && syncState.pendingCount > 0 && `⏳ ${syncState.pendingCount} waiting for sync.`}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    zIndex: 9999,
  },
  spinner: {
    marginRight: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});

export default OfflineNotice;
