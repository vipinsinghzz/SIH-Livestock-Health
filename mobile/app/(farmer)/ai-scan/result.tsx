/**
 * Livestock Saathi - AI Disease Screening Result Screen
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import caseService from '../../../src/services/caseService';
import { Animal } from '../../../src/types/animal';
import { AiScreeningResponse, SuspectedDisease } from '../../../src/types/aiScreening';

export default function AiScanResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    resultData?: string;
    animalData?: string;
    imageUri?: string;
    symptomsList?: string;
    temperature?: string;
    duration?: string;
    notes?: string;
  }>();

  const [creatingCase, setCreatingCase] = useState(false);
  const [caseCreated, setCaseCreated] = useState<string | null>(null);

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

      Alert.alert(
        'Veterinary Case Registered',
        `Referral Case ${created.caseId || ''} has been registered and dispatched to veterinary officials in ${animal.district || 'your district'}.`,
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
      Alert.alert('Referral Notice', err.message || 'Unable to register referral case at this time. Please retry.');
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
          <Text style={styles.mandatoryNoticeTitle}>AI-Assisted Preliminary Screening</Text>
          <Text style={styles.mandatoryNoticeText}>
            Not a final veterinary diagnosis. This automated assessment is designed to support early detection and does not replace examination by a licensed veterinarian.
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
              Tag: {animal.tagId} • {animal.species} • {animal.age} yrs • {animal.gender}
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
          <Text style={styles.unavailableTitle}>AI Screening Is Temporarily Unavailable</Text>
          <Text style={styles.unavailableDesc}>
            {result?.message ||
              'The deep learning inference service could not be reached. Your observations have been preserved and can still be reviewed by a veterinary professional.'}
          </Text>

          <View style={styles.firstAidBox}>
            <Text style={styles.firstAidTitle}>Recommended Precautionary Steps:</Text>
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
                  {result?.riskLevel ? (result.riskLevel === 'Pending' ? 'Screening pending' : `${result.riskLevel} Risk`) : 'Screening complete'}
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
                  AI screening confidence: <Text style={styles.confidenceValue}>{result.confidenceScore}%</Text>
                </Text>
              </View>
            )}

            {result?.visualScore !== null && result?.visualScore !== undefined && (
              <View style={styles.visualScoreRow}>
                <Text style={styles.visualScoreText}>
                  📷 Lesion Visual Match: {Math.round(result.visualScore * 100)}% (lsd_model.keras)
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
              <Text style={styles.sectionHeading}>Differential Diagnostic Possibilities</Text>
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
              <Text style={styles.actionCardTitle}>👨‍⚕️ Recommended Clinical Action</Text>
              <Text style={styles.actionCardBody}>{result.recommendedAction}</Text>
            </View>
          )}

          {/* Immediate First Aid Measures */}
          {result?.immediateFirstAid && result.immediateFirstAid.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Immediate First Aid Measures</Text>
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

      {/* Referral / Case Dispatch Card */}
      <View style={styles.referralCard}>
        <Text style={styles.referralCardTitle}>Connect with District Veterinarian</Text>
        <Text style={styles.referralCardSub}>
          Dispatch this preliminary health screening to registered veterinary officers in {animal?.district || 'your district'} for clinical verification.
        </Text>

        {caseCreated ? (
          <View style={styles.caseSuccessBanner}>
            <Text style={styles.caseSuccessText}>✓ Case Dispatched: {caseCreated}</Text>
            <TouchableOpacity
              style={styles.viewCreatedCaseBtn}
              onPress={() => router.push(`/(farmer)/cases/${caseCreated}` as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewCreatedCaseBtnText}>📋 View Case Details →</Text>
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
              <Text style={styles.referralBtnText}>📋 Create Veterinary Referral Case</Text>
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
          <Text style={styles.secondaryNavBtnText}>🔄 Scan Another Animal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryNavBtn}
          onPress={() => router.replace('/(farmer)')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryNavBtnText}>🏠 Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
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
});
