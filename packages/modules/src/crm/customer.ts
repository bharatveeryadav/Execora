/**
 * CRM domain — customer business operations.
 *
 * Direct Prisma calls, flat async functions, no class wrappers.
 * Voice-engine-specific methods (context cache, ranked search, balance streaming)
 * remain in modules/customer/customer.service.ts (legacy, voice layer only).
 */

import { prisma, logger, tenantContext } from "@execora/infrastructure";
import { Decimal } from "@prisma/client/runtime/library";
import { ReminderStatus } from "@prisma/client";
import type { CustomerSearchResult } from "@execora/types";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseTokens(query: string): string[] {
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

function toSearchResult(c: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  nickname: string[] | string | null;
  landmark: string | null;
  balance: Decimal | number;
  tags?: string[];
  notes?: string | null;
  gstin?: string | null;
  creditLimit?: Decimal | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}): CustomerSearchResult {
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

export async function getCustomerById(id: string) {
  const { tenantId } = tenantContext.get();
  return prisma.customer.findFirst({
    where: { id, tenantId },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 5 },
      reminders: {
        where: { status: ReminderStatus.pending },
        orderBy: { scheduledTime: "asc" },
      },
    },
  });
}

export async function getCustomerBalance(customerId: string): Promise<number> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { balance: true },
  });
  return customer ? parseFloat(String(customer.balance)) : 0;
}

export async function searchCustomers(
  query: string,
): Promise<CustomerSearchResult[]> {
  const tokens = parseTokens(query);
  const q = query.toLowerCase().trim();

  // Phone number fast-path
  if (/^\+?\d{10,15}$/.test(query.replace(/[\s-]/g, ""))) {
    const byPhone = await prisma.customer.findMany({
      where: { phone: { contains: query.replace(/[\s-]/g, "") } },
      take: 5,
    });
    if (byPhone.length > 0) return byPhone.map(toSearchResult);
  }

  const customers = await prisma.customer.findMany({
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
                    { name: { contains: token, mode: "insensitive" as const } },
                    { nickname: { has: token } },
                    {
                      landmark: {
                        contains: token,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      notes: { contains: token, mode: "insensitive" as const },
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

export async function listCustomers(
  limit = 200,
): Promise<CustomerSearchResult[]> {
  const { tenantId } = tenantContext.get();
  const customers = await prisma.customer.findMany({
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

export async function listOverdueCustomers() {
  const { tenantId } = tenantContext.get();
  const customers = await prisma.customer.findMany({
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

export async function getTotalPending(): Promise<number> {
  const { tenantId } = tenantContext.get();
  const result = await prisma.customer.aggregate({
    _sum: { balance: true },
    where: { tenantId, balance: { gt: 0 } },
  });
  return parseFloat(String(result._sum.balance ?? 0));
}

export async function getCustomerCommPrefs(customerId: string) {
  return prisma.customerCommunicationPrefs.findUnique({
    where: { customerId },
  });
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export async function createCustomer(data: {
  name: string;
  phone?: string;
  email?: string;
  nickname?: string;
  landmark?: string;
  notes?: string;
  openingBalance?: number;
  creditLimit?: number;
  tags?: string[];
  gstin?: string;
}) {
  const {
    name,
    phone,
    email,
    nickname,
    landmark,
    notes,
    openingBalance,
    creditLimit,
    tags,
    gstin,
  } = data;

  if (!name?.trim()) throw new Error("Customer name is required");

  const existing = await prisma.customer.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new Error(`Customer "${name}" already exists`);

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenantContext.get().tenantId,
      name: name.trim(),
      phone: phone ?? null,
      email: email ?? null,
      nickname: nickname ? [nickname] : [],
      landmark: landmark ?? null,
      notes: notes ?? null,
      balance: openingBalance ?? 0,
      creditLimit: creditLimit != null ? new Decimal(creditLimit) : null,
      tags: tags ?? [],
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      alternatePhone: [],
      preferredPaymentMethod: [],
      preferredDays: [],
      commonPhrases: [],
    } as Parameters<typeof prisma.customer.create>[0]["data"],
  });

  logger.info(
    { customerId: customer.id, name: customer.name },
    "Customer created",
  );
  return customer;
}

export async function updateCustomer(
  id: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    nickname?: string;
    landmark?: string;
    creditLimit?: number;
    tags?: string[];
    notes?: string;
    gstin?: string | null;
  },
) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.nickname !== undefined)
    updateData.nickname = data.nickname ? [data.nickname] : [];
  if (data.landmark !== undefined) updateData.landmark = data.landmark || null;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.creditLimit !== undefined)
    updateData.creditLimit = new Decimal(data.creditLimit);
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  if (data.gstin !== undefined)
    updateData.gstin = data.gstin ? data.gstin.trim().toUpperCase() : null;

  if (Object.keys(updateData).length === 0)
    throw new Error("No fields to update");

  const updated = await prisma.customer.update({
    where: { id },
    data: updateData,
  });
  logger.info(
    { customerId: id, fields: Object.keys(updateData) },
    "Customer updated",
  );
  return updated;
}

export async function updateCustomerBalance(
  customerId: string,
  amount: number,
) {
  if (!isFinite(amount)) throw new Error("Amount must be a finite number");
  return prisma.customer.update({
    where: { id: customerId },
    data: { balance: { increment: amount } },
  });
}

export async function upsertCustomerCommPrefs(
  customerId: string,
  data: {
    whatsappEnabled?: boolean;
    whatsappNumber?: string;
    emailEnabled?: boolean;
    emailAddress?: string;
    smsEnabled?: boolean;
    preferredLanguage?: string;
  },
) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { tenantId: true },
  });
  if (!customer) throw new Error("Customer not found");

  return prisma.customerCommunicationPrefs.upsert({
    where: { customerId },
    create: { tenantId: customer.tenantId, customerId, ...data } as Parameters<
      typeof prisma.customerCommunicationPrefs.upsert
    >[0]["create"],
    update: data as Parameters<
      typeof prisma.customerCommunicationPrefs.upsert
    >[0]["update"],
  });
}

export async function deleteCustomer(customerId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
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

      const invoiceIds = (
        await tx.invoice.findMany({
          where: { customerId },
          select: { id: true },
        })
      ).map((i) => i.id);

      let invoiceItems = 0;
      if (invoiceIds.length > 0) {
        invoiceItems = (
          await tx.invoiceItem.deleteMany({
            where: { invoiceId: { in: invoiceIds } },
          })
        ).count;
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ customerId, error: msg }, "Customer delete failed");
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
