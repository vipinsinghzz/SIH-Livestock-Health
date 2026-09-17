/**
 * Livestock Saathi - Notification Service
 * File: mobile/src/services/notificationService.ts
 * 
 * Production notification client providing authenticated farmer alerts from:
 * 1. Supabase PostgreSQL `public.notifications` (referral case assignments, status changes)
 * 2. Backend Express `/api/advisories` (regional health & epidemic warnings)
 * 3. Fallback check for backend Express `/api/notifications`
 * 
 * Strict Zero-Mock Policy: Zero simulated, dummy, or fabricated notifications.
 */

import NetInfo from '@react-native-community/netinfo';
import api, { ApiError } from './api';
import { supabase, isLiveSupabase } from '../config/supabaseClient';
import {
  AppNotification,
  NotificationType,
  NotificationStatus,
  NotificationSeverity,
} from '../types/notification';
import {
  saveNotificationsCache,
  getCachedNotifications,
} from './localDatabase';

export interface NotificationResponse {
  success: boolean;
  count: number;
  notifications: AppNotification[];
}

// Local in-memory set of read notification IDs for immediate presentation updates
const localReadIds = new Set<string>();

/**
 * Normalizes backend/Supabase database record into standard AppNotification
 */
function normalizeNotificationRecord(raw: any, source: 'supabase' | 'advisory' | 'api'): AppNotification {
  const id = String(raw.id || raw._id || '');
  const recipientId = String(raw.recipient_id || raw.recipientId || '');
  const caseId = raw.case_id || raw.caseId || raw.metadata?.caseId || undefined;
  const caseNumber = raw.case_number || raw.caseNumber || raw.metadata?.caseNumber || undefined;
  const animalId = raw.animal_id || raw.animalId || raw.metadata?.animalId || undefined;

  let type: NotificationType = 'GENERAL';
  if (raw.type) {
    type = raw.type as NotificationType;
  } else if (source === 'advisory') {
    type = 'ADVISORY';
  }

  // Handle title & message that might be localized strings or objects { en, hi }
  let title = '';
  if (typeof raw.title === 'object' && raw.title !== null) {
    title = raw.title.en || raw.title.hi || 'Livestock Alert';
  } else {
    title = String(raw.title || 'Livestock Notification');
  }

  let message = '';
  if (typeof raw.message === 'object' && raw.message !== null) {
    message = raw.message.en || raw.message.hi || '';
  } else {
    message = String(raw.message || '');
  }

  const district = raw.district || raw.targetDistrict || raw.metadata?.district || undefined;

  // Determine status and read state
  const rawStatus = (raw.status || 'DELIVERED').toUpperCase();
  const status: NotificationStatus =
    rawStatus === 'READ' || localReadIds.has(id) ? 'READ' : (rawStatus as NotificationStatus);
  const isRead = status === 'READ' || localReadIds.has(id);

  // Severity detection
  let severity: NotificationSeverity | undefined = undefined;
  if (raw.severity) {
    severity = raw.severity as NotificationSeverity;
  } else if (raw.metadata?.risk) {
    const risk = String(raw.metadata.risk).toLowerCase();
    if (risk.includes('critical')) severity = 'Critical';
    else if (risk.includes('high')) severity = 'High';
    else if (risk.includes('mod')) severity = 'Moderate';
    else severity = 'Low';
  }

  const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updated_at || raw.updatedAt || undefined;

  return {
    id,
    recipientId,
    caseId: caseId ? String(caseId) : undefined,
    caseNumber: caseNumber ? String(caseNumber) : undefined,
    animalId: animalId ? String(animalId) : undefined,
    type,
    title,
    message,
    district,
    status,
    isRead,
    severity,
    metadata: raw.metadata || {},
    createdAt,
    updatedAt,
    source,
  };
}

