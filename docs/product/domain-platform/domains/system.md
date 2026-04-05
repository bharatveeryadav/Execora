# Domain: System

> Odoo equivalent: `addons/base` (ir.logging) + `addons/mail` + `addons/document`
>
> Owner squad: Platform + Admin + System Squad
>
> Status: Logging and storage (MinIO) active — audit trail, backup, and offline sync pending

---

## Mission

Own all cross-cutting infrastructure concerns that are not business logic: audit trails, backup and restore, structured logging, push and in-app notifications, file storage, full-text search, caching, and offline sync queue. Every domain relies on system services but system domain owns no business entities.

---

## Sub-modules

```
system/
  audit/
    trail/               ← immutable event log per tenant (who, what, when, outcome)
    tamper-detection/    ← hash-chain integrity on audit records

  backup/
    scheduled-backup/    ← nightly export: Postgres dump + MinIO objects
    restore/             ← tenant-scoped restore from backup snapshot
    retention/           ← 30-day rolling backup window

  logs/
    structured-logging/  ← Winston + Loki + Grafana integration
    log-export/          ← export tenant activity log (CSV/JSON)

  notifications/
    push/                ← FCM push for mobile (iOS/Android)
    in-app/              ← in-app notification feed
    email/               ← transactional email (Nodemailer/SMTP)
    notification-prefs/  ← per-user: which events trigger which channels

  storage/
    file-store/          ← MinIO S3-compatible object store
    tenant-buckets/      ← tenant-scoped bucket paths (security isolation)
    image-resize/        ← product/logo image resize pipeline (Sharp)

  search/
    full-text/           ← product, customer, invoice full-text search (Postgres FTS or Elastic)

  cache/
    redis-cache/         ← TTL-based response cache, session store, queue backend

  offline-sync/
    sync-queue/          ← delta queue for offline-first mobile
    conflict-resolver/   ← last-write-wins with conflict markers
    device-handshake/    ← device registration and sync checkpoint
```

---

## Capabilities

### Audit trail

- every write operation (create, update, delete, cancel) emitted as immutable audit entry
- fields: `tenantId`, `userId`, `action`, `entityType`, `entityId`, `before`, `after`, `ip`, `timestamp`
- platform admin impersonation entries flagged with operator ID
- tamper-detection: each record linked to previous hash (append-only chain)

### Backup and restore

- nightly Postgres dump + MinIO objects snapshot per tenant
- tenant can trigger a restore from the last 30 days of snapshots
- backup stored in separate MinIO bucket with retention policy

### Notifications

- FCM push: low-stock alert, payment received, invoice overdue
- in-app feed: all system and business events surfaced to relevant users
- email: invoice share, invitation, OTP, statement
- per-user notification preferences: opt in/out per category per channel

### Storage

- MinIO bucket per tenant, path: `/{tenantId}/{domain}/{filename}`
- no cross-tenant path access
- image upload → resize pipeline for product images and logos

### Cache

- Redis: session tokens, entitlement cache (5-minute TTL), rate-limit counters
- report results cached with 10-minute TTL, invalidated by relevant domain events

### Offline sync

- mobile client registers a sync checkpoint
- mutations made offline are queued in `sync-queue`
- on reconnect, queue is flushed in sequence, conflicts resolved
- sync state visible in admin (`device-registry` in platform.sync)

---

## Events Produced

| Event                 | Trigger                     | Consumers                                |
| --------------------- | --------------------------- | ---------------------------------------- |
| `AuditEntryCreated`   | any write operation         | (retained in audit store, not forwarded) |
| `BackupCompleted`     | nightly backup job finishes | admin (dashboard status)                 |
| `StorageQuotaWarning` | tenant reaches 80% storage  | admin, platform.quota                    |

## Events Consumed

| Event             | From             | Action                           |
| ----------------- | ---------------- | -------------------------------- |
| All domain events | everywhere       | write audit entry                |
| `InvoiceCreated`  | sales.invoicing  | push notification to owner/admin |
| `PaymentRecorded` | finance.payments | push notification to owner       |
| `QuotaExceeded`   | platform         | in-app + email alert to owner    |
| `UserInvited`     | admin            | send invitation email            |

---

## API Contracts

```
GET    /api/v1/audit                          getAuditTrail (entityType, entityId, dateFrom)
GET    /api/v1/notifications                  getNotificationFeed (unread)
PATCH  /api/v1/notifications/:id/read         markNotificationRead
POST   /api/v1/notifications/register-device  registerPushDevice (FCM token)
GET    /api/v1/storage/signed-url             getSignedUploadUrl (scope, filename)
POST   /api/v1/storage/upload                 uploadFile (multipart)
GET    /api/v1/search                         globalSearch (query, types)
GET    /api/v1/system/backup/status           getBackupStatus
POST   /api/v1/system/backup/restore          initiateRestore (snapshotId)

# Admin
GET    /admin/tenants/:id/audit               getTenantAudit
GET    /admin/tenants/:id/storage             getTenantStorageUsage
```

---

## Backend Package (target)

```
packages/system/src/                  (or packages/infrastructure/src/ subset)
├── audit.ts            ← createAuditEntry, getAuditTrail, verifyIntegrity
├── notifications.ts    ← sendPush, createInAppNotification, sendEmail, getNotificationFeed
├── storage.ts          ← getSignedUrl, uploadFile, deleteFile, getTenantUsage
├── search.ts           ← globalSearch, indexDocument, removeFromIndex
├── cache.ts            ← get, set, invalidate, invalidateByPattern (Redis wrapper)
└── types.ts
```

Currently `storage.ts` and email are in `packages/infrastructure/src/`.

---

## Guardrails

- audit entries are append-only — no update or delete operations on audit table, ever
- storage paths must include tenantId as first segment — enforced at upload and signed-URL generation
- push notifications use FCM server key stored in env — never exposed to client
- offline sync conflicts default to server-wins for financial entities (invoices, payments) — mobile-client wins only for drafts
- cache keys must include tenantId to prevent cross-tenant cache poisoning (e.g. `entitlements:{tenantId}`)
- backup restore operations require confirmation code from owner — not reversible without second factor

---

## Current Status

| Sub-module                          | Status                          |
| ----------------------------------- | ------------------------------- |
| Structured logging (Winston + Loki) | ✅ active                       |
| File storage (MinIO)                | ✅ active                       |
| Transactional email (Nodemailer)    | ✅ active                       |
| Redis cache (sessions, queues)      | ✅ active                       |
| Audit trail (write events)          | ⏳ partial (some events logged) |
| Audit immutability / hash chain     | ⏳ pending                      |
| FCM push notifications              | ⏳ pending                      |
| In-app notification feed            | ⏳ pending                      |
| Full-text search                    | ⏳ pending                      |
| Scheduled backup/restore            | ⏳ pending                      |
| Offline sync queue                  | ⏳ pending                      |
| Image resize pipeline               | ⏳ partial                      |
