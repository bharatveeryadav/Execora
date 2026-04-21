# Business Admin — In-Depth Plan

> **App**: `apps/web` (React + Vite, port 8080)
> **Auth**: JWT Bearer token → `Authorization` header
> **Backend**: `packages/api/src/api/routes/users.routes.ts` + `auth.routes.ts`
> **Scope**: Single tenant, role-scoped. Business owner manages their own team and business.

---

## Overview

The Business Admin is the **settings and management layer inside the main business app**. It is used by:

- **Owner** — full control: team, billing, settings, permissions, business profile
- **Admin** — can manage team (limited: no delete, no assign owner), configure settings
- **Manager** — read-only access to team list, own profile
- **Staff / Viewer** — own profile only, hidden from team management

Business admin is NOT a separate app. It lives inside `apps/web` under the **Settings** section, specifically:
- `Settings → Profile` (My Account, Business Profile)
- `Settings → Users` (Team Management — currently stub)
- `Settings → Roles` (Permissions matrix — not yet built)
- `Settings → Sessions` (Active sessions — not yet built)

---

## Role Hierarchy (Source of Truth)

```
owner       full access: create/delete users, change roles, manage billing, all settings
  admin     manage users (no delete), configure settings, can't assign owner
    manager view team, manage products/customers/invoices, no user management
      staff  create invoices and sales, view own profile
        viewer  read-only across all areas
```

### Permission Matrix (from `packages/modules/src/admin/roles/index.ts`)

