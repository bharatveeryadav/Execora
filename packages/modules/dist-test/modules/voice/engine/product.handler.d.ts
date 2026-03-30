import type { ExecutionResult } from "@execora/types";
/**
 * Handle inbound stock receipt voiced as:
 *   "50 kilo aata aaya", "100 Maggi stock mein add karo", "cheeni 2 bori aayi"
 *
 * entities:
 *   product  {string}  — product name (Roman/English, from LLM)
 *   quantity {number}  — how many units/kg/pcs arrived
 *   unit     {string?} — kg, pcs, litre, bori, dozen, etc. (informational only)
 */
export declare function executeUpdateStock(entities: Record<string, any>): Promise<ExecutionResult>;
//# sourceMappingURL=product.handler.d.ts.map