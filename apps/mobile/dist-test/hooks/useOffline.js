"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOfflineStatus = useOfflineStatus;
exports.useOfflineSync = useOfflineSync;
/**
 * Offline status + sync (Sprint 18).
 */
const react_1 = require("react");
const netinfo_1 = __importDefault(require("@react-native-community/netinfo"));
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const offlineQueue_1 = require("../lib/offlineQueue");
function useOfflineStatus() {
    const [isOffline, setIsOffline] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const unsub = netinfo_1.default.addEventListener((state) => {
            setIsOffline(!(state.isConnected ?? true));
        });
        return () => unsub();
    }, []);
    return { isOffline };
}
function useOfflineSync(isLoggedIn) {
    const qc = (0, react_query_1.useQueryClient)();
    const [pendingCount, setPendingCount] = (0, react_1.useState)(0);
    const [isSyncing, setIsSyncing] = (0, react_1.useState)(false);
    const sync = (0, react_1.useCallback)(async () => {
        const queue = (0, offlineQueue_1.getQueuedInvoices)();
        if (queue.length === 0)
            return;
        setIsSyncing(true);
        for (const item of queue) {
            try {
                let customerId = item.payload.customerId;
                if (customerId === "offline-walkin") {
                    const { customers } = await api_1.customerApi.search("Walk-in", 5);
                    const existing = customers.find((c) => /walk\s*-?\s*in/i.test(c.name));
                    const walkIn = existing
                        ? existing
                        : (await api_1.customerApi.create({ name: "Walk-in Customer" })).customer;
                    customerId = walkIn.id;
                }
                await api_1.invoiceApi.create({
                    ...item.payload,
                    customerId,
                });
                (0, offlineQueue_1.removeFromQueue)(item.id);
            }
            catch {
                break;
            }
        }
        setPendingCount((0, offlineQueue_1.getQueuedInvoices)().length);
        void qc.invalidateQueries({ queryKey: ["invoices"] });
        void qc.invalidateQueries({ queryKey: ["customers"] });
        setIsSyncing(false);
    }, [qc]);
    (0, react_1.useEffect)(() => {
        if (!isLoggedIn)
            return;
        setPendingCount((0, offlineQueue_1.getQueuedInvoices)().length);
        const unsub = netinfo_1.default.addEventListener((state) => {
            if (state.isConnected) {
                void sync();
            }
            setPendingCount((0, offlineQueue_1.getQueuedInvoices)().length);
        });
        return () => unsub();
    }, [isLoggedIn, sync]);
    return { pendingCount, isSyncing };
}
//# sourceMappingURL=useOffline.js.map