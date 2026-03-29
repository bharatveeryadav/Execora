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

import test from "node:test";
import assert from "node:assert/strict";
import { cn, toFloat } from "../lib/utils";

// ── cn (classname combiner) ───────────────────────────────────────────────────

test("cn combines non-falsy classes", () => {
  assert.equal(cn("a", "b", "c"), "a b c");
});

test("cn filters out falsy values", () => {
  assert.equal(cn("a", undefined, null, false, "b"), "a b");
});

test("cn returns empty string when all falsy", () => {
  assert.equal(cn(undefined, null, false), "");
});

test("cn handles single class", () => {
  assert.equal(cn("bg-primary"), "bg-primary");
});

// ── toFloat ───────────────────────────────────────────────────────────────────

test("toFloat converts numeric string to number", () => {
  assert.equal(toFloat("3.14"), 3.14);
});

test("toFloat converts integer string", () => {
  assert.equal(toFloat("100"), 100);
});

test("toFloat returns 0 for non-numeric string", () => {
  assert.equal(toFloat("abc"), 0);
});

test("toFloat returns 0 for null", () => {
  assert.equal(toFloat(null), 0);
});

test("toFloat returns 0 for undefined", () => {
  assert.equal(toFloat(undefined), 0);
});

test("toFloat passes through number", () => {
  assert.equal(toFloat(42), 42);
});

test("toFloat handles negative numbers", () => {
  assert.equal(toFloat("-15.5"), -15.5);
});
