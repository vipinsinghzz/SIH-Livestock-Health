# PHASE 8.4 — FARMER PROFILE, SETTINGS & FINAL FARMER UX AUDIT REPORT

**Project**: Livestock Saathi — AI-Powered Livestock Health Assistant  
**Repository**: SIH-Livestock-Health / SIH PS128  
**Audit Target**: Farmer Navigation, Profile, Settings, Security & UX Complete Audit (`mobile/`)  
**Audit Status**: **AUDIT COMPLETE — READY FOR IMPLEMENTATION**  
**Date**: September 17, 2026  

---

## 1. Scope & Boundary Protection

In strict accordance with the Phase 8.4 audit constraints:
- Zero source code changes were made to `frontend/`, `backend/`, `ml/`, or `supabase/`.
- No git commits or pushes were executed.
- All pre-existing working-tree changes (Phase 8.1 notifications, Phase 8.2 map) remain intact and untouched.

```bash
git diff -- frontend/ backend/ ml/ supabase/
# Output: (EMPTY — 0 lines changed)
```

---

## 2. Current Farmer Route & Feature Matrix

| Feature | Route / Path | Implemented? | Real API / Data? | Offline Behavior | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `mobile/app/(farmer)/index.tsx` | ✅ Yes | Real (`/animals`, `/cases`, `/advisories`) | Serves cached counts & records via SQLite | Header displays user name & location; contains quick actions |
| **Livestock Inventory** | `mobile/app/(farmer)/animals/index.tsx` | ✅ Yes | Real (`GET /api/animals`) | Full offline fallback via `animals_cache` | Search, species filtering, `⏳ Pending Sync` badges |
| **Add Animal** | `mobile/app/(farmer)/animals/add.tsx` | ✅ Yes | Real (`POST /api/animals`) | Queues mutation into SQLite `sync_queue` | Generates temporary local ID (`local_anim_...`) |
| **Animal Profile** | `mobile/app/(farmer)/animals/[id].tsx` | ✅ Yes | Real (`GET /api/animals/:id`) | Reads cached profile from SQLite | Timeline, vaccination history, medical treatment log |
| **Edit Animal** | `mobile/app/(farmer)/animals/edit/[id].tsx`| ✅ Yes | Real (`PATCH /api/animals/:id`) | Network required (safe block offline) | Updates tag number, breed, milk yield, health status |
| **AI Disease Screening**| `mobile/app/(farmer)/ai-scan/index.tsx` | ✅ Yes | Real (`POST /api/reports/triage`) | Strictly blocks offline (zero fake AI) | Camera / gallery image picker + 27 clinical symptoms |
| **AI Screening Result** | `mobile/app/(farmer)/ai-scan/result.tsx`| ✅ Yes | Real backend inference | Displays real inference from active scan | First aid steps, suspected conditions, link to referral |
| **Health Cases** | `mobile/app/(farmer)/cases/index.tsx` | ✅ Yes | Real (`GET /api/cases`) | Full offline fallback via `cases_cache` | Search, status filters, `⏳ Pending Sync` badges |
| **Case Details** | `mobile/app/(farmer)/cases/[id].tsx` | ✅ Yes | Real (`GET /api/cases/:id`) | Reads cached case from SQLite | Clinical diagnosis, assigned vet details, timeline |
| **Vaccination Schedules**| `mobile/app/(farmer)/vaccination/index.tsx`| ✅ Yes | Real (`/vaccination-drives`, `/advisories`)| Serves cached drives from SQLite | Herd metrics, camp slot booking (blocked offline) |
| **Kisan Saathi AI Chat** | `mobile/app/(farmer)/kisan-saathi/index.tsx`| ✅ Yes | Real (`POST /api/kisan-saathi/consult`)| Strictly blocks offline (`OFFLINE_BLOCKED`) | Gemini primary + clinical engine fallback |
| **Alerts & Advisories** | `mobile/app/(farmer)/notifications/index.tsx`| ✅ Yes | Real (Supabase `notifications` + `/advisories`)| Serves cached alerts from SQLite | Unread badges, category filtering, mark as read |
| **Veterinary GIS Map** | `mobile/app/(farmer)/map/index.tsx` | ✅ Yes | Real PostGIS endpoints | Displays honest offline banner; zero mock pins| 4 layers: Vets, Quarantine, Cases, Camps |
| **Farmer Profile** | *(No dedicated route)* | ⚠️ Partial | Partial (greeting on Dashboard) | Stored in `secureStorage` | **Needs dedicated profile screen** |
| **App Settings** | *(No dedicated route)* | ❌ Missing | None | N/A | **Needs settings hub** |
| **Help & Support** | *(No dedicated route)* | ⚠️ Partial | Emergency contacts in SOS | N/A | No centralized support hub |
| **About / App Version** | *(No dedicated route)* | ⚠️ Partial | Defined in `app.json` (`v1.0.0`) | N/A | Not surfaced in UI |
| **Sign Out** | Dashboard header button | ✅ Yes | Hardware + Session wipe | Cleans local SQLite farmer cache | Clears SecureStore, redirects to `/(auth)/login` |

