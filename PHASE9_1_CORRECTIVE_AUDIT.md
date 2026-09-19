# PHASE 9.1 — VETERINARIAN ANDROID CORRECTIVE AUDIT REPORT

**Project:** Livestock Saathi — AI-Powered Livestock Health Assistant  
**Date:** September 19, 2026  
**Audit Purpose:** Corrective Pre-Commit Verification of Role Boundaries, Filter Vocabulary, and API Security  
**Status:** AUDIT COMPLETE — AWAITING DECISION ON ROLE SYNONYM POLICY (DO NOT COMMIT / PUSH)  

---

## 1. Veterinarian Role Boundary Finding

### A. Exact Code Locations
The condition `role === 'veterinarian' || role === 'field_worker'` appears in:

1. **`mobile/app/_layout.tsx` (Lines 43–47):**
   ```tsx
   const role = rawRole as UserRole;
   const isAdmin = role === 'admin';
   const isVet = role === 'veterinarian' || role === 'field_worker';
   const isOfficer = role === 'officer' || isAdmin;
   const isFarmer = role === 'farmer';
   ```
2. **`mobile/app/index.tsx` (Lines 27, 40):**
   ```tsx
   else if (role === 'veterinarian' || role === 'field_worker') router.push('/(vet)');
   ```
3. **`mobile/app/(auth)/login.tsx` (Line 52):**
   ```tsx
   } else if (role === 'veterinarian' || role === 'field_worker') {
     router.replace('/(vet)');
   }
   ```
4. **`mobile/app/(auth)/register.tsx` (Line 76):**
   ```tsx
   else if (userRole === 'veterinarian' || userRole === 'field_worker') router.replace('/(vet)');
   ```
5. **`mobile/src/types/vet.ts` (Line 18):**
   ```tsx
   export interface VeterinarianProfile {
     ...
     role: 'veterinarian' | 'field_worker';
   }
   ```

### B. Can `field_worker` enter `/(vet)`?
**Yes.** Under the current implementation, any authenticated user whose profile has `role === 'field_worker'` is evaluated as `isVet === true` and routed to `/(vet)`.

### C. Is this inherited from an existing architecture?
**Yes, 100% inherited.**  
Across the entire web frontend, backend controller logic, database schema, and test suites, `veterinarian` and `field_worker` are treated as interchangeable synonyms:
- **Backend Middleware (`backend/middleware/auth.js`, lines 174–178):**
  ```javascript
  // Support role synonyms: veterinarian <-> field_worker
  if (
    (userRole === 'veterinarian' && roles.includes('field_worker')) ||
    (userRole === 'field_worker' && roles.includes('veterinarian')) ||
    ...
  )
  ```
- **Backend Route Authorization (`backend/routes/caseRoutes.js`, lines 35, 54, 75, etc.):**
  Every veterinary endpoint explicitly authorizes both: `authorize('field_worker', 'veterinarian', 'officer', 'admin')`.
- **Frontend Web Portal (`frontend/src/pages/Dashboard.jsx`, lines 65–67):**
  ```jsx
  if (user?.role === 'field_worker' || user?.role === 'veterinarian') {
    return <FieldWorkerDashboard />;
  }
  ```
- **Frontend Navbar (`frontend/src/components/Navbar.jsx`, line 64):**
  ```jsx
  const isVet = user?.role === 'field_worker' || user?.role === 'veterinarian';
  ```
- **Database Seed Data (`backend/seed/seedData.js`, line 60):**
  The canonical veterinary doctor account (`vet@pashurakshak.in` / `Dr. Rajesh Deshmukh`) was historically seeded with `role: 'field_worker'`.

### D. Does `field_worker` have a separate mobile portal?
**No.** The mobile application has only three role portal directories:
- `mobile/app/(farmer)` — Farmer Portal
- `mobile/app/(vet)` — Veterinarian Portal
- `mobile/app/(officer)` — Officer Portal

There is **no `(field_worker)` directory**.

### E. Does allowing `field_worker` violate the Phase 9.1 specification?
- **Strict Literal Interpretation:** The prompt states:
  > *"The mobile Vet portal must only render for: `role === 'veterinarian'`. Do NOT treat farmer as veterinarian."*  
  Under a strict literal reading, allowing `field_worker` into `/(vet)` deviates from the requirement.
