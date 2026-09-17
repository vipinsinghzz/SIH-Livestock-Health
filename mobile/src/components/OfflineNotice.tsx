/**
 * Livestock Saathi - UI Component: OfflineNotice
 * File: mobile/src/components/OfflineNotice.tsx
 * 
 * Persistent network connectivity indicator shown when device loses internet access.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { colors, typography, spacing } from '../theme';

export const OfflineNotice: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (isConnected !== false) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ Offline Mode - Cached data will be used</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.light.warning,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});

export default OfflineNotice;
