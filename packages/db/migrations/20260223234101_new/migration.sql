/*
  Warnings:

  - The values [DRAFT,CONFIRMED,CANCELLED] on the enum `InvoiceStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SCHEDULED,SENT,FAILED,CANCELLED] on the enum `ReminderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `durationMs` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `intent` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `success` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `conversation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `conversation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `endedAt` on the `conversation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `conversation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `conversation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `confidence` on the `conversation_turns` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `conversation_turns` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `conversation_turns` table. All the data in the column will be lost.
  - You are about to drop the column `durationMs` on the `conversation_turns` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `conversation_turns` table. All the data in the column will be lost.
  - You are about to drop the column `speaker` on the `conversation_turns` table. All the data in the column will be lost.
  - You are about to drop the column `transcript` on the `conversation_turns` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `customer_aliases` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `customer_aliases` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `customer_aliases` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `customers` table. All the data in the column will be lost.
  - The `nickname` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdAt` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceId` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `failedAt` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `retryCount` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `sendAt` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `reminders` table. All the data in the column will be lost.
  - The primary key for the `session_active_context` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `activeCustomerId` on the `session_active_context` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `session_active_context` table. All the data in the column will be lost.
  - You are about to drop the column `pendingIntent` on the `session_active_context` table. All the data in the column will be lost.
  - You are about to drop the column `recentCustomers` on the `session_active_context` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `session_active_context` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `session_active_context` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `stock_movements` table. All the data in the column will be lost.
  - You are about to drop the column `delta` on the `stock_movements` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `stock_movements` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `stock_movements` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `stock_movements` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `failedAttempts` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lockedUntil` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `pinHash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `conversation_recordings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ledger_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `whatsapp_messages` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[session_id,turn_number]` on the table `conversation_turns` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,customer_id,alias]` on the table `customer_aliases` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,phone]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,gstin]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,pan]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoice_no]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[irn]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,sku]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,barcode]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entity_id` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity_type` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `conversation_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `conversation_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `conversation_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `raw_input` to the `conversation_turns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `conversation_turns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `conversation_turns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `turn_number` to the `conversation_turns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `conversation_turns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alias_type` to the `customer_aliases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_id` to the `customer_aliases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `customer_aliases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `customer_aliases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice_id` to the `invoice_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_name` to the `invoice_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `invoice_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `invoice_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_price` to the `invoice_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice_no` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reminder_type` to the `reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduled_time` to the `reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `session_active_context` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `session_active_context` table without a default value. This is not possible if the table is not empty.
  - Added the required column `new_stock` to the `stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `previous_stock` to the `stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('kirana', 'cosmetics', 'both', 'retail', 'wholesale');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('free', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended', 'trial', 'expired');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'admin', 'manager', 'staff', 'viewer');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'upi', 'card', 'bank', 'credit', 'mixed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('purchase', 'sale', 'return', 'adjustment', 'damage', 'expired');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('payment_due', 'payment_overdue', 'invoice_reminder', 'low_stock', 'expiry_alert', 'birthday', 'anniversary', 'follow_up', 'custom', 'staff_task', 'gst_filing');

-- CreateEnum
CREATE TYPE "ReminderPriority" AS ENUM ('high', 'normal', 'low');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('whatsapp', 'email', 'sms', 'in_app');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed', 'bounced', 'rejected');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('active', 'paused', 'waiting', 'ended', 'archived');

-- CreateEnum
CREATE TYPE "TurnType" AS ENUM ('voice', 'text', 'whatsapp', 'system', 'quick_action');

-- CreateEnum
CREATE TYPE "ConversationPriority" AS ENUM ('urgent', 'high', 'normal', 'low');

-- CreateEnum
CREATE TYPE "AliasType" AS ENUM ('nickname', 'honorific', 'misspelling', 'local', 'contextual', 'temporal', 'learned');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('family', 'business_partner', 'reference', 'same_person', 'husband_wife', 'father_son', 'brother', 'sister');

-- CreateEnum
CREATE TYPE "GstActionType" AS ENUM ('filing', 'invoice', 'credit_note', 'debit_note', 'amendment');

-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceStatus_new" AS ENUM ('draft', 'pending', 'paid', 'partial', 'cancelled');
ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "InvoiceStatus_new" USING ("status"::text::"InvoiceStatus_new");
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "InvoiceStatus_old";
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReminderStatus_new" AS ENUM ('pending', 'sent', 'failed', 'cancelled', 'expired');
ALTER TABLE "reminders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "reminders" ALTER COLUMN "status" TYPE "ReminderStatus_new" USING ("status"::text::"ReminderStatus_new");
ALTER TYPE "ReminderStatus" RENAME TO "ReminderStatus_old";
ALTER TYPE "ReminderStatus_new" RENAME TO "ReminderStatus";
DROP TYPE "ReminderStatus_old";
ALTER TABLE "reminders" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_customerId_fkey";

-- DropForeignKey
ALTER TABLE "conversation_recordings" DROP CONSTRAINT "conversation_recordings_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "conversation_turns" DROP CONSTRAINT "conversation_turns_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "customer_aliases" DROP CONSTRAINT "customer_aliases_customerId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customerId_fkey";

-- DropForeignKey
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_customerId_fkey";

-- DropForeignKey
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_customerId_fkey";

-- DropForeignKey
ALTER TABLE "session_active_context" DROP CONSTRAINT "session_active_context_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_productId_fkey";

-- DropIndex
DROP INDEX "activity_logs_createdAt_idx";

-- DropIndex
DROP INDEX "activity_logs_customerId_idx";

-- DropIndex
DROP INDEX "activity_logs_intent_idx";

-- DropIndex
DROP INDEX "conversation_sessions_customerId_idx";

-- DropIndex
DROP INDEX "conversation_sessions_startedAt_idx";

-- DropIndex
DROP INDEX "conversation_turns_createdAt_idx";

-- DropIndex
DROP INDEX "conversation_turns_sessionId_idx";

-- DropIndex
DROP INDEX "customer_aliases_customerId_idx";

-- DropIndex
DROP INDEX "customers_email_idx";

-- DropIndex
DROP INDEX "customers_name_idx";

-- DropIndex
DROP INDEX "customers_phone_idx";

-- DropIndex
DROP INDEX "invoice_items_invoiceId_idx";

-- DropIndex
DROP INDEX "invoice_items_productId_idx";

-- DropIndex
DROP INDEX "invoices_createdAt_idx";

-- DropIndex
DROP INDEX "invoices_customerId_idx";

-- DropIndex
DROP INDEX "products_name_idx";

-- DropIndex
DROP INDEX "reminders_customerId_idx";

-- DropIndex
DROP INDEX "reminders_sendAt_idx";

-- DropIndex
DROP INDEX "reminders_status_idx";

-- DropIndex
DROP INDEX "session_active_context_sessionId_key";

-- DropIndex
DROP INDEX "stock_movements_createdAt_idx";

-- DropIndex
DROP INDEX "stock_movements_productId_idx";

-- DropIndex
DROP INDEX "users_phone_key";

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "durationMs",
DROP COLUMN "intent",
DROP COLUMN "payload",
DROP COLUMN "result",
DROP COLUMN "sessionId",
DROP COLUMN "success",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "entity_id" TEXT NOT NULL,
ADD COLUMN     "entity_type" TEXT NOT NULL,
ADD COLUMN     "gst_action_type" "GstActionType",
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "is_gst_relevant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "new_data" JSONB,
ADD COLUMN     "old_data" JSONB,
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "user_agent" TEXT,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "conversation_sessions" DROP COLUMN "customerId",
DROP COLUMN "duration",
DROP COLUMN "endedAt",
DROP COLUMN "metadata",
DROP COLUMN "startedAt",
ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'counter',
ADD COLUMN     "context_stack" JSONB NOT NULL DEFAULT '{"current":{"stage":"idle","intent":null,"entities":{},"pending_input":false},"metadata":{"turn_count":0,"started_at":null}}',
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "customer_snapshot" JSONB,
ADD COLUMN     "device_info" JSONB,
ADD COLUMN     "expected_resume_time" TIMESTAMP(3),
ADD COLUMN     "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "priority" "ConversationPriority" NOT NULL DEFAULT 'normal',
ADD COLUMN     "queue_position" INTEGER,
ADD COLUMN     "session_key" TEXT,
ADD COLUMN     "session_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "turn_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "version" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "conversation_turns" DROP COLUMN "confidence",
DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "durationMs",
DROP COLUMN "sessionId",
DROP COLUMN "speaker",
DROP COLUMN "transcript",
ADD COLUMN     "context_after" JSONB,
ADD COLUMN     "context_before" JSONB,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "entities" JSONB,
ADD COLUMN     "input_confidence" DECIMAL(65,30),
ADD COLUMN     "intent_confidence" DECIMAL(65,30),
ADD COLUMN     "interrupted_by_turn" TEXT,
ADD COLUMN     "normalized_input" TEXT,
ADD COLUMN     "processing_time_ms" INTEGER,
ADD COLUMN     "raw_input" TEXT NOT NULL,
ADD COLUMN     "resolution_confidence" DECIMAL(65,30),
ADD COLUMN     "resolution_method" TEXT,
ADD COLUMN     "resolved_customer_id" TEXT,
ADD COLUMN     "response" TEXT,
ADD COLUMN     "response_time_ms" INTEGER,
ADD COLUMN     "response_type" TEXT,
ADD COLUMN     "session_id" TEXT NOT NULL,
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "turn_number" INTEGER NOT NULL,
ADD COLUMN     "turn_type" "TurnType" NOT NULL DEFAULT 'voice',
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD COLUMN     "was_interrupted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "customer_aliases" DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "source",
ADD COLUMN     "alias_type" "AliasType" NOT NULL,
ADD COLUMN     "confidence" DECIMAL(65,30) NOT NULL DEFAULT 0.5,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customer_id" TEXT NOT NULL,
ADD COLUMN     "last_used" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usage_count" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "address_line1" TEXT,
ADD COLUMN     "address_line2" TEXT,
ADD COLUMN     "alternate_phone" TEXT[],
ADD COLUMN     "area" TEXT,
ADD COLUMN     "average_basket_size" DECIMAL(65,30),
ADD COLUMN     "average_payment_days" INTEGER,
ADD COLUMN     "business_type" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "common_phrases" TEXT[],
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "credit_limit" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "district" TEXT,
ADD COLUMN     "first_visit" TIMESTAMP(3),
ADD COLUMN     "frequency_score" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "honorific" TEXT,
ADD COLUMN     "last_payment_amount" DECIMAL(65,30),
ADD COLUMN     "last_payment_date" TIMESTAMP(3),
ADD COLUMN     "last_visit" TIMESTAMP(3),
ADD COLUMN     "local_name" TEXT,
ADD COLUMN     "loyalty_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loyalty_tier" TEXT NOT NULL DEFAULT 'bronze',
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "monetary_score" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "overall_score" DECIMAL(65,30),
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "preferred_days" TEXT[],
ADD COLUMN     "preferred_payment_method" "PaymentMethod"[],
ADD COLUMN     "preferred_time_of_day" TIMESTAMP(3),
ADD COLUMN     "recency_score" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "total_payments" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "total_purchases" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by" TEXT,
ADD COLUMN     "visit_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "voice_fingerprint" TEXT,
DROP COLUMN "nickname",
ADD COLUMN     "nickname" TEXT[],
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "invoice_items" DROP COLUMN "createdAt",
DROP COLUMN "invoiceId",
DROP COLUMN "price",
DROP COLUMN "productId",
ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "cess" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "cgst" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "gst_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "hsn_code" TEXT,
ADD COLUMN     "igst" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "invoice_id" TEXT NOT NULL,
ADD COLUMN     "mrp" DECIMAL(65,30),
ADD COLUMN     "product_id" TEXT,
ADD COLUMN     "product_name" TEXT NOT NULL,
ADD COLUMN     "serial_numbers" TEXT[],
ADD COLUMN     "sgst" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "unit" TEXT NOT NULL,
ADD COLUMN     "unit_price" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "variant_attributes" JSONB,
ADD COLUMN     "variant_id" TEXT,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "updatedAt",
ADD COLUMN     "ack_date" TIMESTAMP(3),
ADD COLUMN     "ack_no" TEXT,
ADD COLUMN     "cess" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "cgst" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "discount_type" TEXT,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "eway_bill_generated_at" TIMESTAMP(3),
ADD COLUMN     "eway_bill_no" TEXT,
ADD COLUMN     "igst" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "invoice_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invoice_no" TEXT NOT NULL,
ADD COLUMN     "irn" TEXT,
ADD COLUMN     "irn_generated_at" TIMESTAMP(3),
ADD COLUMN     "paid_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_method" "PaymentMethod",
ADD COLUMN     "place_of_supply" TEXT,
ADD COLUMN     "qr_code" TEXT,
ADD COLUMN     "reverse_charge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sgst" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "total" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "products" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "attributes" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "base_unit" TEXT,
ADD COLUMN     "base_unit_quantity" DECIMAL(65,30),
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "cess" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "cost" DECIMAL(65,30),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "gst_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "has_variants" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hsn_code" TEXT,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "image_urls" TEXT[],
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_gst_exempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "max_stock" INTEGER,
ADD COLUMN     "min_stock" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "mrp" DECIMAL(65,30),
ADD COLUMN     "preferred_supplier" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "sub_category" TEXT,
ADD COLUMN     "supplier_id" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "track_batches" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "track_serial_numbers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by" TEXT,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "unit" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reminders" DROP COLUMN "amount",
DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "failedAt",
DROP COLUMN "message",
DROP COLUMN "retryCount",
DROP COLUMN "sendAt",
DROP COLUMN "sentAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "channels" "MessageChannel"[],
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "custom_message" TEXT,
ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "invoice_id" TEXT,
ADD COLUMN     "last_attempt" TIMESTAMP(3),
ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "max_retries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "message_template_id" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "parameters" JSONB,
ADD COLUMN     "priority" "ReminderPriority" NOT NULL DEFAULT 'normal',
ADD COLUMN     "product_id" TEXT,
ADD COLUMN     "read_at" TIMESTAMP(3),
ADD COLUMN     "recurring_pattern" JSONB,
ADD COLUMN     "reminder_type" "ReminderType" NOT NULL,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduled_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "session_active_context" DROP CONSTRAINT "session_active_context_pkey",
DROP COLUMN "activeCustomerId",
DROP COLUMN "id",
DROP COLUMN "pendingIntent",
DROP COLUMN "recentCustomers",
DROP COLUMN "sessionId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current_cart" JSONB NOT NULL DEFAULT '{"items":[],"total":0}',
ADD COLUMN     "current_stage" TEXT,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_intent" TEXT,
ADD COLUMN     "last_response" TEXT,
ADD COLUMN     "last_spoken" TEXT,
ADD COLUMN     "pending_items" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "session_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "session_active_context_pkey" PRIMARY KEY ("session_id");

-- AlterTable
ALTER TABLE "stock_movements" DROP COLUMN "createdAt",
DROP COLUMN "delta",
DROP COLUMN "productId",
DROP COLUMN "reason",
DROP COLUMN "reference",
ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "new_stock" INTEGER NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "previous_stock" INTEGER NOT NULL,
ADD COLUMN     "product_id" TEXT NOT NULL,
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "reference_id" TEXT,
ADD COLUMN     "reference_type" TEXT,
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "type" "StockMovementType" NOT NULL,
ADD COLUMN     "variant_id" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "failedAttempts",
DROP COLUMN "isActive",
DROP COLUMN "lockedUntil",
DROP COLUMN "pinHash",
DROP COLUMN "updatedAt",
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_ip" TEXT,
ADD COLUMN     "last_login" TIMESTAMP(3),
ADD COLUMN     "max_concurrent" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "permissions" TEXT[],
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{"language":"hi","notifications":true}',
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'staff',
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- DropTable
DROP TABLE "conversation_recordings";

-- DropTable
DROP TABLE "ledger_entries";

-- DropTable
DROP TABLE "whatsapp_messages";

-- DropEnum
DROP TYPE "LedgerType";

-- DropEnum
DROP TYPE "WhatsAppStatus";

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business_type" "BusinessType" NOT NULL DEFAULT 'kirana',
    "subdomain" TEXT,
    "custom_domain" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "language" TEXT NOT NULL DEFAULT 'hi',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "plan" "TenantPlan" NOT NULL DEFAULT 'free',
    "status" "TenantStatus" NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMP(3),
    "subscription_ends_at" TIMESTAMP(3),
    "gstin" TEXT,
    "legal_name" TEXT,
    "trade_name" TEXT,
    "state" TEXT,
    "gst_registered" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB NOT NULL DEFAULT '{"inventory":true,"customer_credit":true,"batch_tracking":false,"variants":false,"loyalty":false,"reports":true,"whatsapp":true,"email":false,"sms":false,"advanced_reminders":true,"voice_recording":false,"customer_documents":false,"multi_conversation":true,"conversation_queue":true,"gst_enabled":false,"gst_filing":false}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_info" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_relationships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "related_customer_id" TEXT NOT NULL,
    "relationship_type" "RelationshipType" NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL DEFAULT 0.5,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_communication_prefs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_number" TEXT,
    "whatsapp_opt_in_time" TIMESTAMP(3),
    "whatsapp_opt_in_ip" TEXT,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_address" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_number" TEXT,
    "preferred_language" TEXT NOT NULL DEFAULT 'hi',
    "preferred_time" TIMESTAMP(3),
    "quiet_hours" JSONB NOT NULL DEFAULT '{"start":"21:00","end":"09:00"}',
    "max_per_week" INTEGER NOT NULL DEFAULT 3,
    "max_per_month" INTEGER NOT NULL DEFAULT 10,
    "messages_sent_this_week" INTEGER NOT NULL DEFAULT 0,
    "messages_sent_this_month" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" TIMESTAMP(3),
    "consent_source" TEXT,
    "consent_ip" TEXT,
    "opted_out" BOOLEAN NOT NULL DEFAULT false,
    "opted_out_at" TIMESTAMP(3),
    "opt_out_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_communication_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "attributes" JSONB NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "mrp" DECIMAL(65,30),
    "cost" DECIMAL(65,30),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "batch_no" TEXT NOT NULL,
    "manufacturing_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "initial_quantity" INTEGER NOT NULL,
    "purchase_price" DECIMAL(65,30),
    "purchase_date" TIMESTAMP(3),
    "supplier_id" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serial_numbers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "batch_id" TEXT,
    "serial_no" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_stock',
    "sold_to" TEXT,
    "sold_at" TIMESTAMP(3),
    "invoice_id" TEXT,
    "warranty_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT,
    "phone" TEXT,
    "alternate_phone" TEXT[],
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "payment_terms" TEXT,
    "credit_limit" DECIMAL(65,30),
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "po_no" TEXT NOT NULL,
    "supplier_id" TEXT,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_date" TIMESTAMP(3),
    "received_date" TIMESTAMP(3),
    "subtotal" DECIMAL(65,30) NOT NULL,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "batch_no" TEXT,
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_no" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'completed',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_code" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'hi',
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "required_variables" TEXT[],
    "sample_data" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "template_id" TEXT,
    "language" TEXT NOT NULL,
    "category" TEXT DEFAULT 'transactional',
    "header" JSONB,
    "body" JSONB NOT NULL,
    "footer" JSONB,
    "buttons" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "text_content" TEXT,
    "header_image" TEXT,
    "footer_text" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#6366F1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "dlt_template_id" TEXT,
    "dlt_entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "recipient_type" TEXT NOT NULL,
    "recipient_ids" TEXT[],
    "recipient_query" TEXT,
    "template_id" TEXT,
    "subject" TEXT,
    "content" TEXT,
    "parameters" JSONB,
    "schedule_type" TEXT,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "channels" "MessageChannel"[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_sent" TIMESTAMP(3),
    "next_send" TIMESTAMP(3),
    "total_recipients" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reminder_id" TEXT,
    "scheduled_id" TEXT,
    "customer_id" TEXT,
    "channel" "MessageChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "template_code" TEXT,
    "message_content" TEXT,
    "status" "MessageStatus" NOT NULL,
    "provider" TEXT,
    "provider_message_id" TEXT,
    "provider_response" JSONB,
    "queued_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_code" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "webhook_received" BOOLEAN NOT NULL DEFAULT false,
    "webhook_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_conversation_queues" (
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "current_session_id" TEXT,
    "queue_order" JSONB NOT NULL DEFAULT '[]',
    "waiting_count" INTEGER NOT NULL,
    "active_count" INTEGER NOT NULL DEFAULT 0,
    "avg_wait_time_ms" INTEGER,
    "avg_handling_time_ms" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_conversation_queues_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "customer_context_cache" (
    "customer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "context_summary" JSONB NOT NULL DEFAULT '{"preferences":{},"recent_items":[],"credit_status":{"balance":0,"limit":0,"overdue_days":0},"last_intent":null,"frequent_queries":[],"tags":[]}',
    "last_session_id" TEXT,
    "last_interaction" TIMESTAMP(3),
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "total_turns" INTEGER NOT NULL DEFAULT 0,
    "avg_turns_per_session" DECIMAL(65,30),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_context_cache_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "conversation_flows" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "flow_path" TEXT[],
    "current_stage" TEXT,
    "next_expected_input" TEXT,
    "branches_taken" JSONB,
    "decision_points" JSONB,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_recordings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_id" TEXT,
    "conversation_turn_id" TEXT,
    "recording_url" TEXT NOT NULL,
    "recording_format" TEXT NOT NULL DEFAULT 'audio/webm',
    "duration_seconds" INTEGER,
    "file_size_bytes" BIGINT,
    "transcript" TEXT,
    "transcript_confidence" DECIMAL(65,30),
    "detected_language" TEXT,
    "triggered_by" TEXT,
    "customer_id" TEXT,
    "intent_at_time" TEXT,
    "entities_at_time" JSONB,
    "bucket_name" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "etag" TEXT,
    "retention_days" INTEGER NOT NULL DEFAULT 365,
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_reminders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "return_type" TEXT NOT NULL,
    "return_period" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "filed_at" TIMESTAMP(3),
    "filed_by" TEXT,
    "total_sales" DECIMAL(65,30),
    "total_tax" DECIMAL(65,30),
    "total_itc" DECIMAL(65,30),
    "net_payable" DECIMAL(65,30),
    "acknowledgment_no" TEXT,
    "filed_via" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_audit" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "action_type" "GstActionType" NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "reason" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "gst_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_custom_domain_key" ON "tenants"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_gstin_key" ON "tenants"("gstin");

-- CreateIndex
CREATE INDEX "tenants_status_plan_idx" ON "tenants"("status", "plan");

-- CreateIndex
CREATE INDEX "tenants_created_at_idx" ON "tenants"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "session_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_refresh_token_idx" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "customer_relationships_customer_id_idx" ON "customer_relationships"("customer_id");

-- CreateIndex
CREATE INDEX "customer_relationships_related_customer_id_idx" ON "customer_relationships"("related_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_relationships_tenant_id_customer_id_related_custom_key" ON "customer_relationships"("tenant_id", "customer_id", "related_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_prefs_customer_key" ON "customer_communication_prefs"("customer_id");

-- CreateIndex
CREATE INDEX "customer_communication_prefs_opted_out_idx" ON "customer_communication_prefs"("opted_out");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenant_id_sku_key" ON "product_variants"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenant_id_barcode_key" ON "product_variants"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "product_batches_tenant_id_expiry_date_idx" ON "product_batches"("tenant_id", "expiry_date");

-- CreateIndex
CREATE INDEX "product_batches_product_id_idx" ON "product_batches"("product_id");

-- CreateIndex
CREATE INDEX "product_batches_status_idx" ON "product_batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "product_batches_tenant_id_product_id_batch_no_key" ON "product_batches"("tenant_id", "product_id", "batch_no");

-- CreateIndex
CREATE INDEX "serial_numbers_status_idx" ON "serial_numbers"("status");

-- CreateIndex
CREATE INDEX "serial_numbers_sold_to_idx" ON "serial_numbers"("sold_to");

-- CreateIndex
CREATE UNIQUE INDEX "serial_numbers_tenant_id_product_id_serial_no_key" ON "serial_numbers"("tenant_id", "product_id", "serial_no");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tenant_id_phone_key" ON "suppliers"("tenant_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_po_no_key" ON "purchase_orders"("po_no");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_status_idx" ON "purchase_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_order_date_idx" ON "purchase_orders"("order_date" DESC);

-- CreateIndex
CREATE INDEX "purchase_order_items_po_id_idx" ON "purchase_order_items"("po_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_number_key" ON "payments"("payment_no");

-- CreateIndex
CREATE INDEX "payments_tenant_id_customer_id_received_at_idx" ON "payments"("tenant_id", "customer_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_received_at_idx" ON "payments"("received_at");

-- CreateIndex
CREATE INDEX "message_templates_tenant_id_is_active_idx" ON "message_templates"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_tenant_id_template_code_channel_language_key" ON "message_templates"("tenant_id", "template_code", "channel", "language");

-- CreateIndex
CREATE INDEX "whatsapp_templates_status_idx" ON "whatsapp_templates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_tenant_id_template_name_language_key" ON "whatsapp_templates"("tenant_id", "template_name", "language");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_tenant_id_template_name_key" ON "email_templates"("tenant_id", "template_name");

-- CreateIndex
CREATE UNIQUE INDEX "sms_templates_tenant_id_template_name_key" ON "sms_templates"("tenant_id", "template_name");

-- CreateIndex
CREATE INDEX "scheduled_messages_status_scheduled_time_idx" ON "scheduled_messages"("status", "scheduled_time");

-- CreateIndex
CREATE INDEX "message_logs_tenant_id_status_created_at_idx" ON "message_logs"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "message_logs_tenant_id_customer_id_created_at_idx" ON "message_logs"("tenant_id", "customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "message_logs_provider_message_id_idx" ON "message_logs"("provider_message_id");

-- CreateIndex
CREATE INDEX "webhook_events_processed_idx" ON "webhook_events"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "user_conversation_queues_current_session_id_key" ON "user_conversation_queues"("current_session_id");

-- CreateIndex
CREATE INDEX "user_conversation_queues_tenant_id_idx" ON "user_conversation_queues"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_context_cache_last_session_id_key" ON "customer_context_cache"("last_session_id");

-- CreateIndex
CREATE INDEX "customer_context_cache_last_interaction_idx" ON "customer_context_cache"("last_interaction" DESC);

-- CreateIndex
CREATE INDEX "customer_context_cache_tenant_id_idx" ON "customer_context_cache"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_flow_session_key" ON "conversation_flows"("session_id");

-- CreateIndex
CREATE INDEX "conversation_flows_is_complete_completed_at_idx" ON "conversation_flows"("is_complete", "completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "voice_recording_object_key" ON "voice_recordings"("object_key");

-- CreateIndex
CREATE INDEX "voice_recordings_session_id_idx" ON "voice_recordings"("session_id");

-- CreateIndex
CREATE INDEX "voice_recordings_customer_id_created_at_idx" ON "voice_recordings"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "voice_recordings_expires_at_idx" ON "voice_recordings"("expires_at");

-- CreateIndex
CREATE INDEX "gst_reminders_due_date_status_idx" ON "gst_reminders"("due_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "gst_reminders_tenant_id_return_type_return_period_key" ON "gst_reminders"("tenant_id", "return_type", "return_period");

-- CreateIndex
CREATE INDEX "gst_audit_tenant_id_created_at_idx" ON "gst_audit"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_tenant_id_created_at_idx" ON "activity_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_logs_is_gst_relevant_created_at_idx" ON "activity_logs"("is_gst_relevant", "created_at" DESC);

-- CreateIndex
CREATE INDEX "conversation_sessions_user_id_last_activity_idx" ON "conversation_sessions"("user_id", "last_activity" DESC);

-- CreateIndex
CREATE INDEX "conversation_sessions_user_id_queue_position_idx" ON "conversation_sessions"("user_id", "queue_position");

-- CreateIndex
CREATE INDEX "conversation_sessions_customer_id_idx" ON "conversation_sessions"("customer_id");

-- CreateIndex
CREATE INDEX "conversation_sessions_tenant_id_created_at_idx" ON "conversation_sessions"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "conversation_turns_session_id_idx" ON "conversation_turns"("session_id");

-- CreateIndex
CREATE INDEX "conversation_turns_resolved_customer_id_created_at_idx" ON "conversation_turns"("resolved_customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "conversation_turns_user_id_created_at_idx" ON "conversation_turns"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "conversation_turns_tenant_id_created_at_idx" ON "conversation_turns"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_turns_session_id_turn_number_key" ON "conversation_turns"("session_id", "turn_number");

-- CreateIndex
CREATE INDEX "customer_aliases_customer_id_confidence_idx" ON "customer_aliases"("customer_id", "confidence" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "customer_aliases_tenant_id_customer_id_alias_key" ON "customer_aliases"("tenant_id", "customer_id", "alias");

-- CreateIndex
CREATE INDEX "customers_tenant_id_balance_idx" ON "customers"("tenant_id", "balance");

-- CreateIndex
CREATE INDEX "customers_tenant_id_overall_score_idx" ON "customers"("tenant_id", "overall_score" DESC);

-- CreateIndex
CREATE INDEX "customers_tenant_id_last_visit_idx" ON "customers"("tenant_id", "last_visit" DESC);

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_phone_key" ON "customers"("tenant_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_gstin_key" ON "customers"("tenant_id", "gstin");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_pan_key" ON "customers"("tenant_id", "pan");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_product_id_idx" ON "invoice_items"("product_id");

-- CreateIndex
CREATE INDEX "invoice_items_hsn_code_idx" ON "invoice_items"("hsn_code");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_number_key" ON "invoices"("invoice_no");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_irn_key" ON "invoices"("irn");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_invoice_date_idx" ON "invoices"("tenant_id", "invoice_date" DESC);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_customer_id_idx" ON "invoices"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_idx" ON "invoices"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "products_tenant_id_is_active_idx" ON "products"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "products_tenant_id_category_idx" ON "products"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "products_tenant_id_stock_idx" ON "products"("tenant_id", "stock");

-- CreateIndex
CREATE INDEX "products_tenant_id_hsn_code_idx" ON "products"("tenant_id", "hsn_code");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_barcode_key" ON "products"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "reminders_tenant_id_scheduled_time_status_idx" ON "reminders"("tenant_id", "scheduled_time", "status");

-- CreateIndex
CREATE INDEX "reminders_tenant_id_customer_id_status_idx" ON "reminders"("tenant_id", "customer_id", "status");

-- CreateIndex
CREATE INDEX "reminders_status_scheduled_time_idx" ON "reminders"("status", "scheduled_time");

-- CreateIndex
CREATE INDEX "session_active_context_expires_at_idx" ON "session_active_context"("expires_at");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_created_at_idx" ON "stock_movements"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_batch_id_idx" ON "stock_movements"("batch_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_is_active_idx" ON "users"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_phone_key" ON "users"("tenant_id", "phone");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_aliases" ADD CONSTRAINT "customer_aliases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_relationships" ADD CONSTRAINT "customer_relationships_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_relationships" ADD CONSTRAINT "customer_relationships_related_customer_id_fkey" FOREIGN KEY ("related_customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_communication_prefs" ADD CONSTRAINT "customer_communication_prefs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_sold_to_fkey" FOREIGN KEY ("sold_to") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_message_template_id_fkey" FOREIGN KEY ("message_template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_active_context" ADD CONSTRAINT "session_active_context_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_turns" ADD CONSTRAINT "conversation_turns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_turns" ADD CONSTRAINT "conversation_turns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_turns" ADD CONSTRAINT "conversation_turns_resolved_customer_id_fkey" FOREIGN KEY ("resolved_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_conversation_queues" ADD CONSTRAINT "user_conversation_queues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_conversation_queues" ADD CONSTRAINT "user_conversation_queues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_conversation_queues" ADD CONSTRAINT "user_conversation_queues_current_session_id_fkey" FOREIGN KEY ("current_session_id") REFERENCES "conversation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_context_cache" ADD CONSTRAINT "customer_context_cache_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_context_cache" ADD CONSTRAINT "customer_context_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_context_cache" ADD CONSTRAINT "customer_context_cache_last_session_id_fkey" FOREIGN KEY ("last_session_id") REFERENCES "conversation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_flows" ADD CONSTRAINT "conversation_flows_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_flows" ADD CONSTRAINT "conversation_flows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_conversation_turn_id_fkey" FOREIGN KEY ("conversation_turn_id") REFERENCES "conversation_turns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_reminders" ADD CONSTRAINT "gst_reminders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_reminders" ADD CONSTRAINT "gst_reminders_filed_by_fkey" FOREIGN KEY ("filed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_audit" ADD CONSTRAINT "gst_audit_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_audit" ADD CONSTRAINT "gst_audit_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_audit" ADD CONSTRAINT "gst_audit_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
