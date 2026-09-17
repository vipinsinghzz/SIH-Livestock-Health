# Phase 8.1 — Farmer Android Notifications Report

**Project**: Livestock Saathi — AI-Powered Livestock Health Assistant  
**Repository**: SIH-Livestock-Health  
**Scope**: Mobile-only implementation (`mobile/`), strictly adhering to read-only constraints on `backend/`, `frontend/`, `ml/`, and `supabase/`.  
**Execution Date**: September 17, 2026  

---

## 1. Existing Backend Notification Architecture

A thorough read-only audit of `backend/`, `backend/routes/`, `backend/controllers/`, `backend/services/`, `backend/models/`, and `supabase/` revealed the following:
- **Persistent Notification Storage**:
  - Implemented in Supabase PostgreSQL via the `public.notifications` table and dual-backed by MongoDB `Notification` collection (`backend/models/Notification.js`).
  - Notification repository (`backend/services/supabaseDb.js` lines 2779–2872) exposes `create`, `createBatch`, `findForUser(userId)`, and `getByRecipient(userId)`.
- **Notification Creation Triggers**:
  - `backend/services/realtimeHub.js`:
    - `notifyCaseClaimed`: Creates persistent notification for the farmer when a veterinarian claims their referral case (`type: 'CASE_ASSIGNED'`).
    - `notifyCaseStatusUpdate`: Creates persistent notification for the farmer when their referral status updates (`type: 'CASE_STATUS_UPDATE'`).
  - `backend/services/notificationService.js`:
    - `notifyDistrictVets`: Batch inserts referral alerts (`type: 'NEW_CASE_ALERT'`) for veterinarians in matching districts.
    - `notifyCaseUpdate`: Direct updates to case owners.
    - SSE Hub (`GET /api/cases/stream`): Periodic 25s keep-alive heartbeat and real-time event streaming.
- **Regional Health Advisories**:
  - Handled by `backend/controllers/advisoryController.js` and mounted at `GET /api/advisories` (filtering by district, severity, and block).

---

## 2. Exact Endpoints Discovered

| Endpoint | Method | Status | Notes |
| :--- | :--- | :--- | :--- |
| `/api/cases/stream` | `GET` | **Existing** | Authenticated SSE stream for real-time referral alerts and status updates. |
| `/api/advisories` | `GET` | **Existing** | Authenticated endpoint returning government/veterinary regional health advisories. |
| `/api/cases` | `GET` | **Existing** | Authenticated endpoint returning farmer cases. |
| `/api/notifications` | `GET` | **Does Not Exist (404)** | Not mounted on backend Express `server.js`. Verified via live probe returning HTTP 404. |
| `/api/notifications/:id/read`| `PATCH`| **Does Not Exist** | No server route exists for marking read on Express. |
| Push token registration | — | **Does Not Exist** | Zero push token endpoints exist in backend. |

---

## 3. Notification Schema

### Supabase PostgreSQL (`public.notifications`)
- `id`: UUID (Primary Key, default `gen_random_uuid()`)
- `recipient_id`: UUID (Foreign Key -> `public.profiles(id)` ON DELETE CASCADE)
- `case_id`: UUID (Foreign Key -> `public.disease_cases(id)` ON DELETE CASCADE)
- `case_number`: VARCHAR(64)
- `type`: VARCHAR(64) (`NEW_CASE_ALERT`, `CASE_CLAIMED`, `CASE_ASSIGNED`, `CASE_STATUS_UPDATE`, `OUTBREAK_CLUSTER_ALERT`, etc.)
- `title`: VARCHAR(255)
- `message`: TEXT
- `district`: VARCHAR(128)
- `status`: enum `notification_status_type` (`QUEUED`, `DELIVERED`, `FAILED`, `READ`)
- `retry_count`: INTEGER
- `last_attempt_at`: TIMESTAMPTZ
- `error`: TEXT
- `metadata`: JSONB (`disease`, `risk`, `confidence`, `animalSpecies`, `farmerName`, `farmerPhone`, `assignedVetName`, etc.)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### Row Level Security (RLS)
- `notifications_select`: `recipient_id = auth.uid() OR recipient_id = public.get_current_profile_id()`
- `notifications_update`: `recipient_id = auth.uid() OR recipient_id = public.get_current_profile_id()`

