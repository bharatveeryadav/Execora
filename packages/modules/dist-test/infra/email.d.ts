interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
    }>;
}
declare class EmailService {
    private transporter;
    private config;
    private enabled;
    /**
     * Initialize email service with configuration
     */
    initialize(): Promise<void>;
    /**
     * Build email configuration from environment variables
     */
    private buildConfig;
    /**
     * Send email
     */
    sendEmail(options: SendEmailOptions): Promise<boolean>;
    /**
     * Send OTP email for deletion confirmation
     */
    sendDeletionOtpEmail(emailAddress: string, customerName: string, otp: string): Promise<boolean>;
    /**
     * Send admin-only deletion OTP email
     */
    sendAdminDeletionOtpEmail(adminEmail: string, customerName: string, otp: string): Promise<boolean>;
    /**
     * Send confirmation email after successful deletion
     */
    sendDeletionConfirmationEmail(emailAddress: string, customerName: string, recordCount: number): Promise<boolean>;
    /**
     * Send payment reminder email to a customer
     */
    sendPaymentReminderEmail(to: string, customerName: string, amount: number, shopName?: string): Promise<boolean>;
    /**
     * Send invoice email to a customer after purchase.
     * Pass pdfBuffer to attach the PDF and pdfUrl to include a download link.
     */
    sendInvoiceEmail(to: string, customerName: string, invoiceId: string, items: Array<{
        product: string;
        quantity: number;
        price: number;
        total: number;
    }>, grandTotal: number, shopName?: string, pdfBuffer?: Buffer, pdfUrl?: string, invoiceNo?: string): Promise<boolean>;
    /**
     * Send daily business summary email to the shop owner
     */
    sendDailySummaryEmail(to: string, summary: {
        date: string;
        totalSales: number;
        invoiceCount: number;
        paymentsReceived: number;
        pendingAmount: number;
        newCustomers: number;
    }): Promise<boolean>;
    /**
     * Check if email service is enabled
     */
    isEnabled(): boolean;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=email.d.ts.map