/**
 * InvoiceTemplatePreviewUtils — Shared utilities, helpers, and sub-components
 * Extracted from InvoiceTemplatePreview to reduce main file size ~600 LOC
 * Includes: TotalsBlock, ItemsTable, PaymentSection, DemoLogo, useFormatInr, styles
 */

import React, { createContext, useContext } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

// ── Types (re-exported) ────────────────────────────────────────────────────
export interface PreviewData {
  shopName: string;
  supplierAddress?: string;
  supplierGstin?: string;
  customerName: string;
  recipientAddress?: string;
  shipToAddress?: string;
  gstin?: string;
  invoiceNo: string;
  date: string;
  dueDate?: string;
  placeOfSupply?: string;
  items: Array<{
    name: string;
    qty: number;
    unit: string;
    rate: number;
    discount?: number;
    amount: number;
    hsn?: string;
  }>;
  subtotal: number;
  discountAmt: number;
  cgst: number;
  sgst: number;
  igst?: number;
  total: number;
  amountInWords?: string;
  reverseCharge?: boolean;
  compositionScheme?: boolean;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  logoPlaceholder?: string;
  themeLabel?: string;
  tags?: string[];
}
export const formatInr = (n: number, decimals = 2) => {
  if (n === undefined || n === null) return "₹0.00";
  const val = parseFloat(n.toString());
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
};

// ── Context & Hook ────────────────────────────────────────────────────────
export interface PreviewSettings {
  themeColor?: string;
  priceDecimals?: number;
  showItemHsn?: boolean;
  showCustomerAddress?: boolean;
  showPaymentMode?: boolean;
}

export const PreviewSettingsContext = createContext<PreviewSettings>({});

export function useFormatInr() {
  const { priceDecimals = 2 } = useContext(PreviewSettingsContext);
  return (n: number) => formatInr(n, priceDecimals);
}

// ── Shared Sub-Components ──────────────────────────────────────────────────

export function TotalsBlock({
  d,
  accentColor = "#374151",
  thermal = false,
  showTotalItems = false,
}: {
  d: PreviewData;
  accentColor?: string;
  thermal?: boolean;
  showTotalItems?: boolean;
}) {
  const fmt = useFormatInr();
  const totalQty = d.items.reduce((s, i) => s + i.qty, 0);
  return (
    <View style={[styles.totalsBlock, thermal && styles.totalsBlockThermal]}>
      {showTotalItems && !thermal && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>
            Total Items / Qty: {d.items.length} / {totalQty.toFixed(3)}
          </Text>
        </View>
      )}
      <View style={styles.totalsRow}>
        <Text style={thermal ? styles.thermalText : styles.totalsLabel}>
          Subtotal
        </Text>
        <Text style={thermal ? styles.thermalText : styles.totalsValue}>
          {fmt(d.subtotal)}
        </Text>
      </View>
      {d.discountAmt > 0 && (
        <View style={styles.totalsRow}>
          <Text style={[styles.totalsLabel, { color: "#16a34a" }]}>
            Discount
          </Text>
          <Text style={[styles.totalsValue, { color: "#16a34a" }]}>
            -{fmt(d.discountAmt)}
          </Text>
        </View>
      )}
      {(d.igst ?? 0) > 0 && (
        <View style={styles.totalsRow}>
          <Text style={thermal ? styles.thermalText : styles.totalsLabel}>
            IGST
          </Text>
          <Text style={thermal ? styles.thermalText : styles.totalsValue}>
            {fmt(d.igst!)}
          </Text>
        </View>
      )}
      {d.cgst > 0 && (
        <View style={styles.totalsRow}>
          <Text style={thermal ? styles.thermalText : styles.totalsLabel}>
            CGST
          </Text>
          <Text style={thermal ? styles.thermalText : styles.totalsValue}>
            {fmt(d.cgst)}
          </Text>
        </View>
      )}
      {d.sgst > 0 && (
        <View style={styles.totalsRow}>
          <Text style={thermal ? styles.thermalText : styles.totalsLabel}>
            SGST
          </Text>
          <Text style={thermal ? styles.thermalText : styles.totalsValue}>
            {fmt(d.sgst)}
          </Text>
        </View>
      )}
      <View style={[styles.totalsTotal, { borderTopColor: accentColor }]}>
        <Text style={[styles.totalsTotalLabel, { color: accentColor }]}>
          Total
        </Text>
        <Text style={[styles.totalsTotalValue, { color: accentColor }]}>
          {fmt(d.total)}
        </Text>
      </View>
      {d.amountInWords ? (
        <Text style={[styles.amountWords, thermal && styles.thermalText]}>
          {d.amountInWords}
        </Text>
      ) : null}
      {d.reverseCharge && (
        <Text style={styles.reverseCharge}>
          Tax is payable on Reverse Charge
        </Text>
      )}
    </View>
  );
}

