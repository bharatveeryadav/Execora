import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Video } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function LiveFeedPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState('');

  const { data } = useQuery({
    queryKey: ['monitoring', 'config'],
    queryFn: () => monitoringApi.getConfig(),
  });

  const config = data?.config;

  // Webcam via getUserMedia
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setWebcamActive(true);
        setWebcamError('');
      }
    } catch (err: any) {
      setWebcamError(err.message ?? 'Camera access denied');
    }
  };

  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  useEffect(() => () => { stopWebcam(); }, []);

  if (!config?.cameraEnabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48 border rounded-lg bg-muted/20 text-muted-foreground">
        <CameraOff className="h-8 w-8 opacity-40" />
        <p className="text-sm">Camera not configured</p>
        <p className="text-xs opacity-60">Enable camera in Monitoring Settings</p>
      </div>
    );
  }

  // MJPEG IP camera
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
          alt="Live camera feed"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Browser webcam
  return (
    <div className="rounded-lg overflow-hidden border bg-black relative">
      {webcamActive && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full aspect-video object-cover"
        muted
        playsInline
        style={{ display: webcamActive ? 'block' : 'none' }}
      />

      {!webcamActive && (
        <div className="flex flex-col items-center justify-center gap-3 h-48 text-white/60">
          <Video className="h-8 w-8 opacity-40" />
          {webcamError ? (
            <p className="text-xs text-red-400">{webcamError}</p>
          ) : (
            <p className="text-sm">Counter webcam</p>
          )}
          <Button variant="secondary" size="sm" onClick={startWebcam}>
            <Camera className="h-4 w-4 mr-1.5" />
            Start Camera
          </Button>
        </div>
      )}

      {webcamActive && (
        <div className="absolute bottom-2 right-2">
          <Button variant="destructive" size="sm" onClick={stopWebcam}>Stop</Button>
        </div>
      )}
    </div>
  );
}
