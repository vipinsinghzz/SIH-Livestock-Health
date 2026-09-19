/**
 * Livestock Saathi - Diagnostic Laboratory Referral Detail & Pipeline Status
 * File: mobile/app/(vet)/labs/[id].tsx
 * 
 * Phase 9.3: Detailed chain-of-custody tracking and diagnostic result recording.
 * Backed by GET /api/lab-referrals (via list/cache lookup) and PATCH /api/lab-referrals/:id.
 * 
 * CRITICAL ARCHITECTURE RULE:
 * There is NO GET /api/lab-referrals/:id on the backend. Data is resolved through
 * the laboratoryService list cache. All status updates are strictly ONLINE ONLY.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import { labService } from '../../../src/services/labService';
import {
  LabReferral,
  LabReferralStatus,
  getLabStatusTheme
} from '../../../src/types/lab';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

const PIPELINE_STAGES: Array<{ id: LabReferralStatus; label: string; desc: string }> = [
  { id: 'Collected', label: '1. Collected', desc: 'Sample harvested in aseptic field collection' },
  { id: 'In Transit', label: '2. In Transit', desc: 'Cold chain transit to diagnostic laboratory' },
  { id: 'Received', label: '3. Received', desc: 'Logged into destination laboratory accession register' },
  { id: 'Result Pending', label: '4. Testing', desc: 'PCR / ELISA / culture analysis active' },
  { id: 'Result Confirmed', label: '5. Confirmed', desc: 'Pathogen detected; clinical confirmation established' },
];

export default function LabReferralDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [referral, setReferral] = useState<LabReferral | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Update Status Form State
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<LabReferralStatus>('In Transit');
  const [confirmedDiseaseInput, setConfirmedDiseaseInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [submittingUpdate, setSubmittingUpdate] = useState<boolean>(false);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await labService.getLabReferralById(id);
      setReferral(res.referral);
      setIsFromCache(res.fromCache);
    } catch (err: any) {
      console.warn('[LabReferralDetail] Error loading referral:', err?.message);
      setError(err?.message || 'Failed to load laboratory referral details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDetail();
  }, [loadDetail]);

  // Open Update Form
  const handleOpenUpdate = () => {
    if (!referral) return;
    const current = (referral.status as LabReferralStatus) || 'Collected';

    // Auto-select logical next status
    let next: LabReferralStatus = 'In Transit';
    if (current === 'Collected') next = 'In Transit';
    else if (current === 'In Transit') next = 'Received';
    else if (current === 'Received') next = 'Result Pending';
    else if (current === 'Result Pending') next = 'Result Confirmed';
    else next = 'Result Confirmed';

    setTargetStatus(next);
    setConfirmedDiseaseInput(referral.resultSummary?.confirmedDisease || '');
    setNotesInput(referral.resultSummary?.notes || '');
    setShowUpdateModal(true);
  };

  // Submit Status Update
  const handleSubmitUpdate = async () => {
    if (!referral) return;
    const targetId = String(referral.id || referral._id || '').trim();
    if (!targetId) {
      Alert.alert('Invalid Referral', 'Missing lab referral identifier.');
      return;
    }

    if (targetStatus === 'Result Confirmed' && !confirmedDiseaseInput.trim()) {
      Alert.alert(
        'Confirmed Disease Required',
        'Please enter the confirmed pathogen or disease diagnosis established by the laboratory.'
      );
      return;
    }

    try {
      setSubmittingUpdate(true);
      const res = await labService.updateLabReferral(targetId, {
        status: targetStatus,
        confirmedDisease: confirmedDiseaseInput.trim() || undefined,
        notes: notesInput.trim() || undefined,
      });

      Alert.alert('Pipeline Status Updated', res.message || 'Lab referral updated successfully.');
      setShowUpdateModal(false);
      if (res.referral) {
        setReferral(res.referral);
      } else {
        loadDetail();
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update lab referral status.');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const handleCallCollector = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call from device.');
    });
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading laboratory referral...</Text>
      </View>
    );
  }

  if (error || !referral) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Referral Unavailable</Text>
        <Text style={styles.errorMessage}>{error || 'Diagnostic sample record could not be found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadDetail} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Retry Loading</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLinkBtn}
          onPress={() => router.replace('/(vet)/labs')}
          activeOpacity={0.7}
        >
          <Text style={styles.backLinkText}>← Back to Diagnostic Labs</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusTheme = getLabStatusTheme(referral.status);
  const currentStep = statusTheme.stepIndex;
  const linkedCaseId = referral.report?.caseId || referral.report?.case_id;

  return (
    <View style={styles.screenWrapper}>
      <OfflineNotice />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.light.primary]}
            tintColor={colors.light.primary}
          />
        }
      >
        {isFromCache && (
          <View style={styles.cacheNoticeBanner}>
            <Text style={styles.cacheNoticeBannerText}>
              ⚡ Offline Mode: Displaying saved diagnostic record from device storage.
            </Text>
          </View>
        )}

        {/* Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.sampleBadge}>
              <Text style={styles.sampleBadgeText}>🧪 {referral.sampleType}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusTheme.bgColor, borderColor: statusTheme.borderColor }]}>
              <Text style={[styles.statusPillText, { color: statusTheme.color }]}>{statusTheme.label}</Text>
            </View>
          </View>

          <Text style={styles.referredLabTitle}>{referral.referredLab}</Text>

          <Text style={styles.dateRow}>
            Collection Date: {referral.collectionDate ? new Date(referral.collectionDate).toLocaleString() : 'Recorded'}
          </Text>
        </View>

        {/* 5-Stage Chain of Custody Stepper */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Diagnostic Chain of Custody</Text>
          <View style={styles.stepperContainer}>
            {PIPELINE_STAGES.map((st, idx) => {
              const isPassed = currentStep >= idx;
              const isCurrent = currentStep === idx;
              return (
                <View key={st.id} style={styles.stepItem}>
                  <View style={styles.stepIndicatorCol}>
                    <View
                      style={[
                        styles.stepDot,
                        isPassed && styles.stepDotPassed,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      <Text style={[styles.stepDotNumber, isPassed && styles.stepDotNumberPassed]}>
                        {isPassed ? '✓' : idx + 1}
                      </Text>
                    </View>
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <View style={[styles.stepLine, isPassed && currentStep > idx && styles.stepLinePassed]} />
                    )}
                  </View>
                  <View style={styles.stepTextCol}>
                    <Text style={[styles.stepTitle, isPassed && styles.stepTitlePassed]}>
                      {st.label}
                    </Text>
                    <Text style={styles.stepDesc}>{st.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Specimen & Patient Information */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Patient Livestock & Surveillance Context</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Linked Case</Text>
              <Text style={[styles.infoValue, styles.monospace]}>{linkedCaseId || 'N/A'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Animal Species</Text>
              <Text style={styles.infoValue}>{referral.report?.species || 'Cattle / Livestock'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Farm Location</Text>
              <Text style={styles.infoValue}>
                {referral.report?.village ? `${referral.report.village}, ` : ''}
                {referral.report?.district || 'Pune'}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Collector Official</Text>
              <Text style={styles.infoValue}>{referral.collector?.name || 'Attending Field Doctor'}</Text>
            </View>
          </View>

          {referral.collector?.phone ? (
            <TouchableOpacity
              style={styles.collectorPhoneBtn}
              onPress={() => handleCallCollector(referral.collector?.phone)}
              activeOpacity={0.8}
            >
              <Text style={styles.collectorPhoneText}>📞 Contact Collector: {referral.collector.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {linkedCaseId ? (
            <TouchableOpacity
              style={styles.viewCaseBtn}
              onPress={() => router.push(`/(vet)/referrals/${linkedCaseId}` as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewCaseBtnText}>📋 View Linked Clinical Case Record ➔</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Diagnostic Results Card */}
        <View style={[styles.card, styles.resultCard]}>
          <Text style={styles.sectionHeader}>Laboratory Diagnostic Findings</Text>

          {referral.resultSummary?.confirmedDisease ? (
            <View style={styles.confirmedBox}>
              <Text style={styles.confirmedHeader}>🔬 CONFIRMED PATHOGEN IDENTIFICATION</Text>
              <Text style={styles.confirmedDiseaseText}>
                {referral.resultSummary.confirmedDisease}
              </Text>
              {referral.resultSummary.confirmedDate ? (
                <Text style={styles.confirmedDateText}>
                  Confirmed on: {new Date(referral.resultSummary.confirmedDate).toLocaleString()}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.pendingBox}>
              <Text style={styles.pendingText}>
                ⏳ Pathogen confirmation pending. Specimen is undergoing diagnostic processing.
              </Text>
            </View>
          )}

          {referral.resultSummary?.notes ? (
            <View style={styles.notesBlock}>
              <Text style={styles.notesTitle}>Sampling / Laboratory Notes</Text>
              <Text style={styles.notesContent}>{referral.resultSummary.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Button: Update Status & Results */}
        {!showUpdateModal && (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={handleOpenUpdate}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnIcon}>✏️</Text>
            <Text style={styles.primaryActionBtnText}>Update Pipeline Status & Results</Text>
          </TouchableOpacity>
        )}

        {/* Update Form Modal Card */}
        {showUpdateModal && (
          <View style={[styles.card, styles.actionCard]}>
            <View style={styles.actionFormHeader}>
              <View>
                <Text style={styles.actionBadge}>CHAIN-OF-CUSTODY & RESULT</Text>
                <Text style={styles.actionTitle}>Update Laboratory Referral</Text>
              </View>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Text style={styles.actionCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Target Status Selector */}
            <Text style={styles.inputLabel}>Select Pipeline Stage *</Text>
            <View style={styles.stageWrap}>
              {PIPELINE_STAGES.map((st) => {
                const isSelected = targetStatus === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.stageChip, isSelected && styles.stageChipActive]}
                    onPress={() => setTargetStatus(st.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.stageChipText, isSelected && styles.stageChipTextActive]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirmed Disease Input (Highlighted when Result Confirmed) */}
            {targetStatus === 'Result Confirmed' && (
              <View style={styles.confirmedInputBlock}>
                <Text style={styles.confirmedInputLabel}>
                  Confirmed Pathogen / Disease Result *
                </Text>
                <TextInput
                  style={styles.confirmedInput}
                  placeholder="e.g., Lumpy Skin Disease (Capripoxvirus PCR Positive)"
                  placeholderTextColor="#065F46"
                  value={confirmedDiseaseInput}
                  onChangeText={setConfirmedDiseaseInput}
                />
                <View style={styles.escalationWarning}>
                  <Text style={styles.escalationWarningText}>
                    ⚠️ Laboratory confirmation will automatically advance the linked clinical case to "Confirmed" and record this finding on the case timeline.
                  </Text>
                </View>
              </View>
            )}

            {/* Notes Input */}
            <Text style={styles.inputLabel}>Laboratory / Examination Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Record specimen condition, PCR cycle threshold (Ct), viral clade, or technician observations..."
              placeholderTextColor={colors.light.textSecondary}
              value={notesInput}
              onChangeText={setNotesInput}
              multiline
              numberOfLines={3}
            />

            {/* Action Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowUpdateModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmitUpdate}
                disabled={submittingUpdate}
              >
                {submittingUpdate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Status Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.light.background,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.light.textSecondary,
    fontSize: typography.sizes.sm,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  errorTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  retryBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  backLinkBtn: {
    marginTop: spacing.base,
  },
  backLinkText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.medium,
  },
  cacheNoticeBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  cacheNoticeBannerText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: typography.weights.medium,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sampleBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  sampleBadgeText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#15803D',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  referredLabTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  dateRow: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 4,
    marginBottom: spacing.sm,
  },
  stepperContainer: {
    paddingVertical: 4,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotPassed: {
    backgroundColor: '#0369A1',
    borderColor: '#0369A1',
  },
  stepDotCurrent: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  stepDotNumber: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
  },
  stepDotNumberPassed: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.light.border,
    minHeight: 18,
  },
  stepLinePassed: {
    backgroundColor: '#0369A1',
  },
  stepTextCol: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: 10,
  },
  stepTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.light.textSecondary,
  },
  stepTitlePassed: {
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
  },
  stepDesc: {
    fontSize: 10,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  infoCol: {
    width: '50%',
    paddingRight: spacing.xs,
  },
  infoLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
    marginTop: 1,
  },
  monospace: {
    fontFamily: 'monospace',
    fontWeight: typography.weights.bold,
  },
  collectorPhoneBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.light.surfaceAlt,
    padding: 6,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  collectorPhoneText: {
    fontSize: 11,
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
  },
  viewCaseBtn: {
    marginTop: spacing.sm,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    padding: 8,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  viewCaseBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#065F46',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
  },
  confirmedBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  confirmedHeader: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#047857',
    letterSpacing: 0.5,
  },
  confirmedDiseaseText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: '#065F46',
    marginTop: 4,
  },
  confirmedDateText: {
    fontSize: 10,
    color: '#047857',
    marginTop: 4,
  },
  pendingBox: {
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  pendingText: {
    fontSize: typography.sizes.xs,
    color: '#92400E',
    fontStyle: 'italic',
  },
  notesBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  notesContent: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    marginTop: 2,
    lineHeight: 16,
  },
  primaryActionBtn: {
    backgroundColor: '#0369A1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radii.md,
    gap: spacing.xs,
    ...shadows.md,
  },
  primaryActionBtnIcon: {
    fontSize: 16,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0369A1',
    borderWidth: 1.5,
    ...shadows.md,
  },
  actionFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 4,
    marginBottom: spacing.sm,
  },
  actionBadge: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#0369A1',
  },
  actionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: 1,
  },
  actionCloseText: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    padding: 4,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  stageWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  stageChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  stageChipActive: {
    backgroundColor: '#0369A1',
    borderColor: '#0369A1',
  },
  stageChipText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  stageChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  confirmedInputBlock: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  confirmedInputLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#065F46',
    marginBottom: 4,
  },
  confirmedInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: typography.sizes.sm,
    color: '#065F46',
    fontWeight: typography.weights.bold,
  },
  escalationWarning: {
    marginTop: 6,
  },
  escalationWarningText: {
    fontSize: 10,
    color: '#047857',
    lineHeight: 14,
  },
  textInput: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
  },
  cancelBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
  },
  submitBtn: {
    backgroundColor: '#0369A1',
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radii.sm,
    minWidth: 140,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
});
