"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOcrJob = createOcrJob;
exports.retryOcrJob = retryOcrJob;
exports.getOcrJob = getOcrJob;
exports.listOcrJobs = listOcrJobs;
const core_1 = require("@execora/core");
// ── Commands ──────────────────────────────────────────────────────────────────
async function createOcrJob(tenantId, input) {
    const job = await core_1.prisma.ocrJob.create({
        data: {
            tenantId,
            jobType: input.jobType,
            imageKey: input.imageKey,
            imageMimeType: input.imageMimeType ?? "image/jpeg",
            status: "pending",
        },
    });
    core_1.logger.info({ jobId: job.id, jobType: job.jobType }, "ocr_job_created");
    return job;
}
async function retryOcrJob(tenantId, id) {
    const job = await core_1.prisma.ocrJob.findFirst({ where: { id, tenantId } });
    if (!job)
        throw new Error(`OCR job ${id} not found`);
    if (job.status !== "failed")
        throw new Error(`Only failed jobs can be retried (current: ${job.status})`);
    const updated = await core_1.prisma.ocrJob.update({
        where: { id },
        data: {
            status: "pending",
            retryCount: { increment: 1 },
            errorMessage: null,
        },
    });
    core_1.logger.info({ jobId: id, retryCount: updated.retryCount }, "ocr_job_retry_queued");
    return updated;
}
// ── Queries ───────────────────────────────────────────────────────────────────
async function getOcrJob(tenantId, id) {
    return core_1.prisma.ocrJob.findFirst({
        where: { id, tenantId },
    });
}
async function listOcrJobs(tenantId, status, limit = 50) {
    return core_1.prisma.ocrJob.findMany({
        where: { tenantId, ...(status ? { status } : {}) },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 200),
    });
}
//# sourceMappingURL=ocr.service.js.map