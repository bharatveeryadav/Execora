# Execora Architecture Alignment Analysis

## Executive Summary

**Current State**: Mobile ✅ (feature-based), Web ⚠️ (page-based), Backend ✅ (route-separated modules), Packages 🟡 (partial domain organization)

**Proposal Assessment**: Your proposed architecture aligns well with current mobile structure. Key gap: **Web app needs migration to feature-based organization.**

---

## 1. CURRENT ARCHITECTURE INVENTORY

### Mobile App (`apps/mobile/src/`) ✅ **FULLY ALIGNED**

```
features/
├── accounting/          ← Domain
│   ├── screens/         ← Domain screens
│   ├── components/      ← Domain components
│   ├── api/             ← Domain API client
│   ├── hooks/           ← Domain hooks (cashbook, summary, reports)
│   ├── types/           ← Domain types
│   └── index.ts         ← Barrel export
│
├── auth/
├── billing/             ← Largest: InvoiceForm, templates, 3-step wizard
├── customers/
├── dashboard/
├── expenses/
├── products/
├── settings/
└── sync/                ← Offline/WebSocket
```

**Feature Structure (per feature):**
```
<feature>/
├── screens/
│   ├── <Feature>Screen.tsx    (e.g., BillingScreen)
│   ├── <Feature>DetailScreen.tsx
│   └── ...
├── components/
│   ├── <Feature>Form.tsx
│   ├── <Feature>Table.tsx
│   └── ...
├── hooks/
│   ├── use<Feature>.ts
│   └── use<Feature>Queries.ts
├── api/
│   ├── <feature>Api.ts       (REST client)
│   └── <feature>ExtApi.ts    (extended endpoints)
├── types/
│   └── index.ts              (TS interfaces)
├── lib/
│   └── utils.ts              (helpers)
├── __tests__/                (minimal, needs expansion)
└── index.ts                  (barrel export)
```

**Current Features (9 total):**
| Feature | Screens | Status | API Integration | Notes |
|---------|---------|--------|-----------------|-------|
| **accounting** | CashBook, DayBook, Reports, BalanceSheet, BankRecon, Gstr3b | ✅ Complete | ✅ All APIs wired | `cashbookApi`, `reportsApi` |
| **auth** | Login, Signup, ForgotPassword, OTP | ✅ Complete | ✅ Full OAuth/JWT | Token refresh, auto-login |
| **billing** | BillingScreen (wizard), Invoice{List,Detail}, CreditNotes | ✅ Complete | ✅ Full CRUD | 2023 lines (needs refactor) |
| **customers** | Customers, CustomerDetail, Parties, Payment, Overdue | ✅ Complete | ⚠️ Partial | Missing: reminders API, comm prefs API |
| **dashboard** | KPI cards, quick actions, low stock, recent invoices | ✅ Complete | ✅ Query-based | 2213 lines (needs refactor) |
| **expenses** | Expenses, Import | ✅ Complete | ✅ Full CRUD | Import via CSV |
| **products** | Inventory (list, search, stock adjust), barcode | ✅ Complete | ✅ Full CRUD | `productApi` |
| **settings** | Company Profile, Document Settings, Recurring (placeholder), Import | ⚠️ Partial | ⚠️ Partial | CompanyProfile ✅, DocumentSettings MMKV-only, Recurring 🔲 |
| **sync** | Offline queue, WebSocket, VoiceScreen | ✅ Complete | ✅ Real-time | `useWsInvalidation` |

---

### Web App (`apps/web/src/pages/`) ⚠️ **NOT ALIGNED** — Needs Migration

**Current (Flat Pages):**
```
pages/
├── Index.tsx
├── LoginPage.tsx
├── Invoices.tsx
├── InvoiceDetail.tsx
├── InvoicePortal.tsx
├── Purchases.tsx
├── PurchaseOrders.tsx
├── Customers.tsx
├── CustomerDetail.tsx
├── Parties.tsx
├── Inventory.tsx
├── Expenses.tsx
├── CashBook.tsx
├── DayBook.tsx
├── BalanceSheet.tsx
├── BankReconciliation.tsx
├── Gstr3b.tsx
├── Reports.tsx
├── EInvoicing.tsx
├── CreditNotes.tsx
├── RecurringBilling.tsx
├── ImportData.tsx
├── etc... (33 total)
```

