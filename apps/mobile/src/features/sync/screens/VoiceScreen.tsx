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

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokenStorage } from "../../../lib/storage";
import { getApiBaseUrl } from "../../../lib/api";
import { useResponsive } from "../../../hooks/useResponsive";
import { COLORS, SIZES } from "../../../lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

type MsgRole = "user" | "assistant" | "system";
interface ChatMessage {
  id: number;
  role: MsgRole;
  text: string;
  intent?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API_URL = getApiBaseUrl().replace(/^http/, "ws");
const WS_URL = `${API_URL}/ws`;

let _sessionId: string | null = null;
let _msgId = 1;

// ── VoiceScreen ───────────────────────────────────────────────────────────────

export function VoiceScreen() {
  const { contentPad } = useResponsive();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: _msgId++,
      role: "system",
      text: 'Namaste! Bol sakte ho: "Rahul ko 500 ka bill banao", "Cheeni ka stock check karo", "Aaj ki report do".',
    },
  ]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── WebSocket lifecycle ──────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    setConnecting(true);

    const token = tokenStorage.getToken();
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
          const msg = JSON.parse(event.data as string);
          handleServerMessage(msg);
        } catch {
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
    } catch {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
    };
  }, [connect]);

  // ── Message handler ───────────────────────────────────────────────────────────

  function handleServerMessage(msg: {
    type: string;
    data?: Record<string, unknown>;
  }) {
    switch (msg.type) {
      case "voice:response": {
        const text =
          (msg.data?.message as string) ||
          (msg.data?.text as string) ||
          JSON.stringify(msg.data);
        appendMsg("assistant", text, msg.data?.intent as string | undefined);
        break;
      }
      case "voice:intent": {
        // Intent confirmed — surface to user if no response follows
        if (msg.data?.intent) {
          appendMsg(
            "assistant",
            `Intent: ${msg.data.intent}`,
            msg.data.intent as string,
          );
        }
        break;
      }
      case "error": {
        const errText = (msg.data?.message as string) || "Something went wrong";
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

  function appendMsg(role: MsgRole, text: string, intent?: string) {
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

    ws.current.send(
      JSON.stringify({
        type: "voice:final",
        data: { text, sessionId: _sessionId },
        timestamp: new Date().toISOString(),
      }),
    );
  }

  // ── Reconnect banner ──────────────────────────────────────────────────────────

  function reconnect() {
    ws.current?.close();
    connect();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: contentPad }]}>
        <Text style={styles.headerTitle}>Voice Billing</Text>
        <View
          style={[styles.dot, connected ? styles.dotGreen : styles.dotRed]}
        />
        <Text style={styles.statusLabel}>
          {connecting ? "Connecting…" : connected ? "Connected" : "Offline"}
        </Text>
        {!connected && !connecting && (
          <TouchableOpacity onPress={reconnect} style={styles.reconnectBtn}>
            <Text style={styles.reconnectText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chat transcript */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === "user"
                ? styles.bubbleUser
                : m.role === "system"
                  ? styles.bubbleSystem
                  : styles.bubbleAssistant,
            ]}
          >
            {m.intent && <Text style={styles.intentBadge}>{m.intent}</Text>}
            <Text
              style={[
                styles.bubbleText,
                m.role === "user"
                  ? styles.bubbleTextUser
                  : styles.bubbleTextOther,
              ]}
            >
              {m.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Jaise: Rahul ko 2 kg cheeni ka bill banao…"
            placeholderTextColor={COLORS.slate[400]}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={send}
            editable={connected}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!connected || !input.trim()}
            style={[
              styles.sendBtn,
              (!connected || !input.trim()) && styles.sendBtnDisabled,
            ]}
          >
            {connecting ? (
              <ActivityIndicator size="small" color={COLORS.text.inverted} />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.hint, { paddingHorizontal: contentPad }]}>
          Tip: "Mic support coming soon — type Hinglish commands above"
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: COLORS.text.inverted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
    gap: 6,
  },
  headerTitle: {
    fontSize: SIZES.FONT.lg,
    fontWeight: "700",
    color: COLORS.text.primary,
    flex: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: COLORS.success },
  dotRed: { backgroundColor: COLORS.error },
  statusLabel: { fontSize: SIZES.FONT.sm, color: COLORS.slate[500] },
  reconnectBtn: {
    minHeight: SIZES.TOUCH_MIN,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  reconnectText: {
    color: COLORS.text.inverted,
    fontSize: SIZES.FONT.sm,
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
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.text.inverted,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
  },
  bubbleSystem: {
    alignSelf: "center",
    backgroundColor: COLORS.slate[100],
    borderRadius: 8,
    maxWidth: "96%",
  },
  intentBadge: {
    fontSize: SIZES.FONT.xs,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bubbleText: { fontSize: SIZES.FONT.base, lineHeight: 20 },
  bubbleTextUser: { color: COLORS.text.inverted },
  bubbleTextOther: { color: COLORS.slate[800] },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.text.inverted,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: SIZES.TOUCH_MIN,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: SIZES.FONT.base,
    color: COLORS.text.primary,
    backgroundColor: COLORS.bg.primary,
  },
  sendBtn: {
    minWidth: 60,
    minHeight: SIZES.TOUCH_MIN,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  sendBtnDisabled: { backgroundColor: COLORS.slate[300] },
  sendBtnText: {
    color: COLORS.text.inverted,
    fontWeight: "700",
    fontSize: SIZES.FONT.base,
  },

  hint: {
    textAlign: "center",
    fontSize: SIZES.FONT.sm,
    color: COLORS.slate[400],
    paddingBottom: 8,
    backgroundColor: COLORS.text.inverted,
  },
});
