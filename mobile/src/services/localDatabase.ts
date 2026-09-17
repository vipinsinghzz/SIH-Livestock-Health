/**
 * Livestock Saathi - Local SQLite Persistence Service
 * File: mobile/src/services/localDatabase.ts
 * 
 * Production-ready local database backed by expo-sqlite for durable offline caching
 * and reliable background synchronization queues.
 * 
 * Strictly isolates farmer records and protects against storing unencrypted secrets.
 */

import * as SQLite from 'expo-sqlite';
import { Animal } from '../types/animal';
import { DiseaseCase } from '../types/case';
import { VaccinationDrive, PreventiveAdvisory } from '../types/vaccination';
import { AppNotification } from '../types/notification';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED';

export interface SyncQueueItem {
  id: string;
  farmerId: string;
  entityType: 'ANIMAL' | 'CASE';
  operation: 'CREATE' | 'UPDATE';
  localId: string;
  endpoint: string;
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
  status: SyncStatus;
  lastError?: string;
}

const DB_NAME = 'livestock_saathi_offline.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Get or initialize SQLite Database instance with migration schema
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Create cache and sync queue tables
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS animals_cache (
          id TEXT PRIMARY KEY,
          farmer_id TEXT NOT NULL,
          data TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'SYNCED',
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_animals_farmer ON animals_cache(farmer_id);

        CREATE TABLE IF NOT EXISTS cases_cache (
          id TEXT PRIMARY KEY,
          farmer_id TEXT NOT NULL,
          data TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'SYNCED',
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cases_farmer ON cases_cache(farmer_id);

        CREATE TABLE IF NOT EXISTS vaccinations_cache (
          id TEXT PRIMARY KEY,
          district TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_vaccinations_dist ON vaccinations_cache(district);

        CREATE TABLE IF NOT EXISTS notifications_cache (
          id TEXT PRIMARY KEY,
          recipient_id TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_recip ON notifications_cache(recipient_id);

        CREATE TABLE IF NOT EXISTS advisories_cache (
          id TEXT PRIMARY KEY,
          district TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_advisories_dist ON advisories_cache(district);

        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          farmer_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          operation TEXT NOT NULL,
          local_id TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'PENDING',
          last_error TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status, farmer_id);
      `);

      // Crash recovery: reset any items interrupted in 'SYNCING' state back to 'PENDING'
      await db.runAsync(`UPDATE sync_queue SET status = 'PENDING' WHERE status = 'SYNCING'`);

      return db;
    })();
  }
  return dbPromise;
}

// ============================================================================
// 1. ANIMALS CACHE
// ============================================================================

export async function saveAnimalsCache(farmerId: string, animals: Animal[]): Promise<void> {
  if (!farmerId) return;
  try {
    const db = await getDatabase();
    const now = Date.now();

    for (const a of animals) {
      const id = String(a.id || a._id);
      if (!id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO animals_cache (id, farmer_id, data, sync_status, updated_at)
         VALUES (?, ?, ?, 'SYNCED', ?)`,
        [id, farmerId, JSON.stringify(a), now]
      );
    }
  } catch (err) {
    console.warn('[LocalDatabase] Error saving animals cache:', err);
  }
}

export async function saveLocalPendingAnimal(farmerId: string, animal: Animal): Promise<void> {
  try {
    const db = await getDatabase();
    const id = String(animal.id || animal._id);
    await db.runAsync(
      `INSERT OR REPLACE INTO animals_cache (id, farmer_id, data, sync_status, updated_at)
       VALUES (?, ?, ?, 'PENDING_CREATE', ?)`,
      [id, farmerId, JSON.stringify(animal), Date.now()]
    );
  } catch (err) {
    console.warn('[LocalDatabase] Error saving local pending animal:', err);
  }
}

export async function getCachedAnimals(
  farmerId: string
): Promise<{ animals: (Animal & { isPendingSync?: boolean })[]; lastUpdated: number | null }> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ data: string; sync_status: string; updated_at: number }>(
      `SELECT data, sync_status, updated_at FROM animals_cache WHERE farmer_id = ? ORDER BY updated_at DESC`,
      [farmerId]
    );

    if (!rows || rows.length === 0) {
      return { animals: [], lastUpdated: null };
    }

    let latestUpdated = 0;
    const animals: (Animal & { isPendingSync?: boolean })[] = [];

    for (const r of rows) {
      try {
        const parsed = JSON.parse(r.data);
        if (r.sync_status === 'PENDING_CREATE') {
          parsed.isPendingSync = true;
        }
        animals.push(parsed);
        if (r.updated_at > latestUpdated) {
          latestUpdated = r.updated_at;
        }
      } catch (e) {}
    }

    return { animals, lastUpdated: latestUpdated > 0 ? latestUpdated : null };
  } catch (err) {
    console.warn('[LocalDatabase] Error reading cached animals:', err);
    return { animals: [], lastUpdated: null };
  }
}

