import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { monitoringApi } from '@/lib/api';

export interface Filters {
  eventType?: string;
  severity?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
}

const EVENT_TYPES = [
  { value: 'bill.created',       label: 'Bill Created' },
  { value: 'bill.cancelled',     label: 'Bill Cancelled' },
  { value: 'payment.recorded',   label: 'Payment' },
  { value: 'discount.applied',   label: 'Discount' },
  { value: 'credit_note.issued', label: 'Credit Note' },
  { value: 'user.login',         label: 'Login' },
  { value: 'cash_drawer.open',   label: 'Cash Drawer' },
  { value: 'motion.detected',    label: 'Motion Alert' },
];

const DATE_PRESETS = [
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week',      label: 'This Week' },
  { value: 'month',     label: 'This Month' },
  { value: 'custom',    label: 'Custom' },
];

function getPresetDates(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === 'today')     return { from: fmt(now) };
  if (preset === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: fmt(y), to: fmt(y) };
  }
  if (preset === 'week') {
    const w = new Date(now); w.setDate(w.getDate() - 7);
    return { from: fmt(w) };
  }
  if (preset === 'month') {
    const m = new Date(now); m.setDate(1);
    return { from: fmt(m) };
  }
  return {};
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export function ActivityFilters({ filters, onChange }: Props) {
  const [datePreset, setDatePreset] = useState('today');

  // Fetch employees for the dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => monitoringApi.listUsers(),
  });

  const handlePreset = (v: string) => {
    setDatePreset(v);
    if (v !== 'custom') {
      const dates = getPresetDates(v);
      onChange({ ...filters, ...dates });
    }
  };

  const clear = () => onChange({ from: new Date().toISOString().slice(0, 10) });

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {/* Employee */}
      <Select
        value={filters.userId ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, userId: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="h-8 text-xs w-36">
          <SelectValue placeholder="All Employees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Employees</SelectItem>
          {usersData?.users?.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Event type */}
      <Select
        value={filters.eventType ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, eventType: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="h-8 text-xs w-36">
          <SelectValue placeholder="All Events" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Events</SelectItem>
          {EVENT_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Severity */}
      <Select
        value={filters.severity ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, severity: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="h-8 text-xs w-28">
          <SelectValue placeholder="All Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Severity</SelectItem>
          <SelectItem value="info">Info</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="alert">Alert</SelectItem>
        </SelectContent>
      </Select>

      {/* Date preset */}
      <Select value={datePreset} onValueChange={handlePreset}>
        <SelectTrigger className="h-8 text-xs w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom date range */}
      {datePreset === 'custom' && (
        <>
          <Input
            type="date"
            className="h-8 text-xs w-32"
            value={filters.from ?? ''}
            onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
          />
          <Input
            type="date"
            className="h-8 text-xs w-32"
            value={filters.to ?? ''}
            onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
          />
        </>
      )}

      {/* Clear */}
      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clear}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
