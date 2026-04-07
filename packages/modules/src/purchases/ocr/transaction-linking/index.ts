/**
 * purchases/ocr/transaction-linking
 *
 * Feature: link a reviewed OCR extraction to a purchase bill / order.
 * Stub (⏳).
 */
export interface OcrTransactionLinkInput {
  extractionId: string;
  tenantId: string;
  targetType: "purchase-bill" | "purchase-order" | "expense";
  targetId: string;
}
export interface OcrTransactionLinkResult {
  extractionId: string;
  targetId: string;
  targetType: string;
  linkedAt: Date;
}
export async function linkOcrToTransaction(
  input: OcrTransactionLinkInput
): Promise<OcrTransactionLinkResult> {
  return { ...input, linkedAt: new Date() };
}
