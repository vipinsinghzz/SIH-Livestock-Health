/**
 * PashuCare - Ultra-Premium Officer Containment Perimeters & Quarantine Governance
 * File: mobile/app/(officer)/containment/index.tsx
 *
 * Production Containment Perimeter Governance & Ring Vaccination Coordination:
 * - Luxury executive command navy header (#0B132B / #1E1B4B) with safe-area spacing
 * - Cadre badge: "BIOSECURITY & CONTAINMENT GOVERNANCE"
 * - "+ Declare Zone" luxury action button
 * - 3-Metric Telemetry Summary (Active, Contained, Lifted)
 * - Status filter tabs with color-coded dot indicators
 * - Containment zone cards with radius, coordinates, village/block, and action suite
 *   (Update Status, Schedule Ring Vaccination, View on GIS Radar)
 * - Complete production modals (Declare Zone, Advance Status, Schedule Ring Drive)
 * - Fixed universal floating bottom dock (<OfficerFloatingNav activeTab="containment" />)
 * - Zero raw text emojis; platform-safe typography stack
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
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import { containmentService } from '../../../src/services/containmentService';
import {
  ContainmentZone,
  ContainmentZoneStatus,
  getContainmentStatusTheme,
} from '../../../src/types/containment';
import { OfflineNotice } from '../../../src/components/OfflineNotice';
import { shadows } from '../../../src/theme';
import { OfficerFloatingNav } from '../../../src/components/OfficerFloatingNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Native typography stack
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

// Static assets
const ICON_BACK = require('../../../assets/icons/arrow-back.png');
const ICON_SHIELD = require('../../../assets/icons/shield.png');
const ICON_PLUS = require('../../../assets/icons/plus.png');
const ICON_REFRESH = require('../../../assets/icons/refresh.png');
const ICON_LOCATION = require('../../../assets/icons/location.png');
const ICON_PIN = require('../../../assets/icons/icon_pin.png');
const ICON_WARN = require('../../../assets/icons/alert.png');
const ICON_VACCINE = require('../../../assets/icons/stat_vaccine.png');

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
  const { isEnglish } = useAppLanguage();
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
      setError(isEnglish ? 'District jurisdiction is not configured on this account.' : 'ज़िला कार्यक्षेत्र कॉन्फ़िगर नहीं है।');
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
  }, [district, isEnglish]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadZones();
  }, [loadZones]);

  const filteredZones = useMemo(() => {
    if (activeFilter === 'ALL') return zones;
    return zones.filter((z) => String(z.status || '').toUpperCase() === activeFilter);
  }, [zones, activeFilter]);

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

  const handleStatusSubmit = async () => {
    if (!selectedZone) return;

    if (!district) {
      Alert.alert(isEnglish ? 'District Unavailable' : 'ज़िला अनुपलब्ध', isEnglish ? 'Cannot update containment status without an assigned officer district.' : 'ज़िला आवंटन के बिना स्थिति अपडेट नहीं हो सकती।');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      Alert.alert(isEnglish ? 'Offline' : 'ऑफ़लाइन', isEnglish ? 'Internet connection required for this action.' : 'इस क्रिया के लिए इंटरनेट आवश्यक है।');
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
      Alert.alert(isEnglish ? 'Status Updated' : 'स्थिति अपडेट हुई', `Containment zone status updated to ${targetStatus}.`);
      loadZones();
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Update Failed' : 'अपडेट विफल', err.message || 'Failed to update containment zone status.');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleDeclareSubmit = async () => {
    if (!district) {
      Alert.alert(isEnglish ? 'District Unavailable' : 'ज़िला अनुपलब्ध', isEnglish ? 'Cannot establish containment zone without an assigned officer district.' : 'ज़िला आवंटन आवश्यक है।');
      return;
    }

    if (!newDisease.trim()) {
      Alert.alert(isEnglish ? 'Required Field' : 'आवश्यक फ़ील्ड', isEnglish ? 'Please enter a disease name.' : 'कृपया रोग का नाम दर्ज करें।');
      return;
    }
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      Alert.alert(isEnglish ? 'Invalid Coordinates' : 'अमान्य निर्देशांक', isEnglish ? 'Please enter valid GPS coordinates (latitude & longitude).' : 'मान्य जीपीएस निर्देशांक दर्ज करें।');
      return;
    }

    const radius = parseFloat(newRadius);
    if (isNaN(radius) || radius <= 0) {
      Alert.alert(isEnglish ? 'Invalid Radius' : 'अमान्य त्रिज्या', isEnglish ? 'Please enter a valid positive containment radius in kilometers.' : 'मान्य त्रिज्या दर्ज करें।');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      Alert.alert(isEnglish ? 'Offline' : 'ऑफ़लाइन', isEnglish ? 'Internet connection required for this action.' : 'इस क्रिया के लिए इंटरनेट आवश्यक है।');
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
      Alert.alert(isEnglish ? 'Zone Declared' : 'ज़ोन घोषित किया गया', res.message || 'Containment zone established successfully.');
      loadZones();
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Declaration Failed' : 'घोषणा विफल', err.message || 'Failed to create containment zone.');
    } finally {
      setSubmittingDeclare(false);
    }
  };

  const handleRingSubmit = async () => {
    if (!district) {
      Alert.alert(isEnglish ? 'District Unavailable' : 'ज़िला अनुपलब्ध', isEnglish ? 'Cannot schedule ring vaccination without an assigned officer district.' : 'ज़िला आवंटन आवश्यक है।');
      return;
    }

    if (!ringCaseId.trim()) {
      Alert.alert(isEnglish ? 'Case ID Required' : 'केस आईडी आवश्यक', isEnglish ? 'Please provide a valid case or outbreak ID to schedule ring vaccination.' : 'वैध केस आईडी दर्ज करें।');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      Alert.alert(isEnglish ? 'Offline' : 'ऑफ़लाइन', isEnglish ? 'Internet connection required for this action.' : 'इस क्रिया के लिए इंटरनेट आवश्यक है।');
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
      Alert.alert(isEnglish ? 'Drive Scheduled' : 'अभियान निर्धारित', res.message || 'Emergency ring vaccination drive scheduled.');
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Scheduling Failed' : 'शेड्यूलिंग विफल', err.message || 'Failed to schedule ring vaccination.');
    } finally {
      setSubmittingRing(false);
    }
  };

  return (
    <View style={styles.screenWrapper}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />
      <OfflineNotice />

      {/* Top Executive Command Header */}
      <View style={styles.topExecutiveHeader}>
        <View style={styles.headerMainRow}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Image source={ICON_BACK} style={styles.backIcon} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.cadreRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.cadreText}>
                {isEnglish ? 'BIOSECURITY & CONTAINMENT GOVERNANCE' : 'बायोसिक्योरिटी एवं क्वारंटाइन प्रशासन'}
              </Text>
            </View>
            <Text style={styles.headerMainTitle}>
              {isEnglish ? 'Containment Perimeters' : 'कंटेनमेंट परिधियां'}
            </Text>
            <Text style={styles.headerSubTitle}>
              {district ? `${district} ${isEnglish ? 'District' : 'ज़िला'} • ${activeCount} ${isEnglish ? 'Active Quarantine Perimeters' : 'सक्रिय क्वारंटाइन परिधियां'}` : (isEnglish ? 'District Jurisdiction' : 'ज़िला कार्यक्षेत्र')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.declareBtn}
            onPress={() => setDeclareModalVisible(true)}
            activeOpacity={0.85}
          >
            <Image source={ICON_PLUS} style={styles.declareBtnIcon} />
            <Text style={styles.declareBtnText}>{isEnglish ? 'Declare' : 'घोषित'}</Text>
          </TouchableOpacity>
        </View>

        {/* 3-Metric Summary Strip */}
        <View style={styles.telemetryGrid}>
          <View style={[styles.telemetryCard, styles.telemetryCardActive]}>
            <Text style={[styles.telemetryVal, { color: '#DC2626' }]}>{activeCount}</Text>
            <Text style={styles.telemetryLabel}>{isEnglish ? 'Active' : 'सक्रिय'}</Text>
          </View>
          <View style={styles.telemetryCard}>
            <Text style={[styles.telemetryVal, { color: '#D97706' }]}>{containedCount}</Text>
            <Text style={styles.telemetryLabel}>{isEnglish ? 'Contained' : 'नियंत्रित'}</Text>
          </View>
          <View style={styles.telemetryCard}>
            <Text style={[styles.telemetryVal, { color: '#10B981' }]}>{liftedCount}</Text>
            <Text style={styles.telemetryLabel}>{isEnglish ? 'Lifted' : 'समाप्त'}</Text>
          </View>
        </View>

        {isFromCache && (
          <View style={styles.cacheBanner}>
            <Image source={ICON_WARN} style={styles.cacheBannerIcon} />
            <Text style={styles.cacheBannerText}>
              {isEnglish
                ? 'Offline Mode: Displaying saved containment zones from device cache.'
                : 'ऑफ़लाइन मोड: डिवाइस पर सहेजे गए कंटेनमेंट ज़ोन दिखाए जा रहे हैं।'}
            </Text>
          </View>
        )}
      </View>

      {/* Filter Tabs Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBarScroll}>
          <TouchableOpacity
            style={[styles.tabChip, activeFilter === 'ALL' && styles.tabChipActive]}
            onPress={() => setActiveFilter('ALL')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabChipText, activeFilter === 'ALL' && styles.tabChipTextActive]}>
              {isEnglish ? 'All Zones' : 'सभी ज़ोन'} ({zones.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeFilter === 'ACTIVE' && styles.tabChipActiveRed]}
            onPress={() => setActiveFilter('ACTIVE')}
            activeOpacity={0.8}
          >
            <View style={[styles.dotIndicator, { backgroundColor: '#DC2626' }]} />
            <Text style={[styles.tabChipText, activeFilter === 'ACTIVE' && styles.tabChipTextActive]}>
              {isEnglish ? 'Active' : 'सक्रिय'} ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeFilter === 'CONTAINED' && styles.tabChipActiveAmber]}
            onPress={() => setActiveFilter('CONTAINED')}
            activeOpacity={0.8}
          >
            <View style={[styles.dotIndicator, { backgroundColor: '#D97706' }]} />
            <Text style={[styles.tabChipText, activeFilter === 'CONTAINED' && styles.tabChipTextActive]}>
              {isEnglish ? 'Contained' : 'नियंत्रित'} ({containedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeFilter === 'LIFTED' && styles.tabChipActiveGreen]}
            onPress={() => setActiveFilter('LIFTED')}
            activeOpacity={0.8}
          >
            <View style={[styles.dotIndicator, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.tabChipText, activeFilter === 'LIFTED' && styles.tabChipTextActive]}>
              {isEnglish ? 'Lifted' : 'समाप्त'} ({liftedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main List Area */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4338CA" />
          <Text style={styles.loadingText}>
            {isEnglish ? 'Loading district containment zones...' : 'कंटेनमेंट ज़ोन लोड हो रहे हैं...'}
          </Text>
        </View>
      ) : error && zones.length === 0 ? (
        <View style={styles.centerBox}>
          <Image source={ICON_WARN} style={styles.errorIcon} />
          <Text style={styles.errorTitle}>
            {isEnglish ? 'Surveillance Records Unavailable' : 'डेटा लोड विफल'}
          </Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadZones} activeOpacity={0.85}>
            <Image source={ICON_REFRESH} style={styles.retryBtnIcon} />
            <Text style={styles.retryBtnText}>{isEnglish ? 'Retry Loading' : 'पुनः प्रयास करें'}</Text>
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
              colors={['#4338CA']}
              tintColor="#4338CA"
            />
          }
        >
          {filteredZones.length === 0 ? (
            <View style={styles.emptyCard}>
              <Image source={ICON_SHIELD} style={styles.emptyCardIcon} />
              <Text style={styles.emptyTitle}>
                {isEnglish ? 'No Containment Zones' : 'कोई कंटेनमेंट ज़ोन नहीं'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isEnglish
                  ? `No containment zones currently match the "${activeFilter}" filter in ${district}.`
                  : `इस फ़िल्टर के अंतर्गत कोई ज़ोन नहीं मिला।`}
              </Text>
            </View>
          ) : (
            filteredZones.map((zone: ContainmentZone, idx: number) => {
              const theme = getContainmentStatusTheme(zone.status);
              const lat = zone.center?.lat ?? zone.centerLat;
              const lng = zone.center?.lng ?? zone.centerLng;

              return (
                <View key={zone.id || zone.zoneId || `zone_${idx}`} style={styles.zoneCard}>
                  {/* Card Header */}
                  <View style={styles.zoneCardHeader}>
                    <View style={styles.zoneTitleCol}>
                      <View style={[styles.statusBadge, { backgroundColor: theme.bgColor, borderColor: theme.borderColor }]}>
                        <Text style={[styles.statusBadgeText, { color: theme.color }]}>
                          {theme.label.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.zoneDiseaseTitle}>{zone.disease} Quarantine</Text>
                      <Text style={styles.zoneIdSubtitle}>
                        Zone ID: <Text style={styles.boldText}>{zone.zoneId || zone.id}</Text>
                      </Text>
                    </View>

                    <View style={styles.radiusPill}>
                      <Text style={styles.radiusVal}>{zone.radiusKm} km</Text>
                      <Text style={styles.radiusLabel}>{isEnglish ? 'Radius' : 'त्रिज्या'}</Text>
                    </View>
                  </View>

                  {/* Location Meta */}
                  <View style={styles.zoneMetaBox}>
                    <View style={styles.metaRowItem}>
                      <Image source={ICON_PIN} style={styles.metaPinIcon} />
                      <Text style={styles.metaLocationText}>
                        {zone.village ? `${zone.village}, ` : ''}{zone.block ? `${zone.block}, ` : ''}{zone.district}
                      </Text>
                    </View>
                    {typeof lat === 'number' && typeof lng === 'number' && (
                      <Text style={styles.metaCoordText}>
                        GPS: {lat.toFixed(4)}, {lng.toFixed(4)}
                      </Text>
                    )}
                  </View>

                  {/* Notes */}
                  {zone.notes ? (
                    <Text style={styles.zoneNotes} numberOfLines={2}>
                      Note: {zone.notes}
                    </Text>
                  ) : null}

                  {/* Action Suite */}
                  <View style={styles.zoneActionsRow}>
                    <TouchableOpacity
                      style={styles.actionBtnUpdate}
                      onPress={() => {
                        setSelectedZone(zone);
                        setTargetStatus(zone.status === 'ACTIVE' ? 'CONTAINED' : 'LIFTED');
                        setStatusModalVisible(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.actionBtnUpdateText}>
                        {isEnglish ? 'Update Status' : 'स्थिति बदलें'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnRing}
                      onPress={() => {
                        setRingCaseId(zone.zoneId || zone.id || '');
                        setRingVenue(zone.village ? `Veterinary Center, ${zone.village}` : '');
                        setRingModalVisible(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Image source={ICON_VACCINE} style={styles.actionBtnRingIcon} />
                      <Text style={styles.actionBtnRingText}>
                        {isEnglish ? 'Ring Drive' : 'रिंग टीका'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnMap}
                      onPress={() => {
                        if (typeof lat === 'number' && typeof lng === 'number') {
                          router.push({
                            pathname: '/(officer)/map',
                            params: { focusLat: String(lat), focusLng: String(lng), zoneId: zone.zoneId || zone.id },
                          } as any);
                        } else {
                          router.push('/(officer)/map' as any);
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <Image source={ICON_LOCATION} style={styles.actionBtnMapIcon} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 1. Status Update Modal */}
      <Modal visible={statusModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {isEnglish ? 'Update Containment Status' : 'कंटेनमेंट स्थिति अद्यतन करें'}
            </Text>
            <Text style={styles.modalSub}>
              Zone: {selectedZone?.zoneId} • {selectedZone?.disease}
            </Text>

            <View style={styles.statusOptionsRow}>
              {(['ACTIVE', 'CONTAINED', 'LIFTED'] as ContainmentZoneStatus[]).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusOptBtn, targetStatus === st && styles.statusOptBtnActive]}
                  onPress={() => setTargetStatus(st)}
                >
                  <Text style={[styles.statusOptText, targetStatus === st && styles.statusOptTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder={isEnglish ? 'Clinical rationale or observation notes...' : 'क्लिनिकल टिप्पणी दर्ज करें...'}
              value={statusNotes}
              onChangeText={setStatusNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setStatusModalVisible(false)}
                disabled={submittingStatus}
              >
                <Text style={styles.modalCancelText}>{isEnglish ? 'Cancel' : 'रद्द करें'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleStatusSubmit}
                disabled={submittingStatus}
              >
                {submittingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>{isEnglish ? 'Save Status' : 'सहेजें'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Declare Containment Zone Modal */}
      <Modal visible={declareModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollWrap}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {isEnglish ? 'Declare Containment Perimeter' : 'कंटेनमेंट ज़ोन घोषित करें'}
              </Text>
              <Text style={styles.modalSub}>
                {isEnglish
                  ? `Establish quarantine buffer under ${district} jurisdiction`
                  : `${district} ज़िले के अंतर्गत क्वारंटाइन परिधि स्थापित करें`}
              </Text>

              <TextInput
                style={styles.modalField}
                placeholder={isEnglish ? 'Disease Name (e.g. Lumpy Skin Disease)' : 'रोग का नाम'}
                value={newDisease}
                onChangeText={setNewDisease}
              />

              <TextInput
                style={styles.modalField}
                placeholder={isEnglish ? 'Block / Sub-District' : 'ब्लॉक / तहसील'}
                value={newBlock}
                onChangeText={setNewBlock}
              />

              <TextInput
                style={styles.modalField}
                placeholder={isEnglish ? 'Village Name' : 'गांव का नाम'}
                value={newVillage}
                onChangeText={setNewVillage}
              />

              <View style={styles.coordInputsRow}>
                <TextInput
                  style={[styles.modalField, styles.coordHalfField]}
                  placeholder="Latitude (e.g. 18.52)"
                  value={newLat}
                  onChangeText={setNewLat}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.modalField, styles.coordHalfField]}
                  placeholder="Longitude (e.g. 73.85)"
                  value={newLng}
                  onChangeText={setNewLng}
                  keyboardType="numeric"
                />
              </View>

              <TextInput
                style={styles.modalField}
                placeholder={isEnglish ? 'Buffer Radius in km (e.g. 5.0)' : 'त्रिज्या (किमी में)'}
                value={newRadius}
                onChangeText={setNewRadius}
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.modalField, styles.modalFieldMulti]}
                placeholder={isEnglish ? 'Official biosecurity notes or restrictions...' : 'आधिकारिक प्रतिबंध व निर्देश...'}
                value={newNotes}
                onChangeText={setNewNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDeclareModalVisible(false)}
                  disabled={submittingDeclare}
                >
                  <Text style={styles.modalCancelText}>{isEnglish ? 'Cancel' : 'रद्द करें'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleDeclareSubmit}
                  disabled={submittingDeclare}
                >
                  {submittingDeclare ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>{isEnglish ? 'Declare Zone' : 'घोषित करें'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 3. Ring Vaccination Modal */}
      <Modal visible={ringModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollWrap}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {isEnglish ? 'Schedule Ring Vaccination Drive' : 'रिंग टीकाकरण अभियान निर्धारित करें'}
              </Text>
              <Text style={styles.modalSub}>
                {isEnglish ? 'Emergency perimeter immunization around outbreak' : 'प्रकोप केंद्र के चारों ओर आपातकालीन टीकाकरण'}
              </Text>

              <TextInput
                style={styles.modalField}
                placeholder="Target Outbreak / Case ID"
                value={ringCaseId}
                onChangeText={setRingCaseId}
              />

              <TextInput
                style={styles.modalField}
                placeholder={isEnglish ? 'Venue / Village Focal Center' : 'शिविर स्थल'}
                value={ringVenue}
                onChangeText={setRingVenue}
              />

              <TextInput
                style={styles.modalField}
                placeholder="Target Camp Date (YYYY-MM-DD)"
                value={ringDate}
                onChangeText={setRingDate}
              />

              <TextInput
                style={styles.modalField}
                placeholder="Livestock Target Capacity (e.g. 500)"
                value={ringCapacity}
                onChangeText={setRingCapacity}
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.modalField, styles.modalFieldMulti]}
                placeholder={isEnglish ? 'Logistics notes / Cold-chain requirements...' : 'कोल्ड-चेन व रसद निर्देश...'}
                value={ringNotes}
                onChangeText={setRingNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setRingModalVisible(false)}
                  disabled={submittingRing}
                >
                  <Text style={styles.modalCancelText}>{isEnglish ? 'Cancel' : 'रद्द करें'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#059669' }]}
                  onPress={handleRingSubmit}
                  disabled={submittingRing}
                >
                  {submittingRing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>{isEnglish ? 'Schedule Drive' : 'अभियान सहेजें'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Universal Fixed Floating Bottom Navigation Dock */}
      <OfficerFloatingNav activeTab="containment" />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  topExecutiveHeader: {
    backgroundColor: '#0B132B',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.md,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  headerTitleWrap: {
    flex: 1,
  },
  cadreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7C3AED',
  },
  cadreText: {
    fontFamily: FONT_BOLD,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#DDD6FE',
    letterSpacing: 0.6,
  },
  headerMainTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubTitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },
  declareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4338CA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  declareBtnIcon: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
  },
  declareBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  telemetryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  telemetryCardActive: {
    borderColor: '#DC2626',
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
  },
  telemetryVal: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    fontWeight: '800',
  },
  telemetryLabel: {
    fontFamily: FONT_MEDIUM,
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 1,
  },
  cacheBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
  cacheBannerIcon: {
    width: 13,
    height: 13,
    tintColor: '#92400E',
  },
  cacheBannerText: {
    flex: 1,
    fontFamily: FONT_MEDIUM,
    fontSize: 11,
    color: '#92400E',
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterBarScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  tabChipActiveRed: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  tabChipActiveAmber: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  tabChipActiveGreen: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  dotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  tabChipText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 130, // Clearance for fixed floating dock
    gap: 12,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
  },
  errorIcon: {
    width: 44,
    height: 44,
    tintColor: '#DC2626',
    marginBottom: 8,
  },
  errorTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  errorSubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4338CA',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  retryBtnIcon: {
    width: 13,
    height: 13,
    tintColor: '#FFFFFF',
  },
  retryBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardIcon: {
    width: 48,
    height: 48,
    tintColor: '#10B981',
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
  },
  zoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  zoneCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  zoneTitleCol: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  statusBadgeText: {
    fontFamily: FONT_BOLD,
    fontSize: 9.5,
    fontWeight: '800',
  },
  zoneDiseaseTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  zoneIdSubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  boldText: {
    fontFamily: FONT_BOLD,
    color: '#0F172A',
  },
  radiusPill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  radiusVal: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    fontWeight: '800',
    color: '#4338CA',
  },
  radiusLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 9.5,
    color: '#64748B',
  },
  zoneMetaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    gap: 3,
  },
  metaRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaPinIcon: {
    width: 12,
    height: 12,
    tintColor: '#64748B',
  },
  metaLocationText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 12,
    color: '#334155',
  },
  metaCoordText: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 17,
  },
  zoneNotes: {
    fontFamily: FONT_REGULAR,
    fontSize: 11.5,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  zoneActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnUpdate: {
    flex: 1.2,
    backgroundColor: '#1E1B4B',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnUpdateText: {
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnRing: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#CCFBF1',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  actionBtnRingIcon: {
    width: 12,
    height: 12,
    tintColor: '#0F766E',
  },
  actionBtnRingText: {
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  actionBtnMap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnMapIcon: {
    width: 16,
    height: 16,
    tintColor: '#4338CA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalScrollWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...shadows.lg,
  },
  modalTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  statusOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusOptBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusOptBtnActive: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  statusOptText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: '#475569',
  },
  statusOptTextActive: {
    color: '#FFFFFF',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  modalField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  modalFieldMulti: {
    height: 70,
    textAlignVertical: 'top',
  },
  coordInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coordHalfField: {
    flex: 1,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 1.5,
    backgroundColor: '#4338CA',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
