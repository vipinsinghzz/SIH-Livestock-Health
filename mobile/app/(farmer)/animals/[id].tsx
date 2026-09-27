/**
 * Livestock Saathi - Animal Profile & Health History
 * File: mobile/app/(farmer)/animals/[id].tsx
 * 
 * Comprehensive animal detail screen with tabs for Overview,
 * Health Timeline, Vaccination History, and Medical Treatments.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppLanguage } from '../../../src/services/i18n';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import animalService from '../../../src/services/animalService';
import { Animal, TimelineEvent, VaccinationRecord, TreatmentRecord } from '../../../src/types/animal';

type ActiveTab = 'overview' | 'timeline' | 'vaccines' | 'treatments';

export default function AnimalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useAppLanguage();

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAnimal = useCallback(async () => {
    if (!id) return;
    try {
      setErrorMessage(null);
      const data = await animalService.getAnimalById(id);
      setAnimal(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load animal profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAnimal();
  }, [fetchAnimal]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnimal();
  }, [fetchAnimal]);

  const getSpeciesEmoji = (species?: string) => {
    switch (species) {
      case 'Cattle':
        return '🐄';
      case 'Buffalo':
        return '🐃';
      case 'Goat':
        return '🐐';
      case 'Sheep':
        return '🐑';
      case 'Poultry':
        return '🐔';
      case 'Pig':
        return '🐖';
      default:
        return '🐾';
    }
  };

  const getHealthBadge = (status?: string) => {
    switch (status) {
      case 'Healthy':
        return { bg: colors.light.successBg, text: colors.light.success, label: t('farmer.healthy', 'Healthy') };
      case 'Needs Attention':
        return { bg: colors.light.warningBg, text: colors.light.warning, label: t('farmer.attention', 'Needs Attention') };
      case 'Critical':
        return { bg: colors.light.dangerBg, text: colors.light.danger, label: t('farmer.critical', 'Critical') };
      default:
        return { bg: colors.light.surfaceAlt, text: colors.light.textSecondary, label: status || t('common.unknown', 'Unknown') };
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>{t('farmer.loadingRecords', 'Loading animal health record...')}</Text>
      </View>
    );
  }

  if (errorMessage || !animal) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>{t('common.error', 'Profile Not Found')}</Text>
        <Text style={styles.errorSub}>
          {errorMessage || t('common.offline', 'The requested animal profile could not be loaded.')}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAnimal}>
          <Text style={styles.retryBtnText}>{t('common.retry', 'Retry Loading')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t('common.back', 'Go Back to Herd')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = getHealthBadge(animal.healthStatus);
  const timeline: TimelineEvent[] = animal.timeline || [];
  const rawVacList: VaccinationRecord[] = [
    ...(animal.vaccinations || []).map((v: any) => ({
      vaccine: v.name || v.vaccine || 'Routine Vaccine',
      date: v.date,
      nextDue: v.nextDue,
      status: v.status || 'Completed',
      batchNumber: v.batchNumber,
      camp: v.camp,
      dose: v.dose || 'Primary Dose',
      administeredBy: v.administeredBy,
      notes: v.notes,
    })),
    ...(animal.vaccinationHistory || []),
  ];
  const vaccinations: VaccinationRecord[] = rawVacList;
  const treatments: TreatmentRecord[] = animal.treatmentHistory || [];

  return (
    <ScrollView
      style={styles.screen}
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
      {/* Profile Card Header */}
      <View style={styles.profileCard}>
        <View style={styles.profileTopRow}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarEmoji}>{getSpeciesEmoji(animal.species)}</Text>
          </View>
          <View style={styles.profileTitleArea}>
            <Text style={styles.animalNameText}>{animal.name}</Text>
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>🏷️ {animal.tagId}</Text>
            </View>
          </View>
          <View style={[styles.healthPill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.healthPillText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.specRow}>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>{t('farmer.species', 'Species')}</Text>
            <Text style={styles.specValue}>{t(`farmer.${animal.species.toLowerCase()}`, animal.species)}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>{t('farmer.breed', 'Breed')}</Text>
            <Text style={styles.specValue}>{animal.breed || t('common.unknown', 'Not specified')}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>{t('farmer.age', 'Age')}</Text>
            <Text style={styles.specValue}>{t('farmer.ageYears', '{age} Years', { age: animal.age })}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>{t('farmer.gender', 'Gender')}</Text>
            <Text style={styles.specValue}>{animal.gender === 'Female' ? t('farmer.female', 'Female') : t('farmer.male', 'Male')}</Text>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={styles.actionBtnScan}
            onPress={() =>
              router.push({
                pathname: '/(farmer)/ai-scan',
                params: { animalId: id },
              } as any)
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnIcon}>📷</Text>
            <Text style={styles.actionBtnScanText}>{t('farmer.aiDiseaseScan', 'AI Disease Scan')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnEdit}
            onPress={() => router.push(`/(farmer)/animals/edit/${id}` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnIcon}>✏️</Text>
            <Text style={styles.actionBtnEditText}>{t('common.edit', 'Edit Animal')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            {t('common.details', 'Overview')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'timeline' && styles.tabButtonActive]}
          onPress={() => setActiveTab('timeline')}
        >
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
            {t('nav.farmerHome', 'Timeline')} ({timeline.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'vaccines' && styles.tabButtonActive]}
          onPress={() => setActiveTab('vaccines')}
        >
          <Text style={[styles.tabText, activeTab === 'vaccines' && styles.tabTextActive]}>
            {t('farmer.vaccines', 'Vaccines')} ({vaccinations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'treatments' && styles.tabButtonActive]}
          onPress={() => setActiveTab('treatments')}
        >
          <Text style={[styles.tabText, activeTab === 'treatments' && styles.tabTextActive]}>
            {t('farmer.services', 'Treatments')} ({treatments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content 1: Overview */}
      {activeTab === 'overview' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Animal Overview & Production</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Daily Milk Yield</Text>
            <Text style={styles.infoValue}>{animal.milkYieldDaily || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Checkup</Text>
            <Text style={styles.infoValue}>{animal.lastCheckup || 'Not recorded'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Village / Farm</Text>
            <Text style={styles.infoValue}>{animal.village || 'Not specified'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Block / Taluka</Text>
            <Text style={styles.infoValue}>{animal.block || 'Not specified'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>District</Text>
            <Text style={styles.infoValue}>{animal.district || 'Not specified'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registered On</Text>
            <Text style={styles.infoValue}>
              {animal.createdAt ? new Date(animal.createdAt).toLocaleDateString('en-GB') : 'Not recorded'}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0, paddingTop: spacing.sm }]}>
            <Text style={styles.infoLabel}>Health Cases</Text>
            <TouchableOpacity onPress={() => router.push('/(farmer)/cases' as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: colors.light.primary, fontWeight: typography.weights.bold, fontSize: typography.sizes.xs }}>
                View Cases →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab Content 2: Health Timeline */}
      {activeTab === 'timeline' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Health & Clinical Timeline</Text>

          {timeline.length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Text style={styles.tabEmptyIcon}>📋</Text>
              <Text style={styles.tabEmptyTitle}>No Timeline Events Logged</Text>
              <Text style={styles.tabEmptySub}>
                Use the AI Disease Scan or schedule a vet checkup to log health milestones.
              </Text>
            </View>
          ) : (
            timeline.map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineEventTitle}>{event.title}</Text>
                    <Text style={styles.timelineDate}>{event.date}</Text>
                  </View>
                  <Text style={styles.timelineType}>{event.type}</Text>
                  {event.disease && (
                    <Text style={styles.timelineDisease}>
                      Condition: <Text style={{ fontWeight: 'bold' }}>{event.disease}</Text>
                    </Text>
                  )}
                  {event.doctor && (
                    <Text style={styles.timelineDoctor}>👨‍⚕️ Clinician: {event.doctor}</Text>
                  )}
                  {event.notes && <Text style={styles.timelineNotes}>{event.notes}</Text>}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Tab Content 3: Vaccination Records */}
      {activeTab === 'vaccines' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Vaccination Records</Text>

          {vaccinations.length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Text style={styles.tabEmptyIcon}>💉</Text>
              <Text style={styles.tabEmptyTitle}>No Vaccination Records</Text>
              <Text style={styles.tabEmptySub}>
                No vaccination records available for this animal.
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: spacing.md,
                  backgroundColor: colors.light.primary,
                  paddingHorizontal: spacing.base,
                  paddingVertical: spacing.sm,
                  borderRadius: radii.sm,
                }}
                onPress={() => router.push('/(farmer)/vaccination' as any)}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.light.textInverse, fontWeight: typography.weights.bold, fontSize: typography.sizes.xs }}>
                  View Vaccination Camps & Schedules →
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            vaccinations.map((vac, index) => (
              <View key={index} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle}>{vac.vaccine}</Text>
                  <View
                    style={[
                      styles.vaccineStatusBadge,
                      vac.status === 'Overdue' ? styles.badgeOverdue : styles.badgeDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.vaccineStatusText,
                        vac.status === 'Overdue' ? styles.textOverdue : styles.textDone,
                      ]}
                    >
                      {vac.status || 'Administered'}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordRow}>
                  <Text style={styles.recordMeta}>
                    📅 Given: {vac.date ? new Date(vac.date).toLocaleDateString('en-GB') : 'N/A'}
                  </Text>
                  {vac.nextDue && (
                    <Text style={styles.recordMeta}>
                      ⏰ Next Due: {new Date(vac.nextDue).toLocaleDateString('en-GB')}
                    </Text>
                  )}
                </View>

                {vac.dose && <Text style={styles.recordDetail}>Dose: {vac.dose}</Text>}
                {vac.batchNumber && (
                  <Text style={styles.recordDetail}>Batch: {vac.batchNumber}</Text>
                )}
                {vac.administeredBy && (
                  <Text style={styles.recordDetail}>By: {vac.administeredBy}</Text>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* Tab Content 4: Treatments */}
      {activeTab === 'treatments' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Prescriptions & Treatments</Text>

          {treatments.length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Text style={styles.tabEmptyIcon}>💊</Text>
              <Text style={styles.tabEmptyTitle}>No Prescribed Treatments</Text>
              <Text style={styles.tabEmptySub}>
                No ongoing veterinary treatments registered for this animal.
              </Text>
            </View>
          ) : (
            treatments.map((t, index) => (
              <View key={index} style={styles.recordCard}>
                <Text style={styles.recordTitle}>{t.condition}</Text>
                <Text style={styles.treatmentText}>Rx: {t.treatment}</Text>
                <Text style={styles.recordMeta}>
                  📅 Date: {t.date ? new Date(t.date).toLocaleDateString('en-GB') : 'Not recorded'}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.light.background,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: spacing.sm,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  errorSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  retryBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
  },
  retryBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  backBtn: {
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  backBtnText: {
    color: colors.light.textSecondary,
    fontSize: typography.sizes.xs,
  },
  profileCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.light.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarEmoji: {
    fontSize: 30,
  },
  profileTitleArea: {
    flex: 1,
  },
  animalNameText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  tagBadge: {
    marginTop: 2,
  },
  tagBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    fontWeight: typography.weights.semibold,
  },
  healthPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  healthPillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtnScan: {
    flex: 1,
    backgroundColor: colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    gap: spacing.xs,
    ...shadows.sm,
  },
  actionBtnIcon: {
    fontSize: 16,
  },
  actionBtnScanText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  actionBtnEdit: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1.5,
    borderColor: colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    gap: spacing.xs,
  },
  actionBtnEditText: {
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.sm,
    padding: 3,
    marginBottom: spacing.base,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.light.surface,
    ...shadows.sm,
  },
  tabText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
  },
  tabTextActive: {
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
  },
  sectionCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  tabEmptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  tabEmptyIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  tabEmptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  tabEmptySub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
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
    marginTop: 5,
    marginRight: spacing.sm,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: colors.light.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineEventTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  timelineDate: {
    fontSize: 10,
    color: colors.light.textMuted,
  },
  timelineType: {
    fontSize: 11,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
    marginBottom: 2,
  },
  timelineDisease: {
    fontSize: 11,
    color: colors.light.danger,
    marginBottom: 2,
  },
  timelineDoctor: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  timelineNotes: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  recordCard: {
    backgroundColor: colors.light.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  recordTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    flex: 1,
  },
  vaccineStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  badgeDone: {
    backgroundColor: colors.light.successBg,
  },
  badgeOverdue: {
    backgroundColor: colors.light.dangerBg,
  },
  vaccineStatusText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  textDone: {
    color: colors.light.success,
  },
  textOverdue: {
    color: colors.light.danger,
  },
  recordRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: 2,
  },
  recordMeta: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  recordDetail: {
    fontSize: 11,
    color: colors.light.textMuted,
  },
  treatmentText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.light.primary,
    marginVertical: 2,
  },
});
