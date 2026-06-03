import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '../../features/admin/admin.api';
import type { AdminAsset } from '../../features/admin/admin.types';
import { publicAssetUrl } from '@/lib/publicAssetUrl';
import { formatPKR } from '@/utils/currency';
import { UploadAssetModal } from './UploadAssetModal';
import { EditAssetModal } from './EditAssetModal';

const FILTER_TABS = ['All', 'Seating', 'Tables', 'Staging', 'Decor', 'Lighting', 'Other'] as const;

function badgeColor(category: string): string {
  const c = category.toLowerCase();
  const map: Record<string, string> = {
    seating: 'var(--accent-lavender)',
    tables: 'var(--accent-sky)',
    staging: 'var(--accent-rose)',
    decor: 'var(--accent-mint)',
    lighting: 'var(--accent-amber)',
    other: 'var(--text-muted)',
  };
  return map[c] || 'var(--text-muted)';
}

function categoryLabel(cat: string): string {
  const c = cat.toLowerCase();
  if (c === 'decor' || c === 'décor') return 'Decor';
  return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
}

export function AssetsTab() {
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTER_TABS)[number]>('All');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAsset | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listAssetsFlat();
      // Only show active inventory (soft-deleted hidden); keeps UI correct if API ever returns inactive.
      setAssets(data.filter((a) => a.isActive));
    } catch {
      setAssets([]);
      toast.error('Failed to load assets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'All') return assets;
    const want = filter.toLowerCase();
    return assets.filter((a) => {
      const c = a.category.toLowerCase();
      if (want === 'decor') return c === 'decor' || c === 'décor' || c === 'centerpieces' || c === 'linens';
      if (want === 'seating') return c === 'seating' || c === 'chairs' || c === 'chair';
      return c === want;
    });
  }, [assets, filter]);

  const onDelete = async (a: AdminAsset) => {
    try {
      await adminApi.softDeleteAsset(a.id);
      setAssets((prev) => prev.filter((x) => x.id !== a.id));
      toast.success('Asset removed from inventory.');
      setConfirmDeleteId(null);
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Delete failed.');
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 600 }}>
          Asset Inventory
        </h2>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setUploadOpen(true)}>
          + Upload Asset
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1.25rem',
        }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className="admin-btn"
            style={{
              fontSize: '0.82rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 999,
              border: tab === filter ? '1px solid var(--accent-lavender)' : '1px solid var(--border-light)',
              background: tab === filter ? 'rgba(201, 166, 228, 0.15)' : 'var(--bg-card)',
              color: tab === filter ? 'var(--accent-lavender)' : 'var(--text-muted)',
            }}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && <p className="admin-form-hint">Loading assets…</p>}

      {!loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {filtered.map((a) => {
            const img = a.thumbnailUrl ? publicAssetUrl(a.thumbnailUrl) : null;
            return (
              <div key={a.id} className="admin-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4/3',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    marginBottom: '0.75rem',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {img ? (
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Box size={40} style={{ color: 'var(--text-muted)' }} aria-hidden />
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.35rem' }}>{a.name}</div>
                <div style={{ marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 6,
                      color: 'var(--text-primary)',
                      background: `${badgeColor(a.category)}22`,
                      border: `1px solid ${badgeColor(a.category)}55`,
                    }}
                  >
                    {categoryLabel(a.category)}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {formatPKR(a.defaultUnitPrice)}
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditing(a)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    style={{ color: 'var(--accent-red)', borderColor: 'rgba(226, 75, 74, 0.45)' }}
                    onClick={() => setConfirmDeleteId(a.id)}
                  >
                    Delete
                  </button>
                </div>
                {confirmDeleteId === a.id && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(226, 75, 74, 0.08)',
                      border: '1px solid rgba(226, 75, 74, 0.35)',
                      fontSize: '0.88rem',
                    }}
                  >
                    <p style={{ margin: '0 0 0.5rem' }}>Remove {a.name} from inventory?</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </button>
                      <button type="button" className="admin-btn admin-btn-primary" onClick={() => void onDelete(a)}>
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="admin-form-hint">No assets match this filter.</p>
      )}

      <UploadAssetModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => void load()}
      />
      <EditAssetModal
        open={!!editing}
        asset={editing}
        onClose={() => setEditing(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
