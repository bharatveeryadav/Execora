import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { monitoringApi, type MonitoringConfig } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function MonitoringSettings({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ['monitoring', 'config'],
    queryFn: () => monitoringApi.getConfig(),
    enabled: open,
  });

  const [form, setForm] = useState<Partial<MonitoringConfig>>({});

  useEffect(() => {
    if (data?.config) setForm(data.config);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => monitoringApi.updateConfig({
      enabled:            form.enabled,
      snapsOnBills:       form.snapsOnBills,
      snapsOnPayments:    form.snapsOnPayments,
      alertDiscountAbove: form.alertDiscountAbove != null ? Number(form.alertDiscountAbove) : undefined,
      alertCancelAbove:   form.alertCancelAbove   != null ? Number(form.alertCancelAbove)   : undefined,
      alertBillAbove:     form.alertBillAbove      != null ? Number(form.alertBillAbove)     : null,
      ownerPhoneAlert:    form.ownerPhoneAlert,
      cameraEnabled:      form.cameraEnabled,
      cameraSource:       form.cameraSource,
      ipCameraUrl:        form.ipCameraUrl ?? null,
      retentionDays:      form.retentionDays != null ? Number(form.retentionDays) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring', 'config'] });
      toast({ title: 'Monitoring settings saved' });
      onOpenChange(false);
    },
    onError: () => toast({ title: 'Failed to save settings', variant: 'destructive' }),
  });

  const set = <K extends keyof MonitoringConfig>(k: K, v: MonitoringConfig[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Monitoring Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Master toggle */}
          <div className="flex items-center justify-between">
            <Label>Enable monitoring</Label>
            <Switch
              checked={form.enabled ?? true}
              onCheckedChange={(v) => set('enabled', v)}
            />
          </div>

          <hr />

          {/* Alert thresholds */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Alert Thresholds
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Alert if discount above (%)</Label>
                <Input
                  type="number" min={0} max={100}
                  className="h-8 text-sm"
                  value={String(form.alertDiscountAbove ?? 20)}
                  onChange={(e) => set('alertDiscountAbove', Number(e.target.value) as any)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Alert if cancellation above (₹)</Label>
                <Input
                  type="number" min={0}
                  className="h-8 text-sm"
                  value={String(form.alertCancelAbove ?? 2000)}
                  onChange={(e) => set('alertCancelAbove', Number(e.target.value) as any)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Alert if bill above (₹, leave blank to disable)</Label>
                <Input
                  type="number" min={0}
                  className="h-8 text-sm"
                  value={form.alertBillAbove != null ? String(form.alertBillAbove) : ''}
                  onChange={(e) =>
                    set('alertBillAbove', e.target.value ? Number(e.target.value) as any : null as any)
                  }
                />
              </div>
            </div>
          </div>

          <hr />

          {/* Notifications */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Notifications
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">WhatsApp alerts (owner phone)</Label>
                <Switch
                  checked={form.ownerPhoneAlert ?? true}
                  onCheckedChange={(v) => set('ownerPhoneAlert', v)}
                />
              </div>
            </div>
          </div>

          <hr />

          {/* Camera */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Camera
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Enable camera snapshots</Label>
                <Switch
                  checked={form.cameraEnabled ?? false}
                  onCheckedChange={(v) => set('cameraEnabled', v)}
                />
              </div>
              {form.cameraEnabled && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Camera source</Label>
                    <Select
                      value={form.cameraSource ?? 'webcam'}
                      onValueChange={(v) => set('cameraSource', v as any)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webcam">Browser Webcam</SelectItem>
                        <SelectItem value="phone">Phone Camera</SelectItem>
                        <SelectItem value="ip">IP Camera (MJPEG)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.cameraSource === 'ip' && (
                    <div className="space-y-1">
                      <Label className="text-xs">MJPEG stream URL</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="http://192.168.1.x:8080/video"
                        value={form.ipCameraUrl ?? ''}
                        onChange={(e) => set('ipCameraUrl', e.target.value as any)}
                      />
                      <p className="text-xs text-muted-foreground">
                        For Android phone: install DroidCam app, enter http://phone-ip:4747/video
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Snap retention (days)</Label>
                    <Input
                      type="number" min={1} max={365}
                      className="h-8 text-sm"
                      value={String(form.retentionDays ?? 30)}
                      onChange={(e) => set('retentionDays', Number(e.target.value) as any)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
