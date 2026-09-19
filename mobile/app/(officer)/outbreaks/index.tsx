/**
 * Livestock Saathi - Officer: Outbreak Alerts & Spatial Surveillance
 * File: mobile/app/(officer)/outbreaks/index.tsx
 *
 * Phase 10.2 Implementation:
 * Executive outbreak surveillance center for District Livestock Officers.
 * Integrates:
 * - GET /api/cases/clusters (PostGIS DBSCAN spatial clusters <= 5km)
 * - GET /api/cases/risk-analysis (Explainable epidemiological risk engine)
 * - Offline SQLite caching with last-updated timestamp
 * - Direct navigation to District GIS Map with focal cluster centering
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { containmentService } from '../../../src/services/containmentService';
import { officerService } from '../../../src/services/officerService';
import { OutbreakCluster } from '../../../src/types/containment';
import { OfficerRiskAnalysisResponse, OfficerRiskFactor } from '../../../src/types/officer';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

type RiskFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE';

export default function OfficerOutbreaksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const district = user?.district || 'Pune';

  // State
  const [clusters, setClusters] = useState<OutbreakCluster[]>([]);
  const [riskData, setRiskData] = useState<OfficerRiskAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<RiskFilter>('ALL');

  const loadOutbreakData = useCallback(async () => {
    try {
      setError(null);
      const [clustersRes, riskRes] = await Promise.allSettled([
        containmentService.getSpatialOutbreakClusters({ district }),
        officerService.getOfficerRiskAnalysis({ district }),
      ]);

      if (clustersRes.status === 'fulfilled') {
        setClusters(clustersRes.value.clusters || []);
        setIsFromCache(clustersRes.value.fromCache);
      } else {
        console.warn('[OfficerOutbreaks] Clusters fetch failed:', clustersRes.reason);
      }

      if (riskRes.status === 'fulfilled') {
        setRiskData(riskRes.value);
      } else {
        console.warn('[OfficerOutbreaks] Risk analysis fetch failed:', riskRes.reason);
      }
    } catch (err: any) {
      console.warn('[OfficerOutbreaks] Error loading data:', err.message);
      setError(err.message || 'Failed to load outbreak surveillance data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [district]);

  useEffect(() => {
    loadOutbreakData();
  }, [loadOutbreakData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOutbreakData();
  }, [loadOutbreakData]);

  // Filter clusters
  const filteredClusters = useMemo(() => {
    if (activeFilter === 'ALL') return clusters;
    return clusters.filter((c) => {
      const tier = String(c.riskTier || c.risk || '').toUpperCase();
      return tier.includes(activeFilter);
    });
  }, [clusters, activeFilter]);

  // Outbreak counts
  const criticalCount = useMemo(() => {
    return clusters.filter((c) => {
      const tier = String(c.riskTier || c.risk || '').toUpperCase();
      return tier.includes('CRITICAL');
    }).length;
  }, [clusters]);

  const highCount = useMemo(() => {
    return clusters.filter((c) => {
      const tier = String(c.riskTier || c.risk || '').toUpperCase();
      return tier.includes('HIGH');
    }).length;
  }, [clusters]);

  const moderateCount = useMemo(() => {
    return clusters.filter((c) => {
      const tier = String(c.riskTier || c.risk || '').toUpperCase();
      return tier.includes('MODERATE') || tier.includes('LOW');
    }).length;
  }, [clusters]);

  // Helper for navigating to map with centering
  const navigateToMapWithCluster = (cluster: OutbreakCluster) => {
    const lat = cluster.centroidLat;
    const lng = cluster.centroidLng;
    if (typeof lat === 'number' && typeof lng === 'number') {
      router.push({
        pathname: '/(officer)/map',
        params: {
          focusLat: String(lat),
          focusLng: String(lng),
          clusterId: cluster.clusterId || cluster.id || '',
        },
      } as any);
    } else {
      router.push('/(officer)/map' as any);
    }
  };

  const risk = riskData?.riskAnalysis;
  const riskScore = risk?.riskScore ?? 0;
  const riskLevel = risk?.riskLevel ?? 'LOW';

  const riskBadgeStyle = useMemo(() => {
    if (riskLevel === 'CRITICAL') return styles.badgeCritical;
    if (riskLevel === 'HIGH') return styles.badgeHigh;
    if (riskLevel === 'MEDIUM') return styles.badgeMedium;
    return styles.badgeLow;
  }, [riskLevel]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.officerBadge} />
      <OfflineNotice />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>Outbreak Surveillance</Text>
            <Text style={styles.headerSubtitle}>
              {district} District • {clusters.length} Active Cluster(s)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.mapNavBtn}
            onPress={() => router.push('/(officer)/map' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.mapNavBtnText}>🗺️ GIS Map</Text>
          </TouchableOpacity>
        </View>

        {isFromCache && (
          <View style={styles.cacheBanner}>
            <Text style={styles.cacheBannerText}>
              ⚡ Offline Mode: Displaying saved outbreak clusters from device cache.
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Analyzing district epidemiological clusters...</Text>
        </View>
      ) : error && clusters.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Surveillance Feed Unavailable</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadOutbreakData} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry Analysis</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
        >
          {/* Risk Analysis Overview Card */}
          {risk && (
            <View style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <View>
                  <Text style={styles.riskCardTitle}>District Epidemiological Risk</Text>
                  <Text style={styles.riskCardSub}>AI-computed contagion & density analysis</Text>
                </View>
                <View style={[styles.riskLevelBadge, riskBadgeStyle]}>
                  <Text style={styles.riskLevelText}>{riskLevel}</Text>
                </View>
              </View>

              <View style={styles.scoreBarContainer}>
                <View style={styles.scoreBarTrack}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      { width: `${Math.min(riskScore, 100)}%` },
                      riskScore >= 75
                        ? { backgroundColor: colors.light.danger }
                        : riskScore >= 50
                        ? { backgroundColor: colors.light.warning }
                        : riskScore >= 25
                        ? { backgroundColor: '#FBBF24' }
                        : { backgroundColor: colors.light.success },
                    ]}
                  />
                </View>
                <Text style={styles.scoreNumberText}>{riskScore}/100</Text>
              </View>

              {/* Contributing Risk Factors */}
              {Array.isArray(risk.factors) && risk.factors.length > 0 && (
                <View style={styles.factorsList}>
                  <Text style={styles.factorsHeader}>Contributing Epidemiological Factors:</Text>
                  {risk.factors.slice(0, 3).map((f: OfficerRiskFactor, idx: number) => (
                    <View key={`factor_${idx}`} style={styles.factorItem}>
                      <Text style={styles.factorBullet}>•</Text>
                      <Text style={styles.factorText}>{f.rationale}</Text>
                      <Text style={styles.factorPoints}>+{f.points} pts</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Recommendations */}
              <View style={styles.recRow}>
                {risk.containmentRecommendation?.recommended && (
                  <View style={styles.recPill}>
                    <Text style={styles.recPillIcon}>🛡️</Text>
                    <Text style={styles.recPillText}>
                      Containment ({risk.containmentRecommendation.suggestedRadiusKm}km advised)
                    </Text>
                  </View>
                )}
                {risk.vaccinationRecommendation?.ringVaccinationAdvised && (
                  <View style={[styles.recPill, styles.recPillVaccine]}>
                    <Text style={styles.recPillIcon}>💉</Text>
                    <Text style={styles.recPillText}>
                      Ring Vaccination ({risk.vaccinationRecommendation.targetRadiusKm}km)
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Filter Chips Bar */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Active Spatial Clusters ({clusters.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
                onPress={() => setActiveFilter('ALL')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>
                  All ({clusters.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'CRITICAL' && styles.filterChipActiveCritical]}
                onPress={() => setActiveFilter('CRITICAL')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'CRITICAL' && styles.filterChipTextActive,
                  ]}
                >
                  🔴 Critical ({criticalCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'HIGH' && styles.filterChipActiveHigh]}
                onPress={() => setActiveFilter('HIGH')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'HIGH' && styles.filterChipTextActive,
                  ]}
                >
                  🟠 High ({highCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'MODERATE' && styles.filterChipActiveModerate]}
                onPress={() => setActiveFilter('MODERATE')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'MODERATE' && styles.filterChipTextActive,
                  ]}
                >
                  🟡 Moderate ({moderateCount})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Cluster Cards */}
          {filteredClusters.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>No Matching Outbreak Clusters</Text>
              <Text style={styles.emptySub}>
                {clusters.length === 0
                  ? `No spatial disease clusters (<=5km) currently detected in ${district} district.`
                  : 'No clusters match the selected risk filter.'}
              </Text>
            </View>
          ) : (
            filteredClusters.map((cluster, idx) => {
              const cases = cluster.count || cluster.caseCount || 0;
              const affected = (cluster as any).totalAffected || cases;
              const tier = String(cluster.riskTier || cluster.risk || 'High').toUpperCase();
              const isCrit = tier.includes('CRITICAL');

              return (
                <View key={`cluster_${cluster.clusterId || idx}`} style={styles.clusterCard}>
                  <View style={styles.clusterHeader}>
                    <View style={styles.clusterTitleGroup}>
                      <Text style={styles.clusterDisease}>{cluster.disease}</Text>
                      <Text style={styles.clusterIdText}>
                        {cluster.clusterId || `CLUSTER-${idx + 1}`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.clusterTierBadge,
                        isCrit ? styles.badgeCritical : styles.badgeHigh,
                      ]}
                    >
                      <Text style={styles.clusterTierText}>{tier}</Text>
                    </View>
                  </View>

                  <View style={styles.clusterMetricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNumber}>{cases}</Text>
                      <Text style={styles.metricLabel}>Confirmed Cases</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNumber}>{affected}</Text>
                      <Text style={styles.metricLabel}>Affected Animals</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNumber}>
                        {cluster.radiusKm ? `${cluster.radiusKm} km` : '5 km'}
                      </Text>
                      <Text style={styles.metricLabel}>Cluster Proximity</Text>
                    </View>
                  </View>

                  {/* Centroid coordinates & Map Button */}
                  <View style={styles.clusterFooter}>
                    <View style={styles.centroidInfo}>
                      <Text style={styles.centroidLabel}>GPS Centroid:</Text>
                      <Text style={styles.centroidCoords}>
                        {cluster.centroidLat?.toFixed(4)}, {cluster.centroidLng?.toFixed(4)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.viewOnMapBtn}
                      onPress={() => navigateToMapWithCluster(cluster)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewOnMapBtnText}>View on Map ➔</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  mapNavBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  mapNavBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textInverse,
  },
  cacheBanner: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  cacheBannerText: {
    fontSize: 11,
    color: '#FEF08A',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.light.textMuted,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  errorSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  riskCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.xs,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  riskCardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  riskCardSub: {
    fontSize: 11,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  riskLevelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  riskLevelText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  badgeCritical: {
    backgroundColor: colors.light.danger,
  },
  badgeHigh: {
    backgroundColor: colors.light.warning,
  },
  badgeMedium: {
    backgroundColor: '#F59E0B',
  },
  badgeLow: {
    backgroundColor: colors.light.success,
  },
  scoreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  scoreBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: radii.round,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: radii.round,
  },
  scoreNumberText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    width: 48,
    textAlign: 'right',
  },
  factorsList: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  factorsHeader: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.light.textMuted,
    marginBottom: 4,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  factorBullet: {
    fontSize: 12,
    color: colors.light.primary,
    marginRight: 6,
  },
  factorText: {
    flex: 1,
    fontSize: 11,
    color: colors.light.textPrimary,
  },
  factorPoints: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
    marginLeft: 6,
  },
  recRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  recPillVaccine: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  recPillIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  recPillText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  filterSection: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.round,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  filterChipActiveCritical: {
    backgroundColor: colors.light.danger,
    borderColor: colors.light.danger,
  },
  filterChipActiveHigh: {
    backgroundColor: colors.light.warning,
    borderColor: colors.light.warning,
  },
  filterChipActiveModerate: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textMuted,
  },
  filterChipTextActive: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
  emptyCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
    marginTop: spacing.md,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  emptySub: {
    fontSize: 11,
    color: colors.light.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  clusterCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.xs,
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  clusterTitleGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  clusterDisease: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  clusterIdText: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  clusterTierBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  clusterTierText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  clusterMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  metricLabel: {
    fontSize: 9,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  clusterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  centroidInfo: {
    flex: 1,
  },
  centroidLabel: {
    fontSize: 9,
    color: colors.light.textMuted,
  },
  centroidCoords: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  viewOnMapBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  viewOnMapBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.light.textInverse,
  },
});
