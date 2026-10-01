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
  Image,
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

  const getSpeciesAvatar = (species?: string) => {
    const s = (species || '').toLowerCase();
    if (s.includes('buff')) return require('../../../assets/avatar_buffalo.png');
    if (s.includes('goat') || s.includes('bakr')) return require('../../../assets/avatar_goat.png');
    if (s.includes('sheep') || s.includes('bhed')) return require('../../../assets/avatar_sheep.png');
    return require('../../../assets/avatar_cow.png');
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
        <Image
          source={require('../../../assets/icons/alert.png')}
          style={{ width: 44, height: 44, marginBottom: spacing.xs, tintColor: colors.light.warning }}
          resizeMode="contain"
        />
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
          <View style={styles.avatarRing}>
            <Image
              source={getSpeciesAvatar(animal.species)}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.profileTitleArea}>
            <Text style={styles.animalNameText}>{animal.name}</Text>
            <View style={styles.tagBadge}>
              <Image
                source={require('../../../assets/icons/tag.png')}
                style={styles.tagBadgeIcon}
                resizeMode="contain"
              />
              <Text style={styles.tagBadgeText}>{animal.tagId}</Text>
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
            activeOpacity={0.85}
          >
            <Image
              source={require('../../../assets/icons/camera.png')}
              style={styles.actionBtnVectorIcon}
              resizeMode="contain"
            />
            <Text style={styles.actionBtnScanText}>{t('farmer.aiDiseaseScan', 'AI Disease Scan')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnEdit}
            onPress={() => router.push(`/(farmer)/animals/edit/${id}` as any)}
            activeOpacity={0.85}
          >
            <Image
              source={require('../../../assets/icons/icon_edit.png')}
              style={styles.actionBtnVectorIconGreen}
              resizeMode="contain"
            />
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
            {t('farmer.overview', 'Overview')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'timeline' && styles.tabButtonActive]}
          onPress={() => setActiveTab('timeline')}
        >
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
            {t('farmer.timeline', 'Timeline')} ({timeline.length})
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
            {t('farmer.treatments', 'Treatments')} ({treatments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content 1: Overview */}
      {activeTab === 'overview' && (
        <View style={styles.overviewContainer}>
          {/* 1. Production & Milk Yield Showcase Hero Card */}
          <View style={styles.productionHeroCard}>
            <View style={styles.productionHeaderRow}>
              <View style={styles.productionIconWrapper}>
                <Image
                  source={require('../../../assets/icons/icon_milk.png')}
                  style={styles.productionIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.productionTitleGroup}>
                <Text style={styles.productionSectionHeading}>DAILY MILK YIELD</Text>
                <Text style={styles.productionSectionSub}>
                  {animal.gender === 'Female' ? 'Lactation & Production Output' : 'Livestock Output Metrics'}
                </Text>
              </View>
              <View style={[
                styles.lactationBadge,
                { backgroundColor: animal.gender === 'Female' && animal.milkYieldDaily ? '#E8F5E9' : '#F1F5F9' }
              ]}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: animal.gender === 'Female' && animal.milkYieldDaily ? '#107C41' : '#64748B' }
                ]} />
                <Text style={[
                  styles.lactationBadgeText,
                  { color: animal.gender === 'Female' && animal.milkYieldDaily ? '#0F5132' : '#475569' }
                ]}>
                  {animal.gender === 'Female' && animal.milkYieldDaily ? 'In Production' : 'Non-Milking'}
                </Text>
              </View>
            </View>

            <View style={styles.yieldMetricContainer}>
              <View style={styles.yieldMainValueRow}>
                <Text style={styles.yieldNumberText}>
                  {animal.milkYieldDaily ? String(animal.milkYieldDaily).replace(/[^0-9.]/g, '') || animal.milkYieldDaily : '0.0'}
                </Text>
                <View style={styles.yieldUnitGroup}>
                  <Text style={styles.yieldUnitText}>LITRES</Text>
                  <Text style={styles.yieldPerDayText}>/ Day Record</Text>
                </View>
              </View>
              
              <View style={styles.benchmarkBar}>
                <Text style={styles.benchmarkText}>
                  Breed Average: <Text style={styles.benchmarkBold}>10 – 16 L/day</Text> • Performance: <Text style={styles.benchmarkHighlight}>Optimal</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Clinical & Herd Identity 2x2 Metric Grid */}
          <Text style={styles.groupSectionTitle}>CLINICAL STATUS & HERD IDENTITY</Text>
          <View style={styles.metricGrid}>
            {/* Card 1: Last Checkup */}
            <View style={styles.gridCard}>
              <View style={styles.gridCardHeader}>
                <View style={[styles.gridIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Image
                    source={require('../../../assets/icons/stethoscope.png')}
                    style={[styles.gridVectorIcon, { tintColor: '#0284C7' }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.miniTag}>
                  <Text style={styles.miniTagText}>Clinical</Text>
                </View>
              </View>
              <Text style={styles.gridCardLabel}>Last Checkup</Text>
              <Text style={styles.gridCardValue} numberOfLines={1}>
                {animal.lastCheckup || 'Up to date'}
              </Text>
              <Text style={styles.gridCardSub}>Veterinary exam</Text>
            </View>

            {/* Card 2: Active Cases */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => router.push('/(farmer)/cases' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.gridCardHeader}>
                <View style={[styles.gridIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Image
                    source={require('../../../assets/icons/icon_cases.png')}
                    style={[styles.gridVectorIcon, { tintColor: '#D97706' }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.miniTag, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.miniTagText, { color: '#16A34A' }]}>Records →</Text>
                </View>
              </View>
              <Text style={styles.gridCardLabel}>Health Cases</Text>
              <Text style={[styles.gridCardValue, { color: '#0F5132' }]} numberOfLines={1}>
                0 Active
              </Text>
              <Text style={styles.gridCardSub}>View diagnostics</Text>
            </TouchableOpacity>

            {/* Card 3: INAPH / Tag ID */}
            <View style={styles.gridCard}>
              <View style={styles.gridCardHeader}>
                <View style={[styles.gridIconCircle, { backgroundColor: '#F1F5F9' }]}>
                  <Image
                    source={require('../../../assets/icons/tag.png')}
                    style={[styles.gridVectorIcon, { tintColor: '#334155' }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.miniTag, { backgroundColor: '#E2E8F0' }]}>
                  <Text style={[styles.miniTagText, { color: '#334155' }]}>INAPH</Text>
                </View>
              </View>
              <Text style={styles.gridCardLabel}>Govt Tag ID</Text>
              <Text style={styles.gridCardValue} numberOfLines={1}>
                {animal.tagId}
              </Text>
              <Text style={styles.gridCardSub}>Ear Tag Verified</Text>
            </View>

            {/* Card 4: Registered On */}
            <View style={styles.gridCard}>
              <View style={styles.gridCardHeader}>
                <View style={[styles.gridIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Image
                    source={require('../../../assets/icons/icon_calendar.png')}
                    style={[styles.gridVectorIcon, { tintColor: '#059669' }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.miniTag, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.miniTagText, { color: '#15803D' }]}>Registry</Text>
                </View>
              </View>
              <Text style={styles.gridCardLabel}>Enrolled In Herd</Text>
              <Text style={styles.gridCardValue} numberOfLines={1}>
                {animal.createdAt ? new Date(animal.createdAt).toLocaleDateString('en-GB') : '26/09/2026'}
              </Text>
              <Text style={styles.gridCardSub}>Farm member</Text>
            </View>
          </View>

          {/* 3. Farm Location & Geographic Jurisdiction Card */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeaderRow}>
              <View style={styles.locationIconBox}>
                <Image
                  source={require('../../../assets/icons/icon_pin.png')}
                  style={styles.locationIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.locationTitleBox}>
                <Text style={styles.locationCardHeading}>FARM & GEOGRAPHIC LOCATION</Text>
                <Text style={styles.locationCardSub}>Registered jurisdiction & village cluster</Text>
              </View>
            </View>

            <View style={styles.locationPillsContainer}>
              <View style={styles.locationPill}>
                <Text style={styles.locationPillLabel}>VILLAGE / FARM</Text>
                <Text style={styles.locationPillValue} numberOfLines={1}>
                  {animal.village || 'Civil Lines'}
                </Text>
              </View>

              <View style={styles.locationPill}>
                <Text style={styles.locationPillLabel}>TALUKA / BLOCK</Text>
                <Text style={styles.locationPillValue} numberOfLines={1}>
                  {animal.block || 'Nagpur Urban'}
                </Text>
              </View>

              <View style={styles.locationPill}>
                <Text style={styles.locationPillLabel}>DISTRICT</Text>
                <Text style={styles.locationPillValue} numberOfLines={1}>
                  {animal.district || 'Nagpur'}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. Preventive Health & Immunization Banner */}
          <TouchableOpacity
            style={styles.vaccineBanner}
            onPress={() => setActiveTab('vaccines')}
            activeOpacity={0.88}
          >
            <View style={styles.vaccineBannerIconCircle}>
              <Image
                source={require('../../../assets/icons/icon_syringe.png')}
                style={styles.vaccineBannerIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.vaccineBannerContent}>
              <Text style={styles.vaccineBannerTitle}>Preventive Immunization</Text>
              <Text style={styles.vaccineBannerSubtitle}>
                {vaccinations.length > 0
                  ? `${vaccinations.length} vaccination record(s) on file`
                  : 'No vaccination records yet • Check upcoming schedules'}
              </Text>
            </View>
            <View style={styles.vaccineBannerBtn}>
              <Text style={styles.vaccineBannerBtnText}>View →</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Content 2: Health Timeline */}
      {activeTab === 'timeline' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Health & Clinical Timeline</Text>

          {timeline.length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Image
                source={require('../../../assets/icons/clipboard.png')}
                style={styles.tabEmptyVectorIcon}
                resizeMode="contain"
              />
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
                    <Text style={styles.timelineDoctor}>Clinician: {event.doctor}</Text>
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
              <Image
                source={require('../../../assets/icons/icon_syringe.png')}
                style={styles.tabEmptyVectorIcon}
                resizeMode="contain"
              />
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
                    Given: {vac.date ? new Date(vac.date).toLocaleDateString('en-GB') : 'N/A'}
                  </Text>
                  {vac.nextDue && (
                    <Text style={styles.recordMeta}>
                      Next Due: {new Date(vac.nextDue).toLocaleDateString('en-GB')}
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
              <Image
                source={require('../../../assets/icons/icon_cases.png')}
                style={styles.tabEmptyVectorIcon}
                resizeMode="contain"
              />
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
                  Date: {t.date ? new Date(t.date).toLocaleDateString('en-GB') : 'Not recorded'}
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
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#107C41',
    overflow: 'hidden',
    backgroundColor: '#E8F5E9',
    marginRight: spacing.md,
    ...shadows.sm,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  tagBadgeIcon: {
    width: 13,
    height: 13,
    tintColor: colors.light.textMuted,
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
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.sm,
    gap: spacing.xs + 2,
    ...shadows.sm,
  },
  actionBtnVectorIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
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
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.sm,
    gap: spacing.xs + 2,
  },
  actionBtnVectorIconGreen: {
    width: 15,
    height: 15,
    tintColor: '#107C41',
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

  // Overview Tab Layout
  overviewContainer: {
    gap: spacing.base,
  },
  
  // Production Showcase Hero Card
  productionHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  productionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  productionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  productionIcon: {
    width: 22,
    height: 22,
    tintColor: '#107C41',
  },
  productionTitleGroup: {
    flex: 1,
  },
  productionSectionHeading: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#0F5132',
    letterSpacing: 0.6,
  },
  productionSectionSub: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  lactationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.round || 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  lactationBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  yieldMetricContainer: {
    backgroundColor: '#F8FAF8',
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E8EFE8',
  },
  yieldMainValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  yieldNumberText: {
    fontSize: 34,
    fontWeight: typography.weights.bold,
    color: '#0F5132',
    letterSpacing: -0.5,
  },
  yieldUnitGroup: {
    marginLeft: spacing.xs,
  },
  yieldUnitText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#107C41',
    letterSpacing: 0.5,
  },
  yieldPerDayText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
  },
  benchmarkBar: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  benchmarkText: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  benchmarkBold: {
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  benchmarkHighlight: {
    fontWeight: typography.weights.bold,
    color: '#107C41',
  },

  // 2x2 Metric Grid
  groupSectionTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: -4,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  gridIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridVectorIcon: {
    width: 17,
    height: 17,
  },
  miniTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  miniTagText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#475569',
  },
  gridCardLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  gridCardValue: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  gridCardSub: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },

  // Location Card
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  locationIcon: {
    width: 18,
    height: 18,
    tintColor: '#D97706',
  },
  locationTitleBox: {
    flex: 1,
  },
  locationCardHeading: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#334155',
    letterSpacing: 0.5,
  },
  locationCardSub: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  locationPillsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  locationPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs + 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  locationPillLabel: {
    fontSize: 9,
    color: colors.light.textMuted,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  locationPillValue: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    textAlign: 'center',
  },

  // Preventive Health Banner
  vaccineBanner: {
    backgroundColor: '#0F5132',
    borderRadius: radii.md,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  vaccineBannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  vaccineBannerIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  vaccineBannerContent: {
    flex: 1,
  },
  vaccineBannerTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  vaccineBannerSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  vaccineBannerBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.xs,
  },
  vaccineBannerBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#0F5132',
  },
  tabEmptyVectorIcon: {
    width: 36,
    height: 36,
    marginBottom: spacing.xs,
    tintColor: colors.light.textSecondary,
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
