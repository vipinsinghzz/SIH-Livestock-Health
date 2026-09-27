/**
 * Livestock Saathi - Farmer Vaccination & Preventive Health
 * File: mobile/app/(farmer)/vaccination/index.tsx
 * 
 * Comprehensive, production-integrated vaccination management hub for farmers:
 * - Authoritative herd vaccination schedule & due/overdue tracking
 * - Real government vaccination drive/camp discovery & livestock camp booking
 * - Active district preventive health advisories
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import animalService from '../../../src/services/animalService';
import vaccinationService from '../../../src/services/vaccinationService';
import { Animal } from '../../../src/types/animal';
import {
  VaccinationDrive,
  PreventiveAdvisory,
  CampRegistration,
  EnrichedVaccinationItem,
  VaccinationFilter,
  calculateVaccinationMetrics,
} from '../../../src/types/vaccination';

type ActiveTab = 'schedules' | 'camps' | 'advisories';

export default function FarmerVaccinationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useAppLanguage();

  const [activeTab, setActiveTab] = useState<ActiveTab>('schedules');
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [drives, setDrives] = useState<VaccinationDrive[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<CampRegistration[]>([]);
  const [advisories, setAdvisories] = useState<PreventiveAdvisory[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter state for Herd Schedules
  const [scheduleFilter, setScheduleFilter] = useState<VaccinationFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const vaccineFilters = useMemo((): { key: VaccinationFilter; label: string }[] => [
    { key: 'All', label: t('common.all', 'All Records') },
    { key: 'Due', label: `⏰ ${t('vaccination.due', 'Due Soon')}` },
    { key: 'Overdue', label: `⚠️ ${t('vaccination.overdue', 'Overdue')}` },
    { key: 'Upcoming', label: `📅 ${t('vaccination.upcoming', 'Upcoming')}` },
    { key: 'Completed', label: `✅ ${t('vaccination.completed', 'Completed')}` },
  ], [t]);

  // Camp Registration Modal state
  const [selectedCamp, setSelectedCamp] = useState<VaccinationDrive | null>(null);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const loadAllData = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      const targetDistrict = user?.district || 'Pune';

      const [animalsRes, drivesRes, myRegsRes, advisoriesRes] = await Promise.allSettled([
        animalService.getAnimals(),
        vaccinationService.getVaccinationDrives({ district: targetDistrict, status: 'Upcoming,Ongoing' }),
        vaccinationService.getMyRegistrations(),
        vaccinationService.getAdvisories({ district: targetDistrict }),
      ]);

      if (animalsRes.status === 'fulfilled') {
        setAnimals(animalsRes.value);
      }
      if (drivesRes.status === 'fulfilled') {
        setDrives(drivesRes.value);
      }
      if (myRegsRes.status === 'fulfilled') {
        setMyRegistrations(myRegsRes.value);
      }
      if (advisoriesRes.status === 'fulfilled') {
        setAdvisories(advisoriesRes.value);
      }
    } catch (err: any) {
      console.warn('[VaccinationScreen] Error loading data:', err.message);
      if (err.message && err.message.includes('Network')) {
        setErrorMessage('Unable to connect. Please check your internet connection.');
      } else if (err.response?.status === 401) {
        setErrorMessage('Your session has expired. Please sign in again.');
      } else if (err.response?.status === 403) {
        setErrorMessage('You are not authorized to view this vaccination information.');
      } else {
        setErrorMessage('Something went wrong while loading vaccination information.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Derived metrics from real herd records
  const metrics = useMemo(() => {
    return calculateVaccinationMetrics(animals);
  }, [animals]);

  // Filtered schedules for Herd tab
  const filteredRecords = useMemo(() => {
    return metrics.allRecords.filter((item) => {
      // 1. Status Filter
      if (scheduleFilter === 'Due' && item.computedStatus !== 'Scheduled') return false;
      if (scheduleFilter === 'Overdue' && item.computedStatus !== 'Overdue') return false;
      if (scheduleFilter === 'Completed' && item.computedStatus !== 'Completed') return false;
      if (scheduleFilter === 'Upcoming') {
        if (!item.nextDue) return false;
        const diff = new Date(item.nextDue).getTime() - Date.now();
        if (diff <= 30 * 24 * 60 * 60 * 1000) return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const animalName = (item.animalName || '').toLowerCase();
        const tag = (item.tagId || '').toLowerCase();
        const vaccine = (item.vaccine || '').toLowerCase();
        const species = (item.species || '').toLowerCase();
        return animalName.includes(q) || tag.includes(q) || vaccine.includes(q) || species.includes(q);
      }

      return true;
    });
  }, [metrics.allRecords, scheduleFilter, searchQuery]);

  const formatDate = (dateVal?: string | Date) => {
    if (!dateVal) return 'Date not recorded';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Date not recorded';
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Date not recorded';
    }
  };

  const handleOpenBookingModal = (drive: VaccinationDrive) => {
    setSelectedCamp(drive);
    // Preselect all animals by default if herd exists
    setSelectedAnimalIds(animals.map((a) => a._id || a.id || ''));
  };

  const handleToggleAnimalSelection = (animalId: string) => {
    setSelectedAnimalIds((prev) =>
      prev.includes(animalId) ? prev.filter((id) => id !== animalId) : [...prev, animalId]
    );
  };

  const handleConfirmCampRegistration = async () => {
    if (!selectedCamp) return;
    if (selectedAnimalIds.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one animal to register for this camp.');
      return;
    }

    try {
      setSubmittingBooking(true);
      const res = await vaccinationService.registerForCamp(selectedCamp._id || selectedCamp.campId || '', {
        animalIds: selectedAnimalIds,
        animalCount: selectedAnimalIds.length,
        farmerName: user?.name || 'Farmer',
        farmerPhone: user?.phone || '',
      });

      Alert.alert(
        'Camp Registration Confirmed! 🎉',
        `Your livestock has been registered for the ${selectedCamp.vaccine} drive at ${selectedCamp.venue}.\n\nRegistration Token: ${res.token || '#CAMP-REG'}\nAnimals Registered: ${selectedAnimalIds.length}`,
        [{ text: 'OK', onPress: () => setSelectedCamp(null) }]
      );

      // Reload drives and registrations
      loadAllData(true);
    } catch (err: any) {
      Alert.alert(
        'Registration Notice',
        err.response?.data?.message || err.message || 'Unable to complete camp registration at this time.'
      );
    } finally {
      setSubmittingBooking(false);
    }
  };

  const renderVaccinationCard = (item: EnrichedVaccinationItem) => {
    const isOverdue = item.computedStatus === 'Overdue';
    const isCompleted = item.computedStatus === 'Completed';

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vaccineTitle}>{item.vaccine}</Text>
            <TouchableOpacity
              onPress={() => item.animalId && router.push(`/(farmer)/animals/${item.animalId}` as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.animalSubtext}>
                🐾 {item.animalName} {item.tagId !== 'N/A' ? `(#${item.tagId})` : ''} • {item.species}
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.statusBadge,
              isOverdue
                ? styles.statusBadgeOverdue
                : isCompleted
                ? styles.statusBadgeCompleted
                : styles.statusBadgeDue,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isOverdue
                  ? styles.statusTextOverdue
                  : isCompleted
                  ? styles.statusTextCompleted
                  : styles.statusTextDue,
              ]}
            >
              {isOverdue ? `⚠️ ${t('vaccination.overdue', 'Overdue')}` : isCompleted ? `✅ ${t('vaccination.completed', 'Completed')}` : `⏰ ${t('vaccination.due', 'Due Soon')}`}
            </Text>
          </View>
        </View>

        {/* Date Row */}
        <View style={styles.dateRow}>
          {item.date ? (
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>{t('vaccination.dateAdministered', 'Given On')}</Text>
              <Text style={styles.dateValue}>{formatDate(item.date)}</Text>
            </View>
          ) : null}

          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>{t('vaccination.nextDueDate', 'Next Booster Due')}</Text>
            <Text
              style={[
                styles.dateValue,
                isOverdue && { color: colors.light.danger, fontWeight: typography.weights.bold },
              ]}
            >
              {formatDate(item.nextDue)}
            </Text>
          </View>
        </View>

        {/* Meta Row: Dose, Batch, Administering Authority */}
        <View style={styles.metaRow}>
          {item.dose ? <Text style={styles.metaChip}>Dose: {item.dose}</Text> : null}
          {item.batchNumber ? <Text style={styles.metaChip}>Batch: {item.batchNumber}</Text> : null}
          {item.administeredBy ? (
            <Text style={styles.metaChip}>By: {item.administeredBy}</Text>
          ) : null}
          {item.camp ? <Text style={styles.metaChip}>Camp: {item.camp}</Text> : null}
        </View>
      </View>
    );
  };

  const renderCampCard = (drive: VaccinationDrive) => {
    const isRegistered = myRegistrations.some(
      (r) => r.driveId === drive._id || r.campId === drive.campId
    );

    return (
      <View key={drive._id || drive.campId} style={styles.campCard}>
        <View style={styles.campTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.campVaccineName}>{drive.vaccine}</Text>
            {drive.vaccineFullName && drive.vaccineFullName !== drive.vaccine ? (
              <Text style={styles.campVaccineFull}>{drive.vaccineFullName}</Text>
            ) : null}
          </View>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>FREE GOVT CAMP</Text>
          </View>
        </View>

        <Text style={styles.campVenueText}>📍 {drive.venue}</Text>
        <Text style={styles.campLocationMeta}>
          {drive.village}, Taluka: {drive.block}, District: {drive.district}
        </Text>

        <View style={styles.campScheduleRow}>
          <View style={styles.campScheduleItem}>
            <Text style={styles.campScheduleLabel}>📅 Date</Text>
            <Text style={styles.campScheduleValue}>{formatDate(drive.campDate)}</Text>
          </View>
          <View style={styles.campScheduleItem}>
            <Text style={styles.campScheduleLabel}>⏰ Time</Text>
            <Text style={styles.campScheduleValue}>
              {drive.startTime || '09:30 AM'} - {drive.endTime || '04:00 PM'}
            </Text>
          </View>
        </View>

        <View style={styles.campOfficerRow}>
          <Text style={styles.campOfficerText}>
            👨‍⚕️ Officer: {drive.assignedOfficer || 'Veterinary Medical Officer'} (
            {drive.organizingHospital || 'Dept of Animal Husbandry'})
          </Text>
        </View>

        <View style={styles.campFooterRow}>
          <Text style={styles.campSlotsText}>
            Slots Remaining:{' '}
            <Text style={{ fontWeight: typography.weights.bold, color: colors.light.primary }}>
              {drive.remainingSlots} / {drive.capacity || 200}
            </Text>
          </Text>

          {isRegistered ? (
            <View style={styles.registeredBadge}>
              <Text style={styles.registeredBadgeText}>✓ Registered</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.bookCampBtn}
              onPress={() => handleOpenBookingModal(drive)}
              activeOpacity={0.8}
            >
              <Text style={styles.bookCampBtnText}>Register Livestock</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderAdvisoryCard = (adv: PreventiveAdvisory) => {
    const title = typeof adv.title === 'object' ? adv.title.en || adv.title.hi || 'Advisory' : adv.title;
    const message =
      typeof adv.message === 'object' ? adv.message.en || adv.message.hi || '' : adv.message;

    return (
      <View key={adv._id} style={styles.advisoryCard}>
        <View style={styles.advisoryHeader}>
          <Text style={styles.advisoryIcon}>📢</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.advisoryTitle}>{title}</Text>
            {adv.disease ? <Text style={styles.advisoryDisease}>Condition: {adv.disease}</Text> : null}
          </View>
          {adv.severity ? (
            <View
              style={[
                styles.severityBadge,
                adv.severity === 'Critical' || adv.severity === 'High'
                  ? styles.severityHigh
                  : styles.severityNormal,
              ]}
            >
              <Text style={styles.severityBadgeText}>{adv.severity}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.advisoryMessage}>{message}</Text>
        <Text style={styles.advisoryMeta}>
          📍 Applicable for: {adv.targetDistrict || 'District'} • Issued: {formatDate(adv.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.primary} />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            colors={[colors.light.primary]}
            tintColor={colors.light.primary}
          />
        }
      >
        {/* KPI Summary Grid (Identical logic with Dashboard) */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, metrics.due > 0 && styles.kpiCardWarning]}>
            <Text style={styles.kpiIcon}>⏰</Text>
            <Text style={[styles.kpiNumber, metrics.due > 0 && { color: colors.light.warning }]}>
              {loading ? '-' : metrics.due}
            </Text>
            <Text style={styles.kpiLabel}>{t('vaccination.dueSoon', 'Due Soon')}</Text>
            <Text style={styles.kpiSub}>Next 30 Days</Text>
          </View>

          <View style={[styles.kpiCard, metrics.overdue > 0 && styles.kpiCardDanger]}>
            <Text style={styles.kpiIcon}>⚠️</Text>
            <Text style={[styles.kpiNumber, metrics.overdue > 0 && { color: colors.light.danger }]}>
              {loading ? '-' : metrics.overdue}
            </Text>
            <Text style={styles.kpiLabel}>{t('vaccination.overdueDoses', 'Overdue')}</Text>
            <Text style={styles.kpiSub}>Immediate Booster</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiIcon}>📅</Text>
            <Text style={styles.kpiNumber}>{loading ? '-' : metrics.upcoming}</Text>
            <Text style={styles.kpiLabel}>{t('vaccination.upcoming', 'Upcoming')}</Text>
            <Text style={styles.kpiSub}>Future Schedules</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiIcon}>✅</Text>
            <Text style={styles.kpiNumber}>{loading ? '-' : metrics.completed}</Text>
            <Text style={styles.kpiLabel}>{t('vaccination.completed', 'Completed')}</Text>
            <Text style={styles.kpiSub}>Vaccine Doses</Text>
          </View>
        </View>

        {/* Tab Navigation Row */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'schedules' && styles.tabBtnActive]}
            onPress={() => setActiveTab('schedules')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'schedules' && styles.tabBtnTextActive]}>
              {t('vaccination.herdSchedule', 'Herd Schedules')} ({metrics.allRecords.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'camps' && styles.tabBtnActive]}
            onPress={() => setActiveTab('camps')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'camps' && styles.tabBtnTextActive]}>
              {t('vaccination.camps', 'Govt Camps')} ({drives.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'advisories' && styles.tabBtnActive]}
            onPress={() => setActiveTab('advisories')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'advisories' && styles.tabBtnTextActive]}>
              {t('vaccination.advisories', 'Advisories')} ({advisories.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.light.primary} />
            <Text style={styles.loadingText}>{t('common.loading', 'Loading preventive health records...')}</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>{t('common.error', 'Notice')}</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadAllData()} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>🔄 {t('common.retry', 'Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'schedules' ? (
          <View>
            {/* Search and Filters */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.search', 'Search by animal, tag, or vaccine...')}
                placeholderTextColor={colors.light.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {vaccineFilters.map((f) => {
                const isSelected = scheduleFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setScheduleFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* List */}
            {metrics.allRecords.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>💉</Text>
                <Text style={styles.emptyTitle}>No Vaccination Records Yet</Text>
                <Text style={styles.emptySub}>
                  No individual vaccination records have been registered for your herd. Check nearby government camps below to schedule vaccination.
                </Text>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => setActiveTab('camps')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionBtnText}>🎪 View Government Camps</Text>
                </TouchableOpacity>
              </View>
            ) : filteredRecords.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>
                  {scheduleFilter === 'Overdue'
                    ? 'No Overdue Vaccinations'
                    : scheduleFilter === 'Upcoming'
                    ? 'No Upcoming Vaccinations'
                    : 'No Matching Records'}
                </Text>
                <Text style={styles.emptySub}>
                  {scheduleFilter === 'Overdue'
                    ? 'All animals in your herd are up to date on scheduled vaccinations!'
                    : 'No vaccination records matched your active filter.'}
                </Text>
              </View>
            ) : (
              filteredRecords.map(renderVaccinationCard)
            )}
          </View>
        ) : activeTab === 'camps' ? (
          <View>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionHeading}>District Vaccination Camps</Text>
              <Text style={styles.sectionSub}>
                Organized under National Animal Disease Control Programme (NADCP) in {user?.district || 'your district'}.
              </Text>
            </View>

            {drives.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🎪</Text>
                <Text style={styles.emptyTitle}>No Active Camps in District</Text>
                <Text style={styles.emptySub}>
                  There are currently no upcoming government vaccination drives scheduled in {user?.district || 'your area'}. Please check back regularly.
                </Text>
              </View>
            ) : (
              drives.map(renderCampCard)
            )}
          </View>
        ) : (
          <View>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionHeading}>Preventive Health Advisories</Text>
              <Text style={styles.sectionSub}>
                Official veterinary health alerts and preventive advisories for {user?.district || 'your district'}.
              </Text>
            </View>

            {advisories.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>📢</Text>
                <Text style={styles.emptyTitle}>No Preventive Advisories</Text>
                <Text style={styles.emptySub}>
                  There are currently no disease outbreak advisories issued for {user?.district || 'your district'}.
                </Text>
              </View>
            ) : (
              advisories.map(renderAdvisoryCard)
            )}
          </View>
        )}
      </ScrollView>

      {/* Camp Booking Modal */}
      <Modal
        visible={Boolean(selectedCamp)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCamp(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register for Camp</Text>
              <TouchableOpacity onPress={() => setSelectedCamp(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCamp ? (
              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.modalCampName}>{selectedCamp.vaccine} Vaccination Drive</Text>
                <Text style={styles.modalCampVenue}>📍 {selectedCamp.venue}, {selectedCamp.village}</Text>
                <Text style={styles.modalCampDate}>
                  📅 {formatDate(selectedCamp.campDate)} ({selectedCamp.startTime || '09:30 AM'} - {selectedCamp.endTime || '04:00 PM'})
                </Text>

                <Text style={styles.selectAnimalsTitle}>
                  Select Herd Animals to Vaccinate ({selectedAnimalIds.length} Selected):
                </Text>

                {animals.length === 0 ? (
                  <Text style={styles.noAnimalsInHerdNotice}>
                    No registered livestock found in herd profile. Registration will be made for 1 animal.
                  </Text>
                ) : (
                  animals.map((a) => {
                    const aId = a._id || a.id || '';
                    const isChecked = selectedAnimalIds.includes(aId);
                    return (
                      <TouchableOpacity
                        key={aId}
                        style={[styles.animalSelectRow, isChecked && styles.animalSelectRowActive]}
                        onPress={() => handleToggleAnimalSelection(aId)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.checkIcon}>{isChecked ? '☑️' : '⬜'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.animalSelectName}>{a.name}</Text>
                          <Text style={styles.animalSelectMeta}>
                            Tag: #{a.tagId} • {a.species} • {a.breed || 'Breed'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            ) : null}

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedCamp(null)}
                disabled={submittingBooking}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, submittingBooking && { opacity: 0.6 }]}
                onPress={handleConfirmCampRegistration}
                disabled={submittingBooking}
              >
                {submittingBooking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Registration</Text>
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
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.hero,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  kpiCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.light.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  kpiCardWarning: {
    borderColor: colors.light.warning,
    backgroundColor: '#FFFBEB',
  },
  kpiCardDanger: {
    borderColor: colors.light.danger,
    backgroundColor: '#FEF2F2',
  },
  kpiIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  kpiNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  kpiLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: colors.light.textMuted,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.light.primary,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.light.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.sm,
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
  filterScroll: {
    marginBottom: spacing.base,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.round,
    backgroundColor: colors.light.surface,
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
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  vaccineTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  animalSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  statusBadgeCompleted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusBadgeDue: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusBadgeOverdue: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  statusTextCompleted: {
    color: '#15803D',
  },
  statusTextDue: {
    color: '#B45309',
  },
  statusTextOverdue: {
    color: '#B91C1C',
  },
  dateRow: {
    flexDirection: 'row',
    backgroundColor: colors.light.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaChip: {
    fontSize: 10,
    color: colors.light.textSecondary,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  campCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  campTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  campVaccineName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  campVaccineFull: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  freeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#15803D',
  },
  campVenueText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    marginTop: 2,
  },
  campLocationMeta: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 1,
    marginBottom: spacing.sm,
  },
  campScheduleRow: {
    flexDirection: 'row',
    backgroundColor: colors.light.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  campScheduleItem: {
    flex: 1,
  },
  campScheduleLabel: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginBottom: 2,
  },
  campScheduleValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  campOfficerRow: {
    marginBottom: spacing.sm,
  },
  campOfficerText: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  campFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  campSlotsText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  bookCampBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  bookCampBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  registeredBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  registeredBadgeText: {
    color: '#15803D',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  advisoryCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...shadows.sm,
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  advisoryIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  advisoryTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
  advisoryDisease: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  severityHigh: {
    backgroundColor: '#FEE2E2',
  },
  severityNormal: {
    backgroundColor: '#FEF3C7',
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
  advisoryMessage: {
    fontSize: typography.sizes.xs,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  advisoryMeta: {
    fontSize: 10,
    color: '#92400E',
  },
  sectionHeaderBox: {
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  sectionSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  centerBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  errorTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.sm,
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
    fontSize: typography.sizes.xs,
  },
  emptyBox: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  primaryActionBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  primaryActionBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.light.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.base,
    paddingBottom: spacing.hero,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  modalCloseText: {
    fontSize: 18,
    color: colors.light.textSecondary,
    padding: spacing.xs,
  },
  modalCampName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
    marginBottom: 2,
  },
  modalCampVenue: {
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  modalCampDate: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: spacing.md,
  },
  selectAnimalsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
  },
  noAnimalsInHerdNotice: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    padding: spacing.sm,
  },
  animalSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.xs,
    backgroundColor: colors.light.background,
  },
  animalSelectRowActive: {
    borderColor: colors.light.primary,
    backgroundColor: '#EFF6FF',
  },
  checkIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  animalSelectName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  animalSelectMeta: {
    fontSize: 10,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: colors.light.textPrimary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.xs,
  },
  modalConfirmBtn: {
    flex: 2,
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
});