| Permission | owner | admin | manager | staff | viewer |
|-----------|-------|-------|---------|-------|--------|
| `canCreateInvoice` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `canVoidInvoice` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canViewReports` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `canManageProducts` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canManageCustomers` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canManageUsers` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canManageSettings` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canAccessAdmin` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Current State (What Exists Today)

### Backend — `users.routes.ts` ✅ Fully Built

| Route | Guard | Description |
|-------|-------|-------------|
| `GET /api/v1/users` | `users:read` (all) | List all users in tenant |
| `POST /api/v1/users` | `owner/admin` | Create new user (with password) |
| `GET /api/v1/users/:id` | `users:read` | Get single user detail |
| `PUT /api/v1/users/:id` | `users:manage` | Update name, phone, role, isActive, permissions |
| `DELETE /api/v1/users/:id` | `owner` only | Deactivate + revoke all sessions |
| `POST /api/v1/users/:id/reset-password` | `owner` only | Set new password for staff |

All routes are **tenant-scoped** — you can only see/modify users in your own tenantId.

### Frontend — `apps/web/src/pages/settings/SettingsProfileUsers.tsx`

Currently built (basic):
- ✅ List team members (name, email, role badge)
- ✅ Add User modal (name, email, phone, role, password)
- ✅ Remove user (deactivate) with confirm
- ❌ "Manage Roles" button — disabled stub

### React Query Hooks — `apps/web/src/hooks/useQueries.ts`

| Hook | Status |
|------|--------|
| `useUsers()` | ✅ Calls `GET /api/v1/users` |
| `useCreateUser()` | ✅ Calls `POST /api/v1/users` |
| `useUpdateUser()` | ✅ Calls `PUT /api/v1/users/:id` — **not wired to any UI** |
| `useRemoveUser()` | ✅ Calls `DELETE /api/v1/users/:id` |

---

## Gap Analysis — What's Missing

### Tab 1: Team Members (Partial)

| Feature | Status | Backend | Notes |
|---------|--------|---------|-------|
| List users with role badge | ✅ Done | ✅ | |
| Last login display | ❌ Missing | ✅ `lastLogin` field returned | UI doesn't show it |
| Active / Inactive status toggle | ❌ Missing | ✅ `PUT /:id` `isActive` field | Need toggle in row |
| Edit role inline | ❌ Missing | ✅ `PUT /:id` `role` field | `useUpdateUser` not used |
| Edit name/phone | ❌ Missing | ✅ `PUT /:id` | |
| Reset password (for staff) | ❌ Missing | ✅ `POST /:id/reset-password` | |
| Remove user | ✅ Done | ✅ | |
| Show "admin" role option | ❌ Missing | ✅ | Only owner can assign |
| Prevent removing yourself | ✅ Backend guard | UI gap | Error shows but no pre-check |
| Invite by email (magic link) | ❌ Not implemented | ❌ No `/auth/invite` endpoint | Future feature |

### Tab 2: Roles & Permissions

| Feature | Status |
|---------|--------|
| View permission matrix per role | ❌ No UI exists |
| Per-user permission overrides | ❌ Backend stub only (`permissions[]` field exists but no override table) |
| Toggle individual permission for user | ❌ No backend row-level override — would use `PUT /:id` `permissions` array |

### Tab 3: Active Sessions

| Feature | Status | Backend | Notes |
|---------|--------|---------|-------|
| View my active sessions | ❌ No UI | ❌ No `GET /api/v1/auth/sessions` endpoint | Schema exists (`Session` model) |
| Revoke a session | ❌ No UI | ❌ No `DELETE /api/v1/auth/sessions/:id` | |
| Show device info (browser, OS, IP) | ❌ No UI | ❌ `deviceInfo` JSON stored in `sessions` table | |

### Business Profile Settings (Separate from Team)

| Feature | Status | Notes |
|---------|--------|-------|
| Business name / legal name / trade name | ✅ Built in Settings.tsx | `useUpdateProfile` hook |
| GSTIN, state, GST registered toggle | ✅ Built | |
| Logo upload | ✅ Built | |
| Currency, timezone, language, date format | ✅ Built | |
| Financial year start month | ❌ Not in UI | `settings` JSON column |
| Default GST rate | ❌ Not in UI | `settings` JSON column |
| Invoice prefix / numbering | ❌ Not in UI | `settings` JSON column |
| Branch management | ❌ Not built | Future feature (Scale+) |

### Audit Trail (Owner-Only)

| Feature | Status |
|---------|--------|
| Who created an invoice | ❌ No UI | `userId` stored on invoices |
| Who modified/voided | ❌ No UI | `activityLogs` table exists |
| Login history per user | ❌ No UI | `sessions` table, `lastLogin` field |

---

## Detailed Build Plan

### Phase 1 — Complete Team Management UI (2 days)

**Location**: `apps/web/src/pages/settings/SettingsProfileUsers.tsx` (replace/expand)

#### Sub-feature 1A: Enhanced User Row

Replace the simple list with a richer row component:

```
┌─────────────────────────────────────────────────────────────┐
│ 👤 Ramesh Kumar                        [manager] [active ●] │
│    ramesh@shop.com · +91 98765 43210                        │
│    Last login: Today 2:34 PM · IP: 192.168.1.5             │
│    [Edit]  [Reset Password]  [Deactivate]                   │
└─────────────────────────────────────────────────────────────┘
```

**New hooks to wire**:
- `useUpdateUser()` — already exists in `useQueries.ts`, just not used in UI
- Need to add `useResetUserPassword()` hook → `POST /api/v1/users/:id/reset-password`

**Access control in UI**:
```
owner → can edit/reset/deactivate all non-owner users
admin → can edit/deactivate (no reset, no assign admin)
manager/staff/viewer → cannot see edit actions
```

#### Sub-feature 1B: Edit User Modal

Triggered by "Edit" button:
```
Name, Phone (editable)
Role selector: admin | manager | staff | viewer
  → admin only visible if caller is owner
  → "owner" never shown in dropdown
isActive toggle
[Save Changes]
```

Backend call: `PUT /api/v1/users/:id`

#### Sub-feature 1C: Reset Password Modal

Triggered by "Reset Password" button (owner only):
```
New Password (input, min 8 chars)
Confirm Password
[Reset Password]
```

Backend call: `POST /api/v1/users/:id/reset-password`
Need new hook: `useResetUserPassword`

```typescript
export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      authApi.resetUserPassword(id, newPassword),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.users }),
  });
}
```

New `authApi` function:
```typescript
resetUserPassword: (id: string, newPassword: string) =>
  api.post(`/api/v1/users/${id}/reset-password`, { newPassword })
```

---

### Phase 2 — Roles & Permissions Matrix (1 day)

**Location**: New component inside `SettingsProfileUsers.tsx` or separate `SettingsRolesMatrix.tsx`

#### Roles Tab

Display a read-only reference matrix showing all 5 roles × 8 permissions:

```
              owner  admin  manager  staff  viewer
