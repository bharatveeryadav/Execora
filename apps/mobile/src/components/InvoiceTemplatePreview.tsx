/**
 * InvoiceTemplatePreview — React Native invoice template previews.
 * Matches web InvoiceTemplatePreview (7 templates).
 */
import React, { createContext, useContext } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";

export interface PreviewSettings {
  themeColor?: string;
  priceDecimals?: number;
  showItemHsn?: boolean;
  showCustomerAddress?: boolean;
  showPaymentMode?: boolean;
}

const PreviewSettingsContext = createContext<PreviewSettings>({});

export type TemplateId =
  | "classic"
  | "modern"
  | "vyapari"
  | "thermal"
  | "ecom"
  | "flipkart"
  | "minimal";

export const TEMPLATES: Array<{
  id: TemplateId;
  label: string;
  desc: string;
  color: string;
}> = [
  { id: "classic", label: "Classic", desc: "Traditional B&W", color: "#374151" },
  { id: "modern", label: "Modern", desc: "Clean blue", color: "#1e40af" },
  { id: "vyapari", label: "Vyapari", desc: "Indian market", color: "#c2410c" },
  { id: "thermal", label: "Thermal", desc: "80mm receipt", color: "#111827" },
  { id: "ecom", label: "E-Com", desc: "Amazon-style", color: "#ff9900" },
  { id: "flipkart", label: "Flipkart", desc: "Blue e-com", color: "#2874f0" },
  { id: "minimal", label: "Minimal", desc: "Typography", color: "#6d28d9" },
];

export interface PreviewItem {
  name: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number;
  amount: number;
  hsnCode?: string;
}

export interface PreviewData {
  invoiceNo: string;
  date: string;
  shopName: string;
  customerName: string;
  supplierGstin?: string;
  supplierAddress?: string;
  recipientAddress?: string;
  compositionScheme?: boolean;
  items: PreviewItem[];
  subtotal: number;
  discountAmt: number;
  cgst: number;
  sgst: number;
  igst?: number;
  total: number;
  amountInWords: string;
  paymentMode?: string;
  notes?: string;
  upiId?: string;
  gstin?: string;
  reverseCharge?: boolean;
}

const formatInr = (n: number, decimals = 2) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function useFormatInr() {
  const { priceDecimals = 2 } = useContext(PreviewSettingsContext);
  return (n: number) => formatInr(n, priceDecimals);
}

// ── Shared totals block ───────────────────────────────────────────────────────
function TotalsBlock({
  d,
  accentColor = "#374151",
  thermal = false,
}: {
  d: PreviewData;
  accentColor?: string;
  thermal?: boolean;
}) {
  const fmt = useFormatInr();
  return (
    <View style={[styles.totalsBlock, thermal && styles.totalsBlockThermal]}>
      <View style={styles.totalsRow}>
        <Text style={thermal ? styles.thermalText : styles.totalsLabel}>Subtotal</Text>
        <Text style={thermal ? styles.thermalText : styles.totalsValue}>{fmt(d.subtotal)}</Text>
      </View>
      {d.discountAmt > 0 && (
        <View style={styles.totalsRow}>
          <Text style={[styles.totalsLabel, { color: "#16a34a" }]}>Discount</Text>
          <Text style={[styles.totalsValue, { color: "#16a34a" }]}>-{fmt(d.discountAmt)}</Text>
        </View>
      )}
      {(d.igst ?? 0) > 0 && (
        <View style={styles.totalsRow}>
          <Text style={thermal ? styles.thermalText : styles.totalsLabel}>IGST</Text>
          <Text style={thermal ? styles.thermalText : styles.totalsValue}>{fmt(d.igst!)}</Text>
        </View>
      )}
      {d.cgst > 0 && (
        <View style={styles.totalsRow}>
          <Text style={thermal ? styles.thermalText : styles.totalsLabel}>CGST</Text>
          <Text style={thermal ? styles.thermalText : styles.totalsValue}>{fmt(d.cgst)}</Text>
        </View>
      )}
      {d.sgst > 0 && (
        <View style={styles.totalsRow}>
          <Text style={thermal ? styles.thermalText : styles.totalsLabel}>SGST</Text>
          <Text style={thermal ? styles.thermalText : styles.totalsValue}>{fmt(d.sgst)}</Text>
        </View>
      )}
      <View style={[styles.totalsTotal, { borderTopColor: accentColor }]}>
        <Text style={[styles.totalsTotalLabel, { color: accentColor }]}>Total</Text>
        <Text style={[styles.totalsTotalValue, { color: accentColor }]}>{fmt(d.total)}</Text>
      </View>
      {d.amountInWords ? (
        <Text style={[styles.amountWords, thermal && styles.thermalText]}>{d.amountInWords}</Text>
      ) : null}
      {d.reverseCharge && (
        <Text style={styles.reverseCharge}>Tax is payable on Reverse Charge</Text>
      )}
    </View>
  );
}

