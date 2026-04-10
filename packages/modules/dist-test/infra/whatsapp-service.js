"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
/**
 * WhatsApp Cloud API client — infrastructure layer.
 *
 * Moved here from src/integrations/whatsapp.ts so that workers.ts can
 * import it without crossing the infrastructure→modules boundary.
 * src/integrations/whatsapp.ts is now a thin re-export shim.
 */
const axios_1 = __importDefault(require("axios"));
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
class WhatsAppService {
    baseUrl;
    accessToken;
    phoneNumberId;
    constructor() {
        this.baseUrl = `https://graph.facebook.com/${core_1.config.whatsapp.apiVersion}`;
        this.accessToken = core_1.config.whatsapp.accessToken;
        this.phoneNumberId = core_1.config.whatsapp.phoneNumberId;
    }
    isConfigured() {
        return !!(this.accessToken && this.phoneNumberId);
    }
    async sendTextMessage(phone, message) {
        if (!this.isConfigured()) {
            return { messageId: '', success: false, error: 'WhatsApp not configured' };
        }
        try {
            const formattedPhone = phone.replace(/[+\s-]/g, '');
            const response = await axios_1.default.post(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: { body: message },
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            core_2.logger.info({ phone, messageId: response.data.messages[0].id }, 'WhatsApp message sent');
            return { messageId: response.data.messages[0].id, success: true };
        }
        catch (error) {
            core_2.logger.error({ error, phone }, 'WhatsApp send message failed');
            return {
                messageId: '',
                success: false,
                error: error.response?.data?.error?.message || error.message,
            };
        }
    }
    /**
     * Send a document (PDF) message via WhatsApp Cloud API.
     * Uses the document message type with a publicly-accessible URL.
     */
    async sendDocumentMessage(phone, documentUrl, caption, filename) {
        if (!this.isConfigured()) {
            return { messageId: '', success: false, error: 'WhatsApp not configured' };
        }
        try {
            const formattedPhone = phone.replace(/[+\s-]/g, '');
            const response = await axios_1.default.post(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'document',
                document: {
                    link: documentUrl,
                    caption,
                    filename,
                },
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            core_2.logger.info({ phone, filename, messageId: response.data.messages[0].id }, 'WhatsApp document sent');
            return { messageId: response.data.messages[0].id, success: true };
        }
        catch (error) {
            core_2.logger.error({ error, phone, filename }, 'WhatsApp document send failed');
            return {
                messageId: '',
                success: false,
                error: error.response?.data?.error?.message || error.message,
            };
        }
    }
    async sendTemplateMessage(phone, templateName, parameters) {
        if (!this.isConfigured()) {
            return { messageId: '', success: false, error: 'WhatsApp not configured' };
        }
        try {
            const formattedPhone = phone.replace(/[+\s-]/g, '');
            const response = await axios_1.default.post(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'hi' },
                    components: [
                        {
                            type: 'body',
                            parameters: parameters.map((p) => ({ type: 'text', text: p })),
                        },
                    ],
                },
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            core_2.logger.info({ phone, messageId: response.data.messages[0].id, template: templateName }, 'WhatsApp template sent');
            return { messageId: response.data.messages[0].id, success: true };
        }
        catch (error) {
            core_2.logger.error({ error, phone, template: templateName }, 'WhatsApp template send failed');
            return {
                messageId: '',
                success: false,
                error: error.response?.data?.error?.message || error.message,
            };
        }
    }
    validateWebhookToken(token) {
        return token === core_1.config.whatsapp.webhookVerifyToken;
    }
    async processWebhookEvent(event) {
        try {
            const value = event.entry?.[0]?.changes?.[0]?.value;
            if (!value)
                return;
            if (value.statuses) {
                for (const status of value.statuses) {
                    core_2.logger.info({ messageId: status.id, status: status.status, timestamp: status.timestamp }, 'WhatsApp status update received');
                }
            }
            if (value.messages) {
                for (const msg of value.messages) {
                    core_2.logger.info({ from: msg.from, messageId: msg.id, type: msg.type }, 'WhatsApp incoming message');
                }
            }
        }
        catch (error) {
            core_2.logger.error({ error, event }, 'WhatsApp webhook processing failed');
        }
    }
    formatPaymentReminder(customerName, amount) {
        return `Namaste ${customerName} ji,\n\n₹${amount} payment pending hai. Kripya payment kar dein. 🙏\n\nDhanyavad`;
    }
}
exports.whatsappService = new WhatsAppService();
//# sourceMappingURL=whatsapp-service.js.map