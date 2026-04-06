/**
 * @execora/types — Domain registry
 *
 * Single source of truth for all domain vocabulary used across backend,
 * web (React/Vite), and mobile (Expo/React Native).
 *
 * Contents:
 *   - 11 top-level domain names (fixed by architecture)
 *   - Sub-domain capability paths (format: '<domain>.<sub>')
 *   - 5 product IDs
 *   - 6 plan tiers
 *   - 5 industry packs
 *   - Domain events (outbox / BullMQ job types)
 *   - Finite state machines: invoice, e-invoice, OCR ingest
 *   - Stock states, role hierarchy
 *
 * No runtime dependencies — plain value constants + derived TypeScript types only.
 * Safe to tree-shake in web (Vite) and mobile (Metro) bundles.
 */

// ── Top-level domains ─────────────────────────────────────────────────────────

export const DOMAINS = {
  SALES: "sales",
  INVENTORY: "inventory",
  FINANCE: "finance",
  PURCHASES: "purchases",
  CRM: "crm",
  COMPLIANCE: "compliance",
  REPORTING: "reporting",
  PLATFORM: "platform",
  ADMIN: "admin",
  INTEGRATIONS: "integrations",
  SYSTEM: "system",
} as const;

export type DomainName = (typeof DOMAINS)[keyof typeof DOMAINS];

// ── Sub-domain capability paths ───────────────────────────────────────────────
// Used in product manifests, route guards, and import-boundary rules.

export const SUBDOMAINS = {
  // Sales
  SALES_INVOICING: "sales.invoicing",
  SALES_POS: "sales.pos",
  SALES_BILLING: "sales.billing",
  SALES_RETURNS: "sales.returns",

  // Inventory
  INVENTORY_STOCK: "inventory.stock",
  INVENTORY_WAREHOUSE: "inventory.warehouse",
  INVENTORY_MOVEMENT: "inventory.movement",
  INVENTORY_BATCH: "inventory.batch",
  INVENTORY_BARCODE: "inventory.barcode",
  INVENTORY_ALERTS: "inventory.alerts",

  // Finance
  FINANCE_ACCOUNTING: "finance.accounting",
  FINANCE_PAYMENTS: "finance.payments",
  FINANCE_RECONCILIATION: "finance.reconciliation",
  FINANCE_EXPENSES: "finance.expenses",
  FINANCE_TAX_LEDGER: "finance.tax-ledger",

  // Purchases
  PURCHASES_PURCHASE: "purchases.purchase",
  PURCHASES_VENDORS: "purchases.vendors",
  PURCHASES_OCR: "purchases.ocr",

  // CRM
  CRM_PARTIES: "crm.parties",
  CRM_COMMUNICATION: "crm.communication",

  // Compliance
  COMPLIANCE_EINVOICING: "compliance.einvoicing",
  COMPLIANCE_EWAYBILL: "compliance.ewaybill",
  COMPLIANCE_GST: "compliance.gst",

  // Reporting
  REPORTING_SALES: "reporting.sales-reports",
  REPORTING_INVENTORY: "reporting.inventory-reports",
  REPORTING_FINANCE: "reporting.finance-reports",
  REPORTING_GST: "reporting.gst-reports",
  REPORTING_PARTY: "reporting.party-reports",
  REPORTING_DASHBOARD: "reporting.dashboard",

  // Platform
  PLATFORM_SUBSCRIPTION: "platform.subscription",
  PLATFORM_FEATURE_TOGGLE: "platform.feature-toggle",
  PLATFORM_USAGE: "platform.usage",
  PLATFORM_SYNC: "platform.sync",
} as const;

export type SubDomainName = (typeof SUBDOMAINS)[keyof typeof SUBDOMAINS];

// ── Products ──────────────────────────────────────────────────────────────────
// Five standalone software products composed from shared domains via manifest config.

export const PRODUCTS = {
  BILLING: "billing",
  INVOICING: "invoicing",
  POS: "pos",
  ACCOUNTING: "accounting",
  INVENTORY: "inventory",
} as const;

export type ProductId = (typeof PRODUCTS)[keyof typeof PRODUCTS];

