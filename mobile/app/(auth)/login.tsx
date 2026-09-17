/**
 * Livestock Saathi - Auth: Login Screen
 * File: mobile/app/(auth)/login.tsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      setError('Please enter your email or registered mobile number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authUser = await login(identifier.trim(), password);
      const role = (authUser.role || 'farmer').toLowerCase();

      // Navigation is automatically handled by the NavigationGuard, but we can also direct immediately
      if (role === 'farmer') {
        router.replace('/(farmer)');
      } else if (role === 'veterinarian' || role === 'field_worker') {
        router.replace('/(vet)');
      } else if (role === 'officer' || role === 'admin') {
        router.replace('/(officer)');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredential = (roleKey: 'farmer' | 'vet' | 'officer') => {
    setError(null);
    if (roleKey === 'farmer') {
      setIdentifier('farmer@pashurakshak.in');
      setPassword('Farmer@123');
    } else if (roleKey === 'vet') {
      setIdentifier('vet@pashurakshak.in');
      setPassword('Vet@123');
    } else if (roleKey === 'officer') {
      setIdentifier('officer@pashurakshak.in');
      setPassword('Admin@123');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Branding Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🐄</Text>
          </View>
          <Text style={styles.title}>Livestock Saathi</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Identifier Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address or Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. farmer@pashurakshak.in or 9822011223"
              placeholderTextColor={colors.light.textMuted}
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                disabled={loading}
              >
                <Text style={styles.forgotLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter password"
                placeholderTextColor={colors.light.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.light.textInverse} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Role Helper Switcher */}
          <View style={styles.presetSection}>
            <Text style={styles.presetTitle}>Fill Demo Credentials for Evaluation:</Text>
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => fillQuickCredential('farmer')}
                disabled={loading}
              >
                <Text style={styles.presetButtonText}>Farmer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => fillQuickCredential('vet')}
                disabled={loading}
              >
                <Text style={styles.presetButtonText}>Veterinarian</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => fillQuickCredential('officer')}
                disabled={loading}
              >
                <Text style={styles.presetButtonText}>Officer</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Register Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              disabled={loading}
            >
              <Text style={styles.registerLink}>Register Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.base,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.light.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.light.primaryHighlight,
  },
  logoIcon: {
    fontSize: 34,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.md,
  },
  errorBox: {
    backgroundColor: colors.light.dangerBg,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.light.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  inputGroup: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  forgotLink: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
  },
  input: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 55,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    padding: spacing.xs,
  },
  eyeText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
  },
  submitButton: {
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.base,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  presetSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  presetTitle: {
    fontSize: 11,
    color: colors.light.textMuted,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  presetButton: {
    flex: 1,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  registerLink: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
  },
});