---

## 4. Mobile Implementation

### A. TypeScript Definitions (`mobile/src/types/notification.ts`)
- Defined `AppNotification`, `NotificationType`, `NotificationStatus`, `NotificationCategory`, `NotificationSeverity`, and `NotificationMetadata`.
- Implemented `resolveNotificationNavigation(notification: AppNotification)` to map authentic related entities (`caseId`, `animalId`, vaccination drives, advisories) to concrete mobile routes.

### B. Notification Service (`mobile/src/services/notificationService.ts`)
- Leverages existing `api.ts` for authenticated REST requests.
- Queries Supabase PostgreSQL `public.notifications` directly under active user session RLS.
- Merges with live government district advisories from `GET /api/advisories`.
- Safely probes `GET /api/notifications` (handling 404 cleanly without errors).
- Normalizes snake_case / camelCase fields and bilingual objects (`{ en, hi }`).
- Implements `markAsRead` and `markAllAsRead` updating Supabase PostgreSQL where supported, combined with local presentation tracking.
- Implements `getUnreadCount`.

### C. Farmer Notification Screen (`mobile/app/(farmer)/notifications/index.tsx`)
- Replaced previous `PlaceholderScreen` with a high-fidelity inbox.
- Header displaying "Notifications" with live unread count pill and "Mark all read" action.
- 5 category filter chips derived strictly from real data: `All`, `Unread`, `Health`, `Cases`, `Advisory`.
- Card layout displaying:
  - Type icon (👨‍⚕️ Vet Assigned, 🩺 Case Update, 🚨 New Case, ⚠️ Outbreak, 🛡️ Containment, 💉 Vaccination, 📢 Advisory).
  - Severity badge (Critical, High, Moderate, Low).
  - Bilingual/Devanagari title and message support.
  - Relative/formatted timestamps.
  - Unread visual indicator (accent bar and dot).
  - Action navigation indicator (`→`).

### D. Farmer Dashboard Integration (`mobile/app/(farmer)/index.tsx`)
- Connected the Services Hub "Alerts" tile to live notification data.
- Displays an unread badge with exact count whenever unread alerts exist.
- Seamlessly routes to `/(farmer)/notifications`.

---

## 5. Push Notification Status

- **Backend Push Infrastructure**: **Non-existent**.
- No Expo push token registration endpoint, FCM server integration, or APNs delivery service exists in the repository.
- As required by Step 6:
  - Expo Notifications was **NOT** installed.
  - No parallel or mock push delivery was built.
  - No fake local notifications are used.
  - Push delivery remains scheduled for a future dedicated backend/mobile integration phase.

---

## 6. Read / Unread Status

- In Supabase PostgreSQL, `status: 'READ'` is fully supported on the `public.notifications` table under the authenticated user's RLS policy.
- In `notificationService.ts`:
  - `markAsRead` issues an update to Supabase (`status: 'READ'`).
  - Maintains `localReadIds` in memory for instantaneous, responsive presentation state.
  - Advisory records (which are read-only global bulletins) have their read state tracked in local presentation state without falsifying server-side persistence.

---

## 7. Navigation Behavior

When a farmer taps a notification card:
1. `caseId` present → Navigates to `/(farmer)/cases/${caseId}` (tested and verified).
2. `animalId` present → Navigates to `/(farmer)/animals/${animalId}` (tested and verified).
3. Vaccination or Advisory alert → Navigates to `/(farmer)/vaccination` (tested and verified).
4. No valid entity target → Marks notification as read in place without fabricating fake IDs.
5. Android hardware/software back button returns cleanly to the previous screen.

---

## 8. Security

- Notifications query strictly filters by the authenticated farmer's credentials (`recipient_id = user.id`).
- Supabase Row-Level Security (RLS) ensures cross-tenant data isolation at the database layer.
- Zero secrets, service-role keys, or private environment variables exposed to `mobile/`.
- All requests use existing hardware-backed token storage (`ExpoSecureStoreAdapter`).

