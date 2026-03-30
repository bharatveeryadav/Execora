import { CustomerSearchResult } from '@execora/types';
import { Decimal } from '@prisma/client/runtime/library';
interface CustomerUpdateData {
    name?: string;
    phone?: string;
    email?: string;
    nickname?: string;
    landmark?: string;
    notes?: string;
    balance?: number;
}
interface SimilarCustomer {
    customer: CustomerSearchResult;
    similarity: number;
}
interface CreateCustomerFastResult {
    success: boolean;
    duplicateFound?: boolean;
    customer?: {
        id: string;
        name: string;
        balance: number;
    };
    message: string;
    suggestions?: Array<{
        id: string;
        name: string;
        phone?: string | null;
        landmark?: string | null;
        similarity: number;
    }>;
}
declare class CustomerService {
    /**
     * Get total pending amount (sum of all customer balances > 0)
     */
    getTotalPendingAmount(): Promise<number>;
    /**
     * Get all customers with non-zero (pending) balance
     */
    getAllCustomersWithPendingBalance(): Promise<Array<{
        id: string;
        name: string;
        balance: number;
        landmark?: string;
        phone?: string;
    }>>;
    /**
     * List all customers sorted by balance descending (used for the customers page browse/list view).
     * Unlike searchCustomer, this never filters by score — it just pages through all records.
     */
    listAllCustomers(limit?: number): Promise<CustomerSearchResult[]>;
    private conversationCache;
    private balanceCache;
    private cacheTimeout;
    private balanceCacheTimeout;
    private cleanupInterval;
    /**
     * Constructor - Initialize cleanup interval
     */
    constructor();
    /**
     * Clean cache entries that have expired
     */
    private cleanupExpiredCache;
    /**
     * Get or create conversation context
     */
    private getContext;
    /**
     * Set active customer for a conversation (focus memory)
     */
    setActiveCustomer(conversationId: string, customerId: string): void;
    /**
     * Get active customer for a conversation
     */
    getActiveCustomer(conversationId: string): Promise<CustomerSearchResult | null>;
    /**
     * Load a customer by ID and register them as active in the conversation cache.
     * Used by resolveCustomer to restore active customer from Redis after a restart.
     */
    getActiveCustomerById(customerId: string, conversationId: string): Promise<CustomerSearchResult | null>;
    /**
     * Invalidate (clear) conversation cache to force fresh data fetch on next search
     */
    invalidateConversationCache(conversationId: string): void;
    /**
     * Check if cache is still valid
     */
    private isCacheValid;
    /**
     * Normalize query and extract meaningful tokens for multi-word search
     */
    private parseQuery;
    /**
     * Search customer with conversation context (Fast!)
     */
    searchCustomerWithContext(query: string, conversationId: string): Promise<CustomerSearchResult[]>;
    /**
     * Get multiple customers in batch (Real-time optimized)
     */
    getMultipleCustomersWithContext(customerIds: string[], conversationId: string): Promise<(({
        invoices: {
            tenantId: string;
            id: string;
            tags: string[];
            notes: string | null;
            createdBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            invoiceNo: string;
            customerId: string | null;
            subtotal: Decimal;
            discount: Decimal;
            discountType: string | null;
            total: Decimal;
            paidAmount: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            placeOfSupply: string | null;
            buyerGstin: string | null;
            recipientAddress: string | null;
            reverseCharge: boolean;
            ewayBillNo: string | null;
            ewayBillGeneratedAt: Date | null;
            irn: string | null;
            irnGeneratedAt: Date | null;
            ackNo: string | null;
            ackDate: Date | null;
            qrCode: string | null;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
            invoiceDate: Date;
            dueDate: Date | null;
            paidAt: Date | null;
            pdfObjectKey: string | null;
            pdfUrl: string | null;
        }[];
        reminders: {
            tenantId: string;
            id: string;
            notes: string | null;
            createdBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.ReminderStatus;
            scheduledTime: Date;
            customerId: string | null;
            invoiceId: string | null;
            productId: string | null;
            userId: string | null;
            reminderType: import(".prisma/client").$Enums.ReminderType;
            priority: import(".prisma/client").$Enums.ReminderPriority;
            recurringPattern: import("@prisma/client/runtime/library").JsonValue | null;
            expiresAt: Date | null;
            messageTemplateId: string | null;
            customMessage: string | null;
            parameters: import("@prisma/client/runtime/library").JsonValue | null;
            channels: import(".prisma/client").$Enums.MessageChannel[];
            sentAt: Date | null;
            deliveredAt: Date | null;
            readAt: Date | null;
            retryCount: number;
            maxRetries: number;
            lastAttempt: Date | null;
            lastError: string | null;
        }[];
    } & {
        tenantId: string;
        balance: Decimal;
        creditLimit: Decimal;
        totalPurchases: Decimal;
        totalPayments: Decimal;
        lastPaymentAmount: Decimal | null;
        averagePaymentDays: number | null;
        loyaltyPoints: number;
        visitCount: number;
        averageBasketSize: Decimal | null;
        frequencyScore: Decimal;
        recencyScore: Decimal;
        monetaryScore: Decimal;
        overallScore: Decimal | null;
        id: string;
        name: string;
        phone: string | null;
        alternatePhone: string[];
        email: string | null;
        honorific: string | null;
        localName: string | null;
        nickname: string[];
        addressLine1: string | null;
        addressLine2: string | null;
        landmark: string | null;
        area: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        gstin: string | null;
        pan: string | null;
        businessType: string | null;
        lastPaymentDate: Date | null;
        loyaltyTier: string;
        firstVisit: Date | null;
        lastVisit: Date | null;
        preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
        preferredTimeOfDay: Date | null;
        preferredDays: string[];
        tags: string[];
        notes: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        voiceFingerprint: string | null;
        commonPhrases: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }) | null)[]>;
    /**
     * Stream real-time balance updates (WebSocket)
     */
    streamCustomerBalance(customerId: string, conversationId: string, onUpdate: (data: {
        balance: number;
        updatedAt: string;
    }) => void): Promise<() => void>;
    /**
     * Prefetch customer data and related records
     */
    prefetchConversationContext(conversationId: string, latestCustomerId?: string): Promise<void>;
    /**
     * Calculate similarity between two strings (Levenshtein distance)
     */
    private calculateSimilarity;
    /**
     * Calculate Levenshtein distance between two strings
     */
    private getLevenshteinDistance;
    /**
     * Find similar customers (for duplicate detection and suggestions)
     */
    findSimilarCustomers(name: string, conversationId: string, threshold?: number): Promise<SimilarCustomer[]>;
    /**
     * Create customer with minimal info (name only, everything else optional for instant feedback)
     */
    createCustomerFast(name: string, conversationId: string): Promise<CreateCustomerFastResult>;
    /**
     * Instant update customer fields (one or multiple)
     */
    updateCustomerInstant(customerId: string, updates: CustomerUpdateData, conversationId: string): Promise<{
        success: boolean;
        customer: {
            tenantId: string;
            balance: Decimal;
            creditLimit: Decimal;
            totalPurchases: Decimal;
            totalPayments: Decimal;
            lastPaymentAmount: Decimal | null;
            averagePaymentDays: number | null;
            loyaltyPoints: number;
            visitCount: number;
            averageBasketSize: Decimal | null;
            frequencyScore: Decimal;
            recencyScore: Decimal;
            monetaryScore: Decimal;
            overallScore: Decimal | null;
            id: string;
            name: string;
            phone: string | null;
            alternatePhone: string[];
            email: string | null;
            honorific: string | null;
            localName: string | null;
            nickname: string[];
            addressLine1: string | null;
            addressLine2: string | null;
            landmark: string | null;
            area: string | null;
            city: string | null;
            district: string | null;
            state: string | null;
            pincode: string | null;
            gstin: string | null;
            pan: string | null;
            businessType: string | null;
            lastPaymentDate: Date | null;
            loyaltyTier: string;
            firstVisit: Date | null;
            lastVisit: Date | null;
            preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
            preferredTimeOfDay: Date | null;
            preferredDays: string[];
            tags: string[];
            notes: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            voiceFingerprint: string | null;
            commonPhrases: string[];
            createdBy: string | null;
            updatedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        };
        message: string;
    }>;
    /**
     * Update customer fields (simple API for business logic)
     */
    updateCustomer(customerId: string, updates: CustomerUpdateData): Promise<boolean>;
    /**
     * Invalidate the balance cache for a customer.
     * Call this immediately after any operation that mutates the customer's balance
     * (addCredit, recordPayment) so the next getBalanceFast reads fresh from DB.
     */
    invalidateBalanceCache(customerId: string): void;
    /**
     * Get balance with fast cache (30-second TTL for real-time)
     */
    getBalanceFast(customerId: string, conversationId?: string): Promise<number>;
    /**
     * Search with rank-based scoring system
     */
    searchCustomerRanked(query: string, conversationId: string): Promise<CustomerSearchResult[]>;
    /**
     * Advanced match score calculation (0-1)
     */
    private calculateMatchScore;
    /**
     * Multi-customer resolution (handle multiple customers with similar names)
     */
    resolveCustomerAmbiguity(query: string, conversationId: string): Promise<{
        exact?: CustomerSearchResult;
        candidates: SimilarCustomer[];
        needsConfirmation: boolean;
    }>;
    /**
     * Confirm customer selection and update context
     */
    confirmCustomerSelection(customerId: string, conversationId: string, updateFields?: CustomerUpdateData): Promise<{
        invoices: {
            tenantId: string;
            id: string;
            tags: string[];
            notes: string | null;
            createdBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            invoiceNo: string;
            customerId: string | null;
            subtotal: Decimal;
            discount: Decimal;
            discountType: string | null;
            total: Decimal;
            paidAmount: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            placeOfSupply: string | null;
            buyerGstin: string | null;
            recipientAddress: string | null;
            reverseCharge: boolean;
            ewayBillNo: string | null;
            ewayBillGeneratedAt: Date | null;
            irn: string | null;
            irnGeneratedAt: Date | null;
            ackNo: string | null;
            ackDate: Date | null;
            qrCode: string | null;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
            invoiceDate: Date;
            dueDate: Date | null;
            paidAt: Date | null;
            pdfObjectKey: string | null;
            pdfUrl: string | null;
        }[];
        reminders: {
            tenantId: string;
            id: string;
            notes: string | null;
            createdBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.ReminderStatus;
            scheduledTime: Date;
            customerId: string | null;
            invoiceId: string | null;
            productId: string | null;
            userId: string | null;
            reminderType: import(".prisma/client").$Enums.ReminderType;
            priority: import(".prisma/client").$Enums.ReminderPriority;
            recurringPattern: import("@prisma/client/runtime/library").JsonValue | null;
            expiresAt: Date | null;
            messageTemplateId: string | null;
            customMessage: string | null;
            parameters: import("@prisma/client/runtime/library").JsonValue | null;
            channels: import(".prisma/client").$Enums.MessageChannel[];
            sentAt: Date | null;
            deliveredAt: Date | null;
            readAt: Date | null;
            retryCount: number;
            maxRetries: number;
            lastAttempt: Date | null;
            lastError: string | null;
        }[];
    } & {
        tenantId: string;
        balance: Decimal;
        creditLimit: Decimal;
        totalPurchases: Decimal;
        totalPayments: Decimal;
        lastPaymentAmount: Decimal | null;
        averagePaymentDays: number | null;
        loyaltyPoints: number;
        visitCount: number;
        averageBasketSize: Decimal | null;
        frequencyScore: Decimal;
        recencyScore: Decimal;
        monetaryScore: Decimal;
        overallScore: Decimal | null;
        id: string;
        name: string;
        phone: string | null;
        alternatePhone: string[];
        email: string | null;
        honorific: string | null;
        localName: string | null;
        nickname: string[];
        addressLine1: string | null;
        addressLine2: string | null;
        landmark: string | null;
        area: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        gstin: string | null;
        pan: string | null;
        businessType: string | null;
        lastPaymentDate: Date | null;
        loyaltyTier: string;
        firstVisit: Date | null;
        lastVisit: Date | null;
        preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
        preferredTimeOfDay: Date | null;
        preferredDays: string[];
        tags: string[];
        notes: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        voiceFingerprint: string | null;
        commonPhrases: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    /**
     * Clear conversation cache and streams
     */
    clearConversationCache(conversationId: string): void;
    /**
     * Search customer by name, nickname, landmark, or phone
     */
    searchCustomer(query: string): Promise<CustomerSearchResult[]>;
    /**
     * Get customer by ID
     */
    getCustomerById(id: string): Promise<({
        invoices: {
            tenantId: string;
            id: string;
            tags: string[];
            notes: string | null;
            createdBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            invoiceNo: string;
            customerId: string | null;
            subtotal: Decimal;
            discount: Decimal;
            discountType: string | null;
            total: Decimal;
            paidAmount: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            placeOfSupply: string | null;
            buyerGstin: string | null;
            recipientAddress: string | null;
            reverseCharge: boolean;
            ewayBillNo: string | null;
            ewayBillGeneratedAt: Date | null;
            irn: string | null;
            irnGeneratedAt: Date | null;
            ackNo: string | null;
            ackDate: Date | null;
            qrCode: string | null;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
            invoiceDate: Date;
            dueDate: Date | null;
            paidAt: Date | null;
            pdfObjectKey: string | null;
            pdfUrl: string | null;
        }[];
        reminders: {
            tenantId: string;
            id: string;
            notes: string | null;
            createdBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.ReminderStatus;
            scheduledTime: Date;
            customerId: string | null;
            invoiceId: string | null;
            productId: string | null;
            userId: string | null;
            reminderType: import(".prisma/client").$Enums.ReminderType;
            priority: import(".prisma/client").$Enums.ReminderPriority;
            recurringPattern: import("@prisma/client/runtime/library").JsonValue | null;
            expiresAt: Date | null;
            messageTemplateId: string | null;
            customMessage: string | null;
            parameters: import("@prisma/client/runtime/library").JsonValue | null;
            channels: import(".prisma/client").$Enums.MessageChannel[];
            sentAt: Date | null;
            deliveredAt: Date | null;
            readAt: Date | null;
            retryCount: number;
            maxRetries: number;
            lastAttempt: Date | null;
            lastError: string | null;
        }[];
    } & {
        tenantId: string;
        balance: Decimal;
        creditLimit: Decimal;
        totalPurchases: Decimal;
        totalPayments: Decimal;
        lastPaymentAmount: Decimal | null;
        averagePaymentDays: number | null;
        loyaltyPoints: number;
        visitCount: number;
        averageBasketSize: Decimal | null;
        frequencyScore: Decimal;
        recencyScore: Decimal;
        monetaryScore: Decimal;
        overallScore: Decimal | null;
        id: string;
        name: string;
        phone: string | null;
        alternatePhone: string[];
        email: string | null;
        honorific: string | null;
        localName: string | null;
        nickname: string[];
        addressLine1: string | null;
        addressLine2: string | null;
        landmark: string | null;
        area: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        gstin: string | null;
        pan: string | null;
        businessType: string | null;
        lastPaymentDate: Date | null;
        loyaltyTier: string;
        firstVisit: Date | null;
        lastVisit: Date | null;
        preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
        preferredTimeOfDay: Date | null;
        preferredDays: string[];
        tags: string[];
        notes: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        voiceFingerprint: string | null;
        commonPhrases: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }) | null>;
    /**
     * Create new customer
     */
    createCustomer(data: {
        name: string;
        phone?: string;
        nickname?: string;
        landmark?: string;
        notes?: string;
    }): Promise<{
        tenantId: string;
        balance: Decimal;
        creditLimit: Decimal;
        totalPurchases: Decimal;
        totalPayments: Decimal;
        lastPaymentAmount: Decimal | null;
        averagePaymentDays: number | null;
        loyaltyPoints: number;
        visitCount: number;
        averageBasketSize: Decimal | null;
        frequencyScore: Decimal;
        recencyScore: Decimal;
        monetaryScore: Decimal;
        overallScore: Decimal | null;
        id: string;
        name: string;
        phone: string | null;
        alternatePhone: string[];
        email: string | null;
        honorific: string | null;
        localName: string | null;
        nickname: string[];
        addressLine1: string | null;
        addressLine2: string | null;
        landmark: string | null;
        area: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        gstin: string | null;
        pan: string | null;
        businessType: string | null;
        lastPaymentDate: Date | null;
        loyaltyTier: string;
        firstVisit: Date | null;
        lastVisit: Date | null;
        preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
        preferredTimeOfDay: Date | null;
        preferredDays: string[];
        tags: string[];
        notes: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        voiceFingerprint: string | null;
        commonPhrases: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    /**
     * Update customer balance
     */
    updateBalance(customerId: string, amount: number): Promise<{
        tenantId: string;
        balance: Decimal;
        creditLimit: Decimal;
        totalPurchases: Decimal;
        totalPayments: Decimal;
        lastPaymentAmount: Decimal | null;
        averagePaymentDays: number | null;
        loyaltyPoints: number;
        visitCount: number;
        averageBasketSize: Decimal | null;
        frequencyScore: Decimal;
        recencyScore: Decimal;
        monetaryScore: Decimal;
        overallScore: Decimal | null;
        id: string;
        name: string;
        phone: string | null;
        alternatePhone: string[];
        email: string | null;
        honorific: string | null;
        localName: string | null;
        nickname: string[];
        addressLine1: string | null;
        addressLine2: string | null;
        landmark: string | null;
        area: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        gstin: string | null;
        pan: string | null;
        businessType: string | null;
        lastPaymentDate: Date | null;
        loyaltyTier: string;
        firstVisit: Date | null;
        lastVisit: Date | null;
        preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
        preferredTimeOfDay: Date | null;
        preferredDays: string[];
        tags: string[];
        notes: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        voiceFingerprint: string | null;
        commonPhrases: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    /**
     * Get customer balance
     */
    getBalance(customerId: string): Promise<number>;
    /**
     * Calculate balance from invoices minus payments (replaces old ledgerEntry approach)
     */
    calculateBalanceFromLedger(customerId: string): Promise<number>;
    /**
     * Sync balance with calculated value from invoices/payments
     */
    syncBalance(customerId: string): Promise<number>;
    /**
     * Delete customer and all related data atomically
     * Cascades: WhatsApp messages → Conversation recordings → Reminders → Invoices → Ledger entries → Customer
     */
    /**
     * Delete customer and all related data atomically
     * Cascades: Conversation recordings → Reminders → Invoices → Ledger entries → Customer
     */
    deleteCustomerAndAllData(customerId: string): Promise<{
        success: boolean;
        error?: string;
        deletedRecords: {
            invoices: number;
            payments: number;
            reminders: number;
            messageLogs: number;
            invoiceItems: number;
            customer: number;
        };
    }>;
    /**
     * Full profile update — name, phone, email, nickname, landmark, creditLimit, tags.
     * Called from PATCH /api/v1/customers/:id
     */
    updateProfile(id: string, data: {
        name?: string;
        phone?: string;
        email?: string;
        nickname?: string;
        landmark?: string;
        creditLimit?: number;
        tags?: string[];
        notes?: string;
    }): Promise<{
        tenantId: string;
        balance: Decimal;
        creditLimit: Decimal;
        totalPurchases: Decimal;
        totalPayments: Decimal;
        lastPaymentAmount: Decimal | null;
        averagePaymentDays: number | null;
        loyaltyPoints: number;
        visitCount: number;
        averageBasketSize: Decimal | null;
        frequencyScore: Decimal;
        recencyScore: Decimal;
        monetaryScore: Decimal;
        overallScore: Decimal | null;
        id: string;
        name: string;
        phone: string | null;
        alternatePhone: string[];
        email: string | null;
        honorific: string | null;
        localName: string | null;
        nickname: string[];
        addressLine1: string | null;
        addressLine2: string | null;
        landmark: string | null;
        area: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        gstin: string | null;
        pan: string | null;
        businessType: string | null;
        lastPaymentDate: Date | null;
        loyaltyTier: string;
        firstVisit: Date | null;
        lastVisit: Date | null;
        preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
        preferredTimeOfDay: Date | null;
        preferredDays: string[];
        tags: string[];
        notes: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        voiceFingerprint: string | null;
        commonPhrases: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    getCommPrefs(customerId: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        whatsappEnabled: boolean;
        whatsappNumber: string | null;
        whatsappOptInTime: Date | null;
        whatsappOptInIp: string | null;
        emailEnabled: boolean;
        emailAddress: string | null;
        emailVerified: boolean;
        emailVerifiedAt: Date | null;
        smsEnabled: boolean;
        smsNumber: string | null;
        preferredLanguage: string;
        preferredTime: Date | null;
        quietHours: import("@prisma/client/runtime/library").JsonValue;
        maxPerWeek: number;
        maxPerMonth: number;
        messagesSentThisWeek: number;
        messagesSentThisMonth: number;
        lastMessageAt: Date | null;
        consentGiven: boolean;
        consentDate: Date | null;
        consentSource: string | null;
        consentIp: string | null;
        optedOut: boolean;
        optedOutAt: Date | null;
        optOutReason: string | null;
    } | null>;
    upsertCommPrefs(customerId: string, data: {
        whatsappEnabled?: boolean;
        whatsappNumber?: string;
        emailEnabled?: boolean;
        emailAddress?: string;
        smsEnabled?: boolean;
        preferredLanguage?: string;
    }): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        whatsappEnabled: boolean;
        whatsappNumber: string | null;
        whatsappOptInTime: Date | null;
        whatsappOptInIp: string | null;
        emailEnabled: boolean;
        emailAddress: string | null;
        emailVerified: boolean;
        emailVerifiedAt: Date | null;
        smsEnabled: boolean;
        smsNumber: string | null;
        preferredLanguage: string;
        preferredTime: Date | null;
        quietHours: import("@prisma/client/runtime/library").JsonValue;
        maxPerWeek: number;
        maxPerMonth: number;
        messagesSentThisWeek: number;
        messagesSentThisMonth: number;
        lastMessageAt: Date | null;
        consentGiven: boolean;
        consentDate: Date | null;
        consentSource: string | null;
        consentIp: string | null;
        optedOut: boolean;
        optedOutAt: Date | null;
        optOutReason: string | null;
    }>;
}
export declare const customerService: CustomerService;
export { CreateCustomerFastResult };
//# sourceMappingURL=customer.service.d.ts.map