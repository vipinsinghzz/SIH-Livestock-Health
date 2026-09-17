/**
 * Livestock Saathi - Farmer Profile & Settings Screen
 * File: mobile/app/(farmer)/profile/index.tsx
 * 
 * Centralized farmer account profile, herd status summary, public emergency helplines,
 * application configuration, and secure sign-out confirmation.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../../src/context/AuthContext';
import animalService from '../../../src/services/animalService';
import caseService from '../../../src/services/caseService';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';

export default function FarmerProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [herdStats, setHerdStats] = useState<{
    totalAnimals: number;
    activeCases: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const loadHerdSummary = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);

      const [animals, cases] = await Promise.all([
        animalService.getAnimals().catch((err) => {
          console.warn('[Profile] Failed to load animals:', err);
          throw err;
        }),
        caseService.getFarmerCases({ limit: 50 }).catch((err) => {
          console.warn('[Profile] Failed to load cases:', err);
          throw err;
        }),
      ]);

      const activeCasesCount = cases.filter((c) =>
        ['New', 'OPEN', 'Investigating', 'ACCEPTED', 'Containment', 'IN_TREATMENT'].includes(c.status)
      ).length;

      setHerdStats({
        totalAnimals: animals.length,
        activeCases: activeCasesCount,
      });
    } catch (err: any) {
      setStatsError('Unable to load herd statistics at this time.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHerdSummary();
  }, [loadHerdSummary]);

  const handleCall = async (phoneNumber: string, label: string) => {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const url = `tel:${cleanPhone}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Dialer Unavailable',
          `Could not open the phone dialer for ${label}. Please call ${phoneNumber} directly from your phone.`
        );
      }
    } catch (err) {
      Alert.alert(
        'Dialer Error',
        `Unable to initiate call to ${label} (${phoneNumber}). Please dial manually.`
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (err: any) {
              Alert.alert('Sign Out Notice', err.message || 'Error signing out.');
            }
          },
        },
      ]
    );
  };

  const farmerRoleDisplay = user?.role === 'farmer' ? 'Farmer' : user?.role || 'Farmer';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Profile Identity Card */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.name
              ? user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : '👨‍🌾'}
          </Text>
        </View>

        <Text style={styles.userName}>{user?.name || 'Farmer User'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>🌱 {farmerRoleDisplay}</Text>
        </View>
      </View>

      {/* Account & Location Details Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Profile Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Full Name</Text>
          <Text style={styles.detailValue}>{user?.name || 'Not available'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Mobile Phone</Text>
          <Text style={styles.detailValue}>{user?.phone || 'Not available'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{user?.email || 'Not available'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Village</Text>
          <Text style={styles.detailValue}>{user?.village || 'Not specified'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Block / Tehsil</Text>
          <Text style={styles.detailValue}>{user?.block || 'Not specified'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>District</Text>
          <Text style={styles.detailValue}>{user?.district || 'Not specified'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>State</Text>
          <Text style={styles.detailValue}>{user?.state || 'Not specified'}</Text>
        </View>
      </View>

      {/* Herd Summary Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Herd Summary</Text>
        <Text style={styles.sectionSub}>
          Live status of your registered herd and recent health cases.
        </Text>

        {statsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.light.primary} />
            <Text style={styles.loadingText}>Loading herd statistics...</Text>
          </View>
        ) : statsError ? (
          <View style={styles.statsErrorBox}>
            <Text style={styles.statsErrorText}>{statsError}</Text>
            <TouchableOpacity onPress={loadHerdSummary} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{herdStats?.totalAnimals ?? '-'}</Text>
                <Text style={styles.statLabel}>Total Animals</Text>
                <Text style={styles.statSub}>Full registered herd</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text
                  style={[
                    styles.statNumber,
                    (herdStats?.activeCases ?? 0) > 0 && { color: colors.light.danger },
                  ]}
                >
                  {herdStats?.activeCases ?? '-'}
                </Text>
                <Text style={styles.statLabel}>Active Cases</Text>
                <Text style={styles.statSub}>Recent records (≤50)</Text>
              </View>
            </View>
            <Text style={styles.statsFootnote}>
              * Total animals reflects your full registered herd. Active cases is calculated from your 50 most recent health records.
            </Text>
          </>
        )}
      </View>

      {/* Emergency & Public Helplines */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Emergency & Public Helplines</Text>
        <Text style={styles.sectionSub}>
          Official government livestock and agricultural support lines.
        </Text>

        <TouchableOpacity
          style={styles.helplineButton}
          onPress={() => handleCall('1962', 'National Veterinary Emergency Helpline')}
          activeOpacity={0.7}
        >
          <View style={styles.helplineIconBox}>
            <Text style={styles.helplineEmoji}>🚑</Text>
          </View>
          <View style={styles.helplineTextCol}>
            <Text style={styles.helplineTitle}>Veterinary Emergency Helpline</Text>
            <Text style={styles.helplineNumber}>1962 (Toll Free)</Text>
          </View>
          <Text style={styles.callActionText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helplineButton}
          onPress={() => handleCall('18001801551', 'Kisan Call Center')}
          activeOpacity={0.7}
        >
          <View style={styles.helplineIconBox}>
            <Text style={styles.helplineEmoji}>📞</Text>
          </View>
          <View style={styles.helplineTextCol}>
            <Text style={styles.helplineTitle}>Kisan Call Center</Text>
            <Text style={styles.helplineNumber}>1800-180-1551 (Toll Free)</Text>
          </View>
          <Text style={styles.callActionText}>Call</Text>
        </TouchableOpacity>
      </View>

      {/* Language / Settings Information */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Language</Text>
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            English / Hindi / Marathi support is planned / currently limited
          </Text>
        </View>
      </View>

      {/* App Information */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>App Information</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Application</Text>
          <Text style={styles.detailValue}>Livestock Saathi</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Platform</Text>
          <Text style={styles.detailValue}>Android application</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Version</Text>
          <Text style={styles.detailValue}>v{appVersion}</Text>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
  },
  profileHeaderCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: colors.light.farmerBadgeBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  roleBadgeText: {
    color: colors.light.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  sectionCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
    textAlign: 'right',
    flex: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: spacing.xs,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.light.textMuted,
  },
  statsErrorBox: {
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsErrorText: {
    fontSize: typography.sizes.sm,
    color: colors.light.danger,
    flex: 1,
  },
  retryButton: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  retryButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  statsFootnote: {
    fontSize: 11,
    color: colors.light.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.light.border,
  },
  helplineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  helplineIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  helplineEmoji: {
    fontSize: 20,
  },
  helplineTextCol: {
    flex: 1,
  },
  helplineTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  helplineNumber: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  callActionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
    paddingHorizontal: spacing.sm,
  },
  infoBanner: {
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  infoBannerText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    lineHeight: 20,
  },
  signOutButton: {
    backgroundColor: colors.light.dangerBg,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.danger,
    marginTop: spacing.sm,
  },
  signOutButtonText: {
    color: colors.light.danger,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
