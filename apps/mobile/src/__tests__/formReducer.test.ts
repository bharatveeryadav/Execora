/**
 * formReducer — unit tests
 *
 * Tests the pure reducer logic for BillingScreen form state.
 * Runner: Node.js built-in test runner (node:test + assert/strict)
 *
 * Compile + run:
 *   node_modules/.bin/tsc -p apps/mobile/tsconfig.test.json
 *   timeout 15 node --test apps/mobile/dist-test/src/__tests__/formReducer.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  formReducer,
  getInitialFormState,
  type FormState,
} from "../lib/formReducer";

// ── helpers ──────────────────────────────────────────────────────────────────

function fresh(): FormState {
  return getInitialFormState();
}

// ── ADD_ITEM ──────────────────────────────────────────────────────────────────

test("ADD_ITEM adds a blank item with incremented id", () => {
  const s0 = fresh();
  assert.equal(s0.items.length, 1);

  const s1 = formReducer(s0, { type: "ADD_ITEM" });
  assert.equal(s1.items.length, 2);
  assert.equal(s1.items[1]!.name, "");
  assert.equal(s1.items[1]!.qty, "1");
  assert.ok(s1.items[1]!.id > s1.items[0]!.id);
});

// ── UPDATE_ITEM ───────────────────────────────────────────────────────────────

test("UPDATE_ITEM patches the correct item and recomputes amount", () => {
  const s0 = fresh();
  const id = s0.items[0]!.id;

  const s1 = formReducer(s0, {
    type: "UPDATE_ITEM",
    id,
    patch: { name: "Rice", rate: "50", qty: "2" },
  });

  const item = s1.items.find((i) => i.id === id)!;
  assert.equal(item.name, "Rice");
  assert.equal(item.rate, "50");
  assert.equal(item.qty, "2");
  assert.equal(item.amount, 100); // 50 * 2
});

test("UPDATE_ITEM does not modify other items", () => {
  const s0 = formReducer(fresh(), { type: "ADD_ITEM" });
  const [first, second] = s0.items;
  assert.ok(first && second);

  const s1 = formReducer(s0, {
    type: "UPDATE_ITEM",
    id: second.id,
    patch: { name: "Sugar" },
  });

  assert.equal(s1.items[0]!.name, first.name); // unchanged
  assert.equal(s1.items[1]!.name, "Sugar");
});

// ── REMOVE_ITEM ───────────────────────────────────────────────────────────────

test("REMOVE_ITEM removes an item when more than one exists", () => {
  const s0 = formReducer(fresh(), { type: "ADD_ITEM" });
  const id = s0.items[0]!.id;

  const s1 = formReducer(s0, { type: "REMOVE_ITEM", id });
  assert.equal(s1.items.length, 1);
  assert.ok(!s1.items.find((i) => i.id === id));
});

test("REMOVE_ITEM does not remove the last item", () => {
  const s0 = fresh();
  const id = s0.items[0]!.id;

  const s1 = formReducer(s0, { type: "REMOVE_ITEM", id });
  assert.equal(s1.items.length, 1); // still 1
});

// ── CLEAR_ITEMS ───────────────────────────────────────────────────────────────

test("CLEAR_ITEMS resets to a single blank item", () => {
  let s = fresh();
  s = formReducer(s, { type: "ADD_ITEM" });
  s = formReducer(s, { type: "ADD_ITEM" });
  assert.equal(s.items.length, 3);

  s = formReducer(s, { type: "CLEAR_ITEMS" });
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0]!.name, "");
});

// ── CUSTOMER ──────────────────────────────────────────────────────────────────

test("SET_CUSTOMER sets the customer and closes suggestions", () => {
  let s = fresh();
  s = formReducer(s, { type: "SET_CUSTOMER_SUGGEST", value: true });

  const customer = {
    id: "c1",
    tenantId: "t1",
    name: "Ramesh",
    balance: 0,
    totalPurchases: 0,
    totalPayments: 0,
    createdAt: "",
    updatedAt: "",
  };
  s = formReducer(s, { type: "SET_CUSTOMER", customer });

  assert.equal(s.selectedCustomer?.id, "c1");
  assert.equal(s.showCustSuggest, false); // closed by SET_CUSTOMER
});

test("SET_CUSTOMER_QUERY updates query", () => {
  const s = formReducer(fresh(), {
    type: "SET_CUSTOMER_QUERY",
    query: "Suresh",
  });
  assert.equal(s.customerQuery, "Suresh");
});

test("SET_CUSTOMER_SUGGEST sets showCustSuggest to specific value", () => {
  const s0 = fresh();
  const s1 = formReducer(s0, { type: "SET_CUSTOMER_SUGGEST", value: true });
  assert.equal(s1.showCustSuggest, true);

  const s2 = formReducer(s1, { type: "SET_CUSTOMER_SUGGEST", value: false });
  assert.equal(s2.showCustSuggest, false);
});

// ── PRICING ───────────────────────────────────────────────────────────────────

test("SET_DISCOUNT_PCT clears discountFlat", () => {
  let s = formReducer(fresh(), { type: "SET_DISCOUNT_FLAT", value: "50" });
  assert.equal(s.discountFlat, "50");

  s = formReducer(s, { type: "SET_DISCOUNT_PCT", value: "10" });
  assert.equal(s.discountPct, "10");
  assert.equal(s.discountFlat, ""); // cleared
});

test("SET_DISCOUNT_FLAT clears discountPct", () => {
  let s = formReducer(fresh(), { type: "SET_DISCOUNT_PCT", value: "10" });
  assert.equal(s.discountPct, "10");

  s = formReducer(s, { type: "SET_DISCOUNT_FLAT", value: "50" });
  assert.equal(s.discountFlat, "50");
  assert.equal(s.discountPct, ""); // cleared
});

test("SET_ROUND_OFF toggles roundOffEnabled", () => {
  const s0 = fresh();
  assert.equal(s0.roundOffEnabled, false);

  const s1 = formReducer(s0, { type: "SET_ROUND_OFF", value: true });
  assert.equal(s1.roundOffEnabled, true);
});

// ── PAYMENT ───────────────────────────────────────────────────────────────────

test("TOGGLE_SPLIT enables split and keeps existing splits", () => {
  const s0 = fresh();
  const s1 = formReducer(s0, { type: "TOGGLE_SPLIT", value: true });
  assert.equal(s1.splitEnabled, true);
  assert.ok(s1.splits.length >= 1);
});

test("TOGGLE_SPLIT disables split and resets splits", () => {
  let s = formReducer(fresh(), { type: "TOGGLE_SPLIT", value: true });
  s = formReducer(s, { type: "ADD_SPLIT" });
  assert.equal(s.splits.length, 2);

  s = formReducer(s, { type: "TOGGLE_SPLIT", value: false });
  assert.equal(s.splitEnabled, false);
  assert.equal(s.splits.length, 1); // reset to 1
});

test("ADD_SPLIT adds a new split with incremented id", () => {
  let s = formReducer(fresh(), { type: "TOGGLE_SPLIT", value: true });
  const prevLen = s.splits.length;

  s = formReducer(s, { type: "ADD_SPLIT" });
  assert.equal(s.splits.length, prevLen + 1);
  assert.ok(s.splits[s.splits.length - 1]!.id > s.splits[0]!.id);
});

test("UPDATE_SPLIT patches the correct split", () => {
  let s = formReducer(fresh(), { type: "TOGGLE_SPLIT", value: true });
  const splitId = s.splits[0]!.id;

  s = formReducer(s, {
    type: "UPDATE_SPLIT",
    id: splitId,
    patch: { amount: "500", mode: "upi" },
  });

  const split = s.splits.find((sp) => sp.id === splitId)!;
  assert.equal(split.amount, "500");
  assert.equal(split.mode, "upi");
});

test("REMOVE_SPLIT does not remove the last split", () => {
  let s = formReducer(fresh(), { type: "TOGGLE_SPLIT", value: true });
  assert.equal(s.splits.length, 1);
  const splitId = s.splits[0]!.id;

  s = formReducer(s, { type: "REMOVE_SPLIT", id: splitId });
  assert.equal(s.splits.length, 1); // protected
});

// ── BATCH ─────────────────────────────────────────────────────────────────────

test("RESET_FORM restores initial state", () => {
  let s = fresh();
  s = formReducer(s, { type: "ADD_ITEM" });
  s = formReducer(s, { type: "SET_WITH_GST", value: true });
  s = formReducer(s, {
    type: "SET_CUSTOMER_QUERY",
    query: "Someone",
  });

  s = formReducer(s, { type: "RESET_FORM" });

  const initial = getInitialFormState();
  assert.equal(s.items.length, initial.items.length);
  assert.equal(s.withGst, false);
  assert.equal(s.customerQuery, "");
});

test("LOAD_DRAFT merges partial state", () => {
  const s0 = fresh();
  const s1 = formReducer(s0, {
    type: "LOAD_DRAFT",
    draft: {
      withGst: true,
      discountPct: "5",
      notes: "Deliver by 5pm",
    },
  });

  assert.equal(s1.withGst, true);
  assert.equal(s1.discountPct, "5");
  assert.equal(s1.notes, "Deliver by 5pm");
  // Items unchanged
  assert.equal(s1.items.length, 1);
});