Create Invoice  ✅     ✅      ✅      ✅      ❌
Void Invoice    ✅     ✅      ✅      ❌      ❌
View Reports    ✅     ✅      ✅      ❌      ✅
Manage Products ✅     ✅      ✅      ❌      ❌
Manage Customers✅     ✅      ✅      ❌      ❌
Manage Users    ✅     ✅      ❌      ❌      ❌
Manage Settings ✅     ✅      ❌      ❌      ❌
Admin Access    ✅     ❌      ❌      ❌      ❌
```

Source: `ROLE_PERMISSIONS` from `@execora/types` (already exported).

#### Per-User Permission Overrides (Phase 2 stretch goal)

The `permissions: String[]` field on the `User` model allows overriding the default role permissions.

For each user, show a collapsed "Custom Permissions" section:
- Checkbox list of all 8 permissions
- Pre-filled with user's current `permissions[]` array
- On save: `PUT /api/v1/users/:id` with `{ permissions: [...] }`
- Indicator badge on user row if they have custom overrides

**No backend changes needed** — existing `PUT /api/v1/users/:id` already accepts `permissions` array.

---

### Phase 3 — Active Sessions Management (1–2 days)

**Backend** — New routes in `packages/api/src/api/routes/auth.routes.ts`:

```typescript
// List own sessions
GET /api/v1/auth/sessions
Auth: JWT (any role)
Returns: Session[] with deviceInfo, ipAddress, userAgent, lastActivity, expiresAt

// Revoke own session
DELETE /api/v1/auth/sessions/:sessionId
Auth: JWT (must be own session — tenantId + userId scoped)

// Owner: list sessions for all users in tenant
GET /api/v1/auth/sessions/all
Auth: owner only
Returns: all tenant sessions with userId, user.name

// Owner: revoke any session in tenant
DELETE /api/v1/auth/sessions/any/:sessionId
Auth: owner only
```

**Frontend** — New `SettingsProfileSessions.tsx` tab:

```
Active Sessions
┌───────────────────────────────────────────────────────────────┐
│ 💻 Chrome on macOS · 192.168.1.5         Last: 2 min ago [✕] │
│ 📱 Safari on iPhone · 103.45.67.89       Last: 1 hr ago  [✕] │
│ 🖥  Firefox on Windows · 10.0.0.12       Last: 3 days ago [✕] │
└───────────────────────────────────────────────────────────────┘
[Revoke All Other Sessions]
```

Owner view additionally shows which user each session belongs to.

**New React Query hooks**:
```typescript
export function useMySessions() { ... }  // GET /api/v1/auth/sessions
export function useRevokeSession() { ... }  // DELETE /api/v1/auth/sessions/:id
export function useRevokeAllSessions() { ... }  // DELETE /api/v1/auth/sessions (except current)
```

---

### Phase 4 — Business Profile Completions (0.5 day)

Fill the missing fields in the existing Settings → Profile:

| Field | Currently | What to Add |
|-------|-----------|-------------|
| Financial year start month | ❌ | Dropdown: April (default) / January / July |
| Default GST rate | ❌ | Dropdown: 0% / 5% / 12% / 18% / 28% |
| Invoice prefix | ❌ | Text input: e.g. "INV", "BILL" |
| Invoice auto-numbering reset | ❌ | Toggle: Reset each financial year |

All stored in `tenant.settings` JSON column. No schema changes needed.

Backend: `useUpdateProfile` hook → `PUT /api/v1/auth/profile` already handles `tenant.settings` updates.

---

### Phase 5 — Activity Audit Trail (1 day)

> Owner-only section showing who did what inside the business.

**Backend** — New endpoint:
```typescript
GET /api/v1/audit/activity?limit=50&userId=&type=
Auth: owner/admin only
Returns: ActivityLog[] with userId, user.name, action, entityType, entityId, metadata, createdAt
```

The `ActivityLog` model already exists in the Prisma schema.

**Frontend** — `SettingsAuditLog.tsx`:
- Timeline-style list of actions
- Filter by user, action type (invoice_created, payment_recorded, user_added, etc.)
- Date range filter
- Export to CSV (owner only)

---

## Settings Navigation Structure (After Full Build)

```
Settings
  ├── General
  │   ├── Preferences (language, theme)
  │   ├── Auto Reminders
  │   ├── Notes & Terms
  │   ├── Barcode
  │   └── Thermal Print
  │
  ├── Profile
  │   ├── My Account (name, email, phone, password)
  │   └── Business Profile (name, GSTIN, logo, timezone, FY start)  ← Phase 4 additions
  │
  ├── Team                         ← Phase 1 + 2 (main focus)
  │   ├── Members                  ← Phase 1 complete rebuild
  │   ├── Roles & Permissions      ← Phase 2 matrix view
  │   └── Active Sessions          ← Phase 3 (all sessions)
  │
  ├── Billing & Payments
  │   ├── Payment Gateways
  │   └── Banks / Wallets
  │
  └── More
      ├── Import Data
      ├── Audit Trail              ← Phase 5 (owner/admin)
      └── Danger Zone (delete account)
