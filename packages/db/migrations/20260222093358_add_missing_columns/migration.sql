/*
  Warnings:

  - The values [PAID,PARTIAL] on the enum `InvoiceStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [PAYMENT,REFUND] on the enum `LedgerType` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING,IGNORED] on the enum `ReminderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [QUEUED] on the enum `WhatsAppStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `audioUrl` on the `conversation_recordings` table. All the data in the column will be lost.
  - You are about to drop the column `intent` on the `conversation_recordings` table. All the data in the column will be lost.
  - You are about to drop the column `response` on the `conversation_recordings` table. All the data in the column will be lost.
  - You are about to drop the column `transcription` on the `conversation_recordings` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `conversation_recordings` table. All the data in the column will be lost.
  - You are about to drop the column `context` on the `conversation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `conversation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `conversation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `conversation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `whatsapp_messages` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `conversation_recordings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filePath` to the `conversation_recordings` table without a default value. This is not possible if the table is not empty.
  - Made the column `message` on table `reminders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceStatus_new" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');
ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "InvoiceStatus_new" USING ("status"::text::"InvoiceStatus_new");
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "InvoiceStatus_old";
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "LedgerType_new" AS ENUM ('DEBIT', 'CREDIT', 'OPENING_BALANCE');
ALTER TABLE "ledger_entries" ALTER COLUMN "type" TYPE "LedgerType_new" USING ("type"::text::"LedgerType_new");
ALTER TYPE "LedgerType" RENAME TO "LedgerType_old";
ALTER TYPE "LedgerType_new" RENAME TO "LedgerType";
DROP TYPE "LedgerType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReminderStatus_new" AS ENUM ('SCHEDULED', 'SENT', 'FAILED', 'CANCELLED');
ALTER TABLE "reminders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "reminders" ALTER COLUMN "status" TYPE "ReminderStatus_new" USING ("status"::text::"ReminderStatus_new");
ALTER TYPE "ReminderStatus" RENAME TO "ReminderStatus_old";
ALTER TYPE "ReminderStatus_new" RENAME TO "ReminderStatus";
DROP TYPE "ReminderStatus_old";
ALTER TABLE "reminders" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WhatsAppStatus_new" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');
ALTER TABLE "whatsapp_messages" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "whatsapp_messages" ALTER COLUMN "status" TYPE "WhatsAppStatus_new" USING ("status"::text::"WhatsAppStatus_new");
ALTER TYPE "WhatsAppStatus" RENAME TO "WhatsAppStatus_old";
ALTER TYPE "WhatsAppStatus_new" RENAME TO "WhatsAppStatus";
DROP TYPE "WhatsAppStatus_old";
ALTER TABLE "whatsapp_messages" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "conversation_recordings" DROP CONSTRAINT "conversation_recordings_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "conversation_sessions" DROP CONSTRAINT "conversation_sessions_customerId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_messages" DROP CONSTRAINT "whatsapp_messages_reminderId_fkey";

-- AlterTable
ALTER TABLE "conversation_recordings" DROP COLUMN "audioUrl",
DROP COLUMN "intent",
DROP COLUMN "response",
DROP COLUMN "transcription",
DROP COLUMN "updatedAt",
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "filePath" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL DEFAULT 'audio/webm',
ADD COLUMN     "size" INTEGER;

-- AlterTable
ALTER TABLE "conversation_sessions" DROP COLUMN "context",
DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "updatedAt",
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "message" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "whatsapp_messages" DROP COLUMN "sentAt",
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ALTER COLUMN "reminderId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "conversation_recordings" ADD CONSTRAINT "conversation_recordings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
