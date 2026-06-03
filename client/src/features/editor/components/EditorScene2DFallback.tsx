import { useMemo } from 'react';

import { useEditorStore } from '../store/editorStore';

const CATEGORY_COLORS: Record<string, string> = {
  seating: '#f0a0b4',
  tables: '#e8735a',
  lighting: '#f9e45b',
  decor: '#4db8a4',
  staging: '#b9a3f0',
  backdrops: '#87ceeb',
  other: '#9ca3af',
};

/** Top-down 2D layout when WebGL / GLTF loading fails or times out. */
export function EditorScene2DFallback() {
  const placedAssets = useEditorStore((s) => s.placedAssets);
  const venue = useEditorStore((s) => s.venue);
  const selectAsset = useEditorStore((s) => s.selectAsset);
  const selectedAssetId = useEditorStore((s) => s.selectedAssetId);

  const { width, depth } = venue.floorSize;
  const padding = 2;
  const viewW = width + padding * 2;
  const viewH = depth + padding * 2;

  const markers = useMemo(
    () =>
      placedAssets.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        x: a.transform.position.x,
        z: a.transform.position.z,
        color: CATEGORY_COLORS[a.category] ?? CATEGORY_COLORS.other,
      })),
    [placedAssets]
  );

  const toSvg = (x: number, z: number) => ({
    sx: ((x + viewW / 2) / viewW) * 100,
    sy: ((z + viewH / 2) / viewH) * 100,
  });

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: '#faf8f5', fontFamily: 'DM Sans, sans-serif' }}
    >
      <div
        className="shrink-0 px-4 py-2 text-sm"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid #e5e0d8',
          color: 'var(--text-muted)',
        }}
      >
        2D layout view — floor plan ({placedAssets.length} item
        {placedAssets.length === 1 ? '' : 's'}). 3D preview unavailable.
      </div>
      <div className="flex-1 min-h-0 p-4 overflow-auto">
        <svg
          viewBox="0 0 100 100"
          className="w-full max-h-full"
          style={{ aspectRatio: `${viewW} / ${viewH}`, maxWidth: '100%' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x={0} y={0} width={100} height={100} fill="#f0ebe3" rx={1} />
          <rect
            x={(padding / viewW) * 100}
            y={(padding / viewH) * 100}
            width={(width / viewW) * 100}
            height={(depth / viewH) * 100}
            fill="#e8e2d9"
            stroke="#c0bab0"
            strokeWidth={0.3}
          />
          {markers.map((m) => {
            const { sx, sy } = toSvg(m.x, m.z);
            const selected = m.id === selectedAssetId;
            return (
              <g
                key={m.id}
                onClick={() => selectAsset(m.id)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={sx}
                  cy={sy}
                  r={selected ? 2.2 : 1.6}
                  fill={m.color}
                  stroke={selected ? '#2a2118' : '#fff'}
                  strokeWidth={selected ? 0.5 : 0.25}
                />
                {selected && (
                  <text
                    x={sx}
                    y={sy - 3}
                    textAnchor="middle"
                    fontSize={2.5}
                    fill="#2a2118"
                  >
                    {m.name.length > 14 ? `${m.name.slice(0, 12)}…` : m.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