// ── Classic ───────────────────────────────────────────────────────────────────
function ClassicPreview({ d }: { d: PreviewData }) {
  const { themeColor, showItemHsn, showCustomerAddress } = useContext(PreviewSettingsContext);
  const accent = themeColor ?? "#374151";
  return (
    <View style={[styles.card, styles.classicCard]}>
      <View style={styles.classicHeader}>
        <Text style={styles.classicShopName}>{d.shopName}</Text>
        {d.supplierAddress && <Text style={styles.classicSub}>{d.supplierAddress}</Text>}
        {d.supplierGstin && <Text style={styles.classicSub}>GSTIN: {d.supplierGstin}</Text>}
        {d.compositionScheme && (
          <Text style={styles.compositionText}>Composition Taxable Person</Text>
        )}
        <Text style={styles.classicSub}>TAX INVOICE</Text>
      </View>
      <View style={styles.metaRow}>
        <View>
          <Text style={styles.metaBold}>Bill To:</Text>
          <Text>{d.customerName}</Text>
          {showCustomerAddress !== false && d.recipientAddress && (
            <Text style={styles.metaSmall}>{d.recipientAddress}</Text>
          )}
          {d.gstin && <Text>GSTIN: {d.gstin}</Text>}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.metaBold}>Invoice #: {d.invoiceNo}</Text>
          <Text style={styles.metaBold}>Date: {d.date}</Text>
        </View>
      </View>
      <ItemsTable items={d.items} thermal={false} showHsn={showItemHsn ?? false} />
      <TotalsBlock d={d} accentColor={accent} />
    </View>
  );
}

// ── Modern ───────────────────────────────────────────────────────────────────
function ModernPreview({ d }: { d: PreviewData }) {
  const { themeColor } = useContext(PreviewSettingsContext);
  const hdr = themeColor ?? "#1e40af";
  return (
    <View style={[styles.card, styles.modernCard]}>
      <View style={[styles.modernHeader, { backgroundColor: hdr }]}>
        <View>
          <Text style={styles.modernShopName}>{d.shopName}</Text>
          {d.supplierAddress && <Text style={styles.modernHeaderSub}>{d.supplierAddress}</Text>}
          {d.supplierGstin && <Text style={styles.modernHeaderSub}>GSTIN: {d.supplierGstin}</Text>}
          <Text style={styles.modernHeaderSub}>TAX INVOICE</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.modernInvNo}>#{d.invoiceNo}</Text>
          <Text style={styles.modernHeaderSub}>{d.date}</Text>
        </View>
      </View>
      <View style={styles.modernBillTo}>
        <Text><Text style={styles.metaBold}>Customer:</Text> {d.customerName}</Text>
        {d.gstin && <Text>GSTIN: {d.gstin}</Text>}
      </View>
      <ItemsTable items={d.items} thermal={false} />
      <TotalsBlock d={d} accentColor={hdr} />
    </View>
  );
}

