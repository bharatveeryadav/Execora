/**
 * /monitoring — Kirana Owner Security & Transaction Dashboard
 *
 * Sprint M2 — Dashboard UI
 * Sprint M3 — Camera snapshots + browser notifications
 * Sprint M4 — WebRTC live feed + AI detection
 * Sprint M5 — Kirana cash monitoring (footfall, drawer, reconciliation)
 *
 * Access: owner + admin + manager roles.
 */
import { useEffect, useState } from 'react';
import { Shield, Settings2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { monitoringApi, type MonitoringEventItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { AlertPanel }                from '@/components/monitoring/AlertPanel';
import { EventFeed }                 from '@/components/monitoring/EventFeed';
import { ActivityFilters, type Filters } from '@/components/monitoring/ActivityFilters';
import { ActivityTable }             from '@/components/monitoring/ActivityTable';
import { EmployeeSummary }           from '@/components/monitoring/EmployeeSummary';
import { LiveFeedPanel }             from '@/components/monitoring/LiveFeedPanel';
import { MonitoringSettings }        from '@/components/monitoring/MonitoringSettings';
import { CameraCapture }             from '@/components/monitoring/CameraCapture';
import { SnapGallery }               from '@/components/monitoring/SnapGallery';
import { KiranaStatsBar }            from '@/components/monitoring/KiranaStatsBar';
import { HourlyBillsChart }          from '@/components/monitoring/HourlyBillsChart';
import { CashReconciliationWidget }  from '@/components/monitoring/CashReconciliationWidget';
import { DrawerAlertWidget }         from '@/components/monitoring/DrawerAlertWidget';
import { FaceActivityPanel }         from '@/components/monitoring/FaceActivityPanel';
import type { FaceRegistry }         from '@/components/monitoring/FaceTransactionTracker';

const today = () => new Date().toISOString().slice(0, 10);

// ── Event detail dialog ────────────────────────────────────────────────────────
function EventDetailDialog({
  event,
  onClose,
}: {
  event: MonitoringEventItem | null;
  onClose: () => void;
}) {
  if (!event) return null;

  const metaEntries = Object.entries(event.meta ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  );

  return (
    <Dialog open={!!event} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Event Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="font-medium">{event.description}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Type</span>
            <span>{event.eventType}</span>
            <span className="text-muted-foreground">Severity</span>
            <span className="capitalize">{event.severity}</span>
            {event.amount && (
              <>
                <span className="text-muted-foreground">Amount</span>
                <span>₹{parseFloat(String(event.amount)).toLocaleString('en-IN')}</span>
              </>
            )}
            {event.user && (
              <>
                <span className="text-muted-foreground">Employee</span>
                <span>{event.user.name}</span>
              </>
            )}
            <span className="text-muted-foreground">Time</span>
            <span>
              {new Date(event.createdAt).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          {metaEntries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {metaEntries.map(([k, v]) => (
                  <>
                    <span key={`k-${k}`} className="text-muted-foreground capitalize">
                      {k.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span key={`v-${k}`} className="truncate">{String(v)}</span>
                  </>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Monitoring() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const [filters, setFilters]           = useState<Filters>({ from: today() });
  const [selectedEvent, setSelectedEvent] = useState<MonitoringEventItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hideLive, setHideLive]         = useState(false);
  const [faceRegistry, setFaceRegistry] = useState<FaceRegistry>(new Map());

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Access guard
  if (user && user.role !== 'owner' && user.role !== 'admin' && user.role !== 'manager') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
        <Shield className="h-8 w-8 opacity-40" />
        <p>Monitoring is only available to owners and admins.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const { data: unreadData } = useQuery({
    queryKey: ['monitoring', 'unread'],
    queryFn:  () => monitoringApi.unreadCount(),
    refetchInterval: 20_000,
  });

  const readAllMut = useMutation({
    mutationFn: () => monitoringApi.readAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitoring'] }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['monitoring'] });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Store Monitor</h1>
            <p className="text-xs text-muted-foreground">Cash · Camera · Alerts · Footfall</p>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-red-600 text-white">{unreadCount} alert{unreadCount > 1 ? 's' : ''}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline" size="sm"
              onClick={() => readAllMut.mutate()}
              disabled={readAllMut.isPending}
            >
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => setHideLive((v) => !v)}
            title="Toggle camera panel"
          >
            {hideLive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* ── KPI bar ─────────────────────────────────────────────────────────── */}
      <KiranaStatsBar />

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column: camera + drawer + reconciliation */}
        <div className="space-y-4">
          {!hideLive && (
            <Card className="border shadow-none">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm">Live Camera</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <LiveFeedPanel onRegistry={setFaceRegistry} />
              </CardContent>
            </Card>
          )}

          <DrawerAlertWidget />
          <CashReconciliationWidget />
        </div>

        {/* Right column: hourly chart + alerts + live feed */}
        <div className="lg:col-span-2 space-y-4">
          <HourlyBillsChart />

          {unreadCount > 0 && (
            <AlertPanel onAlertClick={setSelectedEvent} />
          )}

          <Card className="border shadow-none">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Activity Feed (live)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <EventFeed filters={filters} limit={25} onEventClick={setSelectedEvent} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Activity Log</TabsTrigger>
          <TabsTrigger value="faces">Faces</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          <TabsTrigger value="employees">Employee Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4 space-y-3">
          <ActivityFilters filters={filters} onChange={setFilters} />
          <ActivityTable filters={filters} onEventClick={setSelectedEvent} />
        </TabsContent>

        <TabsContent value="faces" className="mt-4">
          <FaceActivityPanel liveRegistry={faceRegistry} />
        </TabsContent>

        <TabsContent value="snapshots" className="mt-4">
          <SnapGallery from={filters.from} />
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <EmployeeSummary from={filters.from} to={filters.to} />
        </TabsContent>
      </Tabs>

      {/* Dialogs & hidden components */}
      <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <MonitoringSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CameraCapture />
    </div>
  );
}
