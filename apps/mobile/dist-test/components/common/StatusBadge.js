"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBadge = StatusBadge;
/**
 * StatusBadge — paid/pending/partial/cancelled/draft (Sprint 2).
 */
const react_1 = __importDefault(require("react"));
const Badge_1 = require("../ui/Badge");
const statusVariant = {
    paid: "success",
    pending: "warning",
    partial: "info",
    cancelled: "danger",
    draft: "muted",
};
function StatusBadge({ status }) {
    const s = (status ?? "").toLowerCase();
    const variant = statusVariant[s] ?? "muted";
    return react_1.default.createElement(Badge_1.Badge, { variant: variant }, s || "—");
}
//# sourceMappingURL=StatusBadge.js.map