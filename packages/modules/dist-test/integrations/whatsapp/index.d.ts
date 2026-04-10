/**
 * integrations/whatsapp
 *
 * Feature: WhatsApp messaging integrations — primary provider plus alternative gateways.
 * Source of truth: infra/whatsapp-service.ts (WhatsApp Cloud API)
 */
export { whatsappService } from "../../infra/whatsapp-service";
export type { WhatsAppMessageResponse } from "../../infra/whatsapp-service";
/** Message template contract for WhatsApp Business Platform templates */
export interface WhatsAppTemplate {
    templateName: string;
    language: string;
    components: {
        type: string;
        parameters: {
            type: string;
            text?: string;
        }[];
    }[];
}
export declare function sendTemplateMessage(_to: string, _template: WhatsAppTemplate): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=index.d.ts.map