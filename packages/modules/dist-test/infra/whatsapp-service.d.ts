export interface WhatsAppMessageResponse {
    messageId: string;
    success: boolean;
    error?: string;
}
declare class WhatsAppService {
    private baseUrl;
    private accessToken;
    private phoneNumberId;
    constructor();
    isConfigured(): boolean;
    sendTextMessage(phone: string, message: string): Promise<WhatsAppMessageResponse>;
    /**
     * Send a document (PDF) message via WhatsApp Cloud API.
     * Uses the document message type with a publicly-accessible URL.
     */
    sendDocumentMessage(phone: string, documentUrl: string, caption: string, filename: string): Promise<WhatsAppMessageResponse>;
    sendTemplateMessage(phone: string, templateName: string, parameters: string[]): Promise<WhatsAppMessageResponse>;
    validateWebhookToken(token: string): boolean;
    processWebhookEvent(event: any): Promise<void>;
    formatPaymentReminder(customerName: string, amount: number): string;
}
export declare const whatsappService: WhatsAppService;
export {};
//# sourceMappingURL=whatsapp-service.d.ts.map