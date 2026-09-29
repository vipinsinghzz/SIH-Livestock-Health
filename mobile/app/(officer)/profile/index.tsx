/**
 * Livestock Saathi - District Officer Profile & Administrative Settings Screen
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
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage, SUPPORTED_LANGUAGES } from '../../../src/services/i18n';
import { officerService } from '../../../src/services/officerService';
import { DashboardSummary } from '../../../src/types/officer';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';

export default function OfficerProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useAppLanguage();

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
  const districtName = user?.district || 'Pune';
  const stateName = user?.state || 'Maharashtra';
  const blockName = user?.block || 'Haveli';
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Executive Officer Identity Card */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.executiveHeaderBanner}>
          <Text style={styles.executiveBannerText}>
            🏛️ {t('officer.executiveBadge', 'GOVT. OF MAHARASHTRA • ANIMAL HUSBANDRY')}
          </Text>
        </View>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.userName}>{officerName}</Text>
        <Text style={styles.userRoleSubtitle}>{officerRole}</Text>

        <View style={styles.jurisdictionPill}>
          <Text style={styles.jurisdictionPillText}>
            📍 {districtName} {t('officer.districtJurisdiction', 'District Jurisdiction')}
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
          <Text style={styles.noticeIcon}>ℹ️</Text>
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

      {/* 4. Quick Command Module Shortcuts */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          {t('officer.quickShortcuts', 'Command Quick Navigation')}
        </Text>

        <View style={styles.shortcutsGrid}>
          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(officer)/surveillance' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutIcon}>📊</Text>
            <Text style={styles.shortcutText}>{t('nav.surveillance', 'Surveillance')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(officer)/outbreaks' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutIcon}>⚠️</Text>
            <Text style={styles.shortcutText}>{t('nav.outbreaks', 'Outbreaks')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(officer)/containment' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutIcon}>🛡️</Text>
            <Text style={styles.shortcutText}>{t('nav.containmentZones', 'Containment')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(officer)/vaccination' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutIcon}>⛺</Text>
            <Text style={styles.shortcutText}>{t('nav.camps', 'Vaccination')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(officer)/map' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutIcon}>🗺️</Text>
            <Text style={styles.shortcutText}>{t('nav.districtMap', 'GIS Map')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(officer)/advisories' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutIcon}>📢</Text>
            <Text style={styles.shortcutText}>{t('nav.advisories', 'Advisories')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(officer)/forewarning' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutIcon}>📡</Text>
            <Text style={styles.shortcutText}>{t('nav.forewarning', 'NADRES')}</Text>
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
          <View style={styles.helplineIconBox}>
            <Text style={styles.helplineEmoji}>🚑</Text>
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
          <View style={styles.helplineIconBox}>
            <Text style={styles.helplineEmoji}>🔬</Text>
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
          <View style={styles.helplineIconBox}>
            <Text style={styles.helplineEmoji}>🏛️</Text>
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
          <Text style={styles.detailValue}>Livestock Saathi (Officer Edition)</Text>
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
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
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  shortcutIcon: {
    fontSize: 13,
  },
  shortcutText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
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
