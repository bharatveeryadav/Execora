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
const INR = (n: number) => `Rs.${n.toFixed(2)}`;

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

      const dateStr    = data.invoiceDate.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      const isInterstate = data.supplyType === 'INTERSTATE';
      const hasTax       = (data.totalTax ?? 0) > 0;
      const grandTotal   = data.grandTotal ?? data.subtotal;

      // ── Header bar ─────────────────────────────────────────────────────────
      doc.fillColor('#28a745').rect(50, 50, 495, 65).fill();

      doc
        .fillColor('#ffffff')
        .fontSize(22).font('Helvetica-Bold')
        .text(data.shopName, 65, 60);

      doc
        .fontSize(9).font('Helvetica')
        .text(hasTax ? 'GST Tax Invoice' : 'Invoice', 65, 87);

      doc
        .fontSize(11).font('Helvetica-Bold')
        .text(data.invoiceNo, 370, 60, { align: 'right', width: 165 });

      doc
        .fontSize(9).font('Helvetica')
        .text(dateStr, 370, 78, { align: 'right', width: 165 });

      // Supply type line — only meaningful when GST is applied
      if (hasTax) {
        doc
          .fontSize(8)
          .text(`Supply: ${isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}`,
            370, 93, { align: 'right', width: 165 });
      }

      // ── Customer block ──────────────────────────────────────────────────────
      doc.fillColor('#f8f9fa').rect(50, 128, 495, 36).fill();

      doc
        .fillColor('#333333')
        .fontSize(9).font('Helvetica-Bold')
        .text('Bill To:', 65, 138);

      doc
        .font('Helvetica').fontSize(11)
        .text(data.customerName, 118, 138);

      // ── Items table ─────────────────────────────────────────────────────────
      // Columns: Product | HSN | Qty | Rate | Taxable | GST% | Tax | Total
      //    left edges:
      const col = {
        product:  65,
        hsn:     185,
        qty:     238,
        rate:    272,
        taxable: 330,
        gstPct:  390,
        tax:     428,
        total:   476,
      };
      const tableTop = 178;

      doc.fillColor('#343a40').rect(50, tableTop, 495, 20).fill();
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

      doc.text('Product / Description', col.product, tableTop + 5, { width: 115 });
      doc.text('HSN',      col.hsn,     tableTop + 5, { width: 48, align: 'center' });
      doc.text('Qty',      col.qty,     tableTop + 5, { width: 30, align: 'center' });
      doc.text('Rate',     col.rate,    tableTop + 5, { width: 54, align: 'right'  });
      doc.text('Taxable',  col.taxable, tableTop + 5, { width: 56, align: 'right'  });
      doc.text('GST%',     col.gstPct,  tableTop + 5, { width: 34, align: 'center' });
      doc.text('Tax',      col.tax,     tableTop + 5, { width: 44, align: 'right'  });
      doc.text('Total',    col.total,   tableTop + 5, { width: 64, align: 'right'  });

      // ── Item rows ───────────────────────────────────────────────────────────
      let y = tableTop + 26;

      data.items.forEach((item, idx) => {
        const rowH = 18;
        if (idx % 2 === 0) {
          doc.fillColor('#f8f9fa').rect(50, y - 3, 495, rowH).fill();
        }

        const gstPctLabel = item.gstRate !== undefined
          ? (item.gstRate === 0 ? 'Exempt' : `${item.gstRate}%`)
          : '-';

        const taxAmt = item.totalTax ?? 0;

        doc.fillColor('#212529').fontSize(8).font('Helvetica');
        doc.text(item.productName,          col.product, y, { width: 115 });
        doc.text(item.hsnCode ?? '-',       col.hsn,     y, { width: 48,  align: 'center' });
        doc.text(String(item.quantity),     col.qty,     y, { width: 30,  align: 'center' });
        doc.text(INR(item.unitPrice),       col.rate,    y, { width: 54,  align: 'right'  });
        doc.text(INR(item.subtotal),        col.taxable, y, { width: 56,  align: 'right'  });
        doc.text(gstPctLabel,               col.gstPct,  y, { width: 34,  align: 'center' });
        doc.text(taxAmt > 0 ? INR(taxAmt) : '-',
                                            col.tax,     y, { width: 44,  align: 'right'  });
        doc.text(INR(item.total),           col.total,   y, { width: 64,  align: 'right'  });

        y += rowH;
      });

      // ── Divider ─────────────────────────────────────────────────────────────
      doc.strokeColor('#28a745').lineWidth(1)
        .moveTo(50, y + 4).lineTo(545, y + 4).stroke();

      y += 14;

      // ── Tax summary box ─────────────────────────────────────────────────────
      if (hasTax) {
        const summaryX  = 320;
        const summaryW  = 225;
        const rowHt     = 16;
        const labelX    = summaryX + 8;
        const innerW    = summaryW - 16;   // usable width inside box (8px padding each side)

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
        doc.fillColor('#f0fff0').rect(summaryX, y, summaryW, boxH).fill();
        doc.strokeColor('#28a745').lineWidth(0.5).rect(summaryX, y, summaryW, boxH).stroke();

        let sy = y + 4;
        rows.forEach(([label, value, isBold]) => {
          const isGrandTotal = label === 'Grand Total';

          if (isGrandTotal) {
            doc.fillColor('#28a745').rect(summaryX, sy - 1, summaryW, rowHt + 2).fill();
          }

          doc
            .fillColor(isGrandTotal ? '#ffffff' : '#212529')
            .fontSize(isGrandTotal ? 10 : 8.5)
            .font(isBold ? 'Helvetica-Bold' : 'Helvetica');

          doc.text(label,       labelX, sy, { width: 110,    lineBreak: false });
          doc.text(INR(value),  labelX, sy, { width: innerW, align: 'right', lineBreak: false });

          // hairline between rows
          if (!isGrandTotal) {
            doc.strokeColor('#ccddcc').lineWidth(0.3)
              .moveTo(summaryX, sy + rowHt - 2)
              .lineTo(summaryX + summaryW, sy + rowHt - 2)
              .stroke();
          }

          sy += rowHt;
        });

        y = sy + 10;
      } else {
        // No tax — simple grand total
        doc.fillColor('#e9f5e9').rect(350, y, 195, 26).fill();
        doc
          .fillColor('#155724')
          .fontSize(10).font('Helvetica-Bold')
          .text('Grand Total', 360, y + 7, { width: 90 });
        doc
          .fontSize(12)
          .text(INR(grandTotal), 360, y + 6, { width: 175, align: 'right' });

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
            65, y
          );
        y += 14;
      }

      // ── Amount in words ──────────────────────────────────────────────────────
      doc.fillColor('#495057').fontSize(8).font('Helvetica-Bold')
        .text('Amount in words:', 65, y + 4, { width: 480 });
      doc.font('Helvetica')
        .text(amountToWords(grandTotal), 65, y + 15, { width: 480 });
      y += 32;

      // ── Notes ────────────────────────────────────────────────────────────────
      if (data.notes) {
        doc
          .fillColor('#6c757d')
          .fontSize(8.5).font('Helvetica')
          .text(`Notes: ${data.notes}`, 65, y + 6);
        y += 22;
      }

      // ── Footer ───────────────────────────────────────────────────────────────
      doc
        .fillColor('#adb5bd')
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
