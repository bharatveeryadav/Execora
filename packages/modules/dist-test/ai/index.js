"use strict";
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
// ── Voice assistant ───────────────────────────────────────────────────────────
__exportStar(require("./voice-assistant/engine"), exports);
__exportStar(require("./voice-assistant/conversation"), exports);
__exportStar(require("./voice-assistant/session"), exports);
__exportStar(require("./voice-assistant/task-queue"), exports);
__exportStar(require("./voice-assistant/response-template"), exports);
// ── AI insights ───────────────────────────────────────────────────────────────
__exportStar(require("./insights"), exports);
//# sourceMappingURL=index.js.map