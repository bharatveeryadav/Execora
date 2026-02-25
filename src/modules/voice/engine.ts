import { logger } from '../../infrastructure/logger';
import { IntentType, IntentExtraction, ExecutionResult } from '../../types';
import { conversationMemory } from './conversation';
import { customerService } from '../customer/customer.service';
import { invoiceService } from '../invoice/invoice.service';
import { ledgerService } from '../ledger/ledger.service';
import { reminderService } from '../reminder/reminder.service';
import { productService } from '../product/product.service';
import { voiceSessionService } from './session.service';
import { openaiService } from '../../integrations/openai';
import { emailService } from '../../infrastructure/email';
import { generateInvoicePdf } from '../../infrastructure/pdf';
import { minioClient } from '../../infrastructure/storage';

class BusinessEngine {
  private toNum(value: any, fallback = 0): number {
    if (value === null || value === undefined) return fallback;
    const n = typeof value === 'number' ? value : parseFloat(value.toString?.() ?? String(value));
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * Generate invoice PDF, upload to MinIO, and persist URL on invoice.
   * Non-fatal: on failure, returns empty payload so billing flow still works.
   */
  private async buildAndStoreInvoicePdf(
    invoice: any,
    customerName: string,
    resolvedItems: any[],
    shopName: string
  ): Promise<{ pdfBuffer?: Buffer; pdfUrl?: string; pdfObjectKey?: string }> {
    // ── Stage 1: Generate PDF ─────────────────────────────────────────────────
    // Kept in its own try so a MinIO failure later doesn't discard the buffer.
    let pdfBuffer: Buffer;
    try {
      // Invoice row only has `total`; GST breakdown lives in resolvedItems
      const subtotal   = resolvedItems.reduce((s, i: any) => s + this.toNum(i.subtotal, this.toNum(i.total)), 0);
      const totalCgst  = resolvedItems.reduce((s, i: any) => s + this.toNum(i.cgst), 0);
      const totalSgst  = resolvedItems.reduce((s, i: any) => s + this.toNum(i.sgst), 0);
      const totalIgst  = resolvedItems.reduce((s, i: any) => s + this.toNum(i.igst), 0);
      const totalCess  = resolvedItems.reduce((s, i: any) => s + this.toNum(i.cess), 0);
      const totalTax   = totalCgst + totalSgst + totalIgst + totalCess;
      const grandTotal = parseFloat(invoice.total.toString());

      pdfBuffer = await generateInvoicePdf({
        invoiceNo:    invoice.invoiceNo || invoice.id,
        invoiceId:    invoice.id,
        invoiceDate:  invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
        customerName: customerName || invoice?.customer?.name || 'Customer',
        shopName,
        supplyType: totalIgst > 0 ? 'INTERSTATE' : 'INTRASTATE',
        items: resolvedItems.map((i: any) => ({
          productName: i.productName,
          hsnCode:     i.hsnCode ?? null,
          quantity:    this.toNum(i.quantity),
          unit:        i.unit || 'unit',
          unitPrice:   this.toNum(i.unitPrice),
          subtotal:    this.toNum(i.subtotal, this.toNum(i.total)),
          gstRate:     this.toNum(i.gstRate),
          cgst:        this.toNum(i.cgst),
          sgst:        this.toNum(i.sgst),
          igst:        this.toNum(i.igst),
          cess:        this.toNum(i.cess),
          totalTax:    this.toNum(i.totalTax),
          total:       this.toNum(i.total),
        })),
        subtotal,
        totalCgst,
        totalSgst,
        totalIgst,
        totalCess,
        totalTax,
        grandTotal,
        notes: invoice.notes || undefined,
      });
    } catch (err) {
      logger.error({ err, invoiceId: invoice?.id }, 'Invoice PDF generation failed');
      return {};  // PDF not generated — nothing to upload or attach
    }

    // ── Stage 2: Upload to MinIO ──────────────────────────────────────────────
    // Failure here is non-fatal: email still gets the PDF as an attachment.
    try {
      const objectKey = `invoices/${invoice.tenantId || 'system'}/${invoice.id}.pdf`;
      await minioClient.uploadFile(objectKey, pdfBuffer, { contentType: 'application/pdf' });

      // 7 days presigned URL (SigV4 max for MinIO/S3)
      const pdfUrl = await minioClient.getPresignedUrl(objectKey, 7 * 24 * 60 * 60);
      await invoiceService.savePdfUrl(invoice.id, objectKey, pdfUrl);

      return { pdfBuffer, pdfUrl, pdfObjectKey: objectKey };
    } catch (err) {
      logger.error({ err, invoiceId: invoice?.id }, 'MinIO upload failed — email will still carry PDF attachment');
      return { pdfBuffer };  // Buffer is still good; email attachment will work
    }
  }

  /**
   * Get total pending amount for voice/intent queries
   */
  private async executeTotalPendingAmount(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const totalPending = await customerService.getTotalPendingAmount();
    return {
      success: true,
      message: `Total pending amount hai ₹${totalPending}.`,
      data: { totalPending },
    };
  }
  /**
   * List all customers with pending balances
   */
  private async executeListCustomerBalances(entities: any, conversationId?: string): Promise<ExecutionResult> {
    // Fetch all customers with non-zero balance
    const customers = await customerService.getAllCustomersWithPendingBalance();
    if (!customers.length) {
      return {
        success: true,
        message: 'Sab customers ka balance zero hai.',
        data: { customers: [] },
      };
    }
    // Calculate total pending balance
    const total = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
    return {
      success: true,
      message: `Total ${customers.length} customers ke paas ₹${total} baki hai.`,
      data: {
        customers: customers.map((c) => ({ name: c.name, balance: c.balance, landmark: c.landmark || '', phone: c.phone || '' })),
        totalPending: total,
      },
    };
  }
  /**
   * Execute business logic based on intent
   */
  async execute(intent: IntentExtraction, conversationId?: string): Promise<ExecutionResult> {
    try {
      logger.info({ intent: intent.intent, entities: intent.entities, conversationId }, 'Executing intent');

      switch (intent.intent) {
        case IntentType.TOTAL_PENDING_AMOUNT:
          return await this.executeTotalPendingAmount(intent.entities, conversationId);
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
        case IntentType.UPDATE_CUSTOMER:
          return await this.executeUpdateCustomer(intent.entities, conversationId);

        case IntentType.PROVIDE_EMAIL:
        case IntentType.SEND_INVOICE:
          return await this.executeProvideEmail(intent.entities, conversationId);

        case IntentType.CONFIRM_INVOICE:
          return await this.executeConfirmInvoice(intent.entities, conversationId);

        case IntentType.SHOW_PENDING_INVOICE:
          return await this.executeShowPendingInvoice(intent.entities, conversationId);

        case IntentType.TOGGLE_GST:
          return await this.executeToggleGst(intent.entities, conversationId);

        case IntentType.GET_CUSTOMER_INFO:
          return await this.executeGetCustomerInfo(intent.entities, conversationId);

        case IntentType.DELETE_CUSTOMER_DATA:
          return await this.executeDeleteCustomerData(intent.entities, conversationId);

        case IntentType.LIST_CUSTOMER_BALANCES:
          return await this.executeListCustomerBalances(intent.entities, conversationId);

        case IntentType.SWITCH_LANGUAGE:
          return {
            success: true,
            message: `Language switched to ${intent.entities?.language || 'hi'}`,
            data: { language: intent.entities?.language || 'hi' },
          };

        case IntentType.START_RECORDING:
          return { success: true, message: 'Recording started', data: { recording: true } };

        case IntentType.STOP_RECORDING:
          return { success: true, message: 'Recording stopped', data: { recording: false } };

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

  private async resolveCustomer(entities: any, conversationId?: string) {
    const rawQuery = entities?.customer || entities?.name;
    const needsActive = entities?.customerRef === 'active' || !rawQuery;

    if (needsActive && conversationId) {
      // 1. Check in-memory cache first (fast path)
      const active = await customerService.getActiveCustomer(conversationId);
      if (active) {
        return { customer: active, multiple: false };
      }

      // 2. Fall back to Redis — restores active customer after process restart
      const memActive = await conversationMemory.getActiveCustomer(conversationId);
      if (memActive) {
        // Re-populate in-memory cache and return full CustomerSearchResult from DB
        const fallback = await customerService.getActiveCustomerById(memActive.id, conversationId);
        if (fallback) {
          customerService.setActiveCustomer(conversationId, fallback.id);
          return { customer: fallback, multiple: false };
        }
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
      // Persist to Redis so active customer survives across turns and restarts
      await conversationMemory.setActiveCustomer(conversationId, candidates[0].id, candidates[0].name);
    }

    return { customer: candidates[0], multiple: false, query: rawQuery };
  }

  /**
   * Build comma-separated item summary for TTS.
   * Format: "4 kg Cheeni ₹180, 6 kg Aata ₹240" — unit from product DB, no ×/@/= symbols.
   * New (auto-created) products are flagged with "⚠️ naya" so shopkeeper notices ₹0 price.
   */
  private formatItemsSummary(items: any[]): string {
    return items
      .map((i) => {
        const unit    = i.unit ? ` ${i.unit}` : '';
        const newFlag = i.autoCreated ? ' ⚠️ naya' : '';
        return `${i.quantity}${unit} ${i.productName} ₹${i.total}${newFlag}`;
      })
      .join(', ');
  }

  /**
   * Create invoice — shows a draft/preview to user and waits for confirmation.
   * Products are resolved and prices calculated (auto-creates unknowns at ₹0),
   * but the DB record is NOT created until the user confirms via CONFIRM_INVOICE.
   */
  private async executeCreateInvoice(entities: any, conversationId?: string): Promise<ExecutionResult> {
    // Map LLM item format { product, quantity } → service format { productName, quantity }
    const rawItems: any[] = Array.isArray(entities.items) ? entities.items : [];
    const items = rawItems.map((item: any) => ({
      productName: (item.productName || item.product || item.name || '').trim(),
      quantity:    Math.max(1, Math.round(Number(item.quantity) || 1)),
    })).filter((i) => i.productName.length > 0);

    if (items.length === 0) {
      return {
        success: false,
        message: 'Bill ke liye items batao — product name aur quantity.',
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

    // Preview invoice — resolves products + calculates prices WITHOUT committing to DB.
    // The draft is stored in Redis and confirmed by the user via CONFIRM_INVOICE intent.
    const withGst = !!(entities.withGst || entities.gst || entities.gstEnabled);
    const preview = await invoiceService.previewInvoice(customer.id, items, withGst);

    const newProductNote = preview.autoCreatedProducts.length > 0
      ? ` (${preview.autoCreatedProducts.length} naya product catalog mein add hua — price ₹0 hai, update karo)`
      : '';

    const itemsSummary = this.formatItemsSummary(preview.resolvedItems);
    const gstSuffix = withGst ? ' (GST included)' : '';

    // Store draft at BOTH session-level and shop-level so CONFIRM_INVOICE works
    // even after a WebSocket reconnect with a new sessionId.
    const draft = {
      customerId:          customer.id,
      customerName:        customer.name,
      customerEmail:       customer.email || null,
      resolvedItems:       preview.resolvedItems,
      inputItems:          items,           // kept so TOGGLE_GST can re-run previewInvoice
      subtotal:            preview.subtotal,
      grandTotal:          preview.grandTotal,
      withGst,
      autoCreatedProducts: preview.autoCreatedProducts,
      conversationId,
    };

    // Single-command flow: "bill banao aur bhej do" — skip draft prompt, confirm + send immediately
    if (entities.autoSend) {
      const invoice = await invoiceService.confirmInvoice(customer.id, preview.resolvedItems);
      return this.sendConfirmedInvoiceEmail(
        invoice, customer.id, customer.email || null, customer.name, preview.resolvedItems, conversationId,
      );
    }

    // Add to multi-draft list; attach the generated draftId so toggleGst / confirm can target it
    const draftId = await conversationMemory.addShopPendingInvoice(draft);
    const draftWithId = { ...draft, draftId };
    if (conversationId) {
      await conversationMemory.setContext(conversationId, 'pendingInvoice', draftWithId);
    }

    const allDrafts = await conversationMemory.getShopPendingInvoices();
    return {
      success: true,
      message: `${customer.name} ka draft bill ban gaya: ${itemsSummary}. Total ₹${preview.grandTotal}${gstSuffix}. Confirm karna hai?${newProductNote}`,
      data: {
        ...preview,
        draftId,
        customerId: customer.id,
        customerName: customer.name,
        draft: true,
        awaitingConfirm: true,
        pendingInvoices: allDrafts,   // for frontend real-time panel
      },
    };
  }

  /**
   * Shared post-confirm logic: fire-and-forget email if available, else store
   * pendingInvoiceEmail context so the next PROVIDE_EMAIL turn can send it.
   * Called from both executeConfirmInvoice and the autoSend path in executeCreateInvoice.
   */
  private async sendConfirmedInvoiceEmail(
    invoice:       any,
    customerId:    string,
    customerEmail: string | null,
    customerName:  string,
    resolvedItems: any[],
    conversationId?: string,
  ): Promise<ExecutionResult> {
    const total      = parseFloat(invoice.total.toString());
    const invoiceRef = (invoice as any).invoiceNo || invoice.id.slice(-6);
    const shopName   = process.env.SHOP_NAME || 'Execora Shop';
    const { pdfBuffer, pdfUrl, pdfObjectKey } = await this.buildAndStoreInvoicePdf(invoice, customerName, resolvedItems, shopName);
    const emailItems = resolvedItems.map((i: any) => ({
      product: i.productName, quantity: i.quantity, price: i.unitPrice, total: i.total,
    }));

    if (customerEmail) {
      emailService.sendInvoiceEmail(
        customerEmail,
        customerName,
        invoice.id,
        emailItems,
        total,
        shopName,
        pdfBuffer,
        pdfUrl,
        invoiceRef
      )
        .catch((err) => logger.error({ err, invoiceId: invoice.id }, 'Failed to send invoice email'));
      return {
        success: true,
        message: `✅ ${customerName} ka bill confirm ho gaya! Invoice #${invoiceRef}. Total ₹${total}. Email ${customerEmail} par bhej diya.`,
        data: { invoiceId: invoice.id, invoiceNo: invoiceRef, total, customerName },
      };
    }

    // No email on file — park the payload so PROVIDE_EMAIL turn can send it
    const pendingEmailPayload = {
      customerId,
      customerName,
      invoiceId: invoice.id,
      invoiceNo: invoiceRef,
      items: emailItems,
      total,
      pdfUrl: pdfUrl || null,
      pdfObjectKey: pdfObjectKey || null,
    };
    if (conversationId) {
      await conversationMemory.setContext(conversationId, 'pendingInvoiceEmail', pendingEmailPayload);
    }
    await conversationMemory.setShopPendingEmail(pendingEmailPayload);
    return {
      success: true,
      message: `✅ ${customerName} ka bill confirm ho gaya! Invoice #${invoiceRef}. Total ₹${total}. Email bhejne ke liye address batao.`,
      data: { invoiceId: invoice.id, invoiceNo: invoiceRef, total, customerName, awaitingEmail: true },
    };
  }

  /**
   * Confirm pending invoice draft — creates DB record + sends email if available.
   * Called when user says "haan / confirm / theek hai" after seeing draft.
   */
  private async executeConfirmInvoice(entities: any, conversationId?: string): Promise<ExecutionResult> {
    // 1. Session-level draft (current conversation turn) — highest priority
    const sessionDraft = conversationId
      ? await conversationMemory.getContext(conversationId, 'pendingInvoice')
      : null;

    // 2. All shop-level drafts (survive reconnects, cover multi-customer queuing)
    const allDrafts = await conversationMemory.getShopPendingInvoices();

    let draft: any = null;

    if (entities?.customer) {
      // User specified a customer name — find matching draft
      const cust = (entities.customer as string).toLowerCase();
      draft = allDrafts.find((d) => d.customerName.toLowerCase().includes(cust))
           ?? (sessionDraft?.customerName?.toLowerCase().includes(cust) ? sessionDraft : null);
    } else if (sessionDraft?.resolvedItems) {
      draft = sessionDraft;
    } else if (allDrafts.length === 1) {
      draft = allDrafts[0];
    } else if (allDrafts.length > 1) {
      // Multiple unconfirmed drafts — ask which one
      const list = allDrafts.map((d) => `${d.customerName} ₹${d.grandTotal}`).join(', ');
      return {
        success: false,
        message: `Aapke ${allDrafts.length} pending bills hain: ${list}. Kaunsa confirm karein? Customer ka naam batao.`,
        data: { pendingInvoices: allDrafts, awaitingSelection: true },
        error: 'MULTIPLE_PENDING_INVOICES',
      };
    }

    if (!draft || !draft.resolvedItems || !draft.customerId) {
      return {
        success: false,
        message: 'Koi pending invoice draft nahi hai confirm karne ke liye. Pehle bill banao.',
        error: 'NO_PENDING_INVOICE',
      };
    }

    const invoice = await invoiceService.confirmInvoice(draft.customerId, draft.resolvedItems);

    // Remove only this specific draft from the list; clear session-level copy
    if (draft.draftId) {
      await conversationMemory.removeShopPendingInvoice(draft.draftId);
    } else {
      await conversationMemory.setShopPendingInvoice(null); // legacy fallback — clear all
    }
    if (conversationId) {
      await conversationMemory.setContext(conversationId, 'pendingInvoice', null);
    }

    const remaining = await conversationMemory.getShopPendingInvoices();
    const result = await this.sendConfirmedInvoiceEmail(
      invoice, draft.customerId, draft.customerEmail, draft.customerName, draft.resolvedItems, conversationId,
    );
    // Attach remaining drafts so the WS handler can broadcast the updated panel
    result.data = { ...result.data, pendingInvoices: remaining };
    return result;
  }

  /**
   * Show the current pending invoice draft without changing it.
   */
  private async executeShowPendingInvoice(_entities: any, conversationId?: string): Promise<ExecutionResult> {
    const allDrafts = await conversationMemory.getShopPendingInvoices();

    // Session-level draft first (most relevant to current turn)
    const sessionDraft = conversationId
      ? await conversationMemory.getContext(conversationId, 'pendingInvoice')
      : null;

    if (allDrafts.length === 0 && !sessionDraft) {
      return {
        success: false,
        message: 'Abhi koi pending bill draft nahi hai.',
        error: 'NO_PENDING_INVOICE',
      };
    }

    if (allDrafts.length === 1 || sessionDraft) {
      const draft = sessionDraft ?? allDrafts[0];
      const itemsSummary = this.formatItemsSummary(draft.resolvedItems as any[]);
      const gstSuffix = draft.withGst ? ' (GST included)' : '';
      return {
        success: true,
        message: `${draft.customerName} ka pending bill: ${itemsSummary}. Total ₹${draft.grandTotal}${gstSuffix}. Confirm karna hai?`,
        data: { draft, pendingInvoices: allDrafts },
      };
    }

    // Multiple drafts — list all
    const lines = allDrafts.map((d, i) =>
      `${i + 1}. ${d.customerName}: ${this.formatItemsSummary(d.resolvedItems)} = ₹${d.grandTotal}`
    ).join('\n');
    return {
      success: true,
      message: `${allDrafts.length} pending bills hain:\n${lines}\nKaunsa confirm karna hai?`,
      data: { pendingInvoices: allDrafts },
    };
  }

  /**
   * Toggle GST on/off for the current pending invoice draft.
   * Re-runs previewInvoice with flipped withGst and updates Redis.
   */
  private async executeToggleGst(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const sessionDraft = conversationId
      ? await conversationMemory.getContext(conversationId, 'pendingInvoice')
      : null;
    const draft = sessionDraft ?? await conversationMemory.getShopPendingInvoice();

    if (!draft || !draft.inputItems || !draft.customerId) {
      return {
        success: false,
        message: 'Koi pending bill nahi hai GST toggle karne ke liye. Pehle bill banao.',
        error: 'NO_PENDING_INVOICE',
      };
    }

    const newWithGst = !draft.withGst;
    const preview = await invoiceService.previewInvoice(draft.customerId, draft.inputItems, newWithGst);

    const updatedDraft = {
      ...draft,
      resolvedItems: preview.resolvedItems,
      subtotal:      preview.subtotal,
      grandTotal:    preview.grandTotal,
      withGst:       newWithGst,
    };

    if (conversationId) {
      await conversationMemory.setContext(conversationId, 'pendingInvoice', updatedDraft);
    }
    // Update the specific draft in the list (by draftId) rather than overwriting all
    if (draft.draftId) {
      await conversationMemory.updateShopPendingInvoice(draft.draftId, updatedDraft);
    } else {
      await conversationMemory.setShopPendingInvoice(null); // legacy — clear and re-add
      await conversationMemory.addShopPendingInvoice(updatedDraft);
    }

    const itemsSummary = this.formatItemsSummary(preview.resolvedItems);

    return {
      success: true,
      message: `GST ${newWithGst ? 'add kar diya' : 'hata diya'}. Updated bill: ${itemsSummary}. Total ₹${preview.grandTotal}${newWithGst ? ' (GST included)' : ''}. Confirm karna hai?`,
      data: { ...preview, customerId: draft.customerId, customerName: draft.customerName, withGst: newWithGst },
    };
  }

  /**
   * Handle user-provided email after invoice creation (multi-turn flow).
   * Reads pendingInvoiceEmail from Redis context, saves the email on the customer,
   * sends the invoice email, then clears the pending context.
   */
  private async executeProvideEmail(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const rawEmail: string = (entities?.email || '').trim().toLowerCase();

    if (!rawEmail || !rawEmail.includes('@')) {
      return {
        success: false,
        message: 'Valid email address nahi mila. Please email dobara batao.',
        error: 'INVALID_EMAIL',
      };
    }

    // Load pending invoice — session-level first, then shop-level (survives reconnects).
    // This ensures email delivery works even when the WebSocket reconnected with a new sessionId.
    const sessionPending = conversationId
      ? await conversationMemory.getContext(conversationId, 'pendingInvoiceEmail')
      : null;
    const pending = sessionPending ?? await conversationMemory.getShopPendingEmail();

    if (!pending) {
      // No pending invoice — just update the active customer's email (or active from shop-level)
      const active = conversationId
        ? await conversationMemory.getActiveCustomer(conversationId)
        : null;
      if (!active) {
        return {
          success: false,
          message: 'Koi pending invoice ya active customer nahi hai jiske liye email save karein.',
          error: 'NO_ACTIVE_CUSTOMER',
        };
      }
      await customerService.updateCustomer(active.id, { email: rawEmail });
      return {
        success: true,
        message: `${active.name} ka email ${rawEmail} save ho gaya.`,
        data: { customerId: active.id, email: rawEmail },
      };
    }

    // Save the email on the customer record
    await customerService.updateCustomer(pending.customerId, { email: rawEmail });

    // Regenerate a fresh presigned URL at send time so delayed sends still get a valid link.
    let freshPdfUrl: string | undefined = pending.pdfUrl || undefined;
    if (pending.pdfObjectKey) {
      try {
        freshPdfUrl = await minioClient.getPresignedUrl(pending.pdfObjectKey, 7 * 24 * 60 * 60);
        await invoiceService.savePdfUrl(pending.invoiceId, pending.pdfObjectKey, freshPdfUrl);
      } catch (err) {
        logger.error({ err, invoiceId: pending.invoiceId }, 'Failed to refresh invoice PDF presigned URL');
      }
    }

    // Send the queued invoice email
    const shopName = process.env.SHOP_NAME || 'Execora Shop';
    await emailService.sendInvoiceEmail(
      rawEmail,
      pending.customerName,
      pending.invoiceId,
      pending.items,
      pending.total,
      shopName,
      undefined,
      freshPdfUrl,
      pending.invoiceNo || pending.invoiceId
    );

    // Clear pending context from BOTH session-level and shop-level so it's not re-sent
    if (conversationId) {
      await conversationMemory.setContext(conversationId, 'pendingInvoiceEmail', null);
    }
    await conversationMemory.setShopPendingEmail(null);

    logger.info({ conversationId, customerId: pending.customerId, email: rawEmail }, 'Invoice email sent after PROVIDE_EMAIL turn');

    return {
      success: true,
      message: `Invoice email ${rawEmail} par bhej diya gaya. ${pending.customerName} ka email bhi save ho gaya.`,
      data: {
        invoiceId:    pending.invoiceId,
        customerName: pending.customerName,
        email:        rawEmail,
        total:        pending.total,
      },
    };
  }

  /**
   * Create reminder
   */
  private async executeCreateReminder(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const amount   = Number(entities.amount);
    const datetime = entities.datetime || entities.date || entities.time;

    if (!isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Reminder amount required', error: 'MISSING_AMOUNT' };
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
        scheduledTime: (reminder as any).scheduledTime,
      },
    };
  }

  /**
   * Record payment
   */
  private async executeRecordPayment(entities: any, conversationId?: string): Promise<ExecutionResult> {
    const amount = Number(entities.amount);
    const mode   = entities.mode || 'cash';

    if (!isFinite(amount) || amount <= 0) {
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

    // Invalidate stale cache so getBalanceFast reads fresh from DB
    customerService.invalidateBalanceCache(customer.id);

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
    const amount      = Number(entities.amount);
    const description = entities.description;

    if (!isFinite(amount) || amount <= 0) {
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

    // Invalidate stale cache so getBalanceFast reads fresh from DB
    customerService.invalidateBalanceCache(customer.id);

    // Get updated balance
    const balance = conversationId
      ? await customerService.getBalanceFast(customer.id, conversationId)
      : await customerService.getBalance(customer.id);

    return {
      success: true,
      message: `${customer.name} ko ${amount} add kar diya. Total balance ab ₹${balance} hai.`,
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
    const productQuery = entities.product || entities.productName || entities.name;

    if (!productQuery) {
      return {
        success: false,
        message: 'Product name batao — kaunsa stock check karna hai?',
        error: 'MISSING_PRODUCT',
      };
    }

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
    // ── Case 1: Cancel ALL pending drafts ─────────────────────────────────────
    if (entities?.cancelAll) {
      const allDrafts = await conversationMemory.getShopPendingInvoices();
      if (allDrafts.length === 0) {
        return { success: false, message: 'Koi pending bill draft nahi hai.', error: 'NO_PENDING_INVOICE' };
      }
      await conversationMemory.setShopPendingInvoice(null);
      if (conversationId) {
        await conversationMemory.setContext(conversationId, 'pendingInvoice', null);
      }
      const names = allDrafts.map((d) => d.customerName).join(', ');
      return {
        success: true,
        message: `${allDrafts.length} pending bills cancel ho gaye: ${names}.`,
        data: { pendingInvoices: [] },
      };
    }

    // ── Case 2: Cancel a specific pending DRAFT (not yet confirmed) ────────────
    const allDrafts = await conversationMemory.getShopPendingInvoices();
    if (entities?.customer && allDrafts.length > 0) {
      const custQuery = (entities.customer as string).toLowerCase();
      const draft = allDrafts.find((d) => d.customerName.toLowerCase().includes(custQuery));
      if (draft) {
        await conversationMemory.removeShopPendingInvoice(draft.draftId);
        if (conversationId) {
          const sessionDraft = await conversationMemory.getContext(conversationId, 'pendingInvoice');
          if (sessionDraft?.draftId === draft.draftId) {
            await conversationMemory.setContext(conversationId, 'pendingInvoice', null);
          }
        }
        const remaining = await conversationMemory.getShopPendingInvoices();
        return {
          success: true,
          message: `${draft.customerName} ka draft bill cancel ho gaya.`,
          data: { pendingInvoices: remaining },
        };
      }
    }

    // ── Case 3: Cancel active session draft (no customer name, but draft exists) ─
    const sessionDraft = conversationId
      ? await conversationMemory.getContext(conversationId, 'pendingInvoice')
      : null;
    if (sessionDraft?.draftId) {
      await conversationMemory.removeShopPendingInvoice(sessionDraft.draftId);
      await conversationMemory.setContext(conversationId!, 'pendingInvoice', null);
      const remaining = await conversationMemory.getShopPendingInvoices();
      return {
        success: true,
        message: `${sessionDraft.customerName} ka draft bill cancel ho gaya.`,
        data: { pendingInvoices: remaining },
      };
    }

    // ── Case 4: Cancel last CONFIRMED invoice for a customer (original behaviour) ─
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
        message: `Customer '${resolution.query || 'specified'}' not found`,
        error: 'CUSTOMER_NOT_FOUND',
      };
    }

    const customer = resolution.customer;
    const lastInvoice = await invoiceService.getLastInvoice(customer.id);
    if (!lastInvoice) {
      return {
        success: false,
        message: `${customer.name} ka koi bill nahi mila.`,
        error: 'NO_INVOICE',
      };
    }

    await invoiceService.cancelInvoice(lastInvoice.id);
    return {
      success: true,
      message: `${customer.name} ka bill cancel ho gaya.`,
      data: { invoiceId: lastInvoice.id, customer: customer.name },
    };
  }

  /**
   * Cancel reminder
   */
  private async executeCancelReminder(entities: any, conversationId?: string): Promise<ExecutionResult> {
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
          customer:      r.customer?.name ?? '(unknown)',
          amount:        parseFloat((r as any).notes || '0'),
          scheduledTime: r.scheduledTime,
        })),
      },
    };
  }

  /**
   * Create customer
   */
  private async executeCreateCustomer(entities: any, conversationId?: string): Promise<ExecutionResult> {
    // LLM may put the name in either entities.name (preferred) or entities.customer (fallback)
    const name = entities.name || entities.customer;
    const { phone, nickname, landmark, notes, amount } = entities;

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

      // Set new customer as active so "uska/iska" works in the very next turn
      if (result.customer) {
        customerService.setActiveCustomer(conversationId, result.customer.id);
        await conversationMemory.setActiveCustomer(conversationId, result.customer.id, result.customer.name);
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

    // Set new customer as active so "uska/iska" works in the very next turn
    if (conversationId) {
      customerService.setActiveCustomer(conversationId, customer.id);
      await conversationMemory.setActiveCustomer(conversationId, customer.id, customer.name);
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
    const datetime = entities.datetime || entities.date || entities.time;

    if (!datetime) {
      return { success: false, message: 'New reminder time required', error: 'MISSING_DATETIME' };
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

    // Fire-and-forget: send daily summary email to admin/owner
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && emailService.isEnabled()) {
      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      emailService.sendDailySummaryEmail(adminEmail, {
        date:             today,
        totalSales:       Number(summary.totalSales    ?? 0),
        invoiceCount:     Number(summary.invoiceCount  ?? 0),
        paymentsReceived: Number(summary.totalPayments ?? 0),
        pendingAmount:    Number(summary.pendingAmount ?? 0),
        newCustomers:     0,
      }).catch((err) => logger.error({ err }, 'Failed to send daily summary email'));
    }

    const extraPayments = (summary as any).extraPayments ?? 0;
    const summaryMsg = [
      `Aaj ka summary:`,
      `Sales ₹${summary.totalSales} (${summary.invoiceCount} invoices),`,
      `payments ₹${summary.totalPayments}.`,
      summary.pendingAmount > 0
        ? `Pending ₹${summary.pendingAmount} abhi baki hai.`
        : extraPayments > 0
          ? `Sab sales clear — ₹${extraPayments} purana udhaar bhi wapas aaya.`
          : `Sab clear hai.`,
    ].join(' ');

    return {
      success: true,
      message: summaryMsg,
      data: summary,
    };
  }

  /**
   * Update any customer field(s) via voice or text.
   * Handles UPDATE_CUSTOMER and legacy UPDATE_CUSTOMER_PHONE intents.
   */
  private async executeUpdateCustomer(entities: any, conversationId?: string): Promise<ExecutionResult> {
    try {
      const FIELD_MAP: Record<string, string> = {
        phone:        'phone',
        alternatePhone: 'alternatePhone',
        email:        'email',
        name:         'name',
        nickname:     'nickname',
        landmark:     'landmark',
        area:         'area',
        city:         'city',
        state:        'state',
        pincode:      'pincode',
        addressLine1: 'addressLine1',
        addressLine2: 'addressLine2',
        gstin:        'gstin',
        pan:          'pan',
        notes:        'notes',
      };

      const updates: Record<string, any> = {};
      for (const [key, dbKey] of Object.entries(FIELD_MAP)) {
        if (entities[key] !== undefined && entities[key] !== null && entities[key] !== '') {
          updates[dbKey] = entities[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          message: 'Kya update karna hai? Phone, email, naam, address, GSTIN — kuch batao.',
          error: 'NO_FIELDS_PROVIDED',
        };
      }

      const { customer, multiple } = await this.resolveCustomer(entities, conversationId);

      if (!customer) {
        return { success: false, message: 'Customer nahi mila.', error: 'CUSTOMER_NOT_FOUND' };
      }

      if (multiple) {
        return {
          success: false,
          message: `Kai customers hain "${entities.customer}" naam se. Landmark ke saath batao.`,
          error: 'AMBIGUOUS_CUSTOMER',
        };
      }

      const updated = await customerService.updateCustomer(customer.id, updates);

      if (!updated) {
        return { success: false, message: 'Update nahi ho saka. Dobara try karo.', error: 'UPDATE_FAILED' };
      }

      if (conversationId) {
        customerService.setActiveCustomer(conversationId, customer.id);
        customerService.invalidateConversationCache(conversationId);
      }

      const LABELS: Record<string, string> = {
        phone: 'Phone', alternatePhone: 'Alternate phone', email: 'Email',
        name: 'Naam', nickname: 'Nickname', landmark: 'Landmark',
        area: 'Area', city: 'City', state: 'State', pincode: 'Pincode',
        addressLine1: 'Address', addressLine2: 'Address line 2',
        gstin: 'GSTIN', pan: 'PAN', notes: 'Notes',
      };

      const lines = Object.entries(updates)
        .map(([k, v]) => `${LABELS[k] ?? k}: ${k === 'phone' ? openaiService.phoneToWords(String(v)) : v}`)
        .join('\n');

      return {
        success: true,
        message: `${customer.name} ki details update ho gayi:\n${lines}`,
        data: { customerId: customer.id, updatedFields: updates },
      };
    } catch (error: any) {
      logger.error({ error, entities, conversationId }, 'Update customer execution failed');
      return { success: false, message: 'Customer update nahi ho saka.', error: error.message };
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
