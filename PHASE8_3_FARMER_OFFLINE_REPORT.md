# PHASE 8.3 — FARMER ANDROID OFFLINE-FIRST ARCHITECTURE REPORT

**Project**: Livestock Saathi — AI-Powered Livestock Health Assistant  
**Repository**: SIH-Livestock-Health / SIH PS128  
**Scope**: Mobile Offline-First Persistence, Mutation Queuing, and Authoritative Synchronization (`mobile/`)  
**Status**: **COMPLETE**  
**Date**: September 17, 2026  

---

## 1. Executive Summary

Phase 8.3 establishes a durable, production-grade offline-first architecture for the Livestock Saathi Android application. Farmers in rural and low-connectivity regions can now inspect livestock inventory, browse active health cases, view government vaccination schedules, and create pending animals and referral cases without an active cellular data connection. When connectivity is restored, mutations are automatically synchronized with the production backend and reconciled with authoritative server IDs.

In strict accordance with the Zero-Mock and Data Integrity Policy:
- **Zero Fabricated AI Responses**: Both Kisan Saathi (Gemini conversational assistant) and multimodal AI disease screening (`lsd_model.keras`) strictly require an active internet connection and explicitly refuse offline execution with informative user banners.
- **Zero Fabricated Official Case IDs**: Locally queued cases are assigned human-readable `"Pending Sync"` tags and client-scoped UUIDs, strictly preventing fabricated `CASE-2026-XXXX` identifiers.
- **Strict Data Isolation**: SQLite tables are strictly indexed and scoped by authenticated `farmer_id`.
- **Automatic Cache Purging**: Logging out invokes `clearFarmerCache(user.id)`, wiping local SQLite caches and preventing cross-farmer data leakage.
- **Protected Boundaries**: Zero lines of code were modified in `frontend/`, `backend/`, `ml/`, or `supabase/`.

---

## 2. Architecture & Implementation

### A. Local Storage Engine (`expo-sqlite`)
- Installed official Expo package: `expo-sqlite` (`~15.1.x`).
- Configured database `livestock_saathi_offline.db` with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) for high concurrency and crash resilience.
- Created six local tables with performance indexes:
  1. `animals_cache`: Scoped by `farmer_id`, stores animal records, health status, and sync state.
  2. `cases_cache`: Scoped by `farmer_id`, stores referral cases, clinical diagnoses, and vet referrals.
  3. `vaccinations_cache`: Scoped by `district`, stores government vaccination camps and drives.
  4. `notifications_cache`: Scoped by `recipient_id`, stores delivered alerts and advisories.
  5. `advisories_cache`: Scoped by `district`, stores regional health advisories.
  6. `sync_queue`: Durable FIFO mutation queue tracking `id`, `farmer_id`, `entity_type`, `operation`, `local_id`, `endpoint`, `payload`, `created_at`, `retry_count`, and `status`.

### B. Synchronization Service (`syncService.ts`)
- Subscribes to `@react-native-community/netinfo` connectivity transitions (`ONLINE`, `OFFLINE`, `SYNCING`, `SYNC_ERROR`).
- Employs a mutex lock (`isSyncing`) preventing concurrent synchronization loops.
- Enforces bounded retries (`retry_count < 5`) with FIFO processing.
- Handles transient network failures cleanly by preserving `PENDING` status for reconnection, while marking permanent 4xx server rejections as `FAILED`.
- Performs authoritative cache reconciliation:
  - `reconcileAnimalCacheId`: Replaces temporary local animal ID with the server's authoritative MongoDB `_id`.
  - `reconcileCaseCacheId`: Replaces local temporary case with the server's authoritative `_id` and assigned `CASE-2026-XXXX` identifier.

### C. Service Enhancements
1. **`animalService.ts`**:
   - `getAnimals`: Queries production `/animals` when online and writes to SQLite cache; falls back to `getCachedAnimals(farmerId)` when offline.
   - `createAnimal`: Dispatches to server if online; when offline, generates temporary ID (`local_anim_...`), saves to `animals_cache` with `isPendingSync: true`, and enqueues in `sync_queue`.
2. **`caseService.ts`**:
   - `getFarmerCases`: Queries `/cases` when online and saves to SQLite cache; falls back to `getCachedCases(farmerId)` when offline.
   - `createCase`: Dispatches to server if online; when offline, assigns `caseId: 'Pending Sync'` and `isPendingSync: true`, saves locally, and enqueues in `sync_queue`. Never generates fake official case numbers.
3. **`vaccinationService.ts`**:
   - Caches vaccination drives and advisories to SQLite for offline reading.
   - `registerForCamp`: Blocks offline slot allocation with a clear user alert.