// ── Vyapari ──────────────────────────────────────────────────────────────────
function VyapariPreview({ d }: { d: PreviewData }) {
  const { themeColor, showItemHsn } = useContext(PreviewSettingsContext);
  const hdr = themeColor ?? "#c2410c";
  return (
    <View style={[styles.card, styles.vyapariCard, { borderColor: hdr }]}>
      <View style={[styles.vyapariHeader, { backgroundColor: hdr }]}>
        <Text style={styles.vyapariShopName}>{d.shopName.toUpperCase()}</Text>
        {d.supplierGstin && <Text style={styles.vyapariSub}>GSTIN: {d.supplierGstin}</Text>}
        <Text style={styles.vyapariSub}>GST TAX INVOICE / कर बीजक</Text>
      </View>
      <View style={styles.vyapariMeta}>
        <Text><Text style={styles.metaBold}>Bill No:</Text> {d.invoiceNo}</Text>
        <Text><Text style={styles.metaBold}>Date:</Text> {d.date}</Text>
        <Text><Text style={styles.metaBold}>Customer:</Text> {d.customerName}</Text>
      </View>
      <ItemsTable items={d.items} thermal={false} showHsn={showItemHsn ?? true} />
      <TotalsBlock d={d} accentColor={hdr} />
    </View>
  );
}

// ── Thermal ──────────────────────────────────────────────────────────────────
function ThermalPreview({ d }: { d: PreviewData }) {
  const fmt = useFormatInr();
  return (
    <View style={[styles.card, styles.thermalCard]}>
      <View style={styles.thermalHeader}>
        <Text style={styles.thermalShopName}>{d.shopName}</Text>
        <Text style={styles.thermalSub}>** TAX INVOICE **</Text>
        <Text style={styles.thermalSub}>Bill: {d.invoiceNo}</Text>
        <Text style={styles.thermalSub}>Date: {d.date}</Text>
      </View>
      <Text style={styles.thermalSub}>Customer: {d.customerName}</Text>
      {d.items.map((it, i) => (
        <View key={i} style={styles.thermalItem}>
          <Text style={styles.thermalText}>{i + 1}. {it.name}</Text>
          <View style={styles.thermalItemRow}>
            <Text style={styles.thermalText}>
              {it.qty} {it.unit} × {fmt(it.rate)}
              {it.discount > 0 ? ` -${it.discount}%` : ""}
            </Text>
            <Text style={styles.thermalText}>{fmt(it.amount)}</Text>
          </View>
        </View>
      ))}
      <TotalsBlock d={d} thermal />
      <Text style={[styles.thermalSub, { textAlign: "center", marginTop: 8 }]}>
        Thank you! Come again.
        {d.upiId && `\nUPI: ${d.upiId}`}
      </Text>
    </View>
  );
}

// ── E-Com ────────────────────────────────────────────────────────────────────
function EcomPreview({ d }: { d: PreviewData }) {
  const { themeColor } = useContext(PreviewSettingsContext);
  const accent = themeColor ?? "#ff9900";
  return (
    <View style={[styles.card, styles.ecomCard]}>
      <View style={styles.ecomHeader}>
        <Text style={styles.ecomShopName}>{d.shopName}</Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.ecomInvLabel}>TAX INVOICE</Text>
          <Text style={styles.ecomInvNo}>Order # {d.invoiceNo}</Text>
        </View>
      </View>
      <View style={styles.ecomStripe} />
      <View style={styles.ecomBillTo}>
        <View>
          <Text style={styles.ecomLabel}>BILL TO</Text>
          <Text style={styles.ecomValue}>{d.customerName}</Text>
          {d.gstin && <Text style={styles.ecomSub}>GSTIN: {d.gstin}</Text>}
        </View>
        <View>
          <Text style={styles.ecomLabel}>ORDER DATE</Text>
          <Text style={styles.ecomValue}>{d.date}</Text>
          <Text style={styles.ecomSub}>Invoice: {d.invoiceNo}</Text>
        </View>
      </View>
      <ItemsTable items={d.items} thermal={false} />
      <TotalsBlock d={d} accentColor={accent} />
    </View>
  );
}

