/**
 * Livestock Saathi - Root Layout & Navigation Guard
 * File: mobile/app/_layout.tsx
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth, UserRole } from '../src/context/AuthContext';
import { OfflineNotice } from '../src/components/OfflineNotice';
import { colors, typography, spacing, radii, shadows } from '../src/theme';

import { RouteErrorBoundary } from '../src/components/RouteErrorBoundary';

export const ErrorBoundary = RouteErrorBoundary;

const VALID_ROLES = ['farmer', 'veterinarian', 'field_worker', 'officer', 'admin'] as const;

function NavigationGuard() {
  const { user, token, loading, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const rawRole = user?.role ? String(user.role).toLowerCase() : '';
  const isRoleValid = VALID_ROLES.includes(rawRole as any);

  useEffect(() => {
    if (loading) return;

    const rootSegment = segments[0] as string | undefined;
    const inAuthGroup = rootSegment === '(auth)';
    const inFarmerGroup = rootSegment === '(farmer)';
    const inVetGroup = rootSegment === '(vet)';
    const inOfficerGroup = rootSegment === '(officer)';
    const inProtectedPortal = inFarmerGroup || inVetGroup || inOfficerGroup;

    const isAuthenticated = Boolean(token && user);

    if (!isAuthenticated) {
      // If unauthenticated user attempts to access any protected role portal, redirect to login
      if (inProtectedPortal) {
        router.replace('/(auth)/login');
      }
    } else if (user && isRoleValid) {
      const role = rawRole as UserRole;
      const isAdmin = role === 'admin';
      const isVet = role === 'veterinarian' || role === 'field_worker';
      const isOfficer = role === 'officer' || isAdmin;
      const isFarmer = role === 'farmer';

      // If authenticated user is in auth screens, direct them to their designated role portal
      if (inAuthGroup) {
        if (isFarmer) {
          router.replace('/(farmer)');
        } else if (isVet) {
          router.replace('/(vet)');
        } else if (isOfficer) {
          router.replace('/(officer)');
        }
        return;
      }

      // Enforce strict role boundary (cross-role protection)
      if (inFarmerGroup && !isFarmer && !isAdmin) {
        if (isVet) router.replace('/(vet)');
        else if (isOfficer) router.replace('/(officer)');
      } else if (inVetGroup && !isVet && !isAdmin) {
        if (isFarmer) router.replace('/(farmer)');
        else if (isOfficer) router.replace('/(officer)');
      } else if (inOfficerGroup && !isOfficer && !isAdmin) {
        if (isFarmer) router.replace('/(farmer)');
        else if (isVet) router.replace('/(vet)');
      }
    }
  }, [user, token, loading, segments, isRoleValid, rawRole]);

  return (
    <View style={styles.rootContainer}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.light.primary,
          },
          headerTintColor: colors.light.textInverse,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.light.background,
            flex: 1,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Livestock Saathi',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(farmer)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(vet)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(officer)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

      {/* Loading state: Rendered as absolute overlay over mounted Navigator to prevent navigation errors */}
      {loading && (
        <View style={[StyleSheet.absoluteFillObject, styles.splashContainer]}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🐄</Text>
          </View>
          <Text style={styles.splashTitle}>Livestock Saathi</Text>
          <Text style={styles.splashSubtitle}>Restoring Secure Session...</Text>
          <ActivityIndicator size="large" color={colors.light.textInverse} style={styles.splashSpinner} />
        </View>
      )}

      {/* Safe error state when role cannot be resolved */}
      {!loading && token && user && !isRoleValid && (
        <View style={[StyleSheet.absoluteFillObject, styles.errorContainer]}>
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Unresolved Account Role</Text>
            <Text style={styles.errorMessage}>
              The system cannot resolve access permissions for role "{String(user.role)}".
              Please contact your system administrator or sign in with an authorized account.
            </Text>
            <TouchableOpacity
              style={styles.errorLogoutBtn}
              onPress={async () => {
                await logout();
                router.replace('/(auth)/login');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.errorLogoutBtnText}>Sign Out & Switch Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor={colors.light.primary} />
        <OfflineNotice />
        <NavigationGuard />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  logoIcon: {
    fontSize: 42,
  },
  splashTitle: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    color: colors.light.textInverse,
    marginBottom: 4,
  },
  splashSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xl,
  },
  splashSpinner: {
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorCard: {
    backgroundColor: colors.light.surface,
    padding: spacing.xl,
    borderRadius: radii.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.md,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.danger,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  errorLogoutBtn: {
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  errorLogoutBtnText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
