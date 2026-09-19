/**
 * Livestock Saathi - Veterinarian Clinical Cases Queue
 * File: mobile/app/(vet)/cases/index.tsx
 * 
 * Phase 9.2: Active patient cases assigned to the authenticated veterinarian.
 * Backed by GET /api/cases?filter=my_cases with SQLite read caching,
 * search filtering, pull-to-refresh, and direct navigation to clinical examination.
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
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import { veterinarianService } from '../../../src/services/veterinarianService';
import { DiseaseCase, getStatusTheme, getRiskTheme } from '../../../src/types/case';
import { isCaseAssignedToVet } from '../../../src/types/referral';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

export default function VetClinicalCasesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [cases, setCases] = useState<DiseaseCase[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const vetId = user?.id || user?._id;
  const vetName = user?.name ? user.name.replace(/^Dr\.\s*/i, '') : 'Doctor';

  const loadMyCases = useCallback(async () => {
    try {
      setError(null);
      const result = await veterinarianService.getVeterinarianReferrals({
        district: user?.district,
        filter: 'my_cases',
        limit: 100,
      });

      // Isolate cases assigned to current veterinarian
      const myCases = result.cases.filter((c) => isCaseAssignedToVet(c, vetId));
      setCases(myCases);
      setIsFromCache(result.fromCache);
    } catch (err: any) {
      console.warn('[VetCasesScreen] Error loading my cases:', err?.message);
      setError(err?.message || 'Failed to load assigned patient cases.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.district, vetId]);

  useEffect(() => {
    loadMyCases();
  }, [loadMyCases]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMyCases();
  }, [loadMyCases]);

  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase().trim();
    return cases.filter((c) => {
      const diseaseMatch = (c.disease || '').toLowerCase().includes(q);
      const diagMatch = (c.clinicalDiagnosis || '').toLowerCase().includes(q);
      const caseIdMatch = (c.caseId || '').toLowerCase().includes(q);
      const speciesMatch = (c.species || '').toLowerCase().includes(q);
      const animalMatch = (c.animalName || '').toLowerCase().includes(q);
      const villageMatch = (c.farmerLocation?.village || '').toLowerCase().includes(q);
      const farmerMatch = (c.farmerContact?.name || '').toLowerCase().includes(q);
      return diseaseMatch || diagMatch || caseIdMatch || speciesMatch || animalMatch || villageMatch || farmerMatch;
    });
  }, [cases, searchQuery]);

  const renderCaseCard = ({ item }: { item: DiseaseCase }) => {
    const targetId = item.id || item._id || item.caseId;
    const statusTheme = getStatusTheme(item.status);
    const riskTheme = getRiskTheme(item.risk);

    return (
      <TouchableOpacity
        style={styles.caseCard}
        onPress={() => router.push(`/(vet)/referrals/${targetId}` as any)}
        activeOpacity={0.85}
      >
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

        <Text style={styles.diseaseTitle}>
          {item.clinicalDiagnosis || item.disease}
        </Text>

        <Text style={styles.metaRow}>
          🐄 {item.species || 'Livestock'} {item.animalName ? `(${item.animalName})` : ''} •{' '}
          📍 {item.farmerLocation?.village || 'Village'}, {item.farmerLocation?.block || item.districtId}
        </Text>

        {item.prescription ? (
          <View style={styles.rxPreviewBox}>
            <Text style={styles.rxPreviewLabel}>Rx Medication:</Text>
            <Text style={styles.rxPreviewText} numberOfLines={1}>
              {item.prescription}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.farmerContactText}>
            👤 {item.farmerContact?.name || 'Farmer'}
            {item.farmerContact?.phone ? ` • 📞 ${item.farmerContact.phone}` : ''}
          </Text>
          <Text style={styles.openCaseLink}>View & Update ➔</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <OfflineNotice />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Assigned Patient Cases</Text>
            <Text style={styles.headerSubtitle}>
              Dr. {vetName} • {cases.length} active patient case(s)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.triageQueueBtn}
            onPress={() => router.push('/(vet)/referrals')}
            activeOpacity={0.8}
          >
            <Text style={styles.triageQueueBtnText}>📋 Triage Queue</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search patient, disease, diagnosis, tag, village..."
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

        {isFromCache && (
          <View style={styles.cacheNoticeBanner}>
            <Text style={styles.cacheNoticeBannerText}>
              ⚡ Offline Mode: Displaying saved patient cases from device cache.
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Loading assigned patient cases...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error Loading Patient Cases</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadMyCases} activeOpacity={0.8}>
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
              <Text style={styles.emptyIcon}>🩺</Text>
              <Text style={styles.emptyTitle}>No Active Patient Cases</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No patient cases matched "${searchQuery}".`
                  : 'You have not claimed any referral cases yet. Visit the Triage Queue to review and claim district cases.'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.gotoTriageBtn}
                  onPress={() => router.push('/(vet)/referrals')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.gotoTriageBtnText}>Go to Triage Queue</Text>
                </TouchableOpacity>
              )}
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
  triageQueueBtn: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  triageQueueBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    height: 40,
    marginTop: spacing.xs,
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
  cacheNoticeBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
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
  metaRow: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  rxPreviewBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 6,
    marginBottom: spacing.xs,
  },
  rxPreviewLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#065F46',
    textTransform: 'uppercase',
  },
  rxPreviewText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.light.textPrimary,
    marginTop: 1,
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
  openCaseLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#065F46',
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
    lineHeight: 18,
  },
  gotoTriageBtn: {
    marginTop: spacing.base,
    backgroundColor: '#065F46',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  gotoTriageBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
});
