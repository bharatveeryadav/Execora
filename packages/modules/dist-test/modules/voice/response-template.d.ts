import { ExecutionResult } from '@execora/types';
/**
 * Ultra-fast response templates for Indian SME voice format
 * Reduces latency by 60-80% vs LLM generation
 * Millisecond-level response for real-time feel
 */
declare class ResponseTemplateService {
    /**
     * Generate response from template (no LLM call)
     * ~2ms latency vs 800-1200ms for LLM
     */
    generateFastResponse(intent: string, result: ExecutionResult): string | null;
    /**
     * Get error response (generic + cached)
     */
    private getErrorResponse;
    /**
     * Check if response can be templated (no LLM needed)
     */
    canUseTemplate(intent: string): boolean;
    /**
     * Estimate savings vs LLM call
     */
    estimateSavings(): object;
}
export declare const responseTemplateService: ResponseTemplateService;
export {};
//# sourceMappingURL=response-template.d.ts.map