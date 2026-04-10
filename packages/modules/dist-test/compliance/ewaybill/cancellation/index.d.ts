/** Cancel an e-Way Bill on NIC portal. Stub (⏳). */
export interface CancelEwbCommand {
    ewbNo: string;
    cancelReason: 1 | 2 | 3 | 4;
    cancelRemark?: string;
}
export declare function cancelEwayBill(_cmd: CancelEwbCommand): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map