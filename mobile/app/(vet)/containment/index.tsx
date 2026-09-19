/**
 * Livestock Saathi - Veterinarian Containment Zones & Ring Vaccination Operations
 * File: mobile/app/(vet)/containment/index.tsx
 * 
 * Phase 9.4: Biosecurity quarantine perimeters and emergency ring vaccination management.
 * Backed by:
 * - GET /api/cases/containment-zones (List active/historical perimeters)
 * - POST /api/cases/containment-zones (Declare quarantine buffer)
 * - PATCH /api/cases/containment-zones/:zoneId/status (Update ACTIVE -> CONTAINED -> LIFTED)
 * - POST /api/cases/:id/schedule-ring-vaccination (Emergency Ring Vaccination scheduling)
 * 
 * Strict Zero-Mock Policy: Real server records only, SQLite read caching,
 * online-only mutation enforcement, and full audit trail logging.
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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import { containmentService } from '../../../src/services/containmentService';
import {
  ContainmentZone,
  ContainmentZoneStatus,
  getContainmentStatusTheme,
  DEFAULT_CONTAINMENT_RULES,
} from '../../../src/types/containment';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All Perimeters' },
  { key: 'ACTIVE', label: '🔴 Active Quarantine' },
  { key: 'CONTAINED', label: '🟡 Contained' },
  { key: 'LIFTED', label: '🟢 Lifted' },
];

export default function VetContainmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userDistrict = user?.district || 'Pune';

  const [zones, setZones] = useState<ContainmentZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Declare Containment Zone Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createDisease, setCreateDisease] = useState<string>('Lumpy Skin Disease');
  const [createCaseId, setCreateCaseId] = useState<string>('');
  const [createRadiusKm, setCreateRadiusKm] = useState<number>(5.0);
  const [createVillage, setCreateVillage] = useState<string>('');
  const [createBlock, setCreateBlock] = useState<string>(user?.block || 'Baramati');
  const [createLat, setCreateLat] = useState<string>('18.5204');
  const [createLng, setCreateLng] = useState<string>('73.8567');
  const [createNotes, setCreateNotes] = useState<string>('');
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);

  // Update Status Modal State
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [targetZoneForStatus, setTargetZoneForStatus] = useState<ContainmentZone | null>(null);
  const [newStatus, setNewStatus] = useState<ContainmentZoneStatus>('CONTAINED');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [submittingStatus, setSubmittingStatus] = useState<boolean>(false);

  // Schedule Ring Vaccination Modal State
  const [showRingModal, setShowRingModal] = useState<boolean>(false);
  const [targetZoneForRing, setTargetZoneForRing] = useState<ContainmentZone | null>(null);
  const [ringVenue, setRingVenue] = useState<string>('');
  const [ringDate, setRingDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [ringCapacity, setRingCapacity] = useState<string>('250');
  const [ringNotes, setRingNotes] = useState<string>('');
  const [submittingRing, setSubmittingRing] = useState<boolean>(false);

  const loadZones = useCallback(async () => {
    try {
      setError(null);
      const res = await containmentService.getContainmentZones({
        district: userDistrict,
        status: activeFilter !== 'all' ? activeFilter : undefined,
      });
      setZones(res.zones);
      setIsFromCache(res.fromCache);
    } catch (err: any) {
      console.warn('[VetContainment] Error loading zones:', err?.message);
      setError(err?.message || 'Failed to load containment zones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userDistrict, activeFilter]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadZones();
  }, [loadZones]);

  // Client-side quick search filter
  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones;
    const q = searchQuery.toLowerCase().trim();
    return zones.filter((z) => {
      const diseaseMatch = (z.disease || '').toLowerCase().includes(q);
      const idMatch = (z.zoneId || z.id || '').toLowerCase().includes(q);
      const villageMatch = (z.village || '').toLowerCase().includes(q);
      const blockMatch = (z.block || '').toLowerCase().includes(q);
      const notesMatch = (z.notes || '').toLowerCase().includes(q);
      return diseaseMatch || idMatch || villageMatch || blockMatch || notesMatch;
    });
  }, [zones, searchQuery]);

  // Handle Declare Containment Zone
  const handleCreateZone = async () => {
    if (!createDisease.trim()) {
      Alert.alert('Disease Required', 'Please specify the infectious disease triggering this quarantine.');
      return;
    }

    const latNum = parseFloat(createLat);
    const lngNum = parseFloat(createLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid GPS latitude and longitude numbers.');
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await containmentService.createContainmentZone({
        disease: createDisease.trim(),
        caseId: createCaseId.trim() || undefined,
        district: userDistrict,
        block: createBlock.trim() || undefined,
        village: createVillage.trim() || undefined,
        radiusKm: createRadiusKm,
        center: { lat: latNum, lng: lngNum },
        enforcedRules: DEFAULT_CONTAINMENT_RULES,
        notes: createNotes.trim() || undefined,
      });

      Alert.alert('Containment Zone Declared', res.message || 'Quarantine buffer established successfully.');
      setShowCreateModal(false);
      setCreateDisease('Lumpy Skin Disease');
      setCreateCaseId('');
      setCreateNotes('');
      loadZones();
    } catch (err: any) {
      Alert.alert('Declaration Failed', err.message || 'Failed to establish containment zone.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async () => {
    if (!targetZoneForStatus) return;
    const cleanId = targetZoneForStatus.zoneId || targetZoneForStatus.id;

    try {
      setSubmittingStatus(true);
      const res = await containmentService.updateContainmentZoneStatus(cleanId, {
        status: newStatus,
        notes: statusNotes.trim() || undefined,
      });

      Alert.alert('Status Updated', res.message || `Perimeter status changed to ${newStatus}.`);
      setShowStatusModal(false);
      setTargetZoneForStatus(null);
      setStatusNotes('');
      loadZones();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update containment zone status.');
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Handle Schedule Ring Vaccination
  const handleScheduleRing = async () => {
    if (!targetZoneForRing) return;
    const targetCaseId = targetZoneForRing.caseId || targetZoneForRing.case_id || targetZoneForRing.zoneId;

    try {
      setSubmittingRing(true);
      const res = await containmentService.scheduleRingVaccination(targetCaseId, {
        campDate: ringDate,
        venue: ringVenue.trim() || `Emergency Ring Post - ${targetZoneForRing.village || userDistrict}`,
        capacity: parseInt(ringCapacity, 10) || 250,
        notes: ringNotes.trim() || undefined,
      });

      Alert.alert('Ring Vaccination Scheduled', res.message || 'Emergency outbreak immunization drive created.');
      setShowRingModal(false);
      setTargetZoneForRing(null);
      setRingNotes('');
      loadZones();
    } catch (err: any) {
      Alert.alert('Scheduling Failed', err.message || 'Failed to schedule ring vaccination drive.');
    } finally {
      setSubmittingRing(false);
    }
  };

  const renderItem = ({ item }: { item: ContainmentZone }) => {
    const theme = getContainmentStatusTheme(item.status);
    const radius = item.radiusKm || 5.0;
    const locationStr = [item.village, item.block, item.district].filter(Boolean).join(', ');

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.zoneBadge}>
            <Text style={styles.zoneBadgeText}>🛡️ {item.zoneId || 'ZONE'}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: theme.bgColor, borderColor: theme.borderColor }]}>
            <Text style={[styles.statusPillText, { color: theme.color }]}>{theme.label}</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.diseaseTitle}>{item.disease}</Text>
          <View style={styles.radiusPill}>
            <Text style={styles.radiusPillText}>{radius} km Buffer</Text>
          </View>
        </View>

        <Text style={styles.locationText}>📍 {locationStr || `${userDistrict} District`}</Text>

        {item.caseId ? (
          <Text style={styles.caseLinkText}>
            Linked Case: <Text style={styles.boldText}>{item.caseId}</Text>
          </Text>
        ) : null}

        {item.notes ? <Text style={styles.notesText} numberOfLines={2}>📝 {item.notes}</Text> : null}

        {/* Biosecurity Enforced Rules Tags */}
        <View style={styles.rulesWrap}>
          {(item.enforcedRules || item.enforced_rules || DEFAULT_CONTAINMENT_RULES).slice(0, 2).map((r, i) => (
            <View key={`rule_${i}`} style={styles.ruleTag}>
              <Text style={styles.ruleTagText} numberOfLines={1}>• {r}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons Row */}
        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => {
              setTargetZoneForStatus(item);
              setNewStatus(item.status === 'ACTIVE' ? 'CONTAINED' : 'LIFTED');
              setStatusNotes(item.notes || '');
              setShowStatusModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnOutlineText}>✏️ Update Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => {
              setTargetZoneForRing(item);
              setRingVenue(`Emergency Ring Unit - ${item.village || item.district}`);
              setShowRingModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnPrimaryText}>💉 Launch Ring Drive</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <OfflineNotice />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Containment & Ring Vaccination</Text>
            <Text style={styles.headerSubtitle}>
              {userDistrict} District • {zones.length} Quarantine Perimeter(s)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.declareBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.declareBtnText}>+ Declare Zone</Text>
          </TouchableOpacity>
        </View>

        {/* Metric Strip */}
        <View style={styles.metricStrip}>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>ACTIVE ZONES</Text>
            <Text style={[styles.metricValue, { color: '#DC2626' }]}>
              {zones.filter((z) => z.status === 'ACTIVE').length}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>RING STANDARD</Text>
            <Text style={[styles.metricValue, { color: '#0369A1' }]}>1km Core / 3km Buffer</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>PATHOGENS</Text>
            <Text style={[styles.metricValue, { color: '#B45309' }]}>LSD • FMD • Anthrax</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search disease, zone ID, village, notes..."
            placeholderTextColor={colors.light.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((f) => {
            const isSelected = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isFromCache && (
          <View style={styles.cacheNoticeBanner}>
            <Text style={styles.cacheNoticeBannerText}>
              ⚡ Offline Mode: Displaying saved containment records from device memory.
            </Text>
          </View>
        )}
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Loading containment perimeters...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error Loading Perimeters</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadZones} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry Loading</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredZones}
          keyExtractor={(item) => item.id || item.zoneId || String(Math.random())}
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
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>No Quarantine Zones Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || activeFilter !== 'all'
                  ? 'No containment perimeters match the active filter or search term.'
                  : 'There are currently no active containment perimeters declared in this district. Click "+ Declare Zone" to establish biosecurity quarantine.'}
              </Text>
            </View>
          }
        />
      )}

      {/* 1. Modal: Declare Containment Zone */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Declare Quarantine Containment Zone</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Target Disease *</Text>
              <TextInput
                style={styles.modalInput}
                value={createDisease}
                onChangeText={setCreateDisease}
                placeholder="e.g. Lumpy Skin Disease, Foot and Mouth Disease"
                placeholderTextColor={colors.light.textSecondary}
              />

              <Text style={styles.inputLabel}>Associated Case ID (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={createCaseId}
                onChangeText={setCreateCaseId}
                placeholder="e.g. CASE-2026-0001"
                placeholderTextColor={colors.light.textSecondary}
              />

              <Text style={styles.inputLabel}>Quarantine Radius Buffer *</Text>
              <View style={styles.radiusOptionsRow}>
                {[1.0, 3.0, 5.0, 10.0].map((r) => {
                  const isSelected = createRadiusKm === r;
                  return (
                    <TouchableOpacity
                      key={`rad_${r}`}
                      style={[styles.radiusChip, isSelected && styles.radiusChipActive]}
                      onPress={() => setCreateRadiusKm(r)}
                    >
                      <Text style={[styles.radiusChipText, isSelected && styles.radiusChipTextActive]}>
                        {r} km
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.coordsRow}>
                <View style={styles.coordCol}>
                  <Text style={styles.inputLabel}>Center Lat *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={createLat}
                    onChangeText={setCreateLat}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.coordCol}>
                  <Text style={styles.inputLabel}>Center Lng *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={createLng}
                    onChangeText={setCreateLng}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Village / Sector</Text>
              <TextInput
                style={styles.modalInput}
                value={createVillage}
                onChangeText={setCreateVillage}
                placeholder="Village name"
                placeholderTextColor={colors.light.textSecondary}
              />

              <Text style={styles.inputLabel}>Biosecurity Notes</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={createNotes}
                onChangeText={setCreateNotes}
                placeholder="Disinfection protocols, barricade stations, ring vaccination directives..."
                placeholderTextColor={colors.light.textSecondary}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalNotice}>
                <Text style={styles.modalNoticeText}>
                  ℹ️ Declaring a containment zone sets an active biosecurity perimeter, advances linked cases to "Containment", and notifies district vets. Requires active internet.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateZone}
                disabled={submittingCreate}
              >
                {submittingCreate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Establish Containment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Modal: Update Containment Status */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Containment Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Target Status *</Text>
              <View style={styles.statusOptionsRow}>
                {(['ACTIVE', 'CONTAINED', 'LIFTED'] as ContainmentZoneStatus[]).map((st) => {
                  const isSelected = newStatus === st;
                  const theme = getContainmentStatusTheme(st);
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusOptionChip,
                        isSelected && { backgroundColor: theme.bgColor, borderColor: theme.color },
                      ]}
                      onPress={() => setNewStatus(st)}
                    >
                      <Text style={[styles.statusOptionChipText, isSelected && { color: theme.color, fontWeight: 'bold' }]}>
                        {theme.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Clinical Status / Resolution Notes</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={statusNotes}
                onChangeText={setStatusNotes}
                placeholder="Reason for advancing perimeter, negative PCR results, vaccination completion..."
                placeholderTextColor={colors.light.textSecondary}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowStatusModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleUpdateStatus}
                disabled={submittingStatus}
              >
                {submittingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Modal: Schedule Ring Vaccination */}
      <Modal visible={showRingModal} transparent animationType="slide" onRequestClose={() => setShowRingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Emergency Ring Vaccination</Text>
              <TouchableOpacity onPress={() => setShowRingModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Target Outbreak / Zone</Text>
              <Text style={styles.readOnlyBox}>
                Zone: {targetZoneForRing?.zoneId} • {targetZoneForRing?.disease} ({targetZoneForRing?.district})
              </Text>

              <Text style={styles.inputLabel}>Vaccination Post / Venue *</Text>
              <TextInput
                style={styles.modalInput}
                value={ringVenue}
                onChangeText={setRingVenue}
                placeholder="e.g. Primary School Ground, Gram Panchayat Yard"
                placeholderTextColor={colors.light.textSecondary}
              />

              <View style={styles.coordsRow}>
                <View style={styles.coordCol}>
                  <Text style={styles.inputLabel}>Drive Date (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={ringDate}
                    onChangeText={setRingDate}
                  />
                </View>
                <View style={styles.coordCol}>
                  <Text style={styles.inputLabel}>Capacity (Doses) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={ringCapacity}
                    onChangeText={setRingCapacity}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Operational Directives</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={ringNotes}
                onChangeText={setRingNotes}
                placeholder="Cold chain transport protocols, mobile vaccination team deployment..."
                placeholderTextColor={colors.light.textSecondary}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRingModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleScheduleRing}
                disabled={submittingRing}
              >
                {submittingRing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Deploy Ring Drive</Text>
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
    paddingBottom: spacing.xs,
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
  declareBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  declareBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  metricStrip: {
    flexDirection: 'row',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.xs,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.light.border,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    marginTop: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    height: 36,
    marginTop: spacing.xs,
  },
  searchIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
    paddingVertical: 0,
  },
  clearSearch: {
    fontSize: 12,
    color: colors.light.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  filterScroll: {
    paddingVertical: 6,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
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
    fontSize: 10,
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
  zoneBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  zoneBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#B91C1C',
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  diseaseTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  radiusPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  radiusPillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#1E40AF',
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  caseLinkText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  notesText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    marginVertical: 3,
  },
  rulesWrap: {
    gap: 2,
    marginVertical: 4,
    backgroundColor: colors.light.surfaceAlt,
    padding: 6,
    borderRadius: radii.sm,
  },
  ruleTag: {
    paddingVertical: 1,
  },
  ruleTagText: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs,
    marginTop: 6,
  },
  actionBtnOutline: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  actionBtnOutlineText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  actionBtnPrimary: {
    backgroundColor: '#0369A1',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    paddingBottom: spacing.xs,
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
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 3,
  },
  modalInput: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
  },
  modalTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  radiusOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  radiusChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
  },
  radiusChipActive: {
    backgroundColor: '#0369A1',
    borderColor: '#0369A1',
  },
  radiusChipText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  radiusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coordCol: {
    flex: 1,
  },
  statusOptionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  statusOptionChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
  },
  statusOptionChipText: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  readOnlyBox: {
    backgroundColor: colors.light.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radii.sm,
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.medium,
    marginBottom: 4,
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
    fontSize: 10,
    color: '#1E40AF',
    lineHeight: 15,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.xs,
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
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
});
