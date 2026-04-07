/**
 * sales/pos/checkout
 *
 * Feature: finalise a cart-session draft into a confirmed invoice.
 * Owner: sales/pos domain
 * Write path: confirmDraft (re-exported here for checkout flow)
 */
export * from "./contracts/commands";
export { confirmDraft } from "../cart-session/draft";
