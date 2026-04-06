> Research Consolidation: This file is a detailed appendix under docs/RESEARCH_MASTER.md.
> Update cross-domain research summary and priorities in docs/RESEARCH_MASTER.md first.

> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Execora — Production Readiness SOP & Architecture Contract

> **This document is the single source of truth for how Execora is structured, built,
> tested, deployed, and evolved.**
> Every engineer, AI agent, and open-source contributor must read this before touching code.
> Last reviewed: 2026-03-12

---

## Table of Contents

1. [Monorepo Structure Contract](#1-monorepo-structure-contract)
2. [What Lives Where — The Immovable Rules](#2-what-lives-where--the-immovable-rules)
3. [Refactorability Architecture — Change UI Without Breaking Logic](#3-refactorability-architecture--change-ui-without-breaking-logic)
4. [Package API Contracts](#4-package-api-contracts)
5. [Local Development SOP](#5-local-development-sop)
6. [Code Quality Gates](#6-code-quality-gates)
7. [Web App Production Checklist](#7-web-app-production-checklist)
8. [Mobile App Production Checklist](#8-mobile-app-production-checklist)
9. [API + Backend Production Checklist](#9-api--backend-production-checklist)
10. [CI/CD and Release SOP](#10-cicd-and-release-sop)
11. [Security Checklist](#11-security-checklist)
12. [Observability Checklist](#12-observability-checklist)
13. [Open-Source Governance](#13-open-source-governance)
14. [Go / No-Go Release Gate](#14-go--no-go-release-gate)
15. [Top 20 Mistakes — Execora Specific](#15-top-20-mistakes--execora-specific)
16. [Weekly Release Process](#16-weekly-release-process)
17. [PR Review Flow](#17-pr-review-flow)
18. [Ownership Model](#18-ownership-model)
19. [Appendices](#19-appendices)

---

## 1. Monorepo Structure Contract

### Canonical Layout

```
execora/                             ← workspace root (pnpm + turbo)
├── apps/
│   ├── api/                         ← @execora/api       — Fastify HTTP + WebSocket (port 3006)
│   ├── worker/                      ← @execora/worker    — BullMQ job processor (standalone)
│   ├── web/                         ← @execora/web       — React 18 + Vite dashboard (port 5173)
│   └── mobile/                      ← @execora/mobile    — Expo 52 / React Native 0.76 Android-first
├── packages/
│   ├── shared/                      ← @execora/shared    — API client, types, billing logic (NO platform deps)
│   ├── types/                       ← @execora/types     — JWT payload, RBAC, permission enums
│   ├── infrastructure/              ← @execora/infrastructure — prisma, logger, redis, queue, metrics, auth
│   └── modules/                     ← @execora/modules   — business services: invoice, customer, voice, STT/TTS
├── packages/db/
│   ├── schema.prisma                ← Single schema for entire backend
│   └── seed.ts                      ← Deterministic seed — run: pnpm seed
├── docs/                            ← All documentation lives here
├── package.json                     ← Workspace root — scripts + turbo only. No app deps here.
├── pnpm-workspace.yaml
└── turbo.json
```

### Verified Workspace Commands

```bash
# From workspace root — all commands tested and confirmed working:

pnpm install                         # Install all packages (--frozen-lockfile in CI)
pnpm build                           # turbo: shared → infrastructure → modules → api/worker/web
pnpm dev                             # Start API only in watch mode (port 3006)
pnpm dev:web                         # Start web dashboard in watch mode (port 5173)
pnpm worker                          # Start BullMQ worker in watch mode
pnpm dev:all                         # Start all services concurrently
pnpm typecheck                       # turbo: tsc --noEmit across all packages in order
pnpm test                            # turbo: all test suites in dependency order
pnpm db:generate                     # prisma generate (run after every schema.prisma change)
pnpm db:push                         # prisma db push (development only — no migration file)
pnpm db:migrate                      # prisma migrate dev (creates migration file + applies)
pnpm migrate:prod                    # prisma migrate deploy (production — CI only, never local)
pnpm seed                            # Populate DB with realistic test data
pnpm db:studio                       # Prisma Studio GUI at http://localhost:5555

# Mobile (from workspace root):
pnpm --filter @execora/mobile start        # Expo Metro dev server
pnpm --filter @execora/mobile android      # Open on Android emulator
eas build --profile preview                # Build installable APK for testing
eas build --profile production             # Build AAB for Play Store
eas update --channel production            # Push OTA JS update to production
```

### Package Resolution Rules (Enforced by ESLint)

```
Rule 1: Imports go DOWN the dependency chain, never UP
  apps/* can import from packages/*
  packages/* CANNOT import from apps/*

Rule 2: packages/shared has zero platform-specific dependencies
  Blocked: react-native, expo, @react-navigation, localStorage, document, window, Alert, Linking

Rule 3: Cross-package imports use barrel only — no deep imports
  CORRECT:   import { invoiceApi } from '@execora/shared'
  INCORRECT: import { invoiceApi } from '@execora/shared/src/api-client'

Rule 4: infrastructure and modules are backend-only
  packages/api and apps/worker: may import from @execora/infrastructure and @execora/modules
  apps/web and apps/mobile: NEVER import from @execora/infrastructure or @execora/modules

Rule 5: types package is safe everywhere
  All apps and packages may import from @execora/types
```

### Build Order (turbo.json dependency graph)

```
@execora/shared        (builds first — no internal deps)
@execora/types         (builds first — no internal deps)
       ↓
@execora/infrastructure (depends on shared, types)
       ↓
@execora/modules       (depends on infrastructure, shared, types)
       ↓
@execora/api           (depends on modules, infrastructure, shared, types)
@execora/worker        (depends on modules, infrastructure, shared, types)
@execora/web           (depends on shared, types)
@execora/mobile        (depends on shared, types)
```

---

## 2. What Lives Where — The Immovable Rules

### `packages/shared/src/` — Must Contain

| What | File | Consumed By |
|------|------|-------------|
| All domain types | `types.ts` | web, mobile, api (via modules) |
| API client + `apiFetch` | `api-client.ts` | web, mobile |
| `computeTotals()` | `billing-logic.ts` | web (ClassicBilling), mobile (BillingScreen) |
| `computeAmount()` | `billing-logic.ts` | web, mobile (line item calc) |
| `amountInWords()` | `billing-logic.ts` | web, mobile (invoice footer) |
| `inr()` formatter | `billing-logic.ts` | web, mobile (all currency display) |
| `fuzzyFilter()` | `billing-logic.ts` | web, mobile (product search) |
| `isDraftExpired()` | `billing-logic.ts` | mobile (MMKV draft recovery) |
| `PAY_MODES` constant | `billing-logic.ts` | web, mobile (payment method lists) |
| `DEFAULT_GST_RATE` | `billing-logic.ts` | web, mobile (GST = 18%) |
| `DRAFT_MAX_AGE_MINUTES` | `billing-logic.ts` | mobile (draft expiry = 480 min) |
| `authApi`, `customerApi` | `api-client.ts` | web, mobile |
| `productApi`, `invoiceApi` | `api-client.ts` | web, mobile |

### `packages/shared/src/` — Must NOT Contain

```
BLOCKED — these will fail web or mobile build if added to shared:

react, react-dom, react-native, react-native-*
expo, expo-*, @expo/*
@react-navigation/*, react-router, react-router-dom
localStorage, sessionStorage, document, window, navigator
MMKV, AsyncStorage
Alert, Linking, Share (from react-native)
WebSocket (browser or Node version)
Buffer, process.env (Node-only)
@execora/infrastructure, @execora/modules, prisma
```

### Current Types in `packages/shared/src/types.ts`

```typescript
// These are THE contract between all frontends and the backend.
// Any field addition or removal requires updating this file FIRST.

Customer         // id, tenantId, name, phone?, email?, balance, totalPurchases, totalPayments
Product          // id, tenantId?, name, price?, unit?, stock?, category?, sku?, hsnCode?, barcode?
InvoiceItem      // productName, quantity, unitPrice?, lineDiscountPercent?, amount?, hsnCode?
Invoice          // id, invoiceNo?, customerId, customer?, items[], subtotal, discountAmount?,
                 // gstAmount?, total, notes?, status, createdAt, updatedAt
BillingItem      // id, name, qty, rate, unit, discount, amount, productId?, hsnCode? (UI state)
BillingDraft     // Full draft shape — persisted to MMKV (mobile) or localStorage (web)
PaymentSplit     // id, mode, amount (one entry per payment method in split payment)
PaymentMode      // 'cash' | 'upi' | 'card' | 'credit'
CreateInvoicePayload   // POST /api/v1/invoices request body
PaginatedCustomers     // { customers: Customer[], total: number }
PaginatedProducts      // { products: Product[], total: number }
PaginatedInvoices      // { invoices: Invoice[], total: number }
```

### Valid Invoice Status Values

```typescript
// ONLY these — 'issued' is legacy and must never be used:
type InvoiceStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled'

// Allowed transitions:
// draft     → pending    (confirmed)
// pending   → partial    (partial payment recorded)
// pending   → paid       (full payment recorded)
// partial   → paid       (remaining balance paid)
// pending   → cancelled  (manual cancel)
// partial   → cancelled  (manual cancel)
```

### Platform-Specific Code — Stays in Apps, Never Crosses

| Concern | Web (`apps/web/`) | Mobile (`apps/mobile/`) |
|---------|-------------------|------------------------|
| Routing | React Router v6 (`src/App.tsx`) | @react-navigation v7 (`src/navigation/index.tsx`) |
| Storage | localStorage (AuthContext) | MMKV encrypted (`src/lib/storage.ts`) |
| Auth persistence | `AuthContext.tsx` | `tokenStorage` in `storage.ts` |
| API client init | `src/lib/api.ts` → `initApiClient({ getToken: () => localStorage.getItem('execora_token') })` | `src/lib/api.ts` → `initApiClient({ getToken: tokenStorage.getToken })` |
| UI components | shadcn/ui + Tailwind CSS + Radix | NativeWind + React Native primitives |
| Charts | recharts | victory-native (planned) |
| WebSocket | `src/lib/ws.ts` singleton | planned |
| Alerts | shadcn Toast / Sonner | `Alert.alert()` from react-native |
| Share | Web Share API | `Share.share()` from react-native |
| Links | `<a href target="_blank">` | `Linking.openURL()` |
| PDF download | `fetch` + blob URL + `<a>.click()` | expo-sharing (planned) |

---

## 3. Refactorability Architecture — Change UI Without Breaking Logic

### The 3-Layer Rule

Every screen in both web and mobile follows this strict separation:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: UI — Platform-Specific Files                      │
│                                                             │
│  Web:    apps/web/src/pages/*.tsx                           │
│          apps/web/src/components/*.tsx                      │
│  Mobile: apps/mobile/src/screens/*.tsx                      │
│                                                             │
│  ONLY: JSX structure, className strings, event handlers     │
│  ZERO: Business logic, API calls, data transformations      │
│  ZERO: computeTotals, formatCurrency, invoice status logic  │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: Data / State — React Query + local useState       │
│                                                             │
│  Web:    apps/web/src/hooks/useQueries.ts                   │
│  Mobile: inline useQuery/useMutation in screen files        │
│                                                             │
│  ONLY: useQuery, useMutation, queryClient.invalidateQueries │
│  ONLY: local form state (useState for inputs, modals)       │
│  ZERO: Business calculations inside query functions         │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1: Business Logic — packages/shared                  │
│                                                             │
│  packages/shared/src/billing-logic.ts                       │
│  packages/shared/src/api-client.ts                          │
│  packages/shared/src/types.ts                               │
│                                                             │
│  ONLY: Pure functions, types, API calls                     │
│  ZERO: UI, platform APIs, side effects, navigation          │
└─────────────────────────────────────────────────────────────┘
```

### How to Add a New Feature Correctly

**Step 1 — Define the type in `packages/shared/src/types.ts`**
```typescript
export interface Expense {
  id: string;
  tenantId: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface CreateExpensePayload {
  category: string;
  amount: number;
  date: string;
  notes?: string;
}
```

**Step 2 — Add the API call in `packages/shared/src/api-client.ts`**
```typescript
export const expenseApi = {
  list: (page = 1, limit = 20) =>
    apiFetch<{ expenses: Expense[]; total: number }>(
      `/api/v1/expenses?page=${page}&limit=${limit}`
    ),
  create: (data: CreateExpensePayload) =>
    apiFetch<{ expense: Expense }>('/api/v1/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
// packages/shared/src/index.ts already exports everything — done automatically
```

**Step 3 — Add business logic if needed in `packages/shared/src/billing-logic.ts`**
```typescript
// Only if there are shared calculations (e.g. monthly expense total)
export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}
```

**Step 4 — Build the web page (`apps/web/src/pages/Expenses.tsx`)**
```tsx
import { expenseApi, sumExpenses, type Expense } from '@execora/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Web-specific JSX: <div>, shadcn Button, Input, Dialog, Table, etc.
// All business logic delegated to shared functions
```

**Step 5 — Build the mobile screen (`apps/mobile/src/screens/ExpensesScreen.tsx`)**
```tsx
import { expenseApi, sumExpenses, type Expense } from '@execora/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Mobile-specific JSX: <View>, <Text>, <TouchableOpacity>, NativeWind classes
// Exact same logic, different UI primitives
```

**Step 6 — Wire into mobile navigation (`apps/mobile/src/navigation/index.tsx`)**
```typescript
// Add ExpensesScreen to appropriate stack + tab
export type MainTabParams = {
  // ... existing tabs
  ExpensesTab: undefined;
};
```

> **Result:** Changing the UI of either app requires touching ONLY the `.tsx` files in that app.
> The business logic, API calls, and types are shared and tested once.

### How to Change UI Without Breaking Logic

```
Goal: Redesign the Customer list card (web + mobile)

Correct approach:
  Web:    Open apps/web/src/pages/Customers.tsx
          Modify only: JSX structure, className strings
          Do NOT touch: useQuery hook, customerApi calls, Customer type, balance logic

  Mobile: Open apps/mobile/src/screens/CustomersScreen.tsx
          Modify only: View/Text structure, NativeWind className strings
          Do NOT touch: useQuery hook, customerApi calls, Customer type, inr() calls

Test: pnpm typecheck still passes — if it does, logic is untouched.
```

### How to Change a Business Rule Without Breaking UI

```
Goal: Change GST rate from 18% to 12% for a specific category

Correct approach:
  Open:   packages/shared/src/billing-logic.ts
  Change: DEFAULT_GST_RATE or add category-specific rate map
  Test:   pnpm --filter @execora/shared test

Both web (ClassicBilling.tsx) and mobile (BillingScreen.tsx) automatically
use the new rate. Zero UI files touched. Zero regression risk.
```

### React Query Key Convention

All cache keys follow this convention — mentally shared between web and mobile:

```typescript
// Customer queries:
['customers']                            // full list (web default)
['customers', search, page]             // searched/paginated list (mobile)
['customer', id]                         // single customer profile
['customer-invoices', customerId]        // all invoices for a customer
['customer-ledger', customerId]          // ledger entries
['comm-prefs', customerId]              // notification preferences
['reminders', customerId]               // scheduled reminders

// Invoice queries:
['invoices']                             // invoice list (web default)
['invoices', page]                       // paginated (mobile)
['invoice', id]                          // single invoice detail

// Product queries:
['products']                             // full product catalog
['products', 'search', query]           // search results
['products', 'low-stock']              // low stock alerts

// Dashboard queries:
['daily-summary', date]                  // today's KPIs (refetch every 60s)
['dashboard-stats']                      // charts data
```

**Cache invalidation after every mutation — always invalidate related keys:**
```typescript
// Example: after recording a payment
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['customers'] });           // list
  qc.invalidateQueries({ queryKey: ['customer', customerId] }); // profile
  qc.invalidateQueries({ queryKey: ['customer-ledger', customerId] });
  qc.invalidateQueries({ queryKey: ['invoices'] });            // list
  qc.invalidateQueries({ queryKey: ['invoice', invoiceId] });  // detail
  qc.invalidateQueries({ queryKey: ['daily-summary', today] }); // dashboard
}
```

---

## 4. Package API Contracts

### `@execora/shared` — Full Public API

```typescript
// ── From types.ts ─────────────────────────────────────────
export type {
  Customer, Product, Invoice, InvoiceItem,
  BillingItem, BillingDraft, PaymentSplit, PaymentMode,
  CreateInvoicePayload,
  PaginatedCustomers, PaginatedProducts, PaginatedInvoices,
}

// ── From billing-logic.ts ─────────────────────────────────
export {
  computeTotals,          // (items, discountPct, discountFlat, withGst, roundOff) → totals object
  computeAmount,          // (rate, qty, discount) → number
  amountInWords,          // (amount) → "One Thousand Rupees Only"
  inr,                    // (n) → "1,00,000.00" (en-IN locale)
  fuzzyScore,             // (text, query) → 0-100 relevance score
  fuzzyFilter,            // (products, query) → top 8 matching products
  isDraftExpired,         // (savedAt) → boolean (> 8 hours = expired)
  PAY_MODES,              // [{ id, label, icon }] — cash, upi, card, credit
  DEFAULT_GST_RATE,       // 18
  DRAFT_MAX_AGE_MINUTES,  // 480
}

// ── From api-client.ts ────────────────────────────────────
export {
  initApiClient,          // call once on app boot with storage adapters
  apiFetch,               // generic authenticated fetch with auto-refresh
  authApi,                // { login, sendOtp, me }
  customerApi,            // { list, search, get, create, update }
  productApi,             // { list, search, get, byBarcode }
  invoiceApi,             // { list, get, create, pdf }
}
export type { ApiAdapters }
```

### `@execora/shared` — Breaking Change Policy

A change to `packages/shared` is BREAKING if it:
- Removes or renames any exported function, type, or constant
- Adds a required field to `CreateInvoicePayload` or any input type
- Changes the return type or parameter types of any `*Api` function
- Changes the parameter signature of `computeTotals`, `computeAmount`, `amountInWords`
- Changes the shape of `BillingDraft` (breaks persisted MMKV drafts on mobile)

**Breaking changes require:**
1. Mark old export with `@deprecated` JSDoc
2. Keep old export working and tested for minimum 2 releases
3. Document migration path in `CHANGELOG.md` under "Breaking Changes"
4. Run backward compatibility test: old mobile client fixture against new API
5. Coordinate simultaneous mobile OTA update if field removal is required

### `@execora/infrastructure` — Backend-Only (Never Import in Apps)

```typescript
// Attempting to import these in apps/web or apps/mobile will fail at build:
import { prisma }      // PrismaClient singleton — throws in browser/RN context
import { logger }      // pino — Node.js streams, not browser-safe
import { redis }       // ioredis — Node.js TCP, not browser-safe
import { queue }       // BullMQ — requires Node.js, Redis connection
import { config }      // reads process.env — undefined in Expo
import { metrics }     // prom-client — Node.js only
```

### `@execora/modules` — Backend-Only (Never Import in Apps)

```typescript
// Service layer — business logic that requires DB and infrastructure:
import { customerService }   // findCustomer, createCustomer, updateBalance, getLedger
import { invoiceService }    // createInvoice, generateInvoiceNo, findOrCreateProduct
import { paymentService }    // recordPayment, getPaymentHistory
import { reminderService }   // createReminder, listReminders, markSent
import { voiceEngine }       // processVoiceCommand (Mode 1 intent-based)
import { sttService }        // speech-to-text provider abstraction
```

---

## 5. Local Development SOP

### Prerequisites

```bash
node --version     # Must be >= 20.0.0
pnpm --version     # Must be >= 9.0.0   (install: npm i -g pnpm@latest)
docker --version   # Must be >= 24.0.0
# For mobile:
# Android Studio with Android SDK + emulator configured
# OR physical Android device with USB debugging enabled
```

### One-Command Bootstrap (Complete)

```bash
# 1. Clone and enter repo
git clone <repo-url> execora && cd execora

# 2. Install all workspace packages
pnpm install

# 3. Copy all environment files
cp packages/api/.env.example    packages/api/.env
cp apps/web/.env.example    apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env

# 4. Start infrastructure services (PostgreSQL 15, Redis 7, MinIO)
docker compose up -d

# 5. Generate Prisma client + push schema to dev DB
pnpm db:generate && pnpm db:push

# 6. Seed database with realistic test data
pnpm seed

# 7. Start all services
pnpm dev:all
# OR start individually:
# Terminal 1: pnpm dev          (API on port 3006)
# Terminal 2: pnpm dev:web      (Web on port 5173)
# Terminal 3: pnpm worker       (BullMQ worker)
# Terminal 4: pnpm --filter @execora/mobile start  (Expo Metro)
```

### Environment Variables — Complete Reference

**`packages/api/.env`**
```bash
DATABASE_URL=postgresql://execora:execora@localhost:5432/execora_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-must-be-at-least-32-characters-long
JWT_REFRESH_SECRET=dev-refresh-secret-must-be-at-least-32-characters
PORT=3006
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=execora-uploads
NODE_ENV=development
```

**`apps/web/.env`**
```bash
VITE_API_BASE_URL=http://localhost:3006
VITE_WS_URL=ws://localhost:3006
```

**`apps/mobile/.env`**
```bash
# Option A — Android emulator (default):
EXPO_PUBLIC_API_URL=http://10.0.2.2:3006

# Option B — Physical device on same WiFi (replace with your machine's LAN IP):
# EXPO_PUBLIC_API_URL=http://192.168.1.100:3006

# Option C — External network via tunnel:
# EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
```

### Development Ports

| Service | Port | Access |
|---------|------|--------|
| API (Fastify) | 3006 | http://localhost:3006 |
| Web (Vite) | 5173 | http://localhost:5173 |
| Prisma Studio | 5555 | http://localhost:5555 (`pnpm db:studio`) |
| MinIO Console | 9001 | http://localhost:9001 (admin/minioadmin) |
| Prometheus metrics | 3006/metrics | http://localhost:3006/metrics |
| Expo Metro | 8081 | http://localhost:8081 |

### Physical Device Testing

```bash
# Android via USB:
adb devices                                              # confirm device is listed
pnpm --filter @execora/mobile android                    # installs dev client to device

# Android on same WiFi network:
# 1. Get your machine's LAN IP:  ip addr show wlan0  (Linux) / ipconfig getifaddr en0  (macOS)
# 2. Set in apps/mobile/.env:    EXPO_PUBLIC_API_URL=http://192.168.1.100:3006
# 3. Restart Metro:              pnpm --filter @execora/mobile start --clear

# External network (different WiFi, mobile data):
# 1. Install ngrok or use Tailscale: pnpm deploy:tailscale
# 2. Set in apps/mobile/.env:    EXPO_PUBLIC_API_URL=https://<tunnel-url>
# 3. Restart Metro
```

### Reset Local State

```bash
# Reset database to clean seeded state:
pnpm db:push --force-reset && pnpm seed

# Clear Metro bundler cache:
pnpm --filter @execora/mobile start --clear

# Nuclear reset (full reinstall):
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install && pnpm db:push && pnpm seed
```

---

## 6. Code Quality Gates

### Every PR Must Pass All 5

```bash
pnpm lint            # ESLint — zero warnings allowed (--max-warnings 0)
pnpm typecheck       # tsc --noEmit across all packages in dependency order
pnpm test            # All 6 test suites (conversation, devanagari, ledger, reminder, invoice, customer)
pnpm build           # All packages and apps build successfully
pnpm audit           # pnpm audit --audit-level high — zero high/critical CVEs
```

### TypeScript Standards

```typescript
// Required in ALL tsconfig.json files:
"strict": true                      // enables all strict checks

// Required in packages/shared tsconfig specifically:
// ESLint rule: "@typescript-eslint/no-explicit-any": "error"
// Zero 'any' allowed in shared types or API client

// Allowed in app-level code only:
const navigation = useNavigation<any>();            // React Navigation typing limitation
const invoice = (data as any)?.invoice;            // API response hydration (use sparingly)
```

### Import Boundary Enforcement

```
Add these ESLint rules to enforce boundaries:

packages/shared:
  no-restricted-imports: ['react', 'react-native', 'expo', '@react-navigation/*',
                           '@execora/infrastructure', '@execora/modules']

apps/web:
  no-restricted-imports: ['react-native', 'expo', 'react-native-mmkv',
                           '@execora/infrastructure', '@execora/modules']

apps/mobile:
  no-restricted-imports: ['react-router-dom', '@execora/infrastructure',
                           '@execora/modules']
```

### Test Requirements Per Package

```
packages/shared/src/billing-logic.ts — 100% function coverage:
  computeTotals: zero items, discount%, discount flat, with GST, without GST, round-off on/off
  computeAmount: zero rate, zero qty, 100% discount, fractional values
  amountInWords: zero, hundreds, thousands, lakhs, crores, paise, negative
  fuzzyFilter:   empty query, exact match, partial match, subsequence match, no match
  isDraftExpired: just created (false), 7 hours old (false), 9 hours old (true)

packages/modules services — 80% line coverage:
  invoice.service:  createInvoice happy path, missing customer (auto-creates), duplicate idempotency
  customer.service: create, update balance, credit limit enforcement
  ledger.service:   addEntry, getLedger, running balance calculation
  reminder.service: create, list, markSent, overdue detection
```

### Running Module Tests (Known ioredis Issue)

```bash
# Compile test sources:
node_modules/.bin/tsc -p packages/modules/tsconfig.test.json

# Run individual test files (timeout required — ioredis hangs after tests due to keepalive):
timeout 15 node --test packages/modules/dist-test/__tests__/invoice.service.test.js
timeout 15 node --test packages/modules/dist-test/__tests__/customer.service.test.js
timeout 15 node --test packages/modules/dist-test/__tests__/ledger.service.test.js
timeout 15 node --test packages/modules/dist-test/__tests__/reminder.service.test.js
timeout 15 node --test packages/modules/dist-test/__tests__/conversation.test.js
timeout 15 node --test packages/modules/dist-test/__tests__/devanagari.test.js

# All 6 suites pass: conversation (16 tests), devanagari (52), ledger (18),
#                    reminder (20), invoice (16), customer (20)
```

### PR Minimum Quality Bar

```
Before requesting review, author must verify:
  □ All 5 CI gates pass locally
  □ New feature has a test (unit or integration)
  □ New type in shared has JSDoc comment explaining each field
  □ New API endpoint has inline comment in route file
  □ No 'any' added to packages/shared
  □ No platform code (react-native, window, document) added to packages/shared
  □ No console.log in production code paths
  □ No hardcoded URLs, ports, or secrets
  □ No 'issued' invoice status (use 'pending')
  □ Invoice status changes go through correct transitions
```

---

## 7. Web App Production Checklist

### File Reference

```
apps/web/src/
├── App.tsx                      ← All routes + AuthContext + WSContext + QueryClientProvider
├── pages/
│   ├── Index.tsx                ← Dashboard (KPI cards, AI feed, overdue, upcoming, activity)
│   ├── ClassicBilling.tsx       ← Invoice creation form (71KB — most complex page)
│   ├── InvoiceDetail.tsx        ← Single invoice: view, edit, cancel, share, email
│   ├── Invoices.tsx             ← Invoice list with status tabs + search
│   ├── Customers.tsx            ← Customer list + search + add modal
│   ├── CustomerDetail.tsx       ← Profile + ledger + invoices + reminders + edit
│   ├── Payment.tsx              ← Record payment page
│   ├── Inventory.tsx            ← Product CRUD + stock + expiry + barcode
│   ├── Expenses.tsx             ← Expense tracking + categories
│   ├── Purchases.tsx            ← Purchase orders
│   ├── CashBook.tsx             ← Daily cash in/out
│   ├── DayBook.tsx              ← Daily transaction summary
│   ├── OverduePage.tsx          ← Overdue invoices dashboard
│   ├── Reports.tsx              ← GST (GSTR1/GSTR2) + P&L + charts (81KB)
│   ├── Settings.tsx             ← Tenant config + user management (35KB)
│   ├── LoginPage.tsx            ← Email/password login
│   └── NotFound.tsx
├── contexts/
│   ├── AuthContext.tsx          ← JWT state + localStorage persistence + refresh
│   ├── WSContext.tsx            ← WebSocket singleton + React Query invalidation on events
│   └── ThemeContext.tsx         ← Dark mode toggle
├── hooks/
│   ├── useQueries.ts            ← All React Query hooks (useCustomers, useInvoice, etc.)
│   └── useWsInvalidation.ts     ← Subscribes to WS events → invalidates query keys
└── lib/
    ├── api.ts                   ← Web-specific: initApiClient + web-extended API functions
    └── ws.ts                    ← WebSocket singleton (binary audio + JSON events)
```

### Web Auth Flow

```
Login:
  1. User submits email + password in LoginPage.tsx
  2. POST /api/v1/auth/login
  3. Response: { accessToken, refreshToken, user: { id, role, permissions, tenant } }
  4. localStorage.setItem('execora_token', accessToken)
     localStorage.setItem('execora_refresh', refreshToken)
     localStorage.setItem('execora_user', JSON.stringify(user))
  5. AuthContext.isAuthenticated = true → ProtectedRoute renders app

Token refresh (on 401):
  1. Detect 401 response in api.ts fetch wrapper
  2. Call refreshAccessToken() → POST /api/v1/auth/refresh { refreshToken }
  3. On success: update localStorage + retry original request
  4. On failure: localStorage.clear() + dispatch 'execora:auth-expired' event
                AuthContext listener → navigate('/login')
```

### WebSocket Event → Cache Invalidation Map

```typescript
// apps/web/src/contexts/WSContext.tsx must handle:
'invoice:draft'        → invalidate ['invoices']
'invoice:confirmed'    → invalidate ['invoices'], ['invoice', id], ['customers']
'payment:recorded'     → invalidate ['customers'], ['customer', id], ['invoices'],
                                    ['customer-ledger', id], ['daily-summary', today]
'customer:updated'     → invalidate ['customers'], ['customer', id]
'voice:response'       → update voice feed display (AiAgentFeed component)
'reminder:fired'       → invalidate ['reminders', customerId]
'invoice:created'      → invalidate ['invoices'], ['customers'] (balance updated)
```

### Pre-Release Checklist

```
Build:
  □ pnpm --filter @execora/web build completes with zero errors and zero warnings
  □ dist/ is self-contained; no absolute local paths in output
  □ Bundle size: largest JS chunk < 500KB gzipped
    (check: find dist/assets -name "*.js" -exec gzip -l {} \;)

Environment:
  □ VITE_API_BASE_URL = production API URL (https://api.execora.app)
  □ VITE_WS_URL = production WebSocket URL (wss://api.execora.app)
  □ Zero env vars contain secrets (VITE_ vars are public by definition)

Runtime safety:
  □ Error boundaries wrap every route-level page component
  □ window.addEventListener('unhandledrejection') handler present and logs to Sentry
  □ Sentry (or equivalent) initialized before any route renders
  □ WebSocket reconnects automatically after disconnect (test: kill API mid-session)

Performance:
  □ Lighthouse CI score ≥ 80 against staging deployment
  □ First Contentful Paint < 1.5s on simulated 4G
  □ No React Query with staleTime: 0 in production (add minimum 10_000)
  □ React Query Devtools import removed from production build

CDN and cache:
  □ HTML entry: Cache-Control: no-store, no-cache
  □ Hashed assets (main.abc123.js): Cache-Control: max-age=31536000, immutable
  □ API Authorization uses Bearer header (not cookies that could be cached)

Rollback:
  □ Previous deployment promotable in < 5 minutes
  □ Rollback procedure tested within last 90 days
```

---

## 8. Mobile App Production Checklist

### File Reference

```
apps/mobile/src/
├── App.tsx                         ← QueryClient + NavigationContainer + GestureHandler + SafeArea
├── navigation/
│   └── index.tsx                   ← All stacks, tabs, exported param types
├── screens/
│   ├── LoginScreen.tsx             ← OTP: phone input → send OTP → verify → setIsLoggedIn
│   ├── DashboardScreen.tsx         ← Today's KPIs: sales, invoice count, customer count
│   ├── BillingScreen.tsx           ← Full invoice creation: items, GST, discount, payment, draft (51KB)
│   ├── InvoiceListScreen.tsx       ← Paginated invoice list → tap → InvoiceDetail
│   ├── InvoiceDetailScreen.tsx     ← View + edit + cancel + WhatsApp + share
│   ├── CustomersScreen.tsx         ← Search + list → tap → CustomerDetail
│   ├── CustomerDetailScreen.tsx    ← 4-tab profile: Overview/Invoices/Ledger/Reminders
│   └── PaymentScreen.tsx           ← Record payment: customer search + amount + method
└── lib/
    ├── api.ts                      ← initApiClient() boot + extended API calls (invoiceExtApi, etc.)
    ├── storage.ts                  ← MMKV token storage (encrypted)
    └── utils.ts                    ← formatCurrency, formatDate, formatDateTime, toFloat
```

### Navigation Structure

```
RootNavigator
├── Auth Stack              (shown when isLoggedIn = false)
│   └── Login
└── Main Tabs               (shown when isLoggedIn = true)
    ├── Dashboard Tab       → DashboardScreen
    ├── Billing Tab
    │   └── BillingStack
    │       ├── BillingForm         → BillingScreen
    │       └── InvoiceDetail       → InvoiceDetailScreen
    ├── CustomersTab
    │   └── CustomersStack
    │       ├── CustomerList        → CustomersScreen
    │       ├── CustomerDetail      → CustomerDetailScreen
    │       └── Payment             → PaymentScreen
    └── InvoicesTab
        └── InvoicesStack
            ├── InvoiceList         → InvoiceListScreen
            └── InvoiceDetail       → InvoiceDetailScreen
```

### Navigation Param Types (Export from `navigation/index.tsx`)

```typescript
export type RootStackParams = {
  Auth: undefined;
  Main: undefined;
};
export type AuthStackParams = {
  Login: undefined;
};
export type MainTabParams = {
  Dashboard: undefined;
  Billing: undefined;
  CustomersTab: undefined;
  InvoicesTab: undefined;
};
export type BillingStackParams = {
  BillingForm: undefined;
  InvoiceDetail: { id: string };
};
export type InvoicesStackParams = {
  InvoiceList: undefined;
  InvoiceDetail: { id: string };
};
export type CustomersStackParams = {
  CustomerList: undefined;
  CustomerDetail: { id: string };
  Payment: { customerId?: string };
};
```

### Mobile Auth Flow

```
1. LoginScreen: user enters 10-digit phone number
2. Tap "Send OTP" → POST /api/v1/auth/send-otp { phone }
3. User enters 6-digit OTP
4. Tap "Verify" → POST /api/v1/auth/login { phone, otp }
5. Response: { accessToken, refreshToken, user }
6. tokenStorage.setTokens(accessToken, refreshToken)   ← MMKV encrypted storage
7. setIsLoggedIn(true) → RootNavigator renders MainTabs

Token refresh (on 401 in any screen):
1. apiFetch detects 401
2. tryRefresh() → POST /api/v1/auth/refresh { refreshToken }
3. On success: tokenStorage.setTokens(newAccess, newRefresh) → retry original request
4. On failure: tokenStorage.clearTokens() → _onAuthExpired() → navigate to Login screen
```

### Mobile Extended API (`apps/mobile/src/lib/api.ts`)

```typescript
// These extend @execora/shared — move to shared when web also needs them:

invoiceExtApi.cancel(id)                  // POST /api/v1/invoices/:id/cancel
invoiceExtApi.update(id, data)            // PATCH /api/v1/invoices/:id
invoiceExtApi.sendEmail(id)               // POST /api/v1/invoices/:id/send-email

customerExtApi.delete(id)                 // DELETE /api/v1/customers/:id
customerExtApi.getLedger(id)              // GET /api/v1/customers/:id/ledger
customerExtApi.getCommPrefs(id)           // GET /api/v1/customers/:id/comm-prefs
customerExtApi.updateCommPrefs(id, data)  // PUT /api/v1/customers/:id/comm-prefs

reminderApi.list(customerId?)             // GET /api/v1/reminders?customerId=...
reminderApi.create(data)                  // POST /api/v1/reminders

paymentApi.record(data)                   // POST /api/v1/payments
```

### EAS Build Profiles

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_API_URL": "http://10.0.2.2:3006" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_API_URL": "https://api-staging.execora.app" }
    },
    "production": {
      "distribution": "store",
      "android": { "buildType": "app-bundle" },
      "env": { "EXPO_PUBLIC_API_URL": "https://api.execora.app" }
    }
  }
}
```

### Physical Device Smoke Test Checklist (Sign-Off Required)

```
Device info: _________________  Android version: _________________  Date: _________________
Tester: _________________       Build: preview/production APK

Auth:
  □ Cold start < 3 seconds to first interactive screen
  □ OTP login: enter phone → receive OTP → enter → land on Dashboard
  □ Force logout works: clears token → shows Login screen
  □ Token expiry: wait for expiry → app prompts re-login (or auto-refreshes)

Billing (BillingScreen):
  □ Customer search finds existing customer
  □ Add items with product search (fuzzy + API)
  □ Qty stepper updates line total correctly
  □ Discount % updates grand total correctly (matches computeAmount from shared)
  □ GST toggle adds 18% correctly (matches computeTotals from shared)
  □ Amount in words shown correctly (matches amountInWords from shared)
  □ Split payment: add cash + UPI amounts that sum to total
  □ Submit → success screen → invoice number shown
  □ Draft auto-saves during form fill (MMKV)
  □ Force-kill app → reopen → draft restored from MMKV

Invoice List → Detail:
  □ InvoiceList: tap row → InvoiceDetailScreen opens with correct invoice
  □ InvoiceDetail: all fields correct (total, status, customer name, items)
  □ InvoiceDetail: edit → change qty → save → total updates
  □ InvoiceDetail: cancel → confirm dialog → invoice cancelled → navigate back
  □ InvoiceDetail: WhatsApp button → opens WhatsApp with pre-filled message
  □ InvoiceDetail: Share → native share sheet opens
  □ InvoiceDetail: progress bar shows for partial payments

Customers → Detail:
  □ CustomerList: search filters results in real-time
  □ CustomerList: tap row → CustomerDetailScreen opens
  □ CustomerDetail Overview: balance shown correctly (red if positive, green if zero/credit)
  □ CustomerDetail Overview: "Record Payment" button navigates to PaymentScreen
  □ CustomerDetail Invoices tab: all customer invoices listed, tap → InvoiceDetail
  □ CustomerDetail Ledger tab: entries listed with correct debit/credit colors
  □ CustomerDetail Reminders tab: create reminder → appears in list
  □ CustomerDetail Edit: update name → saved → header reflects new name

Payment:
  □ PaymentScreen: customer pre-filled when navigated from CustomerDetail
  □ PaymentScreen: search works when no customer pre-filled
  □ PaymentScreen: "Fill full balance" link pre-fills amount field
  □ PaymentScreen: submit → success alert → navigate back → customer balance updated

Navigation:
  □ All back buttons work correctly on every screen
  □ Back gesture (swipe from left edge) works on all screens
  □ Tab switching from any stack depth works correctly
  □ No stuck loading states anywhere

Offline:
  □ Enable airplane mode after loading invoices → list still visible (React Query cache)
  □ Enable airplane mode → attempt new action → shows appropriate error (not crash)
  □ Disable airplane mode → data refreshes automatically
```

### Pre-Release Checklist

```
Build:
  □ eas build --profile preview produces valid APK
  □ APK size < 30MB (check EAS build output)
  □ Hermes enabled: app.json contains "jsEngine": "hermes"
  □ EXPO_PUBLIC_API_URL in production profile = https://api.execora.app

Security:
  □ JWT stored with MMKV encryptionKey (not plain MMKV default)
  □ No secrets in EXPO_PUBLIC_* vars
  □ Unzip APK → extract index.android.bundle → grep for known secret patterns → zero results
  □ All API calls use HTTPS in production build

Crash Reporting:
  □ Sentry initialized in App.tsx before NavigationContainer renders
  □ Test error in production build → appears in Sentry with JS stack trace
  □ Crash-free rate baseline established in Sentry

OTA:
  □ runtimeVersion in eas.json is pinned (not 'exposdk:X.X.X')
  □ OTA channel correct for target environment
  □ Previous OTA tested: push update → reopen app → new code active within 2 launches

Play Store:
  □ Screenshots current (not from 3+ versions ago)
  □ Release notes written in English and Hindi
  □ Content rating current
  □ Staged rollout configured: 10% initial, monitor crash rate before 100%
```

---

## 9. API + Backend Production Checklist

### Layer Architecture (Non-Negotiable)

```
HTTP Request arrives at Fastify
         ↓
Route Handler (packages/api/src/api/routes/*.ts)
  • Parse and validate request body/params with JSON Schema or Zod
  • Call ONE service function
  • Format and send response
  • ZERO business logic allowed here
         ↓
Service Function (packages/modules/src/**/*.service.ts)
  • All business logic: validations, calculations, orchestration
  • Calls prisma for DB operations
  • Emits metrics and logs
  • ZERO HTTP-specific code (req, reply, headers) allowed here
         ↓
PrismaClient (packages/infrastructure/src/database.ts)
  • ALL queries include tenantId in WHERE clause
  • Uses transactions for multi-table operations
  • ZERO business logic in queries
         ↓
PostgreSQL
```

### Violations That Cause Immediate PR Rejection

```
❌ prisma.invoice.findMany() called directly in a route handler
❌ Business logic (if/switch on business rules) in a route handler
❌ HTTP request/response objects passed to service functions
❌ DB query without tenantId in WHERE clause
❌ $queryRawUnsafe() used anywhere (SQL injection risk)
❌ Any service function that can throw without logging the error first
```

### Route Pattern (Correct)

```typescript
// packages/api/src/api/routes/invoices.ts
fastify.post<{ Body: CreateInvoicePayload }>(
  '/api/v1/invoices',
  {
    preHandler: [requirePermission('invoices:create')],
    schema: { body: createInvoiceBodySchema },   // ← REQUIRED on every POST/PATCH/PUT
  },
  async (request, reply) => {
    const invoice = await invoiceService.createInvoice(
      request.user.tenantId,
      request.user.id,
      request.body,
    );
    reply.code(201).send({ invoice });
  }
);
```

### Error Response Standard

```typescript
// ALL errors from API must return this exact shape:
{ error: string, code?: string, details?: Record<string, unknown> }

// HTTP status codes:
// 400 — Validation failed, malformed request
// 401 — No token or expired token
// 403 — Valid token but insufficient permissions or wrong tenant
// 404 — Resource not found in this tenant's data
// 409 — Conflict (duplicate, idempotency key already used)
// 422 — Business rule violation (credit limit, invalid transition)
// 429 — Rate limited
// 500 — Unexpected server error (always logged, never exposes stack trace)

// Examples:
{ error: "Validation failed", details: { field: "amount", message: "Must be positive" } }
{ error: "Credit limit exceeded", code: "CREDIT_LIMIT_EXCEEDED" }
{ error: "Invoice not found" }
{ error: "Session expired", code: "AUTH_EXPIRED" }
```

### Auth Requirements

```
Access token:    max expiry = 15 minutes (900 seconds)
Refresh token:   expiry = 30 days; rotate on every use (old token invalidated immediately)
Refresh token:   stored as bcrypt hash in DB — NEVER plain JWT string
Rate limits:
  /api/v1/auth/send-otp:  5 requests / 10 minutes / phone number
  /api/v1/auth/login:     10 requests / 1 minute / IP address
  /api/v1/auth/refresh:   20 requests / 1 minute / token
```

### Database Migration Rules

```
Before writing a migration:
  □ Adding NOT NULL column: must have DEFAULT value or be nullable first
  □ Removing column: deprecate for 1 release (keep column, stop writing to it), then remove
  □ Renaming column: add new column, backfill in background job, deprecate old, remove next release
  □ Adding index: use CREATE INDEX CONCURRENTLY (never locks table)
  □ Multi-GB tables: coordinate with ops for online schema change tools

Migration PR checklist:
  □ Forward migration written and tested on local DB
  □ Rollback migration written alongside it (revert file committed in same PR)
  □ Migration tested on staging DB with approximate production row count
  □ Migration runtime documented in PR description
  □ If runtime > 30 seconds: zero-downtime plan in PR description

Production deploy order:
  1. Run migration:  pnpm migrate:prod  (prisma migrate deploy)
  2. Verify DB schema: prisma migrate status
  3. Deploy new API image (backward compatible with pre-migration schema)
  4. Verify GET /health returns { db: "ok", redis: "ok" }
  5. Monitor error rate for 10 minutes before marking deployment complete
```

### Invoice-Specific Rules

```typescript
// createInvoice auto-creates missing products:
// Does NOT throw "Product not found"
// Uses findOrCreateProduct which calls tx.product.findFirst AND tx.product.findMany
// Creates product with price=0, stock=9999 if not found — correct behavior

// generateInvoiceNo uses $queryRaw (requires transaction):
// Must be in txProxy mocks as: $queryRaw: async () => [{ last_seq: 1 }]
// Uses DB sequence for collision-free invoice numbering under concurrent creation

// Invoice statuses — backend must validate transitions:
// Reject: paid → partial, cancelled → any, paid → pending
```

### BullMQ Worker Rules

```typescript
// Every job processor in apps/worker must:
1. Accept idempotencyKey to prevent double-execution
2. Set jobId to prevent duplicate queuing: { jobId: `reminder:${customerId}:${time}` }
3. Catch all errors: log with { jobId, queue, attempt, error.message }
4. Rethrow after logging so BullMQ handles retry
5. Retry config: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
6. Emit Prometheus counter on success and failure
7. Dead letter: jobs that fail all attempts go to 'failed' queue with full error context
```

### Pre-Deployment Checklist

```
Schema:
  □ prisma migrate status shows 0 pending migrations on staging
  □ Rollback migration tested on staging
  □ No table-locking migration in this release (checked migration SQL)

Auth:
  □ JWT_SECRET is production value (not dev-secret) — min 32 characters
  □ JWT_REFRESH_SECRET is production value — min 32 characters
  □ Refresh token rotation verified in staging

Validation:
  □ Every POST/PATCH/PUT route has JSON Schema or Zod body validation
  □ Tenant isolation test: wrong-tenant JWT returns 403 (not 200 or 404)

Health:
  □ GET /health returns { db: "ok", redis: "ok", uptime: N } on staging
  □ GET /metrics returns Prometheus metrics on staging
  □ Load balancer health check path configured to /health

Monitoring:
  □ Grafana dashboard shows baseline metrics pre-deploy
  □ Alert rules active (error rate > 5%, p99 > 5s)
```

---

## 10. CI/CD and Release SOP

### CI Pipeline Jobs (All Required)

```yaml
# Every PR triggers all 5 jobs — all must be green before merge:
lint:      pnpm lint                      # zero warnings
typecheck: pnpm typecheck                 # zero errors across all packages
test:      pnpm test                      # all suites pass
build:     pnpm build                     # all packages build
audit:     pnpm audit --audit-level high  # zero high/critical CVEs
```

### Branch Protection (GitHub Settings)

```
Branch: main
  ✅ Require status checks to pass before merging: lint, typecheck, test, build, audit
  ✅ Require pull request reviews before merging: 1 reviewer (2 for critical files)
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require branches to be up to date before merging
  ❌ Allow force pushes — DISABLED
  ❌ Allow deletions — DISABLED
  ❌ Allow direct pushes — DISABLED (CI promotes only)
```

### Web Deployment Flow

```
1. PR merged to main → CI runs full suite
2. On CI pass → auto-deploy to staging (zero manual step)
3. Staging smoke test: key flows verified (automated Playwright or manual)
4. Maintainer reviews staging → approves production promotion
5. Production deploy: rolling update (zero downtime)
6. Post-deploy: monitor Grafana error rate for 30 minutes
7. On regression: rollback previous deployment (< 5 minutes)
```

### Mobile Release Flow

```
1. All features for release merged to main
2. Update version: apps/mobile/app.json → expo.version (semver)
3. Commit + create git tag: git tag mobile/v1.2.3 && git push --tags
4. GitHub Actions: tag triggers eas build --profile preview
5. Preview APK distributed via EAS to internal testers
6. Physical device smoke test (checklist in §8) — sign-off required
7. On sign-off: trigger production build: eas build --profile production
8. Submit to Play Store: staged rollout at 10%
9. Monitor Sentry crash rate for 24 hours
10. If stable: advance staged rollout to 50% → 100%
11. JS-only hot fixes: eas update --channel production (OTA, no store review)
```

### Rollback Playbook

```
Web rollback (target: < 5 minutes):
  1. Open Vercel/Netlify/Coolify → Deployments
  2. Identify last known-good deployment (timestamp before incident)
  3. Click "Promote to Production" on that deployment
  4. Verify: curl -I https://app.execora.app → 200; error rate drops
  5. Post-incident: document what caused the regression

API rollback (target: < 10 minutes):
  1. Identify previous image tag: docker images | grep execora/api
  2. docker service update --image ghcr.io/execora/api:<prev-tag> execora_api
     OR: kubernetes rollout undo deployment/execora-api
  3. Verify: curl https://api.execora.app/health → { db: "ok", redis: "ok" }
  4. Monitor error rate for 5 minutes

Database migration rollback:
  1. Run the pre-written revert migration file
  2. pnpm migrate:prod (applies revert)
  3. Redeploy previous API image (compatible with reverted schema)
  4. Verify application behavior

Mobile crash rollback:
  1. If JS-only change: eas update --channel production (push fix or revert)
  2. If native change caused crash: halt staged rollout in Play Console (leaves existing users on working version)
  3. Fix → rebuild → resubmit as hotfix
```

### Secrets in CI

```
NEVER store in YAML files:
  DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET
  EAS_TOKEN, EXPO_TOKEN, SENTRY_DSN
  MINIO_ACCESS_KEY, MINIO_SECRET_KEY

Store in:
  GitHub Secrets → reference as ${{ secrets.NAME }}
  EAS Secret Store → reference in eas.json build env blocks

Rotate on:
  Any team member departure
  Any suspected compromise
  Every 90 days (scheduled rotation)
```

---

## 11. Security Checklist

### Repository

```
□ .gitignore: **/.env, **/.env.local, **/.env.*.local — all variants blocked
□ GitHub secret scanning enabled (repo settings → Security)
□ pnpm audit --audit-level high in CI — blocks merge on high/critical CVE
□ license-checker --failOn "GPL;AGPL" — no copyleft dependencies
□ Dependabot or Renovate: weekly automated dependency update PRs
□ CODEOWNERS: .github/workflows/ requires 2 maintainer approvals
□ git-secrets or gitleaks: pre-commit hook blocks known secret patterns
```

### API Security

```
□ ALL routes: verify tenantId from JWT matches accessed resource tenantId
□ Tenant isolation test: use tenant B JWT to access tenant A resource → returns 403
□ Rate limiting on all auth endpoints (verified with burst test)
□ Body validation on every POST/PATCH/PUT — missing schema = PR rejected
□ File upload: size limit ≤ 5MB enforced at Fastify layer
□ No $queryRawUnsafe() anywhere in codebase
□ Refresh tokens stored hashed (bcrypt or argon2) — never raw JWT in DB
□ JWT_SECRET ≠ JWT_REFRESH_SECRET (different keys per token type)
□ All error responses: never expose stack traces or internal paths
```

### Mobile Security

```
□ MMKV initialized with encryptionKey (not plain MMKV constructor)
□ encryptionKey: derived from device keychain or build-time EAS secret (not hardcoded)
□ EXPO_PUBLIC_* vars: only non-sensitive config (API URL, feature flags)
□ Production APK inspection: unzip APK → find index.android.bundle →
  grep -i "secret\|password\|key\|token" → zero results
□ HTTPS only in production EXPO_PUBLIC_API_URL (not http://)
□ No internal API endpoints exposed via EXPO_PUBLIC_* (only public gateway URL)
```

### Open-Source Protections

```
□ SECURITY.md: disclosure email, PGP key (optional), response SLA, coordinated disclosure process
□ GitHub Private Vulnerability Reporting: enabled in repo settings
□ Fork PRs: cannot access GitHub Secrets (Actions permissions set to read-only for forks)
□ CODEOWNERS prevents direct CI workflow modification by non-maintainers
□ Incident containment runbook: docs/ops/INCIDENT_RESPONSE.md
□ Offboarding checklist includes: GitHub team removal, secret rotation, EAS token revoke
```

---

## 12. Observability Checklist

### Log Standards

```typescript
// Every API log line must contain:
{
  level: 'info' | 'warn' | 'error',
  time: string,          // ISO8601
  traceId: string,       // from x-trace-id header or generated per request
  tenantId: string,      // from JWT claim
  userId: string,        // from JWT claim
  action: string,        // 'invoice.create', 'payment.record', 'customer.update'
  durationMs?: number,   // on response logs
  status?: number,       // HTTP status on response logs
  error?: string,        // error.message only — no stack trace at info level
}

// NEVER include in any log:
// phone numbers, customer names, invoice line items, payment amounts
// JWT tokens, OTPs, passwords, refresh tokens
// Full request bodies or response bodies
```

### Required Prometheus Metrics

```
http_request_duration_seconds{method, route, status}    histogram — p50/p95/p99
http_requests_total{method, route, status}              counter
invoices_created_total{tenantId?, withGst}              counter
payments_recorded_total{method}                         counter
bullmq_job_duration_seconds{queue, jobName}             histogram
bullmq_jobs_completed_total{queue, jobName}             counter
bullmq_jobs_failed_total{queue, jobName}                counter
bullmq_queue_depth{queue}                               gauge
active_websocket_connections                            gauge
db_query_duration_seconds{model, operation}             histogram (Prisma extension)
```

### Alert Thresholds

```
Page immediately (PagerDuty P1 — any time of day):
  • API 5xx error rate > 5% for 2 minutes
  • API p99 latency > 5 seconds for 2 minutes
  • External uptime check: /health fails 3 consecutive times (60-second interval)
  • Mobile crash-free session rate < 99.5% (Sentry alert)
  • BullMQ queue depth > 1000 for 5 minutes (reminders backing up)

Alert during business hours (Slack notification P2):
  • API p99 latency > 2 seconds for 5 minutes
  • API 5xx error rate > 1% for 5 minutes
  • DB connection pool usage > 80%
  • Redis memory usage > 80%
  • Any job in dead letter queue (failed after all retries)
```

### Required Dashboards

```
Production overview dashboard (Grafana):
  □ API request rate by route (1h window)
  □ HTTP error rate % with 5xx breakdown
  □ p50/p95/p99 latency per route
  □ DB connection pool utilization
  □ Redis memory and hit rate
  □ BullMQ queue depth (all queues)
  □ Active WebSocket connections
  □ Invoices created per hour (business pulse)
  □ Payments recorded per hour (business pulse)
  □ Deploy annotations on all panels (vertical line at each deploy time)

Mobile dashboard (Sentry):
  □ Crash-free session rate (7-day trend)
  □ Error rate by screen
  □ Top 5 errors by frequency
  □ OTA update adoption rate
```

---

## 13. Open-Source Governance

### Required Repository Files

```
/
├── README.md               ← Project overview + features + quick start (< 5 min to running)
├── CONTRIBUTING.md         ← Setup + conventions + PR process + review SLA + test requirements
├── SECURITY.md             ← Vulnerability disclosure + contact email + response timeline
├── CHANGELOG.md            ← User-facing release notes per semver version
├── LICENSE                 ← MIT
└── .github/
    ├── CODEOWNERS          ← Per-directory ownership (see §18)
    ├── pull_request_template.md
    └── ISSUE_TEMPLATE/
        ├── bug_report.md
        ├── feature_request.md
        └── security.md     ← Redirects to SECURITY.md (do NOT file security bugs publicly)
```

### CODEOWNERS

```
# .github/CODEOWNERS

packages/shared/              @execora/shared-architecture
packages/types/               @execora/shared-architecture
packages/infrastructure/      @execora/backend @execora/devops
packages/modules/             @execora/backend

packages/api/                     @execora/backend
apps/worker/                  @execora/backend
apps/web/                     @execora/web
apps/mobile/                  @execora/mobile

prisma/                       @execora/backend @execora/devops
.github/workflows/            @execora/devops @execora/maintainers
eas.json                      @execora/mobile @execora/maintainers
docker-compose*.yml           @execora/devops
turbo.json                    @execora/devops

docs/                         @execora/maintainers
CHANGELOG.md                  @execora/maintainers
SECURITY.md                   @execora/maintainers
```

### PR Template

```markdown
<!-- .github/pull_request_template.md -->

## What changed
<!-- Describe what this PR adds, fixes, or removes. Be specific. -->

## Why
<!-- Link to issue or describe the user problem this solves. -->
<!-- Must map to a use case in docs/PRODUCT_REQUIREMENTS.md -->

## Type of change
- [ ] feat: New feature
- [ ] fix: Bug fix
- [ ] refactor: Refactor (no behavior change)
- [ ] chore: Dependencies, tooling, config
- [ ] docs: Documentation only

## How was this tested
- [ ] Unit tests added/updated
- [ ] Integration test added/updated
- [ ] Manual test on: [ ] Web [ ] Mobile emulator [ ] Physical device

## Checklist
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all green locally
- [ ] No `any` added to `packages/shared`
- [ ] No platform-specific code added to `packages/shared`
- [ ] No hardcoded URLs, secrets, or ports
- [ ] No `console.log` in production code
- [ ] Invoice status uses only: draft / pending / partial / paid / cancelled
- [ ] New API endpoint validated and uses correct tenantId filter
- [ ] Screenshots attached (for UI changes)
```

### Review SLA

```
Acknowledge PR:      Within 2 business days
Complete review:     Within 5 business days
Merge or close:      Within 10 business days

Expedited review (P0 bug fix):
  Acknowledge:       Within 4 hours
  Review + merge:    Within 24 hours
  Requires: label "P0" + tag a maintainer in Slack/Discord
```

---

## 14. Go / No-Go Release Gate

### Technical (Block Release on Any Failure)

```
□ CI green on release commit: lint + typecheck + test + build + audit
□ Staging deployment successful — all services healthy
□ Migration tested on staging with approximate production data volume
□ Rollback migration written and verified on staging
□ API backward compatibility: previous mobile client fixture requests all v1 endpoints → no 400/500
□ Tenant isolation: cross-tenant access test returns 403 (not 200 or 404)
□ Mobile: preview APK smoke test passed — physical device sign-off attached
□ Web: Lighthouse CI ≥ 80 on staging URL
□ Web bundle: main chunk < 500KB gzipped
□ Mobile APK: < 30MB
□ No pending high/critical CVEs (pnpm audit clean)
□ Zero secrets found in git diff of this release
```

### Operational (Block Release on Any Failure)

```
□ Production deployment checklist completed and signed by release owner
□ On-call rotation confirmed: primary + backup named for 48h post-release
□ Rollback procedure tested within last 90 days OR verified for this specific change
□ Grafana: baseline metrics captured pre-deploy (screenshot attached to release notes)
□ Mobile: EAS build profile verified → production profile → production API URL
□ Mobile: Play Store staged rollout set to 10% (if native changes included)
□ Mobile OTA channel correct (production channel for production users)
```

### Communication

```
□ CHANGELOG.md updated with user-facing release notes
□ Internal team notified of deployment window
□ Store release notes written in English and Hindi (mobile)
□ Status page updated if this is a major change
□ Rollback communication plan: who notifies users if rollback triggered
```

**Decision rule:** All boxes checked = GO. Any unchecked box = NO-GO. No exceptions. Named release owner signs off.

---

## 15. Top 20 Mistakes — Execora Specific

### 1. Platform import in `packages/shared`

**Why it happens:** "Just this once" convenience function added to shared
**Consequence:** `apps/web` Vite build fails — cannot resolve `react-native` module; or Metro fails — cannot resolve `window`
**Prevention:** ESLint `no-restricted-imports` in shared; CI enforces immediately

---

### 2. Duplicating `computeTotals` logic in a screen

**Why it happens:** Developer doesn't find the shared function; rewrites arithmetic
**Consequence:** Invoice totals different on web vs mobile; customer charged wrong amount; accounting discrepancy
**Prevention:** Code review: any arithmetic in a `.tsx` file is a red flag; always use `computeTotals` from `@execora/shared`

---

### 3. Using `'issued'` as invoice status

**Why it happens:** Old code used it; developer copies old pattern
**Consequence:** API route returns 400 validation error; invoice creation fails silently on mobile
**Prevention:** Only valid statuses: `draft | pending | partial | paid | cancelled` — documented here and in `MEMORY.md`; search-replace catches legacy usage

---

### 4. Hardcoding `http://10.0.2.2:3006` in mobile

**Why it happens:** Works for development; developer forgets to use `EXPO_PUBLIC_API_URL`
**Consequence:** Production app tries to reach Android emulator host; complete API outage for all mobile users
**Prevention:** `EXPO_PUBLIC_API_URL` required with no default fallback in production build; EAS build validates env per profile

---

### 5. Calling Prisma directly from a Fastify route

**Why it happens:** Faster; skips service layer; "it's just a simple query"
**Consequence:** Business logic scattered in HTTP handlers; impossible to unit test; no reuse across routes; `tenantId` filter forgotten
**Prevention:** `docs/AGENT_CODING_STANDARDS.md` Rule Zero enforced in code review; direct prisma import in route files = PR rejected

---

### 6. Missing `tenantId` in a database query

**Why it happens:** Copy-pasted query without WHERE clause; developer focuses on happy path
**Consequence:** Complete multi-tenant data breach; tenant A reads tenant B's customers and invoices
**Prevention:** All service functions accept `tenantId: string` as first parameter; query without `where: { tenantId }` = PR rejected

---

### 7. MMKV stored without encryption

**Why it happens:** `new MMKV()` default has no encryption; works correctly without it
**Consequence:** Rooted Android device extracts tokens and draft invoices; unauthorized access to all business data
**Prevention:** `new MMKV({ id: 'auth', encryptionKey: MMKV_ENCRYPTION_KEY })` — enforced by code review; pentest before first store release

---

### 8. Adding a required field to `CreateInvoicePayload` without mobile OTA

**Why it happens:** Backend adds required field; web updated same day; mobile not updated
**Consequence:** Mobile invoice creation returns 400 for ALL users until mobile update released; Play Store review = 3-7 days
**Prevention:** New required fields in payload must be: (a) optional with default in API, OR (b) trigger simultaneous mobile OTA update

---

### 9. `useQuery` with `staleTime: 0` on high-frequency component

**Why it happens:** Developer wants "always fresh" data; doesn't consider refetch frequency
**Consequence:** Dashboard mounted in many components → 20+ API calls per minute per user; Redis rate limiter triggers; API overloaded
**Prevention:** Dashboard queries: `staleTime: 60_000` minimum; invoice list: `staleTime: 30_000`; code review checks all new queries

---

### 10. Missing cache invalidation after mutation

**Why it happens:** Obvious to invalidate the list (`['invoices']`); easy to forget the detail (`['invoice', id]`)
**Consequence:** Invoice detail screen shows stale data after edit; user sees old total; re-opening screen fixes it (confusing)
**Prevention:** Every mutation invalidates: (list key) + (detail key) + (related parent key); template in §3

---

### 11. OTA update pushed to wrong EAS channel

**Why it happens:** Developer runs `eas update --channel preview` from memory; should be `--channel production`
**Consequence:** Production app gets staging JS pointing to staging API; data writes go to staging DB; silent data loss
**Prevention:** Release checklist verifies channel string before push; production releases from CI only (never from developer machine)

---

### 12. `any` cast in `packages/shared`

**Why it happens:** Quicker to cast than properly type; TypeScript pressure
**Consequence:** Shared contract loses type safety; consuming apps get `any` for that field; no autocomplete; bugs ship silently
**Prevention:** `@typescript-eslint/no-explicit-any: error` in shared ESLint config; CI fails immediately; zero exceptions

---

### 13. `generateInvoiceNo` called outside a transaction

**Why it happens:** Developer calls it before starting the invoice creation transaction
**Consequence:** Invoice numbers skip or duplicate under concurrent creation; accounting records corrupted
**Prevention:** `generateInvoiceNo` uses `$queryRaw` — must be called inside the same transaction as invoice creation; test with concurrent requests

---

### 14. New API endpoint not added to `packages/shared/src/api-client.ts`

**Why it happens:** Faster to add to web's `api.ts` only; mobile "can add it later"
**Consequence:** Duplicate fetch logic; different error handling, retry behavior, token refresh; inconsistency between platforms
**Prevention:** Endpoint goes to `packages/shared` FIRST; web and mobile import from shared; "later" never comes

---

### 15. Not testing on a physical Android device before release

**Why it happens:** Emulator is faster; physical device setup has friction
**Consequence:** GPU rendering bugs, storage permission edge cases, back gesture behavior, ANR timing, real keyboard input — all missed; crash reports from users post-release
**Prevention:** Physical device test matrix required in release checklist; sign-off by named tester required

---

### 16. `turbo.json` not updated when a new package is added

**Why it happens:** Developer creates `packages/new-thing/` without updating build orchestration
**Consequence:** Turbo cache doesn't include new package; CI builds stale version; deployed artifact missing new package output
**Prevention:** `turbo.json` update required in same PR as new package; CI verifies build output includes new package

---

### 17. `pnpm install` without `--frozen-lockfile` in CI

**Why it happens:** CI YAML copied from template without reading the flag
**Consequence:** CI resolves different minor/patch versions than developer machine; works locally, fails in production; unreproducible bugs
**Prevention:** Root `package.json` CI scripts always use `--frozen-lockfile`; any lockfile change requires deliberate developer commit

---

### 18. Changing `BillingDraft` shape in shared without handling old drafts in mobile

**Why it happens:** Developer renames a field in `BillingDraft` for cleanliness
**Consequence:** All users with MMKV-persisted drafts lose their in-progress invoices on app update; silent data loss
**Prevention:** `BillingDraft` changes require: version field increment + migration code in draft recovery logic; treat as breaking change

---

### 19. Worker job crashes silently

**Why it happens:** Developer uses `catch (e) { return; }` to prevent log noise
**Consequence:** Reminder job silently never runs; customer not notified; no retry; invisible in monitoring; discovered via user complaint
**Prevention:** Every catch block must: `logger.error({ jobId, queue, error: e.message, ...ctx }, 'Job failed')` then `throw e` for BullMQ retry

---

### 20. WebSocket `WSContext.tsx` not invalidating correct query keys on event

**Why it happens:** New API endpoint added; WS event added on backend; frontend handler not updated to invalidate new query key
**Consequence:** Real-time update fires; WebSocket message received; React Query cache not invalidated; stale data shown until manual refresh
**Prevention:** Any new WebSocket event type requires corresponding invalidation entry in `WSContext.tsx`; see §7 for complete event→key map; checked in code review

---

## 16. Weekly Release Process

```
MONDAY
────────────────────────────────────────────────────────────────
• Review all PRs merged since last release
• Classify open bugs: P0 (block release), P1 (fix this sprint), P2 (backlog)
• If P0 bug found: hotfix branch immediately → skip regular release flow
• Update ROADMAP if priorities changed
• Team sync: confirm what ships this week, who owns what

TUESDAY – THURSDAY
────────────────────────────────────────────────────────────────
• Feature development
• PR review target: acknowledge within 24h, review within 72h
• Staging: auto-deploys on every merge to main
• Database migrations: merge by Tuesday latest (3 days of staging soak time)
• Mobile: any native changes need EAS preview build by Wednesday

THURSDAY END OF DAY
────────────────────────────────────────────────────────────────
• Release candidate confirmed: list of PRs in this release
• Migration risk assessment: any long-running migrations in this release?
• Mobile preview build triggered: eas build --profile preview
• Preview APK distributed to internal testers via EAS
• Web: Lighthouse CI score checked on current staging

FRIDAY MORNING (deploy window: 09:00 – 13:00)
────────────────────────────────────────────────────────────────
• Pre-deploy: run Go/No-Go gate checklist (§14)
• 09:00 — Run migrations on staging (final verification)
• 09:15 — Promote web: staging → production
• 09:30 — Deploy API (rolling update, zero downtime)
• 09:45 — Mobile: eas update --channel production (JS-only OTA) OR submit to Play Store
• 10:00 — Watch Grafana dashboards: error rate, latency, queue depth
• 12:00 — If stable: advance Play Store staged rollout from 10% → 50%
• 12:30 — Confirm on-call names for weekend

FRIDAY AFTERNOON
────────────────────────────────────────────────────────────────
• CHANGELOG.md updated with user-facing release notes
• GitHub Release created with tag and release notes
• Retrospective: what slowed the release, what broke, what to improve
• Next week priorities confirmed
• Close shipped GitHub issues

WEEKEND
────────────────────────────────────────────────────────────────
• On-call: primary + backup named and reachable
• No planned deployments (except P0 hotfix with on-call approval)
• Monitor Sentry crash rate; advance Play Store staged rollout to 100% if stable
• Hotfix flow: branch from main → fix → fast-track PR review → deploy
```

---

## 17. PR Review Flow

```
STEP 1: AUTHOR — BEFORE OPENING PR
──────────────────────────────────────────────────────────────────
□ Self-review the full diff in GitHub before requesting review
□ All CI checks green locally before opening PR
□ PR template filled out completely
□ Title format: feat: / fix: / refactor: / chore: / docs:
□ Target size: < 400 lines changed; split large features into stacked PRs
□ Screenshots attached for any UI change (web AND mobile if both affected)

STEP 2: CODEOWNERS AUTO-ASSIGNED
──────────────────────────────────────────────────────────────────
GitHub auto-assigns based on .github/CODEOWNERS
Authors cannot self-merge
Assignment happens within 1 hour of PR open

STEP 3: FIRST REVIEWER (target: 2 business days)
──────────────────────────────────────────────────────────────────
Review focus by package:

  packages/shared:
    □ Zero platform-specific imports
    □ Zero 'any' in types or API client
    □ Backward compatible (no required field additions, no renames)
    □ New function has JSDoc with parameter descriptions
    □ New type has JSDoc explaining each field
    □ Test added for new business logic function

  packages/api:
    □ Layer separation: no business logic in route, no prisma in route
    □ tenantId filter on every query
    □ Body validation schema present on POST/PATCH/PUT
    □ Error response matches standard shape
    □ No sensitive data in log lines

  apps/web:
    □ Logic delegated to shared (no duplicated computeAmount, no inline total calc)
    □ Query keys follow convention (§3)
    □ Mutation invalidates all related query keys
    □ New page has error boundary
    □ No localStorage access outside AuthContext

  apps/mobile:
    □ Same query keys as web equivalent
    □ No platform-specific navigation cast errors
    □ MMKV access only through tokenStorage or storage.ts
    □ No hardcoded API URLs
    □ NativeWind classes instead of StyleSheet for consistency

STEP 4: SECOND REVIEWER (required for critical paths)
──────────────────────────────────────────────────────────────────
Required when PR touches ANY of:
  packages/shared (any change to public API)
  packages/db/schema.prisma
  Auth: JWT handling, OTP, token refresh, session management
  Payment recording or invoice creation
  .github/workflows/
  eas.json or Dockerfile

STEP 5: MERGE CRITERIA
──────────────────────────────────────────────────────────────────
□ All 5 CI checks green
□ Required approvals received (1 standard, 2 for critical paths)
□ All review threads resolved or marked "acknowledged"
□ No merge conflicts
□ Merge commit for features (preserves history, aids bisect)
□ Squash for chores/typos/docs (single clean commit)

STEP 6: POST-MERGE
──────────────────────────────────────────────────────────────────
□ Staging deploys automatically (verify within 10 minutes)
□ Author verifies key behavior on staging for any user-facing change
□ Author closes related GitHub issues
□ If shared package changed: notify mobile team in team channel
□ If API contract changed: notify web team in team channel
```

---

## 18. Ownership Model

```
┌────────────────────────┬────────────────────────────┬──────────────────────────┐
│ Package / App          │ Primary Owner              │ Secondary / Veto         │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ packages/shared        │ Shared-Architecture        │ ALL teams                │
│                        │ (types, API client,        │ (consuming teams have    │
│                        │  billing logic, constants) │  veto on interface       │
│                        │                            │  changes)                │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ packages/types         │ Shared-Architecture        │ Backend (JWT payload)    │
│                        │ (RBAC, permissions,        │ Web + Mobile (role       │
│                        │  UserJwtPayload)           │  rendering)              │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ packages/infrastructure│ Backend                    │ Platform-DevOps          │
│                        │ (prisma, logger, redis,    │ (infra config, Docker)   │
│                        │  queue, metrics, auth)     │                          │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ packages/modules       │ Backend                    │ Shared-Architecture      │
│                        │ (all business services)    │ (service interface       │
│                        │                            │  design review)          │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ packages/api               │ Backend                    │ Platform-DevOps          │
│                        │ (routes, middleware,       │ (deploy, Docker,         │
│                        │  WebSocket, auth)          │  load balancer)          │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ apps/worker            │ Backend                    │ Platform-DevOps          │
│                        │ (BullMQ processors,        │ (queue monitoring,       │
│                        │  job definitions)          │  Redis config)           │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ apps/web               │ Web Team                   │ Shared-Architecture      │
│                        │ (all web UI, routing,      │ (enforces correct use    │
│                        │  auth context, WS client)  │  of shared package)      │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ apps/mobile            │ Mobile Team                │ Shared-Architecture      │
│                        │ (Expo, React Native,       │ (enforces correct use    │
│                        │  EAS, navigation, MMKV)    │  of shared package)      │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ packages/db/schema.prisma   │ Backend                    │ Platform-DevOps          │
│                        │ (schema design,            │ (migration deployment,   │
│                        │  migration files)          │  rollback runbook)       │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ .github/workflows/     │ Platform-DevOps            │ Maintainers              │
│ docker-compose*.yml    │                            │ (security review of any  │
│ turbo.json             │                            │  CI change required)     │
├────────────────────────┼────────────────────────────┼──────────────────────────┤
│ docs/                  │ Maintainers                │ All teams                │
│ CHANGELOG.md           │ (governance, release       │ (own their domain        │
│ SECURITY.md            │  process, product docs)    │  documentation)          │
│ CONTRIBUTING.md        │                            │                          │
└────────────────────────┴────────────────────────────┴──────────────────────────┘

Escalation rules:
  Technical dispute (implementation):  Package primary owner decides
  Interface dispute (API contract):    Consuming team has veto; shared-arch has final say
  Release dispute:                     Named release owner for that version decides
  Security dispute:                    Platform-DevOps + 2 Maintainers jointly decide
  Bus factor rule:                     No single person is sole operator of any production step
  Documentation rule:                  Any decision not in writing did not happen
```

---

## 19. Appendices

### Appendix A: Critical P0 Gaps (Build These Next)

```
Priority  Feature                                 Affects
─────────────────────────────────────────────────────────────────
P0        Discount system                         web + mobile
          (item-level % + flat, bill-level % + flat)
          File: packages/shared/src/billing-logic.ts (already has discountPct/discountFlat)
          Gap: UI not connected in web ClassicBilling; mobile BillingScreen partial

P0        B2B invoice (buyer GSTIN + IGST)         web + mobile
          When buyer has GSTIN and supply is inter-state: IGST instead of CGST+SGST
          File: packages/shared/src/billing-logic.ts needs igst computation

P0        Partial payment at invoice creation      web + mobile
          "Customer paid ₹500, rest tomorrow" → partial status immediately
          File: CreateInvoicePayload already has initialPayment field (backend ready)
          Gap: UI not exposing it in web or mobile billing screen

P0        Mobile-responsive web layout             web
          Counter shop use = mobile browser; current UI assumes desktop

P0        Walk-in billing frictionless UX          web + mobile
          Name field optional; quick quantity-only entry; single-tap submit

P1        Inventory screen (mobile)                mobile
          Translate: apps/web/src/pages/Inventory.tsx → apps/mobile/src/screens/InventoryScreen.tsx

P1        Expenses screen (mobile)                 mobile
          Translate: apps/web/src/pages/Expenses.tsx → apps/mobile/src/screens/ExpensesScreen.tsx

P1        Reports with charts (mobile)             mobile
          Requires: victory-native or react-native-gifted-charts (add to mobile package.json)

P1        Voice commands UI (mobile)               mobile
          Backend (Mode 1 intent engine) ready; mobile needs WebSocket + recording UI

P2        Settings screen (mobile)                 mobile
          Translate: apps/web/src/pages/Settings.tsx → apps/mobile/src/screens/SettingsScreen.tsx

P2        Dark mode (mobile)                       mobile
          NativeWind already supports 'dark:' variant; need toggle + MMKV persistence
```

### Appendix B: Three Execution Modes

```
Mode 1 — Intent-Based Voice (BUILT):
  Flow: STT → LLM extracts JSON intent → switch(intent) → fixed handler
  File: packages/modules/src/modules/voice/engine/index.ts
  LLM is NOT in execution path after intent extraction
  Deterministic. Reliable. Limited to predefined intent set.

Mode 2 — Form/Dashboard UI (BUILT):
  Flow: React form/button → REST API → service → WebSocket broadcast
  No AI. Direct service calls. Full edit capability. Offline-ready.
  This is the primary path for web and mobile.

Mode 3 — True Agent Mode (PLANNED):
  Flow: STT → LLM with tool definitions → LLM chains tool calls → LLM response
  LLM decides what to do and in what order. Conditional logic. Error recovery.
  Two-agent pattern: Conversation Agent + Task Agent (Tool Executor)
  Design: docs/PRODUCT_REQUIREMENTS.md Section 6
  NOT YET BUILT.
```

### Appendix C: How to Add a New Mobile Screen (Step by Step)

```bash
# 1. Create the screen file
touch apps/mobile/src/screens/NewFeatureScreen.tsx

# 2. Add param type to navigation/index.tsx
# In the appropriate StackParams type:
export type SomeStackParams = {
  ExistingScreen: undefined;
  NewFeature: { id?: string };   # ← add this
};

# 3. Import and register in navigation/index.tsx
import { NewFeatureScreen } from '../screens/NewFeatureScreen';
# In the appropriate Navigator:
<SomeStack.Screen name="NewFeature" component={NewFeatureScreen} />

# 4. Navigate to it from an existing screen
navigation.navigate('NewFeature', { id: someId });
# Or from a different stack:
navigation.navigate('CustomersTab', { screen: 'NewFeature', params: { id } });

# 5. Read route params in the new screen
import { useRoute, RouteProp } from '@react-navigation/native';
import type { SomeStackParams } from '../navigation';
const route = useRoute<RouteProp<SomeStackParams, 'NewFeature'>>();
const { id } = route.params;

# 6. Use the typed navigation
import { useNavigation } from '@react-navigation/native';
const navigation = useNavigation<any>(); # typed any acceptable for now

# 7. Add to tab bar if it needs its own tab (optional)
# MainTabParams, Tab.Screen, TabIcon
```

### Appendix D: Tech Libraries Quick Reference

**Web (`apps/web`)**
```
React 18.3 + React Router 6.30   — UI + routing
Vite 5.4                          — build tool + dev server (HMR)
Tailwind CSS 3.4 + shadcn/ui      — styling + component library (Radix UI)
@tanstack/react-query 5.83        — data fetching + caching
Recharts 2.15                     — charts (BarChart, PieChart, LineChart)
React Hook Form 7.61 + Zod 3.25  — forms + validation
Lucide React                      — icons
Sonner                            — toast notifications
next-themes                       — dark mode
date-fns 3.6                      — date formatting
```

**Mobile (`apps/mobile`)**
```
React Native 0.76.6 + Expo 52.0           — mobile framework
@react-navigation/native-stack v7          — stack navigation
@react-navigation/bottom-tabs v7           — tab navigation
NativeWind 4.0                             — Tailwind CSS for React Native
@tanstack/react-query 5.40                 — data fetching + caching (same as web)
react-native-mmkv 3.0                      — fast encrypted storage
react-native-reanimated 3.16               — animations
react-native-safe-area-context 4.12        — safe area handling
react-native-gesture-handler 2.20          — gesture recognition
```

**Backend (`packages/api`, `apps/worker`, `packages/*`)**
```
Fastify 4.x                — HTTP server (type-safe routes)
Prisma 5.9                 — ORM + migrations
PostgreSQL 15              — primary database
BullMQ + ioredis           — job queue + Redis client
pino                       — structured JSON logging
prom-client                — Prometheus metrics
MinIO SDK                  — S3-compatible object storage
node:crypto (built-in)     — JWT (HS256, no external dep)
```

---

*Last updated: 2026-03-12*
*Update this document when: new package added, new screen added, shared API changes,
new security requirement identified, production incident reveals a gap.*
*This is a living contract — stale documentation is worse than no documentation.*
