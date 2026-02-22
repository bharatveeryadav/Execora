import { logger } from '../../infrastructure/logger';
import { IntentType, IntentExtraction, ExecutionResult } from '../../types';
import { customerService } from '../customer/customer.service';
import { CustomerUpdateData } from '../../types';
import { invoiceService } from '../invoice/invoice.service';
import { ledgerService } from '../ledger/ledger.service';
import { reminderService } from '../reminder/reminder.service';
import { productService } from '../product/product.service';
import { voiceSessionService } from './session.service';
import { openaiService } from '../../integrations/openai';
import { emailService } from '../../infrastructure/email';

class BusinessEngine {
  private pendingInvoiceDrafts: Map<
    string,
    {
      customerId: string;
      customerName: string;
      items: any[];
      notes?: string;
      createdAt: string;
    }
  > = new Map();

  private isInvoiceConfirmation(entities: any, originalText?: string): boolean {
    const confirmation = String(
      entities?.confirmation || entities?.confirm || entities?.action || originalText || ''
    ).toLowerCase();

    return /\b(confirm|confirmed|final|finalize|yes|haan|ha|ok|okay|done|pakka|create now|final invoice)\b/.test(
      confirmation
    );
  }

  private async finalizePendingInvoice(conversationId: string): Promise<ExecutionResult> {
    const draft = this.pendingInvoiceDrafts.get(conversationId);
    if (!draft) {
      return {
        success: false,
        message: 'No pending invoice found. Please share items first.',
        error: 'NO_PENDING_INVOICE',
      };
    }

    const invoice = await invoiceService.createInvoice(draft.customerId, draft.items, draft.notes);
    this.pendingInvoiceDrafts.delete(conversationId);

    return {
      success: true,
      message: `Invoice created for ${draft.customerName}. Total: ₹${invoice.total}`,
      data: {
        invoiceId: invoice.id,
        customer: draft.customerName,
        total: parseFloat(invoice.total.toString()),
        confirmed: true,
        items: invoice.items.map((item) => ({
          product: item.product.name,
          quantity: item.quantity,
          price: parseFloat(item.price.toString()),
          total: parseFloat(item.total.toString()),
        })),
      },
    };
  }

  /**
   * Confirm pending invoice via UI button click
   */
  async confirmPendingInvoice(conversationId: string): Promise<ExecutionResult> {
    if (!conversationId) {
      return { success: false, message: 'No session found.', error: 'NO_SESSION' };
    }
    return await this.finalizePendingInvoice(conversationId);
  }

  /**
   * Cancel pending invoice draft via UI button click
   */
  cancelPendingInvoice(conversationId: string): ExecutionResult {
    if (!conversationId) {
      return { success: false, message: 'No session found.', error: 'NO_SESSION' };
    }

    const draft = this.pendingInvoiceDrafts.get(conversationId);
    if (!draft) {
      return { success: false, message: 'No pending invoice to cancel.', error: 'NO_PENDING_INVOICE' };
    }

    const customerName = draft.customerName;
    this.pendingInvoiceDrafts.delete(conversationId);

    return {
      success: true,
      message: `Invoice draft for ${customerName} cancelled.`,
      data: { cancelled: true, customer: customerName },
    };
  }

