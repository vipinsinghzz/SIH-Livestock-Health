/**
 * PashuCare - Veterinarian: Official Biosecurity Advisories & Dynamic Epidemiological Directives
 * File: mobile/app/(vet)/advisories/index.tsx
 *
 * Clinical Biosecurity Advisory & Epidemiological Surveillance Command:
 * - Edge-to-edge custom luxury executive forest top bar (#062A1A)
 * - Cadre badge: "VETERINARY BIOSECURITY ADVISORY • DISTRICT SURVEILLANCE"
 * - Dynamic AI Epidemiological Directives (GET /api/cases/advisories)
 *   * Active Cases, Affected Animals, Containment Perimeters
 *   * Clinical protocol recommendations with urgency ratings
 * - Official Biosecurity Bulletins Feed (GET /api/advisories)
 *   * Severity filter chips (ALL, CRITICAL, HIGH, MODERATE, LOW)
 *   * Detailed clinical guidance & quarantine directives
 * - Rich Interactive Advisory Detail Modal with deep workflow links
 * - Full offline SQLite cache support with sync indicators
 * - 100% platform-safe typography stack, zero raw text emojis
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import { advisoryService } from '../../../src/services/advisoryService';
import {
  OfficialAdvisory,
  AdvisorySeverity,
  getAdvisorySeverityTheme,
  DynamicEpidemiologicalAdvisory,
} from '../../../src/types/advisory';
import { OfflineNotice } from '../../../src/components/OfflineNotice';
import { VetFloatingNav } from '../../../src/components/VetFloatingNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Native typography stack
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

// Static assets
const ICON_ALERT = require('../../../assets/icons/alert.png');
const ICON_BELL = require('../../../assets/icons/bell_minimal_green.png');
const ICON_SHIELD = require('../../../assets/icons/shield.png');
const ICON_SYRINGE = require('../../../assets/icons/icon_syringe.png');
const ICON_CLIPBOARD = require('../../../assets/icons/clipboard.png');
const ICON_CHECKMARK = require('../../../assets/icons/checkmark.png');
const ICON_STETHOSCOPE = require('../../../assets/icons/stethoscope.png');
const ICON_PIN = require('../../../assets/icons/icon_pin.png');
const ICON_TAG = require('../../../assets/icons/tag.png');
const ICON_CHEVRON = require('../../../assets/icons/chevron-right.png');
const ICON_REFRESH = require('../../../assets/icons/refresh.png');
const ICON_ARROW_BACK = require('../../../assets/icons/arrow-back.png');

type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export default function VetAdvisoriesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, isEnglish } = useAppLanguage();

  const district = user?.district || 'Nagpur';

  // State
  const [advisories, setAdvisories] = useState<OfficialAdvisory[]>([]);
  const [dynamicAdvisory, setDynamicAdvisory] = useState<DynamicEpidemiologicalAdvisory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>('ALL');

  // Modal State
  const [selectedAdvisory, setSelectedAdvisory] = useState<OfficialAdvisory | null>(null);

  const loadData = useCallback(
    async (isPullRefresh = false) => {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const severityParam = activeFilter !== 'ALL' ? activeFilter : undefined;
        const [advisoriesRes, dynamicRes] = await Promise.allSettled([
          advisoryService.getAdvisories({
            district,
            severity: severityParam,
          }),
          advisoryService.getDynamicEpidemiologicalAdvisory(district),
        ]);

        if (advisoriesRes.status === 'fulfilled') {
          setAdvisories(advisoriesRes.value.advisories);
          setIsFromCache(advisoriesRes.value.fromCache);
          setLastUpdated(advisoriesRes.value.lastUpdated);
        } else {
          setErrorMessage('Unable to retrieve official bulletins.');
        }

        if (dynamicRes.status === 'fulfilled' && dynamicRes.value) {
          setDynamicAdvisory(dynamicRes.value);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to retrieve advisories.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [district, activeFilter]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered advisories
  const displayedAdvisories = useMemo(() => {
    if (activeFilter === 'ALL') return advisories;
    return advisories.filter(
      (a) => String(a.severity).toUpperCase() === activeFilter
    );
  }, [advisories, activeFilter]);

  // Severity counts
  const filterCounts = useMemo(() => {
    return {
      ALL: advisories.length,
      CRITICAL: advisories.filter((a) => String(a.severity).toUpperCase() === 'CRITICAL').length,
      HIGH: advisories.filter((a) => String(a.severity).toUpperCase() === 'HIGH').length,
      MODERATE: advisories.filter((a) => String(a.severity).toUpperCase() === 'MODERATE').length,
      LOW: advisories.filter((a) => String(a.severity).toUpperCase() === 'LOW').length,
    };
  }, [advisories]);

  const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return isEnglish ? 'Date unavailable' : 'दिनांक अनुपलब्ध';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isEnglish ? 'en-IN' : 'hi-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <View style={styles.screenWrapper}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#062A1A" />

      {/* ======================================================== */}
      {/* 1. TOP APP BAR */}
      {/* ======================================================== */}
      <View style={styles.customTopBar}>
        <View style={styles.cadreRow}>
          <View style={styles.livePulseDot} />
          <Text style={styles.cadreText}>
            {isEnglish
              ? 'VETERINARY BIOSECURITY ADVISORY • DISTRICT SURVEILLANCE'
              : 'पशु जैव सुरक्षा परामर्श • जिला निगरानी कमान'}
          </Text>
        </View>

        <View style={styles.topBarMainRow}>
          <TouchableOpacity
            style={styles.topBackCircle}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Image source={ICON_ARROW_BACK} style={styles.topBackIcon} resizeMode="contain" />
          </TouchableOpacity>

          <View style={styles.topTitleCol}>
            <Text style={styles.topBarTitle}>
              {isEnglish ? 'Biosecurity Advisories' : 'जैव सुरक्षा परामर्श'}
            </Text>
            <Text style={styles.topBarSub}>
              {district} {isEnglish ? 'District Epidemiological Desk' : 'ज़िला पशु रोग नियंत्रण'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshCircleBtn}
            onPress={() => loadData(true)}
            activeOpacity={0.75}
            disabled={refreshing}
          >
            <Image source={ICON_REFRESH} style={styles.refreshIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Severity Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as SeverityFilter[]).map((tab) => {
            const isActive = activeFilter === tab;
            const count = filterCounts[tab] || 0;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab === 'ALL' ? (isEnglish ? 'ALL' : 'सभी') : tab}
                </Text>
                <View style={[styles.filterChipBadge, isActive && styles.filterChipBadgeActive]}>
                  <Text style={[styles.filterChipBadgeText, isActive && styles.filterChipBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <OfflineNotice />

      {isFromCache && (
        <View style={styles.cachedNoticeBanner}>
          <Image source={ICON_ALERT} style={styles.cachedNoticeIcon} resizeMode="contain" />
          <Text style={styles.cachedNoticeText}>
            {isEnglish
              ? `Displaying cached biosecurity advisories • Last synced: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'offline'}`
              : `कैश किए गए परामर्श दिखाए जा रहे हैं • अंतिम सिंक: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'ऑफलाइन'}`}
          </Text>
        </View>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN SCROLLABLE CONTENT */}
      {/* ======================================================== */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#0F5132']}
            tintColor="#0F5132"
          />
        }
      >
        {/* Loading Indicator */}
        {loading && !refreshing && (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#0F5132" />
            <Text style={styles.loadingText}>
              {isEnglish ? 'Fetching official biosecurity bulletins...' : 'जैव सुरक्षा परामर्श लोड हो रहे हैं...'}
            </Text>
          </View>
        )}

        {/* Error State */}
        {errorMessage && !loading && (
          <View style={styles.errorBox}>
            <Image source={ICON_ALERT} style={styles.errorIcon} resizeMode="contain" />
            <Text style={styles.errorTitle}>
              {isEnglish ? 'Notice' : 'सूचना'}
            </Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadData()} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>{isEnglish ? 'Retry' : 'पुनः प्रयास करें'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* DYNAMIC AI EPIDEMIOLOGICAL ADVISORY CARD */}
        {/* ======================================================== */}
        {dynamicAdvisory && (
          <View style={styles.dynamicCard}>
            <View style={styles.dynamicCardHeader}>
              <View style={styles.dynamicTitleRow}>
                <Image source={ICON_SHIELD} style={styles.dynamicShieldIcon} resizeMode="contain" />
                <Text style={styles.dynamicCardTitle}>
                  {isEnglish ? 'Epidemiological Forewarning & Directives' : 'महामारी पूर्व चेतावनी व निर्देश'}
                </Text>
              </View>
              <View style={styles.aiPill}>
                <Text style={styles.aiPillText}>ICAR • AI</Text>
              </View>
            </View>

            {/* Quick Metrics Telemetry Row */}
            <View style={styles.dynamicMetricsRow}>
              <View style={styles.dynamicMetricItem}>
                <Text style={styles.dynamicMetricVal}>
                  {dynamicAdvisory.summary?.activeCasesCount ?? 0}
                </Text>
                <Text style={styles.dynamicMetricLabel}>
                  {isEnglish ? 'Active Cases' : 'सक्रिय केस'}
                </Text>
              </View>
              <View style={styles.dynamicDivider} />
              <View style={styles.dynamicMetricItem}>
                <Text style={[styles.dynamicMetricVal, { color: '#B45309' }]}>
                  {dynamicAdvisory.summary?.affectedAnimalsCount ?? 0}
                </Text>
                <Text style={styles.dynamicMetricLabel}>
                  {isEnglish ? 'Animals Affected' : 'प्रभावित पशु'}
                </Text>
              </View>
              <View style={styles.dynamicDivider} />
              <View style={styles.dynamicMetricItem}>
                <Text style={[styles.dynamicMetricVal, { color: '#7C3AED' }]}>
                  {dynamicAdvisory.summary?.activeZonesCount ?? 0}
                </Text>
                <Text style={styles.dynamicMetricLabel}>
                  {isEnglish ? 'Containment Zones' : 'कंटेनमेंट ज़ोन'}
                </Text>
              </View>
            </View>

            {/* Top Diseases */}
            {((dynamicAdvisory.topDiseases || dynamicAdvisory.summary?.topDiseases) ?? []).length > 0 && (
              <View style={styles.topDiseasesSection}>
                <Text style={styles.sectionMiniHeader}>
                  {isEnglish ? 'Dominant Pathogens in Jurisdiction:' : 'क्षेत्र में सक्रिय रोग:'}
                </Text>
                <View style={styles.diseaseTagsWrap}>
                  {((dynamicAdvisory.topDiseases || dynamicAdvisory.summary?.topDiseases) ?? []).map((d, idx) => (
                    <View key={idx} style={styles.diseaseTagPill}>
                      <Text style={styles.diseaseTagName}>{d.name}</Text>
                      <View style={styles.diseaseTagCountBadge}>
                        <Text style={styles.diseaseTagCountText}>{d.caseCount ?? d.count ?? 1}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recommendations Directives */}
            {dynamicAdvisory.recommendations && dynamicAdvisory.recommendations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={styles.sectionMiniHeader}>
                  {isEnglish ? 'Surveillance Directives & Action Protocols:' : 'निगरानी निर्देश व कार्य प्रोटोकॉल:'}
                </Text>
                {dynamicAdvisory.recommendations.slice(0, 3).map((rec, rIdx) => {
                  const priorityStr = (rec.priority || rec.urgency || 'HIGH').toUpperCase();
                  const isHigh = priorityStr === 'HIGH' || priorityStr === 'CRITICAL';
                  const actionStr = rec.protocol || rec.action || (rec.actions && rec.actions[0]) || '';
                  const rationaleStr = rec.rationale || (rec.actions && rec.actions.length > 1 ? rec.actions.slice(1).join(' • ') : '');

                  return (
                    <View key={rIdx} style={styles.recItemBox}>
                      <View style={styles.recItemTop}>
                        <View style={[styles.urgencyDot, { backgroundColor: isHigh ? '#EF4444' : '#F59E0B' }]} />
                        <Text style={styles.recDiseaseTitle}>{rec.disease}</Text>
                        <View style={[styles.urgencyPill, { backgroundColor: isHigh ? '#FEE2E2' : '#FEF3C7' }]}>
                          <Text style={[styles.urgencyPillText, { color: isHigh ? '#991B1B' : '#92400E' }]}>
                            {priorityStr}
                          </Text>
                        </View>
                      </View>
                      {actionStr ? <Text style={styles.recActionText}>{actionStr}</Text> : null}
                      {rationaleStr ? <Text style={styles.recRationaleText}>{rationaleStr}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* OFFICIAL BIOSECURITY BULLETINS SECTION */}
        {/* ======================================================== */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              {isEnglish ? 'Official Biosecurity Bulletins' : 'आधिकारिक जैव सुरक्षा बुलेटिन'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isEnglish
                ? `Authoritative departmental directives for ${district}`
                : `${district} जिले हेतु पशुपालन विभाग द्वारा जारी निर्देश`}
            </Text>
          </View>
        </View>

        {displayedAdvisories.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Image source={ICON_CHECKMARK} style={styles.emptyCheckmarkIcon} resizeMode="contain" />
            </View>
            <Text style={styles.emptyTitle}>
              {isEnglish ? 'No Active Advisories' : 'कोई सक्रिय परामर्श नहीं'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'ALL'
                ? isEnglish
                  ? `No biosecurity advisories currently issued for ${district} district.`
                  : `${district} जिले के लिए वर्तमान में कोई जैव सुरक्षा परामर्श जारी नहीं है।`
                : isEnglish
                ? `No ${activeFilter.toLowerCase()} severity advisories recorded.`
                : `${activeFilter.toLowerCase()} स्तर का कोई परामर्श नहीं है।`}
            </Text>
          </View>
        ) : (
          displayedAdvisories.map((adv) => {
            const advId = String(adv.id || adv._id || '');
            const theme = getAdvisorySeverityTheme(adv.severity);
            const rawTitle = typeof adv.title === 'object' ? adv.title.en || adv.title.hi : adv.title;
            const title = (rawTitle && rawTitle !== 'undefined' ? rawTitle : adv.titleEn) || 'Official Biosecurity Advisory';
            const rawMsg = typeof adv.message === 'object' ? adv.message.en || adv.message.hi : adv.message;
            const message = (rawMsg && rawMsg !== 'undefined' ? rawMsg : adv.messageEn) || '';

            return (
              <TouchableOpacity
                key={advId}
                style={styles.card}
                onPress={() => setSelectedAdvisory(adv)}
                activeOpacity={0.88}
              >
                {/* Left Severity Indicator Rail */}
                <View style={[styles.severityRail, { backgroundColor: theme.color }]} />

                <View style={styles.cardInnerContent}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: theme.bgColor, borderColor: theme.borderColor },
                        ]}
                      >
                        <Text style={[styles.severityBadgeText, { color: theme.color }]}>
                          {theme.label}
                        </Text>
                      </View>
                      <View style={styles.diseaseBadge}>
                        <Text style={styles.diseaseBadgeText} numberOfLines={1}>
                          {adv.disease || (isEnglish ? 'General' : 'सामान्य')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.dateText}>{formatTimestamp(adv.createdAt)}</Text>
                  </View>

                  {/* Title */}
                  <Text style={styles.cardTitle}>{title}</Text>

                  {/* Scope Info */}
                  <View style={styles.scopeRow}>
                    <Image source={ICON_PIN} style={styles.pinIconSmall} resizeMode="contain" />
                    <Text style={styles.scopeText} numberOfLines={1}>
                      {adv.targetBlock && adv.targetBlock !== 'All' ? `${adv.targetBlock} Block` : (isEnglish ? 'District-wide' : 'संपूर्ण ज़िला')}
                      {adv.targetVillage && adv.targetVillage !== 'All' ? ` • ${adv.targetVillage}` : ''}
                    </Text>
                  </View>

                  {/* Message Preview */}
                  <Text style={styles.cardMessage} numberOfLines={3}>
                    {message}
                  </Text>

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.issuedByText} numberOfLines={1}>
                      {adv.issuedBy || (isEnglish ? 'Animal Husbandry Dept' : 'पशुपालन विभाग')}
                    </Text>
                    <View style={styles.viewDetailPill}>
                      <Text style={styles.viewDetailText}>
                        {isEnglish ? 'View Full Protocol' : 'पूरा विवरण देखें'}
                      </Text>
                      <Image source={ICON_CHEVRON} style={styles.chevronSmall} resizeMode="contain" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ======================================================== */}
      {/* 3. FULL ADVISORY DETAIL MODAL */}
      {/* ======================================================== */}
      <Modal
        visible={Boolean(selectedAdvisory)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAdvisory(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAdvisory && (() => {
              const theme = getAdvisorySeverityTheme(selectedAdvisory.severity);
              const rawTitle =
                typeof selectedAdvisory.title === 'object'
                  ? selectedAdvisory.title.en || selectedAdvisory.title.hi
                  : selectedAdvisory.title;
              const title = (rawTitle && rawTitle !== 'undefined' ? rawTitle : selectedAdvisory.titleEn) || 'Official Biosecurity Advisory';
              const rawMsg =
                typeof selectedAdvisory.message === 'object'
                  ? selectedAdvisory.message.en || selectedAdvisory.message.hi
                  : selectedAdvisory.message;
              const message = (rawMsg && rawMsg !== 'undefined' ? rawMsg : selectedAdvisory.messageEn) || '';

              return (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderTitleWrap}>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: theme.bgColor, borderColor: theme.borderColor },
                        ]}
                      >
                        <Text style={[styles.severityBadgeText, { color: theme.color }]}>
                          {theme.label}
                        </Text>
                      </View>
                      <Text style={styles.modalHeaderCategory}>
                        {selectedAdvisory.disease || 'Biosecurity Bulletin'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedAdvisory(null)}
                      style={styles.modalCloseBtn}
                      accessibilityLabel="Close advisory detail"
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalMainTitle}>{title}</Text>

                    {/* Meta Tags Row */}
                    <View style={styles.modalMetaRow}>
                      <View style={styles.modalMetaItem}>
                        <Image source={ICON_PIN} style={styles.modalMetaIcon} resizeMode="contain" />
                        <Text style={styles.modalMetaText}>
                          {selectedAdvisory.targetBlock && selectedAdvisory.targetBlock !== 'All'
                            ? `${selectedAdvisory.targetBlock} Block`
                            : 'District-wide'}
                          {selectedAdvisory.targetVillage && selectedAdvisory.targetVillage !== 'All'
                            ? `, ${selectedAdvisory.targetVillage}`
                            : ''}
                        </Text>
                      </View>

                      <View style={styles.modalMetaItem}>
                        <Image source={ICON_CLIPBOARD} style={styles.modalMetaIcon} resizeMode="contain" />
                        <Text style={styles.modalMetaText}>
                          {formatTimestamp(selectedAdvisory.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Official Message & Directives */}
                    <View style={styles.modalDirectiveBox}>
                      <Text style={styles.modalDirectiveLabel}>
                        {isEnglish ? 'Official Guidelines & Biosecurity Directives:' : 'आधिकारिक दिशानिर्देश एवं नियम:'}
                      </Text>
                      <Text style={styles.modalDirectiveText}>{message}</Text>
                    </View>

                    {/* Authority Endorsement */}
                    <View style={styles.modalAuthorityCard}>
                      <Image source={ICON_SHIELD} style={styles.modalAuthorityShield} resizeMode="contain" />
                      <View style={styles.modalAuthorityCol}>
                        <Text style={styles.modalAuthorityTitle}>
                          {selectedAdvisory.issuedBy || 'District Animal Husbandry Department'}
                        </Text>
                        <Text style={styles.modalAuthoritySub}>
                          {isEnglish
                            ? 'Authoritative Government Biosecurity Directive • Enforced across jurisdiction'
                            : 'अधिकृत शासकीय जैव सुरक्षा निर्देश • संपूर्ण क्षेत्र में प्रभावी'}
                        </Text>
                      </View>
                    </View>

                    {/* Contextual Action CTAs */}
                    <View style={styles.modalActionsSection}>
                      <TouchableOpacity
                        style={styles.modalActionPrimary}
                        onPress={() => {
                          setSelectedAdvisory(null);
                          router.push('/(vet)/containment');
                        }}
                        activeOpacity={0.82}
                      >
                        <Image source={ICON_SHIELD} style={styles.modalActionIcon} resizeMode="contain" />
                        <Text style={styles.modalActionPrimaryText}>
                          {isEnglish ? 'Inspect Containment Cordons' : 'कंटेनमेंट ज़ोन की जांच करें'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalActionSecondary}
                        onPress={() => {
                          setSelectedAdvisory(null);
                          router.push('/(vet)/map');
                        }}
                        activeOpacity={0.82}
                      >
                        <Image source={ICON_PIN} style={[styles.modalActionIcon, { tintColor: '#0F5132' }]} resizeMode="contain" />
                        <Text style={styles.modalActionSecondaryText}>
                          {isEnglish ? 'View GIS Outbreak Radar' : 'जीआईएस रडार पर देखें'}
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
      {/* 4. UNIVERSAL VETERINARIAN FLOATING NAVIGATION DOCK */}
      {/* ======================================================== */}
      <VetFloatingNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  // 1. TOP APP BAR
  customTopBar: {
    backgroundColor: '#062A1A',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cadreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 7,
  },
  cadreText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#6EE7B7',
    letterSpacing: 0.8,
  },
  topBarMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topBackCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  topBackIcon: {
    width: 18,
    height: 18,
    tintColor: '#FFFFFF',
  },
  topTitleCol: {
    flex: 1,
    paddingHorizontal: 12,
  },
  topBarTitle: {
    fontSize: 18,
    fontFamily: FONT_BOLD,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  topBarSub: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#A7F3D0',
    marginTop: 1,
  },
  refreshCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  refreshIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  filterChipTextActive: {
    color: '#062A1A',
  },
  filterChipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  filterChipBadgeActive: {
    backgroundColor: '#0F5132',
  },
  filterChipBadgeText: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filterChipBadgeTextActive: {
    color: '#FFFFFF',
  },
  cachedNoticeBanner: {
    backgroundColor: '#FFFBEB',
    paddingVertical: 7,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  cachedNoticeIcon: {
    width: 14,
    height: 14,
    tintColor: '#D97706',
  },
  cachedNoticeText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#92400E',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    width: 24,
    height: 24,
    tintColor: '#DC2626',
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#991B1B',
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#7F1D1D',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // DYNAMIC CARD
  dynamicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  dynamicCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dynamicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dynamicShieldIcon: {
    width: 18,
    height: 18,
    tintColor: '#0F5132',
  },
  dynamicCardTitle: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  aiPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  aiPillText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  dynamicMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  dynamicMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  dynamicMetricVal: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '900',
    color: '#0F172A',
  },
  dynamicMetricLabel: {
    fontSize: 9.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  dynamicDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  topDiseasesSection: {
    marginBottom: 12,
  },
  sectionMiniHeader: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  diseaseTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  diseaseTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  diseaseTagName: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: '#334155',
  },
  diseaseTagCountBadge: {
    backgroundColor: '#0F5132',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  diseaseTagCountText: {
    fontSize: 9,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recommendationsSection: {
    gap: 8,
  },
  recItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  recItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recDiseaseTitle: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  urgencyPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  urgencyPillText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  recActionText: {
    fontSize: 11.5,
    fontFamily: FONT_MEDIUM,
    color: '#0F172A',
    lineHeight: 16,
  },
  recRationaleText: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  // SECTION HEADERS
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  // ADVISORY CARD
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  severityRail: {
    width: 5,
  },
  cardInnerContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  diseaseBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '45%',
  },
  diseaseBadgeText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    color: '#475569',
  },
  dateText: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 18,
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  pinIconSmall: {
    width: 12,
    height: 12,
    tintColor: '#64748B',
  },
  scopeText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    flex: 1,
  },
  cardMessage: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  issuedByText: {
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  viewDetailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },
  chevronSmall: {
    width: 10,
    height: 10,
    tintColor: '#0F5132',
  },
  // EMPTY STATE
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyCheckmarkIcon: {
    width: 26,
    height: 26,
    tintColor: '#059669',
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalHeaderCategory: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    color: '#64748B',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
  },
  modalScroll: {
    marginBottom: 10,
  },
  modalMainTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
    lineHeight: 22,
  },
  modalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalMetaIcon: {
    width: 12,
    height: 12,
    tintColor: '#64748B',
  },
  modalMetaText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#475569',
  },
  modalDirectiveBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    marginBottom: 14,
  },
  modalDirectiveLabel: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalDirectiveText: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    color: '#334155',
    lineHeight: 19,
  },
  modalAuthorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 18,
  },
  modalAuthorityShield: {
    width: 22,
    height: 22,
    tintColor: '#059669',
  },
  modalAuthorityCol: {
    flex: 1,
  },
  modalAuthorityTitle: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#065F46',
  },
  modalAuthoritySub: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#047857',
    marginTop: 1,
  },
  modalActionsSection: {
    gap: 8,
    marginBottom: 12,
  },
  modalActionPrimary: {
    backgroundColor: '#0F5132',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalActionIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  modalActionPrimaryText: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalActionSecondary: {
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalActionSecondaryText: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },
});