**Problem**:
- No domain grouping → Hard to locate related features
- Scales poorly as features grow
- Mobile and web code can't share folder structure conventions
- New developer onboarding: "where does X belong?"

**Proposed Target (Feature-Based):**
```
features/
├── sales/
│   ├── invoice/
│   │   ├── components/   (InvoiceForm, InvoiceTable, InvoicePreview)
│   │   ├── hooks/        (useInvoice, useInvoiceQueries)
│   │   ├── services/     (invoice.api.ts)
│   │   ├── types.ts
│   │   ├── pages/        (InvoiceListPage, InvoiceDetailPage)
│   │   └── index.ts
│   ├── pos/
│   ├── returns/
│   └── index.ts
│
├── purchases/
│   ├── purchase/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── pages/
│   ├── ocr/             (new UX for bill scanning)
│   └── index.ts
│
├── inventory/
│   ├── components/
│   ├── services/
│   └── pages/
│
├── finance/
│   ├── accounting/      (CashBook, DayBook, BalanceSheet, BankRecon, GSTR)
│   ├── expenses/
│   └── index.ts
│
├── compliance/
│   ├── einvoicing/      (GST invoice generation)
│   └── index.ts
│
├── crm/
│   └── parties/         (Customers, Vendors)
│
├── admin/
│   ├── users/
│   └── roles/
│
├── company/
├── notifications/
├── reports/
└── settings/
```

---

### Backend (`apps/api/src/api/routes/`) ✅ **ALIGNED**

**Domain-separated routes (already implemented):**
```
routes/
├── admin.routes.ts              (users, roles, permissions)
├── auth.routes.ts               (login, signup, JWT)
├── customer.routes.ts           (parties/customers CRUD)
├── supplier.routes.ts           (vendors/suppliers CRUD)
├── product.routes.ts            (inventory CRUD)
├── invoice.routes.ts            (sales invoice CRUD)
├── credit-note.routes.ts        (credit notes)
├── purchase-order.routes.ts    (PO CRUD)
├── expense.routes.ts            (expense tracking)
├── ledger.routes.ts             (account ledger)
├── summary.routes.ts            (daily/range summaries)
├── report.routes.ts             (P&L, GSTR, etc.)
├── monitoring.routes.ts         (KPI endpoints)
├── reminder.routes.ts           (customer reminders)
├── feedback.routes.ts           (NPS/feedback)
├── push.routes.ts               (push notifications)
├── ai.routes.ts                 (voice, LLM)
├── draft.routes.ts              (draft invoices)
├── webhook.routes.ts            (external integrations)
└── session.routes.ts            (session mgmt)
```

**Business Logic Separation:**
```
packages/modules/src/modules/
├── customer/                    (customer service, reminders)
├── invoice/                     (invoice lifecycle)
├── product/                     (inventory, stock)
├── ledger/                      (accounting)
├── gst/                         (GSTR, E-invoice)
├── voice/                       (STT→JSON→handler)
├── monitoring/                  (KPI calculations)
├── ai/                          (LLM chains)
└── reminder/                    (scheduled jobs)
```

---

### Shared Packages ✅ **ALIGNED**

```
packages/
├── types/           ← All TypeScript interfaces (User, Invoice, Customer, Product, etc.)
├── infrastructure/  ← Fastify setup, Prisma ORM, Redis, BullMQ, logger, metrics
├── modules/         ← Business logic (not UI-specific)
└── shared/          ← Utilities, API clients, hooks (if React-specific)
```

---

## 2. COMPARISON: PROPOSED vs. ACTUAL

