import Dexie from 'dexie';

export const db = new Dexie('PashuRakshakOfflineDB');

db.version(1).stores({
  offlineReports: '++id, createdAt, synced, species, block'
});

db.version(2).stores({
  offlineReports: '++id, createdAt, synced, species, block',
  offlineCases: '++id, createdAt, synced, disease, districtId',
  offlineCaseActions: '++id, caseId, action, timestamp, synced'
});

export const saveOfflineReport = async (reportData) => {
  const record = {
    ...reportData,
    createdAt: new Date().toISOString(),
    synced: false
  };
  const id = await db.offlineReports.add(record);
  console.log(`[OfflineDB] Stored report #${id} in IndexedDB`);
  return id;
};

export const getPendingReports = async () => {
  try {
    return await db.offlineReports.filter((r) => !r.synced).toArray();
  } catch (err) {
    console.warn('[OfflineDB] getPendingReports warning:', err?.message || err);
    return [];
  }
};

export const markReportSynced = async (id) => {
  return await db.offlineReports.update(id, { synced: true, syncedAt: new Date().toISOString() });
};

export const deleteOfflineReport = async (id) => {
  return await db.offlineReports.delete(id);
};

export const clearSyncedReports = async () => {
  try {
    const syncedItems = await db.offlineReports.filter((r) => !!r.synced).toArray();
    const ids = syncedItems.map((i) => i.id);
    return await db.offlineReports.bulkDelete(ids);
  } catch (err) {
    console.warn('[OfflineDB] clearSyncedReports error:', err?.message || err);
  }
};

// Offline Case Storage
export const saveOfflineCase = async (caseData) => {
  const record = {
    ...caseData,
    createdAt: new Date().toISOString(),
    synced: false
  };
  const id = await db.offlineCases.add(record);
  console.log(`[OfflineDB] Stored offline case #${id}`);
  return id;
};

export const getPendingCases = async () => {
  try {
    return await db.offlineCases.filter((c) => !c.synced).toArray();
  } catch (err) {
    console.warn('[OfflineDB] getPendingCases warning:', err?.message || err);
    return [];
  }
};

export const markCaseSynced = async (id) => {
  return await db.offlineCases.update(id, { synced: true, syncedAt: new Date().toISOString() });
};

export const saveOfflineCaseAction = async (caseId, action, payload = {}) => {
  const record = {
    caseId,
    action,
    payload,
    timestamp: new Date().toISOString(),
    synced: false
  };
  return await db.offlineCaseActions.add(record);
};

export const getPendingCaseActions = async () => {
  try {
    return await db.offlineCaseActions.filter((a) => !a.synced).toArray();
  } catch (err) {
    console.warn('[OfflineDB] getPendingCaseActions warning:', err?.message || err);
    return [];
  }
};

export const markCaseActionSynced = async (id) => {
  return await db.offlineCaseActions.update(id, { synced: true, syncedAt: new Date().toISOString() });
};