export const notificationService = {
  /**
   * Fetch authenticated notifications for the specified farmer
   * Queries Supabase PostgreSQL `public.notifications` table directly under authenticated RLS,
   * merges with live government district advisories from `/api/advisories`,
   * and checks `/api/notifications` if available.
   */
  async getFarmerNotifications(params: {
    userId?: string;
    district?: string;
  }): Promise<AppNotification[]> {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      const { notifications } = await getCachedNotifications(params.userId || 'all');
      return notifications;
    }

    const results: AppNotification[] = [];
    const seenIds = new Set<string>();

    // 1. Try Express `/api/notifications` if it exists (handles 404 cleanly)
    try {
      const apiRes = await api.get<{ notifications?: any[]; data?: any[] }>('/notifications');
      const apiNotifs = apiRes.data?.notifications || apiRes.data?.data;
      if (Array.isArray(apiNotifs)) {
        for (const item of apiNotifs) {
          const norm = normalizeNotificationRecord(item, 'api');
          if (norm.id && !seenIds.has(norm.id)) {
            seenIds.add(norm.id);
            results.push(norm);
          }
        }
      }
    } catch (err: any) {
      // If 404, endpoint does not exist on Express server; safely proceed to Supabase
      if (err.status !== 404 && err.status !== 0) {
        console.warn('[NotificationService] Express /notifications check returned:', err.status);
      }
    }

    // 2. Query persistent Supabase notifications if authenticated client is available
    if (params.userId && isLiveSupabase && supabase?.from) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', params.userId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          for (const item of data) {
            const norm = normalizeNotificationRecord(item, 'supabase');
            if (norm.id && !seenIds.has(norm.id)) {
              seenIds.add(norm.id);
              results.push(norm);
            }
          }
        } else if (error) {
          console.warn('[NotificationService] Supabase notifications notice:', error.message);
        }
      } catch (sbErr: any) {
        console.warn('[NotificationService] Supabase query exception:', sbErr.message);
      }
    }

    // 3. Fetch real district advisories from backend `/api/advisories`
    try {
      const advRes = await api.get<{ advisories?: any[] }>('/advisories', {
        params: params.district ? { district: params.district } : undefined,
      });
      const advisories = advRes.data?.advisories;
      if (Array.isArray(advisories)) {
        for (const adv of advisories) {
          const norm = normalizeNotificationRecord(adv, 'advisory');
          if (norm.id && !seenIds.has(norm.id)) {
            seenIds.add(norm.id);
            results.push(norm);
          }
        }
      }
    } catch (advErr: any) {
      // Non-fatal if advisories network fails
      console.warn('[NotificationService] Advisories fetch notice:', advErr.message);
    }

    // Sort combined real notifications chronologically descending (newest first)
    const sorted = results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (sorted.length > 0) {
      await saveNotificationsCache(params.userId || 'all', sorted);
    } else if (params.userId) {
      // If network calls returned empty due to connection drop, fallback to cache
      const { notifications: cached } = await getCachedNotifications(params.userId);
      if (cached.length > 0) return cached;
    }

    return sorted;
  },

  /**
   * Mark a specific notification as read in Supabase and update local presentation state
   */
  async markAsRead(notification: AppNotification): Promise<boolean> {
    localReadIds.add(notification.id);

    if (notification.source === 'supabase' && isLiveSupabase && supabase?.from) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ status: 'READ' })
          .eq('id', notification.id);

        if (error) {
          console.warn('[NotificationService] Error updating read status in Supabase:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.warn('[NotificationService] Failed to mark read on server:', err);
        return false;
      }
    }

    // For advisory / api notifications where no server mark-read route exists, localReadIds maintains UX state
    return true;
  },

  /**
   * Mark all unread notifications as read for the authenticated farmer
   */
  async markAllAsRead(userId?: string, notifications?: AppNotification[]): Promise<boolean> {
    if (notifications) {
      notifications.forEach((n) => localReadIds.add(n.id));
    }

    if (userId && isLiveSupabase && supabase?.from) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ status: 'READ' })
          .eq('recipient_id', userId)
          .eq('status', 'DELIVERED');

        if (error) {
          console.warn('[NotificationService] Supabase markAllAsRead notice:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.warn('[NotificationService] Exception during markAllAsRead:', err);
        return false;
      }
    }

    return true;
  },

  /**
   * Calculate unread notification count
   */
  getUnreadCount(notifications: AppNotification[]): number {
    return notifications.filter((n) => !n.isRead && !localReadIds.has(n.id)).length;
  },
};

export default notificationService;
