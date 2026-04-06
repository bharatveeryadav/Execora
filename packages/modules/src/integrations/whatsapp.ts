// Re-export shim — implementation lives in src/infrastructure/whatsapp.ts
// so that workers.ts can import it without crossing the infrastructure→modules boundary.
export { whatsappService, WhatsAppMessageResponse } from '@execora/core';