```

---

## File Structure After Full Build

```
apps/web/src/pages/settings/
  SettingsProfileUser.tsx           ✅ My Account (done)
  SettingsProfileUsers.tsx          🔧 Phase 1 — full rebuild
  SettingsTeamMembers.tsx           ❌ Phase 1 — new detailed component
  SettingsRolesMatrix.tsx           ❌ Phase 2 — permission grid
  SettingsActiveSessionsMy.tsx      ❌ Phase 3 — my sessions
  SettingsActiveSessionsAll.tsx     ❌ Phase 3 — owner: all sessions
  SettingsBusinessProfile.tsx       🔧 Phase 4 — add FY/GST fields
  SettingsAuditLog.tsx              ❌ Phase 5 — activity trail

apps/web/src/hooks/useQueries.ts    🔧 Add: useResetUserPassword, useMySessions,
                                       useRevokeSession, useRevokeAllSessions,
                                       useTenantSessions (owner)

packages/api/src/api/routes/auth.routes.ts
                                    🔧 Phase 3 backend: session endpoints

packages/api/src/api/routes/users.routes.ts
                                    ✅ Already complete — no changes needed
```

---

## Access Control Summary (UI-Level Guards)

All backend routes already enforce role guards. The frontend should additionally:

```typescript
// In each settings component
const { data: me } = useMe();
const isOwner = me?.role === 'owner';
const isAdmin = me?.role === 'admin' || isOwner;
const canManageUsers = isAdmin; // owner or admin

// Show "Edit"/"Reset Password"/"Deactivate" only if canManageUsers
// Show "Add User" only if canManageUsers
// Show "Roles" tab to all but hide editing to non-admins
// Show "Sessions → All Users" tab to owner only
// Show "Audit Trail" to owner/admin only
```

---

## Priority Order

| Phase | Description | Effort | Impact |
|-------|-------------|--------|--------|
| 1 | Team Management — edit role, reset pwd, deactivate | 2 days | **Critical** |
| 2 | Roles & Permissions matrix view | 1 day | High — visibility |
| 3 | Active Sessions management | 1–2 days | Medium — security |
| 4 | Business Profile completions | 0.5 day | Medium |
| 5 | Audit Trail | 1 day | Low–Medium |

**Total estimate**: ~6–7 days for full Business Admin build.

---

## Backend Additions Required

### Phase 1 — No backend changes needed
All `users.routes.ts` endpoints are complete. Only frontend wiring missing.

### Phase 3 — Session endpoints (auth.routes.ts)
```typescript
GET    /api/v1/auth/sessions              // my sessions
DELETE /api/v1/auth/sessions/:id          // revoke my session
GET    /api/v1/auth/sessions/all          // owner: all tenant sessions
DELETE /api/v1/auth/sessions/any/:id      // owner: revoke any session
```

### Phase 5 — Audit log endpoint
```typescript
GET /api/v1/audit/activity                // owner/admin: activity log
```

---

## User Experience Notes

1. **Small shops (single user)** — Settings → Team shows "You are the only user. Add staff to delegate work." CTA.

2. **"You" badge** — the logged-in user's row always shows `(You)` and disables Edit/Delete for their own account.

3. **Owner protection** — the owner row cannot be deactivated or role-changed. No delete button shown.

4. **Role badge colors**:
   - `owner` — gold/yellow
   - `admin` — purple
   - `manager` — blue
   - `staff` — green
   - `viewer` — gray

5. **Permission overrides indicator** — if a user has custom permissions different from role defaults, show a ⚡ icon next to their role badge.
