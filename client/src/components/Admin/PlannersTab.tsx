import { useCallback, useEffect, useMemo, useState } from 'react';
import * as adminApi from '../../features/admin/admin.api';
import type { AdminPlanner } from '../../features/admin/admin.types';

export function PlannersTab() {
  const [rows, setRows] = useState<AdminPlanner[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listPlannersFlat();
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s)
    );
  }, [rows, q]);

  const onSuspend = async (id: string) => {
    try {
      await adminApi.suspendPlanner(id);
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <input
        className="admin-search"
        placeholder="Search planners by name or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Registered</th>
              <th>Events</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="admin-form-hint">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((p) => {
                const status = p.status ?? (p.isActive ? 'active' : 'suspended');
                return (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>{p.eventCount}</td>
                    <td>
                      <span className={`admin-badge ${status}`}>{status}</span>
                    </td>
                    <td>
                      <a className="admin-btn" href={`mailto:${p.email}`} style={{ textDecoration: 'none' }}>
                        View
                      </a>
                      <button type="button" className="admin-btn danger" onClick={() => void onSuspend(p.id)}>
                        Suspend
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
