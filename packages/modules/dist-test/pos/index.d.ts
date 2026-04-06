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
export * from "../operations/drafts/draft";
export * from "../modules/voice/conversation";
export * from "../modules/voice/engine";
export * from "../modules/voice/session.service";
export * from "../modules/voice/task-queue";
export * from "../modules/voice/response-template";
//# sourceMappingURL=index.d.ts.map