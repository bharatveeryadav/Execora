/**
 * engine.advanced.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-level tests for BusinessEngine.execute() covering ALL 27 intent
 * types, multi-turn flows (draft → confirm → email), edge cases, and error
 * propagation.
 *
 * Test strategy:
 *  • All external dependencies (DB, Redis, email) are monkey-patched per test.
 *  • Each test collects RestoreFn[] and restores in a finally block — no leaks.
 *  • Assertions target both success flags AND the exact messages/data shapes
 *    that downstream TTS and UI rely on.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export {};
//# sourceMappingURL=engine.advanced.test.d.ts.map