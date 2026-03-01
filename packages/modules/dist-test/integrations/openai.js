"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmService = exports.openaiService = void 0;
/**
 * @deprecated Import directly from 'src/providers/llm' instead.
 * This re-export shim exists for backward compatibility — all consumers of
 * `openaiService` continue to work without any changes.
 */
var llm_1 = require("../providers/llm");
Object.defineProperty(exports, "openaiService", { enumerable: true, get: function () { return llm_1.llmService; } });
Object.defineProperty(exports, "llmService", { enumerable: true, get: function () { return llm_1.llmService; } });
//# sourceMappingURL=openai.js.map