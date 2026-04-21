# Platform Admin — In-Depth Plan

> **App**: `apps/admin` (React + Vite, port 3008)
> **Auth**: `x-admin-key` header → `ADMIN_API_KEY` env var
> **Backend**: `packages/api/src/api/routes/admin.routes.ts`
> **Scope**: Cross-tenant, full system visibility, operations control

---

## Overview

The Platform Admin is the Execora SaaS operator panel. It is used by the **Execora team** (not business owners) to:

- Monitor all tenants, their data, and health of the system
- Create, manage, and suspend business accounts (tenants)
- Manage cross-tenant users (reset passwords, unlock accounts)
- Control runtime configuration (LLM, queues, feature flags)
- Observe queue workers, WhatsApp delivery, reminders
- Support business owners via impersonation and audit access

There is **one platform admin** key (`ADMIN_API_KEY`). It is never shared with business users.

---

## Current State (Already Built)

### Backend — `admin.routes.ts`

| Route | Description | Status |
|-------|-------------|--------|
| `GET /admin/dashboard` | Counts, revenue today, reminders, queue health | ✅ Built |
| `GET /admin/health/system` | DB + Redis liveness, worker active counts | ✅ Built |
| `GET /admin/health/providers` | STT/TTS provider availability | ✅ Built |
| `GET /admin/customers` | All customers paginated, search | ✅ Built |
| `GET /admin/customers/:id` | Deep customer with invoices, reminders | ✅ Built |
| `GET /admin/invoices` | All invoices, filter by status/date | ✅ Built |
| `GET /admin/invoices/:id` | Invoice detail with items, payments | ✅ Built |
| `GET /admin/products` | All products, search | ✅ Built |
| `GET /admin/products/low-stock` | Products below threshold | ✅ Built |
| `GET /admin/payments` | All payments, filter by method/date | ✅ Built |
| `GET /admin/payments/summary` | Grouped by method with totals | ✅ Built |
| `GET /admin/reminders` | All reminders paginated | ✅ Built |
| `GET /admin/sessions` | Conversation sessions (recent 50) | ✅ Built |
| `GET /admin/message-logs` | WhatsApp/SMS delivery logs | ✅ Built |
| `GET /admin/queue-stats` | BullMQ job counts per queue | ✅ Built |
| `GET /admin/config` | Runtime config (LLM keys, flags) | ✅ Built |
| `PUT /admin/config` | Update runtime config | ✅ Built |
| `POST /admin/config/reset` | Reset config to defaults | ✅ Built |
| `GET /admin/tenants` | All tenants, filter by plan/status | ✅ Built |
| `POST /admin/tenants` | Create new tenant | ✅ Built |
| `GET /admin/tenants/:id` | Tenant detail | ✅ Built |
| `PUT /admin/tenants/:id` | Update tenant (name, plan, status) | ✅ Built |
| `PUT /admin/tenants/:id/features` | Toggle feature flags for tenant | ✅ Built |
| `GET /admin/users` | All users cross-tenant | ✅ Built |
| `PUT /admin/users/:id/password` | Force reset any user password | ✅ Built |

### Frontend — `apps/admin/src/pages/`

| Page | File | Status |
|------|------|--------|
| Login | `AdminLoginPage.tsx` | ✅ Built |
| Dashboard | `AdminDashboard.tsx` | ✅ Built |
| Health | `AdminHealth.tsx` | ✅ Built |
| Tenants | `AdminTenants.tsx` | ✅ Built |
| Users | `AdminUsers.tsx` | ✅ Built |
| Customers | `AdminCustomers.tsx` | ✅ Built |
| Invoices | `AdminInvoices.tsx` | ✅ Built |
| Products | `AdminProducts.tsx` | ✅ Built |
| Payments | `AdminPayments.tsx` | ✅ Built |
| Reminders | `AdminReminders.tsx` | ✅ Built |
| Messages | `AdminMessages.tsx` | ✅ Built |
| Queues | `AdminQueues.tsx` | ✅ Built |
| Config | `AdminConfig.tsx` | ✅ Built |

---

## Gap Analysis — What's Missing

### Priority 1 — Tenant Lifecycle Management (Critical for Ops)

**Problem**: The tenant list shows tenants but can't suspend/unsuspend/delete.

