/**
 * InvoiceTemplatePreview
 * Renders a visual preview of the invoice in one of 4 Indian-standard invoice templates.
 * Used in ClassicBilling to let users see how their bill will look.
 */
import React from "react";

export type TemplateId = "classic" | "modern" | "vyapari" | "thermal";

export const TEMPLATES: Array<{
  id: TemplateId;
  label: string;
  desc: string;
  color: string;
}> = [
  {
    id: "classic",
    label: "Classic",
    desc: "Traditional B&W invoice",
    color: "#374151",
  },
  {
    id: "modern",
    label: "Modern",
    desc: "Clean blue professional",
    color: "#1e40af",
  },
  {
    id: "vyapari",
    label: "Vyapari",
    desc: "Indian market style",
    color: "#c2410c",
  },
  {
    id: "thermal",
    label: "Thermal",
    desc: "80mm receipt format",
    color: "#111827",
  },
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
  items: PreviewItem[];
  subtotal: number;
  discountAmt: number;
  cgst: number;
  sgst: number;
  total: number;
  amountInWords: string;
  paymentMode?: string;
  notes?: string;
  upiId?: string;
  gstin?: string;
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
}: {
  d: PreviewData;
  accentColor?: string;
}) {
  return (
    <div style={{ marginLeft: "auto", width: 200, fontSize: 11 }}>
      <Row label="Subtotal" value={inr(d.subtotal)} />
      {d.discountAmt > 0 && (
        <Row
          label="Discount"
          value={`-${inr(d.discountAmt)}`}
          color="#16a34a"
        />
      )}
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
        justifyContent: "center",
      }}
    >
      {template === "classic" && <ClassicPreview d={data} />}
      {template === "modern" && <ModernPreview d={data} />}
      {template === "vyapari" && <VyapariPreview d={data} />}
      {template === "thermal" && <ThermalPreview d={data} />}
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
