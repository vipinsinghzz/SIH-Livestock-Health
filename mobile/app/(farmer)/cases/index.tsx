/**
 * Livestock Saathi - Farmer Health Cases List
 * File: mobile/app/(farmer)/cases/index.tsx
 * 
 * Displays all disease referral cases registered by or for the authenticated farmer,
 * with real-time search, status filtering, and navigation to case details.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppLanguage } from '../../../src/services/i18n';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { caseService } from '../../../src/services/caseService';
import {
  DiseaseCase,
  CaseFilter,
  normalizeCaseStatus,
  getStatusTheme,
  getRiskTheme,
} from '../../../src/types/case';

export default function FarmerCasesScreen() {
  const router = useRouter();
  const { t } = useAppLanguage();

  const [cases, setCases] = useState<DiseaseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<CaseFilter>('All');

  const filterOptions = useMemo((): { key: CaseFilter; label: string }[] => [
    { key: 'All', label: t('cases.allCases', 'All Cases') },
    { key: 'New', label: t('cases.new', 'New') },
    { key: 'Investigating', label: t('cases.investigating', 'Investigating') },
    { key: 'Confirmed', label: t('cases.confirmed', 'Confirmed') },
    { key: 'Containment', label: t('cases.containment', 'Containment') },
    { key: 'Resolved', label: t('cases.resolved', 'Resolved') },
    { key: 'HighRisk', label: `⚠️ ${t('cases.highRisk', 'High Risk')}` },
  ], [t]);

  const loadCases = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      const data = await caseService.getFarmerCases();
      setCases(data);
    } catch (err: any) {
      console.warn('[FarmerCases] Error loading cases:', err.message);
      if (err.message && err.message.includes('Network')) {
        setErrorMessage('Unable to load case information. Please check your connection.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setErrorMessage('Session expired. Please log in again to view your cases.');
      } else {
        setErrorMessage('Something went wrong while loading disease cases. Please retry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      // 1. Status / Risk Filter
      if (selectedFilter !== 'All') {
        if (selectedFilter === 'HighRisk') {
          const r = (item.risk || '').toUpperCase();
          if (r !== 'HIGH' && r !== 'CRITICAL') return false;
        } else {
          const norm = normalizeCaseStatus(item.status);
          if (norm !== selectedFilter) return false;
        }
      }

      // 2. Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const caseId = (item.caseId || '').toLowerCase();
        const disease = (item.disease || '').toLowerCase();
        const animalName = (item.animalId?.name || item.animalName || '').toLowerCase();
        const tagId = (item.animalId?.tagId || '').toLowerCase();
        const species = (item.animalId?.species || item.species || '').toLowerCase();

        return (
          caseId.includes(q) ||
          disease.includes(q) ||
          animalName.includes(q) ||
          tagId.includes(q) ||
          species.includes(q)
        );
      }

      return true;
    });
  }, [cases, selectedFilter, searchQuery]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Date not available';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Date not available';
    }
  };

  const renderCaseCard = ({ item }: { item: DiseaseCase }) => {
    const statusTheme = getStatusTheme(item.status);
    const riskTheme = getRiskTheme(item.risk);
    const animalName = item.animalId?.name || item.animalName;
    const tagId = item.animalId?.tagId;
    const species = item.animalId?.species || item.species || 'Livestock';
    const identifier = item.caseId || item._id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/(farmer)/cases/${identifier}` as any)}
      >
        {/* Top Meta Row */}
        <View style={styles.cardHeader}>
          <View style={styles.caseIdBadge}>
            <Text style={styles.caseIdText}>{item.caseId || 'CASE'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {item.isPendingSync && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', marginRight: 6 },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>
                  ⏳ Pending Sync
                </Text>
              </View>
            )}
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
        </View>

        {/* Condition / Disease Title */}
        <Text style={styles.diseaseTitle}>{item.disease}</Text>

        {/* Animal & Species Info */}
        <View style={styles.animalInfoRow}>
          <Text style={styles.animalIcon}>
            {species.toLowerCase().includes('buffalo')
              ? '🐃'
              : species.toLowerCase().includes('goat')
              ? '🐐'
              : species.toLowerCase().includes('sheep')
              ? '🐑'
              : '🐄'}
          </Text>
          <Text style={styles.animalLabel}>
            {animalName ? `${animalName} ` : ''}
            {tagId ? `(#${tagId}) • ` : ''}
            {species}
          </Text>
        </View>

        {/* Risk & Date Row */}
        <View style={styles.metaRow}>
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
          <Text style={styles.dateText}>📅 {formatDate(item.createdAt)}</Text>
        </View>

        {/* Veterinary Referral Progress Footer */}
        <View style={styles.cardFooter}>
          {item.assignedVetId ? (
            <View style={styles.vetAssignedBox}>
              <Text style={styles.vetAssignedIcon}>👨‍⚕️</Text>
              <Text style={styles.vetAssignedText} numberOfLines={1}>
                {t('cases.assignedVet', 'Assigned: {name}', { name: item.assignedVetId.name })}
              </Text>
            </View>
          ) : (
            <View style={styles.vetPendingBox}>
              <Text style={styles.vetPendingIcon}>⏳</Text>
              <Text style={styles.vetPendingText} numberOfLines={1}>
                {t('cases.requestReferral', 'Referral Pending • Dispatched to District Vets')}
              </Text>
            </View>
          )}
          <Text style={styles.chevron}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.primary} />

      {/* Header Search & Actions */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search', 'Search by case ID, disease, animal, or tag...')}
            placeholderTextColor={colors.light.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips Horizontal List */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterListContainer}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedFilter(item.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading clinical cases...')}</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('common.error', 'Notice')}</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadCases()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>🔄 {t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : cases.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>{t('farmer.noCasesYet', 'No Disease Cases Yet')}</Text>
          <Text style={styles.emptySub}>
            {t('farmer.noAnimalsDesc', 'You have not registered any veterinary referral cases. Screen your livestock with AI to detect health conditions early.')}
          </Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.push('/(farmer)/ai-scan' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionBtnText}>📷 {t('farmer.aiDiseaseScan', 'Start AI Screening')}</Text>
          </TouchableOpacity>
        </View>
      ) : filteredCases.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>{t('common.noData', 'No Matching Cases Found')}</Text>
          <Text style={styles.emptySub}>
            {t('common.search', 'No cases matched your filter and search criteria.')}
          </Text>
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => {
              setSearchQuery('');
              setSelectedFilter('All');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryActionBtnText}>{t('common.clear', 'Clear Filters')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCases}
          keyExtractor={(item) => item._id || item.caseId}
          renderItem={renderCaseCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadCases(true)}
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  searchSection: {
    backgroundColor: colors.light.surface,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    ...shadows.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.background,
    marginHorizontal: spacing.base,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.light.textMuted,
    padding: spacing.xs,
  },
  filterListContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.round,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.light.textSecondary,
  },
  filterChipTextActive: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
  listContainer: {
    padding: spacing.base,
    paddingBottom: spacing.hero,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
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
  caseIdBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
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
  diseaseTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  animalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  animalIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  animalLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  riskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  vetAssignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  vetAssignedIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  vetAssignedText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
  },
  vetPendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  vetPendingIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  vetPendingText: {
    fontSize: typography.sizes.xs,
    color: colors.light.warning,
    fontWeight: typography.weights.medium,
  },
  chevron: {
    fontSize: 16,
    color: colors.light.textMuted,
    fontWeight: typography.weights.bold,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
  },
  errorIcon: {
    fontSize: 44,
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
  retryBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  primaryActionBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  primaryActionBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  secondaryActionBtn: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  secondaryActionBtnText: {
    color: colors.light.textPrimary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
});
