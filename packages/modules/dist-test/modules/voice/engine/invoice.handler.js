"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCreateInvoice = executeCreateInvoice;
exports.executeConfirmInvoice = executeConfirmInvoice;
exports.executeCancelInvoice = executeCancelInvoice;
exports.executeShowPendingInvoice = executeShowPendingInvoice;
exports.executeToggleGst = executeToggleGst;
exports.executeProvideEmail = executeProvideEmail;
/**
 * Invoice intent handlers.
 * Covers: CREATE_INVOICE, CONFIRM_INVOICE, CANCEL_INVOICE,
 *         SHOW_PENDING_INVOICE, TOGGLE_GST, PROVIDE_EMAIL / SEND_INVOICE
 */
const infrastructure_1 = require("@execora/infrastructure");
const invoice_service_1 = require("../../invoice/invoice.service");
const customer_service_1 = require("../../customer/customer.service");
const infrastructure_2 = require("@execora/infrastructure");
const infrastructure_3 = require("@execora/infrastructure");
const conversation_1 = require("../conversation");
const shared_1 = require("./shared");
// ── CREATE_INVOICE ───────────────────────────────────────────────────────────
/**
 * Creates a draft invoice (preview only — no DB write).
 * Stores the draft in Redis and waits for user confirmation via CONFIRM_INVOICE.
 */
