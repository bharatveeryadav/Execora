/**
 * CashReconciliationWidget — end-of-day cash count vs billing total.
 *
 * Owner enters actual cash in drawer → shows discrepancy vs expected
 * (sum of today's bills). Stored as a monitoring event.
 */
import { useState } from 'react';
import { CheckCircle, AlertTriangle, IndianRupee, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const today = () => new Date().toISOString().slice(0, 10);

export function CashReconciliationWidget() {
  const qc = useQueryClient();
  const [open,   setOpen]   = useState(false);
  const [actual, setActual] = useState('');
  const [note,   setNote]   = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['monitoring', 'stats', today(), undefined],
    queryFn: () => monitoringApi.stats(`${today()}T00:00:00.000Z`),
    staleTime: 30_000,
  });

  const { data: reconData } = useQuery({
    queryKey: ['monitoring', 'cash-recon', today()],
    queryFn: () => monitoringApi.getCashRecon(today()),
    staleTime: 60_000,
  });

  const submitMut = useMutation({
    mutationFn: () => monitoringApi.recordCashRecon({
      date:     today(),
      actual:   parseFloat(actual) || 0,
      expected: statsData?.totalBillAmount ?? 0,
      note:     note || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring', 'cash-recon'] });
      qc.invalidateQueries({ queryKey: ['monitoring'] });
      setActual('');
      setNote('');
    },
  });

  const expected     = statsData?.totalBillAmount ?? 0;
  const lastRecon    = reconData?.reconciliation;
  const lastMeta     = lastRecon?.meta as { expected?: number; actual?: number; discrepancy?: number } | undefined;
  const discrepancy  = lastMeta?.discrepancy;
  const hasRecorded  = !!lastRecon;

  const previewDisc  = actual ? parseFloat(actual) - expected : null;

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5 text-green-600" />
            Cash Reconciliation
          </span>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-3">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Expected (billing)</p>
            <p className="font-semibold text-green-600">
              ₹{expected.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last recorded</p>
            {hasRecorded ? (
              <div className="flex items-center gap-1">
                {(discrepancy ?? 0) === 0 ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
                <p className={`font-semibold text-sm ${
                  (discrepancy ?? 0) === 0
                    ? 'text-green-600'
                    : (discrepancy ?? 0) > 0
                    ? 'text-blue-600'
                    : 'text-red-600'
                }`}>
                  {(discrepancy ?? 0) === 0
                    ? 'Balanced'
                    : `${(discrepancy ?? 0) > 0 ? '+' : ''}₹${Math.abs(discrepancy ?? 0).toLocaleString('en-IN')}`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Not yet recorded</p>
            )}
          </div>
        </div>

        {/* Preview discrepancy while typing */}
        {actual && previewDisc !== null && (
          <div className={`text-xs px-2 py-1.5 rounded-md ${
            previewDisc === 0 ? 'bg-green-50 text-green-700'
            : previewDisc > 0 ? 'bg-blue-50 text-blue-700'
            : 'bg-red-50 text-red-700'
          }`}>
            {previewDisc === 0
              ? 'Cash matches billing — balanced!'
              : previewDisc > 0
              ? `Surplus: ₹${previewDisc.toLocaleString('en-IN')} extra in drawer`
              : `Short: ₹${Math.abs(previewDisc).toLocaleString('en-IN')} missing`}
          </div>
        )}

        {/* Input form */}
        {open && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Actual cash in drawer (₹)</label>
              <Input
                type="number"
                placeholder="Enter counted amount"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              className="w-full h-8"
              onClick={() => submitMut.mutate()}
              disabled={!actual || submitMut.isPending}
            >
              {submitMut.isPending ? 'Recording…' : 'Record EOD Cash Count'}
            </Button>
          </div>
        )}

        {!open && (
          <button
            className="text-xs text-blue-600 hover:underline w-full text-left"
            onClick={() => setOpen(true)}
          >
            {hasRecorded ? 'Update cash count' : 'Enter end-of-day cash count →'}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
