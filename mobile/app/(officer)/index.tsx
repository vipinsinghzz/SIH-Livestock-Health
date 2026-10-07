/**
 * PashuCare - Ultra-Premium Officer Executive Dashboard & KPI Command Center
 * File: mobile/app/(officer)/index.tsx
 *
 * Production Executive Surveillance Command Center for District Veterinary & Animal Husbandry Officers:
 * - Luxury executive command navy header (#0B132B / #1E1B4B) with safe-area padding
 * - Cadre badge: "DISTRICT EPIDEMIOLOGICAL COMMAND CENTER"
 * - Instant sub-district / block filter ribbon
 * - Active DBSCAN outbreak alert priority callout banner
 * - 6-Metric High-Density KPI Grid (Total Reports, Active Cases, Mortalities, Critical Triage, Outbreaks, Vaccination %)
 * - Operational capacity progress strip & diagnostic lab pipeline
 * - Sub-district disease burden distribution
 * - 8-Module Surveillance & Operations Command Suite with real asset icons
 * - Fixed universal floating bottom dock (<OfficerFloatingNav activeTab="dashboard" />)
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
  Alert,
  Image,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useAppLanguage } from '../../src/services/i18n';
import { officerService } from '../../src/services/officerService';
import { DashboardSummary } from '../../src/types/officer';
import { shadows } from '../../src/theme';
import { OfficerFloatingNav } from '../../src/components/OfficerFloatingNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Native typography stack
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

// Static assets
const ICON_HOME = require('../../assets/icons/nav_home.png');
const ICON_SURVEILLANCE = require('../../assets/icons/stat_case.png');
const ICON_ALERT = require('../../assets/icons/stat_alert.png');
const ICON_SHIELD = require('../../assets/icons/shield.png');
const ICON_VACCINE = require('../../assets/icons/stat_vaccine.png');
const ICON_LOCATION = require('../../assets/icons/location.png');
const ICON_BELL = require('../../assets/icons/bell_minimal_green.png');
const ICON_PERSON = require('../../assets/icons/person.png');
const ICON_REFRESH = require('../../assets/icons/refresh.png');
const ICON_CHEVRON = require('../../assets/icons/chevron-right.png');
const ICON_CLIPBOARD = require('../../assets/icons/clipboard.png');
const ICON_WARN = require('../../assets/icons/alert.png');

export default function OfficerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, isEnglish } = useAppLanguage();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string>('All');

  const userId = user?.id || (user as any)?._id || 'officer_default';
  const officerName = user?.name || (isEnglish ? 'District Officer' : 'ज़िला अधिकारी');
  const districtName = user?.district || (isEnglish ? 'District Jurisdiction' : 'ज़िला कार्यक्षेत्र');

  const loadDashboardData = useCallback(async (block: string = selectedBlock, isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const rawDistrict = user?.district || 'Nagpur';
      const cleanDistrict = rawDistrict.split(' ')[0].replace(/[(),]/g, '') || 'Nagpur';

      const result = await officerService.getDashboardSummary(userId, {
        district: cleanDistrict,
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
      isEnglish ? 'Sign Out' : 'लॉग आउट',
      isEnglish
        ? 'Are you sure you want to sign out from the Officer Command Center?'
        : 'क्या आप अधिकारी कमांड सेंटर से साइन आउट करना चाहते हैं?',
      [
        { text: isEnglish ? 'Cancel' : 'रद्द करें', style: 'cancel' },
        {
          text: isEnglish ? 'Sign Out' : 'साइन आउट',
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

  const outbreakCount = summary?.triageMetrics?.outbreakCount || 0;

  return (
    <View style={styles.screenWrapper}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboardData(selectedBlock, true)}
            colors={['#4338CA']}
            tintColor="#4338CA"
          />
        }
      >
        {/* 1. Ultra-Premium Command Header */}
        <View style={styles.commandHeader}>
          {/* Top Cadre Badge Row */}
          <View style={styles.headerTopRow}>
            <View style={styles.cadreBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.cadreBadgeText}>
                {isEnglish ? 'DISTRICT EPIDEMIOLOGICAL COMMAND CENTER' : 'ज़िला महामारी विज्ञान कमांड सेंटर'}
              </Text>
            </View>

            <View style={styles.headerActionGroup}>
              <TouchableOpacity
                onPress={() => router.push('/(officer)/profile' as any)}
                style={styles.headerIconBtn}
                activeOpacity={0.8}
              >
                <Image source={ICON_PERSON} style={styles.headerIconImg} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.headerSignOutBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.headerSignOutText}>{isEnglish ? 'Exit' : 'निकास'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Officer Title & District */}
          <View style={styles.titleInfoWrap}>
            <Text style={styles.officerNameText}>{officerName}</Text>
            <Text style={styles.districtJurisdictionText}>
              {isEnglish ? 'Administrative Jurisdiction: ' : 'प्रशासनिक क्षेत्राधिकार: '}
              <Text style={styles.districtHighlight}>{districtName}</Text>
            </Text>
          </View>

          {/* Sync Timestamp & Quick Refresh */}
          <View style={styles.syncRow}>
            <View style={styles.syncIndicator}>
              <View style={styles.syncDot} />
              <Text style={styles.syncTimestampText}>
                {isEnglish ? 'Synced: ' : 'अंतिम सिंक: '}
                {formatLastUpdated(lastUpdated)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => loadDashboardData(selectedBlock, false)}
              style={styles.refreshPillBtn}
              activeOpacity={0.8}
              disabled={loading || refreshing}
            >
              <Image source={ICON_REFRESH} style={styles.refreshPillIcon} />
              <Text style={styles.refreshPillText}>{isEnglish ? 'Sync Feed' : 'सिंक करें'}</Text>
            </TouchableOpacity>
          </View>

          {/* Offline Banner */}
          {isFromCache && (
            <View style={styles.offlineBanner}>
              <Image source={ICON_WARN} style={styles.offlineBannerIcon} />
              <Text style={styles.offlineBannerText}>
                {isEnglish
                  ? 'Offline Mode: Displaying cached district surveillance records.'
                  : 'ऑफ़लाइन मोड: डिवाइस पर सहेजे गए रिकॉर्ड दिखाए जा रहे हैं।'}
              </Text>
            </View>
          )}
        </View>

        {/* 2. Loading State */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4338CA" />
            <Text style={styles.loadingText}>
              {isEnglish
                ? 'Syncing Epidemiological Surveillance Metrics...'
                : 'महामारी विज्ञान डेटा सिंक किया जा रहा है...'}
            </Text>
          </View>
        )}

        {/* 3. Error State */}
        {!loading && errorMessage && !summary && (
          <View style={styles.errorCard}>
            <Image source={ICON_WARN} style={styles.errorCardIcon} />
            <Text style={styles.errorCardTitle}>
              {isEnglish ? 'Surveillance Data Unavailable' : 'निगरानी डेटा अनुपलब्ध'}
            </Text>
            <Text style={styles.errorCardMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadDashboardData(selectedBlock, false)}
              activeOpacity={0.85}
            >
              <Image source={ICON_REFRESH} style={styles.retryBtnIcon} />
              <Text style={styles.retryBtnText}>{isEnglish ? 'Retry Sync' : 'पुनः प्रयास करें'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Active Dashboard Content */}
        {!loading && summary && (
          <>
            {/* Sub-District / Block Filter Ribbon */}
            {availableBlocks.length > 1 && (
              <View style={styles.blockFilterSection}>
                <Text style={styles.blockFilterLabel}>
                  {isEnglish ? 'Filter Sub-District / Block:' : 'ब्लॉक अनुसार फ़िल्टर करें:'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blockChipsScroll}>
                  {availableBlocks.map((b) => {
                    const isSelected = selectedBlock === b;
                    return (
                      <TouchableOpacity
                        key={b}
                        style={[styles.blockChip, isSelected ? styles.blockChipActive : styles.blockChipInactive]}
                        onPress={() => setSelectedBlock(b)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.blockChipText, isSelected ? styles.blockChipTextActive : styles.blockChipTextInactive]}>
                          {b === 'All' ? (isEnglish ? 'All Blocks' : 'सभी ब्लॉक') : b}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Urgent Outbreak Cluster Priority Callout */}
            {outbreakCount > 0 && (
              <View style={styles.outbreakAlertCard}>
                <View style={styles.outbreakAlertHeader}>
                  <Image source={ICON_ALERT} style={styles.outbreakAlertIcon} />
                  <View style={styles.outbreakAlertTitleCol}>
                    <Text style={styles.outbreakAlertTitle}>
                      {outbreakCount} {isEnglish ? 'Active Outbreak Cluster' : 'सक्रिय प्रकोप क्लस्टर'}
                      {outbreakCount > 1 ? (isEnglish ? 's' : '') : ''}
                    </Text>
                    <Text style={styles.outbreakUrgencyPill}>
                      {isEnglish ? 'CRITICAL CONTAINMENT REQUIRED' : 'तत्काल रोकथाम आवश्यक'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.outbreakAlertBody}>
                  {isEnglish
                    ? `DBSCAN spatial clustering detected disease transmission hotspots in ${districtName}. Implement containment perimeters and schedule ring vaccination drives immediately.`
                    : `DBSCAN स्थानिक क्लस्टरिंग द्वारा ${districtName} में संक्रमण हॉटस्पॉट की पहचान की गई है। तुरंत कंटेनमेंट ज़ोन घोषित करें।`}
                </Text>
                <View style={styles.outbreakActionRow}>
                  <TouchableOpacity
                    style={styles.outbreakBtnPrimary}
                    onPress={() => router.push('/(officer)/outbreaks' as any)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.outbreakBtnText}>
                      {isEnglish ? 'Examine Outbreak Clusters' : 'क्लस्टर परीक्षण करें'}
                    </Text>
                    <Image source={ICON_CHEVRON} style={styles.outbreakBtnChevron} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.outbreakBtnSecondary}
                    onPress={() => router.push('/(officer)/containment' as any)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.outbreakBtnSecText}>
                      {isEnglish ? 'Manage Containment' : 'कंटेनमेंट ज़ोन'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 5. 6-KPI Metric Grid */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {isEnglish ? 'District Epidemiological KPIs' : 'ज़िला महामारी विज्ञान संकेतक'}
              </Text>
            </View>

            <View style={styles.kpiGrid}>
              {/* Total Reports */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiHeaderRow}>
                  <Text style={styles.kpiLabel}>{isEnglish ? 'TOTAL REPORTS' : 'कुल रिपोर्ट'}</Text>
                  <Image source={ICON_CLIPBOARD} style={[styles.kpiIcon, { tintColor: '#4338CA' }]} />
                </View>
                <Text style={styles.kpiValue}>{summary.totalReports}</Text>
                <Text style={styles.kpiSub}>{isEnglish ? 'Logged cases' : 'दर्ज मामले'}</Text>
              </View>

              {/* Active Cases */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiHeaderRow}>
                  <Text style={styles.kpiLabel}>{isEnglish ? 'ACTIVE CASES' : 'सक्रिय मामले'}</Text>
                  <Image source={ICON_SURVEILLANCE} style={[styles.kpiIcon, { tintColor: '#0284C7' }]} />
                </View>
                <Text style={[styles.kpiValue, { color: '#0284C7' }]}>{summary.activeCases}</Text>
                <Text style={styles.kpiSub}>{isEnglish ? 'Under investigation' : 'जांच के अधीन'}</Text>
              </View>

              {/* Livestock Mortalities */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiHeaderRow}>
                  <Text style={styles.kpiLabel}>{isEnglish ? 'MORTALITIES' : 'मृत्यु संख्या'}</Text>
                  <Image source={ICON_ALERT} style={[styles.kpiIcon, { tintColor: '#DC2626' }]} />
                </View>
                <Text style={[styles.kpiValue, { color: '#DC2626' }]}>{summary.totalMortality}</Text>
                <Text style={[styles.kpiSub, { color: '#DC2626' }]}>{isEnglish ? 'Reported deaths' : 'दर्ज मौतें'}</Text>
              </View>

              {/* Critical Triage */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiHeaderRow}>
                  <Text style={styles.kpiLabel}>{isEnglish ? 'HIGH / CRITICAL' : 'गंभीर स्थिति'}</Text>
                  <Image source={ICON_WARN} style={[styles.kpiIcon, { tintColor: '#D97706' }]} />
                </View>
                <Text style={[styles.kpiValue, { color: '#D97706' }]}>
                  {(summary.triageMetrics?.criticalCount || 0) + (summary.triageMetrics?.highCount || 0)}
                </Text>
                <Text style={styles.kpiSub}>{isEnglish ? 'Urgent triage' : 'प्राथमिकता'}</Text>
              </View>

              {/* Active Outbreaks */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiHeaderRow}>
                  <Text style={styles.kpiLabel}>{isEnglish ? 'OUTBREAKS' : 'प्रकोप क्लस्टर'}</Text>
                  <Image source={ICON_SHIELD} style={[styles.kpiIcon, { tintColor: '#7C3AED' }]} />
                </View>
                <Text style={[styles.kpiValue, { color: '#7C3AED' }]}>{outbreakCount}</Text>
                <Text style={styles.kpiSub}>{isEnglish ? 'Spatial clusters' : 'क्लस्टर समूह'}</Text>
              </View>

              {/* Vaccination Coverage */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiHeaderRow}>
                  <Text style={styles.kpiLabel}>{isEnglish ? 'VACCINATION' : 'टीकाकरण'}</Text>
                  <Image source={ICON_VACCINE} style={[styles.kpiIcon, { tintColor: '#10B981' }]} />
                </View>
                <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                  {summary.vaccination?.coveragePct ?? 0}%
                </Text>
                <Text style={styles.kpiSub}>{isEnglish ? 'District coverage' : 'ज़िला आच्छादन'}</Text>
              </View>
            </View>

            {/* 6. Operational Status & Vaccination Progress */}
            <View style={styles.capacityCard}>
              <View style={styles.capacityHeaderRow}>
                <View style={styles.capacityTitleCol}>
                  <Text style={styles.capacityCardTitle}>
                    {isEnglish ? 'District Vaccination Drive Coverage' : 'ज़िला टीकाकरण अभियान आच्छादन'}
                  </Text>
                  <Text style={styles.capacityCardSubtitle}>
                    {summary.vaccination?.totalCovered?.toLocaleString() || '0'} of{' '}
                    {summary.vaccination?.totalTarget?.toLocaleString() || '0'}{' '}
                    {isEnglish ? 'livestock protected' : 'पशु सुरक्षित'}
                  </Text>
                </View>
                <View style={styles.capacityBadgePill}>
                  <Text style={styles.capacityBadgePillText}>
                    {summary.vaccination?.coveragePct ?? 0}%
                  </Text>
                </View>
              </View>

              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarActiveFill,
                    { width: `${Math.min(100, summary.vaccination?.coveragePct || 0)}%` },
                  ]}
                />
              </View>
            </View>

            {/* Diagnostic Lab Pipeline */}
            {summary.labPipeline && Object.keys(summary.labPipeline).length > 0 && (
              <View style={styles.labPipelineCard}>
                <View style={styles.labHeaderRow}>
                  <Text style={styles.labCardTitle}>
                    {isEnglish ? 'Diagnostic Lab Pipeline' : 'नैदानिक लैब परीक्षण पाइपलाइन'}
                  </Text>
                </View>
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
              <View style={styles.blockBurdenCard}>
                <View style={styles.blockHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    {isEnglish ? 'Sub-District Disease Burden' : 'उप-ज़िला रोग भार विश्लेषण'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(officer)/surveillance' as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.fullAnalysisLink}>
                      {isEnglish ? 'Full Analysis →' : 'विस्तृत रिपोर्ट →'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.blockList}>
                  {summary.blockDistribution.slice(0, 4).map((b, idx) => (
                    <View key={idx} style={styles.blockRowItem}>
                      <View style={styles.blockNameCol}>
                        <Text style={styles.blockNameText}>{b._id || 'District'} Block</Text>
                        <Text style={styles.blockMortalityText}>
                          {b.deaths > 0
                            ? `${b.deaths} ${isEnglish ? 'mortalities registered' : 'मौतें दर्ज'}`
                            : (isEnglish ? 'Zero mortalities' : 'शून्य मृत्यु')}
                        </Text>
                      </View>
                      <View style={styles.blockCountPill}>
                        <Text style={styles.blockCountPillText}>
                          {b.count} {isEnglish ? 'cases' : 'मामले'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* 7. 8-Module Surveillance & Operations Command Suite */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {isEnglish ? 'Surveillance & Operations Command Suite' : 'निगरानी एवं संचालन मॉड्यूल'}
          </Text>
        </View>

        <View style={styles.navGrid}>
          {/* Module 1: Epidemic Surveillance */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/(officer)/surveillance' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Image source={ICON_SURVEILLANCE} style={[styles.moduleIconImg, { tintColor: '#4338CA' }]} />
            </View>
            <Text style={styles.moduleTitle}>
              {isEnglish ? 'Epidemic Surveillance' : 'महामारी निगरानी'}
            </Text>
            <Text style={styles.moduleDesc}>
              {isEnglish
                ? '30-day epidemic curve, triage funnel, and disease breakdown'
                : '30-दिवसीय वक्र, ट्रायज विश्लेषण व रोग डेटा'}
            </Text>
          </TouchableOpacity>

          {/* Module 2: Outbreak Alerts */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/(officer)/outbreaks' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Image source={ICON_ALERT} style={[styles.moduleIconImg, { tintColor: '#B45309' }]} />
            </View>
            <Text style={styles.moduleTitle}>
              {isEnglish ? 'Outbreak Alerts' : 'प्रकोप चेतावनी'}
            </Text>
            <Text style={styles.moduleDesc}>
              {isEnglish
                ? 'DBSCAN proximity clusters, threshold alarms, high-risk villages'
                : 'क्लस्टर पहचान, सीमा चेतावनी एवं उच्च जोखिम गांव'}
            </Text>
          </TouchableOpacity>

          {/* Module 3: Containment Zones */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/(officer)/containment' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Image source={ICON_SHIELD} style={[styles.moduleIconImg, { tintColor: '#7C3AED' }]} />
            </View>
            <Text style={styles.moduleTitle}>
              {isEnglish ? 'Containment Zones' : 'कंटेनमेंट ज़ोन'}
            </Text>
            <Text style={styles.moduleDesc}>
              {isEnglish
                ? 'Quarantine perimeters, movement controls, ring vaccination'
                : 'क्वारंटाइन परिधि, आवागमन नियंत्रण व रिंग टीकाकरण'}
            </Text>
          </TouchableOpacity>

          {/* Module 4: Mass Vaccination Camps */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/(officer)/vaccination' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Image source={ICON_VACCINE} style={[styles.moduleIconImg, { tintColor: '#059669' }]} />
            </View>
            <Text style={styles.moduleTitle}>
              {isEnglish ? 'Mass Vaccination Camps' : 'सामूहिक टीकाकरण शिविर'}
            </Text>
            <Text style={styles.moduleDesc}>
              {isEnglish
                ? 'District camp scheduling, slot allocation, and field logistics'
                : 'शिविर समय-सारणी, स्लॉट आवंटन एवं फील्ड रसद'}
            </Text>
          </TouchableOpacity>

          {/* Module 5: District GIS Map */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/(officer)/map' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Image source={ICON_LOCATION} style={[styles.moduleIconImg, { tintColor: '#0284C7' }]} />
            </View>
            <Text style={styles.moduleTitle}>
              {isEnglish ? 'District GIS Map' : 'ज़िला जीआईएस मैप'}
            </Text>
            <Text style={styles.moduleDesc}>
              {isEnglish
                ? 'High-density outbreak heatmaps, cluster centers, and zone perimeters'
                : 'प्रकोप हीटमैप, क्लस्टर केंद्र व ज़ोन सीमाएं'}
            </Text>
          </TouchableOpacity>

          {/* Module 6: Official Advisories */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/(officer)/advisories' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Image source={ICON_BELL} style={[styles.moduleIconImg, { tintColor: '#D97706' }]} />
            </View>
            <Text style={styles.moduleTitle}>
              {isEnglish ? 'Official Advisories' : 'आधिकारिक परामर्श'}
            </Text>
            <Text style={styles.moduleDesc}>
              {isEnglish
                ? 'Biosecurity bulletins, emergency directives, farmer broadcasts'
                : 'बायोसिक्योरिटी बुलेटिन, आपातकालीन निर्देश व प्रसारण'}
            </Text>
          </TouchableOpacity>

          {/* Module 7: NADRES Forewarning */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/(officer)/forewarning' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Image source={ICON_WARN} style={[styles.moduleIconImg, { tintColor: '#DC2626' }]} />
            </View>
            <Text style={styles.moduleTitle}>
              {isEnglish ? 'NADRES Forewarning' : 'नाड्रेस पूर्व-चेतावनी'}
            </Text>
            <Text style={styles.moduleDesc}>
              {isEnglish
                ? 'ICAR-NIVEDI meteorological risk alerts and predictive models'
                : 'आईसीएआर-निवेदी मौसम संबंधी जोखिम एवं पूर्वानुमान मॉडल'}
            </Text>
          </TouchableOpacity>

          {/* Module 8: Officer Profile & Settings */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/(officer)/profile' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Image source={ICON_PERSON} style={[styles.moduleIconImg, { tintColor: '#475569' }]} />
            </View>
            <Text style={styles.moduleTitle}>
              {isEnglish ? 'Officer Profile & Settings' : 'अधिकारी प्रोफ़ाइल व सेटिंग्स'}
            </Text>
            <Text style={styles.moduleDesc}>
              {isEnglish
                ? 'Credentials, district jurisdiction, language, and system configuration'
                : 'प्रमाणपत्र, ज़िला अधिकार क्षेत्र, भाषा एवं प्रणाली सेटिंग्स'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Universal Fixed Floating Bottom Navigation Dock */}
      <OfficerFloatingNav activeTab="dashboard" outbreakCount={outbreakCount} />
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
  commandHeader: {
    backgroundColor: '#0B132B',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cadreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38BDF8',
  },
  cadreBadgeText: {
    fontFamily: FONT_BOLD,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 0.6,
  },
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerIconImg: {
    width: 15,
    height: 15,
    tintColor: '#FFFFFF',
  },
  headerSignOutBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.5)',
  },
  headerSignOutText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  titleInfoWrap: {
    marginBottom: 10,
  },
  officerNameText: {
    fontFamily: FONT_BOLD,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  districtJurisdictionText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12.5,
    color: '#CBD5E1',
    marginTop: 2,
  },
  districtHighlight: {
    fontFamily: FONT_BOLD,
    color: '#38BDF8',
    fontWeight: '800',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  syncTimestampText: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#E2E8F0',
  },
  refreshPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(67, 56, 202, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  refreshPillIcon: {
    width: 11,
    height: 11,
    tintColor: '#FFFFFF',
  },
  refreshPillText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
  offlineBannerIcon: {
    width: 14,
    height: 14,
    tintColor: '#92400E',
  },
  offlineBannerText: {
    flex: 1,
    fontFamily: FONT_MEDIUM,
    fontSize: 11,
    color: '#92400E',
  },
  loadingContainer: {
    padding: 32,
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
  errorCardIcon: {
    width: 40,
    height: 40,
    tintColor: '#DC2626',
    marginBottom: 8,
  },
  errorCardTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  errorCardMessage: {
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
  blockFilterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  blockFilterLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  blockChipsScroll: {
    gap: 8,
  },
  blockChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  blockChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  blockChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  blockChipText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 12,
    fontWeight: '600',
  },
  blockChipTextActive: {
    color: '#FFFFFF',
  },
  blockChipTextInactive: {
    color: '#475569',
  },
  outbreakAlertCard: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    ...shadows.sm,
  },
  outbreakAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  outbreakAlertIcon: {
    width: 24,
    height: 24,
    tintColor: '#DC2626',
  },
  outbreakAlertTitleCol: {
    flex: 1,
  },
  outbreakAlertTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  outbreakUrgencyPill: {
    fontFamily: FONT_BOLD,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  outbreakAlertBody: {
    fontFamily: FONT_REGULAR,
    fontSize: 12.5,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 10,
  },
  outbreakActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  outbreakBtnPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: 12,
  },
  outbreakBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  outbreakBtnChevron: {
    width: 10,
    height: 10,
    tintColor: '#FFFFFF',
  },
  outbreakBtnSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  outbreakBtnSecText: {
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kpiLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiIcon: {
    width: 16,
    height: 16,
  },
  kpiValue: {
    fontFamily: FONT_BOLD,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kpiSub: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  capacityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  capacityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  capacityTitleCol: {
    flex: 1,
  },
  capacityCardTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  capacityCardSubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  capacityBadgePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  capacityBadgePillText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarActiveFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  labPipelineCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  labHeaderRow: {
    marginBottom: 8,
  },
  labCardTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  labStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labStatItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labStatCount: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  labStatLabel: {
    fontFamily: FONT_MEDIUM,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  blockBurdenCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  blockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fullAnalysisLink: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  blockList: {
    gap: 8,
  },
  blockRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  blockNameCol: {
    flex: 1,
  },
  blockNameText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: '#0F172A',
  },
  blockMortalityText: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  blockCountPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  blockCountPillText: {
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4338CA',
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  moduleCard: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  moduleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  moduleIconImg: {
    width: 20,
    height: 20,
  },
  moduleTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  moduleDesc: {
    fontFamily: FONT_REGULAR,
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 14,
  },
});
