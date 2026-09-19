/**
 * Livestock Saathi - Production Veterinarian Dashboard
 * File: mobile/app/(vet)/index.tsx
 * 
 * Phase 9.1: Real production clinical dashboard for veterinary doctors.
 * Displays live district metrics, pull-to-refresh, offline caching notice,
 * quick action shortcuts, and recent incoming referral cases.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../src/theme';
import { veterinarianService } from '../../src/services/veterinarianService';
import { VetDashboardMetrics } from '../../src/types/vet';
import { DiseaseCase, getStatusTheme, getRiskTheme } from '../../src/types/case';
import { isCaseClaimable, isCaseAssignedToVet } from '../../src/types/referral';
import { OfflineNotice } from '../../src/components/OfflineNotice';

export default function VetHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [metrics, setMetrics] = useState<VetDashboardMetrics | null>(null);
  const [recentCases, setRecentCases] = useState<DiseaseCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const vetName = user?.name ? user.name.replace(/^Dr\.\s*/i, '') : 'Doctor';
  const vetDistrict = user?.district || 'District Jurisdiction';

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const result = await veterinarianService.getDashboardMetrics(user?.district);
      setMetrics(result.metrics);
      setRecentCases(result.recentCases);
      setIsFromCache(result.fromCache);
    } catch (err: any) {
      console.warn('[VetDashboard] Error loading metrics:', err?.message);
      setError(err?.message || 'Failed to load clinical dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.district]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleClaimQuick = async (caseItem: DiseaseCase) => {
    const caseTargetId = caseItem.id || caseItem._id || caseItem.caseId;
    if (!caseTargetId) return;

    Alert.alert(
      'Claim Referral Case',
      `Are you sure you want to take clinical responsibility for case ${caseItem.caseId} (${caseItem.disease})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Claim',
          style: 'default',
          onPress: async () => {
            try {
              setClaimingId(caseTargetId);
              await veterinarianService.claimCase(caseTargetId);
              Alert.alert('Case Claimed', `Case ${caseItem.caseId} has been assigned to your care.`);
              loadDashboardData();
            } catch (claimErr: any) {
              Alert.alert('Cannot Claim Case', claimErr.message || 'Failed to claim referral.');
            } finally {
              setClaimingId(null);
            }
          }
        }
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of the Veterinarian Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <OfflineNotice />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.light.primary]}
            tintColor={colors.light.primary}
          />
        }
      >
        {/* Header with Professional Doctor Title & District Jurisdiction */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>VETERINARY CLINICAL PORTAL</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton} activeOpacity={0.7}>
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Dr. {vetName}</Text>
          <Text style={styles.subtitle}>
            {user?.registrationNo ? `Reg: ${user.registrationNo} • ` : ''}
            {vetDistrict} District
          </Text>

          {isFromCache && (
            <View style={styles.cacheNotice}>
              <Text style={styles.cacheNoticeText}>
                ⚡ Offline Mode: Displaying cached records from device storage.
              </Text>
            </View>
          )}
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.light.primary} />
            <Text style={styles.loadingText}>Loading clinical cases...</Text>
          </View>
        )}

        {/* Error State with Retry */}
        {error && !loading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dashboard Content */}
        {!loading && (
          <>
            {/* KPI Stats Grid */}
            <View style={styles.metricsGrid}>
              {/* New / Unassigned Referrals */}
              <TouchableOpacity
                style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'New' } })}
                activeOpacity={0.75}
              >
                <Text style={styles.metricLabel}>New Referrals</Text>
                <Text style={[styles.metricValue, { color: '#D97706' }]}>
                  {metrics?.newReferralsCount ?? 0}
                </Text>
                <Text style={styles.metricSub}>Awaiting triage</Text>
              </TouchableOpacity>

              {/* My Cases */}
              <TouchableOpacity
                style={[styles.metricCard, { borderLeftColor: '#10B981' }]}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'my_cases' } })}
                activeOpacity={0.75}
              >
                <Text style={styles.metricLabel}>My Cases</Text>
                <Text style={[styles.metricValue, { color: '#059669' }]}>
                  {metrics?.myCasesCount ?? 0}
                </Text>
                <Text style={styles.metricSub}>Under my care</Text>
              </TouchableOpacity>

              {/* Investigating */}
              <TouchableOpacity
                style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'Investigating' } })}
                activeOpacity={0.75}
              >
                <Text style={styles.metricLabel}>Investigating</Text>
                <Text style={[styles.metricValue, { color: '#2563EB' }]}>
                  {metrics?.investigatingCount ?? 0}
                </Text>
                <Text style={styles.metricSub}>Active diagnosis</Text>
              </TouchableOpacity>

              {/* Confirmed */}
              <TouchableOpacity
                style={[styles.metricCard, { borderLeftColor: '#EF4444' }]}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'Confirmed' } })}
                activeOpacity={0.75}
              >
                <Text style={styles.metricLabel}>Confirmed</Text>
                <Text style={[styles.metricValue, { color: '#DC2626' }]}>
                  {metrics?.confirmedCount ?? 0}
                </Text>
                <Text style={styles.metricSub}>Clinical positive</Text>
              </TouchableOpacity>

              {/* Containment */}
              <TouchableOpacity
                style={[styles.metricCard, { borderLeftColor: '#8B5CF6' }]}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'Containment' } })}
                activeOpacity={0.75}
              >
                <Text style={styles.metricLabel}>Containment</Text>
                <Text style={[styles.metricValue, { color: '#7C3AED' }]}>
                  {metrics?.containmentCount ?? 0}
                </Text>
                <Text style={styles.metricSub}>Buffer quarantine</Text>
              </TouchableOpacity>

              {/* Resolved */}
              <TouchableOpacity
                style={[styles.metricCard, { borderLeftColor: '#059669' }]}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'Resolved' } })}
                activeOpacity={0.75}
              >
                <Text style={styles.metricLabel}>Resolved</Text>
                <Text style={[styles.metricValue, { color: '#047857' }]}>
                  {metrics?.resolvedCount ?? 0}
                </Text>
                <Text style={styles.metricSub}>Recovered herd</Text>
              </TouchableOpacity>
            </View>

            {/* Honest Statistics Disclosure Note */}
            {metrics?.sampleWindowNote && (
              <View style={styles.sampleNoteContainer}>
                <Text style={styles.sampleNoteText}>
                  ℹ️ {metrics.sampleWindowNote}
                </Text>
              </View>
            )}

            {/* Primary Action Shortcuts */}
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => router.push('/(vet)/referrals')}
                activeOpacity={0.8}
              >
                <View style={styles.primaryActionLeft}>
                  <Text style={styles.primaryActionIcon}>📋</Text>
                  <View>
                    <Text style={styles.primaryActionTitle}>Triage & Referral Queue</Text>
                    <Text style={styles.primaryActionDesc}>
                      Review incoming cases reported by farmers in {vetDistrict}
                    </Text>
                  </View>
                </View>
                <Text style={styles.arrowIcon}>➔</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryActionBtn, styles.secondaryActionBtn]}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'my_cases' } })}
                activeOpacity={0.8}
              >
                <View style={styles.primaryActionLeft}>
                  <Text style={styles.primaryActionIcon}>🩺</Text>
                  <View>
                    <Text style={styles.primaryActionTitle}>My Active Patient Cases</Text>
                    <Text style={styles.primaryActionDesc}>
                      Manage treatments, prescriptions, and recovery timelines
                    </Text>
                  </View>
                </View>
                <Text style={styles.arrowIcon}>➔</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryActionBtn, styles.secondaryActionBtn]}
                onPress={() => router.push('/(vet)/labs')}
                activeOpacity={0.8}
              >
                <View style={styles.primaryActionLeft}>
                  <Text style={styles.primaryActionIcon}>🔬</Text>
                  <View>
                    <Text style={styles.primaryActionTitle}>Diagnostic Lab Tests</Text>
                    <Text style={styles.primaryActionDesc}>
                      Sample chain-of-custody, lab testing & confirmation
                    </Text>
                  </View>
                </View>
                <Text style={styles.arrowIcon}>➔</Text>
              </TouchableOpacity>
            </View>

            {/* Recent District Referrals Section */}
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent District Referrals</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(vet)/referrals')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>View All ({metrics?.totalRecentCases ?? 0})</Text>
                </TouchableOpacity>
              </View>

              {recentCases.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>✅</Text>
                  <Text style={styles.emptyTitle}>No Active Cases</Text>
                  <Text style={styles.emptySubtitle}>
                    There are no recorded disease referrals in {vetDistrict} district.
                  </Text>
                </View>
              ) : (
                recentCases.map((c) => {
                  const targetId = c.id || c._id || c.caseId;
                  const statusTheme = getStatusTheme(c.status);
                  const riskTheme = getRiskTheme(c.risk);
                  const isClaimable = isCaseClaimable(c);
                  const isMine = isCaseAssignedToVet(c, user?.id || user?._id);

                  return (
                    <TouchableOpacity
                      key={targetId}
                      style={styles.caseCard}
                      onPress={() => router.push(`/(vet)/referrals/${targetId}` as any)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.caseCardHeader}>
                        <View style={styles.caseIdBadge}>
                          <Text style={styles.caseIdText}>{c.caseId}</Text>
                        </View>
                        <View style={styles.badgesRow}>
                          <View style={[styles.riskPill, { backgroundColor: riskTheme.bgColor, borderColor: riskTheme.borderColor }]}>
                            <Text style={[styles.riskPillText, { color: riskTheme.color }]}>{riskTheme.label}</Text>
                          </View>
                          <View style={[styles.statusPill, { backgroundColor: statusTheme.bgColor, borderColor: statusTheme.borderColor }]}>
                            <Text style={[styles.statusPillText, { color: statusTheme.color }]}>{statusTheme.label}</Text>
                          </View>
                        </View>
                      </View>

                      <Text style={styles.diseaseTitle}>{c.disease}</Text>

                      <Text style={styles.caseMeta}>
                        🐄 {c.species || 'Livestock'} {c.animalName ? `(${c.animalName})` : ''} •{' '}
                        📍 {c.farmerLocation?.village || 'Village'}, {c.farmerLocation?.block || c.districtId || vetDistrict}
                      </Text>

                      <View style={styles.caseFooter}>
                        <Text style={styles.farmerContact}>
                          👤 {c.farmerContact?.name || 'Farmer'}
                        </Text>

                        {isClaimable ? (
                          <TouchableOpacity
                            style={styles.claimButton}
                            onPress={() => handleClaimQuick(c)}
                            disabled={claimingId === targetId}
                            activeOpacity={0.8}
                          >
                            {claimingId === targetId ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.claimButtonText}>Claim Case</Text>
                            )}
                          </TouchableOpacity>
                        ) : isMine ? (
                          <View style={styles.myCaseBadge}>
                            <Text style={styles.myCaseBadgeText}>Assigned to You</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badge: {
    backgroundColor: colors.light.vetBadgeBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.vetBadge,
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: colors.light.dangerBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  logoutButtonText: {
    color: colors.light.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  cacheNotice: {
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cacheNoticeText: {
    fontSize: typography.sizes.xs,
    color: '#92400E',
    fontWeight: typography.weights.medium,
  },
  centerLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.light.textSecondary,
    fontSize: typography.sizes.sm,
  },
  errorBox: {
    backgroundColor: colors.light.dangerBg,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.base,
    alignItems: 'center',
  },
  errorText: {
    color: colors.light.danger,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.light.danger,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.light.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  sampleNoteContainer: {
    marginBottom: spacing.base,
    paddingHorizontal: spacing.xs,
  },
  sampleNoteText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
  },
  actionSection: {
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  primaryActionBtn: {
    backgroundColor: '#065F46',
    borderRadius: radii.md,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  secondaryActionBtn: {
    backgroundColor: '#1E3A8A',
  },
  primaryActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  primaryActionIcon: {
    fontSize: 26,
  },
  primaryActionTitle: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  primaryActionDesc: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  recentSection: {
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  seeAllText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  emptyContainer: {
    backgroundColor: colors.light.surface,
    padding: spacing.xl,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  caseCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  caseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  caseIdBadge: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  caseIdText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  riskPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  diseaseTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  caseMeta: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: spacing.sm,
  },
  caseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs,
  },
  farmerContact: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.light.textSecondary,
  },
  claimButton: {
    backgroundColor: '#065F46',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  myCaseBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  myCaseBadgeText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
});
