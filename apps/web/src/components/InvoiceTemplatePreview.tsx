/**
 * InvoiceTemplatePreview
 * Renders a visual preview of the invoice in one of 4 Indian-standard invoice templates.
 * Used in ClassicBilling to let users see how their bill will look.
 */
import React from "react";

export type TemplateId =
  | "classic"
  | "modern"
  | "vyapari"
  | "thermal"
  | "ecom"
  | "flipkart"
  | "minimal"
  | "amazon"
  | "tata"
  | "dmart"
  | "nike"
  | "instagram"
  | "unilever"
  | "service";

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
  { id: "amazon", label: "Amazon", desc: "E-commerce", color: "#ff9900" },
  { id: "tata", label: "Tata", desc: "Corporate", color: "#0066b3" },
  { id: "dmart", label: "DMart", desc: "Retail", color: "#e31837" },
  { id: "nike", label: "Nike", desc: "Sportswear", color: "#111827" },
  { id: "instagram", label: "Instagram", desc: "Landscape", color: "#e4405f" },
  { id: "unilever", label: "Unilever", desc: "FMCG", color: "#0066b3" },
  { id: "service", label: "Service", desc: "Bill To / Ship To", color: "#059669" },
];

export interface PreviewItem {
  name: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number;
  amount: number;
  hsnCode?: string;
  mrp?: number;
}

export interface PreviewData {
  invoiceNo: string;
  date: string;
  shopName: string;
  customerName: string;
  /** Supplier GSTIN (shown in header when available) */
  supplierGstin?: string;
  /** Supplier address (mandatory per GST) */
  supplierAddress?: string;
  /** Recipient billing address (B2B) */
  recipientAddress?: string;
  /** Composition scheme — show "Composition Taxable Person" */
  compositionScheme?: boolean;
  items: PreviewItem[];
  subtotal: number;
  discountAmt: number;
  cgst: number;
  sgst: number;
  /** IGST for inter-state supply (when set, CGST+SGST are 0) */
  igst?: number;
  total: number;
  amountInWords: string;
  paymentMode?: string;
  notes?: string;
  upiId?: string;
  /** Buyer GSTIN (Bill To) */
  gstin?: string;
  /** Reverse Charge — show "Tax is payable on Reverse Charge" when true */
  reverseCharge?: boolean;
  /** Invoice tags (e.g. B2B, B2C, COD) */
  tags?: string[];
  /** Demo logo placeholder */
  logoPlaceholder?: string;
  /** Ship To address */
  shipToAddress?: string;
  /** Theme label (MODERN, ELEGANT, MRP + DISCOUNT, etc.) */
  themeLabel?: string;
  upiId?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  /** Place of supply (e.g. 09-UTTARPRADESH) */
  placeOfSupply?: string;
  /** Due date */
  dueDate?: string;
}

// ── Indian ₹ formatter ───────────────────────────────────────────────────────
const inr = (n: number) =>
  "₹" +
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Template styles ──────────────────────────────────────────────────────────

