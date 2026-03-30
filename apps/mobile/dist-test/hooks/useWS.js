"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWS = useWS;
/**
 * useWS — returns isConnected for dashboard live indicator.
 */
const react_1 = require("react");
const ws_1 = require("../lib/ws");
function useWS() {
    const [isConnected, setIsConnected] = (0, react_1.useState)(ws_1.wsClient.isConnected);
    (0, react_1.useEffect)(() => {
        const offConn = ws_1.wsClient.on("__connected__", () => setIsConnected(true));
        const offDisc = ws_1.wsClient.on("__disconnected__", () => setIsConnected(false));
        setIsConnected(ws_1.wsClient.isConnected);
        return () => {
            offConn();
            offDisc();
        };
    }, []);
    return { isConnected };
}
//# sourceMappingURL=useWS.js.map