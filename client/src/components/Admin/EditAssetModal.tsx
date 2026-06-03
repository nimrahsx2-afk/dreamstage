import { useEffect, useState } from 'react';
import { X, Box, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '../../features/admin/admin.api';
import type { AdminAsset } from '../../features/admin/admin.types';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

const CATEGORIES = [
  { value: 'seating', label: 'Seating' },
  { value: 'tables', label: 'Tables' },
  { value: 'staging', label: 'Staging' },
  { value: 'decor', label: 'Decor' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'backdrops', label: 'Backdrops' },
  { value: 'other', label: 'Other' },
];

export interface EditAssetModalProps {
  open: boolean;
  asset: AdminAsset | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditAssetModal({ open, asset, onClose, onSaved }: EditAssetModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('seating');
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (asset && open) {
      setName(asset.name);
      const raw = asset.category.toLowerCase();
      const allowed = new Set(CATEGORIES.map((c) => c.value));
      setCategory(allowed.has(raw) ? raw : 'other');
      setPricePerUnit(asset.defaultUnitPrice);
    }
  }, [asset, open]);

  if (!open || !asset) return null;

  const thumb = asset.thumbnailUrl ? publicAssetUrl(asset.thumbnailUrl) : null;
  const glbName = (() => {
    const raw = String(asset.modelRef || '').trim();
    if (!raw) return '';
    const parts = raw.split('/').filter(Boolean);
    return parts[parts.length - 1] || raw;
  })();

  const save = async () => {
    setSubmitting(true);
    try {
      await adminApi.patchAssetMetadata(asset.id, {
        name: name.trim(),
        category,
        price_per_unit: Number(pricePerUnit) || 0,
      });
      toast.success('Asset updated');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-asset-title">
      <div
        className="admin-modal-panel"
        style={{
          maxWidth: 520,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium, var(--border-light))',
          borderRadius: 'var(--radius-xl, var(--radius-card))',
        }}
      >
        <div className="admin-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md, var(--radius-sm))',
                background: 'rgba(201, 166, 228, 0.14)',
                border: '1px solid rgba(201, 166, 228, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-lavender)',
              }}
              aria-hidden
            >
              <Box size={18} />
            </div>
            <div>
              <h2 id="edit-asset-title" style={{ margin: 0 }}>
                Edit Asset
              </h2>
            </div>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              border: '1px solid var(--border-medium, var(--border-light))',
              borderRadius: 'var(--radius-lg, var(--radius-card))',
              background: 'var(--bg-input, var(--bg-secondary))',
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {thumb ? (
                <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                <Box size={28} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>{asset.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--accent-mint)' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {glbName ? `Model: ${glbName}` : 'Model: (none)'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-muted)',
                  marginBottom: 4,
                  fontWeight: 700,
                  display: 'block',
                }}
                htmlFor="ea-name"
              >
                Asset name *
              </label>
              <input
                id="ea-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                style={{
                  background: 'var(--bg-input, var(--bg-card))',
                  border: '1px solid var(--border-medium, var(--border-light))',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md, var(--radius-sm))',
                  color: 'var(--text-primary)',
                  width: '100%',
                  outline: 'none',
                  fontSize: 14,
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-muted)',
                  marginBottom: 4,
                  fontWeight: 700,
                  display: 'block',
                }}
                htmlFor="ea-category"
              >
                Category *
              </label>
              <select
                id="ea-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  background: 'var(--bg-input, var(--bg-card))',
                  border: '1px solid var(--border-medium, var(--border-light))',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md, var(--radius-sm))',
                  color: 'var(--text-primary)',
                  width: '100%',
                  outline: 'none',
                  fontSize: 14,
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-muted)',
                marginBottom: 4,
                fontWeight: 700,
                display: 'block',
              }}
              htmlFor="ea-price"
            >
              Price per unit (PKR)
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                border: '1px solid var(--border-medium, var(--border-light))',
                borderRadius: 'var(--radius-md, var(--radius-sm))',
                overflow: 'hidden',
                background: 'var(--bg-input, var(--bg-card))',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  color: 'var(--text-muted)',
                  borderRight: '1px solid var(--border-medium, var(--border-light))',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  userSelect: 'none',
                }}
              >
                PKR
              </div>
              <input
                id="ea-price"
                type="number"
                min={0}
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(Number(e.target.value))}
                placeholder="0.00"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  width: '100%',
                  outline: 'none',
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                border: 'none',
                background: 'var(--gradient-primary)',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md, var(--radius-sm))',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
