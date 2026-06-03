import { useMemo, useState, useCallback } from 'react';
import { Box, Package, Image as ImageIcon, X, CheckCircle2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '../../features/admin/admin.api';

const CATEGORIES = [
  { value: 'seating', label: 'Seating' },
  { value: 'tables', label: 'Tables' },
  { value: 'staging', label: 'Staging' },
  { value: 'decor', label: 'Decor' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'backdrops', label: 'Backdrops' },
  { value: 'other', label: 'Other' },
];

const MAX_MODEL_BYTES = 10 * 1024 * 1024;

export interface UploadAssetModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export function UploadAssetModal({ open, onClose, onUploaded }: UploadAssetModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('seating');
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tokens = useMemo(() => {
    return {
      bgCard: 'var(--bg-card)',
      bgInput: 'var(--bg-input, var(--bg-card))',
      borderMedium: 'var(--border-medium, var(--border-light))',
      radiusXL: 'var(--radius-xl, var(--radius-card))',
      radiusLG: 'var(--radius-lg, var(--radius-card))',
      radiusMD: 'var(--radius-md, var(--radius-sm))',
    };
  }, []);

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
    marginBottom: 4,
    fontWeight: 700,
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    background: tokens.bgInput,
    border: `1px solid ${tokens.borderMedium}`,
    padding: '10px 12px',
    borderRadius: tokens.radiusMD,
    color: 'var(--text-primary)',
    width: '100%',
    outline: 'none',
    fontSize: 14,
  };

  const dropZoneBase: React.CSSProperties = {
    border: `2px dashed ${tokens.borderMedium}`,
    background: tokens.bgInput,
    borderRadius: tokens.radiusLG,
    padding: '14px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    cursor: 'pointer',
    transition: 'border-color 120ms ease',
  };

  const reset = useCallback(() => {
    setName('');
    setCategory('seating');
    setPricePerUnit(0);
    setModelFile(null);
    setThumbFile(null);
    if (thumbPreview) {
      URL.revokeObjectURL(thumbPreview);
      setThumbPreview(null);
    }
  }, [thumbPreview]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onPickModel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setModelFile(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith('.glb')) {
      toast.error('Please choose a .glb file only.');
      e.target.value = '';
      setModelFile(null);
      return;
    }
    setModelFile(f);
  };

  const onPickThumb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    if (!f) {
      setThumbFile(null);
      setThumbPreview(null);
      return;
    }
    setThumbFile(f);
    setThumbPreview(URL.createObjectURL(f));
  };

  const onDropModel = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.glb')) {
      toast.error('Please choose a .glb file only.');
      return;
    }
    setModelFile(f);
  };

  const onDropThumb = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Please choose an image file (PNG/JPG).');
      return;
    }
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbFile(f);
    setThumbPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Asset name is required.');
      return;
    }
    if (!modelFile) {
      toast.error('GLB model file is required.');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.uploadAssetWithFiles({
        name: name.trim(),
        category,
        pricePerUnit: Number(pricePerUnit) || 0,
        modelFile,
        thumbnailFile: thumbFile,
      });
      toast.success('Asset uploaded! Available in editor.');
      reset();
      onUploaded();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const modelLarge = modelFile && modelFile.size > MAX_MODEL_BYTES;

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-asset-title">
      <div
        className="admin-modal-panel"
        style={{
          maxWidth: 520,
          background: tokens.bgCard,
          border: `1px solid ${tokens.borderMedium}`,
          borderRadius: tokens.radiusXL,
        }}
      >
        <div className="admin-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: tokens.radiusMD,
                background: 'rgba(201, 166, 228, 0.14)',
                border: `1px solid rgba(201, 166, 228, 0.28)`,
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
              <h2 id="upload-asset-title" style={{ margin: 0 }}>
                Upload Asset
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Add a new 3D asset to your inventory
              </div>
            </div>
          </div>
          <button type="button" className="admin-modal-close" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle} htmlFor="ua-name">
                Asset name *
              </label>
              <input
                id="ua-name"
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Floral Arch"
                required
                minLength={2}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ua-category">
                Category *
              </label>
              <select id="ua-category" style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor="ua-price">
              Price per unit (PKR)
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                border: `1px solid ${tokens.borderMedium}`,
                borderRadius: tokens.radiusMD,
                overflow: 'hidden',
                background: tokens.bgInput,
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  color: 'var(--text-muted)',
                  borderRight: `1px solid ${tokens.borderMedium}`,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  userSelect: 'none',
                }}
              >
                PKR
              </div>
              <input
                id="ua-price"
                type="number"
                min={0}
                step="0.01"
                value={pricePerUnit === 0 ? '' : pricePerUnit}
                onChange={(e) => setPricePerUnit(Number(e.target.value))}
                placeholder="0.00"
                style={{
                  ...inputStyle,
                  border: 'none',
                  borderRadius: 0,
                  background: 'transparent',
                }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>3D model file *</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropModel}
              onClick={() => document.getElementById('ua-model')?.click()}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-lavender)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = tokens.borderMedium;
              }}
              style={dropZoneBase}
              role="button"
              tabIndex={0}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: tokens.radiusMD,
                  background: 'rgba(135, 181, 224, 0.12)',
                  border: `1px solid rgba(135, 181, 224, 0.25)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-sky)',
                  flexShrink: 0,
                }}
                aria-hidden
              >
                <Package size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                  Drop your model here or{' '}
                  <span style={{ color: 'var(--accent-lavender)', textDecoration: 'underline' }}>browse</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Supports GLB, GLTF, FBX, OBJ
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {['.glb', '.gltf', '.fbx', '.obj'].map((p) => (
                    <span
                      key={p}
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        border: `1px solid ${tokens.borderMedium}`,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: 'transparent',
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
                {modelFile && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-mint)' }}>
                    <CheckCircle2 size={16} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {modelFile.name}
                    </span>
                  </div>
                )}
                {modelLarge && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent-amber)' }}>
                    Large file — may take time to load in editor
                  </div>
                )}
              </div>
            </div>
            <input
              id="ua-model"
              type="file"
              accept=".glb,model/gltf-binary"
              onChange={onPickModel}
              style={{ display: 'none' }}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Thumbnail (optional)</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropThumb}
              onClick={() => document.getElementById('ua-thumb')?.click()}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-lavender)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = tokens.borderMedium;
              }}
              style={{
                ...dropZoneBase,
                padding: 12,
              }}
              role="button"
              tabIndex={0}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: tokens.radiusMD,
                  background: 'rgba(93, 202, 165, 0.12)',
                  border: `1px solid rgba(93, 202, 165, 0.25)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-mint)',
                  flexShrink: 0,
                }}
                aria-hidden
              >
                <ImageIcon size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Upload a preview image</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG · Recommended 512×512</div>
              </div>
              <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: 'rgba(0,0,0,0.12)' }}>
                {thumbPreview ? (
                  <img
                    src={thumbPreview}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
                    draggable={false}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <ImageIcon size={18} />
                  </div>
                )}
              </div>
            </div>
            <input
              id="ua-thumb"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPickThumb}
              style={{ display: 'none' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingTop: 4,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>* Required fields</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={handleClose} disabled={submitting}>
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
                  borderRadius: tokens.radiusMD,
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Upload size={16} />
                {submitting ? 'Uploading…' : 'Upload Asset'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
