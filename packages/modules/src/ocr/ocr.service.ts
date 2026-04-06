/**
 * OCR Service — lifecycle management for OcrJob records.
 *
 * Actual image processing (OpenAI Vision → JSON extraction) is handled by the
 * BullMQ OCR worker in packages/infrastructure. This service provides:
 *  - createOcrJob   — enqueue a new scan request
 *  - getOcrJob      — fetch a single job (tenant-scoped IDOR guard)
 *  - listOcrJobs    — list all jobs for a tenant (optionally filtered by status)
 *  - retryOcrJob    — reset a failed job back to pending
 *
 * Job types:
 *  "purchase_bill"    — scan a supplier bill → auto-create Purchase Order
 *  "product_catalog"  — scan a product photo → seed item catalog
 */

import { prisma, logger } from "@execora/core";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OcrJobType = "purchase_bill" | "product_catalog";
export type OcrJobStatus = "pending" | "processing" | "completed" | "failed";

export interface OcrJobRecord {
  id: string;
  tenantId: string;
  jobType: OcrJobType;
  status: OcrJobStatus;
  imageKey: string;
  imageMimeType: string;
  rawResult: unknown | null;
  parsedItems: unknown | null;
  purchaseOrderId: string | null;
  productsCreated: number;
  errorMessage: string | null;
  retryCount: number;
  processedAt: Date | null;
  createdAt: Date;
}

export interface CreateOcrJobInput {
  jobType: OcrJobType;
  /** MinIO object key of the uploaded image */
  imageKey: string;
  imageMimeType?: string;
}

// ── Commands ──────────────────────────────────────────────────────────────────

export async function createOcrJob(
  tenantId: string,
  input: CreateOcrJobInput,
): Promise<OcrJobRecord> {
  const job = await prisma.ocrJob.create({
    data: {
      tenantId,
      jobType: input.jobType,
      imageKey: input.imageKey,
      imageMimeType: input.imageMimeType ?? "image/jpeg",
      status: "pending",
    },
  });
  logger.info({ jobId: job.id, jobType: job.jobType }, "ocr_job_created");
  return job as OcrJobRecord;
}

export async function retryOcrJob(
  tenantId: string,
  id: string,
): Promise<OcrJobRecord> {
  const job = await prisma.ocrJob.findFirst({ where: { id, tenantId } });
  if (!job) throw new Error(`OCR job ${id} not found`);
  if (job.status !== "failed")
    throw new Error(`Only failed jobs can be retried (current: ${job.status})`);

  const updated = await prisma.ocrJob.update({
    where: { id },
    data: {
      status: "pending",
      retryCount: { increment: 1 },
      errorMessage: null,
    },
  });
  logger.info(
    { jobId: id, retryCount: updated.retryCount },
    "ocr_job_retry_queued",
  );
  return updated as OcrJobRecord;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getOcrJob(
  tenantId: string,
  id: string,
): Promise<OcrJobRecord | null> {
  return prisma.ocrJob.findFirst({
    where: { id, tenantId },
  }) as Promise<OcrJobRecord | null>;
}

export async function listOcrJobs(
  tenantId: string,
  status?: OcrJobStatus,
  limit = 50,
): Promise<OcrJobRecord[]> {
  return prisma.ocrJob.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  }) as Promise<OcrJobRecord[]>;
}
