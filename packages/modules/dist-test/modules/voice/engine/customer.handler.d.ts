import type { ExecutionResult } from '@execora/types';
export declare function executeTotalPendingAmount(): Promise<ExecutionResult>;
export declare function executeListCustomerBalances(): Promise<ExecutionResult>;
export declare function executeCheckBalance(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
export declare function executeCreateCustomer(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
export declare function executeUpdateCustomer(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
export declare function executeGetCustomerInfo(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
export declare function executeDeleteCustomerData(entities: Record<string, any>, conversationId?: string): Promise<ExecutionResult>;
//# sourceMappingURL=customer.handler.d.ts.map