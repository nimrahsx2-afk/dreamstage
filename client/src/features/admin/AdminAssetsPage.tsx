/**
 * Admin Assets - Full CRUD for décor and asset inventory.
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Package } from 'lucide-react';
import * as adminApi from './admin.api';
import type { AdminAsset, CreateAssetInput } from './admin.types';

const ASSET_CATEGORIES = [
  'seating',
  'tables',
  'lighting',
  'decor',
  'staging',
  'backdrops',
  'chairs',
  'linens',
  'centerpieces',
  'audio_visual',
  'other',
];

export function AdminAssetsPage() {
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [form, setForm] = useState<CreateAssetInput>({
    name: '',
    category: 'seating',
    defaultUnitPrice: 0,
    stockQuantity: 0,
    description: '',
  });

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { page?: number; limit?: number; category?: string } = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (categoryFilter) params.category = categoryFilter;
      const res = await adminApi.listAssets(params);
      setAssets(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [pagination.page, categoryFilter]);

  const resetForm = () => {
    setForm({
      name: '',
      category: 'seating',
      defaultUnitPrice: 0,
      stockQuantity: 0,
      description: '',
    });
    setEditingId(null);
    setIsCreating(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      await adminApi.createAsset(form);
      resetForm();
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create asset');
    }
  };

  const handleUpdate = async (id: string) => {
    const a = assets.find((x) => x.id === id);
    if (!a) return;
    try {
      await adminApi.updateAsset(id, {
        name: form.name || a.name,
        category: form.category || a.category,
        defaultUnitPrice: form.defaultUnitPrice ?? a.defaultUnitPrice,
        stockQuantity: form.stockQuantity ?? a.stockQuantity,
        description: form.description ?? a.description ?? null,
      });
      resetForm();
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update asset');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await adminApi.toggleAsset(id);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle asset');
    }
  };

  const handleStockAdjust = async (id: string, delta: number) => {
    try {
      await adminApi.adjustAssetStock(id, delta);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
    }
  };

  const startEdit = (a: AdminAsset) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      category: a.category,
      defaultUnitPrice: a.defaultUnitPrice,
      stockQuantity: a.stockQuantity,
      description: a.description ?? '',
    });
  };

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    boxShadow: 'var(--shadow)',
  };

  const inputStyle = {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    fontSize: '0.875rem',
    fontFamily: 'DM Sans, sans-serif',
    color: 'var(--text)',
    padding: '0.5rem 0.75rem',
    width: '100%',
  } as React.CSSProperties;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          Asset Inventory
        </h1>
        <button
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--peach)', color: 'var(--text)' }}
        >
          <Plus className="w-4 h-4" />
          Add asset
        </button>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      {/* Create / Edit form */}
      {(isCreating || editingId) && (
        <div className="p-6 mb-6" style={cardStyle}>
          <h2
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: '1rem',
              marginBottom: 16,
              color: 'var(--text)',
            }}
          >
            {editingId ? 'Edit asset' : 'New asset'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Asset name"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                style={inputStyle}
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Unit price</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.defaultUnitPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultUnitPrice: parseFloat(e.target.value) || 0 }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Stock</label>
              <input
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stockQuantity: parseInt(e.target.value, 10) || 0 }))
                }
                style={inputStyle}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
              disabled={!form.name.trim()}
              className="px-4 py-2 rounded-xl font-medium disabled:opacity-50"
              style={{ background: 'var(--text)', color: 'var(--bg)' }}
            >
              {editingId ? 'Save' : 'Create'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl font-medium"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          style={inputStyle}
          className="max-w-xs"
        >
          <option value="">All categories</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="p-6" style={cardStyle}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : assets.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No assets yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {assets.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: 'var(--peach)' }}
                  >
                    <Package className="w-5 h-5" style={{ color: 'var(--text)' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)' }}>{a.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {a.category} · £{a.defaultUnitPrice.toFixed(2)}/unit · {a.stockQuantity} in stock
                      {!a.isActive && ' · Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStockAdjust(a.id, -1)}
                      disabled={a.stockQuantity <= 0}
                      className="w-8 h-8 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      −
                    </button>
                    <span
                      className="min-w-[2rem] text-center text-sm font-medium"
                      style={{
                        color:
                          a.stockQuantity === 0
                            ? '#dc2626'
                            : a.stockQuantity < 5
                              ? '#eab308'
                              : 'var(--text)',
                      }}
                    >
                      {a.stockQuantity}
                    </span>
                    <button
                      onClick={() => handleStockAdjust(a.id, 1)}
                      className="w-8 h-8 rounded-lg text-sm font-bold"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleToggle(a.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{
                      background: a.isActive ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
                      color: a.isActive ? '#16a34a' : '#ca8a04',
                    }}
                  >
                    {a.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => startEdit(a)}
                    className="p-2 rounded-lg hover:bg-black/5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              className="px-3 py-1 rounded-lg disabled:opacity-50"
              style={{ background: 'var(--surface2)', color: 'var(--text)' }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="px-3 py-1 rounded-lg disabled:opacity-50"
              style={{ background: 'var(--surface2)', color: 'var(--text)' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
