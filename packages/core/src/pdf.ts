import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { logger } from './logger';

// ── Types for GSTR-1 and P&L PDF generation ──────────────────────────────────

export interface Gstr1PdfData {
	period: { from: string; to: string };
	fy: string;
	gstin: string;
	legalName: string;
	b2b: Array<{
		receiverGstin: string;
		receiverName: string;
		invoiceNo: string;
		invoiceDate: string;
		invoiceValue: number;
		placeOfSupply: string;
		taxableValue: number;
		igst: number;
		cgst: number;
		sgst: number;
		cess: number;
	}>;
	b2cs: Array<{
		supplyType: string;
		placeOfSupply: string;
		gstRate: number;
		taxableValue: number;
		igst: number;
		cgst: number;
		sgst: number;
		cess: number;
	}>;
	hsn: Array<{
		hsnCode: string;
		description: string;
		uqc: string;
		totalQty: number;
		taxableValue: number;
		igst: number;
		cgst: number;
		sgst: number;
		gstRate: number;
	}>;
	totals: {
		totalTaxableValue: number;
		totalIgst: number;
		totalCgst: number;
		totalSgst: number;
		totalTaxValue: number;
		totalInvoiceValue: number;
		invoiceCount: number;
	};
}

export interface PnlPdfData {
	period: { from: string; to: string };
	months: Array<{
		month: string;
		invoiceCount: number;
		revenue: number;
		taxCollected: number;
		discounts: number;
		collected: number;
		outstanding: number;
		netRevenue: number;
	}>;
	totals: {
		invoiceCount: number;
		revenue: number;
		taxCollected: number;
		discounts: number;
		collected: number;
		outstanding: number;
		netRevenue: number;
		collectionRate: number;
	};
	shopName?: string;
}

export interface InvoicePdfData {
	invoiceNo: string;
	invoiceId: string;
	invoiceDate: Date;
	customerName: string;
	customerGstin?: string;
	shopName: string;
	shopAddress?: string;
	shopPhone?: string;
	shopGstin?: string;
	supplyType?: 'INTRASTATE' | 'INTERSTATE';
	items: Array<{
		productName: string;
		hsnCode?: string | null;
		quantity: number;
		unit: string;
		unitPrice: number; // price before tax
		lineDiscountPercent?: number;
		subtotal: number; // unitPrice × qty  (taxable value)
		gstRate?: number; // GST slab %
		cgst?: number;
		sgst?: number;
		igst?: number;
		cess?: number;
		totalTax?: number;
		total: number; // subtotal + tax
	}>;
	// Invoice-level totals
	subtotal: number;
	discountAmount?: number;        // bill-level discount
	roundOffAmount?: number;        // round-off (+/-)
	totalCgst?: number;
	totalSgst?: number;
	totalIgst?: number;
	totalCess?: number;
	totalTax?: number;
	grandTotal?: number;
	notes?: string;
	upiVpa?: string; // UPI payment address — embeds QR in PDF if set
	// Bank payment details (shown in footer)
	bankName?: string;
	bankAccountNo?: string;
	bankIfsc?: string;
	bankAccountHolder?: string;
	// Terms printed at bottom
	termsAndConditions?: string;
	/** Composition scheme — show "Composition Taxable Person" when true */
	compositionScheme?: boolean;
	/** Recipient billing address (B2B) */
	customerAddress?: string;
	/** Place of supply state code (e.g. "29") */
	placeOfSupply?: string;
	/** Reverse charge — show declaration when true */
	reverseCharge?: boolean;
	/** S12-05: Template ID for layout/theme (classic, thermal, minimal, etc.) */
	template?: string;
	/** S12-05: Accent colour for header (hex e.g. #1e40af) */
	accentColor?: string;
	/** S12-05: Logo image buffer — when set, shown in header */
	logoBuffer?: Buffer;
	/** Invoice tags (e.g. B2B, B2C, COD, Urgent) — shown on PDF */
	tags?: string[];
}

// ── S12-05: Template accent colours (match InvoiceTemplatePreview.tsx) ────────
const TEMPLATE_COLORS: Record<string, string> = {
	classic: '#374151',
	modern: '#1e40af',
	vyapari: '#c2410c',
	thermal: '#111827',
	ecom: '#ff9900',
	flipkart: '#2874f0',
	minimal: '#6d28d9',
};

// ── helpers ──────────────────────────────────────────────────────────────────
const INR = (n: number) => `INR ${n.toFixed(2)}`;

// ── Amount in words (Indian numbering: Lakh / Crore) ─────────────────────────
const ONES = [
	'',
	'One',
	'Two',
	'Three',
	'Four',
	'Five',
	'Six',
	'Seven',
	'Eight',
	'Nine',
	'Ten',
	'Eleven',
	'Twelve',
	'Thirteen',
	'Fourteen',
	'Fifteen',
	'Sixteen',
	'Seventeen',
	'Eighteen',
	'Nineteen',
];
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
	const paise = Math.round((amount - rupees) * 100);
	let words = 'Rupees ' + toIndianWords(rupees);
	if (paise > 0) words += ' and ' + toIndianWords(paise) + ' Paise';
	return words + ' Only';
}

