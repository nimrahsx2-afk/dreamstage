/**
 * Admin Venues - Full CRUD for venue templates.
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import * as adminApi from './admin.api';
import type { AdminVenue, CreateVenueInput } from './admin.types';

const VENUE_CATEGORIES = [
  'ballroom',
  'garden',
  'beach',
  'rooftop',
  'conference',
  'banquet_hall',
  'outdoor',
  'indoor',
  'other',
];

export function AdminVenuesPage() {
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<CreateVenueInput>({
    name: '',
    category: 'ballroom',
    capacity: 50,
    description: '',
  });

  const loadVenues = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listVenues({ page: pagination.page, limit: pagination.limit });
      setVenues(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, [pagination.page]);

  const resetForm = () => {
    setForm({ name: '', category: 'ballroom', capacity: 50, description: '' });
    setEditingId(null);
    setIsCreating(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      await adminApi.createVenue(form);
      resetForm();
      await loadVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create venue');
    }
  };

  const handleUpdate = async (id: string) => {
    const v = venues.find((x) => x.id === id);
    if (!v) return;
    try {
      await adminApi.updateVenue(id, {
        name: form.name || v.name,
        category: form.category || v.category,
        capacity: form.capacity ?? v.capacity,
        description: form.description ?? v.description ?? null,
      });
      resetForm();
      await loadVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update venue');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this venue?')) return;
    try {
      await adminApi.deleteVenue(id);
      await loadVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete venue');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await adminApi.toggleVenue(id);
      await loadVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle venue');
    }
  };

  const startEdit = (v: AdminVenue) => {
    setEditingId(v.id);
    setForm({
      name: v.name,
      category: v.category,
      capacity: v.capacity,
      description: v.description ?? '',
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
          Venue Templates
        </h1>
        <button
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--mint)', color: 'var(--text)' }}
        >
          <Plus className="w-4 h-4" />
          Add venue
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
            {editingId ? 'Edit venue' : 'New venue'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Venue name"
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
                {VENUE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Capacity</label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value, 10) || 0 }))}
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

      {/* List */}
      <div className="p-6" style={cardStyle}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : venues.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No venues yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {venues.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: 'var(--lavender)' }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: 'var(--text)' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)' }}>{v.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {v.category} · {v.capacity} capacity
                      {!v.isActive && ' · Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(v.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{
                      background: v.isActive ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
                      color: v.isActive ? '#16a34a' : '#ca8a04',
                    }}
                  >
                    {v.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => startEdit(v)}
                    className="p-2 rounded-lg hover:bg-black/5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-2 rounded-lg hover:bg-red-100"
                    style={{ color: '#dc2626' }}
                  >
                    <Trash2 className="w-4 h-4" />
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
