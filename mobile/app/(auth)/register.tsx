/**
 * PashuCare - Create Account Screen (Redesigned)
 * File: mobile/app/(auth)/register.tsx
 *
 * Modern healthcare application design with segmented Sign In / Create Account tabs,
 * role selector with vector icons, automatic GPS location detection on mount via
 * device permission, reverse geocoding, manual fallback, and PashuCare brand identity.
 * Zero emojis - 100% vector icons.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import * as Location from 'expo-location';
import { useAuth, UserRole } from '../../src/context/AuthContext';
import { radii } from '../../src/theme';
import { useAppLanguage } from '../../src/services/i18n';

type LocationState = 'locating' | 'detected' | 'denied' | 'error' | 'manual';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { t, language } = useAppLanguage();

  // Core Form Fields
  const [role, setRole] = useState<UserRole>('farmer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Role specific fields
  const [registrationNo, setRegistrationNo] = useState('');
  const [department, setDepartment] = useState('');

  // Location Fields (strictly populated via GPS / reverse-geocoding, zero hardcoded values)
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationState>('locating');
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);

  // Form Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus tracking for active border feedback
  const [focusedField, setFocusedField] = useState<string | null>(null);

  /**
   * Reverse geocodes latitude & longitude into Village, District, State, Country.
   * Uses native Android Geocoder first, with resilient OpenStreetMap fallback.
   */
  const reverseGeocode = async (lat: number, lng: number) => {
    let resolvedVillage = '';
    let resolvedDistrict = '';
    let resolvedState = '';
    let resolvedCountry = 'India';

    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        resolvedDistrict = addr.district || addr.subregion || addr.city || '';
        resolvedState = addr.region || '';
        resolvedVillage = addr.city || addr.name || addr.street || addr.subregion || '';
        resolvedCountry = addr.country || 'India';
      }
    } catch (err: any) {
      console.warn('[PashuCare] Native reverse geocoding fallback triggered:', err.message);
    }

    // If native geocoder did not resolve district or state, query OpenStreetMap Nominatim
    if (!resolvedDistrict || !resolvedState) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&zoom=10&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'PashuCare-Mobile/1.0 (contact@pashucare.in)',
            'Accept-Language': 'en',
          },
        });
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          resolvedDistrict =
            addr.state_district ||
            addr.district ||
            addr.county ||
            addr.city ||
            addr.subdistrict ||
            resolvedDistrict;
          resolvedState = addr.state || resolvedState;
          resolvedVillage =
            addr.village ||
            addr.town ||
            addr.suburb ||
            addr.hamlet ||
            addr.locality ||
            addr.city ||
            resolvedVillage;
          resolvedCountry = addr.country || resolvedCountry;
        }
      } catch (osmErr: any) {
        console.warn('[PashuCare] OpenStreetMap fallback error:', osmErr.message);
      }
    }

    return {
      village: resolvedVillage,
      district: resolvedDistrict,
      state: resolvedState,
      country: resolvedCountry,
    };
  };

  /**
   * Automatically requests GPS location permission from phone and detects coordinates.
   */
  const detectGpsLocation = useCallback(async () => {
    setLocationStatus('locating');
    setLocationErrorMsg(null);
    setError(null);

    try {
      // 1. Request location permission directly from device OS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        setLocationErrorMsg(
          t(
            'auth.locationPermissionRequired',
            'Location permission is required for automatic location detection.'
          )
        );
        return;
      }

      // 2. Check if location services (GPS) are enabled on device
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationStatus('error');
        setLocationErrorMsg('Device GPS / location services are turned off. Please turn on Location in Settings.');
        return;
      }

      // 3. Obtain current GPS position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCoordinates({ lat, lng });

      // 4. Reverse geocode coordinates
      const geo = await reverseGeocode(lat, lng);
      setVillage(geo.village);
      setDistrict(geo.district);
      setState(geo.state);
      setCountry(geo.country);

      setLocationStatus('detected');
      console.log('[PashuCare] Automatic GPS detected successfully:', { lat, lng, ...geo });
    } catch (err: any) {
      console.warn('[PashuCare] GPS detection failure:', err.message);
      setLocationStatus('error');
      setLocationErrorMsg(err.message || t('auth.locationError', 'Unable to detect GPS location.'));
    }
  }, [t]);

  // Trigger automatic location fetch as soon as Create Account screen loads
  useEffect(() => {
    detectGpsLocation();
  }, [detectGpsLocation]);

  const handleSubmit = async () => {
    // 1. Full Name Validation
    if (!name.trim() || name.trim().length < 2) {
      setError(t('auth.enterFullName', 'Please enter your full name.'));
      return;
    }

    // 2. Phone Validation (Indian 10-digit)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError(t('auth.invalidPhone', 'Please enter a valid 10-digit mobile number.'));
      return;
    }

    // 3. Email Validation (if provided)
    const cleanEmail = email.trim();
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      setError(t('auth.invalidEmail', 'Please enter a valid email address.'));
      return;
    }

    // 4. Password Validation
    if (!password || password.length < 6) {
      setError(t('auth.passwordMinLength', 'Password must be at least 6 characters.'));
      return;
    }

    // 5. Location Validation
    if (!district.trim() && !state.trim() && !coordinates) {
      setError('Please allow GPS location detection or enter your District and State.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[PashuCare] Submitting registration for:', {
        name: name.trim(),
        phone: cleanPhone,
        role,
        district: district.trim(),
        state: state.trim(),
        village: village.trim(),
        coordinates,
      });

      const authUser = await register({
        name: name.trim(),
        phone: cleanPhone,
        password,
        role,
        email: cleanEmail || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        village: village.trim() || undefined,
        registrationNo: registrationNo.trim() || undefined,
        department: department.trim() || undefined,
        preferredLanguage: language || 'hi',
        location: coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : undefined,
      });

      const userRole = (authUser.role || 'farmer').toLowerCase();
      if (userRole === 'farmer') router.replace('/(farmer)');
      else if (userRole === 'veterinarian' || userRole === 'field_worker') router.replace('/(vet)');
      else if (userRole === 'officer' || userRole === 'admin') router.replace('/(officer)');
      else router.replace('/');
    } catch (err: any) {
      console.warn('[PashuCare] Registration failure:', err.message);
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
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

          {/* Clean Brand Header (Logo directly from mobile/src/images/PashuCare Brand.png) */}
          <View style={styles.header}>
            <Image
              source={require('../../src/images/PashuCare Brand.png')}
              style={styles.brandLogo}
              resizeMode="contain"
              accessible={true}
              accessibilityLabel="PashuCare"
            />
          </View>

          {/* Auth Card Container */}
          <View style={styles.card}>
            {/* Segmented Control / Tab Bar (Acts as screen mode indicator, zero duplicate titles) */}
            <View style={styles.segmentedContainer}>
              <TouchableOpacity
                style={styles.segmentTab}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityLabel={t('common.signIn', 'Sign In')}
              >
                <Text style={styles.segmentTextInactive}>{t('common.signIn', 'Sign In')}</Text>
              </TouchableOpacity>
              <View style={[styles.segmentTab, styles.segmentTabActive]}>
                <Text style={styles.segmentTextActive}>{t('common.createAccount', 'Create Account')}</Text>
              </View>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <AppIcon name="alert" size={17} color="#DC2626" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Role Selection (Farmer / Veterinarian / Officer with 100% Vector Icons) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('auth.role', 'Select Your Role')} *</Text>
              <View style={styles.roleGrid}>
                {/* Farmer Option */}
                <TouchableOpacity
                  style={[styles.roleCard, role === 'farmer' && styles.roleCardActive]}
                  onPress={() => setRole('farmer')}
                  activeOpacity={0.75}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: role === 'farmer' }}
                >
                  <AppIcon
                    name="tractor"
                    size={22}
                    color={role === 'farmer' ? '#0F5132' : '#64748B'}
                  />
                  <Text style={[styles.roleCardText, role === 'farmer' && styles.roleCardTextActive]}>
                    {t('auth.farmer', 'Farmer')}
                  </Text>
                </TouchableOpacity>

                {/* Veterinarian Option */}
                <TouchableOpacity
                  style={[styles.roleCard, role === 'veterinarian' && styles.roleCardActive]}
                  onPress={() => setRole('veterinarian')}
                  activeOpacity={0.75}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: role === 'veterinarian' }}
                >
                  <AppIcon
                    name="stethoscope"
                    size={22}
                    color={role === 'veterinarian' ? '#0F5132' : '#64748B'}
                  />
                  <Text style={[styles.roleCardText, role === 'veterinarian' && styles.roleCardTextActive]}>
                    {t('auth.veterinarian', 'Veterinarian')}
                  </Text>
                </TouchableOpacity>

                {/* Officer Option */}
                <TouchableOpacity
                  style={[styles.roleCard, role === 'officer' && styles.roleCardActive]}
                  onPress={() => setRole('officer')}
                  activeOpacity={0.75}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: role === 'officer' }}
                >
                  <AppIcon
                    name="shield"
                    size={22}
                    color={role === 'officer' ? '#0F5132' : '#64748B'}
                  />
                  <Text style={[styles.roleCardText, role === 'officer' && styles.roleCardTextActive]}>
                    {t('auth.officer', 'Officer')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('auth.fullName', 'Full Name')} *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'name' && styles.inputWrapperFocused,
                ]}
              >
                <AppIcon
                  name="person"
                  size={18}
                  color={focusedField === 'name' ? '#0F5132' : '#94A3B8'}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Patil"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}
                  accessibilityLabel={t('auth.fullName', 'Full Name')}
                />
              </View>
            </View>

            {/* Mobile Phone Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('auth.phone', 'Phone Number')} *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'phone' && styles.inputWrapperFocused,
                ]}
              >
                <AppIcon
                  name="phone"
                  size={18}
                  color={focusedField === 'phone' ? '#0F5132' : '#94A3B8'}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!loading}
                  accessibilityLabel={t('auth.phone', 'Phone Number')}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('auth.email', 'Email Address')}</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                ]}
              >
                <AppIcon
                  name="mail"
                  size={18}
                  color={focusedField === 'email' ? '#0F5132' : '#94A3B8'}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com (optional)"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                  accessibilityLabel={t('auth.email', 'Email Address')}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('auth.password', 'Password')} *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}
              >
                <AppIcon
                  name="lock"
                  size={18}
                  color={focusedField === 'password' ? '#0F5132' : '#94A3B8'}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder={t('auth.passwordMinLength', 'Minimum 6 characters')}
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
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

            {/* Role specific inputs */}
            {role === 'veterinarian' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Veterinary Registration Number</Text>
                <View style={styles.inputWrapper}>
                  <AppIcon name="card" size={18} color="#94A3B8" style={styles.inputLeadingIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. MAH-VET-2024-1234"
                    placeholderTextColor="#94A3B8"
                    value={registrationNo}
                    onChangeText={setRegistrationNo}
                    editable={!loading}
                  />
                </View>
              </View>
            ) : null}

            {role === 'officer' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Department / Division</Text>
                <View style={styles.inputWrapper}>
                  <AppIcon name="business" size={18} color="#94A3B8" style={styles.inputLeadingIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Dept of Animal Husbandry"
                    placeholderTextColor="#94A3B8"
                    value={department}
                    onChangeText={setDepartment}
                    editable={!loading}
                  />
                </View>
              </View>
            ) : null}

            {/* ========================================================= */}
            {/* AUTOMATIC GPS LOCATION (Clean vector icons, zero emojis) */}
            {/* ========================================================= */}
            <View style={styles.locationContainer}>
              <View style={styles.locationHeaderRow}>
                <View style={styles.locationTitleRow}>
                  <AppIcon name="location" size={16} color="#0F5132" style={styles.locationTitleIcon} />
                  <Text style={styles.locationTitle}>{t('auth.locationAccess', 'Location (GPS)')}</Text>
                </View>

                {locationStatus === 'detected' && (
                  <View style={styles.gpsVerifiedBadge}>
                    <AppIcon name="checkmark" size={13} color="#0F5132" />
                    <Text style={styles.gpsVerifiedText}>{t('auth.gpsVerified', 'GPS Verified')}</Text>
                  </View>
                )}
              </View>

              {/* State 1: Locating / Fetching in Progress */}
              {locationStatus === 'locating' && (
                <View style={styles.locationLoadingBox}>
                  <ActivityIndicator size="small" color="#0F5132" />
                  <Text style={styles.locationLoadingText}>
                    {t('auth.detectingLocation', 'Detecting GPS location...')}
                  </Text>
                </View>
              )}

              {/* State 2: GPS Detected Successfully */}
              {locationStatus === 'detected' && (
                <View style={styles.locationSuccessBox}>
                  {coordinates ? (
                    <View style={styles.coordsRow}>
                      <View style={styles.coordsLabelRow}>
                        <AppIcon name="location" size={13} color="#0F5132" style={{ marginRight: 4 }} />
                        <Text style={styles.coordsText}>
                          {coordinates.lat.toFixed(4)}° N, {coordinates.lng.toFixed(4)}° E
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.refreshLocBtn}
                        onPress={detectGpsLocation}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <AppIcon name="refresh" size={13} color="#0F5132" />
                        <Text style={styles.refreshLocText}>{t('common.refresh', 'Refresh')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Detected District and State */}
                  <View style={styles.locationDetailsGrid}>
                    <View style={styles.locationDetailItem}>
                      <Text style={styles.locationDetailLabel}>{t('auth.district', 'District')}</Text>
                      <Text style={styles.locationDetailValue}>{district || 'Detected'}</Text>
                    </View>
                    <View style={styles.locationDetailItem}>
                      <Text style={styles.locationDetailLabel}>{t('auth.state', 'State')}</Text>
                      <Text style={styles.locationDetailValue}>{state || 'Detected'}</Text>
                    </View>
                  </View>

                  {/* Village / Town (Pre-populated, editable) */}
                  <View style={styles.villageFieldWrapper}>
                    <Text style={styles.locationDetailLabel}>{t('auth.village', 'Village / Town')}</Text>
                    <TextInput
                      style={styles.villageInput}
                      placeholder="e.g. Saoner"
                      placeholderTextColor="#94A3B8"
                      value={village}
                      onChangeText={setVillage}
                      editable={!loading}
                    />
                  </View>
                </View>
              )}

              {/* State 3: Permission Denied or GPS Error */}
              {(locationStatus === 'denied' || locationStatus === 'error') && (
                <View style={styles.locationErrorBox}>
                  <Text style={styles.locationErrorText}>
                    {locationErrorMsg ||
                      t(
                        'auth.locationPermissionRequired',
                        'Location permission is required for automatic location detection.'
                      )}
                  </Text>
                  <View style={styles.locationButtonRow}>
                    <TouchableOpacity
                      style={styles.retryLocationBtn}
                      onPress={detectGpsLocation}
                      activeOpacity={0.8}
                    >
                      <AppIcon name="refresh" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                      <Text style={styles.retryLocationBtnText}>{t('auth.tryAgain', 'Try Again')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.manualFallbackBtn}
                      onPress={() => setLocationStatus('manual')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.manualFallbackBtnText}>
                        {t('auth.enterManually', 'Enter Manually')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* State 4: Manual Location Entry Mode */}
              {locationStatus === 'manual' && (
                <View style={styles.manualLocationBox}>
                  <View style={styles.manualHeaderRow}>
                    <Text style={styles.manualBoxTitle}>{t('auth.manualLocation', 'Manual Location Entry')}</Text>
                    <TouchableOpacity onPress={detectGpsLocation} activeOpacity={0.7}>
                      <Text style={styles.useGpsLink}>{t('auth.useGpsLocation', 'Detect with GPS')}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.fieldLabel}>{t('auth.district', 'District')} *</Text>
                      <TextInput
                        style={styles.inputWrapperManual}
                        placeholder="District"
                        placeholderTextColor="#94A3B8"
                        value={district}
                        onChangeText={setDistrict}
                        editable={!loading}
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>{t('auth.state', 'State')} *</Text>
                      <TextInput
                        style={styles.inputWrapperManual}
                        placeholder="State"
                        placeholderTextColor="#94A3B8"
                        value={state}
                        onChangeText={setState}
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{t('auth.village', 'Village / Town')}</Text>
                    <TextInput
                      style={styles.inputWrapperManual}
                      placeholder="e.g. Saoner"
                      placeholderTextColor="#94A3B8"
                      value={village}
                      onChangeText={setVillage}
                      editable={!loading}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Create Account Primary CTA */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('common.createAccount', 'Create Account')}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t('common.createAccount', 'Create Account')}</Text>
              )}
            </TouchableOpacity>

            {/* Bottom Switcher Link */}
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerLinkPrompt}>
                {t('auth.haveAccount', 'Already have an account?')}{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/(auth)/login')}
                disabled={loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="link"
              >
                <Text style={styles.footerActionText}>{t('common.signIn', 'Sign In')}</Text>
              </TouchableOpacity>
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
    backgroundColor: '#F7F9F7',
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
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginTop: 2,
    marginBottom: 14,
  },
  brandLogo: {
    width: 200,
    height: 66,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
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
    borderRadius: 11,
    padding: 3,
    marginBottom: 18,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  segmentTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F5132',
  },
  segmentTextInactive: {
    fontSize: 14,
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
    marginBottom: 14,
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
    marginBottom: 13,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 5,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  roleCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    gap: 4,
  },
  roleCardActive: {
    borderColor: '#0F5132',
    backgroundColor: '#E8F5E9',
    borderWidth: 1.8,
  },
  roleCardText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  roleCardTextActive: {
    color: '#0F5132',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    paddingHorizontal: 12,
    height: 46,
  },
  inputWrapperFocused: {
    borderColor: '#0F5132',
    backgroundColor: '#FFFFFF',
  },
  inputWrapperManual: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0F172A',
  },
  inputLeadingIcon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  passwordInput: {
    paddingRight: 6,
  },
  eyeIconButton: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
  },

  // Location Styles
  locationContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitleIcon: {
    marginRight: 5,
  },
  locationTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F5132',
  },
  gpsVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 10,
    gap: 3,
  },
  gpsVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F5132',
  },
  locationLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  locationLoadingText: {
    fontSize: 12.5,
    color: '#0F5132',
    fontWeight: '600',
  },
  locationSuccessBox: {
    marginTop: 2,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 7,
    marginBottom: 8,
  },
  coordsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordsText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0F5132',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  refreshLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  refreshLocText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F5132',
  },
  locationDetailsGrid: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
  },
  locationDetailItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  locationDetailLabel: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  locationDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  villageFieldWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  villageInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    paddingVertical: 2,
  },
  locationErrorBox: {
    marginTop: 2,
  },
  locationErrorText: {
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 17,
    marginBottom: 8,
  },
  locationButtonRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  retryLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F5132',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  retryLocationBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  manualFallbackBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  manualFallbackBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  manualLocationBox: {
    marginTop: 2,
  },
  manualHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  manualBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  useGpsLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F5132',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#0F5132',
    height: 48,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 14,
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
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  footerLinkPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  footerActionText: {
    fontSize: 13,
    color: '#0F5132',
    fontWeight: '700',
  },
});