/**
 * Generate a GST-compliant PDF invoice as a Buffer using PDFKit.
 * Supports both INTRASTATE (CGST+SGST) and INTERSTATE (IGST) supplies.
 */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
	// ── Pre-generate UPI QR code (non-blocking fallback if it fails) ──────────
	let qrBuffer: Buffer | null = null;
	if (data.upiVpa) {
		try {
			const upiUrl =
				`upi://pay?pa=${encodeURIComponent(data.upiVpa)}` +
				`&pn=${encodeURIComponent(data.shopName)}` +
				`&am=${(data.grandTotal ?? data.subtotal).toFixed(2)}` +
				`&cu=INR`;
			qrBuffer = await QRCode.toBuffer(upiUrl, { width: 150, margin: 1, type: 'png' });
			logger.debug({ upiVpa: data.upiVpa }, 'UPI QR code generated for invoice PDF');
		} catch (err) {
			logger.warn({ err, upiVpa: data.upiVpa }, 'UPI QR generation failed — invoice PDF will render without QR');
		}
	}

	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({ margin: 50, size: 'A4' });
			const chunks: Buffer[] = [];

			doc.on('data', (chunk: Buffer) => chunks.push(chunk));
			doc.on('end', () => resolve(Buffer.concat(chunks)));
			doc.on('error', reject);

			const dateStr = data.invoiceDate.toLocaleDateString('en-IN', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
			});
			const isInterstate = data.supplyType === 'INTERSTATE';
			const hasTax = (data.totalTax ?? 0) > 0;
			const grandTotal = data.grandTotal ?? data.subtotal;
			const pageLeft = 50;
			const pageWidth = 495;
			const pageRight = pageLeft + pageWidth;

			// S12-05: Accent colour from template or default
			const headerColor = data.accentColor ?? TEMPLATE_COLORS[data.template ?? 'classic'] ?? '#0f172a';

			// ── Header ─────────────────────────────────────────────────────────────
			const headerH = (data.shopAddress || data.shopGstin || data.shopPhone) ? 98 : 78;
			doc.fillColor(headerColor).rect(pageLeft, 48, pageWidth, headerH).fill();

			let shopNameX = 65;
			const shopNameW = 280;
			if (data.logoBuffer) {
				try {
					doc.image(data.logoBuffer, pageLeft + 8, 52, { width: 40, height: 40 });
					shopNameX = 58;
				} catch {
					/* logo embed failed */
				}
			}
			doc.fillColor('#f8fafc').fontSize(20).font('Helvetica-Bold').text(data.shopName, shopNameX, 64, { width: shopNameW });
			let headerY = 88;
			if (data.shopAddress) {
				doc.fontSize(8).font('Helvetica').fillColor('#cbd5e1').text(data.shopAddress, 65, headerY, { width: 280 });
				headerY += 12;
			}
			const gstPhone = [data.shopGstin && `GSTIN: ${data.shopGstin}`, data.shopPhone].filter(Boolean).join('  •  ');
			if (gstPhone) {
				doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text(gstPhone, 65, headerY, { width: 280 });
				headerY += 10;
			} else if (!data.shopAddress && !gstPhone) {
				doc.fontSize(9).font('Helvetica').fillColor('#cbd5e1').text('Thank you for your purchase', 65, headerY, { width: 280 });
			}

			doc.fontSize(16)
				.font('Helvetica-Bold')
				.fillColor('#ffffff')
				.text(hasTax ? 'TAX INVOICE' : 'INVOICE', 350, 60, { width: 185, align: 'right' });

			doc.fontSize(8.5)
				.font('Helvetica')
				.fillColor('#d1d5db')
				.text(`No: ${data.invoiceNo}`, 350, 84, { width: 185, align: 'right' })
				.text(`Date: ${dateStr}`, 350, 98, { width: 185, align: 'right' });

			// ── Invoice meta cards ─────────────────────────────────────────────────
			const hasBillToExtra = !!(data.customerAddress || data.customerGstin);
			const billToH = hasBillToExtra ? 72 : 56;
			const infoTop = 142;
			doc.fillColor('#f8fafc').roundedRect(pageLeft, infoTop, 242, billToH, 6).fill();
			doc.fillColor('#f8fafc').roundedRect(303, infoTop, 242, billToH, 6).fill();

			doc.fillColor('#334155')
				.fontSize(8)
				.font('Helvetica-Bold')
				.text('Bill To', 62, infoTop + 8)
				.text('Invoice Details', 315, infoTop + 8);

			doc.fillColor('#0f172a')
				.fontSize(11)
				.font('Helvetica-Bold')
				.text(data.customerName, 62, infoTop + 23, { width: 220 });
			let billToY = infoTop + 36;
			if (data.customerAddress) {
				doc.fillColor('#475569').fontSize(8).font('Helvetica').text(data.customerAddress, 62, billToY, { width: 220 });
				billToY += 12;
			}
			if (data.customerGstin) {
				doc.fillColor('#475569').fontSize(8).font('Helvetica').text(`GSTIN: ${data.customerGstin}`, 62, billToY, { width: 220 });
			}

			doc.fillColor('#0f172a')
				.fontSize(8.5)
				.font('Helvetica')
				.text(hasTax ? 'Type: GST Invoice' : 'Type: Retail Invoice', 315, infoTop + 23, { width: 220 });

			let invDetailY = infoTop + 37;
			if (data.tags && data.tags.length > 0) {
				doc.fillColor('#64748b').fontSize(7).text(`Tags: ${data.tags.join(', ')}`, 315, invDetailY, { width: 220 });
				invDetailY += 12;
			}
			if (hasTax) {
				doc.text(
					`Supply: ${isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}`,
					315,
					invDetailY,
					{ width: 220 }
				);
				invDetailY += 12;
				if (data.placeOfSupply) {
					doc.text(`Place of Supply: ${data.placeOfSupply}`, 315, invDetailY, { width: 220 });
				}
			}

			// ── Items table ─────────────────────────────────────────────────────────
			// Columns: Product | HSN | Qty | Rate | Taxable | GST% | Tax | Total
			const col = {
				product: 62,
				hsn: 188,
				qty: 240,
				rate: 272,
				taxable: 334,
				gstPct: 398,
				tax: 434,
				total: 479,
			};
			const tableTop = 214;

			doc.fillColor('#1e293b').roundedRect(pageLeft, tableTop, pageWidth, 22, 4).fill();
			doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

			doc.text('Product', col.product, tableTop + 7, { width: 120 });
			doc.text('HSN', col.hsn, tableTop + 7, { width: 46, align: 'center' });
			doc.text('Qty', col.qty, tableTop + 7, { width: 30, align: 'center' });
			doc.text('Rate', col.rate, tableTop + 7, { width: 56, align: 'right' });
			doc.text('Taxable', col.taxable, tableTop + 7, { width: 58, align: 'right' });
			doc.text('GST%', col.gstPct, tableTop + 7, { width: 34, align: 'center' });
			doc.text('Tax', col.tax, tableTop + 7, { width: 46, align: 'right' });
			doc.text('Total', col.total, tableTop + 7, { width: 56, align: 'right' });

			// ── Item rows ───────────────────────────────────────────────────────────
			let y = tableTop + 28;

			data.items.forEach((item, idx) => {
				const rowH = 19;
				if (idx % 2 === 0) {
					doc.fillColor('#f8fafc')
						.rect(pageLeft, y - 4, pageWidth, rowH)
						.fill();
				}

				const gstPctLabel =
					item.gstRate !== undefined ? (item.gstRate === 0 ? 'Exempt' : `${item.gstRate}%`) : '-';

				const taxAmt = item.totalTax ?? 0;

				doc.fillColor('#111827').fontSize(8).font('Helvetica');
				doc.text(item.productName, col.product, y, { width: 120 });
				doc.text(item.hsnCode ?? '-', col.hsn, y, { width: 46, align: 'center' });
				doc.text(String(item.quantity), col.qty, y, { width: 30, align: 'center' });
				doc.text(INR(item.unitPrice), col.rate, y, { width: 56, align: 'right' });
				doc.text(INR(item.subtotal), col.taxable, y, { width: 58, align: 'right' });
				doc.text(gstPctLabel, col.gstPct, y, { width: 34, align: 'center' });
				doc.text(taxAmt > 0 ? INR(taxAmt) : '-', col.tax, y, { width: 46, align: 'right' });
				doc.text(INR(item.total), col.total, y, { width: 56, align: 'right' });

				doc.strokeColor('#e2e8f0')
					.lineWidth(0.4)
					.moveTo(pageLeft, y + 13)
					.lineTo(pageRight, y + 13)
					.stroke();

				y += rowH;
			});

			// ── Divider ─────────────────────────────────────────────────────────────
			doc.strokeColor('#0f172a')
				.lineWidth(0.8)
				.moveTo(pageLeft, y + 5)
				.lineTo(pageRight, y + 5)
				.stroke();

			y += 14;

			// ── Tax summary box ─────────────────────────────────────────────────────
			if (hasTax) {
				const summaryX = 316;
				const summaryW = 229;
				const rowHt = 16;
				const labelX = summaryX + 8;
				const innerW = summaryW - 16;

				const rows: Array<[string, number, boolean]> = [['Taxable Amount', data.subtotal, false]];

				if ((data.discountAmount ?? 0) > 0) {
					rows.push([`Discount`, -(data.discountAmount ?? 0), false]);
				}

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

				if (data.roundOffAmount !== undefined && data.roundOffAmount !== 0) {
					rows.push(['Round Off', data.roundOffAmount, false]);
				}

				rows.push(['Grand Total', grandTotal, true]);

				const boxH = rows.length * rowHt + 6;
				doc.fillColor('#f8fafc').roundedRect(summaryX, y, summaryW, boxH, 6).fill();
				doc.strokeColor('#cbd5e1').lineWidth(0.6).roundedRect(summaryX, y, summaryW, boxH, 6).stroke();

				let sy = y + 4;
				rows.forEach(([label, value, isBold]) => {
					const isGrandTotal = label === 'Grand Total';

					if (isGrandTotal) {
						doc.fillColor('#0f766e')
							.rect(summaryX, sy - 1, summaryW, rowHt + 2)
							.fill();
					}

					const isDiscount = value < 0;
					doc.fillColor(isGrandTotal ? '#ffffff' : isDiscount ? '#dc2626' : '#212529')
						.fontSize(isGrandTotal ? 10 : 8.5)
						.font(isBold ? 'Helvetica-Bold' : 'Helvetica');

					doc.text(label, labelX, sy, { width: 110, lineBreak: false });
					doc.text(isDiscount ? `- ${INR(-value)}` : INR(value), labelX, sy, { width: innerW, align: 'right', lineBreak: false });

					// hairline between rows
					if (!isGrandTotal) {
						doc.strokeColor('#e2e8f0')
							.lineWidth(0.3)
							.moveTo(summaryX, sy + rowHt - 2)
							.lineTo(summaryX + summaryW, sy + rowHt - 2)
							.stroke();
					}

					sy += rowHt;
				});

				y = sy + 10;
			} else {
				// No tax — simple summary
				const noTaxRows: Array<[string, number]> = [['Subtotal', data.subtotal]];
				if ((data.discountAmount ?? 0) > 0) noTaxRows.push(['Discount', -(data.discountAmount ?? 0)]);
				if (data.roundOffAmount !== undefined && data.roundOffAmount !== 0) noTaxRows.push(['Round Off', data.roundOffAmount]);
				noTaxRows.push(['Grand Total', grandTotal]);

				const boxH = noTaxRows.length * 18 + 8;
				doc.fillColor('#f1f5f9').roundedRect(350, y, 195, boxH, 6).fill();
				let ry = y + 6;
				noTaxRows.forEach(([label, value]) => {
					const isTotal = label === 'Grand Total';
					const isNeg = value < 0;
					if (isTotal) doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
					else doc.fillColor(isNeg ? '#dc2626' : '#374151').fontSize(9).font('Helvetica');
					doc.text(label, 360, ry, { width: 80 });
					doc.text(isNeg ? `- ${INR(-value)}` : INR(value), 360, ry, { width: 175, align: 'right' });
					ry += 18;
				});

				y += boxH + 8;
			}

			// ── GST component breakdown (INTRASTATE only, informational) ───────────
			if (hasTax && !isInterstate && (data.totalCgst ?? 0) > 0) {
				y += 4;
				doc.fillColor('#6c757d')
					.fontSize(7.5)
					.font('Helvetica')
					.text(
						`CGST @ ${(((data.totalCgst ?? 0) / data.subtotal) * 100).toFixed(1)}%  =  ${INR(data.totalCgst ?? 0)}   |   ` +
							`SGST @ ${(((data.totalSgst ?? 0) / data.subtotal) * 100).toFixed(1)}%  =  ${INR(data.totalSgst ?? 0)}`,
						62,
						y
					);
				y += 14;
			}

			// ── Amount in words ──────────────────────────────────────────────────────
			let wordsBoxH = 34;
			if (data.compositionScheme || data.reverseCharge) wordsBoxH += 20;
			doc.fillColor('#f8fafc')
				.roundedRect(pageLeft, y + 2, pageWidth, wordsBoxH, 6)
				.fill();
			doc.fillColor('#334155')
				.fontSize(8)
				.font('Helvetica-Bold')
				.text('Amount in words', 62, y + 10, { width: 120 });
			doc.fillColor('#0f172a')
				.font('Helvetica')
				.text(amountToWords(grandTotal), 150, y + 10, { width: 385 });
			let declY = y + 28;
			if (data.compositionScheme) {
				doc.fillColor('#b91c1c').fontSize(8).font('Helvetica-Bold').text('Composition Taxable Person', 62, declY, { width: 400 });
				declY += 12;
			}
			if (data.reverseCharge) {
				doc.fillColor('#b91c1c').fontSize(8).font('Helvetica-Bold').text('Tax is payable on Reverse Charge', 62, declY, { width: 400 });
			}
			y += wordsBoxH + 8;

			// ── Notes ────────────────────────────────────────────────────────────────
			if (data.notes) {
				doc.fillColor('#fff7ed')
					.roundedRect(pageLeft, y + 1, pageWidth, 28, 5)
					.fill();
				doc.fillColor('#7c2d12')
					.fontSize(8.5)
					.font('Helvetica')
					.text(`Notes: ${data.notes}`, 62, y + 10, { width: 470 });
				y += 34;
			}

			// ── Bank payment details ───────────────────────────────────────────────
			const hasBankDetails = data.bankAccountNo && data.bankIfsc;
			if (hasBankDetails) {
				doc.fillColor('#eff6ff').roundedRect(pageLeft, y + 4, pageWidth, 32, 5).fill();
				doc.fillColor('#1e3a8a').fontSize(8).font('Helvetica-Bold').text('Bank Details:', 62, y + 12, { width: 80 });
				const bankLine = [
					data.bankAccountHolder ? `A/c Holder: ${data.bankAccountHolder}` : null,
					data.bankAccountNo ? `A/c No: ${data.bankAccountNo}` : null,
					data.bankIfsc ? `IFSC: ${data.bankIfsc}` : null,
					data.bankName ? `Bank: ${data.bankName}` : null,
				].filter(Boolean).join('   |   ');
				doc.fillColor('#1e3a8a').font('Helvetica').text(bankLine, 62, y + 24, { width: 430 });
				y += 42;
			}

			// ── Terms & Conditions ────────────────────────────────────────────────
			if (data.termsAndConditions) {
				doc.fillColor('#fefce8').roundedRect(pageLeft, y + 2, pageWidth, 28, 5).fill();
				doc.fillColor('#713f12').fontSize(8).font('Helvetica-Bold').text('Terms & Conditions:', 62, y + 10, { width: 110 });
				doc.fillColor('#713f12').font('Helvetica').text(data.termsAndConditions, 172, y + 10, { width: 370 });
				y += 36;
			}

			// ── Signature / declaration ────────────────────────────────────────────
			const signTop = Math.max(y + 6, 648);
			doc.strokeColor('#cbd5e1').lineWidth(0.7).roundedRect(pageLeft, signTop, pageWidth, 74, 6).stroke();

			// Declaration text (narrowed to 200px to make room for QR)
			doc.fillColor('#475569')
				.fontSize(8)
				.font('Helvetica')
				.text('Declaration: Goods once sold will not be taken back or exchanged.', 62, signTop + 10, {
					width: 200,
				})
				.text('Certified that the particulars given above are true and correct.', 62, signTop + 24, {
					width: 200,
				});

			// ── UPI QR code (placed in centre of signature strip) ──────────────────
			if (qrBuffer) {
				doc.image(qrBuffer, 270, signTop + 4, { width: 64, height: 64 });
				doc.fillColor('#0f766e')
					.fontSize(6)
					.font('Helvetica')
					.text('Scan to Pay  UPI', 266, signTop + 68, { width: 74, align: 'center' });
			}

			// Signatory
			doc.fillColor('#0f172a')
				.fontSize(8)
				.font('Helvetica-Bold')
				.text(`for ${data.shopName}`, 390, signTop + 30, { width: 140, align: 'center' });
			doc.strokeColor('#94a3b8')
				.lineWidth(0.6)
				.moveTo(390, signTop + 50)
				.lineTo(530, signTop + 50)
				.stroke();
			doc.fillColor('#64748b')
				.fontSize(7.5)
				.font('Helvetica')
				.text('Authorised Signatory', 390, signTop + 54, { width: 140, align: 'center' });

			// ── Footer ───────────────────────────────────────────────────────────────
			doc.fillColor('#94a3b8')
				.fontSize(7.5)
				.font('Helvetica')
				.text(
					`Generated by Execora  •  ${data.invoiceNo}  •  ${dateStr}  •  This is a computer-generated invoice.`,
					50,
					760,
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

// ── helpers shared by report PDFs ─────────────────────────────────────────────
const INR_FMT = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function pdfTableHeader(
	doc: PDFKit.PDFDocument,
	cols: Array<{ label: string; x: number; w: number; align?: 'left' | 'right' | 'center' }>,
	y: number,
	rowH = 20
) {
	doc.fillColor('#1e293b').rect(46, y, 503, rowH).fill();
	doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
	for (const c of cols) {
		doc.text(c.label, c.x, y + 6, { width: c.w, align: c.align ?? 'left', lineBreak: false });
	}
}

function pdfTableRow(
	doc: PDFKit.PDFDocument,
	cols: Array<{ value: string; x: number; w: number; align?: 'left' | 'right' | 'center' }>,
	y: number,
	odd: boolean,
	rowH = 16
) {
	if (odd) doc.fillColor('#f8fafc').rect(46, y, 503, rowH).fill();
	doc.fillColor('#111827').fontSize(7).font('Helvetica');
	for (const c of cols) {
		doc.text(c.value, c.x, y + 5, { width: c.w, align: c.align ?? 'left', lineBreak: false });
	}
	doc.strokeColor('#e2e8f0')
		.lineWidth(0.3)
		.moveTo(46, y + rowH - 1)
		.lineTo(549, y + rowH - 1)
		.stroke();
}

function pdfReportHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string, period: string) {
	doc.fillColor('#0f172a').rect(46, 40, 503, 60).fill();
	doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(title, 60, 52, { width: 340 });
	doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text(subtitle, 60, 74, { width: 340 });
	doc.fontSize(9).font('Helvetica').fillColor('#ffffff').text(period, 60, 74, { width: 480, align: 'right' });
}

