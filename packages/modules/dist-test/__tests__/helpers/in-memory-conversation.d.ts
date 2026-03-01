/**
 * In-memory ConversationMemoryService for unit testing.
 * Same public API as the real Redis-backed service, but uses plain Maps.
 * Import this in conversation.test.ts instead of the production service.
 */
export interface MatchResult {
    score: number;
    matched: string;
    matchType: 'exact' | 'phonetic' | 'nickname' | 'fuzzy' | 'transliteration';
}
interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    intent?: string;
    entities?: Record<string, any>;
}
interface CustomerContext {
    id: string;
    name: string;
    lastMentioned: string;
    mentionCount: number;
    latestBalance?: number;
    latestAmount?: number;
    latestIntent?: string;
}
declare class InMemoryConversationMemoryService {
    private store;
    private get;
    private findExisting;
    private trackMention;
    private updateContextInData;
    addUserMessage(conversationId: string, message: string, intent?: string, entities?: Record<string, any>): Promise<void>;
    addAssistantMessage(conversationId: string, message: string): Promise<void>;
    getConversationHistory(conversationId: string, limit?: number): Promise<ConversationMessage[]>;
    setActiveCustomer(conversationId: string, customerId: string, customerName: string): Promise<void>;
    getActiveCustomer(conversationId: string): Promise<{
        id: string;
        name: string;
    } | undefined>;
    getAllCustomersInContext(conversationId: string): Promise<CustomerContext[]>;
    switchToPreviousCustomer(conversationId: string): Promise<{
        id: string;
        name: string;
    } | null>;
    switchToCustomerByName(conversationId: string, customerName: string): Promise<{
        id: string;
        name: string;
    } | null>;
    findMatchingCustomers(conversationId: string, customerName: string, threshold?: number): Promise<{
        customer: CustomerContext;
        score: number;
        matched: string;
        matchType: "exact" | "phonetic" | "nickname" | "fuzzy" | "transliteration";
    }[]>;
    updateCustomerContext(conversationId: string, customerName: string, updates: {
        balance?: number;
        amount?: number;
        intent?: string;
    }): Promise<void>;
    getContextSummary(conversationId: string): Promise<string>;
    getFormattedContext(conversationId: string, limit?: number): Promise<string>;
    clearMemory(conversationId: string): Promise<void>;
    setContext(conversationId: string, key: string, value: any): Promise<void>;
    getContext(conversationId: string, key: string): Promise<any>;
    getFullContext(conversationId: string): Promise<Record<string, any>>;
    getTurnCount(conversationId: string): Promise<number>;
    getStats(): Promise<{
        activeConversations: number;
    }>;
}
export declare const conversationMemory: InMemoryConversationMemoryService;
export {};
//# sourceMappingURL=in-memory-conversation.d.ts.map