/**
 * SnapGallery — thumbnail grid of monitoring snapshots.
 * Shows events that have a snapKey, fetches presigned URLs on demand,
 * and opens a lightbox on click.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, X, ZoomIn } from 'lucide-react';
import { monitoringApi, type MonitoringEventItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function SnapThumb({ event, onClick }: { event: MonitoringEventItem; onClick: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'snap-url', event.snapKey],
    queryFn:  () => monitoringApi.getSnapUrl(event.snapKey!),
    enabled:  !!event.snapKey,
    staleTime: 12 * 60_000, // presigned URL lasts 15 min
  });

  if (isLoading || !data?.url) {
    return (
      <div className="aspect-video rounded-md bg-muted/30 animate-pulse flex items-center justify-center">
        <Camera className="h-5 w-5 text-muted-foreground opacity-30" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="relative group aspect-video rounded-md overflow-hidden bg-black border hover:ring-2 hover:ring-primary transition-all"
    >
      <img src={data.url} alt={event.description} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
        <p className="text-white text-[10px] truncate">{event.description}</p>
        <p className="text-white/60 text-[9px]">
          {new Date(event.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </button>
  );
}

interface LightboxProps {
  event: MonitoringEventItem;
  onClose: () => void;
}

function Lightbox({ event, onClose }: LightboxProps) {
  const { data } = useQuery({
    queryKey: ['monitoring', 'snap-url', event.snapKey],
    queryFn:  () => monitoringApi.getSnapUrl(event.snapKey!),
    enabled:  !!event.snapKey,
    staleTime: 12 * 60_000,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="relative bg-black">
          <Button
            variant="ghost" size="icon"
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          {data?.url ? (
            <img src={data.url} alt={event.description} className="w-full object-contain max-h-[70vh]" />
          ) : (
            <div className="aspect-video flex items-center justify-center text-white/40">Loading…</div>
          )}
        </div>
        <div className="p-4 space-y-1">
          <p className="font-medium text-sm">{event.description}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(event.createdAt).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
            {event.user && ` · ${event.user.name}`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  from?: string;
  limit?: number;
}

export function SnapGallery({ from, limit = 20 }: Props) {
  const [selected, setSelected] = useState<MonitoringEventItem | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'events', 'snaps', from ?? today],
    queryFn: () => monitoringApi.listEvents({
      from: from ? `${from}T00:00:00.000Z` : `${today}T00:00:00.000Z`,
      limit,
    }),
    refetchInterval: 15_000,
    select: (d) => d.events.filter((e) => e.snapKey),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-video rounded-md bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <Camera className="h-8 w-8 opacity-30" />
        <p className="text-sm">No snapshots today</p>
        <p className="text-xs opacity-60">Enable camera in Monitoring Settings to auto-capture</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {data.map((event) => (
          <SnapThumb key={event.id} event={event} onClick={() => setSelected(event)} />
        ))}
      </div>
      {selected && <Lightbox event={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
