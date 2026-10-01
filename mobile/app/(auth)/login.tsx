/**
 * PashuCare - Sign In Screen (Redesigned)
 * File: mobile/app/(auth)/login.tsx
 *
 * Modern healthcare application design with clean authentication hierarchy,
 * segmented Sign In / Create Account tabs, compact inputs with vector icons,
 * prominent CTA, accessible contrast, and rural-friendly PashuCare brand identity.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../src/components/AppIcon';
import { useAuth } from '../../src/context/AuthContext';
import { colors, radii } from '../../src/theme';
import { useAppLanguage } from '../../src/services/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useAppLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field focus states for visual feedback
  const [isIdentifierFocused, setIsIdentifierFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleSubmit = async () => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError(t('auth.emailOrPhone') + ' is required.');
      return;
    }
    if (!password) {
      setError(t('auth.enterPassword', 'Please enter your password.'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[PashuCare] Submitting login for identifier:', cleanId);
      const authUser = await login(cleanId, password);
      const role = (authUser.role || 'farmer').toLowerCase();
      console.log('[PashuCare] Login successful, role:', role);

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
      console.warn('[PashuCare] Login error:', err.message);
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back Navigation */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.back', 'Back')}
            >
              <AppIcon name="arrow-back" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Branding & Header */}
          <View style={styles.header}>
            <Image
              source={require('../../src/images/PashuCare Brand.png')}
              style={styles.brandLogo}
              resizeMode="contain"
              accessible={true}
              accessibilityLabel="PashuCare"
            />
            <Text style={styles.headerTitle}>{t('auth.welcomeBack', 'Welcome back')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('auth.signInToContinue', 'Sign in to continue to PashuCare')}
            </Text>
          </View>

          {/* Auth Card Container */}
          <View style={styles.card}>
            {/* Segmented Control / Tab Bar */}
            <View style={styles.segmentedContainer}>
              <View style={[styles.segmentTab, styles.segmentTabActive]}>
                <Text style={styles.segmentTextActive}>{t('common.signIn', 'Sign In')}</Text>
              </View>
              <TouchableOpacity
                style={styles.segmentTab}
                onPress={() => router.replace('/(auth)/register')}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityLabel={t('common.createAccount', 'Create Account')}
              >
                <Text style={styles.segmentTextInactive}>{t('common.createAccount', 'Create Account')}</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <AppIcon name="alert" size={17} color="#DC2626" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Phone Number / Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('auth.emailOrPhone', 'Phone number / Email')}</Text>
              <View
                style={[
                  styles.inputWrapper,
                  isIdentifierFocused && styles.inputWrapperFocused,
                ]}
              >
                <AppIcon
                  name="mail"
                  size={18}
                  color={isIdentifierFocused ? '#0F5132' : '#94A3B8'}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9822011223 or user@domain.com"
                  placeholderTextColor="#94A3B8"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (error) setError(null);
                  }}
                  onFocus={() => setIsIdentifierFocused(true)}
                  onBlur={() => setIsIdentifierFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                  accessibilityLabel={t('auth.emailOrPhone', 'Phone number or Email')}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{t('auth.password', 'Password')}</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="link"
                >
                  <Text style={styles.forgotPasswordLink}>
                    {t('auth.forgotPassword', 'Forgot Password?')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  isPasswordFocused && styles.inputWrapperFocused,
                ]}
              >
                <AppIcon
                  name="lock"
                  size={18}
                  color={isPasswordFocused ? '#0F5132' : '#94A3B8'}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder={t('auth.enterPassword', 'Enter your password')}
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError(null);
                  }}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  accessibilityLabel={t('auth.password', 'Password')}
                />
                <TouchableOpacity
                  style={styles.eyeIconButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <AppIcon
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={19}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Primary CTA */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('common.signIn', 'Sign In')}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t('common.signIn', 'Sign In')}</Text>
              )}
            </TouchableOpacity>

            {/* Bottom Switcher Link */}
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerLinkPrompt}>
                {t('auth.noAccount', "Don't have an account?")}{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/(auth)/register')}
                disabled={loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="link"
              >
                <Text style={styles.footerActionText}>
                  {t('common.createAccount', 'Create Account')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Persona Demo Switcher for Evaluation */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>Quick Evaluation Accounts:</Text>
              <View style={styles.demoRow}>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => fillQuickCredential('farmer')}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Text style={styles.demoChipText}>{t('auth.farmer', 'Farmer')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => fillQuickCredential('vet')}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Text style={styles.demoChipText}>{t('auth.veterinarian', 'Vet')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => fillQuickCredential('officer')}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Text style={styles.demoChipText}>{t('auth.officer', 'Officer')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7', // Crisp, clean healthcare off-white/mint backdrop
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  topBar: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  brandLogo: {
    width: 190,
    height: 62,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F2',
    borderRadius: 12,
    padding: 4,
    marginBottom: 22,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  segmentTextActive: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F5132',
  },
  segmentTextInactive: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#64748B',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  forgotPasswordLink: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F5132',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: '#0F5132',
    backgroundColor: '#FFFFFF',
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  passwordInput: {
    paddingRight: 6,
  },
  eyeIconButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#0F5132',
    height: 50,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  footerLinkPrompt: {
    fontSize: 13.5,
    color: '#64748B',
  },
  footerActionText: {
    fontSize: 13.5,
    color: '#0F5132',
    fontWeight: '700',
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  demoTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoChip: {
    flex: 1,
    backgroundColor: '#F1F5F2',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F5132',
  },
});
