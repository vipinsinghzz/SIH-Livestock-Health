/**
 * Livestock Saathi - Farmer Dashboard
 * File: mobile/app/(farmer)/index.tsx
 * 
 * Dynamic, production-grade farmer dashboard displaying live herd statistics,
 * health alerts, recent livestock, and quick clinical actions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../src/theme';
import animalService from '../../src/services/animalService';
import caseService from '../../src/services/caseService';
import notificationService from '../../src/services/notificationService';
import { Animal } from '../../src/types/animal';
import { DiseaseCase } from '../../src/types/case';
import { calculateVaccinationMetrics } from '../../src/types/vaccination';

export default function FarmerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cases, setCases] = useState<DiseaseCase[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [animalList, caseList, notifList] = await Promise.all([
        animalService.getAnimals().catch((err) => {
          console.warn('Dashboard: Failed to load animals:', err);
          return [] as Animal[];
        }),
        caseService.getFarmerCases({ limit: 10 }).catch((err) => {
          console.warn('Dashboard: Failed to load cases:', err);
          return [] as DiseaseCase[];
        }),
        notificationService
          .getFarmerNotifications({ userId: user?.id || user?._id, district: user?.district })
          .catch((err) => {
            console.warn('Dashboard: Failed to load notifications:', err);
            return [];
          }),
      ]);

      setAnimals(animalList);
      setCases(caseList);
      setUnreadAlertsCount(notificationService.getUnreadCount(notifList));
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to refresh dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?._id, user?.district]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (err: any) {
              Alert.alert('Sign Out Notice', err.message || 'Error signing out.');
            }
          },
        },
      ]
    );
  };

  // Compute live KPI metrics from real API data
  const totalAnimals = animals.length;
  const healthAlerts = animals.filter(
    (a) => a.healthStatus === 'Needs Attention' || a.healthStatus === 'Critical'
  ).length;
  const activeCases = cases.filter((c) =>
    ['New', 'OPEN', 'Investigating', 'ACCEPTED', 'Containment', 'IN_TREATMENT'].includes(c.status)
  ).length;

  // Authoritative calculation from loaded herd vaccination records
  const vaccinationMetrics = calculateVaccinationMetrics(animals);
  const vaccinationsDue = vaccinationMetrics.due + vaccinationMetrics.overdue;

  const getSpeciesEmoji = (species: string) => {
    switch (species) {
      case 'Cattle':
        return '🐄';
      case 'Buffalo':
        return '🐃';
      case 'Goat':
        return '🐐';
      case 'Sheep':
        return '🐑';
      case 'Poultry':
        return '🐔';
      case 'Pig':
        return '🐖';
      default:
        return '🐾';
    }
  };

  const getHealthBadgeStyle = (status: string) => {
    switch (status) {
      case 'Healthy':
        return { bg: colors.light.successBg, text: colors.light.success, label: 'Healthy' };
      case 'Needs Attention':
        return { bg: colors.light.warningBg, text: colors.light.warning, label: 'Attention' };
      case 'Critical':
        return { bg: colors.light.dangerBg, text: colors.light.danger, label: 'Critical' };
      default:
        return { bg: colors.light.surfaceAlt, text: colors.light.textSecondary, label: status || 'Unknown' };
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.light.primary]}
          tintColor={colors.light.primary}
        />
      }
    >
      {/* Top Bar / Greeting */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>FARMER SAATHI</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push('/(farmer)/profile' as any)}
              style={styles.profileButton}
              activeOpacity={0.7}
              accessibilityLabel="Farmer Profile"
            >
              <Text style={styles.profileButtonText}>👤 Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.7}>
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>
          Namaste, {user?.name ? user.name.split(' ')[0] : 'Farmer'}
        </Text>
        <Text style={styles.subtitle}>
          📍 {[user?.village, user?.district, user?.state].filter(Boolean).join(', ') || 'Livestock Health Portal'}
        </Text>
      </View>

      {/* Error Notice */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={fetchDashboardData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Live KPI Metric Cards */}
      <View style={styles.kpiGrid}>
        <TouchableOpacity
          style={styles.kpiCard}
          onPress={() => router.push('/(farmer)/animals')}
          activeOpacity={0.7}
        >
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiIcon}>🐄</Text>
            <Text style={styles.kpiNumber}>{loading ? '-' : totalAnimals}</Text>
          </View>
          <Text style={styles.kpiLabel}>Total Herd</Text>
          <Text style={styles.kpiSub}>Registered animals</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, healthAlerts > 0 && styles.kpiCardWarning]}
          onPress={() => router.push('/(farmer)/animals')}
          activeOpacity={0.7}
        >
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiIcon}>⚠️</Text>
            <Text
              style={[
                styles.kpiNumber,
                healthAlerts > 0 && { color: colors.light.warning },
              ]}
            >
              {loading ? '-' : healthAlerts}
            </Text>
          </View>
          <Text style={styles.kpiLabel}>Health Alerts</Text>
          <Text style={styles.kpiSub}>Require review</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, activeCases > 0 && styles.kpiCardDanger]}
          onPress={() => router.push('/(farmer)/cases' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiIcon}>📋</Text>
            <Text
              style={[
                styles.kpiNumber,
                activeCases > 0 && { color: colors.light.danger },
              ]}
            >
              {loading ? '-' : activeCases}
            </Text>
          </View>
          <Text style={styles.kpiLabel}>Active Cases</Text>
          <Text style={styles.kpiSub}>In investigation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, vaccinationsDue > 0 && styles.kpiCardWarning]}
          onPress={() => router.push('/(farmer)/vaccination' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiIcon}>💉</Text>
            <Text
              style={[
                styles.kpiNumber,
                vaccinationsDue > 0 && { color: colors.light.warning },
              ]}
            >
              {loading ? '-' : vaccinationsDue}
            </Text>
          </View>
          <Text style={styles.kpiLabel}>Vaccine Due</Text>
          <Text style={styles.kpiSub}>
            {loading
              ? 'Checking records...'
              : vaccinationsDue > 0
              ? `${vaccinationsDue} pending / due`
              : 'All up-to-date'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Primary Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => router.push('/(farmer)/ai-scan' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonIcon}>📷</Text>
          <View>
            <Text style={styles.actionButtonTitle}>AI Disease Scan</Text>
            <Text style={styles.actionButtonSub}>Screen symptoms with AI</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryActionButton}
          onPress={() => router.push('/(farmer)/animals/add')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonIcon}>➕</Text>
          <View>
            <Text style={styles.secondaryButtonTitle}>Add Animal</Text>
            <Text style={styles.secondaryButtonSub}>Register new livestock</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Active Clinical Cases Section */}
      {activeCases > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Referral Cases</Text>
            <TouchableOpacity onPress={() => router.push('/(farmer)/cases' as any)}>
              <Text style={styles.sectionLink}>View All ({cases.length})</Text>
            </TouchableOpacity>
          </View>

          {cases.slice(0, 2).map((item) => (
            <TouchableOpacity
              key={item._id || item.caseId}
              style={styles.caseCard}
              onPress={() => router.push(`/(farmer)/cases/${item.caseId || item._id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.caseTopRow}>
                <Text style={styles.caseIdText}>{item.caseId}</Text>
                <View style={styles.caseBadge}>
                  <Text style={styles.caseBadgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.caseDiseaseText}>{item.disease}</Text>
              <Text style={styles.caseMetaText}>
                {item.animalId?.name ? `Animal: ${item.animalId.name} • ` : ''}
                Risk: {item.risk || 'Moderate'}
              </Text>
              {item.assignedVetId ? (
                <Text style={styles.vetAssignedText}>
                  👨‍⚕️ Assigned Vet: {item.assignedVetId.name}
                </Text>
              ) : (
                <Text style={styles.vetPendingText}>⏳ Awaiting Vet Claim</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Livestock Herd Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Livestock Herd</Text>
          <TouchableOpacity onPress={() => router.push('/(farmer)/animals')}>
            <Text style={styles.sectionLink}>View All ({totalAnimals})</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={colors.light.primary} />
            <Text style={styles.loaderText}>Loading livestock records...</Text>
          </View>
        ) : animals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🐄</Text>
            <Text style={styles.emptyTitle}>No Animals Registered Yet</Text>
            <Text style={styles.emptyDesc}>
              Register your cattle, buffalo, goats, and sheep to monitor health, schedule vaccinations, and enable instant AI screening.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => router.push('/(farmer)/animals/add')}
            >
              <Text style={styles.emptyAddButtonText}>+ Register First Animal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          animals.slice(0, 3).map((item) => {
            const badge = getHealthBadgeStyle(item.healthStatus);
            const targetId = item._id || item.id;
            return (
              <TouchableOpacity
                key={targetId}
                style={styles.animalCard}
                onPress={() => router.push(`/(farmer)/animals/${targetId}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.animalIconContainer}>
                  <Text style={styles.animalSpeciesEmoji}>
                    {getSpeciesEmoji(item.species)}
                  </Text>
                </View>

                <View style={styles.animalInfo}>
                  <View style={styles.animalNameRow}>
                    <Text style={styles.animalName}>{item.name}</Text>
                    <View style={[styles.healthBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.healthBadgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.animalTag}>Tag: {item.tagId}</Text>
                  <Text style={styles.animalSub}>
                    {item.species} • {item.breed} • {item.age} yrs • {item.gender}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Services Hub */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Livestock Services</Text>

        <View style={styles.servicesGrid}>
          <TouchableOpacity
            style={styles.serviceTile}
            onPress={() => router.push('/(farmer)/vaccination' as any)}
          >
            <Text style={styles.serviceIcon}>💉</Text>
            <Text style={styles.serviceTitle}>Vaccines</Text>
            <Text style={styles.serviceSub}>Camps & cards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceTile}
            onPress={() => router.push('/(farmer)/kisan-saathi' as any)}
          >
            <Text style={styles.serviceIcon}>🤖</Text>
            <Text style={styles.serviceTitle}>Kisan Saathi</Text>
            <Text style={styles.serviceSub}>AI Voice & Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceTile}
            onPress={() => router.push('/(farmer)/map' as any)}
          >
            <Text style={styles.serviceIcon}>📍</Text>
            <Text style={styles.serviceTitle}>Vet Centers</Text>
            <Text style={styles.serviceSub}>Find clinics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceTile}
            onPress={() => router.push('/(farmer)/notifications' as any)}
          >
            <View style={styles.serviceTileHeader}>
              <Text style={styles.serviceIcon}>🔔</Text>
              {unreadAlertsCount > 0 && (
                <View style={styles.serviceBadge}>
                  <Text style={styles.serviceBadgeText}>{unreadAlertsCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.serviceTitle}>Alerts</Text>
            <Text style={styles.serviceSub}>
              {unreadAlertsCount > 0 ? `${unreadAlertsCount} unread warnings` : 'Disease warnings'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badge: {
    backgroundColor: colors.light.farmerBadgeBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.farmerBadge,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  profileButton: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  profileButtonText: {
    color: colors.light.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  logoutButton: {
    backgroundColor: colors.light.dangerBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  logoutButtonText: {
    color: colors.light.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: colors.light.dangerBg,
    padding: spacing.md,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.light.danger,
    fontSize: typography.sizes.xs,
    flex: 1,
    marginRight: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  retryButtonText: {
    color: colors.light.danger,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  kpiCardWarning: {
    borderColor: colors.light.warning,
    backgroundColor: '#FFFDF5',
  },
  kpiCardDanger: {
    borderColor: colors.light.danger,
    backgroundColor: '#FFF8F8',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  kpiIcon: {
    fontSize: 22,
  },
  kpiNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  kpiLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  kpiSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  actionButtonIcon: {
    fontSize: 24,
  },
  actionButtonTitle: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  actionButtonSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1.5,
    borderColor: colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  secondaryButtonTitle: {
    color: colors.light.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  secondaryButtonSub: {
    color: colors.light.textSecondary,
    fontSize: 11,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  sectionLink: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
  },
  loaderContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  caseCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.danger,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  caseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  caseIdText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    fontWeight: typography.weights.bold,
  },
  caseBadge: {
    backgroundColor: colors.light.dangerBg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  caseBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
  },
  caseDiseaseText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  caseMetaText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  vetAssignedText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    marginTop: 4,
    fontWeight: typography.weights.semibold,
  },
  vetPendingText: {
    fontSize: typography.sizes.xs,
    color: colors.light.warning,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  emptyDesc: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.sm,
    lineHeight: 18,
  },
  emptyAddButton: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
  },
  emptyAddButtonText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  animalCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  animalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.light.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  animalSpeciesEmoji: {
    fontSize: 24,
  },
  animalInfo: {
    flex: 1,
  },
  animalNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animalName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  healthBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  healthBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  animalTag: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  animalSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  serviceTile: {
    width: '48%',
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  serviceTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceBadge: {
    backgroundColor: colors.light.danger,
    borderRadius: radii.round,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBadgeText: {
    color: colors.light.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  serviceIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  serviceTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  serviceSub: {
    fontSize: 10,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
});
