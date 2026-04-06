"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
// Re-export shim — implementation lives in src/infrastructure/whatsapp.ts
// so that workers.ts can import it without crossing the infrastructure→modules boundary.
var core_1 = require("@execora/core");
Object.defineProperty(exports, "whatsappService", { enumerable: true, get: function () { return core_1.whatsappService; } });
//# sourceMappingURL=whatsapp.js.map