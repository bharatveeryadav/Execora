import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, Zap, MessageSquare, Volume2 } from 'lucide-react';
import { wsClient } from '@/lib/ws';
import { useWS } from '@/contexts/WSContext';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, LiveBadge } from '@/components/ui/Badge';
import type { WSMessage } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  intent?: string;
}

// ── Audio visualiser ──────────────────────────────────────────────────────────

function AudioVisualiser({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-1 h-12">
      {Array.from({ length: 16 }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all ${active ? 'bg-indigo-500' : 'bg-gray-200'}`}
          style={{
            height: active
              ? `${20 + Math.abs(Math.sin(Date.now() / 200 + i)) * 28}px`
              : '8px',
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main voice page ───────────────────────────────────────────────────────────

export function VoicePage() {
  const { isConnected } = useWS();
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [, forceUpdate] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animFrameRef = useRef<number>(0);

  const addMessage = useCallback((role: Message['role'], text: string, intent?: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, timestamp: new Date(), intent },
    ]);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Animate visualiser
  useEffect(() => {
    if (isListening) {
      const tick = () => {
        forceUpdate((n) => n + 1);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isListening]);

  // Listen to WebSocket events
  useEffect(() => {
    const offs = [
      wsClient.on('voice:response', (msg: WSMessage) => {
        setIsThinking(false);
        const text = (msg as { text?: string }).text ?? '';
        addMessage('assistant', text);
        if (ttsEnabled && 'speechSynthesis' in window) {
          const utt = new SpeechSynthesisUtterance(text);
          utt.rate = 0.95;
          window.speechSynthesis.speak(utt);
        }
      }),
      wsClient.on('voice:thinking', (msg: WSMessage) => {
        setIsThinking(true);
        const transcript = (msg as { transcript?: string }).transcript ?? '';
        if (transcript) addMessage('user', transcript);
      }),
      wsClient.on('voice:intent', (msg: WSMessage) => {
        const intent = (msg as { intent?: string }).intent ?? '';
        setMessages((prev) => {
          const copy = [...prev];
          // Annotate the last user message with the intent
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].role === 'user') {
              copy[i] = { ...copy[i], intent };
              break;
            }
          }
          return copy;
        });
      }),
      wsClient.on('voice:transcript', (msg: WSMessage) => {
        const m = msg as { text?: string; isFinal?: boolean };
        if (m.isFinal) addMessage('user', m.text ?? '');
      }),
      wsClient.on('error', (msg: WSMessage) => {
        setIsThinking(false);
        addMessage('system', (msg as { error?: string }).error ?? 'An error occurred');
      }),
      wsClient.on('voice:start', () => {
        addMessage('system', 'Voice session started. Say a command or type below.');
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [addMessage, ttsEnabled]);

  const startListening = useCallback(() => {
    if (!isConnected) {
      addMessage('system', 'Not connected to server. Please wait…');
      return;
    }
    const SpeechRecognitionClass = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      addMessage('system', 'Speech recognition not supported in this browser. Use the text input instead.');
      return;
    }
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      addMessage('user', transcript);
      wsClient.send('voice:final', { text: transcript });
      setIsThinking(true);
    };
    recognition.onerror = () => {
      setIsListening(false);
      addMessage('system', 'Voice capture failed. Please try again.');
    };
    recognitionRef.current = recognition;
    recognition.start();
    wsClient.send('voice:start');
  }, [isConnected, addMessage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    wsClient.send('voice:stop');
  }, []);

  const sendText = useCallback(() => {
    const text = textInput.trim();
    if (!text || !isConnected) return;
    addMessage('user', text);
    wsClient.send('voice:final', { text });
    setIsThinking(true);
    setTextInput('');
  }, [textInput, isConnected, addMessage]);

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-8rem)]">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <LiveBadge connected={isConnected} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTtsEnabled((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              ttsEnabled
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            TTS {ttsEnabled ? 'On' : 'Off'}
          </button>
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
            Clear
          </Button>
        </div>
      </div>

      {/* Main chat + visualiser */}
      <div className="flex flex-col flex-1 min-h-0 gap-4 lg:flex-row">
        {/* Chat window */}
        <Card className="flex-1 flex flex-col min-h-0 !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">Conversation</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Zap className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Start speaking or type a command</p>
                <p className="text-gray-300 text-xs mt-1">
                  Try: "Create invoice for Ramesh for 2 kg rice"
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'system' ? (
                  <div className="w-full text-center">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {msg.text}
                    </span>
                  </div>
                ) : (
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.intent && (
                        <Badge variant="indigo" className="text-xs">{msg.intent.replace(/_/g, ' ')}</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Text input */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={isConnected ? 'Type a command…' : 'Connecting…'}
                value={textInput}
                disabled={!isConnected}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendText()}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
              />
              <Button onClick={sendText} disabled={!isConnected || !textInput.trim()} size="sm">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Voice control panel */}
        <div className="lg:w-64 flex flex-col gap-4">
          <Card className="flex flex-col items-center gap-4">
            <CardTitle>Voice Control</CardTitle>

            {/* Visualiser */}
            <AudioVisualiser active={isListening} />

            {/* Mic button */}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!isConnected}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-50 ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-200 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 shadow-indigo-200'
              }`}
            >
              {isListening ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>

            <p className="text-sm text-gray-500 text-center">
              {!isConnected
                ? 'Reconnecting…'
                : isListening
                ? 'Listening… click to stop'
                : 'Click to speak'}
            </p>
          </Card>

          {/* Example commands */}
          <Card>
            <CardTitle className="mb-3">Example Commands</CardTitle>
            <div className="space-y-2">
              {[
                'Create invoice for Ramesh for 5 kg atta',
                'Ramesh paid 500 rupees cash',
                'Schedule reminder for Suresh for 1000 tomorrow at 10am',
                'Check stock for wheat flour',
                'Daily summary',
              ].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => {
                    if (!isConnected) return;
                    addMessage('user', cmd);
                    wsClient.send('voice:final', { text: cmd });
                    setIsThinking(true);
                  }}
                  className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 px-3 py-2 rounded-lg transition-colors"
                >
                  "{cmd}"
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
