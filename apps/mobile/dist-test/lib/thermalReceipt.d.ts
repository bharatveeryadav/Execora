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
    payments: Array<{
        mode: string;
        amount: number;
    }>;
    notes?: string;
}
export declare function buildReceiptHtml(data: ReceiptData, config: ThermalConfig): string;
//# sourceMappingURL=thermalReceipt.d.ts.map