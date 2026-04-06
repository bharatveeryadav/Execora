import { prisma } from "@execora/core";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import type {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ReceiptLineInput,
  PurchaseOrderRecord,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generatePoNo(tenantId: string): Promise<string> {
  const now = new Date();
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyLabel = `${fy}-${String(fy + 1).slice(2)}`;
  const last = await prisma.purchaseOrder.findFirst({
    where: { tenantId, poNo: { startsWith: `PO/${fyLabel}/` } },
    orderBy: { createdAt: "desc" },
    select: { poNo: true },
  });
  let seq = 1;
  if (last) {
    const parts = last.poNo.split("/");
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `PO/${fyLabel}/${seq}`;
}

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true, phone: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
    },
  },
} as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listPurchaseOrders(
  tenantId: string,
  opts: { status?: string; supplierId?: string; limit?: number } = {},
): Promise<PurchaseOrderRecord[]> {
  const where: Prisma.PurchaseOrderWhereInput = { tenantId };
  if (opts.status) where.status = opts.status;
  if (opts.supplierId) where.supplierId = opts.supplierId;
  return prisma.purchaseOrder.findMany({
    where,
    take: Math.min(opts.limit ?? 50, 100),
    orderBy: { orderDate: "desc" },
    include: PO_INCLUDE,
  });
}

export async function getPurchaseOrderById(
  tenantId: string,
  id: string,
): Promise<PurchaseOrderRecord | null> {
  return prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: PO_INCLUDE,
  });
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export async function createPurchaseOrder(
  tenantId: string,
  userId: string,
  input: CreatePurchaseOrderInput,
): Promise<PurchaseOrderRecord> {
  const { supplierId, expectedDate, notes, status = "pending", items } = input;
  let subtotal = 0;
  const itemData = items.map((it) => {
    const total = it.quantity * it.unitPrice;
    subtotal += total;
    return {
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: new Decimal(it.unitPrice),
      total: new Decimal(total),
      batchNo: it.batchNo?.trim() || null,
      expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
    };
  });
  const poNo = await generatePoNo(tenantId);
  return prisma.purchaseOrder.create({
    data: {
      tenantId,
      poNo,
      supplierId: supplierId?.trim() || null,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      subtotal: new Decimal(subtotal),
      tax: new Decimal(0),
      total: new Decimal(subtotal),
      status,
      notes: notes?.trim() || null,
      createdBy: userId,
      items: { create: itemData },
    },
    include: PO_INCLUDE,
  });
}

export async function updatePurchaseOrder(
  tenantId: string,
  id: string,
  input: UpdatePurchaseOrderInput,
): Promise<PurchaseOrderRecord | null> {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: { items: true },
  });
  if (!existing) return null;
  if (existing.status === "received" || existing.status === "cancelled") {
    throw new Error("Cannot edit received or cancelled PO");
  }
  const updates: Prisma.PurchaseOrderUpdateInput = {};
  if (input.supplierId !== undefined) {
    updates.supplier = input.supplierId
      ? { connect: { id: input.supplierId } }
      : { disconnect: true };
  }
  if (input.expectedDate !== undefined)
    updates.expectedDate = input.expectedDate
      ? new Date(input.expectedDate)
      : null;
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;
  if (input.status !== undefined) updates.status = input.status;
  if (input.items && input.items.length > 0) {
    let subtotal = 0;
    const itemData = input.items.map((it) => {
      const total = it.quantity * it.unitPrice;
      subtotal += total;
      return {
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: new Decimal(it.unitPrice),
        total: new Decimal(total),
        batchNo: it.batchNo?.trim() || null,
        expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
      };
    });
    updates.subtotal = new Decimal(subtotal);
    updates.tax = new Decimal(0);
    updates.total = new Decimal(subtotal);
    updates.items = { deleteMany: {}, create: itemData };
  }
  return prisma.purchaseOrder.update({
    where: { id },
    data: updates,
    include: PO_INCLUDE,
  });
}

export async function receivePurchaseOrder(
  tenantId: string,
  id: string,
  receipts: ReceiptLineInput[],
): Promise<PurchaseOrderRecord | null> {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: { items: { include: { product: true } } },
  });
  if (!po) return null;
  if (po.status === "cancelled") throw new Error("Cannot receive cancelled PO");

  await prisma.$transaction(async (tx) => {
    for (const r of receipts) {
      const item = po.items.find((i) => i.id === r.itemId);
      if (!item) continue;
      const qty = Math.min(
        r.receivedQty,
        item.quantity - item.receivedQuantity,
      );
      if (qty <= 0) continue;

      await tx.purchaseOrderItem.update({
        where: { id: r.itemId },
        data: { receivedQuantity: { increment: qty } },
      });
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: qty } },
      });

      if (r.batchNo?.trim() || r.expiryDate) {
        const batchNo = r.batchNo?.trim() || `B-${Date.now()}`;
        const expiryDate = r.expiryDate
          ? new Date(r.expiryDate)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        try {
          await tx.productBatch.upsert({
            where: {
              tenantId_productId_batchNo: {
                tenantId,
                productId: item.productId,
                batchNo,
              },
            },
            create: {
              tenantId,
              productId: item.productId,
              batchNo,
              expiryDate,
              quantity: qty,
              initialQuantity: qty,
              purchasePrice: item.unitPrice,
              purchaseDate: new Date(),
              supplierId: po.supplierId,
            },
            update: { quantity: { increment: qty } },
          });
        } catch {
          // Batch upsert failed — stock already updated, continue
        }
      }
    }

    const updated = await tx.purchaseOrder.findUnique({
      where: { id: po.id },
      include: { items: true },
    });
    if (!updated) return;
    const allReceived = updated.items.every(
      (i) => i.receivedQuantity >= i.quantity,
    );
    const anyReceived = updated.items.some((i) => i.receivedQuantity > 0);
    const newStatus = allReceived
      ? "received"
      : anyReceived
        ? "partial"
        : updated.status;
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: newStatus,
        ...(allReceived && { receivedDate: new Date() }),
      },
    });
  });

  return prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: PO_INCLUDE,
  });
}

export async function cancelPurchaseOrder(
  tenantId: string,
  id: string,
): Promise<PurchaseOrderRecord | null> {
  const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
  if (!po) return null;
  if (po.status === "received")
    throw new Error("Cannot cancel fully received PO");
  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "cancelled" },
  });
  return prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: PO_INCLUDE,
  });
}

// ─── Type re-exports ──────────────────────────────────────────────────────────

export type {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ReceiptLineInput,
  PurchaseOrderRecord,
} from "./types";
