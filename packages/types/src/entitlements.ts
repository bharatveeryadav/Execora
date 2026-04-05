/**
 * @execora/types — Tenant entitlement model
 *
 * TenantEntitlements is the single resolved capability object read by:
 * - backend route guards (apps/api, apps/worker)
 * - web UI conditionals (apps/web)
 * - mobile navigation and feature gates (apps/mobile)
 *
 * Resolution order (backend — see packages/infrastructure/resolve-entitlements.ts):
 *   1. Read planId from subscription record
 *   2. Merge add-on overrides (extra users, counters, packs)
 *   3. Apply active promotional overrides (time-boxed, auditable)
 *   4. Return TenantEntitlements
 *   5. Cache per tenant per session; invalidate on SubscriptionChanged event
 *
 * On client (web/mobile):
 *   - Fetch once at session start via /api/v1/tenant/entitlements
 *   - Store in React context / Zustand store
 *   - Check synchronously using helpers in @execora/shared
 */

import type { PlanId, ProductId, IndustryPackId } from "./domains";
import { PLAN_ORDER } from "./domains";

// ── TenantEntitlements ────────────────────────────────────────────────────────

export interface TenantEntitlements {
  planId: PlanId;

  /** Max number of business profiles allowed under this subscription */
  businesses: number;
  /** Max number of user accounts */
  users: number;
  /** CA/accountant seats (view-only access to accounting module) */
  caUsers: number;
  /** POS counter slots — 0 means POS not included */
  counters: number;

  /** Which of the 5 products are enabled for this tenant */
  products: Record<ProductId, boolean>;

  /** Industry packs unlocked (per-business enablement, checked at API boundary) */
  industryPacks: Record<IndustryPackId, boolean>;

  /** Usage limits — 'unlimited' means no cap enforced */
  limits: {
    documentsPerMonth: number | "unlimited";
    ocrDocumentsPerMonth: number;
    messagingCredits: number;
    storageGB: number;
    auditRetentionYears: number;
    automationJobsPerMonth: number | "unlimited";
    eInvoicePerMonth: number | "unlimited";
  };

  /** Named boolean feature gates — checked at route and UI boundaries */
  features: {
    // Compliance
    eInvoice: boolean;
    eWayBill: boolean;
    // Inventory
    multiGodown: boolean;
    batchExpiry: boolean;
    barcodeScan: boolean;
    // Finance
    bankReconciliation: boolean;
    // Billing / Invoicing
    recurringBilling: boolean;
    creditLimits: boolean;
    gstr1Export: boolean;
    // Reporting
    pnlReports: boolean;
    customReports: boolean;
    // Purchases
    ocrPurchaseBill: boolean;
    // Communication
    emailDelivery: boolean;
    // Automation
    approvalChains: boolean;
    // Platform / Enterprise
    sso: boolean;
    whiteLabel: boolean;
    apiAccess: boolean;
    multiUser: boolean;
    caPartnerMode: boolean;

    // AI
    aiAssistant: boolean;
    voiceAssistant: boolean;
    aiDocumentExtraction: boolean;
    aiAutofill: boolean;
    aiInsights: boolean;
  };

  /** Support tier and response SLA */
  support: {
    tier: "email" | "chat" | "priority" | "phone" | "dedicated";
    responseSLAHours: number | "custom";
  };

  /** Active add-on identifiers (extra counters, packs, usage credits, etc.) */
  addOns: string[];
}

// ── Plan definitions ──────────────────────────────────────────────────────────

export interface PlanDefinition {
  id: PlanId;
  displayName: string;
  /** Monthly price in INR, or 'custom' for enterprise */
  priceMonthly: number | "custom";
  /** Annual price in INR (saves ~17%), or 'custom' for enterprise */
  priceAnnual: number | "custom";
  /** Default entitlements granted by this plan (before add-on merges) */
  entitlements: Omit<TenantEntitlements, "planId" | "addOns" | "industryPacks">;
}

