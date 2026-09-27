/**
 * Livestock Saathi - Farmer Notifications & Advisories Inbox
 * File: mobile/app/(farmer)/notifications/index.tsx
 * 
 * Production notification feed displaying real alerts, case status changes,
 * veterinarian assignments, and epidemic advisories for the authenticated farmer.
 * 
 * Strict Zero-Mock: Only renders authentic database records and backend advisories.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import notificationService from '../../../src/services/notificationService';
import {
  AppNotification,
  NotificationCategory,
  NotificationSeverity,
  resolveNotificationNavigation,
} from '../../../src/types/notification';

export default function FarmerNotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useAppLanguage();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<NotificationCategory>('All');
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filterChips = useMemo((): { key: NotificationCategory; label: string }[] => [
    { key: 'All', label: t('common.all', 'All') },
    { key: 'Unread', label: t('notifications.unread', 'Unread') },
    { key: 'Health', label: t('farmer.healthAlerts', 'Health') },
    { key: 'Cases', label: t('farmer.activeCases', 'Cases') },
    { key: 'Advisory', label: t('vaccination.advisories', 'Advisory') },
  ], [t]);

  const loadNotifications = useCallback(
    async (isPullToRefresh = false) => {
      try {
        if (isPullToRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setErrorMessage(null);
        setIsOffline(false);

        const data = await notificationService.getFarmerNotifications({
          userId: user?.id || user?._id,
          district: user?.district,
        });

        setNotifications(data);
      } catch (err: any) {
        console.warn('[FarmerNotifications] Load error:', err);
        const isNetworkErr =
          err.code === 'NETWORK_ERROR' ||
          err.status === 0 ||
          (err.message && err.message.toLowerCase().includes('network'));

        if (isNetworkErr) {
          setIsOffline(true);
          setErrorMessage('Notifications unavailable offline');
        } else {
          setErrorMessage(err.message || 'Failed to load notifications. Please try again.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, user?._id, user?.district]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(() => {
    return notificationService.getUnreadCount(notifications);
  }, [notifications]);

  // Derive filtered list strictly from real data
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      switch (selectedFilter) {
        case 'Unread':
          return !item.isRead;
        case 'Cases':
          return Boolean(
            item.caseId ||
              item.caseNumber ||
              item.type.includes('CASE')
          );
        case 'Advisory':
          return (
            item.type === 'ADVISORY' ||
            item.source === 'advisory' ||
            item.type.includes('OUTBREAK') ||
            item.type.includes('CONTAINMENT')
          );
        case 'Health':
          return Boolean(
            item.severity ||
              item.type.includes('ALERT') ||
              item.type === 'RING_VACCINATION_SCHEDULED' ||
              item.metadata?.disease
          );
        case 'All':
        default:
          return true;
      }
    });
  }, [notifications, selectedFilter]);

  const handleNotificationPress = async (item: AppNotification) => {
    // 1. Mark as read immediately in presentation and persist to server if supported
    if (!item.isRead) {
      await notificationService.markAsRead(item);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true, status: 'READ' } : n))
      );
    }

    // 2. Resolve navigation target based on authentic related entity IDs
    const target = resolveNotificationNavigation(item);
    if (target.type !== 'none') {
      router.push(target.route as any);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    await notificationService.markAllAsRead(user?.id || user?._id, notifications);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, status: 'READ' }))
    );
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'CASE_CLAIMED':
      case 'CASE_ASSIGNED':
        return '👨‍⚕️';
      case 'CASE_STATUS_UPDATE':
        return '🩺';
      case 'NEW_CASE_ALERT':
        return '🚨';
      case 'OUTBREAK_CLUSTER_ALERT':
        return '⚠️';
      case 'CONTAINMENT_ZONE_CREATED':
      case 'CONTAINMENT_ZONE_UPDATED':
        return '🛡️';
      case 'RING_VACCINATION_SCHEDULED':
        return '💉';
      case 'ADVISORY':
        return '📢';
      default:
        return '🔔';
    }
  };

  const getSeverityStyle = (severity?: NotificationSeverity) => {
    switch (severity) {
      case 'Critical':
      case 'High':
        return {
          bg: colors.light.dangerBg,
          color: colors.light.danger,
          label: severity,
        };
      case 'Moderate':
        return {
          bg: colors.light.warningBg,
          color: colors.light.warning,
          label: 'Moderate',
        };
      case 'Low':
        return {
          bg: colors.light.infoBg,
          color: colors.light.info,
          label: 'Low',
        };
      default:
        return null;
    }
  };

  const formatTimestamp = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHrs / 24);

      if (diffHrs < 1) return 'Just now';
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return '';
    }
  };

  const renderNotificationCard = ({ item }: { item: AppNotification }) => {
    const icon = getNotificationIcon(item.type);
    const severityStyle = getSeverityStyle(item.severity);
    const timeFormatted = formatTimestamp(item.createdAt);
    const hasNav = resolveNotificationNavigation(item).type !== 'none';

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.isRead && styles.unreadCard,
        ]}
        activeOpacity={0.75}
        onPress={() => handleNotificationPress(item)}
      >
        {!item.isRead && <View style={styles.unreadAccentBar} />}

        <View style={styles.cardContent}>
          {/* Top Row: Icon, Title, Unread Indicator */}
          <View style={styles.topRow}>
            <View style={styles.iconContainer}>
              <Text style={styles.typeIcon}>{icon}</Text>
            </View>
            <View style={styles.titleContainer}>
              <Text
                style={[
                  styles.notificationTitle,
                  !item.isRead && styles.unreadTitleText,
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          {/* Message Body */}
          <Text style={styles.notificationMessage} numberOfLines={3}>
            {item.message}
          </Text>

          {/* Bottom Row: Metadata badges, Timestamp & Action Indicator */}
          <View style={styles.bottomRow}>
            <View style={styles.badgesContainer}>
              {severityStyle && (
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: severityStyle.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.severityBadgeText,
                      { color: severityStyle.color },
                    ]}
                  >
                    {severityStyle.label}
                  </Text>
                </View>
              )}

              {item.caseNumber ? (
                <View style={styles.caseBadge}>
                  <Text style={styles.caseBadgeText}>{item.caseNumber}</Text>
                </View>
              ) : null}

              {item.district ? (
                <View style={styles.districtBadge}>
                  <Text style={styles.districtBadgeText}>📍 {item.district}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.timeActionRow}>
              {timeFormatted ? (
                <Text style={styles.timeText}>{timeFormatted}</Text>
              ) : null}
              {hasNav && <Text style={styles.navArrow}>→</Text>}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.primary} />

      {/* Top Header Bar with Count and Mark Read */}
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>{t('notifications.title', 'Notifications')}</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadCountPill}>
              <Text style={styles.unreadCountText}>{unreadCount} {t('notifications.unread', 'new')}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllText}>{t('notifications.markAllRead', 'Mark all read')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips Horizontal Scroller */}
      <View style={styles.filtersSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterChips}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.chipsContainer}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(item.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                  {item.key === 'Unread' && unreadCount > 0
                    ? ` (${unreadCount})`
                    : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Content Area */}
      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading notifications...')}</Text>
        </View>
      ) : isOffline ? (
        /* Offline State per Step 8 */
        <View style={styles.centeredState}>
          <Text style={styles.stateIcon}>📡</Text>
          <Text style={styles.stateTitle}>{t('common.offline', 'Notifications unavailable offline')}</Text>
          <Text style={styles.stateSubtitle}>
            Please connect to the internet to view your live health alerts and advisories.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadNotifications()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : errorMessage ? (
        /* Server Error State */
        <View style={styles.centeredState}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>{t('common.error', 'Unable to Load')}</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadNotifications()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : filteredNotifications.length === 0 ? (
        /* Honest Empty State */
        <View style={styles.centeredState}>
          <Text style={styles.stateIcon}>🔔</Text>
          <Text style={styles.stateTitle}>
            {selectedFilter === 'Unread'
              ? t('notifications.noNotifications', 'No Unread Notifications')
              : t('notifications.noNotifications', 'No Notifications')}
          </Text>
          <Text style={styles.stateSubtitle}>
            {selectedFilter === 'Unread'
              ? 'You have caught up with all case updates and bulletins.'
              : 'No health alerts or veterinary notices found for your account.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.bold,
  },
  unreadCountPill: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  unreadCountText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: 11,
  },
  markAllButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.light.primarySubtle,
  },
  markAllText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
  },
  filtersSection: {
    backgroundColor: colors.light.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  chipsContainer: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.medium,
  },
  filterChipTextActive: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
  listContent: {
    padding: spacing.base,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  notificationCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  unreadCard: {
    borderColor: colors.light.primaryHighlight,
    backgroundColor: '#F7FDF9',
  },
  unreadAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.light.primary,
  },
  cardContent: {
    padding: spacing.base,
    paddingLeft: spacing.base + 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.light.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    fontSize: 16,
  },
  titleContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    lineHeight: 20,
  },
  unreadTitleText: {
    fontWeight: typography.weights.bold,
    color: colors.light.primaryDark,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radii.round,
    backgroundColor: colors.light.primary,
    marginTop: 6,
  },
  notificationMessage: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.light.surfaceAlt,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  caseBadge: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  caseBadgeText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  districtBadge: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  districtBadgeText: {
    fontSize: 11,
    color: colors.light.textMuted,
  },
  timeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    color: colors.light.textMuted,
    fontSize: 11,
  },
  navArrow: {
    fontSize: 14,
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: spacing.base,
  },
  stateIcon: {
    fontSize: 44,
    marginBottom: spacing.base,
  },
  stateTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  stateSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.base,
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
});
