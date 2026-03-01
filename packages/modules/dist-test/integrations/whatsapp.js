"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
// Re-export shim — implementation lives in src/infrastructure/whatsapp.ts
// so that workers.ts can import it without crossing the infrastructure→modules boundary.
var infrastructure_1 = require("@execora/infrastructure");
Object.defineProperty(exports, "whatsappService", { enumerable: true, get: function () { return infrastructure_1.whatsappService; } });
//# sourceMappingURL=whatsapp.js.map