const _base_features = {
  eInvoice: false,
  eWayBill: false,
  multiGodown: false,
  batchExpiry: false,
  barcodeScan: false,
  bankReconciliation: false,
  recurringBilling: false,
  creditLimits: false,
  gstr1Export: false,
  pnlReports: false,
  customReports: false,
  ocrPurchaseBill: false,
  emailDelivery: false,
  approvalChains: false,
  sso: false,
  whiteLabel: false,
  apiAccess: false,
  multiUser: false,
  caPartnerMode: false,
  aiAssistant: false,
  voiceAssistant: false,
  aiDocumentExtraction: false,
  aiAutofill: false,
  aiInsights: false,
} as const satisfies TenantEntitlements["features"];

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    displayName: "Execora Free",
    priceMonthly: 0,
    priceAnnual: 0,
    entitlements: {
      businesses: 1,
      users: 1,
      caUsers: 0,
      counters: 0,
      products: {
        billing: true,
        invoicing: false,
        pos: false,
        accounting: false,
        inventory: false,
      },
      limits: {
        documentsPerMonth: 50,
        ocrDocumentsPerMonth: 0,
        messagingCredits: 0,
        storageGB: 1,
        auditRetentionYears: 1,
        automationJobsPerMonth: 0,
        eInvoicePerMonth: 0,
      },
      features: { ..._base_features },
      support: { tier: "email", responseSLAHours: 72 },
    },
  },

  solo: {
    id: "solo",
    displayName: "Execora Solo",
    priceMonthly: 999,
    priceAnnual: 9999,
    entitlements: {
      businesses: 1,
      users: 2,
      caUsers: 1,
      counters: 0,
      products: {
        billing: true,
        invoicing: true,
        pos: false,
        accounting: false,
        inventory: true,
      },
      limits: {
        documentsPerMonth: "unlimited",
        ocrDocumentsPerMonth: 0,
        messagingCredits: 300,
        storageGB: 5,
        auditRetentionYears: 1,
        automationJobsPerMonth: 0,
        eInvoicePerMonth: 0,
      },
      features: {
        ..._base_features,
        gstr1Export: true,
        emailDelivery: true,
        barcodeScan: true,
        multiUser: true,
      },
      support: { tier: "email", responseSLAHours: 48 },
    },
  },

  business: {
    id: "business",
    displayName: "Execora Business",
    priceMonthly: 2499,
    priceAnnual: 24999,
    entitlements: {
      businesses: 3,
      users: 5,
      caUsers: 1,
      counters: 0,
      products: {
        billing: true,
        invoicing: true,
        pos: false,
        accounting: true,
        inventory: true,
      },
      limits: {
        documentsPerMonth: "unlimited",
        ocrDocumentsPerMonth: 50,
        messagingCredits: 1000,
        storageGB: 15,
        auditRetentionYears: 2,
        automationJobsPerMonth: "unlimited",
        eInvoicePerMonth: 100,
      },
      features: {
        ..._base_features,
        gstr1Export: true,
        emailDelivery: true,
        barcodeScan: true,
        multiUser: true,
        batchExpiry: true,
        pnlReports: true,
        ocrPurchaseBill: true,
        creditLimits: true,
        aiDocumentExtraction: true,
      },
      support: { tier: "chat", responseSLAHours: 24 },
    },
  },

  pro: {
    id: "pro",
    displayName: "Execora Pro",
    priceMonthly: 4999,
    priceAnnual: 49999,
    entitlements: {
      businesses: 10,
      users: 15,
      caUsers: 2,
      counters: 3,
      products: {
        billing: true,
        invoicing: true,
        pos: true,
        accounting: true,
        inventory: true,
      },
      limits: {
        documentsPerMonth: "unlimited",
        ocrDocumentsPerMonth: 200,
        messagingCredits: 3000,
        storageGB: 50,
        auditRetentionYears: 3,
        automationJobsPerMonth: "unlimited",
        eInvoicePerMonth: "unlimited",
      },
      features: {
        ..._base_features,
        gstr1Export: true,
        emailDelivery: true,
        barcodeScan: true,
        multiUser: true,
        batchExpiry: true,
        pnlReports: true,
        ocrPurchaseBill: true,
        creditLimits: true,
        eInvoice: true,
        eWayBill: true,
        multiGodown: true,
        recurringBilling: true,
        bankReconciliation: true,
        caPartnerMode: true,
        aiAssistant: true,
        voiceAssistant: true,
        aiDocumentExtraction: true,
        aiAutofill: true,
      },
      support: { tier: "priority", responseSLAHours: 4 },
    },
  },

  scale: {
    id: "scale",
    displayName: "Execora Scale",
    priceMonthly: 8999,
    priceAnnual: 89999,
    entitlements: {
      businesses: 25,
      users: 40,
      caUsers: 3,
      counters: 10,
      products: {
        billing: true,
        invoicing: true,
        pos: true,
        accounting: true,
        inventory: true,
      },
      limits: {
        documentsPerMonth: "unlimited",
        ocrDocumentsPerMonth: 500,
        messagingCredits: 8000,
        storageGB: 200,
        auditRetentionYears: 7,
        automationJobsPerMonth: "unlimited",
        eInvoicePerMonth: "unlimited",
      },
      features: {
        ..._base_features,
        gstr1Export: true,
        emailDelivery: true,
        barcodeScan: true,
        multiUser: true,
        batchExpiry: true,
        pnlReports: true,
        ocrPurchaseBill: true,
        creditLimits: true,
        eInvoice: true,
        eWayBill: true,
        multiGodown: true,
        recurringBilling: true,
        bankReconciliation: true,
        caPartnerMode: true,
        customReports: true,
        approvalChains: true,
        apiAccess: true,
        aiAssistant: true,
        voiceAssistant: true,
        aiDocumentExtraction: true,
        aiAutofill: true,
        aiInsights: true,
      },
      support: { tier: "phone", responseSLAHours: 8 },
    },
  },

  enterprise: {
    id: "enterprise",
    displayName: "Execora Enterprise",
    priceMonthly: "custom",
    priceAnnual: "custom",
    entitlements: {
      businesses: 9999,
      users: 9999,
      caUsers: 999,
      counters: 9999,
      products: {
        billing: true,
        invoicing: true,
        pos: true,
        accounting: true,
        inventory: true,
      },
      limits: {
        documentsPerMonth: "unlimited",
        ocrDocumentsPerMonth: 9999,
        messagingCredits: 9999999,
        storageGB: 9999,
        auditRetentionYears: 10,
        automationJobsPerMonth: "unlimited",
        eInvoicePerMonth: "unlimited",
      },
      features: {
        gstr1Export: true,
        emailDelivery: true,
        barcodeScan: true,
        multiUser: true,
        batchExpiry: true,
        pnlReports: true,
        ocrPurchaseBill: true,
        creditLimits: true,
        eInvoice: true,
        eWayBill: true,
        multiGodown: true,
        recurringBilling: true,
        bankReconciliation: true,
        caPartnerMode: true,
        customReports: true,
        approvalChains: true,
        apiAccess: true,
        sso: true,
        whiteLabel: true,
        aiAssistant: true,
        voiceAssistant: true,
        aiDocumentExtraction: true,
        aiAutofill: true,
        aiInsights: true,
      },
      support: { tier: "dedicated", responseSLAHours: "custom" },
    },
  },
};

// ── Legacy DB plan bridge ─────────────────────────────────────────────────────
// Maps current 3-tier Prisma enum to new 6-tier PlanId.
// When the DB schema is migrated to 6 tiers, this becomes an identity map.

export const LEGACY_PLAN_MAP: Record<string, PlanId> = {
  free: "free",
  pro: "pro",
  enterprise: "enterprise",
  // Forward-compatible entries (already valid after schema migration)
  solo: "solo",
  business: "business",
  scale: "scale",
};

// ── Plan rank helper (usable without importing PLAN_ORDER) ────────────────────

export function getPlanRank(planId: PlanId): number {
  return PLAN_ORDER.indexOf(planId);
}