---

## 3. Farmer Profile Availability Audit

### Backend Endpoints & Available Fields
- The backend Express service provides `GET /api/auth/me`, protected by `protect` middleware (`backend/middleware/auth.js`).
- The mobile app already calls `GET /api/auth/me` on startup via `AuthContext.tsx` and persists the verified profile in `expo-secure-store`.

### Profile Fields Audit

| Field | Available in Auth Session? | Source in Backend | Status |
| :--- | :--- | :--- | :--- |
| **Full Name** | ✅ Yes | `user.name` (Supabase `profiles.name` / Mongo `name`) | **Available** |
| **Email Address** | ✅ Yes | `user.email` | **Available** |
| **Mobile Number** | ✅ Yes | `user.phone` | **Available** |
| **User Role** | ✅ Yes | `user.role` (`'farmer'`) | **Available** |
| **District** | ✅ Yes | `user.district` (e.g., Pune, Ahmednagar) | **Available** |
| **State** | ✅ Yes | `user.state` (e.g., Maharashtra) | **Available** |
| **Village / Town** | ✅ Yes | `user.village` | **Available** |
| **Block / Tehsil** | ✅ Yes | `user.block` | **Available** |
| **Preferred Language** | ✅ Yes | `user.preferredLanguage` (`'hi'`, `'mr'`, `'en'`) | **Available** |
| **Account Status** | ❌ No | Field not present in `profiles` schema | **Not currently available** |
| **Profile Photo / Avatar** | ❌ No | No avatar storage URL in schema | **Not currently available** |
| **Edit Profile Endpoint** | ❌ No | No `PATCH /api/auth/profile` route in backend | **Not currently available** |

---

## 4. Profile Screen Requirements Audit

A dedicated **Farmer Profile & Settings Screen** (`mobile/app/(farmer)/profile/index.tsx`) should be implemented with the following specifications:
1. **Personal & Location Identity**:
   - Header card with initials avatar and role badge (`🌱 Verified Livestock Farmer`).
   - Farmer Name (`user.name`), Phone (`user.phone`), Email (`user.email`).
   - Farm Location: Village, Block/Tehsil, District, State.
2. **Herd Summary Quick Stats**:
   - Total registered animals count.
   - Active referral cases count.
3. **App Information & Support**:
   - App Version: `v1.0.0` (from `app.json`).
   - Backend Environment: Production (`Railway live`).
   - AI Engine: Dual Mode (Gemini 3.8/3.5 Flash + Clinical Rule Engine).
   - Emergency Helpline Numbers (Kisan Call Center: `1800-180-1551`, Animal Husbandry Helpline: `1962`).
4. **Account Actions**:
   - Clear confirmation dialog before sign out (`Alert.alert('Sign Out', ...)`).
   - "Sign Out" button invoking `logout()`.

