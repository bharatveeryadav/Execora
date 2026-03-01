import type { ExecutionResult } from '@execora/types';
/**
 * Creates a draft invoice (preview only — no DB write).
 * Stores the draft in Redis and waits for user confirmation via CONFIRM_INVOICE.
 */
export declare function executeCreateInvoice(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
export declare function executeConfirmInvoice(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
export declare function executeCancelInvoice(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
export declare function executeShowPendingInvoice(_entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
export declare function executeToggleGst(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
export declare function executeProvideEmail(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
//# sourceMappingURL=invoice.handler.d.ts.map