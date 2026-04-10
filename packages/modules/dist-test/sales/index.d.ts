/**
 * Sales Domain
 *
 * Owns all revenue-side transaction logic: invoice create/update, POS drafts,
 * billing rules, credit notes, and invoice PDF rendering.
 *
 * Top-level domains (per 02-domain-modules.md):
 *  - invoicing: create-invoice, update-invoice-status, returns, template-render
 *  - pos: cart-session, checkout
 *  - billing: tax-calculation
 *
 * Dependency rule: may import from finance/payments, crm/parties, inventory/stock
 */
export * from "./invoicing/create-invoice";
export * from "./invoicing/update-invoice-status";
export * from "./invoicing/returns";
export * from "./invoicing/template-render";
export * from "./pos/cart-session";
export * from "./pos/checkout";
export * from "./billing/tax-calculation";
export * from "./invoicing/numbering";
//# sourceMappingURL=index.d.ts.map