import PDFDocument from 'pdfkit';
import { logger } from './logger';

export interface InvoicePdfData {
  invoiceNo:    string;
  invoiceId:    string;
  invoiceDate:  Date;
  customerName: string;
  shopName:     string;
  supplyType?:  'INTRASTATE' | 'INTERSTATE';
  items: Array<{
    productName: string;
    hsnCode?:    string | null;
    quantity:    number;
    unit:        string;
    unitPrice:   number;     // price before tax
    subtotal:    number;     // unitPrice × qty  (taxable value)
    gstRate?:    number;     // GST slab %
    cgst?:       number;
    sgst?:       number;
    igst?:       number;
    cess?:       number;
    totalTax?:   number;
    total:       number;     // subtotal + tax
  }>;
  // Invoice-level GST totals
  subtotal:    number;
  totalCgst?:  number;
  totalSgst?:  number;
  totalIgst?:  number;
  totalCess?:  number;
  totalTax?:   number;
  grandTotal?: number;
  notes?:      string;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const INR = (n: number) => `INR ${n.toFixed(2)}`;

// ── Amount in words (Indian numbering: Lakh / Crore) ─────────────────────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
              'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
              'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')).trim();
}

function toIndianWords(n: number): string {
  if (n === 0) return 'Zero';
  let result = '';
  if (n >= 1_00_00_000) {
    result += toIndianWords(Math.floor(n / 1_00_00_000)) + ' Crore ';
    n %= 1_00_00_000;
  }
  if (n >= 1_00_000) {
    result += toIndianWords(Math.floor(n / 1_00_000)) + ' Lakh ';
    n %= 1_00_000;
  }
  if (n >= 1_000) {
    result += toIndianWords(Math.floor(n / 1_000)) + ' Thousand ';
    n %= 1_000;
  }
  if (n >= 100) {
    result += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n > 0) result += twoDigitWords(n);
  return result.trim();
}

function amountToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let words = 'Rupees ' + toIndianWords(rupees);
  if (paise > 0) words += ' and ' + toIndianWords(paise) + ' Paise';
  return words + ' Only';
}

/**
 * Generate a GST-compliant PDF invoice as a Buffer using PDFKit.
 * Supports both INTRASTATE (CGST+SGST) and INTERSTATE (IGST) supplies.
 */
