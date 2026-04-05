# Domain: Platform

> Odoo equivalent: `addons/saas_*` + `addons/iap` + `website_sale` (plans, billing, feature gates)
>
> Owner squad: Platform + Admin + System Squad
>
> Status: Basic plan enforcement active — metering, subscription lifecycle, and multi-device sync pending

---

## Mission

Own the SaaS packaging layer: plan definitions, tenant entitlement resolution, feature gates, subscription lifecycle (upgrade / downgrade / cancel), usage metering, quota enforcement, and multi-device sync. Every domain reads entitlements from platform — never hardcodes plan logic.

---

## Products Enabled By This Domain

| Concern           | Details                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| All products      | All use `platform.feature-toggle` for feature gating                         |
| Plan enforcement  | `platform.subscription` and `platform.pricing` consumed by all billing flows |
| Usage metering    | `platform.usage` tracks invoices/month, users, storage                       |
| Multi-device sync | `platform.sync` drives offline-capable mobile clients                        |

---

## Sub-modules

```
platform/
  pricing/
    plans/               ← 6 plans: Free, Solo, Business, Pro, Scale, Enterprise
    limits/              ← per-plan limits: invoices, users, products, locations
    industry-packs/      ← FMCG, Pharma, Textiles, Electronics, Restaurant

  subscription/
    lifecycle/           ← activate, upgrade, downgrade, cancel, renew, trial
    billing-engine/      ← compute monthly/annual invoice for tenant
    grace-period/        ← 7-day grace before hard cutoff

  feature-toggle/
    entitlement-resolver/ ← resolve tenant features from plan + packs + custom grants
    gate/                ← runtime gate: checkFeature(tenantId, feature)
    manifest-validator/  ← validate module manifest against tenant entitlements

  usage/
    metering/            ← count invoices/month, users, storage used
    quotas/              ← enforce hard caps (quota breached = block or warn)
    dashboard/           ← show usage vs quota per tenant

  sync/
    multi-device/        ← WebSocket-based sync, conflict resolution, delta sync
    offline-queue/       ← hold mutations when offline, flush on reconnect
    device-registry/     ← track active devices per tenant
```

---

## Plan Definitions

```
┌────────────┬──────────────┬─────────────────────────────────────────────────────────┐
│ Plan        │ Price        │ Limits                                                  │
├────────────┼──────────────┼─────────────────────────────────────────────────────────┤
│ Free        │ ₹0           │ 50 inv/mo, 1 user, 100 products, 1 location, 0 GB      │
│ Solo        │ ₹299/mo      │ 500 inv/mo, 1 user, 500 products, 1 location, 1 GB     │
│ Business    │ ₹899/mo      │ 2,000 inv/mo, 3 users, 2,000 products, 2 loc, 5 GB     │
│ Pro         │ ₹1,999/mo    │ 10,000 inv/mo, 10 users, unlimited products, 5 loc, 20 GB │
│ Scale       │ ₹4,999/mo    │ unlimited inv, 25 users, unlimited, 20 loc, 100 GB     │
│ Enterprise  │ ₹custom      │ unlimited, unlimited, unlimited, unlimited, custom      │
└────────────┴──────────────┴─────────────────────────────────────────────────────────┘
```

---

## Industry Packs

| Pack                | Add-on Price | Unlocks                                         |
| ------------------- | ------------ | ----------------------------------------------- |
| FMCG & Distribution | ₹499/mo      | advanced stock, batch tracking, multi-godown    |
| Pharma & Medical    | ₹599/mo      | batch expiry, drug license, narcotics register  |
| Textiles & Apparel  | ₹499/mo      | size-colour matrix, length-weight UoM, job work |
| Electronics & EMS   | ₹499/mo      | serial number tracking, AMC, warranty           |
| Restaurant & Cafe   | ₹399/mo      | KOT, table mapping, recipe costing, delivery    |

---

## Usage Add-ons (over-quota purchases)

| Add-on                  | Price   |
| ----------------------- | ------- |
| Extra invoices (500/mo) | ₹149    |
| Extra user              | ₹199/mo |
| Extra location          | ₹299/mo |
| Extra storage (10 GB)   | ₹99/mo  |
| WhatsApp OTP (per 100)  | ₹49     |

---

## Entitlement Schema