| Missing Feature | Backend | Frontend |
|----------------|---------|----------|
| Suspend tenant | `PUT /admin/tenants/:id` (set `status: suspended`) | ✅ Route exists — UI button missing |
| Unsuspend tenant | `PUT /admin/tenants/:id` (set `status: active`) | ✅ Route exists — UI button missing |
| Delete tenant | ❌ No delete route | ❌ No UI |
| Tenant detail drawer | ❌ | ❌ Missing rich detail view |
| Subscription management | ❌ No subscription fields | ❌ |
| Plan upgrade/downgrade | `PUT /admin/tenants/:id` (plan field) | UI dropdown missing |

### Priority 2 — Support Operations (Critical for Customer Support)

**Problem**: When a business owner has trouble, there's no safe way to access their data.

| Missing Feature | Backend | Frontend |
|----------------|---------|----------|
| Impersonation token | ❌ `issueImpersonationToken()` is a stub | ❌ No UI |
| View tenant as owner | ❌ | ❌ |
| Audit log for impersonation | ❌ No `AuditLog` model in schema | ❌ |
| Reset any user's password | ✅ `PUT /admin/users/:id/password` | ❌ UI missing in AdminUsers |
| Unlock locked accounts | ❌ No lockout mechanism yet | ❌ |
| User session view (per user) | ❌ `/admin/users/:id/sessions` missing | ❌ |

### Priority 3 — Analytics & Observability (Business Intelligence)

**Problem**: Dashboard shows today's numbers but no trends or exportable data.

| Missing Feature | Backend | Frontend |
|----------------|---------|----------|
| Revenue trend chart (7d/30d) | ❌ Need aggregation endpoint | ❌ |
| Tenant growth chart | ❌ | ❌ |
| WhatsApp delivery rate | Partially — message-logs exist | ❌ No chart |
| Export to CSV | ❌ | ❌ |
| Tenant activity score | ❌ | ❌ |
| Failed job drilldown | ❌ BullMQ job list per status | ❌ |
| Queue retry/cancel actions | ❌ | ❌ |

### Priority 4 — Security & Audit

| Missing Feature | Status |
|----------------|--------|
| `AuditLog` Prisma model | ❌ Not in schema |
| Admin action logging | ❌ No middleware to log admin writes |
| Rate limiting on `/admin/*` | ❌ No rate limit applied |
| Admin API key rotation UI | ❌ |
| Session/IP-based admin access | ❌ No IP allowlist |

---

## Detailed Build Plan

### Phase 1 — Tenant Lifecycle (1–2 days)

**Backend additions** to `admin.routes.ts`:

```typescript
// Suspend tenant
PUT /admin/tenants/:id/suspend
Body: { reason: string }
Action: prisma.tenant.update({ status: 'suspended' })

// Unsuspend tenant
PUT /admin/tenants/:id/unsuspend
Action: prisma.tenant.update({ status: 'active' })

// Soft-delete tenant
DELETE /admin/tenants/:id
Action: prisma.tenant.update({ status: 'deleted' })
Guard: require reason, require confirmation token

// Get full tenant stats
GET /admin/tenants/:id/stats
Returns: user count, invoice count, revenue total, last active date
```

**Frontend additions** to `AdminTenants.tsx`:

- Action buttons per row: `Suspend` (yellow), `Unsuspend` (green), `Delete` (red with confirm dialog)
- Tenant detail side panel / drawer: full stats, user list, recent invoices
- Plan badge with dropdown to upgrade/downgrade
- Filter by plan (free/starter/pro/scale), status (active/suspended/trial)

---

### Phase 2 — User Management Improvements (1 day)

**Backend additions**:

```typescript
// Get sessions for a specific user
GET /admin/users/:id/sessions
Returns: session list with deviceInfo, ipAddress, lastActivity

// Revoke all sessions for a user
DELETE /admin/users/:id/sessions

// Activate/deactivate user cross-tenant
PUT /admin/users/:id/status
Body: { isActive: boolean }
```

**Frontend additions** to `AdminUsers.tsx`:

- Per-row: Reset Password modal, Deactivate toggle
- Expandable row showing user's active sessions + device info
- Filter by tenant, role, active status
- Tenant column with link to tenant page

---

### Phase 3 — Analytics Dashboard (2–3 days)

**New backend endpoints**:

```typescript
// Revenue trend
GET /admin/analytics/revenue?period=30d
Returns: [{ date, amount, invoiceCount }]

// Tenant growth
GET /admin/analytics/tenants?period=30d
Returns: [{ date, newTenants, activeTenants }]

// WhatsApp delivery stats
GET /admin/analytics/messages?period=7d
Returns: { sent, delivered, failed, rate }

// Top tenants by revenue
GET /admin/analytics/top-tenants?limit=10
Returns: [{ tenant, revenue, invoiceCount }]
```

