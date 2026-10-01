/**
 * PashuCare - Officer: NADRES Forewarning, Epidemic Trends & Alerts
 * File: mobile/app/(officer)/forewarning/index.tsx
 *
 * Phase 10.4 Implementation:
 * Production Government NADRES Forewarning & Active Early Warning Alerts.
 * Integrates:
 * - GET /api/nadres/alerts (Live ICAR-NIVEDI forewarnings + field outbreaks + weather context)
 * - GET /api/nadres/forewarning (District early warning risk levels)
 * - GET /api/cases/advisories (Dynamic preventive biosecurity protocols)
 * - Offline SQLite caching with last-updated timestamp
 * - Strict district scoping: zero hardcoded fallbacks
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { nadresService } from '../../../src/services/nadresService';
import {
  NadresAlert,
  NadresForewarningResponse,
  WeatherContext,
} from '../../../src/types/advisory';
import { OutbreakAdvisoryResponse } from '../../../src/types/containment';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

type ForewarningTab = 'ALERTS' | 'EARLY_WARNING' | 'PROTOCOLS';

export default function OfficerForewarningScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const district = user?.district;

  // State
  const [activeTab, setActiveTab] = useState<ForewarningTab>('ALERTS');
  const [alerts, setAlerts] = useState<NadresAlert[]>([]);
  const [weatherContext, setWeatherContext] = useState<WeatherContext | null>(null);
  const [forewarning, setForewarning] = useState<NadresForewarningResponse | null>(null);
  const [caseAdvisories, setCaseAdvisories] = useState<OutbreakAdvisoryResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Load all NADRES and advisory streams
  const loadForewarningData = useCallback(
    async (isPullRefresh = false) => {
      if (!district) {
        setLoading(false);
        setRefreshing(false);
        setErrorMessage(
          'Officer district jurisdiction is not configured on this account. Contact system administrator.'
        );
        return;
      }

      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const [alertsResult, forewarningResult, caseAdvResult] = await Promise.allSettled([
          nadresService.getNadresAlerts({ district }),
          nadresService.getDistrictForewarning(district),
          nadresService.getCaseAdvisories(district),
        ]);

        if (alertsResult.status === 'fulfilled') {
          setAlerts(alertsResult.value.alerts);
          setWeatherContext(alertsResult.value.weatherContext || null);
          setIsFromCache(alertsResult.value.fromCache);
          setLastUpdated(alertsResult.value.lastUpdated);
        }

        if (forewarningResult.status === 'fulfilled') {
          setForewarning(forewarningResult.value.forewarning);
        }

        if (caseAdvResult.status === 'fulfilled') {
          setCaseAdvisories(caseAdvResult.value);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to retrieve NADRES forewarning data.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [district]
  );

  useEffect(() => {
    loadForewarningData();
  }, [loadForewarningData]);

  // Risk badges
  const getRiskColor = (level?: string) => {
    const norm = String(level || '').toLowerCase();
    if (norm.includes('critical') || norm.includes('very high')) {
      return { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    }
    if (norm.includes('high')) {
      return { text: '#EA580C', bg: '#FFF7ED', border: '#FFEDD5' };
    }
    if (norm.includes('moderate')) {
      return { text: '#D97706', bg: '#FFFBEB', border: '#FEF3C7' };
    }
    return { text: '#2563EB', bg: '#EFF6FF', border: '#DBEAFE' };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.officerBadge} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>NADRES Forewarning & Alerts</Text>
            <Text style={styles.headerSubtitle}>
              {district ? `Jurisdiction: ${district} District` : 'District Jurisdiction Unavailable'}
            </Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ALERTS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('ALERTS')}
            activeOpacity={0.7}
            accessibilityLabel="Active Forewarning Alerts tab"
            accessibilityRole="tab"
          >
            <Text style={[styles.tabButtonText, activeTab === 'ALERTS' && styles.tabButtonTextActive]}>
              Active Alerts ({alerts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'EARLY_WARNING' && styles.tabButtonActive]}
            onPress={() => setActiveTab('EARLY_WARNING')}
            activeOpacity={0.7}
            accessibilityLabel="ICAR-NIVEDI Early Warning tab"
            accessibilityRole="tab"
          >
            <Text style={[styles.tabButtonText, activeTab === 'EARLY_WARNING' && styles.tabButtonTextActive]}>
              Early Warning
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'PROTOCOLS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('PROTOCOLS')}
            activeOpacity={0.7}
            accessibilityLabel="Biosecurity Protocols tab"
            accessibilityRole="tab"
          >
            <Text style={[styles.tabButtonText, activeTab === 'PROTOCOLS' && styles.tabButtonTextActive]}>
              Protocols
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Notice */}
      <OfflineNotice />
      {isFromCache && (
        <View style={styles.cachedNoticeBanner}>
          <Text style={styles.cachedNoticeText}>
            📦 Displaying cached NADRES forewarnings
            {lastUpdated ? ` • Last synced: ${new Date(lastUpdated).toLocaleTimeString()}` : ''}
          </Text>
        </View>
      )}

      {/* Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.light.officerBadge} />
          <Text style={styles.loadingText}>Loading government forewarning data...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Surveillance Notice</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadForewarningData()}
            activeOpacity={0.8}
            accessibilityLabel="Retry loading forewarning"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadForewarningData(true)}
              colors={[colors.light.officerBadge]}
            />
          }
        >
          {/* TAB 1: ACTIVE ALERTS */}
          {activeTab === 'ALERTS' && (
            <View style={styles.tabSection}>
              {/* Weather & Microclimate Context Banner */}
              {weatherContext && (
                <View style={styles.weatherCard}>
                  <Text style={styles.weatherTitle}>Agrometeorological Microclimate Context</Text>
                  <View style={styles.weatherGrid}>
                    <View style={styles.weatherItem}>
                      <Text style={styles.weatherValue}>{weatherContext.tempC}°C</Text>
                      <Text style={styles.weatherLabel}>Temperature</Text>
                    </View>
                    <View style={styles.weatherItem}>
                      <Text style={styles.weatherValue}>{weatherContext.humidityPct}%</Text>
                      <Text style={styles.weatherLabel}>Humidity</Text>
                    </View>
                    <View style={styles.weatherItem}>
                      <Text style={styles.weatherValue}>{weatherContext.thi}</Text>
                      <Text style={styles.weatherLabel}>THI Index</Text>
                    </View>
                    <View style={styles.weatherItem}>
                      <Text style={styles.weatherValue}>{weatherContext.stressLevel}</Text>
                      <Text style={styles.weatherLabel}>Heat Stress</Text>
                    </View>
                  </View>
                </View>
              )}

              {alerts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🛡️</Text>
                  <Text style={styles.emptyTitle}>No Active Forewarning Alerts</Text>
                  <Text style={styles.emptyText}>
                    No imminent high-risk epidemiological forewarnings recorded for {district} District.
                  </Text>
                </View>
              ) : (
                alerts.map((alert) => {
                  const riskColors = getRiskColor(alert.riskLevel);
                  return (
                    <View key={alert.id} style={styles.alertCard}>
                      <View style={styles.alertHeader}>
                        <View
                          style={[
                            styles.riskBadge,
                            {
                              backgroundColor: riskColors.bg,
                              borderColor: riskColors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.riskBadgeText, { color: riskColors.text }]}>
                            {alert.riskBadgeEn || alert.riskLevel}
                          </Text>
                        </View>
                        <Text style={styles.dateText}>{alert.reportedDateStr || alert.reportedDate}</Text>
                      </View>

                      <Text style={styles.diseaseTitle}>{alert.diseaseName}</Text>
                      <Text style={styles.speciesText}>Species: {alert.speciesAffected}</Text>
                      <Text style={styles.locationText}>Location: {alert.reportedLocation}</Text>

                      {/* Symptoms */}
                      {alert.symptoms && alert.symptoms.length > 0 && (
                        <View style={styles.symptomsContainer}>
                          <Text style={styles.symptomsLabel}>Clinical Presentation:</Text>
                          <Text style={styles.symptomsText}>{alert.symptoms.join(', ')}</Text>
                        </View>
                      )}

                      {/* AI / Clinical Recommendation */}
                      {alert.aiRecommendationEn && (
                        <View style={styles.recommendationBox}>
                          <View style={styles.recommendationHeader}>
                            <Text style={styles.recommendationTag}>
                              {alert.isAIPowered ? `🤖 ${alert.aiModel || 'Gemini'} Directive` : '📋 Clinical Directive'}
                            </Text>
                          </View>
                          <Text style={styles.recommendationText}>{alert.aiRecommendationEn}</Text>
                        </View>
                      )}

                      {/* Data Source */}
                      <View style={styles.sourceFooter}>
                        <Text style={styles.sourceText}>Source: {alert.dataSource}</Text>
                        <TouchableOpacity
                          style={styles.actionLink}
                          onPress={() => router.push('/(officer)/containment' as any)}
                          accessibilityLabel="Coordinate containment response"
                          accessibilityRole="button"
                        >
                          <Text style={styles.actionLinkText}>Response →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 2: EARLY WARNING */}
          {activeTab === 'EARLY_WARNING' && (
            <View style={styles.tabSection}>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>ICAR-NIVEDI NADRES v2.0 Early Warning</Text>
                <Text style={styles.infoCardDescription}>
                  National Animal Disease Referral Expert System (NADRES) provides monthly meteorological-driven predictive forewarning of 13 major livestock diseases across Indian districts.
                </Text>
              </View>

              {forewarning?.highRiskDiseases && forewarning.highRiskDiseases.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionBlockTitle}>High Risk Diseases Forewarned</Text>
                  {forewarning.highRiskDiseases.map((d, idx) => (
                    <View key={idx} style={styles.diseaseItemCard}>
                      <View style={styles.diseaseItemTop}>
                        <Text style={styles.diseaseItemName}>{d.disease_name || d.diseaseName || 'Disease'}</Text>
                        <View style={[styles.riskBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                          <Text style={[styles.riskBadgeText, { color: '#DC2626' }]}>High Risk</Text>
                        </View>
                      </View>
                      <Text style={styles.diseaseItemSpecies}>Target Species: {d.species || 'Cattle / Buffalo'}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>📊</Text>
                  <Text style={styles.emptyTitle}>No High Risk Forewarnings</Text>
                  <Text style={styles.emptyText}>
                    The current meteorological cycle does not indicate high outbreak probability in {district}.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: PROTOCOLS */}
          {activeTab === 'PROTOCOLS' && (
            <View style={styles.tabSection}>
              {caseAdvisories?.summary && (
                <View style={styles.summaryMetricsCard}>
                  <Text style={styles.summaryMetricsTitle}>District Epidemiological Summary</Text>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNumber}>{caseAdvisories.summary.activeCasesCount}</Text>
                      <Text style={styles.metricLabel}>Active Cases</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNumber}>{caseAdvisories.summary.totalAnimalsAffected}</Text>
                      <Text style={styles.metricLabel}>Animals Affected</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNumber}>{caseAdvisories.summary.activeContainmentZones}</Text>
                      <Text style={styles.metricLabel}>Active Zones</Text>
                    </View>
                  </View>
                </View>
              )}

              {caseAdvisories?.recommendations && caseAdvisories.recommendations.length > 0 ? (
                caseAdvisories.recommendations.map((rec, idx) => (
                  <View key={idx} style={styles.protocolCard}>
                    <View style={styles.protocolHeader}>
                      <Text style={styles.protocolDisease}>{rec.disease}</Text>
                      <View style={[styles.riskBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                        <Text style={[styles.riskBadgeText, { color: '#DC2626' }]}>{rec.priority}</Text>
                      </View>
                    </View>
                    <Text style={styles.protocolTitle}>Protocol: {rec.protocol}</Text>
                    <View style={styles.protocolActionsList}>
                      {rec.actions.map((act, aIdx) => (
                        <View key={aIdx} style={styles.actionRow}>
                          <Text style={styles.actionBullet}>•</Text>
                          <Text style={styles.actionText}>{act}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🛡️</Text>
                  <Text style={styles.emptyTitle}>Standard Biosecurity In Effect</Text>
                  <Text style={styles.emptyText}>
                    No specialized quarantine protocol currently triggered for {district}.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    backgroundColor: colors.light.officerBadge,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.officerBadgeBg,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.light.textInverse,
  },
  tabButtonText: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: typography.weights.semibold,
  },
  tabButtonTextActive: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  tabSection: {
    gap: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
  retryButton: {
    backgroundColor: colors.light.officerBadge,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  cachedNoticeBanner: {
    backgroundColor: colors.light.warningBg,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.warning,
  },
  cachedNoticeText: {
    fontSize: typography.sizes.xs,
    color: colors.light.warning,
    fontWeight: typography.weights.medium,
  },
  weatherCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  weatherTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  weatherGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weatherItem: {
    alignItems: 'center',
  },
  weatherValue: {
    fontSize: typography.sizes.lg,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
  },
  weatherLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  riskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  diseaseTitle: {
    fontSize: typography.sizes.lg,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  speciesText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.semibold,
    marginBottom: 2,
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    marginBottom: spacing.sm,
  },
  symptomsContainer: {
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  symptomsLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  symptomsText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    lineHeight: 18,
  },
  recommendationBox: {
    backgroundColor: colors.light.primarySubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.primaryHighlight,
  },
  recommendationHeader: {
    marginBottom: 4,
  },
  recommendationTag: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primaryDark,
  },
  recommendationText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    lineHeight: 18,
  },
  sourceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs + 2,
  },
  sourceText: {
    fontSize: 10,
    color: colors.light.textMuted,
    flex: 1,
    marginRight: spacing.sm,
  },
  actionLink: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  actionLinkText: {
    fontSize: typography.sizes.xs,
    color: colors.light.officerBadge,
    fontWeight: typography.weights.bold,
  },
  infoCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  infoCardTitle: {
    fontSize: typography.sizes.base,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  infoCardDescription: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    lineHeight: 20,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionBlockTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diseaseItemCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  diseaseItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  diseaseItemName: {
    fontSize: typography.sizes.base,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
  },
  diseaseItemSpecies: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  summaryMetricsCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  summaryMetricsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: typography.sizes.xl,
    color: colors.light.officerBadge,
    fontWeight: typography.weights.bold,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  protocolCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  protocolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  protocolDisease: {
    fontSize: typography.sizes.base,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
  },
  protocolTitle: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  protocolActionsList: {
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  actionBullet: {
    color: colors.light.officerBadge,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  actionText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
});
