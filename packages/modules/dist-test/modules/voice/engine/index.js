"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessEngine = void 0;
/**
 * BusinessEngine — intent dispatcher.
 *
 * This file is intentionally thin: it just maps IntentType → handler function.
 * All business logic lives in the focused handler files alongside this one.
 *
 * Handler files:
 *   invoice.handler.ts  — CREATE_INVOICE, CONFIRM_INVOICE, CANCEL_INVOICE, SHOW_PENDING_INVOICE, TOGGLE_GST, PROVIDE_EMAIL
 *   customer.handler.ts — CREATE_CUSTOMER, UPDATE_CUSTOMER, GET_CUSTOMER_INFO, DELETE_CUSTOMER_DATA, CHECK_BALANCE, LIST_CUSTOMER_BALANCES, TOTAL_PENDING_AMOUNT
 *   payment.handler.ts  — RECORD_PAYMENT, ADD_CREDIT
 *   reminder.handler.ts — CREATE_REMINDER, CANCEL_REMINDER, LIST_REMINDERS, MODIFY_REMINDER
 *   report.handler.ts   — DAILY_SUMMARY, CHECK_STOCK
 *   product.handler.ts  — UPDATE_STOCK
 *   shared.ts           — resolveCustomer, formatItemsSummary, buildAndStoreInvoicePdf, sendConfirmedInvoiceEmail
 */
const core_1 = require("@execora/core");
const types_1 = require("@execora/types");
const invoice_handler_1 = require("./invoice.handler");
const customer_handler_1 = require("./customer.handler");
const payment_handler_1 = require("./payment.handler");
const reminder_handler_1 = require("./reminder.handler");
const report_handler_1 = require("./report.handler");
const product_handler_1 = require("./product.handler");
class BusinessEngine {
    async execute(intent, conversationId) {
        try {
            core_1.logger.info({ intent: intent.intent, entities: intent.entities, conversationId }, "Executing intent");
            const e = intent.entities;
            const id = conversationId;
            switch (intent.intent) {
                // ── Invoice ──────────────────────────────────────────────────────────
                case types_1.IntentType.CREATE_INVOICE:
                    return (0, invoice_handler_1.executeCreateInvoice)(e, id);
                case types_1.IntentType.CONFIRM_INVOICE:
                    return (0, invoice_handler_1.executeConfirmInvoice)(e, id);
                case types_1.IntentType.CANCEL_INVOICE:
                    return (0, invoice_handler_1.executeCancelInvoice)(e, id);
                case types_1.IntentType.SHOW_PENDING_INVOICE:
                    return (0, invoice_handler_1.executeShowPendingInvoice)(e, id);
                case types_1.IntentType.TOGGLE_GST:
                    return (0, invoice_handler_1.executeToggleGst)(e, id);
                case types_1.IntentType.PROVIDE_EMAIL:
                case types_1.IntentType.SEND_INVOICE:
                    return (0, invoice_handler_1.executeProvideEmail)(e, id);
                case types_1.IntentType.ADD_DISCOUNT:
                    return (0, invoice_handler_1.executeAddDiscount)(e, id);
                case types_1.IntentType.SET_SUPPLY_TYPE:
                    return (0, invoice_handler_1.executeSetSupplyType)(e, id);
                case types_1.IntentType.SET_PRICE_TIER:
                    return (0, invoice_handler_1.executeSetPriceTier)(e);
                case types_1.IntentType.RECORD_MIXED_PAYMENT:
                    return (0, invoice_handler_1.executeRecordMixedPayment)(e, id);
                // ── Customer ─────────────────────────────────────────────────────────
                case types_1.IntentType.TOTAL_PENDING_AMOUNT:
                    return (0, customer_handler_1.executeTotalPendingAmount)();
                case types_1.IntentType.LIST_CUSTOMER_BALANCES:
                    return (0, customer_handler_1.executeListCustomerBalances)();
                case types_1.IntentType.CHECK_BALANCE:
                    return (0, customer_handler_1.executeCheckBalance)(e, id);
                case types_1.IntentType.CREATE_CUSTOMER:
                    return (0, customer_handler_1.executeCreateCustomer)(e, id);
                case types_1.IntentType.UPDATE_CUSTOMER_PHONE:
                case types_1.IntentType.UPDATE_CUSTOMER:
                    return (0, customer_handler_1.executeUpdateCustomer)(e, id);
                case types_1.IntentType.GET_CUSTOMER_INFO:
                    return (0, customer_handler_1.executeGetCustomerInfo)(e, id);
                case types_1.IntentType.DELETE_CUSTOMER_DATA:
                    return (0, customer_handler_1.executeDeleteCustomerData)(e, id);
                // ── Payment ──────────────────────────────────────────────────────────
                case types_1.IntentType.RECORD_PAYMENT:
                    return (0, payment_handler_1.executeRecordPayment)(e, id);
                case types_1.IntentType.ADD_CREDIT:
                    return (0, payment_handler_1.executeAddCredit)(e, id);
                // ── Reminder ─────────────────────────────────────────────────────────
                case types_1.IntentType.CREATE_REMINDER:
                    return (0, reminder_handler_1.executeCreateReminder)(e, id);
                case types_1.IntentType.CANCEL_REMINDER:
                    return (0, reminder_handler_1.executeCancelReminder)(e, id);
                case types_1.IntentType.LIST_REMINDERS:
                    return (0, reminder_handler_1.executeListReminders)();
                case types_1.IntentType.MODIFY_REMINDER:
                    return (0, reminder_handler_1.executeModifyReminder)(e, id);
                // ── Reports ──────────────────────────────────────────────────────────
                case types_1.IntentType.DAILY_SUMMARY:
                    return (0, report_handler_1.executeDailySummary)();
                case types_1.IntentType.CHECK_STOCK:
                    return (0, report_handler_1.executeCheckStock)(e);
                case types_1.IntentType.UPDATE_STOCK:
                    return (0, product_handler_1.executeUpdateStock)(e);
                case "EXPORT_GSTR1":
                    return (0, report_handler_1.executeExportGstr1)(e);
                case "EXPORT_PNL":
                    return (0, report_handler_1.executeExportPnl)(e);
                // ── Session (handled by WS layer; engine just acknowledges) ──────────
                case types_1.IntentType.SWITCH_LANGUAGE:
                    return {
                        success: true,
                        message: `Language switched to ${e?.language || "hi"}`,
                        data: { language: e?.language || "hi" },
                    };
                case types_1.IntentType.START_RECORDING:
                    return {
                        success: true,
                        message: "Recording started",
                        data: { recording: true },
                    };
                case types_1.IntentType.STOP_RECORDING:
                    return {
                        success: true,
                        message: "Recording stopped",
                        data: { recording: false },
                    };
                default:
                    return {
                        success: false,
                        message: "Intent not recognized",
                        error: "UNKNOWN_INTENT",
                    };
            }
        }
        catch (error) {
            core_1.logger.error({ error, intent, conversationId }, "Business execution failed");
            return {
                success: false,
                message: "Execution failed",
                error: error.message,
            };
        }
    }
}
exports.businessEngine = new BusinessEngine();
//# sourceMappingURL=index.js.map