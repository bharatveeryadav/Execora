import { logger } from '../lib/logger';
import { IntentType, IntentExtraction, ExecutionResult } from '../types';
import { customerService } from './customer.service';
import { invoiceService } from './invoice.service';
import { ledgerService } from './ledger.service';
import { reminderService } from './reminder.service';
import { productService } from './product.service';
import { voiceSessionService } from './voice-session.service';

class BusinessEngine {
  /**
   * Execute business logic based on intent
   */
  async execute(intent: IntentExtraction): Promise<ExecutionResult> {
    try {
      logger.info({ intent: intent.intent, entities: intent.entities }, 'Executing intent');

      switch (intent.intent) {
        case IntentType.CREATE_INVOICE:
          return await this.executeCreateInvoice(intent.entities);

        case IntentType.CREATE_REMINDER:
          return await this.executeCreateReminder(intent.entities);

        case IntentType.RECORD_PAYMENT:
          return await this.executeRecordPayment(intent.entities);

        case IntentType.ADD_CREDIT:
          return await this.executeAddCredit(intent.entities);

        case IntentType.CHECK_BALANCE:
          return await this.executeCheckBalance(intent.entities);

        case IntentType.CHECK_STOCK:
          return await this.executeCheckStock(intent.entities);

        case IntentType.CANCEL_INVOICE:
          return await this.executeCancelInvoice(intent.entities);

        case IntentType.CANCEL_REMINDER:
          return await this.executeCancelReminder(intent.entities);

        case IntentType.LIST_REMINDERS:
          return await this.executeListReminders(intent.entities);

        case IntentType.CREATE_CUSTOMER:
          return await this.executeCreateCustomer(intent.entities);

        case IntentType.MODIFY_REMINDER:
          return await this.executeModifyReminder(intent.entities);

        case IntentType.DAILY_SUMMARY:
          return await this.executeDailySummary(intent.entities);

        default:
          return {
            success: false,
            message: 'Intent not recognized',
            error: 'UNKNOWN_INTENT',
          };
      }
    } catch (error: any) {
      logger.error({ error, intent }, 'Business execution failed');
      return {
        success: false,
        message: 'Execution failed',
        error: error.message,
      };
    }
  }

  /**
   * Create invoice
   */
  private async executeCreateInvoice(entities: any): Promise<ExecutionResult> {
    const { customer: customerQuery, items } = entities;

    // Resolve customer
    const customers = await customerService.searchCustomer(customerQuery);
    if (customers.length === 0) {
      return {
        success: false,
        message: `Customer '${customerQuery}' not found. Create new customer?`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    if (customers.length > 1 && customers[0].matchScore < 0.9) {
      return {
        success: false,
        message: `Multiple customers found. Please specify: ${customers.slice(0, 3).map((c) => c.name).join(', ')}`,
        error: 'MULTIPLE_CUSTOMERS',
        data: { customers: customers.slice(0, 3) },
      };
    }

    const customer = customers[0];

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
  private async executeCreateReminder(entities: any): Promise<ExecutionResult> {
    const { customer: customerQuery, amount, datetime } = entities;

    // Resolve customer
    const customers = await customerService.searchCustomer(customerQuery);
    if (customers.length === 0) {
      return {
        success: false,
        message: `Customer '${customerQuery}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = customers[0];

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
  private async executeRecordPayment(entities: any): Promise<ExecutionResult> {
    const { customer: customerQuery, amount, mode = 'cash' } = entities;

    // Resolve customer
    const customers = await customerService.searchCustomer(customerQuery);
    if (customers.length === 0) {
      return {
        success: false,
        message: `Customer '${customerQuery}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = customers[0];

    // Record payment
    await ledgerService.recordPayment(customer.id, amount, mode);

    // Get updated balance
    const balance = await customerService.getBalance(customer.id);

    return {
      success: true,
      message: `Payment recorded. Remaining balance: ₹${balance}`,
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
  private async executeAddCredit(entities: any): Promise<ExecutionResult> {
    const { customer: customerQuery, amount, description } = entities;

    // Resolve customer
    const customers = await customerService.searchCustomer(customerQuery);
    if (customers.length === 0) {
      return {
        success: false,
        message: `Customer '${customerQuery}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = customers[0];

    // Add credit
    await ledgerService.addCredit(
      customer.id,
      amount,
      description || `Credit added`
    );

    // Get updated balance
    const balance = await customerService.getBalance(customer.id);

    return {
      success: true,
      message: `Credit added. Total balance: ₹${balance}`,
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
  private async executeCheckBalance(entities: any): Promise<ExecutionResult> {
    const { customer: customerQuery } = entities;

    // Resolve customer
    const customers = await customerService.searchCustomer(customerQuery);
    if (customers.length === 0) {
      return {
        success: false,
        message: `Customer '${customerQuery}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = customers[0];
    const balance = await customerService.getBalance(customer.id);

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
  private async executeCancelInvoice(entities: any): Promise<ExecutionResult> {
    const { customer: customerQuery } = entities;

    // Resolve customer
    const customers = await customerService.searchCustomer(customerQuery);
    if (customers.length === 0) {
      return {
        success: false,
        message: `Customer '${customerQuery}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = customers[0];

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
  private async executeCancelReminder(entities: any): Promise<ExecutionResult> {
    const { customer: customerQuery } = entities;

    // Resolve customer
    const customers = await customerService.searchCustomer(customerQuery);
    if (customers.length === 0) {
      return {
        success: false,
        message: `Customer '${customerQuery}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = customers[0];

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
  private async executeCreateCustomer(entities: any): Promise<ExecutionResult> {
    const { name, phone, nickname, landmark } = entities;

    const customer = await customerService.createCustomer({
      name,
      phone,
      nickname,
      landmark,
    });

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
  private async executeModifyReminder(entities: any): Promise<ExecutionResult> {
    const { customer: customerQuery, datetime } = entities;

    // Resolve customer
    const customers = await customerService.searchCustomer(customerQuery);
    if (customers.length === 0) {
      return {
        success: false,
        message: `Customer '${customerQuery}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = customers[0];

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
}

export const businessEngine = new BusinessEngine();
