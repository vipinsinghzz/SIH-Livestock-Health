/**
 * PashuCare - Officer: Mass Vaccination Campaign Governance
 * File: mobile/app/(officer)/vaccination/index.tsx
 *
 * Phase 10.3 Implementation:
 * Production Mass Vaccination Campaign Governance & Veterinary Camp Coordination.
 * Integrates:
 * - GET /api/vaccination-drives (District preventive vaccination camps)
 * - POST /api/vaccination-drives (Establish official government vaccination drive)
 * - PATCH /api/vaccination-drives/:id (Update camp coverage progress and campaign status)
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
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import vaccinationService from '../../../src/services/vaccinationService';
import { VaccinationDrive } from '../../../src/types/vaccination';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

type CampaignFilter = 'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED';

export default function OfficerVaccinationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const district = user?.district;

  // State
  const [drives, setDrives] = useState<VaccinationDrive[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CampaignFilter>('ALL');

  // Create campaign modal
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newVaccine, setNewVaccine] = useState<string>('');
  const [newVaccineFullName, setNewVaccineFullName] = useState<string>('');
  const [newSpecies, setNewSpecies] = useState<string>('Cattle & Buffalo');
  const [newBlock, setNewBlock] = useState<string>('');
  const [newVillage, setNewVillage] = useState<string>('');
  const [newVenue, setNewVenue] = useState<string>('');
  const [newCapacity, setNewCapacity] = useState<string>('500');
  const [newStartDate, setNewStartDate] = useState<string>('');
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);

  // Update progress modal
  const [updateModalVisible, setUpdateModalVisible] = useState<boolean>(false);
  const [selectedDrive, setSelectedDrive] = useState<VaccinationDrive | null>(null);
  const [updateCovered, setUpdateCovered] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<'Upcoming' | 'Ongoing' | 'Completed'>('Ongoing');
  const [submittingUpdate, setSubmittingUpdate] = useState<boolean>(false);

  const loadDrives = useCallback(async () => {
    if (!district) {
      setError('Officer district jurisdiction is not configured on this account. Contact system administrator.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const netState = await NetInfo.fetch();
      const offlineNow = !netState.isConnected || netState.isInternetReachable === false;
      setIsOffline(offlineNow);

      const res = await vaccinationService.getVaccinationDrives({ district });
      setDrives(res || []);
    } catch (err: any) {
      console.warn('[OfficerVaccination] Error loading drives:', err.message);
      setError(err.message || 'Failed to load vaccination campaigns.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [district]);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDrives();
  }, [loadDrives]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalTarget = 0;
    let totalCovered = 0;
    let ongoingCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    drives.forEach((d) => {
      const target = d.capacity || (d as any).targetCount || 0;
      const covered = (d as any).coveredCount || d.bookedSlots || 0;
      totalTarget += target;
      totalCovered += covered;

      const st = String(d.status || '').toLowerCase();
      if (st.includes('ongoing') || st.includes('active')) ongoingCount++;
      else if (st.includes('completed')) completedCount++;
      else upcomingCount++;
    });

    const coveragePct = totalTarget > 0 ? Math.min(100, Math.round((totalCovered / totalTarget) * 100)) : 0;

    return {
      totalTarget,
      totalCovered,
      coveragePct,
      ongoingCount,
      upcomingCount,
      completedCount,
    };
  }, [drives]);

  // Filtered drives
  const filteredDrives = useMemo(() => {
    if (activeFilter === 'ALL') return drives;
    return drives.filter((d) => {
      const st = String(d.status || '').toUpperCase();
      if (activeFilter === 'ONGOING') return st.includes('ONGOING') || st.includes('ACTIVE');
      if (activeFilter === 'COMPLETED') return st.includes('COMPLETED');
      return st.includes('UPCOMING') || st.includes('SCHEDULED');
    });
  }, [drives, activeFilter]);

  // Handle create campaign
  const handleCreateSubmit = async () => {
    if (!district) {
      Alert.alert('District Unavailable', 'Cannot create vaccination campaign without an assigned officer district.');
      return;
    }

    if (!newVaccine.trim()) {
      Alert.alert('Required Field', 'Please enter a vaccine name.');
      return;
    }
    if (!newVillage.trim() || !newBlock.trim()) {
      Alert.alert('Required Fields', 'Target village and block are required.');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      Alert.alert('Offline', 'Internet connection required for this action.');
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await vaccinationService.createVaccinationDrive({
        vaccine: newVaccine.trim(),
        vaccineFullName: newVaccineFullName.trim() || undefined,
        targetSpecies: newSpecies.trim() || undefined,
        village: newVillage.trim(),
        block: newBlock.trim(),
        district,
        venue: newVenue.trim() || undefined,
        capacity: parseInt(newCapacity, 10) || 500,
        startDate: newStartDate.trim() || undefined,
        endDate: newEndDate.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });

      setCreateModalVisible(false);
      setNewVaccine('');
      setNewVaccineFullName('');
      setNewBlock('');
      setNewVillage('');
      setNewVenue('');
      setNewNotes('');
      Alert.alert('Campaign Established', res.message || 'Vaccination drive established successfully.');
      loadDrives();
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Failed to create vaccination campaign.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle update progress
  const handleUpdateSubmit = async () => {
    if (!selectedDrive) return;

    if (!district) {
      Alert.alert('District Unavailable', 'Cannot update campaign progress without an assigned officer district.');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      Alert.alert('Offline', 'Internet connection required for this action.');
      return;
    }

    const cleanId = String(selectedDrive._id || (selectedDrive as any).id);
    const coveredVal = parseInt(updateCovered, 10);

    try {
      setSubmittingUpdate(true);
      const res = await vaccinationService.updateVaccinationDrive(cleanId, {
        coveredCount: !isNaN(coveredVal) ? coveredVal : undefined,
        status: updateStatus,
      });

      setUpdateModalVisible(false);
      setSelectedDrive(null);
      setUpdateCovered('');
      Alert.alert('Progress Updated', res.message || 'Campaign progress updated successfully.');
      loadDrives();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update campaign progress.');
    } finally {
      setSubmittingUpdate(false);
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
            <Text style={styles.headerTitle}>Mass Vaccination Governance</Text>
            <Text style={styles.headerSubtitle}>
              {district
                ? `${district} District • ${kpis.ongoingCount} Ongoing Campaign${kpis.ongoingCount !== 1 ? 's' : ''}`
                : 'District Jurisdiction Unavailable'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.createBtnText}>+ New Campaign</Text>
          </TouchableOpacity>
        </View>

        {isOffline && (
          <View style={styles.cacheBanner}>
            <Text style={styles.cacheBannerText}>
              ⚡ Offline Mode: Displaying saved campaigns from device cache.
            </Text>
          </View>
        )}
      </View>

      {/* KPI Overview Banner */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{kpis.totalTarget}</Text>
            <Text style={styles.kpiLabel}>Target Herd</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: colors.light.success }]}>
              {kpis.totalCovered}
            </Text>
            <Text style={styles.kpiLabel}>Vaccinated</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: colors.light.officerBadge }]}>
              {kpis.coveragePct}%
            </Text>
            <Text style={styles.kpiLabel}>District Shield</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.tabChip, activeFilter === 'ALL' && styles.tabChipActive]}
          onPress={() => setActiveFilter('ALL')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabChipText, activeFilter === 'ALL' && styles.tabChipTextActive]}>
            All ({drives.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeFilter === 'ONGOING' && styles.tabChipActiveOngoing]}
          onPress={() => setActiveFilter('ONGOING')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabChipText, activeFilter === 'ONGOING' && styles.tabChipTextActive]}>
            ⚡ Ongoing ({kpis.ongoingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeFilter === 'UPCOMING' && styles.tabChipActiveUpcoming]}
          onPress={() => setActiveFilter('UPCOMING')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabChipText, activeFilter === 'UPCOMING' && styles.tabChipTextActive]}>
            📅 Upcoming ({kpis.upcomingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeFilter === 'COMPLETED' && styles.tabChipActiveCompleted]}
          onPress={() => setActiveFilter('COMPLETED')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabChipText, activeFilter === 'COMPLETED' && styles.tabChipTextActive]}>
            ✓ Completed ({kpis.completedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.officerBadge} />
          <Text style={styles.loadingText}>Loading district vaccination campaigns...</Text>
        </View>
      ) : error && drives.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Campaign Data Unavailable</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadDrives} activeOpacity={0.8}>
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
          {filteredDrives.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⛺</Text>
              <Text style={styles.emptyTitle}>No Vaccination Campaigns Found</Text>
              <Text style={styles.emptySub}>
                {drives.length === 0
                  ? `No vaccination drives scheduled in ${district} district.`
                  : 'No campaigns match the selected filter.'}
              </Text>
            </View>
          ) : (
            filteredDrives.map((drive) => {
              const target = drive.capacity || (drive as any).targetCount || 0;
              const covered = (drive as any).coveredCount || drive.bookedSlots || 0;
              const pct = drive.coveragePercentage != null
                ? drive.coveragePercentage
                : target > 0
                ? Math.min(100, Math.round((covered / target) * 100))
                : 0;

              const isCompleted = String(drive.status || '').toLowerCase().includes('completed');
              const isOngoing = String(drive.status || '').toLowerCase().includes('ongoing') || String(drive.status || '').toLowerCase().includes('active');

              return (
                <View key={drive._id || (drive as any).id} style={styles.campaignCard}>
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleGroup}>
                      <Text style={styles.vaccineName}>{drive.vaccine}</Text>
                      {drive.vaccineFullName && drive.vaccineFullName !== drive.vaccine && (
                        <Text style={styles.vaccineFullName}>{drive.vaccineFullName}</Text>
                      )}
                      <Text style={styles.speciesText}>Target: {drive.targetSpecies || 'Cattle & Buffalo'}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isCompleted
                          ? styles.badgeCompleted
                          : isOngoing
                          ? styles.badgeOngoing
                          : styles.badgeUpcoming,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{drive.status}</Text>
                    </View>
                  </View>

                  {/* Location & Hospital */}
                  <View style={styles.locationBox}>
                    <Text style={styles.locationText}>
                      📍 {drive.venue || `Veterinary Dispensary, ${drive.village}`} ({drive.block})
                    </Text>
                    {drive.organizingHospital && (
                      <Text style={styles.hospitalText}>🏥 {drive.organizingHospital}</Text>
                    )}
                  </View>

                  {/* Progress Section */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>Coverage Progress</Text>
                      <Text style={styles.progressNumbers}>
                        {covered} / {target} ({pct}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${pct}%` },
                          isCompleted
                            ? { backgroundColor: colors.light.success }
                            : isOngoing
                            ? { backgroundColor: colors.light.warning }
                            : { backgroundColor: colors.light.info },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Footer & Actions */}
                  <View style={styles.cardFooter}>
                    <View style={styles.dateInfo}>
                      <Text style={styles.dateLabel}>Date / Hours:</Text>
                      <Text style={styles.dateValue}>
                        {drive.campDate ? new Date(drive.campDate).toLocaleDateString() : 'Active Drive'}
                        {drive.startTime ? ` • ${drive.startTime}` : ''}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.updateBtn}
                      onPress={() => {
                        setSelectedDrive(drive);
                        setUpdateCovered(String(covered));
                        setUpdateStatus(drive.status === 'Completed' ? 'Completed' : drive.status === 'Upcoming' ? 'Ongoing' : 'Ongoing');
                        setUpdateModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.updateBtnText}>Update Progress ➔</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 1. Create Campaign Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContainer}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Establish Vaccination Campaign</Text>
              <Text style={styles.modalDesc}>
                Create an official government mass vaccination camp in {district}.
              </Text>

              <Text style={styles.inputLabel}>Vaccine Name *</Text>
              <TextInput
                style={styles.singleLineInput}
                placeholder="e.g. FMD Oil Adjuvant / Goat Pox"
                value={newVaccine}
                onChangeText={setNewVaccine}
              />

              <Text style={styles.inputLabel}>Full Scientific Name</Text>
              <TextInput
                style={styles.singleLineInput}
                placeholder="e.g. Foot and Mouth Disease Quadrivalent"
                value={newVaccineFullName}
                onChangeText={setNewVaccineFullName}
              />

              <View style={styles.rowInputs}>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Target Species</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="e.g. Bovine, Ovine"
                    value={newSpecies}
                    onChangeText={setNewSpecies}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Target Quantity *</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="500"
                    keyboardType="numeric"
                    value={newCapacity}
                    onChangeText={setNewCapacity}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Block *</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="e.g. Saoner"
                    value={newBlock}
                    onChangeText={setNewBlock}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Village *</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="e.g. Kelwad"
                    value={newVillage}
                    onChangeText={setNewVillage}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Venue / Veterinary Facility</Text>
              <TextInput
                style={styles.singleLineInput}
                placeholder="e.g. Primary Veterinary Dispensary, Saoner"
                value={newVenue}
                onChangeText={setNewVenue}
              />

              <View style={styles.rowInputs}>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Start Date</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="YYYY-MM-DD"
                    value={newStartDate}
                    onChangeText={setNewStartDate}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>End Date</Text>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder="YYYY-MM-DD"
                    value={newEndDate}
                    onChangeText={setNewEndDate}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Campaign Guidelines & Logistics Notes</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Cold-chain parameters, mobile team roster..."
                value={newNotes}
                onChangeText={setNewNotes}
                multiline
                numberOfLines={2}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setCreateModalVisible(false)}
                  disabled={submittingCreate}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleCreateSubmit}
                  disabled={submittingCreate}
                >
                  {submittingCreate ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Establish Drive</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 2. Update Progress Modal */}
      <Modal visible={updateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Campaign Progress</Text>
            <Text style={styles.modalDesc}>
              {selectedDrive?.vaccine} ({selectedDrive?.village}, {selectedDrive?.block})
            </Text>

            <Text style={styles.inputLabel}>Total Vaccinated Animals Count:</Text>
            <TextInput
              style={styles.singleLineInput}
              placeholder="e.g. 250"
              keyboardType="numeric"
              value={updateCovered}
              onChangeText={setUpdateCovered}
            />

            <Text style={styles.inputLabel}>Campaign Status:</Text>
            <View style={styles.statusSelectRow}>
              <TouchableOpacity
                style={[
                  styles.statusSelectBtn,
                  updateStatus === 'Upcoming' && styles.statusSelectBtnActive,
                ]}
                onPress={() => setUpdateStatus('Upcoming')}
              >
                <Text style={styles.statusSelectText}>Upcoming</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusSelectBtn,
                  updateStatus === 'Ongoing' && styles.statusSelectBtnActive,
                ]}
                onPress={() => setUpdateStatus('Ongoing')}
              >
                <Text style={styles.statusSelectText}>Ongoing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusSelectBtn,
                  updateStatus === 'Completed' && styles.statusSelectBtnActive,
                ]}
                onPress={() => setUpdateStatus('Completed')}
              >
                <Text style={styles.statusSelectText}>Completed</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setUpdateModalVisible(false);
                  setSelectedDrive(null);
                }}
                disabled={submittingUpdate}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleUpdateSubmit}
                disabled={submittingUpdate}
              >
                {submittingUpdate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Save Progress</Text>
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
  createBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  createBtnText: {
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
  kpiContainer: {
    backgroundColor: colors.light.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  kpiItem: {
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  kpiDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
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
  tabChipActiveOngoing: {
    backgroundColor: colors.light.warning,
    borderColor: colors.light.warning,
  },
  tabChipActiveUpcoming: {
    backgroundColor: colors.light.info,
    borderColor: colors.light.info,
  },
  tabChipActiveCompleted: {
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
  campaignCard: {
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
    marginBottom: spacing.xs,
  },
  cardTitleGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  vaccineName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  vaccineFullName: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  speciesText: {
    fontSize: 10,
    color: colors.light.primaryDark,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  badgeUpcoming: {
    backgroundColor: colors.light.info,
  },
  badgeOngoing: {
    backgroundColor: colors.light.warning,
  },
  badgeCompleted: {
    backgroundColor: colors.light.success,
  },
  locationBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: radii.sm,
    padding: spacing.xs,
    marginVertical: spacing.xs,
  },
  locationText: {
    fontSize: 11,
    color: colors.light.textPrimary,
  },
  hospitalText: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  progressContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  progressLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
  },
  progressNumbers: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: radii.round,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.round,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 9,
    color: colors.light.textMuted,
  },
  dateValue: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  updateBtn: {
    backgroundColor: colors.light.officerBadge,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  updateBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.light.textInverse,
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
  statusSelectRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statusSelectBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  statusSelectBtnActive: {
    backgroundColor: colors.light.officerBadge,
    borderColor: colors.light.officerBadge,
  },
  statusSelectText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
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
