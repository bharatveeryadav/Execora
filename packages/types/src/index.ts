// Intent types
export enum IntentType {
  CREATE_INVOICE = "CREATE_INVOICE",
  CREATE_REMINDER = "CREATE_REMINDER",
  RECORD_PAYMENT = "RECORD_PAYMENT",
  ADD_CREDIT = "ADD_CREDIT",
  CHECK_BALANCE = "CHECK_BALANCE",
  CHECK_STOCK = "CHECK_STOCK",
  CANCEL_INVOICE = "CANCEL_INVOICE",
  CANCEL_REMINDER = "CANCEL_REMINDER",
  LIST_REMINDERS = "LIST_REMINDERS",
  CREATE_CUSTOMER = "CREATE_CUSTOMER",
  MODIFY_REMINDER = "MODIFY_REMINDER",
  DAILY_SUMMARY = "DAILY_SUMMARY",
  START_RECORDING = "START_RECORDING",
  STOP_RECORDING = "STOP_RECORDING",
  UPDATE_CUSTOMER_PHONE = "UPDATE_CUSTOMER_PHONE",
  UPDATE_CUSTOMER = "UPDATE_CUSTOMER",
  GET_CUSTOMER_INFO = "GET_CUSTOMER_INFO",
  DELETE_CUSTOMER_DATA = "DELETE_CUSTOMER_DATA",
  SWITCH_LANGUAGE = "SWITCH_LANGUAGE",
  UNKNOWN = "UNKNOWN",
  LIST_CUSTOMER_BALANCES = "LIST_CUSTOMER_BALANCES",
  TOTAL_PENDING_AMOUNT = "TOTAL_PENDING_AMOUNT",
  PROVIDE_EMAIL = "PROVIDE_EMAIL",
  SEND_INVOICE = "SEND_INVOICE", // User explicitly directs where to send: "email X" / "WhatsApp Y"
  CONFIRM_INVOICE = "CONFIRM_INVOICE",
  SHOW_PENDING_INVOICE = "SHOW_PENDING_INVOICE",
  TOGGLE_GST = "TOGGLE_GST",
  ADD_DISCOUNT = "ADD_DISCOUNT", // "10% discount karo" / "200 rupay kam karo"
  SET_SUPPLY_TYPE = "SET_SUPPLY_TYPE", // "inter-state bill" / "IGST lagao"
  RECORD_MIXED_PAYMENT = "RECORD_MIXED_PAYMENT", // "500 cash + 300 UPI"
  EXPORT_GSTR1 = "EXPORT_GSTR1", // "GSTR-1 nikalo", "GST report bhejo"
  EXPORT_PNL = "EXPORT_PNL", // "P&L report bhejo", "is mahine ka P&L"
  UPDATE_STOCK = "UPDATE_STOCK", // "50 kg aata aaya" — inbound stock receipt
}

// Intent extraction response
export interface IntentExtraction {
  intent: IntentType;
  entities: Record<string, any>;
  confidence: number;
  originalText: string;
  normalizedText?: string;
  conversationSessionId?: string;
  adminEmail?: string;
  operatorId?: string;
  operatorRole?: "admin" | "user";
}

// Customer search result
export interface CustomerSearchResult {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  nickname?: string | null;
  landmark?: string | null;
  balance: number;
  matchScore: number;
  tags?: string[] | null;
  notes?: string | null;
  gstin?: string | null;
  creditLimit?: number | null;
  /** B2B recipient address fields (for invoice preview) */
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

// Invoice item
export interface InvoiceItemInput {
  productName: string;
  quantity: number;
  /** Override product catalog price (₹). When provided, used instead of product.price in DB. */
  unitPrice?: number;
  /** Per-line discount percentage (0–100). Applied to this line only before GST calculation. */
  lineDiscountPercent?: number;
}

// ── Feature flags — data-driven per-tenant capability gating ─────────────────
//
// Tier mapping (see docs/PRODUCT_STRATEGY_2026.md Section 3):
//   Free    — VOICE_BILLING (rate-limited), WALK_IN_BILLING, UDHAAR_TRACKING, WHATSAPP_REMINDERS (5/mo)
//   Starter — + GSTR1_EXPORT, EMAIL_DELIVERY, UNLIMITED_VOICE (2 users)
//   Business — + BATCH_EXPIRY, PNL_REPORTS, BARCODE_SCAN, OCR_PURCHASE_BILL, CREDIT_LIMITS (5 users)
//   Enterprise — + E_INVOICING, E_WAY_BILL, MULTI_BRANCH, BANK_RECONCILIATION, API_ACCESS
export enum FeatureFlag {
  // Always-on core (no gating needed)
  WALK_IN_BILLING       = "walk_in_billing",
  UDHAAR_TRACKING       = "udhaar_tracking",

