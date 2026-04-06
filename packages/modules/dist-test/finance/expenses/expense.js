"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpenses = listExpenses;
exports.createExpense = createExpense;
exports.deleteExpense = deleteExpense;
exports.getExpenseSummary = getExpenseSummary;
exports.listPurchases = listPurchases;
exports.createPurchase = createPurchase;
exports.deletePurchase = deletePurchase;
exports.getCashbook = getCashbook;
const core_1 = require("@execora/core");
const client_1 = require("@prisma/client");
// ─── Internal helper ──────────────────────────────────────────────────────────
function parseDateRange(from, to) {
    const f = from
        ? new Date(from)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const t = to ? new Date(to) : new Date();
    t.setHours(23, 59, 59, 999);
    return { f, t };
}
// ─── Expenses ─────────────────────────────────────────────────────────────────
async function listExpenses(tenantId, opts = {}) {
    const { from, to, category, type: typeFilter, supplier, limit = 200 } = opts;
    const take = Math.min(limit, 500);
    const { f, t } = parseDateRange(from, to);
    const expenseType = typeFilter === "income" ? "income" : "expense";
    const expenses = await core_1.prisma.expense.findMany({
        where: {
            tenantId,
            type: expenseType,
            date: { gte: f, lte: t },
            ...(category ? { category } : {}),
            ...(supplier
                ? { supplier: { contains: supplier, mode: "insensitive" } }
                : {}),
        },
        orderBy: { date: "desc" },
        take,
    });
    const total = expenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
    return { expenses, total, count: expenses.length };
}
async function createExpense(tenantId, body) {
    return core_1.prisma.expense.create({
        data: {
            tenantId,
            type: body.type ?? "expense",
            category: body.category,
            amount: new client_1.Prisma.Decimal(body.amount),
            note: body.note || null,
            supplier: body.supplier || null,
            date: body.date ? new Date(body.date) : new Date(),
        },
    });
}
/** Returns the deleted id, or null if not found. */
async function deleteExpense(tenantId, id) {
    const row = await core_1.prisma.expense.findFirst({
        where: { id, tenantId, type: { in: ["expense", "income"] } },
    });
    if (!row)
        return null;
    await core_1.prisma.expense.delete({ where: { id: row.id } });
    return row.id;
}
async function getExpenseSummary(tenantId, from, to) {
    const { f, t } = parseDateRange(from, to);
    const rows = await core_1.prisma.expense.findMany({
        where: { tenantId, type: "expense", date: { gte: f, lte: t } },
        select: { category: true, amount: true },
    });
    const byCategory = {};
    let total = 0;
    for (const r of rows) {
        const amt = parseFloat(String(r.amount));
        byCategory[r.category] = (byCategory[r.category] ?? 0) + amt;
        total += amt;
    }
    return { total, byCategory, count: rows.length };
}
// ─── Purchases ────────────────────────────────────────────────────────────────
async function listPurchases(tenantId, opts = {}) {
    const { from, to, supplier, limit = 200 } = opts;
    const take = Math.min(limit, 500);
    const sup = (supplier ?? "").trim();
    const { f, t } = parseDateRange(from, to);
    const purchases = await core_1.prisma.expense.findMany({
        where: {
            tenantId,
            type: "purchase",
            date: { gte: f, lte: t },
            ...(sup ? { supplier: { contains: sup, mode: "insensitive" } } : {}),
        },
        orderBy: { date: "desc" },
        take,
    });
    const total = purchases.reduce((s, p) => s + parseFloat(String(p.amount)), 0);
    return { purchases, total, count: purchases.length };
}
async function createPurchase(tenantId, body) {
    return core_1.prisma.expense.create({
        data: {
            tenantId,
            type: "purchase",
            category: body.category,
            amount: new client_1.Prisma.Decimal(body.amount),
            itemName: body.itemName || null,
            supplier: body.supplier || null,
            quantity: body.quantity != null ? new client_1.Prisma.Decimal(body.quantity) : null,
            unit: body.unit || null,
            ratePerUnit: body.ratePerUnit != null ? new client_1.Prisma.Decimal(body.ratePerUnit) : null,
            note: body.note || null,
            batchNo: body.batchNo || null,
            expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
            date: body.date ? new Date(body.date) : new Date(),
        },
    });
}
/** Returns the deleted id, or null if not found. */
async function deletePurchase(tenantId, id) {
    const row = await core_1.prisma.expense.findFirst({
        where: { id, tenantId, type: "purchase" },
    });
    if (!row)
        return null;
    await core_1.prisma.expense.delete({ where: { id: row.id } });
    return row.id;
}
// ─── Cashbook ─────────────────────────────────────────────────────────────────
async function getCashbook(tenantId, from, to) {
    const { f, t } = parseDateRange(from, to);
    const [payments, expenses] = await Promise.all([
        core_1.prisma.payment.findMany({
            where: { tenantId, receivedAt: { gte: f, lte: t } },
            include: { customer: { select: { name: true } } },
            orderBy: { receivedAt: "desc" },
        }),
        core_1.prisma.expense.findMany({
            where: { tenantId, date: { gte: f, lte: t } },
            orderBy: { date: "desc" },
        }),
    ]);
    const inEntries = [
        ...payments.map((p) => ({
            id: `pay-${p.id}`,
            type: "in",
            amount: parseFloat(String(p.amount)),
            category: p.method === "cash"
                ? "Cash Receipt"
                : p.method === "upi"
                    ? "UPI Receipt"
                    : "Bank Receipt",
            note: p.customer?.name
                ? `Payment from ${p.customer.name}`
                : "Payment received",
            date: p.receivedAt.toISOString().slice(0, 10),
            createdAt: p.receivedAt.getTime(),
        })),
        ...expenses
            .filter((e) => e.type === "income")
            .map((e) => ({
            id: `inc-${e.id}`,
            type: "in",
            amount: parseFloat(String(e.amount)),
            category: `Income: ${e.category}`,
            note: e.note || e.supplier || "",
            date: new Date(e.date).toISOString().slice(0, 10),
            createdAt: e.createdAt.getTime(),
        })),
    ];
    const outEntries = expenses
        .filter((e) => e.type !== "income")
        .map((e) => ({
        id: `exp-${e.id}`,
        type: "out",
        amount: parseFloat(String(e.amount)),
        category: e.type === "purchase" ? `Purchase: ${e.category}` : e.category,
        note: e.note || e.supplier || e.itemName || "",
        date: new Date(e.date).toISOString().slice(0, 10),
        createdAt: e.createdAt.getTime(),
    }));
    const combined = [...inEntries, ...outEntries].sort((a, b) => b.createdAt - a.createdAt);
    const totalIn = inEntries.reduce((s, e) => s + e.amount, 0);
    const totalOut = outEntries.reduce((s, e) => s + e.amount, 0);
    return {
        entries: combined.slice(0, 300),
        totalIn,
        totalOut,
        balance: totalIn - totalOut,
    };
}
//# sourceMappingURL=expense.js.map