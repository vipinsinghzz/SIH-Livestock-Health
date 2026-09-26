/**
 * Livestock Saathi - Farmer: Nearby Veterinarians Directory
 * File: mobile/app/(farmer)/map/index.tsx
 * 
 * Replaces the native Google Maps requirement with a pure, database-driven directory.
 * Discovers and displays the TOP 10 nearest active veterinarians based on the
 * farmer's real-time GPS location, sorted ascending by distance with zero artificial range caps.
 * 
 * Strict Privacy & Zero-Mock:
 * - All records stream dynamically from live Supabase public.profiles via GET /api/veterinarians/nearby.
 * - Zero hardcoded veterinarian cards, phones, or distances.
 * - Zero MapView / Google Maps SDK dependencies.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { mapService, DEFAULT_MAHARASHTRA_CENTER } from '../../../src/services/mapService';
import { VeterinaryFacilityMarker } from '../../../src/types/map';

export default function NearbyVeterinariansScreen() {
  const router = useRouter();

  // Coordinates & Permission State
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [permissionChecking, setPermissionChecking] = useState<boolean>(true);

  // Data & Loading State
  const [vets, setVets] = useState<VeterinaryFacilityMarker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  /**
   * Request GPS Location & retrieve user coordinates
   */
  const requestLocationAndFetch = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setPermissionChecking(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setPermissionChecking(false);
        setLoading(false);
        return;
      }

      setPermissionDenied(false);
      setPermissionChecking(false);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCoords(userCoords);

      // Fetch top nearest veterinarians from production backend
      await fetchNearbyVets(userCoords.latitude, userCoords.longitude);
    } catch (err: any) {
      console.warn('[NearbyVets] GPS error:', err?.message);
      setPermissionChecking(false);
      // Fallback: If device GPS fails or times out, query with default Maharashtra coordinates
      setFetchError('Unable to acquire exact GPS. Showing nearest veterinarians.');
      await fetchNearbyVets(DEFAULT_MAHARASHTRA_CENTER.latitude, DEFAULT_MAHARASHTRA_CENTER.longitude);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Fetch veterinarians from live backend API
   */
  const fetchNearbyVets = async (lat: number, lng: number) => {
    try {
      const results = await mapService.getNearbyVeterinarians({
        lat,
        lng,
      });
      // Top 10 sorted ascending
      setVets(results.slice(0, 10));
    } catch (err: any) {
      console.error('[NearbyVets] Fetch error:', err?.message);
      setFetchError('Failed to load nearby veterinarians. Please check your connection.');
      setVets([]);
    }
  };

  useEffect(() => {
    requestLocationAndFetch();
  }, [requestLocationAndFetch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    requestLocationAndFetch();
  }, [requestLocationAndFetch]);

  /**
   * Handle telephone dialer launch
   */
  const handleCallVet = (phone: string, name: string) => {
    if (!phone || !phone.trim()) {
      Alert.alert('Phone Unavailable', `Direct phone number is not listed for ${name}.`);
      return;
    }
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const telUrl = `tel:${cleanPhone}`;
    Linking.openURL(telUrl).catch(() => {
      Alert.alert('Unable to Call', `Please dial ${phone} manually on your phone.`);
    });
  };

  /**
   * Emergency Animal Helpline 1962 Dialer
   */
  const handleCall1962 = () => {
    Linking.openURL('tel:1962').catch(() => {
      Alert.alert('Helpline 1962', 'Please dial toll-free 1962 from your phone app for immediate veterinary support.');
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Find a Veterinarian</Text>
          <Text style={styles.headerSubtitle}>Top 10 nearest veterinarians</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshIconButton}
          onPress={onRefresh}
          activeOpacity={0.7}
          accessibilityLabel="Refresh list"
        >
          <Text style={styles.refreshIconText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* GPS Location Status Indicator */}
      <View style={styles.locationBar}>
        <Text style={styles.locationPinIcon}>📍</Text>
        <Text style={styles.locationStatusText} numberOfLines={1}>
          {coords
            ? `Using your current GPS location (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)})`
            : permissionDenied
            ? 'Location permission denied'
            : 'Acquiring GPS coordinates...'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.light.primary]} />}
      >
        {/* Permission Denied Banner */}
        {permissionDenied && (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionCardIcon}>⚠️</Text>
            <View style={styles.permissionCardContent}>
              <Text style={styles.permissionCardTitle}>Location Permission Required</Text>
              <Text style={styles.permissionCardBody}>
                Location permission is required to calculate distances and discover the nearest veterinarians around you.
              </Text>
              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={requestLocationAndFetch}
                activeOpacity={0.8}
              >
                <Text style={styles.tryAgainButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Fetch Notice / Warning */}
        {fetchError && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>{fetchError}</Text>
          </View>
        )}

        {/* Loading Spinner */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.light.primary} />
            <Text style={styles.loadingText}>Locating nearest veterinarians...</Text>
          </View>
        )}

        {/* Veterinarians List */}
        {!loading && vets.length > 0 && (
          <View style={styles.vetsList}>
            {vets.map((vet, idx) => {
              const distanceText =
                typeof vet.distanceKm === 'number'
                  ? `${vet.distanceKm < 1 ? (vet.distanceKm * 1000).toFixed(0) + ' m' : vet.distanceKm.toFixed(1) + ' km'}`
                  : 'Nearby';

              return (
                <View key={vet.id || `vet-${idx}`} style={styles.vetCard}>
                  {/* Card Header: Doctor Name & Distance Badge */}
                  <View style={styles.vetCardTop}>
                    <View style={styles.vetIdentity}>
                      <Text style={styles.vetName}>{vet.name}</Text>
                      <Text style={styles.vetClinic}>{vet.clinicName}</Text>
                    </View>
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceBadgeText}>📍 {distanceText}</Text>
                    </View>
                  </View>

                  {/* Specialization & Availability Badges */}
                  <View style={styles.badgeRow}>
                    <View style={styles.specBadge}>
                      <Text style={styles.specBadgeText}>{vet.specialization}</Text>
                    </View>
                    {vet.emergencyAvailable && (
                      <View style={styles.emergencyBadge}>
                        <Text style={styles.emergencyBadgeText}>🚨 24/7 Emergency</Text>
                      </View>
                    )}
                    {/* Explicit Availability Status: AVAILABLE / ON DUTY / BUSY / OFF DUTY */}
                    {(() => {
                      const rawStatus = (vet.availability || (vet.isAvailable ? 'AVAILABLE' : 'OFF DUTY')).toUpperCase();
                      const isOnDuty = rawStatus === 'ON_DUTY' || rawStatus === 'ON DUTY' || rawStatus === 'ON_CALL' || rawStatus === 'ON CALL';
                      const isAvail = rawStatus === 'AVAILABLE';
                      const isBusy = rawStatus === 'BUSY';
                      const isOffDuty = rawStatus === 'OFF_DUTY' || rawStatus === 'OFF DUTY' || rawStatus === 'UNAVAILABLE';

                      const label = isOnDuty
                        ? '● ON DUTY'
                        : isAvail
                        ? '● AVAILABLE'
                        : isBusy
                        ? '● BUSY'
                        : isOffDuty
                        ? '○ OFF DUTY'
                        : `● ${rawStatus}`;

                      const badgeStyle = isOnDuty
                        ? styles.availBadgeOnDuty
                        : isAvail
                        ? styles.availBadgeAvailable
                        : isBusy
                        ? styles.availBadgeBusy
                        : styles.availBadgeOffDuty;

                      const textStyle = isOnDuty
                        ? styles.availTextOnDuty
                        : isAvail
                        ? styles.availTextAvailable
                        : isBusy
                        ? styles.availTextBusy
                        : styles.availTextOffDuty;

                      return (
                        <View style={[styles.availabilityBadge, badgeStyle]}>
                          <Text style={[styles.availabilityBadgeText, textStyle]}>
                            {label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Address & District */}
                  <View style={styles.addressContainer}>
                    <Text style={styles.addressLabel}>Address:</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {vet.address || `${vet.village ? vet.village + ', ' : ''}${vet.district}, ${vet.state || 'Maharashtra'}`}
                    </Text>
                  </View>

                  {/* Phone & Call CTA Buttons */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCallVet(vet.phone, vet.name)}
                      activeOpacity={0.8}
                      accessibilityLabel={`Call ${vet.name}`}
                    >
                      <Text style={styles.callButtonText}>📞 Call {vet.phone || 'Doctor'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.helplineMiniButton}
                      onPress={handleCall1962}
                      activeOpacity={0.8}
                      accessibilityLabel="Call Helpline 1962"
                    >
                      <Text style={styles.helplineMiniText}>1962</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State: 0 Vets Found */}
        {!loading && vets.length === 0 && !permissionDenied && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏥</Text>
            <Text style={styles.emptyTitle}>No Veterinarians Found</Text>
            <Text style={styles.emptySubtitle}>
              No veterinarians are currently available in your immediate vicinity.
            </Text>

            <View style={styles.emergencyHelpCard}>
              <Text style={styles.emergencyHelpTitle}>Need Immediate Animal Care?</Text>
              <Text style={styles.emergencyHelpBody}>
                Connect directly with the Government Emergency Animal Ambulance Helpline for 24/7 on-call veterinary support.
              </Text>
              <TouchableOpacity
                style={styles.emergency1962Button}
                onPress={handleCall1962}
                activeOpacity={0.8}
              >
                <Text style={styles.emergency1962ButtonText}>📞 Dial Animal Helpline — 1962</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Safety Advice */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            For acute biosecurity emergencies or contagious disease reporting, dial the toll-free Government Helpline 1962 immediately.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  refreshIconButton: {
    padding: spacing.xs,
  },
  refreshIconText: {
    fontSize: 18,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  locationPinIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  locationStatusText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  permissionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  permissionCardIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  permissionCardContent: {
    flex: 1,
  },
  permissionCardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#92400E',
    marginBottom: 4,
  },
  permissionCardBody: {
    fontSize: typography.sizes.xs,
    color: '#B45309',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  tryAgainButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  tryAgainButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  warningBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.base,
  },
  warningBannerText: {
    color: colors.light.danger,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.base,
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
  },
  vetsList: {
    gap: spacing.base,
  },
  vetCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  vetCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  vetIdentity: {
    flex: 1,
    marginRight: spacing.sm,
  },
  vetName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  vetClinic: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  distanceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  distanceBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  specBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  specBadgeText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.light.textSecondary,
  },
  emergencyBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  emergencyBadgeText: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
  },
  availabilityBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  availabilityBadgeText: {
    fontSize: typography.sizes.xs - 1,
  },
  availBadgeAvailable: {
    backgroundColor: '#DCFCE7',
  },
  availTextAvailable: {
    color: '#15803D',
    fontWeight: typography.weights.bold,
  },
  availBadgeOnDuty: {
    backgroundColor: '#E0E7FF',
  },
  availTextOnDuty: {
    color: '#4338CA',
    fontWeight: typography.weights.bold,
  },
  availBadgeBusy: {
    backgroundColor: '#FEF3C7',
  },
  availTextBusy: {
    color: '#D97706',
    fontWeight: typography.weights.bold,
  },
  availBadgeOffDuty: {
    backgroundColor: '#F1F5F9',
  },
  availTextOffDuty: {
    color: '#64748B',
    fontWeight: typography.weights.medium,
  },
  addressContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addressLabel: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  callButton: {
    flex: 1,
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  helplineMiniButton: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineMiniText: {
    color: '#E11D48',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  emergencyHelpCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: radii.lg,
    padding: spacing.base,
    width: '100%',
    alignItems: 'center',
  },
  emergencyHelpTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: '#C2410C',
    marginBottom: spacing.xs,
  },
  emergencyHelpBody: {
    fontSize: typography.sizes.xs,
    color: '#9A3412',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.base,
  },
  emergency1962Button: {
    backgroundColor: '#EA580C',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    width: '100%',
    alignItems: 'center',
  },
  emergency1962ButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  disclaimerContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
