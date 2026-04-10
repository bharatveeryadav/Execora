/**
 * integrations/hardware
 *
 * Feature: peripheral hardware — thermal printers, barcode scanners, cash drawers.
 * Uses ESC/POS or browser print API. Stubs for WebUSB / WebSocket bridge (⏳).
 */
export interface PrintJobOptions {
    printerName?: string;
    copies?: number;
    paperWidth?: "58mm" | "80mm";
}
export interface PrintJob {
    id: string;
    content: string;
    options: PrintJobOptions;
    status: "queued" | "printing" | "done" | "failed";
    createdAt: Date;
}
export declare function submitPrintJob(content: string, options?: PrintJobOptions): Promise<PrintJob>;
export declare function openCashDrawer(): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map