| Layer | Proposed | Actual | Status | Gap |
|-------|----------|--------|--------|-----|
| **Mobile features** | 9+ domain-based | 9 domain-based ✅ | ✅ Match | None |
| **Mobile feature structure** | feature/{components,hooks,services} | feature/{screens,components,hooks,api} | ✅ Close match | Naming: `api` vs `services` (minor) |
| **Web features** | 9+ domain-based (proposed) | 33 flat pages | ❌ Mismatch | **Web needs refactor** |
| **Web feature structure** | feature/{components,hooks,services,pages} | (none yet) | ❌ Missing | Feature-based structure doesn't exist |
| **Backend routes** | Domain-separated modules | 22 domain routes ✅ | ✅ Match | None |
| **Backend business logic** | modules/ | packages/modules/ ✅ | ✅ Match | None |

---

## 3. DETAILED ALIGNMENT FINDINGS

### ✅ Mobile App is ALREADY Aligned

Your proposed mobile structure **matches** what's implemented:

```diff
Proposed:
  features/billing/
    ├── components/InvoiceForm.tsx
    ├── components/InvoiceTable.tsx
    ├── hooks/useInvoice.ts
    ├── services/invoice.api.ts
    └── types.ts

Actual:
  features/billing/
    ├── components/InvoiceForm/*
    ├── components/InvoiceTemplatePreview.tsx
    ├── hooks/useBillingForm.ts
    ├── hooks/useInvoiceQueries.ts
    ├── api/billingApi.ts          ← "services" = "api" (same concept)
    ├── api/billingExtApi.ts
    └── types/
```

**Verdict**: Mobile architecture is production-ready. Mobile is your reference point.

---

### ⚠️ Web App is NOT Aligned — Needs Feature-Based Migration

**Current Problem:**
- 33 individual page files in flat `pages/` directory
- No domain grouping → cognitive load ↑
- Can't share patterns with mobile team
- Hard to maintain as features grow

**Migration Path:**
```
Phase 1: Create feature structure (don't delete old pages yet)
  apps/web/src/features/
  ├── sales/invoice/
  ├── purchases/purchase/
  ├── finance/accounting/
  └── ...

Phase 2: Migrate pages to features
  (move InvoiceDetail.tsx → features/sales/invoice/pages/Detail.tsx)
  (move CashBook.tsx → features/finance/accounting/pages/CashBook.tsx)

Phase 3: Extract domain logic
  (move InvoiceForm component to features/sales/invoice/components/)
  (create features/sales/invoice/hooks/useInvoice.ts)

Phase 4: Update route mapping
  (route /billing → features/billing/pages/InvoiceList)
```

---

### ✅ Backend is Already Domain-Organized

Routes are separated by domain → mirrors what mobile/web features map to.

**Alignment Map (Mobile Feature ↔ Backend Route):**
```
Mobile                Backend
──────────────────────────────────
billing/          ↔   invoice.routes.ts
                      credit-note.routes.ts
                      draft.routes.ts

customers/        ↔   customer.routes.ts
                      reminder.routes.ts

products/         ↔   product.routes.ts

accounting/       ↔   ledger.routes.ts
                      summary.routes.ts
                      report.routes.ts
                      monitoring.routes.ts

expenses/         ↔   expense.routes.ts

auth/             ↔   auth.routes.ts
                      session.routes.ts

settings/         ↔   admin.routes.ts
                      user.routes.ts

compliance/       ↔   gst.routes.ts
                      webhook.routes.ts (e-invoice)
```

---

## 4. NAMING CONVENTIONS

### Current (Working Well)

**Mobile:**
```ts
// Feature-scoped API client
packages/modules/src/modules/invoice/
  ├── services/invoiceService.ts      (business logic)
  └── ...

apps/mobile/src/features/billing/
  ├── api/billingApi.ts               (REST endpoint wrappers)
  ├── api/billingExtApi.ts            (extended endpoints)
  ├── hooks/useBillingForm.ts
  ├── hooks/useInvoiceQueries.ts
  ├── screens/BillingScreen.tsx
  └── types/index.ts
```

**Backend:**
```ts
routes/invoice.routes.ts              (REST endpoints)
modules/invoice/                       (business logic)
```

**Key Insight:** 
- `api/` (mobile) = `routes/` (backend) = REST endpoints
- `hooks/` (mobile) = `services/` (packages/modules) = business logic
- `components/` (mobile) = `components/` (web) = UI

