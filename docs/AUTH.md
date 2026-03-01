# Execora — Authentication & Authorization Guide

> Complete reference for the two-tier security system: Platform Admin (API key) and Business Users (JWT + RBAC).

---

## Overview: Two-Tier Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  TIER 1 — Platform SaaS Admin                                    │
│  Header: x-admin-key: <ADMIN_API_KEY>                           │
│  Routes: /admin/*                                                │
│  Access: full cross-tenant data, tenant lifecycle management     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  TIER 2 — Business Users (per tenant)                           │
│  Header: Authorization: Bearer <JWT access token>               │
│  Routes: /api/v1/*                                               │
│  Access: own tenant's data only, role + permission scoped        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tier 1 — Platform Admin Auth

All `/admin/*` routes require the `x-admin-key` header.

```bash
curl -H "x-admin-key: $ADMIN_API_KEY" http://localhost:3006/admin/dashboard
```

**Setup:**
```bash
# Generate a key
openssl rand -hex 32

# Add to .env
ADMIN_API_KEY=<generated key>
```

In **production**, endpoints return `503 Service Unavailable` if `ADMIN_API_KEY` is not set.
In **development**, requests pass through with a startup warning.

---

## Tier 2 — Business User Auth (JWT)

### 1. Login Flow

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "owner@myshop.com",
  "password": "mypassword123"
}
```

**Response:**
```json
{
  "accessToken":  "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn":    900,
  "user": {
    "id":          "uuid",
    "tenantId":    "uuid",
    "email":       "owner@myshop.com",
    "name":        "Shop Owner",
    "role":        "owner",
    "permissions": ["customers:read", "invoices:create", ...]
  }
}
```

Store **both tokens** in your client. The access token expires in 15 minutes (default).
Use the refresh token to get a new access token without re-logging in.

---

### 2. Using the Access Token

Add to every protected API request:

```bash
Authorization: Bearer <accessToken>
```

```bash
# Example
curl -H "Authorization: Bearer eyJ..." \
     http://localhost:3006/api/v1/customers
```

---

### 3. Token Refresh Flow

When the access token expires (HTTP 401 Unauthorized), exchange the refresh token for a new pair:

```
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

**Response:**
```json
{
  "accessToken":  "eyJ... (new)",
  "refreshToken": "eyJ... (new — old one is now invalid)",
  "expiresIn":    900
}
```

The refresh token is **rotated** on every use — store the new one and discard the old.
Refresh tokens expire after 7 days (default). After expiry, user must log in again.

---

### 4. Logout

```
POST /api/v1/auth/logout
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

This deletes the DB session record. The access token will still work until its natural TTL expires
(15 minutes), but no new tokens can be issued via this refresh token.

For immediate revocation (e.g., suspected compromise), use the Admin API:
```
PUT /admin/users/:id/password   ← forces session revocation via password reset
```

---

### 5. JWT Token Format

Tokens use **HS256** with Node.js built-in `crypto.createHmac`.
No external JWT library required — zero new npm dependencies.

**Access token payload:**
```json
{
  "userId":      "uuid",
  "tenantId":    "uuid",
  "role":        "manager",
  "permissions": ["customers:read", "invoices:create", "voice:use"],
  "type":        "access",
  "iat":         1740000000,
  "exp":         1740000900
}
```

The refresh token has the same shape with `"type": "refresh"` and a 7-day `exp`.
The refresh token is stored in the DB `Session` table — revocation is server-controlled.

**Token configuration (`.env`):**
```env
JWT_SECRET=<openssl rand -hex 32>
JWT_ACCESS_EXPIRES_SECONDS=900       # 15 minutes
JWT_REFRESH_EXPIRES_SECONDS=604800   # 7 days
```

---

## Role Hierarchy

Five roles, ordered from highest to lowest privilege:

```
owner
  └── admin
        └── manager
              └── staff
                    └── viewer
```

| Role    | Description | `users:manage` | Can create `admin` |
|---------|-------------|:--------------:|:-----------------:|
| owner   | Shop owner. Full access. Created at tenant setup. | ✓ | ✓ |
| admin   | Store manager equivalent. All ops, no user creation above own level. | read only | ✗ |
| manager | Day-to-day ops: invoices, payments, reminders, reports. | read only | ✗ |
| staff   | Counter/billing staff. Create invoices and record payments. | ✗ | ✗ |
| viewer  | Read-only. Auditors, sleeping partners. | ✗ | ✗ |

---

## Permission System

Permissions are **granular string keys** stored directly in `user.permissions[]`.
Each user gets the role's default set on creation; the owner can customize later.

### Full Permission List

| Permission | Who gets it by default |
|---|---|
| `customers:read` | all roles |
| `customers:create` | owner, admin, manager, staff |
| `customers:update` | owner, admin, manager |
| `customers:delete` | owner, admin |
| `invoices:read` | all except viewer? — actually all |
| `invoices:create` | owner, admin, manager, staff |
| `invoices:cancel` | owner, admin, manager |
| `products:read` | all roles |
| `products:create` | owner, admin, manager |
| `products:update` | owner, admin, manager |
| `payments:read` | owner, admin, manager, viewer |
| `payments:create` | owner, admin, manager, staff |
| `reminders:read` | owner, admin, manager, staff |
| `reminders:create` | owner, admin, manager |
| `reminders:cancel` | owner, admin, manager |
| `reports:read` | owner, admin, manager, viewer |
| `voice:use` | owner, admin, manager, staff |
| `settings:read` | owner, admin, manager |
| `settings:update` | owner, admin |
| `users:read` | owner, admin, manager |
| `users:manage` | owner only |

### Customizing Permissions

The owner can grant extra permissions to specific users via `PUT /api/v1/users/:id`:

```json
// Give a specific staff user the ability to cancel invoices
PUT /api/v1/users/uuid
Authorization: Bearer <owner token>

{
  "permissions": [
    "customers:read", "customers:create",
    "invoices:read", "invoices:create", "invoices:cancel",
    "products:read",
    "payments:create",
    "reminders:read",
    "voice:use"
  ]
}
```

---

## Auth Middleware Chain

### For Protected REST Routes (`/api/v1/*`)

```
HTTP Request
     │
     ▼
[Fastify onRequest hook]
 Wrap in tenantContext.run({ tenantId: 'system-tenant-001', userId: 'system-user-001' })
 Generate/echo x-request-id header
     │
     ▼
[Protected scope preHandler: requireAuth]
 1. Read Authorization header → extract Bearer token
 2. verifyAccessToken() → validate HMAC-SHA256 signature + expiry
 3. Attach decoded payload to request.user
 4. tenantContext.update({ tenantId, userId }) → real identity propagates to all async work
     │
     ▼
[Route-level preHandler] (optional — per-route extra guards)
 Examples:
   requireRole(['owner', 'admin'])    → check request.user.role
   requirePermission('invoices:create') → check request.user.permissions.includes(...)
   requireFeature('gst_enabled')      → DB lookup: tenant.features[key] must be true
     │
     ▼
[Route handler]
 request.user.userId     → who is making the request
 request.user.tenantId   → which tenant's data to query
 request.user.role       → role for business logic checks
 request.user.permissions → granular permission array
     │
     ▼
[Prisma $use middleware]
 tenantContext.get() → { tenantId, userId }
 All DB audit logs include both tenantId AND userId
```

### For Admin Routes (`/admin/*`)

```
HTTP Request
     │
     ▼
[adminRoutes plugin hook: adminAuthPreHandler]
 Check x-admin-key header === ADMIN_API_KEY env var
 → 401 if missing or wrong
 → 503 in production if ADMIN_API_KEY not configured
     │
     ▼
[Route handler — full cross-tenant access, no tenantId scope]
```

---

## Auth in Real-Time Voice Application

The WebSocket voice pipeline connects to `ws://host/ws`. Here is the full execution flow with auth context:

### Connection Setup

```
Client (browser/mobile)
  │
  │  ws://host/ws
  │  Headers: { Authorization: Bearer <accessToken> }
  ▼
WebSocket upgrade → enhanced-handler.ts
  │
  │  1. Validate access token (same verifyAccessToken() used by REST)
  │  2. Extract { userId, tenantId, role, permissions } from token
  │  3. Check permission 'voice:use' — reject if missing
  │  4. Create conversationSession record scoped to tenantId
  │  5. tenantContext.run({ tenantId, userId }) wraps the entire session
  ▼
Session established → sessionId sent to client
```

### Audio → Business Action Pipeline

```
┌─ CLIENT ────────────────────────────────────────────────────────────┐
│                                                                     │
│  1. User speaks into microphone (AudioWorklet or MediaRecorder)    │
│                                                                     │
│  2. PCM audio chunks → WebSocket binary frames (sent continuously) │
│                                                                     │
│  3. { type: "voice:start" } text message → signals new utterance  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          ▼ binary frames (PCM/WebM)
┌─ SERVER: enhanced-handler.ts ───────────────────────────────────────┐
│                                                                     │
│  4. PCM → STT provider (Deepgram live stream / ElevenLabs)        │
│     • tenantId attached to session (multi-tenant STT billing)     │
│                                                                     │
│  5. Real-time partial transcripts sent back:                       │
│     { type: "voice:transcript", data: { text: "Rahul ka...", isFinal: false } }
│                                                                     │
│  6. Final transcript arrives from STT                             │
│     { type: "voice:transcript", data: { text: "Rahul ka balance batao", isFinal: true } }
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                          │ final text
                          ▼
┌─ LLM INTENT EXTRACTION ─────────────────────────────────────────────┐
│                                                                     │
│  7. Text → LLM (OpenAI/Groq/Ollama) for intent + entity extraction │
│     Input: "Rahul ka balance batao"                                │
│     Output: { intent: "CHECK_BALANCE", entities: { customerName: "Rahul" } }
│                                                                     │
│  8. Intent sent to client:                                         │
│     { type: "voice:intent", data: { intent: "CHECK_BALANCE", ... } }
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                          │ intent + entities
                          ▼
┌─ BUSINESS ENGINE (voice/engine/index.ts) ───────────────────────────┐
│                                                                     │
│  9. Permission check BEFORE execution:                             │
│     • CHECK_BALANCE → requires 'customers:read'                   │
│     • CREATE_INVOICE → requires 'invoices:create'                 │
│     • RECORD_PAYMENT → requires 'payments:create'                 │
│     → if permission missing: voice response "Aapke paas yeh       │
│       access nahin hai" and skip execution                        │
│                                                                     │
│  10. Execute business operation (e.g. customer.service.getBalance) │
│      tenantContext is active → all Prisma queries automatically    │
│      scoped to the authenticated user's tenantId                  │
│      All mutations logged in DB audit with userId + tenantId      │
│                                                                     │
│  11. Result → natural language response (LLM)                      │
│      "Rahul ka balance 1500 rupees hai"                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                          │ response text
                          ▼
┌─ TTS + RESPONSE ────────────────────────────────────────────────────┐
│                                                                     │
│  12. Text → TTS provider (ElevenLabs/OpenAI/Piper)               │
│      Audio → base64 MP3                                           │
│                                                                     │
│  13. Sent to client:                                               │
│      { type: "voice:response", data: { text: "...", result: {...} } }
│      { type: "voice:tts-stream", data: { audio: "base64...", format: "mp3" } }
│                                                                     │
│  14. Client plays audio through speakers                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Voice Auth Error Cases

| Condition | Server Response |
|---|---|
| No token / invalid token | WebSocket close code 4401 before upgrade completes |
| Token expired mid-session | Next message returns `{ type: "error", data: { code: "TOKEN_EXPIRED" } }` |
| Missing `voice:use` permission | 403 before session created |
| Feature `voice_recording` disabled | Recording commands silently ignored |
| tenantId mismatch | All DB queries return empty (enforced by Prisma `where: { tenantId }`) |

### Multi-Tenant Isolation in Voice

The `tenantContext` (AsyncLocalStorage) ensures every piece of code in the async chain of a voice request sees the same tenant:

```
tenantContext.run({ tenantId: "abc", userId: "xyz" }, () => {
  // Inside here — the entire pipeline:
  //   STT → LLM → engine → Prisma → DB audit
  // ALL have access to ctx.tenantId and ctx.userId
  // Zero chance of cross-tenant data leakage
})
```

---

## User Management Flows

### Small Shop (Single Owner)

The owner is created at bootstrap. They manage themselves via `/api/v1/auth/me`.
No staff — the owner is the only user.

```
POST /api/v1/auth/login  →  get tokens
GET  /api/v1/auth/me     →  view profile
PUT  /api/v1/auth/me/password  →  change password
```

### SME / Corporate (Multi-User)

Owner creates staff accounts with appropriate roles:

```bash
# Owner creates a billing staff member
POST /api/v1/users
Authorization: Bearer <owner token>

{
  "email":    "staff@myshop.com",
  "name":     "Ramesh Kumar",
  "role":     "staff",
  "password": "initial-password-123"
}
# → staff gets default permissions: customers:read/create, invoices:read/create,
#   products:read, payments:create, reminders:read, voice:use
```

```bash
# Owner creates an admin-level manager
POST /api/v1/users
Authorization: Bearer <owner token>

{
  "email":    "manager@myshop.com",
  "name":     "Priya Sharma",
  "role":     "manager",
  "password": "secure-password-456",
  "permissions": [   # optional — override role defaults
    "customers:read", "customers:create", "customers:update",
    "invoices:read",  "invoices:create",  "invoices:cancel",
    "products:read",  "products:update",
    "payments:read",  "payments:create",
    "reminders:read", "reminders:create",
    "reports:read",
    "voice:use"
  ]
}
```

---

## Tenant Feature Flags

Features are stored as a JSON object in `Tenant.features`. Routes can be gated behind a feature:

```typescript
fastify.post('/api/v1/gst/report', {
  preHandler: [requireAuth, requireFeature('gst_enabled')],
}, handler)
```

If the tenant's plan doesn't have `gst_enabled: true`, the endpoint returns:
```json
{ "error": "Feature not available", "message": "The 'gst_enabled' feature is not enabled on your plan (free)." }
```

**Default features by plan:**

| Feature | free | pro | enterprise |
|---|:-:|:-:|:-:|
| inventory | ✓ | ✓ | ✓ |
| customer_credit | ✓ | ✓ | ✓ |
| reports | ✓ | ✓ | ✓ |
| whatsapp | ✓ | ✓ | ✓ |
| voice_recording | ✓ | ✓ | ✓ |
| batch_tracking | ✗ | ✓ | ✓ |
| advanced_reminders | ✗ | ✓ | ✓ |
| email | ✗ | ✓ | ✓ |
| gst_enabled | ✗ | ✓ | ✓ |
| loyalty | ✗ | ✓ | ✓ |
| gst_filing | ✗ | ✗ | ✓ |
| variants | ✗ | ✗ | ✓ |
| multi_conversation | ✗ | ✗ | ✓ |
| conversation_queue | ✗ | ✗ | ✓ |
| customer_documents | ✗ | ✗ | ✓ |
| sms | ✗ | ✗ | ✓ |

The platform admin can override any feature for any tenant:
```
PUT /admin/tenants/:id/features
x-admin-key: <key>

{ "gst_enabled": true, "email": true }   # merge — other flags unchanged
```

---

## Security Properties

| Property | Implementation |
|---|---|
| Password hashing | scrypt (Node built-in), 64-byte key, random 16-byte salt per password |
| JWT signing | HS256 (HMAC-SHA256), constant-time comparison via `timingSafeEqual` |
| Token revocation | Refresh tokens stored in DB Session table — logout deletes the row |
| Timing-safe comparison | `crypto.timingSafeEqual` used for both JWT signature and password verify |
| Credential redaction | `passwordHash`, `token`, `refreshToken` never appear in logs (Pino redact list) |
| Tenant isolation | All Prisma queries include `{ where: { tenantId } }` — enforced at service layer |
| Request attribution | Every DB mutation audit log includes `tenantId` + `userId` from AsyncLocalStorage |
| Admin API hardening | 503 in production if ADMIN_API_KEY not set, 401 on mismatch |
| Enumeration protection | Login returns generic "Invalid email or password" for both missing user and wrong password |

---

## Quick Reference — Token Lifecycle

```
Login
  │
  ├── accessToken  (15 min) ──► use for all API calls
  │     │
  │     └── expires → 401 Unauthorized
  │           │
  │           └──► POST /api/v1/auth/refresh with refreshToken
  │                 │
  │                 ├── new accessToken (15 min)
  │                 └── new refreshToken (7 days) ← store, discard old
  │
  └── refreshToken (7 days) ──► stored in DB Session table
        │
        ├── logout → DELETE from DB → future refreshes return 401
        └── admin reset password → DELETE all user sessions
```

---

*Last updated: 2026-03-01*