export async function reconcileAnimalCacheId(
  localId: string,
  serverAnimal: Animal,
  farmerId: string
): Promise<void> {
  try {
    const db = await getDatabase();
    // Delete local temporary record
    await db.runAsync(`DELETE FROM animals_cache WHERE id = ?`, [localId]);
    // Insert authoritative server record
    const serverId = String(serverAnimal.id || serverAnimal._id);
    await db.runAsync(
      `INSERT OR REPLACE INTO animals_cache (id, farmer_id, data, sync_status, updated_at)
       VALUES (?, ?, ?, 'SYNCED', ?)`,
      [serverId, farmerId, JSON.stringify(serverAnimal), Date.now()]
    );
  } catch (err) {
    console.warn('[LocalDatabase] Error reconciling animal cache id:', err);
  }
}

// ============================================================================
// 2. CASES CACHE
// ============================================================================

export async function saveCasesCache(farmerId: string, cases: DiseaseCase[]): Promise<void> {
  if (!farmerId) return;
  try {
    const db = await getDatabase();
    const now = Date.now();

    for (const c of cases) {
      const id = String(c.id || c._id);
      if (!id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO cases_cache (id, farmer_id, data, sync_status, updated_at)
         VALUES (?, ?, ?, 'SYNCED', ?)`,
        [id, farmerId, JSON.stringify(c), now]
      );
    }
  } catch (err) {
    console.warn('[LocalDatabase] Error saving cases cache:', err);
  }
}

export async function saveLocalPendingCase(farmerId: string, caseItem: DiseaseCase): Promise<void> {
  try {
    const db = await getDatabase();
    const id = String(caseItem.id || caseItem._id);
    await db.runAsync(
      `INSERT OR REPLACE INTO cases_cache (id, farmer_id, data, sync_status, updated_at)
       VALUES (?, ?, ?, 'PENDING_CREATE', ?)`,
      [id, farmerId, JSON.stringify(caseItem), Date.now()]
    );
  } catch (err) {
    console.warn('[LocalDatabase] Error saving local pending case:', err);
  }
}

export async function getCachedCases(
  farmerId: string
): Promise<{ cases: (DiseaseCase & { isPendingSync?: boolean })[]; lastUpdated: number | null }> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ data: string; sync_status: string; updated_at: number }>(
      `SELECT data, sync_status, updated_at FROM cases_cache WHERE farmer_id = ? ORDER BY updated_at DESC`,
      [farmerId]
    );

    if (!rows || rows.length === 0) {
      return { cases: [], lastUpdated: null };
    }

    let latestUpdated = 0;
    const cases: (DiseaseCase & { isPendingSync?: boolean })[] = [];

    for (const r of rows) {
      try {
        const parsed = JSON.parse(r.data);
        if (r.sync_status === 'PENDING_CREATE') {
          parsed.isPendingSync = true;
        }
        cases.push(parsed);
        if (r.updated_at > latestUpdated) {
          latestUpdated = r.updated_at;
        }
      } catch (e) {}
    }

    return { cases, lastUpdated: latestUpdated > 0 ? latestUpdated : null };
  } catch (err) {
    console.warn('[LocalDatabase] Error reading cached cases:', err);
    return { cases: [], lastUpdated: null };
  }
}

export async function reconcileCaseCacheId(
  localId: string,
  serverCase: DiseaseCase,
  farmerId: string
): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM cases_cache WHERE id = ?`, [localId]);
    const serverId = String(serverCase.id || serverCase._id);
    await db.runAsync(
      `INSERT OR REPLACE INTO cases_cache (id, farmer_id, data, sync_status, updated_at)
       VALUES (?, ?, ?, 'SYNCED', ?)`,
      [serverId, farmerId, JSON.stringify(serverCase), Date.now()]
    );
  } catch (err) {
    console.warn('[LocalDatabase] Error reconciling case cache id:', err);
  }
}

// ============================================================================
// 3. VACCINATIONS & ADVISORIES CACHE
// ============================================================================

export async function saveVaccinationsCache(district: string, drives: VaccinationDrive[]): Promise<void> {
  try {
    const db = await getDatabase();
    const targetDist = district || 'All';
    const now = Date.now();

    for (const d of drives) {
      const id = String(d._id || d.campId || (d as any).id);
      if (!id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO vaccinations_cache (id, district, data, updated_at)
         VALUES (?, ?, ?, ?)`,
        [id, targetDist, JSON.stringify(d), now]
      );
    }
  } catch (err) {
    console.warn('[LocalDatabase] Error saving vaccinations cache:', err);
  }
}

export async function getCachedVaccinations(
  district?: string
): Promise<{ drives: VaccinationDrive[]; lastUpdated: number | null }> {
  try {
    const db = await getDatabase();
    const query = district
      ? `SELECT data, updated_at FROM vaccinations_cache WHERE district = ? OR district = 'All' ORDER BY updated_at DESC`
      : `SELECT data, updated_at FROM vaccinations_cache ORDER BY updated_at DESC`;
    const params = district ? [district] : [];

    const rows = await db.getAllAsync<{ data: string; updated_at: number }>(query, params);
    if (!rows || rows.length === 0) return { drives: [], lastUpdated: null };

    let latestUpdated = 0;
    const drives: VaccinationDrive[] = [];
    for (const r of rows) {
      try {
        drives.push(JSON.parse(r.data));
        if (r.updated_at > latestUpdated) latestUpdated = r.updated_at;
      } catch (e) {}
    }
    return { drives, lastUpdated: latestUpdated > 0 ? latestUpdated : null };
  } catch (err) {
    return { drives: [], lastUpdated: null };
  }
}

export async function saveAdvisoriesCache(district: string, advisories: PreventiveAdvisory[]): Promise<void> {
  try {
    const db = await getDatabase();
    const targetDist = district || 'All';
    const now = Date.now();

    for (const a of advisories) {
      const id = String(a._id || (a as any).id);
      if (!id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO advisories_cache (id, district, data, updated_at)
         VALUES (?, ?, ?, ?)`,
        [id, targetDist, JSON.stringify(a), now]
      );
    }
  } catch (err) {
    console.warn('[LocalDatabase] Error saving advisories cache:', err);
  }
}

export async function getCachedAdvisories(
  district?: string
): Promise<{ advisories: PreventiveAdvisory[]; lastUpdated: number | null }> {
  try {
    const db = await getDatabase();
    const query = district
      ? `SELECT data, updated_at FROM advisories_cache WHERE district = ? OR district = 'All' ORDER BY updated_at DESC`
      : `SELECT data, updated_at FROM advisories_cache ORDER BY updated_at DESC`;
    const params = district ? [district] : [];

    const rows = await db.getAllAsync<{ data: string; updated_at: number }>(query, params);
    if (!rows || rows.length === 0) return { advisories: [], lastUpdated: null };

    let latestUpdated = 0;
    const advisories: PreventiveAdvisory[] = [];
    for (const r of rows) {
      try {
        advisories.push(JSON.parse(r.data));
        if (r.updated_at > latestUpdated) latestUpdated = r.updated_at;
      } catch (e) {}
    }
    return { advisories, lastUpdated: latestUpdated > 0 ? latestUpdated : null };
  } catch (err) {
    return { advisories: [], lastUpdated: null };
  }
}

export async function saveNotificationsCache(recipientId: string, notifs: AppNotification[]): Promise<void> {
  try {
    const db = await getDatabase();
    const now = Date.now();

    for (const n of notifs) {
      if (!n.id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO notifications_cache (id, recipient_id, data, updated_at)
         VALUES (?, ?, ?, ?)`,
        [n.id, recipientId || 'all', JSON.stringify(n), now]
      );
    }
  } catch (err) {
    console.warn('[LocalDatabase] Error saving notifications cache:', err);
  }
}

export async function getCachedNotifications(
  recipientId: string
): Promise<{ notifications: AppNotification[]; lastUpdated: number | null }> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ data: string; updated_at: number }>(
      `SELECT data, updated_at FROM notifications_cache WHERE recipient_id = ? OR recipient_id = 'all' ORDER BY updated_at DESC`,
      [recipientId || 'all']
    );
    if (!rows || rows.length === 0) return { notifications: [], lastUpdated: null };

    let latestUpdated = 0;
    const notifications: AppNotification[] = [];
    for (const r of rows) {
      try {
        notifications.push(JSON.parse(r.data));
        if (r.updated_at > latestUpdated) latestUpdated = r.updated_at;
      } catch (e) {}
    }
    return { notifications, lastUpdated: latestUpdated > 0 ? latestUpdated : null };
  } catch (err) {
    return { notifications: [], lastUpdated: null };
  }
}

// ============================================================================
// 4. SYNC QUEUE
// ============================================================================

export async function enqueueSyncItem(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount' | 'status' | 'lastError'>
): Promise<string> {
  const db = await getDatabase();
  const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO sync_queue (id, farmer_id, entity_type, operation, local_id, endpoint, payload, created_at, retry_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING')`,
    [id, item.farmerId, item.entityType, item.operation, item.localId, item.endpoint, JSON.stringify(item.payload), now]
  );

  return id;
}

export async function getPendingSyncQueue(farmerId?: string): Promise<SyncQueueItem[]> {
  try {
    const db = await getDatabase();
    const query = farmerId
      ? `SELECT * FROM sync_queue WHERE status IN ('PENDING', 'FAILED') AND retry_count < 5 AND farmer_id = ? ORDER BY created_at ASC`
      : `SELECT * FROM sync_queue WHERE status IN ('PENDING', 'FAILED') AND retry_count < 5 ORDER BY created_at ASC`;
    const params = farmerId ? [farmerId] : [];

    const rows = await db.getAllAsync<{
      id: string;
      farmer_id: string;
      entity_type: string;
      operation: string;
      local_id: string;
      endpoint: string;
      payload: string;
      created_at: number;
      retry_count: number;
      status: string;
      last_error?: string;
    }>(query, params);

    return (rows || []).map((r) => ({
      id: r.id,
      farmerId: r.farmer_id,
      entityType: r.entity_type as 'ANIMAL' | 'CASE',
      operation: r.operation as 'CREATE' | 'UPDATE',
      localId: r.local_id,
      endpoint: r.endpoint,
      payload: JSON.parse(r.payload),
      createdAt: r.created_at,
      retryCount: r.retry_count,
      status: r.status as SyncStatus,
      lastError: r.last_error,
    }));
  } catch (err) {
    console.warn('[LocalDatabase] Error reading sync queue:', err);
    return [];
  }
}

export async function getPendingSyncCount(farmerId?: string): Promise<number> {
  try {
    const db = await getDatabase();
    const query = farmerId
      ? `SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('PENDING', 'FAILED') AND retry_count < 5 AND farmer_id = ?`
      : `SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('PENDING', 'FAILED') AND retry_count < 5`;
    const params = farmerId ? [farmerId] : [];
    const res = await db.getFirstAsync<{ count: number }>(query, params);
    return res?.count || 0;
  } catch {
    return 0;
  }
}

export async function updateSyncItemStatus(
  id: string,
  status: SyncStatus,
  incrementRetry = false,
  errorMsg?: string
): Promise<void> {
  try {
    const db = await getDatabase();
    if (incrementRetry) {
      await db.runAsync(
        `UPDATE sync_queue SET status = ?, retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
        [status, errorMsg || null, id]
      );
    } else {
      await db.runAsync(
        `UPDATE sync_queue SET status = ?, last_error = ? WHERE id = ?`,
        [status, errorMsg || null, id]
      );
    }
  } catch (err) {
    console.warn('[LocalDatabase] Error updating sync queue item:', err);
  }
}

export async function removeSyncItem(id: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
  } catch (err) {
    console.warn('[LocalDatabase] Error deleting sync queue item:', err);
  }
}

// ============================================================================
// 5. CACHE PURGE / LOGOUT
// ============================================================================

export async function clearFarmerCache(farmerId: string): Promise<void> {
  if (!farmerId) return;
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM animals_cache WHERE farmer_id = ?`, [farmerId]);
    await db.runAsync(`DELETE FROM cases_cache WHERE farmer_id = ?`, [farmerId]);
    await db.runAsync(`DELETE FROM notifications_cache WHERE recipient_id = ?`, [farmerId]);
    await db.runAsync(`DELETE FROM sync_queue WHERE farmer_id = ?`, [farmerId]);
  } catch (err) {
    console.warn('[LocalDatabase] Error clearing farmer cache on logout:', err);
  }
}