async function executeCreateInvoice(entities, conversationId) {
    const rawItems = Array.isArray(entities.items) ? entities.items : [];
    const items = rawItems
        .map((item) => ({
        productName: (item.productName || item.product || item.name || '').trim(),
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
    }))
        .filter((i) => i.productName.length > 0);
    if (items.length === 0) {
        return { success: false, message: 'Bill ke liye items batao — product name aur quantity.', error: 'MISSING_ITEMS' };
    }
    const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
    if (resolution.multiple) {
        return {
            success: false,
            message: `Multiple customers found. Please specify: ${(resolution.candidates || []).slice(0, 3).map((c) => c.name).join(', ')}`,
            error: 'MULTIPLE_CUSTOMERS',
            data: { customers: (resolution.candidates || []).slice(0, 3) },
        };
    }
    if (!resolution.customer) {
        return { success: false, message: `Customer '${resolution.query || 'specified'}' not found. Create new customer?`, error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    const withGst = !!(entities.withGst || entities.gst || entities.gstEnabled);
    const preview = await invoice_service_1.invoiceService.previewInvoice(customer.id, items, withGst);
    const newProductNote = preview.autoCreatedProducts.length > 0
        ? ` (${preview.autoCreatedProducts.length} naya product catalog mein add hua — price ₹0 hai, update karo)`
        : '';
    const itemsSummary = (0, shared_1.formatItemsSummary)(preview.resolvedItems);
    const gstSuffix = withGst ? ' (GST included)' : '';
    // autoSend: "bill banao aur bhej do" — skip confirmation
    if (entities.autoSend) {
        const invoice = await invoice_service_1.invoiceService.confirmInvoice(customer.id, preview.resolvedItems);
        return (0, shared_1.sendConfirmedInvoiceEmail)(invoice, customer.id, customer.email || null, customer.name, preview.resolvedItems, conversationId);
    }
    const draft = {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email || null,
        resolvedItems: preview.resolvedItems,
        inputItems: items,
        subtotal: preview.subtotal,
        grandTotal: preview.grandTotal,
        withGst,
        autoCreatedProducts: preview.autoCreatedProducts,
        conversationId,
    };
    const draftId = await conversation_1.conversationMemory.addShopPendingInvoice(draft);
    const draftWithId = { ...draft, draftId };
    if (conversationId) {
        await conversation_1.conversationMemory.setContext(conversationId, 'pendingInvoice', draftWithId);
    }
    const allDrafts = await conversation_1.conversationMemory.getShopPendingInvoices();
    return {
        success: true,
        message: `${customer.name} ka draft bill ban gaya: ${itemsSummary}. Total ₹${preview.grandTotal}${gstSuffix}. Confirm karna hai?${newProductNote}`,
        data: { ...preview, draftId, customerId: customer.id, customerName: customer.name, draft: true, awaitingConfirm: true, pendingInvoices: allDrafts },
    };
}
// ── CONFIRM_INVOICE ──────────────────────────────────────────────────────────
async function executeConfirmInvoice(entities, conversationId) {
    const sessionDraft = conversationId
        ? await conversation_1.conversationMemory.getContext(conversationId, 'pendingInvoice')
        : null;
    const allDrafts = await conversation_1.conversationMemory.getShopPendingInvoices();
    let draft = null;
    if (entities?.customer) {
        const cust = entities.customer.toLowerCase();
        draft = allDrafts.find((d) => d.customerName.toLowerCase().includes(cust))
            ?? (sessionDraft?.customerName?.toLowerCase().includes(cust) ? sessionDraft : null);
    }
    else if (sessionDraft?.resolvedItems) {
        draft = sessionDraft;
    }
    else if (allDrafts.length === 1) {
        draft = allDrafts[0];
    }
    else if (allDrafts.length > 1) {
        const list = allDrafts.map((d) => `${d.customerName} ₹${d.grandTotal}`).join(', ');
        return {
            success: false,
            message: `Aapke ${allDrafts.length} pending bills hain: ${list}. Kaunsa confirm karein? Customer ka naam batao.`,
            data: { pendingInvoices: allDrafts, awaitingSelection: true },
            error: 'MULTIPLE_PENDING_INVOICES',
        };
    }
    if (!draft?.resolvedItems || !draft?.customerId) {
        return { success: false, message: 'Koi pending invoice draft nahi hai confirm karne ke liye. Pehle bill banao.', error: 'NO_PENDING_INVOICE' };
    }
    const invoice = await invoice_service_1.invoiceService.confirmInvoice(draft.customerId, draft.resolvedItems);
    if (draft.draftId) {
        await conversation_1.conversationMemory.removeShopPendingInvoice(draft.draftId);
    }
    else {
        await conversation_1.conversationMemory.setShopPendingInvoice(null);
    }
    if (conversationId) {
        await conversation_1.conversationMemory.setContext(conversationId, 'pendingInvoice', null);
    }
    const remaining = await conversation_1.conversationMemory.getShopPendingInvoices();
    const result = await (0, shared_1.sendConfirmedInvoiceEmail)(invoice, draft.customerId, draft.customerEmail, draft.customerName, draft.resolvedItems, conversationId);
    result.data = { ...result.data, pendingInvoices: remaining };
    return result;
}
// ── CANCEL_INVOICE ───────────────────────────────────────────────────────────
async function executeCancelInvoice(entities, conversationId) {
    // Case 1: Cancel ALL pending drafts
    if (entities?.cancelAll) {
        const allDrafts = await conversation_1.conversationMemory.getShopPendingInvoices();
        if (allDrafts.length === 0) {
            return { success: false, message: 'Koi pending bill draft nahi hai.', error: 'NO_PENDING_INVOICE' };
        }
        await conversation_1.conversationMemory.setShopPendingInvoice(null);
        if (conversationId)
            await conversation_1.conversationMemory.setContext(conversationId, 'pendingInvoice', null);
        const names = allDrafts.map((d) => d.customerName).join(', ');
        return { success: true, message: `${allDrafts.length} pending bills cancel ho gaye: ${names}.`, data: { pendingInvoices: [] } };
    }
    // Case 2: Cancel specific draft by customer name
    const allDrafts = await conversation_1.conversationMemory.getShopPendingInvoices();
    if (entities?.customer && allDrafts.length > 0) {
        const custQuery = entities.customer.toLowerCase();
        const draft = allDrafts.find((d) => d.customerName.toLowerCase().includes(custQuery));
        if (draft) {
            await conversation_1.conversationMemory.removeShopPendingInvoice(draft.draftId);
            if (conversationId) {
                const sessionDraft = await conversation_1.conversationMemory.getContext(conversationId, 'pendingInvoice');
                if (sessionDraft?.draftId === draft.draftId) {
                    await conversation_1.conversationMemory.setContext(conversationId, 'pendingInvoice', null);
                }
            }
            const remaining = await conversation_1.conversationMemory.getShopPendingInvoices();
            return { success: true, message: `${draft.customerName} ka draft bill cancel ho gaya.`, data: { pendingInvoices: remaining } };
        }
    }
    // Case 3: Cancel active session draft
    const sessionDraft = conversationId
        ? await conversation_1.conversationMemory.getContext(conversationId, 'pendingInvoice')
        : null;
    if (sessionDraft?.draftId) {
        await conversation_1.conversationMemory.removeShopPendingInvoice(sessionDraft.draftId);
        await conversation_1.conversationMemory.setContext(conversationId, 'pendingInvoice', null);
        const remaining = await conversation_1.conversationMemory.getShopPendingInvoices();
        return { success: true, message: `${sessionDraft.customerName} ka draft bill cancel ho gaya.`, data: { pendingInvoices: remaining } };
    }
    // Case 4: Cancel last confirmed invoice for a customer (DB operation)
    const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
    if (resolution.multiple) {
        return {
            success: false,
            message: `Multiple customers found. Please specify: ${(resolution.candidates || []).slice(0, 3).map((c) => c.name).join(', ')}`,
            error: 'MULTIPLE_CUSTOMERS',
            data: { customers: (resolution.candidates || []).slice(0, 3) },
        };
    }
    if (!resolution.customer) {
        return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
    }
    const lastInvoice = await invoice_service_1.invoiceService.getLastInvoice(resolution.customer.id);
    if (!lastInvoice) {
        return { success: false, message: `${resolution.customer.name} ka koi bill nahi mila.`, error: 'NO_INVOICE' };
    }
    await invoice_service_1.invoiceService.cancelInvoice(lastInvoice.id);
    return { success: true, message: `${resolution.customer.name} ka bill cancel ho gaya.`, data: { invoiceId: lastInvoice.id, customer: resolution.customer.name } };
}
// ── SHOW_PENDING_INVOICE ─────────────────────────────────────────────────────
async function executeShowPendingInvoice(_entities, conversationId) {
    const allDrafts = await conversation_1.conversationMemory.getShopPendingInvoices();
    const sessionDraft = conversationId
        ? await conversation_1.conversationMemory.getContext(conversationId, 'pendingInvoice')
        : null;
    if (allDrafts.length === 0 && !sessionDraft) {
        return { success: false, message: 'Abhi koi pending bill draft nahi hai.', error: 'NO_PENDING_INVOICE' };
    }
    if (allDrafts.length === 1 || sessionDraft) {
        const draft = sessionDraft ?? allDrafts[0];
        const itemsSummary = (0, shared_1.formatItemsSummary)(draft.resolvedItems);
        const gstSuffix = draft.withGst ? ' (GST included)' : '';
        return {
            success: true,
            message: `${draft.customerName} ka pending bill: ${itemsSummary}. Total ₹${draft.grandTotal}${gstSuffix}. Confirm karna hai?`,
            data: { draft, pendingInvoices: allDrafts },
        };
    }
    const lines = allDrafts
        .map((d, i) => `${i + 1}. ${d.customerName}: ${(0, shared_1.formatItemsSummary)(d.resolvedItems)} = ₹${d.grandTotal}`)
        .join('\n');
    return {
        success: true,
        message: `${allDrafts.length} pending bills hain:\n${lines}\nKaunsa confirm karna hai?`,
        data: { pendingInvoices: allDrafts },
    };
}
// ── TOGGLE_GST ───────────────────────────────────────────────────────────────
async function executeToggleGst(entities, conversationId) {
    const sessionDraft = conversationId
        ? await conversation_1.conversationMemory.getContext(conversationId, 'pendingInvoice')
        : null;
    const draft = sessionDraft ?? await conversation_1.conversationMemory.getShopPendingInvoice();
    if (!draft?.inputItems || !draft?.customerId) {
        return { success: false, message: 'Koi pending bill nahi hai GST toggle karne ke liye. Pehle bill banao.', error: 'NO_PENDING_INVOICE' };
    }
    const newWithGst = !draft.withGst;
    const preview = await invoice_service_1.invoiceService.previewInvoice(draft.customerId, draft.inputItems, newWithGst);
    const updatedDraft = { ...draft, resolvedItems: preview.resolvedItems, subtotal: preview.subtotal, grandTotal: preview.grandTotal, withGst: newWithGst };
    if (conversationId)
        await conversation_1.conversationMemory.setContext(conversationId, 'pendingInvoice', updatedDraft);
    if (draft.draftId) {
        await conversation_1.conversationMemory.updateShopPendingInvoice(draft.draftId, updatedDraft);
    }
    else {
        await conversation_1.conversationMemory.setShopPendingInvoice(null);
        await conversation_1.conversationMemory.addShopPendingInvoice(updatedDraft);
    }
    const itemsSummary = (0, shared_1.formatItemsSummary)(preview.resolvedItems);
    return {
        success: true,
        message: `GST ${newWithGst ? 'add kar diya' : 'hata diya'}. Updated bill: ${itemsSummary}. Total ₹${preview.grandTotal}${newWithGst ? ' (GST included)' : ''}. Confirm karna hai?`,
        data: { ...preview, customerId: draft.customerId, customerName: draft.customerName, withGst: newWithGst },
    };
}
// ── PROVIDE_EMAIL / SEND_INVOICE ─────────────────────────────────────────────
async function executeProvideEmail(entities, conversationId) {
    const rawEmail = (entities?.email || '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
        return { success: false, message: 'Valid email address nahi mila. Please email dobara batao.', error: 'INVALID_EMAIL' };
    }
    const sessionPending = conversationId
        ? await conversation_1.conversationMemory.getContext(conversationId, 'pendingInvoiceEmail')
        : null;
    const pending = sessionPending ?? await conversation_1.conversationMemory.getShopPendingEmail();
    if (!pending) {
        const active = conversationId
            ? await conversation_1.conversationMemory.getActiveCustomer(conversationId)
            : null;
        if (!active) {
            return { success: false, message: 'Koi pending invoice ya active customer nahi hai jiske liye email save karein.', error: 'NO_ACTIVE_CUSTOMER' };
        }
        await customer_service_1.customerService.updateCustomer(active.id, { email: rawEmail });
        return { success: true, message: `${active.name} ka email ${rawEmail} save ho gaya.`, data: { customerId: active.id, email: rawEmail } };
    }
    await customer_service_1.customerService.updateCustomer(pending.customerId, { email: rawEmail });
    // Refresh presigned URL if PDF was already uploaded
    let freshPdfUrl = pending.pdfUrl || undefined;
    if (pending.pdfObjectKey) {
        try {
            freshPdfUrl = await infrastructure_3.minioClient.getPresignedUrl(pending.pdfObjectKey, 7 * 24 * 60 * 60);
            await invoice_service_1.invoiceService.savePdfUrl(pending.invoiceId, pending.pdfObjectKey, freshPdfUrl);
        }
        catch (err) {
            infrastructure_1.logger.error({ err, invoiceId: pending.invoiceId }, 'Failed to refresh invoice PDF presigned URL');
        }
    }
    const shopName = process.env.SHOP_NAME || 'Execora Shop';
    await infrastructure_2.emailService.sendInvoiceEmail(rawEmail, pending.customerName, pending.invoiceId, pending.items, pending.total, shopName, undefined, freshPdfUrl, pending.invoiceNo || pending.invoiceId);
    if (conversationId)
        await conversation_1.conversationMemory.setContext(conversationId, 'pendingInvoiceEmail', null);
    await conversation_1.conversationMemory.setShopPendingEmail(null);
    infrastructure_1.logger.info({ conversationId, customerId: pending.customerId, email: rawEmail }, 'Invoice email sent after PROVIDE_EMAIL turn');
    return {
        success: true,
        message: `Invoice email ${rawEmail} par bhej diya gaya. ${pending.customerName} ka email bhi save ho gaya.`,
        data: { invoiceId: pending.invoiceId, customerName: pending.customerName, email: rawEmail, total: pending.total },
    };
}
//# sourceMappingURL=invoice.handler.js.map