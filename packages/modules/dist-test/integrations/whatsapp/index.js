"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
exports.sendTemplateMessage = sendTemplateMessage;
/**
 * integrations/whatsapp
 *
 * Feature: WhatsApp messaging integrations — primary provider plus alternative gateways.
 * Source of truth: infra/whatsapp-service.ts (WhatsApp Cloud API)
 */
var whatsapp_service_1 = require("../../infra/whatsapp-service");
Object.defineProperty(exports, "whatsappService", { enumerable: true, get: function () { return whatsapp_service_1.whatsappService; } });
async function sendTemplateMessage(_to, _template) {
    return { success: false };
}
//# sourceMappingURL=index.js.map