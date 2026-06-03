// Asset Palette - Left sidebar with categorized assets, search, and stock status

import { useState, useMemo } from 'react';
import { Search, ChevronRight, Box } from 'lucide-react';
import { toast } from 'sonner';

import type { AssetDefinition, AssetCategory } from '../editor.types';
import { CATEGORY_LABELS } from '../editor.constants';
import { formatPKR } from '@/utils/currency';
import { cn } from '@/utils/cn';
import { publicAssetUrl } from '@/lib/publicAssetUrl';
import { useEditorStore } from '../store/editorStore';

interface AssetPaletteProps {
  assets: AssetDefinition[];
  reservedStock: Record<string, number>;
  onDragStart: (asset: AssetDefinition) => void;
  venueFloorY?: number;
  disabled?: boolean;
}

export function AssetPalette({
  assets,
  reservedStock,
  onDragStart,
  venueFloorY = 0,
  disabled,
}: AssetPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<AssetCategory>>(
    new Set(['seating', 'tables', 'lighting', 'decor', 'staging', 'backdrops', 'other'])
  );

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  const assetsByCategory = useMemo(() => {
    const grouped: Record<AssetCategory, AssetDefinition[]> = {
      seating: [],
      tables: [],
      lighting: [],
      decor: [],
      staging: [],
      backdrops: [],
      other: [],
    };

    filteredAssets.forEach((asset) => {
      if (!asset.isActive) return;
      const key = grouped[asset.category] ? asset.category : 'other';
      grouped[key].push(asset);
    });

    return grouped;
  }, [filteredAssets]);

  const toggleCategory = (category: AssetCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getAvailableStock = (assetId: string, totalStock: number): number => {
    const reserved = reservedStock[assetId] || 0;
    return totalStock - reserved;
  };

  const placeAsset = useEditorStore((s) => s.placeAsset);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    asset: AssetDefinition
  ) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(asset);
  };

  const handleClickPlace = (asset: AssetDefinition, isOutOfStock: boolean) => {
    if (disabled || isOutOfStock) return;
    placeAsset({
      assetId: asset.id,
      name: asset.name,
      category: asset.category,
      transform: {
        position: {
          x: (Math.random() - 0.5) * 3,
          y: venueFloorY + 0.1,
          z: (Math.random() - 0.5) * 3,
        },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1.6, y: 1.6, z: 1.6 },
      },
      unitPrice: asset.defaultUnitPrice,
      modelRef: asset.modelRef ?? null,
    });
    toast.success(`${asset.name} placed in scene`);
  };

  return (
    <div 
      className="flex flex-col h-full min-h-0 relative"
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div 
        className="p-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2 
          className="text-xl mb-4"
          style={{ 
            fontFamily: 'Playfair Display, serif',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          Assets
        </h2>

        {/* Search bar */}
        <div className="relative">
          <Search 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 focus:outline-none"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text)',
            }}
          />
        </div>
      </div>

      {/* Asset categories - scrollable */}
      <div className="editor-assets-scroll p-3">
        {(Object.keys(assetsByCategory) as AssetCategory[]).map((category) => {
          const categoryAssets = assetsByCategory[category];
          if (categoryAssets.length === 0) return null;

          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category} className="mb-3">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center w-full px-3 py-2 text-left transition-all hover:-translate-y-0.5"
                style={{ borderRadius: '10px' }}
              >
                <ChevronRight
                  className="w-4 h-4 mr-2 flex-shrink-0 transition-transform duration-200"
                  style={{
                    color: 'var(--text-muted)',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {CATEGORY_LABELS[category]} ({categoryAssets.length})
                </span>
              </button>

              {/* Asset items */}
              {isExpanded && (
                <div className="pl-1 pr-1 space-y-1 mt-1">
                  {categoryAssets.map((asset) => {
                    const available = getAvailableStock(
                      asset.id,
                      asset.stockQuantity
                    );
                    const isLowStock = available <= 5 && available > 0;
                    const isOutOfStock = available <= 0;
                    const thumb = asset.thumbnailUrl ? publicAssetUrl(asset.thumbnailUrl) : null;

                    return (
                      <div
                        key={asset.id}
                        draggable={!disabled && !isOutOfStock}
                        onDragStart={(e) => handleDragStart(e, asset)}
                        onClick={() => handleClickPlace(asset, isOutOfStock)}
                        className={cn(
                          'flex items-start gap-2 p-2 transition-all',
                          disabled || isOutOfStock
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5'
                        )}
                        style={{
                          borderRadius: '10px',
                          background: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!disabled && !isOutOfStock) {
                            e.currentTarget.style.background = 'var(--surface2)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div
                          className="flex-shrink-0 flex items-center justify-center overflow-hidden"
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 8,
                            background: 'var(--surface2)',
                          }}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="w-full h-full object-cover"
                              draggable={false}
                              style={{ borderRadius: 6 }}
                            />
                          ) : (
                            <Box className="w-8 h-8" style={{ color: 'var(--text-muted)' }} aria-hidden />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                          <p
                            className="truncate leading-tight"
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {asset.name}
                          </p>
                          <p
                            className="mt-0.5 leading-tight"
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {formatPKR(asset.defaultUnitPrice)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 ml-1 pt-1 flex-shrink-0">
                          {/* Status dot: red = out, yellow = low */}
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              background: isOutOfStock
                                ? '#dc2626'
                                : isLowStock
                                  ? '#eab308'
                                  : 'transparent',
                            }}
                            title={
                              isOutOfStock
                                ? 'Out of stock - cannot place'
                                : isLowStock
                                  ? `Low stock (${available} left)`
                                  : `${available} available`
                            }
                          />
                          {isOutOfStock ? (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#dc2626',
                                fontFamily: 'DM Sans, sans-serif',
                              }}
                            >
                              Out
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                fontFamily: 'DM Sans, sans-serif',
                              }}
                            >
                              {available}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredAssets.length === 0 && (
          <div 
            className="text-center py-8"
            style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
          >
            <p>No assets found</p>
          </div>
        )}
      </div>

      {/* Disabled overlay message */}
      {disabled && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'var(--bg)', opacity: 0.9 }}
        >
          <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
            Scene is locked
          </p>
        </div>
      )}
    </div>
  );
}