function ClassicPreview({ d }: { d: PreviewData }) {
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: 11,
        color: "#111",
        background: "#fff",
        padding: 20,
        width: 560,
        border: "1px solid #ccc",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          borderBottom: "2px solid #111",
          paddingBottom: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>{d.shopName}</div>
        {d.supplierAddress && (
          <div style={{ fontSize: 9, color: "#555" }}>{d.supplierAddress}</div>
        )}
        {d.supplierGstin && (
          <div style={{ fontSize: 10, color: "#555" }}>GSTIN: {d.supplierGstin}</div>
        )}
        {d.compositionScheme && (
          <div style={{ fontSize: 9, fontWeight: 600, color: "#b91c1c" }}>Composition Taxable Person</div>
        )}
        <div style={{ fontSize: 11, color: "#555" }}>TAX INVOICE</div>
      </div>
      {/* Meta */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <b>Bill To:</b> {d.customerName}
          {d.recipientAddress && <div style={{ fontSize: 10 }}>{d.recipientAddress}</div>}
          {d.gstin && <div>GSTIN: {d.gstin}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div>
            <b>Invoice #:</b> {d.invoiceNo}
          </div>
          <div>
            <b>Date:</b> {d.date}
          </div>
        </div>
      </div>
      {/* Items */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}
      >
        <thead>
          <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #111" }}>
            <th style={{ padding: "4px 6px", textAlign: "left" }}>#</th>
            <th style={{ padding: "4px 6px", textAlign: "left" }}>Item</th>
            <th style={{ padding: "4px 6px", textAlign: "right" }}>Qty</th>
            <th style={{ padding: "4px 6px", textAlign: "right" }}>Rate</th>
            <th style={{ padding: "4px 6px", textAlign: "right" }}>Disc%</th>
            <th style={{ padding: "4px 6px", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {d.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "3px 6px" }}>{i + 1}</td>
              <td style={{ padding: "3px 6px" }}>
                {it.name}
                {it.hsnCode && (
                  <div style={{ fontSize: 9, color: "#888" }}>
                    HSN: {it.hsnCode}
                  </div>
                )}
              </td>
              <td style={{ padding: "3px 6px", textAlign: "right" }}>
                {it.qty} {it.unit}
              </td>
              <td style={{ padding: "3px 6px", textAlign: "right" }}>
                {inr(it.rate)}
              </td>
              <td style={{ padding: "3px 6px", textAlign: "right" }}>
                {it.discount > 0 ? `${it.discount}%` : "-"}
              </td>
              <td style={{ padding: "3px 6px", textAlign: "right" }}>
                {inr(it.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TotalsBlock d={d} />
    </div>
  );
}

function ModernPreview({ d }: { d: PreviewData }) {
  const hdr = "#1e40af";
  return (
    <div
      style={{
        fontFamily: '"Segoe UI", sans-serif',
        fontSize: 11,
        color: "#111",
        background: "#fff",
        width: 560,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: hdr,
          color: "#fff",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{d.shopName}</div>
          {d.supplierAddress && (
            <div style={{ fontSize: 9, opacity: 0.9 }}>{d.supplierAddress}</div>
          )}
          {d.supplierGstin && (
            <div style={{ fontSize: 9, opacity: 0.9 }}>GSTIN: {d.supplierGstin}</div>
          )}
          {d.compositionScheme && (
            <div style={{ fontSize: 9, fontWeight: 600, color: "#fef2f2" }}>Composition Taxable Person</div>
          )}
          <div style={{ fontSize: 10, opacity: 0.85 }}>TAX INVOICE</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>#{d.invoiceNo}</div>
          <div>{d.date}</div>
        </div>
      </div>
      {/* Bill To */}
      <div
        style={{
          background: "#eff6ff",
          padding: "8px 20px",
          borderBottom: "1px solid #dbeafe",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          <b>Customer:</b> {d.customerName}
          {d.recipientAddress && (
            <span style={{ display: "block", fontSize: 10, fontWeight: 400 }}>
              {d.recipientAddress}
            </span>
          )}
        </span>
        {d.gstin && <span>GSTIN: {d.gstin}</span>}
      </div>
      <div style={{ padding: "12px 20px" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}
        >
          <thead>
            <tr>
              {["#", "Item", "Qty", "Rate", "Disc%", "Amount"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "5px 6px",
                    textAlign: h === "#" || h === "Item" ? "left" : "right",
                    borderBottom: `2px solid ${hdr}`,
                    color: hdr,
                    fontSize: 10,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.items.map((it, i) => (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}
              >
                <td style={{ padding: "3px 6px" }}>{i + 1}</td>
                <td style={{ padding: "3px 6px" }}>{it.name}</td>
                <td style={{ padding: "3px 6px", textAlign: "right" }}>
                  {it.qty} {it.unit}
                </td>
                <td style={{ padding: "3px 6px", textAlign: "right" }}>
                  {inr(it.rate)}
                </td>
                <td style={{ padding: "3px 6px", textAlign: "right" }}>
                  {it.discount > 0 ? `${it.discount}%` : "-"}
                </td>
                <td
                  style={{
                    padding: "3px 6px",
                    textAlign: "right",
                    fontWeight: 600,
                  }}
                >
                  {inr(it.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TotalsBlock d={d} accentColor={hdr} />
      </div>
    </div>
  );
}

function VyapariPreview({ d }: { d: PreviewData }) {
  const hdr = "#c2410c";
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: 11,
        color: "#111",
        background: "#fffbf7",
        width: 560,
        border: `2px solid ${hdr}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: hdr,
          color: "#fff",
          padding: "12px 16px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>
          {d.shopName.toUpperCase()}
        </div>
        {d.supplierAddress && (
          <div style={{ fontSize: 9, marginTop: 2, opacity: 0.9 }}>{d.supplierAddress}</div>
        )}
        {d.supplierGstin && (
          <div style={{ fontSize: 10, marginTop: 2, opacity: 0.9 }}>GSTIN: {d.supplierGstin}</div>
        )}
        {d.compositionScheme && (
          <div style={{ fontSize: 9, fontWeight: 600, marginTop: 2 }}>Composition Taxable Person</div>
        )}
        <div style={{ fontSize: 11, marginTop: 2 }}>
          GST TAX INVOICE / कर बीजक
        </div>
      </div>
      {/* Invoice info row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "6px 16px",
          background: "#fff7ed",
          borderBottom: `1px solid ${hdr}`,
          fontSize: 10,
        }}
      >
        <span>
          <b>Bill No:</b> {d.invoiceNo}
        </span>
        <span>
          <b>Date:</b> {d.date}
        </span>
        <span>
          <b>Customer:</b> {d.customerName}
          {d.recipientAddress && (
            <span style={{ display: "block", fontSize: 9 }}>{d.recipientAddress}</span>
          )}
          {d.gstin && <span style={{ display: "block" }}>GSTIN: {d.gstin}</span>}
        </span>
      </div>
      {/* Items */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", margin: "8px 0" }}
      >
        <thead>
          <tr style={{ background: "#fed7aa" }}>
            {[
              "Sl",
              "Item / Vastu",
              "HSN",
              "Qty",
              "Rate (₹)",
              "Disc",
              "Total (₹)",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "4px 6px",
                  textAlign: ["Rate (₹)", "Total (₹)", "Disc"].includes(h)
                    ? "right"
                    : "left",
                  borderBottom: `1px solid ${hdr}`,
                  fontSize: 10,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px dashed #fddcb0" }}>
              <td style={{ padding: "3px 6px" }}>{i + 1}</td>
              <td style={{ padding: "3px 6px" }}>
                {it.name}{" "}
                {it.unit && <span style={{ color: "#888" }}>({it.unit})</span>}
              </td>
              <td style={{ padding: "3px 6px", fontSize: 9, color: "#666" }}>
                {it.hsnCode || "-"}
              </td>
              <td style={{ padding: "3px 6px" }}>{it.qty}</td>
              <td style={{ padding: "3px 6px", textAlign: "right" }}>
                {inr(it.rate)}
              </td>
              <td style={{ padding: "3px 6px", textAlign: "right" }}>
                {it.discount > 0 ? `${it.discount}%` : "-"}
              </td>
              <td
                style={{
                  padding: "3px 6px",
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {inr(it.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: "0 16px 12px" }}>
        <TotalsBlock d={d} accentColor={hdr} />
      </div>
    </div>
  );
}

function ThermalPreview({ d }: { d: PreviewData }) {
  return (
    <div
      style={{
        fontFamily: '"Courier New", monospace',
        fontSize: 11,
        color: "#000",
        background: "#fff",
        width: 280,
        padding: "12px 10px",
        border: "1px solid #ccc",
      }}
    >
      <div
        style={{
          textAlign: "center",
          borderBottom: "1px dashed #000",
          paddingBottom: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>{d.shopName}</div>
        <div style={{ fontSize: 10 }}>** TAX INVOICE **</div>
        <div style={{ fontSize: 10 }}>Bill: {d.invoiceNo}</div>
        <div style={{ fontSize: 10 }}>Date: {d.date}</div>
      </div>
      <div
        style={{
          fontSize: 10,
          borderBottom: "1px dashed #000",
          paddingBottom: 6,
          marginBottom: 6,
        }}
      >
        Customer: {d.customerName}
      </div>
      <div style={{ fontSize: 10, marginBottom: 8 }}>
        {d.items.map((it, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <div>
              {i + 1}. {it.name}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingLeft: 12,
                fontSize: 10,
              }}
            >
              <span>
                {it.qty} {it.unit} × {inr(it.rate)}
                {it.discount > 0 && ` -${it.discount}%`}
              </span>
              <span>{inr(it.amount)}</span>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{ borderTop: "1px dashed #000", paddingTop: 6, fontSize: 10 }}
      >
        <TotalsBlockThermal d={d} />
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 9,
          marginTop: 10,
          borderTop: "1px dashed #000",
          paddingTop: 6,
        }}
      >
        Thank you! Come again.
        {d.upiId && <div>UPI: {d.upiId}</div>}
      </div>
    </div>
  );
}

// ── Shared totals block ───────────────────────────────────────────────────────

function TotalsBlock({
  d,
  accentColor = "#374151",
  showTotalItems = false,
}: {
  d: PreviewData;
  accentColor?: string;
  showTotalItems?: boolean;
}) {
  const totalQty = d.items.reduce((s, i) => s + i.qty, 0);
  return (
    <div style={{ marginLeft: "auto", width: 200, fontSize: 11 }}>
      {showTotalItems && (
        <div style={{ marginBottom: 4, fontSize: 10, color: "#64748b" }}>
          Total Items / Qty: {d.items.length} / {totalQty.toFixed(3)}
        </div>
      )}
      <Row label="Subtotal" value={inr(d.subtotal)} />
      {d.discountAmt > 0 && (
        <Row
          label="Discount"
          value={`-${inr(d.discountAmt)}`}
          color="#16a34a"
        />
      )}
      {d.igst != null && d.igst > 0 && <Row label="IGST" value={inr(d.igst)} />}
      {d.cgst > 0 && <Row label="CGST" value={inr(d.cgst)} />}
      {d.sgst > 0 && <Row label="SGST" value={inr(d.sgst)} />}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 13,
          borderTop: `2px solid ${accentColor}`,
          paddingTop: 4,
          marginTop: 4,
          color: accentColor,
        }}
      >
        <span>Total</span>
        <span>{inr(d.total)}</span>
      </div>
      {d.amountInWords && (
        <div
          style={{
            fontSize: 9,
            color: "#666",
            marginTop: 4,
            fontStyle: "italic",
          }}
        >
          {d.amountInWords}
        </div>
      )}
      {d.reverseCharge && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "#b91c1c",
            marginTop: 6,
          }}
        >
          Tax is payable on Reverse Charge
        </div>
      )}
    </div>
  );
}

function TotalsBlockThermal({ d }: { d: PreviewData }) {
  return (
    <>
      <ThermalRow label="Subtotal" value={inr(d.subtotal)} />
      {d.discountAmt > 0 && (
        <ThermalRow label="Discount" value={`-${inr(d.discountAmt)}`} />
      )}
      {d.igst != null && d.igst > 0 && <ThermalRow label="IGST" value={inr(d.igst)} />}
      {d.cgst > 0 && <ThermalRow label="CGST" value={inr(d.cgst)} />}
      {d.sgst > 0 && <ThermalRow label="SGST" value={inr(d.sgst)} />}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          borderTop: "1px solid #000",
          paddingTop: 4,
          marginTop: 4,
        }}
      >
        <span>TOTAL</span>
        <span>{inr(d.total)}</span>
      </div>
      <div style={{ fontSize: 9, color: "#555", marginTop: 4 }}>
        {d.amountInWords}
      </div>
      {d.reverseCharge && (
        <div style={{ fontSize: 9, fontWeight: 600, color: "#b91c1c", marginTop: 4 }}>
          Tax is payable on Reverse Charge
        </div>
      )}
    </>
  );
}

function Row({
  label,
  value,
  color = "#111",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 2,
        color,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ThermalRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 2,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ── E-Com (Amazon-style) template ────────────────────────────────────────────
function EcomPreview({ d }: { d: PreviewData }) {
  return (
    <div
      style={{
        fontFamily: '"Amazon Ember", Arial, sans-serif',
        fontSize: 11,
        color: "#0f1111",
        background: "#fff",
        width: 560,
        border: "1px solid #d5d9d9",
        borderRadius: 4,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: "#232f3e",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            color: "#ff9900",
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: -0.5,
          }}
        >
          {d.shopName}
        </div>
        <div style={{ color: "#fff", fontSize: 10, textAlign: "right" }}>
          <div style={{ fontWeight: 600 }}>TAX INVOICE</div>
          <div style={{ color: "#ccc" }}>Order # {d.invoiceNo}</div>
        </div>
      </div>
      {/* Orange accent stripe */}
      <div style={{ height: 3, background: "#ff9900" }} />
      {/* Buyer / Seller info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          borderBottom: "1px solid #e3e6e6",
        }}
      >
        <div style={{ padding: "10px 16px", borderRight: "1px solid #e3e6e6" }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#565959",
              marginBottom: 3,
            }}
          >
            BILL TO
          </div>
          <div style={{ fontWeight: 600 }}>{d.customerName}</div>
          {d.gstin && (
            <div style={{ fontSize: 10, color: "#565959" }}>
              GSTIN: {d.gstin}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 16px" }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#565959",
              marginBottom: 3,
            }}
          >
            ORDER DATE
          </div>
          <div style={{ fontWeight: 600 }}>{d.date}</div>
          <div style={{ fontSize: 10, color: "#565959" }}>
            Invoice: {d.invoiceNo}
          </div>
        </div>
      </div>
      {/* Items */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{ borderBottom: "1px solid #e3e6e6", background: "#f7f8f8" }}
          >
            {["#", "Items Ordered", "Qty", "Unit Price", "Disc", "Total"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "6px 8px",
                    textAlign: ["Unit Price", "Total", "Disc"].includes(h)
                      ? "right"
                      : "left",
                    fontSize: 10,
                    color: "#565959",
                    fontWeight: 700,
                  }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {d.items.map((it, i) => (
            <tr
              key={i}
              style={{
                borderBottom: "1px solid #f0f2f2",
                background: i % 2 === 0 ? "#fff" : "#fafafa",
              }}
            >
              <td style={{ padding: "5px 8px", color: "#888" }}>{i + 1}</td>
              <td style={{ padding: "5px 8px" }}>
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                {it.hsnCode && (
                  <div style={{ fontSize: 9, color: "#888" }}>
                    HSN: {it.hsnCode}
                  </div>
                )}
                <div style={{ fontSize: 9, color: "#ff9900" }}>{it.unit}</div>
              </td>
              <td style={{ padding: "5px 8px", textAlign: "right" }}>
                {it.qty}
              </td>
              <td style={{ padding: "5px 8px", textAlign: "right" }}>
                {inr(it.rate)}
              </td>
              <td
                style={{
                  padding: "5px 8px",
                  textAlign: "right",
                  color: "#b12704",
                }}
              >
                {it.discount > 0 ? `${it.discount}%` : "-"}
              </td>
              <td
                style={{
                  padding: "5px 8px",
                  textAlign: "right",
                  fontWeight: 700,
                }}
              >
                {inr(it.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totals */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "10px 16px 14px",
          borderTop: "1px solid #e3e6e6",
        }}
      >
        <div style={{ minWidth: 210 }}>
          <TotalsBlock d={d} accentColor="#ff9900" />
        </div>
      </div>
      {d.notes && (
        <div
          style={{
            borderTop: "1px solid #e3e6e6",
            padding: "8px 16px",
            fontSize: 10,
            color: "#565959",
          }}
        >
          <b>Note:</b> {d.notes}
        </div>
      )}
    </div>
  );
}

// ── Flipkart-style template ───────────────────────────────────────────────────
function FlipkartPreview({ d }: { d: PreviewData }) {
  const blue = "#2874f0";
  const yellow = "#ffe500";
  return (
    <div
      style={{
        fontFamily: "Roboto, Arial, sans-serif",
        fontSize: 11,
        color: "#212121",
        background: "#fff",
        width: 560,
        borderRadius: 4,
        border: "1px solid #dbdfe4",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: blue,
          padding: "0 0 0 0",
          display: "flex",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            background: blue,
            padding: "10px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              color: yellow,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: -0.5,
            }}
          >
            {d.shopName}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 9,
              marginTop: 1,
            }}
          >
            TAX INVOICE
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            background: yellow,
            padding: "8px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          <div style={{ color: blue, fontWeight: 800, fontSize: 12 }}>
            #{d.invoiceNo}
          </div>
          <div style={{ color: "#333", fontSize: 10 }}>{d.date}</div>
        </div>
      </div>
      {/* Customer bar */}
      <div
        style={{
          background: "#f5f7ff",
          borderBottom: "1px solid #dce6ff",
          padding: "7px 18px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
        }}
      >
        <div>
          <span style={{ color: "#878787" }}>Customer: </span>
          <b>{d.customerName}</b>
        </div>
        {d.gstin && (
          <div>
            <span style={{ color: "#878787" }}>GSTIN: </span>
            <b>{d.gstin}</b>
          </div>
        )}
      </div>
      {/* Items */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", margin: "8px 0" }}
      >
        <thead>
          <tr style={{ borderBottom: `2px solid ${blue}` }}>
            {["#", "Product", "Qty", "Rate", "Disc%", "Amount"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "5px 8px",
                  textAlign: ["Rate", "Amount", "Disc%"].includes(h)
                    ? "right"
                    : "left",
                  fontSize: 10,
                  color: blue,
                  fontWeight: 700,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.items.map((it, i) => (
            <tr
              key={i}
              style={{
                borderBottom: "1px solid #f0f2f5",
                background: i % 2 === 0 ? "#fff" : "#f5f7ff",
              }}
            >
              <td style={{ padding: "4px 8px", color: "#878787" }}>{i + 1}</td>
              <td style={{ padding: "4px 8px" }}>
                <span style={{ fontWeight: 500 }}>{it.name}</span>
                {it.unit && (
                  <span
                    style={{ color: "#878787", marginLeft: 4, fontSize: 10 }}
                  >
                    ({it.unit})
                  </span>
                )}
              </td>
              <td style={{ padding: "4px 8px", textAlign: "right" }}>
                {it.qty}
              </td>
              <td style={{ padding: "4px 8px", textAlign: "right" }}>
                {inr(it.rate)}
              </td>
              <td
                style={{
                  padding: "4px 8px",
                  textAlign: "right",
                  color: "#388e3c",
                }}
              >
                {it.discount > 0 ? `${it.discount}%` : "-"}
              </td>
              <td
                style={{
                  padding: "4px 8px",
                  textAlign: "right",
                  fontWeight: 700,
                  color: blue,
                }}
              >
                {inr(it.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totals */}
      <div
        style={{
          background: "#f5f7ff",
          borderTop: `2px solid ${blue}`,
          padding: "10px 18px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div style={{ minWidth: 200 }}>
          <TotalsBlock d={d} accentColor={blue} />
        </div>
      </div>
      {d.notes && (
        <div
          style={{ padding: "6px 18px 10px", fontSize: 10, color: "#878787" }}
        >
          <b>Remarks:</b> {d.notes}
        </div>
      )}
    </div>
  );
}

// ── Minimal typographic template ──────────────────────────────────────────────
function MinimalPreview({ d }: { d: PreviewData }) {
  const accent = "#6d28d9";
  return (
    <div
      style={{
        fontFamily: '"Georgia", serif',
        fontSize: 11,
        color: "#111",
        background: "#fff",
        width: 560,
        padding: "28px 32px",
      }}
    >
      {/* Shop name */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: -0.5,
          borderBottom: `3px solid ${accent}`,
          paddingBottom: 10,
          marginBottom: 16,
          color: accent,
        }}
      >
        {d.shopName}
      </div>
      {/* Meta row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
          fontSize: 11,
        }}
      >
        <div>
          <div
            style={{
              color: "#888",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Billed To
          </div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{d.customerName}</div>
          {d.gstin && (
            <div style={{ color: "#666", fontSize: 10 }}>GSTIN: {d.gstin}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: "#888",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Invoice
          </div>
          <div style={{ fontWeight: 600, marginTop: 2, color: accent }}>
            {d.invoiceNo}
          </div>
          <div style={{ color: "#666" }}>{d.date}</div>
        </div>
      </div>
      {/* Items */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}
      >
        <thead>
          <tr>
            <th
              colSpan={6}
              style={{
                textAlign: "left",
                fontSize: 8,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#999",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: 4,
              }}
            >
              Items
            </th>
          </tr>
        </thead>
        <tbody>
          {d.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td
                style={{
                  padding: "5px 0",
                  width: 18,
                  color: "#bbb",
                  fontSize: 10,
                }}
              >
                {i + 1}
              </td>
              <td style={{ padding: "5px 4px", fontWeight: 500 }}>{it.name}</td>
              <td
                style={{
                  padding: "5px 4px",
                  color: "#888",
                  textAlign: "right",
                }}
              >
                {it.qty} {it.unit}
              </td>
              <td
                style={{
                  padding: "5px 4px",
                  color: "#888",
                  textAlign: "right",
                }}
              >
                @ {inr(it.rate)}
              </td>
              <td
                style={{
                  padding: "5px 4px",
                  color: "#388e3c",
                  textAlign: "right",
                }}
              >
                {it.discount > 0 ? `−${it.discount}%` : ""}
              </td>
              <td
                style={{
                  padding: "5px 0",
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {inr(it.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ minWidth: 190 }}>
          <TotalsBlock d={d} accentColor={accent} />
        </div>
      </div>
      {d.notes && (
        <div
          style={{
            marginTop: 16,
            borderTop: "1px solid #f3f4f6",
            paddingTop: 10,
            fontSize: 10,
            color: "#888",
            fontStyle: "italic",
          }}
        >
          {d.notes}
        </div>
      )}
    </div>
  );
}

// ── Brand-style preview (Amazon, Tata, DMart, Nike, Instagram, Unilever, Service) ─
const BRAND_COLORS: Record<string, string> = {
  amazon: "#ff9900",
  tata: "#0066b3",
  dmart: "#e31837",
  nike: "#111827",
  instagram: "#e4405f",
  unilever: "#0066b3",
  service: "#059669",
};

const LOGO_LABELS: Record<string, string> = {
  amazon: "a",
  tata: "T",
  dmart: "D",
  nike: "✓",
  instagram: "IG",
  unilever: "U",
  service: "S",
};

function BrandPreview({
  template,
  d,
}: {
  template: TemplateId;
  d: PreviewData;
}) {
  const color = BRAND_COLORS[template] ?? "#374151";
  const logoLabel = LOGO_LABELS[template] ?? d.logoPlaceholder?.charAt(0).toUpperCase() ?? "B";
  const showMrp = template === "dmart" && d.items.some((i) => (i as any).mrp != null);
  const serviceStyle = template === "instagram";
  const headers = serviceStyle
    ? ["#", "Description", "HSN/SAC", "Amount"]
    : showMrp
      ? ["#", "Item", "HSN", "MRP", "Selling Price", "Qty", "Amount"]
      : ["#", "Item", "Qty", "Rate", "Disc", "Amount"];
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: 11,
        color: "#111",
        background: "#fff",
        width: template === "instagram" ? 620 : 560,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {d.themeLabel && (
        <div
          style={{
            textAlign: "center",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            padding: "6px 0",
            borderBottom: template === "dmart" || template === "instagram" ? "none" : "1px solid #f1f5f9",
            background: template === "dmart" || template === "instagram" ? color : "#fff",
            color: template === "dmart" || template === "instagram" ? "#fff" : "#64748b",
          }}
        >
          {d.themeLabel}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 16px 0",
          fontSize: 9,
          color: "#64748b",
        }}
      >
        <span>TAX INVOICE</span>
        <span style={{ color: "#94a3b8" }}>ORIGINAL FOR RECIPIENT</span>
      </div>
      {/* Header with logo */}
      <div
        style={{
          background: color,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 6,
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          {logoLabel}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>
            {d.shopName}
          </div>
          {d.supplierGstin && (
            <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 9 }}>
              GSTIN: {d.supplierGstin}
            </div>
          )}
        </div>
        <div style={{ color: "#fff", textAlign: "right", fontSize: 10 }}>
          <div style={{ fontWeight: 700 }}>Invoice #: {d.invoiceNo}</div>
          <div style={{ opacity: 0.9 }}>Invoice Date: {d.date}</div>
          {d.dueDate && <div style={{ opacity: 0.9 }}>Due Date: {d.dueDate}</div>}
          {d.placeOfSupply && <div style={{ opacity: 0.9 }}>Place of Supply: {d.placeOfSupply}</div>}
        </div>
      </div>
      {/* Bill To / Ship To */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: d.shipToAddress ? "1fr 1fr" : "1fr",
          gap: 0,
          borderBottom: "1px solid #e5e7eb",
          background: "#f8fafc",
        }}
      >
        <div style={{ padding: "10px 16px", borderRight: d.shipToAddress ? "1px solid #e2e8f0" : "none" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>BILL TO</div>
          <div style={{ fontWeight: 600 }}>{d.customerName}</div>
          {d.recipientAddress && <div style={{ fontSize: 10, color: "#64748b" }}>{d.recipientAddress}</div>}
        </div>
        {d.shipToAddress && (
          <div style={{ padding: "10px 16px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>SHIP TO</div>
            <div style={{ fontWeight: 600 }}>{d.customerName}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{d.shipToAddress}</div>
          </div>
        )}
      </div>
      {/* Items */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: serviceStyle ? color : "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  padding: "6px 8px",
                  textAlign: ["Rate", "Amount", "Disc", "MRP", "Selling Price", "Qty"].includes(h) ? "right" : "left",
                  fontSize: 10,
                  color: serviceStyle ? "#fff" : "#475569",
                  fontWeight: 700,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "5px 8px", color: "#94a3b8" }}>{i + 1}</td>
              <td style={{ padding: "5px 8px", whiteSpace: "pre-line" }}>{it.name}</td>
              {serviceStyle ? (
                <>
                  <td style={{ padding: "5px 8px" }}>{(it as any).hsnCode || "-"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{inr(it.amount)}</td>
                </>
              ) : showMrp ? (
                <>
                  <td style={{ padding: "5px 8px" }}>{it.hsnCode || "-"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>
                    {(it as any).mrp != null ? inr((it as any).mrp) : "-"}
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{inr(it.rate)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{it.qty} {it.unit}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{inr(it.amount)}</td>
                </>
              ) : (
                <>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{it.qty} {it.unit}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{inr(it.rate)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{it.discount > 0 ? `${it.discount}%` : "-"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{inr(it.amount)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totals */}
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ minWidth: 200 }}>
          <TotalsBlock d={d} accentColor={color} showTotalItems />
        </div>
      </div>
      {/* For [Brand] + Authorised Signatory */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
          padding: "8px 16px",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <span style={{ fontSize: 9, color: "#64748b" }}>For {d.shopName}</span>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid #cbd5e1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            color: "#94a3b8",
          }}
        >
          ✓
        </div>
      </div>
      <div style={{ padding: "0 16px 4px", fontSize: 7, color: "#94a3b8" }}>Authorised Signatory</div>
      {/* Pay using UPI + QR + Bank Details (matches sample invoice format) */}
      {(d.upiId || (d.bankName && d.bankAccountNo && d.bankIfsc)) && (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 16,
            padding: "12px 16px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          {d.upiId && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Pay using UPI</div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&margin=2&data=${encodeURIComponent(
                  `upi://pay?pa=${encodeURIComponent(d.upiId)}&pn=${encodeURIComponent(d.shopName)}&am=${d.total.toFixed(2)}&cu=INR`
                )}`}
                alt="UPI QR"
                style={{ width: 64, height: 64, background: "#fff", borderRadius: 4 }}
              />
            </div>
          )}
          {d.bankName && d.bankAccountNo && d.bankIfsc && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Bank Details</div>
              <div style={{ fontSize: 10 }}>Bank: {d.bankName}</div>
              <div style={{ fontSize: 10 }}>Account #: {d.bankAccountNo}</div>
              <div style={{ fontSize: 10 }}>IFSC: {d.bankIfsc}</div>
              {d.bankBranch && <div style={{ fontSize: 10 }}>Branch: {d.bankBranch}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function InvoiceTemplatePreview({
  template,
  data,
}: {
  template: TemplateId;
  data: PreviewData;
}) {
  return (
    <div
      style={{
        overflow: "hidden",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        margin: 0,
        padding: 0,
        borderRadius: 12,
      }}
    >
      {template === "classic" && <ClassicPreview d={data} />}
      {template === "modern" && <ModernPreview d={data} />}
      {template === "vyapari" && <VyapariPreview d={data} />}
      {template === "thermal" && <ThermalPreview d={data} />}
      {template === "ecom" && <EcomPreview d={data} />}
      {template === "flipkart" && <FlipkartPreview d={data} />}
      {template === "minimal" && <MinimalPreview d={data} />}
      {(template === "amazon" || template === "tata" || template === "dmart" || template === "nike" || template === "instagram" || template === "unilever" || template === "service") && (
        <BrandPreview template={template} d={data} />
      )}
    </div>
  );
}

/** Tiny thumbnail card (used in template picker) */
export function TemplateThumbnail({
  template,
  selected,
  onClick,
}: {
  template: (typeof TEMPLATES)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center rounded-xl border-2 p-2 gap-1.5 transition-all
        ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
    >
      {/* Mini visual strip */}
      <div
        className="w-full h-9 rounded-lg flex flex-col overflow-hidden"
        style={{ background: selected ? template.color + "15" : "#f8f9fa" }}
      >
        <div
          className="h-2.5 w-full rounded-t-lg"
          style={{ background: template.color }}
        />
        <div className="flex-1 flex items-center justify-center gap-1 px-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-0.5 rounded"
              style={{
                background: template.color + "66",
                flex: i === 2 ? 2 : 1,
              }}
            />
          ))}
        </div>
      </div>
      <div className="text-center">
        <div
          className={`text-[11px] font-semibold ${selected ? "text-primary" : "text-foreground"}`}
        >
          {template.label}
        </div>
        <div className="text-[9px] text-muted-foreground leading-tight">
          {template.desc}
        </div>
      </div>
      {selected && (
        <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-primary flex items-center justify-center">
          <svg viewBox="0 0 12 12" fill="none" className="h-2 w-2 text-white">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
