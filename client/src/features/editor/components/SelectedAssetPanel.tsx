// Selected Asset Panel - Floating contextual controls shown when an asset is selected

import { ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';

import { useEditorStore } from '../store/editorStore';
import { cn } from '@/utils/cn';

const ROT_STEP = (15 * Math.PI) / 180;
const SCALE_MIN = 0.5;
const SCALE_MAX = 10;
const SCALE_STEP = 0.1;

export function SelectedAssetPanel() {
  const selectedAssetId = useEditorStore((state) => state.selectedAssetId);
  const placedAssets = useEditorStore((state) => state.placedAssets);
  const updateAssetTransform = useEditorStore((state) => state.updateAssetTransform);
  const removeAsset = useEditorStore((state) => state.removeAsset);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const isLocked = useEditorStore((state) => state.isLocked);

  if (!selectedAssetId) return null;

  const asset = placedAssets.find((a) => a.id === selectedAssetId);
  if (!asset) return null;

  const rotationDeg = Math.round((asset.transform.rotation.y * 180) / Math.PI);
  const scaleVal = asset.transform.scale.x;

  const handleRotate = (delta: number) => {
    const newY = asset.transform.rotation.y + delta;
    updateAssetTransform(asset.id, {
      rotation: { ...asset.transform.rotation, y: newY },
    });
    pushHistory();
  };

  const handleScale = (delta: number) => {
    const next = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scaleVal + delta));
    const s = Math.round(next * 10) / 10;
    updateAssetTransform(asset.id, {
      scale: { x: s, y: s, z: s },
    });
    pushHistory();
  };

  const handleRemove = () => {
    removeAsset(asset.id);
  };

  return (
    <div
      className="selected-asset-panel"
      style={{
        position: 'absolute',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        zIndex: 20,
      }}
    >
      {/* Asset name */}
      <span
        style={{
          fontSize: '0.875rem',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500,
          color: 'var(--text)',
          marginRight: '0.5rem',
        }}
      >
        {asset.name}
      </span>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* Rotation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => handleRotate(-ROT_STEP)}
          disabled={isLocked}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
            !isLocked && 'hover:bg-[var(--surface2)]'
          )}
          style={{
            background: 'transparent',
            color: 'var(--text)',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            opacity: isLocked ? 0.5 : 1,
          }}
          title="Rotate left 15°"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            color: 'var(--text-muted)',
            minWidth: 36,
            textAlign: 'center',
          }}
        >
          {rotationDeg}°
        </span>
        <button
          type="button"
          onClick={() => handleRotate(ROT_STEP)}
          disabled={isLocked}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
            !isLocked && 'hover:bg-[var(--surface2)]'
          )}
          style={{
            background: 'transparent',
            color: 'var(--text)',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            opacity: isLocked ? 0.5 : 1,
          }}
          title="Rotate right 15°"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* Scale */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => handleScale(-SCALE_STEP)}
          disabled={isLocked || scaleVal <= SCALE_MIN}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
            !isLocked && scaleVal > SCALE_MIN && 'hover:bg-[var(--surface2)]'
          )}
          style={{
            background: 'transparent',
            color: 'var(--text)',
            cursor: isLocked || scaleVal <= SCALE_MIN ? 'not-allowed' : 'pointer',
            opacity: isLocked || scaleVal <= SCALE_MIN ? 0.5 : 1,
          }}
          title="Decrease size"
        >
          <Minus className="w-5 h-5" />
        </button>
        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            color: 'var(--text-muted)',
            minWidth: 32,
            textAlign: 'center',
          }}
        >
          {scaleVal.toFixed(1)}×
        </span>
        <button
          type="button"
          onClick={() => handleScale(SCALE_STEP)}
          disabled={isLocked || scaleVal >= SCALE_MAX}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
            !isLocked && scaleVal < SCALE_MAX && 'hover:bg-[var(--surface2)]'
          )}
          style={{
            background: 'transparent',
            color: 'var(--text)',
            cursor: isLocked || scaleVal >= SCALE_MAX ? 'not-allowed' : 'pointer',
            opacity: isLocked || scaleVal >= SCALE_MAX ? 0.5 : 1,
          }}
          title="Increase size"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* Delete */}
      <button
        type="button"
        onClick={handleRemove}
        disabled={isLocked}
        className={cn(
          'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all',
          !isLocked && 'hover:opacity-90'
        )}
        style={{
          background: isLocked ? 'var(--surface2)' : 'var(--rose)',
          color: isLocked ? 'var(--text-muted)' : '#8a2840',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600,
          fontSize: '0.75rem',
          cursor: isLocked ? 'not-allowed' : 'pointer',
        }}
        title="Delete asset"
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </button>
    </div>
  );
}
