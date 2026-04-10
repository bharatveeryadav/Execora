/**
 * compliance/e-invoicing/schema-builder
 *
 * Feature: build IRP-compatible JSON payload from an internal invoice.
 * Stub — full mapping to NIC schema is planned (⏳).
 */
export interface IrpInvoicePayload {
    Version: string;
    TranDtls: {
        TaxSch: string;
        SupTyp: string;
        RegRev: string;
        IgstOnIntra: string;
    };
    DocDtls: {
        Typ: string;
        No: string;
        Dt: string;
    };
    SellerDtls: {
        Gstin: string;
        TrdNm: string;
        Addr1: string;
        Loc: string;
        Pin: number;
        Stcd: string;
    };
    BuyerDtls: {
        Gstin?: string;
        TrdNm: string;
        Addr1: string;
        Loc: string;
        Pin: number;
        Stcd: string;
        Pos: string;
    };
    ItemList: {
        SlNo: string;
        PrdDesc: string;
        IsServc: string;
        HsnCd: string;
        Qty: number;
        Unit: string;
        UnitPrice: number;
        TotAmt: number;
        GstRt: number;
        IgstAmt: number;
        CgstAmt: number;
        SgstAmt: number;
        TotItemVal: number;
    }[];
    ValDtls: {
        AssVal: number;
        IgstVal: number;
        CgstVal: number;
        SgstVal: number;
        TotInvVal: number;
    };
}
export declare function buildIrpPayload(invoiceId: string, tenantId: string): Promise<IrpInvoicePayload | null>;
//# sourceMappingURL=index.d.ts.map