export function PaymentSection({ d }: { d: PreviewData }) {
  const hasUpi = !!d.upiId;
  const hasBank = !!(d.bankName && d.bankAccountNo && d.bankIfsc);
  if (!hasUpi && !hasBank) return null;
  const upiUrl = hasUpi
    ? `upi://pay?pa=${encodeURIComponent(d.upiId!)}&pn=${encodeURIComponent(d.shopName)}&am=${d.total.toFixed(2)}&cu=INR`
    : "";
  const qrUri = hasUpi
    ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&margin=2&data=${encodeURIComponent(upiUrl)}`
    : null;
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 10,
        backgroundColor: "#f8fafc",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        gap: 12,
      }}
    >
      {qrUri && (
        <View>
          <Text style={[styles.metaBold, { fontSize: 8, marginBottom: 4 }]}>
            Pay using UPI
          </Text>
          <Image
            source={{ uri: qrUri }}
            style={{
              width: 64,
              height: 64,
              backgroundColor: "#fff",
              borderRadius: 4,
            }}
          />
        </View>
      )}
      {hasBank && (
        <View style={{ flex: 1 }}>
          <Text style={[styles.metaBold, { fontSize: 8, marginBottom: 4 }]}>
            Bank Details
          </Text>
          <Text style={{ fontSize: 9 }}>Bank: {d.bankName}</Text>
          <Text style={{ fontSize: 9 }}>Account #: {d.bankAccountNo}</Text>
          <Text style={{ fontSize: 9 }}>IFSC: {d.bankIfsc}</Text>
          {d.bankBranch && (
            <Text style={{ fontSize: 9 }}>Branch: {d.bankBranch}</Text>
          )}
        </View>
      )}
    </View>
  );
}

export const LOGO_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  amazon: { bg: "#ff9900", text: "#fff", label: "AMZ" },
  flipkart: { bg: "#2874f0", text: "#fff", label: "FK" },
  instagram: { bg: "#e4405f", text: "#fff", label: "IG" },
  nike: { bg: "#000", text: "#fff", label: "NK" },
  tata: { bg: "#004687", text: "#fff", label: "TTA" },
  dmart: { bg: "#ffc220", text: "#000", label: "DM" },
  unilever: { bg: "#0066b3", text: "#fff", label: "UL" },
};

export function DemoLogo({
  placeholder,
  size = 36,
}: {
  placeholder?: string;
  size?: number;
}) {
  if (!placeholder) return null;
  const s = LOGO_STYLES[placeholder] ?? LOGO_STYLES.amazon;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        backgroundColor: s.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: s.text, fontSize: size * 0.5, fontWeight: "800" }}>
        {s.label}
      </Text>
    </View>
  );
}

// ── ItemsTable component ───────────────────────────────────────────────────
export function ItemsTable({
  items,
  thermal = false,
  showHsn = false,
  serviceStyle = false,
}: {
  items: PreviewData["items"];
  thermal?: boolean;
  showHsn?: boolean;
  serviceStyle?: boolean;
}) {
  const fmt = useFormatInr();
  if (thermal) {
    return (
      <View>
        {items.map((it, i) => (
          <View key={i} style={styles.thermalItem}>
            <Text style={styles.thermalText}>
              {i + 1}. {it.name}
            </Text>
            <View style={styles.thermalItemRow}>
              <Text style={styles.thermalText}>
                {it.qty} {it.unit} × {fmt(it.rate)}
                {it.discount ? ` -${it.discount}%` : ""}
              </Text>
              <Text style={styles.thermalText}>{fmt(it.amount)}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.itemsTableContainer}>
      <View
        style={[
          styles.itemsHeader,
          serviceStyle && { backgroundColor: "#f0fdf4" },
        ]}
      >
        <Text style={[styles.itemsHeaderCell, { flex: 3 }]}>
          Item / Description
        </Text>
        <Text
          style={[styles.itemsHeaderCell, { flex: 1, textAlign: "center" }]}
        >
          Qty / Unit
        </Text>
        <Text style={[styles.itemsHeaderCell, { flex: 1, textAlign: "right" }]}>
          Rate
        </Text>
        {showHsn && (
          <Text
            style={[styles.itemsHeaderCell, { flex: 1, textAlign: "center" }]}
          >
            HSN
          </Text>
        )}
        <Text style={[styles.itemsHeaderCell, { flex: 1, textAlign: "right" }]}>
          Amount
        </Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={styles.itemsRow}>
          <View style={{ flex: 3 }}>
            <Text style={styles.itemName}>{it.name}</Text>
            {(it.discount ?? 0) > 0 && (
              <Text style={[styles.itemSub, { color: "#16a34a" }]}>
                Discount: {it.discount ?? 0}%
              </Text>
            )}
          </View>
          <Text style={[styles.itemCell, { flex: 1, textAlign: "center" }]}>
            {it.qty.toFixed(3)} {it.unit}
          </Text>
          <Text style={[styles.itemCell, { flex: 1, textAlign: "right" }]}>
            {fmt(it.rate)}
          </Text>
          {showHsn && (
            <Text style={[styles.itemCell, { flex: 1, textAlign: "center" }]}>
              {it.hsn ?? "-"}
            </Text>
          )}
          <Text style={[styles.itemCell, { flex: 1, textAlign: "right" }]}>
            {fmt(it.amount)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Shared Styles ──────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 4,
  },

  // ── Totals block
  totalsBlock: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 4,
  },
  totalsBlockThermal: {
    borderTopColor: "#333",
    paddingVertical: 4,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalsLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  totalsValue: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1e293b",
  },
  totalsTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginVertical: 4,
    borderTopWidth: 2,
    borderTopColor: "#e2e8f0",
  },
  totalsTotalLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  totalsTotalValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  amountWords: {
    fontSize: 9,
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 4,
  },
  reverseCharge: {
    fontSize: 8,
    color: "#dc2626",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },

  // ── Items table
  itemsTableContainer: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginHorizontal: 10,
    marginVertical: 6,
    borderRadius: 4,
    overflow: "hidden",
  },
  itemsHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  itemsHeaderCell: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  itemsRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
  },
  itemName: {
    fontSize: 11,
    fontWeight: "500",
    color: "#1e293b",
  },
  itemSub: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  itemCell: {
    fontSize: 10,
    color: "#475569",
  },

  // ── Thermal
  thermalCard: {
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 4,
  },
  thermalHeader: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  thermalShopName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  thermalSub: {
    fontSize: 9,
    color: "#000",
    textAlign: "center",
  },
  thermalText: {
    fontSize: 9,
    color: "#000",
  },
  thermalItem: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  thermalItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },

  // ── Classic
  classicCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  classicHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  classicShopName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
  },
  classicSub: {
    fontSize: 10,
    color: "#64748b",
  },

  // ── Modern
  modernCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
  },
  modernHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modernShopName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  modernHeaderSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  modernInvNo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  modernBillTo: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  // ── Vyapari
  vyapariCard: {
    borderWidth: 2,
    borderRadius: 0,
  },
  vyapariHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  vyapariShopName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
  },
  vyapariSub: {
    fontSize: 9,
    color: "#fff",
    textAlign: "center",
  },
  vyapariMeta: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  // ── E-Com / Flipkart / Amazon
  ecomCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
  },
  ecomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ecomShopName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
  },
  ecomInvLabel: {
    fontSize: 8,
    color: "#94a3b8",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  ecomInvNo: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1e293b",
  },
  ecomStripe: {
    height: 2,
    backgroundColor: "#ff9900",
    marginVertical: 6,
  },
  ecomBillTo: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 12,
  },
  ecomLabel: {
    fontSize: 8,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  ecomValue: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1e293b",
  },
  ecomSub: {
    fontSize: 9,
    color: "#64748b",
  },

  // ── Flipkart
  flipkartCard: {
    borderWidth: 1,
    borderColor: "#2874f0",
    borderRadius: 0,
  },
  flipkartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  flipkartShopName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  flipkartInvBox: {
    alignItems: "flex-end",
  },
  flipkartInvNo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  flipkartDate: {
    fontSize: 9,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  flipkartCustomer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // ── Minimal
  minimalCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
  },
  minimalShopName: {
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 2,
    textAlign: "center",
  },
  minimalMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  minimalLabel: {
    fontSize: 8,
    color: "#94a3b8",
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 2,
  },
  minimalValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },
  minimalSub: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },

  // ── Meta (shared)
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaBold: {
    fontWeight: "700",
    color: "#1e293b",
    fontSize: 11,
  },
  metaSmall: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  compositionText: {
    fontSize: 9,
    color: "#dc2626",
    fontWeight: "600",
  },
});
