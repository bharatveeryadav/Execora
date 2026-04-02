import { Ionicons } from "@expo/vector-icons";
import type { InvoicesStackParams, DocumentType } from "../../../navigation";

export type BillingDocShortcut = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  documentType: DocumentType;
  color: string;
  bgColor: string;
};

export type BillingMenuItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: "screen" | "comingSoon";
  screen?: keyof InvoicesStackParams;
  params?: Record<string, unknown>;
  title?: string;
};

export const BILLING_DOC_SHORTCUTS: BillingDocShortcut[] = [
  {
    id: "invoice",
    icon: "receipt-outline",
    label: "Tax Invoice",
    documentType: "invoice",
    color: "#e67e22",
    bgColor: "#fff7ed",
  },
  {
    id: "quotation",
    icon: "document-text-outline",
    label: "Quotation",
    documentType: "quotation",
    color: "#3b82f6",
    bgColor: "#eff6ff",
  },
  {
    id: "proforma",
    icon: "clipboard-outline",
    label: "Proforma",
    documentType: "proforma",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
  },
  {
    id: "sales_order",
    icon: "bag-outline",
    label: "Sales Order",
    documentType: "sales_order",
    color: "#10b981",
    bgColor: "#ecfdf5",
  },
  {
    id: "delivery_challan",
    icon: "car-outline",
    label: "Challan",
    documentType: "delivery_challan",
    color: "#0891b2",
    bgColor: "#ecfeff",
  },
  {
    id: "bill_of_supply",
    icon: "document-outline",
    label: "Bill of Supply",
    documentType: "bill_of_supply",
    color: "#64748b",
    bgColor: "#f8fafc",
  },
];

export const BILLING_MENU_ITEMS: BillingMenuItem[] = [
  {
    id: "expenses",
    icon: "cart-outline",
    label: "Expenses",
    action: "screen",
    screen: "Expenses",
  },
  {
    id: "purchases",
    icon: "cube-outline",
    label: "Purchase Order",
    action: "screen",
    screen: "Purchases",
  },
  {
    id: "eway",
    icon: "car-outline",
    label: "E-Way Bills",
    action: "screen",
    screen: "EInvoicing",
    params: { title: "E-Way Bills" },
  },
  {
    id: "payment",
    icon: "wallet-outline",
    label: "Payments Received",
    action: "screen",
    screen: "Payment",
  },
  {
    id: "credit",
    icon: "receipt-outline",
    label: "Credit Notes",
    action: "screen",
    screen: "CreditNotes",
  },
  {
    id: "debit",
    icon: "document-outline",
    label: "Debit Notes",
    action: "comingSoon",
    title: "Debit Notes",
  },
];
