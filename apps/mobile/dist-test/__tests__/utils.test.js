"use strict";
/**
 * lib/utils — unit tests
 *
 * Tests formatting helpers used across mobile screens.
 * Runner: Node.js built-in test runner (node:test + assert/strict)
 *
 * Compile + run:
 *   node_modules/.bin/tsc -p apps/mobile/tsconfig.test.json
 *   timeout 15 node --test apps/mobile/dist-test/src/__tests__/utils.test.js
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const utils_1 = require("../lib/utils");
// ── cn (classname combiner) ───────────────────────────────────────────────────
(0, node_test_1.default)("cn combines non-falsy classes", () => {
    strict_1.default.equal((0, utils_1.cn)("a", "b", "c"), "a b c");
});
(0, node_test_1.default)("cn filters out falsy values", () => {
    strict_1.default.equal((0, utils_1.cn)("a", undefined, null, false, "b"), "a b");
});
(0, node_test_1.default)("cn returns empty string when all falsy", () => {
    strict_1.default.equal((0, utils_1.cn)(undefined, null, false), "");
});
(0, node_test_1.default)("cn handles single class", () => {
    strict_1.default.equal((0, utils_1.cn)("bg-primary"), "bg-primary");
});
// ── toFloat ───────────────────────────────────────────────────────────────────
(0, node_test_1.default)("toFloat converts numeric string to number", () => {
    strict_1.default.equal((0, utils_1.toFloat)("3.14"), 3.14);
});
(0, node_test_1.default)("toFloat converts integer string", () => {
    strict_1.default.equal((0, utils_1.toFloat)("100"), 100);
});
(0, node_test_1.default)("toFloat returns 0 for non-numeric string", () => {
    strict_1.default.equal((0, utils_1.toFloat)("abc"), 0);
});
(0, node_test_1.default)("toFloat returns 0 for null", () => {
    strict_1.default.equal((0, utils_1.toFloat)(null), 0);
});
(0, node_test_1.default)("toFloat returns 0 for undefined", () => {
    strict_1.default.equal((0, utils_1.toFloat)(undefined), 0);
});
(0, node_test_1.default)("toFloat passes through number", () => {
    strict_1.default.equal((0, utils_1.toFloat)(42), 42);
});
(0, node_test_1.default)("toFloat handles negative numbers", () => {
    strict_1.default.equal((0, utils_1.toFloat)("-15.5"), -15.5);
});
//# sourceMappingURL=utils.test.js.map