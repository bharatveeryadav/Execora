/**
 * @execora/db — re-exports PrismaClient and Prisma namespace types.
 *
 * Import from here rather than directly from @prisma/client so the whole
 * monorepo uses a single, consistent Prisma version at build time.
 *
 *   import { PrismaClient, Prisma } from '@execora/db';
 */
export { PrismaClient, Prisma } from "@prisma/client";
export type { MessageChannel, MessageStatus, InvoiceStatus } from "@prisma/client";
