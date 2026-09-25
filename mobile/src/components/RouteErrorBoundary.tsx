/**
 * Livestock Saathi - Production Route Error Boundary
 * File: mobile/src/components/RouteErrorBoundary.tsx
 * 
 * Catches unhandled render and navigation exceptions in release builds,
 * prevents blank white screens, and provides user-friendly recovery options.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radii, shadows } from '../theme';

interface RouteErrorBoundaryProps {
  error: Error;
  retry: () => void;
}

export function RouteErrorBoundary({ error, retry }: RouteErrorBoundaryProps) {
  let router: any = null;
  try {
    router = useRouter();
  } catch (e) {
    // Router context might be unmounted if exception occurred at root container level
  }

  // Log error for forensic diagnostics
  console.error('[RouteErrorBoundary] Caught route crash:', error);

  const handleReturnHome = () => {
    try {
      if (router && typeof router.replace === 'function') {
        router.replace('/');
      } else {
        retry();
      }
    } catch (e) {
      console.warn('[RouteErrorBoundary] Fallback to retry():', e);
      retry();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>

        <Text style={styles.title}>Something Went Wrong</Text>
        <Text style={styles.subtitle}>
          The application encountered an unexpected issue while loading this screen.
        </Text>

        {error?.message ? (
          <View style={styles.detailsBox}>
            <Text style={styles.detailsText} numberOfLines={3}>
              {error.message}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={retry}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleReturnHome}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.light.surface,
    padding: spacing.xl,
    borderRadius: radii.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.light.warningBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.base,
    lineHeight: 20,
  },
  detailsBox: {
    backgroundColor: colors.light.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radii.md,
    width: '100%',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  detailsText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.light.primary,
  },
  primaryButtonText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  secondaryButton: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  secondaryButtonText: {
    color: colors.light.textPrimary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
});

export default RouteErrorBoundary;
