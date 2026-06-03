import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import * as adminApi from '../../features/admin/admin.api';
import { VENUE_TYPES } from './venueFormConstants';

interface AddVenueFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

export function AddVenueForm({ onSaved, onCancel }: AddVenueFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>(VENUE_TYPES[0]!);
  const [capacity, setCapacity] = useState(100);
  const [pricePerHead, setPricePerHead] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [glbModelUrl, setGlbModelUrl] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingFiles]);

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next: File[] = [];
    for (const f of Array.from(list)) {
      if (f.type.startsWith('image/')) next.push(f);
    }
    setPendingFiles((prev) => [...prev, ...next].slice(0, 24));
  };

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await adminApi.createVenue({
        name: name.trim(),
        category: type,
        capacity: Math.max(1, Math.floor(capacity)),
        description: description.trim() || undefined,
        pricePerHead: pricePerHead === '' ? null : Number(pricePerHead),
        location: location.trim() || null,
        videoUrl: videoUrl.trim() || null,
        glbModelUrl: glbModelUrl.trim() || null,
        modelRef: glbModelUrl.trim() || undefined,
      });
      if (pendingFiles.length) {
        await adminApi.uploadVenueImages(created.id, pendingFiles);
      }
      toast.success('Venue saved');
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; details?: unknown } } })?.response?.data?.error ||
        'Save failed';
      setError(String(msg));
      toast.error(String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="admin-form-hint" style={{ marginBottom: '1rem' }}>
        Advanced editing (stock toggles, etc.) is still on the{' '}
        <Link to="/admin/venues" className="admin-link-muted">
          legacy venues page
        </Link>
        .
      </p>
      <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
        {error && (
          <div style={{ color: 'var(--accent-red)', fontSize: '0.88rem' }} role="alert">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="vn">Venue name</label>
          <input id="vn" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>
        <div>
          <label htmlFor="vt">Type</label>
          <select id="vt" value={type} onChange={(e) => setType(e.target.value)}>
            {VENUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cap">Capacity</label>
          <input
            id="cap"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div>
          <label htmlFor="pph">Price per head (PKR)</label>
          <input
            id="pph"
            type="number"
            min={0}
            step={1}
            value={pricePerHead}
            onChange={(e) => setPricePerHead(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="loc">Location</label>
          <input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label htmlFor="desc">Description</label>
          <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label htmlFor="yt">Promo Video (YouTube URL)</label>
          <input
            id="yt"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="img">Images (multiple)</label>
          <input id="img" type="file" accept="image/*" multiple onChange={(e) => onPickFiles(e.target.files)} />
          <div className="admin-image-preview-grid">
            {previews.map((src, i) => (
              <div key={src} className="admin-image-thumb">
                <img src={src} alt="" />
                <button
                  type="button"
                  className="admin-image-thumb-remove"
                  onClick={() => removePending(i)}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="glb">GLB model URL (optional)</label>
          <input
            id="glb"
            placeholder="e.g. lounge-chair.glb or full URL"
            value={glbModelUrl}
            onChange={(e) => setGlbModelUrl(e.target.value)}
          />
          <p className="admin-form-hint">For the 3D editor, this is saved as the model reference string.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save venue'}
          </button>
          <button type="button" className="admin-btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