- **Architectural Reality:** If `field_worker` is strictly blocked from `/(vet)`:
  - Users with `role: 'field_worker'` (including seeded field veterinarians in test databases) will hit the `Unresolved Account Role` screen and be locked out of the mobile app entirely.
  - However, farmers remain strictly blocked regardless (farmers are always routed to `(farmer)`).

### F. Exact Change Required if Strict Disallowance is Mandated
If instructed to strictly enforce `role === 'veterinarian'` ONLY, the change is entirely mobile-contained and requires zero backend/web modifications:

1. In `mobile/app/_layout.tsx` (Line 45):
   ```diff
   - const isVet = role === 'veterinarian' || role === 'field_worker';
   + const isVet = role === 'veterinarian';
   ```
2. In `mobile/app/index.tsx` (Lines 27, 40):
   ```diff
   - else if (role === 'veterinarian' || role === 'field_worker') router.push('/(vet)');
   + else if (role === 'veterinarian') router.push('/(vet)');
   ```
3. In `mobile/app/(auth)/login.tsx` (Line 52):
   ```diff
   - } else if (role === 'veterinarian' || role === 'field_worker') {
   + } else if (role === 'veterinarian') {
   ```
4. In `mobile/app/(auth)/register.tsx` (Line 76):
   ```diff
   - else if (userRole === 'veterinarian' || userRole === 'field_worker') router.replace('/(vet)');
   + else if (userRole === 'veterinarian') router.replace('/(vet)');
   ```
5. In `mobile/src/types/vet.ts` (Line 18):
   ```diff
   - role: 'veterinarian' | 'field_worker';
   + role: 'veterinarian';
   ```
6. In `tests/test_mobile_vet_phase9_1.js`: update assertion to match `role === 'veterinarian'`.

*Status: Awaiting user instruction before modifying any code.*

---

## 2. Case Status & Filter Audit

Comparison of mobile filters in `mobile/src/types/referral.ts`, `mobile/app/(vet)/referrals/index.tsx`, and `veterinarianService.ts` against the backend status vocabulary established in Phase 9.0 and `backend/controllers/caseController.js`:

| Mobile Filter | Nature of Filter | Exact Backend Status? | Handled Backend Values | Notes |
|---|---|---|---|---|
| **`All`** | Presentation Only | No | All statuses | Displays the complete queue without status restrictions. |
| **`New`** | Stage Filter | **Yes** (Exact + Alias) | `'New'`, `'OPEN'` | Farmers create cases with status `'New'` or `'OPEN'`. `isCaseClaimable()` matches these. |
| **`My Cases`** | Assignment Filter | No (Query Dimension) | Any status where `assignedVetId === caller.id` | Supported by backend query `GET /api/cases?filter=my_cases` and client-side assignment check. |
| **`Investigating`** | Stage Filter | **Yes** (Exact + Alias) | `'Investigating'`, `'ACCEPTED'` | Set atomically by `PATCH /api/cases/:id/claim`. Valid status in `caseController.js`. |
| **`Confirmed`** | Stage Filter | **Yes** (Exact) | `'Confirmed'` | Valid status in `caseController.js` 5-stage lifecycle. |
| **`Containment`** | Stage Filter | **Yes** (Exact + Alias) | `'Containment'`, `'IN_TREATMENT'` | Set when containment zones are declared. Valid status in `caseController.js`. |
| **`Resolved`** | Stage Filter | **Yes** (Exact + Alias) | `'Resolved'`, `'CLOSED'` | Set upon recovery/closure. Valid status in `caseController.js`. |

### Audit Findings:
1. **Exact Backend Statuses:** `Investigating`, `Confirmed`, `Containment`, `Resolved`, and `New` are exact backend statuses defined in `caseController.js` (`validStatuses = ['Investigating', 'Confirmed', 'Containment', 'Resolved']` and `existingCheck.status in ['New', 'OPEN']`).
2. **Presentation-Only Filters:** `All` (queue-wide view) and `My Cases` (doctor assignment filter).
3. **Client-Side Normalization:** Normalization is used defensively (converting to uppercase for comparisons: `s === 'NEW' || s === 'OPEN'`, `s === 'INVESTIGATING' || s === 'ACCEPTED'`, `s === 'CONTAINMENT' || s === 'IN_TREATMENT'`, `s === 'RESOLVED' || s === 'CLOSED'`). This prevents UI breakage caused by casing variations across Supabase and MongoDB records.
4. **Invented Statuses:** **ZERO.** No artificial or fabricated statuses exist. Every filter strictly represents a production status or dimension from `FieldWorkerDashboard.jsx`.

