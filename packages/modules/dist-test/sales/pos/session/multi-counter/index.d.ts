/**
 * sales/pos/session/multi-counter
 *
 * Feature: parallel counter support — manage multiple simultaneous POS counters per tenant.
 */
export interface Counter {
    id: string;
    tenantId: string;
    name: string;
    locationId?: string;
    active: boolean;
}
export declare function listCounters(_tenantId: string): Promise<Counter[]>;
export declare function createCounter(_tenantId: string, _name: string, _locationId?: string): Promise<Counter>;
//# sourceMappingURL=index.d.ts.map