/**
 * Livestock Saathi - Officer: Containment Perimeters & Quarantine Governance
 * File: mobile/app/(officer)/containment/index.tsx
 *
 * Phase 10.3 Implementation:
 * Production Containment Perimeter Governance & Ring Vaccination Coordination.
 * Integrates:
 * - GET /api/cases/containment-zones (District quarantine perimeters)
 * - POST /api/cases/containment-zones (Declare quarantine buffer around confirmed outbreak)
 * - PATCH /api/cases/containment-zones/:zoneId/status (Advance ACTIVE -> CONTAINED -> LIFTED)
 * - POST /api/cases/:id/schedule-ring-vaccination (Emergency Ring Vaccination scheduling)
 * - Offline SQLite caching with last-updated timestamp
 * - Strictly ONLINE ONLY mutations with confirmation modals
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { containmentService } from '../../../src/services/containmentService';
import {
  ContainmentZone,
  ContainmentZoneStatus,
  getContainmentStatusTheme,
} from '../../../src/types/containment';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

type FilterTab = 'ALL' | 'ACTIVE' | 'CONTAINED' | 'LIFTED';

export default function OfficerContainmentScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    disease?: string;
    focusLat?: string;
    focusLng?: string;
    village?: string;
    block?: string;
    caseId?: string;
    mode?: string;
  }>();
  const { user } = useAuth();
  const district = user?.district;

  // State
  const [zones, setZones] = useState<ContainmentZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  // Mutation modals state
  const [selectedZone, setSelectedZone] = useState<ContainmentZone | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<ContainmentZoneStatus>('CONTAINED');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [submittingStatus, setSubmittingStatus] = useState<boolean>(false);

  // Declare zone modal
  const [declareModalVisible, setDeclareModalVisible] = useState<boolean>(false);
  const [newDisease, setNewDisease] = useState<string>('');
  const [newBlock, setNewBlock] = useState<string>('');
  const [newVillage, setNewVillage] = useState<string>('');
  const [newLat, setNewLat] = useState<string>('');
  const [newLng, setNewLng] = useState<string>('');
  const [newRadius, setNewRadius] = useState<string>('5.0');
  const [newNotes, setNewNotes] = useState<string>('');
  const [submittingDeclare, setSubmittingDeclare] = useState<boolean>(false);

  // Ring vaccination modal
  const [ringModalVisible, setRingModalVisible] = useState<boolean>(false);
  const [ringCaseId, setRingCaseId] = useState<string>('');
  const [ringVenue, setRingVenue] = useState<string>('');
  const [ringDate, setRingDate] = useState<string>('');
  const [ringCapacity, setRingCapacity] = useState<string>('500');
  const [ringNotes, setRingNotes] = useState<string>('');
  const [submittingRing, setSubmittingRing] = useState<boolean>(false);

  // Handle deep-link params from Outbreaks or Map
  useEffect(() => {
    if (searchParams.disease || searchParams.focusLat || searchParams.focusLng) {
      if (searchParams.mode === 'ring') {
        setRingCaseId(searchParams.caseId || '');
        setRingVenue(searchParams.village ? `Veterinary Center, ${searchParams.village}` : '');
        setRingModalVisible(true);
      } else {
        setNewDisease(searchParams.disease || '');
        setNewLat(searchParams.focusLat || '');
        setNewLng(searchParams.focusLng || '');
        setNewVillage(searchParams.village || '');
        setNewBlock(searchParams.block || '');
        setDeclareModalVisible(true);
      }
    }
  }, [searchParams.disease, searchParams.focusLat, searchParams.focusLng, searchParams.mode]);

  const loadZones = useCallback(async () => {
    if (!district) {
      setError('Officer district jurisdiction is not configured on this account. Contact system administrator.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const res = await containmentService.getContainmentZones({ district });
      setZones(res.zones || []);
      setIsFromCache(res.fromCache);
    } catch (err: any) {
      console.warn('[OfficerContainment] Error loading zones:', err.message);
      setError(err.message || 'Failed to load containment zones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [district]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadZones();
  }, [loadZones]);

  // Filtered zones
  const filteredZones = useMemo(() => {
    if (activeFilter === 'ALL') return zones;
    return zones.filter((z) => String(z.status || '').toUpperCase() === activeFilter);
  }, [zones, activeFilter]);

  // Active counts
  const activeCount = useMemo(
    () => zones.filter((z) => String(z.status || '').toUpperCase() === 'ACTIVE').length,
    [zones]
  );
  const containedCount = useMemo(
    () => zones.filter((z) => String(z.status || '').toUpperCase() === 'CONTAINED').length,
    [zones]
  );
  const liftedCount = useMemo(
    () => zones.filter((z) => String(z.status || '').toUpperCase() === 'LIFTED').length,
    [zones]
  );

  // Handle status update submission
  const handleStatusSubmit = async () => {
    if (!selectedZone) return;

    if (!district) {
      Alert.alert('District Unavailable', 'Cannot update containment status without an assigned officer district.');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      Alert.alert('Offline', 'Internet connection required for this action.');
      return;
    }

    try {
      setSubmittingStatus(true);
      await containmentService.updateContainmentZoneStatus(selectedZone.id || selectedZone.zoneId, {
        status: targetStatus,
        notes: statusNotes || undefined,
      });

      setStatusModalVisible(false);
      setStatusNotes('');
      setSelectedZone(null);
      Alert.alert('Status Updated', `Containment zone status updated to ${targetStatus}.`);
      loadZones();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update containment zone status.');
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Handle declare zone submission
  const handleDeclareSubmit = async () => {
    if (!district) {
      Alert.alert('District Unavailable', 'Cannot establish containment zone without an assigned officer district.');
      return;
    }

    if (!newDisease.trim()) {
      Alert.alert('Required Field', 'Please enter a disease name.');
      return;
    }
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      Alert.alert('Invalid Coordinates', 'Please enter valid GPS coordinates (latitude & longitude).');
      return;
    }

    const radius = parseFloat(newRadius);
    if (isNaN(radius) || radius <= 0) {
      Alert.alert('Invalid Radius', 'Please enter a valid positive containment radius in kilometers.');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      Alert.alert('Offline', 'Internet connection required for this action.');
      return;
    }

    try {
      setSubmittingDeclare(true);
      const res = await containmentService.createContainmentZone({
        disease: newDisease.trim(),
        district,
        block: newBlock.trim() || undefined,
        village: newVillage.trim() || undefined,
        center: { lat, lng },
        radiusKm: radius,
        notes: newNotes.trim() || undefined,
      });

      setDeclareModalVisible(false);
      setNewDisease('');
      setNewBlock('');
      setNewVillage('');
      setNewLat('');
      setNewLng('');
      setNewNotes('');
      Alert.alert('Zone Declared', res.message || 'Containment zone established successfully.');
      loadZones();
    } catch (err: any) {
      Alert.alert('Declaration Failed', err.message || 'Failed to create containment zone.');
    } finally {
      setSubmittingDeclare(false);
    }
  };

  // Handle schedule ring vaccination submission
  const handleRingSubmit = async () => {
    if (!district) {
      Alert.alert('District Unavailable', 'Cannot schedule ring vaccination without an assigned officer district.');
      return;
    }

    if (!ringCaseId.trim()) {
      Alert.alert('Case ID Required', 'Please provide a valid case or outbreak ID to schedule ring vaccination.');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      Alert.alert('Offline', 'Internet connection required for this action.');
      return;
    }

    try {
      setSubmittingRing(true);
      const res = await containmentService.scheduleRingVaccination(ringCaseId.trim(), {
        venue: ringVenue.trim() || undefined,
        campDate: ringDate.trim() || undefined,
        capacity: parseInt(ringCapacity, 10) || 500,
        notes: ringNotes.trim() || undefined,
      });

      setRingModalVisible(false);
      setRingCaseId('');
      setRingVenue('');
      setRingDate('');
      setRingCapacity('500');
      setRingNotes('');
      Alert.alert('Drive Scheduled', res.message || 'Emergency ring vaccination drive scheduled.');
    } catch (err: any) {
      Alert.alert('Scheduling Failed', err.message || 'Failed to schedule ring vaccination.');
    } finally {
      setSubmittingRing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.officerBadge} />
      <OfflineNotice />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Containment Perimeters</Text>
            <Text style={styles.headerSubtitle}>
              {district
                ? `${district} District • ${activeCount} Active Perimeter${activeCount !== 1 ? 's' : ''}`
                : 'District Jurisdiction Unavailable'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.declareBtn}
            onPress={() => setDeclareModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.declareBtnText}>+ Declare Zone</Text>
          </TouchableOpacity>
        </View>

        {isFromCache && (
          <View style={styles.cacheBanner}>
            <Text style={styles.cacheBannerText}>
              ⚡ Offline Mode: Displaying saved containment zones from device cache.
            </Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.tabChip, activeFilter === 'ALL' && styles.tabChipActive]}
          onPress={() => setActiveFilter('ALL')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabChipText, activeFilter === 'ALL' && styles.tabChipTextActive]}>
            All ({zones.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeFilter === 'ACTIVE' && styles.tabChipActiveActive]}
          onPress={() => setActiveFilter('ACTIVE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabChipText, activeFilter === 'ACTIVE' && styles.tabChipTextActive]}>
            🔴 Active ({activeCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeFilter === 'CONTAINED' && styles.tabChipActiveContained]}
          onPress={() => setActiveFilter('CONTAINED')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabChipText, activeFilter === 'CONTAINED' && styles.tabChipTextActive]}>
            🟠 Contained ({containedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeFilter === 'LIFTED' && styles.tabChipActiveLifted]}
          onPress={() => setActiveFilter('LIFTED')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabChipText, activeFilter === 'LIFTED' && styles.tabChipTextActive]}>
            🟢 Lifted ({liftedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.officerBadge} />
          <Text style={styles.loadingText}>Loading district containment perimeters...</Text>
        </View>
      ) : error && zones.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Containment Data Unavailable</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadZones} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry Loading</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.light.officerBadge]}
              tintColor={colors.light.officerBadge}
            />
          }
        >
          {filteredZones.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>No Containment Zones Found</Text>
              <Text style={styles.emptySub}>
                {zones.length === 0
                  ? `No quarantine perimeters currently active in ${district} district.`
                  : 'No containment zones match the selected filter.'}
              </Text>
            </View>
          ) : (
            filteredZones.map((zone) => {
              const theme = getContainmentStatusTheme(zone.status);
              const isActive = zone.status === 'ACTIVE';
              const isContained = zone.status === 'CONTAINED';
              const centerLat = zone.center?.lat ?? zone.centerLat;
              const centerLng = zone.center?.lng ?? zone.centerLng;

              return (
                <View key={zone.id || zone.zoneId} style={styles.zoneCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleGroup}>
                      <Text style={styles.zoneDisease}>{zone.disease}</Text>
                      <Text style={styles.zoneIdText}>{zone.zoneId}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: theme.bgColor, borderColor: theme.borderColor }]}>
                      <Text style={[styles.statusBadgeText, { color: theme.color }]}>
                        {zone.status}
                      </Text>
                    </View>
                  </View>

                  {/* Metadata Grid */}
                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Quarantine Radius</Text>
                      <Text style={styles.metaValue}>{zone.radiusKm} km</Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Location</Text>
                      <Text style={styles.metaValue}>
                        {zone.block || 'District'}{zone.village ? `, ${zone.village}` : ''}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>GPS Center</Text>
                      <Text style={styles.metaValue}>
                        {centerLat && centerLng ? `${centerLat.toFixed(2)}, ${centerLng.toFixed(2)}` : 'Recorded'}
                      </Text>
                    </View>
                  </View>

                  {/* Enforced Rules Preview */}
                  {Array.isArray(zone.enforcedRules) && zone.enforcedRules.length > 0 && (
                    <View style={styles.rulesBox}>
                      <Text style={styles.rulesTitle}>Biosecurity Quarantine Rules:</Text>
                      {zone.enforcedRules.slice(0, 2).map((rule, idx) => (
                        <Text key={idx} style={styles.ruleItem}>• {rule}</Text>
                      ))}
                      {zone.enforcedRules.length > 2 && (
                        <Text style={styles.ruleMore}>+{zone.enforcedRules.length - 2} more active rules</Text>
                      )}
                    </View>
                  )}

                  {/* Card Actions */}
                  <View style={styles.cardActionsRow}>
                    {/* Status Mutation Button */}
                    {isActive && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOrange]}
                        onPress={() => {
                          setSelectedZone(zone);
                          setTargetStatus('CONTAINED');
                          setStatusModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnText}>Mark Contained</Text>
                      </TouchableOpacity>
                    )}

                    {isContained && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnGreen]}
                        onPress={() => {
                          setSelectedZone(zone);
                          setTargetStatus('LIFTED');
                          setStatusModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnText}>Lift Quarantine</Text>
                      </TouchableOpacity>
                    )}

                    {/* Ring Vaccination Button */}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnBlue]}
                      onPress={() => {
                        setRingCaseId(zone.caseId || zone.zoneId);
                        setRingVenue(`Veterinary Camp, ${zone.village || zone.block || district}`);
                        setRingModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnText}>💉 Ring Vaccine</Text>
                    </TouchableOpacity>

                    {/* View on Map Button */}
                    {centerLat && centerLng && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOutline]}
                        onPress={() => {
                          router.push({
                            pathname: '/(officer)/map',
                            params: {
                              focusLat: String(centerLat),
                              focusLng: String(centerLng),
                            },
                          } as any);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnOutlineText}>🗺️ Map</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 1. Status Mutation Confirmation Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Containment Status Update</Text>
            <Text style={styles.modalDesc}>
              Advance quarantine status for {selectedZone?.zoneId}:
            </Text>
            <View style={styles.transitionBox}>
              <Text style={styles.transitionFrom}>{selectedZone?.status}</Text>
              <Text style={styles.transitionArrow}>➔</Text>
              <Text
                style={[
                  styles.transitionTo,
                  targetStatus === 'CONTAINED' ? { color: colors.light.warning } : { color: colors.light.success },
                ]}
              >
                {targetStatus}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Official Notes / Biosecurity Clearance (Optional):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Ring vaccination 100% complete, zero new cases reported in 14 days."
              value={statusNotes}
              onChangeText={setStatusNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setStatusModalVisible(false);
                  setSelectedZone(null);
                }}
                disabled={submittingStatus}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleStatusSubmit}
                disabled={submittingStatus}
              >
                {submittingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Declare Containment Zone Modal */}
      <Modal visible={declareModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContainer}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Declare Containment Zone</Text>
              <Text style={styles.modalDesc}>
                Establish an official biosecurity quarantine perimeter in {district}.
              </Text>

              <Text style={styles.inputLabel}>Disease Name *</Text>
              <TextInput
                style={styles.singleLineInput}
                placeholder="e.g. Lumpy Skin Disease"
                value={newDisease}
                onChangeText={setNewDisease}
              />

              <View style={styles.rowInputs}>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Block / Sub-District</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="e.g. Baramati"
                    value={newBlock}
                    onChangeText={setNewBlock}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Village</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="e.g. Morgaon"
                    value={newVillage}
                    onChangeText={setNewVillage}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Center Latitude *</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="e.g. 18.2812"
                    keyboardType="numeric"
                    value={newLat}
                    onChangeText={setNewLat}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Center Longitude *</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="e.g. 74.3125"
                    keyboardType="numeric"
                    value={newLng}
                    onChangeText={setNewLng}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Quarantine Buffer Radius (km)</Text>
              <TextInput
                style={styles.singleLineInput}
                placeholder="5.0"
                keyboardType="numeric"
                value={newRadius}
                onChangeText={setNewRadius}
              />

              <Text style={styles.inputLabel}>Notes & Enforced Guidelines</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Quarantine instructions, movement restrictions, ring drive details..."
                value={newNotes}
                onChangeText={setNewNotes}
                multiline
                numberOfLines={2}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDeclareModalVisible(false)}
                  disabled={submittingDeclare}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleDeclareSubmit}
                  disabled={submittingDeclare}
                >
                  {submittingDeclare ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Establish Zone</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 3. Schedule Ring Vaccination Modal */}
      <Modal visible={ringModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Schedule Emergency Ring Vaccination</Text>
            <Text style={styles.modalDesc}>
              Deploy emergency vaccination teams around outbreak buffer perimeter.
            </Text>

            <Text style={styles.inputLabel}>Case or Outbreak ID *</Text>
            <TextInput
              style={styles.singleLineInput}
              placeholder="e.g. CASE-2026-PUN-0012 or ZONE ID"
              value={ringCaseId}
              onChangeText={setRingCaseId}
            />

            <Text style={styles.inputLabel}>Camp Venue / Location</Text>
            <TextInput
              style={styles.singleLineInput}
              placeholder="e.g. Primary Veterinary Dispensary, Baramati"
              value={ringVenue}
              onChangeText={setRingVenue}
            />

            <View style={styles.rowInputs}>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Target Dose Capacity</Text>
                <TextInput
                  style={styles.singleLineInput}
                  placeholder="500"
                  keyboardType="numeric"
                  value={ringCapacity}
                  onChangeText={setRingCapacity}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Camp Date</Text>
                <TextInput
                  style={styles.singleLineInput}
                  placeholder="YYYY-MM-DD"
                  value={ringDate}
                  onChangeText={setRingDate}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Operational Notes</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Cold-chain requirements, assigned veterinary officers..."
              value={ringNotes}
              onChangeText={setRingNotes}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRingModalVisible(false)}
                disabled={submittingRing}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleRingSubmit}
                disabled={submittingRing}
              >
                {submittingRing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Schedule Drive</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    backgroundColor: colors.light.officerBadge,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  declareBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  declareBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textInverse,
  },
  cacheBanner: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  cacheBannerText: {
    fontSize: 10,
    color: '#FEF08A',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    gap: spacing.xs,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radii.round,
    alignItems: 'center',
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  tabChipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  tabChipActiveActive: {
    backgroundColor: colors.light.danger,
    borderColor: colors.light.danger,
  },
  tabChipActiveContained: {
    backgroundColor: colors.light.warning,
    borderColor: colors.light.warning,
  },
  tabChipActiveLifted: {
    backgroundColor: colors.light.success,
    borderColor: colors.light.success,
  },
  tabChipText: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: colors.light.textMuted,
  },
  tabChipTextActive: {
    color: colors.light.textInverse,
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
    color: colors.light.textMuted,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  errorSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
    marginTop: spacing.md,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  emptySub: {
    fontSize: 11,
    color: colors.light.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  zoneCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardTitleGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  zoneDisease: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  zoneIdText: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9,
    color: colors.light.textMuted,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    marginTop: 1,
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  rulesBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  rulesTitle: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
    marginBottom: 2,
  },
  ruleItem: {
    fontSize: 10,
    color: colors.light.textPrimary,
  },
  ruleMore: {
    fontSize: 9,
    fontStyle: 'italic',
    color: colors.light.textMuted,
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  actionBtnOrange: {
    backgroundColor: colors.light.warning,
  },
  actionBtnGreen: {
    backgroundColor: colors.light.success,
  },
  actionBtnBlue: {
    backgroundColor: colors.light.info,
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.light.textInverse,
  },
  actionBtnOutlineText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  modalCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    width: '100%',
    maxWidth: 420,
    ...shadows.md,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 11,
    color: colors.light.textMuted,
    marginBottom: spacing.sm,
  },
  transitionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  transitionFrom: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
  },
  transitionArrow: {
    fontSize: 16,
    color: colors.light.textPrimary,
  },
  transitionTo: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  singleLineInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.light.textPrimary,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.light.textPrimary,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.light.textMuted,
  },
  modalConfirmBtn: {
    backgroundColor: colors.light.officerBadge,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    minWidth: 100,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
});
