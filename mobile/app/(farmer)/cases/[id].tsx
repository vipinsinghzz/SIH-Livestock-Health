/**
 * Livestock Saathi - Case Details Screen
 * File: mobile/app/(farmer)/cases/[id].tsx
 * 
 * Production-integrated view of a single disease referral case, displaying real clinical
 * findings, 5-stage lifecycle progress, AI confidence (with disclaimers), and assigned veterinary details.
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
  Linking,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { caseService } from '../../../src/services/caseService';
import {
  DiseaseCase,
  normalizeCaseStatus,
  getStatusTheme,
  getRiskTheme,
  NormalizedCaseStatus,
} from '../../../src/types/case';

const LIFECYCLE_STAGES: { stage: NormalizedCaseStatus; label: string; icon: string }[] = [
  { stage: 'New', label: 'New', icon: '🆕' },
  { stage: 'Investigating', label: 'Investigating', icon: '🔍' },
  { stage: 'Confirmed', label: 'Confirmed', icon: '⚠️' },
  { stage: 'Containment', label: 'Containment', icon: '🛡️' },
  { stage: 'Resolved', label: 'Resolved', icon: '✅' },
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

  const [caseDoc, setCaseDoc] = useState<DiseaseCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const loadCaseDetails = useCallback(async (isPullToRefresh = false) => {
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
        setErrorMessage('Case not found.');
      } else if (status === 403) {
        setErrorMessage('Access denied: You are not authorized to view another farmer’s case.');
      } else if (err.message && err.message.includes('Network')) {
        setErrorMessage('Unable to load case information. Please check your connection.');
      } else if (status >= 500) {
        setErrorMessage('Something went wrong while loading this case.');
      } else {
        setErrorMessage('Unable to retrieve case details. Please check your connection and retry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadCaseDetails();
  }, [loadCaseDetails]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Date not available';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date not available';
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
      return `${dur} hrs (${days} day${days === '1' ? '' : 's'})`;
    }
    return `${dur} hrs`;
  };

  const handleCallVet = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading case details...</Text>
      </View>
    );
  }

  if (errorMessage || !caseDoc) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorIcon}>{errorStatus === 404 ? '🔍' : errorStatus === 403 ? '🔒' : '⚠️'}</Text>
        <Text style={styles.errorTitle}>
          {errorStatus === 404 ? 'Not Found' : errorStatus === 403 ? 'Access Restricted' : 'Unable to Load'}
        </Text>
        <Text style={styles.errorText}>{errorMessage || 'Case information could not be retrieved.'}</Text>
        <View style={styles.errorBtnRow}>
          {errorStatus !== 404 && errorStatus !== 403 && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => loadCaseDetails()} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>🔄 Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.secondaryBtnText}>← Back to Cases</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentStage = normalizeCaseStatus(caseDoc.status);
  const currentStageIndex = STAGE_ORDER[currentStage] ?? 0;
  const statusTheme = getStatusTheme(caseDoc.status);
  const riskTheme = getRiskTheme(caseDoc.risk);

  const animal = typeof caseDoc.animalId === 'object' && caseDoc.animalId !== null ? caseDoc.animalId : null;
  const animalIdString = animal?._id || (typeof caseDoc.animalId === 'string' ? caseDoc.animalId : null);

  const hasTimeline = Array.isArray(caseDoc.timeline) && caseDoc.timeline.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadCaseDetails(true)}
          colors={[colors.light.primary]}
          tintColor={colors.light.primary}
        />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.light.primary} />

      {/* Header Summary Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.caseIdBadge}>
            <Text style={styles.caseIdText}>{caseDoc.caseId}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusTheme.bgColor, borderColor: statusTheme.borderColor },
            ]}
          >
            <Text style={styles.statusBadgeIcon}>{statusTheme.icon}</Text>
            <Text style={[styles.statusBadgeText, { color: statusTheme.color }]}>
              {statusTheme.label}
            </Text>
          </View>
        </View>

        <Text style={styles.diseaseName}>{caseDoc.disease}</Text>

        <View style={styles.badgesRow}>
          <View
            style={[
              styles.riskBadge,
              { backgroundColor: riskTheme.bgColor, borderColor: riskTheme.borderColor },
            ]}
          >
            <Text style={[styles.riskBadgeText, { color: riskTheme.color }]}>
              {riskTheme.label}
            </Text>
          </View>
          <Text style={styles.timestampText}>Logged: {formatDate(caseDoc.createdAt)}</Text>
        </View>
      </View>

      {/* 5-Stage Lifecycle Progress Visualizer */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Clinical Case Progress</Text>
        <Text style={styles.sectionCardSub}>
          Current stage:{' '}
          <Text style={{ fontWeight: typography.weights.bold, color: statusTheme.color }}>
            {statusTheme.label}
          </Text>
        </Text>

        <View style={styles.stageTimelineContainer}>
          {LIFECYCLE_STAGES.map((step, idx) => {
            const isCurrent = step.stage === currentStage;
            const isPassed = idx <= currentStageIndex;

            return (
              <View key={step.stage} style={styles.stageNode}>
                <View
                  style={[
                    styles.stageCircle,
                    isCurrent && { backgroundColor: statusTheme.color, borderColor: statusTheme.color },
                    isPassed && !isCurrent && styles.stageCirclePassed,
                    !isPassed && styles.stageCirclePending,
                  ]}
                >
                  <Text style={styles.stageIconText}>{step.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.stageLabel,
                    isCurrent && { color: statusTheme.color, fontWeight: typography.weights.bold },
                    !isPassed && styles.stageLabelPending,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
                {idx < LIFECYCLE_STAGES.length - 1 && (
                  <View
                    style={[
                      styles.stageConnectingLine,
                      idx < currentStageIndex && styles.stageConnectingLinePassed,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Animal Link Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Associated Animal</Text>
        {animal ? (
          <View style={styles.animalProfileBox}>
            <View style={styles.animalProfileRow}>
              <Text style={styles.animalLargeIcon}>
                {(animal.species || caseDoc.species || '').toLowerCase().includes('buffalo')
                  ? '🐃'
                  : (animal.species || caseDoc.species || '').toLowerCase().includes('goat')
                  ? '🐐'
                  : (animal.species || caseDoc.species || '').toLowerCase().includes('sheep')
                  ? '🐑'
                  : '🐄'}
              </Text>
              <View style={styles.animalProfileInfo}>
                <Text style={styles.animalProfileName}>{animal.name || caseDoc.animalName || 'Unnamed Animal'}</Text>
                <Text style={styles.animalProfileMeta}>
                  Tag: #{animal.tagId || 'N/A'} • {animal.species || caseDoc.species || 'Livestock'}
                  {animal.breed ? ` • ${animal.breed}` : ''}
                </Text>
              </View>
            </View>

            {animalIdString && (
              <TouchableOpacity
                style={styles.viewAnimalBtn}
                onPress={() => router.push(`/(farmer)/animals/${animalIdString}` as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.viewAnimalBtnText}>View Animal Profile →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.unlinkedAnimalBox}>
            <Text style={styles.unlinkedAnimalIcon}>ℹ️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlinkedAnimalTitle}>
                {caseDoc.animalName || caseDoc.species || 'Direct Symptom Report'}
              </Text>
              <Text style={styles.unlinkedAnimalSub}>
                Species: {caseDoc.species || 'Cattle'} • Not linked to an individual herd profile.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Reported Symptoms & Vitals Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Reported Clinical Observations</Text>

        {caseDoc.symptoms && caseDoc.symptoms.length > 0 ? (
          <View style={styles.symptomsWrap}>
            {caseDoc.symptoms.map((sym, idx) => (
              <View key={idx} style={styles.symptomChip}>
                <Text style={styles.symptomChipText}>• {sym}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyFieldText}>No specific symptom tags recorded.</Text>
        )}

        {/* Vitals Grid */}
        <View style={styles.vitalsRow}>
          {typeof caseDoc.temperature === 'number' && caseDoc.temperature > 0 && (
            <View style={styles.vitalCard}>
              <Text style={styles.vitalIcon}>🌡️</Text>
              <Text style={styles.vitalValue}>{formatTemperature(caseDoc.temperature)}</Text>
              <Text style={styles.vitalLabel}>Body Temp</Text>
            </View>
          )}

          {typeof caseDoc.duration === 'number' && caseDoc.duration > 0 && (
            <View style={styles.vitalCard}>
              <Text style={styles.vitalIcon}>⏱️</Text>
              <Text style={styles.vitalValue}>{formatDuration(caseDoc.duration)}</Text>
              <Text style={styles.vitalLabel}>Symptom Duration</Text>
            </View>
          )}

          {typeof caseDoc.affectedCount === 'number' && caseDoc.affectedCount > 1 && (
            <View style={styles.vitalCard}>
              <Text style={styles.vitalIcon}>👥</Text>
              <Text style={styles.vitalValue}>{caseDoc.affectedCount}</Text>
              <Text style={styles.vitalLabel}>Animals Affected</Text>
            </View>
          )}
        </View>

        {caseDoc.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesBoxTitle}>Farmer Notes:</Text>
            <Text style={styles.notesBoxText}>{caseDoc.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* AI Screening Assessment (with Mandatory Disclaimer) */}
      {typeof caseDoc.confidence === 'number' && caseDoc.confidence > 0 && (
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <Text style={styles.aiCardTitle}>🤖 AI Screening Assessment</Text>
            <View style={styles.aiScoreBadge}>
              <Text style={styles.aiScoreText}>Score: {Math.round(caseDoc.confidence)}%</Text>
            </View>
          </View>

          {/* Mandatory Medical Disclaimer Banner */}
          <View style={styles.disclaimerBanner}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.disclaimerTitle}>AI-Assisted Preliminary Screening</Text>
              <Text style={styles.disclaimerText}>
                Not a final veterinary diagnosis. This automated assessment supports early outbreak detection and does not replace examination by a certified veterinarian.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Veterinary Referral & Assigned Official Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Veterinary Official Referral</Text>

        {caseDoc.assignedVetId ? (
          <View style={styles.vetCard}>
            <View style={styles.vetHeaderRow}>
              <Text style={styles.vetEmoji}>👨‍⚕️</Text>
              <View style={styles.vetInfo}>
                <Text style={styles.vetName}>{caseDoc.assignedVetId.name}</Text>
                <Text style={styles.vetDept}>
                  {caseDoc.assignedVetId.department || 'Animal Husbandry Department'}
                </Text>
                {caseDoc.assignedVetId.registrationNo ? (
                  <Text style={styles.vetReg}>
                    Reg No: {caseDoc.assignedVetId.registrationNo}
                  </Text>
                ) : null}
              </View>
            </View>

            {caseDoc.assignedVetId.phone ? (
              <TouchableOpacity
                style={styles.callVetBtn}
                onPress={() => handleCallVet(caseDoc.assignedVetId?.phone)}
                activeOpacity={0.8}
              >
                <Text style={styles.callVetBtnText}>📞 Call Veterinarian ({caseDoc.assignedVetId.phone})</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.pendingReferralBox}>
            <Text style={styles.pendingReferralIcon}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingReferralTitle}>Veterinary Referral Pending</Text>
              <Text style={styles.pendingReferralText}>
                Case has been dispatched to registered veterinary officers in {caseDoc.districtId || 'your district'}. A licensed official will review symptoms and update clinical findings.
              </Text>
              <Text style={styles.pendingWorkflowNote}>
                Veterinary referral is managed through the official veterinary workflow.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Clinical Diagnosis & Investigation Notes (From Veterinarian) */}
      {(caseDoc.clinicalDiagnosis || caseDoc.investigationNotes || caseDoc.treatmentNotes || caseDoc.prescription) && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Clinical Findings & Treatment</Text>

          {caseDoc.clinicalDiagnosis ? (
            <View style={styles.findingItem}>
              <Text style={styles.findingItemLabel}>Veterinary Diagnosis:</Text>
              <Text style={styles.findingItemValue}>{caseDoc.clinicalDiagnosis}</Text>
            </View>
          ) : null}

          {caseDoc.investigationNotes ? (
            <View style={styles.findingItem}>
              <Text style={styles.findingItemLabel}>Investigation Findings:</Text>
              <Text style={styles.findingItemValue}>{caseDoc.investigationNotes}</Text>
            </View>
          ) : null}

          {caseDoc.treatmentNotes ? (
            <View style={styles.findingItem}>
              <Text style={styles.findingItemLabel}>Treatment Administered:</Text>
              <Text style={styles.findingItemValue}>{caseDoc.treatmentNotes}</Text>
            </View>
          ) : null}

          {caseDoc.prescription ? (
            <View style={styles.findingItem}>
              <Text style={styles.findingItemLabel}>Prescription & Directives:</Text>
              <Text style={styles.findingItemValue}>{caseDoc.prescription}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Detailed Chronological History / Timeline */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Status History Log</Text>

        {hasTimeline ? (
          <View style={styles.timelineList}>
            {caseDoc.timeline!.map((event, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTop}>
                    <Text style={styles.timelineStatus}>{event.status || 'Update'}</Text>
                    <Text style={styles.timelineTime}>{formatDate(event.timestamp)}</Text>
                  </View>
                  {event.updaterName ? (
                    <Text style={styles.timelineUpdater}>By: {event.updaterName}</Text>
                  ) : null}
                  {event.notes ? (
                    <Text style={styles.timelineNotes}>{event.notes}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noHistoryBox}>
            <Text style={styles.noHistoryText}>Detailed status history is not available for this case.</Text>
          </View>
        )}
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backBtnText}>← Back to Cases</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.newScanBtn}
          onPress={() => router.push('/(farmer)/ai-scan' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.newScanBtnText}>📷 New AI Scan</Text>
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
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.light.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  errorBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  primaryBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  secondaryBtn: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  secondaryBtnText: {
    color: colors.light.textPrimary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  headerCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  caseIdBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  caseIdText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  statusBadgeIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  diseaseName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  timestampText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  sectionCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  sectionCardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  sectionCardSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: spacing.md,
  },
  stageTimelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  stageNode: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stageCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    marginBottom: 6,
    zIndex: 2,
  },
  stageCirclePassed: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
  },
  stageCirclePending: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
  },
  stageIconText: {
    fontSize: 12,
  },
  stageLabel: {
    fontSize: 10,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  stageLabelPending: {
    color: colors.light.textMuted,
  },
  stageConnectingLine: {
    position: 'absolute',
    top: 15,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },
  stageConnectingLinePassed: {
    backgroundColor: '#16A34A',
  },
  animalProfileBox: {
    marginTop: spacing.xs,
  },
  animalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  animalLargeIcon: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  animalProfileInfo: {
    flex: 1,
  },
  animalProfileName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  animalProfileMeta: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  viewAnimalBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewAnimalBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
  },
  unlinkedAnimalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.background,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  unlinkedAnimalIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  unlinkedAnimalTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  unlinkedAnimalSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  symptomsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  symptomChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  symptomChipText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.medium,
  },
  emptyFieldText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: colors.light.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  vitalIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  vitalLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: colors.light.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.light.primary,
  },
  notesBoxTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  notesBoxText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    lineHeight: 18,
  },
  aiCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...shadows.sm,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aiCardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: '#1E40AF',
  },
  aiScoreBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  aiScoreText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#1E40AF',
  },
  disclaimerBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
    marginTop: 2,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#92400E',
    marginBottom: 2,
  },
  disclaimerText: {
    fontSize: 10,
    color: '#78350F',
    lineHeight: 15,
  },
  vetCard: {
    backgroundColor: colors.light.background,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  vetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vetEmoji: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  vetDept: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  vetReg: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  callVetBtn: {
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  callVetBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  pendingReferralBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingReferralIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  pendingReferralTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#92400E',
    marginBottom: 2,
  },
  pendingReferralText: {
    fontSize: typography.sizes.xs,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 4,
  },
  pendingWorkflowNote: {
    fontSize: 10,
    color: '#B45309',
    fontStyle: 'italic',
  },
  findingItem: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  findingItemLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  findingItemValue: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    lineHeight: 18,
  },
  timelineList: {
    marginTop: spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.light.primary,
    marginTop: 4,
    marginRight: spacing.sm,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: colors.light.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  timelineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  timelineTime: {
    fontSize: 10,
    color: colors.light.textMuted,
  },
  timelineUpdater: {
    fontSize: 10,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  timelineNotes: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    lineHeight: 16,
  },
  noHistoryBox: {
    backgroundColor: colors.light.background,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  noHistoryText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  backBtn: {
    flex: 1,
    backgroundColor: colors.light.surface,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  backBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  newScanBtn: {
    flex: 1,
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  newScanBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
});
