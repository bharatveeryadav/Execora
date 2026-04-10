/**
 * crm/communication/history
 *
 * Feature: full history of all outbound communications to a party — WhatsApp,
 * SMS, email, reminders — with delivery status.
 * Stub — requires a communication_log table in schema (⏳).
 */
export type CommunicationChannel = "whatsapp" | "sms" | "email" | "push" | "voice";
export type CommunicationStatus = "queued" | "sent" | "delivered" | "failed" | "read";
export interface CommunicationLogEntry {
    id: string;
    tenantId: string;
    partyId: string;
    partyType: "customer" | "supplier";
    channel: CommunicationChannel;
    status: CommunicationStatus;
    template?: string;
    message?: string;
    sentAt: Date;
    deliveredAt?: Date;
    readAt?: Date;
    meta?: Record<string, unknown>;
}
export declare function listCommunicationHistory(_tenantId: string, _partyId: string, _channel?: CommunicationChannel): Promise<CommunicationLogEntry[]>;
//# sourceMappingURL=history.d.ts.map