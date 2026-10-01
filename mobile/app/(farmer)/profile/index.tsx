/**
 * PashuCare - Luxury Farmer Profile & Settings Screen
 * File: mobile/app/(farmer)/profile/index.tsx
 * 
 * Redesigned using UI/UX Pro Max Intelligence:
 * - Biophilic organic color system (#0F5132 deep forest green, #107C41 emerald, #F6F9F7 surface)
 * - Complete "Edit Profile Details" interactive modal allowing farmers to update their name,
 *   mobile phone, village, block/tehsil, district, state, and preferred language.
 * - Hardware-backed local persistence (SecureStore) + live cloud backend sync
 * - Tactile Claymorphic Herd vital statistics cards
 * - 24x7 1962 National Animal Helpline & 1800-180-1551 Kisan Call Center one-tap calling
 * - Visual Trilingual Language Switcher (English / हिन्दी / मराठी)
 * - Levitating Kisan Saathi AI companion with smooth sinusoidal hover motion
 * - Floating bottom navigation dock with "Profile" active
 * - Strictly zero raw emojis, using crisp dedicated vector icons
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  Animated,
  Easing,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage, SUPPORTED_LANGUAGES, AppLanguage } from '../../../src/services/i18n';
import animalService from '../../../src/services/animalService';
import caseService from '../../../src/services/caseService';
import { calculateVaccinationMetrics } from '../../../src/types/vaccination';
import { colors, radii, shadows } from '../../../src/theme';

// Native typography stack for crisp and reliable rendering
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_SEMIBOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

export default function FarmerProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUserProfile } = useAuth();
  const { language, changeLanguage, t, isEnglish } = useAppLanguage();

  // Herd Vital Statistics
  const [herdStats, setHerdStats] = useState<{
    totalAnimals: number;
    activeCases: number;
    vaccinesDue: number;
  }>({
    totalAnimals: 0,
    activeCases: 0,
    vaccinesDue: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Edit Profile Details Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editVillage, setEditVillage] = useState(user?.village || '');
  const [editBlock, setEditBlock] = useState(user?.block || '');
  const [editDistrict, setEditDistrict] = useState(user?.district || 'Nagpur');
  const [editState, setEditState] = useState(user?.state || 'Maharashtra');
  const [editLang, setEditLang] = useState<AppLanguage>(language);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Floating Levitation Animation for AI Chatbot
  const botFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(botFloatAnim, {
          toValue: -7,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(botFloatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatingLoop.start();
    return () => floatingLoop.stop();
  }, [botFloatAnim]);

  // Sync edit form with current user whenever modal opens
  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setEditVillage(user?.village || '');
    setEditBlock(user?.block || '');
    setEditDistrict(user?.district || 'Nagpur Division');
    setEditState(user?.state || 'Maharashtra');
    setEditLang(language);
    setEditError(null);
    setIsEditModalVisible(true);
  };

  // Load live herd data
  const loadHerdSummary = useCallback(async () => {
    try {
      setStatsLoading(true);
      const [animals, cases] = await Promise.all([
        animalService.getAnimals().catch(() => []),
        caseService.getFarmerCases({ limit: 50 }).catch(() => []),
      ]);

      const vacMetrics = calculateVaccinationMetrics(animals);
      const activeCasesCount = cases.filter((c: any) =>
        ['New', 'OPEN', 'Investigating', 'ACCEPTED', 'Containment', 'IN_TREATMENT'].includes(c.status)
      ).length;

      setHerdStats({
        totalAnimals: animals.length,
        activeCases: activeCasesCount,
        vaccinesDue: (vacMetrics?.due || 0) + (vacMetrics?.overdue || 0),
      });
    } catch (err) {
      console.warn('[Profile] Error loading herd metrics:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHerdSummary();
  }, [loadHerdSummary]);

  // Save updated profile details
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setEditError(isEnglish ? 'Full Name is required.' : 'कृपया पूरा नाम अवश्य भरें।');
      return;
    }
    if (!editPhone.trim() || editPhone.trim().length < 10) {
      setEditError(isEnglish ? 'Please provide a valid 10-digit mobile number.' : 'कृपया 10-अंकीय मान्य मोबाइल नंबर भरें।');
      return;
    }

    setSavingProfile(true);
    setEditError(null);

    try {
      await updateUserProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
        village: editVillage.trim() || undefined,
        block: editBlock.trim() || undefined,
        district: editDistrict.trim() || undefined,
        state: editState.trim() || undefined,
        preferredLanguage: editLang,
      });

      if (editLang !== language) {
        await changeLanguage(editLang);
      }

      setIsEditModalVisible(false);
      Alert.alert(
        isEnglish ? 'Profile Updated' : 'प्रोफाइल अपडेट हो गई',
        isEnglish
          ? 'Your details have been saved successfully.'
          : 'आपकी जानकारी सफलतापूर्वक सुरक्षित कर ली गई है।'
      );
    } catch (err: any) {
      setEditError(err.message || (isEnglish ? 'Failed to save profile changes.' : 'प्रोफाइल सुरक्षित करने में त्रुटि हुई।'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCall = async (phoneNumber: string, label: string) => {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const url = `tel:${cleanPhone}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Dialer Unavailable', `Please dial ${phoneNumber} directly on your phone.`);
      }
    } catch (err) {
      Alert.alert('Call Error', `Unable to initiate call to ${label} (${phoneNumber}).`);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('common.logOut', 'Sign Out'),
      t('profile.signOutConfirm', 'Are you sure you want to sign out from your PashuCare account?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.logOut', 'Sign Out'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/');
            } catch (err: any) {
              Alert.alert('Sign Out Notice', err.message || 'Error signing out.');
            }
          },
        },
      ]
    );
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  // Compute initials for the user avatar
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'RP';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ======================================================== */}
        {/* TOP APP BAR */}
        {/* ======================================================== */}
        <View style={styles.topAppBar}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Image
              source={require('../../../assets/icons/arrow-back.png')}
              style={styles.backArrowIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.appBarTitleCol}>
            <Text style={styles.appBarTitle}>
              {isEnglish ? 'My Profile' : 'मेरी प्रोफाइल'}
            </Text>
            <Text style={styles.appBarSub}>
              {isEnglish ? 'Account details & farm settings' : 'खाता विवरण एवं कृषि सेटिंग्स'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerEditBtn}
            onPress={openEditModal}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
          >
            <Image
              source={require('../../../assets/icons/icon_edit.png')}
              style={styles.headerEditIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerEditText}>
              {isEnglish ? 'Edit' : 'बदलें'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* MAIN SCROLLABLE CONTENT */}
        {/* ======================================================== */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ======================================================== */}
          {/* 1. LUXURY IDENTITY HERO CARD */}
          {/* ======================================================== */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              {/* Circular Avatar with Double Emerald Rings */}
              <View style={styles.heroAvatarRing}>
                <View style={styles.heroAvatarCircle}>
                  <Text style={styles.heroAvatarText}>{userInitials}</Text>
                </View>
                <View style={styles.verifiedCheckBadge}>
                  <Image
                    source={require('../../../assets/icons/checkmark.png')}
                    style={styles.verifiedCheckIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Name & Farmer Badges */}
              <View style={styles.heroIdentityCol}>
                <Text style={styles.heroFarmerName} numberOfLines={2}>
                  {user?.name || (isEnglish ? 'Ramesh Patil' : 'रमेश पाटील')}
                </Text>

                <View style={styles.heroBadgeRow}>
                  <View style={styles.roleBadgePill}>
                    <Image
                      source={require('../../../assets/icons/tractor.png')}
                      style={styles.roleBadgeIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.roleBadgeText}>
                      {isEnglish ? 'Farmer • किसान' : 'किसान (Farmer)'}
                    </Text>
                  </View>

                  <View style={styles.verifiedPill}>
                    <Text style={styles.verifiedPillText}>
                      {isEnglish ? 'Verified' : 'सत्यापित'}
                    </Text>
                  </View>
                </View>

                {/* Location Chip */}
                <View style={styles.heroLocationRow}>
                  <Image
                    source={require('../../../assets/icons/icon_pin.png')}
                    style={styles.heroPinIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.heroLocationText} numberOfLines={1}>
                    {user?.village ? `${user.village}, ` : ''}
                    {user?.district || 'Nagpur Division'}, {user?.state || 'Maharashtra'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Primary Action: Change / Edit Details Button */}
            <TouchableOpacity
              style={styles.heroChangeDetailsBtn}
              onPress={openEditModal}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Change profile details"
            >
              <Image
                source={require('../../../assets/icons/icon_edit.png')}
                style={styles.heroChangeDetailsIcon}
                resizeMode="contain"
              />
              <Text style={styles.heroChangeDetailsText}>
                {isEnglish ? 'Change My Details' : 'अपनी जानकारी बदलें'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ======================================================== */}
          {/* 2. HERD & FARM VITAL METRICS (CLAYMORPHIC) */}
          {/* ======================================================== */}
          <View style={styles.vitalsSection}>
            <Text style={styles.sectionHeaderTitle}>
              {isEnglish ? 'Farm & Herd Overview' : 'फार्म एवं पशुधन स्थिति'}
            </Text>

            <View style={styles.vitalsGrid}>
              {/* Card 1: Registered Animals */}
              <TouchableOpacity
                style={styles.vitalCard}
                onPress={() => router.push('/(farmer)/animals' as any)}
                activeOpacity={0.82}
              >
                <View style={[styles.vitalIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Image
                    source={require('../../../assets/icons/premium/cow_transparent.png')}
                    style={styles.vitalIconImg}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.vitalNumber}>
                  {statsLoading ? '-' : herdStats.totalAnimals}
                </Text>
                <Text style={styles.vitalTitle}>{isEnglish ? 'My Livestock' : 'पशुधन'}</Text>
                <Text style={styles.vitalSub}>{isEnglish ? 'Registered' : 'पंजीकृत'}</Text>
              </TouchableOpacity>

              {/* Card 2: Active Cases */}
              <TouchableOpacity
                style={styles.vitalCard}
                onPress={() => router.push('/(farmer)/cases' as any)}
                activeOpacity={0.82}
              >
                <View style={[styles.vitalIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Image
                    source={require('../../../assets/icons/premium/case_transparent.png')}
                    style={styles.vitalIconImg}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[
                    styles.vitalNumber,
                    herdStats.activeCases > 0 && { color: '#B45309' },
                  ]}
                >
                  {statsLoading ? '-' : herdStats.activeCases}
                </Text>
                <Text style={styles.vitalTitle}>{isEnglish ? 'Active Cases' : 'सक्रिय मामले'}</Text>
                <Text style={styles.vitalSub}>{isEnglish ? 'Ongoing triage' : 'निगरानी में'}</Text>
              </TouchableOpacity>

              {/* Card 3: Vaccines Due */}
              <TouchableOpacity
                style={styles.vitalCard}
                onPress={() => router.push('/(farmer)/vaccination' as any)}
                activeOpacity={0.82}
              >
                <View style={[styles.vitalIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Image
                    source={require('../../../assets/icons/premium/vaccine_vial_transparent.png')}
                    style={styles.vitalIconImg}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.vitalNumber}>
                  {statsLoading ? '-' : herdStats.vaccinesDue}
                </Text>
                <Text style={styles.vitalTitle}>{isEnglish ? 'Vaccines Due' : 'टीके बाकी'}</Text>
                <Text style={styles.vitalSub}>{isEnglish ? 'Due soon' : 'शीघ्र देय'}</Text>
              </TouchableOpacity>

              {/* Card 4: Farm Location */}
              <View style={styles.vitalCard}>
                <View style={[styles.vitalIconCircle, { backgroundColor: '#F3E8FF' }]}>
                  <Image
                    source={require('../../../assets/icons/location.png')}
                    style={[styles.vitalIconImg, { tintColor: '#7E22CE' }]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.vitalNumberDistrict} numberOfLines={1}>
                  {user?.district || 'Nagpur'}
                </Text>
                <Text style={styles.vitalTitle}>{isEnglish ? 'District' : 'ज़िला'}</Text>
                <Text style={styles.vitalSub}>{user?.state || 'Maharashtra'}</Text>
              </View>
            </View>
          </View>

          {/* ======================================================== */}
          {/* 3. VERIFIED PERSONAL & FARM DETAILS */}
          {/* ======================================================== */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeaderTitle}>
                  {isEnglish ? 'Personal & Farm Details' : 'व्यक्तिगत एवं कृषि विवरण'}
                </Text>
                <Text style={styles.sectionHeaderSub}>
                  {isEnglish ? 'Official registration on PashuCare' : 'पशुकेयर पर आधिकारिक पंजीकृत जानकारी'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sectionEditAction}
                onPress={openEditModal}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionEditActionText}>
                  {isEnglish ? 'Edit' : 'बदलें'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailsCard}>
              {/* Row 1: Full Name */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Image
                    source={require('../../../assets/icons/person.png')}
                    style={styles.detailRowIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailFieldLabel}>{isEnglish ? 'Full Name' : 'पूरा नाम'}</Text>
                  <Text style={styles.detailFieldValue}>{user?.name || (isEnglish ? 'Ramesh Patil' : 'रमेश पाटील')}</Text>
                </View>
              </View>

              <View style={styles.detailDivider} />

              {/* Row 2: Mobile Phone */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Image
                    source={require('../../../assets/icons/phone.png')}
                    style={styles.detailRowIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailFieldLabel}>{isEnglish ? 'Mobile Phone' : 'मोबाइल नंबर'}</Text>
                  <Text style={styles.detailFieldValue}>{user?.phone || '+91 98220 11223'}</Text>
                </View>
              </View>

              <View style={styles.detailDivider} />

              {/* Row 3: Email Address */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Image
                    source={require('../../../assets/icons/mail.png')}
                    style={styles.detailRowIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailFieldLabel}>{isEnglish ? 'Email Address' : 'ईमेल पता'}</Text>
                  <Text style={styles.detailFieldValue} numberOfLines={1}>
                    {user?.email || 'farmer@pashurakshak.in'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailDivider} />

              {/* Row 4: Village & Block */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Image
                    source={require('../../../assets/icons/home.png')}
                    style={styles.detailRowIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailFieldLabel}>{isEnglish ? 'Village & Tehsil' : 'गाँव एवं तहसील'}</Text>
                  <Text style={styles.detailFieldValue}>
                    {user?.village || (isEnglish ? 'Yerkheda' : 'येरखेड़ा')}, {user?.block || (isEnglish ? 'Saoner' : 'सावनेर')}
                  </Text>
                </View>
              </View>

              <View style={styles.detailDivider} />

              {/* Row 5: District & State */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Image
                    source={require('../../../assets/icons/location.png')}
                    style={styles.detailRowIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailFieldLabel}>{isEnglish ? 'District & State' : 'ज़िला एवं राज्य'}</Text>
                  <Text style={styles.detailFieldValue}>
                    {user?.district || 'Nagpur Division'}, {user?.state || 'Maharashtra'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ======================================================== */}
          {/* 4. APP LANGUAGE PREFERENCE (TRILINGUAL CARDS) */}
          {/* ======================================================== */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeaderTitle}>
                  {isEnglish ? 'App Language' : 'ऐप की भाषा'}
                </Text>
                <Text style={styles.sectionHeaderSub}>
                  {isEnglish ? 'Select your interface language' : 'अपनी पसंदीदा भाषा चुनें'}
                </Text>
              </View>
            </View>

            <View style={styles.languageCardsRow}>
              {SUPPORTED_LANGUAGES.map((langOption) => {
                const isSelected = language === langOption.code;
                return (
                  <TouchableOpacity
                    key={langOption.code}
                    style={[
                      styles.langCardItem,
                      isSelected && styles.langCardItemSelected,
                    ]}
                    onPress={() => changeLanguage(langOption.code)}
                    activeOpacity={0.82}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={langOption.label}
                  >
                    <View style={styles.langTopRow}>
                      <Text style={styles.langFlagText}>{langOption.flagEmoji}</Text>
                      <View style={[styles.langRadioCircle, isSelected && styles.langRadioCircleActive]}>
                        {isSelected && <View style={styles.langRadioDot} />}
                      </View>
                    </View>
                    <Text style={[styles.langNativeTitle, isSelected && styles.langNativeTitleActive]}>
                      {langOption.nativeLabel}
                    </Text>
                    <Text style={styles.langSubTitle}>{langOption.subLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ======================================================== */}
          {/* 5. 24x7 EMERGENCY & GOVERNMENT HELPLINES */}
          {/* ======================================================== */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeaderTitle}>
              {isEnglish ? 'Government Helplines' : 'सरकारी सहायता एवं हेल्पलाइन'}
            </Text>
            <Text style={styles.sectionHeaderSub}>
              {isEnglish ? 'Toll-free 24x7 livestock medical assistance' : '24x7 निःशुल्क पशु चिकित्सा एवं कृषि मार्गदर्शन'}
            </Text>

            {/* Helpline 1: National Animal Emergency (1962) */}
            <TouchableOpacity
              style={styles.helplineBanner}
              onPress={() => handleCall('1962', 'National Veterinary Emergency Helpline')}
              activeOpacity={0.85}
            >
              <View style={[styles.helplineIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Image
                  source={require('../../../assets/icons/icon_phone_call.png')}
                  style={[styles.helplineCallIcon, { tintColor: '#DC2626' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.helplineTextCol}>
                <Text style={styles.helplineTitle}>
                  {isEnglish ? 'National Veterinary Helpline' : 'राष्ट्रीय पशु चिकित्सा हेल्पलाइन'}
                </Text>
                <Text style={styles.helplineNumber}>1962 (Toll Free • 24x7)</Text>
              </View>
              <View style={styles.helplineCallBtn}>
                <Text style={styles.helplineCallBtnText}>{isEnglish ? 'Call' : 'कॉल'}</Text>
              </View>
            </TouchableOpacity>

            {/* Helpline 2: Kisan Call Center (1800-180-1551) */}
            <TouchableOpacity
              style={[styles.helplineBanner, { marginTop: 10 }]}
              onPress={() => handleCall('18001801551', 'Kisan Call Center')}
              activeOpacity={0.85}
            >
              <View style={[styles.helplineIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Image
                  source={require('../../../assets/icons/icon_phone_call.png')}
                  style={[styles.helplineCallIcon, { tintColor: '#0284C7' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.helplineTextCol}>
                <Text style={styles.helplineTitle}>
                  {isEnglish ? 'Kisan Call Center' : 'किसान कॉल सेंटर'}
                </Text>
                <Text style={styles.helplineNumber}>1800-180-1551 (Toll Free)</Text>
              </View>
              <View style={[styles.helplineCallBtn, { backgroundColor: '#0284C7' }]}>
                <Text style={styles.helplineCallBtnText}>{isEnglish ? 'Call' : 'कॉल'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ======================================================== */}
          {/* 6. APP INFO & SECURITY */}
          {/* ======================================================== */}
          <View style={styles.sectionContainer}>
            <View style={styles.appInfoCard}>
              <View style={styles.appInfoRow}>
                <Image
                  source={require('../../../assets/icons/shield.png')}
                  style={styles.appInfoIcon}
                  resizeMode="contain"
                />
                <View style={styles.appInfoTextCol}>
                  <Text style={styles.appInfoTitle}>PashuCare • पशुकेयर</Text>
                  <Text style={styles.appInfoSub}>Version {appVersion} • Encrypted Offline Storage</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ======================================================== */}
          {/* 7. SIGN OUT BUTTON */}
          {/* ======================================================== */}
          <TouchableOpacity
            style={styles.signOutCard}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <Text style={styles.signOutText}>
              {isEnglish ? 'Sign Out from PashuCare' : 'पशुकेयर से साइन आउट करें'}
            </Text>
          </TouchableOpacity>

          {/* Bottom spacing for floating navigation dock */}
          <View style={{ height: 110 }} />
        </ScrollView>

        {/* ======================================================== */}
        {/* 8. FLOATING KISAN SAATHI AI BOT (SMOOTH HOVER LEVITATION) */}
        {/* ======================================================== */}
        <Animated.View
          style={[
            styles.floatingAiBotWrapper,
            { transform: [{ translateY: botFloatAnim }] },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingAiBot}
            onPress={() => router.push('/(farmer)/kisan-saathi' as any)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Kisan Saathi AI Assistant"
          >
            <Image
              source={require('../../../assets/icons/floating_bot.png')}
              style={styles.floatingAiIcon}
              resizeMode="contain"
            />
            <View style={styles.floatingAiPill}>
              <Text style={styles.floatingAiPillText}>AI</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ======================================================== */}
        {/* 9. FLOATING BOTTOM NAVIGATION DOCK (PROFILE ACTIVE) */}
        {/* ======================================================== */}
        <View style={styles.floatingNavContainer} pointerEvents="box-none">
          <View style={styles.bottomNavDock}>
            {/* Tab 1: Home */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)')}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'Home' : 'होम'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_home.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'Home' : 'होम'}</Text>
            </TouchableOpacity>

            {/* Tab 2: My Herd */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)/animals' as any)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'My Herd' : 'मेरे पशु'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_cow.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'My Herd' : 'मेरे पशु'}</Text>
            </TouchableOpacity>

            {/* Tab 3: Center Elevated Scan */}
            <TouchableOpacity
              style={styles.navCenterScanItem}
              onPress={() => router.push('/(farmer)/ai-scan' as any)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={isEnglish ? 'AI Disease Scan' : 'रोग स्कैन'}
            >
              <View style={styles.navCenterScanCircle}>
                <Image
                  source={require('../../../assets/icons/nav_scan.png')}
                  style={styles.navCenterScanIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navCenterScanLabel}>{isEnglish ? 'Scan' : 'स्कैन'}</Text>
            </TouchableOpacity>

            {/* Tab 4: Services */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => router.push('/(farmer)/vaccination' as any)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={isEnglish ? 'Services' : 'सेवाएं'}
            >
              <View style={styles.navInactiveIconBox}>
                <Image
                  source={require('../../../assets/icons/nav_grid.png')}
                  style={[styles.navIconImage, { tintColor: '#334155' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.navTabLabel}>{isEnglish ? 'Services' : 'सेवाएं'}</Text>
            </TouchableOpacity>

            {/* Tab 5: Profile (ACTIVE ON THIS PAGE) */}
            <TouchableOpacity
              style={styles.navTabItem}
              onPress={() => {}}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: true }}
              accessibilityLabel={isEnglish ? 'Profile' : 'प्रोफाइल'}
            >
              <View style={styles.navActiveIconBadge}>
                <Image
                  source={require('../../../assets/icons/nav_profile.png')}
                  style={[styles.navIconImage, { width: 26, height: 26, tintColor: '#0F5132' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.navTabLabel, styles.navTabLabelActive]}>
                {isEnglish ? 'Profile' : 'प्रोफाइल'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 10. EDIT PROFILE DETAILS MODAL */}
        {/* ======================================================== */}
        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContentCard}>
              {/* Modal Top Grabber Bar */}
              <View style={styles.modalGrabberBar} />

              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalHeaderTitle}>
                    {isEnglish ? 'Edit Profile Details' : 'प्रोफाइल विवरण बदलें'}
                  </Text>
                  <Text style={styles.modalHeaderSub}>
                    {isEnglish ? 'Update personal and farm location info' : 'व्यक्तिगत एवं कृषि विवरण अपडेट करें'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setIsEditModalVisible(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {editError && (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{editError}</Text>
                </View>
              )}

              {/* Modal Form ScrollView */}
              <ScrollView
                style={styles.modalFormScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Field 1: Full Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{isEnglish ? 'Full Name *' : 'पूरा नाम *'}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder={isEnglish ? 'e.g. Ramesh Patil' : 'उदा. रमेश पाटील'}
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Field 2: Mobile Number */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{isEnglish ? 'Mobile Phone *' : 'मोबाइल नंबर *'}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Field 3: Village */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{isEnglish ? 'Village / Town' : 'गाँव / कस्बा'}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editVillage}
                    onChangeText={setEditVillage}
                    placeholder={isEnglish ? 'e.g. Malegaon' : 'उदा. मालेगांव'}
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Field 4: Block / Tehsil */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{isEnglish ? 'Block / Tehsil' : 'तहसील / ब्लॉक'}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editBlock}
                    onChangeText={setEditBlock}
                    placeholder={isEnglish ? 'e.g. Saoner' : 'उदा. सावनेर'}
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Field 5: District */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{isEnglish ? 'District' : 'ज़िला'}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editDistrict}
                    onChangeText={setEditDistrict}
                    placeholder={isEnglish ? 'e.g. Nagpur' : 'उदा. नागपुर'}
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Field 6: State */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{isEnglish ? 'State' : 'राज्य'}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editState}
                    onChangeText={setEditState}
                    placeholder="Maharashtra"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Field 7: Preferred App Language */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{isEnglish ? 'Preferred Language' : 'पसंदीदा भाषा'}</Text>
                  <View style={styles.modalLangChipsRow}>
                    {(['en', 'hi', 'mr'] as AppLanguage[]).map((c) => {
                      const isSel = editLang === c;
                      const label = c === 'en' ? 'English' : c === 'hi' ? 'हिन्दी' : 'मराठी';
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[styles.modalLangChip, isSel && styles.modalLangChipActive]}
                          onPress={() => setEditLang(c)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.modalLangChipText, isSel && styles.modalLangChipTextActive]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>

              {/* Modal Action Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsEditModalVisible(false)}
                  disabled={savingProfile}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>
                    {isEnglish ? 'Cancel' : 'रद्द करें'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                  activeOpacity={0.85}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>
                      {isEnglish ? 'Save Details' : 'विवरण सुरक्षित करें'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  safeArea: {
    flex: 1,
  },

  /* TOP APP BAR */
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrowIcon: {
    width: 20,
    height: 20,
    tintColor: '#0F5132',
  },
  appBarTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  appBarTitle: {
    fontSize: 18.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  appBarSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    gap: 5,
  },
  headerEditIcon: {
    width: 14,
    height: 14,
    tintColor: '#0F5132',
  },
  headerEditText: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },

  /* SCROLL CONTAINER */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  /* 1. HERO IDENTITY CARD */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAvatarRing: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: '#107C41',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
  },
  heroAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontSize: 22,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#107C41',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedCheckIcon: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
  },
  heroIdentityCol: {
    flex: 1,
    marginLeft: 14,
  },
  heroFarmerName: {
    fontSize: 18,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  roleBadgeIcon: {
    width: 12,
    height: 12,
    tintColor: '#0F5132',
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },
  verifiedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedPillText: {
    fontSize: 10.5,
    fontFamily: FONT_SEMIBOLD,
    fontWeight: '700',
    color: '#15803D',
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  heroPinIcon: {
    width: 12,
    height: 12,
    tintColor: '#64748B',
  },
  heroLocationText: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
  },
  heroChangeDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F5132',
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  heroChangeDetailsIcon: {
    width: 15,
    height: 15,
    tintColor: '#FFFFFF',
  },
  heroChangeDetailsText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* 2. VITALS SECTION */
  vitalsSection: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 15.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  sectionHeaderSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginBottom: 10,
  },
  vitalsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  vitalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  vitalIconImg: {
    width: 26,
    height: 26,
  },
  vitalNumber: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  vitalNumberDistrict: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  vitalTitle: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
    textAlign: 'center',
  },
  vitalSub: {
    fontSize: 9.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },

  /* 3. SECTION CONTAINER & DETAILS CARD */
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionEditAction: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  sectionEditActionText: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRowIcon: {
    width: 16,
    height: 16,
    tintColor: '#0F5132',
  },
  detailTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  detailFieldLabel: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
  },
  detailFieldValue: {
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 48,
  },

  /* 4. LANGUAGE SELECTOR CARDS */
  languageCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langCardItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  langCardItemSelected: {
    borderColor: '#0F5132',
    backgroundColor: '#F4FBF6',
  },
  langTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  langFlagText: {
    fontSize: 22,
  },
  langRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langRadioCircleActive: {
    borderColor: '#0F5132',
    backgroundColor: '#FFFFFF',
  },
  langRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F5132',
  },
  langNativeTitle: {
    fontSize: 14.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#1E293B',
  },
  langNativeTitleActive: {
    color: '#0F5132',
  },
  langSubTitle: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 2,
  },

  /* 5. HELPLINES */
  helplineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helplineIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineCallIcon: {
    width: 18,
    height: 18,
  },
  helplineTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  helplineTitle: {
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F172A',
  },
  helplineNumber: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  helplineCallBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  helplineCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* 6. APP INFO */
  appInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appInfoIcon: {
    width: 20,
    height: 20,
    tintColor: '#0F5132',
  },
  appInfoTextCol: {
    marginLeft: 10,
  },
  appInfoTitle: {
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#1E293B',
  },
  appInfoSub: {
    fontSize: 10.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },

  /* 7. SIGN OUT */
  signOutCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 6,
  },
  signOutText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* 8. FLOATING AI CHAT BOT */
  floatingAiBotWrapper: {
    position: 'absolute',
    bottom: 92,
    right: 18,
    zIndex: 99,
  },
  floatingAiBot: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#107C41',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  floatingAiIcon: {
    width: 61,
    height: 61,
    borderRadius: 30.5,
  },
  floatingAiPill: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  floatingAiPillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },

  /* 9. FLOATING BOTTOM NAVIGATION DOCK */
  floatingNavContainer: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    zIndex: 90,
  },
  bottomNavDock: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  navTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navInactiveIconBox: {
    width: 36,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActiveIconBadge: {
    width: 44,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconImage: {
    width: 22,
    height: 22,
  },
  navTabLabel: {
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginTop: 2,
  },
  navTabLabelActive: {
    color: '#0F5132',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  navCenterScanItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    marginHorizontal: 4,
  },
  navCenterScanCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  navCenterScanIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  navCenterScanLabel: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
    marginTop: 2,
  },

  /* 10. EDIT PROFILE MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
  },
  modalGrabberBar: {
    width: 44,
    height: 4.5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 17.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHeaderSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
  },
  modalErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  modalErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
  },
  modalFormScroll: {
    maxHeight: 440,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    fontFamily: FONT_MEDIUM,
    color: '#0F172A',
  },
  modalLangChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  modalLangChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLangChipActive: {
    borderColor: '#0F5132',
    backgroundColor: '#E8F5E9',
  },
  modalLangChipText: {
    fontSize: 12.5,
    fontFamily: FONT_MEDIUM,
    color: '#475569',
  },
  modalLangChipTextActive: {
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#0F5132',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#475569',
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 13.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
