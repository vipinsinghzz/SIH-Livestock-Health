/**
 * PashuCare - District Officer Profile & Administrative Settings Screen
 * File: mobile/app/(officer)/profile/index.tsx
 *
 * Centralized executive profile for District Veterinary & Animal Husbandry Officers.
 * Displays official administrative credentials, jurisdiction scope, epidemic surveillance metrics,
 * institutional emergency helplines, reactive multilingual preference switcher, and secure session termination.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage, SUPPORTED_LANGUAGES } from '../../../src/services/i18n';
import { officerService } from '../../../src/services/officerService';
import { DashboardSummary } from '../../../src/types/officer';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import { OfficerFloatingNav } from '../../../src/components/OfficerFloatingNav';

// Static asset icons for quick access and executive operations
const ICON_SURVEILLANCE = require('../../../assets/icons/stat_case.png');
const ICON_ALERT = require('../../../assets/icons/stat_alert.png');
const ICON_SHIELD = require('../../../assets/icons/shield.png');
const ICON_VACCINE = require('../../../assets/icons/stat_vaccine.png');
const ICON_LOCATION = require('../../../assets/icons/location.png');
const ICON_BELL = require('../../../assets/icons/bell_minimal_green.png');
const ICON_WARN = require('../../../assets/icons/alert.png');
const ICON_PHONE = require('../../../assets/icons/phone.png');
const ICON_MICROSCOPE = require('../../../assets/icons/icon_microscope.png');
const ICON_BUSINESS = require('../../../assets/icons/business.png');
const ICON_INFO = require('../../../assets/icons/clipboard.png');

export default function OfficerProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { language, changeLanguage, t, isEnglish } = useAppLanguage();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const userId = user?.id || (user as any)?._id || 'officer_default';

  // Load official district surveillance overview
  const loadSurveillanceOverview = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const result = await officerService.getDashboardSummary(userId, {
        district: user?.district,
      });
      setSummary(result.summary);
    } catch (err: any) {
      console.warn('[OfficerProfile] Unable to load surveillance metrics:', err?.message || err);
    } finally {
      setLoadingSummary(false);
    }
  }, [userId, user?.district]);

  useEffect(() => {
    loadSurveillanceOverview();
  }, [loadSurveillanceOverview]);

  const handleCall = async (phoneNumber: string, label: string) => {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const url = `tel:${cleanPhone}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Dialer Unavailable',
          `Could not open phone dialer for ${label}. Please call ${phoneNumber} directly.`
        );
      }
    } catch {
      Alert.alert(
        'Dialer Error',
        `Unable to initiate call to ${label} (${phoneNumber}). Please dial manually.`
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('common.logOut', 'Sign Out'),
      t('officer.signOutConfirm', 'Are you sure you want to sign out from the Officer Command Center?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.logOut', 'Sign Out'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (err: any) {
              Alert.alert('Sign Out Notice', err?.message || 'Error signing out.');
            }
          },
        },
      ]
    );
  };

  // Safe administrative attributes from authenticated officer context
  const officerName = user?.name || 'Dr. Suresh Kulkarni';
  const officerRole = user?.role === 'officer'
    ? t('officer.designationVal', 'District Animal Husbandry Officer (DAHO)')
    : user?.role === 'admin'
    ? 'State Animal Husbandry Administrator'
    : user?.role || t('auth.officer', 'Officer');
  const districtName = user?.district || 'Nagpur';
  const stateName = user?.state || 'Maharashtra';
  const blockName = user?.block || 'Saoner';
  const departmentName = user?.department || 'Department of Animal Husbandry, Govt. of Maharashtra';
  const officialEmail = user?.email || 'officer@pashurakshak.in';
  const officialPhone = user?.phone || '+91 98220 33445';

  // Compute initials for the executive avatar badge
  const initials = officerName
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SK';

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Executive Officer Identity Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.executiveHeaderBanner}>
            <Image
              source={ICON_BUSINESS}
              style={{ width: 14, height: 14, tintColor: colors.light.officerBadge, marginRight: 6 }}
              resizeMode="contain"
            />
            <Text style={styles.executiveBannerText}>
              {t('officer.executiveBadge', 'GOVT. OF MAHARASHTRA • ANIMAL HUSBANDRY')}
            </Text>
          </View>

          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.userName}>{officerName}</Text>
          <Text style={styles.userRoleSubtitle}>{officerRole}</Text>

          <View style={styles.jurisdictionPill}>
            <Image
              source={ICON_LOCATION}
              style={{ width: 12, height: 12, tintColor: colors.light.textSecondary, marginRight: 4 }}
              resizeMode="contain"
            />
            <Text style={styles.jurisdictionPillText}>
              {districtName} {t('officer.districtJurisdiction', 'District Jurisdiction')}
            </Text>
          </View>
        </View>

      {/* 2. Official Administrative Credentials Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('officer.officialDetails', 'Administrative Credentials')}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('officer.officerName', 'Officer Name')}</Text>
          <Text style={styles.detailValue}>{officerName}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('officer.designation', 'Designation')}</Text>
          <Text style={[styles.detailValue, styles.highlightValue]}>{officerRole}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('officer.department', 'Department / Office')}</Text>
          <Text style={styles.detailValue} numberOfLines={2}>{departmentName}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('officer.districtJurisdiction', 'District Jurisdiction')}</Text>
          <Text style={styles.detailValue}>{districtName}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('officer.headquarters', 'Headquarters / Tehsil')}</Text>
          <Text style={styles.detailValue}>{blockName}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('officer.stateJurisdiction', 'State')}</Text>
          <Text style={styles.detailValue}>{stateName}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('officer.officialEmail', 'Official Email')}</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{officialEmail}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('officer.officialPhone', 'Official Phone')}</Text>
          <Text style={styles.detailValue}>{officialPhone}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('officer.authorityLevel', 'Authority Level')}</Text>
          <Text style={[styles.detailValue, { color: colors.light.officerBadge }]}>
            {t('officer.authorityLevelVal', 'Class-I Gazetted Surveillance Officer')}
          </Text>
        </View>

        {/* Read-Only Administrative Notice */}
        <View style={styles.noticeBox}>
          <Image
            source={ICON_INFO}
            style={{ width: 16, height: 16, tintColor: '#7C3AED' }}
            resizeMode="contain"
          />
          <Text style={styles.noticeText}>
            {t(
              'officer.readOnlyNotice',
              'Official postings, jurisdictions, and designations are maintained centrally by the State Directorate of Animal Husbandry.'
            )}
          </Text>
        </View>
      </View>

      {/* 3. District Epidemiological Surveillance Snapshot */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          {t('officer.jurisdictionSummary', 'District Surveillance Overview')}
        </Text>
        <Text style={styles.sectionSub}>
          {t(
            'officer.jurisdictionSummarySub',
            'Live status of district-wide disease containment and vaccination drives.'
          )}
        </Text>

        {loadingSummary ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.light.officerBadge} />
            <Text style={styles.loadingText}>
              {t('common.loading', 'Loading surveillance metrics...')}
            </Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {/* Total Reports */}
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{summary?.totalReports ?? '-'}</Text>
              <Text style={styles.statLabel}>{t('officer.totalReports', 'TOTAL REPORTS')}</Text>
              <Text style={styles.statSub}>District records</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Active Cases */}
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statNumber,
                  (summary?.activeCases ?? 0) > 0 && { color: colors.light.info },
                ]}
              >
                {summary?.activeCases ?? '-'}
              </Text>
              <Text style={styles.statLabel}>{t('officer.activeCases', 'ACTIVE CASES')}</Text>
              <Text style={styles.statSub}>Investigating</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Outbreaks */}
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statNumber,
                  (summary?.triageMetrics?.outbreakCount ?? 0) > 0 && { color: colors.light.danger },
                ]}
              >
                {summary?.triageMetrics?.outbreakCount ?? '0'}
              </Text>
              <Text style={styles.statLabel}>{t('officer.activeClusters', 'CLUSTERS')}</Text>
              <Text style={styles.statSub}>DBSCAN hot</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Vaccination */}
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statNumber,
                  { color: colors.light.success },
                ]}
              >
                {summary?.vaccination?.coveragePct ?? 0}%
              </Text>
              <Text style={styles.statLabel}>{t('officer.vaccineCoverage', 'COVERAGE')}</Text>
              <Text style={styles.statSub}>Target herd</Text>
            </View>
          </View>
        )}
      </View>

      {/* 4. Quick Access & Command Operations (Logos over options) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {isEnglish ? 'Quick Access & Command Operations' : 'त्वरित पहुंच एवं संचालन'}
          </Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{isEnglish ? '8 Modules' : '८ मॉड्यूल'}</Text>
          </View>
        </View>
        <Text style={styles.sectionSub}>
          {isEnglish
            ? 'Instant access to surveillance, outbreak alerts, biosecurity & district logistics.'
            : 'निगरानी, प्रकोप अलर्ट, बायोसिक्योरिटी एवं ज़िला रसद के त्वरित मॉड्यूल।'}
        </Text>

        <View style={styles.shortcutsGrid}>
          {/* Module 1: Epidemic Surveillance */}
          <TouchableOpacity
            style={[styles.shortcutCard, { borderColor: '#C7D2FE' }]}
            onPress={() => router.push('/(officer)/surveillance' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Image source={ICON_SURVEILLANCE} style={[styles.shortcutIconImg, { tintColor: '#4338CA' }]} resizeMode="contain" />
            </View>
            <Text style={styles.shortcutCardTitle} numberOfLines={1}>
              {isEnglish ? 'Surveillance' : 'निगरानी'}
            </Text>
            <Text style={styles.shortcutCardSub} numberOfLines={1}>
              {isEnglish ? 'Triage & Cases' : 'ट्रायज व केस'}
            </Text>
          </TouchableOpacity>

          {/* Module 2: Outbreak Alerts */}
          <TouchableOpacity
            style={[styles.shortcutCard, { borderColor: '#FDE68A' }]}
            onPress={() => router.push('/(officer)/outbreaks' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Image source={ICON_ALERT} style={[styles.shortcutIconImg, { tintColor: '#B45309' }]} resizeMode="contain" />
            </View>
            <Text style={styles.shortcutCardTitle} numberOfLines={1}>
              {isEnglish ? 'Outbreak Alerts' : 'प्रकोप अलर्ट'}
            </Text>
            <Text style={styles.shortcutCardSub} numberOfLines={1}>
              {isEnglish ? 'Proximity Alarms' : 'सक्रिय क्लस्टर'}
            </Text>
          </TouchableOpacity>

          {/* Module 3: Containment Zones */}
          <TouchableOpacity
            style={[styles.shortcutCard, { borderColor: '#DDD6FE' }]}
            onPress={() => router.push('/(officer)/containment' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Image source={ICON_SHIELD} style={[styles.shortcutIconImg, { tintColor: '#7C3AED' }]} resizeMode="contain" />
            </View>
            <Text style={styles.shortcutCardTitle} numberOfLines={1}>
              {isEnglish ? 'Containment' : 'कंटेनमेंट'}
            </Text>
            <Text style={styles.shortcutCardSub} numberOfLines={1}>
              {isEnglish ? 'Quarantine Zones' : 'घेराबंदी व परिधि'}
            </Text>
          </TouchableOpacity>

          {/* Module 4: Mass Vaccination */}
          <TouchableOpacity
            style={[styles.shortcutCard, { borderColor: '#A7F3D0' }]}
            onPress={() => router.push('/(officer)/vaccination' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Image source={ICON_VACCINE} style={[styles.shortcutIconImg, { tintColor: '#059669' }]} resizeMode="contain" />
            </View>
            <Text style={styles.shortcutCardTitle} numberOfLines={1}>
              {isEnglish ? 'Vaccination' : 'टीकाकरण'}
            </Text>
            <Text style={styles.shortcutCardSub} numberOfLines={1}>
              {isEnglish ? 'Camps & Logistics' : 'शिविर एवं रसद'}
            </Text>
          </TouchableOpacity>

          {/* Module 5: District GIS Map */}
          <TouchableOpacity
            style={[styles.shortcutCard, { borderColor: '#BAE6FD' }]}
            onPress={() => router.push('/(officer)/map' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Image source={ICON_LOCATION} style={[styles.shortcutIconImg, { tintColor: '#0284C7' }]} resizeMode="contain" />
            </View>
            <Text style={styles.shortcutCardTitle} numberOfLines={1}>
              {isEnglish ? 'GIS Radar Map' : 'जीआईएस मैप'}
            </Text>
            <Text style={styles.shortcutCardSub} numberOfLines={1}>
              {isEnglish ? 'Spatial Heatmaps' : 'नक्शा व क्लस्टर'}
            </Text>
          </TouchableOpacity>

          {/* Module 6: Official Advisories */}
          <TouchableOpacity
            style={[styles.shortcutCard, { borderColor: '#FEF08A' }]}
            onPress={() => router.push('/(officer)/advisories' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#FEF9C3' }]}>
              <Image source={ICON_BELL} style={[styles.shortcutIconImg, { tintColor: '#CA8A04' }]} resizeMode="contain" />
            </View>
            <Text style={styles.shortcutCardTitle} numberOfLines={1}>
              {isEnglish ? 'Advisories' : 'आधिकारिक परामर्श'}
            </Text>
            <Text style={styles.shortcutCardSub} numberOfLines={1}>
              {isEnglish ? 'Farmer Directives' : 'बायोसिक्योरिटी'}
            </Text>
          </TouchableOpacity>

          {/* Module 7: NADRES Forewarning */}
          <TouchableOpacity
            style={[styles.shortcutCard, { borderColor: '#FECACA' }]}
            onPress={() => router.push('/(officer)/forewarning' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Image source={ICON_WARN} style={[styles.shortcutIconImg, { tintColor: '#DC2626' }]} resizeMode="contain" />
            </View>
            <Text style={styles.shortcutCardTitle} numberOfLines={1}>
              {isEnglish ? 'NADRES Radar' : 'नाड्रेस पूर्व-चेतावनी'}
            </Text>
            <Text style={styles.shortcutCardSub} numberOfLines={1}>
              {isEnglish ? 'ICAR Risk Matrix' : 'आईसीआर मैट्रिक्स'}
            </Text>
          </TouchableOpacity>

          {/* Module 8: 1962 Emergency Hotline */}
          <TouchableOpacity
            style={[styles.shortcutCard, { borderColor: '#CBD5E1' }]}
            onPress={() => handleCall('1962', 'National Veterinary Emergency')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Image source={ICON_PHONE} style={[styles.shortcutIconImg, { tintColor: '#334155' }]} resizeMode="contain" />
            </View>
            <Text style={styles.shortcutCardTitle} numberOfLines={1}>
              {isEnglish ? '1962 Helpline' : '1962 हेल्पलाइन'}
            </Text>
            <Text style={styles.shortcutCardSub} numberOfLines={1}>
              {isEnglish ? 'Emergency Direct' : 'आपातकालीन सहायता'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. Official Institutional Helplines */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          {t('officer.officialHelplines', 'Official Institutional Helplines')}
        </Text>
        <Text style={styles.sectionSub}>
          {t('officer.officialHelplinesSub', 'State and national veterinary authority hotlines.')}
        </Text>

        {/* 1962 Helpline */}
        <TouchableOpacity
          style={styles.helplineButton}
          onPress={() => handleCall('1962', 'National Veterinary Emergency')}
          activeOpacity={0.7}
        >
          <View style={[styles.helplineIconBox, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
            <Image
              source={ICON_PHONE}
              style={{ width: 18, height: 18, tintColor: '#4338CA' }}
              resizeMode="contain"
            />
          </View>
          <View style={styles.helplineTextCol}>
            <Text style={styles.helplineTitle}>
              {t('officer.emergency1962', 'National Veterinary Emergency')}
            </Text>
            <Text style={styles.helplineNumber}>
              {t('officer.emergency1962Sub', '1962 (Toll Free • 24/7)')}
            </Text>
          </View>
          <Text style={styles.callActionText}>{t('common.call', 'Call')}</Text>
        </TouchableOpacity>

        {/* ICAR-NIVEDI */}
        <TouchableOpacity
          style={styles.helplineButton}
          onPress={() => handleCall('08023093110', 'ICAR-NIVEDI')}
          activeOpacity={0.7}
        >
          <View style={[styles.helplineIconBox, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
            <Image
              source={ICON_MICROSCOPE}
              style={{ width: 18, height: 18, tintColor: '#0284C7' }}
              resizeMode="contain"
            />
          </View>
          <View style={styles.helplineTextCol}>
            <Text style={styles.helplineTitle}>
              {t('officer.nivediHelpline', 'ICAR-NIVEDI Disease Forewarning')}
            </Text>
            <Text style={styles.helplineNumber}>
              {t('officer.nivediHelplineSub', '080-23093110 (National Directorate)')}
            </Text>
          </View>
          <Text style={styles.callActionText}>{t('common.call', 'Call')}</Text>
        </TouchableOpacity>

        {/* State Directorate HQ */}
        <TouchableOpacity
          style={styles.helplineButton}
          onPress={() => handleCall('02025656141', 'State Animal Husbandry HQ')}
          activeOpacity={0.7}
        >
          <View style={[styles.helplineIconBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Image
              source={ICON_BUSINESS}
              style={{ width: 18, height: 18, tintColor: '#B45309' }}
              resizeMode="contain"
            />
          </View>
          <View style={styles.helplineTextCol}>
            <Text style={styles.helplineTitle}>
              {t('officer.stateDirHelpline', 'State Animal Husbandry HQ (Pune)')}
            </Text>
            <Text style={styles.helplineNumber}>
              {t('officer.stateDirHelplineSub', '020-25656141 (Central Commissionerate)')}
            </Text>
          </View>
          <Text style={styles.callActionText}>{t('common.call', 'Call')}</Text>
        </TouchableOpacity>
      </View>

      {/* 6. Reactive App Language Selection */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('common.appLanguage', 'App Language')}</Text>
        <Text style={styles.sectionSub}>
          {t('common.selectLanguageSubtitle', 'Select your language for the entire mobile application')}
        </Text>

        <View style={styles.languageCardsContainer}>
          {SUPPORTED_LANGUAGES.map((langOption) => {
            const isSelected = language === langOption.code;
            return (
              <TouchableOpacity
                key={langOption.code}
                style={[
                  styles.languageCard,
                  isSelected && styles.languageCardSelected,
                ]}
                onPress={() => changeLanguage(langOption.code)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Select ${langOption.label}`}
              >
                <Text style={styles.languageIcon}>{langOption.flagEmoji}</Text>
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageNativeName, isSelected && styles.languageTextSelected]}>
                    {langOption.nativeLabel}
                  </Text>
                  <Text style={styles.languageSubName}>
                    {langOption.subLabel}
                  </Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 7. Application & Runtime Information */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('profile.appInfo', 'App Information')}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('profile.application', 'Application')}</Text>
          <Text style={styles.detailValue}>PashuCare (Officer Edition)</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('profile.platform', 'Platform')}</Text>
          <Text style={styles.detailValue}>Android Native (Expo 52)</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('profile.version', 'Version')}</Text>
          <Text style={styles.detailValue}>v{appVersion}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Backend Gateway</Text>
          <Text style={[styles.detailValue, { color: colors.light.success }]}>
            ● Production Live Connected
          </Text>
        </View>
      </View>

        {/* 8. Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutButtonText}>{t('common.logOut', 'Sign Out')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Universal Floating Officer Navigation Dock */}
      <OfficerFloatingNav activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: 110,
  },
  profileHeaderCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  executiveHeaderBanner: {
    backgroundColor: colors.light.officerBadgeBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.round,
    marginBottom: spacing.md,
  },
  executiveBannerText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.officerBadge,
    letterSpacing: 0.5,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.light.officerBadge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  avatarText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  userName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    textAlign: 'center',
  },
  userRoleSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
    marginTop: 2,
    textAlign: 'center',
  },
  jurisdictionPill: {
    marginTop: spacing.sm,
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  jurisdictionPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.officerBadge,
  },
  sectionCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  detailValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    flex: 1.5,
    textAlign: 'right',
  },
  highlightValue: {
    color: colors.light.officerBadge,
    fontWeight: typography.weights.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.surfaceAlt,
    marginVertical: 4,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  noticeIcon: {
    fontSize: 16,
  },
  noticeText: {
    fontSize: 11,
    color: colors.light.officerBadge,
    flex: 1,
    lineHeight: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: colors.light.border,
  },
  statNumber: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statSub: {
    fontSize: 9,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badgePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#4338CA',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: spacing.xs,
  },
  shortcutCard: {
    width: '48.5%',
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  shortcutIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  shortcutIconImg: {
    width: 24,
    height: 24,
  },
  shortcutCardTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  shortcutCardSub: {
    fontSize: 10,
    color: colors.light.textMuted,
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
  helplineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  helplineIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  helplineEmoji: {
    fontSize: 18,
  },
  helplineTextCol: {
    flex: 1,
  },
  helplineTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  helplineNumber: {
    fontSize: 11,
    color: colors.light.officerBadge,
    fontWeight: typography.weights.semibold,
    marginTop: 1,
  },
  callActionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.officerBadge,
    backgroundColor: colors.light.officerBadgeBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  languageCardsContainer: {
    gap: spacing.xs,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  languageCardSelected: {
    borderColor: colors.light.officerBadge,
    backgroundColor: colors.light.officerBadgeBg,
  },
  languageIcon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  languageInfo: {
    flex: 1,
  },
  languageNativeName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  languageSubName: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  languageTextSelected: {
    color: colors.light.officerBadge,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.light.officerBadge,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.light.officerBadge,
  },
  signOutButton: {
    backgroundColor: colors.light.dangerBg,
    borderWidth: 1,
    borderColor: colors.light.danger,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  signOutButtonText: {
    color: colors.light.danger,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
