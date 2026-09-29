/**
 * Livestock Saathi - Officer: District GIS Surveillance Map
 * File: mobile/app/(officer)/map/index.tsx
 *
 * Phase 10.2 Implementation:
 * Executive District GIS Surveillance & Epidemiological Heatmap for Livestock Officers.
 * Integrates:
 * - GET /api/cases/containment-zones (Quarantine perimeters rendered via Circle overlays)
 * - GET /api/cases/clusters (DBSCAN spatial outbreak clusters <= 5km)
 * - GET /api/cases/nearby (District clinical disease cases with officer radius & exact coords)
 * - Offline SQLite caching with last-updated timestamp
 * - Interactive layer toggles, entity inspection bottom sheet, and GPS centering
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { LeafletGisWebView } from '../../../src/components/LeafletGisWebView';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { officerService } from '../../../src/services/officerService';
import { ContainmentZone, OutbreakCluster } from '../../../src/types/containment';
import { OfficerNearbyCase, OfficerMapLayer } from '../../../src/types/officer';
import { OfflineNotice } from '../../../src/components/OfflineNotice';
import { useAppLanguage } from '../../../src/services/i18n';

const DEFAULT_MAHARASHTRA_CENTER = {
  latitude: 18.5204,
  longitude: 73.8567,
};

export default function OfficerMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focusLat?: string; focusLng?: string; clusterId?: string }>();
  const { user } = useAuth();
  const { t } = useAppLanguage();

  const district = user?.district;

  // Spatial datasets
  const [containmentZones, setContainmentZones] = useState<ContainmentZone[]>([]);
  const [clusters, setClusters] = useState<OutbreakCluster[]>([]);
  const [cases, setCases] = useState<OfficerNearbyCase[]>([]);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Layer toggles
  const [activeLayers, setActiveLayers] = useState<Record<OfficerMapLayer, boolean>>({
    containment: true,
    clusters: true,
    cases: true,
  });

  // Selected item for bottom detail card
  const [selectedEntity, setSelectedEntity] = useState<
    | { type: 'zone'; data: ContainmentZone }
    | { type: 'cluster'; data: OutbreakCluster }
    | { type: 'case'; data: OfficerNearbyCase }
    | null
  >(null);

  // Map region & user GPS coordinates
  const [region, setRegion] = useState({
    latitude: DEFAULT_MAHARASHTRA_CENTER.latitude,
    longitude: DEFAULT_MAHARASHTRA_CENTER.longitude,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  });
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Handle focus parameters from navigation
  useEffect(() => {
    if (params.focusLat && params.focusLng) {
      const lat = parseFloat(params.focusLat);
      const lng = parseFloat(params.focusLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        setRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        });
      }
    }
  }, [params.focusLat, params.focusLng]);

  // Request location permission & center if no focal params
  useEffect(() => {
    if (!params.focusLat || !params.focusLng) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const coords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setUserCoords(coords);
            setRegion({
              ...coords,
              latitudeDelta: 0.2,
              longitudeDelta: 0.2,
            });
          }
        } catch (e) {
          // Fall back to default district center
        }
      })();
    }
  }, [params.focusLat, params.focusLng]);

  const loadAllSpatialData = useCallback(async () => {
    if (!district) {
      setError('Officer district jurisdiction is not configured on this account. Contact system administrator.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      setRefreshing(true);

      const res = await officerService.getOfficerSpatialSurveillance({
        district,
        lat: region.latitude,
        lng: region.longitude,
        radiusKm: 35,
      });

      setContainmentZones(res.zones || []);
      setClusters(res.clusters || []);
      setCases(res.cases || []);
      setIsFromCache(res.fromCache);
    } catch (err: any) {
      console.warn('[OfficerMap] Error loading spatial data:', err.message);
      setError(err.message || 'Failed to load district spatial surveillance.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [district, region.latitude, region.longitude]);

  useEffect(() => {
    loadAllSpatialData();
  }, [loadAllSpatialData]);

  const toggleLayer = (layer: OfficerMapLayer) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Valid coordinates filtering
  const validZones = useMemo(() => {
    return containmentZones.filter((z) => {
      const lat = z.center?.lat ?? z.centerLat;
      const lng = z.center?.lng ?? z.centerLng;
      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [containmentZones]);

  const validClusters = useMemo(() => {
    return clusters.filter((cl) => {
      const lat = cl.centroidLat;
      const lng = cl.centroidLng;
      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [clusters]);

  const validCases = useMemo(() => {
    return cases.filter((c) => {
      const lat = c.latitude;
      const lng = c.longitude;
      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [cases]);

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.officerBadge} />
      <OfflineNotice />

      {/* Top Header & Layer Toggles Bar */}
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.screenTitle}>District GIS Surveillance</Text>
            <Text style={styles.screenSubtitle}>
              {district
                ? `${district} District • ${validZones.length} Zone(s) • ${validClusters.length} Cluster(s) • ${validCases.length} Case(s)`
                : 'District Jurisdiction Unavailable'}
            </Text>
          </View>
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => router.push('/(officer)/outbreaks' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionPillBtnText}>⚠️ Alerts</Text>
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
              ⭕ Containment ({validZones.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerChip, activeLayers.clusters && styles.layerChipActive]}
            onPress={() => toggleLayer('clusters')}
            activeOpacity={0.75}
          >
            <Text style={[styles.layerChipText, activeLayers.clusters && styles.layerChipTextActive]}>
              🔶 Clusters ({validClusters.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerChip, activeLayers.cases && styles.layerChipActive]}
            onPress={() => toggleLayer('cases')}
            activeOpacity={0.75}
          >
            <Text style={[styles.layerChipText, activeLayers.cases && styles.layerChipTextActive]}>
              📍 Cases ({validCases.length})
            </Text>
          </TouchableOpacity>
        </View>

        {isFromCache && (
          <View style={styles.cacheNoticeBanner}>
            <Text style={styles.cacheNoticeBannerText}>
              ⚡ Offline Mode: Displaying saved district surveillance from device memory.
            </Text>
          </View>
        )}
      </View>

      {/* Main Map View */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Rendering district GIS surveillance layers...</Text>
        </View>
      ) : error && validZones.length === 0 && validClusters.length === 0 && validCases.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Map Unavailable</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadAllSpatialData} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry Loading</Text>
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
            loadingText={t('common.loading', 'Rendering district GIS surveillance layers...')}
          />

          {/* Floating Map Legend */}
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>{t('vet.legendTitle', 'Surveillance Legend')}</Text>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>{t('vet.legendQuarantine', 'Active Quarantine Buffer')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.legendText}>{t('vet.legendCluster', 'DBSCAN Cluster (<= 5km)')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
              <Text style={styles.legendText}>{t('vet.legendCasePoint', 'District Clinical Case')}</Text>
            </View>
          </View>

          {/* Bottom Selected Entity Sheet */}
          {selectedEntity && (
            <View style={styles.bottomCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleGroup}>
                  <Text style={styles.cardTypeLabel}>
                    {selectedEntity.type === 'zone'
                      ? '🛡️ Containment Zone'
                      : selectedEntity.type === 'cluster'
                      ? '🔶 Outbreak Cluster'
                      : '📍 Clinical Disease Case'}
                  </Text>
                  <Text style={styles.cardMainTitle}>
                    {selectedEntity.type === 'zone'
                      ? selectedEntity.data.disease
                      : selectedEntity.type === 'cluster'
                      ? selectedEntity.data.disease
                      : selectedEntity.data.disease}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeCardBtn}
                  onPress={() => setSelectedEntity(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeCardBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Detail fields based on entity type */}
              {selectedEntity.type === 'zone' && (
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Zone ID:</Text>
                    <Text style={styles.infoValue}>{selectedEntity.data.zoneId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        selectedEntity.data.status === 'ACTIVE'
                          ? { color: colors.light.danger, fontWeight: 'bold' }
                          : { color: colors.light.success },
                      ]}
                    >
                      {selectedEntity.data.status}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Quarantine Radius:</Text>
                    <Text style={styles.infoValue}>{selectedEntity.data.radiusKm} km</Text>
                  </View>
                  {selectedEntity.data.block && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Block / Village:</Text>
                      <Text style={styles.infoValue}>
                        {selectedEntity.data.block}
                        {selectedEntity.data.village ? `, ${selectedEntity.data.village}` : ''}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => {
                      router.push('/(officer)/containment' as any);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cardActionBtnText}>🛡️ Manage Containment Zone ➔</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedEntity.type === 'cluster' && (
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Cluster ID:</Text>
                    <Text style={styles.infoValue}>
                      {selectedEntity.data.clusterId || 'DBSCAN Cluster'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Confirmed Cases:</Text>
                    <Text style={styles.infoValue}>
                      {selectedEntity.data.count || selectedEntity.data.caseCount || 2}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Affected Animals:</Text>
                    <Text style={styles.infoValue}>
                      {(selectedEntity.data as any).totalAffected || selectedEntity.data.count || 2}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Risk Level:</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        {
                          color: String(selectedEntity.data.riskTier || selectedEntity.data.risk || '')
                            .toUpperCase()
                            .includes('CRITICAL')
                            ? colors.light.danger
                            : colors.light.warning,
                          fontWeight: 'bold',
                        },
                      ]}
                    >
                      {selectedEntity.data.riskTier || selectedEntity.data.risk || 'High'}
                    </Text>
                  </View>

                  <View style={styles.cardBtnRow}>
                    <TouchableOpacity
                      style={[styles.cardActionBtn, { flex: 1 }]}
                      onPress={() => {
                        router.push({
                          pathname: '/(officer)/containment',
                          params: {
                            disease: selectedEntity.data.disease,
                            focusLat: String(selectedEntity.data.centroidLat || ''),
                            focusLng: String(selectedEntity.data.centroidLng || ''),
                          },
                        } as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cardActionBtnText}>🛡️ Declare Zone</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardActionBtn, styles.cardActionBtnRing, { flex: 1 }]}
                      onPress={() => {
                        router.push({
                          pathname: '/(officer)/containment',
                          params: {
                            disease: selectedEntity.data.disease,
                            focusLat: String(selectedEntity.data.centroidLat || ''),
                            focusLng: String(selectedEntity.data.centroidLng || ''),
                            mode: 'ring',
                          },
                        } as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cardActionBtnTextRing}>💉 Ring Vaccine</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {selectedEntity.type === 'case' && (
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Case ID:</Text>
                    <Text style={styles.infoValue}>{selectedEntity.data.caseId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Species:</Text>
                    <Text style={styles.infoValue}>{selectedEntity.data.species}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={styles.infoValue}>{selectedEntity.data.status}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Location:</Text>
                    <Text style={styles.infoValue}>
                      {selectedEntity.data.village}
                      {selectedEntity.data.block ? `, ${selectedEntity.data.block}` : ''}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Distance:</Text>
                    <Text style={styles.infoValue}>
                      {selectedEntity.data.distanceKm ? `${selectedEntity.data.distanceKm.toFixed(1)} km` : 'Local'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.cardActionBtn, styles.cardActionBtnRing]}
                    onPress={() => {
                      router.push({
                        pathname: '/(officer)/containment',
                        params: {
                          mode: 'ring',
                          caseId: selectedEntity.data.caseId,
                          disease: selectedEntity.data.disease,
                          village: selectedEntity.data.village,
                          block: selectedEntity.data.block,
                        },
                      } as any);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cardActionBtnTextRing}>💉 Schedule Ring Vaccination ➔</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  topBar: {
    backgroundColor: colors.light.officerBadge,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
  },
  screenSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionPillBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.md,
  },
  actionPillBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textInverse,
  },
  refreshBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 30,
    height: 30,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnText: {
    fontSize: 16,
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
  layerRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  layerChip: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  layerChipActive: {
    backgroundColor: colors.light.surface,
  },
  layerChipText: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  layerChipTextActive: {
    color: colors.light.officerBadge,
    fontWeight: typography.weights.bold,
  },
  cacheNoticeBanner: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  cacheNoticeBannerText: {
    fontSize: 10,
    color: '#FEF08A',
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
  errorMessage: {
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  zoneMarkerIcon: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: radii.round,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  zoneMarkerEmoji: {
    fontSize: 16,
  },
  clusterMarker: {
    backgroundColor: '#D97706',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: radii.round,
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
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  caseMarker: {
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: radii.round,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  caseMarkerConfirmed: {
    backgroundColor: '#DC2626',
  },
  caseMarkerEmoji: {
    fontSize: 12,
  },
  legendCard: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  legendTitle: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radii.round,
    marginRight: 5,
  },
  legendText: {
    fontSize: 9,
    color: colors.light.textPrimary,
  },
  bottomCard: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardTitleGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTypeLabel: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.light.textMuted,
  },
  cardMainTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginTop: 1,
  },
  closeCardBtn: {
    padding: 4,
  },
  closeCardBtnText: {
    fontSize: 14,
    color: colors.light.textMuted,
    fontWeight: typography.weights.bold,
  },
  cardBody: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.light.textMuted,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  cardActionBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cardActionBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
  },
  cardBtnRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cardActionBtnRing: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  cardActionBtnTextRing: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
});
