import { useState } from 'react';
import { Plus, FileText, X } from 'lucide-react';
import {
  useInvoices, useCreateInvoice, useCancelInvoice, useCustomers,
} from '@/hooks/useQueries';
import { formatCurrency, formatDateTime } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { InvoiceStatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useWS } from '@/contexts/WSContext';
import type { Invoice } from '@/types';

type StatusFilter = 'all' | 'draft' | 'issued' | 'paid' | 'cancelled';

// ── Create invoice modal ──────────────────────────────────────────────────────

function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [items, setItems] = useState([{ productName: '', quantity: 1 }]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: customers = [] } = useCustomers(customerQuery);
  const mutation = useCreateInvoice();

  const addItem = () => setItems((i) => [...i, { productName: '', quantity: 1 }]);
  const removeItem = (idx: number) => setItems((i) => i.filter((_, ii) => ii !== idx));
  const updateItem = (idx: number, field: 'productName' | 'quantity', val: string | number) => {
    setItems((items) => items.map((item, ii) => ii === idx ? { ...item, [field]: val } : item));
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId) { setError('Please select a customer'); return; }
    if (items.some((i) => !i.productName.trim())) { setError('All items need a product name'); return; }
    setError('');
    try {
      await mutation.mutateAsync({
        customerId: selectedCustomerId,
        items: items.map((i) => ({ productName: i.productName.trim(), quantity: i.quantity })),
        notes: notes || undefined,
      });
      onClose();
    } catch {
      setError('Failed to create invoice. Please try again.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Create Invoice"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>Create Invoice</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        {/* Customer search */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Customer *</label>
          {selectedCustomerName ? (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-indigo-800">{selectedCustomerName}</span>
              <button onClick={() => { setSelectedCustomerId(''); setSelectedCustomerName(''); }}
                className="text-indigo-400 hover:text-indigo-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search customer…"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
              />
              {customers.length > 0 && customerQuery && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {customers.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setSelectedCustomerName(c.name);
                        setCustomerQuery('');
                      }}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Items *</label>
            <Button variant="ghost" size="xs" onClick={addItem} leftIcon={<Plus className="w-3 h-3" />}>
              Add item
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  placeholder="Product name"
                  value={item.productName}
                  onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 px-1">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Products are auto-created if not found in catalog</p>
        </div>

        {/* Notes */}
        <Input
          label="Notes (optional)"
          placeholder="Any special instructions…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useInvoices(50);
  const cancelMutation = useCancelInvoice();
  const { pendingCount } = useWS();

  const filtered = statusFilter === 'all' ? invoices : invoices.filter((i) => i.status === statusFilter);

  const handleCancel = async () => {
    if (!cancelId) return;
    await cancelMutation.mutateAsync(cancelId);
    setCancelId(null);
  };

  const columns = [
    {
      key: 'invoiceNo',
      header: 'Invoice #',
      render: (i: Invoice) => <span className="font-mono text-sm font-medium text-gray-900">{i.invoiceNo}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (i: Invoice) => <span className="text-sm text-gray-700">{i.customer?.name ?? i.customerId}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (i: Invoice) => <InvoiceStatusBadge status={i.status} />,
    },
    {
      key: 'total',
      header: 'Amount',
      render: (i: Invoice) => (
        <span className="text-sm font-semibold text-gray-900">{formatCurrency(i.total ?? i.subtotal)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (i: Invoice) => <span className="text-xs text-gray-400">{formatDateTime(i.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (i: Invoice) =>
        i.status !== 'cancelled' && i.status !== 'paid' ? (
          <Button variant="ghost" size="xs" onClick={() => setCancelId(i.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800 font-medium">
          {pendingCount} draft invoice{pendingCount > 1 ? 's' : ''} pending voice confirmation
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Status tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'draft', 'issued', 'paid', 'cancelled'] as StatusFilter[]).map((s) => (
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
          New Invoice
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No invoices found</p>
          </div>
        </Card>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          keyFn={(i) => i.id}
        />
      )}

      {/* Modals */}
      {showCreate && <CreateInvoiceModal onClose={() => setShowCreate(false)} />}
      {cancelId && (
        <Modal isOpen onClose={() => setCancelId(null)} title="Cancel Invoice"
          footer={
            <>
              <Button variant="ghost" onClick={() => setCancelId(null)}>Keep</Button>
              <Button variant="danger" onClick={handleCancel} loading={cancelMutation.isPending}>
                Cancel Invoice
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-700">Are you sure you want to cancel this invoice? This action cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
