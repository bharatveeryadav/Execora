"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const formReducer_1 = require("../lib/formReducer");
// ── helpers ──────────────────────────────────────────────────────────────────
function fresh() {
    return (0, formReducer_1.getInitialFormState)();
}
// ── ADD_ITEM ──────────────────────────────────────────────────────────────────
(0, node_test_1.default)("ADD_ITEM adds a blank item with incremented id", () => {
    const s0 = fresh();
    strict_1.default.equal(s0.items.length, 1);
    const s1 = (0, formReducer_1.formReducer)(s0, { type: "ADD_ITEM" });
    strict_1.default.equal(s1.items.length, 2);
    strict_1.default.equal(s1.items[1].name, "");
    strict_1.default.equal(s1.items[1].qty, "1");
    strict_1.default.ok(s1.items[1].id > s1.items[0].id);
});
// ── UPDATE_ITEM ───────────────────────────────────────────────────────────────
(0, node_test_1.default)("UPDATE_ITEM patches the correct item and recomputes amount", () => {
    const s0 = fresh();
    const id = s0.items[0].id;
    const s1 = (0, formReducer_1.formReducer)(s0, {
        type: "UPDATE_ITEM",
        id,
        patch: { name: "Rice", rate: "50", qty: "2" },
    });
    const item = s1.items.find((i) => i.id === id);
    strict_1.default.equal(item.name, "Rice");
    strict_1.default.equal(item.rate, "50");
    strict_1.default.equal(item.qty, "2");
    strict_1.default.equal(item.amount, 100); // 50 * 2
});
(0, node_test_1.default)("UPDATE_ITEM does not modify other items", () => {
    const s0 = (0, formReducer_1.formReducer)(fresh(), { type: "ADD_ITEM" });
    const [first, second] = s0.items;
    strict_1.default.ok(first && second);
    const s1 = (0, formReducer_1.formReducer)(s0, {
        type: "UPDATE_ITEM",
        id: second.id,
        patch: { name: "Sugar" },
    });
    strict_1.default.equal(s1.items[0].name, first.name); // unchanged
    strict_1.default.equal(s1.items[1].name, "Sugar");
});
// ── REMOVE_ITEM ───────────────────────────────────────────────────────────────
(0, node_test_1.default)("REMOVE_ITEM removes an item when more than one exists", () => {
    const s0 = (0, formReducer_1.formReducer)(fresh(), { type: "ADD_ITEM" });
    const id = s0.items[0].id;
    const s1 = (0, formReducer_1.formReducer)(s0, { type: "REMOVE_ITEM", id });
    strict_1.default.equal(s1.items.length, 1);
    strict_1.default.ok(!s1.items.find((i) => i.id === id));
});
(0, node_test_1.default)("REMOVE_ITEM does not remove the last item", () => {
    const s0 = fresh();
    const id = s0.items[0].id;
    const s1 = (0, formReducer_1.formReducer)(s0, { type: "REMOVE_ITEM", id });
    strict_1.default.equal(s1.items.length, 1); // still 1
});
// ── CLEAR_ITEMS ───────────────────────────────────────────────────────────────
(0, node_test_1.default)("CLEAR_ITEMS resets to a single blank item", () => {
    let s = fresh();
    s = (0, formReducer_1.formReducer)(s, { type: "ADD_ITEM" });
    s = (0, formReducer_1.formReducer)(s, { type: "ADD_ITEM" });
    strict_1.default.equal(s.items.length, 3);
    s = (0, formReducer_1.formReducer)(s, { type: "CLEAR_ITEMS" });
    strict_1.default.equal(s.items.length, 1);
    strict_1.default.equal(s.items[0].name, "");
});
// ── CUSTOMER ──────────────────────────────────────────────────────────────────
(0, node_test_1.default)("SET_CUSTOMER sets the customer and closes suggestions", () => {
    let s = fresh();
    s = (0, formReducer_1.formReducer)(s, { type: "SET_CUSTOMER_SUGGEST", value: true });
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
    s = (0, formReducer_1.formReducer)(s, { type: "SET_CUSTOMER", customer });
    strict_1.default.equal(s.selectedCustomer?.id, "c1");
    strict_1.default.equal(s.showCustSuggest, false); // closed by SET_CUSTOMER
});
(0, node_test_1.default)("SET_CUSTOMER_QUERY updates query", () => {
    const s = (0, formReducer_1.formReducer)(fresh(), {
        type: "SET_CUSTOMER_QUERY",
        query: "Suresh",
    });
    strict_1.default.equal(s.customerQuery, "Suresh");
});
(0, node_test_1.default)("SET_CUSTOMER_SUGGEST sets showCustSuggest to specific value", () => {
    const s0 = fresh();
    const s1 = (0, formReducer_1.formReducer)(s0, { type: "SET_CUSTOMER_SUGGEST", value: true });
    strict_1.default.equal(s1.showCustSuggest, true);
    const s2 = (0, formReducer_1.formReducer)(s1, { type: "SET_CUSTOMER_SUGGEST", value: false });
    strict_1.default.equal(s2.showCustSuggest, false);
});
// ── PRICING ───────────────────────────────────────────────────────────────────
(0, node_test_1.default)("SET_DISCOUNT_PCT clears discountFlat", () => {
    let s = (0, formReducer_1.formReducer)(fresh(), { type: "SET_DISCOUNT_FLAT", value: "50" });
    strict_1.default.equal(s.discountFlat, "50");
    s = (0, formReducer_1.formReducer)(s, { type: "SET_DISCOUNT_PCT", value: "10" });
    strict_1.default.equal(s.discountPct, "10");
    strict_1.default.equal(s.discountFlat, ""); // cleared
});
(0, node_test_1.default)("SET_DISCOUNT_FLAT clears discountPct", () => {
    let s = (0, formReducer_1.formReducer)(fresh(), { type: "SET_DISCOUNT_PCT", value: "10" });
    strict_1.default.equal(s.discountPct, "10");
    s = (0, formReducer_1.formReducer)(s, { type: "SET_DISCOUNT_FLAT", value: "50" });
    strict_1.default.equal(s.discountFlat, "50");
    strict_1.default.equal(s.discountPct, ""); // cleared
});
(0, node_test_1.default)("SET_ROUND_OFF toggles roundOffEnabled", () => {
    const s0 = fresh();
    strict_1.default.equal(s0.roundOffEnabled, false);
    const s1 = (0, formReducer_1.formReducer)(s0, { type: "SET_ROUND_OFF", value: true });
    strict_1.default.equal(s1.roundOffEnabled, true);
});
// ── PAYMENT ───────────────────────────────────────────────────────────────────
(0, node_test_1.default)("TOGGLE_SPLIT enables split and keeps existing splits", () => {
    const s0 = fresh();
    const s1 = (0, formReducer_1.formReducer)(s0, { type: "TOGGLE_SPLIT", value: true });
    strict_1.default.equal(s1.splitEnabled, true);
    strict_1.default.ok(s1.splits.length >= 1);
});
(0, node_test_1.default)("TOGGLE_SPLIT disables split and resets splits", () => {
    let s = (0, formReducer_1.formReducer)(fresh(), { type: "TOGGLE_SPLIT", value: true });
    s = (0, formReducer_1.formReducer)(s, { type: "ADD_SPLIT" });
    strict_1.default.equal(s.splits.length, 2);
    s = (0, formReducer_1.formReducer)(s, { type: "TOGGLE_SPLIT", value: false });
    strict_1.default.equal(s.splitEnabled, false);
    strict_1.default.equal(s.splits.length, 1); // reset to 1
});
(0, node_test_1.default)("ADD_SPLIT adds a new split with incremented id", () => {
    let s = (0, formReducer_1.formReducer)(fresh(), { type: "TOGGLE_SPLIT", value: true });
    const prevLen = s.splits.length;
    s = (0, formReducer_1.formReducer)(s, { type: "ADD_SPLIT" });
    strict_1.default.equal(s.splits.length, prevLen + 1);
    strict_1.default.ok(s.splits[s.splits.length - 1].id > s.splits[0].id);
});
(0, node_test_1.default)("UPDATE_SPLIT patches the correct split", () => {
    let s = (0, formReducer_1.formReducer)(fresh(), { type: "TOGGLE_SPLIT", value: true });
    const splitId = s.splits[0].id;
    s = (0, formReducer_1.formReducer)(s, {
        type: "UPDATE_SPLIT",
        id: splitId,
        patch: { amount: "500", mode: "upi" },
    });
    const split = s.splits.find((sp) => sp.id === splitId);
    strict_1.default.equal(split.amount, "500");
    strict_1.default.equal(split.mode, "upi");
});
(0, node_test_1.default)("REMOVE_SPLIT does not remove the last split", () => {
    let s = (0, formReducer_1.formReducer)(fresh(), { type: "TOGGLE_SPLIT", value: true });
    strict_1.default.equal(s.splits.length, 1);
    const splitId = s.splits[0].id;
    s = (0, formReducer_1.formReducer)(s, { type: "REMOVE_SPLIT", id: splitId });
    strict_1.default.equal(s.splits.length, 1); // protected
});
// ── BATCH ─────────────────────────────────────────────────────────────────────
(0, node_test_1.default)("RESET_FORM restores initial state", () => {
    let s = fresh();
    s = (0, formReducer_1.formReducer)(s, { type: "ADD_ITEM" });
    s = (0, formReducer_1.formReducer)(s, { type: "SET_WITH_GST", value: true });
    s = (0, formReducer_1.formReducer)(s, {
        type: "SET_CUSTOMER_QUERY",
        query: "Someone",
    });
    s = (0, formReducer_1.formReducer)(s, { type: "RESET_FORM" });
    const initial = (0, formReducer_1.getInitialFormState)();
    strict_1.default.equal(s.items.length, initial.items.length);
    strict_1.default.equal(s.withGst, false);
    strict_1.default.equal(s.customerQuery, "");
});
(0, node_test_1.default)("LOAD_DRAFT merges partial state", () => {
    const s0 = fresh();
    const s1 = (0, formReducer_1.formReducer)(s0, {
        type: "LOAD_DRAFT",
        draft: {
            withGst: true,
            discountPct: "5",
            notes: "Deliver by 5pm",
        },
    });
    strict_1.default.equal(s1.withGst, true);
    strict_1.default.equal(s1.discountPct, "5");
    strict_1.default.equal(s1.notes, "Deliver by 5pm");
    // Items unchanged
    strict_1.default.equal(s1.items.length, 1);
});
//# sourceMappingURL=formReducer.test.js.map