**Critical Architecture Rule**: The screen must be **read-only for server data** because no `PATCH /api/auth/profile` route exists in the backend.

---

## 5. Settings Audit

### A. Language
- **Finding**: Web frontend uses `react-i18next` with English, Hindi, and Marathi locales.
- **Mobile Gap**: The mobile app (`mobile/`) currently has no `i18next` or translation framework installed. All screens render hardcoded English strings with occasional Hindi greetings.
- **Recommendation**: Maintain consistent English strings for now, or introduce lightweight translation dictionaries without adding heavyweight external dependencies.

### B. Notifications
- **Inbox**: Fully implemented in `mobile/app/(farmer)/notifications/index.tsx`.
- **Unread Indicator**: Fully implemented (unread badge on dashboard header and service tile).
- **Push Notifications**: Push infrastructure (FCM / Expo Push Tokens) is not implemented on the backend.
- **Local Notification Preferences**: Not backed by server schema; should not be fabricated.

### C. Network & Offline
- **Status Visibility**: Real-time network indicator in `OfflineNotice.tsx` (`OFFLINE`, `SYNCING`, `SYNC_ERROR`, `ONLINE`).
- **Mutation Queue**: Fully implemented in SQLite `sync_queue` with bounded retries.

### D. Security & App Info
- Hardware-backed token storage via Android KeyStore (`expo-secure-store`).
- Clean user isolation via `clearFarmerCache(user.id)`.
- App version `1.0.0` defined in `app.json`.

---

## 6. Logout Security Audit

The complete logout flow was inspected and verified:
1. **Session Termination**: Invokes `supabase.auth.signOut()`.
2. **SecureStore Purge**: Calls `clearAllSecureAuthData()`, deleting `AUTH_TOKEN`, `REFRESH_TOKEN`, `USER_PROFILE`, and `SUPABASE_SESSION`.
3. **SQLite Farmer Cache Wipe**:
   - `DELETE FROM animals_cache WHERE farmer_id = ?`
   - `DELETE FROM cases_cache WHERE farmer_id = ?`
   - `DELETE FROM notifications_cache WHERE recipient_id = ?`
   - `DELETE FROM sync_queue WHERE farmer_id = ?`
4. **Sync Service Reset**: Invokes `syncService.setActiveFarmer(null)`.
5. **Route Redirection**: `_layout.tsx` intercepts `!isAuthenticated` and immediately forces navigation back to `/(auth)/login`.
6. **Cross-User Protection**: When User B logs in on the same device, User A's data is 100% inaccessible.

---

## 7. Language Audit & Hardcoded String Classification

| Screen / Area | Predominant Language | Hardcoded Strings Sample | Classification |
| :--- | :--- | :--- | :--- |
| **Dashboard** | English | "FARMER SAATHI", "Total Herd", "Health Alerts", "Active Cases" | **English-only (with "Namaste" greeting)** |
| **Animals Inventory**| English | "Livestock Inventory", "Search by tag...", "🏷️ Tag ID" | **English-only** |
| **Add / Edit Animal**| English | "Register New Animal", "Daily Milk Yield", "Species" | **English-only** |
| **Cases List** | English | "Health Cases", "Assigned Vet", "Awaiting Vet Claim" | **English-only** |
| **AI Disease Scan** | English | "AI Livestock Disease Screening", "Clinical Symptoms" | **English-only** |
| **Vaccination** | English | "Vaccination Schedules", "Upcoming Camps", "Due" | **English-only** |
| **Kisan Saathi** | Mixed | Quick prompts: "मेरी गाय चारा नहीं खा रही है" / UI: "Send" | **Bilingual prompts + English UI** |
| **Notifications** | Mixed | Titles & payloads from backend advisory can be Hindi/English | **Bilingual content + English UI** |
| **Map** | English | "Veterinary Centers Map", "Vet Help", "Containment" | **English-only** |
| **Backend Responses**| Bilingual | `'कृपया एक मान्य 10-अंकीय मोबाइल नंबर दर्ज करें'` | **Bilingual error payloads** |

