/**
 * Livestock Saathi - Veterinarian Dashboard
 * File: mobile/app/(vet)/index.tsx
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../src/theme';

export default function VetHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const vetModules = [
    { title: 'Incoming Referrals', route: '/(vet)/referrals', icon: '📥', desc: 'Triage queue from farmers & community AI scans' },
    { title: 'Clinical Cases', route: '/(vet)/cases', icon: '🩺', desc: 'Case history, diagnoses, and prescription orders' },
    { title: 'Diagnostic Lab Tests', route: '/(vet)/labs', icon: '🔬', desc: 'Sample tracking, culture tests, and lab results' },
    { title: 'Field Cases GIS Map', route: '/(vet)/map', icon: '🗺️', desc: 'Geospatial distribution of reported cases' },
    { title: 'Clinical Alerts', route: '/(vet)/notifications', icon: '🚨', desc: 'Emergency escalations and outbreak notifications' },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>VETERINARIAN PORTAL</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          Dr. {user?.name ? user.name.replace(/^Dr\.\s*/i, '') : 'Veterinarian'}
        </Text>
        <Text style={styles.subtitle}>
          {user?.registrationNo ? `Reg: ${user.registrationNo}` : 'Veterinary Clinical Workspace'}
        </Text>
      </View>

      <View style={styles.grid}>
        {vetModules.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.base,
    backgroundColor: colors.light.background,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badge: {
    backgroundColor: colors.light.vetBadgeBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.vetBadge,
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: colors.light.dangerBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
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
  grid: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  cardDesc: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 4,
  },
});
