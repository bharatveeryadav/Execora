"use strict";
/**
 * Centralized React Query key factory for the entire mobile app.
 * Ensures consistency across all screens and prevents silent cache misses.
 *
 * Pattern: Each entity has `.all()`, `.detail(id)`, and spec-specific keys.
 * Always use these instead of hardcoded ["invoice"], ["invoices"], etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUERY_KEYS = void 0;
exports.QUERY_KEYS = {
    // ──────────────────────────────────────────────────────────────────────────
    // Invoices
    // ──────────────────────────────────────────────────────────────────────────
    invoices: {
        all: () => ["invoices"],
        detail: (id) => ["invoices", id],
        dashboard: () => ["invoices", "dashboard"],
        daybook: () => ["invoices", "daybook"],
        byCustomer: (customerId) => ["invoices", "customer", customerId],
    },
    // ──────────────────────────────────────────────────────────────────────────
    // Customers
    // ──────────────────────────────────────────────────────────────────────────
    customers: {
        all: () => ["customers"],
        list: (search, page = 1) => ["customers", search, page],
        detail: (id) => ["customers", id],
        health: () => ["customers", "health"],
        overdue: () => ["customers", "overdue"],
        search: (query) => ["customers", "search", query],
        searchPay: (query) => ["customers", "search-pay", query],
    },
    // ──────────────────────────────────────────────────────────────────────────
    // Products
    // ──────────────────────────────────────────────────────────────────────────
    products: {
        all: () => ["products"],
        page: (page) => ["products", "mobile", "all", page],
        detail: (id) => ["products", id],
        lowStock: () => ["products", "low-stock"],
        expiring: () => ["products", "expiring"],
        expiryPage: (filter) => ["products", "expiry-page", filter || "default"],
        catalog: () => ["products-catalog"],
        search: (query) => ["products", "search", query],
        imageUrls: (ids) => ["products", "imageUrls", ids.join(",")],
    },
    // ──────────────────────────────────────────────────────────────────────────
    // Customer Details (nested queries)
    // ──────────────────────────────────────────────────────────────────────────
    customerDetail: {
        base: (id) => ["customer", id],
        invoices: (id) => ["customer", "invoices", id],
        ledger: (id) => ["customer", "ledger", id],
    },
    // ──────────────────────────────────────────────────────────────────────────
    // Expenses & Accounting
    // ──────────────────────────────────────────────────────────────────────────
    expenses: {
        all: () => ["expenses"],
        byDate: (date) => ["expenses", date],
    },
    // ──────────────────────────────────────────────────────────────────────────
    // Cashbook & Payments
    // ──────────────────────────────────────────────────────────────────────────
    cashbook: {
        all: () => ["cashbook"],
        summary: () => ["cashbook", "summary"],
    },
    payments: {
        all: () => ["payments"],
        detail: (id) => ["payments", id],
    },
    // ──────────────────────────────────────────────────────────────────────────
    // Feed & Alerts
    // ──────────────────────────────────────────────────────────────────────────
    feed: {
        all: () => ["feed"],
        ai: () => ["feed", "ai"],
    },
    // ──────────────────────────────────────────────────────────────────────────
    // Other
    // ──────────────────────────────────────────────────────────────────────────
    company: {
        profile: () => ["company", "profile"],
    },
    reminders: {
        all: () => ["reminders"],
    },
    user: {
        current: () => ["user", "current"],
    },
};
//# sourceMappingURL=queryKeys.js.map