---

## 3. Security & API Audit

### A. `GET /api/cases`
- **Authentication:** Enforced. Axios instance automatically injects `Authorization: Bearer <token>` from `SecureStore`.
- **Identity Derivation:** Server extracts `req.user.id` and `req.user.role` from token.
- **Client Spoofing Check:** Mobile passes query parameters `{ district, limit: 100 }`. It does NOT pass or trust any spoofed `vetId` or `role`.

### B. `GET /api/cases/:id`
- **Authentication:** Enforced. Token attached via request interceptor.
- **Identity Derivation:** Server verifies that caller's jurisdiction (`req.user.district`) matches `case.districtId` OR that caller is the assigned doctor (`case.assignedVetId === req.user.id`).
- **Client Spoofing Check:** Only the case ID is passed in the URL path. No `vetId` is accepted from navigation route parameters.

### C. `PATCH /api/cases/:id/claim`
- **Authentication:** Enforced. Token attached via request interceptor.
- **Identity Derivation:** Server extracts `req.user.id` and `req.user.name` directly from the authenticated session:
  ```javascript
  const vetIdStr = String(req.user.id || req.user._id);
  const updatedCase = await supabaseDb.diseaseCases.claimCase(id, vetIdStr, req.user.name);
  ```
- **Client Spoofing Check:** **Zero request body is sent.** (`api.patch('/cases/' + cleanId + '/claim')`). The client cannot supply a `vetId` or override assigned doctor.
- **Atomic Lock & 409 Conflict:** If another doctor claimed the case first, backend returns 409 Conflict with `alreadyClaimed: true`. Mobile alerts: *"This case was already claimed by Dr. <Name>."*
- **Offline Prevention:** Mobile verifies `NetInfo.fetch()` prior to request. Throws explicit error: *"Claiming a case requires an active internet connection."* Never queues claims offline.

### D. Role Integrity
- The mobile role is derived exclusively from the authenticated user profile returned by `/api/auth/login` or `/api/auth/me`.
- Client cannot manipulate its role via route parameters or localStorage spoofing.

---

## 4. Protected Directory Verification

Command executed:
```bash
git diff -- frontend/ backend/ ml/ supabase/
```
**Result:** **100% EMPTY.**  
Zero files modified in protected directories.

---

## 5. Working Tree Status

```bash
$ git status --short
 M mobile/app/(vet)/_layout.tsx
 M mobile/app/(vet)/index.tsx
 M mobile/app/(vet)/referrals/index.tsx
?? PHASE8_0_FARMER_APP_AUDIT_REPORT.md
?? PHASE8_5_FINAL_FARMER_INTEGRATION_AUDIT.md
?? PHASE8_6_FARMER_FEATURE_COMMIT_REPORT.md
?? PHASE9_0_VETERINARIAN_ANDROID_AUDIT.md
?? PHASE9_1_CORRECTIVE_AUDIT.md
?? PHASE9_1_VETERINARIAN_ANDROID_IMPLEMENTATION_REPORT.md
?? mobile/app/(vet)/referrals/[id].tsx
?? mobile/src/services/veterinarianService.ts
?? mobile/src/types/referral.ts
?? mobile/src/types/vet.ts
?? tests/test_mobile_vet_phase9_1.js
```

---

## 6. Commit Readiness Verdict

| Item | Status | Notes |
|---|---|---|
| Protected Directories | **CLEAN** | 0 diffs in `frontend/`, `backend/`, `ml/`, `supabase/` |
| TypeScript Validation | **PASSED** | 0 compilation errors |
| Expo Doctor | **PASSED** | 18/18 checks passed |
| Android Export | **PASSED** | Bundled successfully (`dist`) |
| Regression Test Suites | **PASSED** | All 5 test suites passed |
| Frontend Website Build | **PASSED** | Built in 30s |
| API & Security Integrity | **VERIFIED** | Zero spoofing vectors; identity derived from JWT |
| Filter Vocabulary | **VERIFIED** | 100% compliant with backend 5-stage lifecycle |
| **Role Boundary Decision** | **PENDING USER DIRECTION** | Keep synonym `veterinarian` / `field_worker` (recommended for backend seed compatibility) OR apply strict 1-line change to `role === 'veterinarian'`. |

**Conclusion:**  
Phase 9.1 is technically complete and verified. Awaiting user's decision on whether to retain the historical `field_worker` synonym or strictly isolate `role === 'veterinarian'` before proceeding with commit.
