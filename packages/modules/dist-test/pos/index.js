"use strict";
/**
 * POS (Point of Sale) Module
 *
 * Covers: draft bill queue, voice-activated billing, conversation memory,
 * real-time task queue for multi-intent utterances, and response templating.
 *
 * Surfaces:
 *  - draft.*              → staging layer before invoice commit
 *  - conversationMemory   → per-customer context across voice turns
 *  - businessEngine       → intent router (STT output → invoice action)
 *  - voiceSessionService  → WebSocket session lifecycle
 *  - taskQueueService     → ordered processing of chained tasks
 *  - responseTemplateService → locale-aware reply generation
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
// ── Draft staging records (in-progress bills) ─────────────────────────────────
__exportStar(require("../operations/drafts/draft"), exports);
// ── Voice billing engine ──────────────────────────────────────────────────────
__exportStar(require("../modules/voice/conversation"), exports);
__exportStar(require("../modules/voice/engine"), exports);
__exportStar(require("../modules/voice/session.service"), exports);
__exportStar(require("../modules/voice/task-queue"), exports);
__exportStar(require("../modules/voice/response-template"), exports);
//# sourceMappingURL=index.js.map