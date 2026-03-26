/**
 * Centralized React Query key factory for the entire mobile app.
 * Ensures consistency across all screens and prevents silent cache misses.
 *
 * Pattern: Each entity has `.all()`, `.detail(id)`, and spec-specific keys.
 * Always use these instead of hardcoded ["invoice"], ["invoices"], etc.
 */

export const QUERY_KEYS = {
  // ──────────────────────────────────────────────────────────────────────────
  // Invoices
  // ──────────────────────────────────────────────────────────────────────────
  invoices: {
    all: () => ["invoices"] as const,
    detail: (id: string) => ["invoices", id] as const,
    dashboard: () => ["invoices", "dashboard"] as const,
    daybook: () => ["invoices", "daybook"] as const,
    byCustomer: (customerId: string) =>
      ["invoices", "customer", customerId] as const,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Customers
  // ──────────────────────────────────────────────────────────────────────────
  customers: {
    all: () => ["customers"] as const,
    list: (search: string, page = 1) => ["customers", search, page] as const,
    detail: (id: string) => ["customers", id] as const,
    health: () => ["customers", "health"] as const,
    overdue: () => ["customers", "overdue"] as const,
    search: (query: string) => ["customers", "search", query] as const,
    searchPay: (query: string) => ["customers", "search-pay", query] as const,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Products
  // ──────────────────────────────────────────────────────────────────────────
  products: {
    all: () => ["products"] as const,
    page: (page: number) => ["products", "mobile", "all", page] as const,
    detail: (id: string) => ["products", id] as const,
    lowStock: () => ["products", "low-stock"] as const,
    expiring: () => ["products", "expiring"] as const,
    expiryPage: (filter?: string) =>
      ["products", "expiry-page", filter || "default"] as const,
    catalog: () => ["products-catalog"] as const,
    search: (query: string) => ["products", "search", query] as const,
    imageUrls: (ids: string[]) =>
      ["products", "imageUrls", ids.join(",")] as const,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Customer Details (nested queries)
  // ──────────────────────────────────────────────────────────────────────────
  customerDetail: {
    base: (id: string) => ["customer", id] as const,
    invoices: (id: string) => ["customer", "invoices", id] as const,
    ledger: (id: string) => ["customer", "ledger", id] as const,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Expenses & Accounting
  // ──────────────────────────────────────────────────────────────────────────
  expenses: {
    all: () => ["expenses"] as const,
    byDate: (date: string) => ["expenses", date] as const,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Cashbook & Payments
  // ──────────────────────────────────────────────────────────────────────────
  cashbook: {
    all: () => ["cashbook"] as const,
    summary: () => ["cashbook", "summary"] as const,
  },

  payments: {
    all: () => ["payments"] as const,
    detail: (id: string) => ["payments", id] as const,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Feed & Alerts
  // ──────────────────────────────────────────────────────────────────────────
  feed: {
    all: () => ["feed"] as const,
    ai: () => ["feed", "ai"] as const,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Other
  // ──────────────────────────────────────────────────────────────────────────
  company: {
    profile: () => ["company", "profile"] as const,
  },

  reminders: {
    all: () => ["reminders"] as const,
  },

  user: {
    current: () => ["user", "current"] as const,
  },
} as const;
