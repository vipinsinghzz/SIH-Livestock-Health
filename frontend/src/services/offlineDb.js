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
  return await db.offlineReports.where('synced').equals(0).or('synced').equals(false).toArray();
};

export const markReportSynced = async (id) => {
  return await db.offlineReports.update(id, { synced: true, syncedAt: new Date().toISOString() });
};

export const deleteOfflineReport = async (id) => {
  return await db.offlineReports.delete(id);
};

export const clearSyncedReports = async () => {
  return await db.offlineReports.where('synced').equals(true).delete();
};
