import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import * as adminApi from '../../features/admin/admin.api';
import type { AdminVenue } from '../../features/admin/admin.types';
import { publicAssetUrl } from '@/lib/publicAssetUrl';
import { EditVenueModal } from './EditVenueModal';

interface VenuesTabProps {
  onAddVenue: () => void;
  refreshKey: number;
}

function cardImageSrc(v: AdminVenue): string | null {
  const g = v.galleryImages?.[0];
  if (g) return publicAssetUrl(g);
  if (v.thumbnailUrl) return publicAssetUrl(v.thumbnailUrl);
  return null;
}

export function VenuesTab({ onAddVenue, refreshKey }: VenuesTabProps) {
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminVenue | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listVenuesFlat(300);
      setVenues(data);
    } catch {
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const onDelete = async (id: string) => {
    if (!confirm('Delete this venue template?')) return;
    try {
      await adminApi.deleteVenue(id);
      toast.success('Venue deleted');
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Delete failed (venue may be in use).');
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
        <p className="admin-form-hint" style={{ margin: 0 }}>
          Venue templates for the editor and booking flow.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/admin/assets" className="admin-link-muted">
            Asset inventory →
          </Link>
          <button type="button" className="admin-btn admin-btn-primary" onClick={onAddVenue}>
            + Add venue
          </button>
        </div>
      </div>

      {loading && <p className="admin-form-hint">Loading venues…</p>}

      <div className="admin-venue-grid">
        {venues.map((v) => (
          <article key={v.id} className="admin-venue-card">
            <div className="admin-venue-img">
              {cardImageSrc(v) ? (
                <img src={cardImageSrc(v)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                'Image placeholder'
              )}
            </div>
            <div className="admin-venue-body">
              <span className="admin-type-badge">{v.category}</span>
              <h3>{v.name}</h3>
              <div className="admin-venue-meta">
                Capacity {v.capacity}
                {v.pricePerHead != null && ` · Rs ${v.pricePerHead}/head`}
                {v.location && ` · ${v.location}`}
              </div>
              <div>
                <button type="button" className="admin-btn" onClick={() => setEditing(v)}>
                  Edit
                </button>
                <button type="button" className="admin-btn danger" onClick={() => void onDelete(v.id)}>
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <EditVenueModal
          venue={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            void load();
          }}
        />
      )}
    </div>
  );
}