4. **`notificationService.ts`**:
   - Caches merged Supabase notifications and backend advisories into `notifications_cache`.
   - Serves cached notifications when offline.
5. **`kisanSaathiService.ts` & `aiScreeningService.ts`**:
   - Explicitly verify connectivity via `NetInfo.fetch()`.
   - Throw designated offline exceptions (`OFFLINE_BLOCKED`), preventing any simulated or hallucinatory AI inference.

### D. UI/UX Components
1. **`OfflineNotice.tsx`**:
   - Subscribes to `syncService.subscribe()`.
   - Displays real-time status banners:
     - `OFFLINE`: "⚠️ Offline Mode — Cached data is displayed • N pending changes"
     - `SYNCING`: "🔄 Syncing N pending changes with server..." (with `ActivityIndicator`)
     - `SYNC_ERROR`: "⚠️ Sync issue: N items queued for retry."
2. **`animals/index.tsx`**:
   - Renders a prominent `"⏳ Pending Sync"` badge on animal cards stored locally.
3. **`cases/index.tsx`**:
   - Renders a prominent `"⏳ Pending Sync"` badge on case cards stored locally.
4. **`AuthContext.tsx`**:
   - Calls `clearFarmerCache(user.id)` and `syncService.setActiveFarmer(null)` on user logout.
   - Restores sync context with `syncService.setActiveFarmer(user.id)` on login and session initialization.

---

## 3. Verification & Test Results

All automated verification and platform checks passed with zero errors:

| Test Suite / Verification Step | Scope | Command | Result |
| :--- | :--- | :--- | :--- |
| **TypeScript Typecheck** | Mobile (`mobile/`) | `npx tsc --noEmit` | **0 Errors (Code 0)** |
| **Expo Environment Doctor** | Mobile (`mobile/`) | `npx expo-doctor` | **18/18 Checks Passed** |
| **Android Bundle Export** | Mobile (`mobile/`) | `npx expo export --platform android` | **Code 0 (Bundled in 5.6s)** |
| **Offline Architecture Suite** | End-to-End (`tests/`) | `node tests/test_mobile_offline.js` | **10/10 Tests Passed** |
| **Mobile Notifications Suite** | Regression (`tests/`) | `node tests/test_mobile_notifications.js` | **8/8 Tests Passed** |
| **Mobile Map GIS Suite** | Regression (`tests/`) | `node tests/test_mobile_map.js` | **6/6 Tests Passed** |
| **Supabase Auth Migration Suite** | Regression (`tests/`) | `node tests/test_auth_migration.js` | **56/56 Tests Passed** |
| **Web Frontend Production Build** | Web App (`frontend/`) | `npm run build` | **Built in 12.26s (Code 0)** |
| **Protected Scope Verification** | Read-Only Dirs | `git diff -- frontend/ backend/ ml/ supabase/` | **0 Changes (Untouched)** |

---

## 4. Phase 8.3 File Manifest

### Created Files
- `mobile/src/services/localDatabase.ts` (SQLite schema, WAL mode, cache & queue operations)
- `mobile/src/services/syncService.ts` (NetInfo monitor, FIFO queue runner, server ID reconciler)
- `tests/test_mobile_offline.js` (Automated verification suite for offline invariants)
- `PHASE8_3_FARMER_OFFLINE_REPORT.md` (This document)

### Modified Files
- `mobile/package.json` (Added `expo-sqlite: ~15.1.x`)
- `mobile/package-lock.json`
- `mobile/src/types/animal.ts` (Added `isPendingSync?: boolean;`)
- `mobile/src/types/case.ts` (Added `id?: string; isPendingSync?: boolean;`)
- `mobile/src/services/animalService.ts` (Offline caching and local pending animal creation)
- `mobile/src/services/caseService.ts` (Offline caching and local pending case creation)
- `mobile/src/services/vaccinationService.ts` (Read caches for drives and advisories)
- `mobile/src/services/notificationService.ts` (Read cache for notifications)
- `mobile/src/services/kisanSaathiService.ts` (Strict offline barrier preventing fabricated AI)
- `mobile/src/components/OfflineNotice.tsx` (Dynamic sync status and pending mutation counter)
- `mobile/app/(farmer)/animals/index.tsx` (Pending sync card badge)
- `mobile/app/(farmer)/cases/index.tsx` (Pending sync card badge)
- `mobile/src/context/AuthContext.tsx` (Farmer cache cleanup on logout & sync context activation)

---

## 5. Next Steps

With Phase 8.3 successfully verified and passing all tests, the Farmer Android application now features complete online/offline dual-mode operation. The project is ready for:
- Phase 8.4: Android APK / EAS Build Preparation & Production Release Candidate Audit.
