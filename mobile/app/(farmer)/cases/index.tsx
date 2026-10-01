/**
 * PashuCare - Luxury Health & Triage Cases Screen
 * File: mobile/app/(farmer)/cases/index.tsx
 * 
 * Redesigned using UI/UX Pro Max Intelligence:
 * - Biophilic organic color system (#0F5132 deep forest green, #107C41 emerald, #F8FAF8 surface)
 * - Claymorphic 4-metric Triage Overview Ribbon (Total, Critical, In Investigation, Resolved)
 * - High-fidelity Case Cards with real clinical thumbnails (FMD, Lumpy, Normal skin, or camera image)
 * - Criticality priority sorting (Critical > High > Moderate > Healthy)
 * - Safe Doctor assignment resolution without undefined placeholders
 * - Floating levitating Kisan Saathi AI companion with sinusoidal hover motion
 * - Floating luxury bottom navigation dock matching dashboard
 * - Strictly zero raw emojis, using crisp dedicated vector icons
 * - Safe native font fallbacks preventing ExpoFontLoader Android crashes
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Image,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppLanguage } from '../../../src/services/i18n';
import { caseService } from '../../../src/services/caseService';
import {
  DiseaseCase,
  CaseFilter,
  normalizeCaseStatus,
  getCaseCriticalityPriority,
  sortCasesByCriticality,
} from '../../../src/types/case';

// Native platform font fallbacks
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_SEMIBOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

export default function FarmerCasesScreen() {
  const router = useRouter();
  const { t, isEnglish } = useAppLanguage();

  const [cases, setCases] = useState<DiseaseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<CaseFilter>('All');

  // Floating Levitation Animation for AI Chatbot
  const botFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(botFloatAnim, {
          toValue: -7,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(botFloatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatingLoop.start();
    return () => floatingLoop.stop();
  }, [botFloatAnim]);

  // Load live cases from backend
  const loadCases = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      const data = await caseService.getFarmerCases();
      setCases(data || []);
    } catch (err: any) {
      console.warn('[FarmerCases] Error loading cases:', err.message);
      if (err.message && err.message.includes('Network')) {
        setErrorMessage(
          isEnglish
            ? 'Unable to load case information. Please check your network connection.'
            : 'मामलों की जानकारी लोड करने में असमर्थ। कृपया नेटवर्क कनेक्शन जांचें।'
        );
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setErrorMessage(
          isEnglish
            ? 'Session expired. Please log in again to view your cases.'
            : 'सत्र समाप्त हो गया। कृपया अपने मामले देखने के लिए पुनः लॉगिन करें।'
        );
      } else {
        setErrorMessage(
          isEnglish
            ? 'Something went wrong while loading disease cases. Please retry.'
            : 'रोग मामले लोड करने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isEnglish]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Quick Overview Metrics
  const summaryMetrics = useMemo(() => {
    const total = cases.length;
    let criticalCount = 0;
    let investigatingCount = 0;
    let resolvedCount = 0;

    for (const c of cases) {
      const priority = getCaseCriticalityPriority(c);
      if (priority <= 1) {
        criticalCount++;
      }
      const norm = normalizeCaseStatus(c.status);
      if (['Investigating', 'Containment'].includes(norm)) {
        investigatingCount++;
      } else if (norm === 'Resolved') {
        resolvedCount++;
      }
    }

    return {
      total,
      criticalCount,
      investigatingCount,
      resolvedCount,
    };
  }, [cases]);

  // Filter Chips Options
  const filterOptions = useMemo(
    (): { key: CaseFilter; label: string; count?: number; isHighRisk?: boolean }[] => [
      { key: 'All', label: isEnglish ? 'All Cases' : 'सभी मामले', count: summaryMetrics.total },
      {
        key: 'HighRisk',
        label: isEnglish ? 'Critical & High' : 'अति गंभीर व उच्च',
        count: summaryMetrics.criticalCount,
        isHighRisk: true,
      },
      { key: 'New', label: isEnglish ? 'New' : 'नए' },
      { key: 'Investigating', label: isEnglish ? 'Investigating' : 'जांच जारी' },
      { key: 'Confirmed', label: isEnglish ? 'Confirmed' : 'पुष्टित' },
      { key: 'Containment', label: isEnglish ? 'In Treatment' : 'उपचाराधीन' },
      { key: 'Resolved', label: isEnglish ? 'Resolved' : 'सुलझे हुए', count: summaryMetrics.resolvedCount },
    ],
    [isEnglish, summaryMetrics]
  );

  // Filter and Sort Cases
  const filteredCases = useMemo(() => {
    const list = cases.filter((item) => {
      // 1. Status / Risk Filter
      if (selectedFilter !== 'All') {
        if (selectedFilter === 'HighRisk') {
          const priority = getCaseCriticalityPriority(item);
          if (priority > 1) return false;
        } else {
          const norm = normalizeCaseStatus(item.status);
          if (norm !== selectedFilter) return false;
        }
      }

      // 2. Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const caseId = (item.caseId || '').toLowerCase();
        const disease = (item.disease || '').toLowerCase();
        const animalName = (item.animalId?.name || item.animalName || '').toLowerCase();
        const tagId = (item.animalId?.tagId || '').toLowerCase();
        const species = (item.animalId?.species || item.species || '').toLowerCase();

        return (
          caseId.includes(q) ||
          disease.includes(q) ||
          animalName.includes(q) ||
          tagId.includes(q) ||
          species.includes(q)
        );
      }

      return true;
    });

    return sortCasesByCriticality(list);
  }, [cases, selectedFilter, searchQuery]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return isEnglish ? 'Recent' : 'हाल ही में';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isEnglish ? 'Recent' : 'हाल ही में';
    }
  };

  // Safe resolver for assigned veterinary doctor name
  const resolveVetName = (item: DiseaseCase): string | null => {
    const vet: any = item.assignedVetId;
    if (!vet) return null;
    if (typeof vet === 'object' && vet.name) {
      const n = String(vet.name).trim();
      if (n.length > 22 || n.includes('-')) {
        return isEnglish ? 'District Veterinary Officer' : 'ज़िला पशु चिकित्सा अधिकारी';
      }
      return n;
    }
    if (typeof vet === 'string' && vet.trim()) {
      const s = vet.trim();
      if (s.length > 22 || s.includes('-')) {
        return isEnglish ? 'District Veterinary Officer' : 'ज़िला पशु चिकित्सा अधिकारी';
      }
      return s;
    }
    return null;
  };

  // Helper for species vector icon
  const getSpeciesIconSource = (speciesStr?: string) => {
    const s = (speciesStr || '').toLowerCase();
    if (s.includes('buffalo') || s.includes('भैंस')) {
      return require('../../../assets/icons/buffalo.png');
    }
    if (s.includes('goat') || s.includes('बकरी')) {
      return require('../../../assets/icons/goat.png');
    }
    if (s.includes('sheep') || s.includes('भेड़')) {
      return require('../../../assets/icons/sheep.png');
    }
    return require('../../../assets/icons/cow.png');
  };

  // Helper for thumbnail image source
  const getCaseThumbnailSource = (item: DiseaseCase) => {
    if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
      return { uri: item.image };
    }
    const d = (item.disease || '').toLowerCase();
    const priority = getCaseCriticalityPriority(item);

    if (d.includes('fmd') || d.includes('foot') || priority === 0) {
      return require('../../../assets/case_thumb_fmd.png');
    }
    if (d.includes('normal') || d.includes('healthy') || priority === 4) {
      return require('../../../assets/case_thumb_normal.png');
    }
    return require('../../../assets/case_thumb_lumpy.png');
  };

  // Render individual luxury health case card
  const renderCaseCard = ({ item }: { item: DiseaseCase }) => {
    const priority = getCaseCriticalityPriority(item);
    const isCritical = priority === 0;
    const isHigh = priority === 1;
    const isModerate = priority === 2;

    // Criticality Accent Colors
    const accentColor = isCritical
      ? '#DC2626'
      : isHigh
      ? '#EA580C'
      : isModerate
      ? '#D97706'
      : '#16A34A';

    const riskBadgeBg = isCritical
      ? '#FEE2E2'
      : isHigh
      ? '#FFEDD5'
      : isModerate
      ? '#FEF3C7'
      : '#DCFCE7';

    const riskBadgeBorder = isCritical
      ? '#FECACA'
      : isHigh
      ? '#FED7AA'
      : isModerate
      ? '#FDE68A'
      : '#BBF7D0';

    const riskBadgeText = isCritical
      ? isEnglish ? 'Critical' : 'अति गंभीर'
      : isHigh
      ? isEnglish ? 'High Risk' : 'उच्च जोखिम'
      : isModerate
      ? isEnglish ? 'Moderate' : 'मध्यम'
      : isEnglish ? 'Low / Normal' : 'सामान्य / कम';

    const normStatus = normalizeCaseStatus(item.status);
    const statusLabel =
      normStatus === 'New'
        ? isEnglish ? 'New Referral' : 'नया रेफरल'
        : normStatus === 'Investigating'
        ? isEnglish ? 'Investigating' : 'समीक्षा जारी'
        : normStatus === 'Confirmed'
        ? isEnglish ? 'Confirmed' : 'पुष्टित'
        : normStatus === 'Containment'
        ? isEnglish ? 'In Treatment' : 'उपचाराधीन'
        : isEnglish ? 'Resolved' : 'सुलझा हुआ';

    const statusBadgeBg =
      normStatus === 'Resolved'
        ? '#DCFCE7'
        : normStatus === 'Confirmed'
        ? '#FEF3C7'
        : normStatus === 'Investigating'
        ? '#E0F2FE'
        : '#F1F5F9';

    const statusBadgeColor =
      normStatus === 'Resolved'
        ? '#15803D'
        : normStatus === 'Confirmed'
        ? '#B45309'
        : normStatus === 'Investigating'
        ? '#0369A1'
        : '#475569';

    const animalName = item.animalId?.name || item.animalName || (isEnglish ? 'Livestock Animal' : 'पशु');
    const tagId = item.animalId?.tagId;
    const species = item.animalId?.species || item.species || (isEnglish ? 'Cattle' : 'पशु');
    const breed = item.animalId?.breed;
    const identifier = item.caseId || item._id;
    const vetName = resolveVetName(item);

    return (
      <TouchableOpacity
        style={[
          styles.caseCard,
          isCritical && styles.caseCardCritical,
        ]}
        activeOpacity={0.88}
        onPress={() => router.push(`/(farmer)/cases/${identifier}` as any)}
      >
        {/* Left Criticality Accent Strip */}
        <View style={[styles.cardAccentStrip, { backgroundColor: accentColor }]} />

        <View style={styles.cardInnerContent}>
          {/* Top Metadata Row: Case ID, Criticality Pill, Status Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.caseIdBadge}>
              <View style={[styles.pulseIndicatorDot, { backgroundColor: accentColor }]} />
              <Text style={styles.caseIdNumber}>{item.caseId || 'CASE'}</Text>
            </View>

            <View style={styles.cardBadgeDeck}>
              {item.isPendingSync && (
                <View style={styles.pendingSyncPill}>
                  <Text style={styles.pendingSyncText}>
                    {isEnglish ? 'Offline Sync' : 'ऑफलाइन'}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.riskPill,
                  { backgroundColor: riskBadgeBg, borderColor: riskBadgeBorder },
                ]}
              >
                <Text style={[styles.riskPillText, { color: accentColor }]}>
                  {riskBadgeText}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusBadgeBg },
                ]}
              >
                <Text style={[styles.statusPillText, { color: statusBadgeColor }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Center Row: Thumbnail & Clinical Information */}
          <View style={styles.cardMainRow}>
            <Image
              source={getCaseThumbnailSource(item)}
              style={styles.caseThumbnail}
              resizeMode="cover"
            />

            <View style={styles.caseDetailsCol}>
              <Text style={styles.caseDiseaseTitle} numberOfLines={2}>
                {item.disease || (isEnglish ? 'Clinical Examination Needed' : 'चिकित्सा परीक्षण आवश्यक')}
              </Text>

              {/* Animal & Species Info Row */}
              <View style={styles.animalMetaRow}>
                <Image
                  source={getSpeciesIconSource(species)}
                  style={styles.speciesVectorIcon}
                  resizeMode="contain"
                />
                <Text style={styles.animalMetaText} numberOfLines={1}>
                  <Text style={styles.animalNameBold}>{animalName}</Text>
                  {tagId ? ` • #${tagId}` : ''}
                  {breed ? ` • ${breed}` : ` • ${species}`}
                </Text>
              </View>

              {/* Location or District info if present */}
              {item.farmerLocation?.district && (
                <View style={styles.locationChipRow}>
                  <Image
                    source={require('../../../assets/icons/icon_pin.png')}
                    style={styles.locationPinIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.locationChipText} numberOfLines={1}>
                    {item.farmerLocation.village ? `${item.farmerLocation.village}, ` : ''}
                    {item.farmerLocation.district}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Card Footer: Doctor Referral Status & Date */}
          <View style={styles.cardFooterRow}>
            <View style={styles.vetStatusCol}>
              <View style={styles.vetStatusBox}>
                <Image
                  source={require('../../../assets/icons/stethoscope.png')}
                  style={[
                    styles.stethoscopeIcon,
                    { tintColor: vetName ? '#0F5132' : '#D97706' },
                  ]}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.vetStatusText,
                    vetName ? styles.vetAssignedText : styles.vetPendingText,
                  ]}
                  numberOfLines={1}
                >
                  {vetName
                    ? vetName.startsWith('Dr.') || vetName.includes('Officer') || vetName.includes('अधिकारी')
                      ? `${vetName} • Assigned`
                      : isEnglish
                      ? `Dr. ${vetName} • Assigned`
                      : `डॉ. ${vetName} • नियुक्त`
                    : isEnglish
                    ? 'Awaiting Vet • Dispatched to Block Hospital'
                    : 'पशु चिकित्सक द्वारा दावा प्रतीक्षित'}
                </Text>
              </View>
            </View>

            <View style={styles.dateAndActionRow}>
              <View style={styles.dateChip}>
                <Image
                  source={require('../../../assets/icons/clock.png')}
                  style={styles.clockIcon}
                  resizeMode="contain"
                />
                <Text style={styles.dateChipText}>{formatDate(item.createdAt)}</Text>
              </View>

              <View style={styles.chevronCircle}>
                <Image
                  source={require('../../../assets/icons/chevron-right.png')}
                  style={styles.chevronIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ======================================================== */}
        {/* 1. TOP APP BAR */}
        {/* ======================================================== */}
        <View style={styles.topAppBar}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Image
              source={require('../../../assets/icons/arrow-back.png')}
              style={styles.backArrowIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.appBarTitleCol}>
            <Text style={styles.appBarTitle}>
              {isEnglish ? 'Health & Triage Cases' : 'स्वास्थ्य एवं रेफरल मामले'}
            </Text>
            <Text style={styles.appBarSub}>
              {isEnglish
                ? 'Clinical diagnosis, vet referrals & follow-ups'
                : 'पशु चिकित्सा निदान, रेफरल एवं निरंतर निगरानी'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerScanBtn}
            onPress={() => router.push('/(farmer)/ai-scan' as any)}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="New AI Scan"
          >
            <Image
              source={require('../../../assets/icons/camera.png')}
              style={styles.headerScanIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerScanText}>
              {isEnglish ? '+ Scan' : '+ स्कैन'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* 2. OVERVIEW TRIAGE RIBBON (4 CLAYMORPHIC METRIC CARDS) */}
        {/* ======================================================== */}
        <View style={styles.summaryRibbonContainer}>
          <View style={styles.summaryGrid}>
            {/* Card 1: Total */}
            <View style={styles.summaryMetricCard}>
              <View style={[styles.summaryIconBadge, { backgroundColor: '#E8F5E9' }]}>
                <Image
                  source={require('../../../assets/icons/premium/case_transparent.png')}
                  style={styles.summaryBadgeImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.summaryMetricNumber}>{summaryMetrics.total}</Text>
              <Text style={styles.summaryMetricLabel}>{isEnglish ? 'Total' : 'कुल'}</Text>
            </View>

            {/* Card 2: Critical / High */}
            <View style={[styles.summaryMetricCard, summaryMetrics.criticalCount > 0 && styles.summaryCardAlert]}>
              <View style={[styles.summaryIconBadge, { backgroundColor: '#FEE2E2' }]}>
                <Image
                  source={require('../../../assets/icons/premium/alert_transparent.png')}
                  style={styles.summaryBadgeImg}
                  resizeMode="contain"
                />
              </View>
              <Text
                style={[
                  styles.summaryMetricNumber,
                  summaryMetrics.criticalCount > 0 && { color: '#DC2626' },
                ]}
              >
                {summaryMetrics.criticalCount}
              </Text>
              <Text style={styles.summaryMetricLabel}>{isEnglish ? 'Critical' : 'गंभीर'}</Text>
            </View>

            {/* Card 3: Investigating */}
            <View style={styles.summaryMetricCard}>
              <View style={[styles.summaryIconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Image
                  source={require('../../../assets/icons/stethoscope.png')}
                  style={[styles.summaryBadgeImg, { tintColor: '#0284C7' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.summaryMetricNumber}>{summaryMetrics.investigatingCount}</Text>
              <Text style={styles.summaryMetricLabel}>{isEnglish ? 'Active' : 'जारी'}</Text>
            </View>

            {/* Card 4: Resolved */}
            <View style={styles.summaryMetricCard}>
              <View style={[styles.summaryIconBadge, { backgroundColor: '#DCFCE7' }]}>
                <Image
                  source={require('../../../assets/icons/checkmark.png')}
                  style={[styles.summaryBadgeImg, { tintColor: '#16A34A' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.summaryMetricNumber}>{summaryMetrics.resolvedCount}</Text>
              <Text style={styles.summaryMetricLabel}>{isEnglish ? 'Resolved' : 'सुलझे'}</Text>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 3. SEARCH BAR & HORIZONTAL FILTER CHIPS */}
        {/* ======================================================== */}
        <View style={styles.controlsSection}>
          <View style={styles.searchBar}>
            <Image
              source={require('../../../assets/icons/icon_search.png')}
              style={styles.searchIcon}
              resizeMode="contain"
            />
            <TextInput
              style={styles.searchInput}
              placeholder={
                isEnglish
                  ? 'Search by disease, animal, case ID...'
                  : 'केस ID, रोग, पशु या टैग से खोजें...'
              }
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearIconText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterOptions}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.filterChipsRow}
            renderItem={({ item }) => {
              const isSelected = selectedFilter === item.key;
              return (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipActive,
                    item.isHighRisk && !isSelected && styles.filterChipHighRisk,
                  ]}
                  onPress={() => setSelectedFilter(item.key)}
                  activeOpacity={0.8}
                >
                  {item.isHighRisk && (
                    <View style={styles.filterAlertDot} />
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                      item.isHighRisk && !isSelected && styles.filterChipTextHighRisk,
                    ]}
                  >
                    {item.label}
                    {typeof item.count === 'number' && item.count > 0 ? ` (${item.count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* ======================================================== */}
        {/* 4. MAIN CONTENT AREA */}
        {/* ======================================================== */}
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0F5132" />
            <Text style={styles.loadingText}>
              {isEnglish ? 'Loading clinical health cases...' : 'स्वास्थ्य मामले लोड हो रहे हैं...'}
            </Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerBox}>
            <View style={styles.errorIconCircle}>
              <Image
                source={require('../../../assets/icons/alert.png')}
                style={styles.errorIconImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.errorTitle}>{isEnglish ? 'Notice' : 'सूचना'}</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadCases()} activeOpacity={0.85}>
              <Text style={styles.retryBtnText}>{isEnglish ? 'Retry' : 'पुनः प्रयास'}</Text>
            </TouchableOpacity>
          </View>
        ) : cases.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Image
                source={require('../../../assets/icons/premium/case_transparent.png')}
                style={styles.emptyIconImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {isEnglish ? 'No Disease Cases Yet' : 'कोई सक्रिय रोग मामला नहीं है'}
            </Text>
            <Text style={styles.emptySub}>
              {isEnglish
                ? 'You have not registered any veterinary referral cases. Screen your livestock with AI to detect health conditions early.'
                : 'आपके पास कोई पंजीकृत रोग मामला नहीं है। प्रारंभिक अवस्था में लक्षणों की पहचान के लिए AI रोग स्क्रीनिंग का उपयोग करें।'}
            </Text>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push('/(farmer)/ai-scan' as any)}
              activeOpacity={0.88}
            >
              <Image
                source={require('../../../assets/icons/camera.png')}
                style={styles.primaryActionBtnIcon}
                resizeMode="contain"
              />
              <Text style={styles.primaryActionBtnText}>
                {isEnglish ? 'Start AI Disease Screening' : 'AI रोग स्क्रीनिंग शुरू करें'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : filteredCases.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Image
                source={require('../../../assets/icons/icon_search.png')}
                style={[styles.emptyIconImg, { tintColor: '#64748B' }]}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {isEnglish ? 'No Matching Cases' : 'कोई मिलान मामला नहीं मिला'}
            </Text>
            <Text style={styles.emptySub}>
              {isEnglish
                ? 'No health cases matched your filter or search query.'
                : 'आपकी खोज अथवा फ़िल्टर से संबंधित कोई मामला नहीं मिला।'}
            </Text>
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedFilter('All');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionBtnText}>
                {isEnglish ? 'Clear Filters' : 'फ़िल्टर हटाएं'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredCases}
            keyExtractor={(item) => item._id || item.caseId}
            renderItem={renderCaseCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadCases(true)}
                colors={['#0F5132']}
                tintColor="#0F5132"
              />
            }
          />
        )}

        {/* ======================================================== */}
        {/* 5. FLOATING KISAN SAATHI AI BOT (SMOOTH HOVER LEVITATION) */}
        {/* ======================================================== */}
        <Animated.View
          style={[
            styles.floatingAiBotWrapper,
            { transform: [{ translateY: botFloatAnim }] },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingAiBot}
            onPress={() => router.push('/(farmer)/kisan-saathi' as any)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Kisan Saathi AI Assistant"
          >
            <Image
              source={require('../../../assets/icons/floating_bot.png')}
              style={styles.floatingAiIcon}
              resizeMode="contain"
            />
            <View style={styles.floatingAiPill}>
              <Text style={styles.floatingAiPillText}>AI</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ======================================================== */}
        {/* 6. FLOATING BOTTOM NAVIGATION DOCK (SERVICES / CASES ACTIVE) */}
        {/* ======================================================== */}
        <View style={styles.floatingNavContainer} pointerEvents="box-none">
          <View style={styles.bottomNavDock}>
            {/* Tab 1: Home */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)')}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'Home' : 'होम'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_home.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'Home' : 'होम'}</Text>
            </TouchableOpacity>

            {/* Tab 2: My Herd */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)/animals' as any)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'My Herd' : 'मेरे पशु'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_cow.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'My Herd' : 'मेरे पशु'}</Text>
            </TouchableOpacity>

            {/* Tab 3: Center Elevated Scan */}
            <TouchableOpacity
              style={styles.navCenterScanItem}
              onPress={() => router.push('/(farmer)/ai-scan' as any)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={isEnglish ? 'AI Disease Scan' : 'रोग स्कैन'}
            >
              <View style={styles.navCenterScanCircle}>
                <Image
                  source={require('../../../assets/icons/nav_scan.png')}
                  style={styles.navCenterScanIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navCenterScanLabel}>{isEnglish ? 'Scan' : 'स्कैन'}</Text>
            </TouchableOpacity>

            {/* Tab 4: Services (Active for Health Cases) */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)/vaccination' as any)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: true }}
              accessibilityLabel={isEnglish ? 'Services' : 'सेवाएं'}
            >
              <View style={styles.navActiveIconBadge}>
                <Image
                  source={require('../../../assets/icons/nav_grid.png')}
                  style={[styles.navIconImage, { width: 24, height: 24, tintColor: '#0F5132' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.navTabLabel, styles.navTabLabelActive]}>
                {isEnglish ? 'Services' : 'सेवाएं'}
              </Text>
            </TouchableOpacity>

            {/* Tab 5: Profile */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)/profile' as any)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'Profile' : 'प्रोफाइल'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_profile.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'Profile' : 'प्रोफाइल'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  safeArea: {
    flex: 1,
  },

  /* 1. TOP APP BAR */
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrowIcon: {
    width: 20,
    height: 20,
    tintColor: '#0F5132',
  },
  appBarTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  appBarTitle: {
    fontSize: 18,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  appBarSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  headerScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    gap: 5,
  },
  headerScanIcon: {
    width: 14,
    height: 14,
    tintColor: '#0F5132',
  },
  headerScanText: {
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },

  /* 2. OVERVIEW TRIAGE RIBBON */
  summaryRibbonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  summaryCardAlert: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF8F8',
  },
  summaryIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryBadgeImg: {
    width: 16,
    height: 16,
  },
  summaryMetricNumber: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryMetricLabel: {
    fontSize: 10,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginTop: 1,
  },

  /* 3. SEARCH & CONTROLS */
  controlsSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchIcon: {
    width: 16,
    height: 16,
    tintColor: '#107C41',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: FONT_MEDIUM,
    color: '#0F172A',
  },
  clearIconText: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
    fontWeight: '700',
  },
  filterChipsRow: {
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F5132',
    borderColor: '#0F5132',
  },
  filterChipHighRisk: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  filterAlertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EA580C',
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  filterChipTextHighRisk: {
    color: '#C2410C',
    fontFamily: FONT_BOLD,
  },

  /* 4. LIST CONTAINER & LUXURY CASE CARDS */
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 120, // space for floating bottom dock
  },
  caseCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  caseCardCritical: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFAFA',
  },
  cardAccentStrip: {
    width: 5,
    height: '100%',
  },
  cardInnerContent: {
    flex: 1,
    padding: 13,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  caseIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 6,
  },
  pulseIndicatorDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  caseIdNumber: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.2,
  },
  cardBadgeDeck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingSyncPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingSyncText: {
    fontSize: 10,
    fontFamily: FONT_MEDIUM,
    color: '#B45309',
  },
  riskPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* Center row */
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  caseThumbnail: {
    width: 66,
    height: 66,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  caseDetailsCol: {
    flex: 1,
  },
  caseDiseaseTitle: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 4,
  },
  animalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  speciesVectorIcon: {
    width: 14,
    height: 14,
    tintColor: '#0F5132',
  },
  animalMetaText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#475569',
    flex: 1,
  },
  animalNameBold: {
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationPinIcon: {
    width: 11,
    height: 11,
    tintColor: '#64748B',
  },
  locationChipText: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
  },

  /* Card Divider & Footer */
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vetStatusCol: {
    flex: 1,
    marginRight: 8,
  },
  vetStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stethoscopeIcon: {
    width: 13,
    height: 13,
  },
  vetStatusText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
  },
  vetAssignedText: {
    color: '#0F5132',
    fontFamily: FONT_SEMIBOLD,
    fontWeight: '700',
  },
  vetPendingText: {
    color: '#B45309',
  },
  dateAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockIcon: {
    width: 11,
    height: 11,
    tintColor: '#94A3B8',
  },
  dateChipText: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
  },
  chevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronIcon: {
    width: 10,
    height: 10,
    tintColor: '#64748B',
  },

  /* Empty & Loading States */
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorIconImg: {
    width: 26,
    height: 26,
    tintColor: '#DC2626',
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#0F5132',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    fontSize: 13,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIconImg: {
    width: 36,
    height: 36,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F5132',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryActionBtnIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryActionBtnText: {
    color: '#334155',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    fontSize: 13,
  },

  /* 5. FLOATING AI CHAT BOT */
  floatingAiBotWrapper: {
    position: 'absolute',
    bottom: 92,
    right: 18,
    zIndex: 99,
  },
  floatingAiBot: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#107C41',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  floatingAiIcon: {
    width: 61,
    height: 61,
    borderRadius: 30.5,
  },
  floatingAiPill: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  floatingAiPillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },

  /* 6. FLOATING BOTTOM NAVIGATION DOCK */
  floatingNavContainer: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    zIndex: 90,
  },
  bottomNavDock: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  navTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navInactiveIconBox: {
    width: 36,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActiveIconBadge: {
    width: 44,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconImage: {
    width: 22,
    height: 22,
  },
  navTabLabel: {
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginTop: 2,
  },
  navTabLabelActive: {
    color: '#0F5132',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  navCenterScanItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    marginHorizontal: 4,
  },
  navCenterScanCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  navCenterScanIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  navCenterScanLabel: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
    marginTop: 3,
  },
});