  // Starter+
  GSTR1_EXPORT          = "gstr1_export",
  EMAIL_DELIVERY        = "email_delivery",
  UNLIMITED_VOICE       = "unlimited_voice",    // Free = 50/mo cap; Starter+ = unlimited

  // Business+
  BATCH_EXPIRY          = "batch_expiry",
  PNL_REPORTS           = "pnl_reports",
  BARCODE_SCAN          = "barcode_scan",
  OCR_PURCHASE_BILL     = "ocr_purchase_bill",
  CREDIT_LIMITS         = "credit_limits",
  MULTI_USER            = "multi_user",         // Free = 1; Starter = 2; Business = 5; Enterprise = unlimited

  // Enterprise
  E_INVOICING           = "e_invoicing",
  E_WAY_BILL            = "e_way_bill",
  MULTI_BRANCH          = "multi_branch",
  BANK_RECONCILIATION   = "bank_reconciliation",
  API_ACCESS            = "api_access",
  CA_PARTNER_MODE       = "ca_partner_mode",
}

// Tier → feature set (used to seed tenant.features on plan change)
export const TIER_FEATURES: Record<"free" | "starter" | "business" | "enterprise", FeatureFlag[]> = {
  free: [
    FeatureFlag.WALK_IN_BILLING,
    FeatureFlag.UDHAAR_TRACKING,
  ],
  starter: [
    FeatureFlag.WALK_IN_BILLING,
    FeatureFlag.UDHAAR_TRACKING,
    FeatureFlag.GSTR1_EXPORT,
    FeatureFlag.EMAIL_DELIVERY,
    FeatureFlag.UNLIMITED_VOICE,
  ],
  business: [
    FeatureFlag.WALK_IN_BILLING,
    FeatureFlag.UDHAAR_TRACKING,
    FeatureFlag.GSTR1_EXPORT,
    FeatureFlag.EMAIL_DELIVERY,
    FeatureFlag.UNLIMITED_VOICE,
    FeatureFlag.BATCH_EXPIRY,
    FeatureFlag.PNL_REPORTS,
    FeatureFlag.BARCODE_SCAN,
    FeatureFlag.OCR_PURCHASE_BILL,
    FeatureFlag.CREDIT_LIMITS,
    FeatureFlag.MULTI_USER,
  ],
  enterprise: [
    FeatureFlag.WALK_IN_BILLING,
    FeatureFlag.UDHAAR_TRACKING,
    FeatureFlag.GSTR1_EXPORT,
    FeatureFlag.EMAIL_DELIVERY,
    FeatureFlag.UNLIMITED_VOICE,
    FeatureFlag.BATCH_EXPIRY,
    FeatureFlag.PNL_REPORTS,
    FeatureFlag.BARCODE_SCAN,
    FeatureFlag.OCR_PURCHASE_BILL,
    FeatureFlag.CREDIT_LIMITS,
    FeatureFlag.MULTI_USER,
    FeatureFlag.E_INVOICING,
    FeatureFlag.E_WAY_BILL,
    FeatureFlag.MULTI_BRANCH,
    FeatureFlag.BANK_RECONCILIATION,
    FeatureFlag.API_ACCESS,
    FeatureFlag.CA_PARTNER_MODE,
  ],
};

// Business execution result
export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// WebSocket message types
export enum WSMessageType {
  VOICE_START = "voice:start",
  VOICE_STARTED = "voice:started",
  VOICE_TRANSCRIPT = "voice:transcript",
  VOICE_INTENT = "voice:intent",
  VOICE_RESPONSE = "voice:response",
  VOICE_TTS_STREAM = "voice:tts-stream",
  VOICE_END = "voice:end",
  VOICE_STOPPED = "voice:stopped",
  ERROR = "error",
  RECORDING_STARTED = "recording:started",
  RECORDING_STOPPED = "recording:stopped",
  TASK_QUEUED = "task:queued",
  TASK_STARTED = "task:started",
  TASK_COMPLETED = "task:completed",
  TASK_FAILED = "task:failed",
  TASK_CANCELLED = "task:cancelled",
  TASK_STATUS = "task:status",
  QUEUE_STATUS = "queue:status",
  // Pending invoice drafts — real-time list broadcast to all frontend sessions
  PENDING_INVOICES_UPDATE = "pending:invoices_update",
}

export interface WSMessage {
  type: WSMessageType | string;
  data?: any;
  timestamp: string;
}

// Reminder job data
export interface ReminderJobData {
  reminderId: string;
  customerId: string;
  customerName: string;
  phone: string;
  amount: number;
  message: string;
}

// WhatsApp message job data
export interface WhatsAppJobData {
  reminderId?: string;
  phone: string;
  message: string;
  messageType: "text" | "template";
}

// Date/time parsing result
export interface ParsedDateTime {
  date: Date;
  description: string;
}

// =============================================================================
// RBAC — Permissions, roles, and tenant feature flags
// =============================================================================

/**
 * Granular permission strings used in user.permissions[].
 * Owners have all by default; other roles get a subset (see ROLE_DEFAULT_PERMISSIONS).
 */
export const Permission = {
  // Customers
  CUSTOMERS_READ: "customers:read",
  CUSTOMERS_CREATE: "customers:create",
  CUSTOMERS_UPDATE: "customers:update",
  CUSTOMERS_DELETE: "customers:delete",
  // Invoices
  INVOICES_READ: "invoices:read",
  INVOICES_CREATE: "invoices:create",
  INVOICES_CANCEL: "invoices:cancel",
  // Products
  PRODUCTS_READ: "products:read",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_UPDATE: "products:update",
  // Payments
  PAYMENTS_READ: "payments:read",
  PAYMENTS_CREATE: "payments:create",
  // Reminders
  REMINDERS_READ: "reminders:read",
  REMINDERS_CREATE: "reminders:create",
  REMINDERS_CANCEL: "reminders:cancel",
  // Reports
  REPORTS_READ: "reports:read",
  // Voice
  VOICE_USE: "voice:use",
  // Settings
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
  // User management (owner only by default)
  USERS_READ: "users:read",
  USERS_MANAGE: "users:manage",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

/** Default permission set assigned to each role at user creation. */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  owner: Object.values(Permission) as PermissionKey[],
  admin: [
    Permission.CUSTOMERS_READ,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_UPDATE,
    Permission.CUSTOMERS_DELETE,
    Permission.INVOICES_READ,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_CANCEL,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_UPDATE,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_CREATE,
    Permission.REMINDERS_READ,
    Permission.REMINDERS_CREATE,
    Permission.REMINDERS_CANCEL,
    Permission.REPORTS_READ,
    Permission.VOICE_USE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.USERS_READ,
  ],
  manager: [
    Permission.CUSTOMERS_READ,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_UPDATE,
    Permission.INVOICES_READ,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_CANCEL,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_UPDATE,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_CREATE,
    Permission.REMINDERS_READ,
    Permission.REMINDERS_CREATE,
    Permission.REMINDERS_CANCEL,
    Permission.REPORTS_READ,
    Permission.VOICE_USE,
    Permission.SETTINGS_READ,
    Permission.USERS_READ,
  ],
  staff: [
    Permission.CUSTOMERS_READ,
    Permission.CUSTOMERS_CREATE,
    Permission.INVOICES_READ,
    Permission.INVOICES_CREATE,
    Permission.PRODUCTS_READ,
    Permission.PAYMENTS_CREATE,
    Permission.REMINDERS_READ,
    Permission.VOICE_USE,
  ],
  viewer: [
    Permission.CUSTOMERS_READ,
    Permission.INVOICES_READ,
    Permission.PRODUCTS_READ,
    Permission.REPORTS_READ,
  ],
};

/**
 * Features available per subscription plan.
 * The Tenant.features JSON is the authoritative source at runtime
 * (platform admin can override per tenant). This map is the default.
 */
export const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "inventory",
    "customer_credit",
    "reports",
    "whatsapp",
    "voice_recording",
  ],
  pro: [
    "inventory",
    "customer_credit",
    "reports",
    "whatsapp",
    "voice_recording",
    "batch_tracking",
    "advanced_reminders",
    "email",
    "gst_enabled",
    "loyalty",
  ],
  enterprise: [
    "inventory",
    "customer_credit",
    "reports",
    "whatsapp",
    "voice_recording",
    "batch_tracking",
    "advanced_reminders",
    "email",
    "gst_enabled",
    "loyalty",
    "gst_filing",
    "variants",
    "multi_conversation",
    "customer_documents",
    "conversation_queue",
    "sms",
  ],
};

/** Payload embedded in signed JWT access/refresh tokens. */
export interface UserJwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  /** 'access' tokens expire in minutes; 'refresh' tokens expire in days. */
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}
