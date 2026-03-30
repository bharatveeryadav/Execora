/**
 * InvoiceTemplatePreviewUtils — Shared utilities, helpers, and sub-components
 * Extracted from InvoiceTemplatePreview to reduce main file size ~600 LOC
 * Includes: TotalsBlock, ItemsTable, PaymentSection, DemoLogo, useFormatInr, styles
 */
import React from "react";
export interface PreviewData {
    shopName: string;
    supplierAddress?: string;
    supplierGstin?: string;
    customerName: string;
    recipientAddress?: string;
    shipToAddress?: string;
    gstin?: string;
    invoiceNo: string;
    date: string;
    dueDate?: string;
    placeOfSupply?: string;
    items: Array<{
        name: string;
        qty: number;
        unit: string;
        rate: number;
        discount?: number;
        amount: number;
        hsn?: string;
    }>;
    subtotal: number;
    discountAmt: number;
    cgst: number;
    sgst: number;
    igst?: number;
    total: number;
    amountInWords?: string;
    reverseCharge?: boolean;
    compositionScheme?: boolean;
    bankName?: string;
    bankAccountNo?: string;
    bankIfsc?: string;
    bankBranch?: string;
    upiId?: string;
    logoPlaceholder?: string;
    themeLabel?: string;
    tags?: string[];
}
export declare const formatInr: (n: number, decimals?: number) => string;
export interface PreviewSettings {
    themeColor?: string;
    priceDecimals?: number;
    showItemHsn?: boolean;
    showCustomerAddress?: boolean;
    showPaymentMode?: boolean;
}
export declare const PreviewSettingsContext: React.Context<PreviewSettings>;
export declare function useFormatInr(): (n: number) => string;
export declare function TotalsBlock({ d, accentColor, thermal, showTotalItems, }: {
    d: PreviewData;
    accentColor?: string;
    thermal?: boolean;
    showTotalItems?: boolean;
}): React.JSX.Element;
export declare function PaymentSection({ d }: {
    d: PreviewData;
}): React.JSX.Element | null;
export declare const LOGO_STYLES: Record<string, {
    bg: string;
    text: string;
    label: string;
}>;
export declare function DemoLogo({ placeholder, size, }: {
    placeholder?: string;
    size?: number;
}): React.JSX.Element | null;
export declare function ItemsTable({ items, thermal, showHsn, serviceStyle, }: {
    items: PreviewData["items"];
    thermal?: boolean;
    showHsn?: boolean;
    serviceStyle?: boolean;
}): React.JSX.Element;
export declare const styles: {
    card: {
        backgroundColor: string;
        borderRadius: number;
        overflow: "hidden";
        marginBottom: number;
    };
    totalsBlock: {
        backgroundColor: string;
        paddingHorizontal: number;
        paddingVertical: number;
        borderTopWidth: number;
        borderTopColor: string;
        gap: number;
    };
    totalsBlockThermal: {
        borderTopColor: string;
        paddingVertical: number;
    };
    totalsRow: {
        flexDirection: "row";
        justifyContent: "space-between";
        alignItems: "center";
    };
    totalsLabel: {
        fontSize: number;
        color: string;
    };
    totalsValue: {
        fontSize: number;
        fontWeight: "600";
        color: string;
    };
    totalsTotal: {
        flexDirection: "row";
        justifyContent: "space-between";
        paddingVertical: number;
        marginVertical: number;
        borderTopWidth: number;
        borderTopColor: string;
    };
    totalsTotalLabel: {
        fontSize: number;
        fontWeight: "700";
    };
    totalsTotalValue: {
        fontSize: number;
        fontWeight: "700";
    };
    amountWords: {
        fontSize: number;
        color: string;
        fontStyle: "italic";
        marginTop: number;
    };
    reverseCharge: {
        fontSize: number;
        color: string;
        fontWeight: "600";
        marginTop: number;
        textAlign: "center";
    };
    itemsTableContainer: {
        borderWidth: number;
        borderColor: string;
        marginHorizontal: number;
        marginVertical: number;
        borderRadius: number;
        overflow: "hidden";
    };
    itemsHeader: {
        flexDirection: "row";
        backgroundColor: string;
        paddingVertical: number;
        paddingHorizontal: number;
        borderBottomWidth: number;
        borderBottomColor: string;
    };
    itemsHeaderCell: {
        fontSize: number;
        fontWeight: "700";
        color: string;
        textTransform: "uppercase";
    };
    itemsRow: {
        flexDirection: "row";
        paddingVertical: number;
        paddingHorizontal: number;
        borderBottomWidth: number;
        borderBottomColor: string;
        alignItems: "center";
    };
    itemName: {
        fontSize: number;
        fontWeight: "500";
        color: string;
    };
    itemSub: {
        fontSize: number;
        color: string;
        marginTop: number;
    };
    itemCell: {
        fontSize: number;
        color: string;
    };
    thermalCard: {
        borderWidth: number;
        borderColor: string;
        paddingVertical: number;
    };
    thermalHeader: {
        paddingHorizontal: number;
        paddingVertical: number;
        borderBottomWidth: number;
        borderBottomColor: string;
    };
    thermalShopName: {
        fontSize: number;
        fontWeight: "700";
        color: string;
        textAlign: "center";
    };
    thermalSub: {
        fontSize: number;
        color: string;
        textAlign: "center";
    };
    thermalText: {
        fontSize: number;
        color: string;
    };
    thermalItem: {
        paddingHorizontal: number;
        paddingVertical: number;
        borderBottomWidth: number;
        borderBottomColor: string;
    };
    thermalItemRow: {
        flexDirection: "row";
        justifyContent: "space-between";
        marginTop: number;
    };
    classicCard: {
        borderWidth: number;
        borderColor: string;
    };
    classicHeader: {
        paddingHorizontal: number;
        paddingVertical: number;
        backgroundColor: string;
        borderBottomWidth: number;
        borderBottomColor: string;
    };
    classicShopName: {
        fontSize: number;
        fontWeight: "800";
        color: string;
    };
    classicSub: {
        fontSize: number;
        color: string;
    };
    modernCard: {
        borderWidth: number;
        borderColor: string;
        borderRadius: number;
    };
    modernHeader: {
        flexDirection: "row";
        justifyContent: "space-between";
        alignItems: "flex-start";
        paddingHorizontal: number;
        paddingVertical: number;
    };
    modernShopName: {
        fontSize: number;
        fontWeight: "800";
        color: string;
    };
    modernHeaderSub: {
        fontSize: number;
        color: string;
        marginTop: number;
    };
    modernInvNo: {
        fontSize: number;
        fontWeight: "700";
        color: string;
    };
    modernBillTo: {
        paddingHorizontal: number;
        paddingVertical: number;
        backgroundColor: string;
        borderBottomWidth: number;
        borderBottomColor: string;
    };
    vyapariCard: {
        borderWidth: number;
        borderRadius: number;
    };
    vyapariHeader: {
        paddingHorizontal: number;
        paddingVertical: number;
    };
    vyapariShopName: {
        fontSize: number;
        fontWeight: "900";
        color: string;
        textAlign: "center";
    };
    vyapariSub: {
        fontSize: number;
        color: string;
        textAlign: "center";
    };
    vyapariMeta: {
        paddingHorizontal: number;
        paddingVertical: number;
    };
    ecomCard: {
        borderWidth: number;
        borderColor: string;
        borderRadius: number;
    };
    ecomHeader: {
        flexDirection: "row";
        justifyContent: "space-between";
        paddingHorizontal: number;
        paddingVertical: number;
    };
    ecomShopName: {
        fontSize: number;
        fontWeight: "800";
        color: string;
    };
    ecomInvLabel: {
        fontSize: number;
        color: string;
        textTransform: "uppercase";
        fontWeight: "600";
    };
    ecomInvNo: {
        fontSize: number;
        fontWeight: "700";
        color: string;
    };
    ecomStripe: {
        height: number;
        backgroundColor: string;
        marginVertical: number;
    };
    ecomBillTo: {
        flexDirection: "row";
        paddingHorizontal: number;
        paddingVertical: number;
        backgroundColor: string;
        borderBottomWidth: number;
        borderBottomColor: string;
        gap: number;
    };
    ecomLabel: {
        fontSize: number;
        color: string;
        fontWeight: "700";
        textTransform: "uppercase";
        marginBottom: number;
    };
    ecomValue: {
        fontSize: number;
        fontWeight: "600";
        color: string;
    };
    ecomSub: {
        fontSize: number;
        color: string;
    };
    flipkartCard: {
        borderWidth: number;
        borderColor: string;
        borderRadius: number;
    };
    flipkartHeader: {
        flexDirection: "row";
        justifyContent: "space-between";
        alignItems: "center";
        paddingHorizontal: number;
        paddingVertical: number;
    };
    flipkartShopName: {
        fontSize: number;
        fontWeight: "800";
        color: string;
    };
    flipkartInvBox: {
        alignItems: "flex-end";
    };
    flipkartInvNo: {
        fontSize: number;
        fontWeight: "700";
        color: string;
    };
    flipkartDate: {
        fontSize: number;
        color: string;
        marginTop: number;
    };
    flipkartCustomer: {
        paddingHorizontal: number;
        paddingVertical: number;
    };
    minimalCard: {
        borderWidth: number;
        borderColor: string;
        borderRadius: number;
    };
    minimalShopName: {
        fontSize: number;
        fontWeight: "800";
        paddingHorizontal: number;
        paddingVertical: number;
        borderBottomWidth: number;
        textAlign: "center";
    };
    minimalMeta: {
        flexDirection: "row";
        justifyContent: "space-between";
        paddingHorizontal: number;
        paddingVertical: number;
        backgroundColor: string;
        borderBottomWidth: number;
        borderBottomColor: string;
    };
    minimalLabel: {
        fontSize: number;
        color: string;
        textTransform: "uppercase";
        fontWeight: "600";
        marginBottom: number;
    };
    minimalValue: {
        fontSize: number;
        fontWeight: "700";
        color: string;
    };
    minimalSub: {
        fontSize: number;
        color: string;
        marginTop: number;
    };
    metaRow: {
        flexDirection: "row";
        justifyContent: "space-between";
        paddingHorizontal: number;
        paddingVertical: number;
    };
    metaBold: {
        fontWeight: "700";
        color: string;
        fontSize: number;
    };
    metaSmall: {
        fontSize: number;
        color: string;
        marginTop: number;
    };
    compositionText: {
        fontSize: number;
        color: string;
        fontWeight: "600";
    };
};
//# sourceMappingURL=InvoiceTemplatePreviewUtils.d.ts.map