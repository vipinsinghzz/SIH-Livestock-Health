/**
 * Livestock Saathi - UI Component: PlaceholderScreen
 * File: mobile/src/components/PlaceholderScreen.tsx
 * 
 * Development placeholder showing screen title, route info, authenticated user status,
 * and navigation controls.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../theme';

interface PlaceholderScreenProps {
  title: string;
  role: 'farmer' | 'vet' | 'officer' | 'auth' | 'common';
  routePath: string;
  description?: string;
  icon?: string;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  title,
  role,
  routePath,
  description = 'Feature module foundation ready. Implementation scheduled for subsequent phases.',
  icon = '📋',
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const getRoleBadgeStyle = () => {
    switch (role) {
      case 'farmer':
        return { bg: colors.light.farmerBadgeBg, text: colors.light.farmerBadge, label: 'FARMER PORTAL' };
      case 'vet':
        return { bg: colors.light.vetBadgeBg, text: colors.light.vetBadge, label: 'VETERINARIAN PORTAL' };
      case 'officer':
        return { bg: colors.light.officerBadgeBg, text: colors.light.officerBadge, label: 'OFFICER PORTAL' };
      case 'auth':
        return { bg: colors.light.infoBg, text: colors.light.info, label: 'AUTHENTICATION' };
      default:
        return { bg: colors.light.surfaceAlt, text: colors.light.textSecondary, label: 'SYSTEM' };
    }
  };

  const badge = getRoleBadgeStyle();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
          {user ? (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutPill}>
              <Text style={styles.logoutPillText}>Sign Out</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {user ? (
          <View style={styles.userBanner}>
            <Text style={styles.userLabel}>Authenticated User</Text>
            <Text style={styles.userName}>{user.name} ({user.email})</Text>
            <Text style={styles.userRole}>Active Role: {user.role.toUpperCase()}</Text>
          </View>
        ) : null}

        <View style={styles.metaContainer}>
          <Text style={styles.metaLabel}>Route Path:</Text>
          <Text style={styles.metaValue}>{routePath}</Text>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Phase 2 Authentication Active</Text>
          <Text style={styles.statusSubtitle}>
            Authenticated via production backend & Supabase Auth. Route protected by role guard.
          </Text>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Text style={styles.homeButtonText}>Home Launcher</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.light.background,
    justifyContent: 'center',
    padding: spacing.base,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.md,
  },
  headerRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  logoutPill: {
    backgroundColor: colors.light.dangerBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  logoutPillText: {
    color: colors.light.danger,
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  icon: {
    fontSize: 44,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: typography.sizes.sm * 1.4,
  },
  userBanner: {
    width: '100%',
    backgroundColor: colors.light.primarySubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.primaryHighlight,
  },
  userLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.primaryDark,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primaryDark,
    marginTop: 2,
  },
  userRole: {
    fontSize: 10,
    color: colors.light.primary,
    marginTop: 1,
    fontWeight: typography.weights.semibold,
  },
  metaContainer: {
    width: '100%',
    backgroundColor: colors.light.surfaceAlt,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  metaLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    fontWeight: typography.weights.semibold,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
    fontFamily: 'monospace',
  },
  statusBox: {
    width: '100%',
    backgroundColor: colors.light.primarySubtle,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.primary,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.xl,
  },
  statusTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.primaryDark,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statusSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.primaryDark,
    lineHeight: typography.sizes.xs * 1.4,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.light.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  homeButton: {
    flex: 1,
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  homeButtonText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});

export default PlaceholderScreen;
