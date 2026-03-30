"use strict";
/**
 * VoiceScreen — Real-time voice billing via WebSocket.
 *
 * Architecture:
 *  - Text input for Hinglish commands (mic via expo-av can be added later)
 *  - WebSocket to /ws?token=<jwt>&sessionId=<id>
 *  - Sends  { type: "voice:final", data: { text } }
 *  - Receives voice:response (AI reply), voice:intent (detected intent),
 *    voice:transcript (echo), error
 *
 * To add native mic: install expo-av + expo-speech, then replace the
 * TextInput panel with <ExpoAudioRecorder onFinal={sendFinal} />.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceScreen = VoiceScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const storage_1 = require("../lib/storage");
const api_1 = require("../lib/api");
const useResponsive_1 = require("../hooks/useResponsive");
const constants_1 = require("../lib/constants");
// ── Constants ─────────────────────────────────────────────────────────────────
const API_URL = (0, api_1.getApiBaseUrl)().replace(/^http/, "ws");
const WS_URL = `${API_URL}/ws`;
let _sessionId = null;
let _msgId = 1;
// ── VoiceScreen ───────────────────────────────────────────────────────────────
function VoiceScreen() {
    const { contentPad } = (0, useResponsive_1.useResponsive)();
    const [messages, setMessages] = (0, react_1.useState)([
        {
            id: _msgId++,
            role: "system",
            text: 'Namaste! Bol sakte ho: "Rahul ko 500 ka bill banao", "Cheeni ka stock check karo", "Aaj ki report do".',
        },
    ]);
    const [input, setInput] = (0, react_1.useState)("");
    const [connected, setConnected] = (0, react_1.useState)(false);
    const [connecting, setConnecting] = (0, react_1.useState)(false);
    const ws = (0, react_1.useRef)(null);
    const scrollRef = (0, react_1.useRef)(null);
    // ── WebSocket lifecycle ──────────────────────────────────────────────────────
    const connect = (0, react_1.useCallback)(async () => {
        if (ws.current?.readyState === WebSocket.OPEN)
            return;
        setConnecting(true);
        const token = storage_1.tokenStorage.getToken();
        const sid = _sessionId ?? `mob-${Date.now()}`;
        _sessionId = sid;
        const url = `${WS_URL}?token=${encodeURIComponent(token ?? "")}&sessionId=${sid}`;
        try {
            const socket = new WebSocket(url);
            socket.onopen = () => {
                setConnected(true);
                setConnecting(false);
            };
            socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    handleServerMessage(msg);
                }
                catch {
                    // non-JSON frame — ignore
                }
            };
            socket.onerror = () => {
                setConnected(false);
                setConnecting(false);
            };
            socket.onclose = () => {
                setConnected(false);
                setConnecting(false);
            };
            ws.current = socket;
        }
        catch {
            setConnecting(false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        connect();
        return () => {
            ws.current?.close();
        };
    }, [connect]);
    // ── Message handler ───────────────────────────────────────────────────────────
    function handleServerMessage(msg) {
        switch (msg.type) {
            case "voice:response": {
                const text = msg.data?.message ||
                    msg.data?.text ||
                    JSON.stringify(msg.data);
                appendMsg("assistant", text, msg.data?.intent);
                break;
            }
            case "voice:intent": {
                // Intent confirmed — surface to user if no response follows
                if (msg.data?.intent) {
                    appendMsg("assistant", `Intent: ${msg.data.intent}`, msg.data.intent);
                }
                break;
            }
            case "error": {
                const errText = msg.data?.message || "Something went wrong";
                appendMsg("system", `⚠️ ${errText}`);
                break;
            }
            case "voice:start":
            case "recording:started":
            case "voice:transcript":
                // Informational — ignore on mobile
                break;
            default:
                break;
        }
    }
    function appendMsg(role, text, intent) {
        setMessages((prev) => [...prev, { id: _msgId++, role, text, intent }]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
    // ── Send ─────────────────────────────────────────────────────────────────────
    function send() {
        const text = input.trim();
        if (!text || !ws.current || ws.current.readyState !== WebSocket.OPEN)
            return;
        appendMsg("user", text);
        setInput("");
        ws.current.send(JSON.stringify({
            type: "voice:final",
            data: { text, sessionId: _sessionId },
            timestamp: new Date().toISOString(),
        }));
    }
    // ── Reconnect banner ──────────────────────────────────────────────────────────
    function reconnect() {
        ws.current?.close();
        connect();
    }
    // ── Render ────────────────────────────────────────────────────────────────────
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { style: styles.container },
        react_1.default.createElement(react_native_1.View, { style: [styles.header, { paddingHorizontal: contentPad }] },
            react_1.default.createElement(react_native_1.Text, { style: styles.headerTitle }, "Voice Billing"),
            react_1.default.createElement(react_native_1.View, { style: [styles.dot, connected ? styles.dotGreen : styles.dotRed] }),
            react_1.default.createElement(react_native_1.Text, { style: styles.statusLabel }, connecting ? "Connecting…" : connected ? "Connected" : "Offline"),
            !connected && !connecting && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: reconnect, style: styles.reconnectBtn },
                react_1.default.createElement(react_native_1.Text, { style: styles.reconnectText }, "Retry")))),
        react_1.default.createElement(react_native_1.ScrollView, { ref: scrollRef, style: styles.chat, contentContainerStyle: styles.chatContent, keyboardShouldPersistTaps: "handled" }, messages.map((m) => (react_1.default.createElement(react_native_1.View, { key: m.id, style: [
                styles.bubble,
                m.role === "user"
                    ? styles.bubbleUser
                    : m.role === "system"
                        ? styles.bubbleSystem
                        : styles.bubbleAssistant,
            ] },
            m.intent && react_1.default.createElement(react_native_1.Text, { style: styles.intentBadge }, m.intent),
            react_1.default.createElement(react_native_1.Text, { style: [
                    styles.bubbleText,
                    m.role === "user"
                        ? styles.bubbleTextUser
                        : styles.bubbleTextOther,
                ] }, m.text))))),
        react_1.default.createElement(react_native_1.KeyboardAvoidingView, { behavior: react_native_1.Platform.OS === "ios" ? "padding" : "height" },
            react_1.default.createElement(react_native_1.View, { style: styles.inputBar },
                react_1.default.createElement(react_native_1.TextInput, { style: styles.textInput, value: input, onChangeText: setInput, placeholder: "Jaise: Rahul ko 2 kg cheeni ka bill banao\u2026", placeholderTextColor: "#94a3b8", multiline: false, returnKeyType: "send", onSubmitEditing: send, editable: connected }),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: send, disabled: !connected || !input.trim(), style: [
                        styles.sendBtn,
                        (!connected || !input.trim()) && styles.sendBtnDisabled,
                    ] }, connecting ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { style: styles.sendBtnText }, "Send")))),
            react_1.default.createElement(react_native_1.Text, { style: [styles.hint, { paddingHorizontal: contentPad }] }, "Tip: \"Mic support coming soon \u2014 type Hinglish commands above\""))));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: react_native_1.StyleSheet.hairlineWidth,
        borderBottomColor: "#e2e8f0",
        gap: 6,
    },
    headerTitle: {
        fontSize: constants_1.SIZES.FONT.lg,
        fontWeight: "700",
        color: "#0f172a",
        flex: 1,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotGreen: { backgroundColor: "#22c55e" },
    dotRed: { backgroundColor: "#ef4444" },
    statusLabel: { fontSize: constants_1.SIZES.FONT.sm, color: "#64748b" },
    reconnectBtn: {
        minHeight: constants_1.SIZES.TOUCH_MIN,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: "#e67e22",
        borderRadius: 6,
    },
    reconnectText: {
        color: "#fff",
        fontSize: constants_1.SIZES.FONT.sm,
        fontWeight: "600",
    },
    chat: { flex: 1 },
    chatContent: { padding: 12, gap: 8 },
    bubble: {
        maxWidth: "82%",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 6,
    },
    bubbleUser: {
        alignSelf: "flex-end",
        backgroundColor: "#e67e22",
        borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
        alignSelf: "flex-start",
        backgroundColor: "#fff",
        borderBottomLeftRadius: 4,
        borderWidth: react_native_1.StyleSheet.hairlineWidth,
        borderColor: "#e2e8f0",
    },
    bubbleSystem: {
        alignSelf: "center",
        backgroundColor: "#f1f5f9",
        borderRadius: 8,
        maxWidth: "96%",
    },
    intentBadge: {
        fontSize: constants_1.SIZES.FONT.xs,
        fontWeight: "700",
        color: "#e67e22",
        marginBottom: 2,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    bubbleText: { fontSize: constants_1.SIZES.FONT.base, lineHeight: 20 },
    bubbleTextUser: { color: "#fff" },
    bubbleTextOther: { color: "#1e293b" },
    inputBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#fff",
        borderTopWidth: react_native_1.StyleSheet.hairlineWidth,
        borderTopColor: "#e2e8f0",
        gap: 8,
    },
    textInput: {
        flex: 1,
        minHeight: constants_1.SIZES.TOUCH_MIN,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: constants_1.SIZES.FONT.base,
        color: "#0f172a",
        backgroundColor: "#f8fafc",
    },
    sendBtn: {
        minWidth: 60,
        minHeight: constants_1.SIZES.TOUCH_MIN,
        borderRadius: 10,
        backgroundColor: "#e67e22",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    sendBtnDisabled: { backgroundColor: "#c7d2fe" },
    sendBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: constants_1.SIZES.FONT.base,
    },
    hint: {
        textAlign: "center",
        fontSize: constants_1.SIZES.FONT.sm,
        color: "#94a3b8",
        paddingBottom: 8,
        backgroundColor: "#fff",
    },
});
//# sourceMappingURL=VoiceScreen.js.map