"use strict";
/**
 * Integrations Domain
 *
 * Wraps all third-party service adapters behind uniform contracts.
 * No business logic — only adapter fan-out and provider selection.
 *
 * Sub-domains:
 *  - llm: OpenAI / Groq / Ollama
 *  - stt: Deepgram / ElevenLabs / Whisper
 *  - tts: ElevenLabs / OpenAI / Piper
 *  - notifications: WhatsApp / Email
 *
 * Dependency rule: no imports from any business domain.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./llm"), exports);
__exportStar(require("./stt"), exports);
__exportStar(require("./tts"), exports);
__exportStar(require("./notifications"), exports);
__exportStar(require("./payment"), exports);
__exportStar(require("./whatsapp"), exports);
__exportStar(require("./sms"), exports);
__exportStar(require("./hardware"), exports);
__exportStar(require("./ecommerce"), exports);
__exportStar(require("./taxone"), exports);
//# sourceMappingURL=index.js.map