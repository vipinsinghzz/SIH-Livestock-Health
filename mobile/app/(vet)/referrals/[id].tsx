/**
 * Livestock Saathi - Ultra-Premium Veterinarian Referral Detail & Clinical Workflow
 * File: mobile/app/(vet)/referrals/[id].tsx
 * 
 * Complete clinical redesign:
 * - Edge-to-edge custom luxury header with back navigation, case ID pill, and criticality badge
 * - 5-Stage Clinical Lifecycle Stepper (Reported ➔ Investigating ➔ Confirmed ➔ Containment ➔ Resolved)
 * - Animal Patient Identity Card with 3D species avatar, RFID tag ID & clinical vitals (temp, duration, herd)
 * - AI Preliminary Screening Findings with confidence gauge & statutory veterinary disclaimer
 * - Macroscopic Clinical Lesion Evidence with tap-to-zoom full screen modal
 * - Reported Symptoms & Farmer Field Observations callout
 * - Geocoded Farmer Contact Card with 1-tap phone dialing & GIS Radar location shortcut
 * - Attending Doctor Clinical Record & Rx Prescription Slip
 * - Clinical Action Hub: Claim Case CTA, Advance Stage modal, Order Lab Test modal, Containment Zone modal, Ring Vaccination modal
 * - Comprehensive Clinical Audit Timeline
 * - Universal Fixed Bottom Floating Navigation Dock (auto-detects 'triage' active tab)
 * - Zero raw text emojis; platform-safe typography stack
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { veterinarianService } from '../../../src/services/veterinarianService';
import { labService } from '../../../src/services/labService';
import { containmentService } from '../../../src/services/containmentService';
import { DiseaseCase, getStatusTheme, getRiskTheme } from '../../../src/types/case';
import { ClinicalStage } from '../../../src/types/vet';
import { SAMPLE_TYPES, DESTINATION_LABS, LabSampleType } from '../../../src/types/lab';
import { DEFAULT_CONTAINMENT_RULES } from '../../../src/types/containment';
import { isCaseClaimable, isCaseAssignedToVet } from '../../../src/types/referral';
import { OfflineNotice } from '../../../src/components/OfflineNotice';
import { VetFloatingNav } from '../../../src/components/VetFloatingNav';
import { useAppLanguage } from '../../../src/services/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Native typography stack for stability across all Android & iOS devices
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_EXTRABOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

const CLINICAL_STAGES: Array<{ id: ClinicalStage; label: string; desc: string }> = [
  { id: 'Investigating', label: 'Investigating', desc: 'Active clinical examination & diagnostic workup' },
  { id: 'Confirmed', label: 'Confirmed', desc: 'Positive diagnosis established by attending veterinarian' },
  { id: 'Containment', label: 'Containment', desc: 'Biosecurity quarantine & active containment protocol' },
  { id: 'Resolved', label: 'Resolved', desc: 'Clinical recovery achieved; animal marked Recovered' },
];

const LIFECYCLE_STEPS = [
  { key: 'reported', label: 'Reported', sub: 'Farmer AI Triage' },
  { key: 'investigating', label: 'Investigating', sub: 'Clinical Workup' },
  { key: 'confirmed', label: 'Confirmed', sub: 'Diagnosis Set' },
  { key: 'containment', label: 'Containment', sub: 'Quarantine Cordon' },
  { key: 'resolved', label: 'Resolved', sub: 'Full Recovery' },
];

export default function VetReferralDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t, isEnglish } = useAppLanguage();

  const [caseItem, setCaseItem] = useState<DiseaseCase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<boolean>(false);

  // Fullscreen Lesion Image Modal
  const [showImageModal, setShowImageModal] = useState<boolean>(false);

  // Clinical Action State
  const [showActionForm, setShowActionForm] = useState<boolean>(false);
  const [actionTargetStatus, setActionTargetStatus] = useState<ClinicalStage>('Investigating');
  const [clinicalDiagnosisInput, setClinicalDiagnosisInput] = useState<string>('');
  const [affectedCountInput, setAffectedCountInput] = useState<string>('1');
  const [investigationNotesInput, setInvestigationNotesInput] = useState<string>('');
  const [treatmentNotesInput, setTreatmentNotesInput] = useState<string>('');
  const [prescriptionInput, setPrescriptionInput] = useState<string>('');
  const [customNotesInput, setCustomNotesInput] = useState<string>('');
  const [savingStatus, setSavingStatus] = useState<boolean>(false);

  // Lab Referral State
  const [showLabModal, setShowLabModal] = useState<boolean>(false);
  const [labSampleType, setLabSampleType] = useState<LabSampleType>('Blood / Serum');
  const [labDestination, setLabDestination] = useState<string>(DESTINATION_LABS[0]);
  const [labNotes, setLabNotes] = useState<string>('');
  const [submittingLab, setSubmittingLab] = useState<boolean>(false);

  // Containment & Ring Vaccination State
  const [showContainmentModal, setShowContainmentModal] = useState<boolean>(false);
  const [containmentRadius, setContainmentRadius] = useState<string>('5');
  const [containmentNotes, setContainmentNotes] = useState<string>('');
  const [selectedRules, setSelectedRules] = useState<string[]>(DEFAULT_CONTAINMENT_RULES);
  const [declaringContainment, setDeclaringContainment] = useState<boolean>(false);

  const [showRingModal, setShowRingModal] = useState<boolean>(false);
  const [ringDate, setRingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [ringVenue, setRingVenue] = useState<string>('');
  const [ringCapacity, setRingCapacity] = useState<string>('100');
  const [ringNotes, setRingNotes] = useState<string>('');
  const [schedulingRing, setSchedulingRing] = useState<boolean>(false);

  const vetId = user?.id || user?._id;
  const isAdmin = user?.role === 'admin';

  const loadCaseDetail = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const result = await veterinarianService.getReferralById(id);
      setCaseItem(result.case);
      setIsFromCache(result.fromCache);
    } catch (err: any) {
      console.warn('[VetReferralDetail] Error loading case:', err?.message);
      setError(err?.message || 'Failed to load referral details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadCaseDetail();
  }, [loadCaseDetail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCaseDetail();
  }, [loadCaseDetail]);

  // Atomic Case Claiming (New / OPEN -> Investigating)
  const handleClaim = () => {
    if (!caseItem) return;
    const targetId = caseItem.id || caseItem._id || caseItem.caseId;

    Alert.alert(
      isEnglish ? 'Take Clinical Responsibility' : 'क्लिनिकल जिम्मेदारी लें',
      isEnglish
        ? `Confirm claiming case ${caseItem.caseId} (${caseItem.disease})?\n\nThis will record your identity as attending veterinarian and transition status to Investigating.`
        : `केस ${caseItem.caseId} (${caseItem.disease}) को क्लेम करने की पुष्टि करें?\n\nयह आपको उपस्थित पशु चिकित्सक के रूप में दर्ज करेगा और स्थिति को "निगरानी" में बदल देगा।`,
      [
        { text: isEnglish ? 'Cancel' : 'रद्द करें', style: 'cancel' },
        {
          text: isEnglish ? 'Confirm Claim' : 'क्लेम करें',
          style: 'default',
          onPress: async () => {
            try {
              setClaiming(true);
              const res = await veterinarianService.claimCase(targetId);
              Alert.alert(
                isEnglish ? 'Case Claimed Successfully' : 'केस सफलतापूर्वक क्लेम किया गया',
                isEnglish
                  ? `Case ${caseItem.caseId} has been assigned to your clinical care.`
                  : `केस ${caseItem.caseId} आपके उपचाराधीन आवंटित कर दिया गया है।`
              );
              if (res.case) {
                setCaseItem(res.case);
              } else {
                loadCaseDetail();
              }
            } catch (claimErr: any) {
              Alert.alert(
                isEnglish ? 'Unable to Claim Case' : 'केस क्लेम करने में असमर्थ',
                claimErr.message || 'Failed to claim referral.'
              );
            } finally {
              setClaiming(false);
            }
          },
        },
      ]
    );
  };

  // Open Clinical Action Form
  const handleOpenActionForm = (defaultStatus?: ClinicalStage) => {
    if (!caseItem) return;
    const currentStatus = String(caseItem.status || 'New').toUpperCase();

    let nextStatus: ClinicalStage = 'Investigating';
    if (defaultStatus) {
      nextStatus = defaultStatus;
    } else if (currentStatus === 'NEW' || currentStatus === 'OPEN') {
      nextStatus = 'Investigating';
    } else if (currentStatus === 'INVESTIGATING' || currentStatus === 'ACCEPTED') {
      nextStatus = 'Confirmed';
    } else if (currentStatus === 'CONFIRMED') {
      nextStatus = 'Containment';
    } else {
      nextStatus = 'Resolved';
    }

    setActionTargetStatus(nextStatus);
    setClinicalDiagnosisInput(caseItem.clinicalDiagnosis || '');
    setAffectedCountInput(String(caseItem.affectedCount || 1));
    setInvestigationNotesInput(caseItem.investigationNotes || '');
    setTreatmentNotesInput(caseItem.treatmentNotes || '');
    setPrescriptionInput(caseItem.prescription || '');
    setCustomNotesInput('');
    setShowActionForm(true);
  };

  // Save 5-Stage Clinical Advancement
  const handleSaveClinicalAction = async () => {
    if (!caseItem) return;
    const targetCaseId = caseItem.id || caseItem._id || caseItem.caseId;

    if (actionTargetStatus === 'Confirmed' && !clinicalDiagnosisInput.trim()) {
      Alert.alert(
        isEnglish ? 'Clinical Diagnosis Required' : 'क्लिनिकल निदान आवश्यक है',
        isEnglish
          ? 'Please enter a confirmed clinical diagnosis before advancing the case to Confirmed status.'
          : 'केस को पुष्ट स्थिति में आगे बढ़ाने से पहले कृपया पुष्टि किया गया क्लिनिकल निदान दर्ज करें।'
      );
      return;
    }

    const doSubmit = async () => {
      try {
        setSavingStatus(true);
        const res = await veterinarianService.updateCaseStatus(targetCaseId, {
          status: actionTargetStatus,
          clinicalDiagnosis: clinicalDiagnosisInput.trim() || undefined,
          affectedCount: parseInt(affectedCountInput, 10) || 1,
          investigationNotes: investigationNotesInput.trim() || undefined,
          treatmentNotes: treatmentNotesInput.trim() || undefined,
          prescription: prescriptionInput.trim() || undefined,
          notes: customNotesInput.trim() || undefined,
        });

        Alert.alert(
          isEnglish ? 'Clinical Records Updated' : 'क्लिनिकल रिकॉर्ड अपडेट किया गया',
          res.message || `Case ${caseItem.caseId} transitioned to ${actionTargetStatus}.`
        );
        setShowActionForm(false);
        if (res.case) {
          setCaseItem(res.case);
        } else {
          loadCaseDetail();
        }
      } catch (err: any) {
        Alert.alert(
          isEnglish ? 'Unable to Update Case' : 'केस अपडेट करने में असमर्थ',
          err.message || 'Failed to save clinical records.'
        );
      } finally {
        setSavingStatus(false);
      }
    };

    if (actionTargetStatus === 'Resolved') {
      Alert.alert(
        isEnglish ? 'Confirm Case Resolution' : 'केस समाधान की पुष्टि करें',
        isEnglish
          ? 'Confirm that livestock patient has fully recovered and biosecurity criteria are met?\n\nThis will update the animal health status to "Recovered".'
          : 'पुष्टि करें कि पशु पूरी तरह स्वस्थ हो गया है?\n\nयह पशु स्वास्थ्य स्थिति को "स्वस्थ" (Recovered) में बदल देगा।',
        [
          { text: isEnglish ? 'Cancel' : 'रद्द करें', style: 'cancel' },
          { text: isEnglish ? 'Confirm Resolution' : 'समाधान की पुष्टि करें', style: 'default', onPress: doSubmit },
        ]
      );
    } else {
      doSubmit();
    }
  };

  // Order Lab Sample
  const handleOrderLabSample = async () => {
    if (!caseItem) return;
    const targetCaseId = caseItem.id || caseItem._id || caseItem.caseId;

    try {
      setSubmittingLab(true);
      const res = await labService.createLabReferral({
        caseId: targetCaseId,
        sampleType: labSampleType,
        referredLab: labDestination,
        notes: labNotes.trim() || undefined,
      });

      Alert.alert(
        isEnglish ? 'Diagnostic Sample Logged' : 'नमूना दर्ज किया गया',
        res.message || 'Lab referral generated and audit milestone logged to case timeline.'
      );
      setShowLabModal(false);
      setLabNotes('');
      loadCaseDetail();
    } catch (labErr: any) {
      Alert.alert(
        isEnglish ? 'Unable to Order Lab Test' : 'प्रयोगशाला परीक्षण ऑर्डर करने में असमर्थ',
        labErr.message || 'Failed to generate laboratory referral.'
      );
    } finally {
      setSubmittingLab(false);
    }
  };

  // Containment & Ring Vaccination Handlers
  const handleOpenContainmentModal = () => {
    if (!caseItem) return;
    setContainmentRadius('5');
    setContainmentNotes('');
    setSelectedRules([...DEFAULT_CONTAINMENT_RULES]);
    setShowContainmentModal(true);
  };

  const handleToggleRule = (rule: string) => {
    setSelectedRules((prev) =>
      prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule]
    );
  };

  const handleDeclareContainment = async () => {
    if (!caseItem) return;
    const rad = parseFloat(containmentRadius);
    if (isNaN(rad) || rad <= 0) {
      Alert.alert(
        isEnglish ? 'Invalid Radius' : 'अमान्य त्रिज्या',
        isEnglish ? 'Please enter a valid containment radius in kilometers (e.g. 5).' : 'कृपया किलोमीटर में एक मान्य त्रिज्या दर्ज करें।'
      );
      return;
    }

    const lat = caseItem.coordinates?.lat ?? (caseItem as any).latitude ?? 21.1458;
    const lng = caseItem.coordinates?.lng ?? (caseItem as any).longitude ?? 79.0882;
    const targetCaseId = caseItem.id || caseItem._id || caseItem.caseId;

    try {
      setDeclaringContainment(true);
      const res = await containmentService.declareContainmentZone({
        disease: caseItem.disease,
        center: { lat: Number(lat), lng: Number(lng) },
        radiusKm: rad,
        caseId: targetCaseId,
        district: caseItem.farmerLocation?.district || caseItem.districtId || 'Nagpur',
        block: caseItem.farmerLocation?.block || undefined,
        village: caseItem.farmerLocation?.village || undefined,
        enforcedRules: selectedRules,
        notes: containmentNotes.trim() || undefined,
      });

      Alert.alert(
        isEnglish ? 'Containment Zone Declared' : 'कंटेनमेंट घेरा घोषित',
        res.message || `Containment perimeter successfully established for ${caseItem.disease}.`
      );
      setShowContainmentModal(false);
      loadCaseDetail();
    } catch (err: any) {
      Alert.alert(
        isEnglish ? 'Unable to Declare Containment Zone' : 'कंटेनमेंट घेरा घोषित करने में असमर्थ',
        err.message || 'Failed to establish containment zone.'
      );
    } finally {
      setDeclaringContainment(false);
    }
  };

  const handleOpenRingModal = () => {
    if (!caseItem) return;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setRingDate(d.toISOString().split('T')[0]);
    const defaultVenue = [
      caseItem.farmerLocation?.village,
      caseItem.farmerLocation?.block,
      'Gram Panchayat / Veterinary Center',
    ].filter(Boolean).join(', ');
    setRingVenue(defaultVenue);
    setRingCapacity('100');
    setRingNotes('');
    setShowRingModal(true);
  };

  const handleScheduleRingVaccination = async () => {
    if (!caseItem) return;
    if (!ringDate.trim()) {
      Alert.alert(
        isEnglish ? 'Camp Date Required' : 'शिविर तिथि आवश्यक',
        isEnglish ? 'Please enter a valid vaccination drive date (YYYY-MM-DD).' : 'कृपया मान्य तिथि दर्ज करें।'
      );
      return;
    }
    if (!ringVenue.trim()) {
      Alert.alert(
        isEnglish ? 'Venue Required' : 'स्थान आवश्यक',
        isEnglish ? 'Please specify a venue or staging location.' : 'कृपया शिविर का स्थान दर्ज करें।'
      );
      return;
    }

    const cap = parseInt(ringCapacity, 10);
    const targetCaseId = caseItem.id || caseItem._id || caseItem.caseId;

    try {
      setSchedulingRing(true);
      const res = await containmentService.scheduleRingVaccination(targetCaseId, {
        campDate: ringDate.trim(),
        venue: ringVenue.trim(),
        capacity: isNaN(cap) ? 100 : cap,
        notes: ringNotes.trim() || undefined,
      });

      const driveMsg = res.drive ? `Drive ID: ${res.drive._id || res.drive.id || 'Scheduled'}` : '';
      Alert.alert(
        isEnglish ? 'Ring Vaccination Scheduled' : 'रिंग टीकाकरण निर्धारित',
        `${res.message || 'Emergency ring vaccination drive successfully activated.'}\n${driveMsg}`.trim()
      );
      setShowRingModal(false);
      loadCaseDetail();
    } catch (err: any) {
      Alert.alert(
        isEnglish ? 'Unable to Schedule Ring Vaccination' : 'टीकाकरण निर्धारित करने में असमर्थ',
        err.message || 'Failed to schedule vaccination drive.'
      );
    } finally {
      setSchedulingRing(false);
    }
  };

  const handleCallFarmer = (phone?: string) => {
    if (!phone) {
      Alert.alert(
        isEnglish ? 'Contact Unavailable' : 'संपर्क उपलब्ध नहीं',
        isEnglish ? 'No phone number was recorded for this farmer.' : 'इस किसान का फोन नंबर उपलब्ध नहीं है।'
      );
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert(isEnglish ? 'Error' : 'त्रुटि', isEnglish ? 'Unable to initiate phone call from device.' : 'फोन कॉल शुरू करने में असमर्थ।');
    });
  };

  // Resolve Stage Stepper index
  const currentStageIndex = useMemo(() => {
    if (!caseItem) return 0;
    const s = String(caseItem.status || 'New').toLowerCase();
    if (s === 'resolved' || s === 'closed') return 4;
    if (s === 'containment') return 3;
    if (s === 'confirmed') return 2;
    if (s === 'investigating' || s === 'accepted') return 1;
    return 0; // reported / new
  }, [caseItem]);

  // Resolve Species Avatar
  const speciesAvatar = useMemo(() => {
    const s = (caseItem?.species || '').toLowerCase();
    if (s.includes('buffalo')) return require('../../../assets/avatar_buffalo.png');
    if (s.includes('goat')) return require('../../../assets/avatar_goat.png');
    if (s.includes('sheep')) return require('../../../assets/avatar_sheep.png');
    return require('../../../assets/avatar_cow.png');
  }, [caseItem?.species]);

  // Resolve Lesion Fallback Photo
  const lesionFallbackPhoto = useMemo(() => {
    const d = (caseItem?.disease || '').toLowerCase();
    if (d.includes('lumpy') || d.includes('skin')) return require('../../../assets/case_thumb_lumpy.png');
    if (d.includes('fmd') || d.includes('foot') || d.includes('mouth')) return require('../../../assets/case_thumb_fmd.png');
    return require('../../../assets/case_thumb_normal.png');
  }, [caseItem?.disease]);

  // Lesion photo source
  const lesionPhotoSource = useMemo(() => {
    const imgUri = caseItem?.image || (caseItem as any)?.imageUrl;
    if (imgUri && typeof imgUri === 'string' && imgUri.startsWith('http')) {
      return { uri: imgUri };
    }
    return lesionFallbackPhoto;
  }, [caseItem?.image, (caseItem as any)?.imageUrl, lesionFallbackPhoto]);

  if (loading) {
    return (
      <View style={styles.centerWrapper}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingSpinnerRing}>
          <ActivityIndicator size="large" color="#0F5132" />
        </View>
        <Text style={styles.centerLoadingTitle}>
          {isEnglish ? 'Loading Clinical Referral Dossier' : 'क्लिनिकल रेफरल लोड हो रहा है'}
        </Text>
        <Text style={styles.centerLoadingSub}>
          {isEnglish ? 'Fetching patient vitals, telemetry & audit milestones...' : 'पशु के लक्षण, विटल्स एवं ऑडिट इतिहास प्राप्त किया जा रहा है...'}
        </Text>
      </View>
    );
  }

  if (error || !caseItem) {
    return (
      <View style={styles.centerWrapper}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorIconCircle}>
          <Image
            source={require('../../../assets/icons/alert.png')}
            style={styles.errorIconImg}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.centerErrorTitle}>
          {isEnglish ? 'Referral Dossier Unavailable' : 'रेफरल अनुपलब्ध'}
        </Text>
        <Text style={styles.centerErrorMessage}>{error || 'Case records could not be found.'}</Text>
        <TouchableOpacity style={styles.primaryActionBtn} onPress={loadCaseDetail} activeOpacity={0.8}>
          <Text style={styles.primaryActionBtnText}>{isEnglish ? 'Retry Loading' : 'पुनः प्रयास करें'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLinkButton}
          onPress={() => router.replace('/(vet)/referrals')}
          activeOpacity={0.7}
        >
          <Text style={styles.backLinkText}>
            {isEnglish ? 'Back to Triage Queue' : 'ट्रायज कतार पर वापस जाएं'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusTheme = getStatusTheme(caseItem.status);
  const riskTheme = getRiskTheme(caseItem.risk);
  const isClaimable = isCaseClaimable(caseItem);
  const isMine = isCaseAssignedToVet(caseItem, vetId);
  const canPerformClinicalAction = isMine || isAdmin;

  // Attending vet name resolution
  let assignedDoctorName = '';
  if (typeof caseItem.assignedVetId === 'object' && caseItem.assignedVetId !== null) {
    assignedDoctorName = caseItem.assignedVetId.name || '';
  } else if ((caseItem as any).assignedVet?.name) {
    assignedDoctorName = (caseItem as any).assignedVet.name;
  }
  const cleanAssignedDoctorName = assignedDoctorName.replace(/^(Dr\.?|Doctor)\s*/i, '');
  const cleanCurrentUserName = (user?.name || '').replace(/^(Dr\.?|Doctor)\s*/i, '');

  // Animal tag resolution
  let animalTag = 'RFID-UNTAGGED';
  if (caseItem.animalId && typeof caseItem.animalId === 'object') {
    animalTag = caseItem.animalId.tagId || caseItem.animalId._id || 'RFID-UNTAGGED';
  } else if (caseItem.animalId) {
    animalTag = String(caseItem.animalId);
  }

  // Criticality styling
  const isCritical = (caseItem.risk || '').toLowerCase() === 'critical';
  const isHighRisk = (caseItem.risk || '').toLowerCase() === 'high';

  return (
    <View style={styles.screenWrapper}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ======================================================== */}
      {/* 1. CUSTOM LUXURY TOP APP BAR */}
      {/* ======================================================== */}
      <View style={styles.customTopBar}>
        <View style={styles.topBarRow}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.topBackCircle}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel={isEnglish ? 'Go back' : 'वापस'}
          >
            <Image
              source={require('../../../assets/icons/arrow-back.png')}
              style={styles.topBackIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Center Title & Case ID */}
          <View style={styles.topCenterCol}>
            <View style={styles.caseIdPillBadge}>
              <View style={styles.caseIdDotGlow} />
              <Text style={styles.caseIdPillText}>{caseItem.caseId}</Text>
            </View>
            <Text style={styles.topScreenTitle} numberOfLines={1}>
              {caseItem.clinicalDiagnosis || caseItem.disease}
            </Text>
          </View>

          {/* Right Risk / Criticality Badge */}
          <View
            style={[
              styles.topRiskBadge,
              isCritical
                ? styles.topRiskBadgeCritical
                : isHighRisk
                ? styles.topRiskBadgeHigh
                : styles.topRiskBadgeNormal,
            ]}
          >
            <View
              style={[
                styles.miniRiskDot,
                { backgroundColor: isCritical ? '#EF4444' : isHighRisk ? '#F59E0B' : '#10B981' },
              ]}
            />
            <Text
              style={[
                styles.topRiskBadgeText,
                { color: isCritical ? '#B91C1C' : isHighRisk ? '#B45309' : '#047857' },
              ]}
            >
              {(caseItem.risk || 'MODERATE').toUpperCase()}
            </Text>
          </View>
        </View>

        {isFromCache && (
          <View style={styles.cacheNoticeStrip}>
            <Image
              source={require('../../../assets/icons/clock.png')}
              style={styles.cacheNoticeIcon}
              resizeMode="contain"
            />
            <Text style={styles.cacheNoticeText}>
              {isEnglish
                ? 'Offline Record: Loaded from local clinical database'
                : 'ऑफलाइन रिकॉर्ड: स्थानीय क्लिनिकल डेटाबेस से लोड किया गया'}
            </Text>
          </View>
        )}
      </View>

      <OfflineNotice />

      {/* ======================================================== */}
      {/* 2. MAIN SCROLLABLE CLINICAL DOSSIER */}
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
        {/* ======================================================== */}
        {/* STEPPER: 5-STAGE CLINICAL LIFECYCLE PROGRESS */}
        {/* ======================================================== */}
        <View style={styles.stepperCard}>
          <View style={styles.stepperHeaderRow}>
            <View style={styles.stepperHeaderTitleCol}>
              <Text style={styles.stepperCardEyebrow}>
                {isEnglish ? 'DISEASE SURVEILLANCE LIFECYCLE' : 'महामारी नियंत्रण चरण'}
              </Text>
              <Text style={styles.stepperCardTitle}>
                {isEnglish ? 'Epidemiological Care Trajectory' : 'चिकित्सकीय स्थिति प्रगति'}
              </Text>
            </View>
            <View style={[styles.statusPillActive, { backgroundColor: statusTheme.bgColor, borderColor: statusTheme.borderColor }]}>
              <Text style={[styles.statusPillActiveText, { color: statusTheme.color }]}>
                {statusTheme.label.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Stepper Node Track */}
          <View style={styles.stepperTrack}>
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <React.Fragment key={step.key}>
                  {idx > 0 && (
                    <View
                      style={[
                        styles.stepperLine,
                        isPast || isCurrent ? styles.stepperLineFilled : styles.stepperLineEmpty,
                      ]}
                    />
                  )}
                  <View style={styles.stepperNodeCol}>
                    <View
                      style={[
                        styles.stepperNodeCircle,
                        isPast
                          ? styles.stepperNodePast
                          : isCurrent
                          ? styles.stepperNodeCurrent
                          : styles.stepperNodeFuture,
                      ]}
                    >
                      {isPast ? (
                        <Image
                          source={require('../../../assets/icons/checkmark.png')}
                          style={styles.stepperCheckIcon}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text
                          style={[
                            styles.stepperNodeNum,
                            isCurrent ? styles.stepperNodeNumCurrent : styles.stepperNodeNumFuture,
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepperNodeLabel,
                        isCurrent && styles.stepperNodeLabelCurrent,
                      ]}
                      numberOfLines={1}
                    >
                      {step.label}
                    </Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>

          {/* Current Stage Guidance Bar */}
          <View style={styles.stageGuidanceBox}>
            <Image
              source={require('../../../assets/icons/stethoscope.png')}
              style={styles.stageGuidanceIcon}
              resizeMode="contain"
            />
            <Text style={styles.stageGuidanceText}>
              {currentStageIndex === 0
                ? isEnglish
                  ? 'Awaiting attending doctor claim to initiate physical diagnostic investigation.'
                  : 'शारीरिक क्लिनिकल जांच शुरू करने के लिए डॉक्टर क्लेम प्रतीक्षारत है।'
                : currentStageIndex === 1
                ? isEnglish
                  ? 'Case is currently under active clinical investigation and diagnostic examination.'
                  : 'केस सक्रिय क्लिनिकल निगरानी एवं निदान जांच के अधीन है।'
                : currentStageIndex === 2
                ? isEnglish
                  ? 'Confirmed positive diagnosis. Biosecurity containment protocols recommended.'
                  : 'पुष्ट संक्रमण। बायो-सिक्योरिटी कंटेनमेंट प्रोटोकॉल की सिफारिश की गई है।'
                : currentStageIndex === 3
                ? isEnglish
                  ? 'Containment perimeter & ring vaccination drives currently active in this sector.'
                  : 'इस क्षेत्र में कंटेनमेंट घेराबंदी एवं रिंग टीकाकरण सक्रिय है।'
                : isEnglish
                ? 'Clinical recovery confirmed. Livestock patient is in good health.'
                : 'मरीज पूरी तरह स्वस्थ हो चुका है। केस सफलतापूर्वक बंद किया गया।'}
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* CARD 1: LIVESTOCK PATIENT IDENTITY & VITALS */}
        {/* ======================================================== */}
        <View style={styles.clinicalCard}>
          <View style={styles.patientProfileRow}>
            {/* 3D Species Avatar */}
            <View style={styles.speciesAvatarBox}>
              <Image source={speciesAvatar} style={styles.speciesAvatarImg} resizeMode="cover" />
            </View>

            {/* Animal Info */}
            <View style={styles.patientMetaCol}>
              <View style={styles.speciesPillBadge}>
                <Text style={styles.speciesPillText}>
                  {(caseItem.species || 'CATTLE').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.patientNameText}>
                {caseItem.animalName || (isEnglish ? 'Unnamed Animal' : 'अनाम पशु')}
              </Text>
              <View style={styles.rfidTagRow}>
                <Image
                  source={require('../../../assets/icons/tag.png')}
                  style={styles.rfidTagIcon}
                  resizeMode="contain"
                />
                <Text style={styles.rfidTagText}>{animalTag}</Text>
              </View>
            </View>
          </View>

          {/* Vitals Telemetry Grid */}
          <View style={styles.vitalsTelemetryGrid}>
            {/* Body Temperature */}
            <View style={styles.vitalTile}>
              <Text style={[styles.vitalLabel]}>{isEnglish ? 'Body Temp' : 'तापमान'}</Text>
              <Text style={[styles.vitalValue, (caseItem.temperature != null && caseItem.temperature > 39.5) ? styles.vitalValueFever : undefined]}>
                {caseItem.temperature ? `${caseItem.temperature}°C` : '38.6°C'}
              </Text>
              <Text style={[styles.vitalSub, (caseItem.temperature != null && caseItem.temperature > 39.5) ? styles.vitalSubFever : undefined]}>
                {caseItem.temperature != null && caseItem.temperature > 39.5
                  ? (isEnglish ? 'High Fever' : 'तेज बुखार')
                  : (isEnglish ? 'Normal Range' : 'सामान्य')}
              </Text>
            </View>

            {/* Duration */}
            <View style={styles.vitalTile}>
              <Text style={styles.vitalLabel}>{isEnglish ? 'Duration' : 'अवधि'}</Text>
              <Text style={styles.vitalValue}>
                {caseItem.duration ? `${caseItem.duration} hrs` : '24-48 hrs'}
              </Text>
              <Text style={styles.vitalSub}>{isEnglish ? 'Symptom onset' : 'लक्षण शुरुआत'}</Text>
            </View>

            {/* Herd Affected */}
            <View style={styles.vitalTile}>
              <Text style={styles.vitalLabel}>{isEnglish ? 'Herd Affected' : 'प्रभावित'}</Text>
              <Text style={styles.vitalValue}>
                {caseItem.affectedCount || 1} {isEnglish ? 'head' : 'पशु'}
              </Text>
              <Text style={styles.vitalSub}>{isEnglish ? 'Immediate risk' : 'संभावित जोखिम'}</Text>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* CARD 2: AI PRELIMINARY SCREENING & FINDINGS */}
        {/* ======================================================== */}
        <View style={styles.aiScreeningCard}>
          <View style={styles.aiCardHeaderRow}>
            <View style={styles.aiBadgePill}>
              <Image
                source={require('../../../assets/icons/icon_sparkle.png')}
                style={styles.aiSparkleIcon}
                resizeMode="contain"
              />
              <Text style={styles.aiBadgePillText}>
                {isEnglish ? 'AI PRELIMINARY SCREENING' : 'एआई प्रारंभिक जांच'}
              </Text>
            </View>
            <View style={styles.confidenceGaugePill}>
              <Text style={styles.confidenceGaugeText}>
                {caseItem.confidence ? `${caseItem.confidence}% match` : '92% match'}
              </Text>
            </View>
          </View>

          <Text style={styles.aiSuspectedDisease}>
            {caseItem.clinicalDiagnosis ? caseItem.clinicalDiagnosis : caseItem.disease}
          </Text>

          {/* Statutory Veterinary Disclaimer */}
          <View style={styles.disclaimerBox}>
            <Image
              source={require('../../../assets/icons/shield.png')}
              style={styles.disclaimerShieldIcon}
              resizeMode="contain"
            />
            <Text style={styles.disclaimerText}>
              {isEnglish
                ? 'AI-assisted tele-triage risk assessment only — not a final veterinary diagnosis. Physical clinical examination & attending doctor validation required.'
                : 'एआई सहायता प्राप्त टेली-ट्रायज जोखिम मूल्यांकन — यह अंतिम निदान नहीं है। उपस्थित पशु चिकित्सक द्वारा भौतिक परीक्षण अनिवार्य है।'}
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* CARD 3: CLINICAL LESION EVIDENCE (MACROSCOPIC INSPECTION) */}
        {/* ======================================================== */}
        <View style={styles.clinicalCard}>
          <View style={styles.cardSectionHeaderRow}>
            <View>
              <Text style={styles.cardSectionTitle}>
                {isEnglish ? 'Macroscopic Lesion Evidence' : 'त्वचा व घाव का प्रत्यक्ष प्रमाण'}
              </Text>
              <Text style={styles.cardSectionSubtitle}>
                {isEnglish ? 'Field photographic lesion capture' : 'किसान द्वारा भेजी गई घाव की वास्तविक फोटो'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.inspectBtnPill}
              onPress={() => setShowImageModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.inspectBtnText}>{isEnglish ? 'Inspect' : 'बड़ा देखें'}</Text>
            </TouchableOpacity>
          </View>

          {/* Photographic Preview */}
          <TouchableOpacity
            style={styles.lesionPhotoFrame}
            onPress={() => setShowImageModal(true)}
            activeOpacity={0.9}
          >
            <Image
              source={lesionPhotoSource}
              style={styles.lesionPhotoImg}
              resizeMode="cover"
            />
            <View style={styles.lesionBadgeOverlay}>
              <View style={styles.lesionLiveDot} />
              <Text style={styles.lesionBadgeOverlayText}>
                {isEnglish ? 'Tele-triage Diagnostic Lens' : 'टेली-ट्रायज डायग्नोस्टिक लेंस'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* CARD 4: CLINICAL SIGNS & FARMER FIELD NOTES */}
        {/* ======================================================== */}
        <View style={styles.clinicalCard}>
          <Text style={styles.cardSectionTitle}>
            {isEnglish ? 'Reported Symptoms & Clinical Signs' : 'लक्षण एवं क्लिनिकल संकेत'}
          </Text>

          {/* Symptoms Pills Wrap */}
          <View style={styles.symptomsWrap}>
            {(caseItem.symptoms && caseItem.symptoms.length > 0
              ? caseItem.symptoms
              : [
                  'Nodular cutaneous skin lesions (2-5cm)',
                  'Persistent high body temperature (>40°C)',
                  'Enlarged prescapular lymph nodes',
                  'Loss of appetite & drop in milk yield',
                  'Watery nasal discharge & excessive salivation',
                ]
            ).map((symptom, idx) => (
              <View key={idx} style={styles.symptomPillItem}>
                <View style={styles.symptomBullet} />
                <Text style={styles.symptomPillLabel}>{symptom}</Text>
              </View>
            ))}
          </View>

          {/* Farmer Observation Quote */}
          {caseItem.notes ? (
            <View style={styles.farmerObservationBox}>
              <View style={styles.quoteHeaderRow}>
                <Image
                  source={require('../../../assets/icons/clipboard.png')}
                  style={styles.quoteIcon}
                  resizeMode="contain"
                />
                <Text style={styles.farmerObservationTitle}>
                  {isEnglish ? 'Farmer Field Observations' : 'किसान का प्रत्यक्ष विवरण'}
                </Text>
              </View>
              <Text style={styles.farmerObservationQuote}>
                "{caseItem.notes}"
              </Text>
            </View>
          ) : null}
        </View>

        {/* ======================================================== */}
        {/* CARD 5: FARMER PROFILE & GEOCODED FARM LOCATION */}
        {/* ======================================================== */}
        <View style={styles.clinicalCard}>
          <View style={styles.cardSectionHeaderRow}>
            <View>
              <Text style={styles.cardSectionTitle}>
                {isEnglish ? 'Farmer & Farm Location' : 'किसान एवं प्रक्षेत्र विवरण'}
              </Text>
              <Text style={styles.cardSectionSubtitle}>
                {isEnglish ? 'Geocoded field contact & address' : 'सत्यापित संपर्क व भू-स्थान'}
              </Text>
            </View>
            {caseItem.farmerContact?.phone ? (
              <TouchableOpacity
                style={styles.callFarmerTopBtn}
                onPress={() => handleCallFarmer(caseItem.farmerContact?.phone)}
                activeOpacity={0.82}
              >
                <Image
                  source={require('../../../assets/icons/icon_phone_call.png')}
                  style={styles.callFarmerBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.callFarmerTopBtnText}>{isEnglish ? 'Call' : 'कॉल'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Farmer Info Row */}
          <View style={styles.farmerRow}>
            <View style={styles.farmerAvatarCircle}>
              <Image
                source={require('../../../assets/icons/person.png')}
                style={styles.farmerAvatarIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.farmerMetaCol}>
              <Text style={styles.farmerNameHeading}>
                {caseItem.farmerContact?.name || (isEnglish ? 'Registered Dairy Farmer' : 'पंजीकृत पशुपालक')}
              </Text>
              <Text style={styles.farmerLocationString}>
                {[
                  caseItem.farmerLocation?.village,
                  caseItem.farmerLocation?.block,
                  caseItem.farmerLocation?.district || caseItem.districtId,
                  caseItem.farmerLocation?.state || 'Maharashtra',
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          </View>

          {/* Coordinates & GIS Map Shortcut */}
          <View style={styles.gisCoordinatesBar}>
            <View style={styles.coordsCol}>
              <Text style={styles.coordsLabel}>{isEnglish ? 'GIS COORDINATES' : 'जीआईएस निर्देशांक'}</Text>
              <Text style={styles.coordsVal}>
                {(caseItem.coordinates?.lat ?? 21.1458).toFixed(4)}° N, {(caseItem.coordinates?.lng ?? 79.0882).toFixed(4)}° E
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewOnMapBtn}
              onPress={() => router.push('/(vet)/map')}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../../assets/icons/location.png')}
                style={styles.viewOnMapIcon}
                resizeMode="contain"
              />
              <Text style={styles.viewOnMapBtnText}>{isEnglish ? 'GIS Radar' : 'नक्शे पर देखें'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ======================================================== */}
        {/* CARD 6: ATTENDING DOCTOR CLINICAL RECORD & PRESCRIPTION */}
        {/* ======================================================== */}
        <View style={[styles.clinicalCard, styles.doctorRecordCard]}>
          <View style={styles.cardSectionHeaderRow}>
            <View>
              <Text style={styles.cardSectionTitle}>
                {isEnglish ? 'Attending Clinical Record' : 'उपस्थित डॉक्टर क्लिनिकल रिकॉर्ड'}
              </Text>
              <Text style={styles.cardSectionSubtitle}>
                {isEnglish ? 'Diagnostic workup & therapeutic orders' : 'निदान रिपोर्ट एवं उपचार निर्देश'}
              </Text>
            </View>
            {canPerformClinicalAction && !showActionForm && (
              <TouchableOpacity
                style={styles.editRecordsBtn}
                onPress={() => handleOpenActionForm()}
                activeOpacity={0.8}
              >
                <Text style={styles.editRecordsBtnText}>{isEnglish ? 'Edit / Update' : 'अपडेट करें'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Assigned Doctor Banner */}
          <View style={styles.assignedDoctorBanner}>
            <Image
              source={require('../../../assets/icons/stethoscope.png')}
              style={[styles.assignedDoctorIcon, { tintColor: isMine ? '#059669' : '#0F5132' }]}
              resizeMode="contain"
            />
            <View style={styles.assignedDoctorMeta}>
              <Text style={styles.assignedDoctorEyebrow}>
                {isEnglish ? 'OFFICIAL ATTENDING VETERINARIAN' : 'प्रभारी पशु चिकित्सा अधिकारी'}
              </Text>
              {isMine ? (
                <Text style={styles.assignedDoctorNameMine}>
                  Dr. {cleanCurrentUserName || 'Doctor'} ({isEnglish ? 'You' : 'आप'})
                </Text>
              ) : cleanAssignedDoctorName ? (
                <Text style={styles.assignedDoctorNameOther}>Dr. {cleanAssignedDoctorName}</Text>
              ) : (
                <Text style={styles.assignedDoctorUnclaimed}>
                  {isEnglish ? 'Awaiting Doctor Claim' : 'क्लेम प्रतीक्षारत — कोई डॉक्टर नहीं'}
                </Text>
              )}
            </View>
          </View>

          {/* Confirmed Clinical Diagnosis */}
          <View style={styles.clinicalRecordField}>
            <Text style={styles.clinicalRecordFieldLabel}>
              {isEnglish ? 'Confirmed Clinical Diagnosis' : 'पुष्ट क्लिनिकल निदान'}
            </Text>
            {caseItem.clinicalDiagnosis ? (
              <Text style={styles.clinicalRecordFieldValBold}>{caseItem.clinicalDiagnosis}</Text>
            ) : (
              <Text style={styles.clinicalRecordFieldPending}>
                {isEnglish ? 'Pending diagnostic examination by attending doctor' : 'उपस्थित डॉक्टर द्वारा निदान लंबित है'}
              </Text>
            )}
          </View>

          {/* Examination Findings */}
          {caseItem.investigationNotes ? (
            <View style={styles.clinicalRecordField}>
              <Text style={styles.clinicalRecordFieldLabel}>
                {isEnglish ? 'Physical Examination Findings' : 'शारीरिक जांच निष्कर्ष'}
              </Text>
              <Text style={styles.clinicalRecordFieldVal}>{caseItem.investigationNotes}</Text>
            </View>
          ) : null}

          {/* Treatment Plan */}
          {caseItem.treatmentNotes ? (
            <View style={styles.clinicalRecordField}>
              <Text style={styles.clinicalRecordFieldLabel}>
                {isEnglish ? 'Treatment Plan & Bio-Interventions' : 'उपचार योजना एवं बायो-हस्तक्षेप'}
              </Text>
              <Text style={styles.clinicalRecordFieldVal}>{caseItem.treatmentNotes}</Text>
            </View>
          ) : null}

          {/* Rx Prescription Slip */}
          {caseItem.prescription ? (
            <View style={styles.rxPrescriptionSlip}>
              <View style={styles.rxSlipHeaderRow}>
                <View style={styles.rxSymbolBadge}>
                  <Text style={styles.rxSymbolText}>Rx</Text>
                </View>
                <Text style={styles.rxSlipTitle}>
                  {isEnglish ? 'Veterinary Medical Prescription' : 'पशु चिकित्सा पर्चा'}
                </Text>
              </View>
              <Text style={styles.rxSlipContent}>{caseItem.prescription}</Text>
            </View>
          ) : null}
        </View>

        {/* ======================================================== */}
        {/* CARD 7: CLINICAL ACTION COMMAND SUITE */}
        {/* ======================================================== */}
        {isClaimable ? (
          <View style={styles.actionSuiteContainer}>
            <TouchableOpacity
              style={styles.primaryClaimBigBtn}
              onPress={handleClaim}
              disabled={claiming}
              activeOpacity={0.88}
            >
              {claiming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Image
                    source={require('../../../assets/icons/stethoscope.png')}
                    style={styles.claimBtnIconImg}
                    resizeMode="contain"
                  />
                  <Text style={styles.primaryClaimBigBtnText}>
                    {isEnglish ? 'Claim Clinical Responsibility' : 'क्लिनिकल जिम्मेदारी लें'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.claimSubNotice}>
              {isEnglish
                ? 'Claiming assigns this patient to your duty queue and initiates Stage 2: Investigating.'
                : 'क्लेम करने से यह मरीज आपकी सूची में जुड़ जाएगा और जांच चरण शुरू होगा।'}
            </Text>
          </View>
        ) : canPerformClinicalAction && !showActionForm ? (
          <View style={styles.actionSuiteContainer}>
            {/* Primary Action: Update Clinical Case */}
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => handleOpenActionForm()}
              activeOpacity={0.88}
            >
              <Image
                source={require('../../../assets/icons/clipboard.png')}
                style={styles.actionBtnIcon}
                resizeMode="contain"
              />
              <Text style={styles.primaryActionBtnText}>
                {isEnglish ? 'Update Clinical Case & Advance Status' : 'केस स्थिति व उपचार रिकॉर्ड अपडेट करें'}
              </Text>
            </TouchableOpacity>

            {/* Secondary Action: Order Diagnostic Lab Test */}
            <TouchableOpacity
              style={styles.secondaryLabBtn}
              onPress={() => setShowLabModal(true)}
              activeOpacity={0.85}
            >
              <Image
                source={require('../../../assets/icons/icon_microscope.png')}
                style={styles.secondaryBtnIcon}
                resizeMode="contain"
              />
              <Text style={styles.secondaryLabBtnText}>
                {isEnglish ? 'Order Diagnostic Lab Test' : 'प्रयोगशाला जांच व नमूना भेजें'}
              </Text>
            </TouchableOpacity>

            {/* Outbreak Actions (Eligible for Confirmed or Containment) */}
            {(caseItem.status === 'Confirmed' || caseItem.status === 'Containment') && (
              <View style={styles.outbreakActionsRow}>
                <TouchableOpacity
                  style={styles.outbreakCordonBtn}
                  onPress={handleOpenContainmentModal}
                  activeOpacity={0.85}
                >
                  <Image
                    source={require('../../../assets/icons/shield.png')}
                    style={styles.outbreakBtnIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.outbreakCordonBtnText}>
                    {isEnglish ? 'Declare Containment' : 'कंटेनमेंट घेरा घोषित'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outbreakRingBtn}
                  onPress={handleOpenRingModal}
                  activeOpacity={0.85}
                >
                  <Image
                    source={require('../../../assets/icons/icon_syringe.png')}
                    style={styles.outbreakBtnIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.outbreakRingBtnText}>
                    {isEnglish ? 'Schedule Ring Drive' : 'रिंग टीकाकरण'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : !canPerformClinicalAction && cleanAssignedDoctorName ? (
          <View style={styles.lockedNoticeCard}>
            <Image
              source={require('../../../assets/icons/lock.png')}
              style={styles.lockIcon}
              resizeMode="contain"
            />
            <Text style={styles.lockedNoticeText}>
              {isEnglish
                ? `Assigned to Dr. ${cleanAssignedDoctorName}. Clinical stage updates and prescriptions can only be recorded by the attending veterinarian.`
                : `यह केस डॉ. ${cleanAssignedDoctorName} के अधीन है। केवल उपस्थित डॉक्टर ही उपचार दर्ज कर सकते हैं।`}
            </Text>
          </View>
        ) : null}

        {/* ======================================================== */}
        {/* CARD 8: CLINICAL CASE TIMELINE AUDIT */}
        {/* ======================================================== */}
        <View style={styles.clinicalCard}>
          <Text style={styles.cardSectionTitle}>
            {isEnglish
              ? `Case Timeline Audit (${caseItem.timeline?.length || 0})`
              : `केस ऑडिट इतिहास (${caseItem.timeline?.length || 0})`}
          </Text>

          {caseItem.timeline && caseItem.timeline.length > 0 ? (
            <View style={styles.timelineList}>
              {caseItem.timeline.map((entry, idx) => (
                <View key={idx} style={styles.timelineItemRow}>
                  {/* Timeline dot & line */}
                  <View style={styles.timelineMarkerCol}>
                    <View style={styles.timelineMilestoneDot} />
                    {idx < caseItem.timeline!.length - 1 && <View style={styles.timelineVerticalLine} />}
                  </View>

                  {/* Timeline content */}
                  <View style={styles.timelineContentBox}>
                    <View style={styles.timelineMetaHeader}>
                      <Text style={styles.timelineStatusTitle}>{entry.status || 'Status Update'}</Text>
                      <Text style={styles.timelineTimestamp}>
                        {entry.timestamp
                          ? new Date(entry.timestamp).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : ''}
                      </Text>
                    </View>
                    <Text style={styles.timelineUpdaterText}>
                      {entry.updaterName || (isEnglish ? 'Official Veterinarian' : 'पशु चिकित्सक')}
                    </Text>
                    {entry.notes ? <Text style={styles.timelineNoteBody}>{entry.notes}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyTimelineNotice}>
              {isEnglish ? 'No status transition milestones recorded yet.' : 'कोई मील का पत्थर दर्ज नहीं है।'}
            </Text>
          )}
        </View>

        {/* Spacer for bottom floating nav dock */}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* ======================================================== */}
      {/* 3. UNIVERSAL VETERINARIAN FLOATING NAVIGATION DOCK */}
      {/* ======================================================== */}
      <VetFloatingNav activeTab="triage" />

      {/* ======================================================== */}
      {/* MODAL 1: CLINICAL STAGE ADVANCEMENT & UPDATE FORM */}
      {/* ======================================================== */}
      <Modal
        visible={showActionForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalBadgeText}>VETERINARY CLINICAL WORKFLOW</Text>
                <Text style={styles.modalSheetTitle}>
                  {isEnglish ? 'Update Case & Advance Status' : 'केस अपडेट एवं स्थिति परिवर्तन'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowActionForm(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Target Stage Selector */}
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Target Clinical Status / Stage *' : 'लक्षित स्थिति / चरण *'}
              </Text>
              <View style={styles.stageGridWrap}>
                {CLINICAL_STAGES.map((st) => {
                  const isSelected = actionTargetStatus === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[styles.stageSelectPill, isSelected && styles.stageSelectPillActive]}
                      onPress={() => setActionTargetStatus(st.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.stageSelectPillText, isSelected && styles.stageSelectPillTextActive]}>
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Diagnosis Input */}
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Confirmed Clinical Diagnosis *' : 'पुष्ट क्लिनिकल निदान *'}
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder={isEnglish ? 'e.g. Lumpy Skin Disease (Capripoxvirus Confirmation)' : 'उदा. लंपी स्किन रोग'}
                placeholderTextColor="#94A3B8"
                value={clinicalDiagnosisInput}
                onChangeText={setClinicalDiagnosisInput}
              />

              {/* Affected Animals Count */}
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Affected Livestock Count' : 'प्रभावित पशुओं की संख्या'}
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="1"
                placeholderTextColor="#94A3B8"
                value={affectedCountInput}
                onChangeText={setAffectedCountInput}
                keyboardType="numeric"
              />

              {/* Physical Exam Findings */}
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Physical Examination Findings' : 'क्लिनिकल जांच निष्कर्ष'}
              </Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder={isEnglish ? 'Mucosal lesions, nodular palpation, lymph node state, body temp...' : 'घाव, गांठें, लिम्फ नोड्स, तापमान...'}
                placeholderTextColor="#94A3B8"
                value={investigationNotesInput}
                onChangeText={setInvestigationNotesInput}
                multiline
                numberOfLines={3}
              />

              {/* Treatment Plan */}
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Treatment Plan & Interventions' : 'उपचार योजना व निर्देश'}
              </Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder={isEnglish ? 'Antipyretics, wound dressings, herd isolation protocols...' : 'दवाइयां, ड्रेसिंग, आइसोलेशन...'}
                placeholderTextColor="#94A3B8"
                value={treatmentNotesInput}
                onChangeText={setTreatmentNotesInput}
                multiline
                numberOfLines={3}
              />

              {/* Rx Prescription */}
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Rx Prescribed Medications & Dosage' : 'Rx दवा पर्चा व खुराक'}
              </Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, styles.rxTextArea]}
                placeholder={isEnglish ? 'e.g. Inj. Meloxicam 0.5 mg/kg IM OD x 3 days, Inj. Oxytetracycline 10 mg/kg...' : 'दवाओं का नाम व खुराक'}
                placeholderTextColor="#94A3B8"
                value={prescriptionInput}
                onChangeText={setPrescriptionInput}
                multiline
                numberOfLines={3}
              />

              {/* Custom Timeline Note */}
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Audit Timeline Note (Optional)' : 'ऑडिट नोट (वैकल्पिक)'}
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder={isEnglish ? 'e.g. Physical field visit completed. Ring cordon alerted.' : 'उदा. फील्ड विजिट पूर्ण'}
                placeholderTextColor="#94A3B8"
                value={customNotesInput}
                onChangeText={setCustomNotesInput}
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowActionForm(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.modalCancelBtnText}>{isEnglish ? 'Cancel' : 'रद्द करें'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveClinicalAction}
                disabled={savingStatus}
                activeOpacity={0.85}
              >
                {savingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {isEnglish ? 'Submit Clinical Update' : 'अपडेट सबमिट करें'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: ORDER DIAGNOSTIC LAB TEST */}
      {/* ======================================================== */}
      <Modal
        visible={showLabModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLabModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={[styles.modalBadgeText, { color: '#0369A1' }]}>
                  DIAGNOSTIC LABORATORY REFERRAL
                </Text>
                <Text style={styles.modalSheetTitle}>
                  {isEnglish ? 'Order Specimen Collection' : 'लैब नमूना संग्रह ऑर्डर'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLabModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Target Patient Case' : 'लक्षित मरीज'}
              </Text>
              <View style={styles.modalInfoBox}>
                <Text style={styles.modalInfoBoxText}>
                  Case {caseItem.caseId} • {caseItem.species || 'Livestock'} ({caseItem.disease})
                </Text>
              </View>

              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Diagnostic Sample Type *' : 'नमूने का प्रकार *'}
              </Text>
              <View style={styles.stageGridWrap}>
                {SAMPLE_TYPES.map((st) => {
                  const isSelected = labSampleType === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[styles.stageSelectPill, isSelected && styles.labChipActive]}
                      onPress={() => setLabSampleType(st)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.stageSelectPillText, isSelected && styles.stageSelectPillTextActive]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Destination Laboratory *' : 'गंतव्य प्रयोगशाला *'}
              </Text>
              <View style={styles.stageGridWrap}>
                {DESTINATION_LABS.map((lab) => {
                  const isSelected = labDestination === lab;
                  return (
                    <TouchableOpacity
                      key={lab}
                      style={[styles.stageSelectPill, isSelected && styles.labChipActive]}
                      onPress={() => setLabDestination(lab)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.stageSelectPillText, isSelected && styles.stageSelectPillTextActive]}>
                        {lab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Cold Chain & Transport Notes' : 'कोल्ड-चेन व परिवहन विवरण'}
              </Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder={isEnglish ? 'Aseptic sampling notes, transport temp, ice packs...' : 'तापमान, बर्फ के पैकेट, सावधानियां...'}
                placeholderTextColor="#94A3B8"
                value={labNotes}
                onChangeText={setLabNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalInfoBox}>
                <Text style={[styles.modalInfoBoxText, { color: '#0369A1' }]}>
                  {isEnglish
                    ? 'Ordering a lab test registers an official diagnostic tracking record on the state livestock lab portal.'
                    : 'लैब टेस्ट का अनुरोध राज्य पशु चिकित्सा लैब पोर्टल पर रिकॉर्ड दर्ज करता है।'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActionButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLabModal(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.modalCancelBtnText}>{isEnglish ? 'Cancel' : 'रद्द करें'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#0369A1' }]}
                onPress={handleOrderLabSample}
                disabled={submittingLab}
                activeOpacity={0.85}
              >
                {submittingLab ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {isEnglish ? 'Submit Lab Order' : 'लैब रेफरल भेजें'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: DECLARE BIOSECURITY CONTAINMENT ZONE */}
      {/* ======================================================== */}
      <Modal
        visible={showContainmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContainmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={[styles.modalBadgeText, { color: '#7E22CE' }]}>BIOSECURITY PROTOCOL</Text>
                <Text style={styles.modalSheetTitle}>
                  {isEnglish ? 'Establish Containment Zone' : 'कंटेनमेंट घेरा स्थापित करें'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowContainmentModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Containment Buffer Radius (km) *' : 'कंटेनमेंट घेरा त्रिज्या (किमी) *'}
              </Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={containmentRadius}
                onChangeText={setContainmentRadius}
                placeholder="5"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Enforced Biosecurity Measures' : 'लागू किए गए जैविक सुरक्षा नियम'}
              </Text>
              <View style={styles.stageGridWrap}>
                {DEFAULT_CONTAINMENT_RULES.map((rule) => {
                  const isSelected = selectedRules.includes(rule);
                  return (
                    <TouchableOpacity
                      key={rule}
                      style={[styles.stageSelectPill, isSelected && styles.containmentChipActive]}
                      onPress={() => handleToggleRule(rule)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.stageSelectPillText, isSelected && { color: '#7E22CE', fontWeight: '800' }]}>
                        {isSelected ? '✓ ' : '+ '}{rule}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Official Clinical Justification / Directives' : 'आधिकारिक निर्देश व टिप्पणी'}
              </Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder={isEnglish ? 'Police check-post coordination, cattle fair closure, sanitization...' : 'पशु मेला रोक, चेक पोस्ट, सैनिटाइजेशन...'}
                placeholderTextColor="#94A3B8"
                value={containmentNotes}
                onChangeText={setContainmentNotes}
                multiline
                numberOfLines={3}
              />

              <View style={[styles.modalInfoBox, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                <Text style={[styles.modalInfoBoxText, { color: '#6B21A8' }]}>
                  {isEnglish
                    ? 'Establishing a containment zone triggers spatial GIS alerts for local field veterinary teams.'
                    : 'कंटेनमेंट जोन स्थापित करने से स्थानीय पशु चिकित्सा दल को जीआईएस अलर्ट भेजा जाता है।'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActionButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowContainmentModal(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.modalCancelBtnText}>{isEnglish ? 'Cancel' : 'रद्द करें'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#7E22CE' }]}
                onPress={handleDeclareContainment}
                disabled={declaringContainment}
                activeOpacity={0.85}
              >
                {declaringContainment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {isEnglish ? 'Declare Perimeter' : 'कंटेनमेंट लागू करें'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: SCHEDULE EMERGENCY RING VACCINATION DRIVE */}
      {/* ======================================================== */}
      <Modal
        visible={showRingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={[styles.modalBadgeText, { color: '#1D4ED8' }]}>EMERGENCY PROPHYLAXIS</Text>
                <Text style={styles.modalSheetTitle}>
                  {isEnglish ? 'Schedule Ring Vaccination' : 'आपातकालीन रिंग टीकाकरण'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowRingModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Camp Date (YYYY-MM-DD) *' : 'शिविर तिथि (YYYY-MM-DD) *'}
              </Text>
              <TextInput
                style={styles.formInput}
                value={ringDate}
                onChangeText={setRingDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Camp Staging Venue / Location *' : 'शिविर स्थल / ग्राम पंचायत *'}
              </Text>
              <TextInput
                style={styles.formInput}
                value={ringVenue}
                onChangeText={setRingVenue}
                placeholder={isEnglish ? 'Gram Panchayat cattle shed, dairy cooperative...' : 'ग्राम पंचायत, डेयरी शेड...'}
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Target Herd Capacity (Doses) *' : 'लक्षित खुराक क्षमता *'}
              </Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={ringCapacity}
                onChangeText={setRingCapacity}
                placeholder="100"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputFormLabel}>
                {isEnglish ? 'Cold Chain & Logistics Directives' : 'कोल्ड चेन व लॉजिस्टिक्स निर्देश'}
              </Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder={isEnglish ? 'Vaccine vial batch, cold box mobilization, field team...' : 'वैक्सीन बैच, कोल्ड बॉक्स, टीम...'}
                placeholderTextColor="#94A3B8"
                value={ringNotes}
                onChangeText={setRingNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalActionButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRingModal(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.modalCancelBtnText}>{isEnglish ? 'Cancel' : 'रद्द करें'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#1D4ED8' }]}
                onPress={handleScheduleRingVaccination}
                disabled={schedulingRing}
                activeOpacity={0.85}
              >
                {schedulingRing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {isEnglish ? 'Activate Ring Drive' : 'अभियान सक्रिय करें'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: FULLSCREEN LESION IMAGE VIEWER */}
      {/* ======================================================== */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.fullscreenModalOverlay}>
          <TouchableOpacity
            style={styles.fullscreenCloseCircle}
            onPress={() => setShowImageModal(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
          <Image
            source={lesionPhotoSource}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
          <View style={styles.fullscreenFooterBadge}>
            <Text style={styles.fullscreenFooterText}>
              Case {caseItem.caseId} • {caseItem.disease}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ========================================================
// STYLES: CLINICAL LUXURY THEME
// ========================================================
const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  loadingSpinnerRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerLoadingTitle: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  centerLoadingSub: {
    fontSize: 13,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 280,
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
    width: 30,
    height: 30,
    tintColor: '#DC2626',
  },
  centerErrorTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 6,
  },
  centerErrorMessage: {
    fontSize: 13,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  backLinkButton: {
    marginTop: 12,
    padding: 8,
  },
  backLinkText: {
    color: '#0F5132',
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  // 1. TOP APP BAR
  customTopBar: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 48,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBackCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topBackIcon: {
    width: 18,
    height: 18,
    tintColor: '#1E293B',
  },
  topCenterCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  caseIdPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 2,
  },
  caseIdDotGlow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  caseIdPillText: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontWeight: '700',
    color: '#065F46',
  },
  topScreenTitle: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  topRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  topRiskBadgeCritical: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  topRiskBadgeHigh: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  topRiskBadgeNormal: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  miniRiskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  topRiskBadgeText: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  cacheNoticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cacheNoticeIcon: {
    width: 12,
    height: 12,
    tintColor: '#92400E',
    marginRight: 6,
  },
  cacheNoticeText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#92400E',
    fontWeight: '600',
  },

  // 2. STEPPER: 5-STAGE CLINICAL LIFECYCLE
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  stepperHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepperHeaderTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  stepperCardEyebrow: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
    letterSpacing: 0.5,
  },
  stepperCardTitle: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  statusPillActive: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillActiveText: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  stepperTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  stepperNodeCol: {
    alignItems: 'center',
    width: 54,
  },
  stepperNodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepperNodePast: {
    backgroundColor: '#0F5132',
  },
  stepperNodeCurrent: {
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#A7F3D0',
  },
  stepperNodeFuture: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  stepperCheckIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },
  stepperNodeNum: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  stepperNodeNumCurrent: {
    color: '#FFFFFF',
  },
  stepperNodeNumFuture: {
    color: '#94A3B8',
  },
  stepperNodeLabel: {
    fontSize: 9.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    textAlign: 'center',
  },
  stepperNodeLabelCurrent: {
    color: '#0F5132',
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  stepperLine: {
    flex: 1,
    height: 2.5,
    marginTop: -16,
  },
  stepperLineFilled: {
    backgroundColor: '#0F5132',
  },
  stepperLineEmpty: {
    backgroundColor: '#E2E8F0',
  },
  stageGuidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  stageGuidanceIcon: {
    width: 16,
    height: 16,
    tintColor: '#059669',
    marginRight: 8,
  },
  stageGuidanceText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#047857',
    lineHeight: 16,
  },

  // CLINICAL CARD BASE
  clinicalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 14.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSectionSubtitle: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },

  // CARD 1: PATIENT PROFILE & VITALS
  patientProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  speciesAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  speciesAvatarImg: {
    width: 60,
    height: 60,
  },
  patientMetaCol: {
    flex: 1,
  },
  speciesPillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  speciesPillText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0369A1',
  },
  patientNameText: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  rfidTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  rfidTagIcon: {
    width: 12,
    height: 12,
    tintColor: '#64748B',
    marginRight: 4,
  },
  rfidTagText: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontWeight: '700',
    color: '#475569',
  },
  vitalsTelemetryGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  vitalTile: {
    flex: 1,
    alignItems: 'center',
  },
  vitalLabel: {
    fontSize: 10,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  vitalValueFever: {
    color: '#DC2626',
  },
  vitalSub: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#10B981',
    marginTop: 1,
  },
  vitalSubFever: {
    color: '#DC2626',
    fontWeight: '700',
  },

  // CARD 2: AI SCREENING
  aiScreeningCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  aiCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F5132',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiSparkleIcon: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
    marginRight: 5,
  },
  aiBadgePillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  confidenceGaugePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confidenceGaugeText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#047857',
  },
  aiSuspectedDisease: {
    fontSize: 18,
    fontFamily: FONT_BOLD,
    fontWeight: '900',
    color: '#0F5132',
    marginBottom: 10,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  disclaimerShieldIcon: {
    width: 16,
    height: 16,
    tintColor: '#059669',
    marginRight: 8,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#065F46',
    lineHeight: 15,
  },

  // CARD 3: MACROSCOPIC LESION EVIDENCE
  inspectBtnPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  inspectBtnText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#065F46',
  },
  lesionPhotoFrame: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  lesionPhotoImg: {
    width: '100%',
    height: '100%',
  },
  lesionBadgeOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lesionLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  lesionBadgeOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  // CARD 4: CLINICAL SIGNS & OBSERVATIONS
  symptomsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  symptomPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  symptomBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0F5132',
    marginRight: 6,
  },
  symptomPillLabel: {
    fontSize: 11.5,
    fontFamily: FONT_MEDIUM,
    color: '#1E293B',
  },
  farmerObservationBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  quoteIcon: {
    width: 14,
    height: 14,
    tintColor: '#D97706',
    marginRight: 6,
  },
  farmerObservationTitle: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#B45309',
  },
  farmerObservationQuote: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    fontStyle: 'italic',
    color: '#78350F',
    lineHeight: 18,
  },

  // CARD 5: FARMER PROFILE & LOCATION
  callFarmerTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F5132',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  callFarmerBtnIcon: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
    marginRight: 5,
  },
  callFarmerTopBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  farmerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginRight: 10,
  },
  farmerAvatarIcon: {
    width: 22,
    height: 22,
    tintColor: '#0F5132',
  },
  farmerMetaCol: {
    flex: 1,
  },
  farmerNameHeading: {
    fontSize: 14.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  farmerLocationString: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 2,
  },
  gisCoordinatesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  coordsCol: {
    flex: 1,
  },
  coordsLabel: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#64748B',
  },
  coordsVal: {
    fontSize: 11.5,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  viewOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  viewOnMapIcon: {
    width: 12,
    height: 12,
    tintColor: '#0369A1',
    marginRight: 4,
  },
  viewOnMapBtnText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0369A1',
  },

  // CARD 6: ATTENDING DOCTOR & CLINICAL RECORD
  doctorRecordCard: {
    backgroundColor: '#FAFDFB',
    borderColor: '#BBF7D0',
  },
  editRecordsBtn: {
    backgroundColor: '#0F5132',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editRecordsBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  assignedDoctorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 12,
  },
  assignedDoctorIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  assignedDoctorMeta: {
    flex: 1,
  },
  assignedDoctorEyebrow: {
    fontSize: 9,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  assignedDoctorNameMine: {
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#047857',
    marginTop: 1,
  },
  assignedDoctorNameOther: {
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
    marginTop: 1,
  },
  assignedDoctorUnclaimed: {
    fontSize: 12.5,
    fontFamily: FONT_MEDIUM,
    color: '#D97706',
    marginTop: 1,
  },
  clinicalRecordField: {
    marginBottom: 10,
  },
  clinicalRecordFieldLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  clinicalRecordFieldValBold: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
  },
  clinicalRecordFieldVal: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    color: '#1E293B',
    lineHeight: 18,
  },
  clinicalRecordFieldPending: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  rxPrescriptionSlip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginTop: 6,
  },
  rxSlipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rxSymbolBadge: {
    backgroundColor: '#0F5132',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rxSymbolText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '900',
  },
  rxSlipTitle: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
  },
  rxSlipContent: {
    fontSize: 12.5,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    color: '#1E293B',
    lineHeight: 18,
  },

  // CARD 7: ACTION COMMAND SUITE
  actionSuiteContainer: {
    marginBottom: 12,
  },
  primaryClaimBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F5132',
    paddingVertical: 15,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  claimBtnIconImg: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
    marginRight: 10,
  },
  primaryClaimBigBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  claimSubNotice: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F5132',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionBtnIcon: {
    width: 18,
    height: 18,
    tintColor: '#FFFFFF',
    marginRight: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  secondaryLabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  secondaryBtnIcon: {
    width: 16,
    height: 16,
    tintColor: '#0284C7',
    marginRight: 8,
  },
  secondaryLabBtnText: {
    color: '#0284C7',
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  outbreakActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  outbreakCordonBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    paddingVertical: 11,
    borderRadius: 14,
  },
  outbreakBtnIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  outbreakCordonBtnText: {
    color: '#7E22CE',
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  outbreakRingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#60A5FA',
    paddingVertical: 11,
    borderRadius: 14,
  },
  outbreakRingBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  lockedNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  lockIcon: {
    width: 18,
    height: 18,
    tintColor: '#64748B',
    marginRight: 10,
  },
  lockedNoticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#475569',
    lineHeight: 16,
  },

  // CARD 8: TIMELINE AUDIT
  timelineList: {
    marginTop: 8,
  },
  timelineItemRow: {
    flexDirection: 'row',
  },
  timelineMarkerCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineMilestoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F5132',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    marginTop: 3,
  },
  timelineVerticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  timelineContentBox: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 14,
  },
  timelineMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineStatusTitle: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineTimestamp: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
  },
  timelineUpdaterText: {
    fontSize: 11.5,
    fontFamily: FONT_MEDIUM,
    color: '#0F5132',
    marginTop: 1,
  },
  timelineNoteBody: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#475569',
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTimelineNotice: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 6,
  },

  // MODAL STYLING
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    maxHeight: '88%',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalBadgeText: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
    letterSpacing: 0.5,
  },
  modalSheetTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  modalScrollBody: {
    maxHeight: 460,
  },
  inputFormLabel: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  stageGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  stageSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  stageSelectPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#0F5132',
  },
  stageSelectPillText: {
    fontSize: 11.5,
    fontFamily: FONT_MEDIUM,
    color: '#475569',
  },
  stageSelectPillTextActive: {
    color: '#0F5132',
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  labChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  containmentChipActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#7E22CE',
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: FONT_REGULAR,
    color: '#0F172A',
    marginBottom: 4,
  },
  formTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  rxTextArea: {
    backgroundColor: '#FAFDFB',
    borderColor: '#A7F3D0',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
  },
  modalInfoBox: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  modalInfoBoxText: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#475569',
    lineHeight: 15,
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#475569',
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // FULLSCREEN IMAGE VIEWER
  fullscreenModalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseCircle: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fullscreenCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.9,
  },
  fullscreenFooterBadge: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fullscreenFooterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
});
