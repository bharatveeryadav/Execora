/**
 * InvoiceHeaderBar — glanceable invoice metadata strip.
 *
 * Shows invoice prefix/number, document type badge, document date,
 * and computed due date in a single compact card. Tapping opens the
 * invoice-bar edit modal (passed as `onEdit`).
 *
 * Replaces the old "Invoice # | Doc Date | Due Date [✏]" section
 * that was inlined inside BillingScreen.
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocumentType =
  | "invoice"
  | "quotation"
  | "proforma"
  | "sales_order"
  | "delivery_challan"
  | "bill_of_supply"
  | "pos_sale";

interface InvoiceHeaderBarProps {
  /** E.g. "INV-" */
  prefix: string;
  /** Draft counter label; pass "-DRAFT" or a real number string */
  counter: string;
  documentType: DocumentType;
  /** ISO date string, e.g. "2026-03-31" */
  documentDate: string;
  /** ISO date string (computed), or "" if no due date */
  dueDate: string;
  onEdit: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_META: Record<
  DocumentType,
  { label: string; color: string; bg: string; icon: string }
> = {
  invoice: {
    label: "Invoice",
    color: "#e67e22",
    bg: "#fff7ed",
    icon: "receipt-outline",
  },
  quotation: {
    label: "Quotation",
    color: "#3b82f6",
    bg: "#eff6ff",
    icon: "document-text-outline",
  },
  proforma: {
    label: "Proforma",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    icon: "clipboard-outline",
  },
  sales_order: {
    label: "Sales Order",
    color: "#10b981",
    bg: "#ecfdf5",
    icon: "bag-handle-outline",
  },
  delivery_challan: {
    label: "Challan",
    color: "#06b6d4",
    bg: "#ecfeff",
    icon: "car-outline",
  },
  bill_of_supply: {
    label: "Supply Bill",
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: "file-tray-outline",
  },
  pos_sale: {
    label: "Quick Sale",
    color: "#ec4899",
    bg: "#fdf2f8",
    icon: "storefront-outline",
  },
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvoiceHeaderBar({
  prefix,
  counter,
  documentType,
  documentDate,
  dueDate,
  onEdit,
}: InvoiceHeaderBarProps) {
  const meta = DOC_META[documentType] ?? DOC_META.invoice;

  return (
    <Pressable
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel="Edit invoice details"
      accessibilityHint="Opens invoice number, date and due date editor"
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        className="rounded-xl border border-slate-200 bg-white overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
        }}
      >
        {/* Colour accent bar at top */}
        <View style={{ height: 3, backgroundColor: meta.color }} />

        <View className="flex-row items-center px-3 py-2.5 gap-3">
          {/* Doc-type icon + badge */}
          <View
            className="w-9 h-9 rounded-lg items-center justify-center shrink-0"
            style={{ backgroundColor: meta.bg }}
          >
            <Ionicons name={meta.icon as any} size={18} color={meta.color} />
          </View>

          {/* Number + type label */}
          <View className="flex-1 min-w-0">
            <Text
              className="text-[13px] font-bold text-slate-800"
              numberOfLines={1}
            >
              {prefix}
              {counter}
            </Text>
            <Text
              className="text-[11px] font-medium mt-0.5"
              style={{ color: meta.color }}
            >
              {meta.label}
            </Text>
          </View>

          {/* Dates column */}
          <View className="items-end shrink-0 gap-0.5">
            <View className="flex-row items-center gap-1">
              <Ionicons name="calendar-outline" size={11} color={COLORS.slate[400]} />
              <Text className="text-[11px] text-slate-500">
                {fmtDate(documentDate)}
              </Text>
            </View>
            {dueDate ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={11} color={COLORS.slate[400]} />
                <Text className="text-[11px] text-slate-500">
                  Due {fmtDate(dueDate)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Edit chevron */}
          <Ionicons name="pencil-outline" size={15} color={COLORS.slate[400]} />
        </View>
      </View>
    </Pressable>
  );
}
