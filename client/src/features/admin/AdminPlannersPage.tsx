/**
 * Admin Planners - View and moderate planner accounts.
 */

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import * as adminApi from './admin.api';
import type { AdminPlanner } from './admin.types';

export function AdminPlannersPage() {
  const [planners, setPlanners] = useState<AdminPlanner[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlanners = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listPlanners({ page: pagination.page, limit: pagination.limit });
      setPlanners(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load planners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanners();
  }, [pagination.page]);

  const handleToggleStatus = async (id: string) => {
    try {
      await adminApi.togglePlannerStatus(id);
      await loadPlanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update planner status');
    }
  };

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    boxShadow: 'var(--shadow)',
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1
        style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: 8,
        }}
      >
        Planner Accounts
      </h1>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          color: 'var(--text-muted)',
          marginBottom: 24,
        }}
      >
        View and moderate planner accounts. Toggle status to enable or disable access.
      </p>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      <div className="p-6" style={cardStyle}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : planners.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No planner accounts.</p>
        ) : (
          <div className="space-y-3">
            {planners.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: 'var(--lavender)' }}
                  >
                    <Users className="w-5 h-5" style={{ color: 'var(--text)' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {p.email} · {p.eventCount} events · Joined{' '}
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus(p.id)}
                  className="px-4 py-2 rounded-xl font-medium transition-opacity hover:opacity-90"
                  style={{
                    background: p.isActive ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
                    color: p.isActive ? '#16a34a' : '#ca8a04',
                  }}
                >
                  {p.isActive ? 'Active' : 'Disabled'}
                </button>
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