// ── Plan tiers ────────────────────────────────────────────────────────────────

export const PLANS = {
  FREE: "free",
  SOLO: "solo",
  BUSINESS: "business",
  PRO: "pro",
  SCALE: "scale",
  ENTERPRISE: "enterprise",
} as const;

export type PlanId = (typeof PLANS)[keyof typeof PLANS];

/**
 * Ordered from lowest to highest tier.
 * Use PLAN_ORDER.indexOf() for range comparisons ("at least Business").
 */
export const PLAN_ORDER: PlanId[] = [
  "free",
  "solo",
  "business",
  "pro",
  "scale",
  "enterprise",
];

// ── Industry packs ────────────────────────────────────────────────────────────

export const INDUSTRY_PACKS = {
  PHARMACY: "pharmacy",
  GROCERY: "grocery",
  RESTAURANT: "restaurant",
  JEWELLERY: "jewellery",
  APPAREL: "apparel",
} as const;

export type IndustryPackId =
  (typeof INDUSTRY_PACKS)[keyof typeof INDUSTRY_PACKS];

// ── Domain events ─────────────────────────────────────────────────────────────
// Authoritative event names used by the outbox pattern and BullMQ job processors.
// All cross-domain reactions must go through these event contracts.

export const DOMAIN_EVENTS = {
  INVOICE_CREATED: "InvoiceCreated",
  INVOICE_CANCELLED: "InvoiceCancelled",
  EINVOICE_REQUESTED: "EInvoiceRequested",
  EINVOICE_ISSUED: "EInvoiceIssued",
  EINVOICE_CANCELLED: "EInvoiceCancelled",
  PAYMENT_RECORDED: "PaymentRecorded",
  STOCK_ADJUSTED: "StockAdjusted",
  STOCK_TRANSFERRED: "StockTransferred",
  PURCHASE_BILL_POSTED: "PurchaseBillPosted",
  OCR_DOCUMENT_UPLOADED: "OcrDocumentUploaded",
  OCR_EXTRACTION_COMPLETED: "OcrExtractionCompleted",
  REMINDER_SCHEDULED: "ReminderScheduled",
  GST_RETURN_GENERATED: "GstReturnGenerated",
  SUBSCRIPTION_CHANGED: "SubscriptionChanged",
  QUOTA_EXCEEDED: "QuotaExceeded",
} as const;

