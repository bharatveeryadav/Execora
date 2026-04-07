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
export async function submitPrintJob(
  content: string,
  options: PrintJobOptions = {}
): Promise<PrintJob> {
  return {
    id: `PJ-${Date.now()}`,
    content,
    options,
    status: "queued",
    createdAt: new Date(),
  };
}
export async function openCashDrawer(): Promise<boolean> {
  return false;
}
