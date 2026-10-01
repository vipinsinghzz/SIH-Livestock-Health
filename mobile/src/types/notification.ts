/**
 * PashuCare - Notification Type Definitions
 * File: mobile/src/types/notification.ts
 * 
 * Defines domain models, category filters, and payload interfaces for real farmer notifications
 * backed by Supabase PostgreSQL `public.notifications` and backend advisory alerts.
 */

export type NotificationType =
  | 'NEW_CASE_ALERT'
  | 'CASE_CLAIMED'
  | 'CASE_ASSIGNED'
  | 'CASE_STATUS_UPDATE'
  | 'OUTBREAK_CLUSTER_ALERT'
  | 'CONTAINMENT_ZONE_CREATED'
  | 'CONTAINMENT_ZONE_UPDATED'
  | 'RING_VACCINATION_SCHEDULED'
  | 'ADVISORY'
  | 'GENERAL';

export type NotificationStatus = 'QUEUED' | 'DELIVERED' | 'FAILED' | 'READ';

export type NotificationCategory = 'All' | 'Unread' | 'Health' | 'Cases' | 'Advisory';

export type NotificationSeverity = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface NotificationMetadata {
  disease?: string;
  risk?: string;
  confidence?: number;
  animalSpecies?: string;
  animalId?: string;
  farmerName?: string;
  farmerPhone?: string;
  assignedVetId?: string;
  assignedVetName?: string;
  assignedVetPhone?: string;
  claimedAt?: string;
  newStatus?: string;
  previousStatus?: string;
  severity?: NotificationSeverity;
  [key: string]: any;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  caseId?: string;
  caseNumber?: string;
  animalId?: string;
  type: NotificationType;
  title: string;
  message: string;
  district?: string;
  status: NotificationStatus;
  isRead: boolean;
  severity?: NotificationSeverity;
  metadata?: NotificationMetadata;
  createdAt: string;
  updatedAt?: string;
  source: 'supabase' | 'advisory' | 'api';
}

export interface NotificationFilterState {
  category: NotificationCategory;
  searchQuery?: string;
}

/**
 * Determine navigation target for a notification if a valid entity exists
 */
export type NotificationNavigationTarget =
  | { type: 'case'; route: `/(farmer)/cases/${string}` }
  | { type: 'animal'; route: `/(farmer)/animals/${string}` }
  | { type: 'vaccination'; route: '/(farmer)/vaccination' }
  | { type: 'none' };

export function resolveNotificationNavigation(
  notification: AppNotification
): NotificationNavigationTarget {
  if (notification.caseId && notification.caseId.trim()) {
    return {
      type: 'case',
      route: `/(farmer)/cases/${notification.caseId.trim()}`,
    };
  }

  if (notification.animalId && notification.animalId.trim()) {
    return {
      type: 'animal',
      route: `/(farmer)/animals/${notification.animalId.trim()}`,
    };
  }

  if (
    notification.type === 'RING_VACCINATION_SCHEDULED' ||
    notification.title.toLowerCase().includes('vaccin') ||
    notification.message.toLowerCase().includes('vaccin')
  ) {
    return {
      type: 'vaccination',
      route: '/(farmer)/vaccination',
    };
  }

  if (
    notification.type === 'ADVISORY' ||
    notification.type === 'OUTBREAK_CLUSTER_ALERT' ||
    notification.type === 'CONTAINMENT_ZONE_CREATED'
  ) {
    // Advisories and epidemic alerts relate directly to preventive care
    return {
      type: 'vaccination',
      route: '/(farmer)/vaccination',
    };
  }

  return { type: 'none' };
}

/**
 * Veterinarian notification categories for inbox filtering
 */
export type VetNotificationCategory = 'All' | 'Unread' | 'Cases' | 'Outbreaks' | 'Containment';

/**
 * Determine navigation target for a veterinarian notification
 */
export type VetNotificationNavigationTarget =
  | { type: 'referral'; route: `/(vet)/referrals/${string}` }
  | { type: 'map'; route: '/(vet)/map' }
  | { type: 'containment'; route: '/(vet)/containment' }
  | { type: 'none'; reason?: string };

/**
 * Resolve deep link for veterinarian notifications based on event type and linked records
 */
export function resolveVetNotificationNavigation(
  notification: AppNotification
): VetNotificationNavigationTarget {
  const caseId = notification.caseId || notification.metadata?.caseId;

  // Case Alerts: NEW_CASE_ALERT, CASE_STATUS_UPDATE, CASE_CLAIMED, CASE_ASSIGNED
  if (
    notification.type === 'NEW_CASE_ALERT' ||
    notification.type === 'CASE_STATUS_UPDATE' ||
    notification.type === 'CASE_CLAIMED' ||
    notification.type === 'CASE_ASSIGNED'
  ) {
    if (caseId && String(caseId).trim()) {
      return {
        type: 'referral',
        route: `/(vet)/referrals/${String(caseId).trim()}`,
      };
    }
    return { type: 'none', reason: 'Linked referral ID unavailable' };
  }

  // Outbreak Cluster alerts -> /(vet)/map
  if (notification.type === 'OUTBREAK_CLUSTER_ALERT') {
    return {
      type: 'map',
      route: '/(vet)/map',
    };
  }

  // Containment & Ring Vaccination alerts -> /(vet)/containment
  if (
    notification.type === 'CONTAINMENT_ZONE_CREATED' ||
    notification.type === 'CONTAINMENT_ZONE_UPDATED' ||
    notification.type === 'RING_VACCINATION_SCHEDULED'
  ) {
    return {
      type: 'containment',
      route: '/(vet)/containment',
    };
  }

  // Fallback: If any notification has an associated case ID, link to the referral details
  if (caseId && String(caseId).trim()) {
    return {
      type: 'referral',
      route: `/(vet)/referrals/${String(caseId).trim()}`,
    };
  }

  return { type: 'none' };
}

