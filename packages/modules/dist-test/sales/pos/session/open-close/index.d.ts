/**
 * sales/pos/session/open-close
 *
 * Feature: counter session open/close — opening cash, closing reconciliation, Z-report.
 */
export interface CounterSession {
    id: string;
    tenantId: string;
    counterId: string;
    openedBy: string;
    openedAt: string;
    closedAt?: string;
    openingCash: number;
    closingCash?: number;
    status: "open" | "closed";
}
export declare function openCounterSession(_tenantId: string, _counterId: string, _openedBy: string, _openingCash: number): Promise<CounterSession>;
export declare function closeCounterSession(_sessionId: string, _closingCash: number): Promise<CounterSession>;
export declare function getActiveSession(_tenantId: string, _counterId: string): Promise<CounterSession | null>;
//# sourceMappingURL=index.d.ts.map