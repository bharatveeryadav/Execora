/**
 * Thermal receipt HTML for PDF generation (Sprint 17).
 * Used with expo-print → share sheet. BLE ESC/POS can be added later.
 */
import type { ThermalConfig } from "./thermalSettings";

export interface ReceiptItem {
  name: string;
  qty: number;
  rate: number;
  discountPct: number;
  amount: number;
}

export interface ReceiptData {
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmt: number;
  taxableAmt: number;
  withGst: boolean;
  totalGst: number;
  grandTotal: number;
  roundOff: number;
  finalTotal: number;
  amountInWords: string;
  payments: Array<{ mode: string; amount: number }>;
  notes?: string;
}

const INR = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function padL(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : " ".repeat(w - s.length) + s;
}

function padR(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length);
}

function centred(s: string, cols: number): string {
  const pad = Math.max(0, Math.floor((cols - s.length) / 2));
  return " ".repeat(pad) + s;
}

export function buildReceiptHtml(data: ReceiptData, config: ThermalConfig): string {
  const mm = config.width;
  const cols = mm === 58 ? 32 : 48;
  const amtW = 9;
  const itemW = cols - amtW - 1;
  const hr = "-".repeat(cols);
  const footer = config.footer || "Thank you! Visit again.";

  const lines: string[] = [];

  if (config.header) {
    lines.push(centred(config.header.slice(0, cols), cols));
    lines.push(hr);
  }
  lines.push(centred(data.shopName.toUpperCase().slice(0, cols), cols));
  if (data.shopAddress) lines.push(centred(data.shopAddress.slice(0, cols), cols));
  if (data.shopPhone) lines.push(centred(`Ph: ${data.shopPhone}`, cols));
  lines.push(hr);

  lines.push(`INV:${padL(data.invoiceNo, cols - 4)}`);
  lines.push(`DATE:${padL(data.date, cols - 5)}`);
  lines.push(`CUST: ${data.customerName.slice(0, cols - 6)}`);
  lines.push(hr);

  lines.push(padR("ITEM", itemW) + " " + padL("AMT", amtW));
  lines.push(hr);

  for (const item of data.items) {
    lines.push(padR(item.name.slice(0, itemW), itemW) + " " + padL(INR(item.amount), amtW));
    let detail = `  ${item.qty} x ${INR(item.rate)}`;
    if (item.discountPct > 0) detail += ` (-${item.discountPct}%)`;
    lines.push(detail.slice(0, cols));
  }

  lines.push(hr);

  const totalRow = (label: string, value: string) =>
    padR("  " + label, itemW) + " " + padL(value, amtW);

  if (data.discountAmt > 0) {
    lines.push(totalRow("Subtotal", INR(data.subtotal)));
    lines.push(totalRow("Discount", `-${INR(data.discountAmt)}`));
  }
  if (data.withGst) {
    lines.push(totalRow("Taxable", INR(data.taxableAmt)));
    lines.push(totalRow("Total Tax", INR(data.totalGst)));
  }
  if (data.roundOff !== 0) {
    lines.push(totalRow("Round Off", `${data.roundOff > 0 ? "+" : ""}${INR(data.roundOff)}`));
  }
  lines.push(hr);
  lines.push(padR("TOTAL", itemW) + " " + padL(INR(data.finalTotal), amtW));
  lines.push(hr);

  for (const p of data.payments) {
    if (p.amount > 0) lines.push(totalRow(p.mode, INR(p.amount)));
  }
  lines.push(hr);

  for (let i = 0; i < data.amountInWords.length; i += cols) {
    lines.push(data.amountInWords.slice(i, i + cols));
  }
  if (data.notes) {
    lines.push(hr);
    lines.push("NOTE:");
    for (let i = 0; i < data.notes.length; i += cols) {
      lines.push(data.notes.slice(i, i + cols));
    }
  }
  lines.push(hr);
  lines.push(centred(footer, cols));
  lines.push(centred("Powered by Execora", cols));
  lines.push("");
  lines.push("");

  const bodyText = lines.join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt ${data.invoiceNo}</title>
<style>
  @page { size: ${mm}mm auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${mm === 58 ? "7.5pt" : "8.5pt"};
    line-height: 1.35;
    white-space: pre;
    padding: 4px;
  }
</style>
</head>
<body>${bodyText.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</body>
</html>`;
}
