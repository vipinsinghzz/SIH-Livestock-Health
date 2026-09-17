/**
 * Livestock Saathi - Auth: Register Screen
 * File: mobile/app/(auth)/register.tsx
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
import { useAuth, UserRole } from '../../src/context/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../src/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [role, setRole] = useState<UserRole>('farmer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [district, setDistrict] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [village, setVillage] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [department, setDepartment] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authUser = await register({
        name: name.trim(),
        phone: cleanPhone,
        password,
        role,
        email: email.trim() || undefined,
        district: district.trim() || 'Pune',
        state: state.trim() || 'Maharashtra',
        village: village.trim() || undefined,
        registrationNo: registrationNo.trim() || undefined,
        department: department.trim() || undefined,
        preferredLanguage: 'hi',
      });

      const userRole = (authUser.role || 'farmer').toLowerCase();
      if (userRole === 'farmer') router.replace('/(farmer)');
      else if (userRole === 'veterinarian' || userRole === 'field_worker') router.replace('/(vet)');
      else if (userRole === 'officer' || userRole === 'admin') router.replace('/(officer)');
      else router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
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
            <Text style={styles.logoIcon}>📝</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Livestock Saathi Community</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Role Selection Tabs */}
          <Text style={styles.sectionLabel}>Select Your Role</Text>
          <View style={styles.roleTabs}>
            <TouchableOpacity
              style={[styles.roleTab, role === 'farmer' && styles.roleTabActive]}
              onPress={() => setRole('farmer')}
            >
              <Text style={[styles.roleTabText, role === 'farmer' && styles.roleTabTextActive]}>
                🌾 Farmer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleTab, role === 'veterinarian' && styles.roleTabActive]}
              onPress={() => setRole('veterinarian')}
            >
              <Text style={[styles.roleTabText, role === 'veterinarian' && styles.roleTabTextActive]}>
                🩺 Vet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleTab, role === 'officer' && styles.roleTabActive]}
              onPress={() => setRole('officer')}
            >
              <Text style={[styles.roleTabText, role === 'officer' && styles.roleTabTextActive]}>
                🏛️ Officer
              </Text>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Patil"
              placeholderTextColor={colors.light.textMuted}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          {/* Mobile Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.light.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={13}
              editable={!loading}
            />
          </View>

          {/* Optional Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={colors.light.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Create Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.light.textMuted}
                value={password}
                onChangeText={setPassword}
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

          {/* Role specific inputs */}
          {role === 'veterinarian' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Veterinary Registration Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MAH-VET-2024-1234"
                placeholderTextColor={colors.light.textMuted}
                value={registrationNo}
                onChangeText={setRegistrationNo}
                editable={!loading}
              />
            </View>
          ) : null}

          {role === 'officer' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department / Division</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dept of Animal Husbandry"
                placeholderTextColor={colors.light.textMuted}
                value={department}
                onChangeText={setDepartment}
                editable={!loading}
              />
            </View>
          ) : null}

          {/* Location Fields */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>District</Text>
              <TextInput
                style={styles.input}
                placeholder="District"
                placeholderTextColor={colors.light.textMuted}
                value={district}
                onChangeText={setDistrict}
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={colors.light.textMuted}
                value={state}
                onChangeText={setState}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Village / Locality</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Baramati"
              placeholderTextColor={colors.light.textMuted}
              value={village}
              onChangeText={setVillage}
              editable={!loading}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.light.textInverse} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              disabled={loading}
            >
              <Text style={styles.loginLink}>Sign In</Text>
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
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: radii.xl,
    backgroundColor: colors.light.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.light.primaryHighlight,
  },
  logoIcon: {
    fontSize: 30,
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
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: colors.light.surfaceAlt,
    padding: 3,
    borderRadius: radii.md,
    marginBottom: spacing.base,
  },
  roleTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  roleTabActive: {
    backgroundColor: colors.light.surface,
    ...shadows.sm,
  },
  roleTabText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  roleTabTextActive: {
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
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
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  loginLink: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
  },
});
