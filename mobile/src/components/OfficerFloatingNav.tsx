/**
 * Livestock Saathi - Universal Officer Floating Bottom Navigation Dock
 * File: mobile/src/components/OfficerFloatingNav.tsx
 * 
 * Reusable, persistent floating navigation dock for all Animal Husbandry & Veterinary Officer screens.
 * Automatically resolves active tab selection based on expo-router pathname,
 * renders real-time outbreak/cluster badges, and provides an elevated center GIS Radar button.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppLanguage } from '../services/i18n';
import { officerService } from '../services/officerService';

export type OfficerNavTab = 'dashboard' | 'surveillance' | 'map' | 'containment' | 'alerts' | 'profile';

interface OfficerFloatingNavProps {
  activeTab?: OfficerNavTab;
  outbreakCount?: number;
}

const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

export function OfficerFloatingNav({
  activeTab,
  outbreakCount: propOutbreaks,
}: OfficerFloatingNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { isEnglish } = useAppLanguage();

  const [liveOutbreakCount, setLiveOutbreakCount] = useState<number>(propOutbreaks ?? 0);

  // Auto-detect active tab from current route pathname if not explicitly passed
  const currentTab: OfficerNavTab =
    activeTab ||
    (() => {
      if (!pathname) return 'dashboard';
      if (pathname.includes('/(officer)/map')) return 'map';
      if (pathname.includes('/(officer)/surveillance')) return 'surveillance';
      if (pathname.includes('/(officer)/outbreaks') || pathname.includes('/(officer)/forewarning') || pathname.includes('/(officer)/advisories')) return 'alerts';
      if (pathname.includes('/(officer)/containment') || pathname.includes('/(officer)/vaccination')) return 'containment';
      if (pathname.includes('/(officer)/profile')) return 'profile';
      return 'dashboard';
    })();

  useEffect(() => {
    if (propOutbreaks !== undefined) setLiveOutbreakCount(propOutbreaks);
  }, [propOutbreaks]);

  // Background fetch if props weren't provided
  useEffect(() => {
    if (propOutbreaks !== undefined) return;

    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const userId = user?.id || (user as any)?._id || 'officer_default';
        const res = await officerService.getDashboardSummary(userId, { district: user?.district });
        if (isMounted && res?.summary?.triageMetrics) {
          setLiveOutbreakCount(res.summary.triageMetrics.outbreakCount || 0);
        }
      } catch (err) {
        // Silent background fallback
      }
    };

    fetchCounts();
    return () => {
      isMounted = false;
    };
  }, [user?.district, user?.id, user, propOutbreaks]);

  return (
    <View style={styles.floatingNavContainer} pointerEvents="box-none">
      <View style={styles.bottomNavDock}>
        {/* Tab 1: Command Dashboard */}
        <TouchableOpacity
          style={styles.navTabItem}
          onPress={() => {
            if (currentTab !== 'dashboard') {
              router.push('/(officer)');
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'dashboard' }}
          accessibilityLabel={isEnglish ? 'Command' : 'कमांड'}
        >
          {currentTab === 'dashboard' ? (
            <View style={styles.navActiveIndicator}>
              <Image
                source={require('../../assets/icons/nav_home.png')}
                style={[styles.navIconImage, { tintColor: '#4338CA' }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../assets/icons/nav_home.png')}
                style={[styles.navIconImage, { tintColor: '#64748B' }]}
                resizeMode="contain"
              />
            </View>
          )}
          <Text style={currentTab === 'dashboard' ? styles.navTabLabelActive : styles.navTabLabel}>
            {isEnglish ? 'Command' : 'कमांड'}
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Epidemic Surveillance */}
        <TouchableOpacity
          style={styles.navTabItem}
          onPress={() => {
            if (currentTab !== 'surveillance' || pathname !== '/(officer)/surveillance') {
              router.push('/(officer)/surveillance');
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'surveillance' }}
          accessibilityLabel={isEnglish ? 'Surveillance' : 'निगरानी'}
        >
          {currentTab === 'surveillance' ? (
            <View style={styles.navActiveIndicator}>
              <Image
                source={require('../../assets/icons/stat_case.png')}
                style={[styles.navIconImage, { tintColor: '#4338CA' }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../assets/icons/stat_case.png')}
                style={[styles.navIconImage, { tintColor: '#64748B' }]}
                resizeMode="contain"
              />
            </View>
          )}
          <Text style={currentTab === 'surveillance' ? styles.navTabLabelActive : styles.navTabLabel}>
            {isEnglish ? 'Surveillance' : 'निगरानी'}
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Center Elevated GIS Radar Map */}
        <TouchableOpacity
          style={styles.navCenterScanItem}
          onPress={() => {
            if (currentTab !== 'map') {
              router.push('/(officer)/map');
            }
          }}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={isEnglish ? 'GIS Radar' : 'जीआईएस'}
        >
          <View style={[styles.navCenterScanCircle, currentTab === 'map' && styles.navCenterScanCircleActive]}>
            <Image
              source={require('../../assets/icons/location.png')}
              style={styles.navCenterScanIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.navCenterScanLabel, currentTab === 'map' && styles.navCenterScanLabelActive]}>
            {isEnglish ? 'GIS Radar' : 'जीआईएस'}
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Biosecurity & Containment */}
        <TouchableOpacity
          style={styles.navTabItem}
          onPress={() => {
            if (currentTab !== 'containment' || pathname !== '/(officer)/containment') {
              router.push('/(officer)/containment');
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'containment' }}
          accessibilityLabel={isEnglish ? 'Biosecurity' : 'बायोसिक्योरिटी'}
        >
          {currentTab === 'containment' ? (
            <View style={styles.navActiveIndicator}>
              <Image
                source={require('../../assets/icons/shield.png')}
                style={[styles.navIconImage, { tintColor: '#4338CA' }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../assets/icons/shield.png')}
                style={[styles.navIconImage, { tintColor: '#64748B' }]}
                resizeMode="contain"
              />
            </View>
          )}
          <Text style={currentTab === 'containment' ? styles.navTabLabelActive : styles.navTabLabel}>
            {isEnglish ? 'Biosecurity' : 'सुरक्षा'}
          </Text>
        </TouchableOpacity>

        {/* Tab 5: Outbreak Alerts */}
        <TouchableOpacity
          style={styles.navTabItem}
          onPress={() => {
            if (currentTab !== 'alerts' || pathname !== '/(officer)/outbreaks') {
              router.push('/(officer)/outbreaks');
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'alerts' }}
          accessibilityLabel={isEnglish ? 'Alerts' : 'अलर्ट'}
        >
          {currentTab === 'alerts' ? (
            <View style={styles.navActiveIndicator}>
              <Image
                source={require('../../assets/icons/stat_alert.png')}
                style={[styles.navIconImage, { tintColor: '#4338CA' }]}
                resizeMode="contain"
              />
              {liveOutbreakCount > 0 && (
                <View style={styles.navBadgeRed}>
                  <Text style={styles.navBadgeText}>
                    {liveOutbreakCount > 99 ? '99+' : liveOutbreakCount}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../assets/icons/stat_alert.png')}
                style={[styles.navIconImage, { tintColor: '#64748B' }]}
                resizeMode="contain"
              />
              {liveOutbreakCount > 0 && (
                <View style={styles.navBadgeRed}>
                  <Text style={styles.navBadgeText}>
                    {liveOutbreakCount > 99 ? '99+' : liveOutbreakCount}
                  </Text>
                </View>
              )}
            </View>
          )}
          <Text style={currentTab === 'alerts' ? styles.navTabLabelActive : styles.navTabLabel}>
            {isEnglish ? 'Alerts' : 'अलर्ट'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    alignItems: 'center',
    zIndex: 9999,
  },
  bottomNavDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#1E1B4B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  navTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 46,
  },
  navActiveIndicator: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    position: 'relative',
  },
  navInactiveIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  navIconImage: {
    width: 20,
    height: 20,
  },
  navTabLabel: {
    fontFamily: FONT_MEDIUM,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  navTabLabelActive: {
    fontFamily: FONT_BOLD,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4338CA',
    marginTop: 2,
    textAlign: 'center',
  },
  navCenterScanItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    paddingHorizontal: 4,
  },
  navCenterScanCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#4338CA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navCenterScanCircleActive: {
    backgroundColor: '#312E81',
    borderColor: '#C7D2FE',
  },
  navCenterScanIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
  },
  navCenterScanLabel: {
    fontFamily: FONT_MEDIUM,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
  navCenterScanLabelActive: {
    fontFamily: FONT_BOLD,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4338CA',
    marginTop: 3,
    textAlign: 'center',
  },
  navBadgeRed: {
    position: 'absolute',
    top: -3,
    right: -6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  navBadgeText: {
    fontFamily: FONT_BOLD,
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
