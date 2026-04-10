"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
// Re-export shim — implementation lives in src/infrastructure/whatsapp.ts
// so that workers.ts can import it without crossing the infrastructure→modules boundary.
var whatsapp_service_1 = require("../infra/whatsapp-service");
Object.defineProperty(exports, "whatsappService", { enumerable: true, get: function () { return whatsapp_service_1.whatsappService; } });
//# sourceMappingURL=whatsapp.js.map