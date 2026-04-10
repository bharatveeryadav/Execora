/**
 * inventory/stock/reservations
 *
 * Feature: soft-reserve stock for pending orders before confirmation.
 * Stub — reservation ledger not yet in schema (⏳).
 */
export interface StockReservation {
    id: string;
    productId: string;
    tenantId: string;
    quantity: number;
    orderId: string;
    expiresAt: Date;
    status: "active" | "released" | "consumed";
}
export declare function reserveStock(_tenantId: string, _productId: string, _quantity: number, _orderId: string): Promise<StockReservation | null>;
export declare function releaseReservation(_reservationId: string): Promise<boolean>;
//# sourceMappingURL=reservations.d.ts.map