/**
 * Generate GSTR-1 report PDF.
 * Sections: B2B invoices, B2CS summary, HSN summary.
 */
export function generateGstr1Pdf(data: Gstr1PdfData): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({ margin: 46, size: 'A4', layout: 'landscape' });
			const chunks: Buffer[] = [];
			doc.on('data', (c: Buffer) => chunks.push(c));
			doc.on('end', () => resolve(Buffer.concat(chunks)));
			doc.on('error', reject);

			const fromStr = new Date(data.period.from).toLocaleDateString('en-IN', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
			});
			const toStr = new Date(data.period.to).toLocaleDateString('en-IN', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
			});
			const period = `${fromStr} – ${toStr}`;

			pdfReportHeader(
				doc,
				'GSTR-1 Report',
				`FY ${data.fy}  |  GSTIN: ${data.gstin || 'Not registered'}  |  ${data.legalName || ''}`,
				period
			);

			// Totals summary bar
			let y = 115;
			const summaryItems = [
				{ label: 'Invoices', value: String(data.totals.invoiceCount) },
				{ label: 'Taxable Value', value: INR_FMT(data.totals.totalTaxableValue) },
				{ label: 'Total IGST', value: INR_FMT(data.totals.totalIgst) },
				{ label: 'Total CGST', value: INR_FMT(data.totals.totalCgst) },
				{ label: 'Total SGST', value: INR_FMT(data.totals.totalSgst) },
				{ label: 'Total Tax', value: INR_FMT(data.totals.totalTaxValue) },
				{ label: 'Invoice Value', value: INR_FMT(data.totals.totalInvoiceValue) },
			];
			const cardW = Math.floor(503 / summaryItems.length);
			doc.fillColor('#f8fafc').rect(46, y, 503, 42).fill();
			summaryItems.forEach((s, i) => {
				const x = 46 + i * cardW;
				doc.fillColor('#64748b')
					.fontSize(7)
					.font('Helvetica')
					.text(s.label, x + 4, y + 6, { width: cardW - 8, align: 'center' });
				doc.fillColor('#0f172a')
					.fontSize(9)
					.font('Helvetica-Bold')
					.text(s.value, x + 4, y + 20, { width: cardW - 8, align: 'center' });
			});
			y += 50;

			// ── B2B Section ────────────────────────────────────────────────────────
			if (data.b2b.length > 0) {
				doc.fillColor('#0f172a')
					.fontSize(10)
					.font('Helvetica-Bold')
					.text('4A — B2B Invoices (GST-registered buyers)', 46, y + 4);
				y += 22;

				const b2bCols = [
					{ label: 'Receiver GSTIN', x: 46, w: 80 },
					{ label: 'Receiver Name', x: 130, w: 80 },
					{ label: 'Invoice No', x: 214, w: 70 },
					{ label: 'Date', x: 288, w: 52 },
					{ label: 'POS', x: 344, w: 28 },
					{ label: 'Invoice Value', x: 376, w: 65, align: 'right' as const },
					{ label: 'Taxable', x: 445, w: 52, align: 'right' as const },
					{ label: 'IGST', x: 501, w: 45, align: 'right' as const },
				];
				pdfTableHeader(doc, b2bCols, y);
				y += 20;

				data.b2b.forEach((row, i) => {
					if (y > 530) {
						doc.addPage({ layout: 'landscape' });
						y = 40;
					}
					pdfTableRow(
						doc,
						[
							{ value: row.receiverGstin, x: 46, w: 80 },
							{ value: row.receiverName, x: 130, w: 80 },
							{ value: row.invoiceNo, x: 214, w: 70 },
							{ value: row.invoiceDate, x: 288, w: 52 },
							{ value: row.placeOfSupply, x: 344, w: 28 },
							{ value: INR_FMT(row.invoiceValue), x: 376, w: 65, align: 'right' },
							{ value: INR_FMT(row.taxableValue), x: 445, w: 52, align: 'right' },
							{ value: INR_FMT(row.igst), x: 501, w: 45, align: 'right' },
						],
						y,
						i % 2 === 0
					);
					y += 16;
				});
				y += 12;
			}

			// ── B2CS Section ───────────────────────────────────────────────────────
			if (data.b2cs.length > 0) {
				if (y > 480) {
					doc.addPage({ layout: 'landscape' });
					y = 40;
				}
				doc.fillColor('#0f172a')
					.fontSize(10)
					.font('Helvetica-Bold')
					.text('7 — B2CS Summary (Unregistered buyers)', 46, y + 4);
				y += 22;

				const b2csCols = [
					{ label: 'Type', x: 46, w: 80 },
					{ label: 'POS', x: 130, w: 28 },
					{ label: 'GST Rate', x: 162, w: 50, align: 'center' as const },
					{ label: 'Taxable', x: 216, w: 80, align: 'right' as const },
					{ label: 'IGST', x: 300, w: 70, align: 'right' as const },
					{ label: 'CGST', x: 374, w: 70, align: 'right' as const },
					{ label: 'SGST', x: 448, w: 70, align: 'right' as const },
				];
				pdfTableHeader(doc, b2csCols, y);
				y += 20;

				data.b2cs.forEach((row, i) => {
					if (y > 530) {
						doc.addPage({ layout: 'landscape' });
						y = 40;
					}
					pdfTableRow(
						doc,
						[
							{ value: row.supplyType, x: 46, w: 80 },
							{ value: row.placeOfSupply || '-', x: 130, w: 28 },
							{ value: `${row.gstRate}%`, x: 162, w: 50, align: 'center' },
							{ value: INR_FMT(row.taxableValue), x: 216, w: 80, align: 'right' },
							{ value: INR_FMT(row.igst), x: 300, w: 70, align: 'right' },
							{ value: INR_FMT(row.cgst), x: 374, w: 70, align: 'right' },
							{ value: INR_FMT(row.sgst), x: 448, w: 70, align: 'right' },
						],
						y,
						i % 2 === 0
					);
					y += 16;
				});
				y += 12;
			}

			// ── HSN Section ───────────────────────────────────────────────────────
			if (data.hsn.length > 0) {
				if (y > 480) {
					doc.addPage({ layout: 'landscape' });
					y = 40;
				}
				doc.fillColor('#0f172a')
					.fontSize(10)
					.font('Helvetica-Bold')
					.text('12 — HSN-wise Summary', 46, y + 4);
				y += 22;

				const hsnCols = [
					{ label: 'HSN Code', x: 46, w: 55 },
					{ label: 'Description', x: 105, w: 100 },
					{ label: 'UQC', x: 209, w: 30 },
					{ label: 'Qty', x: 243, w: 35, align: 'right' as const },
					{ label: 'GST%', x: 282, w: 30, align: 'center' as const },
					{ label: 'Taxable', x: 316, w: 65, align: 'right' as const },
					{ label: 'IGST', x: 385, w: 50, align: 'right' as const },
					{ label: 'CGST', x: 439, w: 50, align: 'right' as const },
					{ label: 'SGST', x: 493, w: 50, align: 'right' as const },
				];
				pdfTableHeader(doc, hsnCols, y);
				y += 20;

				data.hsn.forEach((row, i) => {
					if (y > 530) {
						doc.addPage({ layout: 'landscape' });
						y = 40;
					}
					pdfTableRow(
						doc,
						[
							{ value: row.hsnCode, x: 46, w: 55 },
							{ value: row.description.slice(0, 18), x: 105, w: 100 },
							{ value: row.uqc, x: 209, w: 30 },
							{ value: row.totalQty.toFixed(2), x: 243, w: 35, align: 'right' },
							{ value: `${row.gstRate}%`, x: 282, w: 30, align: 'center' },
							{ value: INR_FMT(row.taxableValue), x: 316, w: 65, align: 'right' },
							{ value: INR_FMT(row.igst), x: 385, w: 50, align: 'right' },
							{ value: INR_FMT(row.cgst), x: 439, w: 50, align: 'right' },
							{ value: INR_FMT(row.sgst), x: 493, w: 50, align: 'right' },
						],
						y,
						i % 2 === 0
					);
					y += 16;
				});
			}

			// Footer
			doc.fillColor('#94a3b8')
				.fontSize(7)
				.font('Helvetica')
				.text(`Generated by Execora  •  GSTR-1 ${period}  •  This is a system-generated report.`, 46, 570, {
					align: 'center',
					width: 503,
				});

			doc.end();
			logger.debug({ invoiceCount: data.totals.invoiceCount }, 'GSTR-1 PDF generated');
		} catch (err) {
			logger.error({ err }, 'GSTR-1 PDF generation failed');
			reject(err);
		}
	});
}

