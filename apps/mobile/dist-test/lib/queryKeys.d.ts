/**
 * Centralized React Query key factory for the entire mobile app.
 * Ensures consistency across all screens and prevents silent cache misses.
 *
 * Pattern: Each entity has `.all()`, `.detail(id)`, and spec-specific keys.
 * Always use these instead of hardcoded ["invoice"], ["invoices"], etc.
 */
export declare const QUERY_KEYS: {
    readonly invoices: {
        readonly all: () => readonly ["invoices"];
        readonly detail: (id: string) => readonly ["invoices", string];
        readonly dashboard: () => readonly ["invoices", "dashboard"];
        readonly daybook: () => readonly ["invoices", "daybook"];
        readonly byCustomer: (customerId: string) => readonly ["invoices", "customer", string];
    };
    readonly customers: {
        readonly all: () => readonly ["customers"];
        readonly list: (search: string, page?: number) => readonly ["customers", string, number];
        readonly detail: (id: string) => readonly ["customers", string];
        readonly health: () => readonly ["customers", "health"];
        readonly overdue: () => readonly ["customers", "overdue"];
        readonly search: (query: string) => readonly ["customers", "search", string];
        readonly searchPay: (query: string) => readonly ["customers", "search-pay", string];
    };
    readonly products: {
        readonly all: () => readonly ["products"];
        readonly page: (page: number) => readonly ["products", "mobile", "all", number];
        readonly detail: (id: string) => readonly ["products", string];
        readonly lowStock: () => readonly ["products", "low-stock"];
        readonly expiring: () => readonly ["products", "expiring"];
        readonly expiryPage: (filter?: string) => readonly ["products", "expiry-page", string];
        readonly catalog: () => readonly ["products-catalog"];
        readonly search: (query: string) => readonly ["products", "search", string];
        readonly imageUrls: (ids: string[]) => readonly ["products", "imageUrls", string];
    };
    readonly customerDetail: {
        readonly base: (id: string) => readonly ["customer", string];
        readonly invoices: (id: string) => readonly ["customer", "invoices", string];
        readonly ledger: (id: string) => readonly ["customer", "ledger", string];
    };
    readonly expenses: {
        readonly all: () => readonly ["expenses"];
        readonly byDate: (date: string) => readonly ["expenses", string];
    };
    readonly cashbook: {
        readonly all: () => readonly ["cashbook"];
        readonly summary: () => readonly ["cashbook", "summary"];
    };
    readonly payments: {
        readonly all: () => readonly ["payments"];
        readonly detail: (id: string) => readonly ["payments", string];
    };
    readonly feed: {
        readonly all: () => readonly ["feed"];
        readonly ai: () => readonly ["feed", "ai"];
    };
    readonly company: {
        readonly profile: () => readonly ["company", "profile"];
    };
    readonly reminders: {
        readonly all: () => readonly ["reminders"];
    };
    readonly user: {
        readonly current: () => readonly ["user", "current"];
    };
};
//# sourceMappingURL=queryKeys.d.ts.map