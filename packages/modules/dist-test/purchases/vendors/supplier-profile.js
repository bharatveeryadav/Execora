"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSuppliers = listSuppliers;
exports.getSupplierById = getSupplierById;
exports.createSupplier = createSupplier;
const core_1 = require("@execora/core");
// ─── Queries ──────────────────────────────────────────────────────────────────
async function listSuppliers(tenantId, q, limit = 50) {
    const where = { tenantId };
    if (q?.trim()) {
        where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
        ];
    }
    return core_1.prisma.supplier.findMany({
        where,
        take: Math.min(limit, 200),
        orderBy: { name: "asc" },
    });
}
async function getSupplierById(tenantId, supplierId) {
    return core_1.prisma.supplier.findFirst({
        where: { id: supplierId, tenantId },
    });
}
// ─── Commands ─────────────────────────────────────────────────────────────────
async function createSupplier(tenantId, input) {
    return core_1.prisma.supplier.create({
        data: {
            tenantId,
            name: input.name.trim(),
            companyName: input.companyName?.trim() || null,
            phone: input.phone?.trim() || null,
            email: input.email?.trim() || null,
            address: input.address?.trim() || null,
            gstin: input.gstin?.trim() || null,
        },
    });
}
//# sourceMappingURL=supplier-profile.js.map