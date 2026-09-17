/**
 * Livestock Saathi - UI Component: OfflineNotice
 * File: mobile/src/components/OfflineNotice.tsx
 * 
 * Persistent network connectivity & mutation synchronization indicator.
 * Displays offline status, syncing animations, and pending mutation counts.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import syncService, { SyncState } from '../services/syncService';
import { colors, typography, spacing } from '../theme';

export const OfflineNotice: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());

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

  return (
    <View style={[styles.banner, { backgroundColor }]}>
      {isSyncing && (
        <ActivityIndicator
          size="small"
          color="#FFFFFF"
          style={styles.spinner}
        />
      )}
      <Text style={styles.text} numberOfLines={1}>
        {isOffline &&
          `⚠️ Offline Mode — Cached data is displayed${
            syncState.pendingCount > 0
              ? ` • ${syncState.pendingCount} pending change${syncState.pendingCount > 1 ? 's' : ''}`
              : ''
          }`}
        {isSyncing &&
          `🔄 Syncing ${syncState.pendingCount} pending change${
            syncState.pendingCount > 1 ? 's' : ''
          } with server...`}
        {isError &&
          `⚠️ Sync issue: ${
            syncState.pendingCount
          } item${syncState.pendingCount > 1 ? 's' : ''} queued for retry.`}
        {syncState.status === 'ONLINE' &&
          syncState.pendingCount > 0 &&
          `⏳ ${syncState.pendingCount} change${
            syncState.pendingCount > 1 ? 's' : ''
          } waiting for sync.`}
      </Text>
    </View>
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
