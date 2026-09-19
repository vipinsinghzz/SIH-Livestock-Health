/**
 * Livestock Saathi - Veterinarian Referral Detail & Clinical Examination
 * File: mobile/app/(vet)/referrals/[id].tsx
 * 
 * Production referral detail screen backed by GET /api/cases/:id.
 * Displays full patient animal profile, reported symptoms, farmer contact,
 * clinical findings, audit timeline, and atomic case claim workflow.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { isCaseClaimable, isCaseAssignedToVet } from '../../../src/types/referral';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

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

  const vetId = user?.id || user?._id;

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

          <Text style={styles.diseaseHeadline}>{caseItem.disease}</Text>
          {caseItem.confidence ? (
            <Text style={styles.confidenceHeadline}>AI Confidence: {caseItem.confidence}%</Text>
          ) : null}

          <Text style={styles.dateText}>
            Reported on: {new Date(caseItem.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
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

        {/* Farmer Contact & Location Card */}
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
          <Text style={styles.sectionHeader}>Attending Clinical Record</Text>

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

          {!caseItem.clinicalDiagnosis && !caseItem.prescription && (
            <Text style={styles.emptyClinicalNote}>
              No clinical diagnosis or prescription recorded yet. Clinical advancement workflow will be accessible in Phase 9.2.
            </Text>
          )}
        </View>

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
        ) : isMine ? (
          <View style={styles.assignedAlertBox}>
            <Text style={styles.assignedAlertText}>
              ✓ You have claimed this case. Clinical examination & treatment updates will be enabled in Phase 9.2.
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
  confidenceHeadline: {
    fontSize: typography.sizes.sm,
    color: colors.light.primary,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: spacing.xs,
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
  emptyClinicalNote: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
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
  assignedAlertBox: {
    backgroundColor: '#ECFDF5',
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
  },
  assignedAlertText: {
    color: '#065F46',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
});
