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
export async function sendViaMsg91(msg: SmsMessage): Promise<SmsSendResult> {
  const key = process.env["MSG91_AUTH_KEY"];
  if (!key) return { success: false, error: "MSG91_AUTH_KEY not set" };
  return { success: false, error: "MSG91 integration not fully implemented" };
}
/** Fast2SMS stub — configure FAST2SMS_API_KEY in env */
export async function sendViaFast2Sms(msg: SmsMessage): Promise<SmsSendResult> {
  const key = process.env["FAST2SMS_API_KEY"];
  if (!key) return { success: false, error: "FAST2SMS_API_KEY not set" };
  return { success: false, error: "Fast2SMS integration not fully implemented" };
}