export function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc    = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data',  (chunk: Buffer) => chunks.push(chunk));
      doc.on('end',   ()              => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const dateStr = data.invoiceDate.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      const isInterstate = data.supplyType === 'INTERSTATE';
      const hasTax       = (data.totalTax ?? 0) > 0;
      const grandTotal   = data.grandTotal ?? data.subtotal;
      const pageLeft     = 50;
      const pageWidth    = 495;
      const pageRight    = pageLeft + pageWidth;

      // ── Header ─────────────────────────────────────────────────────────────
      doc.fillColor('#0f172a').rect(pageLeft, 48, pageWidth, 78).fill();

      doc
        .fillColor('#f8fafc')
        .fontSize(20).font('Helvetica-Bold')
        .text(data.shopName, 65, 64, { width: 280 });

      doc
        .fontSize(9).font('Helvetica')
        .fillColor('#cbd5e1')
        .text('Thank you for your purchase', 65, 90);

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(hasTax ? 'TAX INVOICE' : 'INVOICE', 350, 60, { width: 185, align: 'right' });

      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#d1d5db')
        .text(`No: ${data.invoiceNo}`, 350, 84, { width: 185, align: 'right' })
        .text(`Date: ${dateStr}`, 350, 98, { width: 185, align: 'right' });

      // ── Invoice meta cards ─────────────────────────────────────────────────
      const infoTop = 142;
      doc.fillColor('#f8fafc').roundedRect(pageLeft, infoTop, 242, 56, 6).fill();
      doc.fillColor('#f8fafc').roundedRect(303, infoTop, 242, 56, 6).fill();

      doc
        .fillColor('#334155')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Bill To', 62, infoTop + 8)
        .text('Invoice Details', 315, infoTop + 8);

      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(data.customerName, 62, infoTop + 23, { width: 220 });

      doc
        .fillColor('#0f172a')
        .fontSize(8.5)
        .font('Helvetica')
        .text(hasTax ? 'Type: GST Invoice' : 'Type: Retail Invoice', 315, infoTop + 23, { width: 220 });

      if (hasTax) {
        doc.text(
          `Supply: ${isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}`,
          315,
          infoTop + 37,
          { width: 220 }
        );
      }

      // ── Items table ─────────────────────────────────────────────────────────
      // Columns: Product | HSN | Qty | Rate | Taxable | GST% | Tax | Total
      const col = {
        product:  62,
        hsn:     188,
        qty:     240,
        rate:    272,
        taxable: 334,
        gstPct:  398,
        tax:     434,
        total:   479,
      };
      const tableTop = 214;

      doc.fillColor('#1e293b').roundedRect(pageLeft, tableTop, pageWidth, 22, 4).fill();
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

      doc.text('Product',  col.product, tableTop + 7, { width: 120 });
      doc.text('HSN',      col.hsn,     tableTop + 7, { width: 46, align: 'center' });
      doc.text('Qty',      col.qty,     tableTop + 7, { width: 30, align: 'center' });
      doc.text('Rate',     col.rate,    tableTop + 7, { width: 56, align: 'right' });
      doc.text('Taxable',  col.taxable, tableTop + 7, { width: 58, align: 'right' });
      doc.text('GST%',     col.gstPct,  tableTop + 7, { width: 34, align: 'center' });
      doc.text('Tax',      col.tax,     tableTop + 7, { width: 46, align: 'right' });
      doc.text('Total',    col.total,   tableTop + 7, { width: 56, align: 'right' });

      // ── Item rows ───────────────────────────────────────────────────────────
      let y = tableTop + 28;

      data.items.forEach((item, idx) => {
        const rowH = 19;
        if (idx % 2 === 0) {
          doc.fillColor('#f8fafc').rect(pageLeft, y - 4, pageWidth, rowH).fill();
        }

        const gstPctLabel = item.gstRate !== undefined
          ? (item.gstRate === 0 ? 'Exempt' : `${item.gstRate}%`)
          : '-';

        const taxAmt = item.totalTax ?? 0;

        doc.fillColor('#111827').fontSize(8).font('Helvetica');
        doc.text(item.productName,          col.product, y, { width: 120 });
        doc.text(item.hsnCode ?? '-',       col.hsn,     y, { width: 46, align: 'center' });
        doc.text(String(item.quantity),     col.qty,     y, { width: 30, align: 'center' });
        doc.text(INR(item.unitPrice),       col.rate,    y, { width: 56, align: 'right' });
        doc.text(INR(item.subtotal),        col.taxable, y, { width: 58, align: 'right' });
        doc.text(gstPctLabel,               col.gstPct,  y, { width: 34, align: 'center' });
        doc.text(taxAmt > 0 ? INR(taxAmt) : '-',
                                            col.tax,     y, { width: 46, align: 'right' });
        doc.text(INR(item.total),           col.total,   y, { width: 56, align: 'right' });

        doc
          .strokeColor('#e2e8f0')
          .lineWidth(0.4)
          .moveTo(pageLeft, y + 13)
          .lineTo(pageRight, y + 13)
          .stroke();

        y += rowH;
      });

      // ── Divider ─────────────────────────────────────────────────────────────
      doc.strokeColor('#0f172a').lineWidth(0.8)
        .moveTo(pageLeft, y + 5).lineTo(pageRight, y + 5).stroke();

      y += 14;

      // ── Tax summary box ─────────────────────────────────────────────────────
      if (hasTax) {
        const summaryX  = 316;
        const summaryW  = 229;
        const rowHt     = 16;
        const labelX    = summaryX + 8;
        const innerW    = summaryW - 16;

        const rows: Array<[string, number, boolean]> = [
          ['Taxable Amount', data.subtotal, false],
        ];

        if (isInterstate) {
          rows.push(['IGST', data.totalIgst ?? 0, false]);
        } else {
          rows.push(['CGST', data.totalCgst ?? 0, false]);
          rows.push(['SGST', data.totalSgst ?? 0, false]);
        }

        if ((data.totalCess ?? 0) > 0) {
          rows.push(['CESS', data.totalCess ?? 0, false]);
        }

        rows.push(['Total Tax', data.totalTax ?? 0, false]);
        rows.push(['Grand Total', grandTotal, true]);

        const boxH = rows.length * rowHt + 6;
        doc.fillColor('#f8fafc').roundedRect(summaryX, y, summaryW, boxH, 6).fill();
        doc.strokeColor('#cbd5e1').lineWidth(0.6).roundedRect(summaryX, y, summaryW, boxH, 6).stroke();

        let sy = y + 4;
        rows.forEach(([label, value, isBold]) => {
          const isGrandTotal = label === 'Grand Total';

          if (isGrandTotal) {
            doc.fillColor('#0f766e').rect(summaryX, sy - 1, summaryW, rowHt + 2).fill();
          }

          doc
            .fillColor(isGrandTotal ? '#ffffff' : '#212529')
            .fontSize(isGrandTotal ? 10 : 8.5)
            .font(isBold ? 'Helvetica-Bold' : 'Helvetica');

          doc.text(label,       labelX, sy, { width: 110,    lineBreak: false });
          doc.text(INR(value),  labelX, sy, { width: innerW, align: 'right', lineBreak: false });

          // hairline between rows
          if (!isGrandTotal) {
            doc.strokeColor('#e2e8f0').lineWidth(0.3)
              .moveTo(summaryX, sy + rowHt - 2)
              .lineTo(summaryX + summaryW, sy + rowHt - 2)
              .stroke();
          }

          sy += rowHt;
        });

        y = sy + 10;
      } else {
        // No tax — simple grand total
        doc.fillColor('#f1f5f9').roundedRect(350, y, 195, 28, 6).fill();
        doc
          .fillColor('#0f172a')
          .fontSize(10).font('Helvetica-Bold')
          .text('Grand Total', 360, y + 8, { width: 90 });
        doc
          .fontSize(11)
          .text(INR(grandTotal), 360, y + 8, { width: 175, align: 'right' });

        y += 40;
      }

      // ── GST component breakdown (INTRASTATE only, informational) ───────────
      if (hasTax && !isInterstate && (data.totalCgst ?? 0) > 0) {
        y += 4;
        doc
          .fillColor('#6c757d')
          .fontSize(7.5).font('Helvetica')
          .text(
            `CGST @ ${((data.totalCgst ?? 0) / data.subtotal * 100).toFixed(1)}%  =  ${INR(data.totalCgst ?? 0)}   |   ` +
            `SGST @ ${((data.totalSgst ?? 0) / data.subtotal * 100).toFixed(1)}%  =  ${INR(data.totalSgst ?? 0)}`,
            62, y
          );
        y += 14;
      }

      // ── Amount in words ──────────────────────────────────────────────────────
      doc.fillColor('#f8fafc').roundedRect(pageLeft, y + 2, pageWidth, 34, 6).fill();
      doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold')
        .text('Amount in words', 62, y + 10, { width: 120 });
      doc.fillColor('#0f172a').font('Helvetica')
        .text(amountToWords(grandTotal), 150, y + 10, { width: 385 });
      y += 42;

      // ── Notes ────────────────────────────────────────────────────────────────
      if (data.notes) {
        doc.fillColor('#fff7ed').roundedRect(pageLeft, y + 1, pageWidth, 28, 5).fill();
        doc
          .fillColor('#7c2d12')
          .fontSize(8.5)
          .font('Helvetica')
          .text(`Notes: ${data.notes}`, 62, y + 10, { width: 470 });
        y += 34;
      }

      // ── Signature / declaration ────────────────────────────────────────────
      const signTop = Math.max(y + 6, 648);
      doc.strokeColor('#cbd5e1').lineWidth(0.7).roundedRect(pageLeft, signTop, pageWidth, 74, 6).stroke();
      doc
        .fillColor('#475569')
        .fontSize(8)
        .font('Helvetica')
        .text('Declaration: Goods once sold will not be taken back or exchanged.', 62, signTop + 10, { width: 300 })
        .text('Certified that the particulars given above are true and correct.', 62, signTop + 24, { width: 300 });
      doc
        .fillColor('#0f172a')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(`for ${data.shopName}`, 390, signTop + 30, { width: 140, align: 'center' });
      doc
        .strokeColor('#94a3b8')
        .lineWidth(0.6)
        .moveTo(390, signTop + 50)
        .lineTo(530, signTop + 50)
        .stroke();
      doc
        .fillColor('#64748b')
        .fontSize(7.5)
        .font('Helvetica')
        .text('Authorised Signatory', 390, signTop + 54, { width: 140, align: 'center' });

      // ── Footer ───────────────────────────────────────────────────────────────
      doc
        .fillColor('#94a3b8')
        .fontSize(7.5).font('Helvetica')
        .text(
          `Generated by Execora  •  ${data.invoiceNo}  •  ${dateStr}  •  This is a computer-generated invoice.`,
          50, 760,
          { align: 'center', width: 495 }
        );

      doc.end();

      logger.debug({ invoiceNo: data.invoiceNo }, 'GST invoice PDF generated');
    } catch (err) {
      logger.error({ err }, 'PDF generation failed');
      reject(err);
    }
  });
}
