/**
 * Livestock Saathi - Officer: Official Biosecurity Advisories & Bulletins
 * File: mobile/app/(officer)/advisories/index.tsx
 *
 * Phase 10.4 Implementation:
 * Official Biosecurity Advisory Governance & Broadcast for District Officers.
 * Integrates:
 * - GET /api/advisories (District-filtered official biosecurity bulletins)
 * - POST /api/advisories (Officer broadcast with strict role authorization)
 * - Offline SQLite caching with last-updated timestamp
 * - Strictly ONLINE ONLY creation mutations
 * - Strict district scoping: zero hardcoded fallbacks
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { advisoryService } from '../../../src/services/advisoryService';
import {
  OfficialAdvisory,
  AdvisorySeverity,
  getAdvisorySeverityTheme,
} from '../../../src/types/advisory';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export default function OfficerAdvisoriesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const district = user?.district;

  // State
  const [advisories, setAdvisories] = useState<OfficialAdvisory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>('ALL');

  // Broadcast Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formMessage, setFormMessage] = useState<string>('');
  const [formSeverity, setFormSeverity] = useState<AdvisorySeverity>('High');
  const [formDisease, setFormDisease] = useState<string>('');
  const [formBlock, setFormBlock] = useState<string>('All');
  const [formVillage, setFormVillage] = useState<string>('All');

  // Load advisories
  const loadAdvisories = useCallback(
    async (isPullRefresh = false) => {
      if (!district) {
        setLoading(false);
        setRefreshing(false);
        setErrorMessage(
          'Officer district jurisdiction is not configured on this account. Contact system administrator.'
        );
        return;
      }

      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const severityParam = activeFilter !== 'ALL' ? activeFilter : undefined;
        const result = await advisoryService.getAdvisories({
          district,
          severity: severityParam,
        });

        setAdvisories(result.advisories);
        setIsFromCache(result.fromCache);
        setLastUpdated(result.lastUpdated);
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to retrieve official advisories.');
        setAdvisories([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [district, activeFilter]
  );

  useEffect(() => {
    loadAdvisories();
  }, [loadAdvisories]);

  // Filtered advisories
  const displayedAdvisories = useMemo(() => {
    if (activeFilter === 'ALL') return advisories;
    return advisories.filter(
      (a) => String(a.severity).toUpperCase() === activeFilter
    );
  }, [advisories, activeFilter]);

  // Handle Broadcast Submission
  const handleBroadcastSubmit = async () => {
    if (!district) {
      Alert.alert(
        'Configuration Error',
        'Cannot issue an advisory without an assigned officer district.'
      );
      return;
    }

    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      Alert.alert(
        'Offline Action Blocked',
        'Official biosecurity advisories cannot be issued while offline. Please connect to the internet and retry.'
      );
      return;
    }

    if (!formTitle.trim()) {
      Alert.alert('Validation Error', 'Please provide a clear advisory title.');
      return;
    }
    if (!formMessage.trim()) {
      Alert.alert('Validation Error', 'Please provide the complete advisory message / guidelines.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await advisoryService.createAdvisory({
        title: formTitle.trim(),
        message: formMessage.trim(),
        severity: formSeverity,
        disease: formDisease.trim() || 'General Livestock Alert',
        targetBlock: formBlock.trim() || 'All',
        targetVillage: formVillage.trim() || 'All',
        targetDistrict: district,
      });

      Alert.alert(
        'Advisory Broadcasted',
        response.message || 'Official biosecurity advisory has been published successfully.'
      );
      setModalVisible(false);
      setFormTitle('');
      setFormMessage('');
      setFormDisease('');
      setFormBlock('All');
      setFormVillage('All');
      loadAdvisories();
    } catch (err: any) {
      Alert.alert('Broadcast Failed', err.message || 'Server rejected advisory creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return 'Date unavailable';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.officerBadge} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Official Biosecurity Advisories</Text>
            <Text style={styles.headerSubtitle}>
              {district ? `Jurisdiction: ${district} District` : 'District Jurisdiction Unavailable'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.broadcastButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Broadcast New Advisory"
            accessibilityRole="button"
          >
            <Text style={styles.broadcastButtonText}>+ Broadcast</Text>
          </TouchableOpacity>
        </View>

        {/* Severity Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as SeverityFilter[]).map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.7}
                accessibilityLabel={`Filter by ${tab} severity`}
                accessibilityRole="button"
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Offline Notice */}
      <OfflineNotice />
      {isFromCache && (
        <View style={styles.cachedNoticeBanner}>
          <Text style={styles.cachedNoticeText}>
            📦 Displaying cached biosecurity advisories
            {lastUpdated ? ` • Last synced: ${new Date(lastUpdated).toLocaleTimeString()}` : ''}
          </Text>
        </View>
      )}

      {/* Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.light.officerBadge} />
          <Text style={styles.loadingText}>Loading official biosecurity advisories...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Surveillance Notice</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadAdvisories()}
            activeOpacity={0.8}
            accessibilityLabel="Retry loading advisories"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : displayedAdvisories.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAdvisories(true)}
              colors={[colors.light.officerBadge]}
            />
          }
        >
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Active Advisories</Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'ALL'
              ? `No biosecurity advisories currently issued for ${district || 'this district'}.`
              : `No ${activeFilter.toLowerCase()} severity advisories recorded.`}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAdvisories(true)}
              colors={[colors.light.officerBadge]}
            />
          }
        >
          {displayedAdvisories.map((adv) => {
            const advId = String(adv.id || adv._id || '');
            const theme = getAdvisorySeverityTheme(adv.severity);
            const title = typeof adv.title === 'object' ? adv.title.en || adv.title.hi : adv.title;
            const message = typeof adv.message === 'object' ? adv.message.en || adv.message.hi : adv.message;

            return (
              <View key={advId} style={styles.card}>
                {/* Top Badge & Date */}
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: theme.bgColor, borderColor: theme.borderColor },
                    ]}
                  >
                    <Text style={[styles.severityBadgeText, { color: theme.color }]}>
                      {theme.label}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatTimestamp(adv.createdAt)}</Text>
                </View>

                {/* Title */}
                <Text style={styles.cardTitle}>{title}</Text>

                {/* Disease & Geographical Scope */}
                <View style={styles.metaRow}>
                  <View style={styles.metaTag}>
                    <Text style={styles.metaTagLabel}>Disease:</Text>
                    <Text style={styles.metaTagValue}>{adv.disease || 'General'}</Text>
                  </View>
                  <View style={styles.metaTag}>
                    <Text style={styles.metaTagLabel}>Scope:</Text>
                    <Text style={styles.metaTagValue}>
                      {adv.targetBlock && adv.targetBlock !== 'All' ? `${adv.targetBlock} Block` : 'District-wide'}
                      {adv.targetVillage && adv.targetVillage !== 'All' ? ` (${adv.targetVillage})` : ''}
                    </Text>
                  </View>
                </View>

                {/* Message preview */}
                <Text style={styles.cardMessage} numberOfLines={3}>
                  {message}
                </Text>

                {/* Authority & Action Row */}
                <View style={styles.cardFooter}>
                  <Text style={styles.issuedByText} numberOfLines={1}>
                    Issued by: {adv.issuedBy || 'Animal Husbandry Dept'}
                  </Text>
                  <TouchableOpacity
                    style={styles.viewDetailButton}
                    onPress={() => router.push(`/(officer)/advisories/${advId}` as any)}
                    activeOpacity={0.8}
                    accessibilityLabel={`View details for advisory ${title}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.viewDetailText}>View Details →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Broadcast Advisory Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Broadcast Biosecurity Advisory</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close broadcast modal"
                accessibilityRole="button"
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Jurisdiction</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>
                  {district ? `${district} District (Authoritative)` : 'District Unavailable'}
                </Text>
              </View>

              <Text style={styles.inputLabel}>Severity Level *</Text>
              <View style={styles.severitySelector}>
                {(['Critical', 'High', 'Moderate', 'Low'] as AdvisorySeverity[]).map((sev) => {
                  const isSelected = formSeverity === sev;
                  const theme = getAdvisorySeverityTheme(sev);
                  return (
                    <TouchableOpacity
                      key={sev}
                      style={[
                        styles.severityOption,
                        isSelected && {
                          backgroundColor: theme.bgColor,
                          borderColor: theme.color,
                        },
                      ]}
                      onPress={() => setFormSeverity(sev)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Set severity to ${sev}`}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.severityOptionText,
                          isSelected && { color: theme.color, fontWeight: '700' },
                        ]}
                      >
                        {sev}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Advisory Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Immediate Vector Control & Animal Movement Restriction"
                placeholderTextColor={colors.light.textMuted}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.inputLabel}>Target Disease</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Lumpy Skin Disease / Foot & Mouth Disease"
                placeholderTextColor={colors.light.textMuted}
                value={formDisease}
                onChangeText={setFormDisease}
              />

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Target Block</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="All or Block Name"
                    placeholderTextColor={colors.light.textMuted}
                    value={formBlock}
                    onChangeText={setFormBlock}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Target Village</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="All or Village Name"
                    placeholderTextColor={colors.light.textMuted}
                    value={formVillage}
                    onChangeText={setFormVillage}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Official Guidelines & Preventive Measures *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Specify biosecurity instructions, quarantine rules, disinfectant protocols, or ring vaccination mandates..."
                placeholderTextColor={colors.light.textMuted}
                value={formMessage}
                onChangeText={setFormMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <View style={styles.modalNotice}>
                <Text style={styles.modalNoticeText}>
                  🛡️ This official advisory will be broadcasted to all registered field veterinarians and livestock farmers across the selected jurisdiction.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleBroadcastSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
                accessibilityLabel="Confirm broadcast advisory"
                accessibilityRole="button"
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.light.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Publish Official Advisory</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    backgroundColor: colors.light.officerBadge,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.officerBadgeBg,
    marginTop: 2,
  },
  broadcastButton: {
    backgroundColor: colors.light.textInverse,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.round,
    ...shadows.sm,
  },
  broadcastButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.officerBadge,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  filterChipActive: {
    backgroundColor: colors.light.textInverse,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textInverse,
    fontWeight: typography.weights.semibold,
  },
  filterChipTextActive: {
    color: colors.light.officerBadge,
    fontWeight: typography.weights.bold,
  },
  cachedNoticeBanner: {
    backgroundColor: colors.light.warningBg,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.warning,
  },
  cachedNoticeText: {
    fontSize: typography.sizes.xs,
    color: colors.light.warning,
    fontWeight: typography.weights.medium,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: spacing.md,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.light.officerBadge,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  cardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  metaTagLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
  },
  metaTagValue: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  cardMessage: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs + 2,
  },
  issuedByText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    flex: 1,
    marginRight: spacing.sm,
  },
  viewDetailButton: {
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  viewDetailText: {
    fontSize: typography.sizes.xs,
    color: colors.light.officerBadge,
    fontWeight: typography.weights.bold,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.light.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  modalCloseText: {
    fontSize: 20,
    color: colors.light.textMuted,
    padding: spacing.xs,
  },
  modalScroll: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  readOnlyField: {
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  readOnlyText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  severitySelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  severityOption: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    backgroundColor: colors.light.surface,
  },
  severityOptionText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  textInput: {
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 4,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  modalNotice: {
    backgroundColor: colors.light.primarySubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.primaryHighlight,
  },
  modalNoticeText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primaryDark,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: colors.light.officerBadge,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    ...shadows.md,
    marginBottom: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
});
