"use strict";
/**
 * CRM domain — customer business operations.
 *
 * Direct Prisma calls, flat async functions, no class wrappers.
 * Voice-engine-specific methods (context cache, ranked search, balance streaming)
 * remain in modules/customer/customer.service.ts (legacy, voice layer only).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerById = getCustomerById;
exports.getCustomerBalance = getCustomerBalance;
exports.searchCustomers = searchCustomers;
exports.listCustomers = listCustomers;
exports.listOverdueCustomers = listOverdueCustomers;
exports.getTotalPending = getTotalPending;
exports.getCustomerCommPrefs = getCustomerCommPrefs;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
exports.updateCustomerBalance = updateCustomerBalance;
exports.upsertCustomerCommPrefs = upsertCustomerCommPrefs;
exports.deleteCustomer = deleteCustomer;
const core_1 = require("@execora/core");
const library_1 = require("@prisma/client/runtime/library");
const client_1 = require("@prisma/client");
// ─── Internal helpers ─────────────────────────────────────────────────────────
function parseTokens(query) {
    const stopWords = new Set([
        "ka",
        "ki",
        "ke",
        "ko",
        "se",
        "me",
        "hai",
        "wala",
        "wali",
        "customer",
        "bhai",
        "ji",
        "mr",
        "mrs",
        "ms",
        "the",
        "a",
        "an",
    ]);
    return query
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter((t) => t.length >= 2 && !stopWords.has(t));
}
function toSearchResult(c) {
    return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        nickname: Array.isArray(c.nickname) ? (c.nickname[0] ?? null) : c.nickname,
        landmark: c.landmark,
        balance: parseFloat(String(c.balance)),
        matchScore: 1.0,
        tags: c.tags,
        notes: c.notes ?? undefined,
        gstin: c.gstin ?? undefined,
        creditLimit: c.creditLimit ? parseFloat(String(c.creditLimit)) : null,
        addressLine1: c.addressLine1 ?? undefined,
        addressLine2: c.addressLine2 ?? undefined,
        city: c.city ?? undefined,
        state: c.state ?? undefined,
        pincode: c.pincode ?? undefined,
    };
}
// ─── Queries ──────────────────────────────────────────────────────────────────
async function getCustomerById(id) {
    const { tenantId } = core_1.tenantContext.get();
    return core_1.prisma.customer.findFirst({
        where: { id, tenantId },
        include: {
            invoices: { orderBy: { createdAt: "desc" }, take: 5 },
            reminders: {
                where: { status: client_1.ReminderStatus.pending },
                orderBy: { scheduledTime: "asc" },
            },
        },
    });
}
async function getCustomerBalance(customerId) {
    const customer = await core_1.prisma.customer.findUnique({
        where: { id: customerId },
        select: { balance: true },
    });
    return customer ? parseFloat(String(customer.balance)) : 0;
}
async function searchCustomers(query) {
    const tokens = parseTokens(query);
    const q = query.toLowerCase().trim();
    // Phone number fast-path
    if (/^\+?\d{10,15}$/.test(query.replace(/[\s-]/g, ""))) {
        const byPhone = await core_1.prisma.customer.findMany({
            where: { phone: { contains: query.replace(/[\s-]/g, "") } },
            take: 5,
        });
        if (byPhone.length > 0)
            return byPhone.map(toSearchResult);
    }
    const customers = await core_1.prisma.customer.findMany({
        where: {
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { nickname: { has: q } },
                { landmark: { contains: q, mode: "insensitive" } },
                { notes: { contains: q, mode: "insensitive" } },
                ...(tokens.length > 0
                    ? [
                        {
                            AND: tokens.map((token) => ({
                                OR: [
                                    { name: { contains: token, mode: "insensitive" } },
                                    { nickname: { has: token } },
                                    {
                                        landmark: {
                                            contains: token,
                                            mode: "insensitive",
                                        },
                                    },
                                    {
                                        notes: { contains: token, mode: "insensitive" },
                                    },
                                ],
                            })),
                        },
                    ]
                    : []),
            ],
        },
        take: 20,
    });
    return customers.map(toSearchResult);
}
async function listCustomers(limit = 200) {
    const { tenantId } = core_1.tenantContext.get();
    const customers = await core_1.prisma.customer.findMany({
        where: { tenantId },
        orderBy: { balance: "desc" },
        take: limit,
        select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            nickname: true,
            landmark: true,
            balance: true,
            tags: true,
            notes: true,
            gstin: true,
            creditLimit: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            pincode: true,
        },
    });
    return customers.map(toSearchResult);
}
async function listOverdueCustomers() {
    const { tenantId } = core_1.tenantContext.get();
    const customers = await core_1.prisma.customer.findMany({
        where: { tenantId, balance: { gt: 0 } },
        select: {
            id: true,
            name: true,
            balance: true,
            landmark: true,
            phone: true,
        },
        orderBy: { balance: "desc" },
    });
    return customers.map((c) => ({
        id: c.id,
        name: c.name,
        balance: parseFloat(String(c.balance)),
        landmark: c.landmark ?? undefined,
        phone: c.phone ?? undefined,
    }));
}
async function getTotalPending() {
    const { tenantId } = core_1.tenantContext.get();
    const result = await core_1.prisma.customer.aggregate({
        _sum: { balance: true },
        where: { tenantId, balance: { gt: 0 } },
    });
    return parseFloat(String(result._sum.balance ?? 0));
}
async function getCustomerCommPrefs(customerId) {
    return core_1.prisma.customerCommunicationPrefs.findUnique({
        where: { customerId },
    });
}
// ─── Commands ─────────────────────────────────────────────────────────────────
async function createCustomer(data) {
    const { name, phone, email, nickname, landmark, notes, openingBalance, creditLimit, tags, gstin, } = data;
    if (!name?.trim())
        throw new Error("Customer name is required");
    const existing = await core_1.prisma.customer.findFirst({
        where: { name: { equals: name.trim(), mode: "insensitive" } },
        select: { id: true },
    });
    if (existing)
        throw new Error(`Customer "${name}" already exists`);
    const customer = await core_1.prisma.customer.create({
        data: {
            tenantId: core_1.tenantContext.get().tenantId,
            name: name.trim(),
            phone: phone ?? null,
            email: email ?? null,
            nickname: nickname ? [nickname] : [],
            landmark: landmark ?? null,
            notes: notes ?? null,
            balance: openingBalance ?? 0,
            creditLimit: creditLimit != null ? new library_1.Decimal(creditLimit) : null,
            tags: tags ?? [],
            gstin: gstin ? gstin.trim().toUpperCase() : null,
            alternatePhone: [],
            preferredPaymentMethod: [],
            preferredDays: [],
            commonPhrases: [],
        },
    });
    core_1.logger.info({ customerId: customer.id, name: customer.name }, "Customer created");
    return customer;
}
async function updateCustomer(id, data) {
    const updateData = {};
    if (data.name !== undefined)
        updateData.name = data.name.trim();
    if (data.phone !== undefined)
        updateData.phone = data.phone || null;
    if (data.email !== undefined)
        updateData.email = data.email || null;
    if (data.nickname !== undefined)
        updateData.nickname = data.nickname ? [data.nickname] : [];
    if (data.landmark !== undefined)
        updateData.landmark = data.landmark || null;
    if (data.tags !== undefined)
        updateData.tags = data.tags;
    if (data.creditLimit !== undefined)
        updateData.creditLimit = new library_1.Decimal(data.creditLimit);
    if (data.notes !== undefined)
        updateData.notes = data.notes || null;
    if (data.gstin !== undefined)
        updateData.gstin = data.gstin ? data.gstin.trim().toUpperCase() : null;
    if (Object.keys(updateData).length === 0)
        throw new Error("No fields to update");
    const updated = await core_1.prisma.customer.update({
        where: { id },
        data: updateData,
    });
    core_1.logger.info({ customerId: id, fields: Object.keys(updateData) }, "Customer updated");
    return updated;
}
async function updateCustomerBalance(customerId, amount) {
    if (!isFinite(amount))
        throw new Error("Amount must be a finite number");
    return core_1.prisma.customer.update({
        where: { id: customerId },
        data: { balance: { increment: amount } },
    });
}
async function upsertCustomerCommPrefs(customerId, data) {
    const customer = await core_1.prisma.customer.findUnique({
        where: { id: customerId },
        select: { tenantId: true },
    });
    if (!customer)
        throw new Error("Customer not found");
    return core_1.prisma.customerCommunicationPrefs.upsert({
        where: { customerId },
        create: { tenantId: customer.tenantId, customerId, ...data },
        update: data,
    });
}
async function deleteCustomer(customerId) {
    try {
        const result = await core_1.prisma.$transaction(async (tx) => {
            const reminders = await tx.reminder.findMany({
                where: { customerId },
                select: { id: true },
            });
            let messageLogs = 0;
            if (reminders.length > 0) {
                const r = await tx.messageLog.deleteMany({
                    where: { reminderId: { in: reminders.map((r) => r.id) } },
                });
                messageLogs += r.count;
            }
            messageLogs += (await tx.messageLog.deleteMany({ where: { customerId } }))
                .count;
            const remindersDeleted = await tx.reminder.deleteMany({
                where: { customerId },
            });
            const invoiceIds = (await tx.invoice.findMany({
                where: { customerId },
                select: { id: true },
            })).map((i) => i.id);
            let invoiceItems = 0;
            if (invoiceIds.length > 0) {
                invoiceItems = (await tx.invoiceItem.deleteMany({
                    where: { invoiceId: { in: invoiceIds } },
                })).count;
            }
            const invoices = await tx.invoice.deleteMany({ where: { customerId } });
            const payments = await tx.payment.deleteMany({ where: { customerId } });
            const customer = await tx.customer.deleteMany({
                where: { id: customerId },
            });
            return {
                invoices: invoices.count,
                payments: payments.count,
                reminders: remindersDeleted.count,
                messageLogs,
                invoiceItems,
                customer: customer.count,
            };
        });
        return { success: true, deletedRecords: result };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        core_1.logger.error({ customerId, error: msg }, "Customer delete failed");
        return {
            success: false,
            error: msg,
            deletedRecords: {
                invoices: 0,
                payments: 0,
                reminders: 0,
                messageLogs: 0,
                invoiceItems: 0,
                customer: 0,
            },
        };
    }
}
//# sourceMappingURL=customer.js.map