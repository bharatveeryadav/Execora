# Domain: Admin

> Odoo equivalent: `addons/base` (res.users, res.groups) + `addons/base_setup`
>
> Owner squad: Platform + Admin + System Squad
>
> Status: Users and roles active — multi-tenant management and support ops pending

---

## Mission

Own tenant onboarding, user management, role-based access control, business profile settings, and platform-level support operations. Admin is the bootstrap domain — it runs before any business domain can operate.

---

## Products Enabled By This Domain

| Concern      | Details                                           |
| ------------ | ------------------------------------------------- |
| All products | All require `admin.users` and `admin.permissions` |
| Platform     | `admin.tenants` manages plan assignment           |
| Support      | `admin.support-ops` for operator access           |

---

## Sub-modules

```
admin/
  users/
    user-management/     ← invite, activate, deactivate, update, list users
    profile/             ← user profile, password, avatar, language preference
    device-sessions/     ← active sessions, revoke device

  roles/
    role-definitions/    ← 5 roles: owner > admin > manager > staff > viewer
    role-assignment/     ← assign role to user within business

  permissions/
    permission-matrix/   ← maps role → allowed actions per domain
    route-guard/         ← Fastify preHandler enforcement

  tenants/
    business-profile/    ← business name, logo, GSTIN, address, financial year
    tenant-settings/     ← timezone, currency, default GST rate, branch config
    branch-management/   ← multiple branches under one tenant (Scale+)
    tenant-lifecycle/    ← onboard, suspend, delete (admin API)

  support-ops/
    impersonation/       ← admin operators can impersonate tenant users (logged)
    audit-access/        ← read-only access to tenant data for support
```

---

## Role Hierarchy

```
owner       ← full access, billing, delete business, user management
  admin     ← manage users and roles, configure business settings
    manager ← create/edit invoices, manage inventory, run reports
      staff ← create invoices and sales orders, basic stock
        viewer ← read-only: view invoices, reports, stock
```

---

## Capabilities

### User management

- invite user by email: sends OTP or magic link
- set role at invite time
- deactivate user (access revoked, data retained)
- force logout / revoke session by device

### Roles and permissions

- 5 built-in roles mapped to domain-action pairs
- permission matrix enforced at route level (Fastify preHandler)
- owner role is protected: cannot be removed if last owner

### Tenant settings

- business profile: name, logo, GSTIN, registered address, state code
- financial year start month (e.g. April for Indian businesses)
- default GST slab, HSN/SAC default category
- branch configuration: separate branches share tenant data with location filter

### Support operations

- platform admin impersonation: `x-admin-api-key` + target tenantId
- all impersonation events logged in audit trail (`system.audit`)
- read-only support view: access data without mutation rights

---

## Events Produced

| Event                    | Trigger                     | Consumers                              |
| ------------------------ | --------------------------- | -------------------------------------- |
| `UserInvited`            | invitation sent             | notifications (email OTP)              |
| `UserDeactivated`        | account deactivated         | platform (revoke sessions)             |
| `BusinessProfileUpdated` | profile saved               | compliance (update IRP sender details) |
| `TenantSuspended`        | admin action or non-payment | all domains (block access)             |

## Events Consumed

| Event                 | From     | Action                                            |
| --------------------- | -------- | ------------------------------------------------- |
| `SubscriptionChanged` | platform | update feature availability in tenant settings UI |
| `QuotaExceeded`       | platform | notify owner and admin users                      |

---

## API Contracts

```
POST   /api/v1/users/invite                      inviteUser
GET    /api/v1/users                             listUsers
PATCH  /api/v1/users/:id/role                    updateUserRole
DELETE /api/v1/users/:id                         deactivateUser
GET    /api/v1/profile                           getMyProfile
PATCH  /api/v1/profile                           updateMyProfile
GET    /api/v1/business                          getBusinessProfile
PATCH  /api/v1/business                          updateBusinessProfile
GET    /api/v1/business/branches                 listBranches (Scale+)
POST   /api/v1/business/branches                 createBranch (Scale+)
GET    /api/v1/settings                          getTenantSettings
PATCH  /api/v1/settings                          updateTenantSettings

# Admin-only (x-admin-api-key)
GET    /admin/tenants                            listTenants
GET    /admin/tenants/:id                        getTenant
POST   /admin/tenants/:id/suspend                suspendTenant
POST   /admin/tenants/:id/impersonate            impersonateTenant
```

---

## Backend Package (target)

```
packages/admin/src/                     (currently in packages/infrastructure/src/auth.ts)
├── user.ts             ← inviteUser, listUsers, deactivateUser, forceLogout
├── role.ts             ← assignRole, getRolePermissions, checkPermission
├── business.ts         ← getBusinessProfile, updateBusinessProfile, listBranches
├── settings.ts         ← getTenantSettings, updateTenantSettings
└── types.ts            ← Role, Permission, BusinessProfile, TenantSettings
```

---

## Permission Matrix (Routes → Roles)

| Action                  | owner | admin | manager | staff | viewer |
| ----------------------- | :---: | :---: | :-----: | :---: | :----: |
| Manage users and roles  |  ✅   |  ✅   |   ❌    |  ❌   |   ❌   |
| Update business profile |  ✅   |  ✅   |   ❌    |  ❌   |   ❌   |
| Create invoices         |  ✅   |  ✅   |   ✅    |  ✅   |   ❌   |
| Cancel invoices         |  ✅   |  ✅   |   ✅    |  ❌   |   ❌   |
| Manage inventory        |  ✅   |  ✅   |   ✅    |  ❌   |   ❌   |
| View reports            |  ✅   |  ✅   |   ✅    |  ✅   |   ✅   |
| Billing and plan        |  ✅   |  ❌   |   ❌    |  ❌   |   ❌   |

---

## Guardrails

- `require-auth` middleware validates JWT + extracts `tenantId` and `role` on every route
- platform admin routes (`/admin/*`) require `x-admin-api-key` header — separate from business JWT
- owner deactivation is blocked if they are the last owner in the tenant
- impersonation sessions are time-limited (1 hour) and logged in `system.audit` with operator ID
- GSTIN in business profile is validated on save — malformed GSTIN blocked

---

## Current Status

| Sub-module                      | Status                  |
| ------------------------------- | ----------------------- |
| JWT auth (user login)           | ✅ active               |
| Role enforcement (require-auth) | ✅ active               |
| User invite + activation        | ✅ active               |
| Business profile CRUD           | ✅ active               |
| Tenant settings (basic)         | ✅ active               |
| Branch management               | ⏳ pending (Scale+)     |
| Admin impersonation (logged)    | ⏳ pending              |
| Force logout / session revoke   | ⏳ pending              |
| OTP login (email + WhatsApp)    | ✅ active               |
| Permission matrix enforcement   | ✅ active (route level) |
