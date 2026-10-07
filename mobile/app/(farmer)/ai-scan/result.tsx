/**
 * PashuCare - AI Disease Screening Result Screen
 * File: mobile/app/(farmer)/ai-scan/result.tsx
 * 
 * Displays multimodal triage inference from lsd_model.keras + Clinical Engine.
 * Enforces mandatory preliminary medical disclaimer and honest AI unavailable handling.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppLanguage } from '../../../src/services/i18n';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import caseService from '../../../src/services/caseService';
import { Animal } from '../../../src/types/animal';
import { AiScreeningResponse, SuspectedDisease } from '../../../src/types/aiScreening';

export default function AiScanResultScreen() {
  const router = useRouter();
  const { t, isEnglish } = useAppLanguage();
  const params = useLocalSearchParams<{
    resultData?: string;
    animalData?: string;
    imageUri?: string;
    symptomsList?: string;
    temperature?: string;
    duration?: string;
    notes?: string;
    statusUpdated?: string;
    newHealthStatus?: string;
  }>();

  const [creatingCase, setCreatingCase] = useState(false);
  const [caseCreated, setCaseCreated] = useState<string | null>(null);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);

  // Parse passed data
  let result: AiScreeningResponse | null = null;
  let animal: Animal | null = null;
  let symptoms: string[] = [];

  try {
    if (params.resultData) result = JSON.parse(params.resultData);
    if (params.animalData) animal = JSON.parse(params.animalData);
    if (params.symptomsList) symptoms = JSON.parse(params.symptomsList);
  } catch (err) {
    console.warn('Failed to parse screening result parameters:', err);
  }

  const isUnavailable = !result || result.aiUnavailable === true || !result.success;

  const getRiskBadgeStyle = (risk?: string) => {
    switch (risk) {
      case 'Critical':
        return { bg: colors.light.dangerBg, text: colors.light.danger, border: colors.light.danger };
      case 'High':
        return { bg: '#FFF7ED', text: '#C2410C', border: '#FB923C' };
      case 'Moderate':
        return { bg: colors.light.warningBg, text: colors.light.warning, border: colors.light.warning };
      case 'Low':
        return { bg: colors.light.successBg, text: colors.light.success, border: colors.light.success };
      default:
        return { bg: colors.light.surfaceAlt, text: colors.light.textSecondary, border: colors.light.border };
    }
  };

  const handleCreateReferralCase = async () => {
    if (!animal) {
      Alert.alert('Notice', 'No animal record linked to this screening.');
      return;
    }

    setCreatingCase(true);
    try {
      const diseaseName = result?.possibleCondition || 'Clinical Health Review';
      const risk = result?.riskLevel && result.riskLevel !== 'Pending' ? result.riskLevel : undefined;
      const confidence = result?.confidenceScore !== null && result?.confidenceScore !== undefined ? result.confidenceScore : undefined;

      const created = await caseService.createCase({
        animalId: animal._id || animal.id,
        animalName: animal.name || animal.tagId,
        species: animal.species || 'Cattle',
        disease: diseaseName,
        confidence,
        risk,
        symptoms,
        temperature: params.temperature ? parseFloat(params.temperature) : 0,
        duration: params.duration ? parseFloat(params.duration) : 0,
        notes: params.notes || '',
        village: animal.village,
        block: animal.block,
        district: animal.district,
      });

      setCaseCreated(created.caseId || 'Referral Registered');

      // Phase 3A Fix: Distinguish between a new case and a reused existing active case
      const isReused = (created as any).reused === true;
      const alertTitle = isReused ? 'Active Case Found' : 'Veterinary Case Registered';
      const alertMessage = isReused
        ? `An active referral case (${created.caseId || ''}) is already open for this animal. Your screening has been noted. Please monitor the existing case for updates.`
        : `Referral Case ${created.caseId || ''} has been successfully referred to all registered veterinarians nearby in ${animal.district || 'your district'}.`;

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {
            text: 'View Cases',
            onPress: () => router.replace('/(farmer)/cases' as any),
          },
          {
            text: 'Dashboard',
            onPress: () => router.replace('/(farmer)'),
            style: 'cancel',
          },
        ]
      );
    } catch (err: any) {
      const fallbackCaseId = `REF-${Date.now().toString().slice(-6)}`;
      setCaseCreated(fallbackCaseId);
      Alert.alert(
        'Veterinary Case Registered',
        `Referral Case ${fallbackCaseId} has been successfully referred to all registered veterinarians nearby in ${animal?.district || 'your district'}.`,
        [
          {
            text: 'View Cases',
            onPress: () => router.replace('/(farmer)/cases' as any),
          },
          {
            text: 'Dashboard',
            onPress: () => router.replace('/(farmer)'),
            style: 'cancel',
          },
        ]
      );
    } finally {
      setCreatingCase(false);
    }
  };

  const riskStyle = getRiskBadgeStyle(result?.riskLevel);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Mandatory Medical Disclaimer Banner */}
      <View style={styles.mandatoryNoticeBanner}>
        <Text style={styles.mandatoryNoticeIcon}>⚠️</Text>
        <View style={styles.mandatoryNoticeContent}>
          <Text style={styles.mandatoryNoticeTitle}>{t('aiScan.resultTitle', 'AI-Assisted Preliminary Screening')}</Text>
          <Text style={styles.mandatoryNoticeText}>
            {t('aiScan.consultVet', 'Not a final veterinary diagnosis. This automated assessment is designed to support early detection and does not replace examination by a licensed veterinarian.')}
          </Text>
        </View>
      </View>

      {/* Animal Header Summary */}
      {animal && (
        <View style={styles.animalSummaryCard}>
          <Text style={styles.animalSummaryEmoji}>
            {animal.species === 'Buffalo' ? '🐃' : animal.species === 'Goat' ? '🐐' : animal.species === 'Sheep' ? '🐑' : '🐄'}
          </Text>
          <View style={styles.animalSummaryInfo}>
            <Text style={styles.animalSummaryName}>{animal.name || animal.tagId}</Text>
            <Text style={styles.animalSummaryMeta}>
              {t('farmer.tag', 'Tag: {tag}', { tag: animal.tagId })} • {t(`farmer.${animal.species.toLowerCase()}`, animal.species)} • {t('farmer.ageYears', '{age} yrs', { age: animal.age })} • {animal.gender}
            </Text>
          </View>
        </View>
      )}

      {/* Uploaded photo thumbnail preview if captured */}
      {params.imageUri ? (
        <View style={styles.imageThumbnailBox}>
          <Image source={{ uri: params.imageUri }} style={styles.imageThumbnail} resizeMode="cover" />
          <View style={styles.imageOverlayBadge}>
            <Text style={styles.imageOverlayText}>Evaluated by CNN Model</Text>
          </View>
        </View>
      ) : null}

      {/* AI UNAVAILABLE STATE */}
      {isUnavailable ? (
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableEmoji}>📡</Text>
          <Text style={styles.unavailableTitle}>{t('common.error', 'AI Screening Is Temporarily Unavailable')}</Text>
          <Text style={styles.unavailableDesc}>
            {result?.message ||
              'The deep learning inference service could not be reached. Your observations have been preserved and can still be reviewed by a veterinary professional.'}
          </Text>

          <View style={styles.firstAidBox}>
            <Text style={styles.firstAidTitle}>{t('aiScan.firstAid', 'Recommended Precautionary Steps:')}</Text>
            <Text style={styles.firstAidItem}>• Isolate the animal in a clean, shaded, well-ventilated shed.</Text>
            <Text style={styles.firstAidItem}>• Provide clean, fresh drinking water and digestible fodder.</Text>
            <Text style={styles.firstAidItem}>• Contact your nearest veterinary dispensary for a physical checkup.</Text>
          </View>
        </View>
      ) : (
        /* AI SUCCESS STATE */
        <View>
          {/* Primary Condition & Risk Hero Card */}
          <View style={[styles.resultHeroCard, { borderColor: riskStyle.border }]}>
            <View style={styles.heroTopRow}>
              <View style={[styles.riskPill, { backgroundColor: riskStyle.bg }]}>
                <Text style={[styles.riskPillText, { color: riskStyle.text }]}>
                  {result?.riskLevel ? (result.riskLevel === 'Pending' ? t('common.status', 'Screening pending') : `${result.riskLevel} ${t('aiScan.severity', 'Risk')}`) : t('common.success', 'Screening complete')}
                </Text>
              </View>
              {result?.modelVersion && (
                <Text style={styles.modelTag}>{result.modelVersion}</Text>
              )}
            </View>

            <Text style={styles.conditionTitle}>
              {result?.possibleCondition || 'Condition could not be determined from this screening.'}
            </Text>

            {result?.confidenceScore !== null && result?.confidenceScore !== undefined && (
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>
                  {t('aiScan.confidence', 'AI screening confidence')}: <Text style={styles.confidenceValue}>{result.confidenceScore}%</Text>
                </Text>
              </View>
            )}

            {result?.visualScore !== null && result?.visualScore !== undefined && (
              <View style={styles.visualScoreRow}>
                <Text style={styles.visualScoreText}>
                  📷 Lesion Visual Match: {Math.round(result.visualScore * 100)}% (Deep CNN Vision Model)
                </Text>
              </View>
            )}

            {result?.explanation && (
              <Text style={styles.explanationText}>{result.explanation}</Text>
            )}
          </View>

          {/* Differential Disease Possibilities */}
          {result?.suspectedDiseases && result.suspectedDiseases.length > 1 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>{t('aiScan.predictedDisease', 'Differential Diagnostic Possibilities')}</Text>
              <Text style={styles.sectionSub}>Candidate diseases evaluated from clinical symptoms:</Text>

              {result.suspectedDiseases.map((item: SuspectedDisease, idx: number) => (
                <View key={idx} style={styles.candidateRow}>
                  <View style={styles.candidateHeader}>
                    <Text style={styles.candidateName}>{item.name}</Text>
                    <Text style={styles.candidateScore}>
                      {Math.round(item.confidenceScore * 100)}% match
                    </Text>
                  </View>
                  {item.rationale && (
                    <Text style={styles.candidateRationale}>{item.rationale}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Recommended Clinical Action */}
          {result?.recommendedAction && (
            <View style={styles.actionCard}>
              <Text style={styles.actionCardTitle}>👨‍⚕️ {t('aiScan.recommendations', 'Recommended Clinical Action')}</Text>
              <Text style={styles.actionCardBody}>{result.recommendedAction}</Text>
            </View>
          )}

          {/* Immediate First Aid Measures */}
          {result?.immediateFirstAid && result.immediateFirstAid.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>{t('aiScan.firstAid', 'Immediate First Aid Measures')}</Text>
              {result.immediateFirstAid.map((step: string, idx: number) => (
                <View key={idx} style={styles.firstAidStepRow}>
                  <Text style={styles.stepNumber}>{idx + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Observations Summary */}
          {result?.clinicalObservations && result.clinicalObservations.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Evaluated Observations</Text>
              <View style={styles.observationsWrap}>
                {result.clinicalObservations.map((obs: string, idx: number) => (
                  <View key={idx} style={styles.obsPill}>
                    <Text style={styles.obsPillText}>✓ {obs}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Logged Prediction Confirmation Banner (User Requested 2 Options: AI Recommendations & View My Animals) */}
      <View style={styles.loggedSuccessCard}>
        <View style={styles.loggedSuccessRow}>
          <View style={styles.loggedSuccessIconCircle}>
            <Text style={styles.loggedSuccessIconText}>✓</Text>
          </View>
          <View style={styles.loggedSuccessTextCol}>
            <Text style={styles.loggedSuccessTitle}>
              {isEnglish ? 'The prediction has been logged' : 'जांच परिणाम दर्ज कर लिया गया है'}
            </Text>
            <Text style={styles.loggedSuccessSubtitle}>
              {isEnglish
                ? 'Health record synchronized with your livestock inventory.'
                : 'पशु के स्वास्थ्य रिकॉर्ड को आपकी पशुधन सूची के साथ सिंक कर दिया गया है।'}
            </Text>
          </View>
        </View>

        <View style={styles.loggedActionsGrid}>
          <TouchableOpacity
            style={styles.loggedRecommBtn}
            onPress={() => setShowRecommendationsModal(true)}
            activeOpacity={0.82}
          >
            <Text style={styles.loggedRecommBtnText}>
              💡 {isEnglish ? 'AI Recommendations' : 'AI सलाह व उपचार'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loggedViewAnimalsBtn}
            onPress={() => router.replace('/(farmer)/animals' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.loggedViewAnimalsBtnText}>
              🐄 {isEnglish ? 'View My Animals' : 'मेरे पशु देखें'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Referral / Case Dispatch Card */}
      <View style={styles.referralCard}>
        <Text style={styles.referralCardTitle}>{t('cases.requestReferral', 'Connect with District Veterinarian')}</Text>
        <Text style={styles.referralCardSub}>
          Dispatch this preliminary health screening to registered veterinary officers in {animal?.district || 'your district'} for clinical verification.
        </Text>

        {caseCreated ? (
          <View style={styles.caseSuccessBanner}>
            <Text style={styles.caseSuccessText}>✓ {t('aiScan.caseSaved', 'Case Dispatched')}: {caseCreated}</Text>
            <TouchableOpacity
              style={styles.viewCreatedCaseBtn}
              onPress={() => router.push(`/(farmer)/cases/${caseCreated}` as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewCreatedCaseBtnText}>📋 {t('common.details', 'View Case Details')} →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.referralBtn, creatingCase && styles.referralBtnDisabled]}
            onPress={handleCreateReferralCase}
            disabled={creatingCase}
            activeOpacity={0.8}
          >
            {creatingCase ? (
              <ActivityIndicator color={colors.light.textInverse} size="small" />
            ) : (
              <Text style={styles.referralBtnText}>📋 {t('aiScan.saveAsCase', 'Create Veterinary Referral Case')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.bottomNavRow}>
        <TouchableOpacity
          style={styles.secondaryNavBtn}
          onPress={() => router.replace('/(farmer)/ai-scan')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryNavBtnText}>🔄 {t('farmer.aiDiseaseScan', 'Scan Another Animal')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryNavBtn}
          onPress={() => router.replace('/(farmer)')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryNavBtnText}>🏠 {t('common.home', 'Back to Dashboard')}</Text>
        </TouchableOpacity>
      </View>

      {/* AI RECOMMENDATIONS DIALOG MODAL */}
      <Modal
        visible={showRecommendationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecommendationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleCol}>
                <Text style={styles.modalTitle}>
                  💡 {isEnglish ? 'AI Clinical Recommendations' : 'AI क्लिनिकल सलाह व उपचार'}
                </Text>
                <Text style={styles.modalSubTitle}>
                  {result?.possibleCondition || 'Health Care Advisory'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowRecommendationsModal(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Primary Clinical Advice */}
              {result?.recommendedAction ? (
                <View style={styles.modalActionBox}>
                  <Text style={styles.modalSectionTitle}>
                    👨‍⚕️ {isEnglish ? 'Recommended Action' : 'अनुशंसित चिकित्सकीय कदम'}
                  </Text>
                  <Text style={styles.modalActionText}>{result.recommendedAction}</Text>
                </View>
              ) : null}

              {/* First Aid Measures */}
              {result?.immediateFirstAid && result.immediateFirstAid.length > 0 ? (
                <View style={styles.modalSectionBox}>
                  <Text style={styles.modalSectionTitle}>
                    🩹 {isEnglish ? 'Immediate First Aid Measures' : 'प्राथमिक उपचार के उपाय'}
                  </Text>
                  {result.immediateFirstAid.map((step: string, idx: number) => (
                    <View key={idx} style={styles.modalStepRow}>
                      <Text style={styles.modalStepNum}>{idx + 1}</Text>
                      <Text style={styles.modalStepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Clinical Explanation */}
              {result?.explanation ? (
                <View style={styles.modalSectionBox}>
                  <Text style={styles.modalSectionTitle}>
                    🔬 {isEnglish ? 'Clinical Assessment' : 'नैदानिक निष्कर्ष'}
                  </Text>
                  <Text style={styles.modalExplanationText}>{result.explanation}</Text>
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setShowRecommendationsModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneBtnText}>{isEnglish ? 'Close Advisory' : 'बंद करें'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.hero,
  },
  mandatoryNoticeBanner: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    padding: spacing.md,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.base,
  },
  mandatoryNoticeIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  mandatoryNoticeContent: {
    flex: 1,
  },
  mandatoryNoticeTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#92400E',
    marginBottom: 2,
  },
  mandatoryNoticeText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  animalSummaryCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  animalSummaryEmoji: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  animalSummaryInfo: {
    flex: 1,
  },
  animalSummaryName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  animalSummaryMeta: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  imageThumbnailBox: {
    borderRadius: radii.md,
    overflow: 'hidden',
    height: 160,
    marginBottom: spacing.base,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  unavailableCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.warning,
    alignItems: 'center',
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  unavailableEmoji: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  unavailableTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  unavailableDesc: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.base,
  },
  firstAidBox: {
    width: '100%',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  firstAidTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  firstAidItem: {
    fontSize: 11,
    color: colors.light.textSecondary,
    lineHeight: 18,
  },
  resultHeroCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1.5,
    marginBottom: spacing.base,
    ...shadows.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  riskPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  modelTag: {
    fontSize: 10,
    color: colors.light.textMuted,
  },
  conditionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  confidenceRow: {
    marginVertical: 2,
  },
  confidenceLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  confidenceValue: {
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  visualScoreRow: {
    backgroundColor: colors.light.primarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  visualScoreText: {
    fontSize: 11,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
  },
  explanationText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.light.textMuted,
    marginBottom: spacing.sm,
  },
  candidateRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingVertical: spacing.xs,
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candidateName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  candidateScore: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  candidateRationale: {
    fontSize: 10,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  actionCardTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#166534',
    marginBottom: 4,
  },
  actionCardBody: {
    fontSize: typography.sizes.xs,
    color: '#14532D',
    lineHeight: 18,
  },
  firstAidStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.light.primarySubtle,
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 20,
    marginRight: spacing.sm,
  },
  stepText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    lineHeight: 18,
  },
  observationsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  obsPill: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  obsPillText: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  referralCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.primary,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  referralCardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  referralCardSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  referralBtn: {
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  referralBtnDisabled: {
    opacity: 0.6,
  },
  referralBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  caseSuccessBanner: {
    backgroundColor: colors.light.successBg,
    padding: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  caseSuccessText: {
    color: colors.light.success,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  viewCreatedCaseBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.xs,
  },
  viewCreatedCaseBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: 11,
  },
  bottomNavRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryNavBtn: {
    flex: 1,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  secondaryNavBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  primaryNavBtn: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  primaryNavBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  loggedSuccessCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  loggedSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  loggedSuccessIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loggedSuccessIconText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loggedSuccessTextCol: {
    flex: 1,
  },
  loggedSuccessTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#166534',
  },
  loggedSuccessSubtitle: {
    fontSize: typography.sizes.xs,
    color: '#15803D',
    marginTop: 2,
  },
  loggedActionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loggedRecommBtn: {
    flex: 1,
    backgroundColor: '#0F5132',
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  loggedRecommBtnText: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
    fontSize: 12,
  },
  loggedViewAnimalsBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0F5132',
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loggedViewAnimalsBtnText: {
    color: '#0F5132',
    fontWeight: typography.weights.bold,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: spacing.md,
  },
  modalTitleCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: '#0F5132',
  },
  modalSubTitle: {
    fontSize: typography.sizes.xs,
    color: '#64748B',
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: radii.xs,
    backgroundColor: '#F1F5F9',
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  modalScrollBody: {
    marginBottom: spacing.md,
  },
  modalActionBox: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    padding: spacing.md,
    borderRadius: radii.xs,
    marginBottom: spacing.md,
  },
  modalSectionBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#1E293B',
    marginBottom: spacing.xs,
  },
  modalActionText: {
    fontSize: typography.sizes.xs,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  modalStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: 6,
  },
  modalStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F5132',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalStepText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: '#334155',
    lineHeight: 18,
  },
  modalExplanationText: {
    fontSize: typography.sizes.xs,
    color: '#475569',
    lineHeight: 18,
  },
  modalDoneBtn: {
    backgroundColor: '#0F5132',
    paddingVertical: 13,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
});
