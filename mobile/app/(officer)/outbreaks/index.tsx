/**
 * PashuCare - Ultra-Premium Officer Outbreak Alerts & Spatial Cluster Surveillance
 * File: mobile/app/(officer)/outbreaks/index.tsx
 *
 * Production Outbreak Intelligence Suite for District Veterinary Officers:
 * - Luxury executive command navy header (#0B132B / #1E1B4B) with safe-area spacing
 * - Cadre badge: "DISTRICT OUTBREAK SURVEILLANCE & CLUSTERING"
 * - AI Epidemiological Risk Gauge & score breakdown
 * - Contributing risk factors with point rationales
 * - One-tap Containment & Ring Vaccination advisory action pills
 * - Real-time cluster filter chips (All, Critical, High Risk, Moderate)
 * - DBSCAN spatial cluster cards with centroid coordinates, disease tag, case count,
 *   and direct CTAs (View on GIS Radar, Declare Containment Zone)
 * - Fixed universal floating bottom dock (<OfficerFloatingNav activeTab="alerts" />)
 * - Zero raw text emojis; platform-safe typography stack
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
  Image,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import { containmentService } from '../../../src/services/containmentService';
import { officerService } from '../../../src/services/officerService';
import { OutbreakCluster } from '../../../src/types/containment';
import { OfficerRiskAnalysisResponse, OfficerRiskFactor } from '../../../src/types/officer';
import { OfflineNotice } from '../../../src/components/OfflineNotice';
import { shadows } from '../../../src/theme';
import { OfficerFloatingNav } from '../../../src/components/OfficerFloatingNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Native typography stack
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

// Static assets
const ICON_BACK = require('../../../assets/icons/arrow-back.png');
const ICON_LOCATION = require('../../../assets/icons/location.png');
const ICON_REFRESH = require('../../../assets/icons/refresh.png');
const ICON_ALERT = require('../../../assets/icons/stat_alert.png');
const ICON_WARN = require('../../../assets/icons/alert.png');
const ICON_SHIELD = require('../../../assets/icons/shield.png');
const ICON_VACCINE = require('../../../assets/icons/stat_vaccine.png');
const ICON_CHEVRON = require('../../../assets/icons/chevron-right.png');
const ICON_CLIPBOARD = require('../../../assets/icons/clipboard.png');
const ICON_PIN = require('../../../assets/icons/icon_pin.png');

type RiskFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE';

export default function OfficerOutbreaksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isEnglish } = useAppLanguage();
  const district = user?.district;

  // State
  const [clusters, setClusters] = useState<OutbreakCluster[]>([]);
  const [riskData, setRiskData] = useState<OfficerRiskAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<RiskFilter>('ALL');

  const loadOutbreakData = useCallback(async () => {
    if (!district) {
      setError(isEnglish ? 'District jurisdiction is not configured on this account.' : 'ज़िला कार्यक्षेत्र कॉन्फ़िगर नहीं है।');
      setLoading(false);
      setRefreshing(false);
      return;
    }

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
  }, [district, isEnglish]);

  useEffect(() => {
    loadOutbreakData();
  }, [loadOutbreakData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOutbreakData();
  }, [loadOutbreakData]);

  const filteredClusters = useMemo(() => {
    if (activeFilter === 'ALL') return clusters;
    return clusters.filter((c) => {
      const tier = String(c.riskTier || c.risk || '').toUpperCase();
      return tier.includes(activeFilter);
    });
  }, [clusters, activeFilter]);

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

  return (
    <View style={styles.screenWrapper}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />
      <OfflineNotice />

      {/* Top Executive Command Header */}
      <View style={styles.topExecutiveHeader}>
        <View style={styles.headerMainRow}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Image source={ICON_BACK} style={styles.backIcon} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.cadreRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.cadreText}>
                {isEnglish ? 'OUTBREAK SURVEILLANCE & CLUSTERING' : 'प्रकोप निगरानी एवं स्थानिक क्लस्टर'}
              </Text>
            </View>
            <Text style={styles.headerMainTitle}>
              {isEnglish ? 'Outbreak Alerts' : 'प्रकोप चेतावनी'}
            </Text>
            <Text style={styles.headerSubTitle}>
              {district ? `${district} ${isEnglish ? 'District' : 'ज़िला'} • ${clusters.length} ${isEnglish ? 'Clusters Detected' : 'क्लस्टर सक्रिय'}` : (isEnglish ? 'District Surveillance' : 'ज़िला निगरानी')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.mapNavBtn}
            onPress={() => router.push('/(officer)/map' as any)}
            activeOpacity={0.8}
          >
            <Image source={ICON_LOCATION} style={styles.mapNavBtnIcon} />
            <Text style={styles.mapNavBtnText}>{isEnglish ? 'GIS Radar' : 'जीआईएस'}</Text>
          </TouchableOpacity>
        </View>

        {isFromCache && (
          <View style={styles.cacheBanner}>
            <Image source={ICON_WARN} style={styles.cacheBannerIcon} />
            <Text style={styles.cacheBannerText}>
              {isEnglish
                ? 'Offline Mode: Displaying saved outbreak clusters from device cache.'
                : 'ऑफ़लाइन मोड: डिवाइस पर सहेजे गए प्रकोप क्लस्टर दिखाए जा रहे हैं।'}
            </Text>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4338CA" />
          <Text style={styles.loadingText}>
            {isEnglish ? 'Analyzing spatial transmission clusters...' : 'स्थानिक संक्रमण क्लस्टरों का विश्लेषण किया जा रहा है...'}
          </Text>
        </View>
      ) : error && clusters.length === 0 ? (
        <View style={styles.centerBox}>
          <Image source={ICON_WARN} style={styles.errorIcon} />
          <Text style={styles.errorTitle}>
            {isEnglish ? 'Surveillance Feed Unavailable' : 'निगरानी डेटा अनुपलब्ध'}
          </Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadOutbreakData} activeOpacity={0.85}>
            <Image source={ICON_REFRESH} style={styles.retryBtnIcon} />
            <Text style={styles.retryBtnText}>{isEnglish ? 'Retry Analysis' : 'पुनः प्रयास करें'}</Text>
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
              colors={['#4338CA']}
              tintColor="#4338CA"
            />
          }
        >
          {/* Risk Analysis Overview Card */}
          {risk && (
            <View style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <View>
                  <Text style={styles.riskCardTitle}>
                    {isEnglish ? 'District Epidemiological Risk Gauge' : 'ज़िला महामारी विज्ञान जोखिम सूचकांक'}
                  </Text>
                  <Text style={styles.riskCardSub}>
                    {isEnglish ? 'AI-computed contagion & density analysis' : 'एआई-संचालित संक्रमण एवं घनत्व विश्लेषण'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.riskLevelBadge,
                    riskLevel === 'CRITICAL' ? styles.badgeCritical : riskLevel === 'HIGH' ? styles.badgeHigh : styles.badgeMedium,
                  ]}
                >
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
                        ? { backgroundColor: '#DC2626' }
                        : riskScore >= 50
                        ? { backgroundColor: '#D97706' }
                        : { backgroundColor: '#10B981' },
                    ]}
                  />
                </View>
                <Text style={styles.scoreNumberText}>{riskScore}/100</Text>
              </View>

              {/* Contributing Risk Factors */}
              {Array.isArray(risk.factors) && risk.factors.length > 0 && (
                <View style={styles.factorsList}>
                  <Text style={styles.factorsHeader}>
                    {isEnglish ? 'Contributing Epidemiological Factors:' : 'प्रमुख महामारी विज्ञान कारक:'}
                  </Text>
                  {risk.factors.slice(0, 3).map((f: OfficerRiskFactor, idx: number) => (
                    <View key={`factor_${idx}`} style={styles.factorItem}>
                      <View style={styles.factorDot} />
                      <Text style={styles.factorText}>{f.rationale}</Text>
                      <Text style={styles.factorPoints}>+{f.points} pts</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Recommendations */}
              <View style={styles.recRow}>
                {risk.containmentRecommendation?.recommended && (
                  <TouchableOpacity
                    style={styles.recPill}
                    onPress={() => router.push('/(officer)/containment' as any)}
                    activeOpacity={0.85}
                  >
                    <Image source={ICON_SHIELD} style={styles.recPillIcon} />
                    <Text style={styles.recPillText}>
                      {isEnglish
                        ? `Containment (${risk.containmentRecommendation.suggestedRadiusKm}km advised)`
                        : `कंटेनमेंट (${risk.containmentRecommendation.suggestedRadiusKm} किमी)`}
                    </Text>
                    <Image source={ICON_CHEVRON} style={styles.recChevron} />
                  </TouchableOpacity>
                )}
                {risk.vaccinationRecommendation?.ringVaccinationAdvised && (
                  <TouchableOpacity
                    style={[styles.recPill, styles.recPillVaccine]}
                    onPress={() =>
                      router.push({
                        pathname: '/(officer)/containment',
                        params: { mode: 'ring' },
                      } as any)
                    }
                    activeOpacity={0.85}
                  >
                    <Image source={ICON_VACCINE} style={styles.recPillIcon} />
                    <Text style={[styles.recPillText, { color: '#0F766E' }]}>
                      {isEnglish
                        ? `Ring Vaccination (${risk.vaccinationRecommendation.targetRadiusKm}km)`
                        : `रिंग टीकाकरण (${risk.vaccinationRecommendation.targetRadiusKm} किमी)`}
                    </Text>
                    <Image source={ICON_CHEVRON} style={[styles.recChevron, { tintColor: '#0F766E' }]} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Filter Chips Bar */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>
              {isEnglish ? `Active Transmission Clusters (${clusters.length})` : `सक्रिय संक्रमण क्लस्टर (${clusters.length})`}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
                onPress={() => setActiveFilter('ALL')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>
                  {isEnglish ? 'All' : 'सभी'} ({clusters.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'CRITICAL' && styles.filterChipActiveCritical]}
                onPress={() => setActiveFilter('CRITICAL')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeFilter === 'CRITICAL' && styles.filterChipTextActive]}>
                  {isEnglish ? 'Critical' : 'गंभीर'} ({criticalCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'HIGH' && styles.filterChipActiveHigh]}
                onPress={() => setActiveFilter('HIGH')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeFilter === 'HIGH' && styles.filterChipTextActive]}>
                  {isEnglish ? 'High Risk' : 'उच्च जोखिम'} ({highCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'MODERATE' && styles.filterChipActiveModerate]}
                onPress={() => setActiveFilter('MODERATE')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeFilter === 'MODERATE' && styles.filterChipTextActive]}>
                  {isEnglish ? 'Moderate' : 'मध्यम'} ({moderateCount})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Clusters List */}
          {filteredClusters.length === 0 ? (
            <View style={styles.emptyCard}>
              <Image source={ICON_SHIELD} style={styles.emptyCardIcon} />
              <Text style={styles.emptyTitle}>
                {isEnglish ? 'Zero Active Clusters Detected' : 'कोई सक्रिय प्रकोप क्लस्टर नहीं'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isEnglish
                  ? `No active DBSCAN outbreak clusters found matching the "${activeFilter}" filter in ${district}.`
                  : `वर्तमान में इस फ़िल्टर के अंतर्गत कोई क्लस्टर नहीं मिला।`}
              </Text>
            </View>
          ) : (
            filteredClusters.map((cluster: OutbreakCluster, idx: number) => {
              const count = cluster.count || cluster.caseCount || 0;
              const isCrit = String(cluster.riskTier || cluster.risk || '').toUpperCase().includes('CRITICAL');

              return (
                <View key={cluster.id || cluster.clusterId || `cluster_${idx}`} style={styles.clusterCard}>
                  {/* Top Header */}
                  <View style={styles.clusterHeaderRow}>
                    <View style={styles.clusterTitleCol}>
                      <View style={styles.clusterTagRow}>
                        <View style={[styles.urgencyTag, isCrit ? styles.urgencyTagCrit : styles.urgencyTagHigh]}>
                          <Text style={[styles.urgencyTagText, isCrit ? styles.urgencyTextCrit : styles.urgencyTextHigh]}>
                            {cluster.riskTier || cluster.risk || (isEnglish ? 'HIGH RISK' : 'उच्च जोखिम')}
                          </Text>
                        </View>
                        <View style={styles.diseasePill}>
                          <Text style={styles.diseasePillText}>{cluster.disease || (isEnglish ? 'Livestock Pathogen' : 'पशु रोग')}</Text>
                        </View>
                      </View>
                      <Text style={styles.clusterName}>
                        {cluster.village ? `${cluster.village}, ` : ''}{(cluster as any).block || cluster.district || district}
                      </Text>
                    </View>

                    <View style={styles.caseCountBadge}>
                      <Text style={styles.caseCountVal}>{count}</Text>
                      <Text style={styles.caseCountLabel}>{isEnglish ? 'Cases' : 'मामले'}</Text>
                    </View>
                  </View>

                  {/* Centroid & Distance Meta */}
                  <View style={styles.clusterMetaRow}>
                    <Image source={ICON_PIN} style={styles.clusterPinIcon} />
                    <Text style={styles.clusterMetaText}>
                      Centroid GPS: {cluster.centroidLat?.toFixed(4)}, {cluster.centroidLng?.toFixed(4)}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.clusterActionsRow}>
                    <TouchableOpacity
                      style={styles.clusterMapBtn}
                      onPress={() => navigateToMapWithCluster(cluster)}
                      activeOpacity={0.85}
                    >
                      <Image source={ICON_LOCATION} style={styles.actionBtnIcon} />
                      <Text style={styles.clusterMapBtnText}>
                        {isEnglish ? 'View on GIS Radar' : 'जीआईएस रडार देखें'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.clusterContainmentBtn}
                      onPress={() => router.push('/(officer)/containment' as any)}
                      activeOpacity={0.85}
                    >
                      <Image source={ICON_SHIELD} style={[styles.actionBtnIcon, { tintColor: '#7C3AED' }]} />
                      <Text style={styles.clusterContainmentBtnText}>
                        {isEnglish ? 'Declare Containment' : 'कंटेनमेंट घोषित करें'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Universal Fixed Floating Bottom Navigation Dock */}
      <OfficerFloatingNav activeTab="alerts" outbreakCount={clusters.length} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  topExecutiveHeader: {
    backgroundColor: '#0B132B',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.md,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  headerTitleWrap: {
    flex: 1,
  },
  cadreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#DC2626',
  },
  cadreText: {
    fontFamily: FONT_BOLD,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 0.6,
  },
  headerMainTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubTitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },
  mapNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  mapNavBtnIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },
  mapNavBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cacheBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
  cacheBannerIcon: {
    width: 13,
    height: 13,
    tintColor: '#92400E',
  },
  cacheBannerText: {
    flex: 1,
    fontFamily: FONT_MEDIUM,
    fontSize: 11,
    color: '#92400E',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
  },
  errorIcon: {
    width: 44,
    height: 44,
    tintColor: '#DC2626',
    marginBottom: 8,
  },
  errorTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  errorSubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4338CA',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  retryBtnIcon: {
    width: 13,
    height: 13,
    tintColor: '#FFFFFF',
  },
  retryBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 130, // Clearance for fixed floating dock
  },
  riskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...shadows.sm,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  riskCardTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  riskCardSub: {
    fontFamily: FONT_REGULAR,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  riskLevelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCritical: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  badgeHigh: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeMedium: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  riskLevelText: {
    fontFamily: FONT_BOLD,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  scoreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  scoreBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreNumberText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  factorsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 6,
  },
  factorsHeader: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: '#475569',
    marginBottom: 2,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  factorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#64748B',
  },
  factorText: {
    flex: 1,
    fontFamily: FONT_REGULAR,
    fontSize: 11.5,
    color: '#334155',
  },
  factorPoints: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: '#DC2626',
  },
  recRow: {
    gap: 8,
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  recPillVaccine: {
    backgroundColor: '#CCFBF1',
    borderColor: '#99F6E4',
  },
  recPillIcon: {
    width: 14,
    height: 14,
    tintColor: '#7C3AED',
  },
  recPillText: {
    flex: 1,
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6B21A8',
  },
  recChevron: {
    width: 10,
    height: 10,
    tintColor: '#6B21A8',
  },
  filterSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  filterRow: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  filterChipActiveCritical: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterChipActiveHigh: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  filterChipActiveModerate: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterChipText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardIcon: {
    width: 48,
    height: 48,
    tintColor: '#10B981',
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
  },
  clusterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    ...shadows.sm,
  },
  clusterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clusterTitleCol: {
    flex: 1,
  },
  clusterTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  urgencyTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  urgencyTagCrit: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  urgencyTagHigh: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  urgencyTagText: {
    fontFamily: FONT_BOLD,
    fontSize: 9.5,
    fontWeight: '800',
  },
  urgencyTextCrit: {
    color: '#991B1B',
  },
  urgencyTextHigh: {
    color: '#92400E',
  },
  diseasePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  diseasePillText: {
    fontFamily: FONT_BOLD,
    fontSize: 10.5,
    color: '#4338CA',
  },
  clusterName: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  caseCountBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  caseCountVal: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  caseCountLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 9.5,
    color: '#64748B',
  },
  clusterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  clusterPinIcon: {
    width: 12,
    height: 12,
    tintColor: '#64748B',
  },
  clusterMetaText: {
    fontFamily: FONT_REGULAR,
    fontSize: 11.5,
    color: '#64748B',
  },
  clusterActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  clusterMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4338CA',
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnIcon: {
    width: 13,
    height: 13,
    tintColor: '#FFFFFF',
  },
  clusterMapBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clusterContainmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  clusterContainmentBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7C3AED',
  },
});