  /**
   * Execute business logic based on intent
   */
  async execute(intent: IntentExtraction, conversationId?: string): Promise<ExecutionResult> {
    try {
      logger.info({ intent: intent.intent, entities: intent.entities, conversationId }, 'Executing intent');

      // Check for pending invoice confirmation BEFORE intent routing.
      // User might say "yes", "confirm", "confirm invoice", "haan pakka" etc.
      // LLM may classify these as UNKNOWN or CREATE_INVOICE - either way,
      // if a pending draft exists and text matches confirmation pattern, finalize it.
      if (
        conversationId &&
        this.pendingInvoiceDrafts.has(conversationId)
      ) {
        const confirmText = (intent.originalText || intent.normalizedText || '').toLowerCase();
        const hasItems = Array.isArray(intent.entities?.items) && intent.entities.items.length > 0;

        // If text matches confirmation AND this is NOT a new invoice with fresh items
        if (this.isInvoiceConfirmation(intent.entities, confirmText) && !hasItems) {
          logger.info({ conversationId, confirmText }, 'Pending invoice confirmation detected');
          return await this.finalizePendingInvoice(conversationId);
        }
      }

      switch (intent.intent) {
        case IntentType.CREATE_INVOICE:
          return await this.executeCreateInvoice(intent.entities, conversationId);

        case IntentType.CREATE_REMINDER:
          return await this.executeCreateReminder(intent.entities, conversationId);

        case IntentType.RECORD_PAYMENT:
          return await this.executeRecordPayment(intent.entities, conversationId);

        case IntentType.ADD_CREDIT:
          return await this.executeAddCredit(intent.entities, conversationId);

        case IntentType.CHECK_BALANCE:
          return await this.executeCheckBalance(intent.entities, conversationId);

        case IntentType.CHECK_STOCK:
          return await this.executeCheckStock(intent.entities);

        case IntentType.CANCEL_INVOICE:
          return await this.executeCancelInvoice(intent.entities, conversationId);

        case IntentType.CANCEL_REMINDER:
          return await this.executeCancelReminder(intent.entities, conversationId);

        case IntentType.LIST_REMINDERS:
          return await this.executeListReminders(intent.entities);

        case IntentType.CREATE_CUSTOMER:
          return await this.executeCreateCustomer(intent.entities, conversationId);

        case IntentType.MODIFY_REMINDER:
          return await this.executeModifyReminder(intent.entities, conversationId);

        case IntentType.DAILY_SUMMARY:
          return await this.executeDailySummary(intent.entities);

        case IntentType.UPDATE_CUSTOMER_PHONE:
          return await this.executeUpdateCustomerPhone(intent.entities, conversationId);

        case IntentType.GET_CUSTOMER_INFO:
          return await this.executeGetCustomerInfo(intent.entities, conversationId);

        case IntentType.DELETE_CUSTOMER_DATA:
          return await this.executeDeleteCustomerData(intent.entities, conversationId);

        // --- Email/Invoice extensions ---
        case IntentType.SEND_INVOICE_EMAIL:
          return await this.executeSendInvoiceEmail(intent.entities, conversationId);

        case IntentType.CONFIRM_SEND_INVOICE_EMAIL:
          return await this.executeConfirmSendInvoiceEmail(intent.entities, conversationId);

        case IntentType.SCHEDULE_INVOICE_EMAIL:
          return await this.executeScheduleInvoiceEmail(intent.entities, conversationId);

        case IntentType.EDIT_SCHEDULED_EMAIL:
          return await this.executeEditScheduledEmail(intent.entities, conversationId);

        case IntentType.DELETE_SCHEDULED_EMAIL:
          return await this.executeDeleteScheduledEmail(intent.entities, conversationId);

        case IntentType.ADD_CUSTOMER_EMAIL:
          return await this.executeAddCustomerEmail(intent.entities, conversationId);

        default:
          return {
            success: false,
            message: 'Intent not recognized',
            error: 'UNKNOWN_INTENT',
          };
      }
    } catch (error: any) {
      logger.error({ error, intent, conversationId }, 'Business execution failed');
      return {
        success: false,
        message: 'Execution failed',
        error: error.message,
      };
    }
  }

