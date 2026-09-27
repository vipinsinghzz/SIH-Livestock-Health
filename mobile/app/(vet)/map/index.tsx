/**
 * Livestock Saathi - Veterinarian Outbreak GIS Surveillance Map
 * File: mobile/app/(vet)/map/index.tsx
 * 
 * Phase 9.4: Interactive outbreak surveillance and geospatial biosecurity map.
 * Backed by:
 * - GET /api/cases/containment-zones (Quarantine perimeters rendered via MapView Circle)
 * - GET /api/cases/clusters (DBSCAN spatial outbreak clusters <= 5km)
 * - GET /api/cases (Active district clinical disease cases)
 * 
 * Strict Privacy & Zero-Mock: Real server records only, offline SQLite caching,
 * layer visibility toggles, cluster details, and direct clinical case navigation.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { containmentService } from '../../../src/services/containmentService';
import { veterinarianService } from '../../../src/services/veterinarianService';
import {
  ContainmentZone,
  OutbreakCluster,
  getContainmentStatusTheme,
} from '../../../src/types/containment';
import { DiseaseCase, getStatusTheme, getRiskTheme } from '../../../src/types/case';
import { OfflineNotice } from '../../../src/components/OfflineNotice';
import { useAppLanguage } from '../../../src/services/i18n';

const DEFAULT_MAHARASHTRA_CENTER = {
  latitude: 18.5204,
  longitude: 73.8567,
};

type VetMapLayer = 'cases' | 'containment' | 'clusters';

export default function VetOutbreakMapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useAppLanguage();
  const mapRef = useRef<MapView>(null);

  const userDistrict = user?.district || 'Pune';

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

  // Device region
  const [region, setRegion] = useState({
    latitude: DEFAULT_MAHARASHTRA_CENTER.latitude,
    longitude: DEFAULT_MAHARASHTRA_CENTER.longitude,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  });

  // Request location permission & center
  useEffect(() => {
    (async () => {
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
          mapRef.current?.animateToRegion(newCoords, 1000);
        }
      } catch (e) {
        // Fall back to district center
      }
    })();
  }, []);

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
      <StatusBar barStyle="light-content" />
      <OfflineNotice />

      {/* Top Header & Layer Toggles Bar */}
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.screenTitle}>{t('vet.outbreakGisTitle', 'Outbreak GIS Surveillance')}</Text>
            <Text style={styles.screenSubtitle}>
              {userDistrict} District • {validZones.length} Zone(s) • {validClusters.length} Cluster(s)
            </Text>
          </View>
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => router.push('/(vet)/containment' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionPillBtnText}>{t('vet.containmentZonesAndRings', '🛡️ Zones & Rings')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={loadAllSpatialData}
              activeOpacity={0.8}
              disabled={refreshing}
            >
              <Text style={styles.refreshBtnText}>{refreshing ? '⟳' : '↻'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Layer Toggle Chips */}
        <View style={styles.layerRow}>
          <TouchableOpacity
            style={[styles.layerChip, activeLayers.containment && styles.layerChipActive]}
            onPress={() => toggleLayer('containment')}
            activeOpacity={0.75}
          >
            <Text style={[styles.layerChipText, activeLayers.containment && styles.layerChipTextActive]}>
              {t('vet.layerContainment', '⭕ Containment ({count})', { count: validZones.length })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerChip, activeLayers.clusters && styles.layerChipActive]}
            onPress={() => toggleLayer('clusters')}
            activeOpacity={0.75}
          >
            <Text style={[styles.layerChipText, activeLayers.clusters && styles.layerChipTextActive]}>
              {t('vet.layerClusters', '🔶 Clusters ({count})', { count: validClusters.length })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerChip, activeLayers.cases && styles.layerChipActive]}
            onPress={() => toggleLayer('cases')}
            activeOpacity={0.75}
          >
            <Text style={[styles.layerChipText, activeLayers.cases && styles.layerChipTextActive]}>
              {t('vet.layerCases', '📍 Cases ({count})', { count: validCases.length })}
            </Text>
          </TouchableOpacity>
        </View>

        {isFromCache && (
          <View style={styles.cacheNoticeBanner}>
            <Text style={styles.cacheNoticeBannerText}>
              {t('vet.offlineNotice', '⚡ Offline Mode: Displaying saved records from device cache.')}
            </Text>
          </View>
        )}
      </View>

      {/* Main Map View */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading outbreak surveillance layers...')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('common.error', 'Surveillance Layer Error')}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadAllSpatialData} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>{t('common.retry', 'Retry Loading')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            showsUserLocation
            showsMyLocationButton
            toolbarEnabled={false}
          >
            {/* 1. Containment Zones Circles & Center Markers */}
            {activeLayers.containment &&
              validZones.map((zone) => {
                const centerLat = zone.center?.lat ?? zone.centerLat!;
                const centerLng = zone.center?.lng ?? zone.centerLng!;
                const radiusMeters = (zone.radiusKm || 5.0) * 1000;
                const isContained = zone.status === 'CONTAINED';
                const isLifted = zone.status === 'LIFTED';

                const fillColor = isLifted
                  ? 'rgba(16, 185, 129, 0.15)'
                  : isContained
                  ? 'rgba(245, 158, 11, 0.20)'
                  : 'rgba(239, 68, 68, 0.22)';
                const strokeColor = isLifted
                  ? '#059669'
                  : isContained
                  ? '#D97706'
                  : '#DC2626';

                return (
                  <React.Fragment key={`zone_group_${zone.id || zone.zoneId}`}>
                    <Circle
                      center={{ latitude: centerLat, longitude: centerLng }}
                      radius={radiusMeters}
                      fillColor={fillColor}
                      strokeColor={strokeColor}
                      strokeWidth={2}
                    />
                    <Marker
                      coordinate={{ latitude: centerLat, longitude: centerLng }}
                      title={`Quarantine Zone: ${zone.disease}`}
                      description={`${zone.radiusKm} km radius • Status: ${zone.status}`}
                      onPress={() => setSelectedEntity({ type: 'zone', data: zone })}
                    >
                      <View style={[styles.zoneMarkerIcon, { borderColor: strokeColor }]}>
                        <Text style={styles.zoneMarkerEmoji}>🛡️</Text>
                      </View>
                    </Marker>
                  </React.Fragment>
                );
              })}

            {/* 2. Outbreak Clusters Markers */}
            {activeLayers.clusters &&
              validClusters.map((cluster, idx) => {
                const cLat = cluster.centroidLat!;
                const cLng = cluster.centroidLng!;
                const isCritical = cluster.risk === 'Critical' || cluster.isOutbreak;

                return (
                  <Marker
                    key={`cluster_${cluster.clusterId || idx}`}
                    coordinate={{ latitude: cLat, longitude: cLng }}
                    title={`Outbreak Cluster: ${cluster.disease}`}
                    description={`${cluster.count || cluster.caseCount || 2} confirmed cases • Risk: ${cluster.risk || 'High'}`}
                    onPress={() => setSelectedEntity({ type: 'cluster', data: cluster })}
                  >
                    <View style={[styles.clusterMarker, isCritical && styles.clusterMarkerCritical]}>
                      <Text style={styles.clusterMarkerText}>{cluster.count || cluster.caseCount || '!'}</Text>
                    </View>
                  </Marker>
                );
              })}

            {/* 3. Clinical Cases Markers */}
            {activeLayers.cases &&
              validCases.map((c) => {
                const cLat = c.coordinates?.lat ?? (c as any).latitude;
                const cLng = c.coordinates?.lng ?? (c as any).longitude;
                const isConfirmed = c.status === 'Confirmed' || c.status === 'Containment';

                return (
                  <Marker
                    key={`case_${c.id || c.caseId}`}
                    coordinate={{ latitude: cLat, longitude: cLng }}
                    title={`Case: ${c.caseId}`}
                    description={`${c.disease} (${c.species || 'Livestock'}) • ${c.status}`}
                    onPress={() => setSelectedEntity({ type: 'case', data: c })}
                  >
                    <View style={[styles.caseMarker, isConfirmed && styles.caseMarkerConfirmed]}>
                      <Text style={styles.caseMarkerEmoji}>📍</Text>
                    </View>
                  </Marker>
                );
              })}
          </MapView>

          {/* Floating Map Legend */}
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>{t('vet.legendTitle', 'Surveillance Legend')}</Text>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>{t('vet.legendQuarantine', 'Active Quarantine (Buffer Circle)')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.legendText}>{t('vet.legendCluster', 'DBSCAN Cluster (<= 5km Hotspot)')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
              <Text style={styles.legendText}>{t('vet.legendCasePoint', 'Clinical Case Point')}</Text>
            </View>
          </View>

          {/* Bottom Selected Entity Sheet */}
          {selectedEntity && (
            <View style={styles.bottomCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardBadgeWrap}>
                  {selectedEntity.type === 'zone' && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: getContainmentStatusTheme(selectedEntity.data.status).bgColor,
                          borderColor: getContainmentStatusTheme(selectedEntity.data.status).borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: getContainmentStatusTheme(selectedEntity.data.status).color },
                        ]}
                      >
                        {getContainmentStatusTheme(selectedEntity.data.status).label}
                      </Text>
                    </View>
                  )}
                  {selectedEntity.type === 'cluster' && (
                    <View style={[styles.badge, styles.clusterBadge]}>
                      <Text style={styles.clusterBadgeText}>
                        HOTSPOT CLUSTER • {selectedEntity.data.risk || 'HIGH'} RISK
                      </Text>
                    </View>
                  )}
                  {selectedEntity.type === 'case' && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: getStatusTheme(selectedEntity.data.status).bgColor,
                          borderColor: getStatusTheme(selectedEntity.data.status).borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: getStatusTheme(selectedEntity.data.status).color },
                        ]}
                      >
                        {getStatusTheme(selectedEntity.data.status).label}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedEntity(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.closeCardText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Zone Details */}
              {selectedEntity.type === 'zone' && (
                <View style={styles.entityContent}>
                  <Text style={styles.entityTitle}>
                    {selectedEntity.data.disease} Quarantine Perimeter
                  </Text>
                  <Text style={styles.entityMeta}>
                    Zone ID: <Text style={styles.boldText}>{selectedEntity.data.zoneId}</Text> •{' '}
                    Radius: <Text style={styles.boldText}>{selectedEntity.data.radiusKm} km</Text>
                  </Text>
                  <Text style={styles.entityMeta}>
                    Location:{' '}
                    {selectedEntity.data.village ? `${selectedEntity.data.village}, ` : ''}
                    {selectedEntity.data.block ? `${selectedEntity.data.block}, ` : ''}
                    {selectedEntity.data.district}
                  </Text>
                  {selectedEntity.data.notes ? (
                    <Text style={styles.entityNotes} numberOfLines={2}>
                      📝 {selectedEntity.data.notes}
                    </Text>
                  ) : null}

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.cardPrimaryBtn}
                      onPress={() => router.push('/(vet)/containment' as any)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.cardPrimaryBtnText}>{t('vet.managePerimeters', 'Manage Containment Perimeters ➔')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Cluster Details */}
              {selectedEntity.type === 'cluster' && (
                <View style={styles.entityContent}>
                  <Text style={styles.entityTitle}>
                    {selectedEntity.data.disease} Transmission Cluster
                  </Text>
                  <Text style={styles.entityMeta}>
                    Grouped Cases:{' '}
                    <Text style={styles.boldText}>
                      {selectedEntity.data.count || selectedEntity.data.caseCount || 2} Cases within 5km
                    </Text>
                  </Text>
                  <Text style={styles.entityMeta}>
                    Centroid Coordinates:{' '}
                    {selectedEntity.data.centroidLat?.toFixed(4)},{' '}
                    {selectedEntity.data.centroidLng?.toFixed(4)}
                  </Text>
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.cardPrimaryBtn}
                      onPress={() => router.push('/(vet)/containment' as any)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.cardPrimaryBtnText}>{t('vet.declareZoneForCluster', 'Declare Containment Zone for Cluster ➔')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Case Details */}
              {selectedEntity.type === 'case' && (
                <View style={styles.entityContent}>
                  <Text style={styles.entityTitle}>
                    Case {selectedEntity.data.caseId} • {selectedEntity.data.disease}
                  </Text>
                  <Text style={styles.entityMeta}>
                    Species: <Text style={styles.boldText}>{selectedEntity.data.species || 'Cattle'}</Text> •{' '}
                    Risk: <Text style={styles.boldText}>{selectedEntity.data.risk}</Text>
                  </Text>
                  <Text style={styles.entityMeta}>
                    Farm:{' '}
                    {selectedEntity.data.farmerLocation?.village
                      ? `${selectedEntity.data.farmerLocation.village}, `
                      : ''}
                    {selectedEntity.data.districtId || userDistrict}
                  </Text>
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.cardPrimaryBtn}
                      onPress={() =>
                        router.push(`/(vet)/referrals/${selectedEntity.data.id || selectedEntity.data.caseId}` as any)
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.cardPrimaryBtnText}>{t('vet.openCaseExam', 'Open Case Examination ➔')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Mandatory Medical AI Safety Disclaimer */}
      <View style={styles.aiDisclaimerBox}>
        <Text style={styles.aiDisclaimerText}>
          {t('vet.aiDisclaimer', '⚠️ AI-assisted preliminary screening / risk assessment — not a final veterinary diagnosis. Containment actions require veterinarian clinical verification.')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  topBar: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    ...shadows.sm,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  screenSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionPillBtn: {
    backgroundColor: '#0369A1',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  actionPillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  refreshBtn: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnText: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  layerRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  layerChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.round,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  layerChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  layerChipText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textSecondary,
  },
  layerChipTextActive: {
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
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
    fontSize: 34,
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
  zoneMarkerIcon: {
    backgroundColor: '#FFFFFF',
    padding: 3,
    borderRadius: 14,
    borderWidth: 2,
    ...shadows.sm,
  },
  zoneMarkerEmoji: {
    fontSize: 16,
  },
  clusterMarker: {
    backgroundColor: '#D97706',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  clusterMarkerCritical: {
    backgroundColor: '#DC2626',
  },
  clusterMarkerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  caseMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    ...shadows.sm,
  },
  caseMarkerConfirmed: {
    borderColor: '#DC2626',
  },
  caseMarkerEmoji: {
    fontSize: 14,
  },
  legendCard: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.sm,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  legendTitle: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9,
    color: colors.light.textPrimary,
  },
  bottomCard: {
    position: 'absolute',
    bottom: spacing.base,
    left: spacing.base,
    right: spacing.base,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    ...shadows.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardBadgeWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  clusterBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  clusterBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  closeCardText: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.light.textSecondary,
    padding: 4,
  },
  entityContent: {
    marginTop: 2,
  },
  entityTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 3,
  },
  entityMeta: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  boldText: {
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
  },
  entityNotes: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    color: colors.light.textSecondary,
    marginVertical: 4,
  },
  btnRow: {
    marginTop: spacing.sm,
  },
  cardPrimaryBtn: {
    backgroundColor: '#0369A1',
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  cardPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  aiDisclaimerBox: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  aiDisclaimerText: {
    fontSize: 9,
    color: '#B45309',
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
});
