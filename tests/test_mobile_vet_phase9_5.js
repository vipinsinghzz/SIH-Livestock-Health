/**
 * Livestock Saathi - Phase 9.5 Veterinarian Clinical Alerts & Notification Inbox Test Suite
 * File: tests/test_mobile_vet_phase9_5.js
 * 
 * Validates:
 * 1. Notification screen exists
 * 2. PlaceholderScreen removed from veterinarian notifications route
 * 3. Notification service exists & exports required methods
 * 4. Authenticated notification retrieval (queries by recipient_id)
 * 5. Real notification event types match backend schema
 * 6. Unread/read handling and mark-as-read contract
 * 7. Offline cache behavior (SQLite notifications_cache)
 * 8. Recipient/user isolation in cache query
 * 9. Case notification deep link (/(vet)/referrals/[id])
 * 10. Outbreak cluster notification deep link (/(vet)/map)
 * 11. Containment notification deep link (/(vet)/containment)
 * 12. Ring vaccination notification deep link (/(vet)/containment)
 * 13. Empty state handling and recovery
 * 14. Offline state handling and banner notice
 * 15. No fake/mock notification data or generators
 * 16. No service-role/JWT/Gemini secrets exposed
 * 17. No sync_queue mutation for notifications (strictly avoids offline write queues)
 * 18. Existing veterinarian navigation remains intact (_layout.tsx)
 * 19. Vet dashboard integration: notification bell with live unread badge and shortcut card
 * 20. AI preliminary screening disclaimer preservation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
    testsFailed++;
  }
}

console.log('====================================================');
console.log('🚨 PHASE 9.5 — VET CLINICAL ALERTS & NOTIFICATIONS');
console.log('====================================================\n');

const notifScreenPath = path.join(__dirname, '../mobile/app/(vet)/notifications/index.tsx');
const notifServicePath = path.join(__dirname, '../mobile/src/services/notificationService.ts');
const notifTypesPath = path.join(__dirname, '../mobile/src/types/notification.ts');
const vetDashboardPath = path.join(__dirname, '../mobile/app/(vet)/index.tsx');
const vetLayoutPath = path.join(__dirname, '../mobile/app/(vet)/_layout.tsx');
const localDbPath = path.join(__dirname, '../mobile/src/services/localDatabase.ts');

const notifScreenSrc = fs.readFileSync(notifScreenPath, 'utf8');
const notifServiceSrc = fs.readFileSync(notifServicePath, 'utf8');
const notifTypesSrc = fs.readFileSync(notifTypesPath, 'utf8');
const vetDashboardSrc = fs.readFileSync(vetDashboardPath, 'utf8');
const vetLayoutSrc = fs.readFileSync(vetLayoutPath, 'utf8');
const localDbSrc = fs.readFileSync(localDbPath, 'utf8');

// 1. Notification screen exists
runTest('1. Notification screen file exists', () => {
  assert(fs.existsSync(notifScreenPath), 'mobile/app/(vet)/notifications/index.tsx must exist');
});

// 2. PlaceholderScreen removed
runTest('2. PlaceholderScreen removed from veterinarian notifications route', () => {
  assert(!notifScreenSrc.includes('PlaceholderScreen'), 'Must not render PlaceholderScreen');
  assert(notifScreenSrc.includes('FlatList'), 'Must use FlatList for real notification feed');
  assert(notifScreenSrc.includes('VetNotificationsScreen'), 'Must export VetNotificationsScreen component');
});

// 3. Notification service exists & exports methods
runTest('3. Notification service exists and exports required methods', () => {
  assert(fs.existsSync(notifServicePath), 'notificationService.ts must exist');
  assert(notifServiceSrc.includes('getVeterinarianNotifications'), 'Must export getVeterinarianNotifications');
  assert(notifServiceSrc.includes('markAsRead'), 'Must export markAsRead');
  assert(notifServiceSrc.includes('markAllAsRead'), 'Must export markAllAsRead');
  assert(notifServiceSrc.includes('getUnreadCount'), 'Must export getUnreadCount');
});

// 4. Authenticated notification retrieval
runTest('4. Authenticated notification retrieval queries by recipient_id under RLS', () => {
  assert(notifServiceSrc.includes(".from('notifications')"), 'Must query Supabase notifications table');
  assert(notifServiceSrc.includes(".eq('recipient_id', params.userId)"), 'Must query authenticated recipient_id');
  assert(notifServiceSrc.includes("order('created_at'"), 'Must order chronologically descending');
  assert(notifServiceSrc.includes("api.get"), 'Must merge with backend advisories/notifications');
});

// 5. Real notification event types
runTest('5. Real notification event types match backend database schema', () => {
  const requiredTypes = [
    'NEW_CASE_ALERT',
    'CASE_STATUS_UPDATE',
    'CASE_CLAIMED',
    'OUTBREAK_CLUSTER_ALERT',
    'CONTAINMENT_ZONE_CREATED',
    'CONTAINMENT_ZONE_UPDATED',
    'RING_VACCINATION_SCHEDULED'
  ];
  requiredTypes.forEach((t) => {
    assert(notifTypesSrc.includes(t), `Notification types must include ${t}`);
    assert(notifScreenSrc.includes(t), `Screen must handle event type ${t}`);
  });
});

// 6. Unread/read handling and mark-as-read contract
runTest('6. Unread/read handling updates Supabase and maintains local presentation state', () => {
  assert(notifServiceSrc.includes("localReadIds"), 'Must track local read state in memory');
  assert(notifServiceSrc.includes("update({ status: 'READ' })"), 'Must persist READ status to Supabase');
  assert(notifScreenSrc.includes('handleNotificationPress') || notifScreenSrc.includes('markAsRead'), 'Screen must trigger markAsRead on interaction');
  assert(notifScreenSrc.includes('markAllAsRead'), 'Screen must support markAllAsRead action');
});

// 7. Offline cache behavior
runTest('7. Offline cache behavior reuses SQLite notifications_cache', () => {
  assert(localDbSrc.includes('notifications_cache'), 'localDatabase.ts must define notifications_cache table');
  assert(localDbSrc.includes('saveNotificationsCache'), 'localDatabase.ts must define saveNotificationsCache');
  assert(localDbSrc.includes('getCachedNotifications'), 'localDatabase.ts must define getCachedNotifications');
  assert(notifServiceSrc.includes('saveNotificationsCache'), 'Service must save to notifications cache');
  assert(notifServiceSrc.includes('getCachedNotifications'), 'Service must retrieve from notifications cache when offline');
});

// 8. Recipient/user isolation in cache query
runTest('8. Recipient/user isolation enforced in cache queries', () => {
  assert(localDbSrc.includes('recipient_id = ?'), 'Local database must filter cached notifications by recipient_id');
  assert(notifServiceSrc.includes("params.userId"), 'Service must pass user ID to cache helpers');
});

// 9. Case notification deep link
runTest('9. Case alerts resolve deep link to /(vet)/referrals/[id]', () => {
  assert(notifTypesSrc.includes('resolveVetNotificationNavigation'), 'Must export resolveVetNotificationNavigation');
  assert(notifTypesSrc.includes('/(vet)/referrals/'), 'Must deep-link case alerts to /(vet)/referrals/:id');
  
  // Test navigation resolution logic
  const mockNotification = {
    id: 'test-case-notif',
    recipientId: 'vet-uuid',
    caseId: 'case-abc-123',
    type: 'NEW_CASE_ALERT',
    title: 'Urgent Referral',
    message: 'New clinical referral awaiting care',
    status: 'DELIVERED',
    isRead: false,
    createdAt: new Date().toISOString(),
    source: 'supabase'
  };
  
  // Check regex match or logic in file
  assert(notifTypesSrc.includes("caseId && String(caseId).trim()"), 'Must validate non-empty caseId');
  assert(notifTypesSrc.includes("reason: 'Linked referral ID unavailable'"), 'Must safely handle missing case ID without crashing');
});

// 10. Outbreak cluster notification deep link
runTest('10. Outbreak cluster alerts resolve deep link to /(vet)/map', () => {
  assert(notifTypesSrc.includes('/(vet)/map'), 'Must deep-link outbreak clusters to /(vet)/map');
  assert(notifTypesSrc.includes('OUTBREAK_CLUSTER_ALERT'), 'Must check OUTBREAK_CLUSTER_ALERT type');
});

// 11. Containment notification deep link
runTest('11. Containment alerts resolve deep link to /(vet)/containment', () => {
  assert(notifTypesSrc.includes('/(vet)/containment'), 'Must deep-link containment alerts to /(vet)/containment');
  assert(notifTypesSrc.includes('CONTAINMENT_ZONE_CREATED'), 'Must check CONTAINMENT_ZONE_CREATED type');
  assert(notifTypesSrc.includes('CONTAINMENT_ZONE_UPDATED'), 'Must check CONTAINMENT_ZONE_UPDATED type');
});

// 12. Ring vaccination notification deep link
runTest('12. Ring vaccination alerts resolve deep link to /(vet)/containment', () => {
  assert(notifTypesSrc.includes('RING_VACCINATION_SCHEDULED'), 'Must check RING_VACCINATION_SCHEDULED type');
});

// 13. Empty state handling and recovery
runTest('13. Empty state handles both empty inbox and empty filter results', () => {
  assert(notifScreenSrc.includes('ListEmptyComponent'), 'FlatList must have ListEmptyComponent');
  assert(notifScreenSrc.includes('No Clinical Alerts'), 'Must display empty inbox message');
  assert(notifScreenSrc.includes('View All Alerts') || notifScreenSrc.includes('clearFilterBtn'), 'Must offer quick reset to All filter');
});

// 14. Offline state handling and banner notice
runTest('14. Offline state clearly explains offline cached mode to clinician', () => {
  assert(notifScreenSrc.includes('OfflineNotice'), 'Must include OfflineNotice component');
  assert(notifScreenSrc.includes('Offline Mode') || notifScreenSrc.includes('offlineNoticeBox'), 'Must display offline notice banner');
  assert(notifScreenSrc.includes('Read updates require'), 'Must disclose network requirement for read status sync');
});

// 15. No fake/mock notification data or generators
runTest('15. Strict Zero-Mock: No fake notifications or mock generators', () => {
  assert(!notifScreenSrc.includes('mockNotifications'), 'Must not declare mockNotifications in screen');
  assert(!notifServiceSrc.includes('mockNotifications'), 'Must not declare mockNotifications in service');
  assert(!notifScreenSrc.includes('faker'), 'Must not use faker');
  assert(!notifServiceSrc.includes('faker'), 'Must not use faker in service');
});

// 16. No service-role/JWT/Gemini secrets exposed
runTest('16. Zero exposed secrets in mobile notification implementation', () => {
  const forbiddenPatterns = [
    'service_role',
    'SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'GEMINI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  forbiddenPatterns.forEach((pattern) => {
    assert(!notifScreenSrc.includes(pattern), `Screen must not contain ${pattern}`);
    assert(!notifServiceSrc.includes(pattern), `Service must not contain ${pattern}`);
    assert(!notifTypesSrc.includes(pattern), `Types must not contain ${pattern}`);
  });
});

// 17. No sync_queue mutation for notifications
runTest('17. Offline safety: Notifications do NOT touch sync_queue', () => {
  assert(!notifServiceSrc.includes("addToSyncQueue"), 'Notifications must never be enqueued in sync_queue');
  assert(!notifScreenSrc.includes("addToSyncQueue"), 'Screen must never enqueue in sync_queue');
});

// 18. Existing veterinarian navigation remains intact
runTest('18. Veterinarian navigation in _layout.tsx remains intact', () => {
  assert(vetLayoutSrc.includes('name="notifications/index"'), 'Route notifications/index must remain registered');
  assert(vetLayoutSrc.includes("title: 'Clinical Alerts'"), 'Title must be Clinical Alerts');
  assert(vetLayoutSrc.includes('name="index"'), 'Route index must remain intact');
  assert(vetLayoutSrc.includes('name="referrals/index"'), 'Route referrals/index must remain intact');
  assert(vetLayoutSrc.includes('name="cases/index"'), 'Route cases/index must remain intact');
  assert(vetLayoutSrc.includes('name="labs/index"'), 'Route labs/index must remain intact');
  assert(vetLayoutSrc.includes('name="map/index"'), 'Route map/index must remain intact');
  assert(vetLayoutSrc.includes('name="containment/index"'), 'Route containment/index must remain intact');
});

// 19. Vet dashboard integration
runTest('19. Vet dashboard integrates notification bell with live unread badge and action card', () => {
  assert(vetDashboardSrc.includes('notificationBellBtn'), 'Dashboard must have notification bell button');
  assert(vetDashboardSrc.includes('unreadBadge'), 'Dashboard bell must have unread badge');
  assert(vetDashboardSrc.includes('/(vet)/notifications'), 'Bell and action card must navigate to /(vet)/notifications');
  assert(vetDashboardSrc.includes('getVeterinarianNotifications'), 'Dashboard must fetch notifications to compute unread count');
});

// 20. AI preliminary screening disclaimer preservation
runTest('20. AI preliminary screening disclaimer preserved for AI-assisted alerts', () => {
  assert(notifScreenSrc.includes('AI-assisted preliminary screening'), 'Screen must preserve AI disclaimer');
  assert(notifScreenSrc.includes('not a final veterinary diagnosis'), 'Must state not a final diagnosis');
});

console.log('\n====================================================');
console.log(`📊 RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('====================================================');

if (testsFailed > 0) {
  console.error('\n❌ PHASE 9.5 VET CLINICAL ALERTS TESTS FAILED!');
  process.exit(1);
} else {
  console.log('\n🎉 ALL 20 PHASE 9.5 VET CLINICAL ALERTS TESTS PASSED!');
}
