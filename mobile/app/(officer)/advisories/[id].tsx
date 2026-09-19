/**
 * Livestock Saathi - Officer: Advisory Detail Screen
 * File: mobile/app/(officer)/advisories/[id].tsx
 *
 * Full detailed view of an official biosecurity advisory / quarantine bulletin.
 * Includes complete bilingual message if available, geographical jurisdiction,
 * issuing authority, disease metadata, and deep links.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { advisoryService } from '../../../src/services/advisoryService';
import { OfficialAdvisory, getAdvisorySeverityTheme } from '../../../src/types/advisory';

export default function OfficerAdvisoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const district = user?.district;

  const [advisory, setAdvisory] = useState<OfficialAdvisory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDetail() {
      if (!id) {
        setError('Advisory ID is missing.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const found = await advisoryService.getAdvisoryById(id, district);
        if (isMounted) {
          if (found) {
            setAdvisory(found);
          } else {
            setError('Biosecurity advisory not found in local or server records.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load advisory details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [id, district]);

  const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return 'Date unavailable';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.light.officerBadge} />
        <ActivityIndicator size="large" color={colors.light.officerBadge} />
        <Text style={styles.loadingText}>Loading advisory details...</Text>
      </View>
    );
  }

  if (error || !advisory) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.light.officerBadge} />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Advisory Unavailable</Text>
        <Text style={styles.errorText}>{error || 'The requested advisory record could not be located.'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← Back to Advisories</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const theme = getAdvisorySeverityTheme(advisory.severity);
  const titleEn = advisory.titleEn || (typeof advisory.title === 'object' ? advisory.title.en : advisory.title);
  const titleHi = advisory.titleHi || (typeof advisory.title === 'object' ? advisory.title.hi : undefined);
  const messageEn = advisory.messageEn || (typeof advisory.message === 'object' ? advisory.message.en : advisory.message);
  const messageHi = advisory.messageHi || (typeof advisory.message === 'object' ? advisory.message.hi : undefined);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.officerBadge} />

      {/* Severity Banner */}
      <View
        style={[
          styles.severityBanner,
          { backgroundColor: theme.bgColor, borderColor: theme.borderColor },
        ]}
      >
        <Text style={[styles.severityLabel, { color: theme.color }]}>{theme.label}</Text>
        <Text style={styles.timestampText}>{formatTimestamp(advisory.createdAt)}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{titleEn}</Text>
      {titleHi && titleHi !== titleEn && (
        <Text style={styles.titleSecondary}>{titleHi}</Text>
      )}

      {/* Scope Card */}
      <View style={styles.scopeCard}>
        <Text style={styles.sectionHeader}>Geographical Jurisdiction & Scope</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>District</Text>
            <Text style={styles.gridValue}>{advisory.targetDistrict || district || 'State'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Block</Text>
            <Text style={styles.gridValue}>{advisory.targetBlock || 'All Blocks'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Village</Text>
            <Text style={styles.gridValue}>{advisory.targetVillage || 'All Villages'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Target Disease</Text>
            <Text style={styles.gridValue}>{advisory.disease || 'General Alert'}</Text>
          </View>
        </View>
      </View>

      {/* Official Guidelines Content */}
      <View style={styles.messageCard}>
        <Text style={styles.sectionHeader}>Official Directive & Biosecurity Protocol</Text>
        <Text style={styles.messageBody}>{messageEn}</Text>

        {messageHi && messageHi !== messageEn && (
          <View style={styles.hiSection}>
            <Text style={styles.hiHeader}>हिंदी विवरण (Hindi Translation):</Text>
            <Text style={styles.hiBody}>{messageHi}</Text>
          </View>
        )}
      </View>

      {/* Authority Card */}
      <View style={styles.authorityCard}>
        <View style={styles.authorityRow}>
          <Text style={styles.authorityLabel}>Issued By Authority:</Text>
          <Text style={styles.authorityValue}>{advisory.issuedBy || 'District Animal Husbandry Department'}</Text>
        </View>
        <View style={styles.authorityRow}>
          <Text style={styles.authorityLabel}>Advisory Reference ID:</Text>
          <Text style={styles.authorityValue}>{String(advisory.id || advisory._id || 'N/A')}</Text>
        </View>
      </View>

      {/* Action Navigation */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButtonOutbreaks}
          onPress={() => router.push('/(officer)/outbreaks' as any)}
          activeOpacity={0.8}
          accessibilityLabel="View outbreak alerts"
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonOutbreaksText}>View Outbreak Alerts →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButtonBack}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel="Back to advisories list"
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonBackText}>← Back to Advisories</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.light.background,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: spacing.md,
  },
  errorIcon: {
    fontSize: 44,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    backgroundColor: colors.light.officerBadge,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  backButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  severityBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  severityLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  timestampText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  title: {
    fontSize: typography.sizes.xxl,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
    lineHeight: 28,
  },
  titleSecondary: {
    fontSize: typography.sizes.base,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.md,
  },
  scopeCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionHeader: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  gridItem: {
    width: '50%',
  },
  gridLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  gridValue: {
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
    marginTop: 1,
  },
  messageCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  messageBody: {
    fontSize: typography.sizes.base,
    color: colors.light.textPrimary,
    lineHeight: 24,
  },
  hiSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  hiHeader: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  hiBody: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    lineHeight: 22,
  },
  authorityCard: {
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  authorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorityLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  authorityValue: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  actionsContainer: {
    gap: spacing.sm,
  },
  actionButtonOutbreaks: {
    backgroundColor: colors.light.officerBadge,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionButtonOutbreaksText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  actionButtonBack: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  actionButtonBackText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.light.textSecondary,
  },
});
