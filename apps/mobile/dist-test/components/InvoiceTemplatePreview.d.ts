/**
 * InvoiceTemplatePreview — React Native invoice template previews.
 * Matches web InvoiceTemplatePreview (7 templates).
 */
import React from "react";
export interface PreviewSettings {
    themeColor?: string;
    priceDecimals?: number;
    showItemHsn?: boolean;
    showCustomerAddress?: boolean;
    showPaymentMode?: boolean;
}
export type TemplateId = "classic" | "modern" | "vyapari" | "thermal" | "ecom" | "flipkart" | "minimal" | "amazon" | "tata" | "dmart" | "nike" | "instagram" | "unilever" | "service";
export declare const TEMPLATES: Array<{
    id: TemplateId;
    label: string;
    desc: string;
    color: string;
}>;
export interface PreviewItem {
    name: string;
    qty: number;
    unit: string;
    rate: number;
    discount: number;
    amount: number;
    hsnCode?: string;
    mrp?: number;
}
export interface PreviewData {
    invoiceNo: string;
    date: string;
    shopName: string;
    customerName: string;
    supplierGstin?: string;
    supplierAddress?: string;
    recipientAddress?: string;
    compositionScheme?: boolean;
    items: PreviewItem[];
    subtotal: number;
    discountAmt: number;
    cgst: number;
    sgst: number;
    igst?: number;
    total: number;
    amountInWords: string;
    paymentMode?: string;
    notes?: string;
    upiId?: string;
    gstin?: string;
    reverseCharge?: boolean;
    tags?: string[];
    logoPlaceholder?: string;
    shipToAddress?: string;
    themeLabel?: string;
    placeOfSupply?: string;
    dueDate?: string;
    bankName?: string;
    bankAccountNo?: string;
    bankIfsc?: string;
    bankBranch?: string;
}
export declare function InvoiceTemplatePreview({ template, data, settings, }: {
    template: TemplateId;
    data: PreviewData;
    settings?: PreviewSettings;
}): React.JSX.Element;
/** Compact invoice preview thumbnail for settings/cards — full invoice scaled to fit */
export declare function InvoicePreviewThumbnail({ template, data, width, height, }: {
    template: TemplateId;
    data: PreviewData;
    width?: number;
    height?: number;
}): React.JSX.Element;
/** Template thumbnail for picker */
export declare function TemplateThumbnail({ template, selected, onPress, }: {
    template: (typeof TEMPLATES)[number];
    selected: boolean;
    onPress: () => void;
}): React.JSX.Element;
//# sourceMappingURL=InvoiceTemplatePreview.d.ts.map