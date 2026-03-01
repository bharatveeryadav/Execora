import { useState } from 'react';
import { Plus, Package, AlertTriangle, Search } from 'lucide-react';
import { useProducts, useLowStockProducts, useCreateProduct } from '@/hooks/useQueries';
import { formatCurrency } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Product } from '@/types';

// ── Create product modal ──────────────────────────────────────────────────────

function CreateProductModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', price: '', stock: '', unit: 'pcs', description: '' });
  const [error, setError] = useState('');
  const mutation = useCreateProduct();

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Product name is required'); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { setError('Valid price is required'); return; }
    if (!form.stock || isNaN(parseInt(form.stock))) { setError('Valid stock quantity is required'); return; }
    setError('');
    try {
      await mutation.mutateAsync({
        name: form.name.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        unit: form.unit,
        description: form.description || undefined,
      });
      onClose();
    } catch {
      setError('Failed to create product. Please try again.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add Product"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>Add Product</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        <Input
          label="Product Name *"
          placeholder="e.g., Wheat Flour 1kg"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Price (₹) *"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
          <Input
            label="Stock *"
            type="number"
            min="0"
            placeholder="0"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
          />
        </div>
        <Input
          label="Unit"
          placeholder="pcs, kg, L, box…"
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
        />
        <Input
          label="Description (optional)"
          placeholder="Brief product description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
    </Modal>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const stock = product.stock;
  const stockVariant = stock === 0 ? 'red' : stock <= 5 ? 'yellow' : 'green';
  const stockLabel = stock === 0 ? 'Out of stock' : stock <= 5 ? 'Low stock' : 'In stock';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{product.name}</p>
            {product.description && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>
            )}
          </div>
        </div>
        <Badge variant={stockVariant} dot className="flex-shrink-0">
          {stockLabel}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-400">Price</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(product.price)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Stock</p>
          <p className={`text-sm font-bold ${stock === 0 ? 'text-red-600' : stock <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>
            {stock} {product.unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Category</p>
          <p className="text-sm text-gray-700 truncate">{product.category}</p>
        </div>
      </div>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'low'>('all');
  const [showCreate, setShowCreate] = useState(false);

  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: lowStock = [] } = useLowStockProducts();

  const displayed = tab === 'low' ? lowStock : products;
  const filtered = displayed.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (productsLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {lowStock.length} product{lowStock.length > 1 ? 's' : ''} running low on stock
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'low'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'all' ? `All Products (${products.length})` : `Low Stock (${lowStock.length})`}
              </button>
            ))}
          </div>
          <div className="min-w-0 w-52">
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4" />}
            />
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add Product
        </Button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{search ? `No products matching "${search}"` : 'No products yet'}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {showCreate && <CreateProductModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
