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
import React from "react";
export declare function VoiceScreen(): React.JSX.Element;
//# sourceMappingURL=VoiceScreen.d.ts.map