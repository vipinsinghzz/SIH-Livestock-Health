/**
 * Livestock Saathi - Ultra-Premium Officer Epidemic Surveillance & Analytics
 * File: mobile/app/(officer)/surveillance/index.tsx
 *
 * Production Epidemiological Surveillance Suite for District Veterinary Officers:
 * - Luxury executive command navy header (#0B132B / #1E1B4B) with safe-area spacing
 * - Cadre badge: "DISTRICT EPIDEMIOLOGICAL SURVEILLANCE & TRENDS"
 * - 4-Metric Realtime Telemetry Summary Strip
 * - Interactive 30-Day Epidemic Progression Curve (Total Cases, Critical, Mortalities)
 * - AI Triage Suspected Diseases breakdown with color-coded distribution bars
 * - Clinical Case Escalation Funnel (Reported -> Triaged -> Verified -> Contained -> Closed)
 * - Sub-District / Block-level disease burden ranking
 * - Fixed universal floating bottom dock (<OfficerFloatingNav activeTab="surveillance" />)
 * - Zero raw text emojis; platform-safe typography stack
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
  Image,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import { officerService } from '../../../src/services/officerService';
import { DashboardSummary, TrendPoint } from '../../../src/types/officer';
import { shadows } from '../../../src/theme';
import { OfficerFloatingNav } from '../../../src/components/OfficerFloatingNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Native typography stack
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

// Static assets
const ICON_BACK = require('../../../assets/icons/arrow-back.png');
const ICON_REFRESH = require('../../../assets/icons/refresh.png');
const ICON_SURVEILLANCE = require('../../../assets/icons/stat_case.png');
const ICON_ALERT = require('../../../assets/icons/stat_alert.png');
const ICON_WARN = require('../../../assets/icons/alert.png');
const ICON_CLIPBOARD = require('../../../assets/icons/clipboard.png');
const ICON_SHIELD = require('../../../assets/icons/shield.png');

const DISEASE_PALETTE = ['#4338CA', '#0284C7', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];

export default function OfficerSurveillanceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, isEnglish } = useAppLanguage();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string>('All');
  const [activeTrendMetric, setActiveTrendMetric] = useState<'cases' | 'critical' | 'mortality'>('cases');

  const userId = user?.id || (user as any)?._id || 'officer_default';
  const districtName = user?.district || (isEnglish ? 'District Surveillance' : 'ज़िला निगरानी');

  const loadSurveillanceData = useCallback(async (block: string = selectedBlock, isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    const filterObj = {
      district: user?.district,
      block: block !== 'All' ? block : undefined,
    };

    try {
      const [sumRes, trendRes] = await Promise.all([
        officerService.getDashboardSummary(userId, filterObj),
        officerService.getDashboardTrends(userId, filterObj),
      ]);

      setSummary(sumRes.summary);
      setTrends(trendRes.trends || []);
      setIsFromCache(sumRes.fromCache || trendRes.fromCache);
      setLastUpdated(sumRes.lastUpdated || trendRes.lastUpdated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to retrieve surveillance metrics.');
      setSummary(null);
      setTrends([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, user?.district, selectedBlock]);

  useEffect(() => {
    loadSurveillanceData(selectedBlock);
  }, [selectedBlock, loadSurveillanceData]);

  const formatLastUpdated = (timestamp: number | null): string => {
    if (!timestamp) return isEnglish ? 'Live Synced' : 'सक्रिय सिंक';
    const d = new Date(timestamp);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
  };

  const availableBlocks = ['All'];
  if (summary?.blockDistribution) {
    summary.blockDistribution.forEach((b) => {
      if (b._id && !availableBlocks.includes(b._id)) {
        availableBlocks.push(b._id);
      }
    });
  }

  // 30-Day Trend aggregate calculations
  const totalTrendCases = trends.reduce((acc, curr) => acc + (curr.cases || 0), 0);
  const totalTrendCritical = trends.reduce((acc, curr) => acc + (curr.criticalCases || 0), 0);
  const totalTrendMortalities = trends.reduce((acc, curr) => acc + (curr.mortalities || 0), 0);
  const maxTrendCases = Math.max(1, ...trends.map((tr) => tr.cases || 0));

  const funnelStages = ['Reported', 'Triaged', 'Field Verified', 'Escalated', 'Contained', 'Closed'];

  return (
    <View style={styles.screenWrapper}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSurveillanceData(selectedBlock, true)}
            colors={['#4338CA']}
            tintColor="#4338CA"
          />
        }
      >
        {/* 1. Executive Top App Bar */}
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
                  {isEnglish ? 'EPIDEMIC SURVEILLANCE & TRENDS' : 'महामारी निगरानी एवं रुझान'}
                </Text>
              </View>
              <Text style={styles.headerMainTitle}>
                {isEnglish ? 'Epidemiological Analytics' : 'महामारी विज्ञान विश्लेषण'}
              </Text>
              <Text style={styles.headerSubTitle}>
                {districtName} {isEnglish ? 'District Surveillance Desk' : 'ज़िला निगरानी डेस्क'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={() => loadSurveillanceData(selectedBlock, false)}
              activeOpacity={0.8}
              disabled={loading || refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Image source={ICON_REFRESH} style={styles.refreshIconImg} />
              )}
            </TouchableOpacity>
          </View>

          {/* Timestamp Strip */}
          <View style={styles.syncRow}>
            <Text style={styles.syncText}>
              {isEnglish ? 'Synced: ' : 'अंतिम अद्यतन: '}
              {formatLastUpdated(lastUpdated)}
            </Text>
            {isFromCache && (
              <View style={styles.cachePill}>
                <Text style={styles.cachePillText}>{isEnglish ? 'Offline Cache' : 'ऑफ़लाइन'}</Text>
              </View>
            )}
          </View>

          {/* 4-Metric Telemetry Ribbon */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryCard}>
              <Text style={styles.telemetryVal}>{totalTrendCases || summary?.totalReports || 0}</Text>
              <Text style={styles.telemetryLabel}>{isEnglish ? '30D Cases' : '30-दिन मामले'}</Text>
            </View>
            <View style={styles.telemetryCard}>
              <Text style={[styles.telemetryVal, { color: '#D97706' }]}>
                {totalTrendCritical || summary?.triageMetrics?.criticalCount || 0}
              </Text>
              <Text style={styles.telemetryLabel}>{isEnglish ? 'Critical' : 'गंभीर'}</Text>
            </View>
            <View style={styles.telemetryCard}>
              <Text style={[styles.telemetryVal, { color: '#DC2626' }]}>
                {totalTrendMortalities || summary?.totalMortality || 0}
              </Text>
              <Text style={styles.telemetryLabel}>{isEnglish ? 'Deaths' : 'मृत्यु'}</Text>
            </View>
            <View style={styles.telemetryCard}>
              <Text style={[styles.telemetryVal, { color: '#7C3AED' }]}>
                {summary?.triageMetrics?.outbreakCount || 0}
              </Text>
              <Text style={styles.telemetryLabel}>{isEnglish ? 'Clusters' : 'क्लस्टर'}</Text>
            </View>
          </View>
        </View>

        {/* 2. Loading State */}
        {loading && !refreshing && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#4338CA" />
            <Text style={styles.loadingText}>
              {isEnglish
                ? 'Computing Epidemiological Curves & Analytics...'
                : 'महामारी विज्ञान रुझान व विश्लेषण लोड हो रहा है...'}
            </Text>
          </View>
        )}

        {/* 3. Error State */}
        {!loading && errorMessage && !summary && (
          <View style={styles.errorCard}>
            <Image source={ICON_WARN} style={styles.errorIcon} />
            <Text style={styles.errorTitle}>
              {isEnglish ? 'Surveillance Data Unavailable' : 'निगरानी डेटा अनुपलब्ध'}
            </Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadSurveillanceData(selectedBlock, false)}
              activeOpacity={0.85}
            >
              <Image source={ICON_REFRESH} style={styles.retryBtnIcon} />
              <Text style={styles.retryBtnText}>{isEnglish ? 'Retry Sync' : 'पुनः प्रयास करें'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Active Surveillance Content */}
        {!loading && summary && (
          <>
            {/* Sub-District Filter */}
            {availableBlocks.length > 1 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  {isEnglish ? 'Sub-District Jurisdiction Filter:' : 'उप-ज़िला क्षेत्राधिकार फ़िल्टर:'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                  {availableBlocks.map((b) => {
                    const isSelected = selectedBlock === b;
                    return (
                      <TouchableOpacity
                        key={b}
                        style={[styles.filterChip, isSelected ? styles.filterChipActive : styles.filterChipInactive]}
                        onPress={() => setSelectedBlock(b)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
                          {b === 'All' ? (isEnglish ? 'All Blocks (District)' : 'संपूर्ण ज़िला') : b}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* 5. 30-Day Epidemiological Trend Curve */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {isEnglish ? '30-Day Epidemiological Progression' : '30-दिवसीय महामारी प्रगति वक्र'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {isEnglish
                    ? 'Temporal disease transmission trajectory'
                    : 'दैनिक दर्ज मामले, गंभीर लक्षण एवं मृत्यु सांख्यिकी'}
                </Text>
              </View>

              {/* Metric Toggle Buttons */}
              <View style={styles.metricToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.metricToggleBtn,
                    activeTrendMetric === 'cases' && styles.metricToggleBtnActiveCases,
                  ]}
                  onPress={() => setActiveTrendMetric('cases')}
                >
                  <Text style={[styles.metricToggleText, activeTrendMetric === 'cases' && styles.metricToggleTextActive]}>
                    {isEnglish ? 'Cases' : 'मामले'} ({totalTrendCases})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.metricToggleBtn,
                    activeTrendMetric === 'critical' && styles.metricToggleBtnActiveCritical,
                  ]}
                  onPress={() => setActiveTrendMetric('critical')}
                >
                  <Text style={[styles.metricToggleText, activeTrendMetric === 'critical' && styles.metricToggleTextActive]}>
                    {isEnglish ? 'Critical' : 'गंभीर'} ({totalTrendCritical})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.metricToggleBtn,
                    activeTrendMetric === 'mortality' && styles.metricToggleBtnActiveMortality,
                  ]}
                  onPress={() => setActiveTrendMetric('mortality')}
                >
                  <Text style={[styles.metricToggleText, activeTrendMetric === 'mortality' && styles.metricToggleTextActive]}>
                    {isEnglish ? 'Deaths' : 'मौतें'} ({totalTrendMortalities})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Native Responsive Trend Chart Bars */}
              {trends.length === 0 ? (
                <View style={styles.emptyTrendBox}>
                  <Text style={styles.emptyTrendText}>
                    {isEnglish
                      ? 'No temporal trend records for this period.'
                      : 'इस अवधि के लिए कोई रुझान रिकॉर्ड उपलब्ध नहीं है।'}
                  </Text>
                </View>
              ) : (
                <View style={styles.chartContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                    <View style={styles.chartBarsRow}>
                      {trends.map((tItem, idx) => {
                        const val =
                          activeTrendMetric === 'cases'
                            ? tItem.cases
                            : activeTrendMetric === 'critical'
                            ? tItem.criticalCases
                            : tItem.mortalities;

                        const barHeightPct = Math.max(10, Math.round((val / maxTrendCases) * 100));
                        const barColor =
                          activeTrendMetric === 'cases'
                            ? '#4338CA'
                            : activeTrendMetric === 'critical'
                            ? '#D97706'
                            : '#DC2626';

                        return (
                          <View key={idx} style={styles.barColumn}>
                            <Text style={styles.barValue}>{val > 0 ? val : ''}</Text>
                            <View style={styles.barTrack}>
                              <View
                                style={[
                                  styles.barFill,
                                  {
                                    height: `${barHeightPct}%`,
                                    backgroundColor: val > 0 ? barColor : '#E2E8F0',
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.barDate}>{tItem.displayDate.split(' ')[0]}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <Text style={styles.chartHelpText}>
                    {isEnglish ? 'Scroll horizontally to view 30-day progression' : '30-दिवसीय वक्र देखने के लिए स्क्रॉल करें'}
                  </Text>
                </View>
              )}
            </View>

            {/* 6. Top Suspected Diseases Breakdown (AI Triage) */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {isEnglish ? 'Top Suspected Diseases (AI Triage)' : 'संभावित रोग वितरण (एआई ट्रायज)'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {isEnglish
                    ? 'Candidate pathogens identified during field reporting'
                    : 'फील्ड रिपोर्टिंग के दौरान पहचाने गए संभावित रोग'}
                </Text>
              </View>

              {!summary.diseaseBreakdown || summary.diseaseBreakdown.length === 0 ? (
                <Text style={styles.emptyText}>
                  {isEnglish ? 'No disease incidence logged.' : 'कोई रोग रिकॉर्ड दर्ज नहीं।'}
                </Text>
              ) : (
                <View style={styles.diseaseList}>
                  {summary.diseaseBreakdown.map((item, idx) => {
                    const totalReports = summary.totalReports || 1;
                    const caseCount = (item as any).cases ?? (item as any).count ?? 0;
                    const diseaseName = item.name || (item as any)._id || (isEnglish ? 'Unspecified' : 'अज्ञात');
                    const pct = Math.min(100, Math.round((caseCount / totalReports) * 100));
                    const color = DISEASE_PALETTE[idx % DISEASE_PALETTE.length];

                    return (
                      <View key={idx} style={styles.diseaseItem}>
                        <View style={styles.diseaseMetaRow}>
                          <View style={styles.diseaseTitleGroup}>
                            <View style={[styles.colorSquare, { backgroundColor: color }]} />
                            <Text style={styles.diseaseName}>{diseaseName}</Text>
                          </View>
                          <Text style={styles.diseaseCountText}>
                            {caseCount} {isEnglish ? 'cases' : 'मामले'} ({pct}%)
                          </Text>
                        </View>
                        <View style={styles.diseaseTrack}>
                          <View style={[styles.diseaseFill, { width: `${pct}%`, backgroundColor: color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 7. Clinical Case Escalation Funnel */}
            {((summary as any).statusFunnel || (summary as any).escalationFunnel) && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {isEnglish ? 'Clinical Escalation Funnel' : 'क्लिनिकल वृद्धि एवं रोकथाम फ़नल'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {isEnglish
                      ? 'Case progression from reporting to final resolution'
                      : 'रिपोर्टिंग से लेकर अंतिम निस्तारण तक केस का प्रवाह'}
                  </Text>
                </View>

                <View style={styles.funnelContainer}>
                  {funnelStages.map((stage, idx) => {
                    const funnel = (summary as any).statusFunnel || (summary as any).escalationFunnel || {};
                    const count = funnel[stage] || 0;
                    const baseCount = funnel['Reported'] || summary.totalReports || 1;
                    const stagePct = Math.max(12, Math.round((count / Math.max(1, baseCount)) * 100));

                    return (
                      <View key={stage} style={styles.funnelRow}>
                        <View style={styles.funnelLabelCol}>
                          <Text style={styles.funnelStageName}>{stage}</Text>
                          <Text style={styles.funnelStageCount}>
                            {count} {isEnglish ? 'cases' : 'मामले'}
                          </Text>
                        </View>
                        <View style={styles.funnelBarWrap}>
                          <View
                            style={[
                              styles.funnelBarFill,
                              {
                                width: `${stagePct}%`,
                                backgroundColor: idx === 0 ? '#4338CA' : idx === 4 ? '#7C3AED' : '#0284C7',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Universal Fixed Floating Bottom Navigation Dock */}
      <OfficerFloatingNav activeTab="surveillance" />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  scrollContainer: {
    paddingBottom: 130, // Clearance for fixed floating dock
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
    backgroundColor: '#38BDF8',
  },
  cadreText: {
    fontFamily: FONT_BOLD,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#BAE6FD',
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
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  refreshIconImg: {
    width: 15,
    height: 15,
    tintColor: '#FFFFFF',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  syncText: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#94A3B8',
  },
  cachePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cachePillText: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    color: '#92400E',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  telemetryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  telemetryVal: {
    fontFamily: FONT_BOLD,
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  telemetryLabel: {
    fontFamily: FONT_MEDIUM,
    fontSize: 9.5,
    color: '#BAE6FD',
    marginTop: 2,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterSectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  filterChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  filterChipText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextInactive: {
    color: '#475569',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  metricToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricToggleBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricToggleBtnActiveCases: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  metricToggleBtnActiveCritical: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  metricToggleBtnActiveMortality: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  metricToggleText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  metricToggleTextActive: {
    color: '#FFFFFF',
  },
  chartContainer: {
    marginTop: 4,
  },
  chartScroll: {
    paddingVertical: 8,
  },
  chartBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 10,
    paddingHorizontal: 8,
  },
  barColumn: {
    alignItems: 'center',
    width: 24,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontFamily: FONT_BOLD,
    fontSize: 9,
    color: '#475569',
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 110,
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barDate: {
    fontFamily: FONT_REGULAR,
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 6,
  },
  chartHelpText: {
    fontFamily: FONT_REGULAR,
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyTrendBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTrendText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  diseaseList: {
    gap: 12,
  },
  diseaseItem: {
    gap: 4,
  },
  diseaseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diseaseTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  colorSquare: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  diseaseName: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: '#0F172A',
  },
  diseaseCountText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 12,
    color: '#64748B',
  },
  diseaseTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  diseaseFill: {
    height: '100%',
    borderRadius: 3,
  },
  funnelContainer: {
    gap: 10,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  funnelLabelCol: {
    width: 100,
  },
  funnelStageName: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: '#0F172A',
  },
  funnelStageCount: {
    fontFamily: FONT_REGULAR,
    fontSize: 10.5,
    color: '#64748B',
  },
  funnelBarWrap: {
    flex: 1,
    height: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    overflow: 'hidden',
  },
  funnelBarFill: {
    height: '100%',
    borderRadius: 7,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    ...shadows.sm,
  },
  errorIcon: {
    width: 40,
    height: 40,
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
  errorMessage: {
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
  emptyText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