// ── Flipkart ─────────────────────────────────────────────────────────────────
function FlipkartPreview({ d }: { d: PreviewData }) {
  const { themeColor } = useContext(PreviewSettingsContext);
  const blue = themeColor ?? "#2874f0";
  return (
    <View style={[styles.card, styles.flipkartCard]}>
      <View style={[styles.flipkartHeader, { backgroundColor: blue }]}>
        <Text style={styles.flipkartShopName}>{d.shopName}</Text>
        <View style={styles.flipkartInvBox}>
          <Text style={styles.flipkartInvNo}>#{d.invoiceNo}</Text>
          <Text style={styles.flipkartDate}>{d.date}</Text>
        </View>
      </View>
      <View style={styles.flipkartCustomer}>
        <Text><Text style={{ color: "#878787" }}>Customer: </Text><Text style={styles.metaBold}>{d.customerName}</Text></Text>
        {d.gstin && <Text><Text style={{ color: "#878787" }}>GSTIN: </Text><Text style={styles.metaBold}>{d.gstin}</Text></Text>}
      </View>
      <ItemsTable items={d.items} thermal={false} />
      <TotalsBlock d={d} accentColor={blue} />
    </View>
  );
}

// ── Minimal ──────────────────────────────────────────────────────────────────
function MinimalPreview({ d }: { d: PreviewData }) {
  const { themeColor } = useContext(PreviewSettingsContext);
  const accent = themeColor ?? "#6d28d9";
  return (
    <View style={[styles.card, styles.minimalCard]}>
      <Text style={[styles.minimalShopName, { color: accent, borderBottomColor: accent }]}>
        {d.shopName}
      </Text>
      <View style={styles.minimalMeta}>
        <View>
          <Text style={styles.minimalLabel}>Billed To</Text>
          <Text style={styles.minimalValue}>{d.customerName}</Text>
          {d.gstin && <Text style={styles.minimalSub}>GSTIN: {d.gstin}</Text>}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.minimalLabel}>Invoice</Text>
          <Text style={[styles.minimalValue, { color: accent }]}>{d.invoiceNo}</Text>
          <Text style={styles.minimalSub}>{d.date}</Text>
        </View>
      </View>
      <ItemsTable items={d.items} thermal={false} />
      <TotalsBlock d={d} accentColor={accent} />
    </View>
  );
}