export type DomainEventName =
  (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

// ── Typed domain event envelope ───────────────────────────────────────────────
// Every event emitted via eventBus.emit() must conform to DomainEvent<T>.
// `metadata.eventGroupId` enables the outbox pattern: events are held in the
// BullMQ job until explicitly released (i.e. after the DB transaction commits).

export interface DomainEventMetadata {
  /** Module that produced the event: "invoicing" | "pos" | "ocr" | etc. */
  source: string;
  /** "created" | "confirmed" | "cancelled" | "recorded" | "adjusted" | etc. */
  action: string;
  /** ISO timestamp when the event was emitted. */
  timestamp: string;
  /**
   * Outbox group identifier. When set, the BullMQ job carrying this event will
   * not be processed until releaseGroupedEvents(eventGroupId) is called —
   * ensuring side-effects only run after the DB transaction commits.
   */
  eventGroupId?: string;
}

export interface DomainEvent<T = unknown> {
  name: DomainEventName;
  data: T & { tenantId: string };
  metadata: DomainEventMetadata;
}

// ── Per-event payload types ───────────────────────────────────────────────────

export interface InvoiceCreatedPayload {
  tenantId: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  total: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export interface InvoiceCancelledPayload {
  tenantId: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface PaymentRecordedPayload {
  tenantId: string;
  paymentId: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  amount: number;
  method: string;
}

export interface StockAdjustedPayload {
  tenantId: string;
  productId: string;
  productName: string;
  delta: number; // positive = in, negative = out
  reason: string;
  locationId?: string;
}

export interface PurchaseBillPostedPayload {
  tenantId: string;
  purchaseId: string;
  vendorId?: string;
  items: Array<{ productId: string; quantity: number; cost: number }>;
  totalAmount: number;
}

export interface OcrDocumentUploadedPayload {
  tenantId: string;
  jobId: string;
  fileName: string;
  fileUrl: string;
}

export interface OcrExtractionCompletedPayload {
  tenantId: string;
  jobId: string;
  extractedData: Record<string, unknown>;
  confidence: number;
}

export interface EInvoiceRequestedPayload {
  tenantId: string;
  invoiceId: string;
  invoiceNo: string;
}

export interface EInvoiceIssuedPayload {
  tenantId: string;
  invoiceId: string;
  invoiceNo: string;
  irn: string;
  qrCode: string;
}

/** Maps each event name to its strongly-typed payload. */
export interface DomainEventPayloadMap {
  InvoiceCreated: InvoiceCreatedPayload;
  InvoiceCancelled: InvoiceCancelledPayload;
  PaymentRecorded: PaymentRecordedPayload;
  StockAdjusted: StockAdjustedPayload;
  StockTransferred: StockAdjustedPayload;
  PurchaseBillPosted: PurchaseBillPostedPayload;
  OcrDocumentUploaded: OcrDocumentUploadedPayload;
  OcrExtractionCompleted: OcrExtractionCompletedPayload;
  EInvoiceRequested: EInvoiceRequestedPayload;
  EInvoiceIssued: EInvoiceIssuedPayload;
  EInvoiceCancelled: {
    tenantId: string;
    invoiceId: string;
    invoiceNo: string;
    irn: string;
  };
  ReminderScheduled: {
    tenantId: string;
    reminderId: string;
    customerId: string;
    scheduledAt: string;
  };
  GstReturnGenerated: {
    tenantId: string;
    period: string;
    type: string;
    fileUrl: string;
  };
  SubscriptionChanged: {
    tenantId: string;
    planId: string;
    previousPlanId: string;
  };
  QuotaExceeded: {
    tenantId: string;
    resource: string;
    limit: number;
    current: number;
  };
}

// ── Invoice finite state machine ──────────────────────────────────────────────
// Valid transitions: draft → pending → partial | paid | cancelled

export const INVOICE_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  PARTIAL: "partial",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type InvoiceStatusValue =
  (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

// ── E-invoice finite state machine ────────────────────────────────────────────
// Separate from commercial invoice status per PRD Section 13.

export const EINVOICE_STATUS = {
  NOT_APPLICABLE: "not_applicable",
  PENDING: "pending",
  SUBMITTED: "submitted",
  IRN_ISSUED: "irn_issued",
  CANCELLED: "cancelled",
} as const;

export type EInvoiceStatusValue =
  (typeof EINVOICE_STATUS)[keyof typeof EINVOICE_STATUS];

// ── OCR pipeline stages ───────────────────────────────────────────────────────
// uploaded → extracting → extracted → reviewing → posting → posted | failed

export const OCR_STAGE = {
  UPLOADED: "uploaded",
  EXTRACTING: "extracting",
  EXTRACTED: "extracted",
  REVIEWING: "reviewing",
  POSTING: "posting",
  POSTED: "posted",
  FAILED: "failed",
} as const;

export type OcrStageValue = (typeof OCR_STAGE)[keyof typeof OCR_STAGE];

// ── Stock states ──────────────────────────────────────────────────────────────

export const STOCK_STATE = {
  ON_HAND: "on_hand",
  RESERVED: "reserved",
  AVAILABLE: "available",
  INCOMING: "incoming",
} as const;

export type StockStateValue = (typeof STOCK_STATE)[keyof typeof STOCK_STATE];

// ── Role hierarchy ────────────────────────────────────────────────────────────
// owner > admin > manager > staff > viewer

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
  VIEWER: "viewer",
} as const;

export type RoleId = (typeof ROLES)[keyof typeof ROLES];

/**
 * Ordered from lowest to highest permission level.
 * ROLE_ORDER.indexOf('admin') > ROLE_ORDER.indexOf('staff')
 */
export const ROLE_ORDER: RoleId[] = [
  "viewer",
  "staff",
  "manager",
  "admin",
  "owner",
];
