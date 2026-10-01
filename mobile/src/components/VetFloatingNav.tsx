/**
 * Livestock Saathi - Universal Veterinarian Floating Bottom Navigation Dock
 * File: mobile/src/components/VetFloatingNav.tsx
 * 
 * Reusable, persistent floating navigation dock for all veterinarian screens.
 * Automatically resolves active tab selection based on expo-router pathname,
 * renders real-time triage/unread badges, and provides an elevated center GIS Radar button.
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
import veterinarianService from '../services/veterinarianService';
import notificationService from '../services/notificationService';

export type VetNavTab = 'dashboard' | 'triage' | 'map' | 'patients' | 'alerts';

interface VetFloatingNavProps {
  activeTab?: VetNavTab;
  unreadAlertsCount?: number;
  newReferralsCount?: number;
  myCasesCount?: number;
}

const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

export function VetFloatingNav({
  activeTab,
  unreadAlertsCount: propUnread,
  newReferralsCount: propNew,
  myCasesCount: propMyCases,
}: VetFloatingNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { isEnglish } = useAppLanguage();

  const [liveNewCount, setLiveNewCount] = useState<number>(propNew ?? 0);
  const [liveMyCasesCount, setLiveMyCasesCount] = useState<number>(propMyCases ?? 0);
  const [liveUnreadCount, setLiveUnreadCount] = useState<number>(propUnread ?? 0);

  // Auto-detect active tab from current route pathname if not explicitly passed
  const currentTab: VetNavTab =
    activeTab ||
    (() => {
      if (!pathname) return 'dashboard';
      if (pathname.includes('/map')) return 'map';
      if (pathname.includes('/cases')) return 'patients';
      if (pathname.includes('/notifications')) return 'alerts';
      if (pathname.includes('/referrals')) return 'triage';
      return 'dashboard';
    })();

  // Keep badge counts up to date
  useEffect(() => {
    if (propNew !== undefined) setLiveNewCount(propNew);
    if (propMyCases !== undefined) setLiveMyCasesCount(propMyCases);
    if (propUnread !== undefined) setLiveUnreadCount(propUnread);
  }, [propNew, propMyCases, propUnread]);

  // Background fetch if props weren't provided
  useEffect(() => {
    if (propNew !== undefined && propUnread !== undefined && propMyCases !== undefined) {
      return;
    }

    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const [dashResult, notifsResult] = await Promise.allSettled([
          veterinarianService.getDashboardMetrics(user?.district),
          notificationService.getVeterinarianNotifications({
            userId: user?.id || user?._id,
            district: user?.district,
          }),
        ]);

        if (isMounted && dashResult.status === 'fulfilled') {
          setLiveNewCount(dashResult.value.metrics.newReferralsCount ?? 0);
          setLiveMyCasesCount(dashResult.value.metrics.myCasesCount ?? 0);
        }
        if (isMounted && notifsResult.status === 'fulfilled') {
          setLiveUnreadCount(notificationService.getUnreadCount(notifsResult.value));
        }
      } catch (err) {
        // Silent background fallback
      }
    };

    fetchCounts();
    return () => {
      isMounted = false;
    };
  }, [user?.district, user?.id, user?._id, propNew, propUnread, propMyCases]);

  return (
    <View style={styles.floatingNavContainer} pointerEvents="box-none">
      <View style={styles.bottomNavDock}>
        {/* Tab 1: Dashboard / Home */}
        <TouchableOpacity
          style={styles.navTabItem}
          onPress={() => {
            if (currentTab !== 'dashboard') {
              router.push('/(vet)');
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'dashboard' }}
          accessibilityLabel={isEnglish ? 'Dashboard' : 'डैशबोर्ड'}
        >
          {currentTab === 'dashboard' ? (
            <View style={styles.navActiveIndicator}>
              <Image
                source={require('../../assets/icons/nav_home.png')}
                style={[styles.navIconImage, { tintColor: '#0F5132' }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../assets/icons/nav_home.png')}
                style={[styles.navIconImage, { tintColor: '#475569' }]}
                resizeMode="contain"
              />
            </View>
          )}
          <Text style={currentTab === 'dashboard' ? styles.navTabLabelActive : styles.navTabLabel}>
            {isEnglish ? 'Dashboard' : 'डैशबोर्ड'}
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Triage Queue */}
        <TouchableOpacity
          style={styles.navTabItem}
          onPress={() => {
            if (currentTab !== 'triage' || pathname !== '/(vet)/referrals') {
              router.push('/(vet)/referrals');
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'triage' }}
          accessibilityLabel={isEnglish ? 'Triage Queue' : 'ट्रायज'}
        >
          {currentTab === 'triage' ? (
            <View style={styles.navActiveIndicator}>
              <Image
                source={require('../../assets/icons/clipboard.png')}
                style={[styles.navIconImage, { tintColor: '#0F5132' }]}
                resizeMode="contain"
              />
              {liveNewCount > 0 && (
                <View style={styles.navBadgeAmber}>
                  <Text style={styles.navBadgeText}>
                    {liveNewCount > 99 ? '99+' : liveNewCount}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../assets/icons/clipboard.png')}
                style={[styles.navIconImage, { tintColor: '#475569' }]}
                resizeMode="contain"
              />
              {liveNewCount > 0 && (
                <View style={styles.navBadgeAmber}>
                  <Text style={styles.navBadgeText}>
                    {liveNewCount > 99 ? '99+' : liveNewCount}
                  </Text>
                </View>
              )}
            </View>
          )}
          <Text style={currentTab === 'triage' ? styles.navTabLabelActive : styles.navTabLabel}>
            {isEnglish ? 'Triage' : 'ट्रायज'}
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Center Elevated GIS Radar Outbreak Map */}
        <TouchableOpacity
          style={styles.navCenterScanItem}
          onPress={() => {
            if (currentTab !== 'map') {
              router.push('/(vet)/map');
            }
          }}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={isEnglish ? 'Outbreak GIS Radar' : 'जीआईएस रडार'}
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

        {/* Tab 4: My Patients */}
        <TouchableOpacity
          style={styles.navTabItem}
          onPress={() => {
            if (currentTab !== 'patients') {
              router.push('/(vet)/cases');
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentTab === 'patients' }}
          accessibilityLabel={isEnglish ? 'My Patients' : 'मरीज'}
        >
          {currentTab === 'patients' ? (
            <View style={styles.navActiveIndicator}>
              <Image
                source={require('../../assets/icons/stethoscope.png')}
                style={[styles.navIconImage, { tintColor: '#0F5132' }]}
                resizeMode="contain"
              />
              {liveMyCasesCount > 0 && (
                <View style={styles.navBadgeEmerald}>
                  <Text style={styles.navBadgeText}>
                    {liveMyCasesCount > 99 ? '99+' : liveMyCasesCount}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../assets/icons/stethoscope.png')}
                style={[styles.navIconImage, { tintColor: '#475569' }]}
                resizeMode="contain"
              />
              {liveMyCasesCount > 0 && (
                <View style={styles.navBadgeEmerald}>
                  <Text style={styles.navBadgeText}>
                    {liveMyCasesCount > 99 ? '99+' : liveMyCasesCount}
                  </Text>
                </View>
              )}
            </View>
          )}
          <Text style={currentTab === 'patients' ? styles.navTabLabelActive : styles.navTabLabel}>
            {isEnglish ? 'Patients' : 'मरीज'}
          </Text>
        </TouchableOpacity>

        {/* Tab 5: Clinical Alerts */}
        <TouchableOpacity
          style={styles.navTabItem}
          onPress={() => {
            if (currentTab !== 'alerts') {
              router.push('/(vet)/notifications');
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
                source={require('../../assets/icons/bell_minimal_green.png')}
                style={[styles.navIconImage, { tintColor: '#0F5132' }]}
                resizeMode="contain"
              />
              {liveUnreadCount > 0 && (
                <View style={styles.navBadgeRed}>
                  <Text style={styles.navBadgeText}>
                    {liveUnreadCount > 99 ? '99+' : liveUnreadCount}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../assets/icons/bell_minimal_green.png')}
                style={[styles.navIconImage, { tintColor: '#475569' }]}
                resizeMode="contain"
              />
              {liveUnreadCount > 0 && (
                <View style={styles.navBadgeRed}>
                  <Text style={styles.navBadgeText}>
                    {liveUnreadCount > 99 ? '99+' : liveUnreadCount}
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
    bottom: 14,
    left: 10,
    right: 10,
    zIndex: 90,
  },
  bottomNavDock: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
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
  },
  navActiveIndicator: {
    width: 44,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navInactiveIconBox: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navIconImage: {
    width: 24,
    height: 24,
  },
  navTabLabelActive: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
    marginTop: 2,
  },
  navTabLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: '#475569',
    marginTop: 2,
  },
  navCenterScanItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    marginHorizontal: 4,
  },
  navCenterScanCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navCenterScanCircleActive: {
    backgroundColor: '#10B981',
    borderColor: '#0F5132',
  },
  navCenterScanIcon: {
    width: 26,
    height: 26,
    tintColor: '#FFFFFF',
  },
  navCenterScanLabel: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: '#0F5132',
    marginTop: 3,
  },
  navCenterScanLabelActive: {
    color: '#0F5132',
    fontWeight: '800',
  },
  navBadgeAmber: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 4.5,
    paddingVertical: 0.5,
  },
  navBadgeEmerald: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 4.5,
    paddingVertical: 0.5,
  },
  navBadgeRed: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4.5,
    paddingVertical: 0.5,
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
});

export default VetFloatingNav;