// ── Items table (shared) ──────────────────────────────────────────────────────
function ItemsTable({
  items,
  thermal,
  showHsn = false,
}: {
  items: PreviewItem[];
  thermal: boolean;
  showHsn?: boolean;
}) {
  const fmt = useFormatInr();
  if (thermal) return null; // Thermal uses custom item layout
  const headers = showHsn
    ? ["Sl", "Item", "HSN", "Qty", "Rate", "Disc", "Total"]
    : ["#", "Item", "Qty", "Rate", "Disc%", "Amount"];
  const colFlex = showHsn ? [0.6, 1.5, 0.6, 0.7, 0.7, 0.5, 0.9] : [0.6, 1.8, 0.8, 0.8, 0.6, 0.9];
  return (
    <View style={styles.itemsTable}>
      <View style={styles.itemsHeader}>
        {headers.map((h, idx) => (
          <Text key={h} style={[styles.itemsHeaderCell, { flex: colFlex[idx] ?? 1 }]}>
            {h}
          </Text>
        ))}
      </View>
      {items.map((it, i) => (
        <View key={i} style={[styles.itemsRow, i % 2 === 1 && styles.itemsRowAlt]}>
          <Text style={[styles.itemsCell, { flex: colFlex[0] }]}>{i + 1}</Text>
          <Text style={[styles.itemsCell, styles.itemsName, { flex: colFlex[1] }]} numberOfLines={1}>
            {it.name}
          </Text>
          {showHsn && (
            <Text style={[styles.itemsCell, { flex: colFlex[2] }]}>{it.hsnCode || "-"}</Text>
          )}
          <Text style={[styles.itemsCell, styles.itemsRight, { flex: showHsn ? colFlex[3] : colFlex[2] }]}>
            {it.qty} {it.unit}
          </Text>
          <Text style={[styles.itemsCell, styles.itemsRight, { flex: showHsn ? colFlex[4] : colFlex[3] }]}>
            {fmt(it.rate)}
          </Text>
          <Text style={[styles.itemsCell, styles.itemsRight, { flex: showHsn ? colFlex[5] : colFlex[4] }]}>
            {it.discount > 0 ? `${it.discount}%` : "-"}
          </Text>
          <Text style={[styles.itemsCell, styles.itemsRight, styles.itemsAmount, { flex: showHsn ? colFlex[6] : colFlex[5] }]}>
            {fmt(it.amount)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function InvoiceTemplatePreview({
  template,
  data,
  settings,
}: {
  template: TemplateId;
  data: PreviewData;
  settings?: PreviewSettings;
}) {
  const content = (
    <PreviewSettingsContext.Provider value={settings ?? {}}>
      {template === "classic" && <ClassicPreview d={data} />}
      {template === "modern" && <ModernPreview d={data} />}
      {template === "vyapari" && <VyapariPreview d={data} />}
      {template === "thermal" && <ThermalPreview d={data} />}
      {template === "ecom" && <EcomPreview d={data} />}
      {template === "flipkart" && <FlipkartPreview d={data} />}
      {template === "minimal" && <MinimalPreview d={data} />}
    </PreviewSettingsContext.Provider>
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={styles.scrollContent}
    >
      {content}
    </ScrollView>
  );
}

/** Compact invoice preview thumbnail for settings/cards — shows actual template */
export function InvoicePreviewThumbnail({
  template,
  data,
  width = 72,
  height = 96,
}: {
  template: TemplateId;
  data: PreviewData;
  width?: number;
  height?: number;
}) {
  const scale = Math.min(width / 320, height / 200, 0.28);
  const origW = 320;
  const origH = 200;
  const translateX = -(origW * (1 - scale)) / 2;
  const translateY = -(origH * (1 - scale)) / 2;
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: [{ translateX }, { translateY }, { scale }],
        }}
      >
        <PreviewSettingsContext.Provider value={{}}>
          {template === "classic" && <ClassicPreview d={data} />}
          {template === "modern" && <ModernPreview d={data} />}
          {template === "vyapari" && <VyapariPreview d={data} />}
          {template === "thermal" && <ThermalPreview d={data} />}
          {template === "ecom" && <EcomPreview d={data} />}
          {template === "flipkart" && <FlipkartPreview d={data} />}
          {template === "minimal" && <MinimalPreview d={data} />}
        </PreviewSettingsContext.Provider>
      </View>
    </View>
  );
}

/** Template thumbnail for picker */
export function TemplateThumbnail({
  template,
  selected,
  onPress,
}: {
  template: (typeof TEMPLATES)[number];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.thumbnail,
        selected && styles.thumbnailSelected,
      ]}
    >
      <View
        style={[
          styles.thumbnailStrip,
          { backgroundColor: selected ? template.color + "20" : "#f8f9fa" },
        ]}
      >
        <View style={[styles.thumbnailBar, { backgroundColor: template.color }]} />
        <View style={styles.thumbnailLines}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.thumbnailLine,
                { backgroundColor: template.color + "66", flex: i === 2 ? 2 : 1 },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.thumbnailLabel, selected && styles.thumbnailLabelSelected]}>
        {template.label}
      </Text>
      <Text style={styles.thumbnailDesc}>{template.desc}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 12 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    minWidth: 320,
    maxWidth: 400,
  },
  classicCard: { borderWidth: 1, borderColor: "#ccc" },
  classicHeader: {
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#111",
    paddingBottom: 10,
    marginBottom: 10,
  },
  classicShopName: { fontSize: 16, fontWeight: "700" },
  classicSub: { fontSize: 10, color: "#555", marginTop: 2 },
  compositionText: { fontSize: 9, fontWeight: "600", color: "#b91c1c", marginTop: 2 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metaBold: { fontWeight: "700" },
  metaSmall: { fontSize: 10 },
  modernCard: { overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  modernHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  modernShopName: { fontSize: 16, fontWeight: "700", color: "#fff" },
  modernInvNo: { fontSize: 13, fontWeight: "700", color: "#fff" },
  modernHeaderSub: { fontSize: 9, color: "rgba(255,255,255,0.9)" },
  modernBillTo: {
    backgroundColor: "#eff6ff",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  vyapariCard: { borderWidth: 2, backgroundColor: "#fffbf7" },
  vyapariHeader: { padding: 12, alignItems: "center" },
  vyapariShopName: { fontSize: 16, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  vyapariSub: { fontSize: 10, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  vyapariMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 6,
    backgroundColor: "#fff7ed",
    borderBottomWidth: 1,
    borderBottomColor: "#c2410c",
  },
  thermalCard: {
    fontFamily: "monospace",
    padding: 12,
    minWidth: 260,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  thermalHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderStyle: "dashed",
    paddingBottom: 8,
    marginBottom: 8,
  },
  thermalShopName: { fontSize: 14, fontWeight: "700" },
  thermalSub: { fontSize: 10, marginTop: 2 },
  thermalItem: { marginBottom: 4 },
  thermalItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 12,
  },
  thermalText: { fontSize: 10 },
  ecomCard: { overflow: "hidden", borderRadius: 4, borderWidth: 1, borderColor: "#d5d9d9" },
  ecomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#232f3e",
    padding: 10,
  },
  ecomShopName: { fontSize: 18, fontWeight: "900", color: "#ff9900" },
  ecomInvLabel: { fontSize: 10, fontWeight: "600", color: "#fff" },
  ecomInvNo: { fontSize: 10, color: "#ccc" },
  ecomStripe: { height: 3, backgroundColor: "#ff9900" },
  ecomBillTo: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e3e6e6",
  },
  ecomLabel: { fontSize: 9, fontWeight: "700", color: "#565959", marginBottom: 3 },
  ecomValue: { fontWeight: "600" },
  ecomSub: { fontSize: 10, color: "#565959" },
  flipkartCard: { overflow: "hidden", borderRadius: 4, borderWidth: 1, borderColor: "#dbdfe4" },
  flipkartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  flipkartShopName: { fontSize: 20, fontWeight: "900", color: "#ffe500" },
  flipkartInvBox: {
    backgroundColor: "#ffe500",
    padding: 8,
    borderRadius: 4,
    alignItems: "flex-end",
  },
  flipkartInvNo: { fontSize: 12, fontWeight: "800", color: "#2874f0" },
  flipkartDate: { fontSize: 10, color: "#333" },
  flipkartCustomer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 7,
    backgroundColor: "#f5f7ff",
    borderBottomWidth: 1,
    borderBottomColor: "#dce6ff",
  },
  minimalCard: { padding: 20 },
  minimalShopName: {
    fontSize: 22,
    fontWeight: "700",
    borderBottomWidth: 3,
    paddingBottom: 10,
    marginBottom: 16,
  },
  minimalMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  minimalLabel: { fontSize: 9, color: "#888", letterSpacing: 1 },
  minimalValue: { fontWeight: "600", marginTop: 2 },
  minimalSub: { fontSize: 10, color: "#666" },
  itemsTable: { marginBottom: 10 },
  itemsHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    padding: 4,
  },
  itemsHeaderCell: { flex: 1, fontSize: 10, fontWeight: "600" },
  itemsRow: { flexDirection: "row", padding: 4, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  itemsRowAlt: { backgroundColor: "#f8fafc" },
  itemsCell: { flex: 1, fontSize: 10 },
  itemsName: { flex: 2 },
  itemsRight: { textAlign: "right" },
  itemsAmount: { fontWeight: "600" },
  totalsBlock: { marginLeft: "auto", width: 200 },
  totalsBlockThermal: { width: "100%", marginLeft: 0 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  totalsLabel: { fontSize: 11 },
  totalsValue: { fontSize: 11 },
  totalsTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontWeight: "700",
    fontSize: 13,
    borderTopWidth: 2,
    paddingTop: 4,
    marginTop: 4,
  },
  totalsTotalLabel: {},
  totalsTotalValue: {},
  amountWords: { fontSize: 9, color: "#666", fontStyle: "italic", marginTop: 4 },
  reverseCharge: { fontSize: 9, fontWeight: "600", color: "#b91c1c", marginTop: 6 },
  thumbnail: {
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    minWidth: 72,
  },
  thumbnailSelected: { borderColor: "#e67e22", backgroundColor: "rgba(230,126,34,0.05)" },
  thumbnailStrip: {
    width: "100%",
    height: 36,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
  },
  thumbnailBar: { height: 10, width: "100%" },
  thumbnailLines: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  thumbnailLine: { height: 2, borderRadius: 1 },
  thumbnailLabel: { fontSize: 11, fontWeight: "600" },
  thumbnailLabelSelected: { color: "#e67e22" },
  thumbnailDesc: { fontSize: 9, color: "#64748b" },
});
