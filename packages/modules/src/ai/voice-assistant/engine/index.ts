/**
 * ai/voice-assistant/engine
 *
 * Feature: core intent→handler dispatch for the voice assistant.
 * Owner: ai domain (isolation rule: no domain state, contracts only)
 * Source of truth: modules/voice/engine.ts + modules/voice/engine/
 *
 * AI Isolation Rule: this module may call sales/purchases/crm/finance via
 * their public contracts only. Never directly imports Prisma or Redis.
 */
export * from "../../../modules/voice/engine";