### Recommendation

Align naming across mobile and web:

```ts
// Mobile: CURRENT (good)
features/billing/
  ├── api/           ← REST client
  └── hooks/         ← State + business logic

// Web: PROPOSE THIS
features/billing/
  ├── services/      ← REST client (same as mobile, just different term)
  └── hooks/         ← State + business logic
```

**Why NOT rename mobile's `api/` to `services/`?**
- Mobile team is happy with `api/` (explicit about HTTP)
- Renaming adds churn
- Terminology difference is acceptable (both mean "where I talk to the backend")

---

## 5. TERMINOLOGY MAPPING

### Accounting Feature (Your Example)

**What exists (Mobile):**
```
features/accounting/
├── screens/
│   ├── CashbookScreen.tsx       ← Central ledger by account
│   ├── DayBookScreen.tsx        ← Daily txn journal
│   ├── BalanceSheetScreen.tsx   ← Assets/Liab/Equity
│   ├── BankReconScreen.tsx      ← Bank statement match
│   ├── GstrScreen.tsx           ← GST return prep
│   └── ReportsScreen.tsx        ← P&L, ratios
│
├── components/
│   ├── CashbookTable.tsx        ← Ledger table UI
│   ├── BankReconCard.tsx
│   └── ReportChart.tsx
│
├── api/
│   └── accountingApi.ts         ← All API calls:
│       ├── cashbookApi.get()
│       ├── summaryApi.daily()
│       ├── summaryApi.range()
│       ├── reportsApi.gstr1()
│       ├── reportsApi.pnl()
│       └── ...
│
├── hooks/
│   └── (none)                   ← Missing! Should have:
│                                   - useAccountingQueries()
│                                   - useCashbookData()
│
└── types/
    └── (none)                   ← Should export:
                                   - Invoice, Customer, Product types
```

**What should exist (aligned with proposal):**
```
features/finance/accounting/
├── screens/
│   ├── CashbookScreen.tsx       ← Renamed from "accounting/"
│   ├── DayBookScreen.tsx
│   ├── BalanceSheetScreen.tsx
│   ├── BankReconScreen.tsx
│   └── GstrScreen.tsx
│
├── components/
│   ├── LedgerTable.tsx          ← Reusable ledger display
│   ├── BankReconCard.tsx
│   └── ReportChart.tsx
│
├── services/                    ← OR keep as "api/"
│   └── accounting.api.ts        ← Renamed from accountingApi
│       ├── getCashbook()
│       ├── getDailyBudget()
│       ├── getGSTR1()
│       └── getPandL()
│
├── hooks/
│   ├── useAccountingQueries.ts  ← NEW: Aggregate queries
│   └── useLedger.ts
│
└── types.ts
    ├── LedgerEntry
    ├── BankRecon
    └── TaxReport
```

**What terminology means what:**
- **Cashbook** = Account ledger (list of txns per account over time)
- **Daybook** = Daily journal (all txns in order by date)
- **BalanceSheet** = Point-in-time account snapshot (Assets = Liab + Equity)
- **BankRecon** = Match bank statement to GL (reconcile cleared vs pending)
- **GSTR** = GST return (Input/Output on invoices, net payable)

---

## 6. IMPLEMENTATION PRIORITIES

### Phase 1: Validate Mobile (Current Sprint)
- [ ] Verify all 9 features follow `{screens, components, hooks, api, types}` pattern
- [ ] Add missing hooks (e.g., `useAccountingQueries`)
- [ ] Document feature structure for new developers
- [ ] Add test files to all critical features

### Phase 2: Implement Missing Mobile APIs (Next 2 Sprints)
- [ ] Implement `useReminders` hook (CustomerDetailScreen TODO)
- [ ] Wire communication preferences API
- [ ] Complete DocumentSettingsScreen API integration
- [ ] Build RecurringScreen business flow

### Phase 3: Refactor Web to Features (2-3 Sprints)
**Target**: Migrate web from flat `pages/` to feature-based structure

