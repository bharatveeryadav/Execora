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
 *   shared.ts           — resolveCustomer, formatItemsSummary, buildAndStoreInvoicePdf, sendConfirmedInvoiceEmail
 */
import { logger } from '@execora/infrastructure';
import { IntentType, type IntentExtraction, type ExecutionResult } from '@execora/types';

import { executeCreateInvoice, executeConfirmInvoice, executeCancelInvoice, executeShowPendingInvoice, executeToggleGst, executeProvideEmail, executeAddDiscount, executeSetSupplyType, executeRecordMixedPayment } from './invoice.handler';
import { executeTotalPendingAmount, executeListCustomerBalances, executeCheckBalance, executeCreateCustomer, executeUpdateCustomer, executeGetCustomerInfo, executeDeleteCustomerData } from './customer.handler';
import { executeRecordPayment, executeAddCredit } from './payment.handler';
import { executeCreateReminder, executeCancelReminder, executeListReminders, executeModifyReminder } from './reminder.handler';
import { executeDailySummary, executeCheckStock, executeExportGstr1, executeExportPnl } from './report.handler';

class BusinessEngine {
  async execute(intent: IntentExtraction, conversationId?: string): Promise<ExecutionResult> {
    try {
      logger.info({ intent: intent.intent, entities: intent.entities, conversationId }, 'Executing intent');

      const e  = intent.entities;
      const id = conversationId;

      switch (intent.intent) {
        // ── Invoice ──────────────────────────────────────────────────────────
        case IntentType.CREATE_INVOICE:        return executeCreateInvoice(e, id);
        case IntentType.CONFIRM_INVOICE:       return executeConfirmInvoice(e, id);
        case IntentType.CANCEL_INVOICE:        return executeCancelInvoice(e, id);
        case IntentType.SHOW_PENDING_INVOICE:  return executeShowPendingInvoice(e, id);
        case IntentType.TOGGLE_GST:            return executeToggleGst(e, id);
        case IntentType.PROVIDE_EMAIL:
        case IntentType.SEND_INVOICE:          return executeProvideEmail(e, id);
        case IntentType.ADD_DISCOUNT:          return executeAddDiscount(e, id);
        case IntentType.SET_SUPPLY_TYPE:       return executeSetSupplyType(e, id);
        case IntentType.RECORD_MIXED_PAYMENT:  return executeRecordMixedPayment(e, id);

        // ── Customer ─────────────────────────────────────────────────────────
        case IntentType.TOTAL_PENDING_AMOUNT:  return executeTotalPendingAmount();
        case IntentType.LIST_CUSTOMER_BALANCES: return executeListCustomerBalances();
        case IntentType.CHECK_BALANCE:         return executeCheckBalance(e, id);
        case IntentType.CREATE_CUSTOMER:       return executeCreateCustomer(e, id);
        case IntentType.UPDATE_CUSTOMER_PHONE:
        case IntentType.UPDATE_CUSTOMER:       return executeUpdateCustomer(e, id);
        case IntentType.GET_CUSTOMER_INFO:     return executeGetCustomerInfo(e, id);
        case IntentType.DELETE_CUSTOMER_DATA:  return executeDeleteCustomerData(e, id);

        // ── Payment ──────────────────────────────────────────────────────────
        case IntentType.RECORD_PAYMENT:        return executeRecordPayment(e, id);
        case IntentType.ADD_CREDIT:            return executeAddCredit(e, id);

        // ── Reminder ─────────────────────────────────────────────────────────
        case IntentType.CREATE_REMINDER:       return executeCreateReminder(e, id);
        case IntentType.CANCEL_REMINDER:       return executeCancelReminder(e, id);
        case IntentType.LIST_REMINDERS:        return executeListReminders();
        case IntentType.MODIFY_REMINDER:       return executeModifyReminder(e, id);

        // ── Reports ──────────────────────────────────────────────────────────
        case IntentType.DAILY_SUMMARY:         return executeDailySummary();
        case IntentType.CHECK_STOCK:           return executeCheckStock(e);
        case 'EXPORT_GSTR1' as IntentType:     return executeExportGstr1(e);
        case 'EXPORT_PNL'   as IntentType:     return executeExportPnl(e);

        // ── Session (handled by WS layer; engine just acknowledges) ──────────
        case IntentType.SWITCH_LANGUAGE:
          return { success: true, message: `Language switched to ${e?.language || 'hi'}`, data: { language: e?.language || 'hi' } };
        case IntentType.START_RECORDING:
          return { success: true, message: 'Recording started', data: { recording: true } };
        case IntentType.STOP_RECORDING:
          return { success: true, message: 'Recording stopped', data: { recording: false } };

        default:
          return { success: false, message: 'Intent not recognized', error: 'UNKNOWN_INTENT' };
      }
    } catch (error: any) {
      logger.error({ error, intent, conversationId }, 'Business execution failed');
      return { success: false, message: 'Execution failed', error: error.message };
    }
  }
}

export const businessEngine = new BusinessEngine();
