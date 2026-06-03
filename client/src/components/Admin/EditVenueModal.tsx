import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '../../features/admin/admin.api';
import type { AdminVenue } from '../../features/admin/admin.types';
import { VENUE_TYPES } from './venueFormConstants';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

interface EditVenueModalProps {
  venue: AdminVenue;
  onClose: () => void;
  onSaved: () => void;
}

export function EditVenueModal({ venue, onClose, onSaved }: EditVenueModalProps) {
  const [name, setName] = useState(venue.name);
  const [type, setType] = useState(venue.category);
  const [capacity, setCapacity] = useState(venue.capacity);
  const [pricePerHead, setPricePerHead] = useState<number | ''>(
    venue.pricePerHead != null ? venue.pricePerHead : ''
  );
  const [location, setLocation] = useState(venue.location ?? '');
  const [description, setDescription] = useState(venue.description ?? '');
  const [videoUrl, setVideoUrl] = useState(venue.videoUrl ?? '');
  const [glbModelUrl, setGlbModelUrl] = useState(venue.modelRef ?? '');
  const [retainedImageUrls, setRetainedImageUrls] = useState<string[]>(() => {
    const g = [...(venue.galleryImages ?? [])];
    if (venue.thumbnailUrl && !g.includes(venue.thumbnailUrl)) {
      g.unshift(venue.thumbnailUrl);
    }
    return g;
  });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setNewPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newFiles]);

  const removeExisting = (url: string) => {
    setRetainedImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next: File[] = [];
    for (const f of Array.from(list)) {
      if (f.type.startsWith('image/')) next.push(f);
    }
    setNewFiles((prev) => [...prev, ...next].slice(0, 24));
  };

  const removeNew = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const filesToUpload = newFiles.filter((f): f is File => f instanceof File);
    try {
      await adminApi.patchVenue(venue.id, {
        name: name.trim(),
        category: type,
        capacity: Math.max(1, Math.floor(capacity)),
        description: description.trim() || null,
        pricePerHead: pricePerHead === '' ? null : Number(pricePerHead),
        location: location.trim() || null,
        videoUrl: videoUrl.trim() || null,
        modelRef: glbModelUrl.trim() || null,
        glbModelUrl: glbModelUrl.trim() || null,
        galleryImages: retainedImageUrls,
      });
      if (filesToUpload.length) {
        await adminApi.uploadVenueImages(venue.id, filesToUpload);
      }
      toast.success('Venue updated');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Update failed';
      toast.error(String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-venue-title">
      <div className="admin-modal-panel">
        <div className="admin-modal-head">
          <h2 id="edit-venue-title">Edit venue</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form className="admin-form admin-modal-form" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label htmlFor="ev-name">Venue name</label>
            <input id="ev-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <label htmlFor="ev-type">Type</label>
            <select id="ev-type" value={type} onChange={(e) => setType(e.target.value)}>
              {!VENUE_TYPES.includes(type as (typeof VENUE_TYPES)[number]) && (
                <option value={type}>{type}</option>
              )}
              {VENUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ev-cap">Capacity</label>
            <input
              id="ev-cap"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div>
            <label htmlFor="ev-pph">Price per head (PKR)</label>
            <input
              id="ev-pph"
              type="number"
              min={0}
              step={1}
              value={pricePerHead}
              onChange={(e) => setPricePerHead(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="ev-loc">Location</label>
            <input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ev-desc">Description</label>
            <textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ev-yt">Promo Video (YouTube URL)</label>
            <input
              id="ev-yt"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ev-img">Images</label>
            <input id="ev-img" type="file" accept="image/*" multiple onChange={(e) => onPickFiles(e.target.files)} />
            <div className="admin-image-preview-grid">
              {retainedImageUrls.map((url) => (
                <div key={url} className="admin-image-thumb">
                  <img src={publicAssetUrl(url)} alt="" />
                  <button type="button" className="admin-image-thumb-remove" onClick={() => removeExisting(url)} aria-label="Remove image">
                    ×
                  </button>
                </div>
              ))}
              {newPreviews.map((src, i) => (
                <div key={src} className="admin-image-thumb">
                  <img src={src} alt="" />
                  <button type="button" className="admin-image-thumb-remove" onClick={() => removeNew(i)} aria-label="Remove new image">
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="ev-glb">GLB model URL (optional)</label>
            <input
              id="ev-glb"
              placeholder="e.g. lounge-chair.glb or full URL"
              value={glbModelUrl}
              onChange={(e) => setGlbModelUrl(e.target.value)}
            />
          </div>
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
