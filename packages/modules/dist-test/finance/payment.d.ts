/**
 * Finance domain — payment recording and ledger queries.
 *
 * Direct Prisma calls, flat async functions, no class wrappers.
 * Auto-applies payments to oldest unpaid invoices (khata-style settlement).
 */
import { Decimal } from "@prisma/client/runtime/library";
export declare function recordPayment(customerId: string, amount: number, paymentMode: "cash" | "upi" | "card" | "other", notes?: string, reference?: string, receivedAt?: Date): Promise<{
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
} & {
    tenantId: string;
    id: string;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.PaymentStatus;
    customerId: string;
    invoiceId: string | null;
    amount: Decimal;
    paymentNo: string;
    method: import(".prisma/client").$Enums.PaymentMethod;
    reference: string | null;
    receivedAt: Date;
}>;
export declare function recordMixedPayment(customerId: string, splits: Array<{
    amount: number;
    method: "cash" | "upi" | "card" | "other";
}>, notes?: string, reference?: string, receivedAt?: Date): Promise<{
    payments: {
        tenantId: string;
        id: string;
        notes: string | null;
        createdBy: string | null;
        createdAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        customerId: string;
        invoiceId: string | null;
        amount: Decimal;
        paymentNo: string;
        method: import(".prisma/client").$Enums.PaymentMethod;
        reference: string | null;
        receivedAt: Date;
    }[];
    totalAmount: number;
}>;
export declare function addCredit(customerId: string, amount: number, description: string): Promise<{
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
export declare function reversePayment(invoiceId: string, amount: number): Promise<{
    ok: boolean;
    newPaid: number;
    newStatus: string;
}>;
export declare function getCustomerLedger(customerId: string, limit?: number): Promise<({
    customer: {
        name: string;
        phone: string | null;
    };
} & {
    tenantId: string;
    id: string;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.PaymentStatus;
    customerId: string;
    invoiceId: string | null;
    amount: Decimal;
    paymentNo: string;
    method: import(".prisma/client").$Enums.PaymentMethod;
    reference: string | null;
    receivedAt: Date;
})[]>;
export declare function getLedgerSummary(startDate: Date, endDate: Date): Promise<{
    totalDebits: number;
    totalCredits: number;
    netBalance: number;
    cashPayments: number;
    upiPayments: number;
    entryCount: number;
}>;
export declare function getRecentTransactions(limit?: number): Promise<({
    customer: {
        name: string;
        phone: string | null;
    };
} & {
    tenantId: string;
    id: string;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.PaymentStatus;
    customerId: string;
    invoiceId: string | null;
    amount: Decimal;
    paymentNo: string;
    method: import(".prisma/client").$Enums.PaymentMethod;
    reference: string | null;
    receivedAt: Date;
})[]>;
//# sourceMappingURL=payment.d.ts.map