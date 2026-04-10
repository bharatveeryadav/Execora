export interface Gstr3BTableSection {
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
}
export interface Gstr3BReport {
    tenantId: string;
    period: string; /** "MM-YYYY" */
    outwardSupplies: Gstr3BTableSection;
    zeroRatedSupplies: Gstr3BTableSection;
    inwardSupplies: Gstr3BTableSection;
    itcEligible: Gstr3BTableSection;
    netTaxPayable: {
        igst: number;
        cgst: number;
        sgst: number;
        cess: number;
    };
    interestLateFee: {
        interest: number;
        lateFee: number;
    };
}
//# sourceMappingURL=dto.d.ts.map