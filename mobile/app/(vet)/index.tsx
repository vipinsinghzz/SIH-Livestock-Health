/**
 * PashuCare - Ultra-Premium Veterinarian Clinical Dashboard
 * File: mobile/app/(vet)/index.tsx
 * 
 * Redesigned with UI/UX Pro Max Intelligence:
 * - Professional Doctor Identity Banner (Cadre, Reg No, Jurisdiction district, Active Duty status)
 * - Agrometeorological Weather & ICAR-NADRES Live Epidemic Forewarning (Temp, Humidity, THI, Vector Risk)
 * - Compact, High-Density Clinical Surveillance Overview (3x2 sleek matrix with instant alert color tokens)
 * - Critical Case Prioritization (Critical/High-Risk cases sorted to top with lesion photos and urgent triage pills)
 * - Clinical Operations Hub with crisp, properly sized icons and high-contrast bold typography
 * - Recent District Referrals with real clinical lesion photos (Lumpy, FMD) & 3D species avatars
 * - Enlarged, Ergonomic Veterinarian Floating Bottom Navigation Dock (Dashboard, Triage, GIS Radar, Patients, Alerts)
 * - Zero raw text emojis (vector icons throughout)
 * - 100% Platform-safe fonts avoiding Android crashes
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
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/context/AuthContext';
import { useAppLanguage } from '../../src/services/i18n';
import { veterinarianService } from '../../src/services/veterinarianService';
import { nadresService } from '../../src/services/nadresService';
import notificationService from '../../src/services/notificationService';
import { advisoryService } from '../../src/services/advisoryService';
import { VetDashboardMetrics } from '../../src/types/vet';
import { NadresAlert, WeatherContext, OfficialAdvisory } from '../../src/types/advisory';
import {
  AppNotification,
  resolveVetNotificationNavigation,
} from '../../src/types/notification';
import {
  DiseaseCase,
  getStatusTheme,
  getRiskTheme,
  sortCasesByCriticality,
  getCaseCriticalityPriority,
} from '../../src/types/case';
import { isCaseClaimable, isCaseAssignedToVet } from '../../src/types/referral';
import { OfflineNotice } from '../../src/components/OfflineNotice';
import { VetFloatingNav } from '../../src/components/VetFloatingNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Native typography stack for stability across all Android & iOS devices
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_EXTRABOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

function formatRelativeTime(isoString?: string, isEn = true): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0 || isNaN(diffMs)) return isEn ? 'Just now' : 'अभी';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return isEn ? 'Just now' : 'अभी';
  if (diffMins < 60) return `${diffMins}${isEn ? 'm ago' : ' मिनट पहले'}`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}${isEn ? 'h ago' : ' घंटे पहले'}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}${isEn ? 'd ago' : ' दिन पहले'}`;
  return d.toLocaleDateString(isEn ? 'en-IN' : 'hi-IN', { month: 'short', day: 'numeric' });
}

function getAlertSeverityTheme(severity?: string, isEn = true) {
  const s = String(severity || '').toLowerCase();
  if (s.includes('crit')) {
    return {
      label: isEn ? 'CRITICAL' : 'गंभीर',
      bg: '#FEE2E2',
      border: '#FCA5A5',
      text: '#991B1B',
      dot: '#DC2626',
      actionColor: '#DC2626',
    };
  }
  if (s.includes('high')) {
    return {
      label: isEn ? 'HIGH RISK' : 'उच्च जोखिम',
      bg: '#FFEDD5',
      border: '#FDBA74',
      text: '#9A3412',
      dot: '#EA580C',
      actionColor: '#EA580C',
    };
  }
  if (s.includes('mod')) {
    return {
      label: isEn ? 'MODERATE' : 'मध्यम',
      bg: '#FEF3C7',
      border: '#FDE68A',
      text: '#92400E',
      dot: '#D97706',
      actionColor: '#D97706',
    };
  }
  return {
    label: isEn ? 'LOW' : 'सामान्य',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
    dot: '#059669',
    actionColor: '#0F5132',
  };
}

function getAdvisoryCardTheme(severity?: string, isEn = true) {
  const s = String(severity || '').toLowerCase();
  if (s.includes('crit')) {
    return {
      label: isEn ? 'CRITICAL DIRECTIVE' : 'अति आवश्यक निर्देश',
      bg: '#FEE2E2',
      border: '#FCA5A5',
      text: '#991B1B',
      dot: '#DC2626',
      actionColor: '#DC2626',
    };
  }
  if (s.includes('high')) {
    return {
      label: isEn ? 'BIOSECURITY ADVISORY' : 'जैव सुरक्षा परामर्श',
      bg: '#FFEDD5',
      border: '#FDBA74',
      text: '#9A3412',
      dot: '#EA580C',
      actionColor: '#EA580C',
    };
  }
  return {
    label: isEn ? 'DEPARTMENT BULLETIN' : 'विभागीय बुलेटिन',
    bg: '#E0F2FE',
    border: '#BAE6FD',
    text: '#0369A1',
    dot: '#0284C7',
    actionColor: '#0284C7',
  };
}

function getAlertCategoryLabel(alert: AppNotification, isEn = true): string {
  if (alert.type === 'OUTBREAK_CLUSTER_ALERT') {
    return isEn ? 'Outbreak Alert' : 'महामारी प्रकोप अलर्ट';
  }
  if (alert.type === 'CONTAINMENT_ZONE_CREATED' || alert.type === 'CONTAINMENT_ZONE_UPDATED') {
    return isEn ? 'Containment Perimeter' : 'कंटेनमेंट घेराबंदी';
  }
  if (alert.type === 'NEW_CASE_ALERT') {
    return isEn ? 'New Referral Case' : 'नया रेफरल केस';
  }
  if (alert.type === 'RING_VACCINATION_SCHEDULED') {
    return isEn ? 'Ring Vaccination Drive' : 'रिंग टीकाकरण अभियान';
  }
  return isEn ? 'Clinical Surveillance' : 'क्लिनिकल निगरानी';
}

function getAlertDiseaseText(alert: AppNotification): string {
  if (alert.metadata?.disease) {
    return `${alert.metadata.disease} detected`;
  }
  if (alert.title) {
    const clean = alert.title.replace(/^[^a-zA-Z0-9]+/, '').trim();
    return clean;
  }
  return 'Suspected condition under surveillance';
}

function getAlertLocationText(alert: AppNotification, defaultDistrict: string): string {
  const parts = [
    defaultDistrict || alert.district,
    alert.metadata?.block || alert.metadata?.village,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : defaultDistrict;
}

function getAdvisoryLocationText(adv: OfficialAdvisory, defaultDistrict: string): string {
  const dist = adv.targetDistrict || defaultDistrict;
  const block = adv.targetBlock && adv.targetBlock !== 'All' ? adv.targetBlock : '';
  const parts = [dist, block].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : `${dist} District-wide`;
}

export default function VetHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, isEnglish } = useAppLanguage();

  const [metrics, setMetrics] = useState<VetDashboardMetrics | null>(null);
  const [recentCases, setRecentCases] = useState<DiseaseCase[]>([]);
  const [clinicalAlerts, setClinicalAlerts] = useState<AppNotification[]>([]);
  const [biosecurityAdvisories, setBiosecurityAdvisories] = useState<OfficialAdvisory[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [advisoriesCount, setAdvisoriesCount] = useState<number>(0);
  const [latestAdvisory, setLatestAdvisory] = useState<OfficialAdvisory | null>(null);
  const [nadresAlerts, setNadresAlerts] = useState<NadresAlert[]>([]);
  const [weatherContext, setWeatherContext] = useState<WeatherContext | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState<boolean>(false);
  const [selectedAlertModal, setSelectedAlertModal] = useState<AppNotification | null>(null);
  const [selectedAdvisoryModal, setSelectedAdvisoryModal] = useState<OfficialAdvisory | null>(null);

  const rawName = user?.name ? user.name.replace(/^Dr\.\s*/i, '') : 'Specialist';
  const vetName = `Dr. ${rawName}`;
  const vetDistrict = user?.district || 'Nagpur';
  const registrationNo = user?.registrationNo || 'VET-MH-2024-8841';

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [result, notifs, nadresResult, advisoriesRes] = await Promise.allSettled([
        veterinarianService.getDashboardMetrics(user?.district || 'Nagpur'),
        notificationService.getVeterinarianNotifications({
          userId: user?.id || user?._id,
          district: user?.district || 'Nagpur',
        }),
        nadresService.getNadresAlerts({
          district: user?.district || 'Nagpur',
          state: user?.state || 'Maharashtra',
        }),
        advisoryService.getAdvisories({
          district: user?.district || 'Nagpur',
        }),
      ]);

      if (result.status === 'fulfilled') {
        setMetrics(result.value.metrics);
        // Prioritize critical and high-risk cases for veterinarians
        const sorted = sortCasesByCriticality(result.value.recentCases || []);
        setRecentCases(sorted);
        setIsFromCache(result.value.fromCache);
      } else {
        console.warn('[VetDashboard] Error loading metrics:', result.reason?.message);
        setError(result.reason?.message || 'Failed to load clinical dashboard.');
      }

      if (notifs.status === 'fulfilled') {
        const notifList = notifs.value || [];
        setUnreadAlertsCount(notificationService.getUnreadCount(notifList));
        setClinicalAlerts(notifList.slice(0, 3));
      }

      if (nadresResult.status === 'fulfilled') {
        setNadresAlerts(nadresResult.value.alerts || []);
        setWeatherContext(nadresResult.value.weatherContext || null);
      }

      if (advisoriesRes.status === 'fulfilled') {
        const advList = advisoriesRes.value.advisories || [];
        setAdvisoriesCount(advisoriesRes.value.count || advList.length);
        setBiosecurityAdvisories(advList.slice(0, 3));
        if (advList.length > 0) {
          setLatestAdvisory(advList[0]);
        }
      }
    } catch (err: any) {
      console.warn('[VetDashboard] Error loading dashboard data:', err?.message);
      setError(err?.message || 'Failed to load clinical dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.district, user?.id, user?._id, user?.state]);

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
      t('vet.claimReferralCase', 'Claim Referral Case'),
      t('vet.confirmClaimMsg', 'Are you sure you want to take clinical responsibility for case {caseId} ({disease})?', {
        caseId: caseItem.caseId,
        disease: caseItem.disease,
      }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('vet.confirmClaim', 'Confirm Claim'),
          style: 'default',
          onPress: async () => {
            try {
              setClaimingId(caseTargetId);
              await veterinarianService.claimCase(caseTargetId);
              Alert.alert(
                t('common.success', 'Success'),
                t('vet.caseClaimedSuccess', 'Case {caseId} has been assigned to your care.', {
                  caseId: caseItem.caseId,
                })
              );
              loadDashboardData();
            } catch (claimErr: any) {
              Alert.alert(t('vet.cannotClaim', 'Cannot Claim Case'), claimErr.message || 'Failed to claim referral.');
            } finally {
              setClaimingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSignOutConfirm = async () => {
    setShowSignOutModal(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const getSpeciesAvatar = (species?: string) => {
    const s = String(species || '').toLowerCase();
    if (s.includes('buffalo') || s.includes('भैंस')) {
      return require('../../assets/avatar_buffalo.png');
    }
    if (s.includes('goat') || s.includes('बकरी')) {
      return require('../../assets/avatar_goat.png');
    }
    if (s.includes('sheep') || s.includes('भेड़')) {
      return require('../../assets/avatar_sheep.png');
    }
    return require('../../assets/avatar_cow.png');
  };

  const getClinicalLesionImage = (disease?: string, imageUri?: string) => {
    if (imageUri && (imageUri.startsWith('http://') || imageUri.startsWith('https://') || imageUri.startsWith('file://'))) {
      return { uri: imageUri };
    }
    const d = String(disease || '').toLowerCase();
    if (d.includes('lumpy') || d.includes('लम्पी') || d.includes('lsd')) {
      return require('../../assets/case_thumb_lumpy.png');
    }
    if (d.includes('fmd') || d.includes('foot') || d.includes('mouth') || d.includes('खुरपका')) {
      return require('../../assets/case_thumb_fmd.png');
    }
    return require('../../assets/case_thumb_normal.png');
  };

  const formatCaseTime = (dateStr?: string) => {
    if (!dateStr) return isEnglish ? 'Recently' : 'हाल ही में';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isEnglish ? 'Recently' : 'हाल ही में';
    }
  };

  // Determine top NADRES outbreak forewarning
  const topAlert = nadresAlerts.length > 0 ? nadresAlerts[0] : null;
  const hasCriticalCases = (metrics?.newReferralsCount ?? 0) > 0 || (metrics?.confirmedCount ?? 0) > 0;

  return (
    <View style={styles.screenWrapper}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#0B3D26" />
      <OfflineNotice />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ======================================================== */}
        {/* TOP DOCTOR CLINICAL HEADER BAR */}
        {/* ======================================================== */}
        <View style={styles.topBar}>
          <View style={styles.doctorProfileRow}>
            {/* Doctor Avatar */}
            <View style={styles.doctorAvatarBox}>
              <Image
                source={require('../../assets/icons/stethoscope.png')}
                style={styles.doctorAvatarIcon}
                resizeMode="contain"
              />
              <View style={styles.onlinePulseDot} />
            </View>

            {/* Doctor Identity & Jurisdiction */}
            <View style={styles.doctorInfoCol}>
              <View style={styles.cadreBadgeRow}>
                <View style={styles.cadrePill}>
                  <Text style={styles.cadrePillText}>
                    {isEnglish ? 'VET SURGEON PORTAL' : 'पशु चिकित्सा पोर्टल'}
                  </Text>
                </View>
                <View style={styles.liveDutyBadge}>
                  <View style={styles.liveDutyDot} />
                  <Text style={styles.liveDutyText}>
                    {isEnglish ? 'ACTIVE ON DUTY' : 'ड्यूटी पर तैनात'}
                  </Text>
                </View>
              </View>

              <Text style={styles.doctorNameText} numberOfLines={1}>
                {vetName}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.regBadge}>
                  <Text style={styles.regBadgeText}>
                    {registrationNo}
                  </Text>
                </View>
                <View style={styles.jurisdictionRow}>
                  <Image
                    source={require('../../assets/icons/location.png')}
                    style={styles.jurisdictionPin}
                    resizeMode="contain"
                  />
                  <Text style={styles.jurisdictionText} numberOfLines={1}>
                    {vetDistrict}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions: Alerts Bell & Logout */}
            <View style={styles.topActionsCol}>
              <TouchableOpacity
                onPress={() => router.push('/(vet)/notifications')}
                style={styles.alertBellBtn}
                activeOpacity={0.75}
                accessibilityLabel="Clinical Alerts"
              >
                <Image
                  source={require('../../assets/icons/bell_minimal_green.png')}
                  style={styles.bellIconImg}
                  resizeMode="contain"
                />
                {unreadAlertsCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowSignOutModal(true)}
                style={styles.signOutBtn}
                activeOpacity={0.75}
                accessibilityLabel="Sign Out"
              >
                <Text style={styles.signOutBtnText}>
                  {isEnglish ? 'Logout' : 'लॉगआउट'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* MAIN SCROLLABLE CONTENT */}
        {/* ======================================================== */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0F5132']}
              tintColor="#0F5132"
            />
          }
        >
          {/* Offline Cache Notice Banner */}
          {isFromCache && (
            <View style={styles.cacheNotice}>
              <Image
                source={require('../../assets/icons/alert.png')}
                style={styles.cacheNoticeIcon}
                resizeMode="contain"
              />
              <Text style={styles.cacheNoticeText}>
                {isEnglish
                  ? 'Offline Mode: Displaying saved clinical records from device memory.'
                  : 'ऑफलाइन मोड: डिवाइस मेमोरी से सहेजे गए क्लिनिकल रिकॉर्ड प्रदर्शित किए जा रहे हैं।'}
              </Text>
            </View>
          )}

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0F5132" />
              <Text style={styles.loadingText}>
                {isEnglish ? 'Synchronizing district disease registry...' : 'जिला पशु स्वास्थ्य डेटा सिंक हो रहा है...'}
              </Text>
            </View>
          )}

          {/* Error State with Retry */}
          {error && !loading && (
            <View style={styles.errorBox}>
              <View style={styles.errorHeaderRow}>
                <Image
                  source={require('../../assets/icons/alert.png')}
                  style={styles.errorIcon}
                  resizeMode="contain"
                />
                <Text style={styles.errorTitle}>
                  {isEnglish ? 'Connection Interrupted' : 'डेटा लोड करने में असमर्थ'}
                </Text>
              </View>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData} activeOpacity={0.8}>
                <Image
                  source={require('../../assets/icons/refresh.png')}
                  style={styles.retryBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.retryButtonText}>{t('common.retry', 'Retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ======================================================== */}
          {/* 1. AGROMETEOROLOGICAL WEATHER & ICAR-NADRES LIVE FOREWARNING */}
          {/* ======================================================== */}
          <View style={styles.nadresCard}>
            {/* Weather Telemetry Strip */}
            <View style={styles.weatherStrip}>
              <View style={styles.weatherItem}>
                <Text style={styles.weatherValue}>
                  {weatherContext?.tempC ? `${weatherContext.tempC.toFixed(1)}°C` : '29.5°C'}
                </Text>
                <Text style={styles.weatherLabel}>
                  {isEnglish ? 'Temperature' : 'तापमान'}
                </Text>
              </View>
              <View style={styles.weatherDivider} />
              <View style={styles.weatherItem}>
                <Text style={styles.weatherValue}>
                  {weatherContext?.humidityPct ? `${weatherContext.humidityPct}%` : '66%'}
                </Text>
                <Text style={styles.weatherLabel}>
                  {isEnglish ? 'Humidity' : 'आर्द्रता'}
                </Text>
              </View>
              <View style={styles.weatherDivider} />
              <View style={styles.weatherItem}>
                <Text style={[styles.weatherValue, { color: '#B45309' }]}>
                  {weatherContext?.thi ? `${weatherContext.thi.toFixed(1)}` : '76.4'}
                </Text>
                <Text style={styles.weatherLabel}>
                  {isEnglish ? 'THI Index' : 'टीएचआई सूचकांक'}
                </Text>
              </View>
              <View style={styles.weatherDivider} />
              <View style={styles.weatherItem}>
                <View style={styles.vectorStressPill}>
                  <Text style={styles.vectorStressText}>
                    {weatherContext?.stressLevel || (isEnglish ? 'Vector Alert' : 'कीट सक्रिय')}
                  </Text>
                </View>
                <Text style={styles.weatherLabel}>
                  {isEnglish ? 'Stress Level' : 'तनाव स्तर'}
                </Text>
              </View>
            </View>

            {/* ICAR-NADRES Epidemic Risk Advisory */}
            <View style={styles.nadresBody}>
              <View style={styles.nadresHeaderRow}>
                <View style={styles.nadresBadge}>
                  <Image
                    source={require('../../assets/icons/shield.png')}
                    style={styles.nadresShieldIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.nadresBadgeText}>
                    ICAR - NADRES LIVE FOREWARNING
                  </Text>
                </View>
                <View style={styles.nadresRiskPill}>
                  <Text style={styles.nadresRiskPillText}>
                    {topAlert?.riskLevel ? `${topAlert.riskLevel} Risk` : 'High Bio-Risk'}
                  </Text>
                </View>
              </View>

              <Text style={styles.nadresDiseaseTitle}>
                {topAlert?.diseaseName || (isEnglish ? 'Lumpy Skin Disease & FMD Forewarning' : 'लम्पी चर्म रोग व खुरपका चेतावनी')}
              </Text>
              <Text style={styles.nadresDescText}>
                {topAlert?.aiRecommendationEn ||
                  (isEnglish
                    ? `Elevated humidity & THI in ${vetDistrict} favorable for arthropod vectors. Prioritize ring vaccination & biosecurity cordon.`
                    : `${vetDistrict} में उच्च आर्द्रता एवं टीएचआई वेक्टर फैलाव हेतु संवेदनशील। रिंग टीकाकरण एवं जैविक घेराबंदी प्राथमिकता दें।`)}
              </Text>
            </View>
          </View>

          {/* Dual Action: Clinical Alerts & Advisories Command Strip */}
          <View style={styles.dualAlertAdvStrip}>
            <TouchableOpacity
              style={styles.dualAlertAdvCol}
              onPress={() => router.push('/(vet)/notifications')}
              activeOpacity={0.82}
            >
              <View style={styles.dualAlertIconWrap}>
                <Image
                  source={require('../../assets/icons/bell_minimal_green.png')}
                  style={styles.dualAlertIcon}
                  resizeMode="contain"
                />
                {unreadAlertsCount > 0 && (
                  <View style={styles.dualBadgeRed}>
                    <Text style={styles.dualBadgeText}>{unreadAlertsCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.dualAlertTextCol}>
                <Text style={styles.dualAlertTitle}>
                  {isEnglish ? 'Clinical Alerts' : 'क्लिनिकल अलर्ट'}
                </Text>
                <Text style={styles.dualAlertSub} numberOfLines={1}>
                  {unreadAlertsCount > 0
                    ? isEnglish
                      ? `${unreadAlertsCount} unread notices`
                      : `${unreadAlertsCount} अपठित सूचनाएं`
                    : isEnglish
                    ? 'Surveillance active'
                    : 'निगरानी सक्रिय'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.dualChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <View style={styles.dualDivider} />

            <TouchableOpacity
              style={styles.dualAlertAdvCol}
              onPress={() => router.push('/(vet)/advisories')}
              activeOpacity={0.82}
            >
              <View style={[styles.dualAlertIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Image
                  source={require('../../assets/icons/shield.png')}
                  style={[styles.dualAlertIcon, { tintColor: '#0284C7' }]}
                  resizeMode="contain"
                />
                {advisoriesCount > 0 && (
                  <View style={[styles.dualBadgeRed, { backgroundColor: '#0284C7' }]}>
                    <Text style={styles.dualBadgeText}>{advisoriesCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.dualAlertTextCol}>
                <Text style={styles.dualAlertTitle}>
                  {isEnglish ? 'Biosecurity Desk' : 'जैव सुरक्षा बुलेटिन'}
                </Text>
                <Text style={styles.dualAlertSub} numberOfLines={1}>
                  {advisoriesCount > 0
                    ? isEnglish
                      ? `${advisoriesCount} official bulletins`
                      : `${advisoriesCount} आधिकारिक बुलेटिन`
                    : isEnglish
                    ? 'Directives active'
                    : 'दिशानिर्देश सक्रिय'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.dualChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* ======================================================== */}
          {/* PROMINENT CLINICAL ALERTS SECTION */}
          {/* ======================================================== */}
          <View style={styles.prominentSection}>
            <View style={styles.prominentSectionHeader}>
              <View style={styles.prominentTitleCol}>
                <View style={styles.sectionPillRow}>
                  <View style={[styles.sectionPulseDot, { backgroundColor: '#DC2626' }]} />
                  <Text style={styles.sectionPillText}>
                    {isEnglish ? 'SURVEILLANCE RADAR' : 'निगरानी रडार'}
                  </Text>
                </View>
                <Text style={styles.prominentSectionTitle}>
                  {isEnglish ? 'Clinical Alerts' : 'क्लिनिकल अलर्ट'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(vet)/notifications')}
                style={styles.viewAllPillBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllPillText}>
                  {isEnglish ? 'View All' : 'सभी देखें'} ({unreadAlertsCount > 0 ? unreadAlertsCount : clinicalAlerts.length})
                </Text>
                <Image
                  source={require('../../assets/icons/chevron-right.png')}
                  style={styles.viewAllChevronSmall}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {clinicalAlerts.length === 0 ? (
              <View style={styles.compactEmptyCard}>
                <Image
                  source={require('../../assets/icons/checkmark.png')}
                  style={styles.compactEmptyIcon}
                  resizeMode="contain"
                />
                <Text style={styles.compactEmptyTitle}>
                  {isEnglish ? 'No Critical Outbreak Alerts' : 'कोई गंभीर प्रकोप अलर्ट नहीं'}
                </Text>
                <Text style={styles.compactEmptySub}>
                  {isEnglish
                    ? `Surveillance active across ${vetDistrict} district. No epidemic clusters detected.`
                    : `${vetDistrict} जिले में कोई प्रकोप रिपोर्ट नहीं है।`}
                </Text>
              </View>
            ) : (
              clinicalAlerts.map((alert) => {
                const sevTheme = getAlertSeverityTheme(alert.severity, isEnglish);
                const categoryLabel = getAlertCategoryLabel(alert, isEnglish);
                const diseaseText = getAlertDiseaseText(alert);
                const locationText = getAlertLocationText(alert, vetDistrict);

                return (
                  <TouchableOpacity
                    key={alert.id}
                    style={styles.compactCard}
                    onPress={() => setSelectedAlertModal(alert)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.compactCardTopRow}>
                      <View
                        style={[
                          styles.compactBadge,
                          { backgroundColor: sevTheme.bg, borderColor: sevTheme.border },
                        ]}
                      >
                        <View style={[styles.compactBadgeDot, { backgroundColor: sevTheme.dot }]} />
                        <Text style={[styles.compactBadgeText, { color: sevTheme.text }]}>
                          {sevTheme.label}
                        </Text>
                      </View>
                      <Text style={styles.compactTimeText}>
                        {formatRelativeTime(alert.createdAt, isEnglish)}
                      </Text>
                    </View>

                    <Text style={styles.compactAlertCategory}>{categoryLabel}</Text>
                    <Text style={styles.compactAlertDisease} numberOfLines={1}>
                      {diseaseText}
                    </Text>

                    <View style={styles.compactLocationRow}>
                      <Image
                        source={require('../../assets/icons/location.png')}
                        style={styles.compactLocationPin}
                        resizeMode="contain"
                      />
                      <Text style={styles.compactLocationText} numberOfLines={1}>
                        {locationText}
                      </Text>
                    </View>

                    <View style={styles.compactCardFooter}>
                      <TouchableOpacity
                        style={styles.compactActionBtn}
                        onPress={() => setSelectedAlertModal(alert)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.compactActionBtnText, { color: sevTheme.actionColor }]}>
                          {isEnglish ? 'View Alert →' : 'अलर्ट देखें →'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ======================================================== */}
          {/* PROMINENT ADVISORIES SECTION */}
          {/* ======================================================== */}
          <View style={styles.prominentSection}>
            <View style={styles.prominentSectionHeader}>
              <View style={styles.prominentTitleCol}>
                <View style={[styles.sectionPillRow, { backgroundColor: '#E0F2FE' }]}>
                  <View style={[styles.sectionPulseDot, { backgroundColor: '#0284C7' }]} />
                  <Text style={[styles.sectionPillText, { color: '#0369A1' }]}>
                    {isEnglish ? 'DEPARTMENT DIRECTIVES' : 'विभागीय निर्देश'}
                  </Text>
                </View>
                <Text style={styles.prominentSectionTitle}>
                  {isEnglish ? 'Advisories' : 'जैव सुरक्षा परामर्श'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(vet)/advisories')}
                style={styles.viewAllPillBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllPillText}>
                  {isEnglish ? 'View All' : 'सभी देखें'} ({advisoriesCount > 0 ? advisoriesCount : biosecurityAdvisories.length})
                </Text>
                <Image
                  source={require('../../assets/icons/chevron-right.png')}
                  style={styles.viewAllChevronSmall}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {biosecurityAdvisories.length === 0 ? (
              <View style={styles.compactEmptyCard}>
                <Image
                  source={require('../../assets/icons/shield.png')}
                  style={styles.compactEmptyIcon}
                  resizeMode="contain"
                />
                <Text style={styles.compactEmptyTitle}>
                  {isEnglish ? 'No Active Advisories' : 'कोई सक्रिय परामर्श नहीं'}
                </Text>
                <Text style={styles.compactEmptySub}>
                  {isEnglish
                    ? `Official bulletins and disease prevention directives for ${vetDistrict} will appear here.`
                    : `${vetDistrict} जिले के लिए जैव सुरक्षा निर्देश यहां प्रदर्शित होंगे।`}
                </Text>
              </View>
            ) : (
              biosecurityAdvisories.map((adv) => {
                const advTheme = getAdvisoryCardTheme(adv.severity, isEnglish);
                const advTopic = adv.disease || (isEnglish ? 'Disease Prevention' : 'रोग रोकथाम');
                const rawMsg = typeof adv.message === 'object' ? adv.message.en || adv.message.hi : adv.message;
                const cleanMsg = (rawMsg && rawMsg !== 'undefined' ? rawMsg : adv.messageEn) || (typeof adv.title === 'object' ? adv.title.en : adv.titleEn) || (isEnglish ? 'Immediate containment measures recommended' : 'तत्काल रोकथाम उपाय अनुशंसित');
                const advMsg = String(cleanMsg);
                const advLocation = getAdvisoryLocationText(adv, vetDistrict);

                return (
                  <TouchableOpacity
                    key={adv.id || adv._id}
                    style={styles.compactCard}
                    onPress={() => setSelectedAdvisoryModal(adv)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.compactCardTopRow}>
                      <View
                        style={[
                          styles.compactBadge,
                          { backgroundColor: advTheme.bg, borderColor: advTheme.border },
                        ]}
                      >
                        <View style={[styles.compactBadgeDot, { backgroundColor: advTheme.dot }]} />
                        <Text style={[styles.compactBadgeText, { color: advTheme.text }]}>
                          {advTheme.label}
                        </Text>
                      </View>
                      <Text style={styles.compactTimeText}>
                        {formatRelativeTime(adv.createdAt, isEnglish)}
                      </Text>
                    </View>

                    <Text style={styles.compactAdvisoryTopic}>{advTopic}</Text>
                    <Text style={styles.compactAdvisoryMsg} numberOfLines={2}>
                      {advMsg}
                    </Text>

                    <View style={styles.compactLocationRow}>
                      <Image
                        source={require('../../assets/icons/location.png')}
                        style={styles.compactLocationPin}
                        resizeMode="contain"
                      />
                      <Text style={styles.compactLocationText} numberOfLines={1}>
                        {advLocation}
                      </Text>
                    </View>

                    <View style={styles.compactCardFooter}>
                      <TouchableOpacity
                        style={styles.compactActionBtn}
                        onPress={() => setSelectedAdvisoryModal(adv)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.compactActionBtnText, { color: advTheme.actionColor }]}>
                          {isEnglish ? 'Read Advisory →' : 'परामर्श पढ़ें →'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ======================================================== */}
          {/* 2. CLINICAL SURVEILLANCE & TRIAGE COMMAND CENTER */}
          {/* ======================================================== */}
          <View style={styles.triageCommandCard}>
            {/* Card Header: District Jurisdiction Caseload */}
            <View style={styles.triageCommandHeader}>
              <View style={styles.triageHeaderLeft}>
                <View style={[styles.commandPulseDot, { backgroundColor: hasCriticalCases ? '#EF4444' : '#10B981' }]} />
                <Text style={styles.commandHeaderTitle}>
                  {isEnglish ? 'Clinical Surveillance Matrix' : 'क्लिनिकल निगरानी मैट्रिक्स'}
                </Text>
              </View>
              <View style={[styles.commandStatusPill, hasCriticalCases ? styles.commandStatusPillRed : styles.commandStatusPillGreen]}>
                <Text style={[styles.commandStatusText, hasCriticalCases ? styles.commandStatusTextRed : styles.commandStatusTextGreen]}>
                  {hasCriticalCases
                    ? isEnglish
                      ? `${metrics?.newReferralsCount ?? 0} Pending Triage`
                      : `${metrics?.newReferralsCount ?? 0} ट्रायज लंबित`
                    : isEnglish
                      ? 'Caseload Stable'
                      : 'स्थिति नियंत्रित'}
                </Text>
              </View>
            </View>

            {/* Primary Focus Banner: Two High-Priority Action Tiles */}
            <View style={styles.primaryFocusRow}>
              {/* Action 1: Pending Triage (Amber Alert) */}
              <TouchableOpacity
                style={[
                  styles.primaryFocusTile,
                  { backgroundColor: '#FFFBEB', borderColor: (metrics?.newReferralsCount ?? 0) > 0 ? '#F59E0B' : '#FDE68A' },
                ]}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'New' } })}
                activeOpacity={0.82}
              >
                <View style={styles.focusTileTop}>
                  <View style={[styles.focusIconSquircle, { backgroundColor: '#FEF3C7' }]}>
                    <Image
                      source={require('../../assets/icons/clipboard.png')}
                      style={[styles.focusIcon, { tintColor: '#D97706' }]}
                      resizeMode="contain"
                    />
                  </View>
                  {(metrics?.newReferralsCount ?? 0) > 0 ? (
                    <View style={styles.actionPillBadge}>
                      <Text style={styles.actionPillText}>{isEnglish ? 'ACTION' : 'कार्य'}</Text>
                    </View>
                  ) : (
                    <View style={[styles.actionPillBadge, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.actionPillText, { color: '#64748B' }]}>{isEnglish ? 'CLEAR' : 'शून्य'}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.focusTileNum, { color: '#B45309' }]}>
                  {metrics?.newReferralsCount ?? 0}
                </Text>
                <Text style={styles.focusTileLabel}>
                  {isEnglish ? 'Pending Triage' : 'ट्रायज प्रतीक्षारत'}
                </Text>
                <Text style={styles.focusTileSub}>
                  {isEnglish ? 'Awaiting doctor claim' : 'डॉक्टर क्लेम प्रतीक्षारत'}
                </Text>
              </TouchableOpacity>

              {/* Action 2: My Active Patients (Emerald Care) */}
              <TouchableOpacity
                style={[styles.primaryFocusTile, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                onPress={() => router.push('/(vet)/cases')}
                activeOpacity={0.82}
              >
                <View style={styles.focusTileTop}>
                  <View style={[styles.focusIconSquircle, { backgroundColor: '#D1FAE5' }]}>
                    <Image
                      source={require('../../assets/icons/stethoscope.png')}
                      style={[styles.focusIcon, { tintColor: '#059669' }]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={[styles.actionPillBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.actionPillText, { color: '#047857' }]}>{isEnglish ? 'ASSIGNED' : 'आवंटित'}</Text>
                  </View>
                </View>
                <Text style={[styles.focusTileNum, { color: '#047857' }]}>
                  {metrics?.myCasesCount ?? 0}
                </Text>
                <Text style={styles.focusTileLabel}>
                  {isEnglish ? 'My Patients' : 'मेरे उपचाराधीन'}
                </Text>
                <Text style={styles.focusTileSub}>
                  {isEnglish ? 'Under active care' : 'सक्रिय चिकित्सकीय देखरेख'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Secondary Strip: 4-Stage Disease Lifecycle Telemetry */}
            <View style={styles.lifecycleTelemetryStrip}>
              {/* Stage 1: Investigating */}
              <TouchableOpacity
                style={styles.telemetryCol}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'Investigating' } })}
                activeOpacity={0.75}
              >
                <View style={styles.telemetryHeader}>
                  <View style={[styles.miniDot, { backgroundColor: '#2563EB' }]} />
                  <Text style={styles.telemetryStageName}>{isEnglish ? 'Diag' : 'जांच'}</Text>
                </View>
                <Text style={[styles.telemetryCount, { color: '#1D4ED8' }]}>
                  {metrics?.investigatingCount ?? 0}
                </Text>
                <Text style={styles.telemetryMeta}>{isEnglish ? 'Investigating' : 'निगरानी'}</Text>
              </TouchableOpacity>

              <View style={styles.telemetryDivider} />

              {/* Stage 2: Confirmed */}
              <TouchableOpacity
                style={styles.telemetryCol}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'Confirmed' } })}
                activeOpacity={0.75}
              >
                <View style={styles.telemetryHeader}>
                  <View style={[styles.miniDot, { backgroundColor: '#DC2626' }]} />
                  <Text style={[styles.telemetryStageName, { color: '#DC2626' }]}>{isEnglish ? 'Positive' : 'पुष्ट'}</Text>
                </View>
                <Text style={[styles.telemetryCount, { color: '#B91C1C' }]}>
                  {metrics?.confirmedCount ?? 0}
                </Text>
                <Text style={styles.telemetryMeta}>{isEnglish ? 'Confirmed' : 'संक्रमण'}</Text>
              </TouchableOpacity>

              <View style={styles.telemetryDivider} />

              {/* Stage 3: Containment */}
              <TouchableOpacity
                style={styles.telemetryCol}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'Containment' } })}
                activeOpacity={0.75}
              >
                <View style={styles.telemetryHeader}>
                  <View style={[styles.miniDot, { backgroundColor: '#7C3AED' }]} />
                  <Text style={[styles.telemetryStageName, { color: '#7C3AED' }]}>{isEnglish ? 'Cordon' : 'बफर'}</Text>
                </View>
                <Text style={[styles.telemetryCount, { color: '#6D28D9' }]}>
                  {metrics?.containmentCount ?? 0}
                </Text>
                <Text style={styles.telemetryMeta}>{isEnglish ? 'Containment' : 'घेराबंदी'}</Text>
              </TouchableOpacity>

              <View style={styles.telemetryDivider} />

              {/* Stage 4: Resolved */}
              <TouchableOpacity
                style={styles.telemetryCol}
                onPress={() => router.push({ pathname: '/(vet)/referrals', params: { filter: 'Resolved' } })}
                activeOpacity={0.75}
              >
                <View style={styles.telemetryHeader}>
                  <View style={[styles.miniDot, { backgroundColor: '#059669' }]} />
                  <Text style={[styles.telemetryStageName, { color: '#059669' }]}>{isEnglish ? 'Cured' : 'स्वस्थ'}</Text>
                </View>
                <Text style={[styles.telemetryCount, { color: '#047857' }]}>
                  {metrics?.resolvedCount ?? 0}
                </Text>
                <Text style={styles.telemetryMeta}>{isEnglish ? 'Resolved' : 'ठीक हुए'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ======================================================== */}
          {/* 3. RECENT DISTRICT REFERRALS (CRITICAL CASES PRIORITIZED) */}
          {/* ======================================================== */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeaderRow}>
              <View>
                <View style={styles.liveStreamBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveStreamBadgeText}>
                    {isEnglish ? 'LIVE TRIAGE STREAM' : 'लाइव ट्रायज स्ट्रीम'}
                  </Text>
                </View>
                <Text style={styles.recentSectionTitle}>
                  {isEnglish ? 'Priority Patient Referrals' : 'प्राथमिकता रोगी रेफरल'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(vet)/referrals')}
                style={styles.viewAllBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllBtnText}>
                  {isEnglish ? 'View All' : 'सभी देखें'} ({metrics?.totalRecentCases ?? 0})
                </Text>
                <Image
                  source={require('../../assets/icons/chevron-right.png')}
                  style={styles.viewAllChevron}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {recentCases.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Image
                    source={require('../../assets/icons/checkmark.png')}
                    style={styles.emptyCheckmarkIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {isEnglish ? 'No Active Referral Cases' : 'कोई सक्रिय रेफरल नहीं'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {isEnglish
                    ? `No disease referrals are currently awaiting triage in ${vetDistrict} district.`
                    : `${vetDistrict} जिले में वर्तमान में कोई मामला ट्रायज हेतु लंबित नहीं है।`}
                </Text>
              </View>
            ) : (
              recentCases.map((c) => {
                const targetId = c.id || c._id || c.caseId;
                const statusTheme = getStatusTheme(c.status);
                const riskTheme = getRiskTheme(c.risk);
                const isClaimable = isCaseClaimable(c);
                const isMine = isCaseAssignedToVet(c, user?.id || user?._id);
                const isCritical = getCaseCriticalityPriority(c) <= 1;
                const animalBreed = typeof c.animalId === 'object' ? c.animalId?.breed : (c as any).breed;

                return (
                  <TouchableOpacity
                    key={targetId}
                    style={[
                      styles.caseCard,
                      isCritical && styles.criticalCaseCard,
                    ]}
                    onPress={() => router.push(`/(vet)/referrals/${targetId}` as any)}
                    activeOpacity={0.88}
                  >
                    {/* Critical Warning Pill (if Critical / High Risk) */}
                    {isCritical && (
                      <View style={styles.criticalUrgentBanner}>
                        <View style={styles.criticalPulseDot} />
                        <Text style={styles.criticalUrgentText}>
                          {isEnglish ? 'CRITICAL HIGH-PRIORITY REFERRAL' : 'अति आवश्यक उच्च प्राथमिकता रेफरल'}
                        </Text>
                      </View>
                    )}

                    {/* Top Case Meta Row */}
                    <View style={styles.caseTopRow}>
                      <View style={styles.caseAvatarAndId}>
                        <View style={styles.caseAvatarBox}>
                          <Image
                            source={getSpeciesAvatar(c.species)}
                            style={styles.speciesAvatarImg}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.caseIdCol}>
                          <View style={styles.caseIdBadge}>
                            <Image
                              source={require('../../assets/icons/tag.png')}
                              style={styles.tagIcon}
                              resizeMode="contain"
                            />
                            <Text style={styles.caseIdText}>{c.caseId || 'CASE-REG'}</Text>
                          </View>
                          <Text style={styles.caseTimeText}>{formatCaseTime(c.createdAt || c.updatedAt)}</Text>
                        </View>
                      </View>

                      <View style={styles.badgesRow}>
                        <View
                          style={[
                            styles.riskPill,
                            { backgroundColor: riskTheme.bgColor, borderColor: riskTheme.borderColor },
                          ]}
                        >
                          <Text style={[styles.riskPillText, { color: riskTheme.color }]}>
                            {riskTheme.label}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusPill,
                            { backgroundColor: statusTheme.bgColor, borderColor: statusTheme.borderColor },
                          ]}
                        >
                          <Text style={[styles.statusPillText, { color: statusTheme.color }]}>
                            {statusTheme.label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Clinical Lesion Photo & Disease Info Card Row */}
                    <View style={styles.caseClinicalMainRow}>
                      {/* Lesion Photo Thumbnail */}
                      <View style={styles.lesionPhotoContainer}>
                        <Image
                          source={getClinicalLesionImage(c.disease, c.image)}
                          style={styles.lesionPhotoImg}
                          resizeMode="cover"
                        />
                        <View style={styles.lesionTagOverlay}>
                          <Text style={styles.lesionTagText}>
                            {isEnglish ? 'CLINICAL' : 'घाव'}
                          </Text>
                        </View>
                      </View>

                      {/* Disease Details & Symptoms */}
                      <View style={styles.caseDiseaseDetailsCol}>
                        <Text style={styles.diseaseTitle}>{c.disease}</Text>
                        <Text style={styles.caseSpeciesText}>
                          {c.species || (isEnglish ? 'Livestock' : 'पशु')} {animalBreed ? `• ${animalBreed}` : ''}{' '}
                          {c.animalName ? `(${c.animalName})` : ''}
                        </Text>
                        <View style={styles.caseLocationRow}>
                          <Image
                            source={require('../../assets/icons/location.png')}
                            style={styles.locationPinSmall}
                            resizeMode="contain"
                          />
                          <Text style={styles.caseLocationText} numberOfLines={1}>
                            {c.farmerLocation?.village || (isEnglish ? 'Village' : 'ग्राम')},{' '}
                            {c.farmerLocation?.block || c.districtId || vetDistrict}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Footer: Farmer contact & Claim Action */}
                    <View style={styles.caseFooter}>
                      <View style={styles.farmerContactBox}>
                        <Image
                          source={require('../../assets/icons/person.png')}
                          style={styles.farmerPersonIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.farmerNameText} numberOfLines={1}>
                          {c.farmerContact?.name || (isEnglish ? 'Registered Farmer' : 'पंजीकृत किसान')}
                        </Text>
                      </View>

                      {isClaimable ? (
                        <TouchableOpacity
                          style={styles.claimButton}
                          onPress={() => handleClaimQuick(c)}
                          disabled={claimingId === targetId}
                          activeOpacity={0.82}
                        >
                          {claimingId === targetId ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.claimButtonText}>
                              {isEnglish ? 'Claim Case' : 'केस क्लेम करें'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ) : isMine ? (
                        <View style={styles.myCaseBadge}>
                          <Image
                            source={require('../../assets/icons/stethoscope.png')}
                            style={styles.myCaseBadgeIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.myCaseBadgeText}>
                            {isEnglish ? 'Under Your Care' : 'आपके उपचाराधीन'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.assignedBadge}>
                          <Text style={styles.assignedBadgeText}>
                            {isEnglish ? 'Assigned' : 'आवंटित'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ======================================================== */}
          {/* 4. PRIMARY CLINICAL WORKFLOW SHORTCUTS */}
          {/* ======================================================== */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                {isEnglish ? 'Clinical Operations Hub' : 'क्लिनिकल कार्य केंद्र'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {isEnglish ? 'Diagnostic, laboratory & containment suites' : 'निदान, प्रयोगशाला एवं कंटेनमेंट सेवाएं'}
              </Text>
            </View>
          </View>

          <View style={styles.actionGrid}>
            {/* Action 1: Triage Queue */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(vet)/referrals')}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Image
                  source={require('../../assets/icons/clipboard.png')}
                  style={[styles.actionIconImg, { tintColor: '#0F5132' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.actionTitleRow}>
                  <Text style={styles.actionTitle}>
                    {isEnglish ? 'Triage & Referral Queue' : 'ट्रायज एवं रेफरल कतार'}
                  </Text>
                  {(metrics?.newReferralsCount ?? 0) > 0 && (
                    <View style={styles.actionBadgeAmber}>
                      <Text style={styles.actionBadgeText}>
                        {metrics?.newReferralsCount} {isEnglish ? 'NEW' : 'नए'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionDesc}>
                  {isEnglish
                    ? `Review and claim incoming suspect disease cases reported by farmers across ${vetDistrict}`
                    : `${vetDistrict} के किसानों द्वारा भेजे गए संदिग्ध मामलों की जांच करें और क्लेम करें`}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.actionChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Action 2: My Active Patient Cases */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(vet)/cases')}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Image
                  source={require('../../assets/icons/stethoscope.png')}
                  style={[styles.actionIconImg, { tintColor: '#16A34A' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.actionTitleRow}>
                  <Text style={styles.actionTitle}>
                    {isEnglish ? 'My Active Patient Cases' : 'मेरे सक्रिय मरीज'}
                  </Text>
                  {(metrics?.myCasesCount ?? 0) > 0 && (
                    <View style={styles.actionBadgeGreen}>
                      <Text style={styles.actionBadgeText}>
                        {metrics?.myCasesCount} {isEnglish ? 'ACTIVE' : 'सक्रिय'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionDesc}>
                  {isEnglish
                    ? 'Clinical treatment records, antibiotic prescriptions, follow-up schedules & recovery audits'
                    : 'उपचार रिकॉर्ड, एंटीबायोटिक पर्चे, फॉलो-अप जांच एवं स्वस्थ होने की प्रगति'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.actionChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Action 3: Diagnostic Lab Testing */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(vet)/labs')}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Image
                  source={require('../../assets/icons/icon_microscope.png')}
                  style={[styles.actionIconImg, { tintColor: '#2563EB' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {isEnglish ? 'Diagnostic Lab Tests' : 'प्रयोगशाला जांच व नमूने'}
                </Text>
                <Text style={styles.actionDesc}>
                  {isEnglish
                    ? 'Biological sample chain-of-custody, PCR / ELISA serology requests & lab confirmation'
                    : 'रक्त व ऊतक नमूने, पीसीआर / एलिसा सीरोलॉजी जांच एवं प्रयोगशाला रिपोर्ट'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.actionChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Action 4: Outbreak GIS Surveillance */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(vet)/map')}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0F9FF' }]}>
                <Image
                  source={require('../../assets/icons/location.png')}
                  style={[styles.actionIconImg, { tintColor: '#0284C7' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {isEnglish ? 'Outbreak GIS Surveillance' : 'महामारी जीआईएस मानचित्र'}
                </Text>
                <Text style={styles.actionDesc}>
                  {isEnglish
                    ? 'DBSCAN spatial clusters, live infection heatmaps & 5km biosecurity buffer perimeters'
                    : 'क्लस्टर पहचान, संक्रमण हीटमैप एवं 5 किमी जैविक सुरक्षा बफर घेरा'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.actionChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Action 5: Containment & Ring Vaccination */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(vet)/containment')}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FAF5FF' }]}>
                <Image
                  source={require('../../assets/icons/shield.png')}
                  style={[styles.actionIconImg, { tintColor: '#7C3AED' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {isEnglish ? 'Containment & Ring Drives' : 'रिंग टीकाकरण एवं घेराबंदी'}
                </Text>
                <Text style={styles.actionDesc}>
                  {isEnglish
                    ? 'Quarantine cordons, cold-chain vaccine inventory & emergency vaccination deployments'
                    : 'क्वारंटाइन घेराबंदी, कोल्ड-चेन वैक्सीन भंडार एवं आपातकालीन टीकाकरण अभियान'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.actionChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Action 6: Zoonotic Disease Surveillance (One Health) */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(vet)/zoonotic' as any)}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEF2F2' }]}>
                <Image
                  source={require('../../assets/icons/alert.png')}
                  style={[styles.actionIconImg, { tintColor: '#DC2626' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.actionTitleRow}>
                  <Text style={styles.actionTitle}>
                    {isEnglish ? 'Zoonotic Disease Surveillance' : 'झुनोटिक आजार नियंत्रण (One Health)'}
                  </Text>
                  <View style={[styles.actionBadgeRed, { backgroundColor: '#DC2626' }]}>
                    <Text style={styles.actionBadgeText}>
                      {isEnglish ? 'BIOHAZARD' : 'बायोहॅझार्ड'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.actionDesc}>
                  {isEnglish
                    ? 'Cross-species pathogen tracking for Anthrax, Brucellosis, Rabies & coordinated CMO liaison'
                    : 'अँथ्रॅक्स, ब्रुसेलोसिस, रेबीज नियंत्रण व जिल्हा मुख्य वैद्यकीय अधिकारी समन्वय'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.actionChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Action 6: Clinical Alerts */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(vet)/notifications')}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FFFBEB' }]}>
                <Image
                  source={require('../../assets/icons/bell_minimal_green.png')}
                  style={[styles.actionIconImg, { tintColor: '#D97706' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.actionTitleRow}>
                  <Text style={styles.actionTitle}>
                    {isEnglish ? 'Clinical Alerts & Notifications' : 'क्लिनिकल चेतावनी व सूचनाएं'}
                  </Text>
                  {unreadAlertsCount > 0 && (
                    <View style={styles.actionBadgeRed}>
                      <Text style={styles.actionBadgeText}>
                        {unreadAlertsCount} {isEnglish ? 'UNREAD' : 'अपठित'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionDesc}>
                  {unreadAlertsCount > 0
                    ? isEnglish
                      ? `${unreadAlertsCount} urgent tele-triage alert(s) awaiting clinical review`
                      : `${unreadAlertsCount} आवश्यक अलर्ट क्लिनिकल समीक्षा हेतु लंबित हैं`
                    : isEnglish
                      ? 'High-priority epidemic alerts, cluster detections & containment milestones'
                      : 'महामारी अलर्ट, क्लस्टर सूचनाएं एवं कंटेनमेंट प्रगति सूचनाएं'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.actionChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Action 7: Official Biosecurity Advisories */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(vet)/advisories')}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#E0F2FE' }]}>
                <Image
                  source={require('../../assets/icons/shield.png')}
                  style={[styles.actionIconImg, { tintColor: '#0284C7' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.actionTitleRow}>
                  <Text style={styles.actionTitle}>
                    {isEnglish ? 'Biosecurity Advisories & Bulletins' : 'जैव सुरक्षा बुलेटिन व परामर्श'}
                  </Text>
                  {advisoriesCount > 0 && (
                    <View style={[styles.actionBadgeGreen, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={[styles.actionBadgeText, { color: '#0369A1' }]}>
                        {advisoriesCount} {isEnglish ? 'BULLETINS' : 'बुलेटिन'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionDesc}>
                  {latestAdvisory
                    ? typeof latestAdvisory.title === 'object'
                      ? latestAdvisory.title.en || latestAdvisory.title.hi
                      : latestAdvisory.title
                    : isEnglish
                    ? 'Departmental disease bulletins, quarantine directives & ring vaccination guidance'
                    : 'विभागीय रोग बुलेटिन, क्वारंटाइन निर्देश एवं रिंग टीकाकरण मार्गदर्शन'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/chevron-right.png')}
                style={styles.actionChevron}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Spacer for bottom floating nav dock */}
          <View style={{ height: 110 }} />
        </ScrollView>

        {/* ======================================================== */}
        {/* 5. ENLARGED VETERINARIAN FLOATING BOTTOM NAVIGATION DOCK */}
        {/* ======================================================== */}
        <VetFloatingNav
          activeTab="dashboard"
          unreadAlertsCount={unreadAlertsCount}
          newReferralsCount={metrics?.newReferralsCount}
          myCasesCount={metrics?.myCasesCount}
        />

        {/* ======================================================== */}
        {/* LOGOUT CONFIRMATION MODAL */}
        {/* ======================================================== */}
        <Modal
          visible={showSignOutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSignOutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircle}>
                <Image
                  source={require('../../assets/icons/stethoscope.png')}
                  style={styles.modalStethIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.modalTitle}>
                {isEnglish ? 'End Duty Session?' : 'ड्यूटी सत्र समाप्त करें?'}
              </Text>
              <Text style={styles.modalSub}>
                {isEnglish
                  ? `Are you sure you want to sign out of the ${vetDistrict} Veterinary Clinical Portal?`
                  : `क्या आप ${vetDistrict} पशु चिकित्सा क्लिनिकल पोर्टल से साइन आउट करना चाहते हैं?`}
              </Text>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowSignOutModal(false)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.modalCancelBtnText}>
                    {isEnglish ? 'Cancel' : 'रद्द करें'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleSignOutConfirm}
                  activeOpacity={0.75}
                >
                  <Text style={styles.modalConfirmBtnText}>
                    {isEnglish ? 'Sign Out' : 'लॉगआउट'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ======================================================== */}
        {/* CLINICAL ALERT DETAIL MODAL */}
        {/* ======================================================== */}
        <Modal
          visible={Boolean(selectedAlertModal)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedAlertModal(null)}
        >
          <View style={styles.detailModalOverlay}>
            <View style={styles.detailModalCard}>
              {selectedAlertModal && (() => {
                const sevTheme = getAlertSeverityTheme(selectedAlertModal.severity, isEnglish);
                const categoryLabel = getAlertCategoryLabel(selectedAlertModal, isEnglish);
                const navTarget = resolveVetNotificationNavigation(selectedAlertModal);

                return (
                  <>
                    <View style={styles.detailModalHeader}>
                      <View style={styles.detailModalBadgeRow}>
                        <View style={[styles.compactBadge, { backgroundColor: sevTheme.bg, borderColor: sevTheme.border }]}>
                          <View style={[styles.compactBadgeDot, { backgroundColor: sevTheme.dot }]} />
                          <Text style={[styles.compactBadgeText, { color: sevTheme.text }]}>
                            {sevTheme.label}
                          </Text>
                        </View>
                        <View style={styles.detailCategoryPill}>
                          <Text style={styles.detailCategoryText}>{categoryLabel}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedAlertModal(null)}
                        style={styles.detailCloseBtn}
                        accessibilityLabel="Close"
                      >
                        <Text style={styles.detailCloseText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.detailModalScroll} showsVerticalScrollIndicator={false}>
                      <Text style={styles.detailModalTitle}>{selectedAlertModal.title}</Text>
                      <Text style={styles.detailModalTime}>
                        {formatRelativeTime(selectedAlertModal.createdAt, isEnglish)} • {new Date(selectedAlertModal.createdAt).toLocaleDateString(isEnglish ? 'en-IN' : 'hi-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>

                      <View style={styles.detailMetaTagsRow}>
                        {(selectedAlertModal.caseNumber || selectedAlertModal.caseId) && (
                          <View style={styles.detailMetaPill}>
                            <Image source={require('../../assets/icons/tag.png')} style={styles.detailMetaIcon} resizeMode="contain" />
                            <Text style={styles.detailMetaText}>#{selectedAlertModal.caseNumber || selectedAlertModal.caseId}</Text>
                          </View>
                        )}
                        <View style={styles.detailMetaPill}>
                          <Image source={require('../../assets/icons/location.png')} style={styles.detailMetaIcon} resizeMode="contain" />
                          <Text style={styles.detailMetaText}>
                            {getAlertLocationText(selectedAlertModal, vetDistrict)}
                          </Text>
                        </View>
                        {selectedAlertModal.metadata?.disease && (
                          <View style={styles.detailMetaPill}>
                            <Image source={require('../../assets/icons/stethoscope.png')} style={styles.detailMetaIcon} resizeMode="contain" />
                            <Text style={styles.detailMetaText}>{selectedAlertModal.metadata.disease}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.detailMessageBox}>
                        <Text style={styles.detailMessageLabel}>
                          {isEnglish ? 'Surveillance Alert Message:' : 'अलर्ट संदेश विवरण:'}
                        </Text>
                        <Text style={styles.detailMessageText}>{selectedAlertModal.message}</Text>
                      </View>

                      {(selectedAlertModal.metadata?.farmerName || selectedAlertModal.metadata?.animalSpecies || selectedAlertModal.metadata?.radiusKm) && (
                        <View style={styles.detailContextBox}>
                          {selectedAlertModal.metadata?.farmerName && (
                            <View style={styles.detailContextRow}>
                              <Text style={styles.detailContextKey}>{isEnglish ? 'Farmer:' : 'किसान:'}</Text>
                              <Text style={styles.detailContextVal}>
                                {selectedAlertModal.metadata.farmerName} {selectedAlertModal.metadata?.farmerPhone ? `(${selectedAlertModal.metadata.farmerPhone})` : ''}
                              </Text>
                            </View>
                          )}
                          {selectedAlertModal.metadata?.animalSpecies && (
                            <View style={styles.detailContextRow}>
                              <Text style={styles.detailContextKey}>{isEnglish ? 'Species:' : 'प्रजाति:'}</Text>
                              <Text style={styles.detailContextVal}>{selectedAlertModal.metadata.animalSpecies}</Text>
                            </View>
                          )}
                          {selectedAlertModal.metadata?.radiusKm && (
                            <View style={styles.detailContextRow}>
                              <Text style={styles.detailContextKey}>{isEnglish ? 'Buffer:' : 'परिधि:'}</Text>
                              <Text style={styles.detailContextVal}>{selectedAlertModal.metadata.radiusKm} km cordon</Text>
                            </View>
                          )}
                        </View>
                      )}

                      <View style={styles.detailActionsCol}>
                        {navTarget.type !== 'none' && (
                          <TouchableOpacity
                            style={styles.detailActionPrimaryBtn}
                            onPress={() => {
                              const target = navTarget;
                              setSelectedAlertModal(null);
                              router.push(target.route as any);
                            }}
                            activeOpacity={0.82}
                          >
                            <Text style={styles.detailActionPrimaryText}>
                              {navTarget.type === 'referral'
                                ? (isEnglish ? 'Open Referral Case Dossier →' : 'रेफरल केस देखें →')
                                : navTarget.type === 'map'
                                ? (isEnglish ? 'Locate on Outbreak GIS Radar →' : 'जीआईएस रडार पर देखें →')
                                : navTarget.type === 'containment'
                                ? (isEnglish ? 'Inspect Containment Perimeter →' : 'कंटेनमेंट घेरा देखें →')
                                : navTarget.type === 'advisory'
                                ? (isEnglish ? 'Open Biosecurity Advisories →' : 'जैव सुरक्षा परामर्श देखें →')
                                : navTarget.type === 'labs'
                                ? (isEnglish ? 'Open Diagnostic Lab Testing →' : 'लैब जांच देखें →')
                                : (isEnglish ? 'Open Case Records →' : 'केस रिकॉर्ड देखें →')}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.detailActionSecondaryBtn}
                          onPress={() => {
                            setSelectedAlertModal(null);
                            router.push('/(vet)/notifications');
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.detailActionSecondaryText}>
                            {isEnglish ? 'View All Alerts in Feed' : 'सभी अलर्ट्स देखें'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* ======================================================== */}
        {/* BIOSECURITY ADVISORY DETAIL MODAL */}
        {/* ======================================================== */}
        <Modal
          visible={Boolean(selectedAdvisoryModal)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedAdvisoryModal(null)}
        >
          <View style={styles.detailModalOverlay}>
            <View style={styles.detailModalCard}>
              {selectedAdvisoryModal && (() => {
                const advTheme = getAdvisoryCardTheme(selectedAdvisoryModal.severity, isEnglish);
                const rawTitle = typeof selectedAdvisoryModal.title === 'object' ? selectedAdvisoryModal.title.en || selectedAdvisoryModal.title.hi : selectedAdvisoryModal.title;
                const rawMsg = typeof selectedAdvisoryModal.message === 'object' ? selectedAdvisoryModal.message.en || selectedAdvisoryModal.message.hi : selectedAdvisoryModal.message;
                const locationText = getAdvisoryLocationText(selectedAdvisoryModal, vetDistrict);

                return (
                  <>
                    <View style={styles.detailModalHeader}>
                      <View style={styles.detailModalBadgeRow}>
                        <View style={[styles.compactBadge, { backgroundColor: advTheme.bg, borderColor: advTheme.border }]}>
                          <View style={[styles.compactBadgeDot, { backgroundColor: advTheme.dot }]} />
                          <Text style={[styles.compactBadgeText, { color: advTheme.text }]}>
                            {advTheme.label}
                          </Text>
                        </View>
                        <View style={[styles.detailCategoryPill, { backgroundColor: '#F0FDF4' }]}>
                          <Text style={[styles.detailCategoryText, { color: '#166534' }]}>
                            {selectedAdvisoryModal.disease || (isEnglish ? 'Livestock Protocol' : 'पशु प्रोटोकॉल')}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedAdvisoryModal(null)}
                        style={styles.detailCloseBtn}
                        accessibilityLabel="Close"
                      >
                        <Text style={styles.detailCloseText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.detailModalScroll} showsVerticalScrollIndicator={false}>
                      <Text style={styles.detailModalTitle}>{rawTitle}</Text>
                      <Text style={styles.detailModalTime}>
                        {formatRelativeTime(selectedAdvisoryModal.createdAt, isEnglish)} • {new Date(selectedAdvisoryModal.createdAt).toLocaleDateString(isEnglish ? 'en-IN' : 'hi-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>

                      <View style={styles.detailMetaTagsRow}>
                        <View style={styles.detailMetaPill}>
                          <Image source={require('../../assets/icons/location.png')} style={styles.detailMetaIcon} resizeMode="contain" />
                          <Text style={styles.detailMetaText}>{locationText}</Text>
                        </View>
                        <View style={styles.detailMetaPill}>
                          <Image source={require('../../assets/icons/shield.png')} style={styles.detailMetaIcon} resizeMode="contain" />
                          <Text style={styles.detailMetaText}>{selectedAdvisoryModal.issuedBy || 'Dept of Animal Husbandry'}</Text>
                        </View>
                      </View>

                      <View style={[styles.detailMessageBox, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                        <Text style={[styles.detailMessageLabel, { color: '#0369A1' }]}>
                          {isEnglish ? 'Departmental Directive & Guidelines:' : 'विभागीय निर्देश व दिशा-निर्देश:'}
                        </Text>
                        <Text style={[styles.detailMessageText, { color: '#0C4A6E' }]}>{rawMsg}</Text>
                      </View>

                      <View style={styles.detailActionsCol}>
                        <TouchableOpacity
                          style={[styles.detailActionPrimaryBtn, { backgroundColor: '#0284C7' }]}
                          onPress={() => {
                            setSelectedAdvisoryModal(null);
                            router.push('/(vet)/advisories');
                          }}
                          activeOpacity={0.82}
                        >
                          <Text style={styles.detailActionPrimaryText}>
                            {isEnglish ? 'Open Biosecurity Advisories Feed →' : 'जैव सुरक्षा बुलेटिन देखें →'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.detailActionSecondaryBtn}
                          onPress={() => {
                            setSelectedAdvisoryModal(null);
                            router.push('/(vet)/containment');
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.detailActionSecondaryText}>
                            {isEnglish ? 'Containment & Ring Vaccination' : 'कंटेनमेंट व रिंग टीकाकरण'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// ==========================================================
// LUXURY CLINICAL BIOPHILIC STYLESHEET
// ==========================================================
const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#0B3D26', // Deep forest top bar anchor
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },

  /* Top Clinical Header Bar */
  topBar: {
    backgroundColor: '#0F5132',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  doctorProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 2.5,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  doctorAvatarIcon: {
    width: 28,
    height: 28,
    tintColor: '#FFFFFF',
  },
  onlinePulseDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#0F5132',
  },
  doctorInfoCol: {
    flex: 1,
  },
  cadreBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  cadrePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cadrePillText: {
    color: '#A7F3D0',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.4,
  },
  liveDutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDutyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34D399',
  },
  liveDutyText: {
    color: '#D1FAE5',
    fontSize: 9,
    fontFamily: FONT_BOLD,
  },
  doctorNameText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  regBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  regBadgeText: {
    color: '#E2E8F0',
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
  },
  jurisdictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  jurisdictionPin: {
    width: 12,
    height: 12,
    tintColor: '#A7F3D0',
  },
  jurisdictionText: {
    color: '#A7F3D0',
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
  },
  topActionsCol: {
    alignItems: 'center',
    gap: 8,
  },
  alertBellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIconImg: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#0F5132',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  signOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  signOutBtnText: {
    color: '#FECACA',
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
  },

  /* Scrollable Body */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },

  /* Cache & Error Notices */
  cacheNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  cacheNoticeIcon: {
    width: 16,
    height: 16,
    tintColor: '#D97706',
  },
  cacheNoticeText: {
    color: '#92400E',
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    flex: 1,
  },
  centerLoading: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#0F5132',
    fontSize: 13,
    fontFamily: FONT_BOLD,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errorIcon: {
    width: 18,
    height: 18,
    tintColor: '#DC2626',
  },
  errorTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontFamily: FONT_BOLD,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    lineHeight: 17,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  retryBtnIcon: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_BOLD,
  },

  /* ======================================================== */
  /* 1. AGROMETEOROLOGICAL WEATHER & ICAR-NADRES CARD */
  /* ======================================================== */
  nadresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  weatherStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  weatherItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherValue: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  weatherLabel: {
    fontSize: 9.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginTop: 2,
  },
  weatherDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  vectorStressPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vectorStressText: {
    color: '#B45309',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
  },
  nadresBody: {
    padding: 12,
  },
  nadresHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nadresBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nadresShieldIcon: {
    width: 14,
    height: 14,
    tintColor: '#0F5132',
  },
  nadresBadgeText: {
    color: '#0F5132',
    fontSize: 10,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.5,
  },
  nadresRiskPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  nadresRiskPillText: {
    color: '#DC2626',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
  },
  nadresDiseaseTitle: {
    fontSize: 14.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  nadresDescText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#475569',
    lineHeight: 16,
  },

  /* ======================================================== */
  /* 2. COMPACT CLINICAL SURVEILLANCE OVERVIEW (3x2 MATRIX) */
  /* ======================================================== */
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  districtPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  districtPillAlert: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  districtPillText: {
    color: '#065F46',
    fontSize: 10,
    fontFamily: FONT_BOLD,
  },
  districtPillTextAlert: {
    color: '#DC2626',
  },

  /* ======================================================== */
  /* 2. CLINICAL SURVEILLANCE & TRIAGE COMMAND CENTER */
  /* ======================================================== */
  triageCommandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  triageCommandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  triageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commandPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  commandHeaderTitle: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  commandStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  commandStatusPillRed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  commandStatusPillGreen: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  commandStatusText: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
  },
  commandStatusTextRed: {
    color: '#DC2626',
  },
  commandStatusTextGreen: {
    color: '#065F46',
  },
  primaryFocusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 11,
  },
  primaryFocusTile: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
  },
  focusTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  focusIconSquircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusIcon: {
    width: 17,
    height: 17,
  },
  actionPillBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  focusTileNum: {
    fontSize: 27,
    fontFamily: FONT_EXTRABOLD,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  focusTileLabel: {
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  focusTileSub: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  lifecycleTelemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  telemetryCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  telemetryStageName: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: '#64748B',
  },
  telemetryCount: {
    fontSize: 17,
    fontFamily: FONT_EXTRABOLD,
    fontWeight: '800',
  },
  telemetryMeta: {
    fontSize: 9,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
    marginTop: 1,
  },
  telemetryDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E2E8F0',
  },

  /* ======================================================== */
  /* 3. RECENT DISTRICT REFERRALS (CRITICAL PRIORITIZED) */
  /* ======================================================== */
  recentSection: {
    marginTop: 4,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  liveStreamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveStreamBadgeText: {
    color: '#065F46',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.3,
  },
  recentSectionTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    color: '#0F5132',
  },
  viewAllChevron: {
    width: 12,
    height: 12,
    tintColor: '#0F5132',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyCheckmarkIcon: {
    width: 24,
    height: 24,
    tintColor: '#16A34A',
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },

  /* Case Card */
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  criticalCaseCard: {
    borderLeftWidth: 4.5,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    borderColor: '#FECACA',
  },
  criticalUrgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  criticalPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  criticalUrgentText: {
    color: '#991B1B',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.4,
  },
  caseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  caseAvatarAndId: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caseAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  speciesAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  caseIdCol: {
    gap: 2,
  },
  caseIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagIcon: {
    width: 10,
    height: 10,
    tintColor: '#475569',
  },
  caseIdText: {
    color: '#1E293B',
    fontSize: 11,
    fontFamily: FONT_BOLD,
  },
  caseTimeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: FONT_REGULAR,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  riskPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
  },

  /* Lesion Image & Details Row */
  caseClinicalMainRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  lesionPhotoContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lesionPhotoImg: {
    width: '100%',
    height: '100%',
  },
  lesionTagOverlay: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
  lesionTagText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: FONT_BOLD,
  },
  caseDiseaseDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  diseaseTitle: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  caseSpeciesText: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    color: '#334155',
    marginBottom: 4,
  },
  caseLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationPinSmall: {
    width: 11,
    height: 11,
    tintColor: '#64748B',
  },
  caseLocationText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    flex: 1,
  },

  /* Footer: Farmer Contact & Claim Button */
  caseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  farmerContactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    marginRight: 8,
  },
  farmerPersonIcon: {
    width: 13,
    height: 13,
    tintColor: '#64748B',
  },
  farmerNameText: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    color: '#334155',
  },
  claimButton: {
    backgroundColor: '#0F5132',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_BOLD,
  },
  myCaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  myCaseBadgeIcon: {
    width: 12,
    height: 12,
    tintColor: '#059669',
  },
  myCaseBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontFamily: FONT_BOLD,
  },
  assignedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  assignedBadgeText: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
  },

  /* ======================================================== */
  /* 4. PRIMARY CLINICAL WORKFLOW SHORTCUTS */
  /* ======================================================== */
  sectionHeaderRow: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 2,
  },
  actionGrid: {
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconImg: {
    width: 22,
    height: 22,
  },
  actionContent: {
    flex: 1,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionDesc: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    lineHeight: 16,
  },
  actionBadgeAmber: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  actionBadgeGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  actionBadgeRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  actionBadgeText: {
    fontSize: 9,
    fontFamily: FONT_BOLD,
    color: '#0F172A',
  },
  actionChevron: {
    width: 14,
    height: 14,
    tintColor: '#94A3B8',
    marginLeft: 6,
  },

  /* ======================================================== */
  /* 5. ENLARGED FLOATING BOTTOM NAVIGATION DOCK */
  /* ======================================================== */
  floatingNavContainer: {
    position: 'absolute',
    bottom: 14,
    left: 10,
    right: 10,
    zIndex: 90,
  },
  bottomNavDock: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  navTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActiveIndicator: {
    width: 44,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navInactiveIconBox: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navIconImage: {
    width: 24,
    height: 24,
  },
  navTabLabelActive: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
    marginTop: 2,
  },
  navTabLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: '#475569',
    marginTop: 2,
  },
  navCenterScanItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    marginHorizontal: 4,
  },
  navCenterScanCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navCenterScanIcon: {
    width: 26,
    height: 26,
    tintColor: '#FFFFFF',
  },
  navCenterScanLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: '#0F5132',
    marginTop: 3,
  },
  navBadgeAmber: {
    position: 'absolute',
    top: -2,
    right: 3,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 4.5,
    paddingVertical: 0.5,
  },
  navBadgeEmerald: {
    position: 'absolute',
    top: -2,
    right: 3,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 4.5,
    paddingVertical: 0.5,
  },
  navBadgeRed: {
    position: 'absolute',
    top: -2,
    right: 3,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4.5,
    paddingVertical: 0.5,
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },

  /* Sign Out Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalStethIcon: {
    width: 26,
    height: 26,
    tintColor: '#DC2626',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontFamily: FONT_BOLD,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_BOLD,
  },
  dualAlertAdvStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  dualAlertAdvCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dualAlertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dualAlertIcon: {
    width: 18,
    height: 18,
    tintColor: '#059669',
  },
  dualBadgeRed: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  dualBadgeText: {
    fontSize: 8.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dualAlertTextCol: {
    flex: 1,
  },
  dualAlertTitle: {
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  dualAlertSub: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  dualChevron: {
    width: 12,
    height: 12,
    tintColor: '#94A3B8',
  },
  dualDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },

  /* Prominent Clinical Alerts & Advisories Sections */
  prominentSection: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  prominentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  prominentTitleCol: {
    flex: 1,
  },
  sectionPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  sectionPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  sectionPillText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  prominentSectionTitle: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  viewAllPillText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
    marginRight: 2,
  },
  viewAllChevronSmall: {
    width: 10,
    height: 10,
    tintColor: '#0F5132',
  },

  /* Compact Professional Alert/Advisory Cards */
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  compactCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  compactBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  compactBadgeText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  compactTimeText: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
  },
  compactAlertCategory: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  compactAlertDisease: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    color: '#334155',
    marginBottom: 6,
  },
  compactAdvisoryTopic: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  compactAdvisoryMsg: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 6,
  },
  compactLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactLocationPin: {
    width: 11,
    height: 11,
    tintColor: '#64748B',
    marginRight: 4,
  },
  compactLocationText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
  },
  compactCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 7,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  compactActionBtn: {
    paddingVertical: 2,
  },
  compactActionBtnText: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* Empty State */
  compactEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  compactEmptyIcon: {
    width: 24,
    height: 24,
    tintColor: '#10B981',
    marginBottom: 6,
  },
  compactEmptyTitle: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  compactEmptySub: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
  },

  /* Interactive Detail Modals */
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  detailModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailModalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailCategoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailCategoryText: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#475569',
  },
  detailCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseText: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    color: '#64748B',
  },
  detailModalScroll: {
    maxHeight: 460,
  },
  detailModalTitle: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  detailModalTime: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
    marginBottom: 12,
  },
  detailMetaTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  detailMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailMetaIcon: {
    width: 10,
    height: 10,
    tintColor: '#64748B',
    marginRight: 4,
  },
  detailMetaText: {
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
    color: '#475569',
  },
  detailMessageBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailMessageLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  detailMessageText: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  detailContextBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  detailContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailContextKey: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
  },
  detailContextVal: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailActionsCol: {
    gap: 8,
    marginTop: 6,
  },
  detailActionPrimaryBtn: {
    backgroundColor: '#0F5132',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailActionPrimaryText: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailActionSecondaryBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailActionSecondaryText: {
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#334155',
  },
});
