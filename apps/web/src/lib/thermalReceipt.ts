/**
 * GAP-5: Thermal Receipt Printer
 * Opens a popup window with 58mm/80mm receipt HTML and triggers window.print().
 * Browser-based: no server call needed. Works with Bluetooth/USB thermal printers
 * via the OS print dialog (select the thermal printer, correct paper size).
 *
 * Usage:
 *   printThermalReceipt({ shopName, invoiceNo, items, ... })
 */

export interface ThermalReceiptItem {
  name: string;
  qty: number;
  rate: number;
  discountPct: number;
  amount: number; // after discount, before GST
  gstRate?: number; // 0 | 5 | 12 | 18 | 28
}

export interface ThermalGstSlab {
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
}

export interface ThermalPayment {
  mode: 'cash' | 'upi' | 'card' | 'credit' | string;
  amount: number;
}

export interface ThermalReceiptData {
  shopName: string;
  shopPhone?: string;
  shopGstin?: string;
  shopAddress?: string;
  invoiceNo: string;
  date: string; // formatted string
  customerName: string;
  items: ThermalReceiptItem[];
  // Totals
  subtotal: number;         // sum of item amounts (taxable)
  discountAmt: number;      // bill-level discount amount
  taxableAmt: number;       // after bill discount
  withGst: boolean;
  compositionScheme: boolean;
  compositionTax?: number;  // 1% flat for composition
  gstSlabs: ThermalGstSlab[]; // per-slab breakdown (empty if no GST or composition)
  totalGst: number;
  grandTotal: number;
  roundOff: number;
  finalTotal: number;
  amountInWords: string;
  payments: ThermalPayment[];
  notes?: string;
  width?: 58 | 80; // mm, default 80
}

const MODE_LABEL: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  credit: 'Credit (Udhari)',
};

const INR = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Pad string left with spaces to fill `width` chars */
function padL(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : ' '.repeat(w - s.length) + s;
}

/** Truncate / pad right to exact `width` */
function padR(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length);
}

function dashedLine(chars: number): string {
  return '-'.repeat(chars);
}

/**
 * Build the complete receipt as an HTML string.
 * Uses monospace font + @page CSS for thermal paper sizes.
 */
