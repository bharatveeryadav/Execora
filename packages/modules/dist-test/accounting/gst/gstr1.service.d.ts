/**
 * GSTR-1 & P&L Report Service — Indian GST compliance
 *
 * GSTR-1 is the monthly/quarterly outward supply return filed with the
 * GST portal. This service produces the data in standard GSTR-1 format:
 *  - B2B: Invoices to GST-registered buyers (with buyer GSTIN)
 *  - B2CL: Inter-state invoices to unregistered buyers > ₹2.5L per invoice
 *  - B2CS: All other invoices to unregistered buyers (intra-state / small inter-state)
 *  - HSN: HSN-wise summary of outward supplies
 *
 * P&L Report:
 *  - Month-wise revenue, tax collected, discounts, payments received
 *  - Period comparison (current vs previous)
 *
 * References:
 *  - GST Council GSTR-1 format (Form GSTR-1)
 *  - CBIC HSN reporting threshold: ≥ ₹5Cr turnover → 6-digit HSN, otherwise 4-digit
 */
export declare const INDIAN_STATE_CODES: Record<string, string>;
/** Indian financial year string for a given date (e.g. "2025-26") */
export declare function getIndianFY(date?: Date): string;
/** Get start and end Date for a given Indian FY string ("2025-26") */
export declare function indianFYRange(fy: string): {
    from: Date;
    to: Date;
};
export interface Gstr1B2BEntry {
    receiverGstin: string;
    receiverName: string;
    invoiceNo: string;
    invoiceDate: string;
    invoiceValue: number;
    placeOfSupply: string;
    reverseCharge: 'Y' | 'N';
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
}
export interface Gstr1B2CLEntry {
    invoiceNo: string;
    invoiceDate: string;
    invoiceValue: number;
    placeOfSupply: string;
    taxableValue: number;
    igst: number;
    cess: number;
}
export interface Gstr1B2CSEntry {
    supplyType: 'Intra-State' | 'Inter-State';
    placeOfSupply: string;
    gstRate: number;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
}
export interface Gstr1HsnEntry {
    hsnCode: string;
    description: string;
    uqc: string;
    totalQty: number;
    totalValue: number;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    gstRate: number;
}
export interface Gstr1Report {
    period: {
        from: string;
        to: string;
    };
    fy: string;
    gstin: string;
    legalName: string;
    b2b: Gstr1B2BEntry[];
    b2cl: Gstr1B2CLEntry[];
    b2cs: Gstr1B2CSEntry[];
    hsn: Gstr1HsnEntry[];
    totals: {
        totalTaxableValue: number;
        totalIgst: number;
        totalCgst: number;
        totalSgst: number;
        totalCess: number;
        totalTaxValue: number;
        totalInvoiceValue: number;
        invoiceCount: number;
    };
}
export interface PnlMonthEntry {
    month: string;
    invoiceCount: number;
    revenue: number;
    taxCollected: number;
    discounts: number;
    collected: number;
    outstanding: number;
    netRevenue: number;
}
export interface PnlReport {
    period: {
        from: string;
        to: string;
    };
    months: PnlMonthEntry[];
    comparison?: PnlComparisonEntry[];
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
}
export interface PnlComparisonEntry {
    label: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
}
declare class Gstr1Service {
    /**
     * Generate GSTR-1 report for a given tenant and date range.
     * Returns structured B2B, B2CL, B2CS, and HSN data.
     */
    getGstr1Report(tenantId: string, from: Date, to: Date): Promise<Gstr1Report>;
    /**
     * Generate P&L report for a given date range.
     * Optionally provide comparison period for period-over-period analysis.
     */
    getPnlReport(tenantId: string, from: Date, to: Date, compareFrom?: Date, compareTo?: Date): Promise<PnlReport>;
    /**
     * Itemwise Profit & Loss — group invoice items by product, sum sales vs cost.
     * Returns productName, totalSales, totalCost, grossProfit, marginPct.
     */
    getItemwisePnlReport(tenantId: string, from: Date, to: Date): Promise<{
        period: {
            from: string;
            to: string;
        };
        items: ItemwisePnlEntry[];
    }>;
}
export interface ItemwisePnlEntry {
    productName: string;
    totalSales: number;
    totalCost: number;
    grossProfit: number;
    marginPct: number;
}
export declare const gstr1Service: Gstr1Service;
export {};
//# sourceMappingURL=gstr1.service.d.ts.map