/**
 * PashuCare - Luxury Case Details & Clinical Review Screen
 * File: mobile/app/(farmer)/cases/[id].tsx
 * 
 * Redesigned using UI/UX Pro Max Intelligence:
 * - Biophilic organic color system (#0F5132 deep forest green, #107C41 emerald, #F8FAF8 surface)
 * - 5-Stage Interactive Lifecycle Visualizer with crisp vector icons (New -> Investigating -> Confirmed -> Containment -> Resolved)
 * - Hero Case Showcase Card with clinical thumbnail, Case ID, Criticality accent, and status badge
 * - Associated Animal profile card with direct link
 * - Clinical Observations & Vitals grid (Temp in °C/°F, Duration, Affected count, Farmer notes)
 * - AI Screening Assessment with confidence meter and mandatory medical disclaimer
 * - Official Veterinary Referral card with safe doctor resolution and direct call CTA
 * - Veterinary Findings & Prescription directives (when updated by doctor)
 * - Chronological status timeline trail
 * - Floating levitating Kisan Saathi AI companion with sinusoidal hover motion
 * - Floating luxury bottom navigation dock matching dashboard
 * - Strictly zero raw emojis, using crisp dedicated vector icons
 * - Safe native font fallbacks preventing ExpoFontLoader Android crashes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppLanguage } from '../../../src/services/i18n';
import { caseService } from '../../../src/services/caseService';
import {
  DiseaseCase,
  normalizeCaseStatus,
  getCaseCriticalityPriority,
  NormalizedCaseStatus,
} from '../../../src/types/case';

// Native platform font fallbacks
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_SEMIBOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

interface LifecycleStepDef {
  stage: NormalizedCaseStatus;
  labelEn: string;
  labelHi: string;
  icon: any;
}

const LIFECYCLE_STAGES: LifecycleStepDef[] = [
  {
    stage: 'New',
    labelEn: 'Reported',
    labelHi: 'दर्ज किया',
    icon: require('../../../assets/icons/icon_sparkle.png'),
  },
  {
    stage: 'Investigating',
    labelEn: 'Vet Review',
    labelHi: 'डॉक्टर समीक्षा',
    icon: require('../../../assets/icons/stethoscope.png'),
  },
  {
    stage: 'Confirmed',
    labelEn: 'Confirmed',
    labelHi: 'पुष्टित',
    icon: require('../../../assets/icons/alert.png'),
  },
  {
    stage: 'Containment',
    labelEn: 'Treatment',
    labelHi: 'उपचाराधीन',
    icon: require('../../../assets/icons/shield.png'),
  },
  {
    stage: 'Resolved',
    labelEn: 'Resolved',
    labelHi: 'सुलझा हुआ',
    icon: require('../../../assets/icons/checkmark.png'),
  },
];

const STAGE_ORDER: Record<NormalizedCaseStatus, number> = {
  New: 0,
  Investigating: 1,
  Confirmed: 2,
  Containment: 3,
  Resolved: 4,
};

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, isEnglish } = useAppLanguage();

  const [caseDoc, setCaseDoc] = useState<DiseaseCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

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

  // Fetch single case by ID
  const loadCaseDetails = useCallback(
    async (isPullToRefresh = false) => {
      if (!id) return;
      try {
        if (isPullToRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setErrorMessage(null);
        setErrorStatus(null);

        const data = await caseService.getCaseById(id);
        setCaseDoc(data);
      } catch (err: any) {
        console.warn('[CaseDetail] Error fetching case:', err.message);
        const status = err.response?.status;
        setErrorStatus(status || null);

        if (status === 404) {
          setErrorMessage(
            isEnglish
              ? 'This health case was not found or has been removed.'
              : 'यह रोग मामला नहीं मिला अथवा हटा दिया गया है।'
          );
        } else if (status === 403) {
          setErrorMessage(
            isEnglish
              ? 'Access restricted: You are not authorized to view this case.'
              : 'पहुंच प्रतिबंधित: आपको यह मामला देखने की अनुमति नहीं है।'
          );
        } else if (err.message && err.message.includes('Network')) {
          setErrorMessage(
            isEnglish
              ? 'Unable to connect. Please check your network and retry.'
              : 'कनेक्शन में असमर्थ। कृपया नेटवर्क जांचें और पुनः प्रयास करें।'
          );
        } else {
          setErrorMessage(
            isEnglish
              ? 'Unable to retrieve clinical case details. Please retry.'
              : 'केस विवरण प्राप्त करने में असमर्थ। कृपया पुनः प्रयास करें।'
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, isEnglish]
  );

  useEffect(() => {
    loadCaseDetails();
  }, [loadCaseDetails]);

  // Helpers
  const formatDate = (isoString?: string) => {
    if (!isoString) return isEnglish ? 'Not recorded' : 'दर्ज नहीं';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isEnglish ? 'Not recorded' : 'दर्ज नहीं';
    }
  };

  const formatTemperature = (temp?: number): string => {
    if (typeof temp !== 'number' || temp <= 0) return '';
    if (temp <= 45) {
      const tempF = ((temp * 9) / 5 + 32).toFixed(1);
      return `${temp}°C (${tempF}°F)`;
    }
    const tempC = (((temp - 32) * 5) / 9).toFixed(1);
    return `${temp}°F (${tempC}°C)`;
  };

  const formatDuration = (dur?: number): string => {
    if (typeof dur !== 'number' || dur <= 0) return '';
    if (dur >= 24) {
      const days = (dur / 24).toFixed(1).replace(/\.0$/, '');
      return isEnglish
        ? `${dur} hrs (${days} day${days === '1' ? '' : 's'})`
        : `${dur} घंटे (${days} दिन)`;
    }
    return isEnglish ? `${dur} hrs` : `${dur} घंटे`;
  };

  const handleCallPhone = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  // Safe Vet Resolver
  const resolveVet = (item: DiseaseCase) => {
    const vet: any = item.assignedVetId;
    if (!vet) return null;

    if (typeof vet === 'object') {
      const rawName = vet.name ? String(vet.name).trim() : '';
      const isPlaceholderName =
        !rawName || rawName.length > 26 || (rawName.includes('-') && rawName.length > 8);

      return {
        name: isPlaceholderName
          ? isEnglish
            ? 'District Veterinary Officer'
            : 'ज़िला पशु चिकित्सा अधिकारी'
          : rawName,
        department:
          vet.department ||
          (isEnglish ? 'Animal Husbandry & Veterinary Services' : 'पशुपालन एवं पशु चिकित्सा विभाग'),
        registrationNo: vet.registrationNo || null,
        phone: vet.phone || null,
      };
    }

    if (typeof vet === 'string' && vet.trim()) {
      return {
        name: isEnglish ? 'District Veterinary Officer' : 'ज़िला पशु चिकित्सा अधिकारी',
        department: isEnglish
          ? 'Animal Husbandry & Veterinary Services'
          : 'पशुपालन एवं पशु चिकित्सा विभाग',
        registrationNo: null,
        phone: null,
      };
    }

    return null;
  };

  // Species Icon
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

  // Case Thumbnail
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

  // ==========================================================
  // LOADING STATE
  // ==========================================================
  if (loading && !refreshing) {
    return (
      <View style={styles.centerBox}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingSpinnerCard}>
          <ActivityIndicator size="large" color="#0F5132" />
          <Text style={styles.loadingTitle}>
            {isEnglish ? 'Loading Clinical Case...' : 'केस जानकारी लोड हो रही है...'}
          </Text>
          <Text style={styles.loadingSub}>
            {isEnglish
              ? 'Retrieving official vet referral and lab records'
              : 'पशु चिकित्सा रेफरल एवं जांच रिपोर्ट प्राप्त की जा रही है'}
          </Text>
        </View>
      </View>
    );
  }

  // ==========================================================
  // ERROR STATE
  // ==========================================================
  if (errorMessage || !caseDoc) {
    return (
      <View style={styles.centerBox}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorCard}>
          <View style={styles.errorIconCircle}>
            <Image
              source={
                errorStatus === 404
                  ? require('../../../assets/icons/icon_search.png')
                  : require('../../../assets/icons/alert.png')
              }
              style={[styles.errorIconImg, { tintColor: '#DC2626' }]}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.errorTitle}>
            {errorStatus === 404
              ? isEnglish
                ? 'Case Not Found'
                : 'मामला नहीं मिला'
              : errorStatus === 403
              ? isEnglish
                ? 'Access Restricted'
                : 'पहुंच प्रतिबंधित'
              : isEnglish
              ? 'Unable to Load Case'
              : 'केस लोड करने में त्रुटि'}
          </Text>
          <Text style={styles.errorSub}>
            {errorMessage ||
              (isEnglish
                ? 'The requested clinical case could not be retrieved.'
                : 'अनुरोधित केस डेटा प्राप्त नहीं हो सका।')}
          </Text>

          <View style={styles.errorBtnGroup}>
            {errorStatus !== 404 && errorStatus !== 403 && (
              <TouchableOpacity
                style={styles.errorRetryBtn}
                onPress={() => loadCaseDetails()}
                activeOpacity={0.85}
              >
                <Image
                  source={require('../../../assets/icons/refresh.png')}
                  style={styles.errorBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.errorRetryBtnText}>{isEnglish ? 'Retry' : 'पुनः प्रयास'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.errorBackBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.errorBackBtnText}>
                {isEnglish ? 'Back to Cases' : 'मामलों पर वापस'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ==========================================================
  // CASE METRICS & THEMING
  // ==========================================================
  const currentStage = normalizeCaseStatus(caseDoc.status);
  const currentStageIndex = STAGE_ORDER[currentStage] ?? 0;

  const priority = getCaseCriticalityPriority(caseDoc);
  const isCritical = priority === 0;
  const isHigh = priority === 1;
  const isModerate = priority === 2;

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

  const riskLabel = isCritical
    ? isEnglish ? 'Critical' : 'अति गंभीर'
    : isHigh
    ? isEnglish ? 'High Risk' : 'उच्च जोखिम'
    : isModerate
    ? isEnglish ? 'Moderate' : 'मध्यम'
    : isEnglish ? 'Low / Normal' : 'सामान्य / सुरक्षित';

  const statusLabel =
    currentStage === 'New'
      ? isEnglish ? 'New Referral' : 'नया रेफरल'
      : currentStage === 'Investigating'
      ? isEnglish ? 'Under Investigation' : 'समीक्षा जारी'
      : currentStage === 'Confirmed'
      ? isEnglish ? 'Confirmed Positive' : 'पुष्टित'
      : currentStage === 'Containment'
      ? isEnglish ? 'In Treatment' : 'उपचाराधीन'
      : isEnglish ? 'Resolved & Closed' : 'सुलझा हुआ';

  const statusBadgeBg =
    currentStage === 'Resolved'
      ? '#DCFCE7'
      : currentStage === 'Confirmed'
      ? '#FEF3C7'
      : currentStage === 'Investigating'
      ? '#E0F2FE'
      : '#F1F5F9';

  const statusBadgeColor =
    currentStage === 'Resolved'
      ? '#15803D'
      : currentStage === 'Confirmed'
      ? '#B45309'
      : currentStage === 'Investigating'
      ? '#0369A1'
      : '#475569';

  const animal =
    typeof caseDoc.animalId === 'object' && caseDoc.animalId !== null ? caseDoc.animalId : null;
  const animalIdString = animal?._id || (typeof caseDoc.animalId === 'string' ? caseDoc.animalId : null);

  const assignedVet = resolveVet(caseDoc);
  const hasTimeline = Array.isArray(caseDoc.timeline) && caseDoc.timeline.length > 0;
  const hasVitals =
    (typeof caseDoc.temperature === 'number' && caseDoc.temperature > 0) ||
    (typeof caseDoc.duration === 'number' && caseDoc.duration > 0) ||
    (typeof caseDoc.affectedCount === 'number' && caseDoc.affectedCount > 1);

  const hasClinicalFindings = Boolean(
    caseDoc.clinicalDiagnosis ||
      caseDoc.investigationNotes ||
      caseDoc.treatmentNotes ||
      caseDoc.prescription
  );

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
              {isEnglish ? 'Clinical Case Review' : 'रोग मामला विवरण'}
            </Text>
            <Text style={styles.appBarSub}>
              Ref #{caseDoc.caseId} • {isEnglish ? 'Official Referral' : 'आधिकारिक रेफरल'}
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
        {/* SCROLLABLE CASE CONTENT */}
        {/* ======================================================== */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadCaseDetails(true)}
              colors={['#0F5132']}
              tintColor="#0F5132"
            />
          }
        >
          {/* ======================================================== */}
          {/* 2. HERO CLINICAL CASE SHOWCASE CARD */}
          {/* ======================================================== */}
          <View style={styles.heroCaseCard}>
            {/* Top Row: Case ID & Badges */}
            <View style={styles.heroTopRow}>
              <View style={styles.caseIdBadge}>
                <Image
                  source={require('../../../assets/icons/tag.png')}
                  style={styles.caseIdIcon}
                  resizeMode="contain"
                />
                <Text style={styles.caseIdText}>{caseDoc.caseId}</Text>
              </View>

              <View style={styles.heroBadgesRow}>
                {/* Criticality Pill */}
                <View
                  style={[
                    styles.riskPill,
                    { backgroundColor: riskBadgeBg, borderColor: riskBadgeBorder },
                  ]}
                >
                  <View style={[styles.riskDot, { backgroundColor: accentColor }]} />
                  <Text style={[styles.riskPillText, { color: accentColor }]}>{riskLabel}</Text>
                </View>

                {/* Status Pill */}
                <View style={[styles.statusPill, { backgroundColor: statusBadgeBg }]}>
                  <Text style={[styles.statusPillText, { color: statusBadgeColor }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
            </View>

            {/* Disease Heading */}
            <Text style={styles.diseaseHeroTitle}>{caseDoc.disease}</Text>

            {/* Thumbnail Showcase & Visual Info */}
            <View style={styles.caseThumbnailContainer}>
              <Image
                source={getCaseThumbnailSource(caseDoc)}
                style={styles.caseThumbnailImg}
                resizeMode="cover"
              />
              <View style={styles.thumbnailOverlay}>
                <View style={styles.speciesOverlayPill}>
                  <Image
                    source={getSpeciesIconSource(animal?.species || caseDoc.species)}
                    style={styles.speciesOverlayIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.speciesOverlayText}>
                    {animal?.species || caseDoc.species || (isEnglish ? 'Livestock' : 'पशु')}
                  </Text>
                </View>

                <View style={styles.dateOverlayPill}>
                  <Image
                    source={require('../../../assets/icons/clock.png')}
                    style={styles.dateOverlayIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.dateOverlayText}>{formatDate(caseDoc.createdAt)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ======================================================== */}
          {/* 3. 5-STAGE LIFECYCLE PROGRESS VISUALIZER */}
          {/* ======================================================== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Image
                  source={require('../../../assets/icons/icon_history.png')}
                  style={[styles.sectionBadgeImg, { tintColor: '#0F5132' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.sectionHeaderCol}>
                <Text style={styles.sectionTitle}>
                  {isEnglish ? 'Clinical Case Lifecycle' : 'केस प्रगति चक्र'}
                </Text>
                <Text style={styles.sectionSub}>
                  {isEnglish ? 'Official status:' : 'वर्तमान स्थिति:'}{' '}
                  <Text style={{ fontFamily: FONT_BOLD, color: statusBadgeColor }}>
                    {statusLabel}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Stage Stepper Horizontal Grid */}
            <View style={styles.lifecycleStepper}>
              {LIFECYCLE_STAGES.map((step, idx) => {
                const isCurrent = step.stage === currentStage;
                const isPassed = idx <= currentStageIndex;
                const isFinal = idx === LIFECYCLE_STAGES.length - 1;

                return (
                  <View key={step.stage} style={styles.stepperNode}>
                    {/* Connecting line behind */}
                    {!isFinal && (
                      <View
                        style={[
                          styles.stepperLine,
                          idx < currentStageIndex && styles.stepperLinePassed,
                        ]}
                      />
                    )}

                    {/* Step Icon Circle */}
                    <View
                      style={[
                        styles.stepperCircle,
                        isCurrent && styles.stepperCircleCurrent,
                        isPassed && !isCurrent && styles.stepperCirclePassed,
                        !isPassed && styles.stepperCirclePending,
                      ]}
                    >
                      <Image
                        source={step.icon}
                        style={[
                          styles.stepperIconImg,
                          isCurrent && { tintColor: '#FFFFFF' },
                          isPassed && !isCurrent && { tintColor: '#16A34A' },
                          !isPassed && { tintColor: '#94A3B8' },
                        ]}
                        resizeMode="contain"
                      />
                    </View>

                    {/* Step Label */}
                    <Text
                      style={[
                        styles.stepperLabel,
                        isCurrent && styles.stepperLabelCurrent,
                        isPassed && !isCurrent && styles.stepperLabelPassed,
                        !isPassed && styles.stepperLabelPending,
                      ]}
                      numberOfLines={1}
                    >
                      {isEnglish ? step.labelEn : step.labelHi}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ======================================================== */}
          {/* 4. ASSOCIATED ANIMAL PROFILE CARD */}
          {/* ======================================================== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#F0FDF4' }]}>
                <Image
                  source={getSpeciesIconSource(animal?.species || caseDoc.species)}
                  style={styles.sectionBadgeImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.sectionHeaderCol}>
                <Text style={styles.sectionTitle}>
                  {isEnglish ? 'Associated Animal' : 'संबंधित पशु'}
                </Text>
                <Text style={styles.sectionSub}>
                  {animal
                    ? isEnglish
                      ? 'Linked herd livestock record'
                      : 'पंजीकृत पशु रिकॉर्ड'
                    : isEnglish
                    ? 'Individual herd profile not linked'
                    : 'सीधा लक्षण दर्ज'}
                </Text>
              </View>
            </View>

            {animal ? (
              <View style={styles.animalDetailBox}>
                <View style={styles.animalProfileRow}>
                  <View style={styles.animalAvatarSquircle}>
                    <Image
                      source={getSpeciesIconSource(animal.species)}
                      style={styles.animalAvatarImg}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.animalInfoCol}>
                    <Text style={styles.animalNameText}>
                      {animal.name || caseDoc.animalName || (isEnglish ? 'Unnamed Animal' : 'अनाम पशु')}
                    </Text>
                    <View style={styles.animalTagRow}>
                      <View style={styles.tagBadge}>
                        <Image
                          source={require('../../../assets/icons/tag.png')}
                          style={styles.tagBadgeIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.tagBadgeText}>#{animal.tagId || 'N/A'}</Text>
                      </View>
                      <Text style={styles.animalMetaText}>
                        {animal.species || caseDoc.species || 'Cattle'}
                        {animal.breed ? ` • ${animal.breed}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                {animalIdString && (
                  <TouchableOpacity
                    style={styles.viewAnimalBtn}
                    onPress={() => router.push(`/(farmer)/animals/${animalIdString}` as any)}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.viewAnimalBtnText}>
                      {isEnglish ? 'View Full Animal Profile →' : 'पशु की पूरी प्रोफाइल देखें →'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.unlinkedAnimalBox}>
                <View style={styles.unlinkedIconSquircle}>
                  <Image
                    source={require('../../../assets/icons/clipboard.png')}
                    style={[styles.unlinkedIconImg, { tintColor: '#64748B' }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unlinkedTitle}>
                    {caseDoc.animalName || caseDoc.species || (isEnglish ? 'Direct Symptom Report' : 'सीधी लक्षण रिपोर्ट')}
                  </Text>
                  <Text style={styles.unlinkedSub}>
                    {isEnglish
                      ? `Reported for ${caseDoc.species || 'livestock'} without a linked individual herd ID.`
                      : `${caseDoc.species || 'पशु'} के लिए दर्ज किया गया।`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ======================================================== */}
          {/* 5. CLINICAL OBSERVATIONS, VITALS & FARMER NOTES */}
          {/* ======================================================== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#FEF3C7' }]}>
                <Image
                  source={require('../../../assets/icons/clipboard.png')}
                  style={[styles.sectionBadgeImg, { tintColor: '#B45309' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.sectionHeaderCol}>
                <Text style={styles.sectionTitle}>
                  {isEnglish ? 'Clinical Observations & Vitals' : 'लक्षण एवं शारीरिक स्थिति'}
                </Text>
                <Text style={styles.sectionSub}>
                  {isEnglish ? 'Logged during symptom reporting' : 'रिपोर्टिंग के समय दर्ज लक्षण'}
                </Text>
              </View>
            </View>

            {/* Vitals Grid */}
            {hasVitals && (
              <View style={styles.vitalsGrid}>
                {/* Temp */}
                {typeof caseDoc.temperature === 'number' && caseDoc.temperature > 0 && (
                  <View style={styles.vitalTile}>
                    <View style={[styles.vitalIconBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Image
                        source={require('../../../assets/icons/alert.png')}
                        style={[styles.vitalTileIcon, { tintColor: '#DC2626' }]}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.vitalValueText}>
                      {formatTemperature(caseDoc.temperature)}
                    </Text>
                    <Text style={styles.vitalLabelText}>
                      {isEnglish ? 'Body Temp' : 'तापमान'}
                    </Text>
                  </View>
                )}

                {/* Duration */}
                {typeof caseDoc.duration === 'number' && caseDoc.duration > 0 && (
                  <View style={styles.vitalTile}>
                    <View style={[styles.vitalIconBadge, { backgroundColor: '#E0F2FE' }]}>
                      <Image
                        source={require('../../../assets/icons/clock.png')}
                        style={[styles.vitalTileIcon, { tintColor: '#0284C7' }]}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.vitalValueText}>
                      {formatDuration(caseDoc.duration)}
                    </Text>
                    <Text style={styles.vitalLabelText}>
                      {isEnglish ? 'Duration' : 'अवधि'}
                    </Text>
                  </View>
                )}

                {/* Affected Count */}
                {typeof caseDoc.affectedCount === 'number' && caseDoc.affectedCount > 1 && (
                  <View style={styles.vitalTile}>
                    <View style={[styles.vitalIconBadge, { backgroundColor: '#FEF3C7' }]}>
                      <Image
                        source={require('../../../assets/icons/cow.png')}
                        style={styles.vitalTileIcon}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.vitalValueText}>{caseDoc.affectedCount}</Text>
                    <Text style={styles.vitalLabelText}>
                      {isEnglish ? 'Affected' : 'प्रभावित'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Reported Symptoms Tags */}
            <Text style={styles.subsectionLabel}>
              {isEnglish ? 'Reported Symptoms:' : 'दर्ज किए गए लक्षण:'}
            </Text>
            {caseDoc.symptoms && caseDoc.symptoms.length > 0 ? (
              <View style={styles.symptomsWrap}>
                {caseDoc.symptoms.map((sym, idx) => (
                  <View key={idx} style={styles.symptomPill}>
                    <View style={styles.symptomDot} />
                    <Text style={styles.symptomPillText}>{sym}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyNoteText}>
                {isEnglish ? 'No individual symptom tags recorded.' : 'कोई लक्षण टैग दर्ज नहीं।'}
              </Text>
            )}

            {/* Farmer Notes */}
            {caseDoc.notes ? (
              <View style={styles.notesBox}>
                <View style={styles.notesBoxHeader}>
                  <Image
                    source={require('../../../assets/icons/chat.png')}
                    style={styles.notesHeaderIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.notesBoxTitle}>
                    {isEnglish ? 'Farmer Observations' : 'किसान की टिप्पणी'}
                  </Text>
                </View>
                <Text style={styles.notesBoxBody}>{caseDoc.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* ======================================================== */}
          {/* 6. AI SCREENING ASSESSMENT (WITH MANDATORY DISCLAIMER) */}
          {/* ======================================================== */}
          {typeof caseDoc.confidence === 'number' && caseDoc.confidence > 0 && (
            <View style={styles.aiCard}>
              <View style={styles.aiCardHeader}>
                <View style={styles.aiTitleRow}>
                  <View style={styles.aiRobotBadge}>
                    <Image
                      source={require('../../../assets/icons/floating_bot.png')}
                      style={styles.aiRobotIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <View>
                    <Text style={styles.aiCardTitle}>
                      {isEnglish ? 'AI Screening Assessment' : 'AI रोग स्क्रीनिंग मूल्यांकन'}
                    </Text>
                    <Text style={styles.aiCardSub}>
                      {isEnglish ? 'Neural network vision match' : 'प्रारंभिक कंप्यूटर विज़न मिलान'}
                    </Text>
                  </View>
                </View>

                <View style={styles.aiConfidenceBadge}>
                  <Text style={styles.aiConfidenceNumber}>
                    {Math.round(caseDoc.confidence)}%
                  </Text>
                  <Text style={styles.aiConfidenceLabel}>
                    {isEnglish ? 'Match' : 'सटीकता'}
                  </Text>
                </View>
              </View>

              {/* Confidence Progress Bar */}
              <View style={styles.confidenceBarTrack}>
                <View
                  style={[
                    styles.confidenceBarFill,
                    {
                      width: `${Math.min(100, Math.max(10, Math.round(caseDoc.confidence)))}%`,
                    },
                  ]}
                />
              </View>

              {/* Mandatory Medical Disclaimer Banner */}
              <View style={styles.disclaimerBanner}>
                <Image
                  source={require('../../../assets/icons/shield.png')}
                  style={styles.disclaimerIconImg}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.disclaimerTitle}>
                    {isEnglish
                      ? 'AI-Assisted Preliminary Screening'
                      : 'AI-सहायक प्रारंभिक स्क्रीनिंग'}
                  </Text>
                  <Text style={styles.disclaimerText}>
                    {isEnglish
                      ? 'Not a final veterinary diagnosis. This automated assessment supports early outbreak detection and does not replace examination by a certified veterinarian.'
                      : 'यह अंतिम चिकित्सा निदान नहीं है। यह प्रणाली केवल प्रारंभिक चेतावनी और प्राथमिक पहचान के लिए है। कृपया प्रमाणित पशु चिकित्सक से जांच कराएं।'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* 7. OFFICIAL VETERINARY REFERRAL & DOCTOR PROFILE */}
          {/* ======================================================== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Image
                  source={require('../../../assets/icons/stethoscope.png')}
                  style={[styles.sectionBadgeImg, { tintColor: '#0284C7' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.sectionHeaderCol}>
                <Text style={styles.sectionTitle}>
                  {isEnglish ? 'Official Veterinary Referral' : 'पशु चिकित्सा अधिकारी रेफरल'}
                </Text>
                <Text style={styles.sectionSub}>
                  {assignedVet
                    ? isEnglish
                      ? 'Licensed officer assigned for triage'
                      : 'निरीक्षण हेतु नियुक्त पशु चिकित्सक'
                    : isEnglish
                    ? 'Referral dispatched to district registry'
                    : 'ज़िला पशु चिकित्सालय को प्रेषित'}
                </Text>
              </View>
            </View>

            {assignedVet ? (
              <View style={styles.vetProfileBox}>
                <View style={styles.vetHeaderRow}>
                  <View style={styles.vetAvatarCircle}>
                    <Image
                      source={require('../../../assets/icons/stethoscope.png')}
                      style={styles.vetAvatarImg}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.vetInfoCol}>
                    <Text style={styles.vetNameText}>{assignedVet.name}</Text>
                    <Text style={styles.vetDeptText}>{assignedVet.department}</Text>
                    {assignedVet.registrationNo ? (
                      <View style={styles.vetRegRow}>
                        <Image
                          source={require('../../../assets/icons/checkmark.png')}
                          style={styles.vetRegIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.vetRegText}>
                          Reg No: {assignedVet.registrationNo}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {assignedVet.phone ? (
                  <TouchableOpacity
                    style={styles.callVetButton}
                    onPress={() => handleCallPhone(assignedVet.phone || undefined)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={require('../../../assets/icons/icon_phone_call.png')}
                      style={styles.callVetIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.callVetBtnText}>
                      {isEnglish ? 'Call Official Veterinarian' : 'पशु चिकित्सक को कॉल करें'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={styles.pendingReferralCard}>
                <View style={styles.pendingReferralHeader}>
                  <View style={styles.pendingIconSquircle}>
                    <Image
                      source={require('../../../assets/icons/clock.png')}
                      style={[styles.pendingIconImg, { tintColor: '#D97706' }]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingReferralTitle}>
                      {isEnglish
                        ? 'Veterinary Referral Dispatched'
                        : 'चिकित्सा रेफरल प्रेषित'}
                    </Text>
                    <Text style={styles.pendingReferralSub}>
                      {isEnglish
                        ? `Case notified to veterinary registry in ${caseDoc.districtId || 'your district'}. A licensed medical officer will review symptoms.`
                        : `यह मामला ${caseDoc.districtId || 'आपके क्षेत्र'} के पशु चिकित्सालय को भेजा गया है।`}
                    </Text>
                  </View>
                </View>
                <View style={styles.pendingFooterNote}>
                  <Image
                    source={require('../../../assets/icons/shield.png')}
                    style={styles.pendingFooterIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.pendingFooterText}>
                    {isEnglish
                      ? 'Referral workflow is synchronized with state livestock health services.'
                      : 'रेफरल प्रक्रिया राज्य पशु स्वास्थ्य सेवा से समन्वित है।'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ======================================================== */}
          {/* 8. CLINICAL FINDINGS & PRESCRIPTION (IF DOCTOR FILLED) */}
          {/* ======================================================== */}
          {hasClinicalFindings && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Image
                    source={require('../../../assets/icons/clipboard.png')}
                    style={[styles.sectionBadgeImg, { tintColor: '#16A34A' }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.sectionHeaderCol}>
                  <Text style={styles.sectionTitle}>
                    {isEnglish ? 'Doctor Findings & Directives' : 'चिकित्सकीय निष्कर्ष व निर्देश'}
                  </Text>
                  <Text style={styles.sectionSub}>
                    {isEnglish ? 'Official clinical prescription' : 'प्रमाणित जांच व दवाई विवरण'}
                  </Text>
                </View>
              </View>

              {caseDoc.clinicalDiagnosis ? (
                <View style={styles.findingItem}>
                  <Text style={styles.findingLabel}>
                    {isEnglish ? 'Veterinary Diagnosis:' : 'चिकित्सीय निदान:'}
                  </Text>
                  <Text style={styles.findingValue}>{caseDoc.clinicalDiagnosis}</Text>
                </View>
              ) : null}

              {caseDoc.investigationNotes ? (
                <View style={styles.findingItem}>
                  <Text style={styles.findingLabel}>
                    {isEnglish ? 'Investigation Findings:' : 'जांच परिणाम:'}
                  </Text>
                  <Text style={styles.findingValue}>{caseDoc.investigationNotes}</Text>
                </View>
              ) : null}

              {caseDoc.treatmentNotes ? (
                <View style={styles.findingItem}>
                  <Text style={styles.findingLabel}>
                    {isEnglish ? 'Treatment Administered:' : 'दी गई चिकित्सा:'}
                  </Text>
                  <Text style={styles.findingValue}>{caseDoc.treatmentNotes}</Text>
                </View>
              ) : null}

              {caseDoc.prescription ? (
                <View style={styles.prescriptionCard}>
                  <View style={styles.prescriptionHeader}>
                    <Image
                      source={require('../../../assets/icons/icon_sparkle.png')}
                      style={styles.prescriptionIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.prescriptionTitle}>
                      {isEnglish ? 'Prescription & Directives' : 'दवा एवं उपचार निर्देश'}
                    </Text>
                  </View>
                  <Text style={styles.prescriptionBody}>{caseDoc.prescription}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ======================================================== */}
          {/* 9. CHRONOLOGICAL STATUS HISTORY TIMELINE */}
          {/* ======================================================== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#F1F5F9' }]}>
                <Image
                  source={require('../../../assets/icons/icon_history.png')}
                  style={[styles.sectionBadgeImg, { tintColor: '#475569' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.sectionHeaderCol}>
                <Text style={styles.sectionTitle}>
                  {isEnglish ? 'Status History Log' : 'स्थिति इतिहास लॉग'}
                </Text>
                <Text style={styles.sectionSub}>
                  {isEnglish ? 'Audit trail of case lifecycle' : 'केस के सभी आधिकारिक अपडेट'}
                </Text>
              </View>
            </View>

            {hasTimeline ? (
              <View style={styles.timelineTrail}>
                {caseDoc.timeline!.map((event, idx) => (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineNodeCol}>
                      <View style={styles.timelineDot} />
                      {idx < caseDoc.timeline!.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    <View style={styles.timelineContentBox}>
                      <View style={styles.timelineTopRow}>
                        <Text style={styles.timelineStatusName}>
                          {event.status || (isEnglish ? 'Update' : 'अपडेट')}
                        </Text>
                        <Text style={styles.timelineTimeText}>
                          {formatDate(event.timestamp)}
                        </Text>
                      </View>
                      {event.updaterName ? (
                        <Text style={styles.timelineUpdaterText}>
                          {isEnglish ? 'By' : 'द्वारा'}: {event.updaterName}
                        </Text>
                      ) : null}
                      {event.notes ? (
                        <Text style={styles.timelineNotesText}>{event.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noTimelineBox}>
                <Text style={styles.noTimelineText}>
                  {isEnglish
                    ? 'No intermediate status events logged yet.'
                    : 'अभी तक कोई अतिरिक्त इतिहास अपडेट नहीं है।'}
                </Text>
              </View>
            )}
          </View>

          {/* Bottom Space for Floating Bot & Bottom Nav */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ======================================================== */}
        {/* 10. FLOATING KISAN SAATHI AI BOT (SMOOTH HOVER LEVITATION) */}
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
        {/* 11. FLOATING BOTTOM NAVIGATION DOCK (SERVICES / CASES ACTIVE) */}
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
              onPress={() => router.push('/(farmer)/cases' as any)}
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
                {isEnglish ? 'Cases' : 'मामले'}
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

// ==========================================================
// LUXURY BIOPHILIC STYLESHEET
// ==========================================================
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  safeArea: {
    flex: 1,
  },

  /* Loading State */
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAF8',
  },
  loadingSpinnerCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderRadius: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingTitle: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
    marginTop: 16,
  },
  loadingSub: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },

  /* Error State */
  errorCard: {
    backgroundColor: '#FFFFFF',
    padding: 26,
    borderRadius: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    maxWidth: 340,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorIconImg: {
    width: 28,
    height: 28,
  },
  errorTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  errorBtnGroup: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  errorRetryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F5132',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  errorBtnIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },
  errorRetryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  errorBackBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
  },
  errorBackBtnText: {
    color: '#334155',
    fontSize: 13,
    fontFamily: FONT_MEDIUM,
    fontWeight: '600',
  },

  /* Top App Bar */
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backArrowIcon: {
    width: 18,
    height: 18,
    tintColor: '#1E293B',
  },
  appBarTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  appBarTitle: {
    fontSize: 16.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
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
    backgroundColor: '#0F5132',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
  },
  headerScanIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },
  headerScanText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* Scroll Area */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* 2. Hero Clinical Showcase Card */
  heroCaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  heroTopRow: {
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
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  caseIdIcon: {
    width: 11,
    height: 11,
    tintColor: '#475569',
  },
  caseIdText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.3,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskPillText: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  diseaseHeroTitle: {
    fontSize: 21,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  caseThumbnailContainer: {
    width: '100%',
    height: 165,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  caseThumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speciesOverlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  speciesOverlayIcon: {
    width: 15,
    height: 15,
  },
  speciesOverlayText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  dateOverlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  dateOverlayIcon: {
    width: 11,
    height: 11,
    tintColor: '#CBD5E1',
  },
  dateOverlayText: {
    color: '#E2E8F0',
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
  },

  /* Standard Section Card */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  sectionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeImg: {
    width: 20,
    height: 20,
  },
  sectionHeaderCol: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },

  /* 3. 5-Stage Stepper */
  lifecycleStepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    paddingVertical: 6,
  },
  stepperNode: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepperLine: {
    position: 'absolute',
    top: 17,
    left: '50%',
    width: '100%',
    height: 2.5,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  stepperLinePassed: {
    backgroundColor: '#16A34A',
  },
  stepperCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
  },
  stepperCircleCurrent: {
    backgroundColor: '#0F5132',
    borderColor: '#0F5132',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  stepperCirclePassed: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  stepperCirclePending: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  stepperIconImg: {
    width: 17,
    height: 17,
  },
  stepperLabel: {
    fontSize: 10,
    fontFamily: FONT_MEDIUM,
    textAlign: 'center',
  },
  stepperLabelCurrent: {
    color: '#0F5132',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  stepperLabelPassed: {
    color: '#15803D',
    fontFamily: FONT_MEDIUM,
  },
  stepperLabelPending: {
    color: '#94A3B8',
  },

  /* 4. Animal Details */
  animalDetailBox: {
    marginTop: 2,
  },
  animalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  animalAvatarSquircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  animalAvatarImg: {
    width: 32,
    height: 32,
  },
  animalInfoCol: {
    flex: 1,
  },
  animalNameText: {
    fontSize: 15.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  animalTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 3,
  },
  tagBadgeIcon: {
    width: 10,
    height: 10,
    tintColor: '#2563EB',
  },
  tagBadgeText: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  animalMetaText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
  },
  viewAnimalBtn: {
    backgroundColor: '#F8FAF8',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewAnimalBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },
  unlinkedAnimalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  unlinkedIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlinkedIconImg: {
    width: 18,
    height: 18,
  },
  unlinkedTitle: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#1E293B',
  },
  unlinkedSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 2,
  },

  /* 5. Vitals & Clinical Observations */
  vitalsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  vitalTile: {
    flex: 1,
    backgroundColor: '#F8FAF8',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vitalIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  vitalTileIcon: {
    width: 14,
    height: 14,
  },
  vitalValueText: {
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  vitalLabelText: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 2,
  },
  subsectionLabel: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  symptomsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  symptomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  symptomDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0F5132',
  },
  symptomPillText: {
    fontSize: 11.5,
    fontFamily: FONT_MEDIUM,
    color: '#1E293B',
  },
  emptyNoteText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  notesBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 14,
    borderLeftWidth: 3.5,
    borderLeftColor: '#0F5132',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 6,
  },
  notesBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notesHeaderIcon: {
    width: 13,
    height: 13,
    tintColor: '#0F5132',
  },
  notesBoxTitle: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },
  notesBoxBody: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#1E293B',
    lineHeight: 18,
  },

  /* 6. AI Assessment Card */
  aiCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    ...Platform.select({
      ios: {
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiRobotBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  aiRobotIcon: {
    width: 28,
    height: 28,
  },
  aiCardTitle: {
    fontSize: 14.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0369A1',
  },
  aiCardSub: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#0284C7',
  },
  aiConfidenceBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  aiConfidenceNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  aiConfidenceLabel: {
    color: '#E0F2FE',
    fontSize: 9,
    fontFamily: FONT_MEDIUM,
  },
  confidenceBarTrack: {
    height: 7,
    backgroundColor: '#E0F2FE',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 4,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 11,
    borderRadius: 14,
    borderLeftWidth: 3.5,
    borderLeftColor: '#D97706',
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 9,
  },
  disclaimerIconImg: {
    width: 16,
    height: 16,
    tintColor: '#B45309',
    marginTop: 2,
  },
  disclaimerTitle: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  disclaimerText: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#78350F',
    lineHeight: 15,
  },

  /* 7. Official Vet Referral */
  vetProfileBox: {
    marginTop: 2,
  },
  vetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  vetAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  vetAvatarImg: {
    width: 24,
    height: 24,
    tintColor: '#0284C7',
  },
  vetInfoCol: {
    flex: 1,
  },
  vetNameText: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  vetDeptText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  vetRegRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  vetRegIcon: {
    width: 11,
    height: 11,
    tintColor: '#16A34A',
  },
  vetRegText: {
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
    color: '#15803D',
  },
  callVetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F5132',
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
  callVetIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  callVetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  pendingReferralCard: {
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingReferralHeader: {
    flexDirection: 'row',
    gap: 11,
  },
  pendingIconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIconImg: {
    width: 18,
    height: 18,
  },
  pendingReferralTitle: {
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  pendingReferralSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#78350F',
    lineHeight: 16,
  },
  pendingFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  pendingFooterIcon: {
    width: 12,
    height: 12,
    tintColor: '#B45309',
  },
  pendingFooterText: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#92400E',
    fontStyle: 'italic',
  },

  /* 8. Clinical Findings */
  findingItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  findingLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  findingValue: {
    fontSize: 13,
    fontFamily: FONT_REGULAR,
    color: '#0F172A',
    lineHeight: 19,
  },
  prescriptionCard: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 4,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  prescriptionIcon: {
    width: 13,
    height: 13,
    tintColor: '#15803D',
  },
  prescriptionTitle: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#15803D',
  },
  prescriptionBody: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    color: '#1E293B',
    lineHeight: 19,
  },

  /* 9. Timeline Trail */
  timelineTrail: {
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineNodeCol: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F5132',
    marginTop: 5,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineContentBox: {
    flex: 1,
    backgroundColor: '#F8FAF8',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineStatusName: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineTimeText: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
  },
  timelineUpdaterText: {
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginBottom: 2,
  },
  timelineNotesText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#334155',
    lineHeight: 16,
  },
  noTimelineBox: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  noTimelineText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  /* 10. FLOATING AI CHAT BOT */
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

  /* 11. FLOATING BOTTOM NAVIGATION DOCK */
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