**Frontend** — `AdminDashboard.tsx` upgrades:
- Revenue trend chart (Recharts LineChart)
- Tenant growth chart
- WhatsApp delivery rate gauge
- Top 10 tenants table

---

### Phase 4 — Support Operations (2 days)

**Backend — new file**: `packages/api/src/api/routes/admin-support.routes.ts`

```typescript
// Issue impersonation token (30-min TTL)
POST /admin/support/impersonate
Body: { tenantId: string, reason: string }
Returns: { token: string, expiresAt: string }
Side-effect: Write AuditLog entry (adminIp, tenantId, reason, timestamp)

// List impersonation audit trail
GET /admin/support/audit-log?tenantId=&limit=50
Returns: paginated audit log

// Trigger password reset email
POST /admin/support/password-reset
Body: { userId: string }
```

**Schema addition** — `AuditLog` model:

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  action      String   // "impersonate", "suspend_tenant", "reset_password"
  targetType  String   // "tenant", "user"
  targetId    String
  performedBy String   // "admin" (always platform admin for now)
  metadata    Json?
  ipAddress   String?
  createdAt   DateTime @default(now())
  @@map("audit_logs")
}
```

**Frontend** — new `AdminSupportOps.tsx` page:
- Impersonate tenant: search tenant → confirm dialog → opens business app tab with token
- Audit trail table: all admin actions with timestamps

---

### Phase 5 — Queue Drilldown (1 day)

**Backend additions**:

```typescript
// List jobs in a queue by status
GET /admin/queues/:queue/jobs?status=failed&page=1
Returns: job list with id, data, failedReason, timestamp

// Retry a failed job
POST /admin/queues/:queue/jobs/:jobId/retry

// Remove a job
DELETE /admin/queues/:queue/jobs/:jobId
```

**Frontend** `AdminQueues.tsx` upgrades:
- Click queue card → drill into job list
- Failed jobs with reason, retry button
- Job age / staleness indicator
- Pause/resume queue toggle

---

## File Structure After Full Build

```
apps/admin/src/
  pages/
    AdminLoginPage.tsx         ✅ done
    AdminDashboard.tsx         🔧 add charts (Phase 3)
    AdminHealth.tsx            ✅ done
    AdminTenants.tsx           🔧 lifecycle actions (Phase 1)
    AdminTenantDetail.tsx      ❌ new (Phase 1)
    AdminUsers.tsx             🔧 reset pwd + sessions (Phase 2)
    AdminSupportOps.tsx        ❌ new (Phase 4)
    AdminCustomers.tsx         ✅ done
    AdminInvoices.tsx          ✅ done
    AdminProducts.tsx          ✅ done
    AdminPayments.tsx          ✅ done
    AdminReminders.tsx         ✅ done
    AdminMessages.tsx          ✅ done
    AdminQueues.tsx            🔧 drilldown (Phase 5)
    AdminConfig.tsx            ✅ done
    AdminAuditLog.tsx          ❌ new (Phase 4)
  components/
    TenantStatusBadge.tsx      ❌ new
    ActionConfirmDialog.tsx    ❌ new
    MetricChart.tsx            ❌ new (Recharts wrapper)
```

---

## Priority Order

| Phase | Description | Effort | Impact |
|-------|-------------|--------|--------|
| 1 | Tenant Lifecycle (suspend/unsuspend/delete) | 1–2 days | High — critical for ops |
| 2 | User Reset Password + Sessions | 1 day | High — support tool |
| 4 | Support Ops + Impersonation | 2 days | High — customer support |
| 3 | Analytics Charts | 2–3 days | Medium — nice to have |
| 5 | Queue Drilldown | 1 day | Medium — DevOps |

---

## Security Requirements

1. **Never expose `ADMIN_API_KEY` to frontend code** — it is entered by the operator at login, stored in `sessionStorage` only (cleared on tab close)
2. **All `/admin/*` writes must be logged** — add middleware in `admin.routes.ts` that logs `{ action, ip, timestamp }` on every non-GET
3. **Rate limit `/admin/*`** — add `@fastify/rate-limit` with `max: 100` per 15 min per IP
4. **Impersonation must expire** — 30-minute TTL, non-renewable without new reason
5. **Audit log is immutable** — no DELETE endpoint for `AuditLog`, append-only

---

## Environment Variables

```env
# Required
ADMIN_API_KEY=<openssl rand -hex 32>

# Optional
ADMIN_RATE_LIMIT_MAX=100         # per 15 min
ADMIN_IMPERSONATION_TTL_MINUTES=30
```
