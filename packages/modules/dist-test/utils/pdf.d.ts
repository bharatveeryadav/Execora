export interface Gstr1PdfData {
    period: {
        from: string;
        to: string;
    };
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
    period: {
        from: string;
        to: string;
    };
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
        unitPrice: number;
        lineDiscountPercent?: number;
        subtotal: number;
        gstRate?: number;
        cgst?: number;
        sgst?: number;
        igst?: number;
        cess?: number;
        totalTax?: number;
        total: number;
    }>;
    subtotal: number;
    discountAmount?: number;
    roundOffAmount?: number;
    totalCgst?: number;
    totalSgst?: number;
    totalIgst?: number;
    totalCess?: number;
    totalTax?: number;
    grandTotal?: number;
    notes?: string;
    upiVpa?: string;
    bankName?: string;
    bankAccountNo?: string;
    bankIfsc?: string;
    bankAccountHolder?: string;
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
/**
 * Generate a GST-compliant PDF invoice as a Buffer using PDFKit.
 * Supports both INTRASTATE (CGST+SGST) and INTERSTATE (IGST) supplies.
 */
export declare function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer>;
/**
 * Generate GSTR-1 report PDF.
 * Sections: B2B invoices, B2CS summary, HSN summary.
 */
export declare function generateGstr1Pdf(data: Gstr1PdfData): Promise<Buffer>;
/**
 * Generate P&L report PDF.
 * Month-wise table with totals row.
 */
export declare function generatePnlPdf(data: PnlPdfData): Promise<Buffer>;
//# sourceMappingURL=pdf.d.ts.map