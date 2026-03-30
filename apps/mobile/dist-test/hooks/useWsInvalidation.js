"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WS_EVENT_QUERIES = void 0;
exports.useWsInvalidation = useWsInvalidation;
/**
 * useWsInvalidation — subscribe to WS events and invalidate React Query caches.
 * Usage: useWsInvalidation(['invoices', 'customers', 'summary']);
 */
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const ws_1 = require("../lib/ws");
exports.WS_EVENT_QUERIES = {
    "invoice:created": [["invoices"], ["summary"], ["customers"]],
    "invoice:draft": [["invoices"], ["summary"]],
    "invoice:confirmed": [["invoices"], ["summary"], ["customers"]],
    "invoice:updated": [["invoices"]],
    "invoice:cancelled": [["invoices"], ["summary"], ["customers"]],
    "payment:recorded": [["customers"], ["summary"], ["ledger"], ["cashbook"], ["invoices"]],
    "customer:created": [["customers"], ["summary"]],
    "customer:deleted": [["customers"], ["summary"]],
    "customer:updated": [["customers"]],
    "reminder:created": [["reminders"]],
    "reminder:cancelled": [["reminders"]],
    "reminders:updated": [["reminders"]],
    "stock:updated": [["products"], ["lowStock"]],
    "product:created": [["products"], ["lowStock"]],
    "product:updated": [["products"], ["lowStock"], ["expiringBatches"]],
    "expense:created": [["expenses"], ["incomes"], ["cashbook"]],
    "expense:deleted": [["expenses"], ["incomes"], ["cashbook"]],
    "purchase:created": [["purchases"], ["cashbook"]],
    "purchase:deleted": [["purchases"], ["cashbook"]],
    "draft:created": [["drafts"]],
    "draft:updated": [["drafts"]],
    "draft:confirmed": [["drafts"], ["purchases"], ["products"], ["expenses"]],
    "draft:discarded": [["drafts"]],
    "monitoring:event": [["monitoring"]],
    "monitoring:snap": [["monitoring"]],
};
function useWsInvalidation(scopes = "all") {
    const qc = (0, react_query_1.useQueryClient)();
    (0, react_1.useEffect)(() => {
        const handlers = [];
        for (const [event, keys] of Object.entries(exports.WS_EVENT_QUERIES)) {
            if (scopes !== "all") {
                const relevant = keys.some((k) => scopes.includes(k[0]));
                if (!relevant)
                    continue;
            }
            const off = ws_1.wsClient.on(event, () => {
                for (const key of keys) {
                    qc.invalidateQueries({ queryKey: key });
                }
            });
            handlers.push(off);
        }
        return () => handlers.forEach((off) => off());
    }, [qc]);
}
//# sourceMappingURL=useWsInvalidation.js.map