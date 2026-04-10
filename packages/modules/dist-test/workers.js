"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeWorkers = exports.startWorkers = void 0;
const bullmq_1 = require("bullmq");
const openai_1 = __importDefault(require("openai"));
const core_1 = require("@execora/core");
const reminder_ops_1 = require("./infra/reminder-ops");
const email_1 = require("./infra/email");
const core_2 = require("@execora/core");
const core_3 = require("@execora/core");
const core_4 = require("@execora/core");
const core_5 = require("@execora/core");
const core_6 = require("@execora/core");
const core_7 = require("@execora/core");
const whatsapp_service_1 = require("./infra/whatsapp-service");
const core_8 = require("@execora/core");
const library_1 = require("@prisma/client/runtime/library");
const client_1 = require("@prisma/client");
// ---------------------------------------------------------------------------
// Reminder Worker
// Processes jobs from the 'reminders' BullMQ queue.
// Delivery order: email first (if configured), then WhatsApp.
// Both channels are tried — at least one must succeed.
// ---------------------------------------------------------------------------
const reminderWorker = new bullmq_1.Worker("reminders", async (job) => {
    const jobStart = Date.now();
    const { reminderId, customerId, customerName, phone, amount, message } = job.data;
    core_3.logger.info({
        queue: "reminders",
        jobId: job.id,
        reminderId,
        customerId,
        customerName,
        amount,
        attemptsMade: job.attemptsMade,
    }, "Processing reminder job");
    let delivered = false;
    let deliveryChannel = null;
    let providerMessageId;
    // -----------------------------------------------------------------------
    // 1. EMAIL — look up customer email from prefs or customer record
    // -----------------------------------------------------------------------
    const [customer, prefs] = await Promise.all([
        core_2.prisma.customer.findUnique({
            where: { id: customerId },
            select: { email: true },
        }),
        core_2.prisma.customerCommunicationPrefs.findUnique({
            where: { customerId },
            select: { emailEnabled: true, emailAddress: true },
        }),
    ]);
    const emailTo = prefs?.emailEnabled && prefs?.emailAddress
        ? prefs.emailAddress
        : (customer?.email ?? null);
    if (emailTo) {
        const sent = await email_1.emailService.sendPaymentReminderEmail(emailTo, customerName, amount);
        if (sent) {
            delivered = true;
            deliveryChannel = "email";
            core_3.logger.info({ reminderId, emailTo }, "Reminder sent via email");
        }
    }
    // -----------------------------------------------------------------------
    // 2. WHATSAPP — use phone from job data if WhatsApp is configured
    // -----------------------------------------------------------------------
    if (!delivered && phone) {
        const waResult = await whatsapp_service_1.whatsappService.sendTextMessage(phone, message);
        if (waResult.success) {
            delivered = true;
            deliveryChannel = "whatsapp";
            providerMessageId = waResult.messageId;
            core_3.logger.info({ reminderId, phone }, "Reminder sent via WhatsApp");
        }
        else {
            core_3.logger.warn({ reminderId, phone, error: waResult.error }, "WhatsApp reminder delivery failed");
        }
    }
    // -----------------------------------------------------------------------
    // 3. Audit log in DB (best-effort — do not fail the job on log error)
    // -----------------------------------------------------------------------
    if (delivered && deliveryChannel) {
        try {
            await core_2.prisma.messageLog.create({
                data: {
                    tenantId: core_8.SYSTEM_TENANT_ID,
                    reminderId,
                    recipient: deliveryChannel === "email" ? (emailTo ?? phone) : phone,
                    messageContent: message,
                    channel: deliveryChannel,
                    providerMessageId: providerMessageId ?? null,
                    status: client_1.MessageStatus.sent,
                },
            });
        }
        catch (dbError) {
            core_3.logger.error({ dbError, reminderId }, "Failed to create message log (message was sent)");
        }
    }
    // -----------------------------------------------------------------------
    // 4. Mark reminder status in DB
    // -----------------------------------------------------------------------
    if (delivered) {
        const next = await (0, reminder_ops_1.scheduleNextReminderOccurrence)(reminderId);
        await (0, reminder_ops_1.markReminderSent)(reminderId, { keepPending: !!next });
        core_7.queueJobsProcessed.inc({ queue: "reminders", status: "success" });
        core_7.queueJobDuration.observe({ queue: "reminders", status: "success" }, (Date.now() - jobStart) / 1000);
    }
    else {
        // No delivery channel succeeded — retry up to BullMQ's attempt limit.
        // On the final attempt, mark as sent anyway to prevent infinite retries.
        const attemptsMade = job.attemptsMade ?? 0;
        const maxAttempts = job.opts?.attempts ?? 3;
        if (attemptsMade >= maxAttempts - 1) {
            core_3.logger.warn({ reminderId, customerId, attemptsMade }, "No delivery channel for reminder — marking sent after final attempt");
            try {
                await core_2.prisma.messageLog.create({
                    data: {
                        tenantId: core_8.SYSTEM_TENANT_ID,
                        reminderId,
                        recipient: phone,
                        messageContent: message,
                        channel: client_1.MessageChannel.whatsapp,
                        status: client_1.MessageStatus.failed,
                        errorMessage: "No delivery channel available after all attempts",
                    },
                });
            }
            catch {
                /* ignore audit log failures */
            }
            const next = await (0, reminder_ops_1.scheduleNextReminderOccurrence)(reminderId);
            await (0, reminder_ops_1.markReminderSent)(reminderId, { keepPending: !!next });
            core_7.queueJobsProcessed.inc({
                queue: "reminders",
                status: "success_final_attempt",
            });
            core_7.queueJobDuration.observe({ queue: "reminders", status: "success_final_attempt" }, (Date.now() - jobStart) / 1000);
        }
        else {
            core_3.logger.warn({ reminderId, customerId, attemptsMade }, "Reminder delivery failed — will retry");
            throw new Error(`No delivery channel for reminder ${reminderId}`);
        }
    }
}, {
    connection: core_1.redisConnection,
    concurrency: 5,
});
reminderWorker.on("completed", (job) => {
    core_3.logger.info({ queue: "reminders", jobId: job.id, reminderId: job.data.reminderId }, "Reminder job completed");
});
reminderWorker.on("failed", async (job, err) => {
    core_7.queueJobsProcessed.inc({ queue: "reminders", status: "failed" });
    core_7.errorCounter.inc({ service: "worker", type: err.name || "worker_job_error" });
    core_3.logger.error({
        queue: "reminders",
        jobId: job?.id,
        reminderId: job?.data?.reminderId,
        error: err.message,
    }, "Reminder job failed");
    if (job) {
        await (0, reminder_ops_1.markReminderFailed)(job.data.reminderId).catch(() => { });
    }
});
// ---------------------------------------------------------------------------
// WhatsApp Direct Worker
// Processes jobs from the 'whatsapp' queue — direct message sends (not tied
// to the reminders flow; used for ad-hoc notifications and invoice delivery).
// ---------------------------------------------------------------------------
const whatsappWorker = new bullmq_1.Worker("whatsapp", async (job) => {
    const jobStart = Date.now();
    const { phone, message, reminderId } = job.data;
    core_3.logger.info({ queue: "whatsapp", jobId: job.id, phone }, "Processing WhatsApp job");
    const result = await whatsapp_service_1.whatsappService.sendTextMessage(phone, message);
    if (result.success) {
        try {
            await core_2.prisma.messageLog.create({
                data: {
                    tenantId: core_8.SYSTEM_TENANT_ID,
                    reminderId,
                    recipient: phone,
                    messageContent: message,
                    channel: client_1.MessageChannel.whatsapp,
                    providerMessageId: result.messageId,
                    status: client_1.MessageStatus.sent,
                },
            });
        }
        catch (dbError) {
            core_3.logger.error({ dbError, phone }, "Failed to create WhatsApp message log (message was sent)");
        }
        core_7.queueJobsProcessed.inc({ queue: "whatsapp", status: "success" });
        core_7.queueJobDuration.observe({ queue: "whatsapp", status: "success" }, (Date.now() - jobStart) / 1000);
        core_3.logger.info({ queue: "whatsapp", messageId: result.messageId }, "WhatsApp message sent");
        return { success: true, messageId: result.messageId };
    }
    else {
        core_7.queueJobsProcessed.inc({ queue: "whatsapp", status: "failed" });
        core_7.queueJobDuration.observe({ queue: "whatsapp", status: "failed" }, (Date.now() - jobStart) / 1000);
        throw new Error(result.error ?? "WhatsApp send failed");
    }
}, {
    connection: core_1.redisConnection,
    concurrency: 10,
});
whatsappWorker.on("completed", (job) => {
    core_3.logger.info({ queue: "whatsapp", jobId: job.id }, "WhatsApp job completed");
});
whatsappWorker.on("failed", (job, err) => {
    core_7.errorCounter.inc({
        service: "worker",
        type: err.name || "whatsapp_job_error",
    });
    core_3.logger.error({
        queue: "whatsapp",
        jobId: job?.id,
        phone: job?.data?.phone,
        error: err.message,
    }, "WhatsApp job failed");
});
// ---------------------------------------------------------------------------
// OCR Job Worker — Sprint 2 AI Feature 1 & 2
// Processes jobs from the 'ocr-jobs' queue.
// Reads the image from MinIO, calls OpenAI Vision API, and creates the
// appropriate DB records: PurchaseOrder+items for 'purchase_bill' or
// new Products for 'product_catalog'.
// ---------------------------------------------------------------------------
const _openai = new openai_1.default({ apiKey: core_4.config.openai.apiKey });
const ocrWorker = new bullmq_1.Worker("ocr-jobs", async (job) => {
    const jobStart = Date.now();
    const { ocrJobId, tenantId } = job.data;
    const log = core_3.logger.child({
        queue: "ocr-jobs",
        jobId: job.id,
        ocrJobId,
        tenantId,
    });
    log.info("OCR job started");
    // ── 1. Mark as processing ─────────────────────────────────────────────
    const ocrJobRow = await core_2.prisma.ocrJob
        .update({
        where: { id: ocrJobId },
        data: { status: "processing" },
        select: {
            id: true,
            jobType: true,
            imageKey: true,
            imageMimeType: true,
        },
    })
        .catch(() => null);
    if (!ocrJobRow)
        throw new Error(`OcrJob ${ocrJobId} not found`);
    const { jobType, imageKey, imageMimeType: mimeType } = ocrJobRow;
    // ── 2. Read image from MinIO ──────────────────────────────────────────
    const imageBuffer = await core_5.minioClient.getFile(imageKey);
    const imageBase64 = imageBuffer.toString("base64");
    try {
        if (jobType === "purchase_bill") {
            // ── 3a. OCR: extract purchase bill ─────────────────────────────────
            const prompt = `You are an OCR system for an Indian store management app. Analyze this purchase bill/invoice image and extract all items. Return ONLY valid JSON (no markdown):
{
  "supplier": "supplier name or null",
  "invoiceNo": "invoice number or null",
  "date": "YYYY-MM-DD or null",
  "subtotal": number_or_null,
  "tax": number_or_null,
  "total": number_or_null,
  "items": [
    { "name": "product name", "quantity": number, "unitPrice": number, "total": number, "unit": "unit" }
  ]
}
Extract ALL line items visible. Use Indian currency (INR). Omit unclear fields.`;
            const resp = await _openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                    detail: "high",
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 1500,
                temperature: 0,
            });
            const rawText = resp.choices[0]?.message?.content ?? "{}";
            let parsed;
            try {
                parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
            }
            catch {
                log.error({ rawText }, "OCR response JSON parse failed");
                throw new Error("OpenAI returned non-JSON response for purchase bill OCR");
            }
            const items = Array.isArray(parsed.items) ? parsed.items : [];
            // Create PurchaseOrder in DB
            const poNo = `PO-OCR-${Date.now()}`;
            const subtotal = parsed.subtotal ??
                items.reduce((s, i) => s + (i.total ?? i.unitPrice * i.quantity), 0);
            const tax = parsed.tax ?? 0;
            const total = parsed.total ?? subtotal + tax;
            const po = await core_2.prisma.purchaseOrder.create({
                data: {
                    tenantId,
                    poNo,
                    orderDate: parsed.date ? new Date(parsed.date) : new Date(),
                    receivedDate: new Date(),
                    subtotal: new library_1.Decimal(subtotal),
                    tax: new library_1.Decimal(tax),
                    total: new library_1.Decimal(total),
                    status: "received",
                    notes: parsed.supplier
                        ? `OCR import from ${parsed.supplier}`
                        : "OCR import",
                },
            });
            // Create PurchaseOrderItems and update product stock
            for (const item of items) {
                // Try to find existing product
                const product = await core_2.prisma.product.findFirst({
                    where: {
                        tenantId,
                        name: { contains: item.name.split(" ")[0], mode: "insensitive" },
                        isActive: true,
                    },
                });
                if (!product) {
                    log.warn({ itemName: item.name }, "OCR: no matching product found for purchase item, skipping PO line");
                    continue;
                }
                await core_2.prisma.purchaseOrderItem.create({
                    data: {
                        poId: po.id,
                        productId: product.id,
                        quantity: Math.round(item.quantity),
                        receivedQuantity: Math.round(item.quantity),
                        unitPrice: new library_1.Decimal(item.unitPrice),
                        total: new library_1.Decimal(item.total ?? item.unitPrice * item.quantity),
                    },
                });
                // Update stock if product exists
                if (product) {
                    await core_2.prisma.product.update({
                        where: { id: product.id },
                        data: { stock: { increment: Math.round(item.quantity) } },
                    });
                    await core_2.prisma.stockMovement.create({
                        data: {
                            tenantId,
                            productId: product.id,
                            quantity: Math.round(item.quantity),
                            type: "purchase",
                            referenceId: po.id,
                            referenceType: "purchase_order",
                            previousStock: product.stock,
                            newStock: product.stock + Math.round(item.quantity),
                            notes: `OCR purchase bill import (${poNo})`,
                        },
                    });
                }
            }
            // Update OcrJob as completed
            await core_2.prisma.ocrJob.update({
                where: { id: ocrJobId },
                data: {
                    status: "completed",
                    rawResult: { rawText },
                    parsedItems: items,
                    purchaseOrderId: po.id,
                    processedAt: new Date(),
                },
            });
            core_7.ocrJobsTotal.inc({
                job_type: "purchase_bill",
                status: "success",
                tenantId,
            });
            core_7.ocrJobDuration.observe({ job_type: "purchase_bill" }, (Date.now() - jobStart) / 1000);
            log.info({ poId: po.id, itemCount: items.length }, "OCR purchase_bill job completed");
            return { purchaseOrderId: po.id, itemCount: items.length };
        }
        else if (jobType === "product_catalog") {
            // ── 3b. Catalog seed: extract products from photo ──────────────────
            const prompt = `You are an OCR assistant for an Indian store management app. Analyze this shelf, catalog, pricelist, or product image and extract every visible product. Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "name": "exact product name as shown",
    "price": number_or_null,
    "mrp": number_or_null,
    "unit": "piece|kg|g|litre|ml|box|packet|dozen|pair|set|metre|strip",
    "category": "Food & Grocery|Beverages|Dairy|Personal Care|Household|Electronics|Clothing|Medicines|FMCG|Hardware|General",
    "sku": "sku_or_null",
    "barcode": "barcode_number_or_null",
    "hsnCode": "4-8_digit_hsn_or_null",
    "minStock": integer_or_null
  }
]
Rules:
- Extract ALL line items / products visible.
- If a field is not visible or unclear, use null.
- If price is missing, estimate based on typical Indian retail price.
- Prefer exact product names including brand, variant, and weight (e.g. "Aashirvaad Atta 5kg").
- Use Indian HSN codes where recognisable.
- Do NOT include markdown, comments, or explanation — pure JSON only.`;
            const resp = await _openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                    detail: "high",
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 1000,
                temperature: 0,
            });
            const rawText = resp.choices[0]?.message?.content ?? "[]";
            let products = [];
            try {
                products = JSON.parse(rawText.replace(/```json|```/g, "").trim());
                if (!Array.isArray(products))
                    products = [];
            }
            catch {
                log.error({ rawText }, "Catalog seed response JSON parse failed");
                throw new Error("OpenAI returned non-JSON response for catalog seed");
            }
            // Create DRAFTS instead of directly inserting products
            // Users review and confirm drafts via the DraftManagerPanel
            // Always create a draft for every parsed product — user decides during review
            let created = 0;
            for (const p of products) {
                if (!p.name || typeof p.price !== "number")
                    continue;
                // Skip only if a pending draft for this product already exists (avoid exact dupes)
                const dupeDraft = await core_2.prisma.draft.findFirst({
                    where: {
                        tenantId,
                        type: "product",
                        status: "pending",
                        title: `OCR: ${p.name.trim()}`,
                    },
                });
                if (dupeDraft)
                    continue;
                // Insert as a pending draft — NOT directly into products table
                await core_2.prisma.draft.create({
                    data: {
                        tenantId,
                        type: "product",
                        title: `OCR: ${p.name.trim()}`,
                        data: {
                            name: p.name.trim(),
                            category: p.category ?? "General",
                            price: p.price ?? 0,
                            mrp: p.mrp ?? undefined,
                            stock: 0,
                            unit: p.unit ?? "piece",
                            sku: p.sku ?? undefined,
                            barcode: p.barcode ?? undefined,
                            hsnCode: p.hsnCode ?? undefined,
                            minStock: p.minStock ?? 5,
                        },
                        notes: "Imported via photo scan",
                    },
                });
                created++;
            }
            await core_2.prisma.ocrJob.update({
                where: { id: ocrJobId },
                data: {
                    status: "completed",
                    rawResult: { rawText },
                    parsedItems: products,
                    productsCreated: created,
                    processedAt: new Date(),
                },
            });
            core_7.ocrJobsTotal.inc({
                job_type: "product_catalog",
                status: "success",
                tenantId,
            });
            core_7.ocrJobDuration.observe({ job_type: "product_catalog" }, (Date.now() - jobStart) / 1000);
            log.info({ created }, "OCR product_catalog job completed — drafts created, awaiting review");
            return { productsCreated: created };
        }
    }
    catch (err) {
        // Mark job as failed in DB
        await core_2.prisma.ocrJob
            .update({
            where: { id: ocrJobId },
            data: {
                status: "failed",
                errorMessage: err?.message ?? "unknown error",
                retryCount: { increment: 1 },
            },
        })
            .catch(() => { });
        core_7.ocrJobsTotal.inc({ job_type: jobType, status: "failed", tenantId });
        core_7.errorCounter.inc({
            service: "worker",
            type: err?.name || "ocr_job_error",
        });
        log.error({ error: err?.message }, "OCR job failed");
        throw err;
    }
}, { connection: core_1.redisConnection, concurrency: 3 });
ocrWorker.on("completed", (job) => {
    core_3.logger.info({ queue: "ocr-jobs", jobId: job.id }, "OCR job completed");
});
ocrWorker.on("failed", (job, err) => {
    core_7.errorCounter.inc({ service: "worker", type: err.name || "ocr_job_error" });
    core_3.logger.error({ queue: "ocr-jobs", jobId: job?.id, error: err.message }, "OCR job failed permanently");
});
// ---------------------------------------------------------------------------
// Queue Monitoring — snapshot metrics every 30 s
// ---------------------------------------------------------------------------
let monitorTimer = null;
const startWorkerMonitoring = () => {
    if (monitorTimer)
        return;
    const runSnapshot = async () => {
        try {
            const [reminderCounts, whatsappCounts, ocrCounts, redisOk] = await Promise.all([
                core_1.reminderQueue.getJobCounts("waiting", "active", "delayed", "completed", "failed"),
                core_1.whatsappQueue.getJobCounts("waiting", "active", "delayed", "completed", "failed"),
                core_1.ocrJobQueue.getJobCounts("waiting", "active", "delayed", "completed", "failed"),
                (0, core_1.checkRedisHealth)(),
            ]);
            for (const [state, count] of Object.entries(reminderCounts)) {
                core_7.queueDepth.set({ queue: "reminders", state }, count ?? 0);
            }
            for (const [state, count] of Object.entries(whatsappCounts)) {
                core_7.queueDepth.set({ queue: "whatsapp", state }, count ?? 0);
            }
            for (const [state, count] of Object.entries(ocrCounts)) {
                core_7.queueDepth.set({ queue: "ocr-jobs", state }, count ?? 0);
            }
            core_3.logger.info({
                redisHealthy: redisOk,
                reminders: reminderCounts,
                whatsapp: whatsappCounts,
                ocrJobs: ocrCounts,
            }, "Worker monitoring snapshot");
        }
        catch (error) {
            core_7.errorCounter.inc({
                service: "worker_monitor",
                type: error?.name || "snapshot_error",
            });
            core_3.logger.error({ error: error?.message }, "Worker monitoring snapshot failed");
        }
    };
    monitorTimer = setInterval(runSnapshot, 30_000);
    monitorTimer.unref();
    void runSnapshot();
};
// ---------------------------------------------------------------------------
// Reaction Worker
// Processes jobs from the 'domain-events' BullMQ queue.
// Job name = DomainEventName. Routes to async handlers registered via
// eventBus.onAsync() — modules register their own reaction handlers.
//
// To add a reaction (e.g. stock deduction on InvoiceCreated):
//   import { eventBus, DOMAIN_EVENTS } from '@execora/core';
//   eventBus.onAsync(DOMAIN_EVENTS.INVOICE_CREATED, async (event) => { ... });
// ---------------------------------------------------------------------------
const reactionWorker = new bullmq_1.Worker("domain-events", async (job) => {
    const jobStart = Date.now();
    const event = job.data;
    core_3.logger.info({
        queue: "domain-events",
        jobId: job.id,
        eventName: event.name,
        source: event.metadata?.source,
    }, "Processing domain event");
    try {
        await core_6.eventBus.react(event);
        core_7.queueJobsProcessed.inc({ queue: "domain-events", status: "success" });
        core_7.queueJobDuration.observe({ queue: "domain-events", status: "success" }, (Date.now() - jobStart) / 1000);
    }
    catch (err) {
        core_7.queueJobsProcessed.inc({ queue: "domain-events", status: "failed" });
        core_7.queueJobDuration.observe({ queue: "domain-events", status: "failed" }, (Date.now() - jobStart) / 1000);
        core_7.errorCounter.inc({
            service: "worker",
            type: "domain_event_handler_error",
        });
        core_3.logger.error({ err, eventName: event.name, jobId: job.id }, "Domain event handler threw");
        throw err; // rethrow so BullMQ retries per backoff policy
    }
}, {
    connection: core_1.redisConnection,
    concurrency: 10,
});
reactionWorker.on("completed", (job) => {
    core_3.logger.debug({ queue: "domain-events", jobId: job.id, eventName: job.name }, "Domain event processed");
});
reactionWorker.on("failed", (job, err) => {
    core_3.logger.error({
        queue: "domain-events",
        jobId: job?.id,
        eventName: job?.name,
        error: err.message,
    }, "Domain event job failed");
});
// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
const startWorkers = () => {
    startWorkerMonitoring();
    core_3.logger.info({
        concurrency: { reminders: 5, whatsapp: 10, ocrJobs: 3, domainEvents: 10 },
    }, "Queue workers started (reminders, whatsapp, ocr-jobs, domain-events)");
};
exports.startWorkers = startWorkers;
const closeWorkers = async () => {
    if (monitorTimer) {
        clearInterval(monitorTimer);
        monitorTimer = null;
    }
    await Promise.all([
        reminderWorker.close(),
        whatsappWorker.close(),
        ocrWorker.close(),
        reactionWorker.close(),
    ]);
    core_3.logger.info("Queue workers closed");
};
exports.closeWorkers = closeWorkers;
//# sourceMappingURL=workers.js.map