/**
 * LiveFeedPanel — smart camera panel for /monitoring.
 *
 * Modes:
 *   mode='sender'  — counter device: getUserMedia + AI detection (LiveStreamSender)
 *   mode='viewer'  — owner device: WebRTC remote view (LiveStreamViewer)
 *   ip camera      — MJPEG <img> stream
 *   disabled       — placeholder
 */
import { useState } from 'react';
import { Camera, CameraOff, MonitorSmartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { LiveStreamSender } from './LiveStreamSender';
import { LiveStreamViewer } from './LiveStreamViewer';
import type { FaceRegistry } from './FaceTransactionTracker';

interface Props {
  mode?: 'sender' | 'viewer';
  onRegistry?: (reg: FaceRegistry) => void;
}

export function LiveFeedPanel({ mode = 'viewer', onRegistry }: Props) {
  const [localMode, setLocalMode] = useState<'sender' | 'viewer'>(mode);

  const { data } = useQuery({
    queryKey: ['monitoring', 'config'],
    queryFn:  () => monitoringApi.getConfig(),
    staleTime: 5 * 60_000,
  });

  const config = data?.config;

  if (!config?.cameraEnabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48 border rounded-lg bg-muted/20 text-muted-foreground">
        <CameraOff className="h-8 w-8 opacity-40" />
        <p className="text-sm">Camera not configured</p>
        <p className="text-xs opacity-60">Enable in Monitoring Settings</p>
      </div>
    );
  }

  // MJPEG IP camera — direct img tag, no WebRTC
  if (config.cameraSource === 'ip' && config.ipCameraUrl) {
    return (
      <div className="rounded-lg overflow-hidden border bg-black relative">
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>
        <img
          src={config.ipCameraUrl}
          className="w-full aspect-video object-cover"
          alt="Live IP camera feed"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
        />
      </div>
    );
  }

  // Webcam — sender or viewer mode
  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-muted-foreground">Device:</span>
        <button
          onClick={() => setLocalMode('sender')}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
            localMode === 'sender'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-muted-foreground/30 text-muted-foreground hover:border-primary'
          }`}
        >
          <Camera className="h-3 w-3 inline mr-1" />Counter
        </button>
        <button
          onClick={() => setLocalMode('viewer')}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
            localMode === 'viewer'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-muted-foreground/30 text-muted-foreground hover:border-primary'
          }`}
        >
          <MonitorSmartphone className="h-3 w-3 inline mr-1" />Owner
        </button>
      </div>

      {localMode === 'sender'
        ? <LiveStreamSender onRegistry={onRegistry} />
        : <LiveStreamViewer />}

      <p className="text-xs text-muted-foreground text-center opacity-70">
        {localMode === 'sender'
          ? 'Running on counter device — motion & face detection active'
          : 'Viewing counter stream remotely'}
      </p>
    </div>
  );
}
