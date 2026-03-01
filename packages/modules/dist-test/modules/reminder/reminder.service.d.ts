declare class ReminderService {
    private normalizeSpokenNumbers;
    private parseHourMinute;
    private nextDailyAt;
    private nextMonthlyDate;
    private parseSchedule;
    private enqueueReminderJob;
    private removeQueuedJobsForReminder;
    /**
     * Parse natural language date/time to actual datetime
     */
    private parseDateTime;
    /**
     * Schedule a payment reminder
     */
    scheduleReminder(customerId: string, amount: number, dateTimeStr: string, customMessage?: string): Promise<{
        customer: {
            balance: import("@prisma/client/runtime/library").Decimal;
            creditLimit: import("@prisma/client/runtime/library").Decimal;
            totalPurchases: import("@prisma/client/runtime/library").Decimal;
            totalPayments: import("@prisma/client/runtime/library").Decimal;
            lastPaymentAmount: import("@prisma/client/runtime/library").Decimal | null;
            averagePaymentDays: number | null;
            loyaltyPoints: number;
            visitCount: number;
            averageBasketSize: import("@prisma/client/runtime/library").Decimal | null;
            frequencyScore: import("@prisma/client/runtime/library").Decimal;
            recencyScore: import("@prisma/client/runtime/library").Decimal;
            monetaryScore: import("@prisma/client/runtime/library").Decimal;
            overallScore: import("@prisma/client/runtime/library").Decimal | null;
            id: string;
            tenantId: string;
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
        } | null;
    } & {
        id: string;
        tenantId: string;
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
    }>;
    /**
     * Cancel a scheduled reminder
     */
    cancelReminder(reminderId: string): Promise<{
        id: string;
        tenantId: string;
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
    }>;
    /**
     * Modify reminder time
     */
    modifyReminderTime(reminderId: string, newDateTimeStr: string): Promise<{
        customer: {
            balance: import("@prisma/client/runtime/library").Decimal;
            creditLimit: import("@prisma/client/runtime/library").Decimal;
            totalPurchases: import("@prisma/client/runtime/library").Decimal;
            totalPayments: import("@prisma/client/runtime/library").Decimal;
            lastPaymentAmount: import("@prisma/client/runtime/library").Decimal | null;
            averagePaymentDays: number | null;
            loyaltyPoints: number;
            visitCount: number;
            averageBasketSize: import("@prisma/client/runtime/library").Decimal | null;
            frequencyScore: import("@prisma/client/runtime/library").Decimal;
            recencyScore: import("@prisma/client/runtime/library").Decimal;
            monetaryScore: import("@prisma/client/runtime/library").Decimal;
            overallScore: import("@prisma/client/runtime/library").Decimal | null;
            id: string;
            tenantId: string;
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
        } | null;
    } & {
        id: string;
        tenantId: string;
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
    }>;
    /**
     * Get pending reminders
     */
    getPendingReminders(customerId?: string): Promise<({
        customer: {
            name: string;
            phone: string | null;
        } | null;
    } & {
        id: string;
        tenantId: string;
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
    })[]>;
    /**
     * Get customer reminders
     */
    getCustomerReminders(customerId: string, limit?: number): Promise<({
        customer: {
            name: string;
            phone: string | null;
        } | null;
    } & {
        id: string;
        tenantId: string;
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
    })[]>;
    /**
     * Mark reminder as sent
     */
    markAsSent(reminderId: string, options?: {
        keepPending?: boolean;
    }): Promise<void>;
    /**
     * Mark reminder as failed
     */
    markAsFailed(reminderId: string): Promise<void>;
    /**
     * Get reminders due now
     */
    getDueReminders(): Promise<({
        customer: {
            balance: import("@prisma/client/runtime/library").Decimal;
            creditLimit: import("@prisma/client/runtime/library").Decimal;
            totalPurchases: import("@prisma/client/runtime/library").Decimal;
            totalPayments: import("@prisma/client/runtime/library").Decimal;
            lastPaymentAmount: import("@prisma/client/runtime/library").Decimal | null;
            averagePaymentDays: number | null;
            loyaltyPoints: number;
            visitCount: number;
            averageBasketSize: import("@prisma/client/runtime/library").Decimal | null;
            frequencyScore: import("@prisma/client/runtime/library").Decimal;
            recencyScore: import("@prisma/client/runtime/library").Decimal;
            monetaryScore: import("@prisma/client/runtime/library").Decimal;
            overallScore: import("@prisma/client/runtime/library").Decimal | null;
            id: string;
            tenantId: string;
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
        } | null;
    } & {
        id: string;
        tenantId: string;
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
    })[]>;
    scheduleNextOccurrence(reminderId: string): Promise<object | null>;
}
export declare const reminderService: ReminderService;
export {};
//# sourceMappingURL=reminder.service.d.ts.map