/**
 * Livestock Saathi - Veterinarian Diagnostic Laboratory Pipeline
 * File: mobile/app/(vet)/labs/index.tsx
 * 
 * Phase 9.3: Diagnostic lab tests and specimen custody tracking.
 * Backed by GET /api/lab-referrals and POST /api/lab-referrals with SQLite
 * offline caching, 5-stage status filtering, specimen ordering, and direct navigation.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import { labService } from '../../../src/services/labService';
import {
  LabReferral,
  SAMPLE_TYPES,
  DESTINATION_LABS,
  getLabStatusTheme,
  LabSampleType
} from '../../../src/types/lab';
import { OfflineNotice } from '../../../src/components/OfflineNotice';
import { useAppLanguage } from '../../../src/services/i18n';

export default function VetLabsScreen() {
  const router = useRouter();
  const { t } = useAppLanguage();

  const STATUS_FILTERS: Array<{ key: string; label: string }> = [
    { key: 'all', label: t('vet.filterAll', 'All Samples') },
    { key: 'Collected', label: t('vet.stageCollected', '1. Collected') },
    { key: 'In Transit', label: t('vet.stageInTransit', '2. In Transit') },
    { key: 'Received', label: t('vet.stageReceived', '3. Received') },
    { key: 'Result Pending', label: t('vet.stageTesting', '4. Testing') },
    { key: 'Result Confirmed', label: t('vet.stageConfirmed', '5. Confirmed') },
  ];

  const [referrals, setReferrals] = useState<LabReferral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createCaseId, setCreateCaseId] = useState<string>('');
  const [createSampleType, setCreateSampleType] = useState<LabSampleType>('Blood / Serum');
  const [createReferredLab, setCreateReferredLab] = useState<string>(DESTINATION_LABS[0]);
  const [createNotes, setCreateNotes] = useState<string>('');
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);

  const loadReferrals = useCallback(async () => {
    try {
      setError(null);
      const res = await labService.getLabReferrals({
        status: activeStatusFilter !== 'all' ? activeStatusFilter : undefined,
        searchQuery: searchQuery.trim() || undefined,
      });
      setReferrals(res.referrals);
      setIsFromCache(res.fromCache);
    } catch (err: any) {
      console.warn('[VetLabsScreen] Error loading lab referrals:', err?.message);
      setError(err?.message || 'Failed to load diagnostic lab referrals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStatusFilter, searchQuery]);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReferrals();
  }, [loadReferrals]);

  // Client-side quick filter
  const filteredReferrals = useMemo(() => {
    if (!searchQuery.trim()) return referrals;
    const q = searchQuery.toLowerCase().trim();
    return referrals.filter((r) => {
      const diseaseMatch = (r.resultSummary?.confirmedDisease || '').toLowerCase().includes(q);
      const notesMatch = (r.resultSummary?.notes || '').toLowerCase().includes(q);
      const sampleMatch = (r.sampleType || '').toLowerCase().includes(q);
      const labMatch = (r.referredLab || '').toLowerCase().includes(q);
      const caseMatch = (r.report?.caseId || '').toLowerCase().includes(q);
      const animalMatch = (r.report?.animalTag || r.report?.species || '').toLowerCase().includes(q);
      const villageMatch = (r.report?.village || '').toLowerCase().includes(q);
      return diseaseMatch || notesMatch || sampleMatch || labMatch || caseMatch || animalMatch || villageMatch;
    });
  }, [referrals, searchQuery]);

  // Handle Create Lab Referral
  const handleCreateReferral = async () => {
    if (!createCaseId.trim()) {
      Alert.alert('Case ID Required', 'Please enter the associated case ID or surveillance report reference.');
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await labService.createLabReferral({
        caseId: createCaseId.trim(),
        sampleType: createSampleType,
        referredLab: createReferredLab,
        notes: createNotes.trim() || undefined,
      });

      Alert.alert('Lab Referral Created', res.message || 'Diagnostic sample logged successfully.');
      setShowCreateModal(false);
      setCreateCaseId('');
      setCreateNotes('');
      loadReferrals();
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Failed to create laboratory referral.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const renderItem = ({ item }: { item: LabReferral }) => {
    const targetId = item.id || item._id;
    const theme = getLabStatusTheme(item.status);
    const caseIdentifier = item.report?.caseId || item.report?.case_id || 'Case Unlinked';
    const species = item.report?.species || 'Livestock';
    const village = item.report?.village || item.report?.district || '';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(vet)/labs/${targetId}` as any)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.sampleBadge}>
            <Text style={styles.sampleBadgeText}>🧪 {item.sampleType}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: theme.bgColor, borderColor: theme.borderColor }]}>
            <Text style={[styles.statusPillText, { color: theme.color }]}>{theme.label}</Text>
          </View>
        </View>

        <Text style={styles.labName}>{item.referredLab}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.caseText}>
            📋 Case: <Text style={styles.caseBold}>{caseIdentifier}</Text> ({species})
          </Text>
          {village ? <Text style={styles.locationText}>📍 {village}</Text> : null}
        </View>

        {item.resultSummary?.confirmedDisease ? (
          <View style={styles.confirmedBox}>
            <Text style={styles.confirmedLabel}>{t('vet.confirmedPathogen', '🔬 Confirmed Pathogen / Finding:')}</Text>
            <Text style={styles.confirmedValue}>{item.resultSummary.confirmedDisease}</Text>
          </View>
        ) : item.resultSummary?.notes ? (
          <Text style={styles.notesPreview} numberOfLines={1}>
            📝 {item.resultSummary.notes}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {t('common.date', 'Collected')}: {item.collectionDate ? new Date(item.collectionDate).toLocaleDateString() : 'N/A'}
          </Text>
          <Text style={styles.viewLink}>{t('vet.viewLabDetails', 'View Details & Results ➔')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <OfflineNotice />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>{t('nav.diagnosticLabs', 'Diagnostic Lab Tests')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('vet.chainOfCustody', 'Diagnostic Chain of Custody')} • {t('vet.activeSamplesCount', '{count} active sample(s)', { count: referrals.length })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.orderSampleBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.orderSampleBtnText}>{t('vet.orderLabTestBtn', '+ Order Lab Test')}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('vet.searchLabsPlaceholder', 'Search sample, lab, case ID, pathogen, village...')}
            placeholderTextColor={colors.light.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((f) => {
            const isSelected = activeStatusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveStatusFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Offline Cache Notice */}
        {isFromCache && (
          <View style={styles.cacheNoticeBanner}>
            <Text style={styles.cacheNoticeBannerText}>
              {t('vet.offlineNotice', '⚡ Offline Mode: Displaying saved records from device cache.')}
            </Text>
          </View>
        )}
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading laboratory referrals...')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('common.error', 'Error Loading Lab Referrals')}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadReferrals} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>{t('common.retry', 'Retry Loading')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredReferrals}
          keyExtractor={(item) => item.id || item._id || String(Math.random())}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔬</Text>
              <Text style={styles.emptyTitle}>{t('vet.noLabSamples', 'No Laboratory Samples Found')}</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || activeStatusFilter !== 'all'
                  ? t('vet.noMatchingReferrals', 'No samples match the selected status filter or search term.')
                  : t('vet.noLabSamplesDesc', 'No diagnostic lab referrals currently recorded. Click "+ Order Lab Test" to submit a field specimen.')}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Lab Referral Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('vet.orderLabTest', 'Order Diagnostic Lab Test')}</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalInputLabel}>Associated Case ID *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., CASE-2026-0001 or Case UUID"
                placeholderTextColor={colors.light.textSecondary}
                value={createCaseId}
                onChangeText={setCreateCaseId}
              />

              <Text style={styles.modalInputLabel}>Diagnostic Sample Type *</Text>
              <View style={styles.optionsWrap}>
                {SAMPLE_TYPES.map((t) => {
                  const isSelected = createSampleType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.optionChip, isSelected && styles.optionChipActive]}
                      onPress={() => setCreateSampleType(t)}
                    >
                      <Text style={[styles.optionChipText, isSelected && styles.optionChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalInputLabel}>Destination Laboratory *</Text>
              <View style={styles.optionsWrap}>
                {DESTINATION_LABS.map((lab) => {
                  const isSelected = createReferredLab === lab;
                  return (
                    <TouchableOpacity
                      key={lab}
                      style={[styles.optionChip, isSelected && styles.optionChipActive]}
                      onPress={() => setCreateReferredLab(lab)}
                    >
                      <Text style={[styles.optionChipText, isSelected && styles.optionChipTextActive]} numberOfLines={1}>
                        {lab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalInputLabel}>Field Sampling Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Specimen condition, cold chain ice pack status, transit instructions..."
                placeholderTextColor={colors.light.textSecondary}
                value={createNotes}
                onChangeText={setCreateNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalNotice}>
                <Text style={styles.modalNoticeText}>
                  ℹ️ Submitting a lab referral records Dr. as collector and creates an audit milestone on the associated case. Requires active internet.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateReferral}
                disabled={submittingCreate}
              >
                {submittingCreate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>{t('vet.orderLabTestBtn', 'Submit Lab Referral')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  orderSampleBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  orderSampleBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    height: 38,
    marginTop: spacing.xs,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
    paddingVertical: 0,
  },
  clearSearch: {
    fontSize: 13,
    color: colors.light.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  filterScroll: {
    paddingVertical: spacing.xs,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.round,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  filterChipActive: {
    backgroundColor: '#0369A1',
    borderColor: '#0369A1',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  cacheNoticeBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginTop: 4,
  },
  cacheNoticeBannerText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: typography.weights.medium,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sampleBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  sampleBadgeText: {
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  labName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  caseText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  caseBold: {
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  confirmedBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 8,
    marginVertical: 4,
  },
  confirmedLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#047857',
    textTransform: 'uppercase',
  },
  confirmedValue: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#065F46',
    marginTop: 2,
  },
  notesPreview: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs,
    marginTop: 4,
  },
  dateText: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  viewLink: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
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
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.xl,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.light.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.base,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    padding: 4,
  },
  modalScroll: {
    marginBottom: spacing.base,
  },
  modalInputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
  },
  modalTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  optionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  optionChipActive: {
    backgroundColor: '#0369A1',
    borderColor: '#0369A1',
  },
  optionChipText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  optionChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  modalNotice: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.xs,
    marginTop: spacing.base,
  },
  modalNoticeText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
  },
  modalCancelBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
  },
  modalSubmitBtn: {
    backgroundColor: '#0369A1',
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radii.sm,
    minWidth: 140,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
});