---

## 8. Error, Empty, and Loading States Audit

Every farmer screen was audited across 7 distinct states:

| Screen | Loading State | Empty State | Network Error | 401/403 Handling | 500 Server Error | Offline State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | ActivityIndicator | "No Animals Registered Yet" card | Error banner with "Retry" button | Automatic logout & redirect to login | Friendly message banner | Cached SQLite data |
| **Animals** | Centered spinner | "No Animals Match Filter" card | Transparent fallback to SQLite | Automatic redirect | Error text | Cached SQLite records + sync badge |
| **Cases** | Centered spinner | "No Health Cases Found" card | Fallback to SQLite cache | Automatic redirect | Error text | Cached SQLite cases + sync badge |
| **AI Scan** | Progress overlay | Disables run button if no input | Network timeout notice | Automatic redirect | "Inference engine busy" | Strictly blocked with error notice |
| **Vaccination**| Centered spinner | "No upcoming drives in district" | Serves cached drives | Automatic redirect | Error text | Cached SQLite drives |
| **Kisan Saathi**| Typing animation | Welcome prompt cards | Network error message bubble | Automatic redirect | "Kisan Saathi unavailable" | Blocked with OFFLINE_BLOCKED banner |
| **Notifications**| Top spinner | "No alerts at this time" | Serves cached notifications | Automatic redirect | Error text | Cached SQLite alerts |
| **Map** | Overlay spinner | Empty layer counts (0 vets) | Offline banner notice | Automatic redirect | Map remains pan-able | Honest offline notice (0 mock pins) |

---

## 9. Accessibility & UX Audit

1. **Touch Targets**: Primary buttons and cards satisfy WCAG 2.1 AA target criteria (>= 44x44 points).
2. **Typography**: Hierarchy is consistent (`xxl: 24px`, `xl: 20px`, `md: 15px`, `sm: 13px`, `xs: 11px`).
3. **Color Contrast**: Primary Forest Green (`#15803D`) on white achieves 5.1:1 contrast (WCAG AA compliant). High risk red (`#DC2626`) achieves 4.6:1.
4. **Android Navigation**: Stack navigation integrates seamlessly with hardware Android back gestures.
5. **Destructive Action UX Improvement Needed**: Currently, pressing "Sign Out" on the dashboard header signs out immediately without a confirmation prompt. Adding a confirmation `Alert.alert('Sign Out', 'Are you sure you want to sign out?', ...)` will prevent accidental session termination.

---

## 10. Security Audit

- **Zero Client Secrets**: Confirmed zero Supabase service-role keys, zero Gemini API keys, and zero hardcoded database passwords in `mobile/`.
- **Environment Isolation**: `ENV.API_URL` defaults to production Railway backend (`https://sih-livestock-health-production.up.railway.app/api`).
- **Secure Token Handling**: All JWTs and refresh tokens reside exclusively in Android KeyStore via `expo-secure-store`.
- **RBAC Boundaries**: `_layout.tsx` enforces strict role boundaries, disallowing farmers from navigating to `/(vet)` or `/(officer)`.

---

## 11. Production Data Honesty Audit

- **Zero Mock Entities**: Search across `mobile/` confirmed zero mock disease reports, zero mock animals, zero fake veterinarians, zero mock vaccination camps, and zero fake notifications.
- **Zero Fabricated Server IDs**: No synthetic `CASE-2026-` identifiers exist.
- **Valid Client Identifiers**: Offline mutations strictly use `local_anim_...` and `local_case_...` with `isPendingSync: true` and `caseId: 'Pending Sync'`.

---

## 12. Working-Tree Boundary Status

```bash
git status --short
 M mobile/app.json
 M mobile/app/(farmer)/index.tsx
 M mobile/app/(farmer)/map/index.tsx
 M mobile/app/(farmer)/notifications/index.tsx
 M mobile/package-lock.json
 M mobile/package.json
?? PHASE8_0_FARMER_APP_AUDIT_REPORT.md
?? PHASE8_1_FARMER_NOTIFICATIONS_REPORT.md
?? PHASE8_2_FARMER_MAP_REPORT.md
?? mobile/src/services/mapService.ts
?? mobile/src/types/map.ts
?? tests/test_mobile_map.js
?? tests/test_mobile_notifications.js
```

