/**
 * AI Domain
 *
 * Isolated domain — owns the voice assistant runtime, DB-driven analytics,
 * and async AI task dispatch. No state ownership: all persistence goes through
 * domain contracts in sales / finance / crm / inventory.
 *
 * AI Isolation Rule (from 02-domain-modules.md):
 *   - ai/ is a separate isolated domain
 *   - AI modules never own state
 *   - Always import via public contracts, never internal domain paths
 *
 * Sub-domains:
 *  - voice-assistant: engine, conversation, session, task-queue, response-template
 *  - insights: replenishment suggestions, anomaly detection, predictive reminders
 */
export * from "./voice-assistant/engine";
export * from "./voice-assistant/conversation";
export * from "./voice-assistant/session";
export * from "./voice-assistant/task-queue";
export * from "./voice-assistant/response-template";
export * from "./insights";
//# sourceMappingURL=index.d.ts.map