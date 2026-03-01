import { useState } from 'react';
import { Plus, Bell, Clock } from 'lucide-react';
import { useReminders, useCreateReminder, useCancelReminder, useCustomers } from '@/hooks/useQueries';
import { formatCurrency, formatDateTime } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { ReminderStatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Reminder } from '@/types';

// ── Create reminder modal ─────────────────────────────────────────────────────

function CreateReminderModal({ onClose }: { onClose: () => void }) {
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [datetime, setDatetime] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: customers = [] } = useCustomers(customerQuery);
  const mutation = useCreateReminder();

  const handleSubmit = async () => {
    if (!selectedCustomerId) { setError('Please select a customer'); return; }
    if (!amount || isNaN(parseFloat(amount))) { setError('Valid amount is required'); return; }
    if (!datetime) { setError('Date and time are required'); return; }
    setError('');
    try {
      await mutation.mutateAsync({
        customerId: selectedCustomerId,
        amount: parseFloat(amount),
        datetime: new Date(datetime).toISOString(),
        message: message || undefined,
      });
      onClose();
    } catch {
      setError('Failed to create reminder. Please try again.');
    }
  };

  // Minimum datetime: now + 5 min
  const minDatetime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Schedule Reminder"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>Schedule</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        {/* Customer */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Customer *</label>
          {selectedCustomerName ? (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-indigo-800">{selectedCustomerName}</span>
              <button onClick={() => { setSelectedCustomerId(''); setSelectedCustomerName(''); }}
                className="text-indigo-400 hover:text-indigo-600 text-xs">Change</button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search customer…"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
              />
              {customers.length > 0 && customerQuery && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {customers.slice(0, 6).map((c) => (
                    <button key={c.id} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      onClick={() => { setSelectedCustomerId(c.id); setSelectedCustomerName(c.name); setCustomerQuery(''); }}>
                      {c.name}
                      {c.phone && <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Input
          label="Amount (₹) *"
          type="number"
          min="1"
          step="0.01"
          placeholder="500.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Date & Time *</label>
          <input
            type="datetime-local"
            min={minDatetime}
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <Input
          label="Message (optional)"
          placeholder="Custom reminder message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function RemindersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data: reminders = [], isLoading } = useReminders();
  const cancelMutation = useCancelReminder();

  const pendingCount = reminders.filter((r) => r.status === 'pending').length;
  const filtered = statusFilter === 'all' ? reminders : reminders.filter((r) => r.status === statusFilter);

  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      render: (r: Reminder) => <span className="text-sm font-medium text-gray-900">{r.customer?.name ?? r.customerId}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (r: Reminder) => <span className="text-sm font-semibold text-gray-900">{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: Reminder) => <ReminderStatusBadge status={r.status} />,
    },
    {
      key: 'scheduledTime',
      header: 'Scheduled',
      render: (r: Reminder) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {formatDateTime(r.scheduledTime)}
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (r: Reminder) => <span className="text-xs text-gray-400 max-w-[200px] truncate block">{r.message ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (r: Reminder) =>
        r.status === 'pending' ? (
          <Button variant="ghost" size="xs" onClick={() => setCancelId(r.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
            Cancel
          </Button>
        ) : null,
    },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <Bell className="w-5 h-5 text-amber-500" />
          <p className="text-sm text-amber-800 font-medium">
            {pendingCount} pending reminder{pendingCount > 1 ? 's' : ''} scheduled
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['pending', 'sent', 'failed', 'cancelled', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Schedule Reminder
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No reminders found</p>
          </div>
        </Card>
      ) : (
        <Table columns={columns} data={filtered} keyFn={(r) => r.id} />
      )}

      {/* Modals */}
      {showCreate && <CreateReminderModal onClose={() => setShowCreate(false)} />}
      {cancelId && (
        <Modal isOpen onClose={() => setCancelId(null)} title="Cancel Reminder"
          footer={
            <>
              <Button variant="ghost" onClick={() => setCancelId(null)}>Keep</Button>
              <Button variant="danger" onClick={async () => { await cancelMutation.mutateAsync(cancelId!); setCancelId(null); }}
                loading={cancelMutation.isPending}>
                Cancel Reminder
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-700">Are you sure you want to cancel this reminder?</p>
        </Modal>
      )}
    </div>
  );
}
