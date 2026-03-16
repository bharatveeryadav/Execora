/**
 * FaceActivityPanel — browse faces detected at the counter + their transaction history.
 *
 * Shows:
 *   - Live session registry: faces detected since camera started
 *   - Historical: faces from monitoring events (face.seen / face.transaction)
 *   - Click any face → drawer with full transaction timeline
 *
 * AI info:
 *   - Each face identified by 128-dim neural embedding (not just color)
 *   - Re-identified across the session — same person → same card
 *   - Each transaction linked in real-time via WS events
 */
import { useState } from 'react';
import { User, IndianRupee, Clock, ShoppingBag, X, Brain, WifiOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { FaceRecord, FaceTransaction } from './FaceTransactionTracker';

const today = () => new Date().toISOString().slice(0, 10);

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtRupee(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function TxItem({ tx }: { tx: FaceTransaction }) {
  const icon =
    tx.eventType === 'bill.created'       ? '🧾' :
    tx.eventType === 'payment.recorded'   ? '💳' :
    tx.eventType === 'cash.transaction'   ? '💵' :
    tx.eventType === 'face.transaction'   ? '🔗' : '📌';

  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-0">
      <span className="text-base mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-tight">{tx.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(tx.time)}</p>
      </div>
      {tx.amount != null && (
        <span className="text-sm font-semibold text-green-600 shrink-0">{fmtRupee(tx.amount)}</span>
      )}
    </div>
  );
}

function FaceCard({ rec, onClick }: { rec: FaceRecord; onClick: () => void }) {
  const isRecent = (Date.now() - new Date(rec.lastSeen).getTime()) < 60_000;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-2 rounded-lg border hover:border-blue-400 hover:bg-blue-50/50 transition-all group relative text-center"
    >
      {/* Live indicator */}
      {isRecent && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      )}

      {/* Face thumbnail */}
      <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
        {rec.thumbnail ? (
          <img
            src={rec.thumbnail}
            alt="Detected face"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <User className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-foreground truncate w-full">
        Person {rec.faceId.slice(0, 4).toUpperCase()}
      </p>

      {/* Stats */}
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <ShoppingBag className="h-2.5 w-2.5" />
          {rec.transactionCount}
        </span>
        {rec.totalAmount > 0 && (
          <span className="flex items-center gap-0.5 text-green-600">
            <IndianRupee className="h-2.5 w-2.5" />
            {rec.totalAmount >= 1000
              ? `${(rec.totalAmount / 1000).toFixed(1)}K`
              : rec.totalAmount}
          </span>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {timeAgo(rec.firstSeen)}
      </p>
    </button>
  );
}

interface Props {
  /** Live registry from FaceTransactionTracker */
  liveRegistry?: Map<string, FaceRecord>;
  /** Whether face AI models are loaded */
  aiReady?: boolean;
  aiLoading?: boolean;
}

export function FaceActivityPanel({ liveRegistry, aiReady, aiLoading }: Props) {
  const [selected, setSelected] = useState<FaceRecord | null>(null);

  // Also fetch historical face events from API (today)
  const { data } = useQuery({
    queryKey: ['monitoring', 'events', 'face', today()],
    queryFn: () => monitoringApi.listEvents({
      eventType: 'face.seen',
      from: `${today()}T00:00:00.000Z`,
      limit: 100,
    }),
    refetchInterval: 30_000,
  });

  // Merge live registry with API events by faceId
  const allFaces = new Map<string, FaceRecord>(liveRegistry ?? new Map());

  // Supplement with API data for faces not in live registry
  for (const ev of data?.events ?? []) {
    const faceId = (ev.meta as any)?.faceId as string | undefined;
    if (!faceId || allFaces.has(faceId)) continue;
    allFaces.set(faceId, {
      faceId,
      descriptor:       [],
      thumbnail:        '', // loaded from snap separately
      firstSeen:        ev.createdAt,
      lastSeen:         ev.createdAt,
      transactionCount: 0,
      totalAmount:      0,
      transactions:     [],
    });
  }

  const faces = [...allFaces.values()].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
  );

  return (
    <div className="space-y-4">
      {/* AI status bar */}
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
        aiReady
          ? 'bg-green-50 text-green-700'
          : aiLoading
          ? 'bg-blue-50 text-blue-700'
          : 'bg-muted/30 text-muted-foreground'
      }`}>
        {aiReady ? (
          <><Brain className="h-3.5 w-3.5" />Face AI active — real 128-dim neural embeddings, re-identification enabled</>
        ) : aiLoading ? (
          <><div className="h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />Loading face recognition model (~7MB)…</>
        ) : (
          <><WifiOff className="h-3.5 w-3.5" />Start camera on counter device to enable face tracking</>
        )}
      </div>

      {/* Face grid */}
      {faces.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 h-40 text-muted-foreground">
          <User className="h-8 w-8 opacity-30" />
          <p className="text-sm">No faces detected yet</p>
          <p className="text-xs opacity-60">Start the counter camera to begin tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {faces.map((rec) => (
            <FaceCard
              key={rec.faceId}
              rec={rec}
              onClick={() => setSelected(rec)}
            />
          ))}
        </div>
      )}

      {/* Face detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center shrink-0">
                    {selected.thumbnail ? (
                      <img src={selected.thumbnail} alt="Face" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-bold">Person {selected.faceId.slice(0, 4).toUpperCase()}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      First seen {timeAgo(selected.firstSeen)}
                    </p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { icon: <ShoppingBag className="h-4 w-4" />, label: 'Transactions', value: selected.transactionCount, color: 'text-blue-600' },
                  { icon: <IndianRupee className="h-4 w-4" />, label: 'Total Amount', value: `₹${selected.totalAmount.toLocaleString('en-IN')}`, color: 'text-green-600' },
                  { icon: <Clock className="h-4 w-4" />, label: 'Last Seen', value: timeAgo(selected.lastSeen), color: 'text-muted-foreground' },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/30 rounded-lg p-2 text-center">
                    <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
                    <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Face ID badge */}
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  ID: {selected.faceId.slice(0, 8)}
                </Badge>
                <span className="text-xs text-muted-foreground">Neural face embedding</span>
              </div>

              {/* Transaction timeline */}
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Activity Timeline</p>
                {selected.transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No transactions linked yet</p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto pr-1">
                    {selected.transactions.map((tx, i) => (
                      <TxItem key={i} tx={tx} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
