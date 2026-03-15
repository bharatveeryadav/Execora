/**
 * LiveStreamViewer — owner device component.
 *
 * Connects to the counter's WebRTC stream via the server relay:
 *   1. Registers as a viewer
 *   2. Sends rtc:request-offer to ask counter to initiate
 *   3. Receives rtc:offer → creates answer → sends rtc:answer
 *   4. Exchanges ICE candidates
 *   5. Renders received remote stream in <video>
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MonitorOff, Radio, RefreshCw } from 'lucide-react';
import { wsClient } from '@/lib/ws';
import { Button } from '@/components/ui/button';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function LiveStreamViewer() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const pcRef     = useRef<RTCPeerConnection | null>(null);
  const senderIdRef = useRef<string | null>(null);

  const [status, setStatus]   = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [error,  setError]    = useState('');

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    senderIdRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const connect = useCallback(() => {
    cleanup();
    setStatus('connecting');
    setError('');

    // Register as viewer and request an offer from any active sender
    wsClient.send('rtc:register', { role: 'viewer' });
    wsClient.send('rtc:request-offer', {});
  }, [cleanup]);

  useEffect(() => {
    // Receive offer from sender
    const offOffer = wsClient.on('rtc:offer', async (msg) => {
      const { offer, fromId } = msg as { offer: RTCSessionDescriptionInit; fromId: string };
      if (!offer) return;

      cleanup();
      senderIdRef.current = fromId;
      const pc = new RTCPeerConnection(STUN);
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          wsClient.send('rtc:ice', { candidate: e.candidate.toJSON(), toId: fromId });
        }
      };

      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) {
          videoRef.current.srcObject = e.streams[0];
          videoRef.current.play().catch(() => {});
          setStatus('connected');
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          setStatus('ended');
          setError('Connection lost');
          cleanup();
        }
        if (pc.connectionState === 'disconnected') {
          setStatus('ended');
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      wsClient.send('rtc:answer', { answer: pc.localDescription?.toJSON(), toId: fromId });
    });

    // ICE candidate from sender
    const offIce = wsClient.on('rtc:ice', async (msg) => {
      const { candidate, fromId } = msg as { candidate: RTCIceCandidateInit; fromId: string };
      if (pcRef.current && senderIdRef.current === fromId && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    });

    // Sender ended stream
    const offEnd = wsClient.on('rtc:end', () => {
      setStatus('ended');
      cleanup();
    });

    return () => { offOffer(); offIce(); offEnd(); cleanup(); };
  }, [cleanup]);

  return (
    <div className="rounded-lg overflow-hidden border bg-black relative">
      {/* Status badge */}
      <div className="absolute top-2 left-2 z-10">
        {status === 'connected' && (
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
        {status === 'connecting' && (
          <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
            Connecting…
          </span>
        )}
      </div>

      <video
        ref={videoRef}
        className="w-full aspect-video object-cover"
        playsInline
        style={{ display: status === 'connected' ? 'block' : 'none' }}
      />

      {status !== 'connected' && (
        <div className="flex flex-col items-center justify-center gap-3 h-48 text-white/60">
          {status === 'ended' ? (
            <>
              <MonitorOff className="h-8 w-8 opacity-40" />
              <p className="text-sm">{error || 'Stream ended'}</p>
            </>
          ) : (
            <>
              <Radio className="h-8 w-8 opacity-40" />
              <p className="text-sm">
                {status === 'connecting' ? 'Waiting for counter camera…' : 'Remote live view'}
              </p>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={connect}>
            {status === 'idle' ? 'Connect' : 'Reconnect'}
          </Button>
        </div>
      )}

      {status === 'connected' && (
        <div className="absolute bottom-2 right-2">
          <Button variant="destructive" size="sm" onClick={() => { cleanup(); setStatus('ended'); }}>
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}