### Categorization:
- **Phase 8.1 Uncommitted**: `mobile/app/(farmer)/notifications/index.tsx`, `tests/test_mobile_notifications.js`, `PHASE8_1_FARMER_NOTIFICATIONS_REPORT.md`, parts of `mobile/app/(farmer)/index.tsx`.
- **Phase 8.2 Uncommitted**: `mobile/app/(farmer)/map/index.tsx`, `mobile/src/services/mapService.ts`, `mobile/src/types/map.ts`, `tests/test_mobile_map.js`, `PHASE8_2_FARMER_MAP_REPORT.md`, parts of `mobile/package.json`.
- **Phase 8.4 Changes**: **ZERO** (Strictly audit-only).

---

## 13. Automated Test Verification

| Test Suite / Step | Command | Result |
| :--- | :--- | :--- |
| **Mobile TypeScript Compilation** | `npx tsc --noEmit` | **0 Errors (Exit Code 0)** |
| **Expo Environment Doctor** | `npx expo-doctor` | **18/18 Checks Passed (Exit Code 0)** |
| **Android Bundle Compilation** | `npx expo export --platform android` | **1061 modules bundled in 4.29s (Exit Code 0)** |
| **Offline Architecture Suite** | `node tests/test_mobile_offline.js` | **10/10 PASS (Exit Code 0)** |
| **Mobile Notifications Suite** | `node tests/test_mobile_notifications.js` | **8/8 PASS (Exit Code 0)** |
| **Mobile Map GIS Suite** | `node tests/test_mobile_map.js` | **6/6 PASS (Exit Code 0)** |
| **Supabase Auth Migration Suite** | `node tests/test_auth_migration.js` | **56/56 PASS (Exit Code 0)** |
| **Web Frontend Production Build** | `npm run build` | **Built in 5.13s (Exit Code 0)** |
| **Protected Scope Verification** | `git diff -- frontend/ backend/ ml/ supabase/` | **0 Changes (100% Untouched)** |

---

## 14. Exact Missing Features vs Features That Must NOT Be Implemented

### Features to Implement in Phase 8.4:
1. **Dedicated Farmer Profile & Settings Screen** (`mobile/app/(farmer)/profile/index.tsx`):
   - Full read-only farmer profile card (Name, Phone, Email, Village, Block, District, State, Role).
   - Herd statistics summary (Total Herd, Active Referral Cases).
   - App information & architecture stats (App version `1.0.0`, Railway production environment, Dual-engine AI status).
   - Emergency veterinary helplines (1962 & Kisan Call Center 1800-180-1551).
   - Sign Out with confirmation dialog (`Alert.alert`).
2. **Dashboard Navigation Link**:
   - Add a Profile / Account icon button in the Farmer Dashboard top bar (`mobile/app/(farmer)/index.tsx`), navigating to `/(farmer)/profile`.
3. **Stack Route Registration**:
   - Register `profile/index` in `mobile/app/(farmer)/_layout.tsx`.

### Features That Should NOT Be Implemented (No Backend Support):
1. **Edit Profile Form**: No `PATCH /api/auth/profile` or `PUT /api/auth/me` endpoint exists in Express backend.
2. **Push Notification Settings**: No push token or notification preference endpoints exist in backend.
3. **Change Password Form**: No in-app password update route exists (only email-based reset).
4. **Offline AI Execution**: Prohibited by Zero-Mock and Clinical Safety policies.

---

## 15. Final Audit Recommendation

**PHASE 8.4 AUDIT STATUS: READY FOR IMPLEMENTATION**

The codebase is fully verified, stable, and ready for the implementation of the dedicated Farmer Profile & Settings Screen using strictly existing authenticated session data and APIs.
