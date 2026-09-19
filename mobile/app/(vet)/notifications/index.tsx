/**
 * Livestock Saathi - Veterinarian Clinical Alerts & Notification Inbox
 * File: mobile/app/(vet)/notifications/index.tsx
 * 
 * Phase 9.5: Production notification feed for veterinary doctors.
 * Displays live referral alerts, case updates, outbreak cluster detections,
 * containment perimeters, and emergency ring vaccination notifications.
 * 
 * Strict Zero-Mock Policy: Only renders authentic database records and backend advisories.
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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import notificationService from '../../../src/services/notificationService';
import {
  AppNotification,
  VetNotificationCategory,
  NotificationType,
  NotificationSeverity,
  resolveVetNotificationNavigation,
} from '../../../src/types/notification';
import { OfflineNotice } from '../../../src/components/OfflineNotice';

const FILTER_CHIPS: { key: VetNotificationCategory; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Unread', label: 'Unread' },
  { key: 'Cases', label: 'Cases' },
  { key: 'Outbreaks', label: 'Outbreaks' },
  { key: 'Containment', label: 'Containment' },
];

function getNotificationTypeBadge(type: NotificationType): { label: string; bg: string; text: string; icon: string } {
  switch (type) {
    case 'NEW_CASE_ALERT':
      return { label: 'New Referral', bg: '#FEE2E2', text: '#B91C1C', icon: '🚨' };
    case 'CASE_STATUS_UPDATE':
      return { label: 'Status Update', bg: '#DBEAFE', text: '#1D4ED8', icon: '🔄' };
    case 'CASE_CLAIMED':
      return { label: 'Case Claimed', bg: '#D1FAE5', text: '#047857', icon: '✅' };
    case 'CASE_ASSIGNED':
      return { label: 'Assigned Care', bg: '#E0E7FF', text: '#4338CA', icon: '🩺' };
    case 'OUTBREAK_CLUSTER_ALERT':
      return { label: 'Outbreak Cluster', bg: '#FEF3C7', text: '#B45309', icon: '⚠️' };
    case 'CONTAINMENT_ZONE_CREATED':
      return { label: 'Containment Declared', bg: '#F3E8FF', text: '#7E22CE', icon: '🛡️' };
    case 'CONTAINMENT_ZONE_UPDATED':
      return { label: 'Containment Update', bg: '#F3E8FF', text: '#7E22CE', icon: '🛡️' };
    case 'RING_VACCINATION_SCHEDULED':
      return { label: 'Ring Vaccination', bg: '#CCFBF1', text: '#0F766E', icon: '💉' };
    case 'ADVISORY':
      return { label: 'Advisory Bulletin', bg: '#E0F2FE', text: '#0369A1', icon: '📢' };
    case 'GENERAL':
    default:
      return { label: 'Clinical Alert', bg: '#F1F5F9', text: '#475569', icon: '📋' };
  }
}

function getSeverityBadge(severity?: NotificationSeverity): { bg: string; text: string } | null {
  if (!severity) return null;
  switch (severity) {
    case 'Critical':
      return { bg: '#FEE2E2', text: '#DC2626' };
    case 'High':
      return { bg: '#FFEDD5', text: '#EA580C' };
    case 'Moderate':
      return { bg: '#FEF3C7', text: '#D97706' };
    case 'Low':
      return { bg: '#D1FAE5', text: '#059669' };
    default:
      return null;
  }
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0 || isNaN(diffMs)) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function VetNotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<VetNotificationCategory>('All');
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

        const data = await notificationService.getVeterinarianNotifications({
          userId: user?.id || user?._id,
          district: user?.district,
        });

        setNotifications(data);
      } catch (err: any) {
        console.warn('[VetNotifications] Load error:', err);
        const isNetworkErr =
          err.code === 'NETWORK_ERROR' ||
          err.status === 0 ||
          (err.message && err.message.toLowerCase().includes('network'));

        if (isNetworkErr) {
          setIsOffline(true);
        } else {
          setErrorMessage(err.message || 'Failed to load clinical alerts. Please try again.');
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
          return (
            item.type === 'NEW_CASE_ALERT' ||
            item.type === 'CASE_CLAIMED' ||
            item.type === 'CASE_ASSIGNED' ||
            item.type === 'CASE_STATUS_UPDATE' ||
            Boolean(item.caseId || item.caseNumber)
          );
        case 'Outbreaks':
          return item.type === 'OUTBREAK_CLUSTER_ALERT';
        case 'Containment':
          return (
            item.type === 'CONTAINMENT_ZONE_CREATED' ||
            item.type === 'CONTAINMENT_ZONE_UPDATED' ||
            item.type === 'RING_VACCINATION_SCHEDULED'
          );
        case 'All':
        default:
          return true;
      }
    });
  }, [notifications, selectedFilter]);

  const handleNotificationPress = async (item: AppNotification) => {
    // Mark as read in local state and server
    if (!item.isRead) {
      await notificationService.markAsRead(item);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true, status: 'READ' } : n))
      );
    }

    const target = resolveVetNotificationNavigation(item);
    if (target.type === 'referral') {
      router.push(target.route as any);
    } else if (target.type === 'map') {
      router.push('/(vet)/map');
    } else if (target.type === 'containment') {
      router.push('/(vet)/containment');
    } else if (target.type === 'none' && target.reason) {
      Alert.alert('Notice', target.reason);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationService.markAllAsRead(user?.id || user?._id, notifications);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, status: 'READ' }))
      );
    } catch (err: any) {
      console.warn('[VetNotifications] Mark all read notice:', err?.message);
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const typeBadge = getNotificationTypeBadge(item.type);
    const sevBadge = getSeverityBadge(item.severity);
    const timeAgo = formatTimeAgo(item.createdAt);
    const navTarget = resolveVetNotificationNavigation(item);

    const hasAiScreening = Boolean(
      item.metadata?.risk ||
      item.metadata?.confidence ||
      item.type === 'NEW_CASE_ALERT'
    );

    return (
      <TouchableOpacity
        style={[
          styles.card,
          !item.isRead ? styles.cardUnread : styles.cardRead,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
      >
        {/* Top Meta Header: Type Badge, Severity Badge, Time Ago, Unread Dot */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeBadge.bg }]}>
              <Text style={styles.typeIcon}>{typeBadge.icon}</Text>
              <Text style={[styles.typeLabel, { color: typeBadge.text }]}>
                {typeBadge.label}
              </Text>
            </View>

            {sevBadge && (
              <View style={[styles.sevBadge, { backgroundColor: sevBadge.bg }]}>
                <Text style={[styles.sevLabel, { color: sevBadge.text }]}>
                  {item.severity}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.timeText}>{timeAgo}</Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
        </View>

        {/* Title */}
        <Text
          style={[
            styles.cardTitle,
            !item.isRead ? styles.titleUnread : styles.titleRead,
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Message */}
        {item.message ? (
          <Text style={styles.cardMessage} numberOfLines={3}>
            {item.message}
          </Text>
        ) : null}

        {/* Entity Identifiers & Details */}
        <View style={styles.entityRow}>
          {item.caseNumber || item.caseId ? (
            <View style={styles.entityTag}>
              <Text style={styles.entityTagText}>
                📋 Case {item.caseNumber || String(item.caseId).slice(0, 8)}
              </Text>
            </View>
          ) : null}

          {item.district ? (
            <View style={styles.entityTag}>
              <Text style={styles.entityTagText}>📍 {item.district}</Text>
            </View>
          ) : null}

          {item.metadata?.disease ? (
            <View style={styles.entityTag}>
              <Text style={styles.entityTagText}>🦠 {item.metadata.disease}</Text>
            </View>
          ) : null}
        </View>

        {/* AI Disclaimer if notification contains preliminary risk screening */}
        {hasAiScreening && (
          <View style={styles.aiNoticeContainer}>
            <Text style={styles.aiNoticeText}>
              ⚠️ AI-assisted preliminary screening — not a final veterinary diagnosis.
            </Text>
          </View>
        )}

        {/* Action Button Row */}
        {navTarget.type !== 'none' && (
          <View style={styles.actionRow}>
            <Text style={styles.actionBtnText}>
              {navTarget.type === 'referral' && 'Examine Referral Case ➔'}
              {navTarget.type === 'map' && 'View Outbreak GIS Map ➔'}
              {navTarget.type === 'containment' && 'View Containment Zone ➔'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <OfflineNotice />

      {/* Top Controls Header */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarTitle}>Clinical Alerts</Text>
          {unreadCount > 0 ? (
            <View style={styles.unreadCountBadge}>
              <Text style={styles.unreadCountText}>{unreadCount} unread</Text>
            </View>
          ) : (
            <Text style={styles.allReadSubtext}>All caught up</Text>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllReadBtn}
            onPress={handleMarkAllAsRead}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllReadText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Offline Notice Banner */}
      {isOffline && (
        <View style={styles.offlineNoticeBox}>
          <Text style={styles.offlineNoticeText}>
            ⚡ Offline Mode: Displaying cached alerts from device storage. Read updates require network connectivity.
          </Text>
        </View>
      )}

      {/* Filter Chips Bar */}
      <View style={styles.filtersWrapper}>
        <FlatList
          data={FILTER_CHIPS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterListContent}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isSelected ? styles.filterChipActive : styles.filterChipInactive,
                ]}
                onPress={() => setSelectedFilter(item.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected ? styles.filterChipTextActive : styles.filterChipTextInactive,
                  ]}
                >
                  {item.label}
                  {item.key === 'Unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Loading clinical alerts...</Text>
        </View>
      ) : errorMessage && notifications.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load Alerts</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadNotifications()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>
                {selectedFilter === 'All'
                  ? 'No Clinical Alerts'
                  : `No ${selectedFilter} Alerts`}
              </Text>
              <Text style={styles.emptySub}>
                {selectedFilter === 'All'
                  ? 'Your clinical inbox is clear. Incoming referral cases and epidemic cluster alerts will appear here.'
                  : `No alerts currently match the "${selectedFilter}" filter.`}
              </Text>
              {selectedFilter !== 'All' && (
                <TouchableOpacity
                  style={styles.clearFilterBtn}
                  onPress={() => setSelectedFilter('All')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearFilterText}>View All Alerts</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  unreadCountBadge: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  unreadCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.textInverse,
  },
  allReadSubtext: {
    fontSize: 12,
    color: colors.light.textMuted,
    fontStyle: 'italic',
  },
  markAllReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  markAllReadText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.primary,
  },
  offlineNoticeBox: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineNoticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  filtersWrapper: {
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingVertical: spacing.sm,
  },
  filterListContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  filterChipInactive: {
    backgroundColor: colors.light.surfaceAlt,
    borderColor: colors.light.border,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.light.textInverse,
  },
  filterChipTextInactive: {
    color: colors.light.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    ...shadows.sm,
  },
  cardUnread: {
    borderColor: colors.light.primaryHighlight,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.primary,
    backgroundColor: '#FAFDFB',
  },
  cardRead: {
    borderColor: colors.light.border,
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  typeIcon: {
    fontSize: 12,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sevBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  sevLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 11,
    color: colors.light.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.light.primary,
  },
  cardTitle: {
    fontSize: 15,
    color: colors.light.textPrimary,
    marginTop: 4,
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: '700',
  },
  titleRead: {
    fontWeight: '500',
  },
  cardMessage: {
    fontSize: 13,
    color: colors.light.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  entityTag: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  entityTagText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  aiNoticeContainer: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
    marginTop: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: '#F59E0B',
  },
  aiNoticeText: {
    fontSize: 11,
    color: '#B45309',
    fontStyle: 'italic',
  },
  actionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.light.surfaceAlt,
    alignItems: 'flex-end',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.primary,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  retryBtnText: {
    color: colors.light.textInverse,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: 13,
    color: colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  clearFilterBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.primary,
  },
});
