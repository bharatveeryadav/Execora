/**
 * sales/invoicing/returns
 *
 * Feature: credit notes — issue, track, and cancel returns against invoices.
 * Owner: sales domain (accounting/credit-notes is the source of truth)
 * Write path: createCreditNote, issueCreditNote, cancelCreditNote, deleteCreditNote
 * Read path: listCreditNotes, getCreditNoteById
 */
export * from "./contracts/commands";
export * from "../../../accounting/credit-notes/credit-note";