```typescript
interface TenantEntitlements {
  plan: "free" | "solo" | "business" | "pro" | "scale" | "enterprise";
  industryPacks: string[]; // e.g. ['pharma', 'restaurant']

  limits: {
    invoicesPerMonth: number | null; // null = unlimited
    users: number | null;
    products: number | null;
    locations: number | null;
    storageGB: number | null;
  };

  features: {
    // Sales
    eInvoice: boolean; // Pro+
    eWayBill: boolean; // Pro+
    multiCurrency: boolean; // Scale+
    advancedPricing: boolean; // Business+
    // Inventory
    multiLocation: boolean; // Business+
    batchTracking: boolean; // FMCG pack
    serialTracking: boolean; // Electronics pack
    barcodeScanning: boolean; // Business+
    // Finance
    bankReconciliation: boolean; // Pro+
    expenseApprovals: boolean; // Scale+
    // Compliance
    gstrExport: boolean; // Solo+
    // Reporting
    scheduledReports: boolean; // Pro+
    customReports: boolean; // Scale+
    // Integrations
    whatsapp: boolean; // Solo+
    paymentGateway: boolean; // Business+
    ecommerce: boolean; // Pro+
    // OCR
    ocrDocuments: boolean; // Business+ with OCR pack
  };

  addOns: {
    extraInvoices: number; // additional invoices/month purchased
    extraUsers: number;
    extraLocations: number;
    extraStorageGB: number;
  };
}
```

---

## Entitlement Resolution Order

```
1. base plan limits and features
2. apply industry pack unlocks (additive)
3. apply purchased add-ons (increase limits)
4. apply custom enterprise grants (override anything)
```

---

## Events Produced

| Event                 | Trigger                                            | Consumers                              |
| --------------------- | -------------------------------------------------- | -------------------------------------- |
| `SubscriptionChanged` | plan activated, upgraded, downgraded, or cancelled | all domains (re-query entitlements)    |
| `QuotaExceeded`       | invoice/user/storage count reaches plan cap        | sales.invoicing (block or warn), admin |
| `TrialExpired`        | trial period ends without conversion               | admin, notifications                   |

## Events Consumed

| Event             | From  | Action                           |
| ----------------- | ----- | -------------------------------- |
| `InvoiceCreated`  | sales | increment invoices/month counter |
| `CustomerCreated` | crm   | increment contacts counter       |

---

## API Contracts

```
GET    /api/v1/platform/entitlements            getTenantEntitlements
GET    /api/v1/platform/usage                   getUsageSummary
GET    /api/v1/platform/features/:feature       checkFeature
POST   /api/v1/platform/subscription/upgrade    upgradePlan
POST   /api/v1/platform/subscription/cancel     cancelSubscription
GET    /api/v1/platform/plans                   listPlans
GET    /api/v1/platform/industry-packs          listIndustryPacks
POST   /admin/tenants/:id/grant                 adminGrantFeature (admin only)
POST   /admin/tenants/:id/override-plan         adminOverridePlan (admin only)
```

---

## Backend Package (target)

```
packages/platform/src/
├── entitlements.ts     ← getTenantEntitlements, checkFeature, resolveEntitlements
├── subscription.ts     ← activatePlan, upgradePlan, cancelPlan, getSubscription
├── usage.ts            ← incrementUsage, getUsageSummary, checkQuota
├── plans.ts            ← listPlans, getPlanLimits, getPlanFeatures
├── sync.ts             ← processOfflineQueue, broadcastSync, registerDevice
└── types.ts            ← TenantEntitlements, PlanId, Feature, UsageCounter
```

---

## Guardrails

- every feature gate call goes through `platform.feature-toggle.gate.checkFeature` — never inline plan checks in domain code
- quota enforcement on writes: `platform.usage.checkQuota` is called before invoice create, user create, etc.
- plan downgrades are non-destructive: data is retained, feature access is removed from gate — no data deletion
- trial conversion window: 14-day trial → no credit card required → auto-downgrade to Free if not converted
- custom enterprise grants are admin-only (x-admin-api-key) — cannot be set by tenant
- usage counters use atomic Redis increments — never read-modify-write patterns (race condition risk)

---

## Current Status

| Sub-module                 | Status                          |
| -------------------------- | ------------------------------- |
| Plan definitions           | ✅ active (in config)           |
| Feature gate (basic)       | ✅ active (`isFeatured` checks) |
| Entitlement resolver       | ⏳ partial (hardcoded checks)   |
| Usage metering             | ⏳ pending                      |
| Quota enforcement          | ⏳ pending                      |
| Subscription lifecycle API | ⏳ pending                      |
| Industry packs             | ⏳ pending                      |
| Usage add-ons              | ⏳ pending                      |
| Trial → convert flow       | ⏳ pending                      |
| Multi-device sync          | ⏳ pending                      |
| Offline queue              | ⏳ pending                      |
