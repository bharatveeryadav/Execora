import { useState } from 'react';
import { Search, CreditCard, Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useCustomers, useCustomerLedger, useRecordPayment, useAddCredit } from '@/hooks/useQueries';
import { formatCurrency, formatDateTime } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Customer, LedgerEntry } from '@/types';

// ── Payment modal ─────────────────────────────────────────────────────────────

function PaymentModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const mutation = useRecordPayment();

  const handleSubmit = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Enter a valid amount'); return;
    }
    setError('');
    try {
      await mutation.mutateAsync({
        customerId: customer.id,
        amount: parseFloat(amount),
        paymentMode: method,
        notes: notes || undefined,
      });
      onClose();
    } catch {
      setError('Failed to record payment. Please try again.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Record Payment — ${customer.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>Record Payment</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <span className="text-gray-500">Outstanding balance: </span>
          <span className="font-bold text-gray-900">{formatCurrency(customer.balance)}</span>
        </div>
        <Input
          label="Amount (₹) *"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Select
          label="Payment Method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'upi', label: 'UPI' },
            { value: 'card', label: 'Card' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Input
          label="Notes (optional)"
          placeholder="Reference, notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}

// ── Credit modal ──────────────────────────────────────────────────────────────

function CreditModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const mutation = useAddCredit();

  const handleSubmit = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Enter a valid amount'); return;
    }
    if (!description.trim()) { setError('Description is required'); return; }
    setError('');
    try {
      await mutation.mutateAsync({
        customerId: customer.id,
        amount: parseFloat(amount),
        description: description.trim(),
      });
      onClose();
    } catch {
      setError('Failed to add credit. Please try again.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Add Credit — ${customer.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>Add Credit</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        <Input
          label="Credit Amount (₹) *"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Description *"
          placeholder="Advance payment, return, etc."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </Modal>
  );
}

// ── Customer ledger view ──────────────────────────────────────────────────────

function CustomerLedgerView({ customer, onPayment, onCredit }: {
  customer: Customer;
  onPayment: () => void;
  onCredit: () => void;
}) {
  const { data: ledger = [], isLoading } = useCustomerLedger(customer.id, 30);
  const balance = parseFloat(String(customer.balance));

  return (
    <div className="space-y-4">
      {/* Balance summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className={`rounded-xl p-4 ${balance > 0 ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
          <p className="text-xs text-gray-500">Outstanding Balance</p>
          <p className={`text-2xl font-bold mt-1 ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(Math.abs(balance))}
          </p>
          <p className="text-xs text-gray-400 mt-1">{balance > 0 ? 'Customer owes' : balance < 0 ? 'You owe' : 'Settled'}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total Purchases</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(customer.totalPurchases)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total Payments</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(customer.totalPayments)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onPayment} leftIcon={<ArrowDownCircle className="w-4 h-4 text-emerald-600" />}>
          Record Payment
        </Button>
        <Button variant="outline" onClick={onCredit} leftIcon={<ArrowUpCircle className="w-4 h-4 text-indigo-600" />}>
          Add Credit
        </Button>
      </div>

      {/* Transactions */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900">Transaction History</h4>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
        ) : ledger.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No transactions yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {ledger.map((entry: LedgerEntry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    entry.type === 'payment' ? 'bg-emerald-100' : 'bg-red-100'
                  }`}>
                    {entry.type === 'payment'
                      ? <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                      : <ArrowUpCircle className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">{entry.description}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(entry.createdAt)}</p>
                    {entry.method && (
                      <Badge variant="gray" className="mt-0.5">{entry.method}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${entry.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {entry.type === 'payment' ? '+' : '-'}{formatCurrency(entry.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function LedgerPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [modal, setModal] = useState<'payment' | 'credit' | null>(null);

  const { data: customers = [], isLoading } = useCustomers(debouncedQuery);

  const handleSearch = (val: string) => {
    setQuery(val);
    setTimeout(() => setDebouncedQuery(val), 300);
  };

  return (
    <div className="space-y-5">
      {/* Customer search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0 max-w-sm">
          <Input
            placeholder="Search customer for ledger…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
        {selectedCustomer && (
          <div className="flex items-center gap-2">
            <Badge variant="indigo" dot>{selectedCustomer.name}</Badge>
            <button onClick={() => setSelectedCustomer(null)} className="text-xs text-gray-400 hover:text-gray-600">
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Customer picker (when no selection) */}
      {!selectedCustomer && (
        isLoading ? (
          <PageSpinner />
        ) : customers.length === 0 && debouncedQuery ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No customers found for "{debouncedQuery}"</p>
            </div>
          </Card>
        ) : customers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {customers.slice(0, 12).map((c) => {
              const balance = parseFloat(String(c.balance));
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.name}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Balance</span>
                    <span className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {balance === 0 ? 'Settled' : formatCurrency(Math.abs(balance))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Search for a customer to view their ledger</p>
            </div>
          </Card>
        )
      )}

      {/* Selected customer ledger */}
      {selectedCustomer && (
        <CustomerLedgerView
          customer={selectedCustomer}
          onPayment={() => setModal('payment')}
          onCredit={() => setModal('credit')}
        />
      )}

      {/* Modals */}
      {selectedCustomer && modal === 'payment' && (
        <PaymentModal customer={selectedCustomer} onClose={() => setModal(null)} />
      )}
      {selectedCustomer && modal === 'credit' && (
        <CreditModal customer={selectedCustomer} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
