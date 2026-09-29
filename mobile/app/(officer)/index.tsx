/**
 * Livestock Saathi - Officer Executive Dashboard & KPI Command Center
 * File: mobile/app/(officer)/index.tsx
 *
 * Production Executive Surveillance Command Center for District Veterinary & Animal Husbandry Officers.
 * Fetches real metrics from GET /api/dashboard/summary with offline SQLite caching.
 * Strictly adheres to server-authoritative data (zero fake numbers, zero mock KPIs).
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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useAppLanguage } from '../../src/services/i18n';
import { officerService } from '../../src/services/officerService';
import { DashboardSummary } from '../../src/types/officer';
import { colors, typography, spacing, radii, shadows } from '../../src/theme';

export default function OfficerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useAppLanguage();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string>('All');

  const userId = user?.id || (user as any)?._id || 'officer_default';
  const officerName = user?.name || 'District Officer';
  const districtName = user?.district || 'District Surveillance';

  const loadDashboardData = useCallback(async (block: string = selectedBlock, isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const result = await officerService.getDashboardSummary(userId, {
        district: user?.district,
        block: block !== 'All' ? block : undefined,
      });

      setSummary(result.summary);
      setIsFromCache(result.fromCache);
      setLastUpdated(result.lastUpdated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to retrieve surveillance metrics.');
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, user?.district, selectedBlock]);

  useEffect(() => {
    loadDashboardData(selectedBlock);
  }, [selectedBlock, loadDashboardData]);

  const handleLogout = () => {
    Alert.alert(
      t('common.logOut', 'Sign Out'),
      t('officer.signOutConfirm', 'Are you sure you want to sign out from the Officer Command Center?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.logOut', 'Sign Out'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const formatLastUpdated = (timestamp: number | null): string => {
    if (!timestamp) return 'Last updated: Not available';
    const d = new Date(timestamp);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `Last updated: ${day} ${month}, ${hours}:${minutes} ${ampm}`;
  };

  // Extract block names dynamically from real block distribution if available
  const availableBlocks = ['All'];
  if (summary?.blockDistribution) {
    summary.blockDistribution.forEach((b) => {
      if (b._id && !availableBlocks.includes(b._id)) {
        availableBlocks.push(b._id);
      }
    });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadDashboardData(selectedBlock, true)}
          colors={[colors.light.officerBadge]}
          tintColor={colors.light.officerBadge}
        />
      }
    >
      {/* 1. Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{t('nav.officerCommand', 'OFFICER COMMAND CENTER')}</Text>
            </View>
            <View style={styles.pulseDot} />
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push('/(officer)/profile' as any)}
              style={styles.profileButton}
              activeOpacity={0.7}
              accessibilityLabel={t('common.profile', 'Profile')}
            >
              <Text style={styles.profileButtonText}>👤 {t('common.profile', 'Profile')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.7}>
              <Text style={styles.logoutButtonText}>{t('common.signOut', 'Sign Out')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>{officerName}</Text>
        <Text style={styles.subtitle}>
          Administrative Jurisdiction: <Text style={styles.boldText}>{districtName}</Text>
        </Text>

        {/* Sync & Offline Status */}
        <View style={styles.metaRow}>
          <Text style={styles.lastUpdatedText}>{formatLastUpdated(lastUpdated)}</Text>
          <TouchableOpacity
            onPress={() => loadDashboardData(selectedBlock, false)}
            style={styles.refreshIconBtn}
            disabled={loading || refreshing}
          >
            <Text style={styles.refreshIconText}>🔄 {t('common.refresh', 'Refresh')}</Text>
          </TouchableOpacity>
        </View>

        {/* Offline Banner */}
        {isFromCache && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerIcon}>⚠️</Text>
            <Text style={styles.offlineBannerText}>
              Offline Mode — displaying cached surveillance data.
            </Text>
          </View>
        )}
      </View>

      {/* 2. Loading State */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.light.officerBadge} />
          <Text style={styles.loadingText}>{t('common.loading', 'Syncing Epidemiological Surveillance Metrics...')}</Text>
        </View>
      )}

      {/* 3. Error / Unavailable State (Honest, No Fake Data) */}
      {!loading && errorMessage && !summary && (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('common.error', 'Surveillance Data Unavailable')}</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadDashboardData(selectedBlock, false)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>{t('common.retry', 'Retry Sync')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. Active Dashboard Content */}
      {!loading && summary && (
        <>
          {/* Sub-District / Block Filter */}
          {availableBlocks.length > 1 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Filter by Block / Sub-District:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {availableBlocks.map((b) => {
                  const isSelected = selectedBlock === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => setSelectedBlock(b)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {b === 'All' ? 'All Blocks' : b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Active Outbreak Alert Callout */}
          {(summary.triageMetrics?.outbreakCount || 0) > 0 && (
            <View style={styles.outbreakAlertCard}>
              <View style={styles.outbreakAlertHeader}>
                <Text style={styles.outbreakAlertIcon}>🚨</Text>
                <Text style={styles.outbreakAlertTitle}>
                  {summary.triageMetrics.outbreakCount} Active Outbreak Cluster
                  {summary.triageMetrics.outbreakCount > 1 ? 's' : ''} Detected
                </Text>
              </View>
              <Text style={styles.outbreakAlertBody}>
                DBSCAN spatial clustering identified proximity outbreak clusters in {districtName}.
                Immediate containment perimeters and emergency ring vaccination required.
              </Text>
              <View style={styles.outbreakActionRow}>
                <TouchableOpacity
                  style={styles.outbreakActionBtn}
                  onPress={() => router.push('/(officer)/outbreaks' as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.outbreakActionBtnText}>View Outbreak Clusters →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.outbreakActionBtn, styles.outbreakContainmentBtn]}
                  onPress={() => router.push('/(officer)/containment' as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.outbreakActionBtnText}>Manage Containment →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 5. KPI Metric Grid */}
          <Text style={styles.sectionTitle}>{t('officer.kpis', 'District Epidemiological KPIs')}</Text>
          <View style={styles.kpiGrid}>
            {/* Total Reports */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('officer.totalReports', 'TOTAL REPORTS')}</Text>
              <Text style={styles.kpiValue}>{summary.totalReports}</Text>
              <Text style={styles.kpiSub}>Logged cases</Text>
            </View>

            {/* Active Cases */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('officer.activeCases', 'ACTIVE CASES')}</Text>
              <Text style={[styles.kpiValue, { color: colors.light.info }]}>
                {summary.activeCases}
              </Text>
              <Text style={styles.kpiSub}>Under investigation</Text>
            </View>

            {/* Livestock Mortalities */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('officer.mortalities', 'MORTALITIES')}</Text>
              <Text style={[styles.kpiValue, { color: colors.light.danger }]}>
                {summary.totalMortality}
              </Text>
              <Text style={[styles.kpiSub, { color: colors.light.danger }]}>
                Reported deaths
              </Text>
            </View>

            {/* Critical Triage */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('officer.highRiskZones', 'HIGH / CRITICAL')}</Text>
              <Text style={[styles.kpiValue, { color: colors.light.warning }]}>
                {(summary.triageMetrics?.criticalCount || 0) +
                  (summary.triageMetrics?.highCount || 0)}
              </Text>
              <Text style={styles.kpiSub}>Urgent triage</Text>
            </View>

            {/* Outbreaks */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('officer.activeClusters', 'OUTBREAKS')}</Text>
              <Text style={[styles.kpiValue, { color: colors.light.danger }]}>
                {summary.triageMetrics?.outbreakCount || 0}
              </Text>
              <Text style={styles.kpiSub}>Cluster matches</Text>
            </View>

            {/* Vaccination Coverage */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('officer.vaccineCoverage', 'VACCINATION')}</Text>
              <Text style={[styles.kpiValue, { color: colors.light.success }]}>
                {summary.vaccination?.coveragePct ?? 0}%
              </Text>
              <Text style={styles.kpiSub}>District coverage</Text>
            </View>
          </View>

          {/* 6. Operational Status & Capacity Strips */}
          <Text style={styles.sectionTitle}>{t('officer.capacityDiagnostics', 'Operational Capacity & Diagnostics')}</Text>
          <View style={styles.capacityCard}>
            <View style={styles.capacityRow}>
              <View>
                <Text style={styles.capacityTitle}>{t('officer.vaccineDriveCoverage', 'Vaccination Drive Coverage')}</Text>
                <Text style={styles.capacitySubtitle}>
                  {summary.vaccination?.totalCovered?.toLocaleString() || '0'} of{' '}
                  {summary.vaccination?.totalTarget?.toLocaleString() || '0'} livestock protected
                </Text>
              </View>
              <View style={styles.capacityBadge}>
                <Text style={styles.capacityBadgeText}>
                  {summary.vaccination?.coveragePct ?? 0}%
                </Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, summary.vaccination?.coveragePct || 0)}%` },
                ]}
              />
            </View>
          </View>

          {/* Lab Pipeline Summary */}
          {summary.labPipeline && Object.keys(summary.labPipeline).length > 0 && (
            <View style={styles.labCard}>
              <Text style={styles.labCardTitle}>{t('officer.labPipeline', 'Diagnostic Lab Pipeline')}</Text>
              <View style={styles.labStatsRow}>
                {Object.entries(summary.labPipeline).map(([status, count]) => (
                  <View key={status} style={styles.labStatItem}>
                    <Text style={styles.labStatCount}>{count}</Text>
                    <Text style={styles.labStatLabel}>{status}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sub-District Burden Overview */}
          {summary.blockDistribution && summary.blockDistribution.length > 0 && (
            <View style={styles.blockSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t('officer.subDistrictBurden', 'Sub-District Disease Burden')}</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(officer)/surveillance' as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewDetailsText}>Full Analysis →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.blockList}>
                {summary.blockDistribution.slice(0, 4).map((b, idx) => (
                  <View key={idx} style={styles.blockRow}>
                    <View>
                      <Text style={styles.blockName}>{b._id || 'District'} Block</Text>
                      <Text style={styles.blockDeaths}>
                        {b.deaths > 0 ? `${b.deaths} mortalities registered` : 'Zero mortalities'}
                      </Text>
                    </View>
                    <View style={styles.blockCountBadge}>
                      <Text style={styles.blockCountText}>{b.count} cases</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {/* 7. Quick Navigation to Officer Modules (Always Accessible) */}
      <Text style={styles.sectionTitle}>{t('officer.operationsModules', 'Surveillance & Operations Modules')}</Text>
      <View style={styles.navGrid}>
        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(officer)/surveillance' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navTitle}>{t('nav.epidemicSurveillance', 'Epidemic Surveillance')}</Text>
          <Text style={styles.navDesc}>30-day epidemic curve, triage funnel, disease breakdown</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(officer)/outbreaks' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>⚠️</Text>
          <Text style={styles.navTitle}>{t('nav.outbreakAlerts', 'Outbreak Alerts')}</Text>
          <Text style={styles.navDesc}>DBSCAN proximity clusters, threshold alarms, high-risk villages</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(officer)/containment' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>🛡️</Text>
          <Text style={styles.navTitle}>{t('nav.containmentZones', 'Containment Zones')}</Text>
          <Text style={styles.navDesc}>Quarantine buffers, movement restrictions, ring vaccination</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(officer)/vaccination' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>⛺</Text>
          <Text style={styles.navTitle}>{t('nav.massVaccination', 'Mass Vaccination Camps')}</Text>
          <Text style={styles.navDesc}>District camp scheduling, slot allocation, and logistics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(officer)/map' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>🗺️</Text>
          <Text style={styles.navTitle}>{t('nav.districtGisMap', 'District GIS Map')}</Text>
          <Text style={styles.navDesc}>High-density outbreak heatmaps and zone boundaries</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(officer)/advisories' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>📢</Text>
          <Text style={styles.navTitle}>{t('nav.officialAdvisories', 'Official Advisories')}</Text>
          <Text style={styles.navDesc}>Biosecurity bulletins, emergency directives, and broadcasts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(officer)/forewarning' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>📡</Text>
          <Text style={styles.navTitle}>{t('nav.nadresForewarning', 'NADRES Forewarning')}</Text>
          <Text style={styles.navDesc}>ICAR-NIVEDI early warnings, meteorological risk, and alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(officer)/profile' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.navIcon}>🏛️</Text>
          <Text style={styles.navTitle}>{t('nav.officerProfile', 'Officer Profile & Settings')}</Text>
          <Text style={styles.navDesc}>Administrative credentials, district jurisdiction, language, and system configuration</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.base,
    backgroundColor: colors.light.background,
    paddingBottom: spacing.xxl * 2,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roleBadge: {
    backgroundColor: colors.light.officerBadgeBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  roleBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.officerBadge,
    letterSpacing: 0.5,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.light.success,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  profileButton: {
    backgroundColor: colors.light.officerBadgeBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.light.officerBadge,
  },
  profileButtonText: {
    color: colors.light.officerBadge,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
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
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  boldText: {
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  lastUpdatedText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  refreshIconBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  refreshIconText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.officerBadge,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.warningBg,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  offlineBannerIcon: {
    fontSize: 14,
  },
  offlineBannerText: {
    fontSize: typography.sizes.xs,
    color: colors.light.warning,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
  },
  errorCard: {
    backgroundColor: colors.light.surface,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.danger,
    marginVertical: spacing.lg,
    ...shadows.sm,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  errorTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
  },
  errorMessage: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.light.officerBadge,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryButtonText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  filterSection: {
    marginBottom: spacing.base,
  },
  filterLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.light.officerBadgeBg,
    borderColor: colors.light.officerBadge,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
  },
  filterChipTextActive: {
    color: colors.light.officerBadge,
    fontWeight: typography.weights.bold,
  },
  outbreakAlertCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: colors.light.danger,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  outbreakAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  outbreakAlertIcon: {
    fontSize: 18,
  },
  outbreakAlertTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
  },
  outbreakAlertBody: {
    fontSize: typography.sizes.xs,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  outbreakActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  outbreakActionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.light.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  outbreakContainmentBtn: {
    backgroundColor: colors.light.officerBadge,
  },
  outbreakActionBtnText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginVertical: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  viewDetailsText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.officerBadge,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  kpiCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.light.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.xs,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  capacityCard: {
    backgroundColor: colors.light.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.sm,
    ...shadows.xs,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  capacityTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  capacitySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  capacityBadge: {
    backgroundColor: colors.light.primarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  capacityBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.round,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.light.primary,
    borderRadius: radii.round,
  },
  labCard: {
    backgroundColor: colors.light.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.base,
    ...shadows.xs,
  },
  labCardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
  },
  labStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  labStatItem: {
    alignItems: 'center',
  },
  labStatCount: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.officerBadge,
  },
  labStatLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  blockSection: {
    marginBottom: spacing.base,
  },
  blockList: {
    gap: spacing.xs,
  },
  blockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  blockName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  blockDeaths: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  blockCountBadge: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  blockCountText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  navGrid: {
    gap: spacing.sm,
  },
  navCard: {
    backgroundColor: colors.light.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.xs,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  navTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  navDesc: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
