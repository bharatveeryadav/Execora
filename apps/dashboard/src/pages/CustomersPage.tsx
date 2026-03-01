import { useState } from 'react';
import { Search, Plus, User, Phone, MapPin, ChevronRight } from 'lucide-react';
import { useCustomers, useCreateCustomer, useCustomerLedger } from '@/hooks/useQueries';
import { formatCurrency, formatDate } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Customer } from '@/types';

// ── Customer detail panel ─────────────────────────────────────────────────────

function CustomerDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { data: ledger = [], isLoading } = useCustomerLedger(customer.id);
  const balance = parseFloat(String(customer.balance));

  return (
    <Modal isOpen onClose={onClose} title={customer.name} size="lg">
      <div className="space-y-4">
        {/* Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Balance</p>
            <p className={`text-xl font-bold mt-1 ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(Math.abs(balance))}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{balance > 0 ? 'owes you' : balance < 0 ? 'credit' : 'settled'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Purchases</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(customer.totalPurchases)}</p>
            <p className="text-xs text-gray-400 mt-0.5">All time</p>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-2">
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Phone className="w-4 h-4 text-gray-400" />
              {customer.phone}
            </div>
          )}
          {customer.landmark && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400" />
              {customer.landmark}
            </div>
          )}
          {customer.nickname && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="w-4 h-4 text-gray-400" />
              Known as: <span className="font-medium">{customer.nickname}</span>
            </div>
          )}
        </div>

        {/* Ledger */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Recent Transactions</h4>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : ledger.length === 0 ? (
            <p className="text-sm text-gray-400">No transactions yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ledger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm text-gray-800">{entry.description}</p>
                    <p className="text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${entry.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {entry.type === 'payment' ? '+' : '-'}{formatCurrency(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Create customer form ───────────────────────────────────────────────────────

function CreateCustomerModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', nickname: '', landmark: '' });
  const [error, setError] = useState('');
  const mutation = useCreateCustomer();

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setError('');
    try {
      await mutation.mutateAsync({
        name: form.name.trim(),
        phone: form.phone || undefined,
        nickname: form.nickname || undefined,
        landmark: form.landmark || undefined,
      });
      onClose();
    } catch {
      setError('Failed to create customer. Please try again.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add New Customer"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>Add Customer</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        <Input
          label="Full Name *"
          placeholder="Ramesh Kumar"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="+91 98765 43210"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <Input
          label="Nickname / Alias"
          placeholder="Ramesh bhai"
          value={form.nickname}
          onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
        />
        <Input
          label="Landmark / Area"
          placeholder="Near station, Andheri"
          value={form.landmark}
          onChange={(e) => setForm((f) => ({ ...f, landmark: e.target.value }))}
        />
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function CustomersPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: customers = [], isLoading } = useCustomers(debouncedQuery);

  const handleSearch = (val: string) => {
    setQuery(val);
    setTimeout(() => setDebouncedQuery(val), 300);
  };

  if (isLoading && !debouncedQuery) return <PageSpinner />;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0 max-w-sm">
          <Input
            placeholder="Search by name or phone…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
        <Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add Customer
        </Button>
      </div>

      {/* Customer grid */}
      {isLoading ? (
        <PageSpinner />
      ) : customers.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {debouncedQuery ? `No customers matching "${debouncedQuery}"` : 'No customers yet'}
            </p>
            <p className="text-gray-400 text-sm mt-1">Add your first customer to get started</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)} size="sm">
              Add Customer
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((c) => {
            const balance = parseFloat(String(c.balance));
            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(c)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                      {c.phone && <p className="text-xs text-gray-400 mt-0.5">{c.phone}</p>}
                      {c.nickname && <p className="text-xs text-gray-400">{c.nickname}</p>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Balance</p>
                    <p className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {balance === 0 ? '—' : formatCurrency(Math.abs(balance))}
                    </p>
                  </div>
                  {balance !== 0 && (
                    <Badge variant={balance > 0 ? 'red' : 'green'}>
                      {balance > 0 ? 'Owes' : 'Credit'}
                    </Badge>
                  )}
                </div>

                {c.landmark && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="w-3 h-3" />
                    {c.landmark}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} />}
      {showCreate && <CreateCustomerModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
