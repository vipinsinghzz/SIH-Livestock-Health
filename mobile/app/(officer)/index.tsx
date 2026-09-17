/**
 * Livestock Saathi - Officer Dashboard
 * File: mobile/app/(officer)/index.tsx
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../src/theme';

export default function OfficerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const officerModules = [
    { title: 'Epidemic Surveillance', route: '/(officer)/surveillance', icon: '📊', desc: 'District risk scores, NADRES sync, trend metrics' },
    { title: 'Outbreak Alerts', route: '/(officer)/outbreaks', icon: '⚠️', desc: 'Active clusters, threshold alarms, high-risk villages' },
    { title: 'Containment Zones', route: '/(officer)/containment', icon: '🛡️', desc: 'Ring vaccination, movement quarantine corridors' },
    { title: 'Mass Vaccination Camps', route: '/(officer)/vaccination', icon: '⛺', desc: 'District camp scheduling and logistics tracking' },
    { title: 'GIS Surveillance Map', route: '/(officer)/map', icon: '🗺️', desc: 'High-density GIS heatmaps and zone boundaries' },
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
            <Text style={styles.badgeText}>OFFICER PORTAL</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          Command Center: {user?.name ? user.name.split(' ')[0] : 'Officer'}
        </Text>
        <Text style={styles.subtitle}>
          {user?.department ? user.department : 'District Surveillance & Epidemiology Operations'}
        </Text>
      </View>

      <View style={styles.grid}>
        {officerModules.map((item) => (
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
    backgroundColor: colors.light.officerBadgeBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.officerBadge,
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
