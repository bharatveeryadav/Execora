/**
 * Mobile API initializer.
 * Wires the shared platform-agnostic API client with MMKV token storage
 * and React Navigation auth-expiry handling.
 *
 * Call `bootApi()` once — inside App.tsx before QueryClientProvider renders.
 */
import { customerApi, productApi, invoiceApi, authApi, type Product } from "@execora/shared";
/** API base URL — treats empty/whitespace as fallback (emulator: 10.0.2.2:3006) */
export declare const getApiBaseUrl: () => string;
export declare const invoiceExtApi: {
    cancel: (id: string) => Promise<{
        invoice: unknown;
    }>;
    update: (id: string, data: {
        items?: Array<{
            productName: string;
            quantity: number;
        }>;
        notes?: string;
    }) => Promise<{
        invoice: unknown;
    }>;
    sendEmail: (id: string) => Promise<{
        sent: boolean;
    }>;
};
export declare const customerExtApi: {
    create: (data: {
        name: string;
        phone?: string;
        email?: string;
        nickname?: string;
        landmark?: string;
        notes?: string;
        openingBalance?: number;
        creditLimit?: number;
        tags?: string[];
    }) => Promise<{
        customer: unknown;
    }>;
    delete: (id: string) => Promise<{
        success: boolean;
    }>;
    getLedger: (id: string) => Promise<{
        entries: Array<{
            id: string;
            type: string;
            description: string;
            amount: string | number;
            createdAt: string;
        }>;
    }>;
    getCommPrefs: (id: string) => Promise<{
        prefs: {
            whatsappEnabled?: boolean;
            whatsappNumber?: string;
            emailEnabled?: boolean;
            emailAddress?: string;
            smsEnabled?: boolean;
            preferredLanguage?: string;
        } | null;
    }>;
    updateCommPrefs: (id: string, data: {
        whatsappEnabled?: boolean;
        whatsappNumber?: string;
        emailEnabled?: boolean;
        emailAddress?: string;
        smsEnabled?: boolean;
        preferredLanguage?: string;
    }) => Promise<{
        prefs: unknown;
    }>;
};
export declare const reminderApi: {
    list: (customerId?: string) => Promise<{
        reminders: Array<{
            id: string;
            status: string;
            scheduledTime: string;
            message?: string;
        }>;
    }>;
    create: (data: {
        customerId: string;
        amount?: number;
        datetime: string;
        message?: string;
    }) => Promise<{
        reminder: unknown;
    }>;
};
export declare const paymentApi: {
    record: (data: {
        customerId?: string;
        invoiceId?: string;
        amount: number;
        method: string;
        reference?: string;
        date?: string;
    }) => Promise<{
        payment: unknown;
    }>;
};
export declare const expenseApi: {
    list: (params?: {
        from?: string;
        to?: string;
        category?: string;
        type?: "expense" | "income";
    }) => Promise<{
        expenses: Array<{
            id: string;
            category: string;
            amount: string | number;
            note?: string;
            vendor?: string;
            date: string;
        }>;
        total: number;
        count: number;
    }>;
    create: (data: {
        category: string;
        amount: number;
        note?: string;
        vendor?: string;
        date?: string;
        type?: "expense" | "income";
    }) => Promise<{
        expense: unknown;
    }>;
    remove: (id: string) => Promise<{
        ok: boolean;
    }>;
    summary: (params?: {
        from?: string;
        to?: string;
    }) => Promise<{
        total: number;
        byCategory: Record<string, number>;
        count: number;
    }>;
};
export declare const cashbookApi: {
    get: (params?: {
        from?: string;
        to?: string;
    }) => Promise<{
        entries: Array<{
            id: string;
            type: string;
            date: string;
            category?: string;
            note?: string;
            amount: string | number;
        }>;
        totalIn: number;
        totalOut: number;
        balance: number;
    }>;
};
export declare const supplierApi: {
    list: (params?: {
        q?: string;
        limit?: number;
    }) => Promise<{
        suppliers: Array<{
            id: string;
            name: string;
            companyName?: string | null;
            phone?: string | null;
            email?: string | null;
            address?: string | null;
            gstin?: string | null;
        }>;
    }>;
    create: (data: {
        name: string;
        companyName?: string;
        phone?: string;
        email?: string;
        address?: string;
        gstin?: string;
    }) => Promise<{
        supplier: unknown;
    }>;
};
export declare const purchaseApi: {
    list: (params?: {
        from?: string;
        to?: string;
    }) => Promise<{
        purchases: Array<{
            id: string;
            category: string;
            amount: string | number;
            note?: string;
            vendor?: string;
            date: string;
        }>;
        total: number;
        count: number;
    }>;
    create: (data: {
        category: string;
        amount: number;
        itemName: string;
        vendor?: string;
        quantity?: number;
        unit?: string;
        ratePerUnit?: number;
        note?: string;
        date?: string;
    }) => Promise<{
        purchase: unknown;
    }>;
    remove: (id: string) => Promise<{
        ok: boolean;
    }>;
};
export declare const summaryApi: {
    daily: (date?: string) => Promise<{
        summary: {
            totalSales: number;
            totalPayments: number;
            invoiceCount: number;
            pendingAmount: number;
            cashPayments: number;
            upiPayments: number;
        };
    }>;
    range: (from: string, to: string) => Promise<{
        summary: {
            totalSales: number;
            totalPayments: number;
            invoiceCount: number;
            pendingAmount?: number;
            cashPayments?: number;
            upiPayments?: number;
        };
    }>;
};
export declare function setAuthExpiredHandler(fn: () => void): void;
export declare function bootApi(): void;
export declare const pushApi: {
    register: (token: string, platform?: string) => Promise<{
        ok: boolean;
    }>;
};
export declare const feedbackApi: {
    submit: (data: {
        npsScore: number;
        text?: string;
    }) => Promise<{
        feedback: {
            id: string;
            npsScore: number;
            text: string | null;
            createdAt: string;
        };
    }>;
};
export declare const productExtApi: {
    lowStock: () => Promise<{
        products: Array<{
            id: string;
            name: string;
            stock: number;
            unit?: string;
            minStock?: number;
        }>;
    }>;
    expiringBatches: (days?: number) => Promise<{
        batches: Array<{
            id: string;
            batchNo: string;
            expiryDate: string;
            quantity: number;
            product: {
                name: string;
                unit: string;
            };
        }>;
    }>;
    expiryPage: (filter?: "expired" | "7d" | "30d" | "90d" | "all") => Promise<{
        batches: Array<{
            id: string;
            batchNo: string;
            expiryDate: string;
            manufacturingDate: string | null;
            quantity: number;
            purchasePrice: string | null;
            status: string;
            product: {
                name: string;
                unit: string;
                category: string | null;
            };
        }>;
        summary: {
            expiredCount: number;
            critical7: number;
            warning30: number;
            valueAtRisk: number;
        };
    }>;
    writeOffBatch: (batchId: string) => Promise<{
        ok: boolean;
        batchNo: string;
        qtyWrittenOff: number;
    }>;
    create: (data: {
        name: string;
        price?: number;
        unit?: string;
        category?: string;
        stock?: number;
        minStock?: number;
        barcode?: string;
    }) => Promise<{
        product: Product & {
            minStock?: number;
        };
    }>;
    update: (id: string, data: {
        isFeatured?: boolean;
        name?: string;
        price?: number;
        category?: string;
    }) => Promise<{
        product: Product & {
            minStock?: number;
        };
    }>;
    adjustStock: (id: string, quantity: number, operation: "add" | "subtract", reason?: string) => Promise<{
        product: Product & {
            minStock?: number;
        };
    }>;
    getImageUrls: (ids: string[]) => Promise<Record<string, string>>;
};
export declare const reportsApi: {
    gstr1: (params?: {
        from?: string;
        to?: string;
        fy?: string;
    }) => Promise<{
        report: {
            fy: string;
            b2b: unknown[];
            b2cs: unknown[];
            hsn: unknown[];
        };
    }>;
    pnl: (params?: {
        from?: string;
        to?: string;
        fy?: string;
    }) => Promise<{
        report: {
            period: {
                from: string;
                to: string;
            };
            months: Array<{
                month: string;
                invoiceCount: number;
                revenue: number;
                discounts: number;
                netRevenue: number;
                taxCollected: number;
                collected: number;
                outstanding: number;
            }>;
            totals: {
                invoiceCount: number;
                revenue: number;
                discounts: number;
                netRevenue: number;
                taxCollected: number;
                collected: number;
                outstanding: number;
                collectionRate: number;
            };
        };
    }>;
};
export declare const creditNoteApi: {
    list: (params?: {
        limit?: number;
        customerId?: string;
        status?: string;
    }) => Promise<{
        creditNotes: Array<{
            id: string;
            creditNoteNo: string;
            status: string;
            total: number;
            customer?: {
                name: string;
            };
            invoice?: {
                invoiceNo: string;
            };
            createdAt: string;
        }>;
    }>;
};
export declare const purchaseOrderApi: {
    list: (params?: {
        status?: string;
        limit?: number;
    }) => Promise<{
        purchaseOrders: Array<{
            id: string;
            poNo: string;
            status: string;
            total: number;
            supplier?: {
                name: string;
            };
            createdAt: string;
        }>;
    }>;
};
export declare const monitoringApi: {
    getEvents: (params?: {
        limit?: number;
        offset?: number;
        unreadOnly?: boolean;
    }) => Promise<{
        events: Array<{
            id: string;
            eventType: string;
            entityType: string;
            entityId: string;
            description: string;
            amount?: number;
            severity: string;
            isRead: boolean;
            createdAt: string;
            user?: {
                id: string;
                name: string;
                role: string;
            };
        }>;
        total: number;
    }>;
    getUnreadCount: () => Promise<{
        count: number;
    }>;
    markAllRead: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    logEvent: (data: {
        eventType: string;
        entityType: string;
        entityId: string;
        description: string;
        amount?: number;
        severity?: "info" | "warning" | "alert";
    }) => Promise<{
        ok: boolean;
    }>;
    getStats: (params?: {
        from?: string;
        to?: string;
    }) => Promise<{
        billCount: number;
        totalBillAmount: number;
        footfall: number;
        conversionRate: number | null;
        hourlyBills: Record<string, number>;
        peakHour: number | null;
        byEmployee: Record<string, {
            bills: number;
            payments: number;
            cancellations: number;
            totalAmount: number;
        }>;
    }>;
    submitCashReconciliation: (data: {
        date: string;
        actual: number;
        expected: number;
        note?: string;
    }) => Promise<{
        ok: boolean;
    }>;
    getCashReconciliation: (date: string) => Promise<{
        reconciliation: {
            id: string;
            description: string;
            meta: unknown;
        } | null;
    }>;
};
export declare const authExtApi: {
    uploadLogo: (uri: string, mimeType?: string) => Promise<{
        logoObjectKey: string;
    }>;
    updateProfile: (data: {
        name?: string;
        phone?: string;
        preferences?: Record<string, unknown>;
        tenant?: {
            name?: string;
            legalName?: string;
            tradeName?: string;
            gstin?: string;
            currency?: string;
            timezone?: string;
            language?: string;
            dateFormat?: string;
            settings?: Record<string, unknown>;
            logoUrl?: string;
        };
    }) => Promise<{
        user: unknown;
    }>;
};
export { customerApi, productApi, invoiceApi, authApi };
//# sourceMappingURL=api.d.ts.map