function buildReceiptHtml(data: ThermalReceiptData): string {
  const mm = data.width ?? 80;
  // chars per line: 58mm ≈ 32 chars, 80mm ≈ 48 chars (at ~9pt Courier)
  const cols = mm === 58 ? 32 : 48;
  const half = Math.floor(cols / 2);

  const hr = dashedLine(cols);

  // ── Header ──────────────────────────────────────────────────────────────────
  const lines: string[] = [];

  // Shop name — centered
  const centred = (s: string) => {
    const pad = Math.max(0, Math.floor((cols - s.length) / 2));
    return ' '.repeat(pad) + s;
  };

  lines.push(centred(data.shopName.toUpperCase().slice(0, cols)));
  if (data.shopAddress) {
    lines.push(centred(data.shopAddress.slice(0, cols)));
  }
  if (data.shopPhone) {
    lines.push(centred(`Ph: ${data.shopPhone}`));
  }
  if (data.shopGstin) {
    lines.push(centred(`GSTIN: ${data.shopGstin}`));
  }
  lines.push(hr);

  // Invoice details
  const invRight = padL(data.invoiceNo, cols - 4);
  lines.push(`INV:${invRight}`);
  const dateRight = padL(data.date, cols - 5);
  lines.push(`DATE:${dateRight}`);
  lines.push(`CUST: ${data.customerName.slice(0, cols - 6)}`);
  lines.push(hr);

  // ── Column header ────────────────────────────────────────────────────────────
  // Layout: Item | Qty | Amount  (rate/disc shown in sub-line)
  const amtW = 9;
  const itemW = cols - amtW - 1;
  lines.push(padR('ITEM', itemW) + ' ' + padL('AMT', amtW));
  lines.push(hr);

  // ── Items ────────────────────────────────────────────────────────────────────
  for (const item of data.items) {
    // Line 1: Name truncated, right-aligned amount
    const nameStr = item.name.slice(0, itemW);
    const amtStr = padL(`${INR(item.amount)}`, amtW);
    lines.push(padR(nameStr, itemW) + ' ' + amtStr);

    // Line 2: Qty × Rate (discount if any)
    let detailStr = `  ${item.qty} x ${INR(item.rate)}`;
    if (item.discountPct > 0) {
      detailStr += ` (-${item.discountPct}%)`;
    }
    if (item.gstRate !== undefined && item.gstRate > 0) {
      detailStr += ` GST:${item.gstRate}%`;
    }
    lines.push(detailStr.slice(0, cols));
  }

  lines.push(hr);

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totalRow = (label: string, value: string, bold = false) => {
    const lw = cols - amtW - 1;
    const l = padR((bold ? '' : '  ') + label, lw);
    const r = padL(value, amtW);
    return l + ' ' + r;
  };

  if (data.discountAmt > 0) {
    lines.push(totalRow('Subtotal', `${INR(data.subtotal)}`));
    lines.push(totalRow('Discount', `-${INR(data.discountAmt)}`));
  }

  if (data.withGst) {
    lines.push(totalRow('Taxable', `${INR(data.taxableAmt)}`));

    if (data.compositionScheme) {
      lines.push(totalRow('Composition Tax (1%)', `${INR(data.compositionTax ?? 0)}`));
    } else {
      for (const slab of data.gstSlabs) {
        if (slab.rate === 0) continue;
        lines.push(totalRow(`CGST ${slab.rate / 2}%`, `${INR(slab.cgst)}`));
        lines.push(totalRow(`SGST ${slab.rate / 2}%`, `${INR(slab.sgst)}`));
      }
    }

    lines.push(totalRow('Total Tax', `${INR(data.totalGst)}`));
  }

  if (data.roundOff !== 0) {
    lines.push(totalRow('Round Off', `${data.roundOff > 0 ? '+' : ''}${INR(data.roundOff)}`));
  }

  lines.push(dashedLine(cols));
  lines.push(totalRow('TOTAL', `${INR(data.finalTotal)}`, true));
  lines.push(dashedLine(cols));

  // ── Payment mode(s) ──────────────────────────────────────────────────────────
  for (const p of data.payments) {
    if (p.amount > 0) {
      lines.push(totalRow(MODE_LABEL[p.mode] ?? p.mode, `${INR(p.amount)}`));
    }
  }

  lines.push(hr);

  // ── Amount in words ──────────────────────────────────────────────────────────
  // Wrap to cols
  const words = data.amountInWords;
  for (let i = 0; i < words.length; i += cols) {
    lines.push(words.slice(i, i + cols));
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (data.notes) {
    lines.push(hr);
    lines.push('NOTE:');
    for (let i = 0; i < data.notes.length; i += cols) {
      lines.push(data.notes.slice(i, i + cols));
    }
  }

  lines.push(hr);
  lines.push(centred('Thank you! Visit again.'));
  lines.push(centred('Powered by Execora'));
  // Feed lines at bottom for cutter
  lines.push('');
  lines.push('');

  // ── HTML wrapper ─────────────────────────────────────────────────────────────
  const bodyText = lines.join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt ${data.invoiceNo}</title>
<style>
  @page {
    size: ${mm}mm auto;
    margin: 2mm 2mm 6mm 2mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${mm === 58 ? '7.5pt' : '8.5pt'};
    line-height: 1.35;
    width: ${mm - 4}mm;
    color: #000;
    background: #fff;
  }
  pre {
    white-space: pre-wrap;
    word-break: break-all;
  }
  @media screen {
    body {
      padding: 12px;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
    }
    .receipt {
      background: #fff;
      padding: 10px 8px;
      box-shadow: 0 0 8px rgba(0,0,0,0.15);
      width: ${mm + 4}mm;
    }
  }
  @media print {
    .no-print { display: none !important; }
    body { background: #fff; padding: 0; width: ${mm - 4}mm; }
    .receipt { box-shadow: none; padding: 0; width: 100%; }
  }
</style>
</head>
<body>
<div class="receipt">
<div class="no-print" style="text-align:center;padding:8px 0 12px;font-family:sans-serif;font-size:12px;color:#555;">
  <strong>Receipt Preview</strong> &mdash; ${mm}mm
  &nbsp;&nbsp;
  <button onclick="window.print()" style="padding:4px 14px;background:#16a34a;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
    🖨 Print
  </button>
  &nbsp;
  <button onclick="window.close()" style="padding:4px 10px;background:#e5e7eb;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
    Close
  </button>
</div>
<pre>${bodyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</div>
</body>
</html>`;
}

/**
 * Open a popup window with the thermal receipt and trigger print.
 * The window includes a "Print" button for manual triggering.
 */
export function printThermalReceipt(data: ThermalReceiptData): void {
  const html = buildReceiptHtml(data);
  const mm = data.width ?? 80;
  const winW = mm === 58 ? 280 : 360;

  const win = window.open('', '_blank', `width=${winW},height=700,scrollbars=yes,resizable=yes`);
  if (!win) {
    alert('Popup blocked. Please allow popups for this site to print receipts.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
