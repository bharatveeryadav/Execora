import { type IntentExtraction, type ExecutionResult } from '@execora/types';
declare class BusinessEngine {
    execute(intent: IntentExtraction, conversationId?: string): Promise<ExecutionResult>;
}
export declare const businessEngine: BusinessEngine;
export {};
//# sourceMappingURL=index.d.ts.map