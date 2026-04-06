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
        id: string;
        notes: string | null;
        tags: string[];
        createdBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
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
        creditLimit: Decimal;
        balance: Decimal;
        totalPurchases: Decimal;
        totalPayments: Decimal;
        lastPaymentAmount: Decimal | null;
        lastPaymentDate: Date | null;
        averagePaymentDays: number | null;
        loyaltyPoints: number;
        loyaltyTier: string;
        visitCount: number;
        firstVisit: Date | null;
        lastVisit: Date | null;
        averageBasketSize: Decimal | null;
        preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
        preferredTimeOfDay: Date | null;
        preferredDays: string[];
        frequencyScore: Decimal;
        recencyScore: Decimal;
        monetaryScore: Decimal;
        overallScore: Decimal | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        voiceFingerprint: string | null;
        commonPhrases: string[];
        updatedBy: string | null;
    };
} & {
    tenantId: string;
    id: string;
    customerId: string;
    status: import(".prisma/client").$Enums.PaymentStatus;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    paymentNo: string;
    amount: Decimal;
    method: import(".prisma/client").$Enums.PaymentMethod;
    reference: string | null;
    receivedAt: Date;
    invoiceId: string | null;
}>;
export declare function recordMixedPayment(customerId: string, splits: Array<{
    amount: number;
    method: "cash" | "upi" | "card" | "other";
}>, notes?: string, reference?: string, receivedAt?: Date): Promise<{
    payments: {
        tenantId: string;
        id: string;
        customerId: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        notes: string | null;
        createdBy: string | null;
        createdAt: Date;
        paymentNo: string;
        amount: Decimal;
        method: import(".prisma/client").$Enums.PaymentMethod;
        reference: string | null;
        receivedAt: Date;
        invoiceId: string | null;
    }[];
    totalAmount: number;
}>;
export declare function addCredit(customerId: string, amount: number, description: string): Promise<{
    tenantId: string;
    id: string;
    notes: string | null;
    tags: string[];
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
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
    creditLimit: Decimal;
    balance: Decimal;
    totalPurchases: Decimal;
    totalPayments: Decimal;
    lastPaymentAmount: Decimal | null;
    lastPaymentDate: Date | null;
    averagePaymentDays: number | null;
    loyaltyPoints: number;
    loyaltyTier: string;
    visitCount: number;
    firstVisit: Date | null;
    lastVisit: Date | null;
    averageBasketSize: Decimal | null;
    preferredPaymentMethod: import(".prisma/client").$Enums.PaymentMethod[];
    preferredTimeOfDay: Date | null;
    preferredDays: string[];
    frequencyScore: Decimal;
    recencyScore: Decimal;
    monetaryScore: Decimal;
    overallScore: Decimal | null;
    metadata: import("@prisma/client/runtime/library").JsonValue;
    voiceFingerprint: string | null;
    commonPhrases: string[];
    updatedBy: string | null;
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
    customerId: string;
    status: import(".prisma/client").$Enums.PaymentStatus;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    paymentNo: string;
    amount: Decimal;
    method: import(".prisma/client").$Enums.PaymentMethod;
    reference: string | null;
    receivedAt: Date;
    invoiceId: string | null;
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
    customerId: string;
    status: import(".prisma/client").$Enums.PaymentStatus;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    paymentNo: string;
    amount: Decimal;
    method: import(".prisma/client").$Enums.PaymentMethod;
    reference: string | null;
    receivedAt: Date;
    invoiceId: string | null;
})[]>;
//# sourceMappingURL=payment.d.ts.map