---

## 9. Offline Behavior

- Offline support is not part of Phase 8.1.
- If network connection fails:
  - Detects network error status (`status === 0` or `NETWORK_ERROR`).
  - Shows clear user-facing state: **"Notifications unavailable offline"** with a functional **"Retry"** button.
  - Zero fabricated cached notifications are rendered.

---

## 10. Mock-Data Audit

- Grep audit conducted across:
  - `mobile/src/types/notification.ts`
  - `mobile/src/services/notificationService.ts`
  - `mobile/app/(farmer)/notifications/index.tsx`
- Search queries: `mock`, `dummy`, `sample`, `fake`, `test notification`, `hardcoded notification`, `placeholder notification`.
- **Result**: **ZERO** production fake notifications.

---

## 11. Test Results

### A. Dedicated Mobile Notification Unit Tests (`tests/test_mobile_notifications.js`)
- Test 1: Case Referral Navigation Resolution — **PASS**
- Test 2: Animal Profile Navigation Resolution — **PASS**
- Test 3: Vaccination Drive / Advisory Navigation Resolution — **PASS**
- Test 4: Unlinked General Notification Resolution — **PASS**
- Test 5: Supabase Record Normalization — **PASS**
- Test 6: Bilingual & Advisory Record Normalization — **PASS**
- Test 7: Filter Category Derivations — **PASS**
- Test 8: Read State Preservation — **PASS**
- **Summary**: 8/8 test suites passed with 0 failures.

### B. Mobile TypeScript Compilation
- Command: `cd mobile && npx tsc --noEmit`
- **Result**: Exited with code 0 (0 errors).

### C. Expo Doctor
- Command: `cd mobile && npx expo-doctor`
- **Result**: 18/18 checks passed. No issues detected!

### D. Static Android Bundle Export
- Command: `cd mobile && npx expo export --platform android`
- **Result**: Exited with code 0. Bundled 1021 modules into `_expo/static/js/android/entry-c3b95c58616e578bca7c10a105d33687.hbc (3.62 MB)`.

### E. Frontend Production Build
- Command: `cd frontend && npm run build`
- **Result**: Exited with code 0 (built in 15.18s).

### F. Backend Auth Migration Regression Suite
- Command: `node tests/test_auth_migration.js`
- **Result**: 56/56 checks passed.

---

## 12. Scope Verification

- Read-only directory diff:
  ```bash
  git diff -- frontend/ backend/ ml/ supabase/
  ```
  **Result**: Exactly **0 diffs** across all four read-only directories.
- Working tree status:
  - Modified: `mobile/app/(farmer)/index.tsx`
  - Modified: `mobile/app/(farmer)/notifications/index.tsx`
  - Untracked: `mobile/src/services/notificationService.ts`
  - Untracked: `mobile/src/types/notification.ts`
  - Untracked: `tests/test_mobile_notifications.js`
  - Untracked: `PHASE8_1_FARMER_NOTIFICATIONS_REPORT.md`

---

## 13. Remaining Notification Limitations

1. **Push Delivery Infrastructure**: The backend currently lacks FCM/APNs push notification dispatch services and device token storage tables.
2. **Dedicated REST Endpoint**: There is no Express `/api/notifications` route; notifications are read via Supabase PostgreSQL client and `/api/advisories`.
3. **Offline Sync**: Offline notifications are not cached locally; the UI displays an explicit offline state when disconnected.

---

## FARMER NOTIFICATIONS STATUS

**PARTIAL — PUSH INFRASTRUCTURE REMAINING**

### Explanation:
The mobile farmer notification inbox is 100% complete and verified against real production architecture:
- Replaced the placeholder screen with a production notification feed.
- Wired to authentic Supabase PostgreSQL notification records and backend district advisories.
- Category filtering, real entity navigation, unread badge on farmer dashboard, and offline handling are fully operational.
- However, because the backend does not yet possess device push-token registration or push notification dispatch capabilities (FCM/Expo Server SDK), actual OS-level push notifications cannot be delivered until a dedicated backend push notification phase is executed.
