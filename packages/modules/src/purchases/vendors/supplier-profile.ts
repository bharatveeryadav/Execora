import { prisma } from "@execora/infrastructure";
import { Prisma } from "@prisma/client";
import type { CreateSupplierInput, SupplierRecord } from "./types";

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listSuppliers(
  tenantId: string,
  q?: string,
  limit = 50,
): Promise<SupplierRecord[]> {
  const where: Prisma.SupplierWhereInput = { tenantId };
  if (q?.trim()) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  return prisma.supplier.findMany({
    where,
    take: Math.min(limit, 200),
    orderBy: { name: "asc" },
  });
}

export async function getSupplierById(
  tenantId: string,
  supplierId: string,
): Promise<SupplierRecord | null> {
  return prisma.supplier.findFirst({
    where: { id: supplierId, tenantId },
  });
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export async function createSupplier(
  tenantId: string,
  input: CreateSupplierInput,
): Promise<SupplierRecord> {
  return prisma.supplier.create({
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

// ─── Type re-exports ──────────────────────────────────────────────────────────

export type {
  CreateSupplierInput,
  ListSuppliersInput,
  SupplierRecord,
} from "./types";
