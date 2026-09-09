import Dexie from 'dexie';

export const db = new Dexie('PashuRakshakOfflineDB');

db.version(1).stores({
  offlineReports: '++id, createdAt, synced, species, block'
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
