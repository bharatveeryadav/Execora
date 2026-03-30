import { InvoiceItemInput } from "@execora/types";
import { Decimal } from "@prisma/client/runtime/library";
import { type SupplyType } from "../gst/gst.service";
/**
 * Shared options for invoice creation features.
 */
export interface InvoiceOptions {
    /** Bill-level discount as percentage (e.g. 10 = 10% off subtotal). Applied after per-item totals. */
    discountPercent?: number;
    /** Bill-level flat discount (overrides discountPercent if both provided). */
    discountAmount?: number;
    /** Invoice tags (e.g. B2B, B2C, COD, Urgent) — shown on PDF. */
    tags?: string[];
    /** Enable GST calculation on line items. Default false (non-GST/retail billing). */
    withGst?: boolean;
    /** INTRASTATE = CGST+SGST; INTERSTATE = IGST. Defaults to INTRASTATE. */
    supplyType?: SupplyType;
    /** Buyer GSTIN for B2B invoices (populates buyer_gstin on Invoice record). */
    buyerGstin?: string;
    /** State code for place of supply (e.g. "29" for Karnataka). Determines IGST eligibility. */
    placeOfSupply?: string;
    /** Recipient billing address (B2B override when customer has no address). */
    recipientAddress?: string;
    /** Reverse Charge Mechanism — tax payable by recipient. */
    reverseCharge?: boolean;
    /** If provided, immediately records a payment against this invoice (partial payment at billing). */
    initialPayment?: {
        amount: number;
        method: "cash" | "upi" | "card" | "other";
    };
    /** Skip credit limit enforcement (use after user confirms override). */
    overrideCreditLimit?: boolean;
}
declare class InvoiceService {
    /**
     * Find a product by name using a two-pass strategy:
     * 1) Exact case-insensitive contains match (fast).
     * 2) Fuzzy fallback — normalise both strings, pick best overlap.
     * This handles spoken/transliterated names ("cheeni" → "Cheeni", "aata" → "Atta").
     */
    private findOrCreateProduct;
    /**
     * Compute bill-level discount amount from options.
     * Returns the actual rupee amount to deduct.
     */
    private computeDiscount;
    /**
     * Preview invoice — resolves products (auto-creates unknowns at ₹0), optionally
     * calculates GST per line item, and returns fully priced items WITHOUT committing to the DB.
     * The caller should store the result in Redis and wait for user confirmation.
     *
     * @param withGst  — Default FALSE. Pass true only when user explicitly requests GST billing.
     * @param supplyType — Only relevant when withGst=true. Determines CGST+SGST vs IGST split.
     * @param discountPercent — Optional bill-level discount percentage (applied after subtotal).
     */
    previewInvoice(customerId: string, items: InvoiceItemInput[], withGst?: boolean, supplyType?: SupplyType, discountPercent?: number): Promise<{
        resolvedItems: Array<{
            productId: string;
            productName: string;
            unit: string;
            hsnCode: string | null;
            quantity: number;
            unitPrice: number;
            gstRate: number;
            cessRate: number;
            isGstExempt: boolean;
            cgst: number;
            sgst: number;
            igst: number;
            cess: number;
            subtotal: number;
            totalTax: number;
            total: number;
            autoCreated: boolean;
        }>;
        subtotal: number;
        discountAmt: number;
        discountType: string;
        totalCgst: number;
        totalSgst: number;
        totalIgst: number;
        totalCess: number;
        totalTax: number;
        grandTotal: number;
        autoCreatedProducts: string[];
    }>;
    /**
     * Confirm invoice — creates the DB record from already-resolved items (with GST).
     * Call this after the user confirms the preview returned by previewInvoice().
     *
     * @param opts  - Discount, B2B GSTIN, partial payment at billing, etc.
     */
    confirmInvoice(customerId: string, resolvedItems: Array<{
        productId: string;
        productName: string;
        unit: string;
        hsnCode?: string | null;
        quantity: number;
        unitPrice: number;
        gstRate?: number;
        cessRate?: number;
        isGstExempt?: boolean;
        cgst?: number;
        sgst?: number;
        igst?: number;
        cess?: number;
        subtotal?: number;
        totalTax?: number;
        total: number;
    }>, notes?: string, opts?: InvoiceOptions): Promise<{
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
        } | null;
        items: ({
            product: {
                tenantId: string;
                id: string;
                name: string;
                tags: string[];
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                cess: Decimal;
                description: string | null;
                isActive: boolean;
                unit: string;
                mrp: Decimal | null;
                hsnCode: string | null;
                gstRate: Decimal;
                category: string;
                subCategory: string | null;
                sku: string | null;
                barcode: string | null;
                price: Decimal;
                cost: Decimal | null;
                wholesalePrice: Decimal | null;
                priceTier2: Decimal | null;
                priceTier3: Decimal | null;
                baseUnit: string | null;
                baseUnitQuantity: Decimal | null;
                stock: number;
                minStock: number;
                maxStock: number | null;
                location: string | null;
                isGstExempt: boolean;
                trackBatches: boolean;
                trackSerialNumbers: boolean;
                hasVariants: boolean;
                imageUrl: string | null;
                imageUrls: string[];
                preferredSupplier: string | null;
                supplierId: string | null;
                isFeatured: boolean;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            serialNumbers: string[];
            subtotal: Decimal;
            discount: Decimal;
            total: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            invoiceId: string;
            productId: string | null;
            productName: string;
            variantAttributes: import("@prisma/client/runtime/library").JsonValue | null;
            quantity: Decimal;
            unit: string;
            unitPrice: Decimal;
            mrp: Decimal | null;
            hsnCode: string | null;
            gstRate: Decimal;
            variantId: string | null;
            batchId: string | null;
        })[];
    } & {
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
    }>;
    /**
     * Create invoice with atomic transaction — used by REST API (Form/Dashboard mode).
     * Supports discounts, GST, B2B GSTIN, partial payment at creation, and proforma type.
     */
    createInvoice(customerId: string, items: InvoiceItemInput[], notes?: string, opts?: InvoiceOptions & {
        isProforma?: boolean;
    }): Promise<{
        invoice: {
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
            } | null;
            items: ({
                product: {
                    tenantId: string;
                    id: string;
                    name: string;
                    tags: string[];
                    createdBy: string | null;
                    updatedBy: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    cess: Decimal;
                    description: string | null;
                    isActive: boolean;
                    unit: string;
                    mrp: Decimal | null;
                    hsnCode: string | null;
                    gstRate: Decimal;
                    category: string;
                    subCategory: string | null;
                    sku: string | null;
                    barcode: string | null;
                    price: Decimal;
                    cost: Decimal | null;
                    wholesalePrice: Decimal | null;
                    priceTier2: Decimal | null;
                    priceTier3: Decimal | null;
                    baseUnit: string | null;
                    baseUnitQuantity: Decimal | null;
                    stock: number;
                    minStock: number;
                    maxStock: number | null;
                    location: string | null;
                    isGstExempt: boolean;
                    trackBatches: boolean;
                    trackSerialNumbers: boolean;
                    hasVariants: boolean;
                    imageUrl: string | null;
                    imageUrls: string[];
                    preferredSupplier: string | null;
                    supplierId: string | null;
                    isFeatured: boolean;
                    attributes: import("@prisma/client/runtime/library").JsonValue;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                serialNumbers: string[];
                subtotal: Decimal;
                discount: Decimal;
                total: Decimal;
                tax: Decimal;
                cgst: Decimal;
                sgst: Decimal;
                igst: Decimal;
                cess: Decimal;
                invoiceId: string;
                productId: string | null;
                productName: string;
                variantAttributes: import("@prisma/client/runtime/library").JsonValue | null;
                quantity: Decimal;
                unit: string;
                unitPrice: Decimal;
                mrp: Decimal | null;
                hsnCode: string | null;
                gstRate: Decimal;
                variantId: string | null;
                batchId: string | null;
            })[];
        } & {
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
        };
        autoCreatedProducts: string[];
    }>;
    /**
     * Convert proforma invoice → actual invoice.
     * Deducts stock and updates customer balance. Sets status to 'pending'.
     */
    convertProformaToInvoice(invoiceId: string, initialPayment?: {
        amount: number;
        method: "cash" | "upi" | "card" | "other";
    }): Promise<{
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
        } | null;
        items: ({
            product: {
                tenantId: string;
                id: string;
                name: string;
                tags: string[];
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                cess: Decimal;
                description: string | null;
                isActive: boolean;
                unit: string;
                mrp: Decimal | null;
                hsnCode: string | null;
                gstRate: Decimal;
                category: string;
                subCategory: string | null;
                sku: string | null;
                barcode: string | null;
                price: Decimal;
                cost: Decimal | null;
                wholesalePrice: Decimal | null;
                priceTier2: Decimal | null;
                priceTier3: Decimal | null;
                baseUnit: string | null;
                baseUnitQuantity: Decimal | null;
                stock: number;
                minStock: number;
                maxStock: number | null;
                location: string | null;
                isGstExempt: boolean;
                trackBatches: boolean;
                trackSerialNumbers: boolean;
                hasVariants: boolean;
                imageUrl: string | null;
                imageUrls: string[];
                preferredSupplier: string | null;
                supplierId: string | null;
                isFeatured: boolean;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            serialNumbers: string[];
            subtotal: Decimal;
            discount: Decimal;
            total: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            invoiceId: string;
            productId: string | null;
            productName: string;
            variantAttributes: import("@prisma/client/runtime/library").JsonValue | null;
            quantity: Decimal;
            unit: string;
            unitPrice: Decimal;
            mrp: Decimal | null;
            hsnCode: string | null;
            gstRate: Decimal;
            variantId: string | null;
            batchId: string | null;
        })[];
    } & {
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
    }>;
    /**
     * Update a pending invoice — allows editing items, discount, notes, or B2B fields.
     * Only PENDING (or DRAFT) invoices can be edited. PAID/CANCELLED require admin override.
     */
    updateInvoice(invoiceId: string, changes: {
        items?: InvoiceItemInput[];
        notes?: string;
        opts?: InvoiceOptions;
    }): Promise<{
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
        } | null;
        items: ({
            product: {
                tenantId: string;
                id: string;
                name: string;
                tags: string[];
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                cess: Decimal;
                description: string | null;
                isActive: boolean;
                unit: string;
                mrp: Decimal | null;
                hsnCode: string | null;
                gstRate: Decimal;
                category: string;
                subCategory: string | null;
                sku: string | null;
                barcode: string | null;
                price: Decimal;
                cost: Decimal | null;
                wholesalePrice: Decimal | null;
                priceTier2: Decimal | null;
                priceTier3: Decimal | null;
                baseUnit: string | null;
                baseUnitQuantity: Decimal | null;
                stock: number;
                minStock: number;
                maxStock: number | null;
                location: string | null;
                isGstExempt: boolean;
                trackBatches: boolean;
                trackSerialNumbers: boolean;
                hasVariants: boolean;
                imageUrl: string | null;
                imageUrls: string[];
                preferredSupplier: string | null;
                supplierId: string | null;
                isFeatured: boolean;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            serialNumbers: string[];
            subtotal: Decimal;
            discount: Decimal;
            total: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            invoiceId: string;
            productId: string | null;
            productName: string;
            variantAttributes: import("@prisma/client/runtime/library").JsonValue | null;
            quantity: Decimal;
            unit: string;
            unitPrice: Decimal;
            mrp: Decimal | null;
            hsnCode: string | null;
            gstRate: Decimal;
            variantId: string | null;
            batchId: string | null;
        })[];
    } & {
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
    }>;
    /**
     * Cancel invoice — reverses stock and customer balance.
     */
    cancelInvoice(invoiceId: string): Promise<{
        items: ({
            product: {
                tenantId: string;
                id: string;
                name: string;
                tags: string[];
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                cess: Decimal;
                description: string | null;
                isActive: boolean;
                unit: string;
                mrp: Decimal | null;
                hsnCode: string | null;
                gstRate: Decimal;
                category: string;
                subCategory: string | null;
                sku: string | null;
                barcode: string | null;
                price: Decimal;
                cost: Decimal | null;
                wholesalePrice: Decimal | null;
                priceTier2: Decimal | null;
                priceTier3: Decimal | null;
                baseUnit: string | null;
                baseUnitQuantity: Decimal | null;
                stock: number;
                minStock: number;
                maxStock: number | null;
                location: string | null;
                isGstExempt: boolean;
                trackBatches: boolean;
                trackSerialNumbers: boolean;
                hasVariants: boolean;
                imageUrl: string | null;
                imageUrls: string[];
                preferredSupplier: string | null;
                supplierId: string | null;
                isFeatured: boolean;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            serialNumbers: string[];
            subtotal: Decimal;
            discount: Decimal;
            total: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            invoiceId: string;
            productId: string | null;
            productName: string;
            variantAttributes: import("@prisma/client/runtime/library").JsonValue | null;
            quantity: Decimal;
            unit: string;
            unitPrice: Decimal;
            mrp: Decimal | null;
            hsnCode: string | null;
            gstRate: Decimal;
            variantId: string | null;
            batchId: string | null;
        })[];
    } & {
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
    }>;
    /**
     * Get recent invoices.
     */
    getRecentInvoices(limit?: number): Promise<({
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
        } | null;
        items: ({
            product: {
                tenantId: string;
                id: string;
                name: string;
                tags: string[];
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                cess: Decimal;
                description: string | null;
                isActive: boolean;
                unit: string;
                mrp: Decimal | null;
                hsnCode: string | null;
                gstRate: Decimal;
                category: string;
                subCategory: string | null;
                sku: string | null;
                barcode: string | null;
                price: Decimal;
                cost: Decimal | null;
                wholesalePrice: Decimal | null;
                priceTier2: Decimal | null;
                priceTier3: Decimal | null;
                baseUnit: string | null;
                baseUnitQuantity: Decimal | null;
                stock: number;
                minStock: number;
                maxStock: number | null;
                location: string | null;
                isGstExempt: boolean;
                trackBatches: boolean;
                trackSerialNumbers: boolean;
                hasVariants: boolean;
                imageUrl: string | null;
                imageUrls: string[];
                preferredSupplier: string | null;
                supplierId: string | null;
                isFeatured: boolean;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            serialNumbers: string[];
            subtotal: Decimal;
            discount: Decimal;
            total: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            invoiceId: string;
            productId: string | null;
            productName: string;
            variantAttributes: import("@prisma/client/runtime/library").JsonValue | null;
            quantity: Decimal;
            unit: string;
            unitPrice: Decimal;
            mrp: Decimal | null;
            hsnCode: string | null;
            gstRate: Decimal;
            variantId: string | null;
            batchId: string | null;
        })[];
    } & {
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
    })[]>;
    /**
     * Get all invoices for a customer.
     */
    getCustomerInvoices(customerId: string, limit?: number): Promise<({
        items: ({
            product: {
                tenantId: string;
                id: string;
                name: string;
                tags: string[];
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                cess: Decimal;
                description: string | null;
                isActive: boolean;
                unit: string;
                mrp: Decimal | null;
                hsnCode: string | null;
                gstRate: Decimal;
                category: string;
                subCategory: string | null;
                sku: string | null;
                barcode: string | null;
                price: Decimal;
                cost: Decimal | null;
                wholesalePrice: Decimal | null;
                priceTier2: Decimal | null;
                priceTier3: Decimal | null;
                baseUnit: string | null;
                baseUnitQuantity: Decimal | null;
                stock: number;
                minStock: number;
                maxStock: number | null;
                location: string | null;
                isGstExempt: boolean;
                trackBatches: boolean;
                trackSerialNumbers: boolean;
                hasVariants: boolean;
                imageUrl: string | null;
                imageUrls: string[];
                preferredSupplier: string | null;
                supplierId: string | null;
                isFeatured: boolean;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            serialNumbers: string[];
            subtotal: Decimal;
            discount: Decimal;
            total: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            invoiceId: string;
            productId: string | null;
            productName: string;
            variantAttributes: import("@prisma/client/runtime/library").JsonValue | null;
            quantity: Decimal;
            unit: string;
            unitPrice: Decimal;
            mrp: Decimal | null;
            hsnCode: string | null;
            gstRate: Decimal;
            variantId: string | null;
            batchId: string | null;
        })[];
    } & {
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
    })[]>;
    /**
     * Get the most recent non-cancelled invoice for a customer.
     */
    getLastInvoice(customerId: string): Promise<({
        items: ({
            product: {
                tenantId: string;
                id: string;
                name: string;
                tags: string[];
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                cess: Decimal;
                description: string | null;
                isActive: boolean;
                unit: string;
                mrp: Decimal | null;
                hsnCode: string | null;
                gstRate: Decimal;
                category: string;
                subCategory: string | null;
                sku: string | null;
                barcode: string | null;
                price: Decimal;
                cost: Decimal | null;
                wholesalePrice: Decimal | null;
                priceTier2: Decimal | null;
                priceTier3: Decimal | null;
                baseUnit: string | null;
                baseUnitQuantity: Decimal | null;
                stock: number;
                minStock: number;
                maxStock: number | null;
                location: string | null;
                isGstExempt: boolean;
                trackBatches: boolean;
                trackSerialNumbers: boolean;
                hasVariants: boolean;
                imageUrl: string | null;
                imageUrls: string[];
                preferredSupplier: string | null;
                supplierId: string | null;
                isFeatured: boolean;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            serialNumbers: string[];
            subtotal: Decimal;
            discount: Decimal;
            total: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            invoiceId: string;
            productId: string | null;
            productName: string;
            variantAttributes: import("@prisma/client/runtime/library").JsonValue | null;
            quantity: Decimal;
            unit: string;
            unitPrice: Decimal;
            mrp: Decimal | null;
            hsnCode: string | null;
            gstRate: Decimal;
            variantId: string | null;
            batchId: string | null;
        })[];
    } & {
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
    }) | null>;
    /**
     * Persist the MinIO object key (and presigned URL) on an invoice record.
     */
    savePdfUrl(invoiceId: string, pdfObjectKey: string, pdfUrl: string): Promise<void>;
    /**
     * Generate invoice PDF (with UPI QR), upload to MinIO, and send email.
     * Non-fatal at every stage — never blocks the invoice flow.
     * Call fire-and-forget: dispatchInvoicePdfEmail(id).catch(() => {});
     */
    dispatchInvoicePdfEmail(invoiceId: string): Promise<void>;
    /**
     * Get a single invoice with items and customer.
     */
    getInvoiceById(invoiceId: string): Promise<({
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
        } | null;
        items: ({
            product: {
                tenantId: string;
                id: string;
                name: string;
                tags: string[];
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                cess: Decimal;
                description: string | null;
                isActive: boolean;
                unit: string;
                mrp: Decimal | null;
                hsnCode: string | null;
                gstRate: Decimal;
                category: string;
                subCategory: string | null;
                sku: string | null;
                barcode: string | null;
                price: Decimal;
                cost: Decimal | null;
                wholesalePrice: Decimal | null;
                priceTier2: Decimal | null;
                priceTier3: Decimal | null;
                baseUnit: string | null;
                baseUnitQuantity: Decimal | null;
                stock: number;
                minStock: number;
                maxStock: number | null;
                location: string | null;
                isGstExempt: boolean;
                trackBatches: boolean;
                trackSerialNumbers: boolean;
                hasVariants: boolean;
                imageUrl: string | null;
                imageUrls: string[];
                preferredSupplier: string | null;
                supplierId: string | null;
                isFeatured: boolean;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            serialNumbers: string[];
            subtotal: Decimal;
            discount: Decimal;
            total: Decimal;
            tax: Decimal;
            cgst: Decimal;
            sgst: Decimal;
            igst: Decimal;
            cess: Decimal;
            invoiceId: string;
            productId: string | null;
            productName: string;
            variantAttributes: import("@prisma/client/runtime/library").JsonValue | null;
            quantity: Decimal;
            unit: string;
            unitPrice: Decimal;
            mrp: Decimal | null;
            hsnCode: string | null;
            gstRate: Decimal;
            variantId: string | null;
            batchId: string | null;
        })[];
    } & {
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
    }) | null>;
    /**
     * Top-selling products by units sold — aggregates InvoiceItem quantities
     * for the last N days for this tenant.
     */
    getTopSelling(limit?: number, days?: number): Promise<Array<{
        productId: string;
        productName: string;
        unit: string;
        category: string;
        price: string;
        stock: number;
        soldQty: number;
    }>>;
    /**
     * Date-range sales summary (used for period reports: This Week / This Month / Custom).
     */
    getSummaryRange(from: Date, to: Date): Promise<{
        from: string;
        to: string;
        invoiceCount: number;
        totalSales: number;
        totalPayments: number;
        cashPayments: number;
        upiPayments: number;
        pendingAmount: number;
        extraPayments: number;
    }>;
    /**
     * Daily sales summary.
     */
    getDailySummary(date?: Date): Promise<{
        date: Date;
        invoiceCount: number;
        totalSales: number;
        totalPayments: number;
        cashPayments: number;
        upiPayments: number;
        pendingAmount: number;
        extraPayments: number;
    }>;
    /**
     * Returns the most recent non-cancelled invoice for a customer with its items.
     * Used for "Repeat Last Bill" functionality.
     */
    getLastOrder(customerId: string): Promise<({
        items: {
            productName: string;
            quantity: Decimal;
            unitPrice: Decimal;
        }[];
    } & {
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
    }) | null>;
}
export declare const invoiceService: InvoiceService;
export {};
//# sourceMappingURL=invoice.service.d.ts.map