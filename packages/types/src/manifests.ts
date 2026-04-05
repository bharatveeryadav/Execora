/**
 * @execora/types — Product manifests
 *
 * Each manifest declares the sub-domains, features, and navigation structure
 * for one of the 5 Execora software products.
 *
 * Rules (PRD Section 7):
 * - Manifests configure enablement only — no business logic
 * - Same manifest consumed by backend route guards, web UI, and mobile navigation
 * - Cross-cutting capabilities (e-invoice, OCR) are entitlement flags, not manifest flags
 * - Navigation items in manifests are identifiers — UI renders them per-platform
 *
 * Usage:
 *   import { PRODUCT_MANIFESTS } from '@execora/types';
 *   const posNav = PRODUCT_MANIFESTS.pos.navigation.mobile;
 */

import type { ProductId, SubDomainName } from "./domains";

// ── ProductManifest type ──────────────────────────────────────────────────────

export interface ProductManifest {
  product: ProductId;
  displayName: string;
  tagline: string;
  /** Sub-domains this product activates */
  domains: SubDomainName[];
  /** Feature identifiers enabled for this product — snake_case, stable names */
  features: string[];
  /** Navigation item identifiers per platform — rendered by each app's router */
  navigation: {
    web: string[];
    mobile: string[];
  };
}

// ── 5 Product Manifests ───────────────────────────────────────────────────────

export const PRODUCT_MANIFESTS: Record<ProductId, ProductManifest> = {
  billing: {
    product: "billing",
    displayName: "Billing Software",
    tagline:
      "Fast walk-in billing with GST, party pricing, and payment capture",
    domains: [
      "sales.billing",
      "sales.invoicing",
      "crm.parties",
      "inventory.stock",
      "finance.payments",
      "reporting.dashboard",
      "reporting.sales-reports",
    ],
    features: [
      "quick_sale_billing",
      "walk_in_billing",
      "party_billing",
      "party_pricing",
      "retail_wholesale_pricing",
      "discount_and_tax",
      "payment_capture",
      "payment_reminders",
      "invoice_templates",
      "whatsapp_share",
      "thermal_receipt",
    ],
    navigation: {
      web: ["new_bill", "parties", "payments", "reports"],
      mobile: ["billing_home", "new_bill", "parties", "ledger"],
    },
  },

  invoicing: {
    product: "invoicing",
    displayName: "Invoicing Software",
    tagline:
      "Complete GST invoicing with lifecycle, compliance, and receivables",
    domains: [
      "sales.invoicing",
      "sales.billing",
      "sales.returns",
      "crm.parties",
      "finance.payments",
      "compliance.gst",
      "reporting.sales-reports",
      "reporting.gst-reports",
    ],
    features: [
      "invoice_lifecycle",
      "invoice_numbering",
      "quotations",
      "proforma",
      "delivery_challan",
      "recurring_invoices",
      "credit_notes",
      "template_and_print_engine",
      "gst_compliant_output",
      "receivables_tracking",
      "einvoice_irn",
      "payment_status",
    ],
    navigation: {
      web: [
        "invoices",
        "quotations",
        "delivery_challans",
        "payments",
        "gst_reports",
      ],
      mobile: ["invoices_home", "new_invoice", "receivables", "reports"],
    },
  },

  pos: {
    product: "pos",
    displayName: "POS Software",
    tagline:
      "Fast counter checkout for retail and restaurant with offline confidence",
    domains: [
      "sales.pos",
      "sales.billing",
      "inventory.stock",
      "inventory.movement",
      "finance.payments",
      "reporting.dashboard",
    ],
    features: [
      "cart_checkout",
      "multi_counter",
      "quick_checkout",
      "single_screen_multi_payment",
      "thermal_receipt",
      "barcode_scan",
      "offline_checkout",
      "counter_sessions",
      "hardware_integration",
      "low_stock_alerts",
    ],
    navigation: {
      web: ["pos_terminal", "sales", "sessions", "reports"],
      mobile: ["pos_home", "cart", "receipts", "dashboard"],
    },
  },

  accounting: {
    product: "accounting",
    displayName: "Accounting Software",
    tagline:
      "Automated bookkeeping and GST reporting built from real transactions",
    domains: [
      "finance.accounting",
      "finance.payments",
      "finance.reconciliation",
      "finance.expenses",
      "finance.tax-ledger",
      "purchases.purchase",
      "purchases.vendors",
      "compliance.gst",
      "reporting.finance-reports",
      "reporting.gst-reports",
      "reporting.party-reports",
    ],
    features: [
      "bookkeeping_automation",
      "ledger",
      "journal",
      "chart_of_accounts",
      "trial_balance",
      "profit_loss",
      "balance_sheet",
      "cashbook",
      "daybook",
      "gst_reports",
      "bank_reconciliation",
      "expense_tracking",
      "purchase_bills",
      "vendor_payments",
    ],
    navigation: {
      web: ["ledger", "journals", "reports", "expenses", "gst_reports"],
      mobile: ["accounting_home", "ledger", "expenses", "reports"],
    },
  },

  inventory: {
    product: "inventory",
    displayName: "Inventory Software",
    tagline:
      "Complete stock control across locations with alerts, tracking, and valuation",
    domains: [
      "inventory.stock",
      "inventory.warehouse",
      "inventory.movement",
      "inventory.batch",
      "inventory.barcode",
      "inventory.alerts",
      "purchases.purchase",
      "reporting.inventory-reports",
    ],
    features: [
      "multi_location_stock",
      "stock_transfers",
      "batch_expiry_tracking",
      "serial_number_tracking",
      "barcode_label_printing",
      "barcode_scan",
      "low_stock_alerts",
      "overstock_alerts",
      "reorder_suggestions",
      "stock_valuation",
      "stock_ageing",
      "bulk_item_management",
      "purchase_order_integration",
    ],
    navigation: {
      web: ["items", "stock_levels", "transfers", "batch_tracking", "reports"],
      mobile: ["stock_home", "movements", "alerts", "reports"],
    },
  },
};
