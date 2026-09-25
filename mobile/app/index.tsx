/**
 * Livestock Saathi - Main App Launcher / Role Gateway
 * File: mobile/app/index.tsx
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../src/theme';
import { ENV } from '../src/config/env';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, loginAsPersona } = useAuth();
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const handleQuickEval = async (persona: 'farmer' | 'vet' | 'officer') => {
    console.log('[DIAGNOSTIC] Quick persona switch initiated for persona:', persona);
    setEvalLoading(true);
    setEvalError(null);
    try {
      const loggedUser = await loginAsPersona(persona);
      const role = loggedUser.role.toLowerCase();
      console.log('[DIAGNOSTIC] Quick evaluation login completed. Role:', role);
      if (role === 'farmer') {
        console.log('[DIAGNOSTIC] QuickEval pushing destination: /(farmer)');
        router.push('/(farmer)');
      } else if (role === 'veterinarian' || role === 'field_worker') {
        console.log('[DIAGNOSTIC] QuickEval pushing destination: /(vet)');
        router.push('/(vet)');
      } else if (role === 'officer' || role === 'admin') {
        console.log('[DIAGNOSTIC] QuickEval pushing destination: /(officer)');
        router.push('/(officer)');
      }
    } catch (err: any) {
      console.warn('[DIAGNOSTIC] Quick evaluation login failed:', err.message);
      setEvalError(err.message || 'Quick evaluation login failed');
    } finally {
      setEvalLoading(false);
    }
  };

  const navigateToRolePortal = () => {
    if (!user) return;
    const role = user.role.toLowerCase();
    console.log('[DIAGNOSTIC] navigateToRolePortal invoked. Selected role portal for:', role);
    if (role === 'farmer') {
      console.log('[DIAGNOSTIC] Role portal navigating to /(farmer)');
      router.push('/(farmer)');
    } else if (role === 'veterinarian' || role === 'field_worker') {
      console.log('[DIAGNOSTIC] Role portal navigating to /(vet)');
      router.push('/(vet)');
    } else if (role === 'officer' || role === 'admin') {
      console.log('[DIAGNOSTIC] Role portal navigating to /(officer)');
      router.push('/(officer)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🐄</Text>
          </View>
          <Text style={styles.appTitle}>Livestock Saathi</Text>
          <Text style={styles.appSubtitle}>AI-Powered Livestock Health Assistant</Text>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseBadgeText}>PHASE 2 AUTHENTICATION</Text>
          </View>
        </View>

        {/* Backend Connectivity Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusIndicator} />
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Production Backend Connected</Text>
            <Text style={styles.statusEndpoint} numberOfLines={1}>
              {ENV.API_URL}
            </Text>
          </View>
        </View>

        {evalError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {evalError}</Text>
          </View>
        ) : null}

        {/* Dynamic Authenticated vs Unauthenticated View */}
        {isAuthenticated && user ? (
          <View style={styles.userCard}>
            <View style={styles.userCardHeader}>
              <View>
                <Text style={styles.userGreeting}>Signed In As</Text>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: colors.light.primarySubtle }]}>
                <Text style={[styles.roleBadgeText, { color: colors.light.primary }]}>
                  {user.role.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.userActions}>
              <TouchableOpacity
                style={styles.enterPortalBtn}
                onPress={navigateToRolePortal}
                activeOpacity={0.8}
              >
                <Text style={styles.enterPortalBtnText}>Open {user.role.toUpperCase()} Portal →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={logout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Authentication Gateway</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => {
                  console.log('[DIAGNOSTIC] Tapped "Sign In" button -> router.push("/(auth)/login")');
                  router.push('/(auth)/login');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => {
                  console.log('[DIAGNOSTIC] Tapped "Create Account" button -> router.push("/(auth)/register")');
                  router.push('/(auth)/register');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Persona Evaluator */}
            <View style={styles.personaBox}>
              <Text style={styles.personaBoxTitle}>⚡ Quick Persona Switcher (Testing & Evaluation)</Text>
              <Text style={styles.personaBoxSubtitle}>
                Uses authentic backend accounts to instantly evaluate role-based flows.
              </Text>
              {evalLoading ? (
                <ActivityIndicator size="small" color={colors.light.primary} style={{ marginVertical: 8 }} />
              ) : (
                <View style={styles.personaRow}>
                  <TouchableOpacity
                    style={[styles.personaChip, { borderColor: colors.light.farmerBadge }]}
                    onPress={() => handleQuickEval('farmer')}
                  >
                    <Text style={styles.personaChipText}>🌾 Farmer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.personaChip, { borderColor: colors.light.vetBadge }]}
                    onPress={() => handleQuickEval('vet')}
                  >
                    <Text style={styles.personaChipText}>🩺 Veterinarian</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.personaChip, { borderColor: colors.light.officerBadge }]}
                    onPress={() => handleQuickEval('officer')}
                  >
                    <Text style={styles.personaChipText}>🏛️ Officer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Portal Information Tiles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Role Portals</Text>

          {/* Farmer Portal Card */}
          <TouchableOpacity
            style={styles.portalCard}
            onPress={() => {
              console.log('[DIAGNOSTIC] Tapped "Farmer Portal" card -> router.push("/(farmer)")');
              router.push('/(farmer)');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.portalIcon}>🌾</Text>
            <View style={styles.portalInfo}>
              <Text style={styles.portalName}>Farmer Portal</Text>
              <Text style={styles.portalDesc}>Livestock management, AI disease scans, triage cases</Text>
            </View>
            <Text style={styles.portalArrow}>→</Text>
          </TouchableOpacity>

          {/* Veterinarian Portal Card */}
          <TouchableOpacity
            style={styles.portalCard}
            onPress={() => {
              console.log('[DIAGNOSTIC] Tapped "Veterinarian Portal" card -> router.push("/(vet)")');
              router.push('/(vet)');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.portalIcon}>🩺</Text>
            <View style={styles.portalInfo}>
              <Text style={styles.portalName}>Veterinarian Portal</Text>
              <Text style={styles.portalDesc}>Case referrals, prescriptions, laboratory test reports</Text>
            </View>
            <Text style={styles.portalArrow}>→</Text>
          </TouchableOpacity>

          {/* Officer Portal Card */}
          <TouchableOpacity
            style={styles.portalCard}
            onPress={() => {
              console.log('[DIAGNOSTIC] Tapped "Officer Portal" card -> router.push("/(officer)")');
              router.push('/(officer)');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.portalIcon}>🏛️</Text>
            <View style={styles.portalInfo}>
              <Text style={styles.portalName}>Officer Portal</Text>
              <Text style={styles.portalDesc}>Epidemic surveillance, containment zones, camps</Text>
            </View>
            <Text style={styles.portalArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Livestock Saathi • Android Package: com.helloworld.livestocksaathi
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.base,
    paddingTop: spacing.xs,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.light.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.light.primaryHighlight,
  },
  logoIcon: {
    fontSize: 32,
  },
  appTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  phaseBadge: {
    backgroundColor: colors.light.primaryHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  phaseBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primaryDark,
    letterSpacing: 0.5,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.light.success,
    marginRight: spacing.sm,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  statusEndpoint: {
    fontSize: 11,
    color: colors.light.textMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: colors.light.dangerBg,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.base,
  },
  errorBannerText: {
    color: colors.light.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  userCard: {
    backgroundColor: colors.light.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  userGreeting: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    fontWeight: typography.weights.semibold,
  },
  userName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  userEmail: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontFamily: 'monospace',
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.round,
  },
  roleBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  userActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  enterPortalBtn: {
    flex: 2,
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  enterPortalBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  logoutBtn: {
    flex: 1,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: colors.light.danger,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.light.primary,
  },
  primaryButtonText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  secondaryButton: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  secondaryButtonText: {
    color: colors.light.textPrimary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  personaBox: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  personaBoxTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  personaBoxSubtitle: {
    fontSize: 11,
    color: colors.light.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  personaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  personaChip: {
    flex: 1,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  personaChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
  },
  portalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  portalIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  portalInfo: {
    flex: 1,
  },
  portalName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  portalDesc: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  portalArrow: {
    fontSize: 18,
    color: colors.light.textMuted,
  },
  footer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    textAlign: 'center',
  },
});
