/**
 * integrations/sms
 *
 * Feature: SMS gateway integrations for OTP + transactional messages.
 * Supported providers: MSG91, Fast2SMS (stubs — configure env vars).
 */
export interface SmsMessage {
    to: string;
    message: string;
    senderId?: string;
}
export interface SmsSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
/** MSG91 stub — configure MSG91_AUTH_KEY in env */
export declare function sendViaMsg91(msg: SmsMessage): Promise<SmsSendResult>;
/** Fast2SMS stub — configure FAST2SMS_API_KEY in env */
export declare function sendViaFast2Sms(msg: SmsMessage): Promise<SmsSendResult>;
//# sourceMappingURL=index.d.ts.map