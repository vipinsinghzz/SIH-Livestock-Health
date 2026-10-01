/**
 * PashuCare - Farmer Mobile Notifications Verification Suite
 * File: tests/test_mobile_notifications.js
 * 
 * Deterministic unit verification for mobile notification domain types,
 * data normalization, entity navigation resolution, and filter derivations.
 */

const assert = require('assert');

// 1. Navigation resolution logic test
function resolveNotificationNavigation(notification) {
  if (notification.caseId && String(notification.caseId).trim()) {
    return {
      type: 'case',
      route: `/(farmer)/cases/${String(notification.caseId).trim()}`,
    };
  }

  if (notification.animalId && String(notification.animalId).trim()) {
    return {
      type: 'animal',
      route: `/(farmer)/animals/${String(notification.animalId).trim()}`,
    };
  }

  if (
    notification.type === 'RING_VACCINATION_SCHEDULED' ||
    (notification.title && notification.title.toLowerCase().includes('vaccin')) ||
    (notification.message && notification.message.toLowerCase().includes('vaccin'))
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
    return {
      type: 'vaccination',
      route: '/(farmer)/vaccination',
    };
  }

  return { type: 'none' };
}

// 2. Normalization logic test (matching mobile/src/services/notificationService.ts)
function normalizeRecord(raw, source, localReadIds = new Set()) {
  const id = String(raw.id || raw._id || '');
  const recipientId = String(raw.recipient_id || raw.recipientId || '');
  const caseId = raw.case_id || raw.caseId || raw.metadata?.caseId || undefined;
  const caseNumber = raw.case_number || raw.caseNumber || raw.metadata?.caseNumber || undefined;
  const animalId = raw.animal_id || raw.animalId || raw.metadata?.animalId || undefined;

  let type = 'GENERAL';
  if (raw.type) {
    type = raw.type;
  } else if (source === 'advisory') {
    type = 'ADVISORY';
  }

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
  const rawStatus = (raw.status || 'DELIVERED').toUpperCase();
  const status = rawStatus === 'READ' || localReadIds.has(id) ? 'READ' : rawStatus;
  const isRead = status === 'READ' || localReadIds.has(id);

  let severity = undefined;
  if (raw.severity) {
    severity = raw.severity;
  } else if (raw.metadata?.risk) {
    const risk = String(raw.metadata.risk).toLowerCase();
    if (risk.includes('critical')) severity = 'Critical';
    else if (risk.includes('high')) severity = 'High';
    else if (risk.includes('mod')) severity = 'Moderate';
    else severity = 'Low';
  }

  const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();

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
    source,
  };
}

// 3. Category Filter derivation test (matching mobile/app/(farmer)/notifications/index.tsx)
function filterNotifications(notifications, category) {
  return notifications.filter((item) => {
    switch (category) {
      case 'Unread':
        return !item.isRead;
      case 'Cases':
        return Boolean(
          item.caseId ||
          item.caseNumber ||
          (item.type && item.type.includes('CASE'))
        );
      case 'Advisory':
        return (
          item.type === 'ADVISORY' ||
          item.source === 'advisory' ||
          (item.type && (item.type.includes('OUTBREAK') || item.type.includes('CONTAINMENT')))
        );
      case 'Health':
        return Boolean(
          item.severity ||
          (item.type && item.type.includes('ALERT')) ||
          item.type === 'RING_VACCINATION_SCHEDULED' ||
          item.metadata?.disease
        );
      case 'All':
      default:
        return true;
    }
  });
}

