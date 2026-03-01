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
declare class ConversationMemoryService {
    private load;
    private save;
    private findExistingCustomer;
    private trackCustomerMention;
    /**
     * Add user message and auto-track any customer entities.
     */
    addUserMessage(conversationId: string, message: string, intent?: string, entities?: Record<string, any>): Promise<void>;
    /**
     * Add assistant response to conversation history.
     */
    addAssistantMessage(conversationId: string, message: string): Promise<void>;
    /**
     * Return last N messages for display/inspection.
     */
    getConversationHistory(conversationId: string, limit?: number): Promise<ConversationMessage[]>;
    /**
     * Return formatted conversation context string to inject into LLM prompt.
     */
    getFormattedContext(conversationId: string, limit?: number): Promise<string>;
    /**
     * Set active customer (selected for this conversation turn).
     */
    setActiveCustomer(conversationId: string, customerId: string, customerName: string): Promise<void>;
    /**
     * Get currently active customer in conversation.
     */
    getActiveCustomer(conversationId: string): Promise<{
        id: string;
        name: string;
    } | undefined>;
    /**
     * Switch to the second-most-recently discussed customer.
     */
    switchToPreviousCustomer(conversationId: string): Promise<{
        id: string;
        name: string;
    } | null>;
    /**
     * Get all customers discussed, most-recent first.
     */
    getAllCustomersInContext(conversationId: string): Promise<CustomerContext[]>;
    /**
     * Switch to a specific customer by name (fuzzy matched).
     */
    switchToCustomerByName(conversationId: string, customerName: string): Promise<{
        id: string;
        name: string;
    } | null>;
    /**
     * Find all conversation customers matching a name with scores.
     */
    findMatchingCustomers(conversationId: string, customerName: string, threshold?: number): Promise<{
        customer: CustomerContext;
        score: number;
        matched: string;
        matchType: "exact" | "phonetic" | "nickname" | "fuzzy" | "transliteration";
    }[]>;
    /**
     * Update customer context with latest balance/amount.
     */
    updateCustomerContext(conversationId: string, customerName: string, updates: {
        balance?: number;
        amount?: number;
        intent?: string;
    }): Promise<void>;
    private updateCustomerContextInData;
    /**
     * Returns a summary string of recent customers + any pending invoice for LLM injection.
     * Injecting a pending invoice here ensures that "haan / confirm" on the NEXT turn
     * is classified as CONFIRM_INVOICE even after a WebSocket reconnect.
     */
    getContextSummary(conversationId: string): Promise<string>;
    /** Set a custom context key-value pair. */
    setContext(conversationId: string, key: string, value: any): Promise<void>;
    /** Get a custom context value by key. */
    getContext(conversationId: string, key: string): Promise<any>;
    /** Get full context object. */
    getFullContext(conversationId: string): Promise<Record<string, any>>;
    /** Get total turn count for this conversation. */
    getTurnCount(conversationId: string): Promise<number>;
    /** Delete all Redis state for this conversation. */
    clearMemory(conversationId: string): Promise<void>;
    /** Stats — how many live conversation keys exist in Redis. */
    getStats(): Promise<{
        activeConversations: number;
    }>;
    /** Load the full draft list from Redis (internal helper). */
    private _loadDrafts;
    /** Save the full draft list to Redis (internal helper). */
    private _saveDrafts;
    /**
     * Add a new pending invoice draft to the shop-level list.
     * Returns the generated draftId so the engine can attach it to session context.
     */
    addShopPendingInvoice(draft: any): Promise<string>;
    /**
     * Update an existing draft in the list (e.g. after GST toggle).
     * If draftId is not found, the draft is appended.
     */
    updateShopPendingInvoice(draftId: string, updated: any): Promise<void>;
    /**
     * Remove a specific draft from the list by draftId.
     */
    removeShopPendingInvoice(draftId: string): Promise<void>;
    /**
     * Return all pending invoice drafts (most recently created last).
     */
    getShopPendingInvoices(): Promise<any[]>;
    /**
     * Return the first (oldest) pending invoice draft, or null.
     * Kept for backward-compat with engine code that expects a single draft.
     */
    getShopPendingInvoice(): Promise<any | null>;
    /**
     * Clear ALL pending invoice drafts (pass null to match old API).
     */
    setShopPendingInvoice(_draft: null): Promise<void>;
    setShopPendingEmail(data: any | null): Promise<void>;
    getShopPendingEmail(): Promise<any | null>;
    setShopPendingSendConfirm(data: any | null): Promise<void>;
    getShopPendingSendConfirm(): Promise<any | null>;
}
export declare const conversationMemory: ConversationMemoryService;
export {};
//# sourceMappingURL=conversation.d.ts.map