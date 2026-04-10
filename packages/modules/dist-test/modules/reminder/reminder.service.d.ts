import { Prisma } from '@prisma/client';
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
            tenantId: string;
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
            creditLimit: Prisma.Decimal;
            balance: Prisma.Decimal;
            totalPurchases: Prisma.Decimal;
            totalPayments: Prisma.Decimal;
            lastPaymentAmount: Prisma.Decimal | null;
            lastPaymentDate: Date | null;
            averagePaymentDays: number | null;
            loyaltyPoints: number;
            loyaltyTier: string;
            visitCount: number;
            firstVisit: Date | null;
            lastVisit: Date | null;
            averageBasketSize: Prisma.Decimal | null;
            preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
            preferredTimeOfDay: Date | null;
            preferredDays: string[];
            frequencyScore: Prisma.Decimal;
            recencyScore: Prisma.Decimal;
            monetaryScore: Prisma.Decimal;
            overallScore: Prisma.Decimal | null;
            tags: string[];
            notes: string | null;
            metadata: Prisma.JsonValue;
            voiceFingerprint: string | null;
            commonPhrases: string[];
            createdBy: string | null;
            updatedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        } | null;
    } & {
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
        recurringPattern: Prisma.JsonValue | null;
        expiresAt: Date | null;
        messageTemplateId: string | null;
        customMessage: string | null;
        parameters: Prisma.JsonValue | null;
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
        recurringPattern: Prisma.JsonValue | null;
        expiresAt: Date | null;
        messageTemplateId: string | null;
        customMessage: string | null;
        parameters: Prisma.JsonValue | null;
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
            tenantId: string;
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
            creditLimit: Prisma.Decimal;
            balance: Prisma.Decimal;
            totalPurchases: Prisma.Decimal;
            totalPayments: Prisma.Decimal;
            lastPaymentAmount: Prisma.Decimal | null;
            lastPaymentDate: Date | null;
            averagePaymentDays: number | null;
            loyaltyPoints: number;
            loyaltyTier: string;
            visitCount: number;
            firstVisit: Date | null;
            lastVisit: Date | null;
            averageBasketSize: Prisma.Decimal | null;
            preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
            preferredTimeOfDay: Date | null;
            preferredDays: string[];
            frequencyScore: Prisma.Decimal;
            recencyScore: Prisma.Decimal;
            monetaryScore: Prisma.Decimal;
            overallScore: Prisma.Decimal | null;
            tags: string[];
            notes: string | null;
            metadata: Prisma.JsonValue;
            voiceFingerprint: string | null;
            commonPhrases: string[];
            createdBy: string | null;
            updatedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        } | null;
    } & {
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
        recurringPattern: Prisma.JsonValue | null;
        expiresAt: Date | null;
        messageTemplateId: string | null;
        customMessage: string | null;
        parameters: Prisma.JsonValue | null;
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
        recurringPattern: Prisma.JsonValue | null;
        expiresAt: Date | null;
        messageTemplateId: string | null;
        customMessage: string | null;
        parameters: Prisma.JsonValue | null;
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
        recurringPattern: Prisma.JsonValue | null;
        expiresAt: Date | null;
        messageTemplateId: string | null;
        customMessage: string | null;
        parameters: Prisma.JsonValue | null;
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
            tenantId: string;
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
            creditLimit: Prisma.Decimal;
            balance: Prisma.Decimal;
            totalPurchases: Prisma.Decimal;
            totalPayments: Prisma.Decimal;
            lastPaymentAmount: Prisma.Decimal | null;
            lastPaymentDate: Date | null;
            averagePaymentDays: number | null;
            loyaltyPoints: number;
            loyaltyTier: string;
            visitCount: number;
            firstVisit: Date | null;
            lastVisit: Date | null;
            averageBasketSize: Prisma.Decimal | null;
            preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
            preferredTimeOfDay: Date | null;
            preferredDays: string[];
            frequencyScore: Prisma.Decimal;
            recencyScore: Prisma.Decimal;
            monetaryScore: Prisma.Decimal;
            overallScore: Prisma.Decimal | null;
            tags: string[];
            notes: string | null;
            metadata: Prisma.JsonValue;
            voiceFingerprint: string | null;
            commonPhrases: string[];
            createdBy: string | null;
            updatedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        } | null;
    } & {
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
        recurringPattern: Prisma.JsonValue | null;
        expiresAt: Date | null;
        messageTemplateId: string | null;
        customMessage: string | null;
        parameters: Prisma.JsonValue | null;
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
    /**
     * Bulk-schedule reminders for multiple customers (e.g. all with overdue balance).
     * daysOffset: how many days from now to schedule (default 0 = today 6pm IST).
     */
    bulkScheduleReminders(data: {
        customerIds: string[];
        message?: string;
        daysOffset?: number;
    }): Promise<any[]>;
}
export declare const reminderService: ReminderService;
export {};
//# sourceMappingURL=reminder.service.d.ts.map