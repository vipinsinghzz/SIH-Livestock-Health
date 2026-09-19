/**
 * Livestock Saathi - Veterinarian Referral & Triage Queue
 * File: mobile/app/(vet)/referrals/index.tsx
 * 
 * Production referral queue backed by GET /api/cases and atomic PATCH /api/cases/:id/claim.
 * Features 5-stage lifecycle filtering + "My Cases", pull-to-refresh,
 * offline read caching, and atomic claim action.
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
  Alert,
  TextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import { veterinarianService } from '../../../src/services/veterinarianService';
import { DiseaseCase, getStatusTheme, getRiskTheme } from '../../../src/types/case';
import {
  ReferralFilterType,
  isCaseClaimable,
  isCaseAssignedToVet
} from '../../../src/types/referral';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

const FILTER_OPTIONS: Array<{ key: ReferralFilterType; label: string }> = [
  { key: 'all', label: 'All Cases' },
  { key: 'New', label: 'New Referrals' },
  { key: 'my_cases', label: 'My Cases' },
  { key: 'Investigating', label: 'Investigating' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Containment', label: 'Containment' },
  { key: 'Resolved', label: 'Resolved' },
];

export default function VetReferralsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string; status?: string }>();
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState<ReferralFilterType>(
    (params.filter as ReferralFilterType) || (params.status as ReferralFilterType) || 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cases, setCases] = useState<DiseaseCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const vetId = user?.id || user?._id;
  const vetDistrict = user?.district || 'District';

  const loadReferrals = useCallback(async () => {
    try {
      setError(null);
      const result = await veterinarianService.getVeterinarianReferrals({
        district: user?.district,
        limit: 100,
      });
      setCases(result.cases);
      setIsFromCache(result.fromCache);
    } catch (err: any) {
      console.warn('[VetReferrals] Error loading cases:', err?.message);
      setError(err?.message || 'Failed to load referral cases.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.district]);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  // Update filter if route params change
  useEffect(() => {
    if (params.filter && FILTER_OPTIONS.some((f) => f.key === params.filter)) {
      setActiveFilter(params.filter as ReferralFilterType);
    } else if (params.status && FILTER_OPTIONS.some((f) => f.key === params.status)) {
      setActiveFilter(params.status as ReferralFilterType);
    }
  }, [params.filter, params.status]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReferrals();
  }, [loadReferrals]);

  const handleClaim = async (caseItem: DiseaseCase) => {
    const caseTargetId = caseItem.id || caseItem._id || caseItem.caseId;
    if (!caseTargetId) return;

    Alert.alert(
      'Take Clinical Responsibility',
      `Confirm claiming case ${caseItem.caseId} (${caseItem.disease})?\n\nThis will record your identity as the attending veterinarian and transition status to Investigating.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim Case',
          style: 'default',
          onPress: async () => {
            try {
              setClaimingId(caseTargetId);
              await veterinarianService.claimCase(caseTargetId);
              Alert.alert('Case Claimed', `You are now the attending doctor for case ${caseItem.caseId}.`);
              loadReferrals();
            } catch (claimErr: any) {
              Alert.alert('Unable to Claim Case', claimErr.message || 'Failed to claim case.');
            } finally {
              setClaimingId(null);
            }
          }
        }
      ]
    );
  };

  // Client-side filtering across active stage and search query
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // 1. Stage filter
      if (activeFilter === 'New') {
        const s = String(c.status || '').toUpperCase();
        if (s !== 'NEW' && s !== 'OPEN') return false;
      } else if (activeFilter === 'my_cases') {
        if (!isCaseAssignedToVet(c, vetId)) return false;
      } else if (activeFilter === 'Investigating') {
        const s = String(c.status || '').toUpperCase();
        if (s !== 'INVESTIGATING' && s !== 'ACCEPTED') return false;
      } else if (activeFilter === 'Confirmed') {
        const s = String(c.status || '').toUpperCase();
        if (s !== 'CONFIRMED') return false;
      } else if (activeFilter === 'Containment') {
        const s = String(c.status || '').toUpperCase();
        if (s !== 'CONTAINMENT' && s !== 'IN_TREATMENT') return false;
      } else if (activeFilter === 'Resolved') {
        const s = String(c.status || '').toUpperCase();
        if (s !== 'RESOLVED' && s !== 'CLOSED') return false;
      }

      // 2. Search query (disease, caseId, species, village, farmer)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const diseaseMatch = (c.disease || '').toLowerCase().includes(q);
        const caseIdMatch = (c.caseId || '').toLowerCase().includes(q);
        const speciesMatch = (c.species || '').toLowerCase().includes(q);
        const animalNameMatch = (c.animalName || '').toLowerCase().includes(q);
        const villageMatch = (c.farmerLocation?.village || '').toLowerCase().includes(q);
        const farmerMatch = (c.farmerContact?.name || '').toLowerCase().includes(q);
        if (!diseaseMatch && !caseIdMatch && !speciesMatch && !animalNameMatch && !villageMatch && !farmerMatch) {
          return false;
        }
      }

      return true;
    });
  }, [cases, activeFilter, searchQuery, vetId]);

  // Compute counts for filter pills
  const filterCounts = useMemo(() => {
    let newC = 0;
    let invC = 0;
    let myC = 0;
    let confC = 0;
    let contC = 0;
    let resC = 0;

    for (const c of cases) {
      const s = String(c.status || '').toUpperCase();
      if (s === 'NEW' || s === 'OPEN') newC++;
      if (s === 'INVESTIGATING' || s === 'ACCEPTED') invC++;
      if (s === 'CONFIRMED') confC++;
      if (s === 'CONTAINMENT' || s === 'IN_TREATMENT') contC++;
      if (s === 'RESOLVED' || s === 'CLOSED') resC++;
      if (vetId && isCaseAssignedToVet(c, vetId)) myC++;
    }

    return {
      all: cases.length,
      New: newC,
      my_cases: myC,
      Investigating: invC,
      Confirmed: confC,
      Containment: contC,
      Resolved: resC,
    };
  }, [cases, vetId]);

  const renderCaseCard = ({ item }: { item: DiseaseCase }) => {
    const targetId = item.id || item._id || item.caseId;
    const statusTheme = getStatusTheme(item.status);
    const riskTheme = getRiskTheme(item.risk);
    const isClaimable = isCaseClaimable(item);
    const isMine = isCaseAssignedToVet(item, vetId);

    // Assigned doctor display
    let assignedDoctorName = '';
    if (typeof item.assignedVetId === 'object' && item.assignedVetId !== null) {
      assignedDoctorName = item.assignedVetId.name || '';
    } else if ((item as any).assignedVet?.name) {
      assignedDoctorName = (item as any).assignedVet.name;
    }

    return (
      <TouchableOpacity
        style={styles.caseCard}
        onPress={() => router.push(`/(vet)/referrals/${targetId}` as any)}
        activeOpacity={0.85}
      >
        {/* Card Header: Case ID, Risk, Status */}
        <View style={styles.cardHeader}>
          <View style={styles.caseIdBadge}>
            <Text style={styles.caseIdText}>{item.caseId}</Text>
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

        {/* Disease Title & Confidence */}
        <Text style={styles.diseaseTitle}>
          {item.disease}{' '}
          {item.confidence ? (
            <Text style={styles.confidenceText}>({item.confidence}% AI match)</Text>
          ) : null}
        </Text>

        {/* Patient & Location Meta */}
        <Text style={styles.metaRow}>
          🐄 {item.species || 'Livestock'} {item.animalName ? `(${item.animalName})` : ''} •{' '}
          📍 {item.farmerLocation?.village || 'Village'}, {item.farmerLocation?.block || item.districtId || vetDistrict}
        </Text>

        {/* Symptoms Tags */}
        {item.symptoms && item.symptoms.length > 0 && (
          <View style={styles.symptomsRow}>
            {item.symptoms.slice(0, 3).map((sym, idx) => (
              <View key={idx} style={styles.symptomPill}>
                <Text style={styles.symptomText}>• {sym}</Text>
              </View>
            ))}
            {item.symptoms.length > 3 && (
              <Text style={styles.moreSymptomsText}>+{item.symptoms.length - 3} more</Text>
            )}
          </View>
        )}

        {/* Card Footer: Farmer Contact & Claim Action */}
        <View style={styles.cardFooter}>
          <Text style={styles.farmerContactText}>
            👤 {item.farmerContact?.name || 'Farmer'}
            {item.farmerContact?.phone ? ` • 📞 ${item.farmerContact.phone}` : ''}
          </Text>

          {isClaimable ? (
            <TouchableOpacity
              style={styles.claimButton}
              onPress={() => handleClaim(item)}
              disabled={claimingId === targetId}
              activeOpacity={0.8}
            >
              {claimingId === targetId ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.claimButtonText}>Claim Case</Text>
              )}
            </TouchableOpacity>
          ) : isMine ? (
            <View style={styles.myCaseBadge}>
              <Text style={styles.myCaseBadgeText}>Assigned to You</Text>
            </View>
          ) : assignedDoctorName ? (
            <Text style={styles.assignedOtherText}>Dr. {assignedDoctorName}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <OfflineNotice />

      {/* Top Controls: Search Bar & Stage Pills */}
      <View style={styles.controlsWrapper}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search disease, case ID, animal, village..."
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

        {/* Horizontal Filter Pills */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_OPTIONS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const count = filterCounts[item.key] ?? 0;
            const isSelected = activeFilter === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setActiveFilter(item.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  {item.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {isFromCache && (
          <View style={styles.cacheNoticeBanner}>
            <Text style={styles.cacheNoticeBannerText}>
              ⚡ Offline Mode: Displaying saved referrals from local device cache.
            </Text>
          </View>
        )}
      </View>

      {/* Main List / Loading / Error / Empty States */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Loading district referral queue...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error Loading Referrals</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadReferrals} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry Loading</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCases}
          keyExtractor={(item) => item.id || item._id || item.caseId}
          renderItem={renderCaseCard}
          contentContainerStyle={styles.casesList}
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
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Matching Referrals</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No cases matched "${searchQuery}".`
                  : `There are currently no cases matching filter "${activeFilter}".`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  controlsWrapper: {
    backgroundColor: colors.light.surface,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    ...shadows.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    height: 42,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
    paddingVertical: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: colors.light.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  filterList: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.round,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginRight: spacing.xs,
  },
  filterPillActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  filterPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  cacheNoticeBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.base,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  cacheNoticeBannerText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: typography.weights.medium,
  },
  casesList: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  caseCard: {
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
  caseIdBadge: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  caseIdText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  riskPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  diseaseTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  confidenceText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.light.primary,
  },
  metaRow: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  symptomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.sm,
  },
  symptomPill: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  symptomText: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  moreSymptomsText: {
    fontSize: 10,
    color: colors.light.textSecondary,
    alignSelf: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs,
  },
  farmerContactText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    flex: 1,
  },
  claimButton: {
    backgroundColor: '#065F46',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  myCaseBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  myCaseBadgeText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  assignedOtherText: {
    fontSize: 10,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
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
    fontSize: 36,
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
  },
});
