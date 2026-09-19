/**
 * Livestock Saathi - Veterinarian Referral Detail & Clinical Workflow
 * File: mobile/app/(vet)/referrals/[id].tsx
 * 
 * Phase 9.2: Complete clinical case workflow implementation.
 * Displays patient livestock profile, reported symptoms, farmer contact,
 * AI screening disclaimer, attending clinical record, audit timeline,
 * atomic case claim, and 5-stage clinical case update / status advancement.
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
  Image,
  Linking,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import { veterinarianService } from '../../../src/services/veterinarianService';
import { DiseaseCase, getStatusTheme, getRiskTheme } from '../../../src/types/case';
import { ClinicalStage } from '../../../src/types/vet';
import { isCaseClaimable, isCaseAssignedToVet } from '../../../src/types/referral';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

const CLINICAL_STAGES: Array<{ id: ClinicalStage; label: string; desc: string }> = [
  { id: 'Investigating', label: 'Investigating', desc: 'Active clinical examination & diagnostic workup' },
  { id: 'Confirmed', label: 'Confirmed', desc: 'Positive diagnosis established by attending veterinarian' },
  { id: 'Containment', label: 'Containment', desc: 'Biosecurity quarantine & active treatment protocol' },
  { id: 'Resolved', label: 'Resolved', desc: 'Clinical recovery achieved; animal marked Recovered' },
];

export default function VetReferralDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [caseItem, setCaseItem] = useState<DiseaseCase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<boolean>(false);

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
      'Take Clinical Responsibility',
      `Confirm claiming case ${caseItem.caseId} (${caseItem.disease})?\n\nThis will record Dr. ${user?.name || 'You'} as the attending veterinarian and transition status to Investigating.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Claim',
          style: 'default',
          onPress: async () => {
            try {
              setClaiming(true);
              const res = await veterinarianService.claimCase(targetId);
              Alert.alert('Case Claimed Successfully', `You are now the attending doctor for case ${caseItem.caseId}.`);
              if (res.case) {
                setCaseItem(res.case);
              } else {
                loadCaseDetail();
              }
            } catch (claimErr: any) {
              Alert.alert('Unable to Claim Case', claimErr.message || 'Failed to claim referral.');
            } finally {
              setClaiming(false);
            }
          }
        }
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

    // Validation
    if (actionTargetStatus === 'Confirmed' && !clinicalDiagnosisInput.trim()) {
      Alert.alert(
        'Clinical Diagnosis Required',
        'Please enter a confirmed clinical diagnosis before advancing the case to Confirmed status.'
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
          'Clinical Records Updated',
          res.message || `Case ${caseItem.caseId} transitioned to ${actionTargetStatus}.`
        );
        setShowActionForm(false);
        if (res.case) {
          setCaseItem(res.case);
        } else {
          loadCaseDetail();
        }
      } catch (err: any) {
        Alert.alert('Unable to Update Case', err.message || 'Failed to save clinical records.');
      } finally {
        setSavingStatus(false);
      }
    };

    if (actionTargetStatus === 'Resolved') {
      Alert.alert(
        'Confirm Case Resolution',
        `Confirm that livestock patient has fully recovered and biosecurity criteria are met?\n\nThis will update the animal health status to "Recovered".`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm Resolution', style: 'default', onPress: doSubmit }
        ]
      );
    } else {
      doSubmit();
    }
  };

  const handleCallFarmer = (phone?: string) => {
    if (!phone) {
      Alert.alert('Contact Unavailable', 'No phone number was recorded for this farmer.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call from device.');
    });
  };

  if (loading) {
    return (
      <View style={styles.centerWrapper}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.centerLoadingText}>Loading clinical referral details...</Text>
      </View>
    );
  }

  if (error || !caseItem) {
    return (
      <View style={styles.centerWrapper}>
        <Text style={styles.centerErrorIcon}>⚠️</Text>
        <Text style={styles.centerErrorTitle}>Referral Unavailable</Text>
        <Text style={styles.centerErrorMessage}>{error || 'Case could not be found.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCaseDetail} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Retry Loading</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLinkButton}
          onPress={() => router.replace('/(vet)/referrals')}
          activeOpacity={0.7}
        >
          <Text style={styles.backLinkText}>← Back to Referral Queue</Text>
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

  // Animal tag resolution
  let animalTag = 'N/A';
  if (caseItem.animalId && typeof caseItem.animalId === 'object') {
    animalTag = caseItem.animalId.tagId || caseItem.animalId._id || 'N/A';
  } else if (caseItem.animalId) {
    animalTag = String(caseItem.animalId);
  }

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
          <View style={styles.cacheBanner}>
            <Text style={styles.cacheBannerText}>
              ⚡ Offline Mode: Displaying saved clinical record from device storage.
            </Text>
          </View>
        )}

        {/* Case Header Card */}
        <View style={styles.card}>
          <View style={styles.headerTopRow}>
            <View style={styles.caseIdBadge}>
              <Text style={styles.caseIdText}>{caseItem.caseId}</Text>
            </View>
            <View style={styles.badgesRow}>
              <View style={[styles.riskPill, { backgroundColor: riskTheme.bgColor, borderColor: riskTheme.borderColor }]}>
                <Text style={[styles.riskPillText, { color: riskTheme.color }]}>{riskTheme.label}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusTheme.bgColor, borderColor: statusTheme.borderColor }]}>
                <Text style={[styles.statusPillText, { color: statusTheme.color }]}>{statusTheme.label}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.diseaseHeadline}>
            {caseItem.clinicalDiagnosis ? caseItem.clinicalDiagnosis : caseItem.disease}
          </Text>

          <Text style={styles.dateText}>
            Reported: {new Date(caseItem.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        </View>

        {/* AI Screening Card with Strict Medical Disclaimer */}
        <View style={styles.card}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI PRELIMINARY SCREENING</Text>
            </View>
            {caseItem.confidence ? (
              <Text style={styles.confidenceText}>{caseItem.confidence}% model match</Text>
            ) : null}
          </View>

          <Text style={styles.aiObservedDisease}>
            Screening Indication: <Text style={styles.aiDiseaseBold}>{caseItem.disease}</Text>
          </Text>

          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>
              ⚠️ AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis.
            </Text>
          </View>
        </View>

        {/* Lesion / Screening Image if present */}
        {(caseItem.image || (caseItem as any).imageUrl) && (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Lesion / Clinical Image</Text>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: caseItem.image || (caseItem as any).imageUrl }}
                style={styles.lesionImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlayBadge}>
                <Text style={styles.imageOverlayText}>AI Screening Snapshot</Text>
              </View>
            </View>
          </View>
        )}

        {/* Patient Animal Information */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Patient Livestock Profile</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Species</Text>
              <Text style={styles.infoValue}>{caseItem.species || 'Livestock'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Animal Name</Text>
              <Text style={styles.infoValue}>{caseItem.animalName || 'Unnamed'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Tag ID</Text>
              <Text style={[styles.infoValue, styles.monospace]}>{animalTag}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Affected Herd Count</Text>
              <Text style={styles.infoValue}>{caseItem.affectedCount || 1} animal(s)</Text>
            </View>
            {caseItem.temperature ? (
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Body Temperature</Text>
                <Text style={styles.infoValue}>{caseItem.temperature}°C</Text>
              </View>
            ) : null}
            {caseItem.duration ? (
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Symptom Duration</Text>
                <Text style={styles.infoValue}>{caseItem.duration} hours</Text>
              </View>
            ) : null}
          </View>

          {/* Reported Symptoms */}
          {caseItem.symptoms && caseItem.symptoms.length > 0 && (
            <View style={styles.symptomsBlock}>
              <Text style={styles.symptomsTitle}>Reported Symptoms & Clinical Signs</Text>
              <View style={styles.symptomsRow}>
                {caseItem.symptoms.map((s, idx) => (
                  <View key={idx} style={styles.symptomPill}>
                    <Text style={styles.symptomText}>• {s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {caseItem.notes ? (
            <View style={styles.farmerNotesBlock}>
              <Text style={styles.farmerNotesTitle}>Farmer Observations / Field Notes</Text>
              <Text style={styles.farmerNotesBody}>{caseItem.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Farmer Contact & Farm Location Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Farmer Contact & Farm Location</Text>

          <View style={styles.contactRow}>
            <View style={styles.contactDetails}>
              <Text style={styles.farmerName}>{caseItem.farmerContact?.name || 'Registered Farmer'}</Text>
              <Text style={styles.locationText}>
                📍 {caseItem.farmerLocation?.village || 'Village'},{' '}
                {caseItem.farmerLocation?.block || 'Block'},{' '}
                {caseItem.farmerLocation?.district || caseItem.districtId || 'District'},{' '}
                {caseItem.farmerLocation?.state || caseItem.state || 'Maharashtra'}
              </Text>
              {caseItem.farmerContact?.phone ? (
                <Text style={styles.phoneText}>📞 {caseItem.farmerContact.phone}</Text>
              ) : null}
            </View>

            {caseItem.farmerContact?.phone ? (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCallFarmer(caseItem.farmerContact?.phone)}
                activeOpacity={0.8}
              >
                <Text style={styles.callButtonIcon}>📞</Text>
                <Text style={styles.callButtonText}>Call Farmer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Attending Veterinarian Clinical Record */}
        <View style={[styles.card, styles.clinicalCard]}>
          <View style={styles.cardHeaderWithAction}>
            <Text style={styles.sectionHeaderNoMargin}>Attending Clinical Record</Text>
            {canPerformClinicalAction && !showActionForm && (
              <TouchableOpacity
                style={styles.editActionBtn}
                onPress={() => handleOpenActionForm()}
                activeOpacity={0.8}
              >
                <Text style={styles.editActionBtnText}>✏️ Record Updates</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.doctorHeader}>
            <Text style={styles.doctorLabel}>Assigned Doctor:</Text>
            {isMine ? (
              <View style={styles.doctorBadgeMine}>
                <Text style={styles.doctorBadgeMineText}>✓ Dr. {user?.name} (You)</Text>
              </View>
            ) : assignedDoctorName ? (
              <Text style={styles.doctorNameOther}>Dr. {assignedDoctorName}</Text>
            ) : (
              <View style={styles.unassignedBadge}>
                <Text style={styles.unassignedBadgeText}>Unassigned — Awaiting Claim</Text>
              </View>
            )}
          </View>

          {caseItem.clinicalDiagnosis ? (
            <View style={styles.clinicalField}>
              <Text style={styles.fieldLabel}>Confirmed Diagnosis</Text>
              <Text style={styles.fieldValueBold}>{caseItem.clinicalDiagnosis}</Text>
            </View>
          ) : (
            <View style={styles.clinicalField}>
              <Text style={styles.fieldLabel}>Confirmed Diagnosis</Text>
              <Text style={styles.fieldValuePending}>Pending clinical diagnosis by attending veterinarian</Text>
            </View>
          )}

          {caseItem.affectedCount ? (
            <View style={styles.clinicalField}>
              <Text style={styles.fieldLabel}>Affected Herd Count</Text>
              <Text style={styles.fieldValue}>{caseItem.affectedCount} animal(s)</Text>
            </View>
          ) : null}

          {caseItem.investigationNotes ? (
            <View style={styles.clinicalField}>
              <Text style={styles.fieldLabel}>Clinical Examination Findings</Text>
              <Text style={styles.fieldValue}>{caseItem.investigationNotes}</Text>
            </View>
          ) : null}

          {caseItem.treatmentNotes ? (
            <View style={styles.clinicalField}>
              <Text style={styles.fieldLabel}>Treatment Plan & Bio-Interventions</Text>
              <Text style={styles.fieldValue}>{caseItem.treatmentNotes}</Text>
            </View>
          ) : null}

          {caseItem.prescription ? (
            <View style={styles.rxBlock}>
              <Text style={styles.rxTitle}>Rx Prescribed Medications</Text>
              <Text style={styles.rxContent}>{caseItem.prescription}</Text>
            </View>
          ) : null}
        </View>

        {/* CLINICAL ACTION FORM / ADVANCEMENT WORKFLOW (Phase 9.2) */}
        {canPerformClinicalAction && showActionForm && (
          <View style={[styles.card, styles.actionCard]}>
            <View style={styles.actionFormHeader}>
              <View>
                <Text style={styles.actionFormBadge}>VETERINARY CLINICAL WORKFLOW</Text>
                <Text style={styles.actionFormTitle}>Update Clinical Case & Advance Status</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowActionForm(false)}
                style={styles.actionFormClose}
                activeOpacity={0.7}
              >
                <Text style={styles.actionFormCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Stage Selector */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Target Case Status / Stage</Text>
              <View style={styles.stageGrid}>
                {CLINICAL_STAGES.map((st) => {
                  const isSelected = actionTargetStatus === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[styles.stagePill, isSelected && styles.stagePillActive]}
                      onPress={() => setActionTargetStatus(st.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.stagePillText, isSelected && styles.stagePillTextActive]}>
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Clinical Diagnosis Input */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Confirmed Clinical Diagnosis</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Lumpy Skin Disease (Clinical Confirmation)"
                placeholderTextColor={colors.light.textSecondary}
                value={clinicalDiagnosisInput}
                onChangeText={setClinicalDiagnosisInput}
              />
            </View>

            {/* Affected Animals Count */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Affected Livestock Count</Text>
              <TextInput
                style={styles.textInput}
                placeholder="1"
                placeholderTextColor={colors.light.textSecondary}
                value={affectedCountInput}
                onChangeText={setAffectedCountInput}
                keyboardType="numeric"
              />
            </View>

            {/* Examination Findings / Investigation Notes */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Clinical Examination Findings / Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Record clinical examination signs, body temperature, vitals, mucosal lesions, lymph node palpation..."
                placeholderTextColor={colors.light.textSecondary}
                value={investigationNotesInput}
                onChangeText={setInvestigationNotesInput}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Treatment Plan & Interventions */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Treatment Plan & Supportive Therapy</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Record clinical intervention, fluid therapy, antipyretics, isolation protocols..."
                placeholderTextColor={colors.light.textSecondary}
                value={treatmentNotesInput}
                onChangeText={setTreatmentNotesInput}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Rx Prescription */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Rx Prescribed Medications & Dosage</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, styles.rxInput]}
                placeholder="e.g., Inj. Meloxicam 0.5 mg/kg IM OD x 3 days, Inj. Oxytetracycline 10 mg/kg..."
                placeholderTextColor={colors.light.textSecondary}
                value={prescriptionInput}
                onChangeText={setPrescriptionInput}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Optional Custom Timeline Note */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Custom Timeline Audit Note (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Physical field checkup completed. Herd isolated."
                placeholderTextColor={colors.light.textSecondary}
                value={customNotesInput}
                onChangeText={setCustomNotesInput}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.formActionRow}>
              <TouchableOpacity
                style={styles.formCancelBtn}
                onPress={() => setShowActionForm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.formSubmitBtn}
                onPress={handleSaveClinicalAction}
                disabled={savingStatus}
                activeOpacity={0.8}
              >
                {savingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.formSubmitBtnText}>Submit Clinical Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Case Audit Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>
            Case Timeline Audit ({caseItem.timeline?.length || 0})
          </Text>

          {caseItem.timeline && caseItem.timeline.length > 0 ? (
            <View style={styles.timelineList}>
              {caseItem.timeline.map((entry, idx) => (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineItemHeader}>
                      <Text style={styles.timelineStatus}>{entry.status || 'Status Update'}</Text>
                      <Text style={styles.timelineDate}>
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </Text>
                    </View>
                    <Text style={styles.timelineDoctor}>{entry.updaterName || 'Attending Official'}</Text>
                    {entry.notes ? <Text style={styles.timelineNotes}>{entry.notes}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyTimelineText}>No status transition milestones recorded.</Text>
          )}
        </View>

        {/* Action Button: Claim Case (Online Only) */}
        {isClaimable ? (
          <TouchableOpacity
            style={styles.primaryClaimBtn}
            onPress={handleClaim}
            disabled={claiming}
            activeOpacity={0.8}
          >
            {claiming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryClaimBtnIcon}>🩺</Text>
                <Text style={styles.primaryClaimBtnText}>Claim Clinical Responsibility</Text>
              </>
            )}
          </TouchableOpacity>
        ) : canPerformClinicalAction && !showActionForm ? (
          <TouchableOpacity
            style={styles.primaryClaimBtn}
            onPress={() => handleOpenActionForm()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryClaimBtnIcon}>📋</Text>
            <Text style={styles.primaryClaimBtnText}>Update Clinical Case & Advance Status</Text>
          </TouchableOpacity>
        ) : !canPerformClinicalAction && assignedDoctorName ? (
          <View style={styles.unauthorizedBox}>
            <Text style={styles.unauthorizedText}>
              🔒 Assigned to Dr. {assignedDoctorName}. Clinical updates and prescriptions can only be recorded by the attending veterinarian.
            </Text>
          </View>
        ) : null}
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
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.light.background,
  },
  centerLoadingText: {
    marginTop: spacing.sm,
    color: colors.light.textSecondary,
    fontSize: typography.sizes.sm,
  },
  centerErrorIcon: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  centerErrorTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
    marginBottom: 4,
  },
  centerErrorMessage: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  retryButton: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  backLinkButton: {
    padding: spacing.xs,
  },
  backLinkText: {
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  cacheBanner: {
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cacheBannerText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: typography.weights.medium,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  clinicalCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 4,
    marginBottom: spacing.sm,
  },
  sectionHeaderNoMargin: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  editActionBtn: {
    backgroundColor: '#065F46',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  editActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#065F46',
    borderWidth: 1.5,
    ...shadows.md,
  },
  actionFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.sm,
  },
  actionFormBadge: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#065F46',
    letterSpacing: 0.5,
  },
  actionFormTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: 1,
  },
  actionFormClose: {
    padding: 4,
  },
  actionFormCloseText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.bold,
  },
  formSection: {
    marginBottom: spacing.sm,
  },
  formLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stagePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  stagePillActive: {
    backgroundColor: '#065F46',
    borderColor: '#065F46',
  },
  stagePillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
  },
  stagePillTextActive: {
    color: '#FFFFFF',
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
    minHeight: 70,
    textAlignVertical: 'top',
  },
  rxInput: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  formActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  formCancelBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
  },
  formCancelBtnText: {
    color: colors.light.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  formSubmitBtn: {
    backgroundColor: '#065F46',
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radii.sm,
    minWidth: 150,
    alignItems: 'center',
  },
  formSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  caseIdBadge: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  caseIdText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
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
  diseaseHeadline: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: 2,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  aiObservedDisease: {
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
    marginTop: 2,
  },
  aiDiseaseBold: {
    fontWeight: typography.weights.bold,
  },
  disclaimerBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: typography.weights.medium,
  },
  sectionHeader: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 4,
  },
  imageContainer: {
    borderRadius: radii.md,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#000000',
    position: 'relative',
  },
  lesionImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoCol: {
    width: '47%',
  },
  infoLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
    fontWeight: typography.weights.bold,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.medium,
    marginTop: 1,
  },
  monospace: {
    fontFamily: 'monospace',
    fontWeight: typography.weights.bold,
  },
  symptomsBlock: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs,
  },
  symptomsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  symptomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  symptomPill: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  symptomText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: typography.weights.medium,
  },
  farmerNotesBlock: {
    marginTop: spacing.sm,
    backgroundColor: colors.light.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  farmerNotesTitle: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  farmerNotesBody: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  farmerName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  phoneText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#065F46',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  callButtonIcon: {
    fontSize: 16,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  doctorLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
  },
  doctorBadgeMine: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  doctorBadgeMineText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#065F46',
  },
  doctorNameOther: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  unassignedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  unassignedBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
  clinicalField: {
    marginTop: spacing.xs,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    marginTop: 1,
  },
  fieldValuePending: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: 1,
  },
  fieldValueBold: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#065F46',
    marginTop: 1,
  },
  rxBlock: {
    marginTop: spacing.sm,
    backgroundColor: '#FFFFFF',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rxTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#065F46',
    marginBottom: 2,
  },
  rxContent: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: colors.light.textPrimary,
  },
  timelineList: {
    paddingLeft: spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.light.primary,
    marginTop: 4,
    marginRight: spacing.sm,
  },
  timelineContent: {
    flex: 1,
  },
  timelineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineStatus: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  timelineDate: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  timelineDoctor: {
    fontSize: 10,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
  },
  timelineNotes: {
    fontSize: 11,
    color: colors.light.textPrimary,
    marginTop: 1,
  },
  emptyTimelineText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
  },
  primaryClaimBtn: {
    backgroundColor: '#065F46',
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.md,
  },
  primaryClaimBtnIcon: {
    fontSize: 18,
  },
  primaryClaimBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  unauthorizedBox: {
    backgroundColor: colors.light.surfaceAlt,
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
  },
  unauthorizedText: {
    color: colors.light.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});
