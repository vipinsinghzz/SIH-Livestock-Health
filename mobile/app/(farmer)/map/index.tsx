/**
 * Livestock Saathi - Farmer: Livestock Health & Veterinary GIS Map
 * File: mobile/app/(farmer)/map/index.tsx
 * 
 * Interactive production spatial map displaying:
 * 1. Certified veterinary centers and hospitals (GET /api/veterinarians/nearby)
 * 2. Active quarantine containment zones (GET /api/cases/containment-zones)
 * 3. Privacy-fuzzed local disease cases (GET /api/cases/nearby)
 * 4. Government preventive vaccination camps (GET /api/vaccination-drives)
 * 
 * Strict Privacy & Zero-Mock: Individual farm coordinates are privacy-fuzzed (~1.5km ring),
 * peer farmer names/phones are completely excluded, and all data comes strictly from real APIs.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  ScrollView,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import mapService, { DEFAULT_MAHARASHTRA_CENTER } from '../../../src/services/mapService';
import {
  MapRegion,
  MapLayerKey,
  VeterinaryFacilityMarker,
  ContainmentZoneOverlay,
  NearbyDiseaseCaseMarker,
  VaccinationCampMarker,
} from '../../../src/types/map';

export default function FarmerMapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  // Region state (defaults to Pune/Maharashtra center)
  const [region, setRegion] = useState<MapRegion>({
    latitude: DEFAULT_MAHARASHTRA_CENTER.latitude,
    longitude: DEFAULT_MAHARASHTRA_CENTER.longitude,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });

  // User location & permission states
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState<boolean>(false);

  // Spatial data layers state
  const [vets, setVets] = useState<VeterinaryFacilityMarker[]>([]);
  const [containmentZones, setContainmentZones] = useState<ContainmentZoneOverlay[]>([]);
  const [nearbyCases, setNearbyCases] = useState<NearbyDiseaseCaseMarker[]>([]);
  const [vaccinationCamps, setVaccinationCamps] = useState<VaccinationCampMarker[]>([]);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeLayers, setActiveLayers] = useState<Record<MapLayerKey, boolean>>({
    vets: true,
    containment: true,
    cases: true,
    camps: true,
  });

  // Selected map entity for bottom details sheet
  const [selectedEntity, setSelectedEntity] = useState<
    | { type: 'vet'; data: VeterinaryFacilityMarker }
    | { type: 'zone'; data: ContainmentZoneOverlay }
    | { type: 'case'; data: NearbyDiseaseCaseMarker }
    | { type: 'camp'; data: VaccinationCampMarker }
    | null
  >(null);

  /**
   * Request device location with clear user explanation
   */
  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasLocationPermission(true);
        setLocationPermissionDenied(false);

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };

        setUserCoords(coords);
        setRegion({
          ...coords,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });

        // Animate map to user's real location
        mapRef.current?.animateToRegion(
          {
            ...coords,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          },
          1000
        );

        return coords;
      } else {
        setHasLocationPermission(false);
        setLocationPermissionDenied(true);
      }
    } catch (err) {
      console.warn('[FarmerMap] Location request error:', err);
      setLocationPermissionDenied(true);
    }
    return null;
  }, []);

  /**
   * Fetch all active map layers from production backend
   */
  const loadMapData = useCallback(
    async (targetCoords?: { latitude: number; longitude: number }) => {
      try {
        setRefreshing(true);
        setIsOffline(false);

        const lat = targetCoords?.latitude || userCoords?.latitude || region.latitude;
        const lng = targetCoords?.longitude || userCoords?.longitude || region.longitude;

        const data = await mapService.getFarmerMapData({
          lat,
          lng,
          district: user?.district || 'Pune',
        });

        setVets(data.veterinarians);
        setContainmentZones(data.containmentZones);
        setNearbyCases(data.nearbyCases);
        setVaccinationCamps(data.vaccinationCamps);
      } catch (err: any) {
        console.warn('[FarmerMap] Map data fetch error:', err);
        setIsOffline(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userCoords, region.latitude, region.longitude, user?.district]
  );

  // Initial load
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      setLoading(true);
      const coords = await requestLocation();
      if (isMounted) {
        await loadMapData(coords || undefined);
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleLayer = (layerKey: MapLayerKey) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  const handleCallVet = (phone: string) => {
    if (!phone) {
      Alert.alert('Phone Unavailable', 'No direct contact number registered for this clinic.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call on this device.');
    });
  };

  // Counts for layer summary
  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (activeLayers.vets && vets.length > 0) parts.push(`${vets.length} Vets`);
    if (activeLayers.containment && containmentZones.length > 0) parts.push(`${containmentZones.length} Zones`);
    if (activeLayers.cases && nearbyCases.length > 0) parts.push(`${nearbyCases.length} Cases`);
    if (activeLayers.camps && vaccinationCamps.length > 0) parts.push(`${vaccinationCamps.length} Camps`);
    return parts.length > 0 ? parts.join(' • ') : 'No layers active';
  }, [activeLayers, vets.length, containmentZones.length, nearbyCases.length, vaccinationCamps.length]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.primary} />

      {/* Top Header Information Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Livestock Health Map</Text>
          <Text style={styles.headerSubtitle}>
            📍 {user?.district || 'Maharashtra'} • {summaryText}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadMapData()}
          disabled={refreshing}
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.light.primary} />
          ) : (
            <Text style={styles.refreshButtonText}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Floating Layer Filter Pills */}
      <View style={styles.layerSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.layerScrollContent}
        >
          {/* Vet Centers Layer */}
          <TouchableOpacity
            style={[
              styles.layerPill,
              activeLayers.vets && styles.layerPillActiveVet,
            ]}
            onPress={() => toggleLayer('vets')}
            activeOpacity={0.8}
          >
            <Text style={styles.layerIcon}>🏥</Text>
            <Text
              style={[
                styles.layerText,
                activeLayers.vets && styles.layerTextActive,
              ]}
            >
              Vet Help ({vets.length})
            </Text>
          </TouchableOpacity>

          {/* Containment Zones Layer */}
          <TouchableOpacity
            style={[
              styles.layerPill,
              activeLayers.containment && styles.layerPillActiveZone,
            ]}
            onPress={() => toggleLayer('containment')}
            activeOpacity={0.8}
          >
            <Text style={styles.layerIcon}>🛡️</Text>
            <Text
              style={[
                styles.layerText,
                activeLayers.containment && styles.layerTextActive,
              ]}
            >
              Containment ({containmentZones.length})
            </Text>
          </TouchableOpacity>

          {/* Nearby Cases Layer */}
          <TouchableOpacity
            style={[
              styles.layerPill,
              activeLayers.cases && styles.layerPillActiveCase,
            ]}
            onPress={() => toggleLayer('cases')}
            activeOpacity={0.8}
          >
            <Text style={styles.layerIcon}>⚠️</Text>
            <Text
              style={[
                styles.layerText,
                activeLayers.cases && styles.layerTextActive,
              ]}
            >
              Cases ({nearbyCases.length})
            </Text>
          </TouchableOpacity>

          {/* Vaccination Camps Layer */}
          <TouchableOpacity
            style={[
              styles.layerPill,
              activeLayers.camps && styles.layerPillActiveCamp,
            ]}
            onPress={() => toggleLayer('camps')}
            activeOpacity={0.8}
          >
            <Text style={styles.layerIcon}>💉</Text>
            <Text
              style={[
                styles.layerText,
                activeLayers.camps && styles.layerTextActive,
              ]}
            >
              Camps ({vaccinationCamps.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Permission Request Alert Banner */}
      {locationPermissionDenied && (
        <TouchableOpacity
          style={styles.permissionBanner}
          onPress={requestLocation}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionBannerText}>
            📍 Tap to enable GPS for precise nearby veterinary dispensaries
          </Text>
        </TouchableOpacity>
      )}

      {/* Offline Alert Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Map data unavailable offline • Live layers may be incomplete
          </Text>
          <TouchableOpacity onPress={() => loadMapData()}>
            <Text style={styles.offlineRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map Area */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={hasLocationPermission}
          showsCompass={true}
          toolbarEnabled={false}
          onPress={() => setSelectedEntity(null)}
        >
          {/* 1. Veterinary Clinics & Doctors Layer */}
          {activeLayers.vets &&
            vets.map((vet) => (
              <Marker
                key={`vet-${vet.id}`}
                coordinate={{
                  latitude: vet.latitude,
                  longitude: vet.longitude,
                }}
                pinColor={colors.light.primary}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedEntity({ type: 'vet', data: vet });
                }}
              >
                <View style={styles.vetMarkerContainer}>
                  <Text style={styles.markerEmoji}>🏥</Text>
                </View>
              </Marker>
            ))}

          {/* 2. Containment Quarantine Zones Layer (Circles) */}
          {activeLayers.containment &&
            containmentZones.map((zone) => (
              <React.Fragment key={`zone-${zone.id}`}>
                <Circle
                  center={{
                    latitude: zone.center.lat,
                    longitude: zone.center.lng,
                  }}
                  radius={zone.radiusKm * 1000} // Radius in meters
                  fillColor="rgba(220, 53, 69, 0.2)"
                  strokeColor="#DC3545"
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{
                    latitude: zone.center.lat,
                    longitude: zone.center.lng,
                  }}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedEntity({ type: 'zone', data: zone });
                  }}
                >
                  <View style={styles.zoneMarkerContainer}>
                    <Text style={styles.markerEmoji}>🛡️</Text>
                  </View>
                </Marker>
              </React.Fragment>
            ))}

          {/* 3. Nearby Disease Cases Layer (Fuzzed Vicinity) */}
          {activeLayers.cases &&
            nearbyCases.map((cs) => (
              <Marker
                key={`case-${cs.id}`}
                coordinate={{
                  latitude: cs.latitude,
                  longitude: cs.longitude,
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedEntity({ type: 'case', data: cs });
                }}
              >
                <View
                  style={[
                    styles.caseMarkerContainer,
                    cs.risk.toLowerCase().includes('high') || cs.risk.toLowerCase().includes('critical')
                      ? styles.caseMarkerHigh
                      : styles.caseMarkerModerate,
                  ]}
                >
                  <Text style={styles.markerEmojiSmall}>⚠️</Text>
                </View>
              </Marker>
            ))}

          {/* 4. Vaccination Camps Layer */}
          {activeLayers.camps &&
            vaccinationCamps.map((camp) => (
              <Marker
                key={`camp-${camp.id}`}
                coordinate={{
                  latitude: camp.latitude,
                  longitude: camp.longitude,
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedEntity({ type: 'camp', data: camp });
                }}
              >
                <View style={styles.campMarkerContainer}>
                  <Text style={styles.markerEmoji}>💉</Text>
                </View>
              </Marker>
            ))}
        </MapView>

        {/* Loading Spinner Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.light.primary} />
            <Text style={styles.loadingOverlayText}>Loading live health layers...</Text>
          </View>
        )}
      </View>

      {/* Selected Entity Details Bottom Card */}
      {selectedEntity && (
        <View style={styles.bottomCard}>
          <View style={styles.bottomCardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardHeaderEmoji}>
                {selectedEntity.type === 'vet'
                  ? '🏥'
                  : selectedEntity.type === 'zone'
                  ? '🛡️'
                  : selectedEntity.type === 'case'
                  ? '⚠️'
                  : '💉'}
              </Text>
              <View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {selectedEntity.type === 'vet'
                    ? selectedEntity.data.clinicName
                    : selectedEntity.type === 'zone'
                    ? `Containment: ${selectedEntity.data.disease}`
                    : selectedEntity.type === 'case'
                    ? `Vicinity Report: ${selectedEntity.data.disease}`
                    : selectedEntity.data.title}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {selectedEntity.type === 'vet'
                    ? `${selectedEntity.data.name} • ${selectedEntity.data.specialization}`
                    : selectedEntity.type === 'zone'
                    ? `${selectedEntity.data.radiusKm} km quarantine buffer • ${selectedEntity.data.district}`
                    : selectedEntity.type === 'case'
                    ? `${selectedEntity.data.species || 'Livestock'} • ${selectedEntity.data.village}`
                    : `${selectedEntity.data.vaccine} • ${selectedEntity.data.status}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedEntity(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeCardButton}
            >
              <Text style={styles.closeCardText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action Row */}
          <View style={styles.cardActionRow}>
            {selectedEntity.type === 'vet' && (
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => handleCallVet(selectedEntity.data.phone)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryActionText}>
                  📞 Call {selectedEntity.data.phone ? selectedEntity.data.phone : 'Clinic'}
                </Text>
              </TouchableOpacity>
            )}

            {selectedEntity.type === 'zone' && (
              <View style={styles.rulesContainer}>
                <Text style={styles.rulesLabel}>Quarantine Status: {selectedEntity.data.status}</Text>
                {selectedEntity.data.enforcedRules && selectedEntity.data.enforcedRules.length > 0 ? (
                  <Text style={styles.rulesText} numberOfLines={2}>
                    Rules: {selectedEntity.data.enforcedRules.join(' • ')}
                  </Text>
                ) : null}
              </View>
            )}

            {selectedEntity.type === 'case' && (
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => router.push('/(farmer)/cases' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryActionText}>🩺 View My Health Cases</Text>
              </TouchableOpacity>
            )}

            {selectedEntity.type === 'camp' && (
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => router.push('/(farmer)/vaccination' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryActionText}>💉 Open Vaccination Schedule</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  layerSelectorContainer: {
    backgroundColor: colors.light.surface,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  layerScrollContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  layerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.round,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 4,
  },
  layerPillActiveVet: {
    backgroundColor: colors.light.primarySubtle,
    borderColor: colors.light.primary,
  },
  layerPillActiveZone: {
    backgroundColor: colors.light.dangerBg,
    borderColor: colors.light.danger,
  },
  layerPillActiveCase: {
    backgroundColor: colors.light.warningBg,
    borderColor: colors.light.warning,
  },
  layerPillActiveCamp: {
    backgroundColor: colors.light.secondarySubtle,
    borderColor: colors.light.secondary,
  },
  layerIcon: {
    fontSize: 12,
  },
  layerText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textSecondary,
  },
  layerTextActive: {
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  permissionBanner: {
    backgroundColor: colors.light.infoBg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  permissionBannerText: {
    fontSize: 11,
    color: colors.light.info,
    fontWeight: typography.weights.semibold,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.warningBg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  offlineBannerText: {
    fontSize: 11,
    color: colors.light.warning,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  offlineRetryText: {
    fontSize: 11,
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    position: 'absolute',
    top: spacing.base,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.md,
  },
  loadingOverlayText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
  },
  vetMarkerContainer: {
    backgroundColor: colors.light.primary,
    width: 32,
    height: 32,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.light.surface,
    ...shadows.sm,
  },
  zoneMarkerContainer: {
    backgroundColor: colors.light.danger,
    width: 28,
    height: 28,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.light.surface,
  },
  caseMarkerContainer: {
    width: 26,
    height: 26,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.light.surface,
  },
  caseMarkerHigh: {
    backgroundColor: colors.light.danger,
  },
  caseMarkerModerate: {
    backgroundColor: colors.light.warning,
  },
  campMarkerContainer: {
    backgroundColor: colors.light.secondary,
    width: 30,
    height: 30,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.light.surface,
  },
  markerEmoji: {
    fontSize: 15,
  },
  markerEmojiSmall: {
    fontSize: 12,
  },
  bottomCard: {
    position: 'absolute',
    bottom: spacing.base,
    left: spacing.base,
    right: spacing.base,
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.md,
  },
  bottomCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cardHeaderEmoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  closeCardButton: {
    width: 24,
    height: 24,
    borderRadius: radii.round,
    backgroundColor: colors.light.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  closeCardText: {
    fontSize: 12,
    color: colors.light.textMuted,
    fontWeight: typography.weights.bold,
  },
  cardActionRow: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.light.surfaceAlt,
  },
  primaryActionButton: {
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  primaryActionText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
  rulesContainer: {
    gap: 2,
  },
  rulesLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
  },
  rulesText: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
});
