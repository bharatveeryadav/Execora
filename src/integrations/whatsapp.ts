import axios from 'axios';
import { config } from '../config';
import { logger } from '../infrastructure/logger';

interface WhatsAppMessageResponse {
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

  /**
   * Send text message via WhatsApp
   */
  async sendTextMessage(
    phone: string,
    message: string
  ): Promise<WhatsAppMessageResponse> {
    try {
      // Format phone number (remove + and spaces)
      const formattedPhone = phone.replace(/[+\s-]/g, '');

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info({ phone, messageId: response.data.messages[0].id }, 'WhatsApp message sent');

      return {
        messageId: response.data.messages[0].id,
        success: true,
      };
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
   * Send template message via WhatsApp
   */
  async sendTemplateMessage(
    phone: string,
    templateName: string,
    parameters: string[]
  ): Promise<WhatsAppMessageResponse> {
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
            language: {
              code: 'hi',
            },
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
        'WhatsApp template message sent'
      );

      return {
        messageId: response.data.messages[0].id,
        success: true,
      };
    } catch (error: any) {
      logger.error({ error, phone, template: templateName }, 'WhatsApp send template failed');

      return {
        messageId: '',
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Validate webhook verification token
   */
  validateWebhookToken(token: string): boolean {
    return token === config.whatsapp.webhookVerifyToken;
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: any): Promise<void> {
    try {
      const entry = event.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) return;

      // Handle status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          logger.info(
            {
              messageId: status.id,
              status: status.status,
              timestamp: status.timestamp,
            },
            'WhatsApp status update received'
          );

          // Update message status in database will be handled by the webhook route
        }
      }

      // Handle incoming messages (if needed)
      if (value.messages) {
        for (const message of value.messages) {
          logger.info(
            {
              from: message.from,
              messageId: message.id,
              type: message.type,
            },
            'WhatsApp incoming message received'
          );
        }
      }
    } catch (error) {
      logger.error({ error, event }, 'WhatsApp webhook processing failed');
    }
  }

  /**
   * Format payment reminder message
   */
  formatPaymentReminder(customerName: string, amount: number): string {
    return `Namaste ${customerName} ji,

₹${amount} payment pending hai. Kripya payment kar dein. 🙏

Dhanyavad`;
  }
}

export const whatsappService = new WhatsAppService();
