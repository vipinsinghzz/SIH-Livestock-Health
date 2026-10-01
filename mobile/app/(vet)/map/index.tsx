/**
 * Livestock Saathi - Ultra-Premium Veterinarian Outbreak GIS Surveillance Map
 * File: mobile/app/(vet)/map/index.tsx
 * 
 * Luxury Biosecurity Command Center & Spatial Radar:
 * - Edge-to-edge custom luxury executive forest header (#062A1A) with live radar pulse
 * - Cadre badge: "EPIDEMIC GEOSPATIAL SURVEILLANCE RADAR"
 * - District telemetry header with live zones, clusters, and case count metrics
 * - Top navigation with back circle, "Zones & Rings" shortcut pill, and refresh button
 * - Interactive Biosecurity Layer Control HUD:
 *     * Quarantine Zones (Red perimeter)
 *     * DBSCAN Transmission Clusters (<=5km, Amber)
 *     * Clinical Field Cases (Blue)
 * - 100% Google Maps-free, offline-capable Leaflet GIS WebView with interactive markers
 * - Floating glassmorphism surveillance legend HUD
 * - Floating GPS crosshairs FAB for instant recentering
 * - Slide-up bottom entity dossier sheet with 3D species avatar, risk pill, and direct clinical CTA
 * - Fixed universal floating bottom navigation dock (activeTab="map")
 * - 100% platform-safe typography stack, zero raw text emojis
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { LeafletGisWebView } from '../../../src/components/LeafletGisWebView';
import * as Location from 'expo-location';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, shadows } from '../../../src/theme';
import { containmentService } from '../../../src/services/containmentService';
import { veterinarianService } from '../../../src/services/veterinarianService';
import {
  ContainmentZone,
  OutbreakCluster,
  getContainmentStatusTheme,
} from '../../../src/types/containment';
import { DiseaseCase, getStatusTheme } from '../../../src/types/case';
import { OfflineNotice } from '../../../src/components/OfflineNotice';
import { VetFloatingNav } from '../../../src/components/VetFloatingNav';
import { useAppLanguage } from '../../../src/services/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Native typography stack
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

// Static assets
const ICON_SHIELD = require('../../../assets/icons/shield.png');
const ICON_REFRESH = require('../../../assets/icons/refresh.png');
const ICON_LOCATION = require('../../../assets/icons/location.png');
const ICON_ALERT = require('../../../assets/icons/alert.png');
const ICON_CLIPBOARD = require('../../../assets/icons/clipboard.png');
const ICON_CHEVRON = require('../../../assets/icons/chevron-right.png');
const ICON_PIN = require('../../../assets/icons/icon_pin.png');
const ICON_TAG = require('../../../assets/icons/tag.png');
const ICON_ARROW_BACK = require('../../../assets/icons/arrow-back.png');

const AVATAR_COW = require('../../../assets/avatar_cow.png');
const AVATAR_BUFFALO = require('../../../assets/avatar_buffalo.png');
const AVATAR_GOAT = require('../../../assets/avatar_goat.png');
const AVATAR_SHEEP = require('../../../assets/avatar_sheep.png');

const DEFAULT_MAHARASHTRA_CENTER = {
  latitude: 21.1458,
  longitude: 79.0882,
};

type VetMapLayer = 'cases' | 'containment' | 'clusters';

function getSpeciesAvatar(species?: string) {
  const s = (species || '').toLowerCase();
  if (s.includes('buff')) return AVATAR_BUFFALO;
  if (s.includes('goat')) return AVATAR_GOAT;
  if (s.includes('sheep')) return AVATAR_SHEEP;
  return AVATAR_COW;
}

export default function VetOutbreakMapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, isEnglish } = useAppLanguage();

  const userDistrict = user?.district || 'Nagpur';

  // Spatial datasets
  const [containmentZones, setContainmentZones] = useState<ContainmentZone[]>([]);
  const [clusters, setClusters] = useState<OutbreakCluster[]>([]);
  const [districtCases, setDistrictCases] = useState<DiseaseCase[]>([]);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Layer toggles
  const [activeLayers, setActiveLayers] = useState<Record<VetMapLayer, boolean>>({
    cases: true,
    containment: true,
    clusters: true,
  });

  // Selected item for bottom card
  const [selectedEntity, setSelectedEntity] = useState<
    | { type: 'zone'; data: ContainmentZone }
    | { type: 'cluster'; data: OutbreakCluster }
    | { type: 'case'; data: DiseaseCase }
    | null
  >(null);

  // Device region & GPS user coordinates
  const [region, setRegion] = useState({
    latitude: DEFAULT_MAHARASHTRA_CENTER.latitude,
    longitude: DEFAULT_MAHARASHTRA_CENTER.longitude,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  });
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Request location permission & center
  const requestAndCenterGPS = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const newCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        };
        setRegion(newCoords);
        setUserCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch (e) {
      // Fall back to district center
    }
  }, []);

  useEffect(() => {
    requestAndCenterGPS();
  }, [requestAndCenterGPS]);

  const loadAllSpatialData = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);

      const [zonesRes, clustersRes, casesRes] = await Promise.all([
        containmentService.getContainmentZones({ district: userDistrict }),
        containmentService.getSpatialOutbreakClusters({ district: userDistrict }),
        veterinarianService.getVeterinarianReferrals({ district: userDistrict, limit: 100 }),
      ]);

      setContainmentZones(zonesRes.zones || []);
      setClusters(clustersRes.clusters || []);
      setDistrictCases(casesRes.cases || []);

      const fromCacheAny = Boolean(zonesRes.fromCache || clustersRes.fromCache || casesRes.fromCache);
      setIsFromCache(fromCacheAny);
    } catch (err: any) {
      console.warn('[VetMap] Error loading spatial outbreak data:', err?.message);
      setError(err?.message || 'Failed to load outbreak surveillance data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userDistrict]);

  useEffect(() => {
    loadAllSpatialData();
  }, [loadAllSpatialData]);

  const toggleLayer = (layer: VetMapLayer) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Valid coordinates extraction for cases
  const validCases = useMemo(() => {
    return districtCases.filter((c) => {
      const lat = c.coordinates?.lat ?? (c as any).latitude;
      const lng = c.coordinates?.lng ?? (c as any).longitude;
      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [districtCases]);

  // Valid coordinates extraction for containment zones
  const validZones = useMemo(() => {
    return containmentZones.filter((z) => {
      const lat = z.center?.lat ?? z.centerLat;
      const lng = z.center?.lng ?? z.centerLng;
      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [containmentZones]);

  // Valid clusters
  const validClusters = useMemo(() => {
    return clusters.filter((cl) => {
      const lat = cl.centroidLat;
      const lng = cl.centroidLng;
      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [clusters]);

  return (
    <View style={styles.screenWrapper}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#062A1A" />
      <OfflineNotice />

      {/* ======================================================== */}
      {/* 1. TOP EXECUTIVE BIOSECURITY RADAR HEADER */}
      {/* ======================================================== */}
      <View style={styles.topExecutiveHeader}>
        {/* Cadre Badge & Radar Indicator */}
        <View style={styles.cadreRow}>
          <View style={styles.pulseDot} />
          <Text style={styles.cadreText}>
            {isEnglish ? 'EPIDEMIC GEOSPATIAL SURVEILLANCE RADAR' : 'महामारी भू-स्थानिक निगरानी रडार'}
          </Text>
        </View>

        {/* Title + Action Buttons Row */}
        <View style={styles.headerMainRow}>
          <TouchableOpacity
            style={styles.topBackCircle}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Image source={ICON_ARROW_BACK} style={styles.topBackIcon} resizeMode="contain" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerMainTitle}>
              {isEnglish ? 'Outbreak GIS Radar' : 'प्रकोप जीआईएस रडार'}
            </Text>
            <Text style={styles.headerSubTitle}>
              {userDistrict} {isEnglish ? 'District' : 'ज़िला'} • {validZones.length} {isEnglish ? 'Zones' : 'ज़ोन'} • {validClusters.length} {isEnglish ? 'Clusters' : 'क्लस्टर'}
            </Text>
          </View>

          {/* Action Pills */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.containmentNavBtn}
              onPress={() => router.push('/(vet)/containment' as any)}
              activeOpacity={0.8}
            >
              <Image source={ICON_SHIELD} style={styles.btnIconWhite} />
              <Text style={styles.containmentNavText}>
                {isEnglish ? 'Zones & Rings' : 'ज़ोन व रिंग'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={loadAllSpatialData}
              activeOpacity={0.8}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Image source={ICON_REFRESH} style={styles.refreshIconImg} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Biosecurity Layer Toggles HUD Strip */}
        <View style={styles.layerTogglesRow}>
          {/* Containment Zones */}
          <TouchableOpacity
            style={[
              styles.layerToggleBtn,
              activeLayers.containment ? styles.layerBtnZoneActive : styles.layerBtnInactive,
            ]}
            onPress={() => toggleLayer('containment')}
            activeOpacity={0.8}
          >
            <View style={[styles.dotIndicator, { backgroundColor: activeLayers.containment ? '#FFFFFF' : '#DC2626' }]} />
            <Text
              style={[
                styles.layerToggleText,
                activeLayers.containment ? styles.layerTextZoneActive : styles.layerTextInactive,
              ]}
            >
              {isEnglish ? 'Zones' : 'ज़ोन'} ({validZones.length})
            </Text>
          </TouchableOpacity>

          {/* Clusters */}
          <TouchableOpacity
            style={[
              styles.layerToggleBtn,
              activeLayers.clusters ? styles.layerBtnClusterActive : styles.layerBtnInactive,
            ]}
            onPress={() => toggleLayer('clusters')}
            activeOpacity={0.8}
          >
            <View style={[styles.dotIndicator, { backgroundColor: activeLayers.clusters ? '#FFFFFF' : '#D97706' }]} />
            <Text
              style={[
                styles.layerToggleText,
                activeLayers.clusters ? styles.layerTextClusterActive : styles.layerTextInactive,
              ]}
            >
              {isEnglish ? 'Clusters' : 'क्लस्टर'} ({validClusters.length})
            </Text>
          </TouchableOpacity>

          {/* Cases */}
          <TouchableOpacity
            style={[
              styles.layerToggleBtn,
              activeLayers.cases ? styles.layerBtnCaseActive : styles.layerBtnInactive,
            ]}
            onPress={() => toggleLayer('cases')}
            activeOpacity={0.8}
          >
            <View style={[styles.dotIndicator, { backgroundColor: activeLayers.cases ? '#FFFFFF' : '#0284C7' }]} />
            <Text
              style={[
                styles.layerToggleText,
                activeLayers.cases ? styles.layerTextCaseActive : styles.layerTextInactive,
              ]}
            >
              {isEnglish ? 'Field Cases' : 'केस'} ({validCases.length})
            </Text>
          </TouchableOpacity>
        </View>

        {isFromCache && (
          <View style={styles.cacheNoticeBanner}>
            <Image source={ICON_ALERT} style={styles.cacheIcon} />
            <Text style={styles.cacheNoticeBannerText}>
              {isEnglish
                ? 'Offline Cache: Viewing spatial records stored on device.'
                : 'ऑफ़लाइन कैश: डिवाइस पर सहेजे गए रिकॉर्ड दिखाए जा रहे हैं।'}
            </Text>
          </View>
        )}
      </View>

      {/* ======================================================== */}
      {/* 2. MAIN MAP INTERACTIVE VIEW */}
      {/* ======================================================== */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0F5132" />
          <Text style={styles.loadingText}>
            {isEnglish ? 'Loading outbreak spatial biosecurity layers...' : 'स्थानिक बायोसिक्योरिटी परतें लोड हो रही हैं...'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Image source={ICON_ALERT} style={styles.errorIcon} />
          <Text style={styles.errorTitle}>
            {isEnglish ? 'Surveillance Layer Error' : 'निगरानी डेटा लोड विफल'}
          </Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadAllSpatialData} activeOpacity={0.85}>
            <Image source={ICON_REFRESH} style={styles.retryBtnIcon} />
            <Text style={styles.retryBtnText}>
              {isEnglish ? 'Retry Loading Map' : 'पुनः लोड करें'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <LeafletGisWebView
            containmentZones={validZones}
            clusters={validClusters}
            cases={validCases}
            activeLayers={activeLayers}
            center={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
            userLocation={userCoords}
            selectedEntity={selectedEntity}
            onSelectEntity={setSelectedEntity}
            loadingText={isEnglish ? 'Loading GIS radar...' : 'जीआईएस रडार लोड हो रहा है...'}
          />

          {/* Floating Glassmorphism Map Legend */}
          <View style={styles.floatingLegendCard}>
            <Text style={styles.legendHeader}>
              {isEnglish ? 'SURVEILLANCE HUD' : 'निगरानी संकेत'}
            </Text>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendLabel}>
                {isEnglish ? 'Active Quarantine Zone' : 'सक्रिय क्वारंटाइन ज़ोन'}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.legendLabel}>
                {isEnglish ? 'DBSCAN Cluster (<=5km)' : 'प्रकोप क्लस्टर (<=5 किमी)'}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
              <Text style={styles.legendLabel}>
                {isEnglish ? 'Clinical Field Case' : 'क्षेत्रीय क्लिनिकल केस'}
              </Text>
            </View>
          </View>

          {/* Floating GPS Recenter FAB */}
          <TouchableOpacity
            style={styles.gpsFab}
            onPress={requestAndCenterGPS}
            activeOpacity={0.85}
            accessibilityLabel="Recenter GPS Location"
          >
            <Image source={ICON_LOCATION} style={styles.gpsFabIcon} />
          </TouchableOpacity>

          {/* Slide-Up Selected Entity Dossier Sheet */}
          {selectedEntity && (
            <View style={styles.entityDossierCard}>
              {/* Card Header & Badges */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardBadgeWrap}>
                  {selectedEntity.type === 'zone' && (
                    <View
                      style={[
                        styles.dossierBadge,
                        {
                          backgroundColor: getContainmentStatusTheme(selectedEntity.data.status).bgColor,
                          borderColor: getContainmentStatusTheme(selectedEntity.data.status).borderColor,
                        },
                      ]}
                    >
                      <Image source={ICON_SHIELD} style={[styles.badgeSmallIcon, { tintColor: getContainmentStatusTheme(selectedEntity.data.status).color }]} />
                      <Text
                        style={[
                          styles.dossierBadgeText,
                          { color: getContainmentStatusTheme(selectedEntity.data.status).color },
                        ]}
                      >
                        {getContainmentStatusTheme(selectedEntity.data.status).label.toUpperCase()} PERIMETER
                      </Text>
                    </View>
                  )}

                  {selectedEntity.type === 'cluster' && (
                    <View style={[styles.dossierBadge, styles.clusterBadge]}>
                      <Image source={ICON_ALERT} style={[styles.badgeSmallIcon, { tintColor: '#92400E' }]} />
                      <Text style={styles.clusterBadgeText}>
                        HOTSPOT CLUSTER • {selectedEntity.data.risk || 'HIGH'}
                      </Text>
                    </View>
                  )}

                  {selectedEntity.type === 'case' && (
                    <View
                      style={[
                        styles.dossierBadge,
                        {
                          backgroundColor: getStatusTheme(selectedEntity.data.status).bgColor,
                          borderColor: getStatusTheme(selectedEntity.data.status).borderColor,
                        },
                      ]}
                    >
                      <Image source={ICON_CLIPBOARD} style={[styles.badgeSmallIcon, { tintColor: getStatusTheme(selectedEntity.data.status).color }]} />
                      <Text
                        style={[
                          styles.dossierBadgeText,
                          { color: getStatusTheme(selectedEntity.data.status).color },
                        ]}
                      >
                        {getStatusTheme(selectedEntity.data.status).label.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setSelectedEntity(null)}
                  style={styles.closeCardBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeCardText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Zone Details */}
              {selectedEntity.type === 'zone' && (
                <View style={styles.entityContent}>
                  <Text style={styles.entityTitle}>
                    {selectedEntity.data.disease} Quarantine Perimeter
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      Zone ID: <Text style={styles.boldText}>{selectedEntity.data.zoneId}</Text>
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>
                      Radius: <Text style={styles.boldText}>{selectedEntity.data.radiusKm} km</Text>
                    </Text>
                  </View>
                  <Text style={styles.locationMetaText}>
                    <Image source={ICON_PIN} style={styles.inlinePin} />
                    {' '}
                    {selectedEntity.data.village ? `${selectedEntity.data.village}, ` : ''}
                    {selectedEntity.data.block ? `${selectedEntity.data.block}, ` : ''}
                    {selectedEntity.data.district}
                  </Text>
                  {selectedEntity.data.notes ? (
                    <Text style={styles.entityNotes} numberOfLines={2}>
                      Note: {selectedEntity.data.notes}
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => router.push('/(vet)/containment' as any)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryActionBtnText}>
                      {isEnglish ? 'Manage Containment Perimeter' : 'कंटेनमेंट ज़ोन प्रबंधित करें'}
                    </Text>
                    <Image source={ICON_CHEVRON} style={styles.actionChevronIcon} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Cluster Details */}
              {selectedEntity.type === 'cluster' && (
                <View style={styles.entityContent}>
                  <Text style={styles.entityTitle}>
                    {selectedEntity.data.disease} Transmission Cluster
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      Grouped Cases:{' '}
                      <Text style={styles.boldText}>
                        {selectedEntity.data.count || selectedEntity.data.caseCount || 2} Cases within 5km
                      </Text>
                    </Text>
                  </View>
                  <Text style={styles.locationMetaText}>
                    Centroid GPS: {selectedEntity.data.centroidLat?.toFixed(4)}, {selectedEntity.data.centroidLng?.toFixed(4)}
                  </Text>

                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => router.push('/(vet)/containment' as any)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryActionBtnText}>
                      {isEnglish ? 'Declare Containment for Cluster' : 'क्लस्टर के लिए ज़ोन घोषित करें'}
                    </Text>
                    <Image source={ICON_CHEVRON} style={styles.actionChevronIcon} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Case Details */}
              {selectedEntity.type === 'case' && (
                <View style={styles.entityContent}>
                  <View style={styles.caseHeaderRow}>
                    <Image
                      source={getSpeciesAvatar(selectedEntity.data.species)}
                      style={styles.caseSpeciesAvatar}
                    />
                    <View style={styles.caseHeaderInfo}>
                      <Text style={styles.entityTitle}>
                        Case #{selectedEntity.data.caseId} • {selectedEntity.data.disease}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>
                          Species: <Text style={styles.boldText}>{selectedEntity.data.species || 'Cattle'}</Text>
                        </Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.metaText}>
                          Risk: <Text style={styles.boldText}>{selectedEntity.data.risk}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.locationMetaText}>
                    <Image source={ICON_PIN} style={styles.inlinePin} />
                    {' '}
                    {selectedEntity.data.farmerLocation?.village
                      ? `${selectedEntity.data.farmerLocation.village}, `
                      : ''}
                    {selectedEntity.data.districtId || userDistrict}
                  </Text>

                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() =>
                      router.push(`/(vet)/referrals/${selectedEntity.data.id || selectedEntity.data.caseId}` as any)
                    }
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryActionBtnText}>
                      {isEnglish ? 'Open Clinical Case Dossier' : 'क्लिनिकल केस खोलें'}
                    </Text>
                    <Image source={ICON_CHEVRON} style={styles.actionChevronIcon} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Mandatory Medical Safety Disclaimer Bar */}
      <View style={styles.aiSafetyBar}>
        <Image source={ICON_ALERT} style={styles.safetyIcon} />
        <Text style={styles.aiSafetyText}>
          {isEnglish
            ? 'AI preliminary screening & spatial DBSCAN clustering — Veterinarian clinical verification required.'
            : 'एआई स्क्रीनिंग व क्लस्टरिंग — किसी भी प्रतिबंधात्मक कार्रवाई से पहले पशुचिकित्सक सत्यापन आवश्यक है।'}
        </Text>
      </View>

      {/* Universal Fixed Floating Bottom Navigation Dock */}
      <VetFloatingNav activeTab="map" />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  topExecutiveHeader: {
    backgroundColor: '#062A1A',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 10,
  },
  cadreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  cadreText: {
    fontFamily: FONT_BOLD,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#6EE7B7',
    letterSpacing: 0.8,
  },
  topBackCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    marginRight: 10,
  },
  topBackIcon: {
    width: 18,
    height: 18,
    tintColor: '#FFFFFF',
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerMainTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubTitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#D1FAE5',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  containmentNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  btnIconWhite: {
    width: 13,
    height: 13,
    tintColor: '#FFFFFF',
  },
  containmentNavText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  iconCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  refreshIconImg: {
    width: 15,
    height: 15,
    tintColor: '#FFFFFF',
  },
  layerTogglesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  layerToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  layerBtnInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  layerBtnZoneActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  layerBtnClusterActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  layerBtnCaseActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  dotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  layerToggleText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    fontWeight: '800',
  },
  layerTextInactive: {
    color: '#E2E8F0',
  },
  layerTextZoneActive: {
    color: '#FFFFFF',
  },
  layerTextClusterActive: {
    color: '#FFFFFF',
  },
  layerTextCaseActive: {
    color: '#FFFFFF',
  },
  cacheNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },
  cacheIcon: {
    width: 12,
    height: 12,
    tintColor: '#92400E',
  },
  cacheNoticeBannerText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 10.5,
    color: '#92400E',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
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
    marginBottom: 10,
  },
  errorTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  errorMessage: {
    fontFamily: FONT_REGULAR,
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F5132',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  retryBtnIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },
  retryBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingLegendCard: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  legendHeader: {
    fontFamily: FONT_BOLD,
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 10,
    color: '#334155',
  },
  gpsFab: {
    position: 'absolute',
    right: 16,
    bottom: 125, // Above disclaimer and bottom nav
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
    zIndex: 15,
  },
  gpsFabIcon: {
    width: 22,
    height: 22,
    tintColor: '#0F5132',
  },
  entityDossierCard: {
    position: 'absolute',
    bottom: 48, // Sits above safety bar and bottom dock
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dossierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeSmallIcon: {
    width: 11,
    height: 11,
  },
  dossierBadgeText: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  clusterBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  clusterBadgeText: {
    fontFamily: FONT_BOLD,
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  closeCardBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCardText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: '#64748B',
  },
  entityContent: {
    marginTop: 2,
  },
  entityTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#64748B',
  },
  boldText: {
    fontFamily: FONT_BOLD,
    color: '#0F172A',
    fontWeight: '700',
  },
  metaDot: {
    color: '#CBD5E1',
  },
  locationMetaText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  inlinePin: {
    width: 11,
    height: 11,
    tintColor: '#64748B',
  },
  entityNotes: {
    fontFamily: FONT_REGULAR,
    fontSize: 11.5,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  caseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  caseSpeciesAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  caseHeaderInfo: {
    flex: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F5132',
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 2,
  },
  primaryActionBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionChevronIcon: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
  },
  aiSafetyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    marginBottom: 88, // Clears above fixed floating nav
  },
  safetyIcon: {
    width: 12,
    height: 12,
    tintColor: '#B45309',
  },
  aiSafetyText: {
    flex: 1,
    fontFamily: FONT_MEDIUM,
    fontSize: 10,
    color: '#92400E',
    lineHeight: 14,
  },
});