**Steps:**
1. Create `apps/web/src/features/` directory
2. Mirror mobile's 9 features:
   - `sales/invoice/`, `sales/pos/` (from `Invoices.tsx`, `Billing*.tsx`)
   - `purchases/` (from `Purchases.tsx`, `PurchaseOrders.tsx`)
   - `finance/accounting/` (from `CashBook.tsx`, `DayBook.tsx`, etc.)
   - `finance/expenses/` (from `Expenses.tsx`)
   - `inventory/` (from `Inventory.tsx`)
   - `crm/parties/` (from `Customers.tsx`, `Parties.tsx`)
   - `compliance/einvoicing/` (from `EInvoicing.tsx`)
   - `admin/settings/` (from `Settings.tsx`)
   - `auth/` (from `LoginPage.tsx`)

3. Extract shared hooks/components to `apps/web/src/hooks/` and `apps/web/src/components/`
4. Migrate routes to feature-based imports

### Phase 4: Align Shared Code (Parallel)
- [ ] Move domain-agnostic utils to `packages/shared/`
- [ ] Share API clients across mobile/web (both import from `packages/types`)
- [ ] Create `packages/api-client` for common fetch logic

---

## 7. GAPS & RECOMMENDATIONS

| Gap | Severity | Current | Recommendation |
|-----|----------|---------|-----------------|
| Web not feature-based | 🔴 HIGH | pages/ (flat) | Migrate to features/ (phase 3) |
| Missing mobile hooks | 🟡 MEDIUM | useInvoiceQueries only | Add useAccountingQueries, useCustomerQueries, etc. |
| No shared API types | 🟡 MEDIUM | Each app duplicates | Move Invoice, Customer, Product to packages/types |
| Mobile oversized screens | 🟡 MEDIUM | 2200+ line screens | Refactor: Dashboard→subcomponents, BillingScreen→steps |
| Minimal test coverage | 🔴 HIGH | 2 test files total | Add tests to critical feature hooks |
| Stale documentation | 🟡 MEDIUM | docs/ out of sync | Update docs/mobile/MASTER.md with feature structure |
| Settings APIs incomplete | 🟡 MEDIUM | MMKV-only | Wire DocumentSettings, Recurring to backend |
| No OCR module (web) | 🟡 MEDIUM | ImportScreen (mobile) | Build OCR feature for expenses (web) |

---

## 8. SHARED CODE STRUCTURE (Recommended)

```
packages/
├── types/
│   ├── user.ts
│   ├── invoice.ts        ← Share Invoice between mobile + web
│   ├── customer.ts
│   ├── product.ts
│   └── index.ts
│
├── api-client/           ← NEW: Shared HTTP client
│   ├── invoiceApi.ts     ← Both mobile + web import this
│   ├── customerApi.ts
│   └── productApi.ts
│
├── shared/               ← Already exists
│   ├── hooks/
│   │   ├── useWS.ts      (mobile + web both use)
│   │   └── useOffline.ts
│   └── utils/
│
└── infrastructure/
    └── (backend only)
```

---

## 9. FINAL VERDICT

| Component | Alignment | Grade | Action |
|-----------|-----------|-------|--------|
| **Mobile Architecture** | Feature-based ✅ | A+ | Maintain + enhance hooks |
| **Web Architecture** | Page-based ❌ | D | Refactor to features (priority) |
| **Backend Architecture** | Domain routes ✅ | A | Maintain |
| **Shared Packages** | Partial 🟡 | B | Consolidate API clients |
| **Overall System** | 70% aligned | C+ | Execute Phase 2 & 3 to reach A |

---

## 10. NEXT IMMEDIATE ACTIONS

**For Mobile (This Week):**
1. Implement missing hooks in accounting feature
2. Wire customer reminders API
3. Add test infrastructure (`jest` + `@testing-library/react-native`)

**For Web (Next 2 Weeks):**
1. Plan feature-based migration (create structure)
2. Start with `features/sales/invoice/`
3. Migrate 5 pages → feature components

**For Shared (Parallel):**
1. Move duplicate types to `packages/types`
2. Consider `packages/api-client` for shared REST wrappers

---

**Questions for Alignment?** Refer to `CLAUDE.md` (backend import rules), mobile feature examples, or this doc.