/**
 * Generate P&L report PDF.
 * Month-wise table with totals row.
 */
export function generatePnlPdf(data: PnlPdfData): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({ margin: 46, size: 'A4' });
			const chunks: Buffer[] = [];
			doc.on('data', (c: Buffer) => chunks.push(c));
			doc.on('end', () => resolve(Buffer.concat(chunks)));
			doc.on('error', reject);

			const fromStr = new Date(data.period.from).toLocaleDateString('en-IN', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
			});
			const toStr = new Date(data.period.to).toLocaleDateString('en-IN', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
			});
			const period = `${fromStr} – ${toStr}`;

			pdfReportHeader(doc, 'Profit & Loss Report', data.shopName ?? '', period);

			// Totals summary bar
			let y = 115;
			const t = data.totals;
			const summaryItems = [
				{ label: 'Revenue', value: INR_FMT(t.revenue) },
				{ label: 'Net Revenue', value: INR_FMT(t.netRevenue) },
				{ label: 'Tax Collected', value: INR_FMT(t.taxCollected) },
				{ label: 'Discounts', value: INR_FMT(t.discounts) },
				{ label: 'Collected', value: INR_FMT(t.collected) },
				{ label: 'Outstanding', value: INR_FMT(t.outstanding) },
				{ label: 'Collection %', value: `${t.collectionRate.toFixed(1)}%` },
			];
			const cardW = Math.floor(495 / summaryItems.length);
			doc.fillColor('#f8fafc').rect(50, y, 495, 42).fill();
			summaryItems.forEach((s, i) => {
				const x = 50 + i * cardW;
				doc.fillColor('#64748b')
					.fontSize(7)
					.font('Helvetica')
					.text(s.label, x + 4, y + 6, { width: cardW - 8, align: 'center' });
				doc.fillColor('#0f172a')
					.fontSize(9)
					.font('Helvetica-Bold')
					.text(s.value, x + 4, y + 20, { width: cardW - 8, align: 'center' });
			});
			y += 56;

			// Month-wise table
			const pnlCols = [
				{ label: 'Month', x: 50, w: 60 },
				{ label: 'Bills', x: 114, w: 28, align: 'center' as const },
				{ label: 'Revenue', x: 146, w: 68, align: 'right' as const },
				{ label: 'Discounts', x: 218, w: 62, align: 'right' as const },
				{ label: 'Net Revenue', x: 284, w: 68, align: 'right' as const },
				{ label: 'Tax', x: 356, w: 56, align: 'right' as const },
				{ label: 'Collected', x: 416, w: 62, align: 'right' as const },
				{ label: 'Outstanding', x: 482, w: 60, align: 'right' as const },
			];
			pdfTableHeader(doc, pnlCols, y);
			y += 20;

			data.months.forEach((m, i) => {
				if (y > 720) {
					doc.addPage();
					y = 40;
				}
				pdfTableRow(
					doc,
					[
						{ value: m.month, x: 50, w: 60 },
						{ value: String(m.invoiceCount), x: 114, w: 28, align: 'center' },
						{ value: INR_FMT(m.revenue), x: 146, w: 68, align: 'right' },
						{ value: INR_FMT(m.discounts), x: 218, w: 62, align: 'right' },
						{ value: INR_FMT(m.netRevenue), x: 284, w: 68, align: 'right' },
						{ value: INR_FMT(m.taxCollected), x: 356, w: 56, align: 'right' },
						{ value: INR_FMT(m.collected), x: 416, w: 62, align: 'right' },
						{ value: INR_FMT(m.outstanding), x: 482, w: 60, align: 'right' },
					],
					y,
					i % 2 === 0
				);
				y += 16;
			});

			// Totals row
			y += 4;
			doc.fillColor('#0f766e').rect(50, y, 495, 20).fill();
			doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
			const totRows = [
				{ value: 'TOTAL', x: 50, w: 60 },
				{ value: String(t.invoiceCount), x: 114, w: 28, align: 'center' as const },
				{ value: INR_FMT(t.revenue), x: 146, w: 68, align: 'right' as const },
				{ value: INR_FMT(t.discounts), x: 218, w: 62, align: 'right' as const },
				{ value: INR_FMT(t.netRevenue), x: 284, w: 68, align: 'right' as const },
				{ value: INR_FMT(t.taxCollected), x: 356, w: 56, align: 'right' as const },
				{ value: INR_FMT(t.collected), x: 416, w: 62, align: 'right' as const },
				{ value: INR_FMT(t.outstanding), x: 482, w: 60, align: 'right' as const },
			];
			for (const c of totRows) {
				doc.text(c.value, c.x, y + 6, { width: c.w, align: c.align ?? 'left', lineBreak: false });
			}

			// Footer
			doc.fillColor('#94a3b8')
				.fontSize(7)
				.font('Helvetica')
				.text(`Generated by Execora  •  P&L ${period}  •  This is a system-generated report.`, 50, 770, {
					align: 'center',
					width: 495,
				});

			doc.end();
			logger.debug({ months: data.months.length }, 'P&L PDF generated');
		} catch (err) {
			logger.error({ err }, 'P&L PDF generation failed');
			reject(err);
		}
	});
}
