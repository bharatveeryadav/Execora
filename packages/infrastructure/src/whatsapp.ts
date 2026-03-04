/**
 * WhatsApp Cloud API client — infrastructure layer.
 *
 * Moved here from src/integrations/whatsapp.ts so that workers.ts can
 * import it without crossing the infrastructure→modules boundary.
 * src/integrations/whatsapp.ts is now a thin re-export shim.
 */
import axios from 'axios';
import { config } from './config';
import { logger } from './logger';

export interface WhatsAppMessageResponse {
	messageId: string;
	success: boolean;
	error?: string;
}

class WhatsAppService {
	private baseUrl: string;
	private accessToken: string;
	private phoneNumberId: string;

	constructor() {
		this.baseUrl = `https://graph.facebook.com/${config.whatsapp.apiVersion}`;
		this.accessToken = config.whatsapp.accessToken;
		this.phoneNumberId = config.whatsapp.phoneNumberId;
	}

	isConfigured(): boolean {
		return !!(this.accessToken && this.phoneNumberId);
	}

	async sendTextMessage(phone: string, message: string): Promise<WhatsAppMessageResponse> {
		if (!this.isConfigured()) {
			return { messageId: '', success: false, error: 'WhatsApp not configured' };
		}
		try {
			const formattedPhone = phone.replace(/[+\s-]/g, '');
			const response = await axios.post(
				`${this.baseUrl}/${this.phoneNumberId}/messages`,
				{
					messaging_product: 'whatsapp',
					to: formattedPhone,
					type: 'text',
					text: { body: message },
				},
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						'Content-Type': 'application/json',
					},
				}
			);
			logger.info({ phone, messageId: response.data.messages[0].id }, 'WhatsApp message sent');
			return { messageId: response.data.messages[0].id, success: true };
		} catch (error: any) {
			logger.error({ error, phone }, 'WhatsApp send message failed');
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
	async sendDocumentMessage(
		phone: string,
		documentUrl: string,
		caption: string,
		filename: string
	): Promise<WhatsAppMessageResponse> {
		if (!this.isConfigured()) {
			return { messageId: '', success: false, error: 'WhatsApp not configured' };
		}
		try {
			const formattedPhone = phone.replace(/[+\s-]/g, '');
			const response = await axios.post(
				`${this.baseUrl}/${this.phoneNumberId}/messages`,
				{
					messaging_product: 'whatsapp',
					to: formattedPhone,
					type: 'document',
					document: {
						link: documentUrl,
						caption,
						filename,
					},
				},
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						'Content-Type': 'application/json',
					},
				}
			);
			logger.info({ phone, filename, messageId: response.data.messages[0].id }, 'WhatsApp document sent');
			return { messageId: response.data.messages[0].id, success: true };
		} catch (error: any) {
			logger.error({ error, phone, filename }, 'WhatsApp document send failed');
			return {
				messageId: '',
				success: false,
				error: error.response?.data?.error?.message || error.message,
			};
		}
	}

	async sendTemplateMessage(
		phone: string,
		templateName: string,
		parameters: string[]
	): Promise<WhatsAppMessageResponse> {
		if (!this.isConfigured()) {
			return { messageId: '', success: false, error: 'WhatsApp not configured' };
		}
		try {
			const formattedPhone = phone.replace(/[+\s-]/g, '');
			const response = await axios.post(
				`${this.baseUrl}/${this.phoneNumberId}/messages`,
				{
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
				},
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						'Content-Type': 'application/json',
					},
				}
			);
			logger.info(
				{ phone, messageId: response.data.messages[0].id, template: templateName },
				'WhatsApp template sent'
			);
			return { messageId: response.data.messages[0].id, success: true };
		} catch (error: any) {
			logger.error({ error, phone, template: templateName }, 'WhatsApp template send failed');
			return {
				messageId: '',
				success: false,
				error: error.response?.data?.error?.message || error.message,
			};
		}
	}

	validateWebhookToken(token: string): boolean {
		return token === config.whatsapp.webhookVerifyToken;
	}

	async processWebhookEvent(event: any): Promise<void> {
		try {
			const value = event.entry?.[0]?.changes?.[0]?.value;
			if (!value) return;

			if (value.statuses) {
				for (const status of value.statuses) {
					logger.info(
						{ messageId: status.id, status: status.status, timestamp: status.timestamp },
						'WhatsApp status update received'
					);
				}
			}
			if (value.messages) {
				for (const msg of value.messages) {
					logger.info({ from: msg.from, messageId: msg.id, type: msg.type }, 'WhatsApp incoming message');
				}
			}
		} catch (error) {
			logger.error({ error, event }, 'WhatsApp webhook processing failed');
		}
	}

	formatPaymentReminder(customerName: string, amount: number): string {
		return `Namaste ${customerName} ji,\n\n₹${amount} payment pending hai. Kripya payment kar dein. 🙏\n\nDhanyavad`;
	}
}

export const whatsappService = new WhatsAppService();
