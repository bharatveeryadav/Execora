import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from 'react';
import { wsClient } from '@/lib/ws';
import type { Invoice, PendingInvoicesUpdate } from '@/types';

interface WSContextValue {
  isConnected: boolean;
  pendingInvoices: Invoice[];
  pendingCount: number;
  lastMessage: { type: string; timestamp: number } | null;
  sendVoiceTranscript: (text: string) => void;
}

const WSContext = createContext<WSContextValue | null>(null);

export function WSProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<{ type: string; timestamp: number } | null>(null);

  useEffect(() => {
    const offOpen = wsClient.onOpen(() => setIsConnected(true));
    const offClose = wsClient.onClose(() => setIsConnected(false));

    const offPending = wsClient.on('pending:invoices_update', (msg) => {
      const payload = msg as unknown as PendingInvoicesUpdate;
      setPendingInvoices(payload.pendingInvoices ?? []);
      setPendingCount(payload.count ?? 0);
    });

    const offAll = wsClient.on('*', (msg) => {
      setLastMessage({ type: msg.type, timestamp: Date.now() });
    });

    // Sync current state
    setIsConnected(wsClient.isConnected);

    return () => {
      offOpen();
      offClose();
      offPending();
      offAll();
    };
  }, []);

  const sendVoiceTranscript = useCallback((text: string) => {
    wsClient.send('voice:final', { text });
  }, []);

  return (
    <WSContext.Provider value={{ isConnected, pendingInvoices, pendingCount, lastMessage, sendVoiceTranscript }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWS() {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error('useWS must be used inside <WSProvider>');
  return ctx;
}
