/**
 * BarcodeScanner — native camera barcode/QR scanner (Sprint 15).
 * Used in Billing (item search) and Items (add product).
 */
import React from "react";
export interface BarcodeScannerProps {
    visible: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
    hint?: string;
}
export declare function BarcodeScanner({ visible, onClose, onScan, hint, }: BarcodeScannerProps): React.JSX.Element | null;
//# sourceMappingURL=BarcodeScanner.d.ts.map