function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 8.1 Mobile Notification Tests');
  console.log('====================================================\n');

  // Test 1: Navigation resolution for Case referral
  console.log('Test 1: Case Referral Navigation Resolution');
  const navCase = resolveNotificationNavigation({
    id: 'notif-1',
    caseId: '550e8400-e29b-41d4-a716-446655440000',
    type: 'CASE_STATUS_UPDATE',
    title: 'Case Update',
    message: 'Your case status changed',
  });
  assert.strictEqual(navCase.type, 'case');
  assert.strictEqual(navCase.route, '/(farmer)/cases/550e8400-e29b-41d4-a716-446655440000');
  console.log('  ✓ Case navigation target correctly resolved to /(farmer)/cases/:id\n');

  // Test 2: Navigation resolution for Animal Profile
  console.log('Test 2: Animal Profile Navigation Resolution');
  const navAnimal = resolveNotificationNavigation({
    id: 'notif-2',
    animalId: 'anim-9876',
    type: 'GENERAL',
    title: 'Health Record Updated',
    message: 'Profile refreshed',
  });
  assert.strictEqual(navAnimal.type, 'animal');
  assert.strictEqual(navAnimal.route, '/(farmer)/animals/anim-9876');
  console.log('  ✓ Animal navigation target correctly resolved to /(farmer)/animals/:id\n');

  // Test 3: Navigation resolution for Ring Vaccination / Advisory
  console.log('Test 3: Vaccination Drive / Advisory Navigation Resolution');
  const navVac = resolveNotificationNavigation({
    id: 'notif-3',
    type: 'RING_VACCINATION_SCHEDULED',
    title: 'Ring Vaccination Drive Scheduled',
    message: 'Emergency camp in Pune district',
  });
  assert.strictEqual(navVac.type, 'vaccination');
  assert.strictEqual(navVac.route, '/(farmer)/vaccination');

  const navAdv = resolveNotificationNavigation({
    id: 'notif-4',
    type: 'OUTBREAK_CLUSTER_ALERT',
    title: 'High Risk Outbreak Alert',
    message: 'Lumpy Skin Disease reported in 5km buffer',
  });
  assert.strictEqual(navAdv.type, 'vaccination');
  assert.strictEqual(navAdv.route, '/(farmer)/vaccination');
  console.log('  ✓ Vaccination & Outbreak targets correctly resolved to /(farmer)/vaccination\n');

  // Test 4: Navigation resolution for unlinked notification
  console.log('Test 4: Unlinked General Notification Resolution');
  const navNone = resolveNotificationNavigation({
    id: 'notif-5',
    type: 'GENERAL',
    title: 'Welcome to PashuCare',
    message: 'Getting started guide',
  });
  assert.strictEqual(navNone.type, 'none');
  console.log('  ✓ Unlinked notification correctly resolves to type: none (no fake IDs constructed)\n');

  // Test 5: Normalization of Supabase snake_case records
  console.log('Test 5: Supabase Record Normalization');
  const rawSb = {
    id: 'sb-uuid-001',
    recipient_id: 'user-uuid-123',
    case_id: 'case-uuid-456',
    case_number: 'CASE-2026-0042',
    type: 'CASE_ASSIGNED',
    title: 'Veterinarian Assigned: Dr. Patil',
    message: 'Dr. Patil has claimed your referral case for Lumpy Skin Disease.',
    district: 'Pune',
    status: 'DELIVERED',
    metadata: {
      disease: 'Lumpy Skin Disease',
      risk: 'High',
      assignedVetName: 'Dr. Patil',
    },
    created_at: '2026-09-17T12:00:00.000Z',
  };

  const normSb = normalizeRecord(rawSb, 'supabase');
  assert.strictEqual(normSb.id, 'sb-uuid-001');
  assert.strictEqual(normSb.recipientId, 'user-uuid-123');
  assert.strictEqual(normSb.caseId, 'case-uuid-456');
  assert.strictEqual(normSb.caseNumber, 'CASE-2026-0042');
  assert.strictEqual(normSb.type, 'CASE_ASSIGNED');
  assert.strictEqual(normSb.isRead, false);
  assert.strictEqual(normSb.status, 'DELIVERED');
  assert.strictEqual(normSb.severity, 'High');
  assert.strictEqual(normSb.source, 'supabase');
  console.log('  ✓ Supabase record accurately mapped to AppNotification\n');

  // Test 6: Normalization of bilingual and advisory records
  console.log('Test 6: Bilingual & Advisory Record Normalization');
  const rawAdv = {
    id: 'adv-001',
    title: { en: 'LSD Precautionary Advisory', hi: 'लम्पी त्वचा रोग चेतावनी' },
    message: { en: 'Isolate affected cattle immediately.', hi: 'संक्रमित मवेशियों को तुरंत अलग करें।' },
    severity: 'Critical',
    targetDistrict: 'Satara',
    createdAt: '2026-09-17T10:00:00.000Z',
  };

  const normAdv = normalizeRecord(rawAdv, 'advisory');
  assert.strictEqual(normAdv.id, 'adv-001');
  assert.strictEqual(normAdv.type, 'ADVISORY');
  assert.strictEqual(normAdv.title, 'LSD Precautionary Advisory');
  assert.strictEqual(normAdv.message, 'Isolate affected cattle immediately.');
  assert.strictEqual(normAdv.severity, 'Critical');
  assert.strictEqual(normAdv.district, 'Satara');
  assert.strictEqual(normAdv.source, 'advisory');
  console.log('  ✓ Bilingual advisory correctly resolved with severity and district\n');

  // Test 7: Filter derivations
  console.log('Test 7: Filter Category Derivations');
  const sampleFeed = [
    normSb, // Case referral, unread, High severity
    normAdv, // Advisory, unread, Critical severity
    {
      ...normSb,
      id: 'sb-uuid-002',
      status: 'READ',
      isRead: true,
      caseId: undefined,
      caseNumber: undefined,
      type: 'GENERAL',
      severity: undefined,
      metadata: {},
    },
  ];

  const allFiltered = filterNotifications(sampleFeed, 'All');
  assert.strictEqual(allFiltered.length, 3);

  const unreadFiltered = filterNotifications(sampleFeed, 'Unread');
  assert.strictEqual(unreadFiltered.length, 2);

  const casesFiltered = filterNotifications(sampleFeed, 'Cases');
  assert.strictEqual(casesFiltered.length, 1);
  assert.strictEqual(casesFiltered[0].id, 'sb-uuid-001');

  const advisoryFiltered = filterNotifications(sampleFeed, 'Advisory');
  assert.strictEqual(advisoryFiltered.length, 1);
  assert.strictEqual(advisoryFiltered[0].id, 'adv-001');

  const healthFiltered = filterNotifications(sampleFeed, 'Health');
  assert.strictEqual(healthFiltered.length, 2);
  console.log('  ✓ Category filters (All, Unread, Cases, Advisory, Health) derived reliably\n');

  // Test 8: Read state preservation
  console.log('Test 8: Read State Preservation');
  const localRead = new Set(['sb-uuid-001']);
  const markedNorm = normalizeRecord(rawSb, 'supabase', localRead);
  assert.strictEqual(markedNorm.isRead, true);
  assert.strictEqual(markedNorm.status, 'READ');
  console.log('  ✓ Local presentation read state correctly applied\n');

  console.log('====================================================');
  console.log('✅ ALL MOBILE NOTIFICATION TESTS PASSED SUCCESSFULLY');
  console.log('====================================================\n');
}

runTests();