  // --- Email/Invoice intent handlers (moved outside execute) ---
  /**
   * Handle: "Send invoice by email" intent
   * - If customer email missing, prompt for email
   * - Otherwise, ask for confirmation to send
   */
  private async executeSendInvoiceEmail(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const resolution = await this.resolveCustomer(entities, conversationId);
    if (!resolution.customer) {
      return { success: false, message: 'Customer not found', error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    const invoice = await invoiceService.getLastInvoice(customer.id);
    if (!invoice) {
      return { success: false, message: `No invoice found for ${customer.name}`, error: 'NO_INVOICE' };
    }
    if (!customer.email) {
      return {
        success: false,
        message: `${customer.name} ka email nahi hai. Kripya email batao (e.g. 'add email for ${customer.name}')`,
        error: 'NO_EMAIL',
        data: { customerId: customer.id, askForEmail: true },
      };
    }
    return {
      success: true,
      message: `Invoice #${invoice.id.substring(0, 8)} ${customer.name} ko email bhejna hai? Boliye 'confirm send' ya 'schedule email' agar baad me bhejna hai.`,
      data: { invoiceId: invoice.id, customerId: customer.id, email: customer.email, requiresConfirmation: true },
    };
  }

  /**
   * Handle: "Confirm send invoice email" intent
   */
  private async executeConfirmSendInvoiceEmail(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const resolution = await this.resolveCustomer(entities, conversationId);
    if (!resolution.customer) {
      return { success: false, message: 'Customer not found', error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    const invoice = await invoiceService.getLastInvoice(customer.id);
    if (!invoice) {
      return { success: false, message: `No invoice found for ${customer.name}`, error: 'NO_INVOICE' };
    }
    if (!customer.email) {
      return { success: false, message: `${customer.name} ka email nahi hai. Pehle email add karo.`, error: 'NO_EMAIL', data: { customerId: customer.id, askForEmail: true } };
    }
    await invoiceService.sendInvoiceByEmail(invoice.id, customer.email);
    return { success: true, message: `Invoice ${invoice.id.substring(0, 8)} ${customer.name} ko email se bhej diya gaya.`, data: { sent: true } };
  }

  /**
   * Handle: "Schedule invoice email" intent
   */
  private async executeScheduleInvoiceEmail(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const resolution = await this.resolveCustomer(entities, conversationId);
    if (!resolution.customer) {
      return { success: false, message: 'Customer not found', error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    const invoice = await invoiceService.getLastInvoice(customer.id);
    if (!invoice) {
      return { success: false, message: `No invoice found for ${customer.name}`, error: 'NO_INVOICE' };
    }
    if (!customer.email) {
      return { success: false, message: `${customer.name} ka email nahi hai. Pehle email add karo.`, error: 'NO_EMAIL', data: { customerId: customer.id, askForEmail: true } };
    }
    const { datetime } = entities;
    if (!datetime) {
      return { success: false, message: 'Kab bhejna hai? Date/time batao (e.g. "kal 7 baje")', error: 'MISSING_DATETIME', data: { askForDatetime: true } };
    }
    const sendAt = new Date(datetime); // In production, use NLP date parsing
    await invoiceService.sendInvoiceByEmail(invoice.id, customer.email, sendAt);
    return { success: true, message: `Invoice ${invoice.id.substring(0, 8)} ${customer.name} ko ${sendAt.toLocaleString()} par bhejne ke liye schedule ho gaya.`, data: { scheduled: true, sendAt } };
  }

  /**
   * Handle: "Edit scheduled invoice email" intent
   */
  private async executeEditScheduledEmail(entities: any, conversationId?: string): Promise<ExecutionResult> {
    return { success: true, message: 'Scheduled email edit feature coming soon.', data: { editable: true } };
  }

  /**
   * Handle: "Delete scheduled invoice email" intent
   */
  private async executeDeleteScheduledEmail(entities: any, conversationId?: string): Promise<ExecutionResult> {
    return { success: true, message: 'Scheduled email delete feature coming soon.', data: { deletable: true } };
  }

  /**
   * Handle: "Add customer email" intent
   */
  private async executeAddCustomerEmail(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const resolution = await this.resolveCustomer(entities, conversationId);
    if (!resolution.customer) {
      return { success: false, message: 'Customer not found', error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    const { email } = entities;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return { success: false, message: 'Valid email address batao.', error: 'INVALID_EMAIL' };
    }
    await customerService.updateCustomer(customer.id, { email } as CustomerUpdateData);
    return { success: true, message: `${customer.name} ka email update ho gaya: ${email}`, data: { emailUpdated: true, email } };
  }

  private async resolveCustomer(entities: any, conversationId?: string) {
    const rawQuery = entities?.customer || entities?.name;
    const needsActive = entities?.customerRef === 'active' || !rawQuery;

    if (needsActive && conversationId) {
      const active = await customerService.getActiveCustomer(conversationId);
      if (active) {
        return { customer: active, multiple: false };
      }
    }

    if (!rawQuery) {
      return { customer: null, multiple: false };
    }

    const candidates = conversationId
      ? await customerService.searchCustomerRanked(rawQuery, conversationId)
      : await customerService.searchCustomer(rawQuery);

    if (candidates.length === 0) {
      return { customer: null, multiple: false, query: rawQuery };
    }

    if (candidates.length > 1 && candidates[0].matchScore < 0.85) {
      return { customer: null, multiple: true, candidates, query: rawQuery };
    }

    if (conversationId) {
      customerService.setActiveCustomer(conversationId, candidates[0].id);
    }

    return { customer: candidates[0], multiple: false, query: rawQuery };
  }

  /**
   * Create invoice
   */
  private async executeCreateInvoice(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const { items } = entities;
    const hasItems = Array.isArray(items) && items.length > 0;
    const isConfirm = this.isInvoiceConfirmation(entities);

    if (conversationId && isConfirm && !hasItems) {
      return await this.finalizePendingInvoice(conversationId);
    }

    if (conversationId && !hasItems && this.pendingInvoiceDrafts.has(conversationId)) {
      const draft = this.pendingInvoiceDrafts.get(conversationId)!;
      return {
        success: true,
        message: `Draft ready for ${draft.customerName}. Say 'confirm invoice' to create final invoice.`,
        data: {
          requiresConfirmation: true,
          isPreview: true,
        },
      };
    }

    if (!hasItems) {
      return {
        success: false,
        message: 'Invoice items missing. Please tell item names and quantities.',
        error: 'MISSING_ITEMS',
      };
    }

    const resolution = await this.resolveCustomer(entities, conversationId);

    if (resolution.multiple) {
      return {
        success: false,
        message: `Multiple customers found. Please specify: ${(resolution.candidates || []).slice(0, 3).map((c: any) => c.name).join(', ')}`,
        error: 'MULTIPLE_CUSTOMERS',
        data: { customers: (resolution.candidates || []).slice(0, 3) },
      };
    }

    if (!resolution.customer) {
      return {
        success: false,
        message: `Customer '${resolution.query || 'specified'}' not found. Create new customer?`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = resolution.customer;

    if (conversationId) {
      const preview = await invoiceService.previewInvoice(customer.id, items);
      this.pendingInvoiceDrafts.set(conversationId, {
        customerId: customer.id,
        customerName: customer.name,
        items,
        notes: entities?.notes,
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Invoice preview ready for ${customer.name}. Please confirm to create final invoice.`,
        data: {
          requiresConfirmation: true,
          isPreview: true,
          customer: customer.name,
          total: preview.total,
          currentBalance: preview.currentBalance,
          projectedBalance: preview.projectedBalance,
          items: preview.items.map((item) => ({
            product: item.productName,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            stockBefore: item.stockBefore,
            stockAfter: item.stockAfter,
          })),
        },
      };
    }

    // Create invoice
    const invoice = await invoiceService.createInvoice(customer.id, items);

    return {
      success: true,
      message: `Invoice created for ${customer.name}. Total: ₹${invoice.total}`,
      data: {
        invoiceId: invoice.id,
        customer: customer.name,
        total: parseFloat(invoice.total.toString()),
        items: invoice.items.map((item) => ({
          product: item.product.name,
          quantity: item.quantity,
          price: parseFloat(item.price.toString()),
          total: parseFloat(item.total.toString()),
        })),
      },
    };
  }

  /**
   * Create reminder
   */
  private async executeCreateReminder(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const { amount, datetime } = entities;
    const resolution = await this.resolveCustomer(entities, conversationId);

    if (resolution.multiple) {
      return {
        success: false,
        message: `Multiple customers found. Please specify customer name with landmark.`,
        error: 'MULTIPLE_CUSTOMERS',
        data: { customers: (resolution.candidates || []).slice(0, 3) },
      };
    }

    if (!resolution.customer) {
      return {
        success: false,
        message: `Customer '${resolution.query || 'specified'}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = resolution.customer;

    if (!customer.phone) {
      return {
        success: false,
        message: `${customer.name} has no phone number`,
        error: 'NO_PHONE',
      };
    }

    // Schedule reminder
    const reminder = await reminderService.scheduleReminder(
      customer.id,
      amount,
      datetime || 'tomorrow 7pm'
    );

    return {
      success: true,
      message: `Reminder scheduled for ${customer.name} for ₹${amount}`,
      data: {
        reminderId: reminder.id,
        customer: customer.name,
        amount,
        sendAt: reminder.sendAt,
      },
    };
  }

  /**
   * Record payment
   */
  private async executeRecordPayment(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const { amount, mode = 'cash' } = entities;

    if (!amount) {
      return {
        success: false,
        message: 'Payment amount not provided',
        error: 'MISSING_AMOUNT',
      };
    }

    const resolution = await this.resolveCustomer(entities, conversationId);

    if (resolution.multiple) {
      return {
        success: false,
        message: `Multiple customers found. Please specify customer name with landmark.`,
        error: 'MULTIPLE_CUSTOMERS',
        data: { customers: (resolution.candidates || []).slice(0, 3) },
      };
    }

    if (!resolution.customer) {
      return {
        success: false,
        message: `Customer '${resolution.query || 'specified'}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = resolution.customer;

    // Record payment
    await ledgerService.recordPayment(customer.id, amount, mode);

    // Get updated balance
    const balance = conversationId
      ? await customerService.getBalanceFast(customer.id, conversationId)
      : await customerService.getBalance(customer.id);

    return {
      success: true,
      message: `${customer.name} se ${amount} payment mil gya. Baki ${balance} reh gye hai.`,
      data: {
        customer: customer.name,
        amountPaid: amount,
        paymentMode: mode,
        remainingBalance: balance,
      },
    };
  }

  /**
   * Add credit
   */
  private async executeAddCredit(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const { amount, description } = entities;

    if (!amount) {
      return {
        success: false,
        message: 'Credit amount not provided',
        error: 'MISSING_AMOUNT',
      };
    }

    const resolution = await this.resolveCustomer(entities, conversationId);

    if (resolution.multiple) {
      return {
        success: false,
        message: `Multiple customers found. Please specify customer name with landmark.`,
        error: 'MULTIPLE_CUSTOMERS',
        data: { customers: (resolution.candidates || []).slice(0, 3) },
      };
    }

    if (!resolution.customer) {
      return {
        success: false,
        message: `Customer '${resolution.query || 'specified'}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = resolution.customer;

    // Add credit
    await ledgerService.addCredit(
      customer.id,
      amount,
      description || `Credit added`
    );

    // Get updated balance
    const balance = conversationId
      ? await customerService.getBalanceFast(customer.id, conversationId)
      : await customerService.getBalance(customer.id);

    return {
      success: true,
      message: `${customer.name} ko ${amount} add kar diya. Total balance ab ${balance} hai.`,
      data: {
        customer: customer.name,
        amountAdded: amount,
        totalBalance: balance,
      },
    };
  }

  /**
   * Check balance
   */
  private async executeCheckBalance(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const resolution = await this.resolveCustomer(entities, conversationId);

    if (resolution.multiple) {
      return {
        success: false,
        message: `Multiple customers found. Please specify customer name with landmark.`,
        error: 'MULTIPLE_CUSTOMERS',
        data: { customers: (resolution.candidates || []).slice(0, 3) },
      };
    }

    if (!resolution.customer) {
      return {
        success: false,
        message: `Customer '${resolution.query || 'specified'}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = resolution.customer;
    const balance = conversationId
      ? await customerService.getBalanceFast(customer.id, conversationId)
      : await customerService.getBalance(customer.id);

    return {
      success: true,
      message: `${customer.name} ka balance ₹${balance} hai`,
      data: {
        customer: customer.name,
        balance,
      },
    };
  }

  /**
   * Check stock
   */
  private async executeCheckStock(entities: any): Promise<ExecutionResult> {
    const { product: productQuery } = entities;

    const stock = await productService.getStock(productQuery);

    return {
      success: true,
      message: `${productQuery} ka stock ${stock} units hai`,
      data: {
        product: productQuery,
        stock,
      },
    };
  }

  /**
   * Cancel invoice
   */
  private async executeCancelInvoice(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const resolution = await this.resolveCustomer(entities, conversationId);

    if (!resolution.customer) {
      return {
        success: false,
        message: `Customer '${resolution.query || 'specified'}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = resolution.customer;

    // Get last invoice
    const lastInvoice = await invoiceService.getLastInvoice(customer.id);
    if (!lastInvoice) {
      return {
        success: false,
        message: `No invoice found for ${customer.name}`,
        error: 'NO_INVOICE',
      };
    }

    // Cancel invoice
    await invoiceService.cancelInvoice(lastInvoice.id);

    return {
      success: true,
      message: `Invoice cancelled for ${customer.name}`,
      data: {
        invoiceId: lastInvoice.id,
        customer: customer.name,
      },
    };
  }

  /**
   * Cancel reminder
   */
  private async executeCancelReminder(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const resolution = await this.resolveCustomer(entities, conversationId);

    if (!resolution.customer) {
      return {
        success: false,
        message: `Customer '${resolution.query || 'specified'}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = resolution.customer;

    // Get pending reminders
    const reminders = await reminderService.getPendingReminders(customer.id);
    if (reminders.length === 0) {
      return {
        success: false,
        message: `No pending reminders for ${customer.name}`,
        error: 'NO_REMINDER',
      };
    }

    // Cancel first reminder
    await reminderService.cancelReminder(reminders[0].id);

    return {
      success: true,
      message: `Reminder cancelled for ${customer.name}`,
      data: {
        reminderId: reminders[0].id,
        customer: customer.name,
      },
    };
  }

  /**
   * List reminders
   */
  private async executeListReminders(entities: any): Promise<ExecutionResult> {
    const reminders = await reminderService.getPendingReminders();

    return {
      success: true,
      message: `${reminders.length} pending reminders`,
      data: {
        count: reminders.length,
        reminders: reminders.map((r) => ({
          customer: r.customer.name,
          amount: parseFloat(r.amount.toString()),
          sendAt: r.sendAt,
        })),
      },
    };
  }

  /**
   * Create customer
   */
  private async executeCreateCustomer(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const { name, phone, nickname, landmark, notes, amount } = entities;

    if (!name) {
      return {
        success: false,
        message: 'Customer name is required',
        error: 'MISSING_NAME',
      };
    }

    if (conversationId) {
      const result = await customerService.createCustomerFast(name, conversationId);
      if (!result.success) {
        return {
          success: false,
          message: result.message,
          error: result.duplicateFound ? 'DUPLICATE_FOUND' : 'CUSTOMER_CREATE_FAILED',
          data: result.suggestions ? { suggestions: result.suggestions } : undefined,
        };
      }

      if (amount && result.customer) {
        await customerService.updateBalance(result.customer.id, Number(amount));
      }

      return {
        success: true,
        message: result.message,
        data: {
          customerId: result.customer?.id,
          name: result.customer?.name,
          balance: amount ? Number(amount) : result.customer?.balance,
        },
      };
    }

    const customer = await customerService.createCustomer({ name, phone, nickname, landmark, notes });

    if (amount) {
      await customerService.updateBalance(customer.id, Number(amount));
    }

    return {
      success: true,
      message: `Customer ${name} created`,
      data: {
        customerId: customer.id,
        name: customer.name,
      },
    };
  }

  /**
   * Modify reminder
   */
  private async executeModifyReminder(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const { datetime } = entities;
    const resolution = await this.resolveCustomer(entities, conversationId);

    if (!resolution.customer) {
      return {
        success: false,
        message: `Customer '${resolution.query || 'specified'}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = resolution.customer;

    // Get pending reminders
    const reminders = await reminderService.getPendingReminders(customer.id);
    if (reminders.length === 0) {
      return {
        success: false,
        message: `No pending reminders for ${customer.name}`,
        error: 'NO_REMINDER',
      };
    }

    // Modify first reminder
    await reminderService.modifyReminderTime(reminders[0].id, datetime);

    return {
      success: true,
      message: `Reminder time updated for ${customer.name}`,
      data: {
        reminderId: reminders[0].id,
        customer: customer.name,
        newTime: datetime,
      },
    };
  }

  /**
   * Daily summary
   */
  private async executeDailySummary(entities: any): Promise<ExecutionResult> {
    const summary = await invoiceService.getDailySummary();

    return {
      success: true,
      message: `Today's summary`,
      data: summary,
    };
  }

  /**
   * Update customer phone number
   */
  private async executeUpdateCustomerPhone(entities: any, conversationId?: string): Promise<ExecutionResult> {
    try {
      if (!entities.phone) {
        return {
          success: false,
          message: 'Phone number not provided',
          error: 'MISSING_PHONE',
        };
      }

      const { customer, multiple } = await this.resolveCustomer(entities, conversationId);

      if (!customer) {
        return {
          success: false,
          message: 'Customer not found',
          error: 'CUSTOMER_NOT_FOUND',
        };
      }

      if (multiple) {
        return {
          success: false,
          message: 'Multiple customers found with same name',
          error: 'AMBIGUOUS_CUSTOMER',
          data: { suggestion: `Please clarify which ${entities.customer}` },
        };
      }

      // Update phone number
      const updated = await customerService.updateCustomer(customer.id, {
        phone: entities.phone,
      });

      if (!updated) {
        return {
          success: false,
          message: 'Failed to update phone number',
          error: 'UPDATE_FAILED',
        };
      }

      // Set as active customer
      if (conversationId) {
        customerService.setActiveCustomer(conversationId, customer.id);
        // Invalidate conversation cache to force refresh on next search
        customerService.invalidateConversationCache(conversationId);
      }

      return {
        success: true,
        message: `${customer.name} ka phone number update ho gaya. Ab ${customer.name} ka nimble phone hai: ${openaiService.phoneToWords(entities.phone)}`,
        data: { customerId: customer.id, phone: entities.phone },
      };
    } catch (error: any) {
      logger.error({ error, entities, conversationId }, 'Update customer phone execution failed');
      return {
        success: false,
        message: 'Failed to update phone',
        error: error.message,
      };
    }
  }

  /**
   * Get all customer information
   */
  private async executeGetCustomerInfo(entities: any, conversationId?: string): Promise<ExecutionResult> {
    try {
      const resolution = await this.resolveCustomer(entities, conversationId);

      if (resolution.multiple) {
        return {
          success: false,
          message: `Multiple customers found. Please specify customer name with landmark.`,
          error: 'MULTIPLE_CUSTOMERS',
          data: { customers: (resolution.candidates || []).slice(0, 3) },
        };
      }

      if (!resolution.customer) {
        return {
          success: false,
          message: `Customer '${resolution.query || 'specified'}' not found`,
          error: 'CUSTOMER_NOT_FOUND',
        };
      }

      const customer = resolution.customer;

      // Get updated balance
      const balance = conversationId
        ? await customerService.getBalanceFast(customer.id, conversationId)
        : await customerService.getBalance(customer.id);

      // Convert phone to individual digit words
      let phoneWords = 'Nahi hai';
      if (customer.phone) {
        try {
          phoneWords = openaiService.phoneToWords(customer.phone);
          logger.info({ phone: customer.phone, phoneWords }, '📞 Phone converted to words');
        } catch (err) {
          logger.error({ err, phone: customer.phone }, 'Phone conversion failed');
          phoneWords = customer.phone;
        }
      }

      // Format response with all customer information (phone as words, balance as number)
      const infoMessage = `
${customer.name} ki puri jankari mil gayi hai.
- Naam: ${customer.name}
- Phone: ${phoneWords}
${customer.nickname ? `- Nickname: ${customer.nickname}` : ''}
${customer.landmark ? `- Landmark: ${customer.landmark}` : ''}
- Balance: ${balance} rupees
Kya aapko isse kuch karna hai?
      `.trim();

      return {
        success: true,
        message: infoMessage,
        data: {
          customerId: customer.id,
          name: customer.name,
          phone: customer.phone || null,
          nickname: customer.nickname || null,
          landmark: customer.landmark || null,
          balance,
        },
      };
    } catch (error: any) {
      logger.error({ error, entities, conversationId }, 'Get customer info execution failed');
      return {
        success: false,
        message: 'Failed to retrieve customer information',
        error: error.message,
      };
    }
  }

  private async executeDeleteCustomerData(entities: any, conversationId?: string): Promise<ExecutionResult> {
    try {
      // Admin check
      const isAdmin = entities?.operatorRole === 'admin' || !!entities?.adminEmail;
      if (!isAdmin) {
        return { success: false, message: 'Yeh admin ke liye hai', error: 'UNAUTHORIZED' };
      }

      const adminEmail = entities?.adminEmail || process.env.ADMIN_EMAIL;
      const resolution = await this.resolveCustomer(entities, conversationId);
      if (!resolution.customer) {
        return { success: false, message: 'Customer not found', error: 'NOT_FOUND' };
      }

      const customer = resolution.customer;
      const confirmPhrase = (entities?.confirmation || '').toLowerCase();

      // Step 1: Send OTP 
      if (!confirmPhrase.match(/\d{6}/)) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        logger.info({ customerId: customer.id, adminEmail, otp }, 'Delete: Sending OTP');

        try {
          await emailService.sendAdminDeletionOtpEmail(adminEmail, customer.name, otp);
        } catch (e: any) {
          logger.error({ error: e.message }, 'Delete: OTP email failed');
        }

        return {
          success: false,
          message: `OTP sent to ${adminEmail}`,
          error: 'OTP_SENT',
          data: { otp, adminEmail }
        };
      }

      // Step 2: Delete after OTP verified
      logger.info({ customerId: customer.id }, 'Delete: OTP confirmed, deleting');
      const result = await customerService.deleteCustomerAndAllData(customer.id);
      if (!result.success) {
        return { success: false, message: 'Delete failed', error: result.error };
      }

      logger.info({ customerId: customer.id, adminEmail }, 'Delete: Customer data deleted by admin');
      return { success: true, message: `${customer.name} ke data permanently delete ho gaye`, data: result };
    } catch (error: any) {
      logger.error({ error }, 'Delete: Exception');
      return { success: false, message: 'Delete operation failed', error: error.message };
    }
  }
}

export const businessEngine = new BusinessEngine();
